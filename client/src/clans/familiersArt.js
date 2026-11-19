// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les familiers en pixel art (v53)
//  Chaque familier : une grille de 12 × 10 pixels, une palette, et deux
//  images (la seconde : il sautille). Dessinés en code, mis en cache.
//  Tous regardent vers la droite ; on retourne l'image pour la gauche.
// =====================================================================
const ART = {
  salamandre: { pal: { o: '#e8742a', O: '#ffa040', r: '#b8401a', k: '#1a1010', y: '#ffd860' }, g: [
    '............',
    '............',
    '.......oOo..',
    '......oOOkO.',
    '..r..oOyOOO.',
    '.roooOOOOOo.',
    'roOOyOOOyo..',
    '.r.oOOOOo...',
    '...r..r.r...',
    '............'] },
  braisillon: { pal: { y: '#fff0a0', o: '#ffb040', O: '#ff7a20', r: '#c83a1a', k: '#2a1010', w: '#fff' }, g: [
    '.....y......',
    '....yo......',
    '....yoo..y..',
    '...yoOoo.o..',
    '..yoOOOOoo..',
    '..oOwkOwkO..',
    '..oOOOOOOo..',
    '..rOOOOOOr..',
    '...rOOOOr...',
    '....rrrr....'] },
  tortue: { pal: { g: '#3a8a4a', G: '#5ab060', d: '#246030', b: '#5ab0d0', B: '#8ad0e8', k: '#102020' }, g: [
    '............',
    '............',
    '...gGGGg....',
    '..gGdGdGg...',
    '.gGdGGGdGg..',
    '.gdGGdGGdgbB',
    '.ddddddddbkB',
    '..bb...bb.b.',
    '..b.....b...',
    '............'] },
  loutre: { pal: { m: '#8a5a32', M: '#a87444', c: '#f0dcc0', k: '#1a1010', n: '#3a2018' }, g: [
    '............',
    '......mm.m..',
    '.....mMMMMm.',
    '.....McckcM.',
    '.m...Mccccn.',
    'mM.mMMMcccM.',
    '.MMMMMMMMm..',
    '..MMMMMMM...',
    '...m.m.m....',
    '............'] },
  pousse: { pal: { l: '#5ac83a', L: '#8ae860', v: '#2e8a2a', t: '#8a5a32', T: '#a8784a', k: '#1a2010', w: '#fff' }, g: [
    '...LL..LL...',
    '..LlL..LlL..',
    '...lLvvLl...',
    '.....vv.....',
    '....vllv....',
    '...vlwkwv...',
    '...vlllllv..',
    '...vlLLllv..',
    '....vllll...',
    '.....v..v...'] },
  luciole: { pal: { w: '#d8f0ff', W: '#ffffff', b: '#3a3048', y: '#fff060', Y: '#ffffa8', k: '#101010' }, g: [
    '............',
    '...wW.......',
    '..wWWw.Ww...',
    '...wwWwWWw..',
    '.....bbbwk..',
    '....bbbbbb..',
    '...yyYbbb...',
    '..yYYYy.....',
    '...yYy......',
    '............'] },
};
const CACHE = new Map();
// une feuille de 2 images (24 × 11) : [repos, saut]
export function feuilleFamilier(id) {
  if (CACHE.has(id)) return CACHE.get(id);
  const a = ART[id]; if (!a) return null;
  const c = document.createElement('canvas'); c.width = 24; c.height = 11; const g = c.getContext('2d');
  for (let f = 0; f < 2; f++) a.g.forEach((ligne, y) => [...ligne].forEach((ch, x) => { const col = a.pal[ch]; if (col) { g.fillStyle = col; g.fillRect(f * 12 + x, y + (f ? 0 : 1), 1, 1); } }));
  CACHE.set(id, c); return c;
}
// dessine le familier dont les pieds sont en (x, y) ; gauche : regarde à gauche ; saut : 0 ou 1
export function dessinerFamilier(ctx, id, x, y, gauche = false, saut = 0) {
  const f = feuilleFamilier(id); if (!f) return;
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 4, y - 1, 8, 2);
  if (id === 'luciole') { ctx.fillStyle = 'rgba(255,250,150,.18)'; ctx.fillRect(x - 7, y - 14, 14, 10); }
  if (gauche) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(f, saut * 12, 0, 12, 11, -6, y - 11 - (id === 'luciole' ? 4 : 0), 12, 11); ctx.restore(); }
  else ctx.drawImage(f, saut * 12, 0, 12, 11, x - 6, y - 11 - (id === 'luciole' ? 4 : 0), 12, 11);
}
// une vignette pour les fenêtres (canvas agrandi, pixels nets)
export function vignetteFamilier(id, z = 4) {
  const c = document.createElement('canvas'); c.width = 12 * z; c.height = 11 * z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const f = feuilleFamilier(id); if (f) g.drawImage(f, 0, 0, 12, 11, 0, 0, 12 * z, 11 * z);
  c.className = 'vignetteFam'; return c;
}
