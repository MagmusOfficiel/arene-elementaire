import http from 'node:http';
import { VERSION_JEU } from '../../shared/version.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import colyseus from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom } from './ArenaRoom.js';
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
app.use('/api/compte', express.json({ limit: '64kb' }));

// Comptes : créer, lire, sauvegarder (le code du compte sert de clé)
const contenuCompte = (b) => (b && typeof b === 'object' ? { progression: b.progression, classe: b.classe, grimoire: b.grimoire, survie: b.survie, pseudo: String(b.pseudo || '').slice(0, 16) } : {});
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
app.get('/api/version', (_req, res) => res.json({ version: VERSION_JEU, sauvegarde: persistance }));
app.get('/api/stats', (_req, res) => res.json(rapportFusions()));       // équilibrage par fusion
app.get('/api/classement', (_req, res) => res.json(classement(10)));   // meilleurs joueurs
// Mode classé : top 20 de la saison, et ma cote / ma place
app.get('/api/classe', (_req, res) => res.json(classementCote(20)));
app.get('/api/palmares', (_req, res) => res.json(palmares()));   // top 10 des saisons terminées
app.get('/api/survie', (_req, res) => res.json(classementSurvie(10)));
app.get('/api/classe/:jeton', (req, res) => {
  const j = String(req.params.jeton || '').slice(0, 40), c = coteDe(j);
  res.json(c ? { ...c, place: placeDe(j) } : null);
});

// En production, le serveur sert aussi le client compilé (client/dist)
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) app.use(express.static(dist));

const httpServer = http.createServer(app);
const gameServer = new colyseus.Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('arena', ArenaRoom, { mode: 'melee' });
gameServer.define('royale', ArenaRoom, { mode: 'royale' });
gameServer.define('tournoi', ArenaRoom, { mode: 'tournoi' });
gameServer.define('classe', ArenaRoom, { mode: 'tournoi', classe: true });
gameServer.define('survie', ArenaRoom, { mode: 'survie' });
gameServer.define('duo', ArenaRoom, { mode: 'duo' });

gameServer.listen(PORT).then(() => {
  console.log(`⚔️  Arène Élémentaire — serveur sur http://localhost:${PORT}`);
});
