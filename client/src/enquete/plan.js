// =====================================================================
//  LES OMBRES DE BAKER STREET — le plan vu de dessus d'un lieu
//  Tout est dessiné en code : sols, murs, meubles, personnages, lumières.
//  Le décor fixe est peint une fois dans une image cachée (fond), puis
//  chaque image ajoute ce qui bouge : feu, personnages, poussière,
//  lumière des lampes, brouillard. La caméra suit le détective.
//  ZQSD / WASD / flèches ou clic pour marcher, E ou Espace pour agir.
// =====================================================================
import { grillePlan, heureDe } from '../../../shared/enquete/moteur.js';

const S = 56;                  // résolution du décor peint : pixels par case
const VITESSE = 3.6;           // cases par seconde
const PORTEE = 1.25;           // distance pour examiner / parler

// ---------- petits outils ----------
const alea = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const teinte = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const images = {};
function image(src) { if (!images[src]) { const i = new Image(); i.src = src; images[src] = i; } const i = images[src]; return i.complete && i.naturalWidth ? i : null; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---------- l'apparence de chacun ----------
const LOOKS = {
  joueur: { manteau: '#5d4a31', tete: 'chasse', cheveux: '#3a2a1a', echarpe: '#8a2a20' },
  vane: { manteau: '#2c3a2c', tete: 'haut', cheveux: '#2a2018' },
  pell: { manteau: '#5a3a4a', tete: 'bonnet', coiffe: '#efe8dc', cheveux: '#9a9a9a', tablier: '#e6dfd0' },
  gribble: { manteau: '#34343e', tete: 'melon', cheveux: '#5a4a3a', moustache: '#5a4030', large: 1.1 },
  arthur: { manteau: '#5a4030', tete: 'cheveux', cheveux: '#b8622a' },
  hannah: { manteau: '#3e4a3c', tete: 'chignon', cheveux: '#4a2e1a', tablier: '#7a5232' },
  crale: { manteau: '#24201a', tete: 'cheveux', cheveux: '#c8c8c0', moustache: '#c8c8c0' },
  lusk: { manteau: '#3a2a22', tete: 'melon', cheveux: '#1e1a16', moustache: '#1e1a16' },
  margot: { manteau: '#245030', tete: 'plume', cheveux: '#b8501f', robe: true },
  pip: { manteau: '#5e4c30', tete: 'casquette', cheveux: '#5a3a1a', taille: 0.78 },
  bill: { manteau: '#4a3020', tete: 'chauve', cheveux: '#5a4030', tablier: '#6a4a2a', large: 1.3 },
  gardien: { manteau: '#2c2c2a', tete: 'casquette', cheveux: '#2a2420', large: 1.15 },
  edmund: { manteau: '#161616', tete: 'cheveux', cheveux: '#dcc070', plastron: true },
  reed: { manteau: '#121214', tete: 'bonnet', coiffe: '#141414', cheveux: '#7a7a7a', robe: true },
  doyen: { manteau: '#0e0e0e', tete: 'haut', cheveux: '#ddd' },
};

// ---------- les sols ----------
const SOLS = {
  parquet: '#6a4a2c', tapis: '#6a4a2c', carrelage: '#c8c0b0', pierre: '#55524c', planches: '#4e3c28', marbre: '#d6cfc0', velours: '#4a1a1c',
};
// ce que représente chaque meuble (déduit de son icône quand le plan ne le précise pas)
const TYPE_ICO = {
  '📚': 'etagere', '🪟': 'fenetre', '⚗️': 'chimie', '🔥': 'cheminee', '🎻': 'fauteuil', '📰': 'journaux', '🗄️': 'bureau', '🍳': 'fourneau', '🥫': 'placard',
  '🫖': 'table', '🧥': 'patere', '🛏️': 'lit', '🧳': 'malle', '🕰️': 'horloges', '🔧': 'etabli', '🔐': 'coffre', '🩸': 'tache', '🗝️': 'serrure', '🚪': 'porte',
  '📦': 'caisse', '🚰': 'evier', '⏰': 'vitrine', '📒': 'comptoir', '⌚': 'vitrine', '📋': 'tableau', '🗂️': 'bureau', '⛓️': 'barreaux', '🪑': 'banc',
  '🍺': 'comptoir_bar', '🎯': 'cible', '🍻': 'table', '🛢️': 'tonneaux', '🃏': 'table_jeu', '🍾': 'caisse', '🏦': 'chambre_forte', '🖼️': 'tableau_peint',
  '🪙': 'guichet', '🎩': 'patere', '🔑': 'cles', '🧾': 'comptoir', '🗃️': 'coffres', '🧰': 'etabli', '🗜️': 'etau', '⚱️': 'creuset', '🎭': 'scene',
  '🎟️': 'loge', '💺': 'rangs', '🎹': 'piano', '👗': 'portant', '🪞': 'coiffeuse', '🪢': 'cordes', '⚙️': 'treuil',
};
const typeDe = (o) => o.type || (o.nom === 'Poêle' ? 'poele' : TYPE_ICO[o.ico]) || 'table';
const OBJET_SUR = { table: 1, bureau: 1, comptoir: 1, table_jeu: 0, journaux: 0 };   // types sur lesquels on pose l'icône comme un objet
const FEUX = { cheminee: '#ff8a2a', poele: '#ff7a20', fourneau: '#ff8a2a', creuset: '#ffb030' };

// =====================================================================
//  LE DÉCOR PEINT (une fois par lieu)
// =====================================================================
function peindreFond(plan) {
  const W = plan.carte[0].length, H = plan.carte.length;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  const car = (x, y) => plan.carte[y]?.[x] ?? ' ';
  const estSol = (x, y) => !'# '.includes(car(x, y));
  const pieceDe = (x, y) => { const k = car(x, y); if (plan.pieces[k]) return plan.pieces[k]; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (plan.pieces[car(x + dx, y + dy)]) return plan.pieces[car(x + dx, y + dy)]; return { sol: 'parquet' }; };
  // boîtes des pièces
  const boites = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = car(x, y); if (!plan.pieces[k]) continue; const b = (boites[k] ||= { x0: x, y0: y, x1: x, y1: y }); b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); }

  g.fillStyle = '#0a0806'; g.fillRect(0, 0, c.width, c.height);
  // ----- sols -----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!estSol(x, y)) continue;
    const sol = pieceDe(x, y).sol, px = x * S, py = y * S, n = x * 31 + y * 17;
    if (sol === 'parquet' || sol === 'tapis') {
      for (let i = 0; i < 4; i++) {                     // quatre lattes par case, joints décalés
        const ly = py + (i * S) / 4, v = 0.82 + alea(n + i) * 0.3;
        g.fillStyle = teinte('#6e4b2a', v); g.fillRect(px, ly, S, S / 4);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, ly + S / 4 - 1, S, 1);
        const joint = px + ((alea(n * 3 + i) * S) | 0); g.fillRect(joint, ly, 1, S / 4);
        g.strokeStyle = 'rgba(40,24,10,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, ly + S / 8 + alea(n + i * 7) * 4 - 2); g.bezierCurveTo(px + S / 3, ly + S / 10, px + (2 * S) / 3, ly + S / 6, px + S, ly + S / 8); g.stroke();
      }
    } else if (sol === 'carrelage') {
      const noir = (x + y) % 2; g.fillStyle = noir ? '#2e2a26' : '#d9d0c0'; g.fillRect(px, py, S, S);
      g.strokeStyle = noir ? 'rgba(255,255,255,.06)' : 'rgba(80,70,60,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px + alea(n) * S, py); g.quadraticCurveTo(px + S / 2, py + S / 2, px + alea(n + 1) * S, py + S); g.stroke();
    } else if (sol === 'marbre') {
      g.fillStyle = teinte('#d8d0c2', 0.94 + alea(n) * 0.08); g.fillRect(px, py, S, S);
      g.strokeStyle = 'rgba(120,110,95,.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px, py + alea(n + 2) * S); g.bezierCurveTo(px + S / 3, py + alea(n + 3) * S, px + (2 * S) / 3, py + alea(n + 4) * S, px + S, py + alea(n + 5) * S); g.stroke();
      if ((x + y) % 2 === 0) { g.strokeStyle = 'rgba(90,80,70,.25)'; g.strokeRect(px + 0.5, py + 0.5, S * 2 - 1, S * 2 - 1); }
    } else if (sol === 'pierre') {
      g.fillStyle = '#3a3834'; g.fillRect(px, py, S, S);
      const d = [[0, 0, 0.55, 0.5], [0.55, 0, 0.45, 0.62], [0, 0.5, 0.42, 0.5], [0.42, 0.62, 0.58, 0.38], [0.42, 0.5, 0.13, 0.12]];
      d.forEach(([a, b, w, h], k) => { g.fillStyle = teinte('#5c5850', 0.8 + alea(n + k) * 0.35); rr(g, px + a * S + 1.5, py + b * S + 1.5, w * S - 3, h * S - 3, 4); g.fill(); });
    } else if (sol === 'planches') {
      for (let i = 0; i < 3; i++) {
        const lx = px + (i * S) / 3; g.fillStyle = teinte('#4e3a26', 0.78 + alea(n + i) * 0.35); g.fillRect(lx, py, S / 3, S);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(lx + S / 3 - 1.5, py, 1.5, S);
        if (alea(n + i * 5) > 0.6) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(lx, py + ((alea(n + i) * S) | 0), S / 3, 1.5); }
        g.fillStyle = 'rgba(30,30,30,.7)'; g.beginPath(); g.arc(lx + S / 6, py + 4, 1.4, 0, 7); g.arc(lx + S / 6, py + S - 4, 1.4, 0, 7); g.fill();
      }
    } else if (sol === 'velours') {
      g.fillStyle = teinte('#5a1c20', 0.9 + alea(n) * 0.1); g.fillRect(px, py, S, S);
      g.fillStyle = 'rgba(201,163,90,.08)'; g.beginPath(); g.arc(px + S / 2, py + S / 2, S * 0.18, 0, 7); g.fill();
    }
  }
  // ----- tapis persans -----
  for (const [k, p] of Object.entries(plan.pieces)) {
    if (p.sol !== 'tapis' || !boites[k]) continue;
    const b = boites[k], m = 0.55;
    const x = (b.x0 + m) * S, y = (b.y0 + m) * S, w = (b.x1 - b.x0 + 1 - 2 * m) * S, h = (b.y1 - b.y0 + 1 - 2 * m) * S;
    if (w < S || h < S) continue;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 4, y + 5, w, h);
    g.fillStyle = '#6a1e1a'; g.fillRect(x, y, w, h);
    g.fillStyle = '#2a1a3a'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
    g.fillStyle = '#7a2420'; g.fillRect(x + 16, y + 16, w - 32, h - 32);
    g.strokeStyle = '#c9a35a'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, w - 8, h - 8); g.strokeRect(x + 14, y + 14, w - 28, h - 28);
    g.fillStyle = 'rgba(201,163,90,.55)';                                   // frise de petits losanges
    for (let i = x + 24; i < x + w - 20; i += 18) { g.beginPath(); g.moveTo(i, y + 9); g.lineTo(i + 4, y + 11); g.lineTo(i, y + 13); g.lineTo(i - 4, y + 11); g.fill(); g.beginPath(); g.moveTo(i, y + h - 13); g.lineTo(i + 4, y + h - 11); g.lineTo(i, y + h - 9); g.lineTo(i - 4, y + h - 11); g.fill(); }
    const cx = x + w / 2, cy = y + h / 2, rx = Math.min(w, h * 1.6) * 0.28, ry = Math.min(h, w / 1.6) * 0.28;   // médaillon
    g.fillStyle = '#2a1a3a'; g.beginPath(); g.moveTo(cx - rx, cy); g.lineTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.fill();
    g.fillStyle = '#b8862a'; g.beginPath(); g.moveTo(cx - rx * 0.55, cy); g.lineTo(cx, cy - ry * 0.55); g.lineTo(cx + rx * 0.55, cy); g.lineTo(cx, cy + ry * 0.55); g.fill();
    g.fillStyle = '#6a1e1a'; g.beginPath(); g.arc(cx, cy, Math.min(rx, ry) * 0.22, 0, 7); g.fill();
    for (const [ax, ay] of [[x + 30, y + 30], [x + w - 30, y + 30], [x + 30, y + h - 30], [x + w - 30, y + h - 30]]) { g.fillStyle = 'rgba(184,134,42,.6)'; g.beginPath(); g.arc(ax, ay, 6, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(230,220,200,.5)'; g.lineWidth = 1;                // franges
    for (let i = x + 3; i < x + w; i += 5) { g.beginPath(); g.moveTo(i, y); g.lineTo(i, y - 5); g.moveTo(i, y + h); g.lineTo(i, y + h + 5); g.stroke(); }
  }
  // ----- murs : la face visible quand une pièce est au sud, le dessus sinon -----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = car(x, y), px = x * S, py = y * S;
    if (k === '+') {                                                       // seuil de porte
      g.fillStyle = '#4a321c'; g.fillRect(px, py, S, S); g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 1; i < 4; i++) g.fillRect(px, py + (i * S) / 4, S, 1);
      g.fillStyle = '#5a3c20'; g.fillRect(px + 3, py + S * 0.38, S - 6, S * 0.24);
      g.fillStyle = 'rgba(255,220,160,.12)'; g.fillRect(px + 3, py + S * 0.38, S - 6, 2);
      const vertical = car(x - 1, y) === '#' && car(x + 1, y) === '#';
      g.fillStyle = '#2a1a0e';
      if (vertical) { g.fillRect(px - 2, py, 6, S); g.fillRect(px + S - 4, py, 6, S); } else { g.fillRect(px, py - 2, S, 6); g.fillRect(px, py + S - 4, S, 6); }
      continue;
    }
    if (k !== '#') continue;
    if (estSol(x, y + 1)) {
      const pc = pieceDe(x, y + 1), mur = pc.mur || plan.mur || '#3a2c22', style = pc.murStyle || 'papier';
      g.fillStyle = '#120c07'; g.fillRect(px, py, S + 1, S);
      const fy = py + S * 0.3, fh = S * 0.7;   // la face du mur, sous son chapeau

      g.fillStyle = mur; g.fillRect(px, fy, S + 1, fh);
      if (style === 'brique' || style === 'bois') {
        if (style === 'brique') { const bh = fh / 5; for (let r = 0; r < 5; r++) for (let c = -1; c < 3; c++) { const bx = px + c * (S / 2) + (r % 2) * (S / 4); g.fillStyle = teinte(mur, 0.85 + alea(x * 7 + y * 3 + r * 5 + c) * 0.35); g.fillRect(bx + 1, fy + r * bh + 1, S / 2 - 2, bh - 2); } }
        else { for (let i = 0; i < 4; i++) { g.fillStyle = teinte(mur, 0.8 + alea(x * 11 + i) * 0.35); g.fillRect(px + (i * S) / 4, fy, S / 4 - 1, fh); } }
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px, fy + fh - 4, S + 1, 4); g.fillStyle = '#2a1e14'; g.fillRect(px, fy - 3, S + 1, 3);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, py + S, S, 5);
        continue;
      }
      g.fillStyle = 'rgba(255,240,200,.07)';                                 // papier peint à motifs
      for (let i = 0; i < 3; i++) { const mx = px + (i + 0.5) * (S / 3), my = fy + fh * 0.3; g.beginPath(); g.moveTo(mx, my - 5); g.quadraticCurveTo(mx + 4, my, mx, my + 5); g.quadraticCurveTo(mx - 4, my, mx, my - 5); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 3; i++) g.fillRect(px + (i * S) / 3, fy, 1, fh * 0.55);
      g.fillStyle = '#3b2615'; g.fillRect(px, fy + fh * 0.58, S + 1, fh * 0.42);   // lambris
      g.fillStyle = '#4c331d'; g.fillRect(px + 3, fy + fh * 0.64, S / 2 - 5, fh * 0.28); g.fillRect(px + S / 2 + 2, fy + fh * 0.64, S / 2 - 5, fh * 0.28);
      g.fillStyle = '#a07a40'; g.fillRect(px, fy + fh * 0.57, S + 1, 2);
      g.fillStyle = '#2a1e14'; g.fillRect(px, fy - 3, S + 1, 3);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, py + S, S, 5);              // ombre au pied du mur
    } else {
      g.fillStyle = '#16100a'; g.fillRect(px, py, S + 1, S + 1);
      g.fillStyle = '#2a1e14';
      if (estSol(x - 1, y)) g.fillRect(px, py, 3, S);
      if (estSol(x + 1, y)) g.fillRect(px + S - 3, py, 3, S);
      if (estSol(x, y - 1)) g.fillRect(px, py, S, 3);
      if (estSol(x + 1, y) || estSol(x - 1, y)) { g.fillStyle = 'rgba(0,0,0,.35)'; if (estSol(x + 1, y)) g.fillRect(px + S, py, 6, S); }
    }
  }
  // ----- meubles -----
  for (const o of [...plan.objets].sort((a, b) => a.y - b.y)) meuble(g, o, typeDe(o), o.x * S, o.y * S, o.l * S, o.h * S, plan);
  // ----- noms des pièces, peints sur le mur du haut -----
  g.font = `italic ${Math.round(S * 0.32)}px Georgia, serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
  for (const [k, b] of Object.entries(boites)) {
    const nom = plan.pieces[k].nom, tx = (b.x0 + 0.15) * S, ty = (b.y0 - 0.5) * S;
    const w = g.measureText(nom).width + 14;
    g.fillStyle = 'rgba(10,7,4,.72)'; rr(g, tx - 7, ty - S * 0.22, w, S * 0.44, 4); g.fill();
    g.strokeStyle = 'rgba(201,163,90,.5)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#e6d2a6'; g.fillText(nom, tx, ty);
  }
  return { canvas: c, boites };
}

// ---------- les meubles, un par un ----------
function boite(g, x, y, w, h, haut, dessus, face) {
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x + 4, y + 6, w, h, 5); g.fill();
  g.fillStyle = face; rr(g, x, y + haut, w, h - haut, 4); g.fill();
  g.fillStyle = dessus; rr(g, x, y, w, h - haut, 4); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; rr(g, x, y, w, h, 4); g.stroke();
}
function bois(g, x, y, w, h) { g.strokeStyle = 'rgba(30,15,5,.25)'; g.lineWidth = 1; for (let i = 6; i < h; i += 7) { g.beginPath(); g.moveTo(x + 3, y + i); g.bezierCurveTo(x + w / 3, y + i - 2, x + (2 * w) / 3, y + i + 2, x + w - 3, y + i); g.stroke(); } }
function livres(g, x, y, w, h, n) {
  const couleurs = ['#6a1e1a', '#1e3a2a', '#2a2a4a', '#6a4a1a', '#4a1a3a', '#2a4a4a', '#5a3a1a'];
  let i = 0; for (let bx = x; bx < x + w - 3; ) { const lw = 4 + alea(n + i) * 5; g.fillStyle = couleurs[(i * 3 + n) % couleurs.length]; g.fillRect(bx, y + alea(n + i * 2) * 3, lw, h - alea(n + i * 2) * 3); g.fillStyle = 'rgba(201,163,90,.6)'; g.fillRect(bx, y + h * 0.3, lw, 1); bx += lw + 0.8; i++; }
}
function meuble(g, o, type, x, y, w, h, plan) {
  const n = o.x * 13 + o.y * 7, m = 5, X = x + m, Y = y + m, Wd = w - 2 * m, Hd = h - 2 * m;
  switch (type) {
    case 'etagere': case 'classeurs': case 'etagere_vide': {
      boite(g, X, Y, Wd, Hd, Hd * 0.3, '#3a2414', '#24160a');
      const rangs = Math.max(2, Math.round(Hd / 12));
      for (let i = 0; i < rangs; i++) { const ry = Y + 3 + (i * (Hd * 0.7 - 6)) / rangs; if (type === 'etagere') livres(g, X + 3, ry, Wd - 6, (Hd * 0.7 - 6) / rangs - 1, n + i * 9); else if (type === 'classeurs') { for (let k = 0; k < Wd - 8; k += 10) { g.fillStyle = '#c8b890'; g.fillRect(X + 4 + k, ry + 2, 8, 6); } } }
      break;
    }
    case 'fenetre': {
      g.fillStyle = '#2a1a0e'; g.fillRect(x + 4, y - S + 8, w - 8, S - 10);
      g.fillStyle = '#7a8a98'; g.fillRect(x + 8, y - S + 12, w - 16, S - 18);
      const grd = g.createLinearGradient(0, y - S, 0, y); grd.addColorStop(0, 'rgba(200,215,230,.6)'); grd.addColorStop(1, 'rgba(90,100,110,.4)'); g.fillStyle = grd; g.fillRect(x + 8, y - S + 12, w - 16, S - 18);
      g.fillStyle = '#2a1a0e'; for (let i = 1; i < 3; i++) g.fillRect(x + 8 + (i * (w - 16)) / 3, y - S + 12, 2, S - 18); g.fillRect(x + 8, y - S * 0.55, w - 16, 2);
      g.fillStyle = '#4a1418'; g.fillRect(x, y - S + 6, 9, S + 10); g.fillRect(x + w - 9, y - S + 6, 9, S + 10);   // rideaux
      g.fillStyle = 'rgba(200,215,235,.12)'; g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + w - 8, y); g.lineTo(x + w + 10, y + h + 10); g.lineTo(x - 10, y + h + 10); g.fill();
      g.fillStyle = '#3a2414'; g.fillRect(x + 6, y + 2, w - 12, 8);
      break;
    }
    case 'cheminee': case 'poele': case 'fourneau': case 'creuset': {
      if (type === 'cheminee') {
        boite(g, X - 2, Y, Wd + 4, Hd, Hd * 0.35, '#8a8070', '#5a5448');
        g.fillStyle = '#0c0806'; rr(g, X + Wd * 0.2, Y + Hd * 0.25, Wd * 0.6, Hd * 0.55, 6); g.fill();
        g.fillStyle = '#3a3630'; g.fillRect(X + Wd * 0.22, Y + Hd * 0.72, Wd * 0.56, 3);
      } else if (type === 'creuset') {
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(X + Wd / 2 + 4, Y + Hd / 2 + 6, Wd / 2, Hd / 2, 0, 0, 7); g.fill();
        g.fillStyle = '#3a3634'; g.beginPath(); g.ellipse(X + Wd / 2, Y + Hd / 2, Wd / 2, Hd / 2, 0, 0, 7); g.fill();
        g.fillStyle = '#1a1614'; g.beginPath(); g.ellipse(X + Wd / 2, Y + Hd / 2, Wd / 3, Hd / 3, 0, 0, 7); g.fill();
      } else {
        boite(g, X, Y, Wd, Hd, Hd * 0.3, '#2a2a2c', '#18181a');
        g.fillStyle = '#0c0c0c'; rr(g, X + Wd * 0.15, Y + Hd * 0.2, Wd * 0.7, Hd * 0.45, 4); g.fill();
        if (type === 'fourneau') { g.fillStyle = '#3a3a3c'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + Wd * (0.2 + i * 0.3), Y + Hd * 0.42, Hd * 0.16, 0, 7); g.fill(); } g.fillStyle = '#7a6a50'; g.beginPath(); g.ellipse(X + Wd * 0.5, Y + Hd * 0.35, 7, 5, 0, 0, 7); g.fill(); }
      }
      break;
    }
    case 'fauteuil': {
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, X + 4, Y + 6, Wd, Hd, 10); g.fill();
      g.fillStyle = '#2a4a32'; rr(g, X, Y, Wd, Hd, 10); g.fill();
      g.fillStyle = '#1a3220'; rr(g, X, Y, Wd, Hd * 0.35, 8); g.fill(); rr(g, X, Y, Wd * 0.14, Hd, 6); g.fill(); rr(g, X + Wd * 0.86, Y, Wd * 0.14, Hd, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + Wd * (0.3 + i * 0.2), Y + Hd * 0.18, 1.5, 0, 7); g.fill(); }
      if (o.ico === '🎻') { g.save(); g.translate(X + Wd * 0.55, Y + Hd * 0.6); g.rotate(-0.6); g.fillStyle = '#8a3a14'; g.beginPath(); g.ellipse(0, 0, 6, 10, 0, 0, 7); g.fill(); g.fillStyle = '#1a0a04'; g.fillRect(-1.5, -22, 3, 14); g.restore(); }
      break;
    }
    case 'journaux': {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(X + Wd / 2 + 3, Y + Hd / 2 + 5, Math.min(Wd, Hd) * 0.55, 0, 7); g.fill();
      g.fillStyle = '#4a2e18'; g.beginPath(); g.ellipse(X + Wd / 2, Y + Hd / 2, Wd / 2, Hd / 2 + 4, 0, 0, 7); g.fill();
      for (let i = 0; i < 5; i++) { g.save(); g.translate(X + Wd / 2 + (alea(n + i) - 0.5) * 10, Y + Hd / 2 + (alea(n + i + 3) - 0.5) * 6); g.rotate((alea(n + i * 2) - 0.5) * 0.8); g.fillStyle = i % 2 ? '#e2d6bc' : '#d4c6a8'; g.fillRect(-16, -11, 32, 22); g.fillStyle = 'rgba(60,50,40,.4)'; for (let l = -7; l < 9; l += 3) g.fillRect(-13, l, 26, 1); g.restore(); }
      break;
    }
    case 'bureau': case 'table': case 'comptoir': case 'guichet': case 'table_jeu': case 'chimie': case 'etabli': {
      const fonce = type === 'etabli' ? '#4a3a26' : type === 'guichet' ? '#3a2414' : '#4a2c16';
      boite(g, X, Y, Wd, Hd, Math.min(10, Hd * 0.25), type === 'etabli' ? '#6a5236' : '#5c3a1e', fonce);
      bois(g, X, Y, Wd, Hd * 0.75);
      if (type === 'table_jeu') { g.fillStyle = '#1e4a2a'; rr(g, X + 5, Y + 5, Wd - 10, Hd * 0.7 - 6, 5); g.fill(); for (let i = 0; i < 6; i++) { g.save(); g.translate(X + 12 + alea(n + i) * (Wd - 24), Y + 10 + alea(n + i * 3) * (Hd * 0.6 - 16)); g.rotate(alea(n + i * 5) * 3); g.fillStyle = '#f0e8d8'; g.fillRect(-4, -6, 8, 12); g.fillStyle = i % 2 ? '#a02020' : '#202020'; g.fillRect(-1.5, -2, 3, 3); g.restore(); } g.fillStyle = '#c9a35a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X + Wd * 0.8 + i * 2, Y + Hd * 0.25, 3, 0, 7); g.fill(); } }
      if (type === 'chimie') { const cs = ['#6ab0a0', '#c06a3a', '#9a8ac0', '#d8c060']; for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(220,235,240,.5)'; g.beginPath(); g.arc(X + 10 + i * (Wd - 20) / 3, Y + Hd * 0.35, 5, 0, 7); g.fill(); g.fillStyle = cs[i]; g.beginPath(); g.arc(X + 10 + i * (Wd - 20) / 3, Y + Hd * 0.38, 3.2, 0, 7); g.fill(); } }
      if (type === 'etabli') { g.fillStyle = '#888'; for (let i = 0; i < 5; i++) { g.save(); g.translate(X + 10 + i * (Wd - 20) / 4, Y + Hd * 0.32); g.rotate(alea(n + i) * 2 - 1); g.fillRect(-1.5, -8, 3, 16); g.fillStyle = '#6a3a1a'; g.fillRect(-2.5, 3, 5, 7); g.fillStyle = '#888'; g.restore(); } g.fillStyle = '#b89040'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(X + 20 + alea(n + i * 4) * (Wd - 40), Y + Hd * 0.55, 2.5, 0, 7); g.fill(); } }
      if (type === 'guichet') { g.strokeStyle = '#b8903a'; g.lineWidth = 1.5; for (let i = X + 8; i < X + Wd - 4; i += 7) { g.beginPath(); g.moveTo(i, Y + 2); g.lineTo(i, Y + Hd * 0.55); g.stroke(); } }
      if (type === 'comptoir') { g.fillStyle = 'rgba(201,163,90,.5)'; g.fillRect(X, Y + Hd * 0.72, Wd, 2); }
      if (o.ico && OBJET_SUR[type]) { g.font = `${Math.min(Hd * 0.6, S * 0.5)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.ico, X + Wd * 0.5, Y + Hd * 0.38); }
      if (type === 'bureau') { g.fillStyle = '#d8ccb0'; g.save(); g.translate(X + Wd * 0.25, Y + Hd * 0.35); g.rotate(-0.15); g.fillRect(-8, -6, 16, 12); g.restore(); g.fillStyle = '#1a1a2a'; g.beginPath(); g.arc(X + Wd * 0.8, Y + Hd * 0.3, 3, 0, 7); g.fill(); }
      break;
    }
    case 'comptoir_bar': {
      boite(g, X, Y, Wd, Hd, Hd * 0.35, '#4a2a14', '#2e1a0c'); bois(g, X, Y, Wd, Hd * 0.6);
      g.fillStyle = '#c9a35a'; g.fillRect(X, Y + Hd * 0.62, Wd, 2.5);
      for (let i = 0; i < 4; i++) { const px = X + Wd * (0.2 + i * 0.2); g.fillStyle = '#c9a35a'; g.fillRect(px - 2, Y + 4, 4, Hd * 0.4); g.fillStyle = '#1a1a1a'; rr(g, px - 3, Y + 2, 6, 10, 2); g.fill(); }
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(220,200,150,.7)'; g.beginPath(); g.arc(X + 10 + i * 9, Y + Hd * 0.45, 3.5, 0, 7); g.fill(); }
      break;
    }
    case 'lit': {
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, X + 4, Y + 6, Wd, Hd, 6); g.fill();
      g.fillStyle = '#3a2414'; rr(g, X, Y, Wd, Hd, 6); g.fill();
      g.fillStyle = '#e8e0d0'; rr(g, X + 4, Y + 4, Wd - 8, Hd - 8, 4); g.fill();
      g.fillStyle = '#f4efe6'; rr(g, X + 8, Y + 8, Wd - 16, Hd * 0.22, 6); g.fill();
      g.fillStyle = o.couverture || '#6a2a2a'; rr(g, X + 4, Y + Hd * 0.38, Wd - 8, Hd * 0.58, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 4; i++) g.fillRect(X + 6, Y + Hd * (0.45 + i * 0.12), Wd - 12, 2);
      break;
    }
    case 'malle': case 'coffres': {
      boite(g, X, Y, Wd, Hd, Hd * 0.3, '#5a3a1e', '#3a2410');
      g.fillStyle = '#9a7a3a'; g.fillRect(X, Y + Hd * 0.25, Wd, 3); g.fillRect(X + Wd * 0.25, Y, 3, Hd); g.fillRect(X + Wd * 0.72, Y, 3, Hd);
      g.fillStyle = '#c9a35a'; g.fillRect(X + Wd / 2 - 3, Y + Hd * 0.42, 6, 7);
      break;
    }
    case 'horloges': case 'horloge': {
      if (type === 'horloge') { boite(g, X + Wd * 0.15, Y, Wd * 0.7, Hd, Hd * 0.3, '#4a2810', '#2a1608'); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(X + Wd / 2, Y + Hd * 0.3, Math.min(Wd, Hd) * 0.22, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X + Wd / 2, Y + Hd * 0.3); g.lineTo(X + Wd / 2, Y + Hd * 0.18); g.moveTo(X + Wd / 2, Y + Hd * 0.3); g.lineTo(X + Wd * 0.6, Y + Hd * 0.3); g.stroke(); break; }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, Y + 4, Wd, Hd); g.fillStyle = '#2a1a0c'; g.fillRect(X, Y, Wd, Hd * 0.5);
      for (let i = 0; i < Math.max(3, Math.round(Wd / 22)); i++) { const cx = X + 11 + i * ((Wd - 22) / Math.max(2, Math.round(Wd / 22) - 1)), cy = Y + Hd * 0.35, r = 6 + alea(n + i) * 4; g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(cx, cy, r + 2, 0, 7); g.fill(); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(i * 2) * r * 0.7, cy + Math.sin(i * 2) * r * 0.7); g.stroke(); }
      break;
    }
    case 'coffre': case 'chambre_forte': {
      boite(g, X, Y, Wd, Hd, Math.min(14, Hd * 0.25), '#5a5e62', '#3a3c40');
      g.strokeStyle = '#2a2c30'; g.lineWidth = 2; g.strokeRect(X + 5, Y + 5, Wd - 10, Hd * 0.7 - 6);
      const r = Math.min(Wd, Hd) * (type === 'chambre_forte' ? 0.22 : 0.18); g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(X + Wd / 2, Y + Hd * 0.4, r, 0, 7); g.fill(); g.fillStyle = '#6a5020'; g.beginPath(); g.arc(X + Wd / 2, Y + Hd * 0.4, r * 0.5, 0, 7); g.fill();
      if (type === 'chambre_forte') { g.strokeStyle = '#c9a35a'; g.lineWidth = 3; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(X + Wd / 2, Y + Hd * 0.4); g.lineTo(X + Wd / 2 + Math.cos(a) * r * 1.6, Y + Hd * 0.4 + Math.sin(a) * r * 1.6); g.stroke(); } g.fillStyle = '#8a8e92'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(X + 8 + (i % 4) * ((Wd - 16) / 3), Y + 8 + Math.floor(i / 4) * (Hd * 0.6), 2, 0, 7); g.fill(); } }
      break;
    }
    case 'manivelle': { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(X + Wd / 2 + 3, Y + Hd / 2 + 4, Wd * 0.38, 0, 7); g.fill(); g.strokeStyle = '#d8b050'; g.lineWidth = 4; g.beginPath(); g.arc(X + Wd / 2, Y + Hd / 2, Wd * 0.32, 0, 7); for (let a = 0; a < 4; a++) { g.moveTo(X + Wd / 2, Y + Hd / 2); g.lineTo(X + Wd / 2 + Math.cos(a * 1.57) * Wd * 0.32, Y + Hd / 2 + Math.sin(a * 1.57) * Wd * 0.32); } g.stroke(); break; }
    case 'tache': {
      g.fillStyle = 'rgba(70,8,6,.75)'; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.38, h * 0.3, 0.4, 0, 7); g.fill();
      g.fillStyle = 'rgba(90,10,8,.6)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + w / 2 + (alea(n + i) - 0.5) * w * 0.8, y + h / 2 + (alea(n + i + 9) - 0.5) * h * 0.7, 2 + alea(n + i) * 3, 0, 7); g.fill(); }
      break;
    }
    case 'serrure': { g.fillStyle = '#2a1a0e'; g.fillRect(X, Y + Hd * 0.3, Wd, Hd * 0.4); g.fillStyle = '#b89040'; rr(g, X + Wd * 0.3, Y + Hd * 0.2, Wd * 0.4, Hd * 0.6, 3); g.fill(); g.fillStyle = '#1a1208'; g.beginPath(); g.arc(X + Wd / 2, Y + Hd * 0.42, 3, 0, 7); g.fill(); g.fillRect(X + Wd / 2 - 1.5, Y + Hd * 0.42, 3, 7); break; }
    case 'porte': { g.save(); g.translate(X + Wd / 2, Y + Hd / 2); g.rotate(-0.12); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-Wd / 2 + 4, -Hd / 2 + 5, Wd, Hd); g.fillStyle = '#5a3418'; g.fillRect(-Wd / 2, -Hd / 2, Wd, Hd); g.strokeStyle = '#3a2010'; g.lineWidth = 2; g.strokeRect(-Wd / 2 + 4, -Hd / 2 + 4, Wd / 2 - 6, Hd - 8); g.strokeRect(2, -Hd / 2 + 4, Wd / 2 - 6, Hd - 8); g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(Wd / 2 - 8, 0, 2.5, 0, 7); g.fill(); g.strokeStyle = '#e8d0a0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-Wd / 2 + 2, -Hd / 2); g.lineTo(-Wd / 2 + 8, -2); g.lineTo(-Wd / 2 + 3, Hd / 2); g.stroke(); g.restore(); break; }
    case 'caisse': {
      boite(g, X, Y, Wd, Hd, Hd * 0.28, '#7a5a34', '#4e3820');
      g.strokeStyle = '#4a3218'; g.lineWidth = 2; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(X + (i * Wd) / 3, Y); g.lineTo(X + (i * Wd) / 3, Y + Hd * 0.72); g.stroke(); } g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Wd, Y + Hd * 0.72); g.stroke();
      if (o.zone === 'caisses') { g.fillStyle = '#ece4d0'; g.fillRect(X + Wd / 2 - 3, Y + Hd * 0.18, 6, Hd * 0.32); g.fillStyle = '#ffb040'; g.beginPath(); g.ellipse(X + Wd / 2, Y + Hd * 0.13, 3, 5, 0, 0, 7); g.fill(); }
      break;
    }
    case 'tonneaux': {
      const nb = Math.max(1, Math.round((Wd * Hd) / (S * S * 0.6)));
      for (let i = 0; i < nb; i++) { const cx = X + Wd * ((i % 2) * 0.5 + 0.25) + (nb === 1 ? Wd * 0.25 : 0), cy = Y + Hd * (Math.floor(i / 2) * 0.5 + 0.28) + (nb <= 2 ? Hd * 0.22 : 0), r = Math.min(Wd, Hd) * (nb === 1 ? 0.42 : 0.24);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(cx + 3, cy + 5, r, 0, 7); g.fill(); g.fillStyle = '#7a5230'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,20,8,.5)'; g.lineWidth = 1; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * 0.785) * r, cy + Math.sin(a * 0.785) * r); g.stroke(); } g.strokeStyle = '#3a3a3a'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r * 0.95, 0, 7); g.stroke(); g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(cx, cy, r * 0.14, 0, 7); g.fill(); g.fillStyle = 'rgba(255,230,180,.12)'; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, 7); g.fill(); }
      break;
    }
    case 'evier': { boite(g, X, Y, Wd, Hd, Hd * 0.3, '#7a7268', '#4a4640'); g.fillStyle = '#2a2a2c'; rr(g, X + 6, Y + 5, Wd - 12, Hd * 0.45, 4); g.fill(); g.fillStyle = '#b89040'; g.fillRect(X + Wd / 2 - 1.5, Y + 1, 3, 8); break; }
    case 'vitrine': {
      boite(g, X, Y, Wd, Hd, Hd * 0.3, '#3a2414', '#24160a');
      g.fillStyle = 'rgba(200,220,230,.22)'; g.fillRect(X + 4, Y + 4, Wd - 8, Hd * 0.62);
      for (let i = 0; i < Math.round(Wd / 14); i++) { const cx = X + 10 + i * 14, cy = Y + Hd * 0.35; g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill(); g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(X + 6, Y + 6, Wd * 0.3, 2);
      break;
    }
    case 'patere': {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(X + Wd / 2 + 3, Y + Hd / 2 + 5, Math.min(Wd, Hd) * 0.42, 0, 7); g.fill();
      g.fillStyle = '#3a2210'; g.beginPath(); g.arc(X + Wd / 2, Y + Hd / 2, 4, 0, 7); g.fill();
      g.fillStyle = '#4a3a2c'; g.beginPath(); g.ellipse(X + Wd * 0.38, Y + Hd * 0.55, Math.min(Wd, Hd) * 0.32, Math.min(Wd, Hd) * 0.4, 0.3, 0, 7); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(X + Wd * 0.66, Y + Hd * 0.38, Math.min(Wd, Hd) * 0.24, Math.min(Wd, Hd) * 0.2, 0, 0, 7); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(X + Wd * 0.66, Y + Hd * 0.38, Math.min(Wd, Hd) * 0.13, 0, 7); g.fill();
      break;
    }
    case 'tableau': { g.fillStyle = '#5a3a1a'; g.fillRect(x + 2, y - S * 0.85, w - 4, S * 0.7); g.fillStyle = '#1c2420'; g.fillRect(x + 6, y - S * 0.8, w - 12, S * 0.6); g.strokeStyle = 'rgba(230,230,220,.55)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x + 12 + alea(n + i) * 10, y - S * 0.7 + i * 7); g.lineTo(x + 12 + alea(n + i + 2) * (w - 30) + 10, y - S * 0.7 + i * 7 + (alea(n + i) - 0.5) * 3); g.stroke(); } g.fillStyle = '#5a3a1a'; g.fillRect(x + 6, y + 2, w - 12, 6); g.fillStyle = '#eee'; g.fillRect(x + 12, y + 3, 6, 3); break; }
    case 'tableau_peint': { g.fillStyle = '#b8903a'; g.fillRect(x + 6, y - S * 0.85, w - 12, S * 0.72); g.fillStyle = '#3a2a1a'; g.fillRect(x + 11, y - S * 0.8, w - 22, S * 0.62); g.fillStyle = '#c8a888'; g.beginPath(); g.ellipse(x + w / 2, y - S * 0.58, 6, 8, 0, 0, 7); g.fill(); g.fillStyle = '#1a1410'; g.fillRect(x + w / 2 - 9, y - S * 0.48, 18, S * 0.28); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y - S * 0.13, w - 12, 5); break; }
    case 'barreaux': { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y + h * 0.4, w, 6); g.fillStyle = '#4a4a4c'; for (let i = x + 5; i < x + w; i += 9) { g.fillRect(i, y + 2, 4, h - 4); g.fillStyle = '#7a7a7c'; g.fillRect(i, y + 2, 1.5, h - 4); g.fillStyle = '#4a4a4c'; } g.fillRect(x, y + 4, w, 4); g.fillRect(x, y + h - 8, w, 4); break; }
    case 'banc': case 'rangs': {
      const nb = type === 'rangs' ? Math.round(Wd / 16) : 1;
      if (type === 'banc') { boite(g, X, Y + Hd * 0.2, Wd, Hd * 0.6, Hd * 0.18, '#5a3a1e', '#3a2410'); g.fillStyle = '#3a2410'; g.fillRect(X, Y, Wd, Hd * 0.18); break; }
      for (let i = 0; i < nb; i++) { const sx = X + i * (Wd / nb); g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, sx + 3, Y + 5, Wd / nb - 3, Hd, 4); g.fill(); g.fillStyle = '#7a1a20'; rr(g, sx + 1, Y + 2, Wd / nb - 3, Hd - 2, 5); g.fill(); g.fillStyle = '#5a1016'; rr(g, sx + 1, Y + 2, Wd / nb - 3, Hd * 0.32, 4); g.fill(); }
      break;
    }
    case 'cible': { g.fillStyle = '#2a1a0e'; g.beginPath(); g.arc(x + w / 2, y - S * 0.4, S * 0.3, 0, 7); g.fill(); ['#e8dcc0', '#1a1a1a', '#e8dcc0', '#a02020'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + w / 2, y - S * 0.4, S * (0.26 - i * 0.06), 0, 7); g.fill(); }); g.fillStyle = '#c9a35a'; g.fillRect(x + w / 2 + 2, y - S * 0.44, 10, 1.5); break; }
    case 'cles': { g.fillStyle = '#3a2410'; g.fillRect(x + 4, y - S * 0.8, w - 8, S * 0.68); for (let i = 0; i < Math.round(w / 9); i++) for (let r = 0; r < 3; r++) { g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(x + 10 + i * 9, y - S * 0.7 + r * 14, 2.5, 0, 7); g.fill(); g.fillRect(x + 9.5 + i * 9, y - S * 0.7 + r * 14, 1.2, 8); } g.fillStyle = '#3a2410'; g.fillRect(x + 6, y + 2, w - 12, 6); break; }
    case 'etau': { boite(g, X + Wd * 0.1, Y + Hd * 0.1, Wd * 0.8, Hd * 0.8, Hd * 0.2, '#5a5a5e', '#3a3a3e'); g.fillStyle = '#2a2a2a'; g.fillRect(X + Wd * 0.45, Y, 4, Hd); g.fillStyle = '#b89040'; rr(g, X + Wd * 0.25, Y + Hd * 0.3, Wd * 0.2, Hd * 0.3, 2); g.fill(); break; }
    case 'scene': {
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X + 4, Y + 8, Wd, Hd); g.fillStyle = '#6a4a2a'; g.fillRect(X, Y, Wd, Hd); for (let i = X; i < X + Wd; i += 12) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i, Y, 1.5, Hd); }
      g.fillStyle = '#8a1a20'; g.fillRect(X, Y, Wd, 10); for (let i = X; i < X + Wd; i += 10) { g.fillStyle = '#6a1016'; g.fillRect(i, Y, 4, 12); } g.fillStyle = '#c9a35a'; g.fillRect(X, Y + Hd - 4, Wd, 4);
      for (let i = 0; i < 5; i++) { g.fillStyle = '#ffe0a0'; g.beginPath(); g.arc(X + 12 + i * (Wd - 24) / 4, Y + Hd - 8, 3, 0, 7); g.fill(); }
      break;
    }
    case 'loge': { g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, X + 4, Y + 5, Wd, Hd, 8); g.fill(); g.fillStyle = '#7a1a20'; rr(g, X, Y, Wd, Hd, 8); g.fill(); g.strokeStyle = '#c9a35a'; g.lineWidth = 3; rr(g, X + 2, Y + 2, Wd - 4, Hd - 4, 7); g.stroke(); g.fillStyle = '#7a6aa8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X + Wd * 0.7 + (alea(n + i) - 0.5) * 12, Y + Hd * 0.45 + (alea(n + i + 4) - 0.5) * 8, 3, 0, 7); g.fill(); } g.fillStyle = '#4a7a3a'; g.fillRect(X + Wd * 0.68, Y + Hd * 0.55, 2, 8); break; }
    case 'piano': { g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, X + 4, Y + 6, Wd, Hd, 6); g.fill(); g.fillStyle = '#141010'; rr(g, X, Y, Wd, Hd, 6); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X + 4, Y + 3, Wd - 8, 3); g.fillStyle = '#efe8d8'; g.fillRect(X + 4, Y + Hd - 12, Wd - 8, 9); g.fillStyle = '#141010'; for (let i = X + 6; i < X + Wd - 6; i += 6) if (alea(i) > 0.35) g.fillRect(i, Y + Hd - 12, 3, 5); break; }
    case 'portant': { g.fillStyle = '#5a5a5a'; g.fillRect(X, Y + Hd * 0.3, Wd, 3); const cs = ['#8a1a3a', '#c9a35a', '#2a4a7a', '#1a1a1a', '#6a2a6a', '#2a6a4a']; for (let i = 0; i < Math.round(Wd / 10); i++) { g.fillStyle = cs[(i + n) % cs.length]; rr(g, X + 2 + i * 10, Y + Hd * 0.3, 9, Hd * 0.65, 3); g.fill(); } break; }
    case 'coiffeuse': { boite(g, X, Y, Wd, Hd, Hd * 0.3, '#5a3a24', '#3a2414'); g.fillStyle = '#a8b8c0'; rr(g, X + Wd * 0.25, Y - S * 0.55, Wd * 0.5, S * 0.55, 10); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(X + Wd * 0.3, Y - S * 0.48, 4, S * 0.35); for (let i = 0; i < 6; i++) { g.fillStyle = ['#ffd890', '#e8c0c0', '#a0d0d0'][i % 3]; g.beginPath(); g.arc(X + 8 + i * (Wd - 16) / 5, Y + Hd * 0.3, 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,230,150,.9)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + Wd * (0.3 + i * 0.2), Y - S * 0.6, 3, 0, 7); g.fill(); } break; }
    case 'armoire': { boite(g, X, Y, Wd, Hd, Hd * 0.35, '#4a2a14', '#2e1a0a'); g.strokeStyle = '#2a160a'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + Wd / 2, Y + 3); g.lineTo(X + Wd / 2, Y + Hd * 0.62); g.stroke(); g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(X + Wd / 2 - 5, Y + Hd * 0.35, 2, 0, 7); g.arc(X + Wd / 2 + 5, Y + Hd * 0.35, 2, 0, 7); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(X + Wd * 0.62, Y + Hd * 0.62, Wd * 0.2, Hd * 0.3); break; }
    case 'cordes': { for (let i = 0; i < Math.max(1, Math.round(Wd / S)); i++) { const cx = X + S * 0.45 + i * S, cy = Y + Hd / 2; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(cx + 3, cy + 4, Hd * 0.45, 0, 7); g.fill(); for (let r = Hd * 0.42; r > 3; r -= 3.5) { g.strokeStyle = r % 7 < 3.5 ? '#9a7a4a' : '#7a5a34'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); } } break; }
    case 'treuil': { boite(g, X, Y + Hd * 0.2, Wd, Hd * 0.6, Hd * 0.15, '#4a3a2a', '#2a2018'); g.fillStyle = '#5a5a5a'; g.fillRect(X + Wd * 0.1, Y + Hd * 0.35, Wd * 0.8, Hd * 0.2); g.fillStyle = '#7a6a4a'; g.fillRect(X + Wd * 0.2, Y + Hd * 0.33, Wd * 0.6, Hd * 0.24); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.arc(X + Wd * 0.9, Y + Hd * 0.45, 8, 0, 7); g.stroke(); break; }
    case 'placard': { boite(g, X, Y, Wd, Hd, Hd * 0.35, '#5a4428', '#3a2a18'); g.fillStyle = '#c9b48a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X + 8 + i * (Wd - 16) / 3, Y + Hd * 0.3, 4, 0, 7); g.fill(); } break; }
    default: boite(g, X, Y, Wd, Hd, Hd * 0.3, '#5c3a1e', '#3a2410');
  }
}

