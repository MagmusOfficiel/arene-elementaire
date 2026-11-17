import Phaser from 'phaser';
import { astuce } from './astuces.js';
import { couleurDe, emoteDe } from '../../shared/cosmetiques.js';
import { reglages, surReglage, fxMul } from './reglages.js';
import { RigSprite } from './rig.js';
import { Ambiance } from './ambiance.js';
import { Hero, HEROS } from './hero.js';
import { sfx, toggleMute, setMusic, setAmbiance, foule } from './sfx.js';
import { TOUCH, touch } from './touch.js';
import { styleOf, SHAPES } from './styles.js';
import { progress } from './progress.js';
import { EVENTS, TERRAINS, terrainAt, terrainSpeed, ARENA, BIOMES, CONFIG, ELEMENTS, FUSIONS, BUILDINGS, CITY, ZOMBIES, TAGS, generateKit, insideBuilding, resolveCollisions, TOURNOI, tournoiPit, COLISEE, SURVIE, DUO, carteDu, areneProche, hasStatus as S } from '../../shared/data.js';
import { elColor, lerp, R, CHAR_H, ZOMBIE_H, ZLOOK, ELITE_NOMS, FONT, D_GROUND, D_FX, D_UI, FX, PROPS, PROP_NAMES } from './scene/commun.js';
import { decor } from './scene/decor.js';
import { Tutoriel } from './tutoriel.js';
import { scenePrete, noterFps, noterPing } from './mesures.js';
import { persos } from './scene/persos.js';
import { effets } from './scene/effets.js';

