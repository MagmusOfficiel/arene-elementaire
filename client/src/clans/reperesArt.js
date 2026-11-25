// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le dessin des lieux à visiter (v108)
//  Chaque monument est peint une fois (pixel par pixel, avec contour,
//  comme le décor), puis on ajoute à chaque image ce qui bouge : flamme,
//  faisceau du phare, lueurs, étoiles. Le pied du monument est en (x, y).
// =====================================================================
function sprite(w, h, fn, contour = '#160e0c') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), P = (col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  const D = (cx, cy, r, col, ky = 1) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + (y / ky) * (y / ky) <= r * r + r * 0.6) P(col, cx + x, cy + y); };
  fn(P, D, g);
  if (contour) {
    const d = g.getImageData(0, 0, w, h), a = d.data, op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) add.push([x, y]);
    g.fillStyle = contour; for (const [x, y] of add) g.fillRect(x, y, 1, 1);
  }
  return c;
}
// la pierre de chaque zone : [ombre, base, clair, très clair] et la couleur d'accent
const PIERRE = {
  feu: ['#2a2224', '#4a3e3c', '#6e605a', '#8e7e74', '#ff7a2a'],
  eau: ['#5a7088', '#8aa4bc', '#b8cee0', '#e4f0fa', '#4ac0ff'],
  plante: ['#3a4a32', '#5e6e52', '#7e9070', '#a2b490', '#7ad86a'],
  brisees: ['#1a1424', '#2e2440', '#463a5e', '#62567e', '#b080ff'],
  cimes: ['#5a6e88', '#8aa0bc', '#b8cce0', '#eaf4ff', '#8ad8ff'],
  ambre: ['#7a4a22', '#a8703a', '#cc9a5a', '#ecc488', '#ffd040'],
  ciel: ['#6a6890', '#a8a4cc', '#d0cce8', '#f4f2ff', '#ffe890'],
};
// un socle en pierre, en marches
function socle(P, w, h, pal, cx, bas) {
  P(pal[0], cx - w / 2 - 3, bas - 5, w + 6, 5); P(pal[1], cx - w / 2 - 3, bas - 6, w + 6, 2);
  P(pal[1], cx - w / 2, bas - 5 - h, w, h); P(pal[2], cx - w / 2, bas - 5 - h, w, 2); P(pal[0], cx + w / 2 - 2, bas - 5 - h, 2, h);
  P(pal[3], cx - w / 2 + 2, bas - 3 - h, w - 6, 1);
}
// une statue debout sur un socle ; attribut : marteau, trident, bâton, couronne, ailes
function statue(pal, attribut) {
  return sprite(48, 74, (P, D) => {
    const cx = 24, bas = 73;
    socle(P, 26, 12, pal, cx, bas);
    const pied = bas - 17;
    // jambes et robe
    P(pal[1], cx - 7, pied - 20, 14, 20); P(pal[2], cx - 7, pied - 20, 5, 20); P(pal[0], cx + 4, pied - 20, 3, 20); P(pal[0], cx - 1, pied - 12, 1, 12);
    // buste, bras, tête
    P(pal[1], cx - 8, pied - 36, 16, 17); P(pal[2], cx - 8, pied - 36, 6, 17); P(pal[0], cx + 5, pied - 36, 3, 17);
    P(pal[1], cx - 12, pied - 34, 4, 14); P(pal[2], cx - 12, pied - 34, 2, 14);
    P(pal[1], cx + 8, pied - 34, 4, 10);
    D(cx, pied - 42, 5, pal[1]); D(cx - 1, pied - 43, 3, pal[2]); P(pal[3], cx - 3, pied - 45, 2, 2);
    if (attribut === 'marteau') { P(pal[0], cx + 10, pied - 46, 2, 24); P(pal[1], cx + 6, pied - 50, 10, 6); P(pal[2], cx + 6, pied - 50, 10, 2); }
    if (attribut === 'trident') { P(pal[0], cx + 10, pied - 56, 2, 36); for (const dx of [-3, 0, 3]) P(pal[2], cx + 10 + dx, pied - 60, 2, 6); P(pal[2], cx + 7, pied - 55, 8, 2); }
    if (attribut === 'baton') { P('#5a3a20', cx + 10, pied - 54, 2, 34); D(cx + 11, pied - 56, 3, pal[4]); P(pal[3], cx + 10, pied - 57, 1, 1); }
    if (attribut === 'couronne') { for (const dx of [-4, -1, 2]) P(pal[3], cx + dx, pied - 50, 2, 3); P(pal[2], cx - 5, pied - 48, 10, 2); P(pal[0], cx + 10, pied - 30, 2, 12); }
    if (attribut === 'ailes') for (const s of [-1, 1]) for (let k = 0; k < 10; k++) P(k % 3 ? pal[2] : pal[3], cx + s * (9 + k) - (s < 0 ? 2 : 0), pied - 40 - k + (k > 6 ? (k - 6) * 2 : 0), 2, 14 - k);
    // usure : mousse ou fissures
    for (let k = 0; k < 6; k++) P(pal[0], cx - 6 + ((k * 7) % 12), pied - 8 - ((k * 11) % 30), 1, 2);
  });
}
const ART = {};
function art(r) {
  const cle = `${r.type}.${r.teinte}`; if (ART[cle]) return ART[cle];
  const pal = PIERRE[r.teinte];
  let s;
  switch (r.type) {
    case 'statue': s = statue(pal, { feu: 'marteau', eau: 'trident', plante: 'baton', cimes: 'couronne', ciel: 'ailes' }[r.teinte] || 'baton'); break;
    case 'cratere': s = sprite(72, 34, (P, D) => {
      D(36, 20, 32, '#2a1e1c', 0.36); D(36, 19, 28, '#3a2c28', 0.34); D(36, 20, 20, '#1a1212', 0.3); D(36, 21, 13, '#a8301a', 0.3); D(36, 21, 9, '#ff7a20', 0.3); D(36, 21, 4, '#ffd060', 0.4);
      for (const [x, y, h] of [[8, 16, 12], [62, 14, 14], [18, 8, 9], [54, 7, 10], [30, 4, 7]]) { P('#1a1420', x, y - h + 8, 4, h); P('#4a3a6a', x, y - h + 8, 1, h); P('#1a1420', x + 1, y - h + 6, 2, 2); }
    }); break;
    case 'brasero': s = sprite(40, 40, (P) => {
      socle(P, 22, 8, pal, 20, 39);
      P(pal[1], 8, 18, 24, 8); P(pal[2], 8, 18, 24, 2); P(pal[0], 8, 24, 24, 2); P('#1a1010', 10, 16, 20, 3);
      for (const x of [9, 28]) { P(pal[1], x, 26, 3, 6); }
    }); break;
    case 'epave': s = sprite(84, 58, (P, D) => {
      // la coque couchée, éventrée
      for (let x = 0; x < 64; x++) { const h = 14 + Math.round(Math.sin((x / 64) * Math.PI) * 10); P(x % 9 === 0 ? '#3a2412' : '#6a4422', 10 + x, 56 - h, 1, h); P('#8a5a2e', 10 + x, 56 - h, 1, 2); }
      for (let k = 0; k < 4; k++) P('#2a1a0e', 22 + k * 12, 40, 6, 12);
      P('#4a2e16', 30, 6, 3, 40); P('#4a2e16', 22, 12, 22, 2);   // le mât penché
      P('#d8ccb0', 33, 14, 12, 14); P('#b8ac90', 33, 14, 2, 14); P('#a03a2a', 36, 18, 6, 2);   // la voile déchirée
      P('#6a6058', 66, 46, 8, 3); D(74, 50, 4, '#8a8478');   // l'ancre
    }); break;
    case 'phare': s = sprite(34, 96, (P) => {
      socle(P, 26, 6, pal, 17, 95);
      for (let y = 0; y < 62; y++) { const w = 14 - Math.floor(y / 12); P(Math.floor(y / 10) % 2 ? '#e8e4dc' : '#c83a2a', 17 - w / 2 | 0, 84 - y, w, 1); P('rgba(0,0,0,.25)', (17 + w / 2 | 0) - 3, 84 - y, 3, 1); }
      P('#2a2a3a', 8, 18, 18, 3); P('#ffe890', 10, 10, 14, 8); P('#fff8d0', 12, 11, 4, 6); P('#3a3a4a', 9, 6, 16, 4); P('#3a3a4a', 15, 2, 4, 4);
      P('#2a2a3a', 15, 60, 4, 8);
    }); break;
    case 'arbre_mere': s = sprite(96, 110, (P, D) => {
      for (const [dx, w] of [[-24, 8], [18, 9], [-10, 6], [8, 7]]) { P('#4a2e18', 48 + dx, 96, w, 12); P('#6a4426', 48 + dx, 96, 2, 12); }
      P('#5a3a20', 38, 50, 20, 56); P('#7a5230', 40, 50, 6, 56); P('#3a2412', 52, 50, 4, 56); P('#2a1a0e', 45, 82, 6, 10);
      D(48, 40, 38, '#1e5a26', 0.8); D(36, 34, 24, '#2a7030', 0.85); D(62, 32, 22, '#2e7a34', 0.85); D(46, 24, 20, '#3a8e3a', 0.85); D(40, 20, 10, '#58a844'); D(60, 22, 7, '#58a844');
      for (let k = 0; k < 14; k++) P('#e8f8a0', 18 + ((k * 23) % 60), 10 + ((k * 17) % 50), 1, 1);
    }); break;
    case 'cercle': s = sprite(90, 56, (P) => {
      const pierre = (x, y, h) => { P(pal[1], x, y - h, 7, h); P(pal[2], x, y - h, 2, h); P(pal[0], x + 5, y - h, 2, h); P(pal[3], x + 1, y - h, 4, 1); P('#5aa848', x, y - 4, 7, 2); };
      for (let k = 0; k < 7; k++) { const a = Math.PI + (k / 6) * Math.PI; pierre(42 + Math.round(Math.cos(a) * 36), 34 + Math.round(Math.sin(a) * 12), 16 + (k % 2) * 6); }
      P(pal[1], 34, 38, 22, 6); P(pal[2], 34, 38, 22, 2); P(pal[0], 34, 44, 22, 2);   // la table de pierre
      for (const k of [0, 2, 4]) { const a = (k / 6) * Math.PI; pierre(42 + Math.round(Math.cos(a) * 36), 34 + Math.round(Math.sin(a) * 12) + 14, 18); }
    }); break;
    case 'monolithe': s = sprite(40, 92, (P) => {
      socle(P, 30, 6, pal, 20, 91);
      for (let y = 0; y < 76; y++) { const w = 20 - Math.floor(y / 18) * 2; P(pal[1], 20 - w / 2, 80 - y, w, 1); P(pal[2], 20 - w / 2, 80 - y, 3, 1); P(pal[0], 20 + w / 2 - 3, 80 - y, 3, 1); }
      let x = 19; for (let y = 10; y < 76; y += 2) { x += ((y * 7) % 5) - 2; x = Math.max(14, Math.min(24, x)); P('#0a0610', x, y, 2, 2); }
    }); break;
    case 'ruines': s = sprite(100, 70, (P) => {
      const colonne = (x, h, cassee) => { P(pal[1], x, 66 - h, 10, h); P(pal[2], x + 1, 66 - h, 3, h); P(pal[0], x + 8, 66 - h, 2, h); P(pal[2], x - 2, 66 - h - 3, 14, 3); if (cassee) { P(pal[0], x + 2, 66 - h - 5, 4, 2); } P(pal[2], x - 2, 62, 14, 4); };
      colonne(8, 50, false); colonne(36, 34, true); colonne(62, 54, false); colonne(84, 20, true);
      P(pal[1], 4, 10, 72, 6); P(pal[2], 4, 10, 72, 2); P(pal[0], 4, 15, 72, 1);   // le linteau
      for (let k = 0; k < 6; k++) P(pal[1], 20 + k * 11, 62 + (k % 2), 6, 4);
      P(pal[4], 30, 12, 2, 2); P(pal[4], 50, 12, 2, 2);
    }); break;
    case 'cairn': s = sprite(54, 64, (P, D) => {
      for (const [x, y, r] of [[16, 56, 9], [38, 56, 9], [27, 54, 10], [22, 42, 8], [34, 42, 8], [28, 30, 7], [28, 19, 5]]) { D(x, y, r, pal[1], 0.75); D(x - 2, y - 2, Math.max(2, r - 4), pal[2], 0.75); P(pal[3], x - 3, y - r * 0.6, 3, 1); }
      P('#4a3a2a', 28, 2, 2, 16); P('#c83a2a', 30, 3, 10, 5); P('#e8e0d0', 30, 8, 8, 3);
      for (let k = 0; k < 5; k++) P('#ffffff', 10 + k * 8, 60 - (k % 2) * 30, 2, 1);
    }); break;
    case 'sphinx': s = sprite(96, 60, (P, D) => {
      socle(P, 84, 6, pal, 48, 59);
      P(pal[1], 26, 30, 56, 18); P(pal[2], 26, 30, 56, 3); P(pal[0], 26, 44, 56, 4);   // le corps couché
      P(pal[1], 6, 42, 26, 6); P(pal[2], 6, 42, 26, 2);   // les pattes avant
      P(pal[1], 14, 14, 20, 30); P(pal[2], 14, 14, 6, 30);   // la poitrine
      P('#3a5aa8', 10, 10, 28, 14); P('#e8c040', 10, 12, 28, 2); P('#e8c040', 10, 18, 28, 2);   // la coiffe
      P(pal[2], 17, 10, 14, 16); P(pal[0], 21, 16, 2, 2); P(pal[0], 27, 16, 2, 2); P(pal[0], 23, 22, 4, 1);   // le visage
      P(pal[1], 80, 36, 10, 4); for (let k = 0; k < 8; k++) P(pal[3], 30 + k * 6, 26 + (k % 2) * 2, 4, 1);
      for (let k = 0; k < 10; k++) P('#ecc488', 30 + k * 6, 46, 5, 3);   // le sable qui l'ensevelit
    }); break;
    case 'obelisque': s = sprite(36, 104, (P) => {
      socle(P, 28, 8, pal, 18, 103);
      for (let y = 0; y < 80; y++) { const w = 16 - Math.floor(y / 20) * 2; P(pal[1], 18 - w / 2, 90 - y, w, 1); P(pal[2], 18 - w / 2, 90 - y, 3, 1); P(pal[0], 18 + w / 2 - 2, 90 - y, 2, 1); }
      for (let y = 0; y < 8; y++) P(pal[2], 18 - (8 - y) / 2, 4 + y, 8 - y, 1);
      for (let k = 0; k < 7; k++) { P(pal[0], 15, 24 + k * 9, 2, 3); P(pal[0], 19, 26 + k * 9, 3, 2); }
    }); break;
    case 'cadran': s = sprite(80, 46, (P, D) => {
      D(40, 30, 34, pal[0], 0.36); D(40, 29, 32, pal[1], 0.34); D(40, 28, 28, pal[2], 0.32);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; P(pal[4], 40 + Math.round(Math.cos(a) * 24), 28 + Math.round(Math.sin(a) * 8), 2, 1); }
      P(pal[0], 39, 6, 3, 22); P(pal[3], 39, 6, 1, 22); P(pal[1], 36, 4, 9, 3);
    }); break;
    default: s = sprite(20, 20, (P) => P(pal[1], 4, 4, 12, 12));
  }
  return (ART[cle] = s);
}
// le monument, plus ce qui bouge (t : le temps en secondes)
export function dessinerRepere(ctx, r, t) {
  const s = art(r), x = Math.round(r.x - s.width / 2), y = Math.round(r.y + 8 - s.height);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(Math.round(r.x - s.width * 0.42), r.y + 6, Math.round(s.width * 0.84), 4);
  ctx.drawImage(s, x, y);
  const lueur = (cx, cy, rr, col, a) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rr)); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); };
  switch (r.type) {
    case 'brasero': {   // la flamme éternelle
      const fx = r.x, fy = r.y - 16;
      lueur(fx, fy - 8, 40, 'rgba(255,140,40,A)', 0.35 + Math.sin(t * 7) * 0.08);
      for (let k = 0; k < 9; k++) { const h = 10 + ((k * 7) % 9) + Math.sin(t * 9 + k * 1.7) * 4, xx = fx - 9 + k * 2; ctx.fillStyle = k % 3 ? '#ff7a20' : '#ffd040'; ctx.fillRect(Math.round(xx), Math.round(fy - h), 2, Math.round(h)); }
      ctx.fillStyle = '#fff6c0'; ctx.fillRect(fx - 2, fy - 7, 4, 5);
      break;
    }
    case 'cratere': lueur(r.x, r.y - 6, 30, 'rgba(255,110,30,A)', 0.25 + Math.sin(t * 2) * 0.1); if (Math.floor(t * 3) % 4 === 0) { ctx.fillStyle = '#ffb040'; ctx.fillRect(Math.round(r.x - 4 + Math.sin(t * 11) * 6), Math.round(r.y - 10 - ((t * 20) % 14)), 2, 2); } break;
    case 'phare': {   // le faisceau qui tourne
      const lx = r.x, ly = y + 14, a = t * 1.3, c = Math.cos(a);
      lueur(lx, ly, 26, 'rgba(255,240,170,A)', 0.55);
      ctx.fillStyle = `rgba(255,240,170,${0.12 + Math.abs(c) * 0.1})`; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + c * 140, ly - 18); ctx.lineTo(lx + c * 140, ly + 18); ctx.closePath(); ctx.fill();
      break;
    }
    case 'arbre_mere': for (let k = 0; k < 8; k++) { const px = r.x - 36 + ((k * 29) % 72) + Math.sin(t * 0.9 + k) * 6, py = r.y - 60 + ((k * 13) % 50) + Math.cos(t * 0.7 + k * 2) * 6; ctx.fillStyle = `rgba(230,255,150,${0.5 + Math.sin(t * 3 + k) * 0.4})`; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); } break;
    case 'monolithe': lueur(r.x, r.y - 44, 34, 'rgba(176,128,255,A)', 0.2 + Math.sin(t * 1.7) * 0.1); break;
    case 'obelisque': lueur(r.x, y + 6, 22, 'rgba(255,210,80,A)', 0.45 + Math.sin(t * 2) * 0.15); ctx.fillStyle = '#fff2a0'; ctx.fillRect(r.x - 2, y + 3, 4, 4); break;
    case 'cadran': for (let k = 0; k < 5; k++) { const a = t * 0.6 + (k / 5) * Math.PI * 2; ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(r.x + Math.cos(a) * 22), Math.round(r.y - 30 + Math.sin(a) * 6 - 10), 2, 2); } lueur(r.x, r.y - 40, 16, 'rgba(255,240,150,A)', 0.4); break;
    case 'ruines': case 'cercle': lueur(r.x, r.y - 12, 28, `rgba(${r.type === 'cercle' ? '140,240,120' : '176,128,255'},A)`, 0.12 + Math.sin(t * 1.5) * 0.06); break;
    case 'statue': if (r.teinte === 'ciel' || r.teinte === 'cimes') lueur(r.x, r.y - 50, 24, r.teinte === 'ciel' ? 'rgba(255,240,170,A)' : 'rgba(140,220,255,A)', 0.2 + Math.sin(t * 2) * 0.08); break;
    default: break;
  }
}
// un objet de quête posé par terre : il brille et flotte un peu
export function dessinerObjetQuete(ctx, o, t) {
  const y = o.y - 6 + Math.sin(t * 3 + o.x) * 2;
  const g = ctx.createRadialGradient(o.x, y, 0, o.x, y, 16); g.addColorStop(0, 'rgba(255,230,120,.55)'); g.addColorStop(1, 'rgba(255,230,120,0)');
  ctx.fillStyle = g; ctx.fillRect(o.x - 16, y - 16, 32, 32);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(o.x - 5, o.y + 2, 10, 2);
  ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.ico || '✨', o.x, y);
  if (Math.floor(t * 4 + o.x) % 5 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(o.x + 7), Math.round(y - 8), 1, 3); ctx.fillRect(Math.round(o.x + 6), Math.round(y - 7), 3, 1); }
}