// ---------- un personnage vu de dessus, en trois quarts ----------
function personnage(ctx, cx, cy, t, look, dir, marche, temps, nom = '') {
  const k = (look.taille || 1) * t, larg = look.large || 1, bob = marche ? Math.abs(Math.sin(temps * 10)) * k * 0.04 : Math.sin(temps * 2 + nom.length) * k * 0.012;
  const y0 = cy - bob;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(cx, cy + k * 0.3, k * 0.32 * larg, k * 0.13, 0, 0, 7); ctx.fill();
  // jambes
  const pas = marche ? Math.sin(temps * 10) * k * 0.08 : 0;
  ctx.fillStyle = '#16120e';
  if (!look.robe) { ctx.beginPath(); ctx.ellipse(cx - k * 0.09, y0 + k * 0.24 + pas, k * 0.07, k * 0.1, 0, 0, 7); ctx.ellipse(cx + k * 0.09, y0 + k * 0.24 - pas, k * 0.07, k * 0.1, 0, 0, 7); ctx.fill(); }
  // bras
  ctx.fillStyle = teinte(look.manteau, 0.8);
  ctx.beginPath(); ctx.ellipse(cx - k * 0.27 * larg, y0 + k * 0.03 - pas * 0.6, k * 0.08, k * 0.17, 0.15, 0, 7); ctx.ellipse(cx + k * 0.27 * larg, y0 + k * 0.03 + pas * 0.6, k * 0.08, k * 0.17, -0.15, 0, 7); ctx.fill();
  // corps (manteau)
  const corps = ctx.createLinearGradient(cx - k * 0.3, 0, cx + k * 0.3, 0); corps.addColorStop(0, teinte(look.manteau, 0.75)); corps.addColorStop(0.5, teinte(look.manteau, 1.15)); corps.addColorStop(1, teinte(look.manteau, 0.7));
  ctx.fillStyle = corps; ctx.beginPath();
  if (look.robe) { ctx.moveTo(cx - k * 0.18, y0 - k * 0.14); ctx.lineTo(cx + k * 0.18, y0 - k * 0.14); ctx.lineTo(cx + k * 0.34, y0 + k * 0.32); ctx.quadraticCurveTo(cx, y0 + k * 0.4, cx - k * 0.34, y0 + k * 0.32); }
  else { ctx.moveTo(cx - k * 0.22 * larg, y0 - k * 0.15); ctx.lineTo(cx + k * 0.22 * larg, y0 - k * 0.15); ctx.lineTo(cx + k * 0.25 * larg, y0 + k * 0.22); ctx.quadraticCurveTo(cx, y0 + k * 0.28, cx - k * 0.25 * larg, y0 + k * 0.22); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(1, k * 0.02); ctx.stroke();
  if (look.tablier && dir !== 'haut') { ctx.fillStyle = look.tablier; rr(ctx, cx - k * 0.13 * larg, y0 - k * 0.06, k * 0.26 * larg, k * 0.3, k * 0.04); ctx.fill(); }
  if (look.plastron && dir !== 'haut') { ctx.fillStyle = '#efeae0'; ctx.beginPath(); ctx.moveTo(cx - k * 0.06, y0 - k * 0.14); ctx.lineTo(cx + k * 0.06, y0 - k * 0.14); ctx.lineTo(cx, y0 + k * 0.06); ctx.fill(); }
  if (look.echarpe) { ctx.fillStyle = look.echarpe; rr(ctx, cx - k * 0.16, y0 - k * 0.18, k * 0.32, k * 0.07, k * 0.03); ctx.fill(); if (dir !== 'haut') ctx.fillRect(cx + k * 0.06, y0 - k * 0.14, k * 0.06, k * 0.16); }
  // tête
  const hx = cx + (dir === 'gauche' ? -k * 0.03 : dir === 'droite' ? k * 0.03 : 0), hy = y0 - k * 0.3;
  ctx.fillStyle = look.tete === 'chauve' || dir !== 'haut' ? '#e2b48e' : look.cheveux; ctx.beginPath(); ctx.arc(hx, hy, k * 0.15, 0, 7); ctx.fill();
  if (dir !== 'haut') {   // visage
    const ox = dir === 'gauche' ? -k * 0.05 : dir === 'droite' ? k * 0.05 : 0;
    ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.arc(hx - k * 0.05 + ox, hy + k * 0.01, k * 0.018, 0, 7); ctx.arc(hx + k * 0.05 + ox, hy + k * 0.01, k * 0.018, 0, 7); ctx.fill();
    if (look.moustache) { ctx.fillStyle = look.moustache; ctx.beginPath(); ctx.ellipse(hx + ox, hy + k * 0.07, k * 0.07, k * 0.022, 0, 0, 7); ctx.fill(); }
  }
  const coiffure = { haut: () => { ctx.fillStyle = '#0e0e0e'; ctx.beginPath(); ctx.ellipse(hx, hy - k * 0.08, k * 0.21, k * 0.07, 0, 0, 7); ctx.fill(); ctx.fillRect(hx - k * 0.12, hy - k * 0.32, k * 0.24, k * 0.24); ctx.beginPath(); ctx.ellipse(hx, hy - k * 0.32, k * 0.12, k * 0.04, 0, 0, 7); ctx.fillStyle = '#222'; ctx.fill(); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(hx - k * 0.12, hy - k * 0.13, k * 0.24, k * 0.035); },
    melon: () => { ctx.fillStyle = '#16120e'; ctx.beginPath(); ctx.ellipse(hx, hy - k * 0.07, k * 0.2, k * 0.065, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(hx, hy - k * 0.1, k * 0.13, Math.PI, 0); ctx.fill(); },
    casquette: () => { ctx.fillStyle = '#4a3c2c'; ctx.beginPath(); ctx.arc(hx, hy - k * 0.04, k * 0.16, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + (dir === 'gauche' ? -k * 0.12 : dir === 'droite' ? k * 0.12 : 0), hy - k * 0.03 + (dir === 'bas' ? k * 0.04 : 0), k * 0.12, k * 0.04, 0, 0, 7); ctx.fill(); },
    chasse: () => { ctx.fillStyle = '#7a5a36'; ctx.beginPath(); ctx.arc(hx, hy - k * 0.04, k * 0.165, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy - k * 0.04, k * 0.21, k * 0.05, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,24,10,.6)'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(hx + i * k * 0.05, hy - k * 0.19); ctx.lineTo(hx + i * k * 0.06, hy - k * 0.04); ctx.stroke(); } },
    bonnet: () => { ctx.fillStyle = look.coiffe; ctx.beginPath(); ctx.arc(hx, hy - k * 0.03, k * 0.18, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.strokeStyle = look.coiffe === '#141414' ? '#2a2a2a' : '#d8d0c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy - k * 0.03, k * 0.19, Math.PI, 0); ctx.stroke(); },
    chignon: () => { ctx.fillStyle = look.cheveux; ctx.beginPath(); ctx.arc(hx, hy - k * 0.05, k * 0.15, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.beginPath(); ctx.arc(hx, hy - k * 0.17, k * 0.07, 0, 7); ctx.fill(); },
    cheveux: () => { ctx.fillStyle = look.cheveux; ctx.beginPath(); ctx.arc(hx, hy - k * 0.02, k * 0.155, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); },
    chauve: () => { ctx.fillStyle = look.cheveux; ctx.beginPath(); ctx.arc(hx - k * 0.13, hy, k * 0.04, 0, 7); ctx.arc(hx + k * 0.13, hy, k * 0.04, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(hx - k * 0.04, hy - k * 0.07, k * 0.04, 0, 7); ctx.fill(); },
    plume: () => { ctx.fillStyle = look.cheveux; ctx.beginPath(); ctx.arc(hx, hy - k * 0.02, k * 0.17, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.strokeStyle = '#2a6a3a'; ctx.lineWidth = k * 0.035; ctx.beginPath(); ctx.moveTo(hx + k * 0.08, hy - k * 0.12); ctx.quadraticCurveTo(hx + k * 0.25, hy - k * 0.35, hx + k * 0.05, hy - k * 0.42); ctx.stroke(); ctx.fillStyle = '#c9a35a'; ctx.beginPath(); ctx.arc(hx + k * 0.08, hy - k * 0.12, k * 0.03, 0, 7); ctx.fill(); } };
  (coiffure[look.tete] || coiffure.cheveux)();
}

// =====================================================================
//  LA VUE
// =====================================================================
export function creerVuePlan(canvas, rappels) {
  const ctx = canvas.getContext('2d');
  const lum = document.createElement('canvas'), lctx = lum.getContext('2d');
  let ch = null, e = null, lieu = null, plan = null, grille = null, presents = [], positions = {}, fond = null;
  let joueur = { x: 0, y: 0, dir: 'bas', marche: false }, cam = { x: 0, y: 0 }, chemin = [], viser = null;
  const touches = new Set();
  let actif = false, t = 48, survol = null, dernier = 0, temps = 0, pieceCourante = null, banniere = { txt: '', fin: 0 }, lumieres = [], poussiere = [], fumees = [], regards = {};

  const libre = (x, y) => !!grille.libre[y]?.[x];
  const car = (x, y) => plan.carte[y]?.[x] ?? ' ';

  function ouvrir(chapitre, etat, idLieu, pnjPresents, garderPos = false) {
    const ancien = { ...joueur };
    ch = chapitre; e = etat; plan = ch.lieux[idLieu].plan; presents = pnjPresents;
    const changeLieu = lieu !== idLieu; lieu = idLieu;
    const p = { ...plan, pnj: Object.fromEntries(Object.entries(plan.pnj || {}).filter(([k]) => presents.includes(k))) };
    grille = grillePlan(p); positions = { ...p.pnj };
    for (const k of presents) if (!positions[k]) { const c = caseLibrePres(plan.entree); if (c) { positions[k] = c; grille.libre[c[1]][c[0]] = false; } }
    if (changeLieu || !fond) { const f = peindreFond(plan); fond = f.canvas; preparerLumieres(f.boites); poussiere = Array.from({ length: 70 }, (_, i) => ({ x: alea(i) * plan.carte[0].length, y: alea(i + 99) * plan.carte.length, v: 0.05 + alea(i + 7) * 0.12, a: alea(i + 3) * 6 })); }
    if (garderPos && !changeLieu) joueur = ancien;
    else { joueur = { x: plan.entree[0] + 0.5, y: plan.entree[1] + 0.5, dir: 'haut', marche: false }; cam = { x: joueur.x, y: joueur.y }; pieceCourante = null; }
    chemin = []; viser = null; actif = true; redimensionner();
  }
  function caseLibrePres([x0, y0]) {
    for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = x0 + dx, y = y0 + dy; if (libre(x, y) && (x !== x0 || y !== y0)) return [x, y]; }
    return null;
  }
  function preparerLumieres(boites) {
    lumieres = [];
    for (const b of Object.values(boites)) lumieres.push({ x: (b.x0 + b.x1 + 1) / 2, y: (b.y0 + b.y1 + 1) / 2, r: Math.max(3, Math.min(7, Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.6)), c: [255, 200, 120], f: 0.04, lampe: true });
    for (const o of plan.objets) {
      const ty = typeDe(o), cx = o.x + o.l / 2, cy = o.y + o.h / 2;
      if (FEUX[ty]) lumieres.push({ x: cx, y: cy, r: ty === 'cheminee' ? 4.5 : 3, c: [255, 140, 50], f: 0.18, feu: ty, o });
      if (ty === 'fenetre') lumieres.push({ x: cx, y: o.y + 0.6, r: 3.2, c: [190, 210, 240], f: 0, jour: true });
      if (ty === 'scene' || ty === 'coiffeuse') lumieres.push({ x: cx, y: cy, r: 3.5, c: [255, 220, 150], f: 0.03 });
    }
  }
  function fermer() { actif = false; }
  function majPresents(liste) { if (plan) ouvrir(ch, e, lieu, liste, true); }
  function redimensionner() {
    const r = canvas.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    canvas.style.width = `${r.width}px`; canvas.style.height = `${r.height}px`;
    lum.width = canvas.width; lum.height = canvas.height;
    if (!plan) return;
    const W = plan.carte[0].length, H = plan.carte.length;
    const tout = Math.min(canvas.width / W, canvas.height / H);         // tout le plan à l'écran
    const proche = Math.min(canvas.width / 17, canvas.height / 10.5);    // la caméra rapprochée
    t = Math.max(tout, Math.min(proche, tout * 1.45));
  }
  addEventListener('resize', redimensionner);

  // ----- monde ↔ écran -----
  const ecranX = (x) => (x - cam.x) * t + canvas.width / 2, ecranY = (y) => (y - cam.y) * t + canvas.height / 2;
  function majCamera(dt) {
    const W = plan.carte[0].length, H = plan.carte.length, vw = canvas.width / t, vh = canvas.height / t;
    const bx = W <= vw ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, joueur.x)), by = H <= vh ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, joueur.y));
    const k = Math.min(1, dt * 6); cam.x += (bx - cam.x) * k; cam.y += (by - cam.y) * k;
  }

  // ----- interactions -----
  function choses() {
    const l = [];
    for (const o of plan.objets) l.push({ type: 'objet', id: o.id, nom: o.nom, x: o.x, y: o.y, l: o.l, h: o.h, o });
    for (const [k, [x, y]] of Object.entries(positions)) if (presents.includes(k)) l.push({ type: 'pnj', id: k, nom: ch.personnages[k]?.nom || k, x, y, l: 1, h: 1 });
    return l;
  }
  const distRect = (c, px, py) => Math.hypot(Math.max(c.x - px, 0, px - (c.x + c.l)), Math.max(c.y - py, 0, py - (c.y + c.h)));
  function plusProche() { let best = null, d0 = PORTEE; for (const c of choses()) { const d = distRect(c, joueur.x, joueur.y); if (d < d0) { d0 = d; best = c; } } return best; }
  function agir(c = plusProche()) {
    if (!c || !actif) return;
    chemin = []; viser = null; touches.clear(); joueur.marche = false;
    const dx = c.x + c.l / 2 - joueur.x, dy = c.y + c.h / 2 - joueur.y;
    joueur.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut';
    if (c.type === 'objet') rappels.examiner(c.id); else rappels.parler(c.id);
  }
  function bloque(x, y) { const r = 0.28; for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!libre(Math.floor(x + dx), Math.floor(y + dy))) return true; return false; }
  function bouger(dx, dy, dt) {
    const n = Math.hypot(dx, dy); if (!n) return;
    const v = (VITESSE * dt) / n, nx = joueur.x + dx * v, ny = joueur.y + dy * v;
    if (!bloque(nx, joueur.y)) joueur.x = nx;
    if (!bloque(joueur.x, ny)) joueur.y = ny;
    joueur.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut';
  }
  function cheminVers(but) {
    const sx = Math.floor(joueur.x), sy = Math.floor(joueur.y);
    const fini = (x, y) => (but.c ? distRect(but.c, x + 0.5, y + 0.5) < PORTEE - 0.2 : x === but.x && y === but.y);
    const prec = new Map([[`${sx},${sy}`, null]]), file = [[sx, sy]];
    while (file.length) {
      const [x, y] = file.shift();
      if (fini(x, y)) { const res = []; let k = `${x},${y}`; while (k) { const [a, b] = k.split(',').map(Number); res.unshift([a + 0.5, b + 0.5]); k = prec.get(k); } return res.slice(1); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (!prec.has(k) && libre(x + dx, y + dy)) { prec.set(k, `${x},${y}`); file.push([x + dx, y + dy]); } }
    }
    return null;
  }
  function caseDuPoint(ev) { const r = canvas.getBoundingClientRect(), dpr = canvas.width / r.width; return { x: ((ev.clientX - r.left) * dpr - canvas.width / 2) / t + cam.x, y: ((ev.clientY - r.top) * dpr - canvas.height / 2) / t + cam.y }; }
  function choseSous(p) { return choses().find((c) => p.x >= c.x && p.x < c.x + c.l && p.y >= c.y - (c.type === 'pnj' ? 0.6 : 0) && p.y < c.y + c.h) || null; }
  canvas.addEventListener('pointerdown', (ev) => {
    if (!actif || !plan || !rappels.libre()) return;
    const p = caseDuPoint(ev), c = choseSous(p);
    if (c) { if (distRect(c, joueur.x, joueur.y) < PORTEE) { agir(c); return; } const r = cheminVers({ c }); if (r) { chemin = r; viser = c; } else rappels.message?.('Tu ne trouves pas de passage jusque-là.'); return; }
    const r = cheminVers({ x: Math.floor(p.x), y: Math.floor(p.y) }); if (r) { chemin = r; viser = null; }
  });
  canvas.addEventListener('pointermove', (ev) => { if (plan) { survol = choseSous(caseDuPoint(ev)); canvas.style.cursor = survol ? 'pointer' : 'default'; } });
  canvas.addEventListener('pointerleave', () => { survol = null; });
  const DIR = { z: [0, -1], w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], q: [-1, 0], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  addEventListener('keydown', (ev) => {
    if (!actif || ev.target.tagName === 'INPUT' || !rappels.libre()) return;
    const k = ev.key.toLowerCase();
    if (DIR[k]) { touches.add(k); chemin = []; viser = null; ev.preventDefault(); }
    else if (k === 'e' || k === ' ' || k === 'enter') { agir(); ev.preventDefault(); }
  });
  addEventListener('keyup', (ev) => touches.delete(ev.key.toLowerCase()));
  addEventListener('blur', () => touches.clear());

  // ----- dessin de ce qui bouge -----
  function dessinerFeux() {
    for (const l of lumieres) {
      if (!l.feu) continue;
      const o = l.o, x = ecranX(o.x + o.l / 2), y = ecranY(o.y + o.h * (l.feu === 'cheminee' ? 0.55 : 0.45)), s = t * (l.feu === 'cheminee' ? 0.42 : 0.26);
      for (let i = 0; i < 5; i++) {
        const ph = temps * 7 + i * 1.7, fx = x + Math.sin(ph) * s * 0.25 + (i - 2) * s * 0.18, fh = s * (0.7 + Math.sin(ph * 1.3) * 0.25);
        const grd = ctx.createRadialGradient(fx, y, 1, fx, y - fh * 0.3, fh);
        grd.addColorStop(0, 'rgba(255,240,180,.95)'); grd.addColorStop(0.4, 'rgba(255,150,40,.8)'); grd.addColorStop(1, 'rgba(180,40,10,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(fx, y - fh * 0.25, fh * 0.35, fh * 0.6, 0, 0, 7); ctx.fill();
      }
      if (Math.random() < 0.06) fumees.push({ x: o.x + o.l / 2 + (Math.random() - 0.5) * 0.3, y: o.y + o.h * 0.3, vie: 1 });
    }
  }
  function dessinerFumees(dt) {
    fumees = fumees.filter((f) => (f.vie -= dt * 0.35) > 0);
    for (const f of fumees) { f.y -= dt * 0.35; f.x += Math.sin(temps + f.y * 3) * dt * 0.08; ctx.fillStyle = `rgba(160,150,140,${f.vie * 0.18})`; ctx.beginPath(); ctx.arc(ecranX(f.x), ecranY(f.y), t * (0.12 + (1 - f.vie) * 0.3), 0, 7); ctx.fill(); }
  }
  function dessinerPersonnages(proche) {
    const liste = [];
    for (const [k, [x, y]] of Object.entries(positions)) if (presents.includes(k)) liste.push({ k, x: x + 0.5, y: y + 0.5 });
    liste.push({ k: 'joueur', x: joueur.x, y: joueur.y });
    liste.sort((a, b) => a.y - b.y);
    for (const p of liste) {
      const look = LOOKS[p.k] || { manteau: ch.personnages[p.k]?.couleur || '#4a3a2a', tete: 'cheveux', cheveux: '#3a2a1a' };
      let dir = 'bas';
      if (p.k === 'joueur') dir = joueur.dir;
      else { const dx = joueur.x - p.x, dy = joueur.y - p.y; if (Math.hypot(dx, dy) < 4) regards[p.k] = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut'; dir = regards[p.k] || 'bas'; }
      personnage(ctx, ecranX(p.x), ecranY(p.y), t, look, dir, p.k === 'joueur' && joueur.marche, temps, p.k);
    }
  }
  function etiquettes(proche) {
    for (const [k, [x, y]] of Object.entries(positions)) {
      if (!presents.includes(k)) continue;
      const vu = (proche?.type === 'pnj' && proche.id === k) || (survol?.type === 'pnj' && survol.id === k);
      if (!vu) continue;
      const cx = ecranX(x + 0.5), cy = ecranY(y + 0.5) - t * 1.05, r = t * 0.42, img = image(`/enquete/img/portrait_${k}.jpg`);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.closePath(); ctx.fillStyle = '#2a1e14'; ctx.fill(); ctx.clip();
      if (img) ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalWidth, cx - r * 1.1, cy - r * 1.05, r * 2.2, r * 2.2);
      ctx.restore(); ctx.strokeStyle = '#c9a35a'; ctx.lineWidth = Math.max(2, t * 0.05); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      const nom = (ch.personnages[k]?.nom || k).replace(/«.*»/, '').trim();
      ctx.font = `${Math.max(11, t * 0.28)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(nom).width + 12;
      ctx.fillStyle = 'rgba(15,11,8,.85)'; rr(ctx, cx - w / 2, cy + r + 2, w, t * 0.36, 4); ctx.fill();
      ctx.fillStyle = '#ecdcb4'; ctx.fillText(nom, cx, cy + r + 2 + t * 0.18);
    }
  }
  function reperes(proche) {
    for (const c of [proche, survol]) {
      if (!c || c.type !== 'objet') continue;
      const x = ecranX(c.x), y = ecranY(c.y), w = c.l * t, h = c.h * t, a = 0.55 + Math.sin(temps * 4) * 0.25;
      ctx.strokeStyle = `rgba(232,200,122,${a})`; ctx.lineWidth = Math.max(2, t * 0.04); ctx.setLineDash([t * 0.15, t * 0.1]); rr(ctx, x + 2, y + 2, w - 4, h - 4, 6); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const o of plan.objets) if (rappels.dejaVu(o)) { ctx.fillStyle = 'rgba(15,11,8,.7)'; ctx.beginPath(); ctx.arc(ecranX(o.x + o.l) - t * 0.12, ecranY(o.y) + t * 0.12, t * 0.12, 0, 7); ctx.fill(); ctx.fillStyle = '#9ac080'; ctx.font = `${t * 0.18}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', ecranX(o.x + o.l) - t * 0.12, ecranY(o.y) + t * 0.13); }
  }
  // ----- lumière : une nappe d'obscurité percée par les lampes, le feu, les fenêtres -----
  function eclairer() {
    const { h } = heureDe(e.temps), nuit = h >= 21 || h < 6, soir = h >= 18 && !nuit;
    const noir = nuit ? 0.8 : soir ? 0.55 : 0.32;
    lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, lum.width, lum.height);
    lctx.fillStyle = `rgba(6,5,12,${noir})`; lctx.fillRect(0, 0, lum.width, lum.height);
    lctx.globalCompositeOperation = 'destination-out';
    const trou = (x, y, r, force) => { const g = lctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${force})`); g.addColorStop(0.55, `rgba(0,0,0,${force * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 7); lctx.fill(); };
    for (const l of lumieres) { if (l.jour && (nuit || soir)) continue; const f = 1 + Math.sin(temps * 9 + l.x) * l.f + Math.sin(temps * 13.7 + l.y) * l.f * 0.6; trou(ecranX(l.x), ecranY(l.y), l.r * t * f, l.lampe ? 0.75 : 0.95); }
    trou(ecranX(joueur.x), ecranY(joueur.y), t * (nuit ? 3.6 : 2.2), nuit ? 0.95 : 0.5);
    ctx.drawImage(lum, 0, 0);
    // halo chaud par-dessus
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lumieres) { if (l.jour && (nuit || soir)) continue; const f = 1 + Math.sin(temps * 9 + l.x) * l.f; const x = ecranX(l.x), y = ecranY(l.y), r = l.r * t * 0.8 * f; const g = ctx.createRadialGradient(x, y, 0, x, y, r); const [cr, cg, cb] = l.c; g.addColorStop(0, `rgba(${cr},${cg},${cb},${l.feu ? 0.22 : 0.08})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  function dessinerPoussiere(dt) {
    ctx.fillStyle = 'rgba(255,235,190,.35)';
    for (const p of poussiere) { p.x += Math.sin(temps * 0.3 + p.a) * dt * 0.08; p.y -= p.v * dt; if (p.y < 0) p.y = plan.carte.length; const x = ecranX(p.x), y = ecranY(p.y); if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) continue; ctx.globalAlpha = 0.3 + Math.sin(temps * 2 + p.a) * 0.3; ctx.beginPath(); ctx.arc(x, y, Math.max(1, t * 0.025), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function brume() {
    const { h } = heureDe(e.temps); if (!(h >= 18 || h < 7)) return;
    for (let i = 0; i < 3; i++) { const x = ((temps * 12 * (i + 1) + i * 400) % (canvas.width + 600)) - 300, y = canvas.height * (0.25 + i * 0.25); const g = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * 0.35); g.addColorStop(0, 'rgba(150,150,160,.07)'); g.addColorStop(1, 'rgba(150,150,160,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }
  function vignette() { const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.35, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  function interface_(proche) {
    // le nom de la pièce où l'on entre
    const pc = plan.pieces[car(Math.floor(joueur.x), Math.floor(joueur.y))];
    if (pc && pc !== pieceCourante) { pieceCourante = pc; banniere = { txt: pc.nom, fin: temps + 2.2 }; }
    if (temps < banniere.fin) {
      const a = Math.min(1, (banniere.fin - temps) / 0.6, (temps - banniere.fin + 2.2) / 0.4);
      ctx.globalAlpha = Math.max(0, a); ctx.font = `italic ${Math.max(18, t * 0.5)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(banniere.txt, canvas.width / 2 + 2, t * 0.75 + 2); ctx.fillStyle = '#f0deb0'; ctx.fillText(banniere.txt, canvas.width / 2, t * 0.75);
      ctx.fillStyle = '#c9a35a'; const w = ctx.measureText(banniere.txt).width / 2 + 30; ctx.fillRect(canvas.width / 2 - w, t * 0.75 + t * 0.35, w * 2, 1.5); ctx.globalAlpha = 1;
    }
    const txt = proche ? `${proche.type === 'pnj' ? 'Parler à' : 'Examiner'} : ${proche.nom.replace(/«.*»/, '').trim()}` : survol ? survol.nom.replace(/«.*»/, '').trim() : '';
    if (!txt) return;
    ctx.font = `${Math.max(14, t * 0.32)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const touche = proche ? 'E' : '', w = ctx.measureText(txt).width + (touche ? t * 0.9 : 0) + 34, h = Math.max(34, t * 0.62), x = canvas.width / 2, y = canvas.height - h * 0.9;
    const grd = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); grd.addColorStop(0, '#efe2c4'); grd.addColorStop(1, '#d8c59c');
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, x - w / 2 + 3, y - h / 2 + 4, w, h, 6); ctx.fill();
    ctx.fillStyle = grd; rr(ctx, x - w / 2, y - h / 2, w, h, 6); ctx.fill(); ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2a1a0c'; ctx.fillText(txt, x - (touche ? t * 0.3 : 0), y + 1);
    if (touche) { const kx = x + w / 2 - t * 0.48; ctx.fillStyle = '#2a1a0c'; rr(ctx, kx - h * 0.32, y - h * 0.32, h * 0.64, h * 0.64, 5); ctx.fill(); ctx.fillStyle = '#efe2c4'; ctx.font = `bold ${h * 0.38}px Georgia, serif`; ctx.fillText(touche, kx, y + 1); }
  }

  // ----- boucle -----
  function boucle(ts) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, (ts - dernier) / 1000 || 0); dernier = ts; temps += dt;
    if (!actif || !plan || !canvas.offsetParent) return;
    joueur.marche = false;
    if (rappels.libre()) {
      let dx = 0, dy = 0; for (const k of touches) { dx += DIR[k][0]; dy += DIR[k][1]; }
      if (dx || dy) { bouger(dx, dy, dt); joueur.marche = true; }
      else if (chemin.length) {
        const [tx, ty] = chemin[0], ex = tx - joueur.x, ey = ty - joueur.y, d = Math.hypot(ex, ey);
        if (d < 0.08) { chemin.shift(); if (!chemin.length && viser) { const v = viser; viser = null; agir(v); } }
        else { const pas = Math.min(d, VITESSE * dt); joueur.x += (ex / d) * pas; joueur.y += (ey / d) * pas; joueur.marche = true; joueur.dir = Math.abs(ex) > Math.abs(ey) ? (ex > 0 ? 'droite' : 'gauche') : ey > 0 ? 'bas' : 'haut'; }
      } else if (viser) { const v = viser; viser = null; if (distRect(v, joueur.x, joueur.y) < PORTEE) agir(v); }
    }
    majCamera(dt);
    const proche = rappels.libre() ? plusProche() : null;
    ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fond, ecranX(0), ecranY(0), plan.carte[0].length * t, plan.carte.length * t);
    dessinerFeux(); reperes(proche); dessinerPersonnages(proche); dessinerFumees(dt);
    eclairer(); dessinerPoussiere(dt); brume(); vignette(); etiquettes(proche); interface_(proche);
  }
  requestAnimationFrame(boucle);

  return { ouvrir, fermer, majPresents, redimensionner, get actif() { return actif; }, get lieu() { return lieu; } };
}
