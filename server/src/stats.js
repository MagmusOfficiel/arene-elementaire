// Données persistantes des Clans Élémentaires : comptes, profils, saisons, sanctuaires, maisons, arène
//
// Deux façons de sauvegarder :
//  - Base Upstash Redis (gratuite) si UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont définis :
//    les classements survivent aux redémarrages et redéploiements de Render.
//  - Sinon, un fichier local data/stats.json (effacé à chaque redémarrage sur l'offre gratuite de Render).
import fs from 'node:fs';
import path from 'node:path';
import { semaineDe } from '../../shared/clans/mondial.js';
import { saisonDe as saisonArn } from '../../shared/clans/arene.js';

const FILE = path.resolve(process.env.STATS_FILE || 'data/stats.json');
const DB_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_CLE = process.env.STATS_CLE || 'arene:stats';
export const persistance = DB_URL && DB_TOKEN ? 'base' : 'fichier';

// les anciens jeux du site (Arène, Conclave, Zone Morte) ont été retirés : on oublie leurs données
const ANCIENNES = ['fusions', 'joueurs', 'cotes', 'survie', 'zonemorte', 'conclave', 'palmares', 'saison'];
let data = {};
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* premier lancement */ }
normaliser();
let dirty = false, pret = persistance === 'fichier';

function normaliser() { for (const k of ANCIENNES) delete data[k]; }

async function redis(cmd) {
  const r = await fetch(DB_URL, { method: 'POST', headers: { Authorization: `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Upstash ${r.status}`);
  return (await r.json()).result;
}

// Au démarrage : on récupère les classements depuis la base
export const chargement = (async () => {
  if (persistance !== 'base') { console.log('📁 Statistiques : fichier local (pas de base configurée)'); return; }
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const brut = await redis(['GET', DB_CLE]);
      if (brut) {
        const enBase = JSON.parse(brut);
        // ce qui a pu arriver pendant le chargement s'ajoute à ce qui était en base
        const recu = data; data = enBase; normaliser(); fusionner(recu);
      }
      pret = true; console.log('🗄️  Statistiques chargées depuis Upstash Redis');
      // v81 : on vérifie qu'on peut aussi ÉCRIRE (un jeton « read only » lit très bien mais n'enregistre rien)
      try { await redis(['SET', `${DB_CLE}:test-ecriture`, String(Date.now())]); console.log('✅ Écriture dans la base : OK'); }
      catch (e) { console.error(`❌❌ LA BASE REFUSE L'ÉCRITURE (${e.message}) : rien ne sera sauvegardé ! Vérifie que UPSTASH_REDIS_REST_TOKEN est le jeton normal, pas le « read only ».`); }
      return;
    } catch (e) { console.warn(`Base injoignable (essai ${essai}) :`, e.message); await new Promise((r) => setTimeout(r, 2000 * essai)); }
  }
  console.warn('⚠️  Base injoignable : on continue en mémoire, sans écraser la base');
})();

function fusionner(recu) {
  // ce qui a pu arriver pendant le chargement (quelques secondes) : la base fait foi, sauf pour ce qu'elle n'a pas
  for (const [k, v] of Object.entries(recu)) if (data[k] == null) data[k] = v;
}

// On limite la taille (la base gratuite accepte ~1 Mo par valeur)
function elaguer(serre = false) {
  const k = serre ? 0.5 : 1;   // « serre » : la sauvegarde approchait la limite, on garde moitié moins
  const garder = (obj, n, score) => { const e = Object.entries(obj); if (e.length <= n) return obj; return Object.fromEntries(e.sort((a, b) => score(b[1]) - score(a[1])).slice(0, n)); };
  if (data.clansArene) data.clansArene.joueurs = garder(data.clansArene.joueurs || {}, 300 * k, (e) => (e.v + e.d > 0 ? 1e13 : 0) + (e.t || 0));
  if (data.clansSaison) data.clansSaison.joueurs = garder(data.clansSaison.joueurs || {}, 400 * k, (j) => j.pts || 0);
}

