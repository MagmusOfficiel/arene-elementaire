// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la carte du monde, vue de dessus
//  Trois territoires (Feu au sud-ouest, Eau au nord, Plante au sud-est)
//  autour du Carrefour où se dresse l'Autel des tirages. Chaque
//  territoire a son village et son portail d'expédition.
//  Le décor est peint une fois (image cachée), puis on dessine par-dessus
//  les joueurs, les lueurs et les effets animés. La caméra suit le joueur.
// =====================================================================
export const MONDE = { l: 1600, h: 1000 };
export const CENTRES = { feu: [330, 760], eau: [800, 190], plante: [1270, 760] };
export const CARREFOUR = [800, 540];
export const LIEUX = [
  { id: 'autel', nom: 'Autel des tirages', x: 800, y: 540, r: 44, action: 'tirage' },
  { id: 'portail_feu', nom: 'Portail des Terres de Braise', x: 150, y: 880, r: 40, action: 'expedition', terr: 'feu' },
  { id: 'portail_eau', nom: "Portail des Lagons d'Azur", x: 800, y: 60, r: 40, action: 'expedition', terr: 'eau' },
  { id: 'portail_plante', nom: "Portail de la Sylve d'Émeraude", x: 1450, y: 880, r: 40, action: 'expedition', terr: 'plante' },
];
const NOMS_TERR = { feu: 'Terres de Braise', eau: "Lagons d'Azur", plante: "Sylve d'Émeraude" };
const COUL = { feu: '#e0552a', eau: '#2a8ae0', plante: '#3aa84a' };
const alea = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function bruit(x, y) { return Math.sin(x * 0.013 + Math.sin(y * 0.021) * 2) * 0.5 + Math.sin(y * 0.017 + Math.cos(x * 0.011) * 2) * 0.5; }

// à quel territoire appartient un point (null : le Carrefour, neutre)
export function territoireDe(x, y) {
  if (Math.hypot(x - CARREFOUR[0], y - CARREFOUR[1]) < 150 + bruit(x, y) * 15) return null;
  let best = null, d0 = Infinity;
  for (const [k, [cx, cy]] of Object.entries(CENTRES)) { const d = Math.hypot(x - cx, y - cy) * (1 + bruit(x + cx, y) * 0.06); if (d < d0) { d0 = d; best = k; } }
  return best;
}
// maisons de chaque village (une par case ; la tienne est choisie selon ton nom)
export const MAISONS = Object.fromEntries(Object.entries(CENTRES).map(([k, [cx, cy]]) => [k, Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.3; return { x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 78 }; })]));
export const maisonDe = (clan, nom) => MAISONS[clan][[...nom].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8];

