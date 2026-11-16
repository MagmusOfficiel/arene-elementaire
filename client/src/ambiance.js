// =====================================================================
//  AMBIANCE DE LA CARTE : la carte vit autour du joueur.
//   - ombres de nuages qui dérivent lentement sur tout le terrain,
//   - particules propres à chaque zone (braises du volcan, neige des pics,
//     lucioles de la forêt, pluie et éclairs de l'orage, spores du marais…),
//   - étalonnage des couleurs selon la zone où se trouve la caméra.
// =====================================================================
import Phaser from 'phaser';
import { ARENA, BIOMES, CITY } from '../../shared/data.js';

const softTex = (scene, key, size, stops) => {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, size, size), c = t.getContext(), R = size / 2;
  const g = c.createRadialGradient(R, R, 0, R, R, R);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, size, size); t.refresh();
};

// Réglages des particules par zone : couleur, mouvement, fréquence, mélange
const AMB = {
  volcan:     { tex: 'amb_dot', tint: [0xff7a1a, 0xffc04a, 0xff4a10], scale: [0.25, 0.6], speedY: [-90, -30], speedX: [-20, 20], life: 2600, freq: 70, blend: 'ADD', grade: 0xffb08a },
  pics:       { tex: 'amb_dot', tint: [0xffffff, 0xe8f4ff], scale: [0.2, 0.5], speedY: [50, 110], speedX: [-60, -10], life: 5000, freq: 45, blend: 'NORMAL', grade: 0xc8e0ff },
  sanctuaire: { tex: 'amb_dot', tint: [0xfff1b0, 0xffe066], scale: [0.15, 0.4], speedY: [-30, -8], speedX: [-8, 8], life: 4200, freq: 110, blend: 'ADD', grade: 0xfff0d0 },
  lac:        { tex: 'amb_dot', tint: [0xffffff, 0xbfe8ff], scale: [0.1, 0.3], speedY: [-6, 6], speedX: [-6, 6], life: 900, freq: 120, blend: 'ADD', grade: 0xd0f0ff },
  marais:     { tex: 'amb_dot', tint: [0xb07aff, 0x7affc8], scale: [0.15, 0.45], speedY: [-25, -5], speedX: [-15, 15], life: 3800, freq: 90, blend: 'ADD', grade: 0xc8b0e0 },
  orage:      { tex: 'amb_pluie', tint: [0xc8d8ff], scale: [0.6, 1], speedY: [700, 900], speedX: [-260, -200], life: 700, freq: 14, blend: 'ADD', grade: 0xc0c8e0, rain: true },
  montagne:   { tex: 'amb_dot', tint: [0xc8a878, 0xa08060], scale: [0.2, 0.55], speedY: [-10, 10], speedX: [30, 80], life: 3600, freq: 120, blend: 'NORMAL', grade: 0xf0dcc0 },
  foret:      { tex: 'amb_dot', tint: [0xd8ff6a, 0xfff07a], scale: [0.15, 0.4], speedY: [-14, 14], speedX: [-14, 14], life: 3200, freq: 120, blend: 'ADD', grade: 0xc8e8b0, flicker: true },
  fonderie:   { tex: 'amb_dot', tint: [0xffa040, 0xffd080], scale: [0.12, 0.3], speedY: [60, 160], speedX: [-40, 40], life: 1300, freq: 90, blend: 'ADD', grade: 0xe0d0c0 },
  plateau:    { tex: 'amb_feuille', tint: [0xffb0d0, 0xffffff, 0xd0ff90], scale: [0.4, 0.7], speedY: [10, 40], speedX: [40, 90], life: 5200, freq: 260, blend: 'NORMAL', grade: 0xfff4e0 },
  plaine:     { tex: 'amb_dot', tint: [0xffffe0], scale: [0.1, 0.25], speedY: [-10, 10], speedX: [10, 30], life: 4000, freq: 260, blend: 'ADD', grade: 0xffffff },
  ville:      { tex: 'amb_dot', tint: [0xd8d0c0], scale: [0.1, 0.25], speedY: [-6, 6], speedX: [8, 20], life: 4000, freq: 320, blend: 'NORMAL', grade: 0xf0ece8 },
  breche:     { tex: 'amb_dot', tint: [0xb06aff, 0xff6a8a, 0xd08aff], scale: [0.15, 0.45], speedY: [-40, -10], speedX: [-12, 12], life: 3200, freq: 70, blend: 'ADD', grade: 0xc8b0d8 },
  colisee:    { tex: 'amb_dot', tint: [0xfff0c0, 0xffd890], scale: [0.12, 0.3], speedY: [-14, -4], speedX: [-6, 6], life: 4500, freq: 140, blend: 'ADD', grade: 0xfff0dc },
};

