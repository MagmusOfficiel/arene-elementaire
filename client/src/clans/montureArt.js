// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les montures en pixel art (v70)
//  Chaque monture : une grille de 20 × 14 pixels (corps + 2 poses de
//  pattes : au pas et au galop), dessinée en code et mise en cache.
//  Toutes regardent vers la droite ; on retourne l'image pour la gauche.
// =====================================================================
const CHEVAL = [
  '....................',
  '...............mm...',
  '..............mBBB..',
  '.............mBBkBB.',
  '.............mBBBBBd',
  '............mBBbb.dd',
  'tt..bbBBBBBBBBBb....',
  't.bBBBBBBBBBBBBb....',
  'tbBBBBBBBBBBBBBb....',
  '..bbBBBBBBBBBBb.....'];
const PAS = ['...bb.........bb....', '...b.b........b.b...', '...b.b........b.b...', '...d.d........d.d...'];
const GALOP = ['...bb.........bb....', '..b...b......b...b..', '.b.....b....b.....b.', '.d.....d....d.....d.'];
const CERF = ['.............a.a.a..', '..............aaa...', '..............bBBB..', '.............bBBkBB.', '.............bBBBBBd', '............bBBbb.dd', ...CHEVAL.slice(6).map((l) => l.replace(/t/g, '.').replace(/^\.\./, '.t'))];
const DRAGON = [
  '.....w..........h.h.',
  '....ww.w........RRR.',
  '...wwwww.......RRkRR',
  '..wwwwww......RRRRRd',
  '...wwww......RRRo.dd',
  '............RRoo....',
  'tt..RRRRRRRRRRo.....',
  '.tRRRRRRRRRRRRo.....',
  '..RRRooooooooRR.....',
  '...RRRRRRRRRRR......'];
const LOUP = [
  '....................',
  '..............e..e..',
  '..............eBBe..',
  '.............BBkBBB.',
  '.............BBBBBBd',
  'gg..........BBBww...',
  'gBg.bbBBBBBBBBBb....',
  '.gBBBBBBBBBBBBBb....',
  '..bBBBBBBBBBBBb.....',
  '...bbbbbbbbbbbb.....'];
const PHENIX_A = [
  '...YY...............',
  '..YOOY..............',
  '..YOOOY.............',
  '...YOOOY.......RR...',
  '....YOOOOY....RRkY..',
  '.....OOOOOOOORRRRYy.',
  'tt..ROOOOOOOOORR....',
  'tTt.RRRRRRRRRRR.....',
  'T.tT..RRRRRRR.......',
  '.T..T...............'];
const PHENIX_B = [
  '....................',
  '....................',
  '...............RR...',
  '..............RRkY..',
  '.............RRRRYy.',
  'tt..ROOOOOOOORRR....',
  'tTt.RRRRRRRRRRR.....',
  'T.tTYOOOOOOY........',
  '.T..YOOOOOY.........',
  '.....YOOOY..........'];
const VIDE = ['....................', '....................', '....................', '....................'];
const ETINCELLES_A = ['....................', '...Y.......Y........', '.......Y.......Y....', '....................'];
const ETINCELLES_B = ['......Y.......Y.....', '....................', '..Y.........Y.......', '....................'];
const RAIE_A = ['....................', '....................', '....................', '........cccc........', '...bBBBBBBBBBBBBk...', 'bBBBBBBBBBBBBBBBBBB.', '.bbbBBBBBBBBBBBBBb..', '....bbbbbbbbbbbb....', 'tt..................', '....................'];
const RAIE_B = ['....................', '....................', '....................', 'b.......cccc......b.', '.bBBBBBBBBBBBBBBkBb.', '..BBBBBBBBBBBBBBBB..', '...bbBBBBBBBBBBbb...', '.....bbbbbbbbbb.....', 'tt..................', '....................'];
const BULLES_A = ['....................', '......g.....g.......', '....................', '.........g......g...'];
const BULLES_B = ['....................', '.........g......g...', '....g...............', '......g.....g.......'];

