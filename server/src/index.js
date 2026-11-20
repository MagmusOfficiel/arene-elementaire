import http from 'node:http';
import { VERSION_JEU } from '../../shared/version.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import express from 'express';
import colyseus from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom } from './ArenaRoom.js';
import { ConclaveRoom } from './ConclaveRoom.js';
import { ZoneMorteRoom } from './ZoneMorteRoom.js';
import { ClansRoom } from './ClansRoom.js';
import { noterErreur, listeErreurs } from './journal.js';
import { noterMesure, resumeMesures } from './mesures.js';
import { statsConclave, partieZoneMorte, classementZoneMorte } from './stats.js';
import { equilibrage, remettreEquilibrage } from './stats.js';
import { CARTES as CARTES_CLANS } from '../../shared/clans/cartes.js';
import { MONSTRES as MONSTRES_CLANS, BOSS_CAUCHEMAR } from '../../shared/clans/monstres.js';
import { lireCompte, ecrireCompte, creerCompte, codeValide, persistance, rapportFusions, classement, classementCote, coteDe, placeDe, classementSurvie, palmares } from './stats.js';

const PORT = Number(process.env.PORT || 2567);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Le client peut être hébergé ailleurs (Netlify) : on autorise les appels depuis n'importe quel site
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*'); res.set('Access-Control-Allow-Headers', 'Content-Type'); res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/api/compte', express.json({ limit: '100kb' }));
app.use('/api/erreurs', express.json({ limit: '8kb' }));
app.use('/api/mesures', express.json({ limit: '4kb' }));
app.use('/api/zonemorte', express.json({ limit: '2kb' }));

// Journal des erreurs (serveur + navigateurs)
process.on('uncaughtException', (e) => noterErreur('serveur', e));
process.on('unhandledRejection', (e) => noterErreur('serveur (promesse)', e));
app.get('/api/erreurs', (req, res) => {
  if (process.env.JOURNAL_CLE && req.query.cle !== process.env.JOURNAL_CLE) return res.status(403).json({ erreur: 'clé requise' });
  res.json({ version: VERSION_JEU, erreurs: listeErreurs() });
});
const antiErr = new Map();
app.post('/api/erreurs', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (Date.now() - (antiErr.get(ip) || 0) < 3000) return res.sendStatus(429);
  antiErr.set(ip, Date.now()); if (antiErr.size > 5000) antiErr.clear();
  const b = req.body || {};
  noterErreur(`navigateur · ${String(b.ou || '?').slice(0, 60)}`, { message: b.msg, stack: b.pile }, { version: Number(b.version) || null, appareil: String(b.appareil || '').slice(0, 80) });
  res.sendStatus(204);
});

// Mesures de confort (FPS, ping, attente) envoyées en fin de partie
const antiMes = new Map();
app.post('/api/mesures', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (Date.now() - (antiMes.get(ip) || 0) < 10000) return res.sendStatus(429);
  antiMes.set(ip, Date.now()); if (antiMes.size > 5000) antiMes.clear();
  noterMesure(req.body, VERSION_JEU);
  res.sendStatus(204);
});
app.get('/api/mesures', (req, res) => {
  if (process.env.JOURNAL_CLE && req.query.cle !== process.env.JOURNAL_CLE) return res.status(403).json({ erreur: 'clé requise' });
  res.json({ version: VERSION_JEU, ...resumeMesures() });
});

// Les Clans Élémentaires : statistiques d'équilibrage (page /clans/admin.html), protégées par JOURNAL_CLE
const cleOk = (req) => !process.env.JOURNAL_CLE || req.query.cle === process.env.JOURNAL_CLE;
app.get('/api/clans/equilibrage', (req, res) => {
  if (!cleOk(req)) return res.status(403).json({ erreur: 'clé requise' });
  const E = equilibrage();
  const cartes = Object.fromEntries(Object.entries(CARTES_CLANS).map(([id, c]) => [id, { nom: c.nom, element: c.element, rarete: c.rarete, cout: c.cout, type: c.type, classe: c.classe || null, exclusif: !!c.exclusif }]));
  const monstres = {};
  for (const [terr, M] of Object.entries(MONSTRES_CLANS)) for (const m of [...M.normaux, M.rare, M.elite, M.boss, ...Object.values(M.autres || {})]) monstres[m.id] = { nom: m.nom, terr, rang: m.rang };
  for (const [terr, m] of Object.entries(BOSS_CAUCHEMAR)) monstres[m.id] = { nom: m.nom, terr, rang: 'cauchemar' };
  res.json({ version: VERSION_JEU, protege: !!process.env.JOURNAL_CLE, ...E, noms: { cartes, monstres } });
});
app.post('/api/clans/equilibrage/reset', (req, res) => {
  if (!process.env.JOURNAL_CLE || req.query.cle !== process.env.JOURNAL_CLE) return res.status(403).json({ erreur: 'Remise à zéro possible seulement avec JOURNAL_CLE défini sur le serveur.' });
  remettreEquilibrage(); res.json({ ok: true });
});