let enCours = false;
export async function save() {
  if (!dirty || enCours) return;
  elaguer();
  let json = JSON.stringify(data);
  // filet de sécurité : la base gratuite refuse une valeur de plus de 1 Mo
  if (json.length > 850000) {
    const parts = Object.entries(data).map(([k, v]) => [k, JSON.stringify(v ?? null).length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.warn(`⚠️ Stats volumineuses (${Math.round(json.length / 1024)} Ko) : on garde moins d'entrées. Plus gros morceaux : ${parts.map(([k, n]) => `${k} ${Math.round(n / 1024)} Ko`).join(', ')}`);
    elaguer(true); json = JSON.stringify(data);
  }
  dirty = false;
  if (persistance === 'base') {
    if (!pret) { dirty = true; return; }       // jamais écraser la base avant de l'avoir lue
    enCours = true;
    try { await redis(['SET', DB_CLE, json]); } catch (e) { dirty = true; console.warn('Sauvegarde en base ratée :', e.message); }
    finally { enCours = false; }
  } else {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, json);
  }
}
setInterval(save, persistance === 'base' ? 60000 : 30000).unref();
const quitter = () => { Promise.race([save(), new Promise((r) => setTimeout(r, 4000))]).finally(() => process.exit(0)); };
process.on('SIGINT', quitter);
process.on('SIGTERM', quitter);


// ---------------- Comptes : sauvegarde de la progression (niveau, cosmétiques, cote, grimoire…) ----------------
// Un compte = un code (« K7QF-2XMB ») qui permet de retrouver sa progression sur n'importe quel appareil.
// En base, chaque compte a sa propre clé ; sinon, ils sont gardés dans le fichier de stats.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const codeValide = (c) => /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(String(c || ''));
const nouveauCode = () => [0, 1].map(() => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('')).join('-');

export async function lireCompte(code) {
  if (!codeValide(code)) return null;
  if (persistance === 'base') { const brut = await redis(['GET', `${DB_CLE}:compte:${code}`]); return brut ? JSON.parse(brut) : null; }
  return data.comptes?.[code] || null;
}
export async function ecrireCompte(code, contenu) {
  if (!codeValide(code)) throw new Error('code invalide');
  const c = { ...contenu, maj: Date.now() };
  if (persistance === 'base') await redis(['SET', `${DB_CLE}:compte:${code}`, JSON.stringify(c)]);
  else {
    data.comptes ||= {}; data.comptes[code] = c; dirty = true;
    const k = Object.keys(data.comptes);   // fichier : on garde les 3000 comptes les plus récents
    if (k.length > 3000) k.sort((a, b) => data.comptes[a].maj - data.comptes[b].maj).slice(0, k.length - 3000).forEach((x) => delete data.comptes[x]);
  }
  return c;
}
export async function creerCompte(contenu) {
  for (let i = 0; i < 6; i++) { const code = nouveauCode(); if (!(await lireCompte(code))) { await ecrireCompte(code, contenu); return code; } }
  throw new Error('création impossible');
}

// ---------- Les Clans Élémentaires : rivalité des clans (saison d'une semaine) ----------
function saisonClans() {
  const s = semaineDe();
  let c = data.clansSaison;
  if (!c || c.id !== s.id) {
    const ancien = c && Object.values(c.clans || {}).some((v) => v > 0) ? c : null;
    const champion = ancien ? Object.entries(ancien.clans).sort((a, b) => b[1] - a[1])[0][0] : (c?.champion || null);
    if (ancien) { (data.clansPalmares ||= []).unshift({ semaine: ancien.id, champion, clans: ancien.clans }); data.clansPalmares.length = Math.min(data.clansPalmares.length, 12); }
    c = data.clansSaison = { id: s.id, fin: s.fin, clans: { feu: 0, eau: 0, plante: 0 }, joueurs: {}, champion };
    dirty = true;
  }
  return c;
}
export function pointsClan(clan, nom, pts) {
  if (!['feu', 'eau', 'plante'].includes(clan) || !(pts > 0)) return;
  const c = saisonClans();
  c.clans[clan] += pts;
  if (nom) { const j = (c.joueurs[`${clan}:${nom}`] ||= { nom, clan, pts: 0 }); j.pts += pts; }
  const e = Object.entries(c.joueurs); if (e.length > 600) c.joueurs = Object.fromEntries(e.sort((a, b) => b[1].pts - a[1].pts).slice(0, 400));
  dirty = true;
}
export function classementClans() {
  const c = saisonClans();
  return { semaine: c.id, fin: c.fin, clans: c.clans, champion: c.champion, joueurs: Object.values(c.joueurs).sort((a, b) => b.pts - a.pts).slice(0, 15), palmares: (data.clansPalmares || []).slice(0, 5) };
}

// ---------- Les Clans Élémentaires : profils des joueurs (gardés par le serveur) ----------
// En base : une clé par joueur. Sinon : dans le fichier de stats (5000 profils au plus).
export const jetonValide = (j) => /^[A-Za-z0-9_-]{20,40}$/.test(String(j || ''));
export async function lireProfilClans(jeton) {
  if (!jetonValide(jeton)) return null;
  if (persistance === 'base') { const brut = await redis(['GET', `${DB_CLE}:clans:${jeton}`]); return brut ? JSON.parse(brut) : null; }
  return data.clansProfils?.[jeton]?.p || null;
}
export async function ecrireProfilClans(jeton, p) {
  if (!jetonValide(jeton) || !p) return;
  if (persistance === 'base') { await redis(['SET', `${DB_CLE}:clans:${jeton}`, JSON.stringify(p)]); return; }
  data.clansProfils ||= {}; data.clansProfils[jeton] = { p, maj: Date.now() }; dirty = true;
  const k = Object.keys(data.clansProfils);
  if (k.length > 5000) k.sort((a, b) => data.clansProfils[a].maj - data.clansProfils[b].maj).slice(0, k.length - 5000).forEach((x) => delete data.clansProfils[x]);
}

// ---------- Les Clans Élémentaires : qui tient les sanctuaires ----------
export function lireSanctuaires() { return data.clansSanctuaires || null; }
export function ecrireSanctuaires(props) { data.clansSanctuaires = { ...props }; dirty = true; }
// ---------- Les Clans Élémentaires : les projets de clan de la semaine (v52) ----------
// ---------- Les Clans Élémentaires : les maisons posées par les joueurs (v72) ----------
// { empreinte du jeton : [clan, x, y] } : pour qu'on ne pose pas deux maisons au même endroit
export function maisonsPosees(clan, sauf = null) { return Object.entries(data.clansMaisons || {}).filter(([k, v]) => k !== sauf && v[0] === clan).map(([, v]) => ({ x: v[1], y: v[2] })); }
export function ecrireMaison(cle, clan, x, y) { (data.clansMaisons ||= {})[cle] = [clan, x, y]; dirty = true; }
export function lireProjets() { return data.clansProjets || null; }
export function ecrireProjets(e) { data.clansProjets = e; dirty = true; }

// ---------- Les Clans Élémentaires : l'arène classée (saison d'un mois) ----------
// joueurs : { id (empreinte du jeton) : { nom, clan, classe, elo, v, d, deck, pvMax, t } }
function saisonArene() {
  const s = saisonArn();
  let a = data.clansArene;
  if (!a || a.saison !== s.id) {
    if (a && Object.keys(a.joueurs || {}).length) {
      const top = Object.values(a.joueurs).sort((x, y) => y.elo - x.elo).slice(0, 3).map(({ nom, clan, elo }) => ({ nom, clan, elo }));
      (data.clansArenePalmares ||= []).unshift({ saison: a.saison, top }); data.clansArenePalmares.length = Math.min(data.clansArenePalmares.length, 6);
    }
    a = data.clansArene = { saison: s.id, fin: s.fin, joueurs: {} }; dirty = true;
  }
  return a;
}
// les decks sont gardés en texte court (« frappe,garde:2,… ») : 4 fois moins de place
const deckEnTexte = (d) => (Array.isArray(d) ? d.map((k) => `${k.id}${(k.niv || 1) > 1 ? `:${k.niv}` : ''}`).join(',') : '');
const deckDeTexte = (t) => (typeof t === 'string' && t ? t.split(',').map((x) => { const [id, n] = x.split(':'); return { id, niv: +n || 1 }; }) : Array.isArray(t) ? t : []);
export function areneEnregistrer(id, e) {
  const a = saisonArene(); a.joueurs[id] = { ...e, deck: deckEnTexte(e.deck), t: Date.now() }; dirty = true;
  const l = Object.entries(a.joueurs); if (l.length > 400) a.joueurs = Object.fromEntries(l.sort((x, y) => y[1].t - x[1].t).slice(0, 300));
}
export function areneJoueurs() { return Object.fromEntries(Object.entries(saisonArene().joueurs).map(([k, e]) => [k, { ...e, deck: deckDeTexte(e.deck) }])); }
export function classementArene(id) {
  const a = saisonArene(), l = Object.entries(a.joueurs).filter(([, e]) => e.v + e.d > 0).sort((x, y) => y[1].elo - x[1].elo);
  const rang = id ? l.findIndex(([k]) => k === id) + 1 : 0;
  return { saison: a.saison, fin: a.fin, top: l.slice(0, 20).map(([, e]) => ({ nom: e.nom, clan: e.clan, classe: e.classe, elo: e.elo, v: e.v, d: e.d })), rang, total: l.length, palmares: (data.clansArenePalmares || []).slice(0, 3) };
}

// ---------- Les Clans Élémentaires : statistiques d'équilibrage (compteurs, quelques Ko) ----------
export function equilibrage() {
  const E = (data.clansEquilibrage ||= {});
  E.depuis ||= Date.now(); E.nCombats ||= 0; E.nDuels ||= 0;
  for (const k of ['rencontres', 'classes', 'clans', 'cartes', 'monstres', 'duels']) E[k] ||= {};
  dirty = true;
  return E;
}
export function remettreEquilibrage() { data.clansEquilibrage = null; dirty = true; return equilibrage(); }
