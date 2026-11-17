// Statistiques persistantes : équilibrage par fusion + classements (joueurs, classé, survie)
//
// Deux façons de sauvegarder :
//  - Base Upstash Redis (gratuite) si UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont définis :
//    les classements survivent aux redémarrages et redéploiements de Render.
//  - Sinon, un fichier local data/stats.json (effacé à chaque redémarrage sur l'offre gratuite de Render).
import fs from 'node:fs';
import path from 'node:path';
import { saisonDe, resetDoux, rangDe } from '../../shared/classe.js';
import { FUSIONS } from '../../shared/data.js';

const FILE = path.resolve(process.env.STATS_FILE || 'data/stats.json');
const DB_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_CLE = process.env.STATS_CLE || 'arene:stats';
export const persistance = DB_URL && DB_TOKEN ? 'base' : 'fichier';

let data = { fusions: {}, joueurs: {}, cotes: {}, survie: [] };
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* premier lancement */ }
normaliser();
let dirty = false, pret = persistance === 'fichier';

function normaliser() { data.fusions ||= {}; data.joueurs ||= {}; data.cotes ||= {}; data.survie ||= []; }

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
      pret = true; console.log('🗄️  Statistiques chargées depuis Upstash Redis'); return;
    } catch (e) { console.warn(`Base injoignable (essai ${essai}) :`, e.message); await new Promise((r) => setTimeout(r, 2000 * essai)); }
  }
  console.warn('⚠️  Base injoignable : on continue en mémoire, sans écraser la base');
})();

function fusionner(recu) {
  for (const [k, f] of Object.entries(recu.fusions || {})) { const d = (data.fusions[k] ||= {}); for (const [c, n] of Object.entries(f)) d[c] = (d[c] || 0) + n; }
  for (const [k, j] of Object.entries(recu.joueurs || {})) { const d = (data.joueurs[k] ||= {}); for (const [c, n] of Object.entries(j)) d[c] = (d[c] || 0) + n; }
  for (const [k, c] of Object.entries(recu.cotes || {})) if (!data.cotes[k] || (c.maj || 0) > (data.cotes[k].maj || 0)) data.cotes[k] = c;
  if (recu.conclave && !data.conclave?.parties) data.conclave = recu.conclave;   // Conclave : la base fait foi au démarrage
  for (const s of recu.survie || []) data.survie.push(s);
  data.survie.sort((a, b) => b.vague - a.vague || b.kills - a.kills); data.survie.length = Math.min(data.survie.length, 50);
}

// On limite la taille (la base gratuite accepte ~1 Mo par valeur)
function elaguer() {
  const garder = (obj, n, score) => { const e = Object.entries(obj); if (e.length <= n) return obj; return Object.fromEntries(e.sort((a, b) => score(b[1]) - score(a[1])).slice(0, n)); };
  data.joueurs = garder(data.joueurs, 1500, (j) => (j.victoires || 0) * 50 + (j.kills || 0) + (j.zombies || 0) * 0.1);
  data.cotes = garder(data.cotes, 3000, (c) => (c.maj || 0) / 1e9 + (c.cote || 0));
  if (data.conclave) data.conclave.joueurs = garder(data.conclave.joueurs, 2000, (j) => j.parties || 0);
}