// Comptes : créer, lire, sauvegarder (le code du compte sert de clé)
// zm : la partie de Zone Morte en cours ; enquete : celle des Ombres de Baker Street (compressée, 48 ko au plus) ; zmRecord : sa meilleure survie
const zmRecordValide = (r) => (r && typeof r === 'object' ? { jours: Math.min(365, Number(r.jours) || 0), tues: Math.floor(Number(r.tues) || 0) } : undefined);
const contenuCompte = (b) => (b && typeof b === 'object' ? { progression: b.progression, classe: b.classe, grimoire: b.grimoire, survie: b.survie, pseudo: String(b.pseudo || '').slice(0, 16),
  zm: typeof b.zm === 'string' && b.zm.length <= 48000 ? b.zm : undefined, zmRecord: zmRecordValide(b.zmRecord),
  enquete: typeof b.enquete === 'string' && b.enquete.length <= 30000 ? b.enquete : undefined,
  clans: typeof b.clans === 'string' && b.clans.length <= 30000 ? b.clans : undefined,
  clansPersos: Array.isArray(b.clansPersos) ? b.clansPersos.slice(0, 6).filter((x) => x && typeof x.jeton === 'string' && x.jeton.length <= 80).map((x) => ({ jeton: x.jeton, nom: String(x.nom || '').slice(0, 16), clan: String(x.clan || '').slice(0, 8), classe: String(x.classe || '').slice(0, 12), niv: +x.niv || 1, branche: String(x.branche || '').slice(0, 12) })) : undefined } : {});   // clans : le profil des Clans Élémentaires   // enquete : la partie des Ombres de Baker Street
const anti = new Map();   // limite simple : 1 création toutes les 20 s par adresse
app.post('/api/compte', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress, t = anti.get(ip) || 0;
  if (Date.now() - t < 20000) return res.status(429).json({ erreur: 'Patiente un peu avant de créer un autre compte.' });
  anti.set(ip, Date.now()); if (anti.size > 5000) anti.clear();
  try { res.json({ code: await creerCompte(contenuCompte(req.body)) }); } catch (e) { res.status(500).json({ erreur: e.message }); }
});
app.get('/api/compte/:code', async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  if (!codeValide(code)) return res.status(400).json({ erreur: 'Code invalide' });
  try { const c = await lireCompte(code); c ? res.json(c) : res.status(404).json({ erreur: 'Compte introuvable' }); } catch (e) { res.status(500).json({ erreur: e.message }); }
});
app.put('/api/compte/:code', async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  if (!codeValide(code)) return res.status(400).json({ erreur: 'Code invalide' });
  try {
    if (!(await lireCompte(code))) return res.status(404).json({ erreur: 'Compte introuvable' });
    res.json({ ok: true, maj: (await ecrireCompte(code, contenuCompte(req.body))).maj });
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});
app.get('/health', (_req, res) => res.send('ok'));
// Salon privé : code à 4 caractères -> identifiant de salle
app.get('/api/salon/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const rooms = await colyseus.matchMaker.query({});
  const r = rooms.find((x) => x.metadata?.code === code);
  if (!r) return res.status(404).json({ erreur: 'Salon introuvable' });
  res.json({ roomId: r.roomId, mode: r.metadata.mode, joueurs: r.clients, max: r.maxClients });
});
app.get('/api/conclave/stats', (req, res) => res.json(statsConclave(req.query.nom ? String(req.query.nom).slice(0, 16) : null)));
app.get('/api/version', (_req, res) => res.json({ version: VERSION_JEU, sauvegarde: persistance }));
app.get('/api/stats', (_req, res) => res.json(rapportFusions()));       // équilibrage par fusion
app.get('/api/classement', (_req, res) => res.json(classement(10)));   // meilleurs joueurs
// Mode classé : top 20 de la saison, et ma cote / ma place
app.get('/api/classe', (_req, res) => res.json(classementCote(20)));
app.get('/api/palmares', (_req, res) => res.json(palmares()));   // top 10 des saisons terminées
app.get('/api/survie', (_req, res) => res.json(classementSurvie(10)));
// Zone Morte : fin de partie (une par minute et par adresse) et classement
const antiZm = new Map();
app.post('/api/zonemorte/score', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress, t = antiZm.get(ip) || 0;
  if (Date.now() - t < 60000) return res.status(429).json({ erreur: 'Trop de parties envoyées.' });
  antiZm.set(ip, Date.now()); if (antiZm.size > 5000) antiZm.clear();
  res.json({ place: partieZoneMorte(req.body || {}) });
});
app.get('/api/zonemorte/classement', (_req, res) => res.json(classementZoneMorte(10)));
app.get('/api/classe/:jeton', (req, res) => {
  const j = String(req.params.jeton || '').slice(0, 40), c = coteDe(j);
  res.json(c ? { ...c, place: placeDe(j) } : null);
});

