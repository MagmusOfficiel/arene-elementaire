// =====================================================================
//  ZONE MORTE — génération du monde (infini, déterministe, par morceaux)
//  1 tuile = 1 mètre. Un morceau (« chunk ») = 32 × 32 tuiles.
//  Le monde ne dépend que de la graine : on régénère un morceau à
//  l'identique quand on y revient ; seules les modifications du joueur
//  (portes ouvertes, vitres cassées…) sont gardées à part.
//
//  Organisation : des RÉGIONS de 8 × 8 morceaux. Une région sur deux
//  environ contient une ville (centre commerçant + quartiers). Entre les
//  villes : champs, forêts et routes de campagne tous les 4 morceaux.
//  Dans une ville, chaque morceau est un pâté de maisons bordé par une
//  rue en haut et à gauche (la rue du bas/droite est celle du voisin).
// =====================================================================

export const CH = 32;            // tuiles par côté d'un morceau
export const REGION = 8;         // morceaux par côté d'une région

// ---------- Types de tuiles ----------
export const T = {
  herbe: 0, route: 1, trottoir: 2, chemin: 3, arbre: 4, buisson: 5, parquet: 6, carrelage: 7, mur: 8,
  porte: 9, porteOuverte: 10, fenetre: 11, fenetreCassee: 12, meuble: 13, cloture: 14, parking: 15, beton: 16,
  etagere: 17, lit: 18, champ: 19, ligne: 20, comptoir: 21, voiture: 22,
};
// bloque le passage
export const SOLIDE = new Set([T.arbre, T.mur, T.porte, T.fenetre, T.meuble, T.cloture, T.etagere, T.lit, T.comptoir, T.voiture]);
// bloque la vue
export const OPAQUE = new Set([T.arbre, T.mur, T.porte]);
// ralentit
export const LENT = new Set([T.buisson, T.champ]);
// intérieur (pour les toits et l'ambiance)
export const INTERIEUR = new Set([T.parquet, T.carrelage, T.beton]);

// ---------- Hasard déterministe ----------
export function hash(...n) {
  let h = 2166136261 >>> 0;
  for (const v of n) { h ^= (v | 0) + 0x9e3779b9 + (h << 6) + (h >>> 2); h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; }
  return (h ^ (h >>> 16)) >>> 0;
}
export function alea(seed) {   // générateur pseudo-aléatoire (mulberry32)
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const fdiv = (a, b) => Math.floor(a / b);
const mod = (a, b) => ((a % b) + b) % b;
// bruit de valeur lissé (forêts, champs)
function bruit(seed, x, y, echelle) {
  const fx = x / echelle, fy = y / echelle, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const v = (i, j) => hash(seed, x0 + i, y0 + j, 77) / 4294967296;
  const s = (t) => t * t * (3 - 2 * t);
  const a = v(0, 0) + (v(1, 0) - v(0, 0)) * s(tx), b = v(0, 1) + (v(1, 1) - v(0, 1)) * s(tx);
  return a + (b - a) * s(ty);
}

// ---------- Villes : une par région au plus ----------
export function villeDeRegion(seed, rx, ry) {
  const depart = rx === 0 && ry === 0;
  const h = hash(seed, rx, ry, 1);
  if (!depart && h % 100 >= 55) return null;
  const loin = Math.hypot(rx, ry);
  const rayon = depart ? 2 : 1 + (h >>> 8) % 2 + Math.min(2, Math.floor(loin / 3));   // plus loin = plus grand
  const cx = rx * REGION + (depart ? 0 : 2 + ((h >>> 12) % (REGION - 4))), cy = ry * REGION + (depart ? 0 : 2 + ((h >>> 16) % (REGION - 4)));
  const noms = ['Saint-Aubin', 'Les Ormes', 'Valcourt', 'Montreuil-le-Bas', 'Pontvieux', 'Haute-Rive', 'Brémont', 'La Croisée', 'Vernay', 'Champlas', 'Rochebrune', 'Marsac'];
  return { cx, cy, rayon, nom: depart ? 'Saint-Aubin' : noms[(h >>> 20) % noms.length], danger: 1 + loin * 0.35 };
}
// nature d'un morceau : 'centre' | 'ville' | 'campagne'
export function zoneDe(seed, cx, cy) {
  const rx = fdiv(cx, REGION), ry = fdiv(cy, REGION);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const v = villeDeRegion(seed, rx + dx, ry + dy); if (!v) continue;
    const d = Math.max(Math.abs(cx - v.cx), Math.abs(cy - v.cy));
    if (d <= v.rayon) return { type: d === 0 || (v.rayon >= 3 && d <= 1) ? 'centre' : 'ville', ville: v };
  }
  return { type: 'campagne', ville: null };
}

