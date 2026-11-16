import Phaser from 'phaser';
import { couleurDe, emoteDe } from '../../shared/cosmetiques.js';
import { RigSprite } from './rig.js';
import { Ambiance } from './ambiance.js';
import { Hero, HEROS } from './hero.js';
import { sfx, toggleMute, setMusic, setAmbiance, foule } from './sfx.js';
import { TOUCH, touch } from './touch.js';
import { styleOf, SHAPES } from './styles.js';
import { progress } from './progress.js';
import { EVENTS, TERRAINS, terrainAt, terrainSpeed, ARENA, BIOMES, CONFIG, ELEMENTS, FUSIONS, BUILDINGS, CITY, ZOMBIES, TAGS, generateKit, insideBuilding, resolveCollisions, TOURNOI, tournoiPit, COLISEE, SURVIE, DUO, carteDu, areneProche, hasStatus as S } from '../../shared/data.js';

const elColor = (el) => ELEMENTS[el]?.color ?? (el === 'zombie' ? 0x8fd14f : 0xffffff);
const lerp = (a, b, t) => a + (b - a) * t;
const R = CONFIG.playerRadius;
const CHAR_H = 120;                                   // hauteur d'affichage des persos
const ZOMBIE_H = { rodeur: 84, coureur: 64, colosse: 150, titan: 270, cracheur: 80, kamikaze: 62, chaman: 90, porteur: 122, esprit: 60, liche: 220, behemoth: 250 };
// Apparence des monstres de la Survie : image de base, teinte, lueur
const ZLOOK = {
  titan:    { tex: 'zb_colosse', tint: 0xff9a8a, glow: 0xff3020 },
  cracheur: { tex: 'zb_rodeur',  tint: 0xb8ff6a, glow: 0x7aff3a },
  kamikaze: { tex: 'zb_coureur', tint: 0xff7a4a, glow: 0xff4010, pulse: true },
  chaman:   { tex: 'zb_rodeur',  tint: 0xc89aff, glow: 0xb06aff },
  porteur:  { tex: 'zb_colosse', tint: 0x9ab8e0 },
  liche:    { tex: 'zb_rodeur',  tint: 0x9a6aff, glow: 0x7a2aff },
  behemoth: { tex: 'zb_colosse', tint: 0xd08a5a, glow: 0xff7a20 },
};
const ELITE_NOMS = { 1: 'Rapide', 2: 'Explosif', 3: 'Vampire', 4: 'Invocateur', 5: 'Blindé' };
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const D_GROUND = -50, D_FX = 5000, D_UI = 6000;       // couches de profondeur (le reste = tri par Y)

// ---------------------------------------------------------------------
//  Particules par élément
// ---------------------------------------------------------------------
const FX = {
  feu:    { tex: 'fx_glow',   tint: [0xffd040, 0xff7a1a, 0xff3a00], scale: { start: 0.32, end: 0 }, speed: { min: 10, max: 40 }, lifespan: 380, gravityY: -80, blendMode: 'ADD', frequency: 16 },
  eau:    { tex: 'fx_drop',   tint: [0x7cc8ff, 0x3a9cff, 0xd0f0ff], scale: { start: 0.6, end: 0.15 }, speed: { min: 20, max: 50 }, lifespan: 420, gravityY: 160, alpha: { start: 0.9, end: 0 }, frequency: 26 },
  terre:  { tex: 'fx_debris', tint: [0xa8845a, 0x6b5338, 0x8a7a66], scale: { start: 0.7, end: 0.3 }, rotate: { min: 0, max: 360 }, speed: { min: 20, max: 60 }, lifespan: 480, gravityY: 260, frequency: 40 },
  vent:   { tex: 'fx_streak', tint: [0xd8fff2, 0x9fe8d0], scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.7, end: 0 }, speed: { min: 5, max: 20 }, lifespan: 260, blendMode: 'ADD', frequency: 22 },
  eclair: { tex: 'fx_spark',  tint: [0xffffff, 0xfff07a, 0xffe14a], scale: { start: 0.7, end: 0 }, speed: { min: 40, max: 140 }, lifespan: 170, blendMode: 'ADD', frequency: 16 },
  glace:  { tex: 'fx_shard',  tint: [0xe8faff, 0x9be7ff], scale: { start: 0.55, end: 0.1 }, rotate: { min: 0, max: 360 }, speed: { min: 15, max: 45 }, lifespan: 440, blendMode: 'ADD', frequency: 32 },
  ombre:  { tex: 'fx_smoke',  tint: [0x2a1650, 0x5a2aa0, 0x8a5cff], scale: { start: 0.35, end: 0.8 }, alpha: { start: 0.75, end: 0 }, speed: { min: 5, max: 20 }, lifespan: 540, frequency: 26 },
  metal:  { tex: 'fx_spark',  tint: [0xffffff, 0xc8d2dc, 0xffd890], scale: { start: 0.45, end: 0 }, speed: { min: 60, max: 170 }, lifespan: 220, blendMode: 'ADD', frequency: 28 },
  lumiere: { tex: 'fx_glow',  tint: [0xffffff, 0xfff6c8, 0xffe08a], scale: { start: 0.28, end: 0 }, speed: { min: 10, max: 50 }, lifespan: 420, gravityY: -40, blendMode: 'ADD', frequency: 22 },
  nature:  { tex: 'fx_leaf',  tint: [0x5fcf4a, 0x9be86a, 0x3f8f3a], scale: { start: 0.45, end: 0.15 }, rotate: { min: 0, max: 360 }, speed: { min: 15, max: 45 }, lifespan: 520, gravityY: 90, frequency: 30 },
  zombie: { tex: 'fx_smoke',  tint: [0x4a6a2a, 0x8fd14f], scale: { start: 0.3, end: 0.6 }, alpha: { start: 0.6, end: 0 }, speed: { min: 20, max: 60 }, lifespan: 500, frequency: 50 },
};

// Décors par zone : [nom, poids]
const PROPS = {
  plaine:   [['arbre', 5], ['arbre2', 4], ['buisson', 4], ['rocher', 2]],
  volcan:   [['roche_lave', 5], ['arbre_brule', 3]],
  lac:      [['arbre_bleu', 4], ['roseaux', 5], ['buisson', 2]],
  montagne: [['rocher_brun', 5], ['sapin', 4], ['rocher', 2]],
  plateau:  [['arbre2', 3], ['buisson', 4], ['rocher', 2]],
  pics:     [['sapin_neige', 6], ['cristal_glace', 3]],
  fonderie: [['tuyau', 4], ['caisse', 4]],
  marais:   [['arbre_mort', 5], ['tombe', 4], ['cristal_ombre', 2]],
  orage:    [['cristal_orage', 3], ['arbre_brule', 3], ['rocher_brun', 3]],
  sanctuaire: [['cristal_lumiere', 5], ['lampadaire', 2], ['buisson', 2]],
  foret:    [['arbre', 6], ['arbre2', 6], ['buisson', 5], ['sapin', 2]],
};
const PROP_NAMES = [...new Set(Object.values(PROPS).flat().map(([n]) => n)), 'lampadaire', 'caisse'];

export class ArenaScene extends Phaser.Scene {
  constructor() { super('arena'); }

  init({ room, hud, bus }) {
    this.room = room;
    this.hud = hud;
    this.bus = bus;   // branché à la fin de create(), quand les effets sont prêts
    this.disp = new Map();       // positions interpolées
    this.chars = new Map();      // id -> { spr, aura, label, ... }
    this.zombieObjs = new Map();
    this.projObjs = new Map();
    this.projSim = new Map();      // projectiles simulés localement
    this.pred = null;              // position prédite du joueur local
    this.zoneObjs = new Map();
    this.orbObjs = new Map();
    this.flash = new Map();      // id -> fin du flash blanc
    this.kitCache = {};
    this.lastInput = '';
    this.lastInputSent = 0;
    this.lastBasic = 0;
  }

