// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — quêtes du jour et de la semaine
//  Pur (client + serveur). Le serveur fait avancer les quêtes quand il voit
//  l'événement (combat gagné, filon ramassé…) et paie les récompenses ;
//  le client ne fait qu'afficher.
//  3 quêtes par jour (+ un bonus quand les 3 sont faites), 2 par semaine.
//  Changement de jour et de semaine à minuit UTC (1 h à Paris).
// =====================================================================
import { semaineDe } from './mondial.js';
import { gagner as xpPasse } from './passe.js';
import { avancer as avancerPnj } from './quetesPnj.js';
import { niveau } from './profil.js';

const NOMS_TERR = { feu: 'Terres de Braise', eau: "Lagons d'Azur", plante: "Sylve d'Émeraude" };
const TERRS = ['feu', 'eau', 'plante'];

// ev : l'événement compté ; f : filtre sur les infos de l'événement
const JOUR = [
  { id: 'v3', ev: 'victoire', n: 3, ico: '⚔️', txt: 'Gagne 3 combats en expédition', rec: { essence: 80, eclats: 4 } },
  ...TERRS.map((t) => ({ id: `vt_${t}`, ev: 'victoire', f: { terr: t }, n: 2, ico: '🗺️', txt: `Gagne 2 combats dans les ${NOMS_TERR[t]}`, rec: { essence: 100, eclats: 5 } })),
  { id: 'elite', ev: 'victoire', f: { type: ['elite', 'rare', 'boss'] }, n: 1, ico: '💀', txt: 'Bats un élite, un monstre rare ou un boss', rec: { essence: 120, eclats: 6 } },
  { id: 'tirages', ev: 'tirage', n: 3, ico: '🔮', txt: 'Fais 3 tirages', rec: { essence: 60, eclats: 6 } },
  { id: 'recolte', ev: 'recolter', n: 2, ico: '🏠', txt: 'Récolte ta parcelle 2 fois', rec: { essence: 70, eclats: 3 } },
  { id: 'filon', ev: 'filon', n: 1, ico: '💎', txt: 'Ramasse un filon rare sur la carte', rec: { essence: 90, eclats: 5 } },
  { id: 'ameliorer', ev: 'ameliorer', n: 1, ico: '⬆️', txt: 'Améliore une carte', rec: { essence: 80, eclats: 4 } },
  { id: 'sanct1', ev: 'sanctuaire', n: 1, ico: '🏳️', txt: 'Participe à la prise d’un sanctuaire', rec: { essence: 120, eclats: 6 } },
  { id: 'arene1', ev: 'arene', n: 1, ico: '🏟️', txt: 'Gagne un combat d’arène', rec: { essence: 90, eclats: 5 } },
  { id: 'projet', ev: 'projet', n: 40, ico: '🏗️', txt: 'Donne 40 points au projet de ton clan', rec: { essence: 90, eclats: 5 } },
  { id: 'tour1', ev: 'tour', n: 2, niv: 10, ico: '🗼', txt: 'Monte 2 étages de la Tour infinie', rec: { essence: 100, eclats: 6 } },   // v93
  { id: 'mondial', ev: 'mondial', n: 50, ico: '☠', txt: 'Inflige 50 dégâts à un boss mondial', rec: { essence: 120, eclats: 6 } },
];
const SEMAINE = [
  { id: 'boss2', ev: 'victoire', f: { type: ['boss'] }, n: 2, ico: '👑', txt: "Bats 2 boss d'expédition", rec: { essence: 500, eclats: 30 } },
  { id: 'v20', ev: 'victoire', n: 20, ico: '⚔️', txt: 'Gagne 20 combats en expédition', rec: { essence: 400, eclats: 25 } },
  { id: 'duels', ev: 'duel', n: 3, ico: '🤺', txt: 'Gagne 3 duels contre d’autres clans', rec: { essence: 500, eclats: 30 } },
  { id: 'filons6', ev: 'filon', n: 6, ico: '💎', txt: 'Ramasse 6 filons rares', rec: { essence: 400, eclats: 25 } },
  { id: 'mondial400', ev: 'mondial', n: 400, ico: '☠', txt: 'Inflige 400 dégâts aux boss mondiaux', rec: { essence: 450, eclats: 30 } },
  { id: 'sanct4', ev: 'sanctuaire', n: 4, ico: '🏳️', txt: 'Participe à la prise de 4 sanctuaires', rec: { essence: 500, eclats: 30 } },
  { id: 'arene5', ev: 'arene', n: 5, ico: '🏟️', txt: 'Gagne 5 combats d’arène', rec: { essence: 450, eclats: 30 } },
  { id: 'tour10', ev: 'tour', n: 10, niv: 10, ico: '🗼', txt: 'Monte 10 étages de la Tour infinie', rec: { essence: 500, eclats: 30 } },   // v93
  { id: 'tirages20', ev: 'tirage', n: 20, ico: '🔮', txt: 'Fais 20 tirages', rec: { essence: 350, eclats: 25 } },
];
export const BONUS_JOUR = { essence: 150, eclats: 10 };
export const DEFS = Object.fromEntries([...JOUR, ...SEMAINE].map((q) => [q.id, q]));