// ---------- Génération d'un morceau ----------
// Renvoie { cx, cy, t: Uint8Array(CH*CH), meubles: [{x,y,type}], batiments: [{x,y,w,h,toit,type}], zone }
export function genererMorceau(seed, cx, cy) {
  const t = new Uint8Array(CH * CH);
  const meubles = [], batiments = [];
  const R = alea(hash(seed, cx, cy, 2));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < CH && y < CH) t[y * CH + x] = v; };
  const get = (x, y) => t[y * CH + x];
  const zone = zoneDe(seed, cx, cy);
  const X0 = cx * CH, Y0 = cy * CH;

  // fond : herbe, champs et forêts selon le bruit (campagne), herbe tondue en ville
  for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
    let v = T.herbe;
    if (zone.type === 'campagne') {
      const f = bruit(seed, X0 + x, Y0 + y, 22), c = bruit(seed + 9, X0 + x, Y0 + y, 40);
      if (f > 0.62 && hash(seed, X0 + x, Y0 + y, 3) % 100 < (f - 0.55) * 160) v = T.arbre;
      else if (f > 0.55 && hash(seed, X0 + x, Y0 + y, 4) % 100 < 12) v = T.buisson;
      else if (c < 0.3) v = T.champ;
    }
    set(x, y, v);
  }

  // routes : en ville, rue en haut et à gauche de chaque morceau ; à la campagne, une route tous les 4 morceaux
  const rueH = zone.type !== 'campagne' || mod(cy, 4) === 0 || zoneDe(seed, cx, cy - 1).type !== 'campagne';
  const rueV = zone.type !== 'campagne' || mod(cx, 4) === 0 || zoneDe(seed, cx - 1, cy).type !== 'campagne';
  const LARG = 6;   // trottoir + 4 voies + trottoir
  if (rueH) for (let x = 0; x < CH; x++) for (let y = 0; y < LARG; y++) set(x, y, y === 0 || y === LARG - 1 ? (zone.type === 'campagne' ? T.herbe : T.trottoir) : y === 3 && x % 4 < 2 ? T.ligne : T.route);
  if (rueV) for (let y = 0; y < CH; y++) for (let x = 0; x < LARG; x++) {
    if (rueH && y < LARG) { if (x > 0 && x < LARG - 1 && y > 0 && y < LARG - 1) set(x, y, T.route); continue; }
    set(x, y, x === 0 || x === LARG - 1 ? (zone.type === 'campagne' ? T.herbe : T.trottoir) : x === 3 && y % 4 < 2 ? T.ligne : T.route);
  }
  if (rueH && rueV && zone.type !== 'campagne') for (let y = 1; y < LARG - 1; y++) for (let x = 1; x < LARG - 1; x++) set(x, y, T.route);   // carrefour

  // voitures abandonnées sur les routes (2 × 4 tuiles)
  if (rueH && R() < 0.35) { const x = 8 + Math.floor(R() * (CH - 14)); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) set(x + i, R() < 0.5 ? 1 + j : 3 + j, T.voiture); }

  const bx = rueV ? LARG : 0, by = rueH ? LARG : 0;   // début du pâté (après les rues)
  if (zone.type === 'ville') {
    // 2 × 2 parcelles avec une maison chacune
    const pw = Math.floor((CH - bx) / 2), ph = Math.floor((CH - by) / 2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const lx = bx + i * pw, ly = by + j * ph;
      if (R() < 0.08) { parc(lx, ly, pw, ph); continue; }   // parfois un terrain vague
      maison(lx, ly, pw, ph, i === 0 ? 'ouest' : 'est', j === 0 ? 'nord' : 'sud');
    }
  } else if (zone.type === 'centre') {
    commerce(bx, by, CH - bx, CH - by);
  } else if (!rueH && !rueV && R() < 0.12) {
    // ferme isolée
    maison(8 + Math.floor(R() * 8), 8 + Math.floor(R() * 8), 14, 14, 'ouest', 'nord');
  }

  // --------- constructions ---------
  function parc(lx, ly, w, h) {
    for (let y = ly + 1; y < ly + h - 1; y++) for (let x = lx + 1; x < lx + w - 1; x++) if (hash(seed, X0 + x, Y0 + y, 5) % 100 < 8) set(x, y, T.arbre);
  }
  function maison(lx, ly, lw, lh, cote, face) {
    const w = 8 + Math.floor(R() * Math.max(1, lw - 11)), h = 7 + Math.floor(R() * Math.max(1, lh - 10));
    const x0 = lx + (cote === 'ouest' ? 2 : lw - w - 2), y0 = ly + (face === 'nord' ? 2 : lh - h - 2);
    // clôture du jardin (avec un portail côté rue)
    if (R() < 0.6) for (let x = lx + 1; x < lx + lw - 1; x++) for (const y of [ly + 1, ly + lh - 2]) if (get(x, y) === T.herbe) set(x, y, T.cloture);
    if (R() < 0.6) for (let y = ly + 1; y < ly + lh - 1; y++) for (const x of [lx + 1, lx + lw - 2]) if (get(x, y) === T.herbe) set(x, y, T.cloture);
    piece(x0, y0, w, h, T.parquet);
    // murs intérieurs : une cloison verticale + une horizontale d'un côté
    const sx = x0 + 3 + Math.floor(R() * (w - 6)), sy = y0 + 3 + Math.floor(R() * (h - 6));
    for (let y = y0 + 1; y < y0 + h - 1; y++) set(sx, y, T.mur);
    const gauche = R() < 0.5;
    for (let x = gauche ? x0 + 1 : sx + 1; x < (gauche ? sx : x0 + w - 1); x++) set(x, sy, T.mur);
    // portes intérieures
    set(sx, y0 + 1 + Math.floor(R() * (h - 3)), T.porteOuverte);
    const gx = gauche ? x0 + 1 + Math.floor(R() * Math.max(1, sx - x0 - 1)) : sx + 1 + Math.floor(R() * Math.max(1, x0 + w - sx - 2));
    set(gx, sy, T.porteOuverte);
    if (get(sx, sy - 1) === T.porteOuverte || get(sx, sy + 1) === T.porteOuverte) set(sx, sy, T.mur);
    // une pièce carrelée (cuisine / salle de bain)
    const [kx0, kx1] = gauche ? [x0 + 1, sx] : [sx + 1, x0 + w - 1];
    for (let y = y0 + 1; y < sy; y++) for (let x = kx0; x < kx1; x++) if (get(x, y) === T.parquet) set(x, y, T.carrelage);
    // porte d'entrée côté rue, fenêtres sur les murs extérieurs
    const fy = face === 'nord' ? y0 : y0 + h - 1, fx = x0 + 2 + Math.floor(R() * (w - 4));
    set(fx, fy, T.porte);
    if (R() < 0.5) { const bx2 = cote === 'ouest' ? x0 : x0 + w - 1, by2 = y0 + 2 + Math.floor(R() * (h - 4)); set(bx2, by2, T.porte); }
    fenetres(x0, y0, w, h);
    // meubles le long des murs (à fouiller plus tard)
    meubler(x0, y0, w, h);
    batiments.push({ x: x0, y: y0, w, h, toit: ['tuiles', 'ardoise', 'brun'][Math.floor(R() * 3)], type: 'maison' });
    // allée jusqu'à la rue
    const ay0 = face === 'nord' ? ly : fy + 1, ay1 = face === 'nord' ? fy - 1 : ly + lh - 1;
    for (let y = ay0; y <= ay1; y++) if ([T.herbe, T.cloture].includes(get(fx, y))) set(fx, y, T.chemin);
  }
  function piece(x0, y0, w, h, sol) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1 ? T.mur : sol);
  }
  function fenetres(x0, y0, w, h) {
    for (let x = x0 + 2; x < x0 + w - 2; x += 3) for (const y of [y0, y0 + h - 1]) if (get(x, y) === T.mur && R() < 0.8) set(x, y, T.fenetre);
    for (let y = y0 + 2; y < y0 + h - 2; y += 3) for (const x of [x0, x0 + w - 1]) if (get(x, y) === T.mur && R() < 0.8) set(x, y, T.fenetre);
  }
  function meubler(x0, y0, w, h) {
    const types = ['armoire', 'frigo', 'commode', 'placard', 'bibliotheque'];
    for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const s = get(x, y); if (s !== T.parquet && s !== T.carrelage) continue;
      const contreMur = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => get(x + dx, y + dy) === T.mur).length;
      const pres = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => [T.porte, T.porteOuverte, T.fenetre].includes(get(x + dx, y + dy)));
      if (contreMur && !pres && R() < 0.1) {
        const lit = s === T.parquet && R() < 0.25;
        set(x, y, lit ? T.lit : T.meuble);
        meubles.push({ x, y, type: lit ? 'lit' : s === T.carrelage ? (R() < 0.5 ? 'frigo' : 'placard') : types[Math.floor(R() * types.length)] });
      }
    }
  }
  function commerce(bx0, by0, bw, bh) {
    const sortes = ['supermarché', 'pharmacie', 'quincaillerie', 'station-service', 'commissariat', 'boutique'];
    const sorte = sortes[Math.floor(R() * sortes.length)];
    // parking devant
    for (let y = by0; y < by0 + 6; y++) for (let x = bx0; x < bx0 + bw; x++) set(x, y, (x - bx0) % 4 === 0 && y > by0 ? T.ligne : T.parking);
    const x0 = bx0 + 1, y0 = by0 + 7, w = bw - 3, h = bh - 9;
    piece(x0, y0, w, h, T.beton);
    // rayonnages
    for (let x = x0 + 3; x < x0 + w - 3; x += 3) for (let y = y0 + 3; y < y0 + h - 4; y++) if (y !== y0 + Math.floor(h / 2)) { set(x, y, T.etagere); if (y % 2 === 0) meubles.push({ x, y, type: `rayon:${sorte}` }); }
    for (let x = x0 + 2; x < x0 + 7; x++) set(x, y0 + 1 + (sorte === 'commissariat' ? 3 : 1), T.comptoir);
    // entrée vitrée à double porte
    const fx = x0 + Math.floor(w / 2);
    set(fx, y0, T.porte); set(fx + 1, y0, T.porte);
    for (let x = x0 + 2; x < x0 + w - 2; x++) if (get(x, y0) === T.mur && Math.abs(x - fx) > 2) set(x, y0, T.fenetre);
    set(x0 + w - 1, y0 + h - 3, T.porte);   // porte de service
    batiments.push({ x: x0, y: y0, w, h, toit: 'plat', type: sorte, enseigne: sorte });
  }

  return { cx, cy, t, meubles, batiments, zone: zone.type, ville: zone.ville?.nom || null };
}

