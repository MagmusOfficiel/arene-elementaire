// =====================================================================
//  ANIMATION SQUELETTIQUE LÉGÈRE DES CHAMPIONS
//  L'illustration est découpée en fines bandes horizontales (et, sous le bassin,
//  en jambe gauche / jambe droite). Chaque bande est déplacée séparément :
//   - les jambes balancent l'une après l'autre (vraie marche, pied qui se lève),
//   - le buste se plie au lieu de pivoter d'un bloc, il respire,
//   - la tête suit avec un léger retard, cheveux et capes ondulent.
//  Le « squelette » (bassin, cou, écart entre les jambes) est calculé
//  automatiquement en lisant les pixels de l'image.
// =====================================================================

const rigCache = new Map();

// Analyse de l'image : où sont le cou, le bassin, l'écart entre les jambes ?
export function analyseRig(scene, key) {
  if (rigCache.has(key)) return rigCache.get(key);
  const src = scene.textures.get(key).getSourceImage();
  const W = src.width, H = src.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;
  const A = (x, y) => data[(y * W + x) * 4 + 3] > 60;
  // segments opaques de chaque ligne
  const rows = [];
  let top = H, bottom = 0;
  for (let y = 0; y < H; y++) {
    const segs = []; let s = -1;
    for (let x = 0; x < W; x++) {
      const o = A(x, y);
      if (o && s < 0) s = x;
      if ((!o || x === W - 1) && s >= 0) { const e = o ? x : x - 1; if (e - s >= 2) segs.push([s, e]); s = -1; }
    }
    rows.push(segs);
    if (segs.length) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  const h = Math.max(1, bottom - top);
  // centre de masse horizontal du bas du corps
  let sx = 0, n = 0;
  for (let y = Math.floor(top + h * 0.55); y <= bottom; y++) for (const [a, b] of rows[y]) { sx += ((a + b) / 2) * (b - a); n += b - a; }
  const cx = n ? sx / n : W / 2;
  // Jambes : en remontant depuis les pieds, tant que la ligne est coupée en 2 par un vide
  const gapAt = (y) => {
    const segs = rows[y].filter(([a, b]) => b - a > 3);
    let best = null, bd = Infinity;
    for (let i = 0; i + 1 < segs.length; i++) {
      const g0 = segs[i][1], g1 = segs[i + 1][0];
      if (g1 - g0 < 3) continue;
      const gx = (g0 + g1) / 2, d = Math.abs(gx - cx);
      if (d < bd && d < W * 0.3) { bd = d; best = gx; }
    }
    return best;
  };
  const gaps = new Map();
  let crotch = null, misses = 0;
  for (let y = bottom - 2; y > top + h * 0.35; y--) {
    const g = gapAt(y);
    if (g != null) { gaps.set(y, g); crotch = y; misses = 0; }
    else if (++misses > 10) break;   // les jambes se rejoignent : c'est le bassin
  }
  const legs = crotch != null && bottom - crotch > h * 0.16;
  // bassin un peu au-dessus de l'entrejambe ; écart lissé ligne par ligne
  const hip = legs ? crotch - h * 0.04 : top + h * 0.58;
  const gapX = new Float32Array(H);
  let last = legs ? gaps.get(crotch) : cx;
  for (let y = 0; y < H; y++) { if (gaps.has(y)) last = last * 0.6 + gaps.get(y) * 0.4; gapX[y] = y < (legs ? crotch : H) ? (legs ? gaps.get(crotch) : cx) : last; }
  // Cou : la ligne la plus étroite entre 12 % et 32 % de la hauteur
  let neck = top + h * 0.2, nw = Infinity;
  for (let y = Math.floor(top + h * 0.12); y < top + h * 0.32; y++) {
    const segs = rows[y]; if (!segs.length) continue;
    const w = segs.reduce((m, [a, b]) => m + (b - a), 0);
    if (w < nw) { nw = w; neck = y; }
  }
  const rig = { W, H, top, bottom, h, cx, hip, legs, crotch: legs ? crotch : hip, neck, gapX };
  rigCache.set(key, rig);
  return rig;
}

// Textures découpées : buste (+ tête), jambe gauche, jambe droite (même largeur, même centre)
function rigTextures(scene, key, R) {
  const k = `rig_${key}`;
  if (scene.textures.exists(`${k}_T`)) return k;
  const src = scene.textures.get(key).getSourceImage();
  const cut = (name, y0, y1, mask) => {
    const c = document.createElement('canvas'); c.width = R.W; c.height = Math.max(2, y1 - y0);
    const g = c.getContext('2d'); g.drawImage(src, 0, y0, R.W, y1 - y0, 0, 0, R.W, y1 - y0);
    if (mask) {   // on efface l'autre jambe, ligne par ligne, selon l'écart mesuré
      g.globalCompositeOperation = 'destination-out';
      for (let y = y0; y < y1; y++) { const gx = Math.round(R.gapX[y]); if (mask < 0) g.fillRect(gx, y - y0, R.W - gx, 1); else g.fillRect(0, y - y0, gx, 1); }
    }
    scene.textures.addCanvas(`${k}_${name}`, c);
  };
  const c0 = Math.round(R.crotch);
  if (R.legs) {
    cut('T', R.top, c0 + 3);
    cut('L', c0 - 3, R.bottom + 1, -1);
    cut('R', c0 - 3, R.bottom + 1, 1);
  } else cut('T', R.top, R.bottom + 1);
  return k;
}

const mkPoints = (n) => Array.from({ length: n }, () => new Phaser.Math.Vector2());

export class RigSprite {
  constructor(scene, key) {
    this.scene = scene;
    this.parts = [];
    this.build(key);
  }

  build(key) {
    this.parts.forEach((p) => p.rope.destroy());
    this.parts = [];
    this.key = key;
    if (!this.scene.textures.exists(key) || key === '__WHITE') return;
    const R = this.rig = analyseRig(this.scene, key);
    const k = rigTextures(this.scene, key, R);
    const add = (name, y0, y1, side, n) => {
      const pts = mkPoints(n);
      const rope = this.scene.add.rope(0, 0, `${k}_${name}`, null, pts, false);
      this.parts.push({ rope, pts, y0, y1, side });
    };
    const c0 = Math.round(R.crotch);
    if (R.legs) {
      add('L', c0 - 3, R.bottom + 1, -1, 8);
      add('R', c0 - 3, R.bottom + 1, 1, 8);
      add('T', R.top, c0 + 3, 0, 14);
    } else add('T', R.top, R.bottom + 1, 0, 18);
  }

  setVisible(v) { if (v !== this.vis) { this.vis = v; this.parts.forEach((p) => p.rope.setVisible(v)); } return this; }

  destroy() { this.parts.forEach((p) => p.rope.destroy()); this.parts = []; }

  // Recopie la pose de l'image de référence (position, échelle, rotation, teinte…)
  // puis déforme : marche, flexion du buste, respiration, tête et cheveux qui suivent.
  sync(ref, a) {
    if (ref.texture.key !== this.key) this.build(ref.texture.key);
    const R = this.rig; if (!R || !this.parts.length) return false;
    const flip = ref.scaleX < 0 ? -1 : 1, sx = Math.abs(ref.scaleX), sy = ref.scaleY;
    const t = a.time / 1000, H = R.h, foot = R.bottom, seed = a.seed || 0;
    const legLen = Math.max(1, foot - R.crotch), upper = Math.max(1, R.hip - R.top);
    const rot = ref.rotation, small = Math.abs(rot) < 0.7;
    const rigid = small ? rot * 0.3 : rot, bend = small ? rot * 0.7 : 0;
    const mv = a.move || 0, ph = a.walk || 0;
    const swingAmp = 0.36 * mv, lift = 0.12 * mv;
    const bob = Math.abs(Math.sin(ph)) * 0.03 * mv * H;
    const breath = Math.sin(t * (a.tired ? 5.2 : 2.4) + seed) * (a.tired ? 0.03 : 0.015);
    const sway = Math.sin(t * 1.7 + seed) * 0.018 + (a.drag || 0);
    const headTilt = Math.sin(t * 1.1 + seed * 2) * 0.025 - (a.drag || 0) * 0.5 + (a.headK || 0);
    const ox = R.W / 2 - R.cx;   // décalage du centre de la texture par rapport au centre du corps
    const tint = ref.tintFill ? 2 : ref.isTinted ? 1 : 0;
    for (const p of this.parts) {
      const n = p.pts.length;
      for (let i = 0; i < n; i++) {
        const y = p.y0 + ((p.y1 - p.y0) * i) / (n - 1);
        let dx = 0, dy = 0;
        if (p.side) {
          // jambe : balancier autour du bassin, en opposition de phase ; le pied se lève en revenant
          const k = Math.max(0, (y - R.crotch) / legLen), off = p.side > 0 ? Math.PI : 0;
          dx += Math.sin(ph + off) * swingAmp * legLen * k * (0.55 + 0.45 * k);
          dy -= Math.max(0, -Math.cos(ph + off)) * lift * legLen * k * k;
          dx += p.side * Math.sin(t * 1.3 + seed) * 0.8 * (1 - mv) * k;    // transfert du poids au repos
        } else {
          if (y > R.hip) {   // bas de robe / bassin : ondule
            const k = (y - R.hip) / Math.max(1, foot - R.hip);
            dx += Math.sin(ph * 2) * 0.035 * mv * H * k + sway * H * 0.25 * k;
          }
          if (y <= R.crotch + 3) {
            const kb = Math.max(0, (R.hip - y) / upper);
            dy -= bob + breath * kb * upper * 0.3;
            dx += Math.tan(bend) * kb * kb * upper;                 // le buste se plie
            dx += Math.sin(ph) * 0.014 * mv * H * kb;               // les épaules roulent
            dx += sway * H * kb * kb * kb * 0.7;                    // cheveux, cape
            if (y < R.neck) dx += headTilt * (R.neck - y);          // la tête s'incline
          }
        }
        p.pts[i].set(ox + dx, y - foot + dy);
      }
      const { rope } = p;
      rope.setPoints(p.pts);
      rope.setPosition(ref.x, ref.y).setRotation(rigid).setScale(sx * flip * (p.side ? 1 : 1 + breath * 0.6), sy).setDepth(ref.depth).setAlpha(ref.alpha);
      if (tint) { rope.setTintFill(tint === 2); rope.setColors(ref.tintTopLeft); } else if (rope._tinted !== 0) { rope.setTintFill(false); rope.setColors(0xffffff); }
      rope._tinted = tint;
    }
    return true;
  }
}
