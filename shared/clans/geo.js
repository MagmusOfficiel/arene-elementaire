// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la géographie du monde (partagée)
//  Le monde est une grille de tuiles de 16 px (style pixel art).
//  Territoires, Carrefour, villages, portails, sols, obstacles, chemins.
//  Le client s'en sert pour dessiner ; le serveur pour savoir qui est
//  chez qui (duels) et où faire pousser les filons rares.
// =====================================================================
export const TUILE = 16;
// v87 (Chapitre 2) : la carte s'agrandit vers le sud — les Terres Brisées
// v96 (Chapitre 3) : et vers l'est — les Cimes Orageuses
// v100 : le Désert d'Ambre (Chapitre 4) passe À GAUCHE de la carte, les Îles Célestes (Chapitre 5) EN HAUT.
// L'« ancien monde » (les 3 terres, le Carrefour, la Faille, les Cimes) est décalé de (OX, OY) :
// son relief est calculé dans ses coordonnées d'origine (« locales »), il ne change donc pas d'un pixel.
import { OX, OY } from './decalage.js';
export { OX, OY };
export const MONDE = { l: OX + 4000, h: OY + 2880 };
export const NT = { l: MONDE.l / TUILE, h: MONDE.h / TUILE };   // 290 × 220 tuiles
const OTX = OX / TUILE, OTY = OY / TUILE;
const W = ([x, y]) => [x + OX, y + OY];   // local → monde
// --- l'ancien monde, en coordonnées locales ---
const L_FAILLE_Y = 2140, L_CIMES_X = 3220;
const L_CENTRE_FAILLE = [1608, 2520], L_CENTRE_CIMES = [3640, 1100], L_CARREFOUR = [1608, 1096];
const L_CENTRES = { feu: [648, 1544], eau: [1608, 424], plante: [2568, 1544] };
const L_LIEUX = [
  { id: 'autel', nom: 'Autel des tirages', x: 1608, y: 1096, r: 44, action: 'tirage' },
  { id: 'portail_feu', nom: 'Portail des Terres de Braise', x: 296, y: 1880, r: 40, action: 'expedition', terr: 'feu' },
  { id: 'portail_eau', nom: "Portail des Lagons d'Azur", x: 1608, y: 136, r: 40, action: 'expedition', terr: 'eau' },
  { id: 'portail_plante', nom: "Portail de la Sylve d'Émeraude", x: 2920, y: 1880, r: 40, action: 'expedition', terr: 'plante' },
  // v87 : le cœur des Terres Brisées
  { id: 'portail_faille', nom: 'Portail de la Faille', x: 1608, y: 2760, r: 40, action: 'expedition', terr: 'brisees' },
  // v96 : au sommet des Cimes Orageuses
  { id: 'portail_cimes', nom: 'Portail des Cimes', x: 3840, y: 560, r: 40, action: 'expedition', terr: 'cimes' },
];
// --- le monde (ce que tout le reste du jeu utilise) ---
export const FAILLE_Y = L_FAILLE_Y + OY, NIV_FAILLE = 30;
export const CENTRE_FAILLE = W(L_CENTRE_FAILLE);
export const CIMES_X = L_CIMES_X + OX, NIV_CIMES = 50;
export const CENTRE_CIMES = W(L_CENTRE_CIMES);
export const CENTRES = Object.fromEntries(Object.entries(L_CENTRES).map(([k, c]) => [k, W(c)]));
export const CARREFOUR = W(L_CARREFOUR);
// v100 : le Désert d'Ambre, tout à gauche (x < AMBRE_X), et les Îles Célestes, tout en haut (y < CIEL_Y)
export const AMBRE_X = OX, NIV_AMBRE = 70;
export const CENTRE_AMBRE = [330, OY + 1250];   // v102 : remonté (la Faille occupe le bas)
export const CIEL_Y = OY, NIV_CIEL = 90;
export const CENTRE_CIEL = [OX + 1608, 300];   // v101 : juste au-dessus des Lagons d'Azur
const PORTAIL_EAU = [OX + 1608, OY + 136];   // le Pont des Étoiles part du portail de l'Azur, tout droit vers le haut
import { SANCTUAIRES } from './territoires.js';
export const LIEUX = [
  ...L_LIEUX.map((l) => ({ ...l, x: l.x + OX, y: l.y + OY })),
  // v99 : tout en haut des Îles Célestes, l'Observatoire
  { id: 'portail_ciel', nom: 'Portail de l’Observatoire', x: 3300, y: 220, r: 40, action: 'expedition', terr: 'ciel' },
  // v98 : au fond du Désert d'Ambre, la porte de la cité ensevelie
  { id: 'portail_ambre', nom: 'Porte de la Cité ensevelie', x: 300, y: OY + 420, r: 40, action: 'expedition', terr: 'ambre' },
];
const L_SANCT = SANCTUAIRES.map((s) => ({ x: s.x - OX, y: s.y - OY }));
export const alea = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export function bruit(x, y) { return Math.sin(x * 0.013 + Math.sin(y * 0.021) * 2) * 0.5 + Math.sin(y * 0.017 + Math.cos(x * 0.011) * 2) * 0.5; }
const bruitL = (x, y) => bruit(x * 0.5, y * 0.5);   // grandes formes (côtes, lacs de lave)