// selle : hauteur (en pixels au-dessus du sol) où se posent les pieds du cavalier
const ART = {
  poney: { pal: { B: '#a8743e', b: '#7a5028', m: '#3a2414', t: '#3a2414', d: '#2a1a10', k: '#120a06' }, poses: [[...CHEVAL, ...PAS], [...CHEVAL, ...GALOP]], selle: 6 },
  destrier: { pal: { B: '#2e262c', b: '#16121a', m: '#ff8a20', t: '#ffb040', d: '#ff5a10', k: '#ff3a10' }, poses: [[...CHEVAL, ...PAS], [...CHEVAL.map((l) => l.replace(/m/g, 'M')), ...GALOP]], selle: 6, pal2: { M: '#ffd040' } },
  cerf: { pal: { B: '#b07a44', b: '#7a4e28', d: '#3a2414', a: '#efe2b8', t: '#f4f0e0', k: '#120a06' }, poses: [[...CERF, ...PAS], [...CERF, ...GALOP]], selle: 6 },
  raie: { pal: { B: '#3aa0d8', b: '#1a5a8a', c: '#8ad8f8', k: '#0a1a2a', t: '#1a5a8a', g: '#bff0ff' }, poses: [[...RAIE_A, ...BULLES_A], [...RAIE_B, ...BULLES_B]], selle: 9, flotte: true },
  loup: { pal: { B: '#9ad8ff', b: '#4a8ac8', e: '#d8f4ff', k: '#ffffff', d: '#1a3a6a', w: '#e8f8ff', g: '#bff0ff' }, poses: [[...LOUP, ...PAS], [...LOUP, ...GALOP]], selle: 6, lueur: 'rgba(150,220,255,.18)' },
  phenix: { pal: { R: '#e8402a', O: '#ffb030', Y: '#fff0a0', y: '#ffc040', k: '#2a0a0a', t: '#ff7a20', T: '#ffd040' }, poses: [[...PHENIX_A, ...ETINCELLES_A], [...PHENIX_B, ...ETINCELLES_B]], selle: 9, flotte: true, lueur: 'rgba(255,190,80,.2)' },
  // v96 : le Lynx du vide (Chapitre 2) et le Griffon des tempêtes (Chapitre 3)
  lynx_vide: { pal: { B: '#4a2a8a', b: '#2a1450', e: '#c8a0ff', k: '#80e0ff', d: '#1a0a30', w: '#8a60e0', g: '#e0c8ff' }, poses: [[...LOUP, ...PAS], [...LOUP, ...GALOP]], selle: 6, lueur: 'rgba(160,110,255,.2)' },
  griffon: { pal: { R: '#e8f0f8', O: '#8ab8e0', Y: '#ffffff', y: '#ffe060', k: '#1a3050', t: '#4a90d8', T: '#ffe060' }, poses: [[...PHENIX_A, ...ETINCELLES_A], [...PHENIX_B, ...ETINCELLES_B]], selle: 9, flotte: true, lueur: 'rgba(140,200,255,.2)' },
  // v97 : le Kirin (Chapitre 1, aux couleurs des trois clans) et le Wyrm de la Tour (étage 100)
  kirin: { pal: { B: '#f2ead8', b: '#c8b890', d: '#3a2414', a: '#ff8a30', t: '#40b8e8', k: '#2a8a3a' }, poses: [[...CERF, ...PAS], [...CERF, ...GALOP]], selle: 6, lueur: 'rgba(255,220,150,.18)' },
  wyrm_tour: { pal: { R: '#e8c050', o: '#fff4c0', w: '#6a3ab0', h: '#ffffff', d: '#3a2a0a', k: '#80f0ff', t: '#e8c050' }, poses: [[...DRAGON, ...PAS.map((l) => l.replace(/b/g, 'R'))], [...DRAGON, ...GALOP.map((l) => l.replace(/b/g, 'R'))]], selle: 6, lueur: 'rgba(255,220,120,.22)' },
  dragon: { pal: { R: '#c8342a', o: '#ffc040', w: '#7a1a3a', h: '#f4e0b0', d: '#2a0a0a', k: '#ffe060', t: '#c8342a' }, poses: [[...DRAGON, ...PAS.map((l) => l.replace(/b/g, 'R'))], [...DRAGON, ...GALOP.map((l) => l.replace(/b/g, 'R'))]], selle: 6 },
};
export const selleDe = (id) => ART[id]?.selle ?? 6;
const CACHE = new Map();
// une feuille de 2 images (40 × 14) : [au pas, au galop]
export function feuilleMonture(id) {
  if (CACHE.has(id)) return CACHE.get(id);
  const a = ART[id]; if (!a) return null;
  const pal = { ...a.pal, ...(a.pal2 || {}) };
  const c = document.createElement('canvas'); c.width = 40; c.height = 14; const g = c.getContext('2d');
  a.poses.forEach((rows, f) => rows.forEach((ligne, y) => [...ligne].forEach((ch, x) => { const col = pal[ch]; if (col) { g.fillStyle = col; g.fillRect(f * 20 + x, y, 1, 1); } })));
  CACHE.set(id, c); return c;
}
// dessine la monture dont les pieds sont en (x, y) ; pose : 0 (pas) ou 1 (galop)
export function dessinerMonture(ctx, id, x, y, gauche = false, pose = 0, t = 0) {
  const f = feuilleMonture(id); if (!f) return;
  x = Math.round(x); y = Math.round(y);
  const flot = ART[id].flotte ? Math.round(Math.sin(t * 3) * 1.5) - 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 9, y - 1, 18, 2);
  if (ART[id].lueur) { ctx.fillStyle = ART[id].lueur; ctx.fillRect(x - 12, y - 16 + flot, 24, 15); }
  if (gauche) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(f, pose * 20, 0, 20, 14, -10, y - 14 + flot, 20, 14); ctx.restore(); }
  else ctx.drawImage(f, pose * 20, 0, 20, 14, x - 10, y - 14 + flot, 20, 14);
}
export const decalageFlot = (id, t) => (ART[id]?.flotte ? Math.round(Math.sin(t * 3) * 1.5) - 2 : 0);
// une vignette pour les fenêtres (canvas agrandi, pixels nets)
export function vignetteMonture(id, z = 4) {
  const c = document.createElement('canvas'); c.width = 20 * z; c.height = 14 * z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const f = feuilleMonture(id); if (f) g.drawImage(f, 20, 0, 20, 14, 0, 0, 20 * z, 14 * z);
  c.className = 'vignetteMonture'; return c;
}
