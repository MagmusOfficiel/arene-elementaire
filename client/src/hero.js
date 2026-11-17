// =====================================================================
//  PERSONNAGES DE JEU « FAITS MAISON »
//  L'illustration sert à la présentation ; en combat, le champion est un
//  personnage construit pour le jeu : des pièces dessinées (tête, coiffure,
//  armure, bras, jambes, cape, arme) montées sur un squelette et animées
//  (repos, course, coup d'arme, sort, coup reçu, mort).
//  Unités : 1 unité = 0,5 px à l'écran (on dessine en 2x pour la netteté).
// =====================================================================
import Phaser from 'phaser';

// ---------- Fiches des personnages ----------
export const HEROS = {
  'feu+lumiere': {
    nom: 'Aube',
    peau: '#f3c9a1', peauOmbre: '#d99c74',
    cheveux: '#ff8a1a', cheveuxOmbre: '#d9480f', cheveuxClair: '#ffc04a', coiffure: 'petard',
    yeux: '#7a3410',
    armure: '#c8261c', armureOmbre: '#8c1410', or: '#ffcf3a', orOmbre: '#c98a12',
    tissu: '#2b2330', tissuOmbre: '#18131c', bottes: '#6e2a18', bottesOmbre: '#45180c',
    ceinture: '#f4efe6', cape: '#b51d16', capeDedans: '#ff9a2a',
    arme: 'epee', lame: '#ffd84a', lameClair: '#fff6c0', lameLueur: 0xffb030, garde: '#c98a12',
    emblème: 'soleil',
  },
  // Magma — en test (Réglages > Style des champions > Fait maison) : torse de basalte fissuré de lave,
  // poings de lave, pas de cape ni d'épée
  'feu+terre': {
    nom: 'Magma', test: true,
    peau: '#4a4244', peauOmbre: '#2e2829',
    cheveux: '#e8261a', cheveuxOmbre: '#9c130d', cheveuxClair: '#ff7a45', coiffure: 'petard',
    yeux: '#ffcc33',
    armure: '#433b3d', armureOmbre: '#2a2425', or: '#ff7a1a', orOmbre: '#c2410c',
    tissu: '#2a2224', tissuOmbre: '#171213', bottes: '#1f1a1b', bottesOmbre: '#120e0f',
    ceinture: '#3a2a22', cape: null, capeDedans: null,
    arme: 'poings', poing: '#ff8a2a', poingOmbre: '#c2410c', lame: '#ff8a2a', lameClair: '#ffd27a', lameLueur: 0xff6a1a, garde: '#c2410c',
    emblème: 'lave',
  },
};

const OUT = '#1a0f0a';          // contour
const TX = (k, p) => `hero_${k}_${p}`;

// ---------- Dessin des pièces (canvas, avec contour et ombrage) ----------
function piece(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h), c = t.getContext();
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c, w, h); t.refresh();
}
function shape(c, pts, fill, stroke = OUT, lw = 4) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function rrect(c, x, y, w, h, r, fill, stroke = OUT, lw = 4) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}

