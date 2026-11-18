// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la géographie du monde (partagée)
//  Le monde est une grille de tuiles de 16 px (style pixel art).
//  Territoires, Carrefour, villages, portails, sols, obstacles, chemins.
//  Le client s'en sert pour dessiner ; le serveur pour savoir qui est
//  chez qui (duels) et où faire pousser les filons rares.
// =====================================================================
export const TUILE = 16;
export const MONDE = { l: 3200, h: 2080 };
export const NT = { l: MONDE.l / TUILE, h: MONDE.h / TUILE };   // 200 × 130 tuiles
export const CENTRES = { feu: [648, 1544], eau: [1608, 424], plante: [2568, 1544] };
export const CARREFOUR = [1608, 1096];
export const LIEUX = [
  { id: 'autel', nom: 'Autel des tirages', x: 1608, y: 1096, r: 44, action: 'tirage' },
  { id: 'portail_feu', nom: 'Portail des Terres de Braise', x: 296, y: 1880, r: 40, action: 'expedition', terr: 'feu' },
  { id: 'portail_eau', nom: "Portail des Lagons d'Azur", x: 1608, y: 136, r: 40, action: 'expedition', terr: 'eau' },
  { id: 'portail_plante', nom: "Portail de la Sylve d'Émeraude", x: 2920, y: 1880, r: 40, action: 'expedition', terr: 'plante' },
];
export const alea = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export function bruit(x, y) { return Math.sin(x * 0.013 + Math.sin(y * 0.021) * 2) * 0.5 + Math.sin(y * 0.017 + Math.cos(x * 0.011) * 2) * 0.5; }
const bruitL = (x, y) => bruit(x * 0.5, y * 0.5);   // grandes formes (côtes, lacs de lave)

// à quel territoire appartient un point (null : le Carrefour, neutre)
export function territoireDe(x, y) {
  if (Math.hypot(x - CARREFOUR[0], y - CARREFOUR[1]) < 290 + bruitL(x, y) * 30) return null;
  let best = null, d0 = Infinity;
  for (const [k, [cx, cy]] of Object.entries(CENTRES)) { const d = Math.hypot(x - cx, y - cy) * (1 + bruitL(x + cx, y) * 0.06); if (d < d0) { d0 = d; best = k; } }
  return best;
}
// maisons de chaque village (une par emplacement ; la tienne dépend de ton nom)
const snap = (v) => Math.floor(v / TUILE) * TUILE + TUILE / 2;
export const MAISONS = Object.fromEntries(Object.entries(CENTRES).map(([k, [cx, cy]]) => [k, Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.3; return { x: snap(cx + Math.cos(a) * 240), y: snap(cy + Math.sin(a) * 150) }; })]));
export const maisonDe = (clan, nom) => MAISONS[clan][[...nom].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8];

