// =====================================================================
//  MONSTRES : zombies, boss, comportements spéciaux, mode Survie (vagues)
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

export const monstres = {
  // ------------------------------------------------------------------
  //  ZOMBIES
  // ------------------------------------------------------------------
  pickZombieKind() {
    const kinds = Object.entries(ZOMBIES);
    let roll = Math.random() * kinds.reduce((s, [, k]) => s + k.poids, 0);
    for (const [id, k] of kinds) { roll -= k.poids; if (roll <= 0) return id; }
    return 'rodeur';
  },

  spawnZombie(horde, near = null) {
    if (this.state.zombies.size >= ZOMBIE_CONFIG.max) return;
    const kind = this.pickZombieKind();
    const K = ZOMBIES[kind];
    const z = new Zombie();
    // 60 % dans la ville, le reste n'importe où ; jamais sur un joueur
    const area = near ? { x: near.x - 500, y: near.y - 500, w: 1000, h: 1000 } : (Math.random() < 0.6 ? CITY : null);
    Object.assign(z, { kind, hp: K.hp, maxHp: K.hp, ...this.freePos(K.r + 4, 450, area) });
    z.x = clamp(z.x, K.r, ARENA.width - K.r); z.y = clamp(z.y, K.r, ARENA.height - K.r);
    const id = `z_${this.nextId++}`;
    this.state.zombies.set(id, z);
    this.ent.set(id, {
      zombie: true, horde, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null,
      atkCd: 0, wx: z.x, wy: z.y, stuck: 0, detour: 0, dvx: 0, dvy: 0,
    });
  },

  // Le Titan : apparaît près d'un joueur, annoncé à toute la carte
  spawnBoss(humans, kind = 'titan') {
    if ([...this.state.zombies.values()].some((z) => ZOMBIES[z.kind].boss)) return;
    const K = ZOMBIES[kind], near = humans.length ? humans[Math.floor(Math.random() * humans.length)] : { x: ARENA.width / 2, y: ARENA.height / 2 };
    const z = new Zombie();
    // PV adaptés au nombre de joueurs humains
    const hp = Math.min(6000, Math.round(K.hp * (1 + 0.5 * Math.max(0, humans.length - 1))));
    Object.assign(z, { kind, hp, maxHp: hp, ...this.freePos(K.r + 6, 380, { x: near.x - 600, y: near.y - 600, w: 1200, h: 1200 }) });
    z.x = clamp(z.x, K.r, ARENA.width - K.r); z.y = clamp(z.y, K.r, ARENA.height - K.r);
    const id = `z_${this.nextId++}`;
    this.state.zombies.set(id, z);
    this.ent.set(id, { zombie: true, horde: true, boss: true, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null,
      atkCd: 0, wx: z.x, wy: z.y, stuck: 0, detour: 0, dvx: 0, dvy: 0, slamCd: 3, summonCd: 8, chargeCd: 4, stun: 0 });
    this.emit('fx', { t: 'boss', x: Math.round(z.x), y: Math.round(z.y), nom: K.nom, global: true });
  },

  zombieDie(z, zid, killerId) {
    if (z.mort) return; z.mort = true; z.alive = false;   // évite qu'un monstre meure deux fois (explosions en chaîne)
    const killer = this.state.players.get(killerId);
    if (ZOMBIES[z.kind].boss) {
      const B = ZOMBIE_CONFIG.boss;
      if (killer) { this.gainXp(killerId, B.xp); killer.ult = Math.min(100, killer.ult + B.ult); }
      for (let i = 0; i < B.orbs; i++) { const o = new Orb(); const a = (i / B.orbs) * Math.PI * 2; o.x = clamp(z.x + Math.cos(a) * 70, 20, ARENA.width - 20); o.y = clamp(z.y + Math.sin(a) * 70, 20, ARENA.height - 20); this.state.orbs.set(String(this.nextId++), o); }
      this.emit('fx', { t: 'bossdie', x: Math.round(z.x), y: Math.round(z.y), who: killer?.name || '', kid: killerId, global: true });
    }
    if (z.elite === 2 || z.kind === 'kamikaze') this.explosionMonstre(z, zid, z.kind === 'kamikaze' ? ZOMBIES.kamikaze.dmg : 22);
    const ke = this.ent.get(killerId);
    if (ke?.rel?.R_moisson && killer?.alive) killer.hp = Math.min(killer.maxHp, killer.hp + 4);
    if (ke?.rel?.R_eclats && !this._eclat) { this._eclat = true; this.aoe(killerId, z.x, z.y, 90, 12, [], killer?.a || 'feu', new Set([zid]), true); this._eclat = false; this.emit('fx', { t: 'boum', x: Math.round(z.x), y: Math.round(z.y), r: 90, p: 1 }); }
    if (killer) {
      killer.zk++;
      if (this.survie) this.survie.kills++;
      this.gainXp(killerId, PROGRESSION.xpZombie * (z.kind === 'colosse' ? 3 : 1));
      if (!killer.bot) this.stats.joueur(killer.name, 'zombies');
      killer.ult = Math.min(100, killer.ult + ZOMBIE_CONFIG.ultReward);
    }
    if (Math.random() < ZOMBIE_CONFIG.orbChance) {
      const o = new Orb(); o.x = z.x; o.y = z.y;
      this.state.orbs.set(String(this.nextId++), o);
    }
    this.emit('fx', { t: 'zdie', x: z.x, y: z.y, kind: z.kind, k: killerId });
    this.state.zombies.delete(zid);
    this.ent.delete(zid);
  },

  updateZombies(dt) {
    if (this.mode === 'survie') { let n = 0; this.state.zombies.forEach((z) => { if (z.kind === 'porteur') n++; }); this.nPorteurs = n; }
    // Population de base + hordes (pas en Survie : ce sont les vagues qui font apparaître les monstres)
    if (this.mode !== 'survie') this.zombieTimer -= dt; else this.zombieTimer = 99;
    if (this.mode !== 'survie') this.hordeT = (this.hordeT ?? ZOMBIE_CONFIG.hordeEvery); else this.hordeT = 999;
    if (this.zombieTimer <= 0) {
      this.zombieTimer = 1.2;
      if (this.state.zombies.size < ZOMBIE_CONFIG.base) this.spawnZombie(false);
    }
    this.hordeT = (this.hordeT ?? ZOMBIE_CONFIG.hordeEvery) - dt;
    const sec = Math.max(0, Math.ceil(this.hordeT));
    if (sec !== this.state.hordeIn) this.state.hordeIn = sec;      // synchronisé une fois par seconde
    if (this.hordeT <= 0) {
      this.hordeT = ZOMBIE_CONFIG.hordeEvery;
      this.state.hordeIn = ZOMBIE_CONFIG.hordeEvery;
      const alive = [...this.state.players.values()].filter((p) => p.alive && !p.bot);
      for (let i = 0; i < ZOMBIE_CONFIG.hordeSize; i++) {
        const near = alive.length && Math.random() < 0.5 ? alive[Math.floor(Math.random() * alive.length)] : null;
        this.spawnZombie(true, near);
      }
      this.emit('fx', { t: 'horde' });
      this.hordeN = (this.hordeN || 0) + 1;
      if (this.hordeN % ZOMBIE_CONFIG.bossEvery === 0) this.spawnBoss(alive);
    }

    this.state.zombies.forEach((z, zid) => {
      const e = this.ent.get(zid);
      const K = ZOMBIES[z.kind];
      for (const k of ['burn', 'wet', 'slow', 'root', 'frost', 'mark', 'blind', 'vine']) if (z[k] > 0) z[k] = Math.max(0, +(z[k] - dt).toFixed(2));
      if (z.burn > 0) { this.applyDamage(z, zid, e.burnDps * dt, e.lastHitBy, true); if (!this.state.zombies.has(zid)) return; }
      else e.burnDps = TAGS.brulure.dps;
      e.atkCd = Math.max(0, e.atkCd - dt);

      // Cible : joueur vivant le plus proche
      let target = null, tid = null, best = e.horde ? 99999 : ZOMBIE_CONFIG.aggro;
      this.state.players.forEach((p, pid) => {
        if (!p.alive || p.locked > 0 || p.invis > 0) return;
        const d = dist(z.x, z.y, p.x, p.y);
        if (d < best) { best = d; target = p; tid = pid; }
      });

      let dx = 0, dy = 0, speed = K.speed * (e.vitM || 1);
      if (K.boss && this.mode !== 'survie' && (e.life = (e.life ?? 180) - dt) <= 0) {   // au bout de 3 min, le Titan repart sous terre
        this.emit('fx', { t: 'bossgone', x: Math.round(z.x), y: Math.round(z.y), global: true });
        this.state.zombies.delete(zid); this.ent.delete(zid); return;
      }
      if (this.mode === 'survie' && target && this.comportement(z, zid, e, K, target, tid, best, dt)) {
        // le comportement spécial a déjà décidé du mouvement (e.mvx, e.mvy)
      }
      if (z.kind === 'titan' && target) {
        const B = ZOMBIE_CONFIG.boss;
        e.slamCd -= dt; e.summonCd -= dt;
        if (e.slamCd <= 0 && best < B.slamR + 40) {
          e.slamCd = B.slamCd;
          this.spawnZone(zid, 'telegraph', z.x, z.y, B.slamR, B.slamDelay, { element: 'zombie', element2: 'feu', dmg: B.slamDmg * (e.dmgM || 1), tags: ['poussee', 'lourd'] });
          this.emit('fx', { t: 'bslam', x: Math.round(z.x), y: Math.round(z.y) });
        }
        if (e.summonCd <= 0) {
          e.summonCd = B.summonCd;
          for (let i = 0; i < B.summonN; i++) {
            if (this.state.zombies.size >= ZOMBIE_CONFIG.max + 5) break;
            const a = Math.random() * Math.PI * 2, K2 = ZOMBIES.coureur, m = new Zombie();
            const pos = resolveCollisions({ x: clamp(z.x + Math.cos(a) * 90, 20, ARENA.width - 20), y: clamp(z.y + Math.sin(a) * 90, 20, ARENA.height - 20) }, K2.r);
            Object.assign(m, { kind: 'coureur', hp: K2.hp, maxHp: K2.hp, x: pos.x, y: pos.y });
            const mid = `z_${this.nextId++}`; this.state.zombies.set(mid, m);
            this.ent.set(mid, { zombie: true, horde: true, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null, atkCd: 0.5, wx: m.x, wy: m.y, stuck: 0, detour: 0, dvx: 0, dvy: 0 });
          }
          this.emit('fx', { t: 'summon', x: Math.round(z.x), y: Math.round(z.y) });
        }
      }
      if (e.mvx !== undefined) { dx = e.mvx; dy = e.mvy; speed *= e.mvs ?? 1; e.mvx = undefined; }
      else if (target) {
        dx = (target.x - z.x) / best; dy = (target.y - z.y) / best;
        if (best <= K.r + CONFIG.playerRadius + 6 && !K.boum) {
          dx = dy = 0;
          if (e.atkCd <= 0) {
            e.atkCd = ZOMBIE_CONFIG.attackCd;
            const tagE = z.kind === 'esprit' ? [ELEMENTS[z.el]?.tag].filter(Boolean) : z.kind === 'colosse' ? ['poussee'] : [];
            this.hit(zid, target, tid, K.dmg * (e.dmgM || 1), tagE, z.x, z.y, z.kind === 'esprit' ? z.el : 'zombie');
          }
        }
      } else {
        speed *= 0.4;
        const dw = dist(z.x, z.y, e.wx, e.wy);
        if (dw < 30) { const p = this.freePos(K.r, 0, { x: z.x - 400, y: z.y - 400, w: 800, h: 800 }); e.wx = p.x; e.wy = p.y; }
        else { dx = (e.wx - z.x) / dw; dy = (e.wy - z.y) / dw; }
      }
      // Contournement simple quand un mur bloque
      if (e.detour > 0) { e.detour -= dt; dx = e.dvx; dy = e.dvy; }
      speed *= speedMult(z);
      if (z.root > 0 && !K.boss) speed = 0;     // le Titan ne peut pas être immobilisé
      if (K.boss) { e.kx *= 0.5; e.ky *= 0.5; }  // ni vraiment repoussé

      const nx = z.x + (dx * speed + e.kx) * dt, ny = z.y + (dy * speed + e.ky) * dt;
      const decay = Math.exp(-7 * dt); e.kx *= decay; e.ky *= decay;
      const pos = resolveCollisions({ x: clamp(nx, K.r, ARENA.width - K.r), y: clamp(ny, K.r, ARENA.height - K.r) }, K.r);
      this.pousserMurs(pos, K.r);   // les murs invoqués bloquent aussi les monstres
      const moved = dist(z.x, z.y, pos.x, pos.y), wanted = speed * dt;
      if (wanted > 1 && moved < wanted * 0.3 && e.detour <= 0) {
        e.stuck += dt;
        if (e.stuck > 0.4) { const s = Math.random() < 0.5 ? 1 : -1; e.dvx = -dy * s; e.dvy = dx * s; e.detour = 0.7; e.stuck = 0; }
      } else e.stuck = 0;
      z.x = pos.x; z.y = pos.y;
      if (this.mode === 'survie') {   // la Brèche est fermée : on reste dans l'arène
        const A = SURVIE.arene, d = dist(A.x, A.y, z.x, z.y), Rm = A.r - K.r;
        if (d > Rm) { z.x = A.x + ((z.x - A.x) / d) * Rm; z.y = A.y + ((z.y - A.y) / d) * Rm; }
      }
    });
  },

  // Comportements spéciaux des monstres de la Survie. Renvoie true si le mouvement est imposé (e.mvx/e.mvy).
  comportement(z, zid, e, K, target, tid, best, dt) {
    const dxn = (target.x - z.x) / (best || 1), dyn = (target.y - z.y) / (best || 1), M = e.dmgM || 1;
    const garderDistance = (D) => {   // tireurs : restent à distance, en tournant autour
      if (best < D * 0.8) { e.mvx = -dxn; e.mvy = -dyn; }
      else if (best > D * 1.15) { e.mvx = dxn; e.mvy = dyn; }
      else { const s = (zid.charCodeAt(zid.length - 1) % 2) ? 1 : -1; e.mvx = -dyn * s; e.mvy = dxn * s; e.mvs = 0.6; }
    };
    // élite invocatrice
    if (z.elite === 4 && (e.sumCd -= dt) <= 0 && this.state.zombies.size < SURVIE.enMemeTemps + 10) {
      e.sumCd = 7;
      for (let i = 0; i < 2; i++) this.renfort('coureur', z.x, z.y, M);
      this.emit('fx', { t: 'summon', x: Math.round(z.x), y: Math.round(z.y) });
    }
    if (K.crachat) {
      garderDistance(K.distance);
      if ((e.spitCd -= dt) <= 0 && best < K.crachat.portee) {
        e.spitCd = K.crachat.cd;
        const C = K.crachat;
        this.spawnZone(zid, 'telegraph', target.x, target.y, C.r, C.delai, { element: 'zombie', element2: 'nature', dmg: K.dmg * M, tags: ['lourd'] });
        this.emit('fx', { t: 'crachat', x1: Math.round(z.x), y1: Math.round(z.y), x2: Math.round(target.x), y2: Math.round(target.y), d: C.delai });
      }
      return true;
    }
    if (K.soin) {
      garderDistance(K.distance);
      if ((e.healCd -= dt) <= 0) {
        e.healCd = K.soin.cd; let n = 0;
        this.state.zombies.forEach((o) => { if (o !== z && dist(o.x, o.y, z.x, z.y) < K.soin.r && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * K.soin.part); n++; } });
        if (n) this.emit('fx', { t: 'soinz', x: Math.round(z.x), y: Math.round(z.y), r: K.soin.r });
      }
      return true;
    }
    if (K.boum) {   // kamikaze : allume sa mèche au contact, puis explose
      if (e.fuse === undefined && best < K.r + CONFIG.playerRadius + 30) { e.fuse = K.boum.meche; this.emit('fx', { t: 'meche', x: Math.round(z.x), y: Math.round(z.y) }); }
      if (e.fuse !== undefined) {
        e.mvx = 0; e.mvy = 0; e.fuse -= dt;
        if (e.fuse <= 0) { this.explosionMonstre(z, zid, K.dmg); this.state.zombies.delete(zid); this.ent.delete(zid); }
        return true;
      }
      return false;
    }
    if (z.kind === 'liche') {
      garderDistance(K.distance);
      e.slamCd -= dt; e.summonCd -= dt;
      if (e.slamCd <= 0) {   // pluie de sorts autour de la cible
        e.slamCd = 3.2;
        for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, d = i ? 60 + Math.random() * 140 : 0;
          this.spawnZone(zid, 'telegraph', target.x + Math.cos(a) * d, target.y + Math.sin(a) * d, 70, 1.1, { element: 'ombre', element2: 'zombie', dmg: 22 * M, tags: ['marque'] }); }
        this.emit('fx', { t: 'bslam', x: Math.round(z.x), y: Math.round(z.y) });
      }
      if (e.summonCd <= 0) { e.summonCd = 11; for (let i = 0; i < 3; i++) this.renfort('esprit', z.x, z.y, M); this.emit('fx', { t: 'summon', x: Math.round(z.x), y: Math.round(z.y) }); }
      return true;
    }
    if (z.kind === 'behemoth') {   // charge : préparation, ruée en ligne droite, puis étourdi
      e.stun = Math.max(0, (e.stun || 0) - dt);
      if (e.stun > 0) { e.mvx = 0; e.mvy = 0; return true; }
      if (e.prep > 0) { e.prep -= dt; e.mvx = 0; e.mvy = 0; if (e.prep <= 0) { e.rush = 1.1; e.touches = new Set(); } return true; }
      if (e.rush > 0) {
        e.rush -= dt; e.mvx = e.cdx; e.mvy = e.cdy; e.mvs = 620 / K.speed;
        this.state.players.forEach((p, pid) => { if (p.alive && !e.touches.has(pid) && dist(p.x, p.y, z.x, z.y) < K.r + CONFIG.playerRadius + 10) { e.touches.add(pid); this.hit(zid, p, pid, 30 * M, ['poussee', 'lourd'], z.x, z.y, 'zombie'); } });
        if (e.rush <= 0) { e.stun = 1.6; this.emit('fx', { t: 'stun', x: Math.round(z.x), y: Math.round(z.y) }); }
        return true;
      }
      if ((e.chargeCd -= dt) <= 0 && best < 700) {
        e.chargeCd = 6; e.prep = 0.9; e.cdx = dxn; e.cdy = dyn;
        this.emit('fx', { t: 'charge', x: Math.round(z.x), y: Math.round(z.y), a: +Math.atan2(dyn, dxn).toFixed(2) });
        e.mvx = 0; e.mvy = 0; return true;
      }
      return false;
    }
    return false;
  },

  // Un monstre qui explose (kamikaze, élite explosive) : blesse les joueurs autour
  explosionMonstre(z, zid, dmg) {
    const r = ZOMBIES.kamikaze.boum.r, M = this.ent.get(zid)?.dmgM || 1;
    this.state.players.forEach((p, pid) => { if (p.alive && dist(p.x, p.y, z.x, z.y) < r + CONFIG.playerRadius) this.hit(zid, p, pid, dmg * M, ['brulure', 'poussee'], z.x, z.y, 'feu'); });
    this.emit('fx', { t: 'boum', x: Math.round(z.x), y: Math.round(z.y), r });
  },

  // Renfort invoqué près d'un monstre (même puissance que la vague en cours)
  renfort(kind, x, y, M) {
    const K = ZOMBIES[kind], S = this.survie || { pv: 1, vit: 1 }, m = new Zombie(), a = Math.random() * Math.PI * 2;
    const pos = resolveCollisions({ x: clamp(x + Math.cos(a) * 80, 20, ARENA.width - 20), y: clamp(y + Math.sin(a) * 80, 20, ARENA.height - 20) }, K.r, this.blds);
    const hp = Math.round(K.hp * (S.pv || 1));
    Object.assign(m, { kind, hp, maxHp: hp, x: pos.x, y: pos.y });
    if (kind === 'esprit') m.el = ['feu', 'glace', 'eclair', 'ombre', 'nature'][Math.floor(Math.random() * 5)];
    const mid = `z_${this.nextId++}`; this.state.zombies.set(mid, m);
    this.ent.set(mid, { zombie: true, horde: true, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null, atkCd: 0.5, wx: m.x, wy: m.y, stuck: 0, detour: 0, dvx: 0, dvy: 0, dmgM: M, vitM: S.vit || 1, spitCd: 2, healCd: 2, sumCd: 6 });
  },

  // ------------------------------------------------------------------
  //  SURVIE : vagues infinies, de plus en plus fortes ; une seule vie
  // ------------------------------------------------------------------
  updateSurvie(dt) {
    const st = this.state, S = this.survie;
    const humains = [...st.players.entries()].filter(([, p]) => !p.bot);
    if (st.phase === 'pause') {
      if (this.clients.length > 0) st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.lancerVague();
    } else if (st.phase === 'jeu') {
      S.temps += dt;
      // les monstres sortent des portails petit à petit
      S.cad -= dt;
      if (S.aSortir > 0 && S.cad <= 0 && st.zombies.size < SURVIE.enMemeTemps) {
        S.cad = SURVIE.cadence; S.aSortir--; this.monstreSurvie();
      }
      const reste = S.aSortir + st.zombies.size;
      if (reste !== st.alive) st.alive = Math.min(255, reste);
      if (reste === 0) {   // vague terminée : pause, soin, orbes
        st.phase = 'pause'; st.timer = SURVIE.pause;
        if (st.round % SURVIE.bossToutesLes === 0) {   // boss vaincu : chaque joueur choisit une relique
          st.timer = SURVIE.pause + 6;
          humains.forEach(([id]) => {
            const e = this.ent.get(id), libres = Object.keys(RELIQUES).filter((k) => !e.rel?.[k]);
            const choix = libres.sort(() => Math.random() - 0.5).slice(0, 3);
            if (!choix.length) return;
            e.pending.push(choix);
            this.clients.find((c) => c.sessionId === id)?.send('lvl', { n: 0, relique: true, choix });
          });
        }
        humains.forEach(([, p]) => { if (p.alive) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * SURVIE.soinPause); });
        for (let i = st.orbs.size; i < SURVIE.orbes; i++) this.spawnOrb();
        this.emit('fx', { t: 'vagueok', n: st.round, global: true });
      }
    } else if (st.phase === 'fin') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.recommencerSurvie();
    }
    // tout le monde est tombé : fin de la partie
    if (st.phase !== 'fin' && st.round >= 1 && humains.length && humains.every(([, p]) => !p.alive && p.lives === 0)) {
      st.phase = 'fin'; st.timer = SURVIE.fin;
      this.broadcast('survieFin', { vague: st.round, kills: S.kills, temps: Math.round(S.temps) });
      this.stats.survie?.(humains.map(([, p]) => p.name), st.round, S.kills, Math.round(S.temps));
    }
  },

  lancerVague() {
    const st = this.state, S = this.survie, n = ++st.round;
    st.phase = 'jeu';
    S.aSortir = SURVIE.base + SURVIE.parVague * (n - 1);
    S.cad = 0.5;
    S.pv = 1 + SURVIE.pvParVague * (n - 1); S.deg = 1 + SURVIE.degatsParVague * (n - 1); S.vit = Math.min(1.5, 1 + SURVIE.vitesseParVague * (n - 1));
    const boss = n % SURVIE.bossToutesLes === 0 ? ['titan', 'liche', 'behemoth'][(n / SURVIE.bossToutesLes - 1) % 3] : null;
    if (boss) this.spawnBoss([...st.players.values()].filter((p) => p.alive && !p.bot), boss);
    // le boss est renforcé lui aussi
    st.zombies.forEach((z, zid) => { if (ZOMBIES[z.kind].boss) { const e = this.ent.get(zid); if (!e.dmgM) { z.maxHp = z.hp = Math.min(65000, Math.round(z.hp * S.pv)); e.dmgM = S.deg; } } });
    this.emit('fx', { t: 'vague', n, boss: boss ? ZOMBIES[boss].nom : '', global: true });
  },

  // Un monstre de la vague : choisi selon le niveau de la vague, sort d'un portail
  monstreSurvie() {
    const st = this.state, S = this.survie, n = st.round, A = SURVIE.arene;
    const poids = { rodeur: 6, coureur: n >= 2 ? 3 + n * 0.2 : 0, colosse: n >= 3 ? 0.6 + n * 0.15 : 0,
      cracheur: n >= 3 ? 1 + n * 0.1 : 0, esprit: n >= 2 ? 1.8 : 0, kamikaze: n >= 4 ? 1.2 + n * 0.12 : 0,
      chaman: n >= 4 ? 0.7 : 0, porteur: n >= 6 ? 0.6 + n * 0.04 : 0 };
    let roll = Math.random() * Object.values(poids).reduce((a, b) => a + b, 0), kind = 'rodeur';
    for (const [k, w] of Object.entries(poids)) { roll -= w; if (roll <= 0) { kind = k; break; } }
    const K = ZOMBIES[kind], ang = SURVIE.portails[Math.floor(Math.random() * 4)] + (Math.random() - 0.5) * 0.25;
    // élite : à partir de la vague 4, de plus en plus souvent
    const elite = n >= 4 && Math.random() < Math.min(0.3, 0.06 + 0.01 * n) ? 1 + Math.floor(Math.random() * 5) : 0;
    const z = new Zombie(), hp = Math.min(65000, Math.round(K.hp * S.pv * (elite ? 3 : 1)));
    Object.assign(z, { kind, hp, maxHp: hp, elite, x: A.x + Math.cos(ang) * (A.r - 80), y: A.y + Math.sin(ang) * (A.r - 80) });
    if (kind === 'esprit') z.el = ['feu', 'glace', 'eclair', 'ombre', 'nature'][Math.floor(Math.random() * 5)];
    const id = `z_${this.nextId++}`;
    st.zombies.set(id, z);
    this.ent.set(id, { zombie: true, horde: true, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null, atkCd: 0.6, wx: z.x, wy: z.y, stuck: 0, detour: 0, dvx: 0, dvy: 0,
      dmgM: S.deg * (elite ? 1.5 : 1), vitM: S.vit * (elite === 1 ? 1.5 : 1), spitCd: 1 + Math.random() * 2, healCd: 2, sumCd: 6 });
    if (elite) this.emit('fx', { t: 'elite', x: Math.round(z.x), y: Math.round(z.y), n: ELITES[elite].nom });
    if (Math.random() < 0.25) this.emit('fx', { t: 'portail', x: Math.round(z.x), y: Math.round(z.y) });
  },

  recommencerSurvie() {
    const st = this.state;
    st.zombies.forEach((_, zid) => this.ent.delete(zid)); st.zombies.clear();
    st.zones.forEach((z, zid) => { st.zones.delete(zid); this.zoneData.delete(zid); }); this.murs?.clear();
    st.round = 0; st.phase = 'pause'; st.timer = SURVIE.pauseDebut; st.alive = 0;
    this.survie = { reste: 0, aSortir: 0, cad: 0, kills: 0, temps: 0 };
    this.oublierChoix();
    st.players.forEach((p, id) => { p.lives = 1; p.kills = 0; p.zk = 0; this.spawn(id); });
  },

};
