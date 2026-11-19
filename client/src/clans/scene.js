// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la scène des combats
//  • decor(canvas, terr) : un décor en pixel art par territoire (320×180,
//    agrandi sans flou) : volcan et lave, mer et rochers, forêt et brume,
//    ou l'arène de pierre pour les duels.
//  • ambiance(canvas, terr) : les particules qui flottent (braises, bulles,
//    lucioles, poussière).
//  • creerFx(canvas) : impacts, éclats, anneaux, entailles, soins…
// =====================================================================
const W = 320, H = 180, SOL = 112;   // ligne d'horizon du sol
function bruit(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function lisse(x, k = 1) { const i = Math.floor(x), f = x - i, a = bruit(i, k), b = bruit(i + 1, k); return a + (b - a) * (f * f * (3 - 2 * f)); }
const hexa = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

const THEMES = {
  feu: { ciel: ['#1a0604', '#4a1208', '#a8340e', '#f07a2a'], loin: '#2a0c08', milieu: '#1c0806', sol: ['#2a1a16', '#3a2620', '#4a3228'], accent: '#ff8a2a' },
  eau: { ciel: ['#04122a', '#0c2a52', '#1a5a8a', '#5ab0c8'], loin: '#0a2440', milieu: '#14385a', sol: ['#c8b080', '#d8c090', '#b89c6c'], accent: '#bff0ff' },
  plante: { ciel: ['#04120a', '#0c2a16', '#1e4a24', '#7aa850'], loin: '#0a2010', milieu: '#08180c', sol: ['#1e3a1a', '#2a4a20', '#36582a'], accent: '#d8ff8a' },
  arene: { ciel: ['#0e0818', '#2a1838', '#5a2a4a', '#c8644a'], loin: '#1a1020', milieu: '#24182a', sol: ['#6a5848', '#7a6650', '#5a4a3c'], accent: '#ffd870' },
};

// ---------- le décor ----------
export function decor(canvas, terr) {
  const t = THEMES[terr] || THEMES.arene;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const ciel = t.ciel.map(hexa);
  // le ciel : un dégradé en bandes, tramé comme en pixel art
  for (let y = 0; y < SOL; y++) {
    const f = (y / SOL) ** 1.4 * (ciel.length - 1), k = Math.floor(f), r = f - k;
    for (let x = 0; x < W; x++) px(x, y, (r > (((x & 1) + (y & 1) * 2) / 4 + 0.12) ? ciel[Math.min(k + 1, ciel.length - 1)] : ciel[k]));
  }
  // étoiles, soleil voilé ou lune
  for (let i = 0; i < 40; i++) { const x = Math.floor(bruit(i, 3) * W), y = Math.floor(bruit(i, 4) * SOL * 0.45); if (terr !== 'feu' || i % 3 === 0) px(x, y, mix(ciel[0], [255, 255, 255], 0.5 + bruit(i, 5) * 0.4)); }
  const astre = terr === 'feu' ? [255, 150, 70] : terr === 'eau' ? [230, 245, 255] : terr === 'plante' ? [250, 240, 180] : [255, 200, 140];
  const ax = terr === 'eau' ? 250 : 70, ay = 34;
  for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) { const r = Math.hypot(x, y); if (r < 9) px(ax + x, ay + y, mix(astre, [255, 255, 255], 0.25)); else if (r < 14 && bruit(x + 40, y + 40) < (14 - r) / 6) px(ax + x, ay + y, mix(ciel[1], astre, 0.35)); }

  // une silhouette de relief (lisse) entre deux hauteurs
  const relief = (base, ampl, freq, coul, graine, detail = 0) => {
    for (let x = 0; x < W; x++) {
      const h = Math.round(base - lisse(x * freq, graine) * ampl - (detail ? lisse(x * freq * 4, graine + 9) * detail : 0));
      for (let y = Math.max(0, h); y < SOL + 2; y++) px(x, y, coul);
    }
  };
  const loin = hexa(t.loin), milieu = hexa(t.milieu), acc = hexa(t.accent);
  if (terr === 'feu') {
    relief(SOL - 6, 36, 0.02, loin, 1, 6);
    // le volcan, avec sa coulée et sa lueur
    for (let y = 30; y < SOL; y++) { const w = (y - 30) * 0.9 + 6; for (let x = Math.round(220 - w); x <= Math.round(220 + w); x++) px(x, y, mix(milieu, [60, 20, 14], (x + y) % 7 === 0 ? 0.4 : 0)); }
    for (let y = 30; y < SOL; y++) { const x0 = 220 + Math.round(Math.sin(y * 0.25) * 3 + (y - 30) * 0.15); for (let k = -1; k <= 1; k++) px(x0 + k, y, k ? [255, 120, 30] : [255, 210, 90]); }
    for (let y = 18; y < 32; y++) for (let x = 206; x < 236; x++) if (bruit(x, y) < (32 - y) / 22) px(x, y, mix([255, 110, 30], ciel[2], 0.5));
    relief(SOL + 2, 14, 0.05, milieu, 2, 3);
  } else if (terr === 'eau') {
    relief(SOL - 30, 18, 0.03, loin, 3, 4);
    // la mer, avec ses reflets
    for (let y = SOL - 30; y < SOL; y++) for (let x = 0; x < W; x++) {
      const f = (y - (SOL - 30)) / 30, c = mix([20, 70, 120], [30, 110, 160], f);
      const vague = Math.sin(x * 0.18 + y * 1.7) > 0.86 || (Math.abs(x - ax) < 10 - f * 4 && (x + y) % 3 === 0);
      px(x, y, vague ? mix(c, [220, 245, 255], 0.6) : c);
    }
    // une arche de rocher
    for (let y = 48; y < SOL; y++) for (let x = 40; x < 92; x++) { const dx = x - 66, inner = Math.hypot(dx * 1.3, (y - SOL) * 0.9) < 26; if (!inner && Math.abs(dx) < 26 - Math.max(0, 70 - y) * 0.4) px(x, y, mix(milieu, [0, 0, 0], (x + y) % 5 === 0 ? 0.3 : 0)); }
  } else if (terr === 'plante') {
    relief(SOL - 20, 30, 0.025, loin, 4, 8);
    // des troncs et une canopée, en trois plans
    for (const [n, coul, larg, gr] of [[9, mix(loin, milieu, 0.5), 5, 11], [6, milieu, 9, 12]]) for (let i = 0; i < n; i++) {
      const x0 = Math.floor(bruit(i, gr) * W), w = larg + Math.floor(bruit(i, gr + 1) * 4);
      for (let y = 0; y < SOL + 2; y++) for (let x = x0; x < x0 + w; x++) px(x, y, (x - x0 === 1) ? mix(coul, acc, 0.12) : coul);
    }
    for (let x = 0; x < W; x++) { const h = 18 + Math.round(lisse(x * 0.06, 6) * 22); for (let y = 0; y < h; y++) px(x, y, bruit(x, y) < 0.08 ? mix(milieu, acc, 0.3) : milieu); }
    // rayons de lumière à travers les feuilles
    for (let r = 0; r < 4; r++) { const x0 = 60 + r * 70; for (let y = 20; y < SOL; y++) for (let k = 0; k < 6; k++) { const x = x0 + k + Math.floor((y - 20) * 0.5); const i = (y * W + x) * 4; if (x < W && (x + y) % 2 === 0) { d[i] = Math.min(255, d[i] + 22); d[i + 1] = Math.min(255, d[i + 1] + 30); d[i + 2] = Math.min(255, d[i + 2] + 12); } } }
  } else {
    // l'arène : des arcades de pierre
    relief(SOL - 4, 10, 0.03, loin, 7, 3);
    for (let y = 46; y < SOL; y++) for (let x = 0; x < W; x++) {
      const k = x % 40, arche = y > 62 && Math.hypot(k - 20, (y - 62) * 1.1) < 12 && y < 96;
      if (y < 52 || !arche) px(x, y, (y - 46) % 10 === 0 || (k === 0 && y > 52) ? mix(milieu, [0, 0, 0], 0.35) : mix(milieu, [255, 220, 180], 0.08));
      else px(x, y, mix(ciel[1], [0, 0, 0], 0.4));
    }
    for (let i = 0; i < 8; i++) { const x0 = i * 40 + 18; for (let y = 38; y < 46; y++) px(x0 + (y % 2), y, [120, 30, 40]); }
  }
  // le sol : grandes plaques douces (bruit lissé), un peu de tramage, plus sombre vers l'horizon
  const s0 = t.sol.map(hexa);
  for (let y = SOL; y < H; y++) {
    const f = (y - SOL) / (H - SOL), echelle = 0.035 / (0.35 + f);   // les motifs grossissent vers le bas (perspective)
    for (let x = 0; x < W; x++) {
      const u = (x - W / 2) * echelle, n = lisse(u * 3 + 50, Math.floor(y / (2 + f * 6)) + 31) * 0.6 + lisse(u * 9 + 7, Math.floor(y / (1 + f * 3)) + 77) * 0.4;
      let c = n < 0.38 ? s0[0] : n < 0.66 ? s0[1] : s0[2];
      if (((x + y) & 1) && Math.abs(n - 0.38) < 0.03) c = s0[1];
      c = mix(c, [0, 0, 0], (1 - f) * 0.38);
      if (terr === 'feu' && n > 0.8 && bruit(x >> 1, y) > 0.6) c = mix([255, 120, 30], c, 0.25 + f * 0.35);
      if (terr === 'eau' && y < SOL + 5) c = (x + y * 3) % 9 < 4 ? [235, 248, 255] : mix(c, [190, 230, 240], 0.4);
      if (terr === 'plante' && n > 0.82 && (x & 1)) c = mix(c, acc, 0.35);
      px(x, y, c);
    }
  }
  g.putImageData(img, 0, 0);
  // quelques touffes et pierres au premier plan
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(bruit(i, 21) * W), y = SOL + 8 + Math.floor(bruit(i, 22) * (H - SOL - 10));
    g.fillStyle = terr === 'plante' ? '#4a8a2a' : terr === 'eau' ? '#a08a5a' : terr === 'feu' ? '#1a0e0a' : '#4a3c30';
    g.fillRect(x, y, 2 + (i % 3), 1); g.fillRect(x + 1, y - 1, 1, 1);
  }
}