// ---- les lisières (en coordonnées locales pour l'ancien monde) ----
const lFaille = (xl) => L_FAILLE_Y + 26 + Math.sin(xl / 140) * 22 + Math.sin(xl / 47 + 1.3) * 9 + bruitL(xl, L_FAILLE_Y) * 20;
const lCimes = (yl) => L_CIMES_X + 26 + Math.sin(yl / 150) * 24 + Math.sin(yl / 53 + 0.7) * 9 + bruitL(L_CIMES_X, yl) * 18;
// en coordonnées du monde
export const lisiereFaille = (x) => lFaille(x - OX) + OY;   // le y de la lisière, pour un x donné
export const lisiereCimes = (y) => lCimes(y - OY) + OX;     // le x de la lisière, pour un y donné
export const lisiereAmbre = (y) => AMBRE_X - 20 + Math.sin(y / 170) * 22 + Math.sin(y / 61 + 2.1) * 8 + bruitL(AMBRE_X, y) * 16;   // x
export const lisiereCiel = (x) => CIEL_Y - 10 + Math.sin(x / 140) * 18 + bruitL(x, CIEL_Y) * 12;   // y
// v102 : comme les îles en haut, les Terres Brisées occupent tout le bas de la carte, d'un bord à l'autre
// (le désert et les Cimes s'arrêtent à la Faille)
export const dansCiel = (x, y) => y < lisiereCiel(x);
export const dansFaille = (x, y) => !dansCiel(x, y) && y > lisiereFaille(x);
export const dansAmbre = (x, y) => !dansCiel(x, y) && !dansFaille(x, y) && x < lisiereAmbre(y);
const ancien = (x, y) => !dansCiel(x, y) && !dansAmbre(x, y);
export const dansCimes = (x, y) => ancien(x, y) && !dansFaille(x, y) && x > lisiereCimes(y);
// à quel territoire appartient un point (null : le Carrefour ou les régions neutres)
function territoireL(xl, yl) {
  if (yl > lFaille(xl) || xl > lCimes(yl)) return null;
  if (Math.hypot(xl - L_CARREFOUR[0], yl - L_CARREFOUR[1]) < 290 + bruitL(xl, yl) * 30) return null;
  let best = null, d0 = Infinity;
  for (const [k, [cx, cy]] of Object.entries(L_CENTRES)) { const d = Math.hypot(xl - cx, yl - cy) * (1 + bruitL(xl + cx, yl) * 0.06); if (d < d0) { d0 = d; best = k; } }
  return best;
}
export function territoireDe(x, y) { return ancien(x, y) ? territoireL(x - OX, y - OY) : null; }
// maisons de chaque village (une par emplacement ; la tienne dépend de ton nom)
const snap = (v) => Math.floor(v / TUILE) * TUILE + TUILE / 2;
export const MAISONS = Object.fromEntries(Object.entries(CENTRES).map(([k, [cx, cy]]) => [k, Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.3; return { x: snap(cx + Math.cos(a) * 240), y: snap(cy + Math.sin(a) * 150) }; })]));
// le grand ouvrage de la semaine (projet de clan), au centre de chaque village
export const OUVRAGES = Object.fromEntries(Object.entries(CENTRES).map(([k, [cx, cy]]) => [k, { x: snap(cx), y: snap(cy + 8) }]));
export const maisonDe = (clan, nom) => MAISONS[clan][[...nom].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8];

