// =====================================================================
//  PERSONNAGES : joueurs (prédiction, interpolation, animation), monstres, orbes, ombres
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

// statut -> icône affichée au-dessus du perso (l'invisibilité n'en a pas, évidemment)
const ICONES_STATUT = [['burn', '🔥'], ['frost', '❄️'], ['wet', '💧'], ['root', '🌿'], ['vine', '🌿'], ['slow', '🐌'], ['blind', '🌫️'], ['mark', '🎯'], ['armor', '🛡️'], ['haste', '⚡']];

export const persos = {
  // Horloge serveur : estime le décalage avec la nôtre et la gigue du réseau (pour l'interpolation)
  horlogeServeur() {
    const st = this.room.state, now = this.time.now / 1000;
    if (st.horloge && st.horloge !== this.hDern) {
      this.hDern = st.horloge;
      const o = now - st.horloge / 1000;
      if (this.hOff == null || o < this.hOff) this.hOff = o;           // le paquet le plus rapide donne le décalage
      else this.hOff += Math.min(o - this.hOff, 0.5) * 0.002;          // dérive lente si le réseau change
      this.gigue = lerp(this.gigue ?? 0.02, Math.min(0.3, o - this.hOff), 0.05);
    }
    // instant (en temps serveur) affiché pour les autres : un peu dans le passé pour toujours avoir 2 positions à mélanger
    this.tRendu = this.hOff == null ? null : now - this.hOff - Math.min(0.25, 0.075 + this.gigue * 1.5);
  },

  // Autres joueurs et monstres : interpolation entre deux positions reçues du serveur (mouvement fluide
  // même si les paquets arrivent irrégulièrement), au lieu de courir après la dernière reçue
  follow(key, x, y, t, snap = 400) {
    let d = this.disp.get(key);
    const ts = this.room.state.horloge / 1000;
    if (!d || Math.abs(d.x - x) + Math.abs(d.y - y) > snap) { d = { x, y, vx: 0, vy: 0, face: 1, buf: [] }; this.disp.set(key, d); }
    const ox = d.x, oy = d.y, B = (d.buf ||= []);
    if (!B.length || B[B.length - 1][0] !== ts) { B.push([ts, x, y]); if (B.length > 12) B.shift(); }
    const rt = this.tRendu;
    let a = null, b = null;
    if (rt != null) for (let i = B.length - 1; i > 0; i--) if (B[i - 1][0] <= rt) { a = B[i - 1]; b = B[i]; break; }
    if (a && b && b[0] > a[0]) {
      const k = Math.min(1, (rt - a[0]) / (b[0] - a[0]));
      d.x = a[1] + (b[1] - a[1]) * k; d.y = a[2] + (b[2] - a[2]) * k;
      if (Math.abs(d.x - x) + Math.abs(d.y - y) > snap) { d.x = x; d.y = y; B.length = 0; }
    } else { d.x = lerp(d.x, x, t); d.y = lerp(d.y, y, t); }
    d.vx = lerp(d.vx, d.x - ox, 0.3); d.vy = lerp(d.vy, d.y - oy, 0.3);
    return d;
  },

  // ---------------- Persos ----------------
  drawPlayers(time, dt, myId) {
    this.horlogeServeur();
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
        if (c.castMelee) {
          if (ct < 0.25) {                       // armé : recul + écrasement
            const k = ct / 0.25;
            lean -= dir * 0.22 * k; sx *= 1 - 0.08 * k; sy *= 1 - 0.09 * k; ox = -dir * 11 * k;
          } else if (ct < 0.55) {                // frappe : jaillit vers la cible, très étiré
            const k = Math.sin(((ct - 0.25) / 0.3) * Math.PI / 2);
            strike = 1 - Math.abs((ct - 0.4) / 0.15);
            lean += dir * (0.44 * k - 0.22 * (1 - k)); sx *= 1 + 0.22 * k * fdir; sy *= 1 + 0.07 * k; ox = dir * (38 * k - 11 * (1 - k));
          } else {                               // retour élastique
            const k = 1 - (ct - 0.55) / 0.45, w = Math.cos((1 - k) * Math.PI * 1.5) * k;
            lean += dir * 0.44 * w; sx *= 1 + 0.06 * w; ox = dir * 38 * w;
          }
        } else {
          // sort à distance : on se grandit en concentrant l'énergie… puis recul au moment du tir
          if (ct < 0.3) { const k = ct / 0.3; sy *= 1 + 0.07 * k; sx *= 1 - 0.04 * k; lean += dir * 0.08 * k; ox = dir * 4 * k; }
          else if (ct < 0.5) { const k = Math.sin(((ct - 0.3) / 0.2) * Math.PI); strike = k; ox = -dir * 14 * k; lean -= dir * 0.2 * k; sx *= 1 + 0.1 * k; sy *= 1 - 0.06 * k; }
          else { const k = 1 - (ct - 0.5) / 0.5; ox = -dir * 4 * k * Math.cos((1 - k) * Math.PI * 2); }
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
      // Style des champions (Réglages, en test) : auto | illustration | maison | pixel
      const style = reglages.styleChamps || 'auto';
      const fiche = HEROS[p.fusion];
      c.useHero = !!fiche && (style === 'maison' || (style === 'auto' && !fiche.test));
      let AN = null, pref = 'anim';
      if ((style === 'pixel' || style === '3d') && (this.styleIdx ||= this.cache.json.get('styleIdx') || {})[p.fusion]) { AN = this.styleIdx[p.fusion]; pref = style === 'pixel' ? 'px' : 'p3'; c.useHero = false; }
      else if (style !== 'illustration' && !c.useHero) AN = (this.animIdx ||= this.cache.json.get('animIdx') || {})[p.fusion];
      const fk = (n, i) => `${pref}_${p.fusion}_${n}_${i}`;
      c.animOn = false;
      if (AN) {
        const at = time - (c.castT || -1e9), hT = time - (c.hitT || -1e9);
        const castN = !c.castMelee && AN.cast ? 'cast' : 'atk';
        c.runDist = (c.runDist || 0) + speedPx * dt;
        let k = null;
        if (AN[castN] && at >= 0 && at < AN[castN] * 70) k = fk(castN, Math.min(AN[castN] - 1, Math.floor(at / 70)));
        else if (AN.hurt && hT >= 0 && hT < 240) k = fk('hurt', Math.min(2, Math.floor(hT / 80)));
        else if (AN.run && moving && jump <= 0) k = fk('run', Math.floor(c.runDist / (AN.pixel ? 22 : 38)) % AN.run);
        else if (AN.idle) k = fk('idle', Math.floor(time / 450) % AN.idle);
        if (k && this.textures.exists(k)) { wantKey = k; c.animOn = true; }
        else if (AN.atk && this.textures.exists(fk('atk', AN.atk - 1))) wantKey = fk('atk', AN.atk - 1);   // au repos : la garde (+ respiration)
      }
      if (this.textures.exists(wantKey) && c.spr.texture.key !== wantKey) {
        c.spr.setTexture(wantKey);
        if (AN && wantKey.startsWith(`${pref}_`)) { c.scale = CHAR_H / (AN.perso || 300); c.spr.setOrigin(AN.centre / AN.w, AN.pied / AN.h); }
        else { c.scale = CHAR_H / (c.spr.texture.getSourceImage().height || CHAR_H); c.spr.setOrigin(0.5, 1); }
      }
      if (c.animOn) { sx = 1; lean *= 0.4; }   // l'image porte déjà le mouvement : on calme les déformations

      c.spr.setPosition(d.x + ox, footY - (c.rig ? 0 : bob) + drop - hover - jump).setDepth(d.y).setAlpha(alpha).setRotation(lean)
        .setScale(c.scale * sx * flipK * (c.faceS < 0 ? -1 : 1), c.scale * sy);
      // images fantômes pendant les dashs / téléportations / Surcharge
      if ((speedPx > 600 || S(p, 'haste')) && !hidden && !c.useHero && time - (c.ghostT || 0) > 40) {
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
      if (rimA > 0.01 && !hidden && !c.useHero) {
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
      if (c.useHero) {
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
      if (c.animOn || c.useHero) c.rig?.setVisible(false);
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
      if (hidden) { c.label.setVisible(false); c.title?.setVisible(false); c.stIc?.setVisible(false); return; }

      // Statuts autour du perso
      const g = this.uiG, top = footY - CHAR_H + drop, midY = footY - CHAR_H * 0.5 + drop;
      if (p.shield > 0) g.lineStyle(3, 0x8cdcff, 0.8).strokeEllipse(d.x, midY, 86, CHAR_H + 10);
      if (S(p, 'armor')) g.lineStyle(4, 0xc8d2dc, 0.7).strokeEllipse(d.x, midY, 78, CHAR_H);
      if (S(p, 'burn') && Math.random() < 0.5) this.burst.feu.explode(1, d.x + (Math.random() - 0.5) * 40, midY + (Math.random() - 0.3) * 50);
      if (S(p, 'wet') && Math.random() < 0.3) this.burst.eau.explode(1, d.x + (Math.random() - 0.5) * 40, top + 10);
      if (S(p, 'haste') && Math.random() < 0.5) this.burst.eclair.explode(1, d.x - d.face * 20, midY);
      if (S(p, 'slow') || S(p, 'root')) g.lineStyle(4, 0x8a6a3a, 0.8).strokeEllipse(d.x, footY, 70, 22);
      if (S(p, 'mark')) g.fillStyle(0x8a5cff, 1).fillTriangle(d.x, top - 30, d.x - 7, top - 42, d.x + 7, top - 42);
      // Icônes des statuts au-dessus de la tête (brûlure, gel, racines…) : lisibles d'un coup d'œil
      const icones = ICONES_STATUT.filter(([n]) => S(p, n)).map(([, ic]) => ic).join('');
      if (icones) {
        if (!c.stIc) c.stIc = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(D_UI + 1);
        if (c._ic !== icones) { c.stIc.setText(icones); c._ic = icones; }
        c.stIc.setVisible(true).setPosition(d.x, top - 12 - 22 - (p.titre ? 16 : 0));
      } else if (c.stIc) c.stIc.setVisible(false);

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
      c.spr.destroy(); c.rig?.destroy(); c.hero?.destroy(); c.stIc?.destroy(); c.aura.destroy(); c.rim?.destroy(); c.title?.destroy(); c.bulle?.destroy(); c.label.destroy(); this.chars.delete(id); this.disp.delete(id);
    }
  },

  // Prédiction côté client : le joueur local bouge tout de suite, puis on se recale sur le serveur
  predict(p, dt) {
    let d = this.disp.get(this.room.sessionId);
    if (!d || !p.alive || p.locked > 0) { d = { x: p.x, y: p.y, vx: 0, vy: 0, face: 1 }; this.disp.set(this.room.sessionId, d); this.histo = []; return d; }
    const k = this.keys;
    let ix = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.Q.isDown || k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let iy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.Z.isDown || k.W.isDown || k.UP.isDown ? 1 : 0);
    const J = reglages.joystick;
    if (!ix && !iy) { ix = touch.mx > J ? 1 : touch.mx < -J ? -1 : 0; iy = touch.my > J ? 1 : touch.my < -J ? -1 : 0; }   // joystick
    const len = Math.hypot(ix, iy) || 1;
    let speed = CONFIG.playerSpeed * (this.kitOf(p)?.vitesse || 1) * terrainSpeed(terrainAt(d.x, d.y, this.ters), p.a, p.b) * (S(p, 'slow') ? 1 - TAGS.lourd.slow : 1) * (S(p, 'frost') ? 1 - TAGS.gel.slow : 1) * (S(p, 'haste') ? 1.4 : 1);
    if (S(p, 'root')) speed = 0;
    const ox = d.x, oy = d.y;
    // Déplacement en petits pas (≤ 10 px) : si une image dure longtemps, on ne traverse pas les murs et piliers
    const pasN = Math.min(12, Math.max(1, Math.ceil((speed * dt) / 10)));
    for (let k = 0; k < pasN; k++) {
      const pos = resolveCollisions({
        x: Phaser.Math.Clamp(d.x + (ix / len) * speed * (dt / pasN), R, ARENA.width - R),
        y: Phaser.Math.Clamp(d.y + (iy / len) * speed * (dt / pasN), R, ARENA.height - R),
      }, R, this.blds);
      d.x = pos.x; d.y = pos.y;
    }
    if (this.breche) { const A = SURVIE.arene, dd = Math.hypot(d.x - A.x, d.y - A.y), RR = A.r - R; if (dd > RR) { d.x = A.x + ((d.x - A.x) / dd) * RR; d.y = A.y + ((d.y - A.y) / dd) * RR; } }
    if (this.colisee) {   // on ne sort pas de son arène (même règle que le serveur)
      const st = this.room.state, c = this.duo ? DUO.arene : p.duel !== 255 && st.phase === 'jeu' ? tournoiPit(p.duel, Math.max(1, this.nbDuels())) : areneProche(d.x, d.y);
      const dd = Math.hypot(d.x - c.x, d.y - c.y), RR = c.r - R;
      if (dd > RR) { d.x = c.x + ((d.x - c.x) / dd) * RR; d.y = c.y + ((d.y - c.y) / dd) * RR; }
    }
    // Recalage avec compensation de latence : la position reçue du serveur correspond à là où NOUS étions
    // il y a environ un aller-retour (le temps que nos touches lui arrivent et que sa réponse revienne).
    // On la compare donc à notre position de ce moment-là, gardée dans un historique, et on corrige
    // doucement la différence (sinon le perso serait tiré en arrière en permanence pendant qu'on bouge).
    const now = this.time.now / 1000, H = (this.histo ||= []);
    H.push([now, d.x, d.y]);
    while (H.length > 2 && H[0][0] < now - 2) H.shift();
    if (p.x !== this.srvPos?.x || p.y !== this.srvPos?.y) this.srvPos = { x: p.x, y: p.y, t: now };
    const tt = this.srvPos.t - this.rtt - 0.03;
    let h = H[0];
    for (let i = H.length - 1; i >= 0; i--) if (H[i][0] <= tt) { h = H[i]; break; }
    const ex = p.x - h[1], ey = p.y - h[2], err = Math.hypot(ex, ey);
    if (err > 220) { d.x = p.x; d.y = p.y; H.length = 0; }   // vrai décalage (repoussé, téléporté…) : recalage net
    else if (err > 3) {
      // plus l'écart est grand, plus on corrige vite… sans jamais dépasser la moitié de la vitesse de marche
      // pendant qu'on bouge (le perso ne doit jamais avoir l'air bloqué ou tiré en arrière)
      const bouge = ix || iy, f = Math.min(1, dt * ((bouge ? 3 : 6) + err / 30));
      const max = (bouge ? 0.5 : 2) * CONFIG.playerSpeed * dt, c = Math.min(err * f, max) / err, cx = ex * c, cy = ey * c;
      d.x += cx; d.y += cy; for (const e of H) { e[1] += cx; e[2] += cy; }
    }
    d.vx = lerp(d.vx, d.x - ox, 0.3); d.vy = lerp(d.vy, d.y - oy, 0.3);
    return d;
  },

  landing(x, y, a, b) {
    { const [v, pan] = this.ear(x, y); if (v > 0) sfx.land(v, pan); }
    const ring = this.add.image(x, y + R * 0.7, 'fx_ring').setBlendMode('ADD').setTint(elColor(a)).setDepth(D_FX).setScale(0.1, 0.04);
    this.tweens.add({ targets: ring, scaleX: 1.2, scaleY: 0.45, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.burst[a]?.explode(24, x, y); this.burst[b]?.explode(16, x, y);
    const md = this.disp.get(this.room.sessionId);
    if (md && Phaser.Math.Distance.Between(md.x, md.y, x, y) < 500) this.cameras.main.shake(180, 0.006);
  },

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
  },

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
      // hors de l'écran : caché, sans calcul (sauf la colonne de lumière des orbes légendaires, visible de loin)
      const v = this.cameras.main.worldView, vis = orb.x > v.x - 150 && orb.x < v.right + 150 && orb.y > v.y - 150 && orb.y < v.bottom + 150;
      if (vis !== o.vis) { o.vis = vis; o.img.setVisible(vis); o.glow.setVisible(vis); o.rays?.setVisible(vis); }
      if (!vis) { if (o.beam) o.beam.setAlpha(0.35 + Math.sin(time / 200) * 0.15); return; }
      const f = Math.sin(time / 300 + orb.x) * 5;
      if (o.img.depth !== orb.y) o.img.setDepth(orb.y);
      o.img.setPosition(orb.x, orb.y - 6 + f);
      o.glow.setPosition(orb.x, orb.y).setScale((orb.k ? 1.6 : 0.5) + Math.sin(time / 300) * 0.05, orb.k ? 0.6 : 0.22);
      if (o.beam) { o.beam.setAlpha(0.35 + Math.sin(time / 200) * 0.15); o.rays.setAngle(time / 40); if (Math.random() < 0.3) this.burst.eclair?.explode(1, orb.x + (Math.random() - 0.5) * 60, orb.y - Math.random() * 120); }
    });
    for (const [id, o] of this.orbObjs) if (!seen.has(id)) {
      const [v] = this.ear(o.img.x, o.img.y); if (v > 0.85) sfx.orb();
      o.img.destroy(); o.glow.destroy(); o.beam?.destroy(); o.rays?.destroy(); this.orbObjs.delete(id);
    }
  },

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
  },

  // Petit nuage de poussière soulevé par la course
  dust(x, y, face) {
    const g = this.add.circle(x + (Math.random() - 0.5) * 10, y - 4, 7 + Math.random() * 5, 0xd9cbb0, 0.4).setDepth(y - 2);
    this.tweens.add({ targets: g, x: g.x - face * (14 + Math.random() * 10), y: g.y - 10 - Math.random() * 8, scale: 1.9, alpha: 0, duration: 420 + Math.random() * 160, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  },

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
  },

};