// ---------- l'ambiance : les particules qui flottent ----------
export function ambiance(canvas, terr) {
  const ctx = canvas.getContext('2d'), petit = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
  let parts = [], raf = 0, dernier = performance.now(), vivant = true;
  const N = petit ? 26 : 60;
  const nouv = (debut) => {
    const w = canvas.width, h = canvas.height, s = Math.min(2, devicePixelRatio || 1);
    const p = { x: Math.random() * w, y: debut ? Math.random() * h : h + 10, a: Math.random() * 6.28, v: 0.2 + Math.random() * 0.8, t: (1 + Math.random() * 2) * s };
    if (terr === 'plante' && Math.random() < 0.3) { p.feuille = true; p.y = debut ? Math.random() * h : -10; }
    return p;
  };
  const redim = () => { const s = Math.min(2, devicePixelRatio || 1); canvas.width = innerWidth * s; canvas.height = innerHeight * s; };
  redim(); addEventListener('resize', redim);
  for (let i = 0; i < N; i++) parts.push(nouv(true));
  const boucle = (n) => {
    if (!vivant) return;
    const dt = Math.min(0.05, (n - dernier) / 1000); dernier = n;
    const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.a += dt;
      if (terr === 'feu') { p.y -= p.v * 60 * dt; p.x += Math.sin(p.a * 2) * 20 * dt; ctx.fillStyle = `rgba(255,${130 + Math.floor(p.v * 100)},40,${0.5 + Math.sin(p.a * 6) * 0.4})`; }
      else if (terr === 'eau') { p.y -= p.v * 35 * dt; p.x += Math.sin(p.a * 1.5) * 10 * dt; ctx.strokeStyle = 'rgba(210,240,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.t * 1.6, 0, 6.28); ctx.stroke(); }
      else if (terr === 'plante') {
        if (p.feuille) { p.y += p.v * 30 * dt; p.x += Math.sin(p.a * 1.2) * 30 * dt; ctx.fillStyle = 'rgba(140,200,80,.75)'; }
        else { p.y -= p.v * 10 * dt; p.x += Math.sin(p.a) * 18 * dt; ctx.fillStyle = `rgba(230,255,140,${0.35 + Math.sin(p.a * 3) * 0.35})`; }
      } else { p.y -= p.v * 8 * dt; p.x += Math.sin(p.a) * 12 * dt; ctx.fillStyle = 'rgba(255,230,190,.35)'; }
      if (terr !== 'eau') ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.t), Math.ceil(p.t));
      if (p.y < -20 || p.y > h + 20) Object.assign(p, nouv(false));
    }
    raf = requestAnimationFrame(boucle);
  };
  raf = requestAnimationFrame(boucle);
  return { arreter() { vivant = false; cancelAnimationFrame(raf); removeEventListener('resize', redim); ctx.clearRect(0, 0, canvas.width, canvas.height); } };
}