function buildParts(scene, k, D) {
  // Cuisse (pantalon) : pivot en haut, pend vers le bas
  piece(scene, TX(k, 'cuisse'), 34, 52, (c) => {
    rrect(c, 4, 3, 26, 46, 11, D.tissu);
    rrect(c, 18, 6, 9, 38, 5, D.tissuOmbre, null);
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(4, 3, 26, 46, 11); c.stroke();
  });
  // Tibia + botte + pied (vers l'avant = +x)
  piece(scene, TX(k, 'tibia'), 54, 58, (c) => {
    rrect(c, 6, 2, 24, 30, 9, D.tissu);
    shape(c, [[5, 22], [31, 22], [33, 42], [50, 46], [51, 54], [4, 55]], D.bottes);
    shape(c, [[22, 26], [31, 24], [33, 42], [50, 47], [50, 52], [26, 52]], D.bottesOmbre, null);
    rrect(c, 3, 19, 30, 8, 3, D.or, OUT, 3);
  });
  // Bras (haut) : manche sombre
  piece(scene, TX(k, 'bras'), 28, 46, (c) => { rrect(c, 4, 3, 20, 40, 9, D.tissu); rrect(c, 14, 6, 7, 32, 4, D.tissuOmbre, null); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(4, 3, 20, 40, 9); c.stroke(); });
  // Avant-bras : brassard rouge et or + main gantée
  piece(scene, TX(k, 'avbras'), 30, 50, (c) => {
    rrect(c, 4, 2, 22, 30, 8, D.armure); rrect(c, 15, 5, 8, 24, 4, D.armureOmbre, null);
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(4, 2, 22, 30, 8); c.stroke();
    rrect(c, 3, 24, 24, 6, 2, D.or, OUT, 3);
    c.beginPath(); c.arc(15, 38, D.poing ? 12 : 10, 0, Math.PI * 2); c.fillStyle = D.poing || '#2a1e1a'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    if (D.poing) { c.beginPath(); c.arc(18, 41, 6, 0, Math.PI * 2); c.fillStyle = D.poingOmbre; c.fill(); c.beginPath(); c.arc(12, 34, 3.5, 0, Math.PI * 2); c.fillStyle = '#ffe2a0'; c.fill(); }
  });
  // Épaulière
  piece(scene, TX(k, 'epauliere'), 46, 36, (c) => {
    shape(c, [[4, 30], [6, 10], [22, 3], [40, 8], [43, 28], [24, 33]], D.armure);
    shape(c, [[24, 33], [43, 28], [40, 8], [30, 6], [32, 26]], D.armureOmbre, null);
    c.strokeStyle = D.or; c.lineWidth = 4; c.beginPath(); c.moveTo(7, 27); c.lineTo(24, 30); c.lineTo(41, 25); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(4, 30); c.lineTo(6, 10); c.lineTo(22, 3); c.lineTo(40, 8); c.lineTo(43, 28); c.lineTo(24, 33); c.closePath(); c.stroke();
  });
  // Buste : plastron rouge, emblème solaire, ceinture blanche, pans de tunique
  piece(scene, TX(k, 'buste'), 84, 96, (c) => {
    shape(c, [[16, 88], [8, 66], [22, 64], [62, 64], [76, 66], [68, 88], [42, 94]], D.armure);          // pans
    shape(c, [[42, 94], [68, 88], [76, 66], [62, 64], [50, 70]], D.armureOmbre, null);
    shape(c, [[14, 60], [10, 22], [24, 8], [60, 8], [74, 22], [70, 60]], D.armure);                    // plastron
    shape(c, [[44, 10], [60, 8], [74, 22], [70, 60], [46, 60]], D.armureOmbre, null);
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(14, 60); c.lineTo(10, 22); c.lineTo(24, 8); c.lineTo(60, 8); c.lineTo(74, 22); c.lineTo(70, 60); c.closePath(); c.stroke();
    rrect(c, 30, 0, 24, 12, 4, D.tissu);                                                                // col
    if (D.emblème === 'lave') {   // fissures de lave sur le torse
      c.strokeStyle = D.or; c.lineWidth = 3.5;
      for (const f of [[[20, 18], [30, 30], [26, 42], [36, 52]], [[64, 14], [54, 26], [58, 38], [48, 50]], [[42, 20], [44, 34], [40, 44]]]) {
        c.beginPath(); c.moveTo(f[0][0], f[0][1]); f.slice(1).forEach(([x, y]) => c.lineTo(x, y)); c.stroke();
      }
      c.strokeStyle = '#ffe2a0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(30, 30); c.lineTo(26, 42); c.moveTo(54, 26); c.lineTo(58, 38); c.stroke();
    } else {
    // soleil
    c.save(); c.translate(42, 34);
    c.fillStyle = D.or; c.strokeStyle = OUT; c.lineWidth = 2.5;
    c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 9 : 16; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fillStyle = D.orOmbre; c.fill(); c.stroke(); c.restore();
    }
    rrect(c, 8, 56, 68, 12, 5, D.ceinture);                                                             // ceinture
    rrect(c, 34, 55, 16, 14, 3, D.or, OUT, 3);
  });
  // Pans de ceinture qui flottent
  piece(scene, TX(k, 'ruban'), 40, 22, (c) => {
    c.beginPath(); c.moveTo(3, 6); c.quadraticCurveTo(16, 0, 26, 7); c.quadraticCurveTo(34, 12, 37, 6); c.lineTo(35, 16); c.quadraticCurveTo(24, 19, 16, 13); c.quadraticCurveTo(9, 10, 3, 14); c.closePath();
    c.fillStyle = D.ceinture; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  });
  // Cape (derrière) : pivot en haut
  if (D.cape) piece(scene, TX(k, 'cape'), 70, 120, (c) => {
    shape(c, [[16, 2], [54, 2], [66, 110], [46, 104], [34, 116], [20, 104], [4, 112]], D.cape);
    shape(c, [[40, 4], [54, 2], [66, 110], [46, 104]], D.capeDedans, null);
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(16, 2); c.lineTo(54, 2); c.lineTo(66, 110); c.lineTo(46, 104); c.lineTo(34, 116); c.lineTo(20, 104); c.lineTo(4, 112); c.closePath(); c.stroke();
  });
  // Tête : visage de 3/4 tourné vers la droite, grands yeux, cheveux en pétard balayés vers l'arrière
  piece(scene, TX(k, 'tete'), 150, 150, (c) => {
    const cx = 80, cy = 96;
    const curve = (pts, fill, stroke = OUT, lw = 4) => {   // pointes de cheveux aux bords arrondis
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) { const [x, y] = pts[i], [px, py] = pts[i - 1]; c.quadraticCurveTo((px + x) / 2 + (y - py) * 0.12, (py + y) / 2 - (x - px) * 0.12, x, y); }
      c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); }
    };
    // masse arrière des cheveux : longues pointes balayées vers l'arrière-haut
    curve([[40, 100], [4, 92], [30, 78], [2, 52], [36, 56], [20, 22], [56, 40], [58, 6], [82, 32], [104, 8], [108, 40], [138, 30], [122, 62], [112, 92]], D.cheveuxOmbre);
    // visage (menton pointu vers l'avant-droite)
    c.beginPath(); c.moveTo(cx - 34, cy - 18); c.quadraticCurveTo(cx - 36, cy + 30, cx - 6, cy + 46); c.lineTo(cx + 18, cy + 48); c.quadraticCurveTo(cx + 40, cy + 34, cx + 40, cy - 8);
    c.quadraticCurveTo(cx + 30, cy - 40, cx, cy - 42); c.quadraticCurveTo(cx - 30, cy - 40, cx - 34, cy - 18); c.closePath();
    c.fillStyle = D.peau; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.save(); c.clip(); c.beginPath(); c.ellipse(cx - 30, cy + 10, 16, 40, 0.2, 0, Math.PI * 2); c.fillStyle = D.peauOmbre; c.fill(); c.restore();
    // oreille
    c.beginPath(); c.ellipse(cx - 26, cy + 8, 7, 11, 0.2, 0, Math.PI * 2); c.fillStyle = D.peau; c.fill(); c.lineWidth = 3; c.stroke();
    // yeux : grands, en amande, regard décidé
    const eye = (ex, w) => {
      c.beginPath(); c.moveTo(ex - w, cy); c.quadraticCurveTo(ex, cy - 14, ex + w, cy - 4); c.quadraticCurveTo(ex + w * 0.5, cy + 12, ex - w, cy + 6); c.closePath();
      c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      c.save(); c.clip(); c.beginPath(); c.ellipse(ex + w * 0.25, cy + 1, w * 0.6, 10, 0, 0, Math.PI * 2); c.fillStyle = D.yeux; c.fill();
      c.beginPath(); c.ellipse(ex + w * 0.3, cy + 2, w * 0.3, 6, 0, 0, Math.PI * 2); c.fillStyle = '#2a0e04'; c.fill();
      c.beginPath(); c.arc(ex + w * 0.45, cy - 3, 2.6, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.restore();
      c.lineWidth = 5; c.beginPath(); c.moveTo(ex - w - 2, cy - 4); c.quadraticCurveTo(ex, cy - 16, ex + w + 2, cy - 6); c.stroke();   // paupière épaisse
      c.lineWidth = 4.5; c.beginPath(); c.moveTo(ex - w, cy - 20); c.lineTo(ex + w + 2, cy - 13); c.stroke();                           // sourcil froncé
    };
    eye(cx + 8, 11); eye(cx + 31, 7);
    // nez + sourire en coin
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx + 36, cy + 10); c.lineTo(cx + 40, cy + 18); c.lineTo(cx + 35, cy + 19); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 12, cy + 30); c.quadraticCurveTo(cx + 24, cy + 36, cx + 34, cy + 27); c.stroke();
    c.beginPath(); c.moveTo(cx + 22, cy + 32); c.lineTo(cx + 30, cy + 31); c.lineTo(cx + 26, cy + 35); c.closePath(); c.fillStyle = '#fff'; c.fill();
    // cheveux de devant : frange en pointes qui tombent sur le front, balayées vers l'arrière
    curve([[34, 84], [36, 52], [54, 34], [84, 30], [114, 42], [126, 66], [112, 60], [116, 80], [100, 64], [96, 82], [84, 62], [76, 80], [66, 60], [56, 82], [50, 62]], D.cheveux);
    // grandes pointes du dessus, vers l'arrière
    curve([[40, 60], [8, 34], [46, 40], [34, 6], [66, 30], [80, 0], [92, 30], [122, 10], [110, 42], [84, 38]], D.cheveux);
    curve([[58, 36], [70, 14], [80, 34]], D.cheveuxClair, null);
    curve([[90, 34], [112, 18], [104, 40]], D.cheveuxClair, null);
    curve([[64, 40], [96, 36], [112, 46], [92, 44]], D.cheveuxClair, null);
  });
  // Épée solaire : pivot à la poignée, lame vers le haut
  if (D.arme === 'epee') piece(scene, TX(k, 'epee'), 40, 170, (c) => {
    shape(c, [[20, 2], [30, 18], [28, 124], [12, 124], [10, 18]], D.lame);
    shape(c, [[20, 2], [30, 18], [28, 124], [20, 124]], D.lameClair, null);
    c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(20, 2); c.lineTo(30, 18); c.lineTo(28, 124); c.lineTo(12, 124); c.lineTo(10, 18); c.closePath(); c.stroke();
    shape(c, [[2, 122], [38, 122], [36, 132], [4, 132]], D.garde, OUT, 3.5);
    rrect(c, 15, 132, 10, 28, 3, '#3a2a20', OUT, 3);
    c.beginPath(); c.arc(20, 163, 6, 0, Math.PI * 2); c.fillStyle = D.or; c.fill(); c.lineWidth = 3; c.stroke();
  });
}