let enCours = false;
export async function save() {
  if (!dirty || enCours) return;
  elaguer();
  const json = JSON.stringify(data);
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

export function statFusion(fusion, champ, n = 1) {
  if (!fusion) return;
  const f = (data.fusions[fusion] ||= { parties: 0, kills: 0, morts: 0, victoires: 0, degats: 0 });
  f[champ] = (f[champ] || 0) + n; dirty = true;
}

export function statJoueur(nom, champ, n = 1) {
  if (!nom) return;
  const j = (data.joueurs[nom] ||= { kills: 0, victoires: 0, zombies: 0 });
  j[champ] = (j[champ] || 0) + n; dirty = true;
}

// ---------- Le Conclave des éléments : résultats de fin de partie ----------
export function partieConclave(fin, bilan, options = {}) {
  const c = (data.conclave ||= { parties: 0, camps: { gardiens: 0, corrompus: 0 }, mercenaires: 0, parBonnes: {}, joueurs: {} });
  c.parties++; c.camps[fin.camp] = (c.camps[fin.camp] || 0) + 1; c.mercenaires += fin.mercenaire.length;
  const b = (c.parBonnes[options.bonnes] ||= { gardiens: 0, corrompus: 0 }); b[fin.camp]++;
  for (const j of bilan) {
    if (j.bot) continue;
    const s = (c.joueurs[j.nom] ||= { parties: 0, victoires: { gardiens: 0, corrompus: 0, mercenaire: 0 }, joues: { gardiens: 0, corrompus: 0, mercenaire: 0 }, exilsJustes: 0, sabotagesCaches: 0 });
    s.parties++; s.joues[j.camp]++; if (j.gagne) s.victoires[j.camp]++;
    s.exilsJustes += j.exilsJustes; s.sabotagesCaches += j.sabotagesCaches;
  }
  dirty = true;
}
export function statsConclave(nom) {
  const c = data.conclave || { parties: 0, camps: {}, mercenaires: 0, parBonnes: {}, joueurs: {} };
  return { parties: c.parties, camps: c.camps, mercenaires: c.mercenaires, parBonnes: c.parBonnes, joueur: nom ? c.joueurs[nom] || null : undefined };
}

export function rapportFusions() {
  const pct = (a, b) => (b ? Math.round((100 * (a || 0)) / b) : null);
  return Object.entries(data.fusions).map(([fusion, f]) => ({
    fusion, nom: FUSIONS[fusion]?.nom || fusion, couleur: FUSIONS[fusion]?.css || '#fff', ...f, ratio: +(f.kills / Math.max(1, f.morts)).toFixed(2),
    degatsParPartie: Math.round(f.degats / Math.max(1, f.parties)),
    // Équilibrage sur les vrais joueurs : taux de choix (pris / proposé), victoires, kills par mort
    tauxChoix: pct(f.choisie, f.proposee),
    tauxVictoireJ: pct(f.victoiresJ, f.partiesJ),
    ratioJ: f.partiesJ ? +((f.killsJ || 0) / Math.max(1, f.mortsJ || 0)).toFixed(2) : null,
  })).sort((a, b) => b.ratio - a.ratio);
}

export function classement(n = 10) {
  return Object.entries(data.joueurs).map(([nom, j]) => ({ nom, ...j }))
    .sort((a, b) => b.victoires - a.victoires || b.kills - a.kills).slice(0, n);
}

// ---------------- Mode classé : cote par joueur (identifié par un jeton aléatoire du navigateur) ----------------
// Saisons mensuelles : au changement de mois, on garde le top 10 de la saison finie (palmarès),
// puis chaque cote est ramenée à mi-chemin de 1000 la première fois qu'on la relit.
function verifierSaison() {
  const cur = saisonDe().n;
  data.saison ||= cur;
  if (data.saison >= cur) return cur;
  const finie = data.saison;
  data.palmares ||= {};
  data.palmares[finie] = Object.values(data.cotes).filter((c) => (c.saison || finie) === finie && c.parties > 0)
    .sort((a, b) => b.cote - a.cote).slice(0, 10).map(({ nom, cote }) => ({ nom, cote, rang: rangDe(cote).nom }));
  data.saison = cur; dirty = true;
  return cur;
}
function aJour(c) {
  const cur = verifierSaison();
  if (!c) return c;
  c.saison ||= cur;
  if (c.saison < cur) {
    c.precedente = { saison: c.saison, meilleure: c.meilleure, rang: rangDe(c.meilleure || c.cote).nom, parties: c.parties };
    c.cote = resetDoux(c.cote); c.parties = 0; c.victoires = 0; c.meilleure = c.cote; c.saison = cur; dirty = true;
  }
  return c;
}
export function coteDe(jeton) { return jeton ? aJour(data.cotes[jeton]) || null : null; }

export function majCote(jeton, nom, cote, place) {
  if (!jeton) return;
  const c = aJour(data.cotes[jeton] ||= { nom, cote: 1000, parties: 0, victoires: 0, meilleure: 1000, saison: saisonDe().n });
  c.nom = String(nom || c.nom).slice(0, 16); c.cote = cote; c.parties++; if (place === 1) c.victoires++;
  c.meilleure = Math.max(c.meilleure || 0, cote); c.maj = Date.now(); dirty = true;
}

export function classementCote(n = 20) {
  const cur = verifierSaison();
  return Object.values(data.cotes).filter((c) => c.parties > 0 && (c.saison || cur) === cur)
    .sort((a, b) => b.cote - a.cote).slice(0, n)
    .map(({ nom, cote, parties, victoires }) => ({ nom, cote, parties, victoires }));
}
export const palmares = () => { verifierSaison(); return data.palmares || {}; };

export function placeDe(jeton) {
  const me = coteDe(jeton); if (!me) return null;
  const cur = data.saison;
  return 1 + Object.values(data.cotes).filter((c) => c.parties > 0 && (c.saison || cur) === cur && c.cote > me.cote).length;
}

// ---------------- Survie : meilleures parties (vague atteinte) ----------------
export function partieSurvie(noms, vague, kills, temps) {
  if (!vague) return;
  data.survie.push({ noms: noms.map((n) => String(n).slice(0, 16)), vague, kills, temps, coop: noms.length > 1, date: Date.now() });
  data.survie.sort((a, b) => b.vague - a.vague || b.kills - a.kills);
  data.survie.length = Math.min(data.survie.length, 50);
  dirty = true;
}
export const classementSurvie = (n = 10) => data.survie.slice(0, n);

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