// ---------- les effets : impacts, éclats, anneaux, entailles ----------
export const PALETTES = {
  feu: ['#fff2b0', '#ffb040', '#ff6a2a', '#d8341a'], eau: ['#ffffff', '#bfeaff', '#5ab8ff', '#2a7ae0'],
  plante: ['#f4ffc0', '#a8f070', '#5ac84a', '#2a8a3a'], neutre: ['#ffffff', '#f0e6d0', '#c8bca8', '#8a8070'],
  bloc: ['#ffffff', '#c8e8ff', '#6ab0ff'], soin: ['#ffffff', '#b0ffb8', '#4ad86a'], mal: ['#ffffff', '#ff9a8a', '#e8402a'],
  or: ['#fff6c0', '#ffd870', '#e8a830'], mort: ['#ffffff', '#d0c0ff', '#8a6ad8', '#3a2a6a'],
};
export function creerFx(canvas) {
  const ctx = canvas.getContext('2d');
  let items = [], raf = 0, dernier = 0;
  const s = () => Math.min(2, devicePixelRatio || 1);
  const redim = () => { canvas.width = innerWidth * s(); canvas.height = innerHeight * s(); };
  redim(); addEventListener('resize', redim);
  const lancer = () => { if (!raf) { dernier = performance.now(); raf = requestAnimationFrame(boucle); } };
  function boucle(n) {
    const dt = Math.min(0.05, (n - dernier) / 1000); dernier = n;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    items = items.filter((it) => (it.t += dt) < it.vie);
    for (const it of items) {
      const k = it.t / it.vie;
      if (it.type === 'p') {
        it.vx *= 1 - it.frein * dt; it.vy = it.vy * (1 - it.frein * dt) + it.g * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        ctx.globalAlpha = 1 - k * k; ctx.fillStyle = it.c; const z = Math.max(1, it.taille * (1 - k * 0.6)); ctx.fillRect(Math.round(it.x - z / 2), Math.round(it.y - z / 2), Math.ceil(z), Math.ceil(z));
      } else if (it.type === 'anneau') {
        ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = it.c; ctx.lineWidth = it.ep * (1 - k) + 1; ctx.beginPath(); ctx.arc(it.x, it.y, it.r0 + (it.r1 - it.r0) * (1 - (1 - k) ** 3), 0, 6.283); ctx.stroke();
      } else if (it.type === 'entaille') {
        ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
        for (let i = 0; i < it.n; i++) {
          const dec = (i - (it.n - 1) / 2) * 16 * s(), long = it.l * Math.min(1, k * 5);
          const cx = it.x + Math.cos(it.a + 1.57) * dec, cy = it.y + Math.sin(it.a + 1.57) * dec;
          ctx.strokeStyle = it.c; ctx.lineWidth = (7 - i * 1.2) * s() * (1 - k);
          ctx.beginPath(); ctx.moveTo(cx - Math.cos(it.a) * long / 2, cy - Math.sin(it.a) * long / 2); ctx.lineTo(cx + Math.cos(it.a) * long / 2, cy + Math.sin(it.a) * long / 2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, (2.5 - i * 0.5) * s() * (1 - k)); ctx.stroke();
        }
      } else if (it.type === 'eclair') {
        ctx.globalAlpha = (1 - k) * 0.85; const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r); g.addColorStop(0, it.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(it.x - it.r, it.y - it.r, it.r * 2, it.r * 2);
      }
    }
    ctx.globalAlpha = 1;
    raf = items.length ? requestAnimationFrame(boucle) : 0;
    if (!raf) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  // coordonnées en pixels CSS (comme getBoundingClientRect)
  const P = (x) => x * s();
  return {
    eclats(x, y, pal, n = 24, { vitesse = 260, g = 300, taille = 4, vie = 0.8, frein = 2.2, angle = null, ecart = 6.283 } = {}) {
      for (let i = 0; i < n; i++) {
        const a = angle === null ? Math.random() * 6.283 : angle + (Math.random() - 0.5) * ecart, v = vitesse * (0.3 + Math.random() * 0.9) * s();
        items.push({ type: 'p', x: P(x), y: P(y), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: g * s(), frein, taille: taille * s() * (0.6 + Math.random() * 0.8), c: pal[Math.floor(Math.random() * pal.length)], t: 0, vie: vie * (0.6 + Math.random() * 0.6) });
      }
      lancer();
    },
    monte(x, y, pal, n = 18, larg = 60) { for (let i = 0; i < n; i++) items.push({ type: 'p', x: P(x + (Math.random() - 0.5) * larg), y: P(y + Math.random() * 30), vx: 0, vy: -(40 + Math.random() * 90) * s(), g: 0, frein: 0.5, taille: (2 + Math.random() * 3) * s(), c: pal[Math.floor(Math.random() * pal.length)], t: 0, vie: 0.9 + Math.random() * 0.5 }); lancer(); },
    anneau(x, y, c, r1 = 80, { r0 = 10, ep = 6, vie = 0.5 } = {}) { items.push({ type: 'anneau', x: P(x), y: P(y), r0: P(r0), r1: P(r1), ep: P(ep), c, t: 0, vie }); lancer(); },
    entaille(x, y, c, { a = -0.7, l = 150, n = 3, vie = 0.35 } = {}) { items.push({ type: 'entaille', x: P(x), y: P(y), a, l: P(l), n, c, t: 0, vie }); lancer(); },
    eclair(x, y, c, r = 120, vie = 0.35) { items.push({ type: 'eclair', x: P(x), y: P(y), r: P(r), c, t: 0, vie }); lancer(); },
    vider() { items = []; },
  };
}