// les chemins : du Carrefour vers chaque village et chaque portail ; v100 : du village du Feu vers le désert ;
// v101 : le Pont des Étoiles monte tout droit du portail de l'Azur vers les îles, puis jusqu'à l'Observatoire
const CENTRE_DE = (t) => CENTRES[t] || { cimes: CENTRE_CIMES, ambre: CENTRE_AMBRE, ciel: CENTRE_CIEL, brisees: CENTRE_FAILLE }[t];
export const SEGMENTS = [[CARREFOUR, CENTRES.feu], [CARREFOUR, CENTRES.eau], [CARREFOUR, CENTRES.plante], [CARREFOUR, CENTRE_FAILLE], [CARREFOUR, CENTRE_CIMES],
  [CENTRES.feu, CENTRE_AMBRE], [PORTAIL_EAU, CENTRE_CIEL]].concat(LIEUX.filter((l) => l.terr).map((l) => [CENTRE_DE(l.terr), [l.x, l.y]]));
const L_SEGMENTS = SEGMENTS.map(([a, b]) => [[a[0] - OX, a[1] - OY], [b[0] - OX, b[1] - OY]]);
function distSeg(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
const distChemin = (x, y) => Math.min(...SEGMENTS.map((s) => distSeg(x, y, ...s)));
const distCheminL = (x, y) => Math.min(...L_SEGMENTS.map((s) => distSeg(x, y, ...s)));
export const chemin = (x, y) => distChemin(x, y) < 26;
// où le chemin franchit la lisière (pour les panneaux « niveau 70 » et « niveau 90 »)
const croise = ([ax, ay], [bx, by], f) => { for (let k = 0; k <= 200; k++) { const t = k / 200, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; if (f(x, y)) return [Math.round(x), Math.round(y)]; } return [bx, by]; };
export const PASSE_AMBRE = croise(CENTRES.feu, CENTRE_AMBRE, dansAmbre);
export const PONT_CIEL = croise(PORTAIL_EAU, CENTRE_CIEL, dansCiel);
const dansVillage = (x, y, k, m = 1) => { const [cx, cy] = CENTRES[k]; return ((x - cx) / (330 * m)) ** 2 + ((y - cy) / (225 * m)) ** 2 < 1; };
const dansVillageL = (x, y, k, m = 1) => { const [cx, cy] = L_CENTRES[k]; return ((x - cx) / (330 * m)) ** 2 + ((y - cy) / (225 * m)) ** 2 < 1; };

// ---------- le sol de chaque tuile ----------
// paves, herbe (prairie neutre), chemin, place (village)
// feu : roche, cendre, lave (infranchissable)
// eau : sable, hautfond, eau (infranchissable)
// plante : sylve, mousse, mare (infranchissable)
export const SOLIDES = new Set(['lave', 'eau', 'mare', 'abime', 'crevasse', 'sables_mouvants', 'vide_ciel']);
export function sol(tx, ty) {
  const x = tx * TUILE + 8, y = ty * TUILE + 8;
  // v99 : les Îles Célestes — des îles d'herbe d'argent et de nuage sur le vide ; des ponts de lumière les relient
  if (dansCiel(x, y)) {
    const dc = distChemin(x, y);
    if (dc < 26) return 'pont_lumiere';
    if (Math.hypot(x - CENTRE_CIEL[0], y - CENTRE_CIEL[1]) < 170) return 'marbre_celeste';
    if (LIEUX.some((l) => Math.hypot(x - l.x, y - l.y) < 120)) return 'marbre_celeste';
    const n = bruitL(x * 1.2 + 2300, y * 1.2 + 900), bordIle = lisiereCiel(x) - y < 30;
    if (bordIle || n < -0.05) return 'vide_ciel';
    return n > 0.45 ? 'nuage_solide' : n > 0.2 ? 'herbe_astrale' : 'roc_lune';
  }
  // v98 : le Désert d'Ambre — dunes, sable rouge, grès, et les sables mouvants (infranchissables)
  if (dansAmbre(x, y)) {
    const dc = distChemin(x, y);
    if (dc < 26) return 'dalle_ambre';
    if (Math.hypot(x - CENTRE_AMBRE[0], y - CENTRE_AMBRE[1]) < 170) return 'dalle_ambre';
    const n = bruitL(x * 1.5 + 1100, y * 1.5 + 500), libre = dc > 70 && !LIEUX.some((l) => Math.hypot(x - l.x, y - l.y) < 150);
    if (libre && n > 0.64) return 'sables_mouvants';
    return n > 0.2 ? 'dune' : n > -0.3 ? 'sable_ambre' : 'gres';
  }
  // v102 : la Faille sous le désert (à gauche) : même sol que la Faille, en coordonnées locales prolongées
  return solL(tx - OTX, ty - OTY);
}
// l'ancien monde, dans ses coordonnées d'origine (rien n'y bouge)
function solL(tx, ty) {
  const x = tx * TUILE + 8, y = ty * TUILE + 8, t = territoireL(x, y);
  if (Math.hypot(x - L_CARREFOUR[0], y - L_CARREFOUR[1]) < 130) return 'paves';
  const dc = distCheminL(x, y), faille = y > lFaille(x), cimes = !faille && x > lCimes(y);   // v102 : la Faille passe avant les Cimes
  if (dc < 26) return cimes ? 'dalle_givre' : faille ? 'dalle' : 'chemin';
  const libreL = (d) => !L_LIEUX.some((l) => Math.hypot(x - l.x, y - l.y) < d);
  // v96 : les Cimes Orageuses — neige, glace, roc gris, et les crevasses (infranchissables)
  if (cimes) {
    if (Math.hypot(x - L_CENTRE_CIMES[0], y - L_CENTRE_CIMES[1]) < 160) return 'dalle_givre';
    const n = bruitL(x * 1.5 + 700, y * 1.5 + 200), libre = dc > 70 && libreL(150);
    if (libre && n > 0.62) return 'crevasse';
    return n > 0.25 ? 'glace' : n > -0.25 ? 'neige' : 'roc_gris';
  }
  // v87 : les Terres Brisées — roche noire, cristaux, et l'abîme (infranchissable)
  if (faille) {
    if (Math.hypot(x - L_CENTRE_FAILLE[0], y - L_CENTRE_FAILLE[1]) < 150) return 'dalle';
    const n = bruitL(x * 1.4 + 300, y * 1.4), libre = dc > 70 && libreL(150);
    if (libre && n > 0.6) return 'abime';
    return n > 0.2 ? 'cristal_sol' : 'roche_noire';
  }
  if (t && dansVillageL(x, y, t, 0.42)) return 'place';
  const village = t && dansVillageL(x, y, t, 1.25), libre = dc > 70 && !village && libreL(150) && !L_SANCT.some((l) => Math.hypot(x - l.x, y - l.y) < 170);
  const n = bruitL(x * 1.7 + 900, y * 1.7), v = alea(tx * 7 + ty * 131);
  if (!t) return n > 0.3 && v < 0.5 ? 'fleurs' : 'herbe';
  if (village) return t === 'feu' ? 'roche' : t === 'eau' ? 'sable' : (n > 0.3 ? 'fleurs' : 'mousse');
  // v83 : moins de lave et de mares qui barrent le passage
  if (t === 'feu') { if (libre && n > 0.63) return 'lave'; return n > 0.1 ? 'cendre' : 'roche'; }
  if (t === 'eau') { if (libre && n > 0.22) return 'eau'; if (n > 0.08 && dc > 40) return 'hautfond'; return 'sable'; }
  if (libre && n > 0.74) return 'mare'; return n > 0.15 ? 'mousse' : 'sylve';
}

// ---------- les obstacles : sols infranchissables, décor, maisons ----------
// renvoie la liste du décor (pour le dessin) avec .grille (1 = bloqué) et .sols
let CACHE = null;
const t0 = (x, y) => territoireDe(x, y);
export function obstacles() {
  if (CACHE) return CACHE;
  const L = NT.l, H = NT.h, grille = new Uint8Array(L * H), sols = new Array(L * H), l = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < L; tx++) { const s = sol(tx, ty); sols[ty * L + tx] = s; if (SOLIDES.has(s)) grille[ty * L + tx] = 1; }
  // v83 : décor allégé sur les terres de Braise et de la Sylve (l'Azur ne change pas)
  const DENS = { herbe: 0.03, fleurs: 0.02, roche: 0.03, cendre: 0.02, sable: 0.035, sylve: 0.055, mousse: 0.04, roche_noire: 0.03, cristal_sol: 0.025, neige: 0.035, glace: 0.02, roc_gris: 0.03, dune: 0.012, sable_ambre: 0.02, gres: 0.035, herbe_astrale: 0.035, roc_lune: 0.03, nuage_solide: 0.015 };
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < L; tx++) {
    const i = ty * L + tx, s = sols[i];
    if (!(s in DENS)) continue;
    const x = tx * TUILE + 8, y = ty * TUILE + 8, bord = tx < 2 || ty < 2 || tx >= L - 2 || ty >= H - 2;
    if (!bord && (distChemin(x, y) < (t0(x, y) === 'eau' ? 56 : 72) || LIEUX.some((p) => Math.hypot(x - p.x, y - p.y) < 130) || SANCTUAIRES.some((p) => Math.hypot(x - p.x, y - p.y) < 110))) continue;
    if (!bord && Object.keys(CENTRES).some((k) => dansVillage(x, y, k, 1.15))) continue;
    if (grille[i - 1] || grille[i - L]) continue;   // pas collés les uns aux autres
    const neuf = !ancien(x, y), lx = neuf ? tx : tx - OTX, ly = neuf ? ty : ty - OTY;   // v100 : l'ancien monde garde son décor
    const v = alea(lx * 13.7 + ly * 71.3);
    if (v > (bord ? 0.75 : DENS[s])) continue;
    const t = territoireDe(x, y), w = alea(lx * 3.1 + ly * 9.7);
    const type = dansCiel(x, y) ? (w < 0.35 ? 'arbre_astral' : w < 0.6 ? 'cristal_etoile' : w < 0.8 ? 'colonne_lune' : 'sphere_armillaire') : dansAmbre(x, y) ? (w < 0.35 ? 'cactus' : w < 0.6 ? 'rocher_gres' : w < 0.82 ? 'colonne_brisee' : 'os_geant') : dansCimes(x, y) ? (w < 0.4 ? 'sapin_givre' : w < 0.65 ? 'rocher_neige' : w < 0.85 ? 'cristal_orage' : 'stalagmite') : dansFaille(x, y) ? (w < 0.45 ? 'cristal_vide' : w < 0.75 ? 'rocher_vide' : w < 0.9 ? 'arbre_vide' : 'obelisque') : !t ? (w < 0.6 ? 'arbre' : 'buisson') : t === 'feu' ? (w < 0.45 ? 'rocher' : w < 0.8 ? 'arbre_mort' : 'cristal') : t === 'eau' ? (w < 0.6 ? 'palmier' : w < 0.85 ? 'rocher_clair' : 'corail') : (w < 0.7 ? 'pin' : w < 0.9 ? 'arbre' : 'champignon');
    l.push({ x, y, tx, ty, t, type, r: 7 }); grille[i] = 1;
  }
  // les maisons : 3 tuiles de large, 2 de profondeur
  for (const k of Object.keys(MAISONS)) for (const m of MAISONS[k]) { const tx = (m.x - 8) / TUILE, ty = (m.y - 8) / TUILE; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 0; b++) grille[(ty + b) * L + tx + a] = 1; }
  // les ouvrages des projets de clan : 3 tuiles de large, 2 de profondeur
  for (const o of Object.values(OUVRAGES)) { const tx = (o.x - 8) / TUILE, ty = (o.y - 8) / TUILE; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 0; b++) grille[(ty + b) * L + tx + a] = 1; }
  // le socle de l'autel
  { const a = LIEUX[0], tx = Math.floor(a.x / TUILE), ty = Math.floor(a.y / TUILE); grille[ty * L + tx] = grille[ty * L + tx - 1] = 1; }
  // le pilier de chaque sanctuaire
  for (const a of SANCTUAIRES) { const tx = Math.floor(a.x / TUILE), ty = Math.floor(a.y / TUILE); grille[ty * L + tx] = grille[ty * L + tx - 1] = 1; }
  l.grille = grille; l.sols = sols;
  return (CACHE = l);
}
export const bloqueTuile = (obs, tx, ty) => tx < 0 || ty < 0 || tx >= NT.l || ty >= NT.h || obs.grille[ty * NT.l + tx] === 1;

