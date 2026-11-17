// =====================================================================
//  DÉCOR : sol, terrains, bâtiments, Colisée, Brèche, mini-carte, zone du Battle royale
//  Méthodes ajoutées à ArenaScene (voir ArenaScene.js).
// =====================================================================
import Phaser from 'phaser';
import { couleurDe, emoteDe } from '../../../shared/cosmetiques.js';
import { reglages, surReglage, fxMul } from '../reglages.js';
import { RigSprite } from '../rig.js';
import { Ambiance } from '../ambiance.js';
import { Hero, HEROS } from '../hero.js';
import { sfx, toggleMute, setMusic, setAmbiance, foule } from '../sfx.js';
import { TOUCH, touch } from '../touch.js';
import { styleOf, SHAPES } from '../styles.js';
import { progress } from '../progress.js';
import { EVENTS, TERRAINS, terrainAt, terrainSpeed, ARENA, BIOMES, CONFIG, ELEMENTS, FUSIONS, BUILDINGS, CITY, ZOMBIES, TAGS, generateKit, insideBuilding, resolveCollisions, TOURNOI, tournoiPit, COLISEE, SURVIE, DUO, carteDu, areneProche, hasStatus as S } from '../../../shared/data.js';
import { elColor, lerp, R, CHAR_H, ZOMBIE_H, ZLOOK, ELITE_NOMS, FONT, D_GROUND, D_FX, D_UI, FX, PROPS, PROP_NAMES } from './commun.js';