// ---------- Kit de pièces générées (heros/<fusion>/*.webp) ----------
// Calcule les points d'attache de chaque pièce en lisant ses pixels (centre de la bande du haut / du bas)
function kitDe(scene, key) {
  if (!scene.textures.exists(`kit_${key}_cuisse`)) return null;
  const cache = (scene._kits ||= {});
  if (cache[key]) return cache[key];
  const band = (k, f0, f1) => {   // centre horizontal des pixels opaques entre f0 et f1 (en fraction de hauteur)
    const src = scene.textures.get(k).getSourceImage(), W = src.width, H = src.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(src, 0, 0);
    const d = c.getImageData(0, Math.floor(H * f0), W, Math.max(1, Math.floor(H * (f1 - f0)))).data;
    let sx = 0, n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 80) { sx += ((i - 3) / 4) % W; n++; }
    return { cx: n ? sx / n / W : 0.5, W, H };
  };
  const has = (p) => scene.textures.exists(`kit_${key}_${p}`);
  const o = {}, sz = {};
  const top = (p, f = 0.12, oy = 0.06) => { if (!has(p)) return; const b = band(`kit_${key}_${p}`, 0, f); o[p] = [b.cx, oy]; sz[p] = b; };
  top('cuisse'); top('tibia', 0.15, 0.05); top('bras', 0.2, 0.12); top('avbras', 0.12, 0.05); top('cape', 0.1, 0.02);
  if (has('tete')) { const b = band(`kit_${key}_tete`, 0.85, 1); o.tete = [b.cx, 0.96]; sz.tete = b; }
  if (has('buste')) { const b = band(`kit_${key}_buste`, 0.55, 0.7); o.buste = [b.cx, 0.62]; sz.buste = b; }
  if (has('arme')) { const b = band(`kit_${key}_arme`, 0.8, 1); o.arme = [b.cx, 0.86]; sz.arme = b; }
  // échelle : le personnage entier mesure ~270 unités (comme la version dessinée)
  const u = 270 / (sz.cuisse.H * 0.84 + (sz.tibia?.H || 60) * 0.86 + (sz.buste?.H || 100) * 0.52 + (sz.tete?.H || 80) * 0.9 + 5);
  const dims = { u, L1: sz.cuisse.H * 0.84 * u, L2: (sz.tibia?.H || 60) * 0.86 * u, LA: (sz.bras?.H || 50) * 0.76 * u, LF: (sz.avbras?.H || 50) * 0.8 * u,
    T: (sz.buste?.H || 100) * 0.52 * u, lame: (sz.arme?.H || 150) * 0.8 * u };
  return (cache[key] = { o, dims });
}

