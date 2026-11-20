// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le dessin des décorations de maison (v77)
//  Chaque décoration se dessine en rectangles de pixels, autour de la
//  maison (m = le point au pied de la façade). Les règles sont dans
//  shared/clans/deco.js.
// =====================================================================
import { BRANCHES } from '../../../shared/clans/cartes.js';

const COUL = { feu: ['#e0552a', '#8a2a10'], eau: ['#2a8ae0', '#0e3a6a'], plante: ['#3aa84a', '#14501e'] };
const COUL_BR = { gardien: '#e8c860', berserker: '#c4000c', archimage: '#9a6aff', invocateur: '#5ad8ff', sniper: '#8acf5a', artificier: '#d89040', duelliste: '#c8d4f0', ombre: '#6a2a8a' };
const r = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

// ---- les clôtures : une ligne basse de chaque côté de l'allée, devant la maison
function cloture(g, id, x, y) {
  const piquets = [-46, -38, -30, -22, 22, 30, 38, 46];
  if (id === 'cl_bois') { for (const dx of piquets) { r(g, '#6a4422', x + dx - 1, y - 7, 3, 8); r(g, '#8a5a30', x + dx - 1, y - 7, 2, 1); } r(g, '#7a4e28', x - 47, y - 5, 28, 2); r(g, '#7a4e28', x + 21, y - 5, 28, 2); r(g, '#7a4e28', x - 47, y - 2, 28, 1); r(g, '#7a4e28', x + 21, y - 2, 28, 1); }
  if (id === 'cl_pierre') for (const s of [-1, 1]) { const x0 = s < 0 ? x - 48 : x + 20; for (let i = 0; i < 7; i++) { r(g, i % 2 ? '#8a8478' : '#a29c90', x0 + i * 4, y - 6, 4, 3); r(g, i % 2 ? '#a29c90' : '#8a8478', x0 + i * 4, y - 3, 4, 3); } r(g, '#c8c2b4', x0, y - 7, 28, 1); }
  if (id === 'cl_fer') for (const s of [-1, 1]) { const x0 = s < 0 ? x - 48 : x + 20; r(g, '#2a2a32', x0, y - 7, 28, 1); r(g, '#2a2a32', x0, y - 2, 28, 1); for (let i = 0; i < 28; i += 3) { r(g, '#3a3a44', x0 + i, y - 9, 1, 9); r(g, '#c8a040', x0 + i, y - 10, 1, 1); } }
}
// ---- les jardins : deux massifs de part et d'autre de l'allée
function jardin(g, id, x, y, clan, t) {
  for (const s of [-1, 1]) {
    const cx = x + s * 22, cy = y + 20;
    r(g, '#4a3220', cx - 9, cy - 3, 18, 6); r(g, '#5e4028', cx - 8, cy - 3, 16, 1);
    if (id === 'ja_fleurs') for (let i = 0; i < 6; i++) { const fx = cx - 7 + i * 3, c = ['#f04a6a', '#f0d040', '#e870e0', '#ffffff', '#f08a30', '#7ab0ff'][i]; r(g, '#3a8a3a', fx, cy - 4, 1, 3); r(g, c, fx - 1, cy - 6, 3, 2); }
    if (id === 'ja_potager') for (let i = 0; i < 4; i++) { const fx = cx - 6 + i * 4; r(g, '#4ab040', fx, cy - 5, 2, 3); r(g, '#6ad050', fx - 1, cy - 6, 4, 1); if (i % 2) r(g, '#f07a20', fx, cy - 2, 2, 2); }
    if (id === 'ja_element') for (let i = 0; i < 4; i++) {
      const fx = cx - 6 + i * 4, b = Math.sin(t * 3 + i + s) > 0;
      if (clan === 'feu') { r(g, '#3a1a10', fx, cy - 4, 1, 3); r(g, b ? '#ffd040' : '#ff7a20', fx - 1, cy - 7, 3, 3); r(g, '#ff3a10', fx, cy - 6, 1, 1); }
      else if (clan === 'eau') { r(g, i % 2 ? '#ff7a8a' : '#ffa060', fx, cy - 7, 1, 5); r(g, i % 2 ? '#ff7a8a' : '#ffa060', fx - 1, cy - 6, 3, 1); if (b) r(g, '#bff0ff', fx + 1, cy - 9, 1, 1); }
      else { r(g, '#e8e0c8', fx, cy - 4, 1, 3); r(g, b ? '#9affd0' : '#5ae0a0', fx - 1, cy - 6, 3, 2); if (b) r(g, 'rgba(160,255,200,.4)', fx - 2, cy - 8, 5, 5); }
    }
  }
}
// ---- les statues : à gauche, en retrait (le pied en (sx, sy))
function statue(g, id, sx, sy, t) {
  r(g, '#6a6458', sx - 7, sy - 4, 14, 4); r(g, '#8a8478', sx - 6, sy - 5, 12, 1);
  if (id === 'st_guerrier') { r(g, '#a8a296', sx - 2, sy - 20, 4, 15); r(g, '#bcb6aa', sx - 3, sy - 24, 6, 5); r(g, '#a8a296', sx - 5, sy - 17, 3, 7); r(g, '#bcb6aa', sx + 3, sy - 26, 1, 16); r(g, '#8a8478', sx + 2, sy - 12, 3, 1); }
  if (id === 'st_fontaine') { r(g, '#8a8478', sx - 9, sy - 8, 18, 4); r(g, '#4a9ad8', sx - 8, sy - 8, 16, 2); r(g, '#a8a296', sx - 1, sy - 16, 2, 8); r(g, '#bcb6aa', sx - 4, sy - 17, 8, 2); const k = Math.floor(t * 6) % 3; r(g, '#bff0ff', sx - 1, sy - 20 + k, 2, 2); r(g, '#8ad0ff', sx - 4 + k, sy - 15, 1, 3); r(g, '#8ad0ff', sx + 3 - k, sy - 15, 1, 3); }
  if (id === 'st_dragon') { r(g, '#4a7a5a', sx - 5, sy - 14, 10, 9); r(g, '#5a9a6a', sx + 2, sy - 20, 5, 6); r(g, '#ffd040', sx + 5, sy - 18, 1, 1); r(g, '#3a6a4a', sx - 9, sy - 18, 5, 7); r(g, '#3a6a4a', sx - 11, sy - 21, 4, 3); r(g, '#5a9a6a', sx - 7, sy - 8, 3, 3); if (Math.floor(t * 2) % 4 === 0) r(g, 'rgba(255,160,60,.8)', sx + 7, sy - 18, 3, 2); }
  if (id === 'st_champion') { r(g, '#c8a030', sx - 4, sy - 14, 8, 9); r(g, '#ffd870', sx - 6, sy - 15, 12, 2); r(g, '#c8a030', sx - 7, sy - 14, 2, 4); r(g, '#c8a030', sx + 5, sy - 14, 2, 4); r(g, '#a8801a', sx - 1, sy - 5, 2, 1); r(g, '#fff4c0', sx - 2, sy - 12, 1, 3); if (Math.sin(t * 4) > 0.6) r(g, '#ffffff', sx + 2, sy - 16, 1, 1); }
}
// ---- les bannières : un mât à droite, en retrait (le pied en (bx, by)), le drapeau ondule
function banniere(g, id, bx, by, clan, branche, t) {
  r(g, '#5a3a22', bx, by - 34, 2, 34); r(g, '#c8a040', bx - 1, by - 36, 4, 2);
  const [c1, c2] = id === 'ba_or' ? ['#e8b830', '#a87a10'] : id === 'ba_branche' ? [COUL_BR[branche] || '#888', '#1a0a10'] : COUL[clan] || COUL.feu;
  for (let i = 0; i < 12; i++) { const o = Math.round(Math.sin(t * 4 + i * 0.6) * 1.2); r(g, i % 4 === 3 ? c2 : c1, bx + 2 + i, by - 33 + o, 1, 14 - (i > 9 ? i - 9 : 0)); }
  if (id === 'ba_or') r(g, '#fff0a0', bx + 6, by - 28, 3, 3);
  if (id === 'ba_branche') r(g, '#ffffff', bx + 6, by - 28, 2, 2);
}