// ---------- Accès au monde (avec cache et modifications du joueur) ----------
export class Monde {
  constructor(seed, modifs = {}) {
    this.seed = seed >>> 0;
    this.cache = new Map();
    this.modifs = modifs;          // "x,y" -> type de tuile (portes ouvertes, vitres cassées…)
  }
  morceau(cx, cy) {
    const k = `${cx},${cy}`;
    let m = this.cache.get(k);
    if (!m) {
      m = genererMorceau(this.seed, cx, cy);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const v = this.modifs[`${cx * CH + x},${cy * CH + y}`]; if (v !== undefined) m.t[y * CH + x] = v; }
      this.cache.set(k, m);
      if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
    }
    return m;
  }
  tuile(x, y) { x = Math.floor(x); y = Math.floor(y); const m = this.morceau(fdiv(x, CH), fdiv(y, CH)); return m.t[mod(y, CH) * CH + mod(x, CH)]; }
  poser(x, y, v) {
    x = Math.floor(x); y = Math.floor(y);
    const m = this.morceau(fdiv(x, CH), fdiv(y, CH)); m.t[mod(y, CH) * CH + mod(x, CH)] = v;
    this.modifs[`${x},${y}`] = v; m.version = (m.version || 0) + 1; this.rev = (this.rev || 0) + 1;
  }
  solide(x, y) { return SOLIDE.has(this.tuile(x, y)); }
  opaque(x, y) { return OPAQUE.has(this.tuile(x, y)); }
  // bâtiment qui contient la tuile (x, y), s'il y en a un
  batimentEn(x, y) {
    const cx = fdiv(Math.floor(x), CH), cy = fdiv(Math.floor(y), CH), m = this.morceau(cx, cy);
    const lx = x - cx * CH, ly = y - cy * CH;
    return m.batiments.find((b) => lx >= b.x && lx < b.x + b.w && ly >= b.y && ly < b.y + b.h) || null;
  }
  // point de départ : un trottoir près du centre de la première ville
  depart() {
    for (let r = 0; r < 40; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      const x = CH + 3 + dx, y = CH + 3 + dy;
      if ([T.trottoir, T.route].includes(this.tuile(x, y)) && !this.solide(x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: 3.5, y: 3.5 };
  }
}