export const decor = {
  // ---------------- Terrains élémentaires (lave, eau, glace, herbes hautes) ----------------
  makeTerrainTextures() {
    const mk = (key, draw) => { if (this.textures.exists(key)) return; const c = this.textures.createCanvas(key, 256, 256); draw(c.getContext(), 128); c.refresh(); };
    const rnd = new Phaser.Math.RandomDataGenerator(['terrain']);
    mk('ter_lave', (g, R) => {
      const gr = g.createRadialGradient(R, R, 10, R, R, R);
      gr.addColorStop(0, '#ffd23a'); gr.addColorStop(0.45, '#ff7a1a'); gr.addColorStop(0.8, '#b8260a'); gr.addColorStop(0.93, '#3a120a'); gr.addColorStop(1, 'rgba(30,10,5,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(60,15,5,.75)'; g.lineWidth = 4;
      for (let k = 0; k < 9; k++) { g.beginPath(); let x = R + rnd.between(-70, 70), y = R + rnd.between(-70, 70); g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += rnd.between(-26, 26); y += rnd.between(-26, 26); g.lineTo(x, y); } g.stroke(); }
    });
    mk('ter_eau', (g, R) => {
      const gr = g.createRadialGradient(R, R, 8, R, R, R);
      gr.addColorStop(0, '#0b3f8a'); gr.addColorStop(0.6, '#1c6bd0'); gr.addColorStop(0.86, '#58a8f0'); gr.addColorStop(0.95, '#cfe9ff'); gr.addColorStop(1, 'rgba(200,230,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(R + rnd.between(-50, 50), R + rnd.between(-50, 50), rnd.between(14, 30), 3.6, 5.6); g.stroke(); }
    });
    mk('ter_glace', (g, R) => {
      const gr = g.createRadialGradient(R, R, 10, R, R, R);
      gr.addColorStop(0, '#f2fcff'); gr.addColorStop(0.7, '#bfefff'); gr.addColorStop(0.92, '#86cfe8'); gr.addColorStop(1, 'rgba(134,207,232,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(90,150,180,.55)'; g.lineWidth = 2;
      for (let k = 0; k < 12; k++) { g.beginPath(); const a = rnd.frac() * 7; g.moveTo(R, R); g.lineTo(R + Math.cos(a) * rnd.between(40, 115), R + Math.sin(a) * rnd.between(40, 115)); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 10; k++) g.fillRect(R + rnd.between(-90, 90), R + rnd.between(-90, 90), 3, 3);
    });
    mk('ter_herbes', (g, R) => {
      const gr = g.createRadialGradient(R, R, 10, R, R, R);
      gr.addColorStop(0, '#2f6e2a'); gr.addColorStop(0.85, '#3d8a34'); gr.addColorStop(1, 'rgba(61,138,52,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
    });
    // touffe d'herbe haute (premier plan)
    mk('ter_touffe', (g) => {
      for (let k = 0; k < 26; k++) {
        const x = 128 + rnd.between(-90, 90), h = rnd.between(90, 170), lean = rnd.between(-30, 30);
        g.strokeStyle = ['#2c6b27', '#3f8f3a', '#56a84a', '#6fbf55'][k % 4]; g.lineWidth = rnd.between(5, 9); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, 250); g.quadraticCurveTo(x + lean * 0.3, 250 - h * 0.6, x + lean, 250 - h); g.stroke();
      }
    });
  },

  buildTerrains() {
    this.makeTerrainTextures();
    this.terrainFx = [];
    for (const T of TERRAINS) {
      const img = this.add.image(T.x, T.y, `ter_${T.type}`).setDisplaySize(T.r * 2.15, T.r * 2.15 * 0.92).setDepth(D_GROUND - 2);
      if (T.type === 'lave') {
        const gl = this.add.image(T.x, T.y, 'fx_glow').setTint(0xff6a1a).setBlendMode('ADD').setDepth(D_GROUND - 1).setDisplaySize(T.r * 2.6, T.r * 2.2);
        this.tweens.add({ targets: gl, alpha: 0.45, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1 });
        const em = this.add.particles(0, 0, 'fx_spark', { x: { min: T.x - T.r * 0.7, max: T.x + T.r * 0.7 }, y: { min: T.y - T.r * 0.6, max: T.y + T.r * 0.6 },
          speedY: { min: -60, max: -20 }, lifespan: 1200, scale: { start: 0.35, end: 0 }, tint: [0xffd23a, 0xff7a1a], blendMode: 'ADD', frequency: 140 }).setDepth(D_FX - 10);
        this.terrainFx.push(em);
      } else if (T.type === 'eau') {
        this.time.addEvent({ delay: 1400 + Math.random() * 800, loop: true, callback: () => {
          const a = Math.random() * 7, rr = Math.random() * T.r * 0.6;
          const ring = this.add.image(T.x + Math.cos(a) * rr, T.y + Math.sin(a) * rr * 0.9, 'fx_ring_thin').setTint(0xcfe9ff).setDepth(D_GROUND - 1).setScale(0.05, 0.03).setAlpha(0.6);
          this.tweens.add({ targets: ring, scaleX: 0.5, scaleY: 0.3, alpha: 0, duration: 1600, onComplete: () => ring.destroy() });
        } });
      } else if (T.type === 'glace') {
        img.setAlpha(0.92);
        this.time.addEvent({ delay: 700, loop: true, callback: () => { const a = Math.random() * 7, rr = Math.random() * T.r * 0.8; this.burst.glace?.explode(1, T.x + Math.cos(a) * rr, T.y + Math.sin(a) * rr); } });
      } else if (T.type === 'herbes') {
        // touffes au premier plan : on s'y cache vraiment
        const n = Math.round((T.r * T.r) / 1500);
        const rnd = new Phaser.Math.RandomDataGenerator([`h${T.x}`]);
        for (let k = 0; k < n; k++) {
          const a = rnd.frac() * 7, rr = Math.sqrt(rnd.frac()) * T.r * 0.85, x = T.x + Math.cos(a) * rr, y = T.y + Math.sin(a) * rr * 0.9;
          const tf = this.add.image(x, y, 'ter_touffe').setOrigin(0.5, 0.97).setScale(0.36 + rnd.frac() * 0.2).setDepth(y + 1).setFlipX(rnd.frac() < 0.5);
          this.tweens.add({ targets: tf, angle: { from: -2, to: 2 }, duration: 1400 + rnd.frac() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
    }
  },

  // ---------------- Monde : sol peint, bâtiments, décors ----------------
  // Décor hors de l'écran : on ne le dessine pas (et on met en pause ses particules).
  // Le monde compte ~800 éléments fixes dont seule une petite partie est visible à la fois.
  preparerCulling() {
    this.cullables = [];
    for (const o of this.children.list) {
      if (!o.visible || o.scrollFactorX === 0 || o === this.detailSol) continue;
      let b;
      if (o.type === 'ParticleEmitter') b = new Phaser.Geom.Rectangle(o.x - 160, o.y - 160, 320, 320);
      else if (o.getBounds) { b = o.getBounds(); if (!Number.isFinite(b.width) || b.width * b.height > 4e6) continue; }
      else continue;
      this.cullables.push({ o, b, vis: true });
    }
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.culling() });
  },

  culling() {
    const v = this.cameras.main.worldView, m = 260, V = new Phaser.Geom.Rectangle(v.x - m, v.y - m, v.width + m * 2, v.height + m * 2);
    for (const c of this.cullables) {
      const vis = Phaser.Geom.Rectangle.Overlaps(c.b, V);
      if (vis === c.vis) continue;
      c.vis = vis; c.o.setVisible(vis);
      if (c.o.type === 'ParticleEmitter') vis ? c.o.resume() : c.o.pause();
    }
  },

  buildWorld() {
    if (this.colisee) return this.buildColisee();
    if (this.breche) return this.buildBreche();
    const tw = ARENA.width / 2, th = ARENA.height / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      this.add.image(i * tw, j * th, `ground_${i}_${j}`).setOrigin(0).setDisplaySize(tw, th).setDepth(-100);
    }
    this.detailSol = this.add.tileSprite(0, 0, ARENA.width, ARENA.height, 'detail').setOrigin(0).setAlpha(0.22).setDepth(-99);

    this.buildTerrains();

    // Noms des zones, peints au sol
    for (const b of BIOMES) {
      this.add.text(b.x + b.w / 2, b.y + 70, b.nom.toUpperCase(), { fontFamily: FONT, fontSize: '40px', fontStyle: '900', color: ELEMENTS[b.element].css, stroke: '#000', strokeThickness: 6 })
        .setOrigin(0.5).setAlpha(0.35).setDepth(-98);
    }
    this.add.text(CITY.x + CITY.w / 2, CITY.y - 110, CITY.nom.toUpperCase(), { fontFamily: FONT, fontSize: '40px', fontStyle: '900', color: '#b8e07a', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5).setAlpha(0.4).setDepth(-98);

    // Bâtiments (triés par profondeur avec les persos)
    const meta = this.cache.json.get('bmeta') || [];
    const decor = this.textures.exists('decor') ? this.textures.get('decor') : null;
    meta.forEach((m, i) => { if (decor?.has(`b${i}`)) this.add.image(m.x, m.y, 'decor', `b${i}`).setOrigin(0).setDepth(m.depth); });

    // Décors
    const rng = new Phaser.Math.RandomDataGenerator(['decor-v1']);
    const pick = (list) => { const tot = list.reduce((s, [, w]) => s + w, 0); let r = rng.frac() * tot; for (const [n, w] of list) { r -= w; if (r <= 0) return n; } return list[0][0]; };
    const place = (name, x, y) => {
      if (!decor?.has(`p_${name}`)) return;
      this.add.image(x, y, 'decor', `p_${name}`).setOrigin(0.5, 0.96).setDepth(y).setFlipX(rng.frac() < 0.5);
    };
    const inCity = (x, y, m = 80) => x > CITY.x - m && x < CITY.x + CITY.w + m && y > CITY.y - m && y < CITY.y + CITY.h + m;
    const biomeAt = (x, y) => BIOMES.find((b) => x > b.x + 40 && x < b.x + b.w - 40 && y > b.y + 40 && y < b.y + b.h - 40);
    let placed = 0;
    for (let k = 0; k < 2600 && placed < 260; k++) {
      const x = 80 + rng.frac() * (ARENA.width - 160), y = 80 + rng.frac() * (ARENA.height - 160);
      if (inCity(x, y) || insideBuilding(x, y, 46) || terrainAt(x, y) >= 0) continue;
      const b = biomeAt(x, y);
      if (!b && rng.frac() < 0.55) continue;
      place(pick(PROPS[b ? b.id : 'plaine']), x, y); placed++;
    }
    // Lampadaires et caisses le long des rues de la ville
    for (let k = 0; k < 400; k++) {
      const x = CITY.x + rng.frac() * CITY.w, y = CITY.y + rng.frac() * CITY.h;
      if (insideBuilding(x, y, 40)) continue;
      if (rng.frac() < 0.07) place(rng.frac() < 0.6 ? 'lampadaire' : 'caisse', x, y);
    }
  },

  // Nombre de duels du tour en cours (8 combattants : 4, puis 2, puis la finale)
  nbDuels() { return Math.max(1, 8 >> Math.max(1, this.room.state.round || 1)); },

  // ---------------- LE COLISÉE (carte du tournoi) ----------------
  // 4 grandes arènes de duel + l'arène de la finale au centre. Sol de sable dégagé,
  // murets, gradins remplis de spectateurs, braseros et 4 piliers par arène.
  buildColiseeTextures() {
    const rng = new Phaser.Math.RandomDataGenerator(['colisee-v1']);
    const tex = (key, w, h, draw) => { if (this.textures.exists(key)) return; const t = this.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh(); };
    // Dallage sombre entre les arènes
    tex('col_dalle', 256, 256, (c, w, h) => {
      c.fillStyle = '#25222a'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const v = 34 + Math.floor(rng.frac() * 14); c.fillStyle = `rgb(${v},${v - 3},${v + 4})`;
        c.fillRect(x * 64 + (y % 2) * 32 + 2, y * 64 + 2, 60, 60);
      }
    });
    // Sable de l'arène : dégradé, ratissage concentrique, emblème au centre
    tex('col_sable', 1024, 1024, (c, w) => {
      const R = w / 2, g = c.createRadialGradient(R, R, 40, R, R, R);
      g.addColorStop(0, '#e2c48e'); g.addColorStop(0.7, '#cfac72'); g.addColorStop(1, '#a9844f');
      c.fillStyle = g; c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 2600; i++) { const a = rng.frac() * 6.283, d = Math.sqrt(rng.frac()) * R; c.fillStyle = rng.frac() < 0.5 ? 'rgba(90,60,30,.12)' : 'rgba(255,240,200,.12)'; c.fillRect(R + Math.cos(a) * d, R + Math.sin(a) * d, 3, 3); }
      c.strokeStyle = 'rgba(120,85,45,.18)'; c.lineWidth = 3;
      for (let r = 120; r < R - 20; r += 70) { c.beginPath(); c.arc(R, R, r, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = 'rgba(140,40,30,.45)'; c.lineWidth = 10; c.beginPath(); c.arc(R, R, 150, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 6; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; c.beginPath(); c.moveTo(R + Math.cos(a) * 150, R + Math.sin(a) * 150); c.lineTo(R + Math.cos(a) * 230, R + Math.sin(a) * 230); c.stroke(); }
      c.fillStyle = 'rgba(140,40,30,.35)'; c.beginPath(); c.arc(R, R, 60, 0, Math.PI * 2); c.fill();
    });
    // Pilier de pierre (avec chapiteau), vu de face
    tex('col_pilier', 90, 230, (c) => {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(45, 220, 44, 10, 0, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(14, 0, 76, 0); g.addColorStop(0, '#8d8577'); g.addColorStop(0.45, '#d9d1c2'); g.addColorStop(1, '#6e665a');
      c.fillStyle = g; c.fillRect(16, 34, 58, 176);
      c.strokeStyle = 'rgba(60,50,40,.35)'; c.lineWidth = 2; for (let x = 26; x < 74; x += 11) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x, 205); c.stroke(); }
      c.fillStyle = '#bdb3a2'; c.fillRect(6, 20, 78, 16); c.fillRect(10, 8, 70, 14); c.fillRect(8, 204, 74, 14);
      c.fillStyle = '#e6decf'; c.fillRect(6, 20, 78, 4); c.fillRect(10, 8, 70, 4);
    });
    tex('col_feu', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.35, 'rgba(255,150,40,.8)'); g.addColorStop(1, 'rgba(255,80,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });

  },

  buildColisee() {
    this.buildColiseeTextures();
    const rng = new Phaser.Math.RandomDataGenerator(['colisee-v1b']);
    this.add.tileSprite(-300, -300, ARENA.width + 600, ARENA.height + 600, 'col_dalle').setOrigin(0).setDepth(-100);
    const NOMS = ['ARÈNE DU LEVANT', 'ARÈNE DU COUCHANT', 'ARÈNE DES TEMPÊTES', 'ARÈNE DES BRAISES', 'GRANDE FINALE'];
    const crowdCols = ['#d94a3a', '#3a7ad9', '#e0c040', '#5fcf4a', '#b05fd9', '#e8e0d0', '#ff8a3a', '#4ad9c8'];
    const rangs = 6, pas = 42;
    // Gradins, public, muret, sable : tout est dessiné UNE fois dans une image (des milliers de spectateurs
    // dessinés en direct ralentissaient énormément le jeu). Les 4 arènes de duel partagent la même image.
    const cuire = (key, R, finale) => this.cuireArene(key, R, R + 34 + rangs * pas + 20, (c) => {
      for (let k = rangs - 1; k >= 0; k--) { c.fillStyle = k % 2 ? '#4a4038' : '#564a40'; c.beginPath(); c.arc(0, 0, R + 34 + (k + 1) * pas, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3a3029'; c.beginPath(); c.arc(0, 0, R + 34, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < rangs; k++) {
        const rr = R + 34 + k * pas + pas / 2, n = Math.floor((2 * Math.PI * rr) / 15);
        for (let j = 0; j < n; j++) {
          if (rng.frac() < 0.12) continue;
          const ang = (j / n) * Math.PI * 2;
          c.globalAlpha = 0.85; c.fillStyle = crowdCols[Math.floor(rng.frac() * crowdCols.length)];
          c.beginPath(); c.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 5, 0, Math.PI * 2); c.fill();
        }
      }
      c.globalAlpha = 1;
      c.drawImage(this.textures.get('col_sable').getSourceImage(), -R, -R, R * 2, R * 2);
      c.lineWidth = 26; c.strokeStyle = '#8d8577'; c.beginPath(); c.arc(0, 0, R + 16, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 6; c.strokeStyle = '#d9d1c2'; c.beginPath(); c.arc(0, 0, R + 6, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 3; c.strokeStyle = finale ? '#ffcf3a' : '#c9a46a'; c.beginPath(); c.arc(0, 0, R + 28, 0, Math.PI * 2); c.stroke();
      const nbB = finale ? 12 : 8;
      for (let k = 0; k < nbB; k++) {
        const ang = (k / nbB) * Math.PI * 2 + Math.PI / nbB, x = Math.cos(ang) * (R + 16), y = Math.sin(ang) * (R + 16);
        c.fillStyle = '#2a2420'; c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#6b4a2a'; c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
      }
    });
    [...COLISEE.arenes, COLISEE.finale].forEach((a, i) => {
      const finale = i === 4, R = a.r;
      const key = finale ? 'arene_finale' : 'arene_duel';
      cuire(key, R, finale);
      this.add.image(a.x, a.y, key).setDisplaySize(this.areneTaille[key], this.areneTaille[key]).setDepth(-97);
      this.add.text(a.x, a.y - R - 34 - rangs * pas - 40, NOMS[i], { fontFamily: FONT, fontSize: finale ? '64px' : '46px', fontStyle: '900', color: finale ? '#ffcf3a' : '#e8d4a8', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0.9).setDepth(-96);
      // flammes des braseros (le socle est dans l'image)
      const nbB = finale ? 12 : 8;
      for (let k = 0; k < nbB; k++) {
        const ang = (k / nbB) * Math.PI * 2 + Math.PI / nbB, x = a.x + Math.cos(ang) * (R + 16), y = a.y + Math.sin(ang) * (R + 16);
        const f = this.add.image(x, y - 6, 'col_feu').setBlendMode('ADD').setScale(1.1).setDepth(y + 2);
        this.tweens.add({ targets: f, scale: { from: 0.9, to: 1.35 }, alpha: { from: 0.75, to: 1 }, duration: 260 + rng.frac() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
    // piliers (triés en profondeur avec les persos)
    for (const b of COLISEE.piliers) this.add.image(b.x + b.w / 2, b.y + b.h - 6, 'col_pilier').setOrigin(0.5, 0.95).setScale(0.8, 0.68).setDepth(b.y + b.h - 6);
  },

  // Dessine une arène (gradins, sol, murs…) une seule fois dans une texture, à demi-résolution.
  // Une image fixe ne coûte presque rien à afficher, contrairement à des milliers de formes redessinées.
  cuireArene(key, R, rayonExt, dessin) {
    this.areneTaille ||= {};
    this.areneTaille[key] = rayonExt * 2;
    if (this.textures.exists(key)) return;
    const k = 0.55, S = Math.ceil(rayonExt * 2 * k);
    const t = this.textures.createCanvas(key, S, S), c = t.getContext();
    c.save(); c.translate(S / 2, S / 2); c.scale(k, k);
    dessin(c);
    c.restore(); t.refresh();
  },

  // ---------------- LA BRÈCHE (carte de la Survie) ----------------
  // Une seule grande arène en ruines, de nuit, fermée par 4 portails d'où sortent les monstres.
  buildBreche() {
    this.buildColiseeTextures();
    const A = SURVIE.arene, rng = new Phaser.Math.RandomDataGenerator(['breche-v1']);
    this.add.tileSprite(-300, -300, ARENA.width + 600, ARENA.height + 600, 'col_dalle').setOrigin(0).setDepth(-100).setTint(0x7a6a8a);
    // remparts, éboulis, muret, sol violacé et fissures : dessinés une seule fois dans une image
    const ext = A.r + 34 + 5 * 40 + 80;
    this.cuireArene('arene_breche', A.r, ext, (c) => {
      for (let k = 5; k >= 0; k--) { c.fillStyle = k % 2 ? '#2a2230' : '#342a3c'; c.beginPath(); c.arc(0, 0, A.r + 34 + k * 40 + 40, 0, Math.PI * 2); c.fill(); }
      for (let i = 0; i < 260; i++) {
        const a = rng.frac() * Math.PI * 2, d = A.r + 50 + rng.frac() * 230, sz = 6 + rng.frac() * 16;
        c.fillStyle = ['#4a3f52', '#3a3042', '#5a4e62'][Math.floor(rng.frac() * 3)];
        c.beginPath(); c.roundRect(Math.cos(a) * d - sz / 2, Math.sin(a) * d - sz / 2, sz, sz * 0.8, 3); c.fill();
      }
      // sable assombri (teinte violette)
      c.save(); c.beginPath(); c.arc(0, 0, A.r, 0, Math.PI * 2); c.clip();
      c.drawImage(this.textures.get('col_sable').getSourceImage(), -A.r, -A.r, A.r * 2, A.r * 2);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = '#8a7090'; c.fillRect(-A.r, -A.r, A.r * 2, A.r * 2);
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(176,106,255,.35)'; c.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        let x = (rng.frac() - 0.5) * A.r * 1.4, y = (rng.frac() - 0.5) * A.r * 1.4, a = rng.frac() * Math.PI * 2;
        if (Math.hypot(x, y) > A.r - 60) continue;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 0; j < 7; j++) { a += (rng.frac() - 0.5) * 1.2; x += Math.cos(a) * 40; y += Math.sin(a) * 40; c.lineTo(x, y); }
        c.stroke();
      }
      c.restore();
      c.lineWidth = 26; c.strokeStyle = '#5a4e62'; c.beginPath(); c.arc(0, 0, A.r + 16, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 5; c.strokeStyle = '#8a7a9a'; c.beginPath(); c.arc(0, 0, A.r + 6, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 3; c.strokeStyle = 'rgba(176,106,255,.8)'; c.beginPath(); c.arc(0, 0, A.r + 28, 0, Math.PI * 2); c.stroke();
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2 + Math.PI / 12;
        c.fillStyle = '#1a141e'; c.beginPath(); c.arc(Math.cos(ang) * (A.r + 16), Math.sin(ang) * (A.r + 16), 16, 0, Math.PI * 2); c.fill();
      }
    });
    this.add.image(A.x, A.y, 'arene_breche').setDisplaySize(ext * 2, ext * 2).setDepth(-97);
    this.add.text(A.x, A.y - A.r - 330, 'LA BRÈCHE', { fontFamily: FONT, fontSize: '72px', fontStyle: '900', color: '#d08aff', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(-95);
    // 4 portails : vortex violets qui tournent
    this.portails = SURVIE.portails.map((a) => {
      const x = A.x + Math.cos(a) * (A.r - 10), y = A.y + Math.sin(a) * (A.r - 10);
      const halo = this.add.image(x, y, 'fx_glow').setTint(0x9a3aff).setBlendMode('ADD').setScale(2.6, 1.6).setDepth(-94).setAlpha(0.8);
      const sw = this.add.image(x, y, 'fx_swirl').setTint(0xd08aff).setBlendMode('ADD').setScale(1.4, 0.9).setDepth(-93);
      this.tweens.add({ targets: sw, angle: 360, duration: 3000, repeat: -1 });
      this.tweens.add({ targets: halo, alpha: { from: 0.5, to: 0.95 }, duration: 900, yoyo: true, repeat: -1 });
      return sw;
    });
    // braseros violets sur le rempart
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2 + Math.PI / 12, x = A.x + Math.cos(ang) * (A.r + 16), y = A.y + Math.sin(ang) * (A.r + 16);
      const f = this.add.image(x, y - 6, 'col_feu').setBlendMode('ADD').setTint(0xb06aff).setDepth(y + 2);
      this.tweens.add({ targets: f, scale: { from: 0.9, to: 1.35 }, alpha: { from: 0.7, to: 1 }, duration: 260 + rng.frac() * 200, yoyo: true, repeat: -1 });
    }
    for (const b of SURVIE.piliers) this.add.image(b.x + b.w / 2, b.y + b.h - 6, 'col_pilier').setOrigin(0.5, 0.95).setScale(0.95, 0.8).setTint(0x9a8aa8).setDepth(b.y + b.h - 6);
  },

  drawStorm(time) {
    const st = this.room.state, g = this.stormG.clear();
    if (st.mode === 'duo' && st.phase === 'jeu') g.lineStyle(18, 0x6ab8ff, 0.18 + Math.sin(time / 260) * 0.08).strokeCircle(DUO.arene.x, DUO.arene.y, DUO.arene.r - 6);
    if (st.mode === 'tournoi' && st.phase === 'jeu') {
      // arènes de duel : anneaux dorés
      const used = new Set(); st.players.forEach((p) => { if (p.alive && p.duel !== 255) used.add(p.duel); });
      const nb = this.nbDuels();
      used.forEach((k) => {
        const c = tournoiPit(k, nb);   // arène où se joue un duel : l'anneau doré s'illumine
        g.lineStyle(18, 0xffcf3a, 0.22 + Math.sin(time / 220) * 0.1).strokeCircle(c.x, c.y, c.r - 6);
        g.lineStyle(3, 0xfff2a8, 0.9).strokeCircle(c.x, c.y, c.r - 6);
      });
      return;
    }
    if (st.mode !== 'royale' || st.phase !== 'jeu' || !st.zoneR) return;
    const W = 6000;  // anneau très épais = tout ce qui est hors zone
    g.lineStyle(W, 0x5a1a8a, 0.32).strokeCircle(st.zoneX, st.zoneY, st.zoneR + W / 2);
    g.lineStyle(10, 0xc080ff, 0.35 + Math.sin(time / 200) * 0.2).strokeCircle(st.zoneX, st.zoneY, st.zoneR);
    g.lineStyle(3, 0xffffff, 0.7).strokeCircle(st.zoneX, st.zoneY, st.zoneR);
  },

  // ---------------- Mini-carte ----------------
  drawMinimapBg(g, W, H, s, x0, y0) {
    g.fillStyle(0x0e1015, 0.85).fillRoundedRect(x0 - 4, y0 - 4, W + 8, H + 8, 8);
    if (this.breche) {
      const A = SURVIE.arene;
      g.fillStyle(0x140f1a, 1).fillRect(x0, y0, W, H);
      g.fillStyle(0x2e2436, 1).fillCircle(x0 + A.x * s, y0 + A.y * s, (A.r + 90) * s); g.fillStyle(0x4a3f52, 1).fillCircle(x0 + A.x * s, y0 + A.y * s, A.r * s);
      g.fillStyle(0xb06aff, 1); for (const a of SURVIE.portails) g.fillCircle(x0 + (A.x + Math.cos(a) * A.r) * s, y0 + (A.y + Math.sin(a) * A.r) * s, 4);
      g.fillStyle(0x6b6158, 1); for (const b of SURVIE.piliers) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
    } else if (this.colisee) {
      g.fillStyle(0x1c1a20, 1).fillRect(x0, y0, W, H);
      for (const a of [...COLISEE.arenes, COLISEE.finale]) { g.fillStyle(0x4a3d33, 1).fillCircle(x0 + a.x * s, y0 + a.y * s, (a.r + 120) * s); g.fillStyle(0xc9a46a, 1).fillCircle(x0 + a.x * s, y0 + a.y * s, a.r * s); }
      g.fillStyle(0x6b6158, 1); for (const b of COLISEE.piliers) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
    } else {
    g.fillStyle(0x3a5a30, 1).fillRect(x0, y0, W, H);
    for (const b of BIOMES) g.fillStyle(b.color, 1).fillRect(x0 + b.x * s, y0 + b.y * s, b.w * s, b.h * s);
    g.fillStyle(0x5a5854, 1).fillRect(x0 + CITY.x * s, y0 + CITY.y * s, CITY.w * s, CITY.h * s);
    for (const T of TERRAINS) g.fillStyle({ lave: 0xff6a1a, eau: 0x2f8cff, glace: 0xcff4ff, herbes: 0x2c6b27 }[T.type], 0.9).fillCircle(x0 + T.x * s, y0 + T.y * s, Math.max(2, T.r * s));
    g.fillStyle(0x2a2a2e, 1);
    for (const b of BUILDINGS) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
    }
  },

  // Mini-carte : le fond (zones, bâtiments, arènes) ne change pas -> dessiné une seule fois ;
  // les points (joueurs, monstres) sont redessinés ~12 fois par seconde seulement.
  drawMinimap(myId) {
    const W = TOUCH ? 150 : 220, H = (W * ARENA.height) / ARENA.width, s = W / ARENA.width;
    const x0 = TOUCH ? this.scale.width - W - 14 : 18, y0 = TOUCH ? 14 : this.scale.height - H - 18;
    const lay = `${x0},${y0},${W}`;
    if (this.miniLay !== lay) {
      // fond dessiné une fois dans une texture (les cercles remplis coûtent cher à redessiner à chaque image)
      this.miniLay = lay;
      const tg = this.make.graphics({ add: false });
      this.drawMinimapBg(tg, W, H, s, 4, 4);
      if (this.textures.exists('minifond')) this.textures.remove('minifond');
      tg.generateTexture('minifond', Math.ceil(W + 8), Math.ceil(H + 8)); tg.destroy();
      this.miniBg.setTexture('minifond'); this.miniPos = { x: x0 - 4, y: y0 - 4 };
    }
    const now = this.time.now;
    if (now - (this.miniT || 0) < 80) return;
    this.miniT = now;
    const g = this.miniG.clear();
    g.fillStyle(0x0e1015, 0.85).fillRoundedRect(x0 - 4, y0 - 4, W + 8, H + 8, 8);
    if (this.breche) {
      const A = SURVIE.arene;
      g.fillStyle(0x140f1a, 1).fillRect(x0, y0, W, H);
      g.fillStyle(0x2e2436, 1).fillCircle(x0 + A.x * s, y0 + A.y * s, (A.r + 90) * s); g.fillStyle(0x4a3f52, 1).fillCircle(x0 + A.x * s, y0 + A.y * s, A.r * s);
      g.fillStyle(0xb06aff, 1); for (const a of SURVIE.portails) g.fillCircle(x0 + (A.x + Math.cos(a) * A.r) * s, y0 + (A.y + Math.sin(a) * A.r) * s, 4);
      g.fillStyle(0x6b6158, 1); for (const b of SURVIE.piliers) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
    } else if (this.colisee) {
      g.fillStyle(0x1c1a20, 1).fillRect(x0, y0, W, H);
      for (const a of [...COLISEE.arenes, COLISEE.finale]) { g.fillStyle(0x4a3d33, 1).fillCircle(x0 + a.x * s, y0 + a.y * s, (a.r + 120) * s); g.fillStyle(0xc9a46a, 1).fillCircle(x0 + a.x * s, y0 + a.y * s, a.r * s); }
      g.fillStyle(0x6b6158, 1); for (const b of COLISEE.piliers) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
    } else {
    g.fillStyle(0x3a5a30, 1).fillRect(x0, y0, W, H);
    for (const b of BIOMES) g.fillStyle(b.color, 1).fillRect(x0 + b.x * s, y0 + b.y * s, b.w * s, b.h * s);
    g.fillStyle(0x5a5854, 1).fillRect(x0 + CITY.x * s, y0 + CITY.y * s, CITY.w * s, CITY.h * s);
    for (const T of TERRAINS) g.fillStyle({ lave: 0xff6a1a, eau: 0x2f8cff, glace: 0xcff4ff, herbes: 0x2c6b27 }[T.type], 0.9).fillCircle(x0 + T.x * s, y0 + T.y * s, Math.max(2, T.r * s));
    g.fillStyle(0x2a2a2e, 1);
    for (const b of BUILDINGS) g.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
    }
    g.fillStyle(0x8fd14f, 0.9);
    this.room.state.zombies.forEach((z) => g.fillRect(x0 + z.x * s - 1, y0 + z.y * s - 1, 2, 2));
    this.room.state.zones.forEach((z) => { if (z.kind === 'tornade' || z.kind === 'zone') g.fillStyle(elColor(z.el), 0.5).fillCircle(x0 + z.x * s, y0 + z.y * s, Math.max(2, z.r * s)); });
    this.room.state.players.forEach((p, id) => {
      if (!p.alive || (S(p, 'invis') && id !== myId)) return;
      { const r = id === myId ? 4 : 2.5; g.fillStyle(id === myId ? 0xffffff : this.duo && p.eq ? (p.eq === this.room.state.players.get(myId)?.eq ? 0x3a9aff : 0xff3a2a) : elColor(p.a), 1).fillRect(x0 + p.x * s - r, y0 + p.y * s - r, r * 2, r * 2); }
    });
    const st = this.room.state;
    st.orbs.forEach((o) => { if (o.k) g.fillStyle(0xffcf3a, 0.6 + Math.sin(this.time.now / 150) * 0.4).fillCircle(x0 + o.x * s, y0 + o.y * s, 5); });
    if (st.mode === 'tournoi' && st.phase === 'jeu') {
      const used = new Set(); st.players.forEach((p) => { if (p.alive && p.duel !== 255) used.add(p.duel); });
      const nb = this.nbDuels();
      used.forEach((k) => { const c = tournoiPit(k, nb); g.lineStyle(2, 0xffcf3a, 1).strokeCircle(x0 + c.x * s, y0 + c.y * s, c.r * s); });
    }
    if (st.mode === 'royale' && st.phase === 'jeu' && st.zoneR) g.lineStyle(2, 0xc080ff, 1).strokeCircle(x0 + st.zoneX * s, y0 + st.zoneY * s, st.zoneR * s);
    const v = this.cameras.main.worldView;
    const vx = Math.max(0, v.x), vy = Math.max(0, v.y);
    g.lineStyle(1, 0xffffff, 0.6).strokeRect(x0 + vx * s, y0 + vy * s, (Math.min(ARENA.width, v.right) - vx) * s, (Math.min(ARENA.height, v.bottom) - vy) * s);
  },

};