export class Ambiance {
  constructor(scene, colisee) {
    this.scene = scene; this.colisee = colisee;
    softTex(scene, 'amb_dot', 16, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]);
    if (!scene.textures.exists('amb_pluie')) { const t = scene.textures.createCanvas('amb_pluie', 4, 40), c = t.getContext(); const g = c.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.7)'); c.fillStyle = g; c.fillRect(1, 0, 2, 40); t.refresh(); }
    if (!scene.textures.exists('amb_feuille')) { const t = scene.textures.createCanvas('amb_feuille', 16, 10), c = t.getContext(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(8, 5, 7, 3.5, 0, 0, Math.PI * 2); c.fill(); t.refresh(); }
    // Nuage : tache sombre très douce, irrégulière
    if (!scene.textures.exists('amb_nuage')) {
      const S = 256, t = scene.textures.createCanvas('amb_nuage', S, S), c = t.getContext();
      for (let i = 0; i < 9; i++) {
        const x = S * (0.25 + Math.random() * 0.5), y = S * (0.3 + Math.random() * 0.4), r = S * (0.18 + Math.random() * 0.16);
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, S, S);
      }
      t.refresh();
    }
    // Ombres de nuages (au-dessus de tout le monde, sous l'interface)
    this.clouds = Array.from({ length: colisee ? 3 : 7 }, () => {
      const im = scene.add.image(Math.random() * ARENA.width, Math.random() * ARENA.height, 'amb_nuage').setDepth(4900).setAlpha(colisee ? 0.18 : 0.26);
      im.setScale(5 + Math.random() * 5, 3.5 + Math.random() * 3); im.v = 18 + Math.random() * 14;
      return im;
    });
    // Un émetteur par type de zone ; on n'active que celui de l'endroit où l'on est
    this.em = {};
    for (const [k, A] of Object.entries(AMB)) {
      this.em[k] = scene.add.particles(0, 0, A.tex, {
        tint: A.tint, scale: { min: A.scale[0], max: A.scale[1] }, speedY: { min: A.speedY[0], max: A.speedY[1] }, speedX: { min: A.speedX[0], max: A.speedX[1] },
        lifespan: A.life, frequency: A.freq, quantity: A.rain ? 3 : 1, blendMode: A.blend, emitting: false,
        alpha: A.flicker ? { start: 0, end: 0, ease: (t) => Math.sin(t * Math.PI) * (0.6 + Math.random() * 0.4) } : { start: 0.9, end: 0 },
        rotate: A.rain ? 14 : { min: 0, max: 360 },
      }).setDepth(4950);
      this.em[k].rect = new Phaser.Geom.Rectangle(0, 0, 2000, 1400);
      this.em[k].setEmitZone({ type: 'random', source: this.em[k].rect });
    }
    // Étalonnage : voile coloré en mode « multiplier » sur tout l'écran
    this.grade = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1).setOrigin(0).setScrollFactor(0).setDepth(8990).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.gradeCol = new Phaser.Display.Color(255, 255, 255);
    this.zone = null;
    this.flashT = 4 + Math.random() * 6;
  }

  // Mode économie : moins de particules et pas d'ombres de nuages
  setLow(low) {
    this.low = low;
    this.clouds.forEach((c) => c.setVisible(!low));
    for (const e of Object.values(this.em)) e.frequency = low ? Math.max(e.frequency, 1) * 3 : e.frequency;
  }

  zoneAt(x, y) {
    if (this.colisee) return this.colisee;   // carte spéciale : 'colisee' ou 'breche'
    const b = BIOMES.find((bi) => x >= bi.x && x <= bi.x + bi.w && y >= bi.y && y <= bi.y + bi.h);
    if (b) return b.id;
    if (x >= CITY.x && x <= CITY.x + CITY.w && y >= CITY.y && y <= CITY.y + CITY.h) return 'ville';
    return 'plaine';
  }

  update(dt, cam) {
    const v = cam.worldView, cx = v.centerX, cy = v.centerY;
    // nuages : dérive vers l'est, réapparaissent de l'autre côté
    for (const c of this.clouds) { c.x += c.v * dt; c.y += c.v * 0.25 * dt; if (c.x > ARENA.width + 1400) { c.x = -1400; c.y = Math.random() * ARENA.height; } if (c.y > ARENA.height + 900) c.y = -900; }
    const z = this.zoneAt(cx, cy);
    if (z !== this.zone) {
      if (this.zone) this.em[this.zone].stop();
      this.zone = z; this.em[z].start();
    }
    // la zone d'émission suit la caméra (un peu plus large que l'écran)
    const A = AMB[z], e = this.em[z];
    const m = 120, rx = v.x - m + (A.speedX[0] > 20 ? -200 : 0), ry = A.speedY[0] > 30 ? v.y - 260 : v.y - m;
    e.setPosition(rx, ry);
    e.rect.setSize(v.width + m * 2 + 200, A.speedY[0] > 30 ? 200 : v.height + m * 2);
    // étalonnage progressif vers la couleur de la zone
    const tgt = Phaser.Display.Color.IntegerToColor(A.grade), g = this.gradeCol, k = Math.min(1, dt * 1.5);
    g.setTo(g.red + (tgt.red - g.red) * k, g.green + (tgt.green - g.green) * k, g.blue + (tgt.blue - g.blue) * k);
    this.grade.setSize(this.scene.scale.width, this.scene.scale.height).setFillStyle(g.color, 1);
    this.grade.setScale(1 / cam.zoom).setPosition((this.scene.scale.width * (1 - 1 / cam.zoom)) / 2, (this.scene.scale.height * (1 - 1 / cam.zoom)) / 2);
    // orage : éclairs de temps en temps
    if (z === 'orage' && (this.flashT -= dt) <= 0) { this.flashT = 3 + Math.random() * 7; cam.flash(140, 200, 210, 255, false); this.scene.time.delayedCall(180, () => cam.flash(90, 200, 210, 255, false)); }
  }
}
