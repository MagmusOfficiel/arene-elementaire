// =====================================================================
//  EFFETS : sorts, projectiles, zones au sol, impacts, messages d'effets du serveur, textes flottants
//  Méthodes ajoutées à ArenaScene (voir ArenaScene.js).
// =====================================================================
import Phaser from 'phaser';
import { astuce } from '../astuces.js';
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

export const effets = {
  // ---------------- Projectiles ----------------
  // Élan du lanceur : le perso se penche vers la cible, flash d'élément à la main
  castAnim(owner, tx, ty, el, kind, dur, forme, echo = false) {
    const c = this.chars.get(owner), d = this.disp.get(owner);
    if (!c || !d) return;
    // écho du serveur d'un sort déjà animé tout de suite chez nous : on ne le rejoue pas (sauf saut / tourbillon)
    if (echo && owner === this.room.sessionId && !kind && performance.now() - (this.localCastAny || 0) < 600) return;
    c.castMelee = ['melee', 'charge', 'frappe', 'tourbillon', 'saut'].includes(forme) || kind === 'spin';
    if (kind === 'saut') { c.jumpT = this.time.now; c.jumpD = dur * 1000; }
    if (kind === 'spin') { c.spinT = this.time.now; c.spinD = dur * 1000; c.spinEl = el; }
    c.castT = this.time.now; c.castDir = Math.atan2(ty - d.y, tx - d.x);
    if (Math.abs(tx - d.x) > 4) d.face = tx < d.x ? -1 : 1;
    const hand = this.add.image(d.x + Math.cos(c.castDir) * 30, d.y - CHAR_H * 0.55 + Math.sin(c.castDir) * 16, 'fx_glow')
      .setTint(elColor(el)).setBlendMode('ADD').setDepth(D_FX).setScale(0.2);
    this.tweens.add({ targets: hand, scale: 0.7, alpha: 0, duration: 220, onComplete: () => hand.destroy() });
  },

  projSpawn(m) {
    this.projSim.set(m.i, { ...m, trav: 0 });
    const deja = m.o === this.room.sessionId && performance.now() - (this.localCastAny || 0) < 600;   // déjà joué localement
    if (m.o && !deja) this.castAnim(m.o, m.x + m.vx, m.y + m.vy, m.el);
    const [v, pan] = this.ear(m.x, m.y);
    if (v > 0 && !deja) sfx.cast(m.el, v, pan);
  },

  projEnd(m) {
    const p = this.projSim.get(m.i);
    if (p) { p.x = m.x; p.y = m.y; p.dead = true; }
  },

  drawProjectiles(dt) {
    const v = this.cameras.main.worldView, M = 300;
    for (const [id, pr] of this.projSim) {
      if (!pr.dead) {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.trav += Math.hypot(pr.vx, pr.vy) * dt;
        if (pr.bm && !pr.ret && pr.trav >= pr.rg * 0.5) { pr.ret = true; pr.vx = -pr.vx; pr.vy = -pr.vy; }   // boomerang
        if (pr.trav > pr.rg + 60 || insideBuilding(pr.x, pr.y, 2, this.blds)) pr.dead = true;   // le serveur confirmera
      }
      let o = this.projObjs.get(id);
      // Projectile loin de l'écran : on ne crée pas (ou on cache) ses effets visuels, très coûteux en Battle royale
      const pres = pr.x > v.x - M && pr.x < v.right + M && pr.y > v.y - M && pr.y < v.bottom + M;
      if (!pres) {
        if (pr.dead) { if (o) this.finProjectile(o, false); this.projObjs.delete(id); this.projSim.delete(id); }
        else if (o && o.vis !== false) { o.vis = false; for (const k of ['glow', 'glow2', 'tail', 'core', 'light', 'rib', 'rib2', 'em', 'em2']) o[k].setVisible(false); o.em.pause(); o.em2.pause(); }
        continue;
      }
      if (o && o.vis === false) { o.vis = true; for (const k of ['glow', 'glow2', 'tail', 'core', 'light', 'rib', 'rib2', 'em', 'em2']) o[k].setVisible(true); o.em.resume(); o.em2.resume(); }
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
        this.finProjectile(o, true);
        this.scorch(pr.x, pr.y, pr.r * 2.2, o.el);
        this.projObjs.delete(id); this.projSim.delete(id);
      }
    }
  },

  finProjectile(o, fondu) {
    o.glow.destroy(); o.glow2.destroy(); o.tail.destroy(); o.core.destroy(); o.light.destroy();
    const rb = [o.rib, o.rib2];
    if (fondu) this.tweens.add({ targets: rb, alpha: 0, duration: 160, onComplete: () => rb.forEach((r) => r.destroy()) }); else rb.forEach((r) => r.destroy());
    o.em.stop(); o.em2.stop();
    if (fondu) this.time.delayedCall(700, () => { o.em.destroy(); o.em2.destroy(); }); else { o.em.destroy(); o.em2.destroy(); }
  },

  // Coup reçu : arc rouge orienté vers l'attaquant + vignette rouge sur les bords de l'écran
  coupRecu(angle, force) {
    const me = this.disp.get(this.room.sessionId);
    if (me && angle != null) {
      const g = this.add.graphics().setDepth(D_UI - 1);
      const o = { a: 1 };
      const tracer = () => { const d = this.disp.get(this.room.sessionId) || me; g.clear(); g.lineStyle(7, 0xff3030, 0.85 * o.a).beginPath(); g.arc(d.x, d.y - 40, 78, angle - 0.45, angle + 0.45); g.strokePath(); };
      tracer();
      this.tweens.add({ targets: o, a: 0, duration: 650, onUpdate: tracer, onComplete: () => g.destroy() });
    }
    let v = document.getElementById('vignette');
    if (!v) { v = document.createElement('div'); v.id = 'vignette'; document.getElementById('hud').appendChild(v); }
    v.style.opacity = String(Math.min(0.85, 0.25 + force * 0.6));
    clearTimeout(this._vig); this._vig = setTimeout(() => { v.style.opacity = '0'; }, 120);
  },

  // Micro-pause : le jeu « accroche » 60 ms sur un gros coup (ralentit seulement les effets à l'écran)
  // Micro-pause d'impact (affichage seulement, le serveur continue) : effets et particules quasi figés un instant
  pauseImpact(ms = 60, k = 0.15) {
    if (this.lowFx || this._pause || reglages.secousses === 'aucune') return;
    this._pause = true; this.tweens.timeScale = k;
    for (const em of Object.values(this.burst || {})) em.timeScale = k;
    setTimeout(() => { this.tweens.timeScale = 1; for (const em of Object.values(this.burst || {})) em.timeScale = 1; this._pause = false; }, ms);
  },
  // Ralenti bref (élimination, ultime lancé) : effets, particules et animations des persos ralentis
  ralenti(ms = 200, k = 0.35) {
    if (reglages.secousses === 'aucune') return;
    this._ralentiFin = performance.now() + ms; this._ralentiK = k;
    this.pauseImpact(ms, k);
  },
  // « K.O. » au-dessus de la victime que je viens d'éliminer
  koVictime(vid) {
    const d = vid && this.disp.get(vid); if (!d) return;
    this.floatText(d.x, d.y - 150, 'K.O. !', '#ffffff', 34, true);
    const r = this.add.image(d.x, d.y - 40, 'fx_glow').setTint(0xffffff).setBlendMode('ADD').setDepth(D_FX + 4).setScale(0.4);
    this.tweens.add({ targets: r, scale: 2.4, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  },

  // Annonce d'un ultime : contour + remplissage qui se « charge » jusqu'au moment de l'impact
  annonceUlt(m) {
    const moi = m.o === this.room.sessionId, col = elColor(m.el), danger = moi ? col : 0xff3a3a;
    const g = this.add.graphics().setDepth(D_GROUND + 8), t0 = this.time.now, D = m.d * 1000;
    const dessiner = () => {
      const k = Math.min(1, (this.time.now - t0) / D), pul = 0.5 + Math.sin(this.time.now / 60) * 0.25;
      const c = this.disp.get(m.o), x = c?.x ?? m.x, y = c?.y ?? m.y;
      g.clear();
      if (m.f === 'nova' || m.f === 'domaine') {
        g.fillStyle(danger, 0.1 + k * 0.12).fillCircle(x, y, m.r);
        g.fillStyle(danger, 0.22).fillCircle(x, y, m.r * k);
        g.lineStyle(4, danger, 0.6 + pul * 0.4).strokeCircle(x, y, m.r);
        g.lineStyle(2, col, 0.9).strokeCircle(x, y, m.r * k);
      } else {
        const ux = Math.cos(m.a), uy = Math.sin(m.a), nx = -uy * m.w / 2, ny = ux * m.w / 2, L = m.len;
        const coin = (l, s2) => ({ x: x + ux * l + nx * s2, y: y + uy * l + ny * s2 });
        const poly = (l0, l1) => [coin(l0, 1), coin(l1, 1), coin(l1, -1), coin(l0, -1)];
        g.fillStyle(danger, 0.1 + k * 0.1).fillPoints(poly(0, L), true);
        g.fillStyle(danger, 0.25).fillPoints(poly(0, L * k), true);
        g.lineStyle(3, danger, 0.6 + pul * 0.4).strokePoints(poly(0, L), true);
        const pt = coin(L, 0), b1 = coin(L - 50, 1.4), b2 = coin(L - 50, -1.4);   // pointe de flèche
        g.fillStyle(danger, 0.7).fillTriangle(pt.x + ux * 30, pt.y + uy * 30, b1.x, b1.y, b2.x, b2.y);
      }
      if (k >= 1) { g.destroy(); return; }
      this.time.delayedCall(16, dessiner);
    };
    dessiner();
    const [v, pan] = this.ear(m.x, m.y);
    if (v > 0 && !moi) sfx.elite?.(v, pan);   // petit signal d'alerte
  },

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
  },

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
  },

  // Volume et panoramique selon la distance au joueur local
  ear(x, y) {
    const md = this.disp.get(this.room.sessionId);
    if (!md) return [0.5, 0];
    const dx = x - md.x, d = Math.hypot(dx, y - md.y);
    return [Math.max(0, 1 - d / 1000), dx / 700];
  },

  shakeNear(x, y, intensity) {
    const md = this.disp.get(this.room.sessionId);
    if (md && Phaser.Math.Distance.Between(md.x, md.y, x, y) < 700) this.cameras.main.shake(160, intensity);
  },

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
        if (surMoi) {
          sfx.hurt(); if (TOUCH && reglages.vibration && navigator.vibrate) navigator.vibrate(25);
          // d'où vient le coup : arc rouge autour de moi + bords de l'écran qui rougissent
          const src = m.o && (this.disp.get(m.o) || this.room.state.players.get(m.o));
          this.coupRecu(src ? Math.atan2(src.y - m.y, src.x - m.x) : null, Math.min(1, m.v / 25));
        } else if (m.o === myId) {
          sfx.hitmark();
          if (m.v >= 30) { this.cameras.main.shake(90, 0.0035); this.pauseImpact(); }   // gros coup donné : petite secousse + micro-pause
          else this.pauseImpact(30, 0.4);                                                // coup normal : micro-pause plus légère
        }
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
    } else if (m.t === 'combo') { this.floatText(m.x, m.y - 100, m.nom, '#ffe066', 22); if (v > 0.4) astuce('combo'); }
    else if (m.t === 'elecwater') {
      // l'eau électrifiée : éclairs sur toute la flaque
      const fl = this.add.image(m.x, m.y, 'fx_glow').setTint(0xffe14a).setBlendMode('ADD').setDepth(D_FX).setDisplaySize(m.r * 2.4, m.r * 2);
      this.tweens.add({ targets: fl, alpha: 0, duration: 450, onComplete: () => fl.destroy() });
      for (let k = 0; k < 6; k++) { const a = Math.random() * 7, rr = Math.random() * m.r; this.shapeBurst('bolt', m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, 2, 0xffe14a); }
      if (v > 0) sfx.zap?.(v, pan);
    } else if (m.t === 'event') {
      astuce('evenement');
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
    } else if (m.t === 'annonce') {   // zone d'impact d'un ultime, montrée juste avant qu'il frappe
      if (m.o !== myId && v > 0.3) astuce('annonce');
      this.annonceUlt(m);
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
      astuce('horde');
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
        this.tweens.add({ targets: cam, zoom: this.baseZoom * (mine ? 1.1 : 1.06), duration: 160, yoyo: true, hold: 300, ease: 'Quad.easeOut' });
        if (mine) this.ralenti(240, 0.3);   // mon ultime : un quart de seconde au ralenti
      }
      this.shakeNear(m.x, m.y, 0.008);
      const pillar = this.add.image(m.x, m.y - 80, 'fx_glow').setTint(elColor(m.el)).setBlendMode('ADD').setDepth(D_FX).setScale(1, 4);
      this.tweens.add({ targets: pillar, alpha: 0, scaleX: 3, duration: 600, onComplete: () => pillar.destroy() });
    }
  },

  // Associe un impact à l'entité touchée pour la faire clignoter
  markFlash(x, y) {
    const until = this.time.now + 90;
    this.room.state.players.forEach((p, id) => { if (Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2) this.flash.set(id, until); });
    this.room.state.zombies.forEach((z, id) => { if (Math.abs(z.x - x) < 2 && Math.abs(z.y - y) < 2) this.flash.set(id, until); });
  },

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
  },

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
  },

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
  },

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
  },

  // Voile sombre + rayons de lumière quand un ultime se déclenche
  ultimateMoment(x, y, col, dur = 1400) {
    const [v] = this.ear(x, y);
    if (v <= 0.05) return;
    this.tweens.killTweensOf(this.veil);
    this.veil.setAlpha(0);
    this.tweens.add({ targets: this.veil, alpha: 0.3 * Math.min(1, v * 1.4), duration: 180, yoyo: true, hold: dur, ease: 'Quad.easeOut' });
    const rays = this.add.image(x, y - 60, 'fx_rays').setTint(col).setBlendMode('ADD').setDepth(D_FX + 20).setScale(0.3).setAlpha(0.9);
    this.tweens.add({ targets: rays, scale: 2.4, angle: 40, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => rays.destroy() });
  },

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
  },

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
  },

  floatText(x, y, txt, color, size, pop = false) {
    const t = this.add.text(x, y, txt, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '900', color, stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D_UI + 5);
    if (pop) { t.setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' }); }
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, delay: pop ? 150 : 0, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  },

};