// Scène de jeu : chargement, création, boucle principale, entrées du joueur.
// Le reste est rangé dans scene/decor.js, scene/persos.js et scene/effets.js.
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
      // Sol en demi-résolution en qualité basse, ou sur téléphone en automatique : 4 fois moins de mémoire graphique
      const solLeger = reglages.qualite === 'bas' || (reglages.qualite === 'auto' && TOUCH);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) this.load.image(`ground_${i}_${j}`, `/art/ground_${i}_${j}${solLeger ? '_bas' : ''}.webp`);
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
    // Styles en test (Réglages > Test des visuels) : pixel art (calques LPC) ou 3D rendue en 2D (KayKit)
    const STY = { pixel: ['sprites_pixel', 'px'], '3d': ['sprites_3d', 'p3'] }[reglages.styleChamps];
    if (STY) {
      const [dos, pre] = STY;
      this.load.json('styleIdx', `/${dos}/index.json`);
      this.load.on('filecomplete-json-styleIdx', (key, type, idx) => {
        for (const [k, A] of Object.entries(idx || {})) for (const n of ['run', 'atk', 'idle', 'cast', 'hurt']) for (let i = 0; i < (A[n] || 0); i++)
          this.load.image(`${pre}_${k}_${n}_${i}`, `/${dos}/${encodeURIComponent(k)}/${n}_${i}.webp`);
      });
      if (pre === 'px') this.load.on('filecomplete-image', (key) => { if (key.startsWith('px_')) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); });
    }
    this.load.on('filecomplete-json-atkList', (key, type, list) => {
      (list || []).forEach((k) => this.load.image(`atk_${k}`, `/sprites_atk/${encodeURIComponent(k)}.webp`));
    });
  }

  // Réponse au ping (rebranchée après une reconnexion)
  brancherPong() {
    this.room.onMessage('pong', (m) => {
      const r = Math.max(0, (performance.now() - (m?.t || 0)) / 1000);
      // on garde le plus petit des derniers essais : un pong traité en retard (image lente) ne fausse pas la mesure
      if (r < 3) { (this.rtts ||= []).push(r); if (this.rtts.length > 6) this.rtts.shift(); this.rtt = Math.min(...this.rtts); this.pingN++; }
      this.hud.ping?.(Math.round(this.rtt * 1000), this.room.state.horloge != null);
    });
  }
  // Reconnexion : la scène continue avec la nouvelle connexion (même joueur, même partie)
  nouvelleRoom(r) { this.room = r; this.brancherPong(); this.srvPos = null; this.histo = []; }

  create() {
    // Latence : un « ping » par seconde, aller-retour lissé (sert au recalage de notre perso)
    this.rtt = 0.1;
    this.brancherPong();
    // tutoriel de la première partie, une fois le tirage du champion affiché
    this.hud.scene = this;
    this.pingN = 0;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.room.send('ping', { t: performance.now() }); this.hud.fps?.(Math.round(this.game.loop.actualFps)); if (this.pingN) noterPing(Math.round(this.rtt * 1000)); } });
    scenePrete();
    const cam = this.cameras.main;
    // Secousses de l'écran réglables (Réglages > Graphismes) : toutes les secousses passent par ici
    const secouer = cam.shake.bind(cam);
    cam.shake = (d, i, ...r) => { const k = { aucune: 0, reduites: 0.5, fortes: 1.5 }[reglages.secousses] ?? 1; return k ? secouer(d, (i ?? 0.005) * k, ...r) : cam; };
    cam.setBounds(-300, -300, ARENA.width + 600, ARENA.height + 600);
    cam.setBackgroundColor('#0b0d10');
    this.buildWorld();
    this.preparerCulling();

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
      const exp = this.burst[el].explode.bind(this.burst[el]);   // moins de particules en qualité moyenne / basse
      this.burst[el].explode = (n, x, y) => exp(Math.max(1, Math.round(n * fxMul())), x, y);
    }

    // Vignettage
    const vt = this.textures.createCanvas('vignette', 512, 512); const ctx = vt.getContext();
    const grad = ctx.createRadialGradient(256, 256, 150, 256, 256, 362);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512); vt.refresh();
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(9000);

    this.keys = this.input.keyboard.addKeys('Z,Q,S,D,W,A,UP,DOWN,LEFT,RIGHT');
    this.ambiance = new Ambiance(this, this.colisee ? 'colisee' : this.breche ? 'breche' : null);
    // Qualité graphique choisie dans les réglages
    if (reglages.qualite === 'bas') { this.lowFx = true; this.ambiance.setLow(true); this.detailSol?.setVisible(false); }
    surReglage((k, v) => { if (k !== 'qualite' || !this.sys?.isActive()) return; const bas = v === 'bas'; this.lowFx = bas; this.ambiance?.setLow(bas); this.detailSol?.setVisible(!bas); });
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

  // Tutoriel interactif de la première partie
  lancerTuto() { if (this.sys?.isActive() && !this.tuto && !localStorage.getItem('tutoFait')) this.tuto = new Tutoriel(this, this.hud); }

  // Astuces « première fois » selon ce qui se passe autour du joueur
  verifierAstuces() {
    if (this.tuto) return;   // pas pendant le tutoriel
    const st = this.room.state, me = st.players.get(this.room.sessionId), d = this.disp.get(this.room.sessionId);
    if (!me || !d) return;
    if (me.alive && me.hp / me.maxHp < 0.3) astuce('pvBas');
    if (!me.alive && me.deaths > 0) astuce('mort');
    if (st.phase === 'attente') astuce('attente');
    if (st.mode === 'duo' && st.phase === 'jeu') astuce('duo');
    if (st.mode === 'royale' && st.phase === 'jeu') astuce('royale');
    st.zones?.forEach((z) => { if (z.kind === 'telegraph' && Math.hypot(z.x - d.x, z.y - d.y) < 450) astuce('zoneRouge'); });
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
  cast(slot, v) {
    const { x, y } = this.aim(v);
    this.room.send('cast', { slot, x, y });
    this.hud.tutoEvent?.(slot);
    // Retour immédiat à l'écran (geste + son) sans attendre l'aller-retour du serveur,
    // seulement si le sort est disponible d'après les recharges connues
    const myId = this.room.sessionId, p = this.room.state.players.get(myId), kit = p && this.kitOf(p), sp = kit?.[slot];
    if (!sp || !p.alive || p.locked > 0 || slot === 'esquive' || S(p, 'stun')) return;
    const now = performance.now();
    if (slot === 'ultime' ? p.ult < 100 : (this.hud.cdEnd?.[slot] || 0) > now + 60) return;
    if (slot === 'basique' && now - (this.localCast?.basique || 0) < (sp.cd || 0.4) * 900) return;
    (this.localCast ||= {})[slot] = now; this.localCastAny = now;
    this.castAnim(myId, x, y, sp.element, null, 0, sp.forme);
    sfx.cast(sp.element, 1, 0);
  }

  // ---------------- Boucle ----------------
  update(time, delta) {
    this.tuto?.maj(Math.min(0.1, delta / 1000));
    if ((this.astT = (this.astT || 0) + delta) > 500) { this.astT = 0; this.verifierAstuces(); }
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
      this.fpsMesure = Math.round(fps);
      if (time > 8000) noterFps(this.fpsMesure);
      if (!this.lowFx && fps < 40 && time > 8000 && (reglages.qualite === 'auto' || reglages.qualite === 'moyen')) { this.lowFx = true; this.ambiance?.setLow(true); }
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
    // Caméra : légèrement en avant, vers la souris (ou la direction du déplacement sur téléphone)
    if (md) {
      let ax = 0, ay = 0;
      if (me?.alive && md === this.disp.get(myId)) {
        if (TOUCH) { ax = (md.vx || 0) * 9; ay = (md.vy || 0) * 9; }
        else { const ptr = this.input.activePointer; ax = (ptr.x - this.scale.width / 2) * 0.12; ay = (ptr.y - this.scale.height / 2) * 0.12; }
        const L = Math.hypot(ax, ay); if (L > 70) { ax *= 70 / L; ay *= 70 / L; }
      }
      this.camAv = this.camAv || { x: 0, y: 0 };
      const k = Math.min(1, dt * 4); this.camAv.x += (ax - this.camAv.x) * k; this.camAv.y += (ay - this.camAv.y) * k;
      this.cameras.main.centerOn(md.x + this.camAv.x, md.y - 30 + this.camAv.y);
    }
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
    const J = reglages.joystick;   // zone morte du joystick (réglage)
    const inp = { u: k.Z.isDown || k.W.isDown || k.UP.isDown || touch.my < -J, d: k.S.isDown || k.DOWN.isDown || touch.my > J,
      l: k.Q.isDown || k.A.isDown || k.LEFT.isDown || touch.mx < -J, r: k.D.isDown || k.RIGHT.isDown || touch.mx > J };
    if (inp.u || inp.d || inp.l || inp.r) this.hud.tutoEvent?.('move');
    const sig = `${+inp.u}${+inp.d}${+inp.l}${+inp.r}`;
    if (sig !== this.lastInput || time - this.lastInputSent > 250) { this.room.send('input', inp); this.lastInput = sig; this.lastInputSent = time; }
  }
}
Object.assign(ArenaScene.prototype, decor, persos, effets);
