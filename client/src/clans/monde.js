// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la carte du monde en pixel art (vue de dessus)
//  Le monde est une grille de tuiles de 16 px (shared/clans/geo.js).
//  - le sol est peint une fois, pixel par pixel (image cachée) ;
//  - le décor (arbres, rochers, maisons…), les joueurs et les lieux sont
//    des petits sprites dessinés en code, triés par profondeur (y) ;
//  - on affiche le tout avec un zoom entier, sans lissage : pixels nets.
// =====================================================================
import { MONDE, NT, TUILE, CENTRES, CARREFOUR, LIEUX, MAISONS, OUVRAGES, maisonDe, territoireDe, obstacles, alea, praticable, SOLIDES } from '../../../shared/clans/geo.js';
import { PROJETS, ETAPES } from '../../../shared/clans/projets.js';
import { dessinerFamilier } from './familiersArt.js';
import * as HF from '../../../shared/clans/hautsfaits.js';
import { marchandDe, PORTEE as PORTEE_MARCHAND } from '../../../shared/clans/marchand.js';
import { SANCTUAIRES, CAPTURE } from '../../../shared/clans/territoires.js';
import { PIECES, lireCode } from '../../../shared/clans/apparence.js';
export { MONDE, CENTRES, CARREFOUR, LIEUX, MAISONS, OUVRAGES, maisonDe, territoireDe };
const NOMS_TERR = { feu: 'Terres de Braise', eau: "Lagons d'Azur", plante: "Sylve d'Émeraude" };
const COUL = { feu: '#e0552a', eau: '#2a8ae0', plante: '#3aa84a' };
const POLICE = '"Nunito", system-ui, sans-serif';   // v63 : lisible, chiffres nets (la police pixel rendait les chiffres illisibles)
try { for (const w of [700, 800, 900]) document.fonts?.load(`${w} 14px Nunito`); } catch { /* rien */ }

// ---------- petits outils ----------
// couleurs « #rrggbb » → [r, g, b], calculées une seule fois (le sol en demande des millions)
const HEX = new Map();
const hex = (h) => { let v = HEX.get(h); if (!v) { v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; HEX.set(h, v); } return v; };
const H = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const PAL = Object.fromEntries(Object.entries({
  herbe: ['#3f8a3a', '#4a9a42', '#58a84a', '#357a32'], fleurs: ['#3f8a3a', '#4a9a42', '#58a84a', '#357a32'],
  sylve: ['#24602c', '#2c6e32', '#357a38', '#1e5226'], mousse: ['#3a7a30', '#468a36', '#55963e', '#2e6a28'],
  paves: ['#8a8478', '#9a9488', '#a8a294', '#5a554c'], chemin: ['#8a6a40', '#9a7a4a', '#a8885a', '#76583a'],
  roche: ['#3e3230', '#4a3c38', '#584842', '#2e2422'], cendre: ['#4c4648', '#5a5456', '#686264', '#3c3638'],
  lave: ['#d8401a', '#ff7a1a', '#ffc640', '#a82a10'], sable: ['#e4cc94', '#d8bc84', '#eedaa8', '#c4a670'],
  hautfond: ['#48b4b8', '#56c2c2', '#6ad0cc', '#3aa0a8'], eau: ['#2a64b4', '#2e70c0', '#3a80cc', '#24569e'],
  mare: ['#245470', '#2a5e7c', '#326a88', '#1e4660'],
}).map(([k, v]) => [k, v.map(hex)]));
const PLACE = { feu: ['#4a403e', '#564a46', '#62544e', '#2e2624'], eau: ['#d4c098', '#c8b48a', '#dccaa6', '#a8946c'], plante: ['#8a7856', '#7e6c4c', '#968462', '#5e5038'] };
for (const k in PLACE) PLACE[k] = PLACE[k].map(hex);
const LIQUIDE = new Set(['eau', 'mare', 'lave']);

// la couleur d'un pixel du sol
function pixelSol(s, x, y, tx, ty) {
  const h = H(x, y), hb = H(x >> 2, y >> 2), p = PAL[s];
  let i = hb < 0.3 ? 0 : hb < 0.72 ? 1 : hb < 0.9 ? 2 : 3;
  if (h < 0.07) i = (i + 1) % 3;
  switch (s) {
    case 'herbe': case 'sylve': case 'mousse': case 'fleurs': {
      if (h > 0.965 && (y & 1)) return p[2];                                   // brins clairs
      if (s === 'fleurs' && H(x >> 1, y >> 1) > 0.975) return hex(['#f0e060', '#f080a0', '#ffffff', '#a0c0ff'][Math.floor(H(tx, ty) * 4)]);
      if (s === 'mousse' && H(x >> 1, (y >> 1) + 7) > 0.985) return hex('#c8d850');
      return p[i];
    }
    case 'paves': case 'place': {
      if (s === 'paves') { const d = Math.hypot(x - CARREFOUR[0], y - CARREFOUR[1]); if ((d > 100 && d < 106) || (d > 52 && d < 56)) return h < 0.5 ? hex('#5e584e') : hex('#6a645a'); if (d >= 106 && d < 112) return hex('#b0a894'); }
      const pal = s === 'place' ? PLACE[territoireDe(x, y)] || PAL.paves : PAL.paves;
      const row = Math.floor(y / 6), off = (row & 1) * 4, bx = Math.floor((x + off) / 8);
      if (y % 6 === 0 || (x + off) % 8 === 0) return pal[3];
      const c = pal[Math.floor(H(bx, row) * 3)];
      return y % 6 === 1 ? c.map((v) => Math.min(255, v + 14)) : h < 0.05 ? pal[3].map((v) => v + 20) : c;
    }
    case 'chemin': return h > 0.975 ? hex('#c8b890') : p[i];
    case 'roche': return h > 0.985 ? hex('#7a6a60') : (H(x >> 3, y) > 0.97 ? p[3] : p[i]);
    case 'cendre': return h > 0.994 ? hex('#ff8a2a') : p[i];
    case 'lave': { const v = Math.sin(x * 0.22 + Math.sin(y * 0.18) * 2) + Math.sin(y * 0.27 + x * 0.07); return v > 1.1 ? p[2] : v > 0.1 ? p[1] : v > -1 ? p[0] : p[3]; }
    case 'sable': return h > 0.98 ? hex('#fff0c8') : h < 0.015 ? hex('#a88a5a') : p[i];
    case 'hautfond': return H(x >> 2, (y >> 2) + 3) > 0.86 ? PAL.sable[0] : ((x + (y >> 2) * 5) % 14 < 3 && y % 7 === 0) ? hex('#b8f0ec') : p[i];
    case 'eau': return ((x + (y >> 3) * 7) % 16 < 4 && y % 8 === 0) ? hex('#8ac0f0') : p[i < 3 ? i : 1];
    case 'mare': { if (H(tx, ty) > 0.8) { const dx = (x & 15) - 8, dy = (y & 15) - 8; if (dx * dx + dy * dy < 14) return dx * dx + dy * dy < 3 ? hex('#e8a0c0') : hex('#4a9a3a'); } return p[i < 3 ? i : 1]; }
  }
  return [255, 0, 255];
}