// ---------- Personnage animé ----------
export class Hero {
  constructor(scene, key) {
    this.scene = scene; this.key = key; const D = this.D = HEROS[key] || HEROS['feu+lumiere'];
    const kit = this.kit = kitDe(scene, key);
    if (!kit) buildParts(scene, key, D);
    this.dims = kit ? kit.dims : { L1: 41, L2: 48, LA: 36, LF: 34, T: 58, lame: 120, u: 1 };
    const KMAP = { epauliere: null, epee: 'arme', ruban: null };
    const im = (p, ox, oy) => {
      if (!kit && !scene.textures.exists(TX(key, p))) return scene.add.image(0, 0, '__WHITE').setVisible(false).setAlpha(0);   // pièce que ce perso n'a pas (cape, épée)
      if (!kit) return scene.add.image(0, 0, TX(key, p)).setOrigin(ox, oy);
      const kp = p in KMAP ? KMAP[p] : p;
      if (!kp || !kit.o[kp]) return scene.add.image(0, 0, '__WHITE').setVisible(false).setAlpha(0);   // pièce absente du kit
      const o = kit.o[kp];
      return scene.add.image(0, 0, `kit_${key}_${kp}`).setOrigin(o[0], o[1]).setScale(kit.dims.u);
    };
    // ordre d'affichage (du fond vers l'avant)
    this.p = {
      cape: im('cape', 0.5, 0.02),
      bras2: im('bras', 0.5, 0.06), avbras2: im('avbras', 0.5, 0.05),
      cuisse2: im('cuisse', 0.5, 0.06), tibia2: im('tibia', 0.33, 0.04),
      ruban: im('ruban', 0.06, 0.5),
      buste: im('buste', 0.5, 0.66),
      cuisse: im('cuisse', 0.5, 0.06), tibia: im('tibia', 0.33, 0.04),
      tete: kit ? im('tete').setScale(kit.dims.u * 1.22) : im('tete', 0.5, 0.95).setScale(0.92),
      epaul2: im('epauliere', 0.5, 0.3),
      bras: im('bras', 0.5, 0.06), epee: im('epee', 0.5, 0.92), avbras: im('avbras', 0.5, 0.05),
      epaul: im('epauliere', 0.5, 0.3),
    };
    // lueur de la lame
    this.lueur = scene.add.image(0, 0, 'fx_glow').setTint(D.lameLueur).setBlendMode('ADD').setAlpha(0.35);
    this.trace = scene.add.graphics().setBlendMode('ADD');       // arc lumineux laissé par la lame
    this.paume = scene.add.image(0, 0, 'fx_glow').setTint(D.lameLueur).setBlendMode('ADD').setAlpha(0);
    this.list = [this.p.cape, this.p.bras2, this.p.avbras2, this.p.cuisse2, this.p.tibia2, this.p.ruban, this.p.buste, this.p.cuisse, this.p.tibia,
      this.p.tete, this.p.epaul2, this.p.bras, this.lueur, this.trace, this.p.epee, this.p.avbras, this.p.epaul, this.paume];
    this.box = scene.add.container(0, 0, this.list);
    this.p.tibia2.setTint(0xb0a0a0); this.p.cuisse2.setTint(0xa898a0); this.p.bras2.setTint(0xa898a0); this.p.avbras2.setTint(0xb0a0a0); this.p.epaul2.setTint(0xb8a8a8);
    this.capeSw = 0; this.tinted = false;
  }