// En production, le serveur sert aussi le client compilé (client/dist)
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  // Compression : les fichiers texte (JS, CSS, HTML, JSON) sont compressés une fois puis gardés en mémoire.
  // Phaser passe ainsi de 1,2 Mo à ~0,25 Mo. Les images (webp) et sons (ogg) sont déjà compressés.
  const compresses = new Map();
  const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let chemin = decodeURIComponent(req.path);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const type = TYPES[path.extname(chemin)];
    const accepte = String(req.headers['accept-encoding'] || '');
    const algo = /\bbr\b/.test(accepte) ? 'br' : /\bgzip\b/.test(accepte) ? 'gzip' : null;
    if (!type || !algo) return next();
    const fichier = path.join(dist, path.normalize(chemin));
    if (!fichier.startsWith(dist + path.sep)) return next();
    const cle = `${algo}:${fichier}`;
    let entree = compresses.get(cle);
    if (!entree) {
      let brut;
      try { brut = fs.readFileSync(fichier); } catch { return next(); }
      if (brut.length < 1024) return next();
      const donnees = algo === 'br'
        ? zlib.brotliCompressSync(brut, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: brut.length } })
        : zlib.gzipSync(brut, { level: 9 });
      entree = { donnees, etag: `"${algo}-${brut.length}-${Math.floor(fs.statSync(fichier).mtimeMs)}"` };
      compresses.set(cle, entree);
    }
    res.set('Content-Type', type);
    res.set('Content-Encoding', algo);
    res.set('Vary', 'Accept-Encoding');
    res.set('ETag', entree.etag);
    res.set('Cache-Control', cacheDe(chemin));
    if (req.headers['if-none-match'] === entree.etag) return res.sendStatus(304);
    res.set('Content-Length', String(entree.donnees.length));
    return req.method === 'HEAD' ? res.end() : res.end(entree.donnees);
  });
  app.use(express.static(dist, { setHeaders: (res, f) => res.set('Cache-Control', cacheDe(f)) }));
}
// Cache navigateur : les fichiers de assets/ ont une empreinte dans leur nom (ils ne changent jamais),
// la page d'accueil est toujours revérifiée, le reste (images, sons) est gardé 10 minutes.
function cacheDe(chemin) {
  const c = chemin.replace(/\\/g, '/');
  if (c.includes('/assets/')) return 'public, max-age=31536000, immutable';
  if (c.endsWith('.html') || c.endsWith('/') || c.endsWith('config.js')) return 'no-cache';
  return 'public, max-age=600';
}

const httpServer = http.createServer(app);
const gameServer = new colyseus.Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('arena', ArenaRoom, { mode: 'melee' });
gameServer.define('royale', ArenaRoom, { mode: 'royale' });
gameServer.define('tournoi', ArenaRoom, { mode: 'tournoi' });
gameServer.define('classe', ArenaRoom, { mode: 'tournoi', classe: true });
gameServer.define('survie', ArenaRoom, { mode: 'survie' });
gameServer.define('duo', ArenaRoom, { mode: 'duo' });
gameServer.define('conclave', ConclaveRoom);   // Le Conclave des éléments (page /conclave)
gameServer.define('zonemorte', ZoneMorteRoom);   // Zone Morte en coop (page /zone-morte)
gameServer.define('clans', ClansRoom);   // Les Clans Élémentaires : le monde partagé (page /clans)

gameServer.listen(PORT).then(() => {
  console.log(`⚔️  Arène Élémentaire — serveur sur http://localhost:${PORT}`);
  garderEveille();
});

// Anti-veille : l'offre gratuite de Render endort le serveur après 15 min sans visite, et le
// premier joueur attend alors jusqu'à une minute. Sur Render (RENDER_EXTERNAL_URL est fourni
// automatiquement), le serveur se rend visite toutes les 10 minutes pour rester éveillé.
// Désactivable avec la variable GARDER_EVEILLE=0. Note : un service toujours éveillé consomme
// ~744 h du quota gratuit de 750 h/mois (partagé entre tes services gratuits).
function garderEveille() {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url || process.env.GARDER_EVEILLE === '0') return;
  setInterval(() => { fetch(`${url}/health`, { cache: 'no-store' }).catch(() => {}); }, 10 * 60 * 1000).unref();
  console.log(`⏰ Anti-veille actif (${url}/health toutes les 10 min)`);
}
