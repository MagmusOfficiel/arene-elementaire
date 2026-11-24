// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le passe de saison (v54)
//  Pur (client + serveur). Une saison par mois (comme l'arène) : 30 niveaux,
//  gratuits, gagnés avec l'XP de toutes les activités (combats, quêtes,
//  arène, sanctuaires, duels, boss mondial, projet du clan…).
//  Récompenses : essence, éclats, ressources rares, et 3 apparences
//  exclusives par saison (elles tournent de mois en mois).
//  Le serveur donne l'XP (à chaque événement des quêtes) ; le joueur
//  réclame ses récompenses dans la fenêtre du passe.
// =====================================================================
import { saisonDe } from './arene.js';
import { RARES } from './cartes.js';

export const NIVEAUX = 30;
export const XP_NIVEAU = 300;   // 9 000 XP pour finir le passe : environ 3 semaines en jouant un peu chaque jour
// l'XP de chaque événement (mêmes noms que les quêtes) ; info : comme pour les quêtes
export const XP = {
  victoire: (n, i) => n * ({ boss: 80, elite: 35, rare: 35 }[i?.type] || 20),
  tirage: (n) => n * 3,
  recolter: () => 10,
  filon: (n) => n * 15,
  ameliorer: (n) => n * 15,
  sanctuaire: (n) => n * 60,
  arene: (n) => n * 40,
  duel: (n) => n * 40,
  mondial: (n) => Math.min(60, Math.floor(n / 4)),
  projet: (n) => Math.min(80, Math.floor(n / 10)),
  quete: (n) => n * 60,
  queteSemaine: (n) => n * 200,
};
export const XP_TXT = '20 par combat gagné (35 élite, 80 boss) · 60 par quête du jour, 200 par quête de la semaine · 40 par victoire en arène ou en duel · 60 par sanctuaire pris · 15 par filon ou amélioration · un peu pour le boss mondial, les dons au projet, les tirages et les récoltes';

// les apparences exclusives : un lot de 3 par saison, les lots tournent chaque mois
export const LOTS = [
  { nom: 'Aube', pieces: ['t_aube', 'c_aube', 'a_aube'] },
  { nom: 'Abysses', pieces: ['t_abysses', 'c_abysses', 'a_abysses'] },
  { nom: 'Sève ancienne', pieces: ['t_seve', 'c_seve', 'a_seve'] },
  { nom: 'Éclipse', pieces: ['t_eclipse', 'c_eclipse', 'a_eclipse'] },
];
const numSaison = (id) => { const [a, m] = id.split('-').map(Number); return a * 12 + m - 1; };
export const lotDe = (id) => LOTS[((numSaison(id) - (2026 * 12 + 10)) % LOTS.length + LOTS.length) % LOTS.length];   // novembre 2026 : Aube
// v83 : quand une pièce exclusive revient-elle ? { maintenant, niv, dansMois }
export function quandPiece(piece, t = Date.now()) {
  const k = LOTS.findIndex((l) => l.pieces.includes(piece)); if (k < 0) return null;
  const niv = [20, 10, 30][LOTS[k].pieces.indexOf(piece)];
  const ici = ((numSaison(saisonDe(t).id) - (2026 * 12 + 10)) % LOTS.length + LOTS.length) % LOTS.length;
  const dans = (k - ici + LOTS.length) % LOTS.length;
  return { maintenant: dans === 0, niv, dansMois: dans };
}

// la récompense de chaque niveau (1 à 30) pour une saison
export function recompense(niv, saison) {
  const lot = lotDe(saison);
  if (niv === 10) return { piece: lot.pieces[1] };
  if (niv === 20) return { piece: lot.pieces[0] };
  if (niv === 30) return { piece: lot.pieces[2], essence: 2000 };
  if (niv % 5 === 0) return { rare: niv / 5 + 1, eclats: 20 };     // 5, 15, 25 : ressources rares de son clan
  return niv % 2 ? { essence: 150 + niv * 10 } : { eclats: 8 + Math.floor(niv / 3) };
}

export const niveauDe = (xp) => Math.min(NIVEAUX, Math.floor(xp / XP_NIVEAU));
// la saison change : on repart de zéro (les récompenses atteintes mais pas réclamées sont données d'office)
export function aJour(p, t = Date.now()) {
  const s = saisonDe(t).id;
  if (p.passe?.s === s) return p.passe;
  if (p.passe?.s && Array.isArray(p.passe.recu)) donner(p, p.passe);
  p.passe = { s, xp: 0, recu: [] };
  return p.passe;
}
// le serveur ajoute l'XP d'un événement ; renvoie les niveaux gagnés
export function gagner(p, ev, n = 1, info = {}, t = Date.now()) {
  const f = XP[ev]; if (!f || !p) return 0;
  const x = aJour(p, t), avant = niveauDe(x.xp), gain = Math.max(0, Math.floor(f(Math.max(0, +n || 0), info)));
  x.xp = Math.min(NIVEAUX * XP_NIVEAU, x.xp + gain);
  return niveauDe(x.xp) - avant;
}
export const aReclamer = (p, t = Date.now()) => { const x = p.passe?.s === saisonDe(t).id ? p.passe : null; if (!x) return 0; let k = 0; for (let n = 1; n <= niveauDe(x.xp); n++) if (!x.recu.includes(n)) k++; return k; };

// réclamer toutes les récompenses des niveaux atteints
export function reclamer(p, t = Date.now()) {
  const total = donner(p, aJour(p, t));
  return total.essence || total.eclats || total.rare || total.pieces.length ? { ok: true, total } : { ok: false, raison: 'Rien à réclamer pour l’instant.' };
}
function donner(p, x) {
  const rare = RARES[p.clan]?.id || 'cristal', total = { essence: 0, eclats: 0, rare: 0, pieces: [] };
  for (let n = 1; n <= niveauDe(x.xp); n++) {
    if (x.recu.includes(n)) continue;
    const r = recompense(n, x.s);
    if (r.essence) { p.ress.essence += r.essence; total.essence += r.essence; }
    if (r.eclats) { p.ress.eclats = (p.ress.eclats || 0) + r.eclats; total.eclats += r.eclats; }
    if (r.rare) { p.ress[rare] = (p.ress[rare] || 0) + r.rare; total.rare += r.rare; }
    if (r.piece) { p.garde ||= []; if (!p.garde.includes(r.piece)) p.garde.push(r.piece); total.pieces.push(r.piece); }
    x.recu.push(n);
  }
  return total;
}
export const finSaison = (t = Date.now()) => saisonDe(t).fin;