// ---------- le sol, peint une fois ----------
// Par bandes de tuiles, en rendant la main au navigateur entre deux bandes (pas d'écran figé),
// puis gardé sur l'appareil (IndexedDB) : les visites suivantes le relisent en un instant.
const RENDU_SOL = 1;   // à augmenter quand on change la façon de peindre le sol
async function peindreSol(obs, progres) {
  const c = document.createElement('canvas'); c.width = MONDE.l; c.height = MONDE.h;
  const g = c.getContext('2d'), img = g.createImageData(MONDE.l, MONDE.h), d = img.data;
  const S = (tx, ty) => obs.sols[Math.max(0, Math.min(NT.h - 1, ty)) * NT.l + Math.max(0, Math.min(NT.l - 1, tx))];
  let pause = performance.now();
  for (let ty = 0; ty < NT.h; ty++) {
    for (let tx = 0; tx < NT.l; tx++) {
      const s = S(tx, ty), liq = LIQUIDE.has(s);
      const vois = [S(tx - 1, ty), S(tx + 1, ty), S(tx, ty - 1), S(tx, ty + 1)];
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
        const x = tx * 16 + lx, y = ty * 16 + ly;
        let ss = s;
        // fondu en damier entre deux sols de terre ferme
        if (!liq) {
          const h = H(x * 3, y * 5);
          if (lx < 3 && vois[0] !== s && !LIQUIDE.has(vois[0]) && h < 0.5 - lx * 0.15) ss = vois[0];
          else if (lx > 12 && vois[1] !== s && !LIQUIDE.has(vois[1]) && h < 0.5 - (15 - lx) * 0.15) ss = vois[1];
          else if (ly < 3 && vois[2] !== s && !LIQUIDE.has(vois[2]) && h < 0.5 - ly * 0.15) ss = vois[2];
          else if (ly > 12 && vois[3] !== s && !LIQUIDE.has(vois[3]) && h < 0.5 - (15 - ly) * 0.15) ss = vois[3];
        }
        let col = pixelSol(ss, x, y, tx, ty), k = 1;
        // bords des liquides : écume ou croûte de lave
        if (liq) {
          const bord = (vois[0] !== s && lx < 2) || (vois[1] !== s && lx > 13) || (vois[2] !== s && ly < 2) || (vois[3] !== s && ly > 13);
          const bord2 = (vois[0] !== s && lx < 4) || (vois[1] !== s && lx > 11) || (vois[2] !== s && ly < 4) || (vois[3] !== s && ly > 11);
          if (bord) col = s === 'lave' ? hex('#2a1810') : ((x + y) & 1 ? hex('#e8f6ff') : hex('#b8e0f4'));
          else if (bord2 && s === 'lave') col = hex('#ff9a2a');
          else if (bord2 && (x * 7 + y * 3) % 5 === 0) col = hex('#cfeeff');
        } else if ((vois[3] && LIQUIDE.has(vois[3]) && ly > 13) || (vois[2] && LIQUIDE.has(vois[2]) && ly < 1)) k = 0.75;
        const i = (y * MONDE.l + x) * 4; d[i] = col[0] * k; d[i + 1] = col[1] * k; d[i + 2] = col[2] * k; d[i + 3] = 255;
      }
    }
    if (performance.now() - pause > 14) { progres?.((ty + 1) / NT.h); await new Promise((r) => setTimeout(r, 0)); pause = performance.now(); }
  }
  g.putImageData(img, 0, 0);
  return c;
}
// la petite base de l'appareil où l'on garde le sol déjà peint
const base = () => new Promise((ok, ko) => { const r = indexedDB.open('clans', 1); r.onupgradeneeded = () => r.result.createObjectStore('cache'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
async function cacheLire(cle) { const db = await base(); return new Promise((ok) => { const r = db.transaction('cache').objectStore('cache').get(cle); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); }
async function cacheEcrire(cle, v) { const db = await base(); return new Promise((ok) => { const t = db.transaction('cache', 'readwrite'); t.objectStore('cache').clear(); t.objectStore('cache').put(v, cle); t.oncomplete = () => ok(); t.onerror = () => ok(); }); }
// l'empreinte de la carte : si la géographie change, l'ancien sol gardé n'est plus utilisé
function empreinteSol(obs) { let h = 2166136261 ^ RENDU_SOL; for (const x of obs.sols) for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return `sol-${(h >>> 0).toString(36)}`; }
async function chargerSol(obs, progres) {
  const cle = empreinteSol(obs);
  try {
    const blob = await cacheLire(cle);
    if (blob) { const bmp = await createImageBitmap(blob); progres?.(1); return bmp; }
  } catch { /* pas de cache (navigation privée…) : on peint */ }
  const c = await peindreSol(obs, progres);
  try { c.toBlob((b) => { if (b) cacheEcrire(cle, b).catch(() => {}); }, 'image/png'); } catch { /* tant pis */ }
  return c;
}
// la mini-carte : un pixel par tuile
function peindreMini(obs) {
  const c = document.createElement('canvas'); c.width = NT.l; c.height = NT.h;
  const g = c.getContext('2d'), img = g.createImageData(NT.l, NT.h);
  for (let i = 0; i < NT.l * NT.h; i++) { const s = obs.sols[i], col = s === 'place' ? PLACE[territoireDe((i % NT.l) * 16, Math.floor(i / NT.l) * 16)]?.[0] || PAL.paves[0] : PAL[s][1]; img.data.set([col[0], col[1], col[2], 255], i * 4); }
  for (const o of obs) { const i = (o.ty * NT.l + o.tx) * 4; img.data.set([20, 40, 20, 255].map((v, k) => k < 3 ? img.data[i + k] * 0.55 : v), i); }
  g.putImageData(img, 0, 0);
  for (const k in MAISONS) for (const m of MAISONS[k]) { g.fillStyle = k === 'feu' ? '#c8402a' : k === 'eau' ? '#4a8ad8' : '#7aa83a'; g.fillRect(Math.floor(m.x / 16) - 1, Math.floor(m.y / 16) - 1, 3, 2); }
  return c;
}

// ---------- les sprites (dessinés pixel par pixel, avec contour) ----------
function sprite(w, h, fn, contour = '#160e0c') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), P = (col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const disque = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P(col, cx + x, cy + y); };
  fn(P, disque, g);
  if (contour) {
    const d = g.getImageData(0, 0, w, h), a = d.data, op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) add.push([x, y]);
    g.fillStyle = contour; for (const [x, y] of add) g.fillRect(x, y, 1, 1);
  }
  return c;
}
const DECOR = {
  arbre: sprite(32, 42, (P, D) => { P('#6a4426', 14, 27, 5, 13); P('#4a2e18', 17, 27, 2, 13); P('#4a2e18', 12, 38, 2, 2); P('#4a2e18', 19, 38, 2, 2); D(16, 16, 12, '#2a6a2a'); D(14, 14, 10, '#3a8a34'); D(12, 11, 6, '#58a844'); P('#7ac85a', 9, 8, 2, 1); P('#7ac85a', 12, 6, 2, 1); P('#7ac85a', 8, 11, 1, 2); P('#24582a', 20, 22, 3, 2); P('#24582a', 9, 24, 3, 1); }),
  pin: sprite(26, 44, (P) => { P('#5a3a20', 11, 34, 4, 8); for (let k = 0; k < 4; k++) { const top = 3 + k * 8; for (let y = 0; y < 12; y++) { const w = 2 + Math.floor(y * (0.8 + k * 0.15)); P('#1e5a32', 13 - w, top + y, w * 2, 1); P('#2e7a42', 13 - w, top + y, Math.max(1, w - 1), 1); } } P('#5aa86a', 12, 4, 1, 3); }),
  buisson: sprite(20, 16, (P, D) => { D(6, 9, 5, '#2e7a30'); D(13, 9, 5, '#2e7a30'); D(10, 6, 5, '#3a8e38'); P('#5aaa48', 8, 3, 2, 1); P('#d83a3a', 6, 8); P('#d83a3a', 13, 10); P('#d83a3a', 10, 5); }),
  palmier: sprite(36, 46, (P) => { for (let k = 0; k < 9; k++) { const x = 16 + Math.round(Math.sin(k * 0.25) * 3), y = 42 - k * 3.6; P(k % 2 ? '#8a6a3a' : '#a07a44', x, Math.round(y), 5, 4); } const cx = 20, cy = 12; for (const [dx, dy] of [[-1, -0.25], [1, -0.3], [-0.9, 0.45], [0.9, 0.5], [0.1, -1]]) for (let k = 0; k < 13; k++) { const x = Math.round(cx + dx * k), y = Math.round(cy + dy * k + (k * k) / 26); P('#2e8a34', x, y, 2, 2); if (k % 3 === 0) P('#5ac04a', x, y - 1, 2, 1); } P('#5a3a1a', 18, 13, 3, 3); P('#5a3a1a', 21, 14, 3, 3); }),
  rocher: sprite(22, 18, (P, D) => { D(11, 10, 7, '#2e2624'); D(10, 9, 6, '#4a3e3a'); D(9, 7, 3, '#6a5a54'); P('#ff7a2a', 14, 12, 2, 1); }),
  rocher_clair: sprite(22, 18, (P, D) => { D(11, 10, 7, '#6e6a60'); D(10, 9, 6, '#9a9488'); D(8, 7, 3, '#c4beb0'); }),
  arbre_mort: sprite(26, 38, (P) => { P('#3a2a22', 11, 12, 4, 25); P('#2a1c16', 13, 12, 2, 25); P('#3a2a22', 6, 14, 5, 2); P('#3a2a22', 5, 9, 2, 6); P('#3a2a22', 15, 18, 6, 2); P('#3a2a22', 19, 12, 2, 7); P('#3a2a22', 10, 5, 2, 8); P('#3a2a22', 14, 7, 2, 6); P('#ff6a20', 12, 30, 1, 1); }),
  cristal: sprite(20, 26, (P) => { const sh = (x, y, w, h, c1, c2) => { for (let k = 0; k < h; k++) { const ww = k < 3 ? k + 1 : w; P(c1, x + (w - ww) / 2 | 0, y + k, ww, 1); } P(c2, x + 1, y + 2, 1, h - 3); }; sh(8, 3, 5, 20, '#d8302a', '#ffb0a0'); sh(3, 10, 4, 13, '#a8201a', '#ff7a60'); sh(13, 8, 4, 15, '#ff5a2a', '#ffd0a0'); }),
  corail: sprite(20, 18, (P) => { for (const [x, h] of [[5, 10], [9, 14], [13, 9], [16, 6]]) { P('#e8506a', x, 17 - h, 2, h); P('#ff8a9a', x, 17 - h, 1, 2); } P('#e8506a', 6, 9, 3, 2); P('#e8506a', 11, 6, 3, 2); }),
  champignon: sprite(20, 20, (P, D) => { P('#e8dcc0', 8, 10, 4, 8); P('#c8bca0', 10, 10, 2, 8); for (let y = 0; y < 7; y++) { const w = Math.min(8, 3 + y * 2); P('#c82a2a', 10 - w, 3 + y, w * 2, 1); } P('#fff', 6, 5, 2, 2); P('#fff', 11, 4, 2, 1); P('#fff', 13, 7, 2, 2); P('#8a1a1a', 2, 9, 16, 1); }),
};
const ancreDecor = { arbre: [16, 40], pin: [13, 42], buisson: [10, 14], palmier: [18, 45], rocher: [11, 16], rocher_clair: [11, 16], arbre_mort: [13, 37], cristal: [10, 24], corail: [10, 17], champignon: [10, 18] };

function spriteMaison(k) {
  const mur = { feu: ['#4a3a36', '#3a2c28'], eau: ['#ece4d0', '#c8bca0'], plante: ['#8a5a30', '#6a4220'] }[k];
  const toit = { feu: ['#a82a1a', '#c8402a', '#7a1a10'], eau: ['#2a6ab8', '#4a8ad8', '#1a4a88'], plante: ['#5a8a2a', '#7aa83a', '#3a6a1a'] }[k];
  return sprite(56, 58, (P) => {
    P(mur[0], 5, 30, 46, 27);
    for (let y = 33; y < 57; y += 4) P(mur[1], 5, y, 46, 1);
    if (k === 'plante') for (let x = 9; x < 51; x += 6) P(mur[1], x, 30, 1, 27);
    if (k === 'feu') for (let y = 31; y < 57; y += 8) for (let x = 5 + ((y / 8) & 1) * 6; x < 51; x += 12) P(mur[1], x, y, 1, 4);
    P('#3a2010', 23, 42, 10, 15); P('#5a3018', 24, 43, 8, 14); P('#e8c050', 30, 49, 1, 2);
    for (const wx of [10, 39]) { P('#2a1a10', wx - 1, 35, 9, 8); P('#ffd070', wx, 36, 7, 6); P('#ffefb0', wx, 36, 3, 2); P('#2a1a10', wx + 3, 36, 1, 6); }
    for (let y = 0; y < 27; y++) { const half = Math.min(28, 9 + Math.round(y * 0.75)); P(y % 4 === 3 ? toit[2] : toit[0], 28 - half, 5 + y, half * 2, 1); P(toit[1], 28 - half, 5 + y, Math.max(2, half - 6), 1); }
    P(toit[1], 20, 4, 16, 2);
    if (k === 'feu') { P('#3a2c28', 40, 2, 6, 10); P('#ff8a2a', 41, 2, 4, 1); }
    if (k === 'eau') { P('#f8f4e8', 25, 12, 6, 6); P('#2a6ab8', 27, 13, 2, 4); }
    if (k === 'plante') { P('#e85a8a', 10, 56, 2, 1); P('#f0e060', 44, 56, 2, 1); P('#3a8a34', 8, 54, 5, 3); P('#3a8a34', 43, 54, 5, 3); }
  });
}
const MAISON_SPR = { feu: spriteMaison('feu'), eau: spriteMaison('eau'), plante: spriteMaison('plante') };
// le socle d'un sanctuaire (le cristal, à la couleur du clan qui le tient, est dessiné à part)
const SOCLE = sprite(40, 34, (P) => { P('#3e3a34', 2, 24, 36, 9); P('#5c574e', 4, 22, 32, 4); P('#7a7468', 4, 22, 32, 1); P('#4a453e', 14, 4, 12, 19); P('#6e685c', 14, 4, 3, 19); P('#3a3630', 23, 4, 3, 19); P('#8a8274', 12, 2, 16, 3); P('#5c574e', 6, 26, 4, 2); P('#5c574e', 30, 27, 3, 2); });
const AUTEL = sprite(52, 40, (P) => { P('#4a4238', 4, 28, 44, 11); P('#6a6052', 8, 20, 36, 10); P('#8a8070', 8, 20, 36, 2); P('#8a8070', 4, 28, 44, 2); P('#5a5246', 16, 8, 20, 13); P('#7a7062', 16, 8, 20, 2); ['#ff7a3a', '#3a9aff', '#5ad06a'].forEach((c, i) => { P(c, 12 + i * 12, 24, 4, 3); P(c, 14 + i * 12, 33, 2, 2); }); P('#ffe070', 24, 13, 4, 4); });
const BANNIERE = Object.fromEntries(Object.entries(COUL).map(([k, col]) => [k, sprite(16, 40, (P) => { P('#5a3a1a', 2, 2, 2, 37); P('#c8a040', 1, 1, 4, 2); P(col, 4, 4, 10, 14); P('rgba(0,0,0,.25)', 4, 15, 10, 3); for (let x = 4; x < 14; x += 2) P(col, x, 18, 1, 2); P('#fff4d0', 7, 8, 4, 4); P(col, 8, 9, 2, 2); })]));
const PORTAIL = Object.fromEntries(Object.entries(COUL).map(([k, col]) => [k, sprite(52, 60, (P) => {
  const pierre = ['#5a5652', '#74706a', '#3e3a36'];
  for (const x of [4, 40]) { P(pierre[0], x, 16, 8, 42); P(pierre[1], x, 16, 2, 42); for (let y = 20; y < 58; y += 7) P(pierre[2], x, y, 8, 1); }
  for (let a = 0; a <= 20; a++) { const t = (a / 20) * Math.PI, x = Math.round(26 - Math.cos(t) * 18), y = Math.round(20 - Math.sin(t) * 16); P(pierre[0], x - 3, y - 3, 7, 7); P(pierre[1], x - 3, y - 3, 7, 2); }
  P(col, 24, 0, 4, 4); P('#ffffff', 25, 1, 2, 2);
  P(pierre[2], 2, 56, 48, 3);
})]));
const FILON = {
  feu: sprite(16, 18, (P) => { P('#a8182a', 6, 3, 4, 13); P('#ff4a6a', 7, 3, 2, 12); P('#c8203a', 2, 8, 3, 8); P('#ff7a8a', 2, 8, 1, 6); P('#c8203a', 11, 7, 3, 9); P('#ffb0c0', 7, 4, 1, 3); P('#5a4a44', 1, 15, 14, 2); }),
  eau: sprite(18, 16, (P, D) => { for (let y = 0; y < 6; y++) P(y % 2 ? '#d8c8b8' : '#f0e4d8', 2 + y, 9 + y, 14 - y * 2, 1); D(9, 7, 4, '#1a1a2a'); D(8, 6, 2, '#3a3a5a'); P('#c0c0e0', 7, 5, 1, 1); }),
  plante: sprite(16, 18, (P, D) => { D(8, 11, 5, '#c8901a'); D(7, 10, 3, '#f0c040'); P('#fff0a0', 6, 8, 1, 2); P('#7a5a20', 4, 5, 8, 2); P('#4a3010', 7, 2, 2, 3); P('#5ac040', 9, 1, 4, 2); }),
};

// ---------- la parcelle visible : ce que les bâtiments améliorés ajoutent autour de la maison ----------
const LANTERNE = sprite(8, 20, (P) => { P('#3a2a1e', 3, 6, 2, 13); P('#2a1c14', 1, 18, 6, 2); P('#2a2420', 1, 1, 6, 6); P('#ffd870', 2, 2, 4, 4); P('#fff4c0', 3, 3, 2, 2); });
const OBELISQUE = [2, 3, 4, 5].map((n) => sprite(16, 22 + n * 3, (P) => { const h = 10 + n * 3, top = 22 + n * 3 - h - 1; P('#6a6052', 3, top + 4, 10, h - 4); P('#8a8070', 3, top + 4, 3, h - 4); P('#4a4238', 2, top + h - 1, 12, 2); for (let k = 0; k < n; k++) P('#ffe070', 7, top + 6 + k * 3, 2, 1); }));
const ATELIER = {
  feu: sprite(28, 22, (P) => { P('#3a2a26', 2, 8, 14, 12); P('#ff6a1a', 5, 10, 8, 5); P('#ffd040', 7, 11, 4, 3); P('#2a1c18', 2, 6, 14, 3); P('#5a5a64', 18, 12, 9, 3); P('#3a3a44', 20, 15, 5, 5); P('#7a7a88', 18, 12, 9, 1); }),
  eau: sprite(24, 24, (P, D) => { D(12, 15, 8, '#8a8478'); D(12, 15, 5, '#2a64b4'); P('#8ac0f0', 9, 13, 3, 1); P('#5a3a1e', 3, 2, 2, 13); P('#5a3a1e', 19, 2, 2, 13); P('#7a4a26', 2, 1, 20, 3); P('#c8a060', 11, 4, 2, 6); }),
  plante: sprite(30, 20, (P) => { P('#5a3a20', 1, 2, 28, 17); for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { P('#3a8a34', 3 + c * 4, 4 + r * 5, 3, 3); if ((r + c) % 2) P(['#e85a5a', '#f0d040', '#e8e8ff'][r], 4 + c * 4, 4 + r * 5, 1, 1); } }),
};

// ---------- les boss mondiaux (64 × 64) ----------
const BOSS_SPR = {
  feu: sprite(64, 66, (P, D) => {
    D(32, 40, 20, '#2e2220'); D(32, 38, 18, '#4a3632'); D(26, 32, 9, '#5e4640');
    D(12, 40, 8, '#3a2a26'); D(52, 40, 8, '#3a2a26'); D(10, 50, 6, '#4a3632'); D(54, 50, 6, '#4a3632');
    P('#3a2a26', 20, 54, 8, 10); P('#3a2a26', 36, 54, 8, 10);
    for (const [x, y, l] of [[22, 30, 10], [36, 36, 12], [28, 46, 9], [14, 42, 6], [48, 44, 6], [40, 26, 7]]) for (let k = 0; k < l; k++) P(k % 3 ? '#ff7a1a' : '#ffd040', x + Math.round(Math.sin(k) * 2), y + k, 2, 1);
    D(32, 18, 10, '#3a2a26'); D(32, 17, 8, '#5e4640');
    P('#2a1c18', 20, 6, 4, 8); P('#2a1c18', 18, 3, 3, 4); P('#2a1c18', 40, 6, 4, 8); P('#2a1c18', 43, 3, 3, 4);
    P('#ffe060', 27, 16, 4, 3); P('#ffe060', 34, 16, 4, 3); P('#ff4a1a', 28, 17, 2, 1); P('#ff4a1a', 35, 17, 2, 1);
    P('#ff8a2a', 28, 22, 9, 2); P('#2a1010', 29, 22, 7, 1);
  }),
  eau: sprite(64, 66, (P, D) => {
    for (let k = 0; k < 26; k++) { const x = 8 + k * 2, y = 50 + Math.round(Math.sin(k * 0.45) * 6); D(x, y, 5, k % 4 ? '#1e4a8a' : '#2a62b0'); P('#8ac8e8', x - 1, y + 3, 2, 1); }
    for (let k = 0; k < 18; k++) { const x = 40 - Math.round(Math.sin(k * 0.2) * 8), y = 46 - k * 2; D(x, y, 6 - (k > 12 ? 1 : 0), '#2456a0'); P('#9ad0f0', x + 3, y, 2, 2); }
    D(36, 10, 9, '#2a62b0'); P('#2a62b0', 40, 6, 14, 8); P('#1e4a8a', 44, 13, 12, 3); for (let x = 44; x < 56; x += 3) P('#f0f4ff', x, 12, 1, 2);
    P('#ffe060', 38, 6, 4, 3); P('#1a1010', 40, 7, 1, 1);
    for (let k = 0; k < 6; k++) P('#4ac8c8', 26 + k * 2, 2 + k, 2, 6 - k);
    P('#4ac8c8', 24, 30, 6, 2); P('#4ac8c8', 22, 28, 4, 2);
  }),
  plante: sprite(64, 66, (P, D) => {
    P('#5a3a1e', 24, 22, 16, 34); P('#6e4a26', 26, 22, 6, 34); P('#3e2814', 34, 26, 2, 28);
    P('#5a3a1e', 18, 54, 8, 10); P('#5a3a1e', 38, 54, 8, 10); P('#4a3018', 14, 60, 6, 4); P('#4a3018', 44, 60, 6, 4);
    for (let k = 0; k < 12; k++) { P('#5a3a1e', 22 - k, 28 + Math.round(k * 0.6), 3, 3); P('#5a3a1e', 40 + k, 28 + Math.round(k * 0.6), 3, 3); }
    P('#5a3a1e', 6, 34, 3, 6); P('#5a3a1e', 9, 36, 2, 5); P('#5a3a1e', 55, 34, 3, 6); P('#5a3a1e', 53, 36, 2, 5);
    D(32, 14, 14, '#1e5a26'); D(20, 18, 9, '#2a6e30'); D(44, 18, 9, '#2a6e30'); D(32, 10, 10, '#3a8a3a'); D(28, 7, 4, '#5aa848');
    P('#e85a8a', 20, 12, 2, 2); P('#f0e060', 42, 10, 2, 2); P('#e85a8a', 36, 4, 2, 2);
    P('#b8ff60', 27, 32, 4, 3); P('#b8ff60', 34, 32, 4, 3); P('#2a1808', 28, 39, 8, 3); P('#3e2814', 25, 30, 14, 1);
  }),
};

// ---------- les personnages (16 × 26, 4 directions, 3 poses) ----------
const PEAU = '#f0c49a', PEAU2 = '#d09a70', OEIL = '#1a1414';
const TENUE = { feu: ['#c83a1a', '#8a2410', '#e86a2a'], eau: ['#2a6ac8', '#1a4688', '#1a2a5a'], plante: ['#3a9a3a', '#246a26', '#6a4a24'] };
const CACHE_PERSO = new Map();
// les coiffes (remplacent le couvre-chef de la classe) : dessinées sur la tête, selon la direction
const COIFFES = {
  h_aucun: () => {},
  h_bandeau: (P, dir) => { P('#c82a2a', 4, 5, 8, 1); if (dir === 'haut') { P('#c82a2a', 7, 6, 1, 3); P('#a81a1a', 8, 6, 1, 2); } else if (dir !== 'bas') P('#c82a2a', 3, 6, 1, 3); },
  h_paille: (P) => { P('#e8c870', 1, 4, 14, 1); P('#d8b050', 4, 1, 8, 3); P('#f0d890', 4, 1, 8, 1); P('#c83a2a', 4, 3, 8, 1); },
  h_fleurs: (P) => { P('#4a9a3a', 4, 3, 8, 1); P('#f080b0', 4, 2, 2, 1); P('#f0e060', 7, 2, 2, 1); P('#ffffff', 10, 2, 2, 1); P('#f080b0', 12, 3, 1, 1); },
  h_capuche: (P, dir, [, ten2]) => { P(ten2, 3, 3, 10, 3); P(ten2, 3, 6, 1, 6); P(ten2, 12, 6, 1, 6); P(ten2, 4, 2, 8, 1); if (dir === 'haut') P(ten2, 4, 6, 8, 6); },
  h_plume: (P) => { P('#2a5a8a', 4, 2, 8, 3); P('#1a3a6a', 3, 4, 10, 1); P('#f0f0f0', 11, 0, 1, 3); P('#f0f0f0', 12, -1, 1, 2); P('#d8d8e0', 10, 1, 1, 1); },
  h_casque: (P, dir) => { P('#9a9aac', 3, 2, 10, 5); P('#c8c8d4', 4, 2, 8, 1); P('#7a7a8c', 3, 6, 1, 4); P('#7a7a8c', 12, 6, 1, 4); if (dir === 'bas') P('#2a2a34', 5, 7, 6, 1); P('#c82a2a', 7, 0, 2, 2); },
  h_cornes: (P) => { P('#e8e0d0', 3, 2, 1, 3); P('#e8e0d0', 2, 1, 1, 2); P('#e8e0d0', 12, 2, 1, 3); P('#e8e0d0', 13, 1, 1, 2); P('#a89880', 3, 4, 1, 1); P('#a89880', 12, 4, 1, 1); },
  h_aureole: (P) => { P('#fff4a0', 5, 0, 6, 1); P('#ffe060', 4, 1, 1, 1); P('#ffe060', 11, 1, 1, 1); P('#fff4a0', 5, 2, 6, 1); },
  h_couronne: (P) => { P('#f0c030', 4, 2, 8, 2); P('#f0c030', 4, 0, 1, 2); P('#f0c030', 7, 0, 2, 2); P('#f0c030', 11, 0, 1, 2); P('#fff0a0', 4, 2, 8, 1); P('#e83a3a', 7, 3, 2, 1); P('#3a8ae8', 5, 3, 1, 1); P('#3ae86a', 10, 3, 1, 1); },
  h_masque: (P, dir) => { if (dir === 'haut') { P('#3a0a3a', 4, 8, 8, 1); return; } const x0 = dir === 'bas' ? 4 : 6; P('#e8e0d8', x0, 6, dir === 'bas' ? 8 : 6, 5); P('#3a0a3a', x0, 10, dir === 'bas' ? 8 : 6, 1); if (dir === 'bas') { P('#1a0418', 5, 8, 2, 1); P('#1a0418', 9, 8, 2, 1); P('#ff2a3a', 6, 8, 1, 1); P('#ff2a3a', 9, 8, 1, 1); } else { P('#1a0418', 9, 8, 2, 1); P('#ff2a3a', 10, 8, 1, 1); } P('#8a1a5a', 3, 3, 10, 2); P('#8a1a5a', 7, 1, 2, 2); },
};
export function feuillePerso(clan, classe, app = '') {
  const cle = `${clan}|${classe}|${app}`; if (CACHE_PERSO.has(cle)) return CACHE_PERSO.get(cle);
  const ap = lireCode(app), pt = PIECES[ap.tenue], pc = PIECES[ap.cheveux], coiffe = ap.chapeau === 'h_classe' ? null : COIFFES[ap.chapeau];
  const [ten0, ten20, chev0] = TENUE[clan] || TENUE.feu;
  const [ten, ten2] = pt?.couleurs || [ten0, ten20], chev = pc?.couleur || chev0;
  const c = document.createElement('canvas'); c.width = 48; c.height = 104; const g = c.getContext('2d');
  ['bas', 'haut', 'droite', 'gauche'].forEach((dir, row) => [0, 1, 2].forEach((f) => {
    const s = sprite(16, 26, (P) => {
      const pas = f === 0 ? 0 : f === 1 ? 1 : -1, cote = dir === 'droite' || dir === 'gauche';
      // jambes
      if (!cote) { P('#3a2e2a', 5, 19, 2, f === 1 ? 3 : 4); P('#3a2e2a', 9, 19, 2, f === 2 ? 3 : 4); P('#2a1c16', 5, f === 1 ? 22 : 23, 2, 2); P('#2a1c16', 9, f === 2 ? 22 : 23, 2, 2); }
      else { P('#3a2e2a', 6 + pas, 19, 2, 4); P('#3a2e2a', 8 - pas, 19, 2, 4); P('#2a1c16', 6 + pas, 23, 3, 1); P('#2a1c16', 8 - pas, 23, 3, 1); }
      // cape de l'escrimeur (derrière)
      if (classe === 'escrimeur' && dir !== 'bas') P('#a8243a', cote ? 3 : 4, 12, cote ? 4 : 8, 9);
      // carquois du tireur
      if (classe === 'tireur' && dir !== 'bas') { P('#7a4a22', cote ? 4 : 10, 10, 2, 7); P('#e8e0c8', cote ? 4 : 10, 9, 2, 1); }
      // corps
      if (!cote) { P(ten, 4, 12, 8, 7); P(ten2, 4, 12, 1, 7); P('#5a3a1a', 4, 17, 8, 1); P(ten, 2, 12 + (f === 1 ? 1 : 0), 2, 5); P(ten, 12, 12 + (f === 2 ? 1 : 0), 2, 5); P(PEAU, 2, 17 + (f === 1 ? 1 : 0), 2, 1); P(PEAU, 12, 17 + (f === 2 ? 1 : 0), 2, 1); }
      else { P(ten, 5, 12, 6, 7); P(ten2, 5, 12, 1, 7); P('#5a3a1a', 5, 17, 6, 1); P(ten2, 7 - pas, 12, 2, 5); P(PEAU, 7 - pas, 17, 2, 1); }
      // tête
      if (dir === 'bas') { P(PEAU, 4, 6, 8, 6); P(PEAU2, 4, 11, 8, 1); P(chev, 4, 4, 8, 3); P(chev, 3, 5, 1, 4); P(chev, 12, 5, 1, 4); P(OEIL, 6, 8, 1, 2); P(OEIL, 9, 8, 1, 2); }
      else if (dir === 'haut') { P(PEAU, 4, 6, 8, 6); P(chev, 4, 4, 8, 7); P(chev, 3, 5, 1, 5); P(chev, 12, 5, 1, 5); }
      else { P(PEAU, 5, 6, 7, 6); P(PEAU2, 5, 11, 7, 1); P(chev, 4, 4, 7, 3); P(chev, 4, 6, 3, 4); P(OEIL, 10, 8, 1, 2); }
      // accessoires de classe
      if (classe === 'combattant') { P('#a8a8b8', cote ? 6 : 3, 12, cote ? 4 : 2, 2); if (!cote) P('#a8a8b8', 11, 12, 2, 2); if (dir !== 'bas') P('#c8c8d0', cote ? 4 : 11, 7, 1, 6); }
      if (coiffe) coiffe(P, dir, [ten, ten2]);
      else if (classe === 'mage') { P('#6a3aa8', 3, 4, 10, 2); P('#6a3aa8', 5, 2, 6, 2); P('#6a3aa8', 7, 0, 3, 2); P('#f0d060', 6, 5, 4, 1); }
      if (!coiffe && classe === 'tireur') { P('#4a7a3a', 3, 3, 10, 3); P('#4a7a3a', 3, 6, 1, 5); P('#4a7a3a', 12, 6, 1, 5); P('#3a6a2a', 4, 3, 8, 1); }
      if (classe === 'escrimeur') { if (!coiffe) { P('#2a2a4a', 3, 3, 10, 2); P('#2a2a4a', 5, 1, 6, 2); P('#f0f0f0', 11, 0, 2, 3); } if (dir === 'bas') P('#a8243a', 4, 12, 2, 2); }
    });
    g.save(); if (dir === 'gauche') { g.translate(f * 16 + 16, row * 26); g.scale(-1, 1); g.drawImage(s, 0, 0); } else g.drawImage(s, f * 16, row * 26); g.restore();
  }));
  CACHE_PERSO.set(cle, c); return c;
}
const LIGNE_DIR = { bas: 0, haut: 1, droite: 2, gauche: 3 };
const AURAS = {
  a_braises: { c: ['#ffd27a', '#ff8a3a', '#e0452a'], monte: 1 }, a_bulles: { c: ['#d8f4ff', '#7ac8ff'], monte: 0.6, rond: 1 },
  a_lucioles: { c: ['#e8ff8a', '#b8f060'], orbite: 1 }, a_givre: { c: ['#ffffff', '#bfeaff', '#8ad0ff'], scintille: 1 },
  a_or: { c: ['#fff6c0', '#ffd870', '#e8a830'], scintille: 1, monte: 0.4 }, a_ombre: { c: ['#3a0a3a', '#5a1a5a', '#1a0418'], ombre: 1 },
  // exclusives du passe de saison (v54)
  a_aube: { c: ['#fff0b0', '#ffc070', '#ff8a60'], monte: 0.8 }, a_abysses: { c: ['#a0fff0', '#40e0d0', '#2080c0'], orbite: 1 },
  a_seve: { c: ['#fff080', '#c0ff80', '#70c040'], monte: 0.45, rond: 1 }, a_eclipse: { c: ['#fff8d0', '#d0b0ff', '#8a60e0'], scintille: 1 },
};
// x, y : les pieds du personnage ; t : le temps (s) ; k : taille d'un pixel
export function dessinerAura(ctx, x, y, aura, t, k = 1) {
  const a = AURAS[aura]; if (!a) return;
  const n = a.ombre ? 10 : 8;
  for (let i = 0; i < n; i++) {
    const h = (Math.sin(i * 91.7) + 1) / 2, ph = (t * (a.monte || 0.5) + h) % 1;
    let px, py;
    if (a.ombre) { px = x + Math.sin(t * 1.3 + i * 2.1) * 9; py = y - 2 - ph * 10; ctx.globalAlpha = 0.55 * (1 - ph); ctx.fillStyle = a.c[i % a.c.length]; ctx.fillRect(Math.round(px - k * 1.5), Math.round(py - k), Math.ceil(k * 3), Math.ceil(k * 2)); continue; }
    if (a.orbite) { const an = t * 1.6 + i * 0.785; px = x + Math.cos(an) * 10; py = y - 12 + Math.sin(an * 1.3) * 9; ctx.globalAlpha = 0.5 + Math.sin(t * 6 + i) * 0.5; }
    else if (a.scintille) { px = x + (h - 0.5) * 22; py = y - 2 - ((h * 7.3 + t * 0.35) % 1) * 26; ctx.globalAlpha = Math.max(0, Math.sin(t * 4 + i * 1.7)); }
    else { px = x + (h - 0.5) * 18 + Math.sin(t * 3 + i) * 2; py = y - ph * 30; ctx.globalAlpha = 1 - ph; }
    ctx.fillStyle = a.c[i % a.c.length];
    if (a.rond) { ctx.fillRect(Math.round(px), Math.round(py - k), Math.ceil(k), Math.ceil(k)); ctx.fillRect(Math.round(px - k), Math.round(py), Math.ceil(k), Math.ceil(k)); ctx.fillRect(Math.round(px + k), Math.round(py), Math.ceil(k), Math.ceil(k)); ctx.fillRect(Math.round(px), Math.round(py + k), Math.ceil(k), Math.ceil(k)); }
    else ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(k), Math.ceil(k));
  }
  ctx.globalAlpha = 1;
}