// dessine toutes les décorations d'une maison (deco : { cloture, jardin, statue, banniere })
export function dessinerDeco(g, deco, m, clan, branche, t) {
  if (deco.statue) statue(g, deco.statue, m.x - 76, m.y + 4, t);
  if (deco.banniere) banniere(g, deco.banniere, m.x + 74, m.y + 4, clan, branche, t);
  if (deco.jardin) jardin(g, deco.jardin, m.x, m.y, clan, t);
  if (deco.cloture) cloture(g, deco.cloture, m.x, m.y + 32);
}
// une vignette pour la fenêtre (agrandie, pixels nets)
export function vignetteDeco(id, empl, clan, branche, z = 3) {
  const c = document.createElement('canvas'); c.width = 100 * z; c.height = 44 * z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const o = document.createElement('canvas'); o.width = 100; o.height = 44; const h = o.getContext('2d');
  if (empl === 'statue') statue(h, id, 50, 40, 0.3);
  else if (empl === 'banniere') banniere(h, id, 44, 40, clan, branche, 0.3);
  else if (empl === 'jardin') jardin(h, id, 50, 16, clan, 0.3);
  else cloture(h, id, 50, 30);
  g.drawImage(o, 0, 0, 100 * z, 44 * z); c.className = 'vignetteDeco'; return c;
}
export const NOM_BRANCHE = (b) => BRANCHES[b]?.nom || '';
