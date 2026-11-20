// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le marchand ambulant (v58)
//  Pur (client + serveur). Une heure sur trois passages de 20 minutes (v74 :
//  20 min de présence par heure), un marchand s'installe
//  ailleurs sur la carte (sur les chemins, dans un village, au Carrefour)
//  avec 3 échanges. Il revient sans cesse : ce n'est pas un événement
//  limité, juste une raison de se promener. Sa place et ses offres se
//  déduisent de l'heure : pas besoin de réseau pour les connaître.
//  Chaque offre s'achète une fois par joueur et par passage.
// =====================================================================
import { alea } from './combat.js';
import { CENTRES, CARREFOUR } from './geo.js';

export const DUREE = 20 * 60 * 1000;
// v74 : il ne vient plus qu'un passage sur 3 (20 min de présence par heure)
export const TOUS_LES = 3;
// (les tests de bout en bout le gardent toujours là : CLANS_TEST_MARCHAND=1 côté serveur, __marchandToujours côté page)
const toujours = () => globalThis.__marchandToujours === true || (typeof process !== 'undefined' && process.env?.CLANS_TEST_MARCHAND === '1');
export const present = (s) => toujours() || s % TOUS_LES === 0;
// le début de son prochain passage
export const prochainPassage = (t = Date.now()) => { let s = slotDe(t) + 1; while (!present(s)) s++; return s * DUREE; };
export const PORTEE = 44;   // distance pour lui parler (le serveur tolère un peu plus)
const mi = (a, b, k = 0.5) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)];
// ses places : à mi-chemin entre le Carrefour et chaque village, à l'entrée de chaque village, et près du Carrefour
export const PLACES = [
  { nom: 'au Carrefour', pos: [CARREFOUR[0] + 96, CARREFOUR[1] + 64] },
  { nom: 'sur la route des Terres de Braise', pos: mi(CARREFOUR, CENTRES.feu) },
  { nom: 'sur la route des Lagons d’Azur', pos: mi(CARREFOUR, CENTRES.eau) },
  { nom: 'sur la route de la Sylve d’Émeraude', pos: mi(CARREFOUR, CENTRES.plante) },
  { nom: 'à l’entrée du village du Feu', pos: mi(CARREFOUR, CENTRES.feu, 0.82) },
  { nom: 'à l’entrée du village de l’Eau', pos: mi(CARREFOUR, CENTRES.eau, 0.78) },
  { nom: 'à l’entrée du village de la Plante', pos: mi(CARREFOUR, CENTRES.plante, 0.82) },
];
const MAT = ['braises', 'perles', 'seve'], RARE = ['cristal', 'perle_noire', 'graine_or'];
export const slotDe = (t = Date.now()) => Math.floor(t / DUREE);

// sa place : il fait le tour de toutes les places dans un ordre mélangé, puis recommence dans un autre ordre
// (jamais deux fois de suite au même endroit, même d'un tour à l'autre)
const ordre = (b) => { const l = PLACES.map((_, i) => i), r = alea(b * 104729 + 7); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
function placeDe(s) {
  const N = PLACES.length, b = Math.floor(s / N), l = ordre(b);
  if (b > 0 && l[0] === ordre(b - 1)[N - 1]) [l[0], l[1]] = [l[1], l[0]];
  return l[s % N];
}
// où il est, ce qu'il vend, quand il repart
export function marchandDe(t = Date.now()) {
  const s = slotDe(t), r = alea(s * 7919 + 13);
  const n = placeDe(Math.floor(s / TOUS_LES));   // ses passages se suivent : jamais deux fois de suite au même endroit
  const tire = (l) => l[Math.floor(r() * l.length)];
  const autre = (x) => { const l = MAT.filter((m) => m !== x); return tire(l); };
  const genres = [
    () => { const a = tire(MAT); return { donne: { [a]: 60 }, recoit: { [autre(a)]: 40 } }; },            // matériaux : un clan contre un autre
    () => ({ donne: { essence: 500 }, recoit: { [tire(MAT)]: 45 } }),
    () => ({ donne: { essence: 1100 }, recoit: { [tire(RARE)]: 2 } }),
    () => ({ donne: { [tire(MAT)]: 90 }, recoit: { eclats: 18 } }),
    () => ({ donne: { eclats: 30 }, recoit: { essence: 650 } }),
    () => { const a = tire(RARE), b = RARE.filter((x) => x !== a)[Math.floor(r() * 2)]; return { donne: { [a]: 3 }, recoit: { [b]: 2 } }; },
  ];
  // 3 offres de genres différents
  const pris = new Set(), offres = [];
  while (offres.length < 3) { const g = Math.floor(r() * genres.length); if (pris.has(g)) continue; pris.add(g); offres.push(genres[g]()); }
  const [x, y] = PLACES[n].pos;
  return { slot: s, place: PLACES[n].nom, x, y, offres, part: (s + 1) * DUREE, present: present(s), revient: prochainPassage(t) };
}
// les offres déjà prises par ce joueur pendant ce passage
export const achats = (p, slot) => (p.marchand?.slot === slot && Array.isArray(p.marchand.l) ? p.marchand.l : []);
export const peutPayer = (p, o) => Object.entries(o.donne).every(([k, v]) => (p.ress[k] || 0) >= v);

// acheter l'offre i ; pos : où le serveur voit le joueur
export function acheter(p, i, pos, t = Date.now()) {
  const m = marchandDe(t), o = m.offres[i | 0];
  if (!m.present) return { ok: false, raison: 'Le marchand est reparti.' };
  if (!o || !Number.isInteger(i)) return { ok: false };
  if (!pos || Math.hypot(pos.x - m.x, pos.y - m.y) > PORTEE + 60) return { ok: false, raison: 'Le marchand est trop loin.' };
  if (achats(p, m.slot).includes(i)) return { ok: false, raison: 'Tu as déjà pris cette offre. Il en aura d’autres au prochain passage.' };
  if (!peutPayer(p, o)) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(o.donne)) p.ress[k] -= v;
  for (const [k, v] of Object.entries(o.recoit)) p.ress[k] = (p.ress[k] || 0) + v;
  p.marchand = { slot: m.slot, l: [...achats(p, m.slot), i] };
  return { ok: true, res: o };
}