// un point où l'on peut marcher (les pieds du personnage : une petite boîte)
export function praticable(x, y, obs) {
  if (x < 10 || y < 10 || x > MONDE.l - 10 || y > MONDE.h - 10) return false;
  for (const dx of [-5, 5]) for (const dy of [-3, 3]) if (bloqueTuile(obs, Math.floor((x + dx) / TUILE), Math.floor((y + dy) / TUILE))) return false;
  return true;
}

// ---------- v72 : la maison posée par le joueur ----------
// la clé d'une maison : "x,y" si le joueur l'a posée lui-même, sinon son nom
// (l'une des 8 maisons du village, choisie par le nom comme avant)
export function posMaison(clan, cle) {
  const m = /^(\d+),(\d+)$/.exec(String(cle || ''));
  return m ? { x: +m[1], y: +m[2], posee: true } : maisonDe(clan, String(cle || ''));
}
export const cleMaison = (p) => (p?.maisonPos ? `${p.maisonPos.x},${p.maisonPos.y}` : p?.maison || p?.nom || '');
export const ECART_MAISONS = 150;   // la place des lanternes, de l'obélisque et de l'atelier autour
// peut-on poser sa maison en (x, y) ? autres : les maisons déjà posées [{ x, y }]
export function emplacementMaison(clan, x, y, autres = []) {
  x = snap(x); y = snap(y);
  if (territoireDe(x, y) !== clan) return { raison: 'Ta maison doit être sur la terre de ton clan.' };
  if (dansVillage(x, y, clan, 0.75)) return { raison: 'Trop près du village : éloigne-toi un peu.' };
  const obs = obstacles(), tx = (x - 8) / TUILE, ty = (y - 8) / TUILE;
  for (let a = -2; a <= 2; a++) for (let b = -3; b <= 1; b++) {
    const i = (ty + b) * NT.l + tx + a, s = obs.sols[i];
    if (bloqueTuile(obs, tx + a, ty + b) || s === 'chemin' || s === 'place' || s === 'paves') return { raison: 'Le terrain n’est pas libre ici (chemin, arbre, rocher ou eau).' };
  }
  if (!praticable(x, y + 40, obs)) return { raison: 'Il faut pouvoir arriver devant ta porte.' };
  const loin = (l, d) => l.every((o) => Math.hypot(o.x - x, o.y - y) >= d);
  if (!loin(LIEUX, 150) || !loin(SANCTUAIRES, 160) || !loin(Object.values(OUVRAGES), 140)) return { raison: 'Trop près d’un lieu important (portail, autel, sanctuaire…).' };
  if (!loin(MAISONS[clan], 120) || !loin(autres, ECART_MAISONS)) return { raison: 'Trop près d’une autre maison.' };
  return { x, y };
}