export const jourDe = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
// tirage reproductible : mêmes quêtes pour le même joueur le même jour
function hacher(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function choisir(liste, k, graine) {
  const l = liste.slice(); let g = graine || 1;
  for (let i = l.length - 1; i > 0; i--) { g = (Math.imul(g, 1103515245) + 12345) >>> 0; const j = g % (i + 1); [l[i], l[j]] = [l[j], l[i]]; }
  // jamais deux quêtes « combats dans un territoire »
  const out = []; for (const q of l) { if (out.length >= k) break; if (q.id.startsWith('vt_') && out.some((o) => o.id.startsWith('vt_'))) continue; out.push(q); }
  return out;
}

// l'état des quêtes à l'instant t (sans rien modifier) : celui du profil s'il est du jour, sinon un nouveau
export function etat(p, t = Date.now()) {
  const q = p.quetes || {}, jour = jourDe(t), sem = semaineDe(t).id, cle = `${p.creeLe || 0}:${p.nom || ''}`;
  return {
    jour, semaine: sem,
    j: q.jour === jour && Array.isArray(q.j) ? q.j : choisir(JOUR.filter((d) => !d.niv || niveau(p) >= d.niv), 3, hacher(`${cle}:${jour}`)).map((d) => ({ id: d.id, n: 0, ok: false })),
    bonus: q.jour === jour ? !!q.bonus : false,
    s: q.semaine === sem && Array.isArray(q.s) ? q.s : choisir(SEMAINE.filter((d) => !d.niv || niveau(p) >= d.niv), 2, hacher(`${cle}:${sem}`)).map((d) => ({ id: d.id, n: 0, ok: false })),
  };
}
export function aJour(p, t = Date.now()) { p.quetes = etat(p, t); return p.quetes; }

function correspond(d, info) {
  if (!d.f) return true;
  for (const [k, v] of Object.entries(d.f)) { if (Array.isArray(v) ? !v.includes(info?.[k]) : info?.[k] !== v) return false; }
  return true;
}
// un événement : fait avancer les quêtes concernées. Renvoie celles qui viennent d'être terminées.
export function evenement(p, ev, n = 1, info = {}, t = Date.now()) {
  xpPasse(p, ev, n, info, t);   // chaque événement fait aussi avancer le passe de saison (v54)
  avancerPnj(p, ev, n, info);   // … et les quêtes des habitants (v76)
  const q = aJour(p, t), finies = [];
  for (const x of [...q.j, ...q.s]) {
    const d = DEFS[x.id]; if (!d || d.ev !== ev || x.n >= d.n || !correspond(d, info)) continue;
    x.n = Math.min(d.n, x.n + Math.max(0, n | 0)); if (x.n >= d.n) finies.push(d);
  }
  return finies;
}
export const prete = (x) => x && !x.ok && x.n >= (DEFS[x.id]?.n ?? Infinity);
export const bonusPret = (q) => !q.bonus && q.j.length > 0 && q.j.every((x) => x.ok);
// nombre de récompenses à réclamer (pour la pastille du bouton)
export function aReclamer(p, t = Date.now()) { const q = etat(p, t); return [...q.j, ...q.s].filter(prete).length + (bonusPret(q) ? 1 : 0); }

// réclamer : quel = 'j0'…'j2', 's0', 's1' ou 'bonus'
export function reclamer(p, quel, t = Date.now()) {
  const q = aJour(p, t);
  let rec;
  if (quel === 'bonus') { if (!bonusPret(q)) return { ok: false, raison: 'Termine d’abord les 3 quêtes du jour.' }; q.bonus = true; rec = BONUS_JOUR; }
  else {
    const m = /^([js])([0-2])$/.exec(String(quel)); const x = m && q[m[1]][+m[2]];
    if (!prete(x)) return { ok: false, raison: x?.ok ? 'Déjà réclamée.' : 'Quête pas encore terminée.' };
    x.ok = true; rec = DEFS[x.id].rec;
  }
  p.ress.essence += rec.essence; p.ress.eclats = (p.ress.eclats || 0) + rec.eclats;
  return { ok: true, rec, semaine: quel[0] === 's' };
}
