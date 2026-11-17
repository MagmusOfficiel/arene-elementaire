// =====================================================================
//  COMBAT : déplacements, sorts, projectiles, zones, dégâts, mort, esquive
//  Méthodes ajoutées à ArenaLogic (voir ArenaLogic.js).
// =====================================================================
import { ArenaState, Player, Zone, Orb, Zombie } from './schema.js';
import { valideCouleur, valideCadre, emoteDe } from '../cosmetiques.js';
import { deltaCote, niveauBots, coteValide } from '../classe.js';
import {
  ARENA, CONFIG, BIOMES, TAGS, INTERACTIONS, ELEMENTS,
  generateKit, rollElements,
  BUILDINGS, CITY, ZOMBIES, ZOMBIE_CONFIG, ROYALE, resolveCollisions, insideBuilding, STATUS_BITS,
  TOURNOI, tournoiPit, NOMS_TOURS, DUO, comboEquipe, FILE, SURVIE, ELITES, RELIQUES, COLISEE, carteDu, areneProche, ESQUIVE, EVENTS, TERRAINS, TERRAIN_TYPES, terrainAt, terrainSpeed, PROGRESSION, UPGRADES, newMods, applyUpgrade,
} from '../data.js';
import { STATUS_FIELD, TIMERS, speedMult, BOT_NAMES, botName, UPG_KEYS, pick3, BOT_DMG, clamp, dist, ANNONCE_ULT, porteeSort } from './commun.js';