  setVisible(v) { this.box.setVisible(v); return this; }
  destroy() { this.box.destroy(); }

  // a : { x, y, face, scale, alpha, time, move (0..1), walk (phase), atk (0..1 ou -1), cast (0..1 ou -1), hit (0..1 ou -1), rot, flash }
  update(a) {
    const { p } = this, t = a.time / 1000, mv = a.move, ph = a.walk;
    const S = Math.sin, C = Math.cos, R = Math.PI / 180;
    // --- pose de base (repos) ---
    let lean = 3 * R + S(t * 2.2) * 1 * R, bob = S(t * 2.4) * 1.5;
    let hipX = 0;
    let legF = 10 * R, kneeF = -8 * R, legB = -14 * R, kneeB = -10 * R;     // angles « vers l'avant » (positif = pied vers l'avant)
    let armF = -20 * R, elbF = 70 * R, armB = 14 * R, elbB = 40 * R;        // bras avant (épée) / bras arrière
    let sword = 150 * R;                                                        // angle de la lame (0 = vers le haut, + = vers l'avant)
    let headT = S(t * 1.6) * 2 * R;
    // --- course ---
    if (mv > 0.05) {
      const k = mv;
      const sF = S(ph), sB = S(ph + Math.PI);
      legF = (legF * (1 - k)) + k * (32 * R * sF); kneeF = (kneeF * (1 - k)) + k * (-(Math.max(0, -C(ph)) * 75 + 12) * R);
      legB = (legB * (1 - k)) + k * (32 * R * sB); kneeB = (kneeB * (1 - k)) + k * (-(Math.max(0, -C(ph + Math.PI)) * 75 + 12) * R);
      armB = armB * (1 - k) + k * (-38 * R * sF); elbB = elbB * (1 - k) + k * (70 * R);
      armF = armF * (1 - k) + k * (-30 * R + 22 * R * sF); elbF = elbF * (1 - k) + k * (80 * R);
      sword = sword * (1 - k) + k * (115 * R);
      lean += k * 14 * R; bob = Math.abs(S(ph)) * 7 * k + bob * (1 - k);
    }
    // --- coup d'épée : armé -> taille -> accompagnement -> retour ---
    let trail = 0;
    if (a.atk >= 0 && a.atk < 1) {
      const u = a.atk, ease = (x) => 1 - (1 - x) * (1 - x);
      let A, E, W, L;
      if (u < 0.28) { const k = ease(u / 0.28); A = -20 + (-150 + 20) * k; E = 70 - 50 * k; W = 150 + (-60 - 150) * k; L = 3 - 10 * k; }
      else if (u < 0.5) { const k = ease((u - 0.28) / 0.22); A = -150 + 230 * k; E = 20 + 10 * k; W = -60 + 200 * k; L = -7 + 25 * k; trail = 1 - Math.abs(k - 0.6); }
      else { const k = ease((u - 0.5) / 0.5); A = 80 + (-20 - 80) * k; E = 30 + 40 * k; W = 140 + 10 * k; L = 18 - 15 * k; }
      armF = A * R; elbF = E * R; sword = W * R; lean = L * R;
      legF = 24 * R; kneeF = -6 * R; legB = -26 * R; kneeB = -16 * R; hipX = u < 0.5 ? 8 * (u / 0.5) : 8 * (1 - (u - 0.5) / 0.5);
      armB = -40 * R; elbB = 60 * R;
    }
    // --- sort : bras arrière tendu vers l'avant, paume ouverte ---
    if (a.cast >= 0 && a.cast < 1) {
      const k = S(Math.min(1, a.cast * 1.6) * Math.PI / 2) * (a.cast < 0.7 ? 1 : (1 - a.cast) / 0.3);
      armB = armB * (1 - k) + k * (88 * R); elbB = elbB * (1 - k) + k * (4 * R); lean += k * 8 * R;
    }
    // --- coup reçu : rejeté en arrière ---
    if (a.hit >= 0 && a.hit < 1) { const k = S(a.hit * Math.PI); lean -= k * 16 * R; headT -= k * 14 * R; hipX -= k * 6; }

    // --- squelette (y vers le haut négatif ; pieds au sol à y=0) ---
    const Dm = this.dims;
    const hipY = -(Dm.L1 + Dm.L2 + 5) - bob;
    const L1 = Dm.L1, L2 = Dm.L2;             // cuisse, tibia
    const leg = (img1, img2, ang, knee, dx) => {
      const hx = hipX + dx, hy = hipY;
      img1.setPosition(hx, hy).setRotation(-ang);
      const kx = hx + S(ang) * L1, ky = hy + C(ang) * L1;
      img2.setPosition(kx, ky).setRotation(-(ang + knee));
    };
    leg(p.cuisse2, p.tibia2, legB, kneeB, -4);
    leg(p.cuisse, p.tibia, legF, kneeF, 6);
    // buste (pivot aux hanches)
    p.buste.setPosition(hipX, hipY + 6).setRotation(lean);
    const T = Dm.T, shoulder = (dx) => ({ x: hipX + S(lean) * T * 0.9 + C(lean) * dx, y: hipY + 6 - C(lean) * T + S(lean) * dx });
    const sF = shoulder(10), sB = shoulder(-14);
    // tête
    const nk = shoulder(-2);
    p.tete.setPosition(nk.x + S(lean) * 4, nk.y - 2).setRotation(lean * 0.5 + headT);
    // bras
    const LA = Dm.LA, LF = Dm.LF;
    const arm = (img1, img2, s0, ang, elb) => {
      img1.setPosition(s0.x, s0.y).setRotation(-ang);
      const ex = s0.x + S(ang) * LA, ey = s0.y + C(ang) * LA;
      img2.setPosition(ex, ey).setRotation(-(ang + elb));
      return { x: ex + S(ang + elb) * (LF - 4), y: ey + C(ang + elb) * (LF - 4) };
    };
    const hand2 = arm(p.bras2, p.avbras2, sB, armB, elbB);
    const castK = a.cast >= 0 && a.cast < 1 ? Math.sin(Math.min(1, a.cast * 1.6) * Math.PI / 2) * (a.cast < 0.7 ? 1 : (1 - a.cast) / 0.3) : 0;
    this.paume.setPosition(hand2.x + 8, hand2.y).setScale(0.3 + castK * 0.5).setAlpha(castK * 0.9);
    const hand = arm(p.bras, p.avbras, sF, armF, elbF);
    p.epaul.setPosition(sF.x, sF.y).setRotation(-armF * 0.3 + lean);
    p.epaul2.setPosition(sB.x, sB.y).setRotation(-armB * 0.3 + lean);
    // épée dans la main avant
    p.epee.setPosition(hand.x, hand.y).setRotation(sword);
    const tipX = hand.x + S(sword) * Dm.lame, tipY = hand.y - C(sword) * Dm.lame;
    if (this.D.arme === 'poings') {   // poings de lave : la lueur entoure la main avant, plus forte pendant le coup
      this.lueur.setPosition(hand.x, hand.y).setScale(0.35 + trail * 0.35).setAlpha(0.45 + trail * 0.4 + S(t * 6) * 0.08);
      this.paume.setAlpha(Math.max(this.paume.alpha, 0.35 + S(t * 5) * 0.08)).setScale(Math.max(this.paume.scaleX, 0.3));
    } else this.lueur.setPosition((hand.x + tipX) / 2, (hand.y + tipY) / 2).setScale(0.8 + trail * 0.4).setAlpha(0.3 + trail * 0.3 + S(t * 5) * 0.05);
    // arc de la taille : secteur lumineux entre le début du coup et la position actuelle de la lame
    const g = this.trace.clear();
    if (a.atk >= 0.26 && a.atk < 0.7) {
      const a0 = -Math.PI / 2 + (-60 * R), a1 = -Math.PI / 2 + sword, fade = a.atk < 0.5 ? 1 : 1 - (a.atk - 0.5) / 0.2;
      const steps = 10, r0 = 60, r1 = 135, cx0 = sF.x, cy0 = sF.y;
      for (let i = 0; i < steps; i++) {
        const u0 = a0 + ((a1 - a0) * i) / steps, u1 = a0 + ((a1 - a0) * (i + 1)) / steps, al = fade * (0.08 + 0.55 * (i / steps));
        g.fillStyle(i > steps - 3 ? 0xfff6c0 : this.D.lameLueur, al);
        g.beginPath(); g.moveTo(cx0 + Math.cos(u0) * r0, cy0 + Math.sin(u0) * r0); g.lineTo(cx0 + Math.cos(u0) * r1, cy0 + Math.sin(u0) * r1);
        g.lineTo(cx0 + Math.cos(u1) * r1, cy0 + Math.sin(u1) * r1); g.lineTo(cx0 + Math.cos(u1) * r0, cy0 + Math.sin(u1) * r0); g.closePath(); g.fillPath();
      }
    }
    // cape : balancée par la course, traîne derrière
    const capeTarget = -(12 + mv * 45) * R + S(t * 3 + ph * 0.5) * (3 + mv * 6) * R;
    this.capeSw += (capeTarget - this.capeSw) * 0.15;
    const sc = shoulder(-6);
    p.cape.setPosition(sc.x, sc.y + 4).setRotation(-this.capeSw + lean * 0.6).setScale(Dm.u, Dm.u * (1 + mv * 0.05 * S(t * 9)));
    p.ruban.setPosition(hipX - 22 + S(lean) * 4, hipY + 2).setRotation(Math.PI - (60 - mv * 45) * R + S(t * 6 + ph) * 10 * R).setScale(0.8, 0.8);

    // --- placement global ---
    const s = a.scale;
    this.box.setPosition(a.x, a.y).setScale(s * a.face, s).setRotation(a.rot || 0).setAlpha(a.alpha).setDepth(a.depth);
    if (a.flash && !this.tinted) { this.list.forEach((o) => o.setTintFill?.(0xffffff)); this.tinted = true; }
    else if (!a.flash && this.tinted) {
      this.list.forEach((o) => o.clearTint?.());
      this.p.tibia2.setTint(0xb0a0a0); this.p.cuisse2.setTint(0xa898a0); this.p.bras2.setTint(0xa898a0); this.p.avbras2.setTint(0xb0a0a0); this.p.epaul2.setTint(0xb8a8a8);
      this.lueur.setTint(this.D.lameLueur); this.tinted = false;
    }
  }

  // Mort : le perso tombe à la renverse, blanchit et s'efface
  die() {
    const b = this.box, sc = this.scene;
    const ghost = sc.add.container(b.x, b.y, []).setDepth(b.depth);
    b.list.slice().forEach((o) => { const cl = sc.add.image(o.x, o.y, o.texture.key).setOrigin(o.originX, o.originY).setRotation(o.rotation).setScale(o.scaleX, o.scaleY).setAlpha(o.alpha).setBlendMode(o.blendMode); if (o.isTinted) cl.setTint(o.tintTopLeft); ghost.add(cl); });
    ghost.setScale(b.scaleX, b.scaleY);
    sc.tweens.add({ targets: ghost, rotation: -1.4 * Math.sign(b.scaleX), y: b.y - 6, duration: 420, ease: 'Quad.easeIn',
      onComplete: () => { ghost.list.forEach((o) => o.setTintFill?.(0xffffff)); sc.tweens.add({ targets: ghost, alpha: 0, duration: 380, onComplete: () => ghost.destroy() }); } });
  }
}