// =====================================================================
export function creerMonde(canvas, rappels) {
  const ctx = canvas.getContext('2d');
  const obs = obstacles();
  let fond = null, mini = null, joueur = { x: 0, y: 0, dir: 'bas', marche: false }, cam = { x: 0, y: 0 }, z = 3, temps = 0, dernier = 0, but = null, actif = false;
  const autres = new Map();   // id -> { nom, clan, classe, x, y, tx, ty, dir, statut, niv }
  const touches = new Set();
  let monApp = '', miniRect = null, monClan = 'feu', monNom = '', maClasse = 'combattant', filons = [], mondial = null, maParcelle = 111, sanct = {}, projets = null, monFam = '', monTitre = '';
  let marchand = marchandDe();   // recalculé chaque seconde (sa place se déduit de l'heure)
  setInterval(() => { const m = marchandDe(); if (m.slot !== marchand.slot) rappels.marchandBouge?.(m); marchand = m; }, 1000);
  const suiveurs = new Map();   // les familiers qui suivent chaque joueur : clé → { x, y, gauche, bouge }
  // résolution du dessin : celle de l'écran (×2 au plus)… sauf si l'appareil n'arrive pas à suivre,
  // auquel cas on dessine en ×1 (le pixel art agrandi reste net grâce à image-rendering: pixelated)
  let leger = false;
  try { leger = localStorage.getItem('clansLeger') === '1'; } catch { /* rien */ }
  const dpr = () => (leger ? 1 : Math.min(2, devicePixelRatio || 1));
  const mesures = [];
  function surveiller(dt) {
    if (leger || !actif || document.hidden || dt <= 0 || dt > 0.25) return;
    mesures.push(dt); if (mesures.length < 120) return;
    const moy = mesures.reduce((a, b) => a + b) / mesures.length; mesures.length = 0;
    if (moy > 0.024 && dpr() > 1) { leger = true; try { localStorage.setItem('clansLeger', '1'); } catch { /* rien */ } redim(); }
  }
  let joy = { x: 0, y: 0 }, cible = null;   // joystick tactile (vecteur −1..1) ; flèche du guide (point du monde)
  const tactile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // à appeler (et attendre) avant demarrer : prépare le sol
  async function preparer(progres) { if (!fond) { mini = peindreMini(obs); fond = await chargerSol(obs, progres); } }
  function demarrer(clan, nom, classe) {
    monClan = clan; monNom = nom; maClasse = classe || 'combattant';
    const m = maisonDe(clan, nom); joueur.x = m.x; joueur.y = m.y + 40; cam = { x: joueur.x, y: joueur.y }; actif = true; redim();
  }
  function redim() { canvas.width = innerWidth * dpr(); canvas.height = innerHeight * dpr(); z = Math.max(2, Math.round(canvas.height / 400)); }
  addEventListener('resize', redim);
  let ox = 0, oy = 0;   // décalage écran du monde (entier)

  const bloque = (x, y) => !praticable(x, y, obs);
  function lieuProche() {
    let best = null, d0 = Infinity;
    for (const p of LIEUX) { const d = Math.hypot(joueur.x - p.x, joueur.y - p.y); if (d < p.r + 30 && d < d0) { d0 = d; best = p; } }
    const m = maisonDe(monClan, monNom);
    if (Math.hypot(joueur.x - m.x, joueur.y - (m.y + 16)) < 50) best = { id: 'maison', nom: 'Ta maison', action: 'parcelle' };
    { const o = OUVRAGES[monClan]; if (Math.hypot(joueur.x - o.x, joueur.y - (o.y + 12)) < 52) best = { id: 'projet', nom: PROJETS[monClan].nom, action: 'projet', x: o.x, y: o.y }; }
    if (Math.hypot(joueur.x - marchand.x, joueur.y - marchand.y) < PORTEE_MARCHAND) best = { id: 'marchand', nom: 'le marchand ambulant', action: 'marchand', x: marchand.x, y: marchand.y };
    for (const f of filons) if (Math.hypot(joueur.x - f.x, joueur.y - f.y) < 36) best = { ...f, nom: 'un filon rare', action: 'filon' };
    for (const [id, a] of autres) if (a.clan !== monClan && territoireDe(a.x, a.y) === monClan && a.statut !== 'expedition' && a.statut !== 'duel' && Math.hypot(joueur.x - a.x, joueur.y - a.y) < 80) best = { id, nom: a.nom, action: 'defier' };
    // près du boss mondial, on l'affronte (prioritaire : pas de duel par erreur)
    if (mondial && Math.hypot(joueur.x - mondial.x, joueur.y - mondial.y) < 90) best = { ...mondial, action: 'mondial' };
    return best;
  }
  function agir() { const l = lieuProche(); if (l) { touches.clear(); but = null; rappels.agir(l); } }

  const DIR = { z: [0, -1], w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], q: [-1, 0], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  addEventListener('keydown', (e) => {
    if (!actif || !rappels.libre() || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (DIR[k]) { touches.add(k); but = null; e.preventDefault(); } else if (k === 'e' || k === ' ') { agir(); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => touches.delete(e.key.toLowerCase()));
  addEventListener('blur', () => touches.clear());
  canvas.addEventListener('pointerdown', (e) => {
    if (!actif || !rappels.libre()) return;
    const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
    const x = ((e.clientX - r.left) * k - ox) / z, y = ((e.clientY - r.top) * k - oy) / z;
    // un clic sur un autre joueur : sa fiche (v60)
    for (const [id, a] of autres) if (Math.abs(x - a.x) < 10 && y > a.y - 30 && y < a.y + 4) { rappels.fiche?.(id); return; }
    const m = maisonDe(monClan, monNom);
    const l = [...LIEUX, ...(mondial ? [{ ...mondial, r: 50, action: 'mondial' }] : []), { x: m.x, y: m.y + 16, r: 30, id: 'maison', nom: 'Ta maison', action: 'parcelle' }, { x: OUVRAGES[monClan].x, y: OUVRAGES[monClan].y - 10, r: 30, id: 'projet', nom: PROJETS[monClan].nom, action: 'projet' }, { x: marchand.x, y: marchand.y - 12, r: 26, id: 'marchand', nom: 'le marchand ambulant', action: 'marchand' }, ...filons.map((f) => ({ ...f, r: 14, nom: 'un filon rare', action: 'filon' }))].find((p) => Math.hypot(x - p.x, y - p.y) < p.r + 10);
    but = { x, y, lieu: l || null };
  });

  function majFilons(l) { filons = l; }
  function majMondial(m) { mondial = m; }
  function majSanctuaires(l) { sanct = Object.fromEntries((l || []).map((x) => [x.id, x])); }
  // le cercle de capture au sol : pointillés à la couleur du propriétaire, progression de l'assaillant
  function dessinerCercle(d) {
    const st = sanct[d.id] || { prop: d.terr }, r = CAPTURE.rayon, n = 56;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = R(d.x + Math.cos(a) * r), y = R(d.y + Math.sin(a) * r * 0.62);
      const pris = st.capt && i / n < st.capt.p / 100;
      ctx.fillStyle = st.conteste ? (Math.floor(temps * 4) % 2 ? '#ff4a3a' : '#fff') : pris ? COUL[st.capt.clan] : 'rgba(0,0,0,.35)';
      ctx.fillRect(x - 1, y - 1, pris || st.conteste ? 3 : 2, pris || st.conteste ? 3 : 2);
      if (!pris && !st.conteste && i % 2 === 0) { ctx.fillStyle = COUL[st.prop] || '#aaa'; ctx.globalAlpha = 0.65; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.globalAlpha = 1; }
    }
  }
  function dessinerSanctuaire(d) {
    const st = sanct[d.id] || { prop: d.terr }, col = COUL[st.prop] || '#aaa', c = hex(col);
    ombre(d.x, d.y + 8, 34);
    ctx.drawImage(SOCLE, d.x - 20, d.y - 26);
    // le cristal flottant
    const h = R(Math.sin(temps * 2.2 + d.x) * 2), cy = d.y - 34 + h, cx = d.x;
    const lueur = 0.22 + Math.sin(temps * 3 + d.y) * 0.08; ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${lueur})`; ctx.fillRect(cx - 10, cy - 12, 20, 22); ctx.fillRect(cx - 13, cy - 6, 26, 10);
    for (let y = -8; y <= 8; y++) { const w = 5 - Math.round(Math.abs(y) * 0.6); if (w < 0) continue; for (let x = -w; x <= w; x++) { const k = x < 0 ? 1.35 : x > 1 ? 0.7 : 1, v = c.map((u) => Math.min(255, u * k + (Math.abs(x) + Math.abs(y) < 3 ? 90 : 0))); ctx.fillStyle = `rgb(${v[0]},${v[1]},${v[2]})`; ctx.fillRect(cx + x, cy + y, 1, 1); } }
    // l'étendard du clan qui le tient
    const fx = d.x + 16, fy = d.y - 22; ctx.fillStyle = '#3a2a18'; ctx.fillRect(fx, fy, 1, 22);
    const ond = Math.floor(temps * 4) % 2; ctx.fillStyle = col; ctx.fillRect(fx + 1, fy + ond, 8, 5); ctx.fillRect(fx + 1, fy + 5 + ond, 6, 1);
    if (st.capt && Math.floor(temps * 6) % 3 === 0) { ctx.fillStyle = COUL[st.capt.clan]; ctx.fillRect(cx - 1 + Math.round(Math.sin(temps * 9) * 8), cy + 10, 2, 2); }
  }
  function majProjets(v) { projets = v; }
  // le familier trottine derrière son maître et garde ses distances
  function suivre(cle, p, dt) {
    let f = suiveurs.get(cle);
    if (!f || Math.hypot(f.x - p.x, f.y - p.y) > 160) { f = { x: p.x - 14, y: p.y + 2, gauche: false, bouge: false }; suiveurs.set(cle, f); }
    const dx = p.x - f.x, dy = p.y + 2 - f.y, d = Math.hypot(dx, dy);
    f.bouge = d > 18;
    if (f.bouge) { const k = Math.min(1, dt * 5) * (d - 16) / d; f.x += dx * k; f.y += dy * k; }
    if (Math.abs(dx) > 2) f.gauche = dx < 0;
    return f;
  }
  // ---------- les grands ouvrages des projets de clan : ils grandissent avec les dons ----------
  // étape 0 : fondations ; 1 à 4 : chantier (échafaudage) ; 5 : terminé (il brille)
  function dessinerOuvrage(k, o) {
    const e = projets?.clans?.[k]?.etape ?? 0, fini = e >= ETAPES - 1, x = o.x, y = o.y + 8;   // y : le pied de l'ouvrage
    const r = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(R(a), R(b), R(w), R(h)); };
    ombre(x, y, 52);
    // les fondations (toujours là)
    r('#5a5048', x - 24, y - 6, 48, 6); r('#7a7064', x - 24, y - 6, 48, 2); for (let i = -20; i < 24; i += 8) r('#463e38', x + i, y - 4, 1, 4);
    const h = [0, 14, 26, 38, 50, 62][e];   // la hauteur construite
    if (k === 'feu') {
      // la Forge géante : un grand bâtiment de pierre noire, une cheminée, la gueule du four
      if (h) {
        r('#3e302c', x - 20, y - 6 - h, 40, h); r('#56423a', x - 20, y - 6 - h, 3, h); r('#2a201e', x + 17, y - 6 - h, 3, h);
        for (let b = y - 10; b > y - 6 - h; b -= 6) for (let a = x - 18 + ((b / 6) % 2 ? 0 : 4); a < x + 16; a += 9) r('#2e2420', a, b, 1, 1);
        if (e >= 2) { const v = fini ? 0.75 + Math.sin(temps * 6) * 0.2 : 0.45; r(`rgba(255,120,30,${v})`, x - 7, y - 20, 14, 14); r('#1a1210', x - 8, y - 22, 16, 2); r('#ffcc60', x - 4, y - 12, 8, 6); }
        const ch = Math.min(h + (fini ? 18 : 6), 74); r('#4a3a34', x + 8, y - 6 - ch, 9, ch - h + 2); r('#5e4a42', x + 8, y - 6 - ch, 2, ch - h + 2);
        if (fini) { r('#2a201e', x - 22, y - 8 - h, 44, 3); for (let i = 0; i < 4; i++) { const t = (temps * 0.6 + i / 4) % 1; r(`rgba(70,60,60,${0.6 - t * 0.6})`, x + 10 + Math.sin(t * 6 + i) * 4 - t * 6, y - 8 - ch - t * 30, 4 + t * 6, 4 + t * 6); } }
        if (fini) { r('#22262a', x - 30, y - 12, 12, 4); r('#3a4046', x - 28, y - 14, 8, 2); r('#22262a', x - 26, y - 10, 4, 6); }   // l'enclume
      }
    } else if (k === 'eau') {
      // le Phare des marées : une tour blanche à rayures, la lanterne en haut
      if (h) {
        const H2 = h + (fini ? 10 : 0);
        for (let i = 0; i < H2; i++) { const w = 11 - Math.floor((i / 74) * 5), c = Math.floor(i / 10) % 2 ? '#c83a3a' : '#f2efe6'; r(c, x - w, y - 7 - i, w * 2, 1); r('rgba(0,0,0,.18)', x + w - 3, y - 7 - i, 3, 1); }
        r('#3a4a5a', x - 4, y - 16, 8, 10); r('#5a6a7a', x - 4, y - 16, 8, 2);   // la porte
        if (fini) {
          const t = y - 7 - H2; r('#2a3440', x - 9, t - 2, 18, 3); r('#f8e8a0', x - 6, t - 12, 12, 10); r('#2a3440', x - 7, t - 14, 14, 2); r('#2a3440', x - 2, t - 18, 4, 4);
          const a = temps * 1.6, lx = x, ly = t - 7, l = 70;   // le faisceau qui tourne
          ctx.fillStyle = 'rgba(255,240,170,.18)'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(a - 0.18) * l, ly + Math.sin(a - 0.18) * l * 0.5); ctx.lineTo(lx + Math.cos(a + 0.18) * l, ly + Math.sin(a + 0.18) * l * 0.5); ctx.closePath(); ctx.fill();
        }
      }
    } else {
      // l'Arbre-monde : un tronc qui s'épaissit, une couronne qui s'étend, des fruits dorés à la fin
      if (h) {
        const tw = 4 + e * 2;
        r('#5a3a22', x - tw / 2, y - 6 - h, tw, h); r('#734c2c', x - tw / 2, y - 6 - h, 2, h); r('#5a3a22', x - tw / 2 - 4, y - 8, tw + 8, 3);
        const cr = [0, 9, 14, 19, 24, 30][e], cy = y - 6 - h;
        const feuille = (dx, dy, rr, c) => { for (let j = -rr; j <= rr; j++) { const w = Math.round(Math.sqrt(rr * rr - j * j) * 1.3); r(c, x + dx - w, cy + dy + j * 0.8, w * 2, 1); } };
        feuille(0, 2, cr, '#1f5a26'); feuille(-cr * 0.5, -cr * 0.2, cr * 0.7, '#2e7a32'); feuille(cr * 0.45, -cr * 0.35, cr * 0.65, '#3a9038'); feuille(0, -cr * 0.6, cr * 0.5, '#4aa442');
        if (fini) for (let i = 0; i < 9; i++) { const a = i * 2.39, d = cr * (0.35 + alea(i) * 0.55), fx = x + Math.cos(a) * d * 1.2, fy = cy + Math.sin(a) * d * 0.7; r(`rgba(255,220,90,${0.7 + Math.sin(temps * 3 + i) * 0.3})`, fx - 1, fy - 1, 3, 3); }
        if (fini) for (let i = 0; i < 6; i++) { const a = temps * 0.7 + i, fx = x + Math.cos(a) * (cr + 8), fy = cy + Math.sin(a * 1.3) * cr * 0.6; r('rgba(230,255,150,.85)', fx, fy, 1, 1); }
      }
    }
    // l'échafaudage du chantier
    if (e >= 1 && !fini) {
      const hh = h + 6;
      for (const a of [-23, 22]) { r('#8a6a3a', x + a, y - 6 - hh, 2, hh); }
      for (let b = y - 14; b > y - 6 - hh; b -= 12) { r('#9a7a48', x - 23, b, 47, 2); r('#6a5030', x - 23, b + 2, 47, 1); }
      if (Math.floor(temps * 2) % 2) r('#e8c060', x - 2, y - 8 - hh, 4, 2);   // un drapeau de chantier qui bat
    }
  }
  function majMaParcelle(pc) { if (pc) maParcelle = pc.maison * 100 + pc.autel * 10 + pc.atelier; }
  function majAutres(liste, monId) {
    const vus = new Set();
    for (const [id, nom, clan, x, y, dir, statut, niv, classe, parcelle, app, fam, titre] of liste) {
      if (id === monId) continue; vus.add(id);
      const a = autres.get(id);
      if (!a) autres.set(id, { id, nom, clan, classe, x, y, tx: x, ty: y, dir, statut, niv, parcelle, app, fam, titre: HF.nomTitre(titre) });
      else Object.assign(a, { nom, clan, classe, tx: x, ty: y, dir, statut, niv, parcelle, app, fam, titre: HF.nomTitre(titre) });
    }
    for (const id of [...autres.keys()]) if (!vus.has(id)) { autres.delete(id); suiveurs.delete(id); }
  }

  // ---------- dessin ----------
  const R = Math.round;
  function ombre(x, y, w) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(R(x - w / 2), R(y - 1), R(w), 3); ctx.fillRect(R(x - w / 2 + 2), R(y - 2), R(w - 4), 5); }
  function dessinerPerso(p, t) {
    const f = p.marche ? 1 + (Math.floor(t * 8) % 2) : 0, row = LIGNE_DIR[p.dir] ?? 0;
    ombre(p.x, p.y, 12);
    if (p.moi) { ctx.fillStyle = 'rgba(255,230,140,.85)'; for (let a = 0; a < 16; a++) { const an = (a / 16) * Math.PI * 2 + temps; ctx.fillRect(R(p.x + Math.cos(an) * 9), R(p.y + Math.sin(an) * 4), 1, 1); } }
    const ap = p.app ? lireCode(p.app) : null;
    if (ap?.aura === 'a_ombre') dessinerAura(ctx, p.x, p.y, ap.aura, t);
    ctx.drawImage(feuillePerso(p.clan, p.classe, p.app || ''), f * 16, row * 26, 16, 26, R(p.x) - 8, R(p.y) - 24, 16, 26);
    if (ap && ap.aura !== 'a_aucune' && ap.aura !== 'a_ombre') dessinerAura(ctx, p.x, p.y, ap.aura, t);
  }
  function dessinerLiquides(t0x, t0y, t1x, t1y) {
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      const s = obs.sols[ty * NT.l + tx];
      if (s === 'eau' || s === 'mare') { const k = Math.floor(temps * 2 + H(tx, ty) * 8) % 8; if (k < 3) { ctx.fillStyle = 'rgba(220,240,255,.7)'; ctx.fillRect(tx * 16 + 3 + ((k * 5 + tx) % 9), ty * 16 + 4 + ((k * 3 + ty) % 8), 3, 1); } }
      else if (s === 'lave') { const k = (temps * 1.5 + H(tx, ty) * 6) % 6; if (k < 1.2) { const r = k < 0.6 ? 1 : 2; ctx.fillStyle = '#ffe080'; ctx.fillRect(tx * 16 + 6 + Math.floor(H(ty, tx) * 4), ty * 16 + 7 - r, r * 2, r * 2); } }
    }
  }
  function dessinerAutel(p) {
    ombre(p.x, p.y + 6, 44);
    ctx.drawImage(AUTEL, p.x - 26, p.y - 32);
    const h = R(Math.sin(temps * 2) * 2), cy = p.y - 38 + h, cx = p.x;
    const lueur = 0.25 + Math.sin(temps * 2) * 0.1; ctx.fillStyle = `rgba(255,230,140,${lueur})`; ctx.fillRect(cx - 12, cy - 12, 24, 24); ctx.fillRect(cx - 16, cy - 6, 32, 12); ctx.fillRect(cx - 6, cy - 16, 12, 32);
    const cols = ['#ff7a3a', '#3a9aff', '#5ad06a'];
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { if (x * x + y * y > 38) continue; const a = (Math.atan2(y, x) + temps) / (Math.PI * 2 / 3); ctx.fillStyle = x * x + y * y < 5 ? '#ffffff' : cols[((Math.floor(a) % 3) + 3) % 3]; ctx.fillRect(cx + x, cy + y, 1, 1); }
  }
  function dessinerPortail(p) {
    const col = hex(COUL[p.terr]);
    ombre(p.x, p.y + 10, 48);
    // le tourbillon intérieur, pixel par pixel
    for (let y = -15; y <= 22; y++) for (let x = -10; x <= 10; x++) {
      const ny = y < 4 ? (y - 4) / 19 : 0; if (x * x / 100 + ny * ny > 1) continue;
      const d = Math.hypot(x, (y - 4) * 0.55), a = Math.atan2(y - 4, x), v = Math.sin(a * 3 + d * 0.6 - temps * 4);
      const k = v > 0.5 ? 1.6 : v > -0.2 ? 1 : 0.55, c = col.map((u) => Math.min(255, u * k + (d < 3 ? 120 : 0)));
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(p.x + x, p.y - 30 + y + 13, 1, 1);
    }
    ctx.drawImage(PORTAIL[p.terr], p.x - 26, p.y - 46);
  }
  // le marchand ambulant : une roulotte bâchée, un âne, le marchand et sa lanterne
  function dessinerMarchand(m) {
    const x = R(m.x), y = R(m.y), r = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    ombre(x - 2, y, 40);
    // la roulotte
    r('#5a3a1e', -26, -10, 34, 4); r('#7a5230', -26, -24, 34, 14); r('#94683c', -26, -24, 34, 2);
    for (let i = -24; i < 8; i += 6) r('#5e3e22', i, -22, 1, 12);
    r('#c8502a', -28, -38, 38, 14); r('#e87040', -28, -38, 38, 3); for (let i = -26; i < 10; i += 8) r('#f0d8a0', i, -36, 4, 12);   // la bâche rayée
    r('#3a2412', -22, -8, 8, 8); r('#6a4426', -20, -6, 4, 4); r('#3a2412', -2, -8, 8, 8); r('#6a4426', 0, -6, 4, 4);                // les roues
    // l'âne
    r('#8a8078', 12, -16, 14, 7); r('#a89e94', 12, -16, 14, 2); r('#8a8078', 23, -22, 6, 8); r('#6a6058', 24, -26, 2, 4); r('#1a1410', 27, -20, 1, 1);
    r('#5a524a', 13, -9, 2, 8); r('#5a524a', 23, -9, 2, 8);
    // le marchand, sa lanterne qui se balance
    r('#3a5a8a', -40, -18, 8, 10); r('#e8c09a', -39, -24, 6, 6); r('#6a3a8a', -41, -27, 10, 4); r('#2a2a3a', -39, -8, 2, 8); r('#2a2a3a', -35, -8, 2, 8);
    const l = R(Math.sin(temps * 2) * 2);
    r('#2a2016', -31 + l, -22, 1, 4); r('#ffd870', -32 + l, -18, 3, 4);
    ctx.fillStyle = `rgba(255,216,112,${0.18 + Math.sin(temps * 5) * 0.06})`; ctx.fillRect(x - 38 + l, y - 24, 15, 14);
  }
  function dessinerFilon(f) {
    const h = R(Math.sin(temps * 3 + f.x) * 1.5), a = 0.35 + Math.sin(temps * 4 + f.y) * 0.2;
    ctx.fillStyle = `rgba(255,250,210,${a})`; ctx.fillRect(f.x - 10, f.y - 18, 20, 20); ctx.fillRect(f.x - 13, f.y - 13, 26, 10);
    if (Math.floor(temps * 3 + f.x) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(f.x + 6, f.y - 18, 1, 3); ctx.fillRect(f.x + 5, f.y - 17, 3, 1); }
    ombre(f.x, f.y, 12); ctx.drawImage(FILON[f.terr], f.x - 8, f.y - 16 + h);
  }

  // la maison elle-même (toit doré, drapeau, étoile)
  function embellir(m, k, pc) {
    const niv = Math.floor(pc / 100), top = m.y - 49;
    if (niv >= 3) { ctx.fillStyle = '#3a2a1e'; ctx.fillRect(m.x - 2, top - 14, 1, 16); const v = Math.floor(temps * 4) % 2; ctx.fillStyle = COUL[k]; ctx.fillRect(m.x - 1, top - 14, 8, 5); ctx.fillRect(m.x + 7, top - 13 + v, 2, 3); ctx.fillStyle = '#fff4d0'; ctx.fillRect(m.x + 2, top - 13, 2, 2); }
    if (niv >= 4) { ctx.fillStyle = '#f0c040'; ctx.fillRect(m.x - 28, top + 30, 56, 1); ctx.fillRect(m.x - 8, top + 3, 16, 1); ctx.fillStyle = '#fff0a0'; for (let x = -26; x < 26; x += 6) ctx.fillRect(m.x + x, top + 30, 2, 1); }
    if (niv >= 5) { const h = R(Math.sin(temps * 2) * 2); ctx.fillStyle = '#ffe070'; ctx.fillRect(m.x - 1, top - 26 + h, 3, 7); ctx.fillRect(m.x - 3, top - 24 + h, 7, 3); ctx.fillStyle = '#fff'; ctx.fillRect(m.x, top - 24 + h, 1, 3); }
  }
  // autour : lanternes (maison), obélisque d'essence (autel), atelier du clan
  function decorsParcelle(m, k, pc, objets) {
    const niv = Math.floor(pc / 100), au = Math.floor(pc / 10) % 10, at = pc % 10;
    if (niv >= 2) for (const dx of [-36, 36]) objets.push({ y: m.y + 18, f: () => { ombre(m.x + dx, m.y + 18, 6); ctx.drawImage(LANTERNE, m.x + dx - 4, m.y); const a = 0.25 + Math.sin(temps * 5 + dx) * 0.08; ctx.fillStyle = `rgba(255,220,120,${a})`; ctx.fillRect(m.x + dx - 5, m.y - 1, 10, 9); } });
    if (au >= 2) { const spr = OBELISQUE[Math.min(3, au - 2)], ox = m.x - 54, oy = m.y + 26; objets.push({ y: oy, f: () => { ombre(ox, oy, 12); ctx.drawImage(spr, ox - 8, oy - spr.height + 1); const h = R(Math.sin(temps * 2.4 + m.x) * 2), cy = oy - spr.height - 4 + h; ctx.fillStyle = 'rgba(255,240,170,.35)'; ctx.fillRect(ox - 5, cy - 5, 10, 10); ctx.fillStyle = '#ffe070'; ctx.fillRect(ox - 2, cy - 3, 4, 6); ctx.fillStyle = '#fff'; ctx.fillRect(ox - 1, cy - 2, 1, 2); } }); }
    if (at >= 2) { const spr = ATELIER[k], ax = m.x + 54, ay = m.y + 28; objets.push({ y: ay, f: () => { ombre(ax, ay, spr.width - 6); ctx.drawImage(spr, ax - (spr.width >> 1), ay - spr.height + 1); if (k === 'feu' && Math.floor(temps * 6) % 3 === 0) { ctx.fillStyle = '#ffd040'; ctx.fillRect(ax - 6 + Math.floor(temps * 7) % 6, ay - 18 - Math.floor(temps * 9) % 6, 1, 1); } } });
      if (at >= 4) { const bx = m.x + 54, by = m.y - 4; objets.push({ y: by, f: () => { ombre(bx, by, 8); ctx.drawImage(LANTERNE, bx - 4, by - 18); } }); } }
  }
  function dessinerMondial(b) {
    const col = hex(COUL[b.terr]), pulse = 0.5 + Math.sin(temps * 4) * 0.3;
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${pulse * 0.5})`;
    for (let a = 0; a < 60; a++) { const an = (a / 60) * Math.PI * 2 + temps * 0.8, r = 44 + Math.sin(temps * 3 + a) * 2; ctx.fillRect(R(b.x + Math.cos(an) * r), R(b.y + Math.sin(an) * r * 0.45), 2, 1); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(b.x - 24, b.y - 3, 48, 6); ctx.fillRect(b.x - 18, b.y - 5, 36, 10);
    const h = R(Math.sin(temps * 1.6) * 2);
    ctx.drawImage(BOSS_SPR[b.terr], b.x - 32, b.y - 64 + h);
    // barre de vie en pixels
    const w = 56, rem = Math.max(0, Math.round((b.pv / b.pvMax) * (w - 2)));
    ctx.fillStyle = '#140e0c'; ctx.fillRect(b.x - w / 2, b.y - 76, w, 6);
    ctx.fillStyle = '#5a1a14'; ctx.fillRect(b.x - w / 2 + 1, b.y - 75, w - 2, 4);
    ctx.fillStyle = '#e8402a'; ctx.fillRect(b.x - w / 2 + 1, b.y - 75, rem, 4); ctx.fillStyle = '#ff9a7a'; ctx.fillRect(b.x - w / 2 + 1, b.y - 75, rem, 1);
  }
  function boucle(ts) {
    requestAnimationFrame(boucle);
    const brut = (ts - dernier) / 1000 || 0, dt = Math.min(0.05, brut); dernier = ts; temps += dt; surveiller(brut);
    if (!actif || !canvas.offsetParent) return;
    // déplacement
    let dx = 0, dy = 0;
    if (rappels.libre()) {
      for (const k of touches) { dx += DIR[k][0]; dy += DIR[k][1]; }
      if (!dx && !dy && Math.hypot(joy.x, joy.y) > 0.25) { dx = joy.x; dy = joy.y; but = null; }
      if (!dx && !dy && but) { const vx = but.x - joueur.x, vy = but.y - joueur.y, d = Math.hypot(vx, vy); if (d < 6 || (but.lieu && Math.hypot(joueur.x - but.lieu.x, joueur.y - but.lieu.y) < but.lieu.r + 22)) { const l = but.lieu; but = null; if (l) rappels.agir(l); } else { dx = vx / d; dy = vy / d; } }
    }
    joueur.marche = !!(dx || dy);
    if (joueur.marche) {
      const n = Math.hypot(dx, dy), v = 150 * dt * (touches.size || but ? 1 : Math.min(1, 0.45 + n * 0.6));
      const nx = joueur.x + (dx / n) * v, ny = joueur.y + (dy / n) * v;
      const avX = !bloque(nx, joueur.y); if (avX) joueur.x = nx; const avY = !bloque(joueur.x, ny); if (avY) joueur.y = ny;
      if (but && !avX && !avY) but = null;
      joueur.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut';
    }
    rappels.position?.(joueur);
    // caméra (zoom entier, positions arrondies : pixels nets)
    const vw = canvas.width / z / 2, vh = canvas.height / z / 2;
    const bx = Math.max(vw, Math.min(MONDE.l - vw, joueur.x)), by = Math.max(vh, Math.min(MONDE.h - vh, joueur.y));
    cam.x += (bx - cam.x) * Math.min(1, dt * 8); cam.y += (by - cam.y) * Math.min(1, dt * 8);
    ox = R(canvas.width / 2 - cam.x * z); oy = R(canvas.height / 2 - cam.y * z);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // le sol : seulement la partie visible
    const x0 = Math.max(0, Math.floor(-ox / z)), y0 = Math.max(0, Math.floor(-oy / z)), x1 = Math.min(MONDE.l, Math.ceil((canvas.width - ox) / z) + 1), y1 = Math.min(MONDE.h, Math.ceil((canvas.height - oy) / z) + 1);
    ctx.drawImage(fond, x0, y0, x1 - x0, y1 - y0, ox + x0 * z, oy + y0 * z, (x1 - x0) * z, (y1 - y0) * z);
    ctx.setTransform(z, 0, 0, z, ox, oy); ctx.imageSmoothingEnabled = false;
    const t0x = Math.floor(x0 / 16), t0y = Math.floor(y0 / 16), t1x = Math.min(NT.l - 1, Math.floor(x1 / 16)), t1y = Math.min(NT.h - 1, Math.floor(y1 / 16));
    dessinerLiquides(t0x, t0y, t1x, t1y);
    // tout ce qui a de la hauteur, trié par profondeur
    for (const d of SANCTUAIRES) if (d.x > x0 - 90 && d.x < x1 + 90 && d.y > y0 - 60 && d.y < y1 + 60) dessinerCercle(d);
    const objets = [];
    for (const o of obs) if (o.tx >= t0x - 2 && o.tx <= t1x + 2 && o.ty >= t0y - 1 && o.ty <= t1y + 4) objets.push({ y: o.y + 6, f: () => { const [ax, ay] = ancreDecor[o.type]; ombre(o.x, o.y + 6, 14); ctx.drawImage(DECOR[o.type], o.x - ax, o.y + 7 - ay); } });
    // qui habite où : les joueurs en ligne (et toi) ; leurs bâtiments améliorés se voient
    const proprios = new Map();
    for (const a of autres.values()) { const m = maisonDe(a.clan, a.nom); proprios.set(m, { nom: a.nom, pc: a.parcelle || 111, clan: a.clan }); }
    proprios.set(maisonDe(monClan, monNom), { nom: monNom, pc: maParcelle, clan: monClan, moi: true });
    for (const k in MAISONS) for (const m of MAISONS[k]) if (m.x > x0 - 70 && m.x < x1 + 70 && m.y > y0 - 20 && m.y < y1 + 70) {
      const pr = proprios.get(m);
      objets.push({ y: m.y + 8, f: () => { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(m.x - 26, m.y + 8, 52, 3); ctx.drawImage(MAISON_SPR[k], m.x - 28, m.y + 8 - 57); if (pr) embellir(m, k, pr.pc); } });
      if (pr) decorsParcelle(m, k, pr.pc, objets);
    }
    for (const p of LIEUX) if (p.x > x0 - 60 && p.x < x1 + 60 && p.y > y0 - 20 && p.y < y1 + 80) objets.push({ y: p.y + 6, f: () => (p.action === 'tirage' ? dessinerAutel(p) : dessinerPortail(p)) });
    for (const [k, o] of Object.entries(OUVRAGES)) if (o.x > x0 - 90 && o.x < x1 + 90 && o.y > y0 - 30 && o.y < y1 + 120) objets.push({ y: o.y + 8, f: () => dessinerOuvrage(k, o) });
    if (marchand.x > x0 - 60 && marchand.x < x1 + 60 && marchand.y > y0 - 10 && marchand.y < y1 + 50) objets.push({ y: marchand.y, f: () => dessinerMarchand(marchand) });
    for (const f of filons) objets.push({ y: f.y, f: () => dessinerFilon(f) });
    for (const d of SANCTUAIRES) if (d.x > x0 - 60 && d.x < x1 + 60 && d.y > y0 - 20 && d.y < y1 + 60) objets.push({ y: d.y + 6, f: () => dessinerSanctuaire(d) });
    if (mondial) objets.push({ y: mondial.y, f: () => dessinerMondial(mondial) });
    ['feu', 'eau', 'plante'].forEach((k, i) => { const a = Math.PI / 2 + (i - 1) * 2.094, bxp = R(CARREFOUR[0] + Math.cos(a) * 80), byp = R(CARREFOUR[1] + Math.sin(a) * 62); objets.push({ y: byp, f: () => { ombre(bxp, byp, 8); ctx.drawImage(BANNIERE[k], bxp - 3, byp - 38); } }); });
    const gens = [...autres.values()].map((a) => { a.x += (a.tx - a.x) * Math.min(1, dt * 10); a.y += (a.ty - a.y) * Math.min(1, dt * 10); return { ...a, dir: ['bas', 'haut', 'gauche', 'droite'][a.dir] || a.dir, marche: Math.hypot(a.tx - a.x, a.ty - a.y) > 1 }; });
    gens.push({ ...joueur, clan: monClan, classe: maClasse, nom: monNom, app: monApp, fam: monFam, titre: monTitre, moi: true, id: 'moi' });
    for (const p of gens) if (p.fam && p.statut !== 'expedition') {
      const f = suivre(p.id, p, dt), saut = f.bouge ? Math.floor(temps * 8) % 2 : Math.floor(temps * 1.5) % 2;
      objets.push({ y: f.y, f: () => dessinerFamilier(ctx, p.fam, f.x, f.y, f.gauche, saut) });
    }
    for (const p of gens) objets.push({ y: p.y, f: () => {
      if (!p.moi && p.clan !== monClan && territoireDe(p.x, p.y) === monClan) { ctx.fillStyle = `rgba(255,60,40,${0.6 + Math.sin(temps * 6) * 0.3})`; for (let a = 0; a < 24; a++) { const an = (a / 24) * Math.PI * 2; ctx.fillRect(R(p.x + Math.cos(an) * 11), R(p.y + Math.sin(an) * 5), 1, 1); } }
      dessinerPerso(p, temps + (p.moi ? 0 : p.x * 0.01));
    } });
    objets.sort((a, b) => a.y - b.y);
    for (const o of objets) o.f();
    // braises et lucioles autour de la caméra
    for (let i = 0; i < 70; i++) {
      const px = x0 + ((alea(i) * (x1 - x0) + Math.sin(temps * 0.6 + i) * 12) % (x1 - x0)), py0 = alea(i + 70) * (y1 - y0), t = territoireDe(px, y0 + py0);
      if (t === 'feu') { const py = y0 + (((py0 - temps * (12 + (i % 7) * 3)) % (y1 - y0)) + (y1 - y0)) % (y1 - y0); ctx.fillStyle = `rgba(255,${120 + (i % 5) * 25},40,${0.55 + Math.sin(temps * 5 + i) * 0.35})`; ctx.fillRect(R(px), R(py), 1, 1); }
      else if (t === 'plante' && Math.sin(temps * 2 + i * 1.7) > 0.2) { ctx.fillStyle = 'rgba(230,255,150,.9)'; ctx.fillRect(R(px + Math.sin(temps + i) * 6), R(y0 + py0 + Math.cos(temps * 0.8 + i) * 6), 1, 1); }
      else if (t === 'eau' && i % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(R(px), R(y0 + py0), 1, 1); }
    }
    // l'ombre des nuages qui passent lentement (v61) : de la profondeur, sans gêner la lecture
    if (!leger) {
      ctx.fillStyle = 'rgba(10,14,30,.075)';
      for (let i = 0; i < 7; i++) {
        const v = 6 + (i % 3) * 3, cx = ((alea(i + 300) * MONDE.l + temps * v) % (MONDE.l + 400)) - 200, cy = alea(i + 400) * MONDE.h + Math.sin(temps * 0.05 + i) * 30;
        if (cx < x0 - 220 || cx > x1 + 220 || cy < y0 - 160 || cy > y1 + 160) continue;
        ctx.beginPath();   // un seul tracé par nuage : les morceaux qui se chevauchent ne foncent pas
        for (let k = 0; k < 5; k++) { const ex2 = cx + (alea(i * 9 + k) - 0.5) * 220, ey2 = cy + (alea(i * 7 + k + 50) - 0.5) * 90, rx = 70 + alea(i + k) * 60; ctx.moveTo(ex2 + rx, ey2); ctx.ellipse(ex2, ey2, rx, 40 + alea(i * 3 + k) * 26, 0, 0, Math.PI * 2); }
        ctx.fill('nonzero');
      }
    }
    // textes, à l'échelle de l'écran
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const s = dpr(), ex = (x) => ox + x * z, ey = (y) => oy + y * z;
    // les étiquettes ne se chevauchent plus (v61) : on les range par importance, chacune cherche une
    // place libre un peu plus haut, et les moins importantes disparaissent s'il n'y a pas de place
    const etiq = [];
    const etiquette = (txt, x, y, coul = '#f0e6d0', barre = null, gras = false, prio = 2, sous = null) => etiq.push({ txt, x, y, coul, barre, gras, prio, sous });
    function poserEtiquettes() {
      const poses = [], h = 15 * s, chevauche = (a) => poses.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const e of etiq.sort((a, b) => b.prio - a.prio)) {
        ctx.font = `${e.gras ? 900 : 700} ${R(11.5 * s)}px ${POLICE}`;
        const w = ctx.measureText(e.txt).width + 10 * s, hh = e.sous ? h * 2 : h;
        let y = e.y, r = null;
        for (let k = 0; k < 4; k++) { const c = { x0: e.x - w / 2, x1: e.x + w / 2, y0: y - hh + h / 2, y1: y + h / 2 }; if (!chevauche(c)) { r = c; break; } y -= h + 2 * s; }
        if (!r) { if (e.prio < 3) continue; r = { x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - hh + h / 2, y1: e.y + h / 2 }; y = e.y; }
        poses.push(r);
        if (y !== e.y) { ctx.fillStyle = 'rgba(240,230,208,.35)'; ctx.fillRect(R(e.x), R(y + h / 2), R(s), R(e.y - y - h / 2)); }   // un fil vers l'objet
        ctx.fillStyle = 'rgba(10,8,14,.8)'; ctx.fillRect(R(e.x - w / 2), R(y - h / 2), R(w), R(h));
        if (e.barre) { ctx.fillStyle = e.barre; ctx.fillRect(R(e.x - w / 2), R(y - h / 2), R(2 * s), R(h)); }
        ctx.fillStyle = e.coul; ctx.fillText(e.txt, e.x, y + s);
        if (e.sous) { ctx.font = `italic 700 ${R(10.5 * s)}px ${POLICE}`; ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillText(e.sous, e.x + s, y - h + 2 * s); ctx.fillStyle = '#ffd870'; ctx.fillText(e.sous, e.x, y - h + s); }
      }
    }
    for (const p of LIEUX) if (p.x > x0 - 60 && p.x < x1 + 60 && p.y > y0 && p.y < y1 + 40) etiquette(p.nom, ex(p.x), ey(p.y + 18), '#ffe8b0');
    for (const d of SANCTUAIRES) if (d.x > x0 - 60 && d.x < x1 + 60 && d.y > y0 && d.y < y1 + 60) {
      const st = sanct[d.id] || { prop: d.terr };
      etiquette(`🏳 ${d.nom}`, ex(d.x), ey(d.y + 16), '#ffe8b0', COUL[st.prop]);
      if (st.conteste) etiquette('⚔ Contesté !', ex(d.x), ey(d.y + 30), '#ffb0a0', '#e8402a', true, 3);
      else if (st.capt) etiquette(`Capture ${st.capt.p} %`, ex(d.x), ey(d.y + 30), '#fff4c8', COUL[st.capt.clan], true);
    }
    for (const [k, [vx, vy]] of Object.entries(CENTRES)) if (vx > x0 - 100 && vx < x1 + 100 && vy > y0 - 40 && vy < y1 + 40) etiquette(`Village · ${NOMS_TERR[k]}`, ex(vx), ey(vy + 64), '#f8ecd0', COUL[k], true, 0);
    if (marchand.x > x0 - 60 && marchand.x < x1 + 60 && marchand.y > y0 && marchand.y < y1 + 50) {
      const min = Math.max(1, Math.ceil((marchand.part - Date.now()) / 60000));
      etiquette(`🛒 Marchand ambulant · encore ${min} min`, ex(marchand.x - 10), ey(marchand.y - 48), '#ffe0a0', '#c8502a', false);
    }
    for (const [k, o] of Object.entries(OUVRAGES)) if (o.x > x0 - 90 && o.x < x1 + 90 && o.y > y0 && o.y < y1 + 120 && projets?.clans?.[k]) {
      const pr = projets.clans[k], fini = pr.pts >= pr.objectif, pc = Math.min(100, Math.floor((pr.pts / pr.objectif) * 100));
      etiquette(`${PROJETS[k].ico} ${PROJETS[k].nom} · ${fini ? 'terminé ✓' : `${pc} %`}`, ex(o.x), ey(o.y - 84), fini ? '#ffe070' : '#f0e6d0', COUL[k], fini);
    }
    for (const a of autres.values()) { const m = maisonDe(a.clan, a.nom); if (m.x > x0 - 40 && m.x < x1 + 40 && m.y > y0 && m.y < y1 + 60 && Math.hypot(joueur.x - m.x, joueur.y - m.y) < 160) etiquette(`Maison de ${a.nom}`, ex(m.x), ey(m.y - 58), '#f0e6d0', COUL[a.clan], false, 0); }
    if (mondial) etiquette(`☠ ${mondial.nom} · ${mondial.pv} / ${mondial.pvMax}`, ex(mondial.x), ey(mondial.y - 84), '#ffb0a0', '#e8402a', true, 4);
    const ma = maisonDe(monClan, monNom); etiquette('★ Ta maison', ex(ma.x), ey(ma.y - (maParcelle >= 300 ? 84 : 58)) + Math.sin(temps * 3) * 3 * s, '#ffd870', null, true, 3);
    for (const p of gens) {
      const txt = `${p.nom}${p.niv ? ` · ${p.niv}` : ''}${p.statut === 'expedition' ? ' ⚔' : p.statut === 'duel' ? ' ⚔⚔' : ''}`;
      etiquette(txt, ex(p.x), ey(p.y - 30), p.moi ? '#fff4c8' : '#f0e6d0', COUL[p.clan], p.moi, p.moi ? 6 : 5, p.titre ? `« ${p.titre} »` : null);
    }
    poserEtiquettes();
    ctx.textBaseline = 'alphabetic';
    // (le vignettage est une couche CSS fixe : #ecranMonde::after — le recalculer à chaque image coûtait cher sur téléphone)
    // l'action possible
    const l = rappels.libre() && lieuProche();
    if (l) {
      const E = tactile ? '✋ ' : 'E : ';
      const txt = l.action === 'mondial' ? `E : affronter ${l.nom} — boss mondial` : l.action === 'defier' ? `E : défier ${l.nom} en duel — il est sur ton territoire` : l.action === 'filon' ? 'E : ramasser le filon rare' : l.action === 'projet' ? `E : contribuer — ${l.nom} (projet du clan)` : l.action === 'marchand' ? 'E : voir les échanges du marchand ambulant' : `E : ${l.action === 'tirage' ? 'faire des tirages' : l.action === 'expedition' ? 'partir en expédition' : 'entrer dans ta maison'} — ${l.nom}`;
      const txt2 = txt.replace(/^E : /, E);
      ctx.font = `800 ${R(14 * s)}px ${POLICE}`; ctx.textAlign = 'center';
      const w = ctx.measureText(txt2).width + 30 * s, h = 34 * s, y = canvas.height * (tactile ? 0.66 : 0.78);
      ctx.fillStyle = 'rgba(8,6,12,.9)'; ctx.fillRect(R(canvas.width / 2 - w / 2), R(y - h / 2), R(w), R(h));
      ctx.fillStyle = '#e8c060'; const b = R(2 * s); ctx.fillRect(R(canvas.width / 2 - w / 2), R(y - h / 2), R(w), b); ctx.fillRect(R(canvas.width / 2 - w / 2), R(y + h / 2) - b, R(w), b); ctx.fillRect(R(canvas.width / 2 - w / 2), R(y - h / 2), b, R(h)); ctx.fillRect(R(canvas.width / 2 + w / 2) - b, R(y - h / 2), b, R(h));
      ctx.fillStyle = '#ffe8a8'; ctx.textBaseline = 'middle'; ctx.fillText(txt2, canvas.width / 2, y + s); ctx.textBaseline = 'alphabetic';
    }
    miniCarte(gens);
    if (cible) fleche(ex, ey, s);
  }
  // la flèche du guide : au-dessus du lieu s'il est à l'écran, sinon au bord de l'écran, tournée vers lui
  function fleche(ex, ey, s) {
    const sx = ex(cible.x), sy = ey(cible.y - 30), m = 70 * s, W = canvas.width, H = canvas.height;
    const dedans = sx > m && sx < W - m && sy > m && sy < H - m, coul = '#ffd860';
    ctx.save();
    if (dedans) {
      const b = Math.sin(temps * 5) * 6 * s;
      ctx.translate(sx, sy - 30 * s + b); ctx.rotate(Math.PI / 2);
    } else {
      const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
      const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      let px = cx + Math.cos(a) * k, py = cy + Math.sin(a) * k;
      // pas sur la mini-carte : on la contourne par le haut (ou par la gauche si elle est en haut)
      const mr = miniRect, marge = 34 * s;
      if (mr && px > mr.x - marge && px < mr.x + mr.w + marge && py > mr.y - marge && py < mr.y + mr.h + marge) { if (mr.y > H / 2) py = mr.y - marge; else px = mr.x - marge; }
      ctx.translate(px, py); ctx.rotate(a);
      const d = Math.round(Math.hypot(cible.x - joueur.x, cible.y - joueur.y) / 16);
      ctx.save(); ctx.rotate(-a); ctx.font = `800 ${Math.round(12 * s)}px ${POLICE}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(8,6,12,.85)';
      // l'étiquette reste dans l'écran
      const t = `${cible.nom || ''} · ${d} pas`, w = ctx.measureText(t).width + 12 * s, dx = Math.max(8 * s - (px - w / 2), Math.min(0, W - 8 * s - (px + w / 2)));
      const dy = py + 42 * s > H || (mr && px + w / 2 > mr.x && py < mr.y && py + 42 * s > mr.y) ? -60 * s : 0;
      ctx.fillRect(dx - w / 2, 22 * s + dy, w, 18 * s); ctx.fillStyle = coul; ctx.fillText(t, dx, 35 * s + dy); ctx.restore();
    }
    const p = 1 + Math.sin(temps * 6) * 0.08;
    ctx.scale(s * p, s * p);
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, -14); ctx.lineTo(-3, 0); ctx.lineTo(-8, 14); ctx.closePath();
    ctx.fillStyle = coul; ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    ctx.restore();
  }
  function miniCarte(gens) {
    const s = dpr(), petit = innerWidth < 760 || innerHeight < 500, w = (petit ? Math.min(130, innerWidth * 0.34) : 200) * s, h = w * (NT.h / NT.l), x0 = canvas.width - w - 12 * s, y0 = petit ? (innerHeight < 500 ? 52 : tactile ? 104 : 96) * s : canvas.height - h - 40 * s, kx = w / MONDE.l, ky = h / MONDE.h;
    miniRect = { x: x0, y: y0, w, h };
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a140e'; ctx.fillRect(x0 - 4 * s, y0 - 4 * s, w + 8 * s, h + 8 * s);
    ctx.drawImage(mini, x0, y0, w, h);
    ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2 * s; ctx.strokeRect(x0 - 3 * s, y0 - 3 * s, w + 6 * s, h + 6 * s);
    // le champ de vision
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = s; ctx.strokeRect(x0 + (-ox / z) * kx, y0 + (-oy / z) * ky, (canvas.width / z) * kx, (canvas.height / z) * ky);
    for (const p of LIEUX) { ctx.fillStyle = p.action === 'tirage' ? '#ffe070' : COUL[p.terr]; ctx.fillRect(R(x0 + p.x * kx - 3 * s), R(y0 + p.y * ky - 3 * s), R(6 * s), R(6 * s)); }
    if (mondial && Math.floor(temps * 3) % 2) { ctx.fillStyle = '#ff3a2a'; ctx.fillRect(R(x0 + mondial.x * kx - 5 * s), R(y0 + mondial.y * ky - 5 * s), R(10 * s), R(10 * s)); ctx.fillStyle = '#fff'; ctx.fillRect(R(x0 + mondial.x * kx - 2 * s), R(y0 + mondial.y * ky - 2 * s), R(4 * s), R(4 * s)); }
    for (const d of SANCTUAIRES) { const st = sanct[d.id] || { prop: d.terr }, mx = R(x0 + d.x * kx), my = R(y0 + d.y * ky), t = R(3 * s); ctx.fillStyle = '#000'; ctx.fillRect(mx - t - s, my - s, 2 * t + 2 * s, 2 * s + s); ctx.fillRect(mx - s, my - t - s, 3 * s, 2 * t + 2 * s); ctx.fillStyle = st.conteste || st.capt ? (Math.floor(temps * 4) % 2 ? '#fff' : COUL[st.prop]) : COUL[st.prop]; ctx.fillRect(mx - t, my, 2 * t + s, s); ctx.fillRect(mx, my - t, s, 2 * t + s); ctx.fillRect(mx - s, my - s, 3 * s, 3 * s); }
    { ctx.fillStyle = Math.floor(temps * 2) % 2 ? '#ff9a50' : '#ffe0a0'; ctx.fillRect(R(x0 + marchand.x * kx - 2 * s), R(y0 + marchand.y * ky - 2 * s), R(4 * s), R(4 * s)); }
    for (const f of filons) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(R(x0 + f.x * kx - 1.5 * s), R(y0 + f.y * ky - 1.5 * s), R(3 * s), R(3 * s)); }
    if (cible && Math.floor(temps * 3) % 2) { ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2 * s; ctx.strokeRect(R(x0 + cible.x * kx - 5 * s), R(y0 + cible.y * ky - 5 * s), R(10 * s), R(10 * s)); }
    for (const p of gens) { ctx.fillStyle = p.moi ? '#ffffff' : COUL[p.clan]; const r = (p.moi ? 4 : 3) * s; ctx.fillRect(R(x0 + p.x * kx - r / 2), R(y0 + p.y * ky - r / 2), R(r), R(r)); }
  }
  requestAnimationFrame(boucle);
  return { get leger() { return leger; }, majApparence: (c) => { monApp = c || ''; }, preparer, demarrer, majAutres, majFilons, majMondial, majMaParcelle, majSanctuaires, majProjets, majFamilier: (id) => { monFam = id || ''; }, majTitre: (t) => { monTitre = t || ''; }, get marchand() { return marchand; }, get joueur() { return joueur; }, tactile, agir, action: () => (actif && rappels.libre() ? lieuProche() : null), pousser: (x, y) => { joy = { x, y }; }, guider: (c) => { cible = c; }, maison: () => maisonDe(monClan, monNom), territoire: () => territoireDe(joueur.x, joueur.y), arreter: () => { touches.clear(); but = null; } };
}