  // ---------------- Chargement des assets ----------------
  preload() {
    this.colisee = this.room.state.mode === 'tournoi' || this.room.state.mode === 'duo';     // tournoi et duo se jouent dans le Colisée
    this.duo = this.room.state.mode === 'duo';
    this.breche = this.room.state.mode === 'survie';       // la Survie dans la Brèche
    Object.assign(this, carteDu(this.room.state.mode));   // obstacles + terrains de la carte
    const W = this.scale.width, H = this.scale.height;
    const txt = this.add.text(W / 2, H / 2, 'Chargement de l’arène…', { fontSize: '22px', color: '#ffffff', fontStyle: '700' }).setOrigin(0.5);
    this.load.on('progress', (v) => txt.setText(`Chargement de l’arène… ${Math.round(v * 100)} %`));
    this.load.on('complete', () => txt.destroy());
    this.load.on('loaderror', () => {}); // une image manquante ne bloque pas le jeu

    if (!this.colisee && !this.breche) {   // le Colisée et la Brèche n'ont besoin ni du sol, ni des bâtiments, ni des décors du monde
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) this.load.image(`ground_${i}_${j}`, `/art/ground_${i}_${j}.webp`);
      this.load.json('bmeta', '/art/buildings.json');
      // bâtiments + décors réunis dans un seul atlas : le GPU dessine tout le décor d'un coup
      this.load.atlas('decor', '/art/atlas_decor.webp', '/art/atlas_decor.json');
    }
    this.load.image('detail', '/art/detail.png');
    for (const f of ['glow', 'core', 'ring', 'ring_thin', 'spark', 'streak', 'smoke', 'shard', 'debris', 'drop', 'blade', 'swirl', 'orbe', 'slash', 'rays', 'runes']) this.load.image(`fx_${f}`, `/art/fx/${f}.png`);
    this.load.image('fx_crater', '/art/fx/crater.png');
    for (const f of SHAPES) this.load.image(`fx_${f}`, `/art/fx/${f}.png`);
    for (const k of Object.keys(FUSIONS)) this.load.image(`spr_${k}`, `/sprites/${encodeURIComponent(k)}.webp`);
    for (const k of ['rodeur', 'coureur', 'colosse']) this.load.image(`zb_${k}`, `/zombies/${k}.webp`);   // les autres monstres réutilisent ces images
    // Poses d'attaque (facultatives) : listées dans sprites_atk/index.json
    this.load.json('atkList', '/sprites_atk/index.json');
    // Kits de pièces détachées (personnages animés par squelette) : heros/index.json
    this.load.json('herosIdx', '/heros/index.json');
    this.load.on('filecomplete-json-herosIdx', (key, type, idx) => {
      for (const [k, parts] of Object.entries(idx || {})) for (const pc of Object.keys(parts)) this.load.image(`kit_${k}_${pc}`, `/heros/${encodeURIComponent(k)}/${pc}.webp`);
    });
    // Animations image par image (planches générées) : sprites_anim/index.json
    this.load.json('animIdx', '/sprites_anim/index.json');
    this.load.on('filecomplete-json-animIdx', (key, type, idx) => {
      for (const [k, A] of Object.entries(idx || {})) for (const n of ['run', 'atk', 'idle', 'cast']) for (let i = 0; i < (A[n] || 0); i++)
        this.load.image(`anim_${k}_${n}_${i}`, `/sprites_anim/${encodeURIComponent(k)}/${n}_${i}.webp`);
    });
    this.load.on('filecomplete-json-atkList', (key, type, list) => {
      (list || []).forEach((k) => this.load.image(`atk_${k}`, `/sprites_atk/${encodeURIComponent(k)}.webp`));
    });
  }

  create() {
    const cam = this.cameras.main;
    cam.setBounds(-300, -300, ARENA.width + 600, ARENA.height + 600);
    cam.setBackgroundColor('#0b0d10');
    this.buildWorld();

    this.shadowG = this.add.graphics().setDepth(D_GROUND + 5);   // ombres et auras au sol
    this.uiG = this.add.graphics().setDepth(D_UI);               // barres de vie, statuts
    this.fallbackG = this.add.graphics().setDepth(1500);         // zombies sans illustration
    this.miniBg = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(9499).setScrollFactor(0);
    this.miniG = this.add.graphics().setDepth(9500).setScrollFactor(0);
    this.stormG = this.add.graphics().setDepth(D_FX - 20);    // tempête du battle royale

    // Émetteurs d'impact réutilisables
    this.burst = {};
    for (const [el, c] of Object.entries(FX)) {
      const { tex, frequency, ...cfg } = c;
      this.burst[el] = this.add.particles(0, 0, tex, { ...cfg, speed: { min: 80, max: 240 }, lifespan: (c.lifespan || 300) * 1.3, emitting: false }).setDepth(D_FX + 10);
    }

    // Vignettage
    const vt = this.textures.createCanvas('vignette', 512, 512); const ctx = vt.getContext();
    const grad = ctx.createRadialGradient(256, 256, 150, 256, 256, 362);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512); vt.refresh();
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(9000);

    this.keys = this.input.keyboard.addKeys('Z,Q,S,D,W,A,UP,DOWN,LEFT,RIGHT');
    this.ambiance = new Ambiance(this, this.colisee ? 'colisee' : this.breche ? 'breche' : null);
    globalThis.__scene = this;   // accès de débogage depuis la console
    for (const [k, h] of [['fx_ribbon', 30], ['fx_ribbon_m', 20], ['fx_ribbon_s', 7]]) {   // rubans : dégradé doux, transparent sur les bords
      if (this.textures.exists(k)) continue;
      const t = this.textures.createCanvas(k, 16, h), c = t.getContext(), g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 16, h); t.refresh();
    }
    this.bus.scene = this;
    this.room.send('pret');   // tout est chargé : le serveur peut nous faire entrer en jeu
    this.input.keyboard.on('keydown-E', () => this.cast('sort1'));
    this.input.keyboard.on('keydown-SHIFT', () => this.cast('sort2'));
    this.input.keyboard.on('keydown-SPACE', () => this.cast('esquive'));
    this.input.keyboard.on('keydown-I', () => this.hud.toggleSpellbook());
    this.input.keyboard.on('keydown-T', () => this.hud.roueEmotes());
    this.input.keyboard.on('keydown-ESC', () => this.hud.toggleSpellbook(false));
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.hud.pickUpgrade(i)));
    this.input.keyboard.on('keydown-R', () => this.cast('ultime'));
    this.input.keyboard.on('keydown-F', () => this.cast('sort3'));
    // Voile : assombrit le monde pendant les ultimes (les effets lumineux passent par-dessus)
    this.veil = this.add.rectangle(0, 0, 10, 10, 0x05030a, 1).setOrigin(0).setScrollFactor(0).setDepth(4000).setAlpha(0);
    this.input.keyboard.on('keydown-M', () => this.hud.banner(toggleMute() ? '🔇 Son coupé' : '🔊 Son activé', '#ffffff'));
    this.input.mouse.disableContextMenu();
    // Petits écrans : on recule la caméra pour voir plus large
    this.baseZoom = this.scale.width < 1000 ? 0.72 : 1;
    this.cameras.main.setZoom(this.baseZoom);
    this.scale.on('resize', (sz) => { this.baseZoom = sz.width < 1000 ? 0.72 : 1; this.cameras.main.setZoom(this.baseZoom); });
    if (TOUCH) { touch.onCast = (slot, v) => this.cast(slot, v); touch.onEmote = () => this.hud.roueEmotes(); }
    this.input.on('pointerdown', (p) => {
      if (p.rightButtonDown()) return this.cast('sort1');
      // attaque immédiate au clic (puis répétée tant que le bouton est maintenu)
      if (!TOUCH && p.leftButtonDown() && this.time.now - this.lastBasic > 120) { this.lastBasic = this.time.now; this.cast('basique'); }
    });
  }

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
  }

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
  }

  // ---------------- Monde : sol peint, bâtiments, décors ----------------
  buildWorld() {
    if (this.colisee) return this.buildColisee();
    if (this.breche) return this.buildBreche();
    const tw = ARENA.width / 2, th = ARENA.height / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      this.add.image(i * tw, j * th, `ground_${i}_${j}`).setOrigin(0).setDisplaySize(tw, th).setDepth(-100);
    }
    this.add.tileSprite(0, 0, ARENA.width, ARENA.height, 'detail').setOrigin(0).setAlpha(0.22).setDepth(-99);

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
  }

  // Nombre de duels du tour en cours (8 combattants : 4, puis 2, puis la finale)
  nbDuels() { return Math.max(1, 8 >> Math.max(1, this.room.state.round || 1)); }

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

  }

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
  }

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
  }

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
  }

  kitOf(p) {
    if (!p.a || !p.b) return null;
    const k = `${p.a}|${p.b}`;
    return (this.kitCache[k] ||= generateKit(p.a, p.b));
  }

  // Portée d'un sort (pour la visée tactile)
  porteeDe(slot) {
    const me = this.room.state.players.get(this.room.sessionId), kit = me && this.kitOf(me), sp = kit?.[slot];
    return Math.max(160, Math.min(760, sp?.range || sp?.portee || (sp?.radius && sp.radius > 60 ? sp.radius : 0) || 420));
  }
  aim(v) {
    if (TOUCH) {
      v ||= touch.vise;
      const d = this.disp.get(this.room.sessionId);
      if (v && d) { const L = 60 + v.k * (this.porteeDe(v.slot) - 60); return { x: d.x + v.dx * L, y: d.y + v.dy * L }; }
      return this.autoAim();
    }
    const p = this.input.activePointer.positionToCamera(this.cameras.main); return { x: p.x, y: p.y };
  }
  // Visée automatique (tactile) : l'ennemi le plus proche, sinon droit devant
  autoAim() {
    const st = this.room.state, myId = this.room.sessionId, me = st.players.get(myId), d = this.disp.get(myId);
    if (!me || !d) return { x: 0, y: 0 };
    let best = null, bd = 760;
    st.players.forEach((p, id) => {
      if (id === myId || !p.alive || S(p, 'invis')) return;
      if (st.mode === 'tournoi' && (me.duel === 255 || p.duel !== me.duel)) return;
      if (st.mode === 'duo' && p.eq === me.eq) return;   // pas ses coéquipiers
      const k = Math.hypot(p.x - d.x, p.y - d.y); if (k < bd) { bd = k; best = p; }
    });
    if (st.mode !== 'tournoi' && st.mode !== 'duo') st.zombies.forEach((z) => { const k = Math.hypot(z.x - d.x, z.y - d.y) + 60; if (k < bd) { bd = k; best = z; } });
    if (best) return { x: best.x, y: best.y };
    if (Math.hypot(touch.mx, touch.my) > 0.2) this.lastDir = { x: touch.mx, y: touch.my };
    const dir = this.lastDir || { x: d.face || 1, y: 0 };
    return { x: d.x + dir.x * 300, y: d.y + dir.y * 300 };
  }
  cast(slot, v) { const { x, y } = this.aim(v); this.room.send('cast', { slot, x, y }); this.hud.tutoEvent?.(slot); }

  // ---------------- Boucle ----------------
  update(time, delta) {
    const dt = delta / 1000;
    const state = this.room.state;
    const myId = this.room.sessionId;
    const me = state.players.get(myId);
    const kit = me ? this.kitOf(me) : null;

    this.sendInput(time);
    const ptr = this.input.activePointer;
    if ((TOUCH ? touch.attack : ptr.leftButtonDown()) && kit && time - this.lastBasic > kit.basique.cd * 1000) { this.lastBasic = time; this.cast('basique'); }

    this.shadowG.clear(); this.uiG.clear(); this.fallbackG.clear(); this.ombreN = 0;
    // Qualité automatique : si l'appareil peine (< 40 images/s pendant 4 s), on coupe les effets décoratifs
    this.fpsAcc = (this.fpsAcc || 0) + delta; this.fpsN = (this.fpsN || 0) + 1;
    if (this.fpsAcc > 4000) {
      const fps = (this.fpsN * 1000) / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0;
      if (!this.lowFx && fps < 40 && time > 8000) { this.lowFx = true; this.ambiance?.setLow(true); }
    }
    this.drawZones(time);
    this.drawOrbs(time);
    this.drawZombies(time, dt);
    this.drawPlayers(time, dt, myId);
    this.drawProjectiles(dt);
    this.drawStorm(time);
    for (let i = this.ombreN; i < (this.ombres?.length || 0); i++) if (this.ombres[i].visible) this.ombres[i].setVisible(false);

    // Caméra : sur soi, ou sur un survivant en mode spectateur
    let md = this.disp.get(myId);
    if (me && !me.alive && state.mode !== 'melee') {
      // spectateur : suit un duelliste (tournoi) ou un survivant (royale), change toutes les 8 s
      if (!this.specId || !state.players.get(this.specId)?.alive || this.time.now - (this.specT || 0) > 8000) {
        const cands = []; state.players.forEach((p, id) => { if (p.alive && id !== myId && (state.mode !== 'tournoi' || p.duel !== 255)) cands.push(id); });
        if (!cands.length) state.players.forEach((p, id) => { if (p.alive && id !== myId) cands.push(id); });
        this.specId = cands[Math.floor(Math.random() * cands.length)]; this.specT = this.time.now;
      }
      const best = this.specId;
      if (best) md = this.disp.get(best);
    }
    if (md) this.cameras.main.centerOn(md.x, md.y - 30);
    // Tactile : flèche de visée pendant qu'on glisse sur un bouton de sort
    if (TOUCH) {
      this.viseG ||= this.add.graphics().setDepth(D_FX + 5);
      const g = this.viseG.clear(), v = touch.vise, dm = this.disp.get(myId);
      if (v && dm && me?.alive) {
        const L = 60 + v.k * (this.porteeDe(v.slot) - 60), x2 = dm.x + v.dx * L, y2 = dm.y + v.dy * L, col = v.slot === 'ultime' ? 0xffcf3a : 0x7fe0c2;
        g.lineStyle(10, col, 0.18).lineBetween(dm.x, dm.y - 20, x2, y2);
        g.lineStyle(3, col, 0.85).lineBetween(dm.x, dm.y - 20, x2, y2);
        g.fillStyle(col, 0.25).fillCircle(x2, y2, 34); g.lineStyle(3, col, 0.9).strokeCircle(x2, y2, 34);
        const a = Math.atan2(v.dy, v.dx);
        g.fillStyle(col, 0.9).fillTriangle(x2 + Math.cos(a) * 18, y2 + Math.sin(a) * 18, x2 + Math.cos(a + 2.5) * 14, y2 + Math.sin(a + 2.5) * 14, x2 + Math.cos(a - 2.5) * 14, y2 + Math.sin(a - 2.5) * 14);
      }
    }
    this.hud.royale(state, me, state.players, myId);
    this.hud.lowHp(!!me && me.alive && me.hp / me.maxHp < 0.3);
    this.hud.event(state);
    let boss = null; state.zombies.forEach((z) => { if (ZOMBIES[z.kind]?.boss) boss = z; });
    this.hud.boss(boss);
    // Musique : celle du mode, ou celle du boss quand un Titan rôde ; finale du royale plus intense
    const track = boss ? 'boss' : state.mode === 'survie' ? 'combat' : state.mode === 'royale' ? (state.phase === 'jeu' && state.alive <= 10 ? 'combat' : 'royale') : state.mode === 'tournoi' || state.mode === 'duo' ? 'tournoi' : 'monde';
    if (track !== this.track) { this.track = track; setMusic(track); }
    setAmbiance(this.colisee ? 'foule' : this.breche ? 'breche' : 'vent');
    if (me?.alive && me.hp / me.maxHp < 0.3) sfx.heartbeat();
    // Éléments fixés à l'écran : on compense le zoom de la caméra pour qu'ils restent à leur place
    const z = this.cameras.main.zoom, W = this.scale.width, H = this.scale.height;
    const ox = W / 2 - W / 2 / z, oy = H / 2 - H / 2 / z;
    this.vignette.setPosition(ox, oy).setDisplaySize(W / z, H / z);
    this.veil.setPosition(ox, oy).setSize(W / z, H / z);
    this.miniG.setPosition(ox, oy).setScale(1 / z); if (this.miniPos) this.miniBg.setPosition(ox + this.miniPos.x / z, oy + this.miniPos.y / z).setScale(1 / z);
    this.ambiance?.update(dt, this.cameras.main);

    this.hud.update(me, kit, state.players, myId, state.hordeIn, state.mode);
    this.drawMinimap(myId);
  }

  sendInput(time) {
    const k = this.keys;
    const inp = { u: k.Z.isDown || k.W.isDown || k.UP.isDown || touch.my < -0.38, d: k.S.isDown || k.DOWN.isDown || touch.my > 0.38,
      l: k.Q.isDown || k.A.isDown || k.LEFT.isDown || touch.mx < -0.38, r: k.D.isDown || k.RIGHT.isDown || touch.mx > 0.38 };
    if (inp.u || inp.d || inp.l || inp.r) this.hud.tutoEvent?.('move');
    const sig = `${+inp.u}${+inp.d}${+inp.l}${+inp.r}`;
    if (sig !== this.lastInput || time - this.lastInputSent > 250) { this.room.send('input', inp); this.lastInput = sig; this.lastInputSent = time; }
  }

  follow(key, x, y, t, snap = 400) {
    let d = this.disp.get(key);
    if (!d || Math.abs(d.x - x) + Math.abs(d.y - y) > snap) { d = { x, y, vx: 0, vy: 0, face: 1 }; this.disp.set(key, d); }
    const ox = d.x, oy = d.y;
    d.x = lerp(d.x, x, t); d.y = lerp(d.y, y, t);
    d.vx = lerp(d.vx, d.x - ox, 0.3); d.vy = lerp(d.vy, d.y - oy, 0.3);
    return d;
  }

  // ---------------- Persos ----------------
  drawPlayers(time, dt, myId) {
    const seen = new Set();
    const t = Math.min(1, dt * 16);
    this.room.state.players.forEach((p, id) => {
      seen.add(id);
      const d = id === myId ? this.predict(p, dt) : this.follow(id, p.x, p.y, t);
      let c = this.chars.get(id);
      if (!c) {
        c = {
          spr: this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1),
          aura: this.add.image(0, 0, 'fx_glow').setBlendMode('ADD').setDepth(D_GROUND + 6),
          label: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', fontStyle: '800', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(D_UI + 1),
          alive: false, locked: 0, fusion: '',
        };
        this.chars.set(id, c);
      }
      // Mort : explosion de particules
      if (c.alive && !p.alive) { this.burst[p.a]?.explode(30, d.x, d.y - CHAR_H / 2); if (id === myId) sfx.death(); if (c.hero ? c.hero.box.visible : c.rig ? c.rig.vis : c.spr.visible) (c.hero ? c.hero.die() : this.deathAnim(c, p, d)); }
      c.alive = p.alive;
      // Hors de l'écran : on n'anime/dessine rien (indispensable à 100 joueurs)
      const view = this.cameras.main.worldView;
      const onScreen = d.x > view.x - 220 && d.x < view.right + 220 && d.y > view.y - 120 && d.y < view.bottom + 260;
      const vis = p.alive && onScreen;
      if (!vis && c.rim) c.rim.setVisible(false);
      c.spr.setVisible(vis); c.rig?.setVisible(vis); c.hero?.setVisible(vis); c.aura.setVisible(vis); c.label.setVisible(vis); c.title?.setVisible(vis && !!p.titre);
      if (!vis) return;

      if (c.fusion !== p.fusion) {
        c.fusion = p.fusion;
        const key = `spr_${p.fusion}`;
        c.spr.setTexture(this.textures.exists(key) ? key : '__WHITE');
        const tex = c.spr.texture.getSourceImage();
        c.scale = CHAR_H / (tex.height || CHAR_H);
        if (!this.textures.exists(key)) c.spr.setDisplaySize(36, CHAR_H * 0.7).setTint(elColor(p.a));
      }

      const F = FUSIONS[p.fusion];
      const hidden = S(p, 'invis') && id !== myId;
      let alpha = 1;
      if (S(p, 'invis')) alpha = id === myId ? 0.45 : 0.06;

      // Atterrissage : chute depuis le ciel puis onde de choc
      let drop = 0;
      if (p.locked > 0) drop = -((Math.min(1, p.locked / CONFIG.rollLockTime)) ** 2) * 520;
      if (c.locked > 0 && p.locked <= 0) this.landing(d.x, d.y, p.a, p.b);
      c.locked = p.locked;

      // Orientation et animation
      const moving = Math.hypot(d.vx, d.vy) > 0.6;
      if (id === myId) { const a = this.aim(); d.face = a.x < d.x ? -1 : 1; }
      else if (Math.abs(d.vx) > 0.4) d.face = d.vx < 0 ? -1 : 1;
      const speedPx = Math.hypot(d.vx, d.vy) / Math.max(dt, 0.001);   // px/s
      const phase = time * 0.016;
      const bob = moving ? Math.abs(Math.sin(phase)) * 7 : 0;                     // foulée
      const step = moving ? Math.sin(phase) * 0.05 : 0;                            // balancier
      const hpPct = p.maxHp ? p.hp / p.maxHp : 1;
      const tired = hpPct < 0.3;                                                    // à bout de souffle : respiration ample et rapide
      const breathe = 1 + Math.sin(time / (tired ? 210 : 380) + d.x) * (tired ? 0.035 : 0.018);
      // inclinaison qui suit l'accélération (élan au démarrage, frein à l'arrêt)
      c.vxS = (c.vxS ?? 0) + (d.vx - (c.vxS ?? 0)) * Math.min(1, dt * 8);
      const accel = Phaser.Math.Clamp((d.vx - c.vxS) * 0.05, -0.1, 0.1);
      let lean = (moving ? Phaser.Math.Clamp(d.vx * 0.03, -0.12, 0.12) + step : Math.sin(time / 900 + d.y) * 0.015) + accel;
      let sx = 1, sy = breathe * (tired ? 0.97 : 1), ox = 0;
      // demi-tour : le perso pivote (comme une carte) au lieu de se retourner d'un coup
      c.faceS = (c.faceS ?? d.face) + (d.face - (c.faceS ?? d.face)) * Math.min(1, dt * 45);
      const flipK = Math.max(0.15, Math.abs(c.faceS));
      // poussière sous les pieds en courant
      if (moving && speedPx > 120 && !this.lowFx && !S(p, 'invis') && time - (c.dustT || 0) > 150 && !(F?.pure)) { c.dustT = time; this.dust(d.x - d.face * 14, d.y + R * 0.7, d.face); }
      const hover = F?.pure ? 10 + Math.sin(time / 260) * 5 : 0;                   // les formes Pures lévitent
      // élan de lancement (150 ms) : penché vers la cible + étirement
      // Attaque en 3 temps (280 ms) : armé → frappe → retour
      const ct = (time - (c.castT || -1e9)) / 280;
      let strike = 0;
      if (ct >= 0 && ct < 1) {
        const dir = Math.cos(c.castDir), fdir = dir * d.face >= 0 ? 1 : -1;     // vers l'avant du perso ?
        if (ct < 0.25) {                       // armé : recul + écrasement
          const k = ct / 0.25;
          lean -= dir * 0.18 * k; sx *= 1 - 0.06 * k; sy *= 1 - 0.07 * k; ox = -dir * 8 * k;
        } else if (ct < 0.55) {                // frappe : jaillit vers la cible, très étiré
          const k = Math.sin(((ct - 0.25) / 0.3) * Math.PI / 2);
          strike = 1 - Math.abs((ct - 0.4) / 0.15);
          lean += dir * (0.36 * k - 0.18 * (1 - k)); sx *= 1 + 0.16 * k * fdir; sy *= 1 + 0.06 * k; ox = dir * (28 * k - 8 * (1 - k));
        } else {                               // retour élastique
          const k = 1 - (ct - 0.55) / 0.45, w = Math.cos((1 - k) * Math.PI * 1.5) * k;
          lean += dir * 0.36 * w; sx *= 1 + 0.05 * w; ox = dir * 28 * w;
        }
        if (ct >= 0.25 && !c.struck) {       // image rémanente au moment du coup
          c.struck = true;
          const g = this.add.image(c.spr.x, c.spr.y, c.spr.texture.key).setOrigin(0.5, 1).setScale(c.spr.scaleX, c.spr.scaleY)
            .setRotation(c.spr.rotation).setTint(elColor(p.a)).setAlpha(0.6).setBlendMode('ADD').setDepth(d.y - 1);
          this.tweens.add({ targets: g, alpha: 0, x: g.x - Math.cos(c.castDir) * 30, duration: 220, onComplete: () => g.destroy() });
          this.burst[p.b]?.explode(5, d.x + Math.cos(c.castDir) * 40, d.y - 50 + Math.sin(c.castDir) * 20);
        }
      } else c.struck = false;
      // recul quand on est touché : écrasement bref + rejeté dans le sens du coup
      const fl = (this.flash.get(id) || 0) - time;
      if (fl > 0) { sx *= 1.08; sy *= 0.92; }
      const ht = (time - (c.hitT || -1e9)) / 230;
      if (ht >= 0 && ht < 1) {
        const k = Math.sin(ht * Math.PI) * (0.5 + (c.hitPow || 0.5));
        ox += Math.cos(c.hitDir) * 12 * k; lean += Math.cos(c.hitDir) * 0.16 * k * (ht < 0.5 ? 1 : 0.6);
      }
      // ultime : accroupi, concentration… puis bondit en libérant l'énergie
      const ut = (time - (c.ultT || -1e9)) / 650;
      if (ut >= 0 && ut < 1) {
        if (ut < 0.35) { const k = ut / 0.35; sy *= 1 - 0.16 * k; sx *= 1 + 0.08 * k; ox += (Math.random() - 0.5) * 4 * k; }
        else { const k = (ut - 0.35) / 0.65; sy *= 1 + 0.14 * Math.sin(k * Math.PI); sx *= 1 - 0.06 * Math.sin(k * Math.PI); }
      }
      // atterrissage d'un saut / dash : étirement dans le sens du mouvement
      if (speedPx > 600) { sx *= 0.9; sy *= 1.08; }
      const footY = d.y + R * 0.7;
      // bond : parabole
      let jump = 0;
      const jt = (time - (c.jumpT || -1e9)) / (c.jumpD || 1);
      if (jt >= 0 && jt < 1) { jump = Math.sin(jt * Math.PI) * 140; sx *= 0.92; sy *= 1.1; }
      if (ut >= 0.35 && ut < 1) jump = Math.max(jump, Math.sin(((ut - 0.35) / 0.65) * Math.PI) * 46);
      // roulade d'esquive : rotation complète + étirement + transparence (invincible)
      const rt = (time - (c.rollT || -1e9)) / 260;
      if (rt >= 0 && rt < 1) { lean += (Math.cos(c.rollA) >= 0 ? 1 : -1) * rt * Math.PI * 2; sy *= 0.82; sx *= 1.1; jump = Math.max(jump, Math.sin(rt * Math.PI) * 18); }
      // toupie : le perso pivote très vite sur lui-même
      const st = (time - (c.spinT || -1e9)) / (c.spinD || 1);
      if (st >= 0 && st < 1) {
        sx *= Math.cos(time * 0.05);
        if (Math.random() < 0.6) this.burst[c.spinEl]?.explode(2, d.x + (Math.random() - 0.5) * 200, footY - Math.random() * 60);
        this.shadowG.lineStyle(5, elColor(c.spinEl), 0.7).strokeEllipse(d.x, footY - 4, 230, 80);
      }
      if (jump > 0) this.ombre(d.x, footY, 60 - jump * 0.2, 20 - jump * 0.06, 0.25);

      // Pose d'attaque pendant ~350 ms après un sort (si l'illustration existe)
      const atkKey = `atk_${p.fusion}`, baseKey = `spr_${p.fusion}`;
      const attacking = time - (c.castT || -1e9) < 350 && this.textures.exists(atkKey);
      let wantKey = attacking ? atkKey : baseKey;
      // Vraie animation image par image si le champion a une planche (course / attaque)
      const AN = (this.animIdx ||= this.cache.json.get('animIdx') || {})[p.fusion];
      c.animOn = false;
      if (AN) {
        const at = time - (c.castT || -1e9);
        c.runDist = (c.runDist || 0) + speedPx * dt;
        let k = null;
        if (AN.atk && at >= 0 && at < AN.atk * 85) k = `anim_${p.fusion}_atk_${Math.min(AN.atk - 1, Math.floor(at / 85))}`;
        else if (AN.run && moving && jump <= 0) k = `anim_${p.fusion}_run_${Math.floor(c.runDist / 38) % AN.run}`;
        if (k && this.textures.exists(k)) { wantKey = k; c.animOn = true; }
        else if (AN.atk && this.textures.exists(`anim_${p.fusion}_atk_${AN.atk - 1}`)) wantKey = `anim_${p.fusion}_atk_${AN.atk - 1}`;   // au repos : la garde (+ respiration)
      }
      if (this.textures.exists(wantKey) && c.spr.texture.key !== wantKey) {
        c.spr.setTexture(wantKey);
        if (wantKey.startsWith('anim_')) { c.scale = CHAR_H / 300; c.spr.setOrigin(AN.centre / AN.w, AN.pied / AN.h); }
        else { c.scale = CHAR_H / (c.spr.texture.getSourceImage().height || CHAR_H); c.spr.setOrigin(0.5, 1); }
      }
      if (c.animOn) { sx = 1; lean *= 0.4; }   // l'image porte déjà le mouvement : on calme les déformations

      c.spr.setPosition(d.x + ox, footY - (c.rig ? 0 : bob) + drop - hover - jump).setDepth(d.y).setAlpha(alpha).setRotation(lean)
        .setScale(c.scale * sx * flipK * (c.faceS < 0 ? -1 : 1), c.scale * sy);
      // images fantômes pendant les dashs / téléportations / Surcharge
      if ((speedPx > 600 || S(p, 'haste')) && !hidden && !HEROS[p.fusion] && time - (c.ghostT || 0) > 40) {
        c.ghostT = time;
        const g = this.add.image(c.spr.x, c.spr.y, c.spr.texture.key).setOrigin(0.5, 1).setScale(c.spr.scaleX, c.spr.scaleY)
          .setRotation(c.spr.rotation).setTint(elColor(p.a)).setAlpha(0.45).setBlendMode('ADD').setDepth(d.y - 1);
        this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      }
      // Contour lumineux de l'élément pendant la frappe / quand l'ultime est prêt
      const ready = p.ult >= 100 && p.alive;
      if (ready && !c.ultReady && id === myId && c.ultReady === false) { this.floatText(d.x, d.y - 130, 'ULTIME PRÊT — R', '#ffe066', 24, true); sfx.reveal?.(); this.burst[p.a]?.explode(30, d.x, d.y - 40); }
      c.ultReady = ready;
      const ultGlow = ut >= 0 && ut < 1 ? Math.sin(ut * Math.PI) * 0.9 : 0;
      const rimA = Math.max(strike * 0.85, ultGlow, ready && !hidden ? 0.22 + Math.sin(time / 140) * 0.12 : 0);
      if (rimA > 0.01 && !hidden && !HEROS[p.fusion]) {
        if (!c.rim) c.rim = this.add.image(0, 0, c.spr.texture.key).setOrigin(0.5, 1).setBlendMode('ADD');
        if (c.rim.texture.key !== c.spr.texture.key) c.rim.setTexture(c.spr.texture.key);
        c.rim.setVisible(true).setPosition(c.spr.x, c.spr.y + 2).setRotation(c.spr.rotation).setDepth(d.y - 0.5)
          .setScale(c.spr.scaleX * (1.07 + ultGlow * 0.08), c.spr.scaleY * (1.04 + ultGlow * 0.06)).setTintFill(elColor(strike > 0 || (ultGlow > 0 && Math.sin(time / 60) > 0) ? p.b : p.a)).setAlpha(rimA);
        if (ready && Math.random() < 0.25) this.burst[p.a]?.explode(1, d.x + (Math.random() - 0.5) * 70, footY - Math.random() * 110);
      } else if (c.rim) c.rim.setVisible(false);

      // Teintes : flash blanc à l'impact, givre bleuté
      if ((this.flash.get(id) || 0) > time) c.spr.setTintFill(0xffffff);
      else if (S(p, 'frost')) c.spr.setTint(0xa8e8ff);
      else if (S(p, 'mark')) c.spr.setTint(0xd8c0ff);
      else if (this.textures.exists(`spr_${p.fusion}`)) c.spr.clearTint();
      // Animation « squelette » : jambes, buste, tête et cheveux bougent séparément
      // Personnage de jeu « fait maison » (squelette + pièces dessinées)
      if (HEROS[p.fusion]) {
        if (c.hero && c.hero.key !== p.fusion) { c.hero.destroy(); c.hero = null; }
        c.hero ||= new Hero(this, p.fusion);
        c.walk = (c.walk || 0) + speedPx * dt * 0.042 * (jump > 0 ? 0.3 : 1);
        const ct2 = time - (c.castT || -1e9), ht2 = time - (c.hitT || -1e9);
        c.hero.update({ x: d.x + ox * 0.5, y: c.spr.y, face: (c.faceS < 0 ? -1 : 1) * flipK, scale: 0.44 * (sy / breathe > 1.05 ? 1.04 : 1), alpha, time, depth: d.y,
          move: Phaser.Math.Clamp(speedPx / 230, 0, 1) * (jump > 0 ? 0.2 : 1), walk: c.walk,
          atk: c.castMelee && ct2 < 380 ? ct2 / 380 : -1, cast: !c.castMelee && ct2 < 420 ? ct2 / 420 : -1, hit: ht2 < 260 ? ht2 / 260 : -1,
          rot: Math.abs(c.spr.rotation) > 0.7 ? c.spr.rotation : 0, flash: (this.flash.get(id) || 0) > time });
        c.hero.setVisible(c.spr.visible); c.rig?.setVisible(false); c.spr.setVisible(false);
      } else c.hero?.setVisible(false);
      if (c.animOn || HEROS[p.fusion]) c.rig?.setVisible(false);
      else if (this.textures.exists(c.spr.texture.key) && c.spr.texture.key !== '__WHITE' && c.spr.texture.key !== '__DEFAULT') {
        c.rig ||= new RigSprite(this, c.spr.texture.key);
        const mvAmt = Phaser.Math.Clamp(speedPx / 230, 0, 1) * (jump > 0 ? 0.3 : 1);
        c.walk = (c.walk || 0) + speedPx * dt * 0.042 * (jump > 0 ? 0.3 : 1);
        if (c.rig.sync(c.spr, { time, walk: c.walk, move: mvAmt, seed: (c.seed ??= Math.random() * 6), tired, drag: -Phaser.Math.Clamp(d.vx * 0.006, -0.05, 0.05) * d.face })) {
          c.rig.setVisible(c.spr.visible); c.spr.setVisible(false);
        }
      }

      // Aura au sol aux couleurs des 2 éléments + ombre
      if (!hidden) {
        this.ombre(d.x, footY - 2, 56, 18, 0.4);
        c.aura.setPosition(d.x, footY - 2).setDisplaySize(110, 38).setTint(this.duo && p.eq ? (p.eq === this.room.state.players.get(this.room.sessionId)?.eq ? 0x3a9aff : 0xff3a2a) : elColor(p.a)).setAlpha(0.35 + Math.sin(time / 300) * 0.1);
        if (F?.pure) this.shadowG.lineStyle(2, 0xffe066, 0.8).strokeEllipse(d.x, footY - 2, 84 + Math.sin(time / 150) * 6, 28);
        if (id === myId) this.shadowG.lineStyle(2, 0xffffff, 0.75).strokeEllipse(d.x, footY - 2, 70, 22);
      } else c.aura.setVisible(false);
      if (p.locked > 0) this.shadowG.lineStyle(2, 0xffffff, 0.5).strokeEllipse(d.x, footY, 60 + p.locked * 40, 20 + p.locked * 14);


      // Visée du joueur local
      if (id === myId && p.locked <= 0) {
        const a = this.aim(), ang = Math.atan2(a.y - d.y, a.x - d.x);
        this.shadowG.fillStyle(0xffffff, 0.8).fillTriangle(
          d.x + Math.cos(ang) * 58, footY + Math.sin(ang) * 22,
          d.x + Math.cos(ang + 0.2) * 44, footY + Math.sin(ang + 0.2) * 17,
          d.x + Math.cos(ang - 0.2) * 44, footY + Math.sin(ang - 0.2) * 17);
      }
      if (hidden) { c.label.setVisible(false); c.title?.setVisible(false); return; }

      // Statuts autour du perso
      const g = this.uiG, top = footY - CHAR_H + drop, midY = footY - CHAR_H * 0.5 + drop;
      if (p.shield > 0) g.lineStyle(3, 0x8cdcff, 0.8).strokeEllipse(d.x, midY, 86, CHAR_H + 10);
      if (S(p, 'armor')) g.lineStyle(4, 0xc8d2dc, 0.7).strokeEllipse(d.x, midY, 78, CHAR_H);
      if (S(p, 'burn') && Math.random() < 0.5) this.burst.feu.explode(1, d.x + (Math.random() - 0.5) * 40, midY + (Math.random() - 0.3) * 50);
      if (S(p, 'wet') && Math.random() < 0.3) this.burst.eau.explode(1, d.x + (Math.random() - 0.5) * 40, top + 10);
      if (S(p, 'haste') && Math.random() < 0.5) this.burst.eclair.explode(1, d.x - d.face * 20, midY);
      if (S(p, 'slow') || S(p, 'root')) g.lineStyle(4, 0x8a6a3a, 0.8).strokeEllipse(d.x, footY, 70, 22);
      if (S(p, 'mark')) g.fillStyle(0x8a5cff, 1).fillTriangle(d.x, top - 30, d.x - 7, top - 42, d.x + 7, top - 42);

      // Barre de vie + nom
      const w = 60, hpw = (p.hp / p.maxHp) * w, by = top - 12;
      g.fillStyle(0x000000, 0.75).fillRoundedRect(d.x - w / 2 - 2, by - 2, w + 4, 9, 3);
      g.fillStyle(id === myId ? 0x6ee08f : 0xff5a5a, 1).fillRoundedRect(d.x - w / 2, by, Math.max(2, hpw), 5, 2);
      if (p.shield > 0) g.fillStyle(0x8cdcff, 1).fillRect(d.x - w / 2, by + 5, Math.min(w, (p.shield / p.maxHp) * w), 2);
      // Duo : nom en bleu pour mon équipe, en rouge pour l'adversaire
      const meP = this.duo && this.room.state.players.get(this.room.sessionId), teamCol = this.duo && p.eq ? (p.eq === meP?.eq ? '#6ab8ff' : '#ff6a5a') : null;
      // couleur de nom choisie par le joueur (cosmétique), sinon couleur du champion
      const cc = p.coul && couleurDe(p.coul).css, coulNom = cc === 'prisme' ? `hsl(${(time / 12) % 360},95%,68%)` : cc;
      const txt = `${p.lvl > 1 ? `Nv${p.lvl} ` : ''}${teamCol ? (p.eq === meP?.eq ? '🔵 ' : '🔴 ') : ''}${p.name} · ${F?.nom ?? ''}`, col = teamCol || coulNom || F?.css || '#fff';
      c.label.setPosition(d.x, by - 4);
      if (c.bulle) { if (time > c.bulleT) { c.bulle.destroy(); c.bulle = null; } else c.bulle.setPosition(d.x, by - (p.titre ? 40 : 24)).setAlpha(Math.min(1, (c.bulleT - time) / 300)); }
      if (c._lt !== txt) { c.label.setText(txt); c._lt = txt; }
      if (c._lc !== col) { c.label.setColor(col); c._lc = col; }
      if (p.titre) {
        if (!c.title) c.title = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', fontStyle: 'italic 800', color: '#ffcf3a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(D_UI + 1);
        c.title.setVisible(true).setPosition(d.x, by - 19).setText(`« ${p.titre} »`);
      } else if (c.title) c.title.setVisible(false);
    });
    for (const [id, c] of this.chars) if (!seen.has(id)) {
      c.spr.destroy(); c.rig?.destroy(); c.hero?.destroy(); c.aura.destroy(); c.rim?.destroy(); c.title?.destroy(); c.bulle?.destroy(); c.label.destroy(); this.chars.delete(id); this.disp.delete(id);
    }
  }

  // Prédiction côté client : le joueur local bouge tout de suite, puis on se recale sur le serveur
  predict(p, dt) {
    let d = this.disp.get(this.room.sessionId);
    if (!d || !p.alive || p.locked > 0) { d = { x: p.x, y: p.y, vx: 0, vy: 0, face: 1 }; this.disp.set(this.room.sessionId, d); return d; }
    const k = this.keys;
    let ix = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.Q.isDown || k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let iy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.Z.isDown || k.W.isDown || k.UP.isDown ? 1 : 0);
    if (!ix && !iy) { ix = touch.mx > 0.38 ? 1 : touch.mx < -0.38 ? -1 : 0; iy = touch.my > 0.38 ? 1 : touch.my < -0.38 ? -1 : 0; }   // joystick
    const len = Math.hypot(ix, iy) || 1;
    let speed = CONFIG.playerSpeed * (this.kitOf(p)?.vitesse || 1) * terrainSpeed(terrainAt(d.x, d.y, this.ters), p.a, p.b) * (S(p, 'slow') ? 1 - TAGS.lourd.slow : 1) * (S(p, 'frost') ? 1 - TAGS.gel.slow : 1) * (S(p, 'haste') ? 1.4 : 1);
    if (S(p, 'root')) speed = 0;
    const ox = d.x, oy = d.y;
    const pos = resolveCollisions({
      x: Phaser.Math.Clamp(d.x + (ix / len) * speed * dt, R, ARENA.width - R),
      y: Phaser.Math.Clamp(d.y + (iy / len) * speed * dt, R, ARENA.height - R),
    }, R, this.blds);
    d.x = pos.x; d.y = pos.y;
    if (this.breche) { const A = SURVIE.arene, dd = Math.hypot(d.x - A.x, d.y - A.y), RR = A.r - R; if (dd > RR) { d.x = A.x + ((d.x - A.x) / dd) * RR; d.y = A.y + ((d.y - A.y) / dd) * RR; } }
    if (this.colisee) {   // on ne sort pas de son arène (même règle que le serveur)
      const st = this.room.state, c = this.duo ? DUO.arene : p.duel !== 255 && st.phase === 'jeu' ? tournoiPit(p.duel, Math.max(1, this.nbDuels())) : areneProche(d.x, d.y);
      const dd = Math.hypot(d.x - c.x, d.y - c.y), RR = c.r - R;
      if (dd > RR) { d.x = c.x + ((d.x - c.x) / dd) * RR; d.y = c.y + ((d.y - c.y) / dd) * RR; }
    }
    // Recalage : on tolère un petit écart pendant le mouvement (latence), on converge à l'arrêt
    const ex = p.x - d.x, ey = p.y - d.y, err = Math.hypot(ex, ey);
    if (err > 160) { d.x = p.x; d.y = p.y; }
    else {
      const moving = ix || iy, dead = moving ? 36 : 0;
      if (err > dead) { const f = (1 - dead / err) * Math.min(1, dt * 8); d.x += ex * f; d.y += ey * f; }
    }
    d.vx = lerp(d.vx, d.x - ox, 0.3); d.vy = lerp(d.vy, d.y - oy, 0.3);
    return d;
  }

  landing(x, y, a, b) {
    { const [v, pan] = this.ear(x, y); if (v > 0) sfx.land(v, pan); }
    const ring = this.add.image(x, y + R * 0.7, 'fx_ring').setBlendMode('ADD').setTint(elColor(a)).setDepth(D_FX).setScale(0.1, 0.04);
    this.tweens.add({ targets: ring, scaleX: 1.2, scaleY: 0.45, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.burst[a]?.explode(24, x, y); this.burst[b]?.explode(16, x, y);
    const md = this.disp.get(this.room.sessionId);
    if (md && Phaser.Math.Distance.Between(md.x, md.y, x, y) < 500) this.cameras.main.shake(180, 0.006);
  }

  // ---------------- Zombies ----------------
  drawZombies(time, dt) {
    const t = Math.min(1, dt * 14);
    const seen = new Set();
    this.room.state.zombies.forEach((z, id) => {
      const key = `z${id}`; seen.add(key);
      const d = this.follow(key, z.x, z.y, t);
      const K = ZOMBIES[z.kind];
      if (Math.abs(d.vx) > 0.2) d.face = d.vx < 0 ? -1 : 1;
      const footY = d.y + K.r * 0.8;
      this.ombre(d.x, footY - 2, K.r * 2.6, K.r * 0.8, 0.4);
      let o = this.zombieObjs.get(key);
      const LK = ZLOOK[z.kind], tex = LK?.tex || `zb_${z.kind}`, eliteK = z.elite ? 1.3 : 1;
      if (z.kind === 'esprit') {
        // esprit élémentaire : boule d'énergie qui flotte, aux couleurs de son élément
        const col = elColor(z.el || 'feu');
        if (!o) {
          o = this.add.image(0, 0, 'fx_glow').setBlendMode('ADD'); o.core = this.add.image(0, 0, 'fx_core').setBlendMode('ADD'); o.isOrb = true; this.zombieObjs.set(key, o);
        }
        const hov = Math.sin(time / 200 + d.x) * 6, y0 = footY - 34 + hov;
        o.setPosition(d.x, y0).setTint(col).setScale(0.75 * eliteK + Math.sin(time / 90) * 0.05).setDepth(d.y);
        o.core.setPosition(d.x, y0).setTint((this.flash.get(id) || 0) > time ? 0xffffff : col).setScale(0.5 * eliteK).setDepth(d.y + 0.1).setRotation(time / 300);
        if (Math.random() < 0.25) this.burst[z.el]?.explode(1, d.x, y0);
      } else if (this.textures.exists(tex)) {
        if (!o) {
          o = this.add.image(0, 0, tex).setOrigin(0.5, 1); o.sc = ZOMBIE_H[z.kind] / o.height; this.zombieObjs.set(key, o);
          if (LK?.glow || z.elite) o.glow = this.add.image(0, 0, 'fx_glow').setBlendMode('ADD').setTint(z.elite ? 0xffcf3a : LK.glow).setDepth(D_GROUND + 4);
        }
        if (o.glow) {
          const pulse = LK?.pulse ? 0.5 + Math.abs(Math.sin(time / 90)) * 0.5 : 0.45 + Math.sin(time / 160) * 0.2;
          o.glow.setPosition(d.x, footY - 4).setDisplaySize(K.r * 6 * eliteK, K.r * 2 * eliteK).setAlpha(pulse);
          if (K.boss && Math.random() < 0.3) this.burst[z.kind === 'liche' ? 'ombre' : 'feu']?.explode(1, d.x + (Math.random() - 0.5) * K.r * 2, footY - Math.random() * ZOMBIE_H[z.kind]);
        }
        const sway = Math.sin(time / 180 + d.x * 0.05) * 0.06;
        o.setPosition(d.x, footY).setDepth(d.y).setRotation(sway).setScale(o.sc * d.face * eliteK, o.sc * eliteK);
        if ((this.flash.get(id) || 0) > time) o.setTintFill(0xffffff);
        else if (S(z, 'frost')) o.setTint(0xa8e8ff); else if (LK) o.setTint(LK.tint); else o.clearTint();
        // porte-bouclier : son aura protectrice
        if (z.kind === 'porteur') this.uiG.lineStyle(3, 0x9ad0ff, 0.35 + Math.sin(time / 200) * 0.15).strokeEllipse(d.x, footY, ZOMBIES.porteur.aura.r * 2, ZOMBIES.porteur.aura.r * 0.7);
        if (z.kind === 'chaman' && Math.random() < 0.1) this.burst.nature?.explode(1, d.x, footY - 90);
      } else {
        const g = this.fallbackG, wob = Math.sin(time / 120 + d.x) * 1.5;
        g.fillStyle(K.color, 1).fillCircle(d.x, d.y + wob - K.r, K.r);
        g.lineStyle(2, 0x1d2616, 1).strokeCircle(d.x, d.y + wob - K.r, K.r);
        g.fillStyle(0xff3030, 1).fillCircle(d.x - K.r * 0.3, d.y - K.r * 1.1, 3).fillCircle(d.x + K.r * 0.3, d.y - K.r * 1.1, 3);
      }
      const h = ZOMBIE_H[z.kind] * (z.elite ? 1.3 : 1);
      if (z.elite) {   // élite : nom du pouvoir au-dessus de la tête
        o.tag ||= this.add.text(0, 0, `★ ${ELITE_NOMS[z.elite]}`, { fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ffcf3a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1);
        o.tag.setPosition(d.x, footY - h - 14).setDepth(D_UI);
      }
      if (z.hp < z.maxHp) {
        const w = K.r * 2.4;
        this.uiG.fillStyle(0x000000, 0.7).fillRect(d.x - w / 2, footY - h - 10, w, 5);
        this.uiG.fillStyle(0x8fd14f, 1).fillRect(d.x - w / 2, footY - h - 10, w * (z.hp / z.maxHp), 5);
      }
      if (S(z, 'slow') || S(z, 'root')) this.uiG.lineStyle(3, 0x8a6a3a, 0.8).strokeEllipse(d.x, footY, K.r * 2.8, K.r);
      if (S(z, 'mark')) this.uiG.lineStyle(2, 0x8a5cff, 0.9).strokeEllipse(d.x, footY, K.r * 3.2, K.r * 1.1);
      if (Math.random() < 0.004) { const [v, pan] = this.ear(d.x, d.y); if (v > 0.3) sfx.groan(v, pan); }
      if (S(z, 'burn') && Math.random() < 0.3) this.burst.feu.explode(1, d.x, footY - h * 0.5);
    });
    for (const [key, o] of this.zombieObjs) if (!seen.has(key)) { o.glow?.destroy(); o.core?.destroy(); o.tag?.destroy(); o.destroy(); this.zombieObjs.delete(key); }
    for (const key of this.disp.keys()) if (key[0] === 'z' && !seen.has(key)) this.disp.delete(key);
  }

  // ---------------- Projectiles ----------------
  // Élan du lanceur : le perso se penche vers la cible, flash d'élément à la main
  castAnim(owner, tx, ty, el, kind, dur, forme) {
    const c = this.chars.get(owner), d = this.disp.get(owner);
    if (!c || !d) return;
    c.castMelee = ['melee', 'charge', 'frappe', 'tourbillon', 'saut'].includes(forme) || kind === 'spin';
    if (kind === 'saut') { c.jumpT = this.time.now; c.jumpD = dur * 1000; }
    if (kind === 'spin') { c.spinT = this.time.now; c.spinD = dur * 1000; c.spinEl = el; }
    c.castT = this.time.now; c.castDir = Math.atan2(ty - d.y, tx - d.x);
    if (Math.abs(tx - d.x) > 4) d.face = tx < d.x ? -1 : 1;
    const hand = this.add.image(d.x + Math.cos(c.castDir) * 30, d.y - CHAR_H * 0.55 + Math.sin(c.castDir) * 16, 'fx_glow')
      .setTint(elColor(el)).setBlendMode('ADD').setDepth(D_FX).setScale(0.2);
    this.tweens.add({ targets: hand, scale: 0.7, alpha: 0, duration: 220, onComplete: () => hand.destroy() });
  }

  projSpawn(m) {
    this.projSim.set(m.i, { ...m, trav: 0 });
    if (m.o) this.castAnim(m.o, m.x + m.vx, m.y + m.vy, m.el);
    const [v, pan] = this.ear(m.x, m.y);
    if (v > 0) sfx.cast(m.el, v, pan);
  }
  projEnd(m) {
    const p = this.projSim.get(m.i);
    if (p) { p.x = m.x; p.y = m.y; p.dead = true; }
  }

  drawProjectiles(dt) {
    for (const [id, pr] of this.projSim) {
      if (!pr.dead) {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.trav += Math.hypot(pr.vx, pr.vy) * dt;
        if (pr.bm && !pr.ret && pr.trav >= pr.rg * 0.5) { pr.ret = true; pr.vx = -pr.vx; pr.vy = -pr.vy; }   // boomerang
        if (pr.trav > pr.rg + 60 || insideBuilding(pr.x, pr.y, 2, this.blds)) pr.dead = true;   // le serveur confirmera
      }
      let o = this.projObjs.get(id);
      const col = elColor(pr.el), cfg = FX[pr.el] || FX.feu;
      if (!o) {
        // Style du champion qui a lancé le projectile (forme, traînée, impact)
        const owner = this.room.state.players.get(pr.o);
        const st = styleOf(owner?.fusion), elB = owner && owner.b !== pr.el ? owner.b : (owner?.a || pr.el), colB = elColor(elB);
        const { tex, ...pc } = cfg;
        const coreTex = this.textures.exists(`fx_${st.proj}`) ? `fx_${st.proj}` : 'fx_core';
        const trailTex = this.textures.exists(`fx_${st.trail}`) ? `fx_${st.trail}` : 'fx_spark';
        o = {
          glow: this.add.image(pr.x, pr.y, 'fx_glow').setBlendMode('ADD').setTint(col).setDepth(D_FX),
          glow2: this.add.image(pr.x, pr.y, 'fx_glow').setBlendMode('ADD').setTint(colB).setDepth(D_FX).setAlpha(0.8),
          tail: this.add.image(pr.x, pr.y, 'fx_streak').setBlendMode('ADD').setTint(col).setOrigin(1, 0.5).setDepth(D_FX),
          core: this.add.image(pr.x, pr.y, coreTex).setDepth(D_FX + 1),
          em: this.add.particles(0, 0, tex, pc).setDepth(D_FX - 1),
          em2: this.add.particles(0, 0, trailTex, { tint: FX[elB]?.tint || [colB], scale: { start: 0.45, end: 0 }, alpha: { start: 0.9, end: 0 },
            speed: { min: 10, max: 50 }, rotate: { min: 0, max: 360 }, lifespan: 420, frequency: 38, blendMode: st.trail === 'smoke' ? 'NORMAL' : 'ADD' }).setDepth(D_FX - 1),
          el: pr.el, elB, colB, st, rot: Math.random() * 6,
          // ruban lumineux qui suit le projectile + lumière projetée au sol
          hist: [], ribPts: Array.from({ length: 12 }, () => new Phaser.Math.Vector2(pr.x, pr.y - 34)),
          light: this.add.image(pr.x, pr.y, 'fx_glow').setBlendMode('ADD').setTint(col).setDepth(D_GROUND + 3).setAlpha(0.45),
        };
        o.rib = this.add.rope(0, 0, pr.r > 13 ? 'fx_ribbon' : 'fx_ribbon_m', null, o.ribPts, true).setBlendMode('ADD').setDepth(D_FX - 1).setColors(col);
        o.rib2 = this.add.rope(0, 0, 'fx_ribbon_s', null, o.ribPts, true).setBlendMode('ADD').setDepth(D_FX - 1).setColors(0xffffff);
        const al = o.ribPts.flatMap((_, i) => { const a = Math.pow(1 - i / 11, 1.6) * 0.9; return [a, a]; });
        o.rib.setAlphas(al); o.rib2.setAlphas(al.map((a) => a * 0.8));
        const ct = { w: 0xffffff, a: col, b: colB, dark: 0x2a1650 }[st.core] ?? 0xffffff;
        o.core.setTint(ct);
        if (st.core !== 'dark') o.core.setBlendMode('ADD');
        o.coreSc = (pr.r * 3.2 * st.ps) / (o.core.width || 32);
        o.em.startFollow(o.glow); o.em2.startFollow(o.glow);
        this.projObjs.set(id, o);
      }
      const ang = Math.atan2(pr.vy, pr.vx), y = pr.y - 34, s = pr.r / 10;
      o.rot += (o.st.spin || 0) * dt;
      o.glow.setPosition(pr.x, y).setScale(s * 0.6);
      o.glow2.setPosition(pr.x, y).setScale(s * 0.32);
      o.core.setPosition(pr.x, y).setRotation(o.st.spin ? o.rot : ang).setScale(o.coreSc);
      o.tail.setPosition(pr.x, y).setRotation(ang).setScale(Math.min(1.4, s * 0.9), s * 0.45);
      // ruban : historique des dernières positions
      o.hist.unshift(pr.x, y); if (o.hist.length > 24) o.hist.length = 24;
      for (let i = 0; i < 12; i++) { const j = i * 2; if (j < o.hist.length - 1 && (i === 0 || o.hist[j] !== o.hist[j - 2] || o.hist[j + 1] !== o.hist[j - 1])) o.ribPts[i].set(o.hist[j], o.hist[j + 1]); else o.ribPts[i].set(pr.x - Math.cos(ang) * (i * 7 + 1), y - Math.sin(ang) * (i * 7 + 1)); }
      o.rib.setPoints(o.ribPts); o.rib2.setPoints(o.ribPts);
      o.light.setPosition(pr.x, pr.y + 4).setScale(s * 1.1, s * 0.5);
      this.ombre(pr.x, pr.y + 6, pr.r * 1.6, pr.r * 0.6, 0.25);
      if (pr.dead) {
        this.burst[o.el]?.explode(8, pr.x, y);
        o.st.hit.forEach((h, k) => this.shapeBurst(h, pr.x, y, 5, k % 2 ? col : o.colB));
        const ring = this.add.image(pr.x, y, 'fx_ring_thin').setTint(o.colB).setBlendMode('ADD').setDepth(D_FX + 2).setScale(0.05);
        this.tweens.add({ targets: ring, scale: pr.r / 40, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
        o.glow.destroy(); o.glow2.destroy(); o.tail.destroy(); o.core.destroy();
        const rb = [o.rib, o.rib2]; this.tweens.add({ targets: rb, alpha: 0, duration: 160, onComplete: () => rb.forEach((r) => r.destroy()) });
        o.light.destroy();
        this.scorch(pr.x, pr.y, pr.r * 2.2, o.el);
        o.em.stop(); o.em2.stop(); this.time.delayedCall(700, () => { o.em.destroy(); o.em2.destroy(); });
        this.projObjs.delete(id); this.projSim.delete(id);
      }
    }
  }

  // Trace laissée au sol par un impact (brûlure, flaque, givre…), qui s'efface en quelques secondes
  scorch(x, y, r, el) {
    if (this.lowFx) return;
    this.scorches ||= [];
    if (this.scorches.length > 40) this.scorches.shift().destroy();
    const dark = ['feu', 'ombre', 'eclair', 'metal', 'terre'].includes(el);
    const im = this.add.image(x, y + 4, 'fx_glow').setDepth(D_GROUND + 2).setScale(r / 60, r / 140)
      .setTint(dark ? 0x000000 : elColor(el)).setAlpha(dark ? 0.35 : 0.3).setBlendMode(dark ? 'NORMAL' : 'ADD');
    const flash = this.add.image(x, y, 'fx_glow').setDepth(D_GROUND + 3).setTint(elColor(el)).setBlendMode('ADD').setScale(r / 30, r / 70).setAlpha(0.8);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: r / 20, duration: 300, onComplete: () => flash.destroy() });
    this.scorches.push(im);
    this.tweens.add({ targets: im, alpha: 0, delay: 2200, duration: 1800, onComplete: () => { im.destroy(); this.scorches = this.scorches.filter((s) => s !== im); } });
  }

  // ---------------- Zones, tornades, novas ----------------
  drawZones(time) {
    const seen = new Set();
    this.room.state.zones.forEach((z, id) => {
      seen.add(id);
      const c1 = elColor(z.el), c2 = elColor(z.el2);
      let o = this.zoneObjs.get(id);
      if (!o) {
        o = { kind: z.kind, max: Math.max(z.t, 0.01), born: time, objs: [], el: z.el, el2: z.el2, x: z.x, y: z.y, r: z.r };
        const add = (img) => { o.objs.push(img); return img; };
        if (z.kind === 'telegraph') {
          o.ring = add(this.add.image(z.x, z.y, 'fx_ring_thin').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 1));
          o.fill = add(this.add.image(z.x, z.y, 'fx_glow').setTint(c2).setBlendMode('ADD').setDepth(D_GROUND + 1));
        } else if (z.kind === 'zone') {
          o.fill = add(this.add.image(z.x, z.y, 'fx_glow').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 1).setAlpha(0.55));
          o.ring = add(this.add.image(z.x, z.y, 'fx_ring').setTint(c2).setBlendMode('ADD').setDepth(D_GROUND + 1).setAlpha(0.7));
          o.sw = add(this.add.image(z.x, z.y, 'fx_swirl').setTint(c2).setBlendMode('ADD').setDepth(D_GROUND + 2).setAlpha(0.35));
          const { tex, ...pc } = FX[z.el] || FX.feu;
          o.em = this.add.particles(z.x, z.y, tex, { ...pc, frequency: 30, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, z.r), quantity: 2 } }).setDepth(D_FX - 2);
        } else if (z.kind === 'tornade') {
          o.fill = add(this.add.image(z.x, z.y, 'fx_glow').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 1).setAlpha(0.5));
          o.sw = add(this.add.image(z.x, z.y, 'fx_swirl').setTint(c1).setBlendMode('ADD').setDepth(D_FX - 1));
          o.sw2 = add(this.add.image(z.x, z.y, 'fx_swirl').setTint(c2).setBlendMode('ADD').setDepth(D_FX - 1).setAlpha(0.8));
          const { tex, ...pc } = FX[z.el] || FX.vent;
          o.em = this.add.particles(z.x, z.y, tex, { ...pc, frequency: 12, speed: { min: 60, max: 160 }, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, z.r * 0.8), quantity: 2 } }).setDepth(D_FX);
        } else if (z.kind === 'piege') {
          o.ring = add(this.add.image(z.x, z.y, 'fx_runes').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 2).setAlpha(0.7));
        } else if (z.kind === 'meteore') {
          this.ultimateMoment(z.x, z.y, c1, o.max * 1000);
          o.ring = add(this.add.image(z.x, z.y, 'fx_ring').setTint(0xff3020).setBlendMode('ADD').setDepth(D_GROUND + 2));
          o.shadow = add(this.add.ellipse(z.x, z.y, 10, 4, 0x000000, 0.5).setDepth(D_GROUND + 3));
          o.rock = add(this.add.image(z.x + 500, z.y - 1100, 'fx_core').setTint(0xffffff).setBlendMode('ADD').setDepth(D_FX + 8));
          o.halo = add(this.add.image(z.x + 500, z.y - 1100, 'fx_glow').setTint(c1).setBlendMode('ADD').setDepth(D_FX + 7));
          const { tex, ...pc } = FX[z.el] || FX.feu;
          o.em = this.add.particles(0, 0, tex, { ...pc, frequency: 8, quantity: 3, speed: { min: 20, max: 80 }, lifespan: 600 }).setDepth(D_FX + 6);
          o.em.startFollow(o.halo);
        } else if (z.kind === 'invoc') {
          this.ultimateMoment(z.x, z.y, c1, o.max * 1000 + 400);
          o.ring = add(this.add.image(z.x, z.y, 'fx_runes').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 2));
          const key = this.textures.exists(`spr_${z.f}`) ? `spr_${z.f}` : 'fx_glow';
          o.giant = add(this.add.image(z.x, z.y + 40, key).setOrigin(0.5, 1).setTint(c1).setBlendMode('ADD').setDepth(D_FX + 4).setAlpha(0));
          o.giant.sc = (z.r * 1.4) / o.giant.height;
        } else if (z.kind === 'beam') {
          this.ultimateMoment(z.x, z.y, c1, o.max * 1000);
          o.outer = add(this.add.image(z.x, z.y, 'fx_streak').setOrigin(0, 0.5).setFlipX(true).setTint(c1).setBlendMode('ADD').setDepth(D_FX + 3));
          o.mid = add(this.add.image(z.x, z.y, 'fx_streak').setOrigin(0, 0.5).setFlipX(true).setTint(c2).setBlendMode('ADD').setDepth(D_FX + 3));
          o.core = add(this.add.image(z.x, z.y, 'fx_streak').setOrigin(0, 0.5).setFlipX(true).setTint(0xffffff).setBlendMode('ADD').setDepth(D_FX + 4));
          o.orb = add(this.add.image(z.x, z.y, 'fx_glow').setTint(c1).setBlendMode('ADD').setDepth(D_FX + 5));
        } else if (z.kind === 'domaine') {
          this.ultimateMoment(z.x, z.y, c1, o.max * 1000);
          o.fill = add(this.add.image(z.x, z.y, 'fx_glow').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 1).setAlpha(0.6));
          o.runes = add(this.add.image(z.x, z.y, 'fx_runes').setTint(c1).setBlendMode('ADD').setDepth(D_GROUND + 2));
          o.runes2 = add(this.add.image(z.x, z.y, 'fx_runes').setTint(c2).setBlendMode('ADD').setDepth(D_GROUND + 2).setAlpha(0.6));
          o.wall = add(this.add.image(z.x, z.y, 'fx_ring').setTint(c2).setBlendMode('ADD').setDepth(D_FX - 3));
          const { tex, ...pc } = FX[z.el] || FX.ombre;
          o.em = this.add.particles(z.x, z.y, tex, { ...pc, frequency: 10, quantity: 3, gravityY: -120, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, z.r), quantity: 3 } }).setDepth(D_FX - 2);
        } else if (z.kind === 'dragon') {
          this.ultimateMoment(z.x, z.y, c1, o.max * 1000);
          o.trail = []; o.segs = [];
          for (let i = 0; i < 16; i++) {
            const k = 1 - i / 16;
            o.segs.push(add(this.add.image(z.x, z.y, i === 0 ? 'fx_core' : 'fx_glow').setTint(i % 3 === 0 ? c2 : c1).setBlendMode('ADD').setDepth(D_FX + 4).setScale((z.r / 64) * (0.5 + k * 0.7))));
          }
          o.horn1 = add(this.add.image(z.x, z.y, 'fx_shard').setTint(0xffffff).setBlendMode('ADD').setDepth(D_FX + 5).setScale(1.4));
          o.horn2 = add(this.add.image(z.x, z.y, 'fx_shard').setTint(0xffffff).setBlendMode('ADD').setDepth(D_FX + 5).setScale(1.4));
          const { tex, ...pc } = FX[z.el] || FX.feu;
          o.em = this.add.particles(0, 0, tex, { ...pc, frequency: 6, quantity: 3, speed: { min: 30, max: 120 }, lifespan: 700 }).setDepth(D_FX + 3);
          o.em.startFollow(o.segs[0]);
        } else if (z.kind === 'nova') {
          const ring = this.add.image(z.x, z.y, 'fx_ring').setTint(c1).setBlendMode('ADD').setDepth(D_FX).setScale(0.1);
          const flash = this.add.image(z.x, z.y, 'fx_glow').setTint(c2).setBlendMode('ADD').setDepth(D_FX).setScale(0.2);
          const sc = z.r / 128;
          this.tweens.add({ targets: ring, scale: sc, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
          this.tweens.add({ targets: flash, scale: sc * 1.6, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
          this.burst[z.el]?.explode(Math.min(60, z.r / 4), z.x, z.y);
          { const [v, pan] = this.ear(z.x, z.y); if (v > 0) sfx.explosion(z.el, v, pan, z.r > 250); }
          this.shakeNear(z.x, z.y, z.r > 200 ? 0.01 : 0.004);
        }
        this.zoneObjs.set(id, o);
      }
      o.x = z.x; o.y = z.y;
      const prog = Math.min(1, (time - o.born) / 1000 / o.max), sc = z.r / 64;
      if (z.kind === 'telegraph') {
        o.ring.setScale(z.r / 128).setAlpha(0.6 + Math.sin(time / 60) * 0.3);
        o.fill.setScale(sc * prog).setAlpha(0.5);
      } else if (z.kind === 'zone') {
        o.fill.setScale(sc * 1.1); o.ring.setScale(z.r / 128); o.sw.setScale(z.r / 128).setRotation(time / 1400);
      } else if (z.kind === 'piege') {
        o.ring.setScale(z.r / 230).setRotation(time / 800).setAlpha(0.35 + Math.sin(time / 200) * 0.25);
      } else if (z.kind === 'meteore') {
        const k = prog * prog;   // accélère en tombant
        const mx = z.x + 500 * (1 - k), my = z.y - 40 - 1060 * (1 - k);
        o.rock.setPosition(mx, my).setScale(1.2 + k * 2.2); o.halo.setPosition(mx, my).setScale(2 + k * 4);
        o.ring.setScale(z.r / 128 * (1.05 - prog * 0.05), z.r / 330).setAlpha(0.5 + Math.sin(time / 50) * 0.4);
        o.shadow.setSize(z.r * 2 * k, z.r * 0.7 * k);
      } else if (z.kind === 'invoc') {
        o.ring.setScale(z.r / 230, z.r / 600).setRotation(time / 500);
        const rise = Math.min(1, prog * 1.6);
        o.giant.setAlpha(0.75 * rise).setScale(o.giant.sc * (0.6 + rise * 0.4)).setPosition(z.x, z.y + 40 - rise * 30 + (prog > 0.8 ? (prog - 0.8) * 400 : 0));
      } else if (z.kind === 'beam') {
        const L = z.len, flick = 1 + Math.sin(time / 25) * 0.12;
        for (const [img, h] of [[o.outer, z.r * 2.4], [o.mid, z.r * 1.3], [o.core, z.r * 0.45]]) img.setPosition(z.x, z.y - 40).setRotation(z.a).setDisplaySize(L, h * flick);
        o.orb.setPosition(z.x + Math.cos(z.a) * 30, z.y - 40 + Math.sin(z.a) * 15).setScale(1.6 * flick);
        if (Math.random() < 0.8) { const t = Math.random(); this.burst[z.el]?.explode(2, z.x + Math.cos(z.a) * L * t, z.y - 40 + Math.sin(z.a) * L * t); }
        if (Math.random() < 0.3) this.shakeNear(z.x, z.y, 0.003);
      } else if (z.kind === 'domaine') {
        const grow = Math.min(1, prog * 5), R2 = z.r * grow;
        o.fill.setScale(R2 / 55, R2 / 120);
        o.runes.setScale(R2 / 250, R2 / 560).setRotation(time / 900);
        o.runes2.setScale(R2 / 330, R2 / 740).setRotation(-time / 600);
        o.wall.setScale(R2 / 120, R2 / 280).setAlpha(0.5 + Math.sin(time / 90) * 0.3);
      } else if (z.kind === 'dragon') {
        o.trail.unshift({ x: z.x, y: z.y - 50 });
        if (o.trail.length > 64) o.trail.pop();
        o.segs.forEach((sg, i) => { const p = o.trail[Math.min(o.trail.length - 1, i * 4)]; sg.setPosition(p.x, p.y + Math.sin(time / 80 + i) * 6); });
        const h = o.trail[0], n = o.trail[Math.min(o.trail.length - 1, 3)], ang = Math.atan2(h.y - n.y, h.x - n.x);
        o.horn1.setPosition(h.x + Math.cos(ang + 2.3) * 30, h.y + Math.sin(ang + 2.3) * 30).setRotation(ang + 2.3 + Math.PI / 2);
        o.horn2.setPosition(h.x + Math.cos(ang - 2.3) * 30, h.y + Math.sin(ang - 2.3) * 30).setRotation(ang - 2.3 + Math.PI / 2);
      } else if (z.kind === 'tornade') {
        o.fill.setPosition(z.x, z.y).setScale(sc);
        o.sw.setPosition(z.x, z.y - z.r * 0.25).setScale(z.r / 120, z.r / 170).setRotation(time / 90);
        o.sw2.setPosition(z.x, z.y - z.r * 0.6).setScale(z.r / 150, z.r / 220).setRotation(-time / 70);
        o.em?.setPosition(z.x, z.y - z.r * 0.3);
      }
    });
    for (const [id, o] of this.zoneObjs) if (!seen.has(id)) {
      if (o.kind === 'telegraph') {
        // Détonation
        const flash = this.add.image(o.x, o.y, 'fx_glow').setTint(elColor(o.el2)).setBlendMode('ADD').setDepth(D_FX).setScale(o.r / 64);
        this.tweens.add({ targets: flash, alpha: 0, scale: o.r / 40, duration: 300, onComplete: () => flash.destroy() });
        this.burst[o.el]?.explode(20, o.x, o.y); if (o.el2 !== o.el) this.burst[o.el2]?.explode(10, o.x, o.y);
        { const [v, pan] = this.ear(o.x, o.y); if (v > 0) sfx.explosion(o.el, v * 0.8, pan); }
        this.shakeNear(o.x, o.y, 0.003);
      }
      if (o.kind === 'meteore' || o.kind === 'invoc') this.bigImpact(o.x, o.y, o.r, o.el, o.el2);
      if (o.kind === 'domaine') {
        // implosion : les runes se referment puis tout éclate
        const imp = this.add.image(o.x, o.y, 'fx_ring').setTint(elColor(o.el2)).setBlendMode('ADD').setDepth(D_FX + 5).setScale(o.r / 120, o.r / 280);
        this.tweens.add({ targets: imp, scaleX: 0.05, scaleY: 0.02, duration: 220, ease: 'Quad.easeIn', onComplete: () => { imp.destroy(); this.bigImpact(o.x, o.y, o.r * 0.8, o.el, o.el2); } });
      }
      if (o.kind === 'piege') this.slam(o.x, o.y, o.r * 1.4, o.el);
      o.objs.forEach((x) => x.destroy());
      if (o.em) { o.em.stop(); this.time.delayedCall(800, () => o.em.destroy()); }
      this.zoneObjs.delete(id);
    }
  }

  // Volume et panoramique selon la distance au joueur local
  ear(x, y) {
    const md = this.disp.get(this.room.sessionId);
    if (!md) return [0.5, 0];
    const dx = x - md.x, d = Math.hypot(dx, y - md.y);
    return [Math.max(0, 1 - d / 1000), dx / 700];
  }

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
  }

  shakeNear(x, y, intensity) {
    const md = this.disp.get(this.room.sessionId);
    if (md && Phaser.Math.Distance.Between(md.x, md.y, x, y) < 700) this.cameras.main.shake(160, intensity);
  }

  drawOrbs(time) {
    const seen = new Set();
    this.room.state.orbs.forEach((orb, id) => {
      seen.add(id);
      let o = this.orbObjs.get(id);
      if (!o) {
        o = { img: this.add.image(orb.x, orb.y, 'fx_orbe').setOrigin(0.5, 1), glow: this.add.image(orb.x, orb.y, 'fx_glow').setTint(orb.k ? 0xffcf3a : 0xb48aff).setBlendMode('ADD').setDepth(D_GROUND + 3) };
        if (orb.k) {   // orbe légendaire : doré, géant, colonne de lumière visible de loin
          o.img.setTint(0xffe9a0).setScale(2.2);
          o.beam = this.add.image(orb.x, orb.y, 'fx_streak').setTint(0xffcf3a).setBlendMode('ADD').setOrigin(0, 0.5).setRotation(-Math.PI / 2).setDepth(D_FX - 5).setDisplaySize(900, 70);
          o.rays = this.add.image(orb.x, orb.y - 40, 'fx_rays').setTint(0xffcf3a).setBlendMode('ADD').setDepth(orb.y - 1).setScale(0.6).setAlpha(0.6);
        }
        this.orbObjs.set(id, o);
      }
      const f = Math.sin(time / 300 + orb.x) * 5;
      o.img.setPosition(orb.x, orb.y - 6 + f).setDepth(orb.y);
      o.glow.setPosition(orb.x, orb.y).setScale((orb.k ? 1.6 : 0.5) + Math.sin(time / 300) * 0.05, orb.k ? 0.6 : 0.22);
      if (o.beam) { o.beam.setAlpha(0.35 + Math.sin(time / 200) * 0.15); o.rays.setAngle(time / 40); if (Math.random() < 0.3) this.burst.eclair?.explode(1, orb.x + (Math.random() - 0.5) * 60, orb.y - Math.random() * 120); }
    });
    for (const [id, o] of this.orbObjs) if (!seen.has(id)) {
      const [v] = this.ear(o.img.x, o.img.y); if (v > 0.85) sfx.orb();
      o.img.destroy(); o.glow.destroy(); o.beam?.destroy(); o.rays?.destroy(); this.orbObjs.delete(id);
    }
  }

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
  }

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
  }

  // Ombres au sol : images réutilisées (une ellipse remplie dans un Graphics serait recalculée à chaque image)
  ombre(x, y, w, h, a = 0.4) {
    const pool = (this.ombres ||= []);
    let im = pool[this.ombreN];
    if (!im) {
      if (!this.textures.exists('ombre_sol')) {
        const t = this.textures.createCanvas('ombre_sol', 64, 32), c = t.getContext(), g = c.createRadialGradient(32, 16, 2, 32, 16, 32);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.scale(1, 0.5); c.fillStyle = g; c.beginPath(); c.arc(32, 32, 32, 0, Math.PI * 2); c.fill(); c.restore(); t.refresh();
      }
      im = this.add.image(0, 0, 'ombre_sol').setDepth(D_GROUND + 5); pool.push(im);
    }
    this.ombreN++;
    im.setVisible(true).setPosition(x, y).setDisplaySize(w * 1.15, h * 1.3).setAlpha(Math.min(1, a * 1.5));
  }

  // Petit nuage de poussière soulevé par la course
  dust(x, y, face) {
    const g = this.add.circle(x + (Math.random() - 0.5) * 10, y - 4, 7 + Math.random() * 5, 0xd9cbb0, 0.4).setDepth(y - 2);
    this.tweens.add({ targets: g, x: g.x - face * (14 + Math.random() * 10), y: g.y - 10 - Math.random() * 8, scale: 1.9, alpha: 0, duration: 420 + Math.random() * 160, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  // Mort : le perso chancelle, bascule, blanchit puis se dissout en particules
  deathAnim(c, p, d) {
    const g = this.add.image(c.spr.x, c.spr.y, c.spr.texture.key).setOrigin(0.5, 1).setScale(c.spr.scaleX, c.spr.scaleY).setRotation(c.spr.rotation).setDepth(d.y);
    const side = c.spr.scaleX < 0 ? -1 : 1;
    this.tweens.add({ targets: g, rotation: -side * 1.35, x: g.x - side * 26, duration: 420, ease: 'Quad.easeIn',
      onComplete: () => {
        g.setTintFill(0xffffff);
        this.burst[p.b]?.explode(18, g.x - side * 40, g.y - 20);
        this.tweens.add({ targets: g, alpha: 0, scaleY: g.scaleY * 0.2, y: g.y - 6, duration: 360, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
      } });
  }

  // ---------------- Effets envoyés par le serveur ----------------
  fx(m) {
    const [v, pan] = this.ear(m.x ?? m.x1 ?? 0, m.y ?? m.y1 ?? 0);
    // Défis du jour : actions qui me concernent
    const myId = this.room.sessionId;
    if (m.t === 'dmg' && m.o === myId && !(this.disp.get(myId) && Math.abs(this.room.state.players.get(myId)?.x - m.x) < 2)) progress.on('dmg', m.v);
    else if (m.t === 'zdie' && m.k === myId) progress.on('zombie');
    else if (m.t === 'bossdie' && m.kid === myId) progress.on('titan');
    else if (m.t === 'ult' && m.me === myId) progress.on('ult');
    else if (m.t === 'dodge' && m.o === myId) progress.on('dodge');
    else if (m.t === 'qualif' && m.id === myId) progress.on('duel');
    else if (m.t === 'legend' && m.o === myId) progress.on('legend');
    if (m.t === 'dmg') {
      // qui a été touché ? (même position que sur le serveur) → recul orienté
      if (v > 0) {
        for (const [pid, pl] of this.room.state.players) {
          if (Math.abs(pl.x - m.x) > 1 || Math.abs(pl.y - m.y) > 1) continue;
          const c = this.chars.get(pid); if (!c) break;
          const src = m.o && this.room.state.players.get(m.o);
          c.hitT = this.time.now; c.hitPow = Math.min(1, m.v / 30);
          c.hitDir = src ? Math.atan2(m.y - src.y, m.x - src.x) : Math.random() * Math.PI * 2;
          break;
        }
      }
      if (v > 0) sfx.impact(m.el, v, pan);
      this.markFlash(m.x, m.y);
      { const moi = this.room.state.players.get(myId), surMoi = moi && Math.abs(moi.x - m.x) < 2 && Math.abs(moi.y - m.y) < 2;
        if (surMoi) { sfx.hurt(); if (TOUCH && navigator.vibrate) navigator.vibrate(25); } else if (m.o === myId) sfx.hitmark();
        if (this.colisee && m.v >= 25 && v > 0.3) foule(0.45, 1); }
      this.burst[m.el]?.explode(6, m.x, m.y - 40);
      const crit = m.v >= 25;
      this.floatText(m.x + (Math.random() - 0.5) * 24, m.y - 90, crit ? `${m.v}!` : `${m.v}`, crit ? '#ffe066' : (ELEMENTS[m.el]?.css ?? '#d8ffb0'), crit ? 30 : 18, crit);
      const me = this.room.state.players.get(this.room.sessionId);
      if (m.o && m.o === this.room.sessionId && !(me && Math.abs(me.x - m.x) < 2 && Math.abs(me.y - m.y) < 2)) {
        this.hud.combo(m.v);
        // étincelles orientées depuis moi vers la cible = sensation d'impact
        const d = this.disp.get(this.room.sessionId);
        if (d) { const a = Math.atan2(m.y - d.y, m.x - d.x); const sp = this.add.image(m.x, m.y - 40, 'fx_streak').setOrigin(0, 0.5).setRotation(a).setTint(ELEMENTS[m.el] ? elColor(m.el) : 0xffffff).setBlendMode('ADD').setDepth(D_FX + 3).setScale(0.6, 0.5);
          this.tweens.add({ targets: sp, scaleX: 1.4, alpha: 0, duration: 140, onComplete: () => sp.destroy() }); }
      }
      if (me && Math.abs(me.x - m.x) < 2 && Math.abs(me.y - m.y) < 2) { this.hud.hurt(); this.cameras.main.shake(90, 0.004); }
      else if (crit && v > 0.6) this.cameras.main.shake(70, 0.002);
    } else if (m.t === 'heal') {
      if (v > 0) sfx.heal();
      this.floatText(m.x, m.y - 100, `+${m.v}`, '#6ee08f', 20);
      this.burst.eau.explode(14, m.x, m.y - 40);
    } else if (m.t === 'combo') this.floatText(m.x, m.y - 100, m.nom, '#ffe066', 22);
    else if (m.t === 'elecwater') {
      // l'eau électrifiée : éclairs sur toute la flaque
      const fl = this.add.image(m.x, m.y, 'fx_glow').setTint(0xffe14a).setBlendMode('ADD').setDepth(D_FX).setDisplaySize(m.r * 2.4, m.r * 2);
      this.tweens.add({ targets: fl, alpha: 0, duration: 450, onComplete: () => fl.destroy() });
      for (let k = 0; k < 6; k++) { const a = Math.random() * 7, rr = Math.random() * m.r; this.shapeBurst('bolt', m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, 2, 0xffe14a); }
      if (v > 0) sfx.zap?.(v, pan);
    } else if (m.t === 'event') {
      const E = EVENTS[m.kind];
      const extra = m.kind === 'tempete' ? ` — ${ELEMENTS[m.el]?.nom.toUpperCase()} +30 %` : m.kind === 'eclipse' ? ' — OMBRE +30 %' : m.kind === 'orbe' ? ' — ultime et PV pleins !' : m.kind === 'ruee' ? ' — orbes x2' : '';
      this.hud.banner(`${E.icon} ${E.nom}${extra}`, m.kind === 'tempete' ? ELEMENTS[m.el]?.css : '#ffcf3a');
      sfx.horde(); this.cameras.main.flash(250, 255, 230, 160, false);
      if (this.room.state.players.get(myId)?.alive) progress.on('evenement');
    } else if (m.t === 'legend') {
      this.hud.banner(`💎 ${m.who} a pris l'orbe légendaire !`, '#ffcf3a');
      this.bigImpact(m.x, m.y, 160, 'eclair', 'feu');
    } else if (m.t === 'crachat') {   // cracheur : boule d'acide lobée jusqu'à la zone visée
      if (v > 0) sfx.crachat(v, pan);
      const blob = this.add.image(m.x1, m.y1 - 50, 'fx_glow').setTint(0x9aff3a).setBlendMode('ADD').setScale(0.35).setDepth(D_FX);
      const st0 = { k: 0 };
      this.tweens.add({ targets: st0, k: 1, duration: (m.d || 1) * 1000 * 0.9, onUpdate: () => { const k = st0.k; blob.setPosition(m.x1 + (m.x2 - m.x1) * k, m.y1 - 50 + (m.y2 - m.y1 + 50) * k - Math.sin(k * Math.PI) * 140); },
        onComplete: () => { this.burst.nature?.explode(10, m.x2, m.y2); blob.destroy(); } });
    } else if (m.t === 'boum') {   // explosion (kamikaze, élite explosive, relique Éclats)
      if (!m.p) { this.shakeNear(m.x, m.y, 0.01); if (v > 0) sfx.impact('feu', v, pan); }
      this.bigImpact?.(m.x, m.y, m.r * 0.8, 'feu', 'zombie');
      const ring = this.add.image(m.x, m.y, 'fx_ring').setTint(0xff6a20).setBlendMode('ADD').setDepth(D_FX).setScale(0.1);
      this.tweens.add({ targets: ring, scaleX: m.r / 50, scaleY: m.r / 120, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      this.burst.feu?.explode(m.p ? 6 : 24, m.x, m.y - 20);
    } else if (m.t === 'meche') {
      this.floatText(m.x, m.y - 80, '💣', '#ff6a3a', 26, true);
      if (v > 0) sfx.meche(v, pan);
    } else if (m.t === 'soinz') {
      const ring = this.add.image(m.x, m.y, 'fx_ring_thin').setTint(0x7aff9a).setBlendMode('ADD').setDepth(D_GROUND + 3).setScale(0.1);
      this.tweens.add({ targets: ring, scaleX: m.r / 50, scaleY: m.r / 130, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    } else if (m.t === 'elite') {
      this.floatText(m.x, m.y - 110, `★ ÉLITE ${m.n.toUpperCase()}`, '#ffcf3a', 20, true);
      if (v > 0) sfx.elite(v, pan);
    } else if (m.t === 'phenix') {
      this.burst.feu?.explode(50, m.x, m.y - 50); this.burst.lumiere?.explode(30, m.x, m.y - 50);
      this.shakeNear(m.x, m.y, 0.012);
      if (m.o === this.room.sessionId) this.hud.banner('🔥 CŒUR DE PHÉNIX — TU RENAIS !', '#ff9a3a');
    } else if (m.t === 'charge' && m.o == null) {   // Béhémoth : flèche rouge qui annonce la charge
      const L = 650, ang = m.a, ar = this.add.image(m.x, m.y - 10, 'fx_streak').setOrigin(0, 0.5).setRotation(ang).setTint(0xff3020).setBlendMode('ADD').setDepth(D_GROUND + 3).setDisplaySize(L, 90).setAlpha(0);
      this.tweens.add({ targets: ar, alpha: 0.7, duration: 300, yoyo: true, hold: 300, onComplete: () => ar.destroy() });
      this.floatText(m.x, m.y - 270, '⚠ CHARGE !', '#ff6a5a', 26, true);
      if (v > 0) sfx.rugissement(v * 0.7);
    } else if (m.t === 'stun') {
      this.floatText(m.x, m.y - 260, '💫 ÉTOURDI', '#ffe066', 22, true);
    } else if (m.t === 'boss') {
      this.hud.banner(m.nom ? `👹 ${m.nom.toUpperCase()} SURGIT !` : '👹 UN TITAN SURGIT AVEC LA HORDE !', '#ff6a5a'); sfx.horde(); sfx.rugissement();
      this.cameras.main.shake(700, 0.01); this.cameras.main.flash(300, 255, 60, 40, false);
    } else if (m.t === 'bslam') {
      if (v > 0) sfx.cast('terre', v, pan);
      this.shakeNear(m.x, m.y, 0.006);
    } else if (m.t === 'summon') {
      this.burst.zombie?.explode(30, m.x, m.y - 20);
      this.floatText(m.x, m.y - 300, 'INVOCATION !', '#ff6a5a', 22, true);
    } else if (m.t === 'bossdie') {
      this.hud.banner(`👹 TITAN VAINCU${m.who ? ` PAR ${m.who.toUpperCase()}` : ''} !`, '#ffcf3a');
      this.bigImpact(m.x, m.y, 260, 'feu', 'zombie');
      for (let i = 0; i < 4; i++) this.time.delayedCall(i * 120, () => this.burst.feu?.explode(40, m.x + (Math.random() - 0.5) * 160, m.y - Math.random() * 200));
      this.cameras.main.shake(600, 0.012);
    } else if (m.t === 'bossgone') {
      this.hud.banner('Le Titan retourne sous terre…', '#c0a0a0');
      this.burst.zombie?.explode(40, m.x, m.y - 40);
    } else if (m.t === 'dodge') {
      // roulade : traînée de fantômes + souffle
      const c = this.chars.get(m.o);
      if (c) { c.rollT = this.time.now; c.rollA = m.a; }
      this.burst.vent?.explode(10, m.x, m.y - 20);
      if (v > 0) sfx.cast('vent', v * 0.6, pan);
    } else if (m.t === 'lvl') {
      const col = 0xffcf3a;
      const pillar = this.add.image(m.x, m.y - 60, 'fx_glow').setTint(col).setBlendMode('ADD').setDepth(D_FX).setScale(0.8, 3.5);
      this.tweens.add({ targets: pillar, alpha: 0, scaleX: 2, y: m.y - 140, duration: 700, onComplete: () => pillar.destroy() });
      const ring = this.add.image(m.x, m.y + 14, 'fx_ring').setTint(col).setBlendMode('ADD').setDepth(D_GROUND + 3).setScale(0.2, 0.08);
      this.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 0.6, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
      if (v > 0.3) this.floatText(m.x, m.y - 120, `NIVEAU ${m.n} !`, '#ffcf3a', 22, true);
      if (m.o === myId) sfx.niveau();
    } else if (m.t === 'tround') {
      this.hud.banner(`🏆 ${m.nom}`, '#ffcf3a'); sfx.gong();
      this.cameras.main.flash(250, 255, 220, 120, false);
    } else if (m.t === 'emote') {   // bulle au-dessus du joueur
      const E = emoteDe(m.e); if (!E) return;
      const c = this.chars.get(m.o); if (!c) return;
      c.bulle?.destroy();
      const seul = !/[a-z]/i.test(E.txt);   // emoji seul : plus gros
      c.bulle = this.add.text(0, 0, E.txt, { fontFamily: 'Inter, sans-serif', fontSize: seul ? '34px' : '17px', fontStyle: '800', color: '#1a1d26', backgroundColor: '#f4f6fb', padding: { x: 10, y: 5 } })
        .setOrigin(0.5, 1).setDepth(D_FX + 20).setScale(0.3);
      c.bulleT = this.time.now + 2600;
      this.tweens.add({ targets: c.bulle, scale: 1, duration: 220, ease: 'Back.out' });
      if (v > 0) sfx.pop?.(v, pan);
    } else if (m.t === 'comboEq') {   // combo d'équipe : les deux éléments explosent ensemble
      const mine = m.eq === this.room.state.players.get(myId)?.eq;
      this.floatText(m.x, m.y - 150, `⚡ ${m.nom.toUpperCase()} !`, mine ? '#7fd8ff' : '#ff8a6a', 30, true);
      this.bigImpact?.(m.x, m.y, m.r, m.el1, m.el2);
      for (const el of [m.el1, m.el2]) this.burst[el]?.explode(26, m.x, m.y - 30);
      const ring = this.add.image(m.x, m.y, 'fx_ring').setTint(elColor(m.el1)).setBlendMode('ADD').setDepth(D_FX).setScale(0.1);
      this.tweens.add({ targets: ring, scaleX: m.r / 45, scaleY: m.r / 110, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
      if (v > 0) { sfx.explosion(m.el1, v, pan, true); sfx.cast(m.el2, v, pan); }
      this.shakeNear(m.x, m.y, 0.008);
      if (mine) progress.on('comboEquipe');
    } else if (m.t === 'manche') {
      const moi = this.room.state.players.get(myId), gagne = m.eq && m.eq === moi?.eq;
      this.hud.banner(!m.eq ? `⚖ MANCHE NULLE — ${m.sA} : ${m.sB}` : `${gagne ? '✅ MANCHE GAGNÉE' : '❌ MANCHE PERDUE'} — 🔵 ${moi?.eq === 2 ? m.sB : m.sA} : ${moi?.eq === 2 ? m.sA : m.sB} 🔴`, gagne ? '#7fd8ff' : '#ff8a6a');
      if (gagne) { sfx.fanfare(); progress.on('manche'); } else if (m.eq) sfx.defaite();
    } else if (m.t === 'qualif') {
      if (v > 0.2) this.floatText(m.x, m.y - 130, 'QUALIFIÉ !', '#7fe0c2', 26, true);
      if (m.id === myId) sfx.fanfare(); else foule(0.7, 1.8);
      this.burst.eclair?.explode(30, m.x, m.y - 40);
    }
    else if (m.t === 'slash') this.slash(m.x, m.y, m.a, m.r, m.arc, m.el, m.o);
    else if (m.t === 'charge') { const d = this.disp.get(m.o); if (d) this.burst[m.el]?.explode(16, d.x, d.y - 40); if (v > 0) sfx.cast('vent', v, pan); }
    else if (m.t === 'slam') this.slam(m.x, m.y, m.r, m.el, v, pan);
    else if (m.t === 'beam') this.beamFlash(m.x1, m.y1, m.x2, m.y2, m.w, m.el, v, pan, m.o);
    else if (m.t === 'chain') { if (v > 0) sfx.zap(); this.lightning(m.x1, m.y1 - 40, m.x2, m.y2 - 40); }
    else if (m.t === 'blink') {
      for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) this.burst.ombre.explode(24, x, y - 40);
      if (v > 0) sfx.cast('ombre', v, pan);
    } else if (m.t === 'zdie') {
      this.burst.zombie.explode(24, m.x, m.y - 30);
      if (v > 0) sfx.zdie(v, pan);
      this.floatText(m.x, m.y - 70, '☠', '#8fd14f', 24);
    } else if (m.t === 'round') {
      this.hud.banner('👑 LA MANCHE COMMENCE !', '#e8dcff'); sfx.horde();
    } else if (m.t === 'vague') {
      this.hud.banner(m.boss ? `☠ VAGUE ${m.n} — UN TITAN SURGIT !` : `☠ VAGUE ${m.n}`, m.boss ? '#ff6a8a' : '#d08aff');
      sfx.cor(); if (m.boss) sfx.rugissement(); this.cameras.main.shake(400, 0.005);
      for (const o of this.portails || []) this.tweens.add({ targets: o, scale: o.scale * 1.5, duration: 200, yoyo: true });
    } else if (m.t === 'vagueok') {
      this.hud.toast(`✅ Vague ${m.n} repoussée ! +25 % PV`, '#7fe0c2'); sfx.vagueOk();
    } else if (m.t === 'portail') {
      this.burst.ombre?.explode(14, m.x, m.y - 30);
    } else if (m.t === 'horde') {
      this.hud.banner('🧟 LA HORDE ARRIVE !', '#8fd14f');
      sfx.horde();
      this.cameras.main.shake(500, 0.006);
    } else if (m.t === 'ult') {
      const uc = this.chars.get(m.me); if (uc) uc.ultT = this.time.now;
      this.hud.banner(`${m.who} — ${m.nom} !`, ELEMENTS[m.el]?.css ?? '#fff');
      if (v > 0.1) sfx.ultimate(m.el);
      const mine = m.me === this.room.sessionId;
      if (mine || (v > 0.6 && this.time.now - (this.lastCut || 0) > 4000)) {
        this.lastCut = this.time.now;
        this.hud.cutin(m);
        const cam = this.cameras.main;
        this.tweens.add({ targets: cam, zoom: this.baseZoom * 1.06, duration: 160, yoyo: true, hold: 300, ease: 'Quad.easeOut' });
      }
      this.shakeNear(m.x, m.y, 0.008);
      const pillar = this.add.image(m.x, m.y - 80, 'fx_glow').setTint(elColor(m.el)).setBlendMode('ADD').setDepth(D_FX).setScale(1, 4);
      this.tweens.add({ targets: pillar, alpha: 0, scaleX: 3, duration: 600, onComplete: () => pillar.destroy() });
    }
  }

  // Associe un impact à l'entité touchée pour la faire clignoter
  markFlash(x, y) {
    const until = this.time.now + 90;
    this.room.state.players.forEach((p, id) => { if (Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2) this.flash.set(id, until); });
    this.room.state.zombies.forEach((z, id) => { if (Math.abs(z.x - x) < 2 && Math.abs(z.y - y) < 2) this.flash.set(id, until); });
  }

  // ---------------- Corps à corps, impacts, rayons ----------------
  slash(x, y, a, r, arc, el, owner) {
    if (owner) { const c = this.chars.get(owner), d = this.disp.get(owner); if (c) { c.castT = this.time.now; c.castDir = a; c.castMelee = true; if (d && Math.abs(Math.cos(a)) > 0.2) d.face = Math.cos(a) < 0 ? -1 : 1; } }
    const pl = owner ? this.room.state.players.get(owner) : null;
    const st = styleOf(pl?.fusion), elB = pl ? (pl.b !== el ? pl.b : pl.a) : el;
    const col = elColor(el), colB = elColor(elB), sc = (r + 30) / 118;
    const yy = y - 40, fx = x + Math.cos(a) * r * 0.65, fy = yy + Math.sin(a) * r * 0.45;
    const fade = (img, props, dur = 200) => this.tweens.add({ targets: img, alpha: 0, duration: dur, ease: 'Cubic.easeOut', ...props, onComplete: () => img.destroy() });
    const add = (tex, px, py, tint, alpha = 0.95) => this.add.image(px, py, tex).setTint(tint).setBlendMode('ADD').setDepth(D_FX + 2).setAlpha(alpha);
    switch (st.slash) {
      case 'crescent': {   // faux, hache, pelle : grand croissant qui balaie
        for (const [tint, k] of [[col, 1.15], [colB, 1], [0xffffff, 0.8]]) {
          const img = add('fx_crescent', fx, fy, tint).setRotation(a - 0.7).setScale(sc * k * 1.25);
          fade(img, { rotation: a + 0.7, scale: sc * k * 1.45 }, 230);
        }
        break;
      }
      case 'claw': {       // griffes, dagues : 3 entailles nettes
        const img = add('fx_claw', fx, fy, colB).setRotation(a).setScale(sc * 0.2);
        fade(img, { scale: sc * 1.15 }, 170);
        const w = add('fx_claw', fx, fy, 0xffffff).setRotation(a).setScale(sc * 0.15);
        fade(w, { scale: sc * 0.9 }, 140);
        break;
      }
      case 'impact': {     // poings, marteau, bouclier : onde de choc frontale
        for (const [tint, k, d] of [[col, 1, 0], [colB, 0.8, 50], [0xffffff, 0.6, 90]]) {
          const img = add('fx_impact', fx, fy, tint).setRotation(a + Math.PI / 2).setScale(sc * 0.3 * k);
          fade(img, { scale: sc * 1.2 * k, delay: d }, 240);
        }
        this.burst.terre.explode(6, fx, fy + 30);
        break;
      }
      case 'sword': {      // épées longues : la lame trace un arc
        const blade = add('fx_sword', x, yy, 0xffffff).setOrigin(0.08, 0.5).setRotation(a - 1.1).setScale((r + 20) / 85, 1.3);
        fade(blade, { rotation: a + 1.1 }, 180);
        const arcImg = add('fx_slash', x, yy, col, 0.9).setRotation(a - 0.5).setScale(sc * 1.1, sc * Math.min(1.2, arc / 1.6));
        fade(arcImg, { rotation: a + 0.4, scale: sc * 1.25 }, 220);
        break;
      }
      default:
        for (const [tint, alpha, k] of [[col, 0.9, 1.08], [colB, 0.6, 1.0], [0xffffff, 0.95, 0.9]]) {
          const img = add('fx_slash', x, yy, tint, alpha).setRotation(a - 0.5).setScale(sc * k, sc * k * Math.min(1.2, arc / 1.6));
          fade(img, { rotation: a + 0.4, scale: sc * k * 1.15 });
        }
    }
    if (st.twin) {         // double entaille croisée, juste après
      this.time.delayedCall(70, () => {
        const img = add(st.slash === 'claw' ? 'fx_claw' : 'fx_slash', fx, fy, colB).setRotation(a + 0.6).setScale(sc * 0.8).setFlipY(true);
        fade(img, { rotation: a - 0.3, scale: sc }, 160);
      });
    }
    if (st.heavy) {        // coup lourd : fissure au sol
      const cr = this.add.image(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.4 + 10, 'fx_crater').setDepth(D_GROUND + 2).setScale(r / 260, r / 600).setAlpha(0.7);
      this.tweens.add({ targets: cr, alpha: 0, delay: 1200, duration: 1200, onComplete: () => cr.destroy() });
      this.shakeNear(x, y, 0.003);
    }
    this.burst[el]?.explode(6, fx, fy);
    this.shapeBurst(st.hit[0], fx, fy, 3, colB);
    const [v, pan] = this.ear(x, y); if (v > 0) sfx.cast(st.heavy ? 'terre' : 'vent', v * 0.5, pan);
  }

  // Éclats de formes (plumes, flocons, crânes…) projetés à l'impact
  shapeBurst(tex, x, y, n, col) {
    if (!tex) return;
    const key = `${tex}|${col}`;
    let em = (this.shapeEm ||= new Map()).get(key);
    if (!em) {
      const t = this.textures.exists(`fx_${tex}`) ? `fx_${tex}` : 'fx_spark';
      em = this.add.particles(0, 0, t, { emitting: false, speed: { min: 110, max: 300 }, lifespan: { min: 320, max: 620 }, scale: { start: 0.45, end: 0 },
        rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, tint: col, blendMode: tex === 'smoke' ? 'NORMAL' : 'ADD', gravityY: 200 }).setDepth(D_FX + 9);
      this.shapeEm.set(key, em);
    }
    em.explode(n, x, y);
  }

  slam(x, y, r, el, v = 1, pan = 0) {
    const col = elColor(el);
    for (let i = 0; i < 3; i++) {
      const ring = this.add.image(x, y, 'fx_ring').setTint(i === 1 ? 0xffffff : col).setBlendMode('ADD').setDepth(D_FX).setScale(0.1, 0.04);
      this.tweens.add({ targets: ring, scaleX: r / 110, scaleY: r / 300, alpha: 0, delay: i * 70, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    this.burst.terre.explode(30, x, y); this.burst[el]?.explode(20, x, y - 20);
    const crater = this.add.image(x, y, 'fx_crater').setDepth(D_GROUND + 2).setScale(r / 128, r / 300).setAlpha(0.8);
    this.tweens.add({ targets: crater, alpha: 0, delay: 2500, duration: 2000, onComplete: () => crater.destroy() });
    if (v > 0) sfx.land(v, pan);
    this.shakeNear(x, y, 0.008);
  }

  beamFlash(x1, y1, x2, y2, w, el, v = 1, pan = 0, owner = null) {
    const pl = owner ? this.room.state.players.get(owner) : null;
    if (pl) {
      const st = styleOf(pl.fusion), colB = elColor(pl.b !== el ? pl.b : pl.a);
      for (let k = 1; k <= 6; k++) this.shapeBurst(k % 2 ? st.trail : st.hit[0], x1 + (x2 - x1) * k / 6, y1 - 40 + (y2 - y1) * k / 6, 2, colB);
    }
    const col = elColor(el), a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
    const mk = (tint, h, alpha) => this.add.image(x1, y1 - 40, 'fx_streak').setOrigin(0, 0.5).setTint(tint).setBlendMode('ADD')
      .setDepth(D_FX + 3).setRotation(a).setDisplaySize(L, h).setAlpha(alpha).setFlipX(true);
    const outer = mk(col, w * 1.6, 0.9), inner = mk(0xffffff, w * 0.45, 1);
    this.tweens.add({ targets: [outer, inner], alpha: 0, scaleY: 0.1, duration: 260, ease: 'Quad.easeIn', onComplete: () => { outer.destroy(); inner.destroy(); } });
    for (let k = 0; k <= 8; k++) this.burst[el]?.explode(3, x1 + (x2 - x1) * k / 8, y1 - 40 + (y2 - y1) * k / 8);
    if (v > 0) sfx.zap();
    this.shakeNear(x1, y1, 0.004);
  }

  // Voile sombre + rayons de lumière quand un ultime se déclenche
  ultimateMoment(x, y, col, dur = 1400) {
    const [v] = this.ear(x, y);
    if (v <= 0.05) return;
    this.tweens.killTweensOf(this.veil);
    this.veil.setAlpha(0);
    this.tweens.add({ targets: this.veil, alpha: 0.3 * Math.min(1, v * 1.4), duration: 180, yoyo: true, hold: dur, ease: 'Quad.easeOut' });
    const rays = this.add.image(x, y - 60, 'fx_rays').setTint(col).setBlendMode('ADD').setDepth(D_FX + 20).setScale(0.3).setAlpha(0.9);
    this.tweens.add({ targets: rays, scale: 2.4, angle: 40, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => rays.destroy() });
  }

  bigImpact(x, y, r, el, el2) {
    const col = elColor(el), col2 = elColor(el2 || el);
    this.cameras.main.flash(180, 255, 255, 255, true);
    this.shakeNear(x, y, 0.02);
    for (let i = 0; i < 4; i++) {
      const ring = this.add.image(x, y, i % 2 ? 'fx_ring' : 'fx_ring_thin').setTint(i === 0 ? 0xffffff : i % 2 ? col : col2).setBlendMode('ADD').setDepth(D_FX + 5).setScale(0.1, 0.05);
      this.tweens.add({ targets: ring, scaleX: (r * (1 + i * 0.35)) / 100, scaleY: (r * (1 + i * 0.35)) / 260, alpha: 0, delay: i * 90, duration: 700, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    const flash = this.add.image(x, y - 30, 'fx_glow').setTint(col2).setBlendMode('ADD').setDepth(D_FX + 6).setScale(r / 40);
    this.tweens.add({ targets: flash, alpha: 0, scale: r / 25, duration: 600, onComplete: () => flash.destroy() });
    const rays = this.add.image(x, y - 40, 'fx_rays').setTint(col).setBlendMode('ADD').setDepth(D_FX + 6).setScale(r / 200);
    this.tweens.add({ targets: rays, alpha: 0, scale: r / 90, angle: 30, duration: 800, onComplete: () => rays.destroy() });
    this.burst[el]?.explode(70, x, y); this.burst[el2 || el]?.explode(40, x, y - 30); this.burst.terre.explode(40, x, y);
    const crater = this.add.image(x, y, 'fx_crater').setDepth(D_GROUND + 2).setScale(r / 110, r / 260);
    this.tweens.add({ targets: crater, alpha: 0, delay: 5000, duration: 3000, onComplete: () => crater.destroy() });
    const [v, pan] = this.ear(x, y); if (v > 0) sfx.explosion(el, v, pan, true);
  }

  lightning(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(D_FX + 5).setBlendMode('ADD');
    for (const [w, c, a] of [[8, 0xffe14a, 0.35], [3, 0xffffff, 1]]) {
      g.lineStyle(w, c, a).beginPath().moveTo(x1, y1);
      for (let i = 1; i < 8; i++) {
        const t = i / 8, nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1, j = (Math.random() - 0.5) * 34;
        g.lineTo(x1 + (x2 - x1) * t + (nx / l) * j, y1 + (y2 - y1) * t + (ny / l) * j);
      }
      g.lineTo(x2, y2).strokePath();
    }
    this.burst.eclair.explode(8, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  floatText(x, y, txt, color, size, pop = false) {
    const t = this.add.text(x, y, txt, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '900', color, stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D_UI + 5);
    if (pop) { t.setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' }); }
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, delay: pop ? 150 : 0, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
}