// les chemins de terre : du Carrefour vers chaque village et chaque portail
const SEGMENTS = [[CARREFOUR, CENTRES.feu], [CARREFOUR, CENTRES.eau], [CARREFOUR, CENTRES.plante]].concat(LIEUX.filter((l) => l.terr).map((l) => [CENTRES[l.terr], [l.x, l.y]]));
function distSeg(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
const distChemin = (x, y) => Math.min(...SEGMENTS.map((s) => distSeg(x, y, ...s)));
export const chemin = (x, y) => distChemin(x, y) < 26;
const dansVillage = (x, y, k, m = 1) => { const [cx, cy] = CENTRES[k]; return ((x - cx) / (330 * m)) ** 2 + ((y - cy) / (225 * m)) ** 2 < 1; };

// ---------- le sol de chaque tuile ----------
// paves, herbe (prairie neutre), chemin, place (village)
// feu : roche, cendre, lave (infranchissable)
// eau : sable, hautfond, eau (infranchissable)
// plante : sylve, mousse, mare (infranchissable)
export const SOLIDES = new Set(['lave', 'eau', 'mare']);
export function sol(tx, ty) {
  const x = tx * TUILE + 8, y = ty * TUILE + 8, t = territoireDe(x, y);
  if (Math.hypot(x - CARREFOUR[0], y - CARREFOUR[1]) < 130) return 'paves';
  const dc = distChemin(x, y);
  if (dc < 26) return 'chemin';
  if (t && dansVillage(x, y, t, 0.42)) return 'place';
  const village = t && dansVillage(x, y, t, 1.25), libre = dc > 70 && !village && !LIEUX.some((l) => Math.hypot(x - l.x, y - l.y) < 150);
  const n = bruitL(x * 1.7 + 900, y * 1.7), v = alea(tx * 7 + ty * 131);
  if (!t) return n > 0.3 && v < 0.5 ? 'fleurs' : 'herbe';
  if (village) return t === 'feu' ? 'roche' : t === 'eau' ? 'sable' : (n > 0.3 ? 'fleurs' : 'mousse');
  if (t === 'feu') { if (libre && n > 0.55) return 'lave'; return n > 0.1 ? 'cendre' : 'roche'; }
  if (t === 'eau') { if (libre && n > 0.22) return 'eau'; if (n > 0.08 && dc > 40) return 'hautfond'; return 'sable'; }
  if (libre && n > 0.66) return 'mare'; return n > 0.15 ? 'mousse' : 'sylve';
}

// ---------- les obstacles : sols infranchissables, décor, maisons ----------
// renvoie la liste du décor (pour le dessin) avec .grille (1 = bloqué) et .sols
let CACHE = null;
export function obstacles() {
  if (CACHE) return CACHE;
  const L = NT.l, H = NT.h, grille = new Uint8Array(L * H), sols = new Array(L * H), l = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < L; tx++) { const s = sol(tx, ty); sols[ty * L + tx] = s; if (SOLIDES.has(s)) grille[ty * L + tx] = 1; }
  const DENS = { herbe: 0.03, fleurs: 0.02, roche: 0.05, cendre: 0.035, sable: 0.035, sylve: 0.13, mousse: 0.09 };
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < L; tx++) {
    const i = ty * L + tx, s = sols[i];
    if (!(s in DENS)) continue;
    const x = tx * TUILE + 8, y = ty * TUILE + 8, bord = tx < 2 || ty < 2 || tx >= L - 2 || ty >= H - 2;
    if (!bord && (distChemin(x, y) < 56 || LIEUX.some((p) => Math.hypot(x - p.x, y - p.y) < 130))) continue;
    if (!bord && Object.keys(CENTRES).some((k) => dansVillage(x, y, k, 1.15))) continue;
    if (grille[i - 1] || grille[i - L]) continue;   // pas collés les uns aux autres
    const v = alea(tx * 13.7 + ty * 71.3);
    if (v > (bord ? 0.75 : DENS[s])) continue;
    const t = territoireDe(x, y), w = alea(tx * 3.1 + ty * 9.7);
    const type = !t ? (w < 0.6 ? 'arbre' : 'buisson') : t === 'feu' ? (w < 0.45 ? 'rocher' : w < 0.8 ? 'arbre_mort' : 'cristal') : t === 'eau' ? (w < 0.6 ? 'palmier' : w < 0.85 ? 'rocher_clair' : 'corail') : (w < 0.7 ? 'pin' : w < 0.9 ? 'arbre' : 'champignon');
    l.push({ x, y, tx, ty, t, type, r: 7 }); grille[i] = 1;
  }
  // les maisons : 3 tuiles de large, 2 de profondeur
  for (const k of Object.keys(MAISONS)) for (const m of MAISONS[k]) { const tx = (m.x - 8) / TUILE, ty = (m.y - 8) / TUILE; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 0; b++) grille[(ty + b) * L + tx + a] = 1; }
  // le socle de l'autel
  { const a = LIEUX[0], tx = Math.floor(a.x / TUILE), ty = Math.floor(a.y / TUILE); grille[ty * L + tx] = grille[ty * L + tx - 1] = 1; }
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