export const combat = {
  updatePlayer(p, id, dt) {
    const e = this.ent.get(id);
    if (!e || !p.alive) return;
    // Ultime annoncé : la zone d'impact a été montrée, on le déclenche maintenant
    if (e.annonce && (e.annonce.t -= dt) <= 0) {
      const a = e.annonce; e.annonce = null; this.annonces--; p.locked = 0; p.ult = 100; e.annonceOk = true;
      this.cast(id, 'ultime', a.tx, a.ty); e.annonceOk = false;
    }

    if (e.bot) this.botThink(p, id, e, dt);

    // Timers
    p.locked = Math.max(0, p.locked - dt);
    for (const k of TIMERS) if (p[k] > 0) p[k] = Math.max(0, +(p[k] - dt).toFixed(2));
    for (const k in e.cds) e.cds[k] = Math.max(0, e.cds[k] - dt);
    if (e.dodgeCd > 0) e.dodgeCd -= dt;
    if (e.iframe > 0) e.iframe -= dt;
    if (e.shieldT > 0) { e.shieldT -= dt; if (e.shieldT <= 0) p.shield = 0; }
    if (e.ultLock > 0) e.ultLock -= dt;   // après un ultime : 12 s sans recharge
    else if (p.locked <= 0) p.ult = Math.min(100, p.ult + CONFIG.ultPerSecond * e.mods.ult * dt);

    // Dégâts de brûlure
    if (p.burn > 0) {
      this.applyDamage(p, id, e.burnDps * dt, e.lastHitBy, true);
      if (!p.alive) return;
    } else e.burnDps = TAGS.brulure.dps;

    if (p.locked > 0) return;

    // Terrain sous les pieds
    const ti = terrainAt(p.x, p.y, this.ters), T = ti >= 0 ? this.ters[ti].type : null;
    const isEl = (el) => p.a === el || p.b === el;
    if (T === 'lave' && !isEl('feu')) {
      e.lavaT = (e.lavaT || 0) - dt;
      if (e.lavaT <= 0) { e.lavaT = 0.5; this.hit('lave', p, id, TERRAIN_TYPES.lave.dps * 0.5, ['brulure'], p.x, p.y, 'feu', true); if (!p.alive) return; }
    }
    if (T === 'herbes' && (this.now || 0) - (e.lastCastT || -9) > 1.2) p.invis = Math.max(p.invis, 0.3);   // caché dans les herbes

    // Déplacement
    let vx = 0, vy = 0;
    if (e.dash) {
      vx = e.dash.vx; vy = e.dash.vy;
      e.dash.t -= dt;
      const D = e.dash;
      if (D.hitSpell) {   // charge : touche tout ce qu'on traverse
        this.eachTarget((t, tid) => {
          if (tid === id || !t.alive || t.locked > 0 || D.hit.has(tid)) return;
          if (dist(p.x, p.y, t.x, t.y) < this.radiusOf(t) + 38) {
            D.hit.add(tid);
            this.hit(id, t, tid, D.hitSpell.dmg, D.hitSpell.tags, p.x, p.y, D.hitSpell.element);
            if (D.hitSpell.recul) this.push(tid, t, p.x, p.y, 700);
          }
        });
      }
      if (D.t <= 0) {
        e.dash = null;
        if (D.nova) this.nova(id, p.x, p.y, D.nova);
        if (D.slam) { this.aoe(id, p.x, p.y, D.slam.radius, D.slam.dmg, D.slam.tags, D.slam.element); this.emit('fx', { t: 'slam', x: p.x, y: p.y, r: D.slam.radius, el: D.slam.element }); }
      }
    } else if (e.spin) {
      // tourbillon : on peut bouger lentement pendant qu'on tourne
      const S = e.spin; S.t -= dt; S.tt -= dt;
      if (S.tt <= 0) { S.tt = S.spell.tick; this.aoe(id, p.x, p.y, S.spell.radius, S.spell.dmg, S.spell.tags, S.spell.element, null, true); }
      if (S.t <= 0) e.spin = null;
      let ix = (e.input.r ? 1 : 0) - (e.input.l ? 1 : 0), iy = (e.input.d ? 1 : 0) - (e.input.u ? 1 : 0);
      const len = Math.hypot(ix, iy) || 1;
      vx = (ix / len) * CONFIG.playerSpeed * 0.6; vy = (iy / len) * CONFIG.playerSpeed * 0.6;
    } else if (p.root <= 0) {
      let ix = (e.input.r ? 1 : 0) - (e.input.l ? 1 : 0);
      let iy = (e.input.d ? 1 : 0) - (e.input.u ? 1 : 0);
      const len = Math.hypot(ix, iy) || 1;
      const speed = CONFIG.playerSpeed * (e.kit?.vitesse || 1) * e.mods.speed * speedMult(p) * terrainSpeed(ti, p.a, p.b) * (p.haste > 0 ? 1 + (e.hasteBonus || 0.4) : 1);
      vx = (ix / len) * speed; vy = (iy / len) * speed;
      if (T === 'glace' && !isEl('glace')) {   // on glisse : la vitesse change lentement
        const k = 1 - Math.exp(-dt / TERRAIN_TYPES.glace.glisse);
        e.ivx = (e.ivx ?? vx) + (vx - (e.ivx ?? vx)) * k * 0.35; e.ivy = (e.ivy ?? vy) + (vy - (e.ivy ?? vy)) * k * 0.35;
        vx = e.ivx; vy = e.ivy;
      } else { e.ivx = vx; e.ivy = vy; }
    }
    vx += e.kx; vy += e.ky;
    const decay = Math.exp(-7 * dt);
    e.kx *= decay; e.ky *= decay;

    const r = CONFIG.playerRadius;
    const pos = resolveCollisions({ x: clamp(p.x + vx * dt, r, ARENA.width - r), y: clamp(p.y + vy * dt, r, ARENA.height - r) }, r, this.blds);
    p.x = pos.x; p.y = pos.y;
    if (this.mode === 'tournoi' && p.duel !== 255 && this.state.phase === 'jeu') {
      const c = tournoiPit(p.duel, this.duels.length), d = dist(c.x, c.y, p.x, p.y), R = c.r - r;
      if (d > R) { p.x = c.x + ((p.x - c.x) / d) * R; p.y = c.y + ((p.y - c.y) / d) * R; e.kx *= -0.3; e.ky *= -0.3; }
    } else if (this.mode === 'survie' || this.mode === 'duo') {
      const A = this.mode === 'duo' ? DUO.arene : SURVIE.arene, d = dist(A.x, A.y, p.x, p.y), R = A.r - r;
      if (d > R) { p.x = A.x + ((p.x - A.x) / d) * R; p.y = A.y + ((p.y - A.y) / d) * R; e.kx *= -0.3; e.ky *= -0.3; }
    } else if (this.mode === 'tournoi') {
      // Colisée : hors duel, on reste dans l'arène la plus proche (les gradins ne sont pas accessibles)
      const c = areneProche(p.x, p.y), d = dist(c.x, c.y, p.x, p.y), R = c.r - r;
      if (d > R) { p.x = c.x + ((p.x - c.x) / d) * R; p.y = c.y + ((p.y - c.y) / d) * R; e.kx *= -0.3; e.ky *= -0.3; }
    }

    // Orbes : +ultime, +soin
    this.state.orbs.forEach((o, oid) => {
      if (dist(p.x, p.y, o.x, o.y) < r + (o.k ? 30 : 14)) {
        this.state.orbs.delete(oid);
        if (!e.bot) this.clients.find((c) => c.sessionId === id)?.send('orbe', { k: o.k });
        if (o.k === 1) {   // orbe légendaire : ultime plein, PV pleins
          p.ult = 100; p.hp = p.maxHp; this.gainXp(id, EVENTS.orbe.xp);
          this.emit('fx', { t: 'legend', who: p.name, o: id, x: Math.round(p.x), y: Math.round(p.y), global: true });
          if (this.state.event === 'orbe') this.endEvent();
          return;
        }
        const k = this.state.event === 'ruee' ? 2 : 1;
        if (!(e.ultLock > 0)) p.ult = Math.min(100, p.ult + 7);
        p.hp = Math.min(p.maxHp, p.hp + 10 * k);
        this.gainXp(id, PROGRESSION.xpOrbe * k);
        if (!o.extra) this.clock.setTimeout(() => this.spawnOrb(), 3000);
      }
    });
  },

  // Les projectiles ne sont plus dans l'état : le client les simule à partir d'un message
  updateProjectiles(dt) {
    for (const [pid, d] of this.projs) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.travel += Math.hypot(d.vx, d.vy) * dt;
      if (d.spell.bm && !d.ret && d.travel >= d.spell.range * 0.5) { d.ret = true; d.vx = -d.vx; d.vy = -d.vy; d.hit.clear(); }
      let done = d.travel >= d.spell.range || d.x < 0 || d.y < 0 || d.x > ARENA.width || d.y > ARENA.height;
      if (!done && insideBuilding(d.x, d.y, 2, this.blds)) {
        done = true;
        if (d.spell.explode) this.aoe(d.owner, d.x, d.y, d.spell.explode, d.spell.dmg * 0.5, d.spell.tags, d.spell.element);
      }
      if (!done) {
        for (const c of this.cibles) {
          const t = c.t, tid = c.id;
          if (done) break;
          if (tid === d.owner || !c.alive || c.locked > 0 || d.hit.has(tid)) continue;
          const ddx = d.x - c.x, ddy = d.y - c.y, rr = d.r + c.r;
          if (ddx * ddx + ddy * ddy > rr * rr || !t.alive) continue;
          {
            d.hit.add(tid);
            this.hit(d.owner, t, tid, d.spell.dmg, d.spell.tags, d.x - d.vx, d.y - d.vy, d.spell.element);
            if (d.spell.explode) this.aoe(d.owner, d.x, d.y, d.spell.explode, d.spell.dmg * 0.5, d.spell.tags, d.spell.element, new Set([tid]));
            const O = this.state.players.get(d.owner), oe = this.ent.get(d.owner);
            if (d.spell.pull && O && oe) {   // grappin : le lanceur fonce sur la cible
              const a = Math.atan2(t.y - O.y, t.x - O.x), L = Math.max(0, dist(O.x, O.y, t.x, t.y) - 50);
              oe.dash = { t: 0.2, vx: (Math.cos(a) * L) / 0.2, vy: (Math.sin(a) * L) / 0.2 };
            }
            if (d.spell.attire && O) this.push(tid, t, t.x + (t.x - O.x), t.y + (t.y - O.y), Math.min(900, dist(O.x, O.y, t.x, t.y) * 2.2));
            if (!d.spell.pierce) done = true;
          }
        }
      }
      if (done) { this.projs.delete(pid); this.emit('pend', { i: pid, x: Math.round(d.x), y: Math.round(d.y) }); }
    }
  },

  updateZones(dt) {
    this.state.zones.forEach((z, zid) => {
      const d = this.zoneData.get(zid);
      d.life -= dt;

      if (z.kind === 'telegraph') {
        if (d.life <= 0) this.aoe(d.owner, z.x, z.y, z.r, d.spell.dmg, d.spell.tags, d.spell.element);
      } else if (z.kind === 'meteore' || z.kind === 'invoc') {
        if (d.life <= 0) {
          this.aoe(d.owner, z.x, z.y, z.r, d.spell.dmg, d.spell.tags, d.spell.element);
          this.eachTarget((t, tid) => { if (tid !== d.owner && t.alive && dist(z.x, z.y, t.x, t.y) < z.r * 1.3) this.push(tid, t, z.x, z.y, 600); });
        }
      } else if (z.kind === 'piege') {
        d.armed -= dt;
        if (d.armed <= 0) {
          let trig = false;
          this.eachTarget((t, tid) => { if (!trig && tid !== d.owner && t.alive && t.locked <= 0 && dist(z.x, z.y, t.x, t.y) < z.r + this.radiusOf(t)) trig = true; });
          if (trig) {
            this.aoe(d.owner, z.x, z.y, z.r * 1.6, d.spell.dmg, [...d.spell.tags, 'lourd'], d.spell.element);
            this.emit('fx', { t: 'slam', x: z.x, y: z.y, r: z.r * 1.6, el: d.spell.element });
            d.life = 0;
          }
        }
      } else if (z.kind === 'beam') {
        const owner = this.state.players.get(d.owner);
        if (owner?.alive) { z.x = owner.x; z.y = owner.y; }      // le faisceau suit son lanceur
        d.tickT -= dt;
        if (d.tickT <= 0) {
          d.tickT = d.spell.tick;
          this.lineHit(d.owner, z.x, z.y, z.x + Math.cos(z.a) * z.len, z.y + Math.sin(z.a) * z.len, z.r, d.spell.dmg, d.spell.tags, d.spell.element, true);
        }
      } else if (z.kind === 'domaine') {
        d.tickT -= dt;
        if (d.tickT <= 0) { d.tickT = d.spell.tick; this.aoe(d.owner, z.x, z.y, z.r, d.spell.dmg, d.spell.tags, d.spell.element, null, true); }
        if (d.life <= 0) {   // implosion finale
          this.aoe(d.owner, z.x, z.y, z.r, d.spell.final, d.spell.tags, d.spell.element);
          this.eachTarget((t, tid) => { if (tid !== d.owner && t.alive && dist(z.x, z.y, t.x, t.y) < z.r) this.push(tid, t, t.x + (z.x - t.x) * 2, t.y + (z.y - t.y) * 2, 500); });
        }
      } else if (z.kind === 'dragon') {
        d.age += dt;
        const fwd = d.age * d.spell.speed, wave = Math.sin(d.age * 7) * d.spell.amp;
        z.x = clamp(d.ox + Math.cos(d.ang) * fwd - Math.sin(d.ang) * wave, 0, ARENA.width);
        z.y = clamp(d.oy + Math.sin(d.ang) * fwd + Math.cos(d.ang) * wave, 0, ARENA.height);
        d.tickT -= dt;
        if (d.tickT <= 0) { d.tickT = d.spell.tick; this.aoe(d.owner, z.x, z.y, z.r, d.spell.dmg, d.spell.tags, d.spell.element, null, true); }
      } else if (z.kind === 'zone' || z.kind === 'tornade') {
        if (z.kind === 'tornade') {
          z.x = clamp(z.x + d.vx * dt, 0, ARENA.width);
          z.y = clamp(z.y + d.vy * dt, 0, ARENA.height);
        }
        d.tickT -= dt;
        if (d.tickT <= 0) {
          d.tickT = d.spell.tick;
          this.aoe(d.owner, z.x, z.y, z.r, d.spell.dmg, d.spell.tags, d.spell.element, null, true);
          const owner = this.state.players.get(d.owner);
          if (d.spell.soinLanceur && owner?.alive && dist(owner.x, owner.y, z.x, z.y) < z.r) {
            owner.hp = Math.min(owner.maxHp, owner.hp + d.spell.soinLanceur);
          }
        }
      }
      if (d.life <= 0) { this.state.zones.delete(zid); this.zoneData.delete(zid); }
    });
  },

  // ------------------------------------------------------------------
  //  Lancement des sorts — un seul exécuteur générique piloté par les données
  // ------------------------------------------------------------------
  cast(id, slot, tx, ty) {
    const p = this.state.players.get(id);
    const e = this.ent.get(id);
    if (!p || !e || !e.kit || !p.alive || p.locked > 0) return;

    if (slot === 'esquive') return this.dodge(p, id, e, tx, ty);
    let spell;
    if (slot === 'ultime') {
      if (p.ult < 100 || e.annonce) return;
      spell = e.kit.ultime;
      // Ultimes à impact immédiat : on montre d'abord la zone touchée (~0,4 s) pour qu'on puisse réagir
      const pause = ANNONCE_ULT[spell.forme];
      if (pause && !e.annonceOk) {
        p.ult = 0; e.ultLock = CONFIG.ultLock; p.locked = pause;
        e.annonce = { t: pause, tx, ty }; this.annonces = (this.annonces || 0) + 1;
        const a = Math.atan2(ty - p.y, tx - p.x);
        const len = spell.forme === 'rayon_ult' ? spell.length : spell.forme === 'dragon' || spell.forme === 'tornade' ? Math.min(900, spell.speed * Math.min(spell.duree, 1.6)) : 0;
        this.emit('fx', { t: 'annonce', o: id, f: spell.forme, x: Math.round(p.x), y: Math.round(p.y), a: +a.toFixed(3), r: spell.radius || 0, len: Math.round(len), w: spell.width || (spell.radius || 60) * 2, d: pause, el: spell.element });
        return;
      }
      p.ult = 0; e.ultLock = CONFIG.ultLock;
      this.emit('fx', { t: 'ult', nom: spell.nom, who: p.name, x: p.x, y: p.y, el: spell.element, f: p.fusion, me: id });
    } else if (slot in e.cds) {
      spell = e.kit[slot];
      if (e.cds[slot] > 0) return;
      e.cds[slot] = spell.cd * e.mods.cd;
      if (!e.bot && slot !== 'basique') this.clients.find((c) => c.sessionId === id)?.send('cd', { slot, t: +e.cds[slot].toFixed(2) });
    } else return;

    if (spell.forme !== 'blink') p.invis = 0;
    e.lastCastT = (this.now || 0);
    if (!['projectile', 'eventail', 'salve'].includes(spell.forme)) this.emit('anim', { o: id, x: Math.round(tx), y: Math.round(ty), el: spell.element, f: spell.forme });
    const ang = Math.atan2(ty - p.y, tx - p.x);
    const reach = Math.min(dist(p.x, p.y, tx, ty), spell.range || 0);
    const target = { x: p.x + Math.cos(ang) * reach, y: p.y + Math.sin(ang) * reach };

    switch (spell.forme) {
      // ---------------- corps à corps ----------------
      case 'melee': {
        const range = spell.range, half = spell.arc / 2;
        this.eachTarget((t, tid) => {
          if (tid === id || !t.alive || t.locked > 0) return;
          const d = dist(p.x, p.y, t.x, t.y);
          if (d > range + this.radiusOf(t)) return;
          let da = Math.abs(Math.atan2(t.y - p.y, t.x - p.x) - ang); if (da > Math.PI) da = 2 * Math.PI - da;
          if (da <= half || d < 30) {
            this.hit(id, t, tid, spell.dmg, spell.tags, p.x, p.y, spell.element);
            if (spell.recul) this.push(tid, t, p.x, p.y, 380);
          }
        });
        this.emit('fx', { t: 'slash', o: id, x: p.x, y: p.y, a: +ang.toFixed(2), r: spell.range, arc: spell.arc, el: spell.element });
        break;
      }
      case 'charge':
        e.dash = { t: 0.22, vx: (Math.cos(ang) * spell.distance) / 0.22, vy: (Math.sin(ang) * spell.distance) / 0.22, hitSpell: spell, hit: new Set() };
        this.emit('fx', { t: 'charge', o: id, el: spell.element });
        break;
      case 'saut': {
        const dd = Math.min(dist(p.x, p.y, tx, ty), spell.distance);
        e.dash = { t: 0.45, vx: (Math.cos(ang) * dd) / 0.45, vy: (Math.sin(ang) * dd) / 0.45, slam: spell };
        this.emit('anim', { o: id, x: Math.round(tx), y: Math.round(ty), el: spell.element, k: 'saut', d: 0.45 });
        break;
      }
      case 'tourbillon':
        e.spin = { t: spell.duree, tt: 0, spell };
        this.emit('anim', { o: id, x: Math.round(tx), y: Math.round(ty), el: spell.element, k: 'spin', d: spell.duree });
        break;
      case 'rayon': {
        const x2 = p.x + Math.cos(ang) * spell.length, y2 = p.y + Math.sin(ang) * spell.length;
        this.lineHit(id, p.x, p.y, x2, y2, spell.width, spell.dmg, spell.tags, spell.element);
        this.emit('fx', { t: 'beam', o: id, x1: Math.round(p.x), y1: Math.round(p.y), x2: Math.round(x2), y2: Math.round(y2), w: spell.width, el: spell.element });
        break;
      }
      case 'frappe': {
        // se téléporte dans le dos de l'ennemi le plus proche de la visée
        let best = null, bd = 220;
        this.eachTarget((t, tid) => {
          if (tid === id || !t.alive || t.locked > 0 || dist(p.x, p.y, t.x, t.y) > spell.range) return;
          const d = dist(tx, ty, t.x, t.y); if (d < bd) { bd = d; best = [t, tid]; }
        });
        if (!best) { e.cds[slot] = 0.5; return; }
        const [t, tid] = best;
        const ba = Math.atan2(t.y - p.y, t.x - p.x);
        const pos = resolveCollisions({ x: clamp(t.x + Math.cos(ba) * 45, 30, ARENA.width - 30), y: clamp(t.y + Math.sin(ba) * 45, 30, ARENA.height - 30) }, CONFIG.playerRadius, this.blds);
        this.emit('fx', { t: 'blink', x1: p.x, y1: p.y, x2: pos.x, y2: pos.y });
        p.x = pos.x; p.y = pos.y;
        this.hit(id, t, tid, spell.dmg, spell.tags, p.x, p.y, spell.element);
        this.emit('fx', { t: 'slash', o: id, x: p.x, y: p.y, a: +(ba + Math.PI).toFixed(2), r: 90, arc: 2, el: spell.element });
        break;
      }
      case 'piege': {
        const zid = this.spawnZone(id, 'piege', target.x, target.y, spell.radius, spell.duree, spell);
        this.zoneData.get(zid).armed = 0.8;
        break;
      }
      // ---------------- ultimes spectaculaires ----------------
      case 'meteore':
        this.spawnZone(id, 'meteore', target.x, target.y, spell.radius, spell.delay, spell);
        break;
      case 'invocation': {
        const zid = this.spawnZone(id, 'invoc', target.x, target.y, spell.radius, spell.delay, spell);
        this.state.zones.get(zid).f = p.fusion;
        break;
      }
      case 'rayon_ult': {
        const zid = this.spawnZone(id, 'beam', p.x, p.y, spell.width, spell.duree, spell);
        const z = this.state.zones.get(zid); z.a = ang; z.len = spell.length;
        break;
      }
      case 'domaine':
        this.spawnZone(id, 'domaine', p.x, p.y, spell.radius, spell.duree, spell);
        break;
      case 'dragon': {
        const zid = this.spawnZone(id, 'dragon', p.x, p.y, spell.radius, spell.duree, spell);
        const d = this.zoneData.get(zid); d.ox = p.x; d.oy = p.y; d.ang = ang; d.age = 0;
        this.state.zones.get(zid).a = ang;
        break;
      }
      case 'projectile':
        this.spawnProjectile(id, p.x, p.y, ang, spell);
        break;
      case 'salve':   // plusieurs projectiles à la suite
        for (let i = 0; i < spell.count; i++) {
          this.clock.setTimeout(() => { if (p.alive) this.spawnProjectile(id, p.x, p.y, Math.atan2(ty - p.y, tx - p.x), spell); }, i * spell.gap * 1000);
        }
        break;
      case 'fissure': {  // une ligne d'impacts qui avance vers la cible
        for (let i = 0; i < spell.count; i++) {
          const k = (i + 1) * spell.spacing;
          const x = clamp(p.x + Math.cos(ang) * k, 20, ARENA.width - 20), y = clamp(p.y + Math.sin(ang) * k, 20, ARENA.height - 20);
          this.spawnZone(id, 'telegraph', x, y, spell.radius, spell.delay + i * spell.stagger, spell);
        }
        break;
      }
      case 'eventail':
        for (let i = 0; i < spell.count; i++) {
          this.spawnProjectile(id, p.x, p.y, ang + spell.spread * (i / (spell.count - 1) - 0.5), spell);
        }
        break;
      case 'impact':
        this.spawnZone(id, 'telegraph', target.x, target.y, spell.radius, spell.delay, spell);
        break;
      case 'dash':
        e.dash = { t: 0.16, vx: (Math.cos(ang) * spell.distance) / 0.16, vy: (Math.sin(ang) * spell.distance) / 0.16, nova: spell.nova };
        break;
      case 'soin':
        p.hp = Math.min(p.maxHp, p.hp + spell.heal);
        this.emit('fx', { t: 'heal', x: p.x, y: p.y, v: spell.heal });
        this.nova(id, p.x, p.y, spell.nova);
        break;
      case 'bouclier':
        p.shield = spell.shield; e.shieldT = spell.duree;
        this.nova(id, p.x, p.y, spell.nova);
        break;
      case 'blink': {
        // Téléportation : on avance jusqu'à la destination libre la plus lointaine
        const d0 = Math.min(dist(p.x, p.y, tx, ty), spell.distance);
        let nx = p.x, ny = p.y;
        for (let k = d0; k > 0; k -= 15) {
          const cx = clamp(p.x + Math.cos(ang) * k, 30, ARENA.width - 30), cy = clamp(p.y + Math.sin(ang) * k, 30, ARENA.height - 30);
          if (!insideBuilding(cx, cy, CONFIG.playerRadius, this.blds)) { nx = cx; ny = cy; break; }
        }
        this.emit('fx', { t: 'blink', x1: p.x, y1: p.y, x2: nx, y2: ny });
        this.nova(id, p.x, p.y, spell.nova);
        p.x = nx; p.y = ny;
        p.invis = spell.invis;
        break;
      }
      case 'hate':
        p.haste = spell.duree; e.hasteBonus = spell.bonus;
        this.nova(id, p.x, p.y, spell.nova);
        break;
      case 'armure':
        p.armor = spell.duree; e.armorRed = spell.reduction;
        this.nova(id, p.x, p.y, spell.nova);
        break;
      case 'pluie': {
        const c = spell.centre === 'cible' ? target : { x: p.x, y: p.y };
        for (let i = 0; i < spell.count; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = i === 0 ? 0 : Math.sqrt(Math.random()) * spell.spread;
          this.spawnZone(id, 'telegraph', c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, spell.radius, spell.delay + i * spell.stagger, spell);
        }
        break;
      }
      case 'tornade': {
        const zid = this.spawnZone(id, 'tornade', p.x, p.y, spell.radius, spell.duree, spell);
        const d = this.zoneData.get(zid);
        d.vx = Math.cos(ang) * spell.speed; d.vy = Math.sin(ang) * spell.speed;
        break;
      }
      case 'nova':
        this.aoe(id, p.x, p.y, spell.radius, spell.dmg, spell.tags, spell.element);
        if (spell.recul) this.eachTarget((t, tid) => { if (tid !== id && t.alive && dist(p.x, p.y, t.x, t.y) < spell.radius + 20) this.push(tid, t, p.x, p.y, 520); });
        this.spawnZone(id, 'nova', p.x, p.y, spell.radius, 0.45, spell);
        break;
      case 'zone': {
        const c = spell.centre === 'cible' ? target : { x: p.x, y: p.y };
        this.spawnZone(id, 'zone', c.x, c.y, spell.radius, spell.duree, spell);
        break;
      }
    }
  },

  // Dégâts le long d'un segment (rayons, faisceaux)
  lineHit(owner, x1, y1, x2, y2, width, dmg, tags, element, quiet = false) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    this.eachTarget((t, tid) => {
      if (tid === owner || !t.alive || t.locked > 0) return;
      const k = Math.max(0, Math.min(1, ((t.x - x1) * dx + (t.y - y1) * dy) / L2));
      if (dist(t.x, t.y, x1 + dx * k, y1 + dy * k) <= width / 2 + this.radiusOf(t)) this.hit(owner, t, tid, dmg, tags, x1, y1, element, quiet);
    });
  },

  push(tid, t, fx, fy, force) {
    const te = this.ent.get(tid); if (!te) return;
    const a = Math.atan2(t.y - fy, t.x - fx);
    te.kx += Math.cos(a) * force; te.ky += Math.sin(a) * force;
  },

  spawnProjectile(owner, x, y, ang, spell) {
    const pid = this.nextId++;
    const vx = Math.cos(ang) * spell.speed, vy = Math.sin(ang) * spell.speed;
    this.projs.set(pid, { owner, spell, x, y, r: spell.radius, vx, vy, travel: 0, hit: new Set() });
    this.emit('proj', { i: pid, o: owner, x: Math.round(x), y: Math.round(y), vx: Math.round(vx), vy: Math.round(vy), r: spell.radius, el: spell.element, rg: spell.range, ...(spell.bm ? { bm: 1 } : {}) });
  },

  spawnZone(owner, kind, x, y, r, life, spell) {
    const zid = String(this.nextId++);
    const z = new Zone();
    Object.assign(z, { x, y, r, kind, el: spell.element || '', el2: spell.element2 || spell.element || '', t: life });
    this.state.zones.set(zid, z);
    this.zoneData.set(zid, { owner, spell, life, tickT: 0, vx: 0, vy: 0 });
    return zid;
  },

  // Petite explosion à la fin des sorts utilitaires
  nova(owner, x, y, n) {
    if (!n) return;
    const spell = { element: n.element, tags: [ELEMENTS[n.element].tag], dmg: n.dmg };
    this.aoe(owner, x, y, n.radius, n.dmg, spell.tags, n.element);
    this.spawnZone(owner, 'nova', x, y, n.radius, 0.3, spell);
  },

  aoe(owner, x, y, r, dmg, tags, element, exclude = null, quiet = false) {
    this.eachTarget((t, tid) => {
      if (tid === owner || exclude?.has(tid) || !t.alive || t.locked > 0) return;
      if (dist(x, y, t.x, t.y) <= r + this.radiusOf(t)) this.hit(owner, t, tid, dmg, tags, x, y, element, quiet);
    });
  },

  // ------------------------------------------------------------------
  //  Impact : biome, interactions de tags, bouclier, statuts, recul
  // ------------------------------------------------------------------
  hit(srcId, t, tid, baseDmg, tags, fromX, fromY, element, quiet = false, noChain = false) {
    if (this.state.phase !== 'jeu' && !(t instanceof Zombie)) return;
    if (!this.canHarm(srcId, tid)) return;
    // L'éclair se propage dans toute la flaque d'eau où se trouve la cible
    if (element === 'eclair' && !noChain && srcId !== 'lave') {
      const wi = terrainAt(t.x, t.y, this.ters);
      if (wi >= 0 && this.ters[wi].type === 'eau') {
        const W = this.ters[wi];
        this.eachTarget((o, oid) => {
          if (oid === tid || oid === srcId || !o.alive || Math.hypot(o.x - W.x, o.y - W.y) > W.r) return;
          this.hit(srcId, o, oid, baseDmg * 0.5, ['chaine'], t.x, t.y, 'eclair', false, true);
        });
        this.emit('fx', { t: 'elecwater', x: W.x, y: W.y, r: W.r });
      }
    }
    if (t instanceof Zombie && typeof srcId === 'string' && srcId.startsWith('z_')) return;   // les zombies s'épargnent
    const src = this.state.players.get(srcId);
    const se = this.ent.get(srcId);
    const te = this.ent.get(tid);
    if (te?.iframe > 0) {   // roulade : invincible
      if (!quiet && !te.dodgedT) { te.dodgedT = true; this.emit('fx', { t: 'combo', x: t.x, y: t.y - 40, nom: 'Esquivé !' }); }
      return;
    }
    if (te) te.dodgedT = false;
    let dmg = baseDmg;
    if (se?.mods) { dmg *= se.mods.dmg; if (se.mods.crit && Math.random() < se.mods.crit) dmg *= 1.6; }
    if (te?.mods) dmg *= te.mods.def;
    if (src?.blind > 0 || (srcId?.startsWith?.('z_') && this.state.zombies.get(srcId)?.blind > 0)) dmg *= 1 - TAGS.aveugle.malus;   // aveuglé : frappe moins fort
    const ev = this.state.event;
    if ((ev === 'eclipse' && element === 'ombre') || (ev === 'tempete' && element === this.state.eventEl)) dmg *= EVENTS.eclipse.bonus;
    if (se?.bot) dmg *= BOT_DMG;
    // Survie : reliques, élites, aura des porte-boucliers
    if (se?.rel?.R_furie && src && src.hp < src.maxHp * 0.5) dmg *= 1.35;
    if (t instanceof Zombie) {
      if (t.elite === 5) dmg *= 0.6;                          // élite blindée
      if (te?.stun > 0) dmg *= 1.5;                           // Béhémoth étourdi après sa charge
      if (t.kind !== 'porteur' && this.mode === 'survie' && this.nPorteurs > 0) {   // (compté une fois par tick)
        for (const [zid2, z2] of this.state.zombies) if (z2.kind === 'porteur' && zid2 !== tid && dist(z2.x, z2.y, t.x, t.y) < ZOMBIES.porteur.aura.r) { dmg *= 1 - ZOMBIES.porteur.aura.reduc; break; }
      }
    }
    const zSrc = typeof srcId === 'string' && srcId.startsWith('z_') ? this.state.zombies.get(srcId) : null;
    if (zSrc && !(t instanceof Zombie)) {
      if (zSrc.elite === 3) zSrc.hp = Math.min(zSrc.maxHp, zSrc.hp + dmg * 0.5);    // élite vampire
      if (te?.rel?.R_epines && dist(zSrc.x, zSrc.y, t.x, t.y) < 120) this.applyDamage(zSrc, srcId, dmg * 0.5, tid, true);   // épines
    }

    if (src) {
      const biome = this.mode !== 'tournoi' && this.mode !== 'duo' && BIOMES.find((b) => src.x >= b.x && src.x <= b.x + b.w && src.y >= b.y && src.y <= b.y + b.h);
      if (biome && biome.element === element) dmg *= CONFIG.biomeBonus;
    }

    if (t.mark > 0) dmg *= TAGS.marque.bonus;
    const blocked = new Set();
    for (const tag of tags) {
      for (const it of INTERACTIONS) {
        if (it.entrant !== tag || !(t[STATUS_FIELD[it.statut]] > 0)) continue;
        dmg *= it.dmgMult;
        it.retire?.forEach((s) => (t[STATUS_FIELD[s]] = 0));
        if (it.bloque) blocked.add(it.bloque);
        if (it.renforce === 'brulure') { t.burn = TAGS.brulure.duree; te.burnDps = TAGS.brulure.dps * 2; }
        // Immobilisation : ensuite 1,5 s d'immunité, pour éviter d'enchaîner les blocages
        if (it.root && (this.rootImm ||= new Map()).get(tid) <= (this.now || 0) || (it.root && !this.rootImm.has(tid))) {
          t.root = it.root; this.rootImm.set(tid, (this.now || 0) + it.root + 1.5);
        }
        if (!quiet || Math.random() < 0.3) this.emit('fx', { t: 'combo', x: t.x, y: t.y - 40, nom: it.nom });
      }
    }

    for (const tag of tags) {
      if (blocked.has(tag)) continue;
      if (tag === 'brulure') t.burn = TAGS.brulure.duree;
      else if (tag === 'mouille') t.wet = TAGS.mouille.duree;
      else if (tag === 'lourd') t.slow = TAGS.lourd.duree;
      else if (tag === 'gel') t.frost = TAGS.gel.duree;
      else if (tag === 'marque') t.mark = TAGS.marque.duree;
      else if (tag === 'aveugle') t.blind = TAGS.aveugle.duree;
      else if (tag === 'racine') t.vine = TAGS.racine.duree;
      else if (tag === 'poussee' || tag === 'poussee_l') {
        const a = Math.atan2(t.y - fromY, t.x - fromX);
        const F = TAGS[tag].force;
        te.kx += Math.cos(a) * F;
        te.ky += Math.sin(a) * F;
      }
    }

    if (src && !(t instanceof Zombie)) this.stats.fusion(src.fusion, 'degats', Math.round(dmg));
    if (src && srcId !== tid) {
      if (!(se?.ultLock > 0)) src.ult = Math.min(100, src.ult + dmg * CONFIG.ultPerDamage * (se?.mods?.ult ?? 1) * (t instanceof Zombie ? 0.5 : 1));
      if (se?.mods?.vamp && src.alive) src.hp = Math.min(src.maxHp, src.hp + dmg * se.mods.vamp);
      this.gainXp(srcId, dmg * PROGRESSION.xpDegat * (t instanceof Zombie ? 0.4 : 1));
    }
    te.lastHitBy = srcId;
    if (this.mode === 'duo' && src && !(t instanceof Zombie) && !tags.includes('combo')) this.comboEquipe(srcId, src, t, tid, te, element);
    this.emit('fx', { t: 'dmg', x: t.x, y: t.y, v: Math.round(dmg), el: element, ...(src ? { o: srcId } : {}) });
    const tx = t.x, ty = t.y;
    this.applyDamage(t, tid, dmg, srcId, false, tags.includes('perce'));

    // Éclair : rebondit sur les cibles proches
    if (tags.includes('chaine') && !noChain) {
      const C = TAGS.chaine;
      const near = [];
      this.eachTarget((o, oid) => {
        if (oid === srcId || oid === tid || !o.alive || o.locked > 0) return;
        const d = dist(tx, ty, o.x, o.y);
        if (d <= C.portee) near.push({ o, oid, d });
      });
      near.sort((a, b) => a.d - b.d).slice(0, C.rebonds).forEach(({ o, oid }) => {
        this.emit('fx', { t: 'chain', x1: tx, y1: ty, x2: o.x, y2: o.y });
        this.hit(srcId, o, oid, baseDmg * C.ratio, ['chaine'], tx, ty, element, true, true);
      });
    }
  },

  applyDamage(t, tid, dmg, srcId, isDot, pierce = false) {
    if (!t.alive) return;
    if (this.state.phase !== 'jeu' && !(t instanceof Zombie)) return;
    if (t.armor > 0 && !pierce) dmg *= 1 - (this.ent.get(tid)?.armorRed || 0.5);
    if (t.shield > 0 && !isDot && !pierce) {
      const absorbed = Math.min(t.shield, dmg);
      t.shield -= absorbed; dmg -= absorbed;
    }
    t.hp = Math.max(0, t.hp - dmg);
    if (t.hp <= 0) this.die(t, tid, srcId);
  },

  die(t, tid, killerId) {
    { const ed = this.ent.get(tid); if (ed?.annonce) { ed.annonce = null; this.annonces--; } }   // ultime annoncé annulé par la mort
    if (t instanceof Zombie) return this.zombieDie(t, tid, killerId);
    const de = this.ent.get(tid);
    if (de?.rel?.R_phenix && !de.phenixUsed) {   // relique : on revient à la vie une fois
      de.phenixUsed = true; t.hp = t.maxHp * 0.5; de.iframe = 1.5;
      this.emit('fx', { t: 'phenix', x: Math.round(t.x), y: Math.round(t.y), o: tid, global: true });
      return;
    }
    t.alive = false;
    t.deaths++;
    t.burn = t.wet = t.slow = t.root = t.frost = t.mark = t.invis = t.armor = t.haste = t.blind = t.vine = 0;
    const killer = killerId && killerId !== tid ? this.state.players.get(killerId) : null;
    if (killer) { killer.kills++; this.stats.fusion(killer.fusion, 'kills'); if (!killer.bot) this.stats.joueur(killer.name, 'kills'); this.gainXp(killerId, PROGRESSION.xpKill); }
    this.stats.fusion(t.fusion, 'morts');
    const zombie = killerId?.startsWith('z_');
    this.broadcast('kill', { killer: killer?.name || null, victim: t.name, kel: killer?.a, kel2: killer?.b, zombie, kid: killer ? killerId : null, vid: tid, kf: killer?.fusion, vf: t.fusion });
    if (this.mode === 'royale') { t.lives = 0; this.checkWinner(); return; }
    if (this.mode === 'tournoi') { t.lives = 0; this.duelOver(tid); return; }
    if (this.mode === 'duo') { t.lives = 0; this.finManche(); return; }
    if (this.mode === 'survie') { t.lives = 0; return; }   // une seule vie (spectateur jusqu'à la fin de la partie)
    this.clock.setTimeout(() => this.spawn(tid), CONFIG.respawnTime * 1000);
  },

  // ------------------------------------------------------------------
  //  ESQUIVE : roulade rapide + invincibilité brève
  // ------------------------------------------------------------------
  dodge(p, id, e, tx, ty) {
    if (e.dodgeCd > 0 || p.root > 0) return;
    let ix = (e.input.r ? 1 : 0) - (e.input.l ? 1 : 0), iy = (e.input.d ? 1 : 0) - (e.input.u ? 1 : 0);
    const ang = ix || iy ? Math.atan2(iy, ix) : Math.atan2(ty - p.y, tx - p.x);
    e.dodgeCd = ESQUIVE.cd; e.iframe = ESQUIVE.invuln; e.spin = null;
    e.dash = { t: ESQUIVE.duree, vx: (Math.cos(ang) * ESQUIVE.distance) / ESQUIVE.duree, vy: (Math.sin(ang) * ESQUIVE.distance) / ESQUIVE.duree };
    this.emit('fx', { t: 'dodge', o: id, x: Math.round(p.x), y: Math.round(p.y), a: +ang.toFixed(2), el: p.a });
    if (!e.bot) this.clients.find((c) => c.sessionId === id)?.send('cd', { slot: 'esquive', t: ESQUIVE.cd });
  },

};