// les obstacles (arbres, rochers, bassins) : des cercles qu'on ne traverse pas
function obstacles() {
  const l = [];
  for (let i = 0; i < 260; i++) {
    const x = alea(i) * MONDE.l, y = alea(i + 500) * MONDE.h, t = territoireDe(x, y);
    if (!t) continue;
    const [cx, cy] = CENTRES[t];
    if (Math.hypot(x - cx, y - cy) < 175) continue;                      // pas dans les villages
    if (LIEUX.some((p) => Math.hypot(x - p.x, y - p.y) < 90)) continue;
    if (Math.abs(x - y * 0.0) < 0 ) continue;
    if (chemin(x, y)) continue;
    const r = 10 + alea(i + 9) * 16;
    l.push({ x, y, r, t, type: t === 'plante' ? 'arbre' : t === 'feu' ? (alea(i + 3) < 0.4 ? 'lave' : 'rocher') : alea(i + 3) < 0.5 ? 'bassin' : 'palmier' });
  }
  return l;
}
// les chemins de terre : du Carrefour vers chaque village et chaque portail
const SEGMENTS = [[CARREFOUR, CENTRES.feu], [CARREFOUR, CENTRES.eau], [CARREFOUR, CENTRES.plante], [CENTRES.feu, [150, 880]], [CENTRES.eau, [800, 60]], [CENTRES.plante, [1450, 880]]];
function distSeg(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
const chemin = (x, y) => SEGMENTS.some((s) => distSeg(x, y, ...s) < 26);

function peindre(obs) {
  const c = document.createElement('canvas'); c.width = MONDE.l; c.height = MONDE.h;
  const g = c.getContext('2d'), img = g.createImageData(MONDE.l, MONDE.h), d = img.data;
  for (let y = 0; y < MONDE.h; y++) for (let x = 0; x < MONDE.l; x++) {
    const t = territoireDe(x, y), n = bruit(x * 3, y * 3) * 0.5 + alea(x * 7 + y * 13) * 0.25, i = (y * MONDE.l + x) * 4;
    let r, gg, b;
    if (!t) { r = 120; gg = 112; b = 96; }
    else if (t === 'feu') { r = 70 + n * 30; gg = 34 + n * 12; b = 22 + n * 8; }
    else if (t === 'eau') { const eauProfonde = bruit(x * 1.4, y * 1.4) > 0.35 && Math.hypot(x - 800, y - 190) > 150; if (eauProfonde) { r = 30; gg = 90 + n * 30; b = 150 + n * 30; } else { r = 200 + n * 25; gg = 180 + n * 20; b = 120 + n * 15; } }
    else { r = 34 + n * 20; gg = 82 + n * 30; b = 36 + n * 12; }
    if (chemin(x, y)) { r = r * 0.4 + 140 * 0.6; gg = gg * 0.4 + 112 * 0.6; b = b * 0.4 + 76 * 0.6; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // fissures de lave
  g.strokeStyle = 'rgba(255,120,30,.55)'; g.lineWidth = 2;
  for (let k = 0; k < 70; k++) { let x = alea(k * 3) * MONDE.l, y = alea(k * 5 + 1) * MONDE.h; if (territoireDe(x, y) !== 'feu') continue; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (alea(k * 11 + s) - 0.5) * 40; y += (alea(k * 13 + s) - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  // vaguelettes
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5;
  for (let k = 0; k < 160; k++) { const x = alea(k * 7) * MONDE.l, y = alea(k * 9 + 2) * MONDE.h; if (territoireDe(x, y) !== 'eau') continue; g.beginPath(); g.arc(x, y, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  // herbes et fleurs
  for (let k = 0; k < 900; k++) { const x = alea(k * 17) * MONDE.l, y = alea(k * 19 + 3) * MONDE.h, t = territoireDe(x, y); if (t === 'plante' || (!t && k % 3 === 0)) { g.fillStyle = k % 7 ? 'rgba(120,200,90,.35)' : ['#e8d050', '#e86a8a', '#fff'][k % 3]; g.fillRect(x, y, 2, k % 7 ? 5 : 3); } }
  // le Carrefour : place pavée
  const [cx, cy] = CARREFOUR;
  g.fillStyle = '#7a7266'; g.beginPath(); g.arc(cx, cy, 110, 0, 7); g.fill();
  for (let a = 0; a < 3; a++) { g.strokeStyle = 'rgba(40,36,30,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 30 + a * 28, 0, 7); g.stroke(); }
  for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(cx + Math.cos(a / 16 * 6.283) * 30, cy + Math.sin(a / 16 * 6.283) * 30); g.lineTo(cx + Math.cos(a / 16 * 6.283) * 110, cy + Math.sin(a / 16 * 6.283) * 110); g.stroke(); }
  // les trois bannières autour de l'autel
  Object.entries(COUL).forEach(([k, col], i) => { const a = -Math.PI / 2 + (i - 1) * 2.094 + Math.PI; const x = cx + Math.cos(a) * 92, y = cy + Math.sin(a) * 92; g.fillStyle = '#3a2a1a'; g.fillRect(x - 2, y - 30, 4, 32); g.fillStyle = col; g.beginPath(); g.moveTo(x + 2, y - 30); g.lineTo(x + 22, y - 24); g.lineTo(x + 2, y - 16); g.fill(); });
  // les villages : place centrale et maisons
  for (const [k, [vx, vy]] of Object.entries(CENTRES)) {
    g.fillStyle = k === 'feu' ? 'rgba(40,20,14,.6)' : k === 'eau' ? 'rgba(220,205,160,.7)' : 'rgba(30,60,26,.5)';
    g.beginPath(); g.ellipse(vx, vy, 170, 112, 0, 0, 7); g.fill();
    for (const m of MAISONS[k]) maison(g, m.x, m.y, k);
    g.font = 'bold 16px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText(NOMS_TERR[k], vx + 1, vy + 6); g.fillStyle = '#f8ecd0'; g.fillText(NOMS_TERR[k], vx, vy + 5);
  }
  for (const o of obs) decor(g, o);
  return c;
}
function maison(g, x, y, k) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 20, y - 8, 44, 30);
  g.fillStyle = k === 'feu' ? '#5a3020' : k === 'eau' ? '#e8e0c8' : '#7a5a34'; g.fillRect(x - 22, y - 12, 44, 28);
  g.fillStyle = k === 'feu' ? '#a02a14' : k === 'eau' ? '#2a6ab0' : '#3a7a2a';
  g.beginPath(); g.moveTo(x - 27, y - 10); g.lineTo(x, y - 34); g.lineTo(x + 27, y - 10); g.fill();
  g.fillStyle = '#2a1a0e'; g.fillRect(x - 5, y + 2, 10, 14);
  g.fillStyle = 'rgba(255,220,140,.8)'; g.fillRect(x - 17, y - 4, 7, 7); g.fillRect(x + 10, y - 4, 7, 7);
}
function decor(g, o) {
  const { x, y, r } = o;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 4, y + r * 0.6, r, r * 0.5, 0, 0, 7); g.fill();
  if (o.type === 'arbre') { g.fillStyle = '#4a2e16'; g.fillRect(x - 3, y, 6, r * 0.6); [[0, -r * 0.3, r], [-r * 0.5, 0, r * 0.7], [r * 0.5, 0, r * 0.7]].forEach(([dx, dy, rr], k) => { g.fillStyle = k ? '#1e5a22' : '#2a7a2e'; g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.6, r * 0.4, 0, 7); g.fill(); }
  else if (o.type === 'rocher') { g.fillStyle = '#3a302a'; g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0.3, 0, 7); g.fill(); g.fillStyle = '#5a4a40'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.2, r * 0.6, r * 0.4, 0.3, 0, 7); g.fill(); }
  else if (o.type === 'lave') { g.fillStyle = '#2a1008'; g.beginPath(); g.arc(x, y, r + 3, 0, 7); g.fill(); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#ffd060'); gr.addColorStop(0.5, '#ff6a10'); gr.addColorStop(1, '#a01a08'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  else if (o.type === 'bassin') { g.fillStyle = '#c8b880'; g.beginPath(); g.arc(x, y, r + 3, 0, 7); g.fill(); g.fillStyle = '#2a7ac8'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 7); g.fill(); }
  else { g.fillStyle = '#6a4a24'; g.fillRect(x - 2, y - r * 0.2, 4, r); g.fillStyle = '#3aa040'; for (let a = 0; a < 6; a++) { g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.5, y - r * 0.2 + Math.sin(a) * r * 0.35, r * 0.55, r * 0.18, a, 0, 7); g.fill(); } }
}

// ---------- un personnage vu de dessus ----------
function personnage(g, x, y, clan, dir, marche, t, moi) {
  const col = COUL[clan] || '#888', b = marche ? Math.abs(Math.sin(t * 10)) * 2 : 0;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + 10, 10, 4, 0, 0, 7); g.fill();
  if (moi) { g.strokeStyle = 'rgba(255,230,140,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + 10, 14, 6, 0, 0, 7); g.stroke(); }
  g.fillStyle = '#1a1410'; const p = marche ? Math.sin(t * 10) * 3 : 0; g.fillRect(x - 5, y + 2 + p, 4, 7); g.fillRect(x + 1, y + 2 - p, 4, 7);
  g.fillStyle = col; g.beginPath(); g.moveTo(x - 9, y - 6 - b); g.lineTo(x + 9, y - 6 - b); g.lineTo(x + 10, y + 6 - b); g.lineTo(x - 10, y + 6 - b); g.fill();
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 1, y - 6 - b, 2, 12);
  g.fillStyle = '#e8c098'; g.beginPath(); g.arc(x, y - 12 - b, 6, 0, 7); g.fill();
  g.fillStyle = clan === 'feu' ? '#8a2a10' : clan === 'eau' ? '#1a4a8a' : '#2a5a1a';
  g.beginPath(); g.arc(x, y - 14 - b, 6.5, Math.PI, 0); g.fill();
  if (dir !== 'haut') { g.fillStyle = '#1a1010'; g.fillRect(x - 3 + (dir === 'droite' ? 2 : dir === 'gauche' ? -2 : 0), y - 13 - b, 1.6, 1.6); g.fillRect(x + 1.5 + (dir === 'droite' ? 2 : dir === 'gauche' ? -2 : 0), y - 13 - b, 1.6, 1.6); }
}

export function creerMonde(canvas, rappels) {
  const ctx = canvas.getContext('2d');
  const obs = obstacles();
  let fond = null, joueur = { x: 0, y: 0, dir: 'bas', marche: false }, cam = { x: 0, y: 0 }, z = 1, temps = 0, dernier = 0, but = null, actif = false;
  const autres = new Map();   // id -> { nom, clan, x, y, vx, vy, dir, statut, niv }
  const touches = new Set();
  let monClan = 'feu', monNom = '';

  function demarrer(clan, nom) { monClan = clan; monNom = nom; if (!fond) fond = peindre(obs); const m = maisonDe(clan, nom); joueur.x = m.x; joueur.y = m.y + 34; cam = { x: joueur.x, y: joueur.y }; actif = true; redim(); }
  function redim() { const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; z = Math.max(canvas.width / 1100, canvas.height / 700); }
  addEventListener('resize', redim);
  const ex = (x) => (x - cam.x) * z + canvas.width / 2, ey = (y) => (y - cam.y) * z + canvas.height / 2;

  function bloque(x, y) {
    if (x < 10 || y < 10 || x > MONDE.l - 10 || y > MONDE.h - 10) return true;
    for (const o of obs) if (Math.hypot(x - o.x, y - o.y) < o.r + 6) return true;
    for (const k of Object.keys(MAISONS)) for (const m of MAISONS[k]) if (Math.abs(x - m.x) < 24 && y > m.y - 20 && y < m.y + 16) return true;
    return false;
  }
  function lieuProche() {
    let best = null, d0 = Infinity;
    for (const p of LIEUX) { const d = Math.hypot(joueur.x - p.x, joueur.y - p.y); if (d < p.r + 30 && d < d0) { d0 = d; best = p; } }
    const m = maisonDe(monClan, monNom);
    if (Math.hypot(joueur.x - m.x, joueur.y - m.y) < 60) best = { id: 'maison', nom: 'Ta maison', action: 'parcelle' };
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
    const r = canvas.getBoundingClientRect(), dpr = canvas.width / r.width;
    const x = ((e.clientX - r.left) * dpr - canvas.width / 2) / z + cam.x, y = ((e.clientY - r.top) * dpr - canvas.height / 2) / z + cam.y;
    const l = [...LIEUX, { ...maisonDe(monClan, monNom), r: 30, id: 'maison', nom: 'Ta maison', action: 'parcelle' }].find((p) => Math.hypot(x - p.x, y - p.y) < p.r + 10);
    but = { x, y, lieu: l || null };
  });

  function majAutres(liste, monId) {
    const vus = new Set();
    for (const [id, nom, clan, x, y, dir, statut, niv] of liste) {
      if (id === monId) continue; vus.add(id);
      const a = autres.get(id);
      if (!a) autres.set(id, { nom, clan, x, y, tx: x, ty: y, dir, statut, niv });
      else Object.assign(a, { nom, clan, tx: x, ty: y, dir, statut, niv });
    }
    for (const id of [...autres.keys()]) if (!vus.has(id)) autres.delete(id);
  }

  function boucle(ts) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, (ts - dernier) / 1000 || 0); dernier = ts; temps += dt;
    if (!actif || !canvas.offsetParent) return;
    // déplacement
    let dx = 0, dy = 0;
    if (rappels.libre()) {
      for (const k of touches) { dx += DIR[k][0]; dy += DIR[k][1]; }
      if (!dx && !dy && but) { const vx = but.x - joueur.x, vy = but.y - joueur.y, d = Math.hypot(vx, vy); if (d < 8 || (but.lieu && Math.hypot(joueur.x - but.lieu.x, joueur.y - but.lieu.y) < but.lieu.r + 25)) { const l = but.lieu; but = null; if (l) rappels.agir(l); } else { dx = vx / d; dy = vy / d; } }
    }
    joueur.marche = !!(dx || dy);
    if (joueur.marche) {
      const n = Math.hypot(dx, dy), v = 170 * dt;
      const nx = joueur.x + (dx / n) * v, ny = joueur.y + (dy / n) * v;
      if (!bloque(nx, joueur.y)) joueur.x = nx; if (!bloque(joueur.x, ny)) joueur.y = ny;
      if (but && bloque(nx, ny) && bloque(joueur.x + (dx / n) * v, joueur.y)) but = null;
      joueur.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut';
    }
    rappels.position?.(joueur);
    // caméra
    const vw = canvas.width / z / 2, vh = canvas.height / z / 2;
    const bx = Math.max(vw, Math.min(MONDE.l - vw, joueur.x)), by = Math.max(vh, Math.min(MONDE.h - vh, joueur.y));
    cam.x += (bx - cam.x) * Math.min(1, dt * 6); cam.y += (by - cam.y) * Math.min(1, dt * 6);
    // dessin
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fond, ex(0), ey(0), MONDE.l * z, MONDE.h * z);
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    dessinerLieux();
    const ma = maisonDe(monClan, monNom);
    ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★ Ta maison', ma.x, ma.y - 40 + Math.sin(temps * 3) * 2);
    const gens = [...autres.values()].map((a) => { a.x += (a.tx - a.x) * Math.min(1, dt * 10); a.y += (a.ty - a.y) * Math.min(1, dt * 10); return { ...a, marche: Math.hypot(a.tx - a.x, a.ty - a.y) > 1 }; });
    gens.push({ ...joueur, clan: monClan, nom: monNom, moi: true });
    gens.sort((a, b) => a.y - b.y);
    for (const p of gens) {
      personnage(ctx, p.x, p.y, p.clan, ['bas', 'haut', 'gauche', 'droite'][p.dir] || p.dir, p.marche, temps + p.x, p.moi);
      ctx.font = `${p.moi ? 'bold ' : ''}10px sans-serif`; ctx.textAlign = 'center';
      const txt = `${p.nom}${p.niv ? ` · ${p.niv}` : ''}${p.statut === 'expedition' ? ' ⚔️' : ''}`, w = ctx.measureText(txt).width + 8;
      ctx.fillStyle = 'rgba(8,6,12,.7)'; ctx.fillRect(p.x - w / 2, p.y - 34, w, 13);
      ctx.fillStyle = COUL[p.clan]; ctx.fillRect(p.x - w / 2, p.y - 34, 2, 13);
      ctx.fillStyle = '#f0e6d0'; ctx.fillText(txt, p.x, p.y - 24);
    }
    // braises et lucioles
    for (let i = 0; i < 40; i++) {
      const bxp = (alea(i) * MONDE.l + Math.sin(temps * 0.5 + i) * 20), byp = ((alea(i + 40) * MONDE.h - temps * (10 + i % 7)) % MONDE.h + MONDE.h) % MONDE.h, t = territoireDe(bxp, byp);
      if (t === 'feu') { ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},40,${0.5 + Math.sin(temps * 4 + i) * 0.3})`; ctx.fillRect(bxp, byp, 2, 2); }
      else if (t === 'plante') { ctx.fillStyle = `rgba(220,255,140,${0.4 + Math.sin(temps * 3 + i) * 0.4})`; ctx.beginPath(); ctx.arc(bxp, (byp + temps * 12 * (1 + i % 7)) % MONDE.h, 1.6, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    // vignettage et aide
    const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.35, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const l = rappels.libre() && lieuProche();
    if (l) {
      const txt = `E : ${l.action === 'tirage' ? 'faire des tirages' : l.action === 'expedition' ? 'partir en expédition' : 'entrer dans ta maison'} — ${l.nom}`;
      ctx.font = `${Math.round(15 * Math.min(2, devicePixelRatio || 1))}px sans-serif`; ctx.textAlign = 'center';
      const w = ctx.measureText(txt).width + 30, h = 34 * Math.min(2, devicePixelRatio || 1), y = canvas.height * 0.78;
      ctx.fillStyle = 'rgba(8,6,12,.88)'; ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(canvas.width / 2 - w / 2, y - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe8a8'; ctx.textBaseline = 'middle'; ctx.fillText(txt, canvas.width / 2, y + 1); ctx.textBaseline = 'alphabetic';
    }
    miniCarte(gens);
  }
  function dessinerLieux() {
    for (const p of LIEUX) {
      if (p.action === 'tirage') {
        const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70); gl.addColorStop(0, `rgba(255,220,120,${0.45 + Math.sin(temps * 2) * 0.15})`); gl.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, 70, 0, 7); ctx.fill();
        ctx.fillStyle = '#4a4238'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 30, 14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a6052'; ctx.fillRect(p.x - 16, p.y - 6, 32, 16);
        const h = Math.sin(temps * 2) * 4;
        ctx.save(); ctx.translate(p.x, p.y - 26 + h); ctx.rotate(temps * 0.5);
        ['#ff7a3a', '#3a9aff', '#5ad06a'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14, i * 2.094, (i + 1) * 2.094); ctx.fill(); });
        ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y - 26 + h, 5, 0, 7); ctx.fill();
      } else {
        const col = COUL[p.terr];
        for (let k = 0; k < 3; k++) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + Math.sin(temps * 3 + k) * 0.3; ctx.lineWidth = 4 - k; ctx.beginPath(); ctx.ellipse(p.x, p.y, 26 - k * 7, 34 - k * 9, 0, temps * (k + 1), temps * (k + 1) + 5); ctx.stroke(); }
        ctx.globalAlpha = 1; const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30); gl.addColorStop(0, '#fff'); gl.addColorStop(0.3, col); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 28, 0, 0, 7); ctx.fill();
      }
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(p.nom, p.x + 1, p.y + p.r + 12); ctx.fillStyle = '#ffe8b0'; ctx.fillText(p.nom, p.x, p.y + p.r + 11);
    }
  }
  function miniCarte(gens) {
    const s = Math.min(2, devicePixelRatio || 1), w = 180 * s, h = w * (MONDE.h / MONDE.l), x0 = canvas.width - w - 12 * s, y0 = canvas.height - h - 40 * s;
    ctx.globalAlpha = 0.9; ctx.drawImage(fond, x0, y0, w, h); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h);
    for (const p of LIEUX) { ctx.fillStyle = p.action === 'tirage' ? '#ffe070' : COUL[p.terr]; ctx.beginPath(); ctx.arc(x0 + (p.x / MONDE.l) * w, y0 + (p.y / MONDE.h) * h, 3 * s, 0, 7); ctx.fill(); }
    for (const p of gens) { ctx.fillStyle = p.moi ? '#fff' : COUL[p.clan]; ctx.beginPath(); ctx.arc(x0 + (p.x / MONDE.l) * w, y0 + (p.y / MONDE.h) * h, (p.moi ? 3.5 : 2.5) * s, 0, 7); ctx.fill(); }
  }
  requestAnimationFrame(boucle);
  return { demarrer, majAutres, get joueur() { return joueur; }, territoire: () => territoireDe(joueur.x, joueur.y), arreter: () => { touches.clear(); but = null; } };
}
