// =====================================================================
//  MODES DE JEU : Battle royale, événements de carte, Tournoi / Classé, Duo 2v2
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

export const modes = {
  // ------------------------------------------------------------------
  //  BATTLE ROYALE : attente -> jeu (zone qui rétrécit, 1 vie) -> fin
  // ------------------------------------------------------------------
  updateRoyale(dt) {
    const st = this.state;
    const humans = this.clients.length;
    if (st.phase === 'attente') {
      if (humans > 0) st.timer = Math.max(0, st.timer - dt);
      if (humans >= ROYALE.taille) st.timer = 0;            // assez de vrais joueurs : on lance tout de suite
      if (st.timer <= 0) this.startRound();
    } else if (st.phase === 'jeu') {
      this.roundTime += dt;
      const k = Math.min(1, this.roundTime / ROYALE.zoneDuree);
      st.zoneR = ROYALE.zoneStart + (ROYALE.zoneEnd - ROYALE.zoneStart) * k;
      const dps = ROYALE.degatsZone * (1 + this.roundTime / 40);
      st.players.forEach((p, id) => {
        if (p.alive && p.locked <= 0 && dist(p.x, p.y, st.zoneX, st.zoneY) > st.zoneR) this.applyDamage(p, id, dps * dt, null, true, true);
      });
      let alive = 0; st.players.forEach((p) => { if (p.alive && p.lives !== 0) alive++; });
      if (alive !== st.alive) st.alive = alive;
    } else if (st.phase === 'fin') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.resetRound();
    }
  },

  startRound() {
    const st = this.state;
    this.lancement = true; this.balanceBots(); this.lancement = false;   // on complète avec des bots
    st.phase = 'jeu'; st.winner = ''; this.roundTime = 0;
    st.zoneX = ARENA.width / 2 + (Math.random() - 0.5) * 800;
    st.zoneY = ARENA.height / 2 + (Math.random() - 0.5) * 500;
    st.zoneR = ROYALE.zoneStart;
    st.players.forEach((p, id) => { p.kills = 0; p.deaths = 0; p.zk = 0; this.spawn(id); p.lives = 1; });
    st.alive = st.players.size;
    this.emit('fx', { t: 'round' });
  },

  checkWinner() {
    const st = this.state;
    if (st.phase !== 'jeu') return;
    const alive = []; st.players.forEach((p, id) => { if (p.alive && p.lives !== 0) alive.push([id, p]); });
    st.alive = alive.length;
    if (alive.length <= 1) {
      const w = alive[0]?.[1];
      st.phase = 'fin'; st.timer = ROYALE.fin; st.winner = w ? w.name : '';
      this.broadcast('win', { name: w?.name || null, fusion: w?.fusion, id: alive[0]?.[0] });
      if (w) { this.stats.fusion(w.fusion, 'victoires'); if (!w.bot) { this.stats.joueur(w.name, 'victoires'); this.stats.fusion(w.fusion, 'victoiresJ'); } }
    }
  },

  resetRound() {
    const st = this.state;
    st.phase = 'attente'; st.timer = this.solo ? FILE.solo : FILE.suivante; st.zoneR = 0; st.winner = '';
    this.oublierChoix();
    this.balanceBots();
    st.players.forEach((p, id) => { p.lives = -1; this.spawn(id); });
  },

  // ------------------------------------------------------------------
  //  ÉVÉNEMENTS DE CARTE : un toutes les ~1 min, annoncé à tous
  // ------------------------------------------------------------------
  updateEvents(dt) {
    const st = this.state;
    if (this.mode === 'royale' && st.phase !== 'jeu') { if (st.event) this.endEvent(); return; }
    this.evNext = (this.evNext ?? EVENTS.every[0]) - dt;
    if (!st.event) {
      if (this.evNext <= 0) this.startEvent();
      return;
    }
    this.evLeft -= dt;
    const sec = Math.max(0, Math.ceil(this.evLeft));
    if (sec !== st.eventT) st.eventT = sec;
    if (st.event === 'meteores') {
      this.evTick = (this.evTick || 0) - dt;
      if (this.evTick <= 0) {
        const M = EVENTS.meteores; this.evTick = M.every;
        const alive = [...st.players.values()].filter((p) => p.alive);
        const c = alive.length ? alive[Math.floor(Math.random() * alive.length)] : { x: ARENA.width / 2, y: ARENA.height / 2 };
        const a = Math.random() * Math.PI * 2, d = Math.random() * 520;
        const x = clamp(c.x + Math.cos(a) * d, 60, ARENA.width - 60), y = clamp(c.y + Math.sin(a) * d, 60, ARENA.height - 60);
        this.spawnZone('evt', 'telegraph', x, y, M.r, M.delay, { element: 'feu', element2: 'terre', dmg: M.dmg, tags: ['brulure', 'poussee'] });
      }
    }
    if (this.evLeft <= 0) this.endEvent();
  },

  startEvent(kind) {
    const st = this.state;
    const kinds = ['meteores', 'orbe', 'eclipse', 'tempete', 'ruee'].filter((k) => k !== this.lastEvent);
    kind ||= kinds[Math.floor(Math.random() * kinds.length)];
    this.lastEvent = kind;
    const E = EVENTS[kind];
    st.event = kind; this.evLeft = E.duree; st.eventT = E.duree; st.eventEl = '';
    let x = ARENA.width / 2, y = ARENA.height / 2;
    if (kind === 'tempete') st.eventEl = Object.keys(ELEMENTS)[Math.floor(Math.random() * Object.keys(ELEMENTS).length)];
    if (kind === 'orbe') {
      const pos = this.mode === 'royale' && st.zoneR ? this.freePos(30, 0, { x: st.zoneX - st.zoneR * 0.5, y: st.zoneY - st.zoneR * 0.5, w: st.zoneR, h: st.zoneR }) : this.freePos(30, 500);
      const o = new Orb(); o.x = pos.x; o.y = pos.y; o.k = 1;
      this.legendId = String(this.nextId++); st.orbs.set(this.legendId, o); x = pos.x; y = pos.y;
    }
    if (kind === 'ruee') {
      this.extraOrbs = [];
      for (let i = 0; i < EVENTS.ruee.orbes; i++) {
        const o = new Orb(); Object.assign(o, this.freePos(16)); o.extra = true;
        const oid = String(this.nextId++); st.orbs.set(oid, o); this.extraOrbs.push(oid);
      }
    }
    this.emit('fx', { t: 'event', kind, el: st.eventEl, x: Math.round(x), y: Math.round(y), global: true });
  },

  endEvent() {
    const st = this.state;
    if (st.event === 'orbe' && this.legendId) st.orbs.delete(this.legendId);
    if (st.event === 'ruee') (this.extraOrbs || []).forEach((oid) => st.orbs.delete(oid));
    st.event = ''; st.eventT = 0; st.eventEl = '';
    this.evNext = EVENTS.every[0] + Math.random() * (EVENTS.every[1] - EVENTS.every[0]);
  },

  // ------------------------------------------------------------------
  //  TOURNOI : attente -> quarts -> demies -> finale (duels simultanés)
  // ------------------------------------------------------------------
  updateTournoi(dt) {
    const st = this.state;
    if (st.phase === 'attente') {
      if (this.clients.length > 0) st.timer = Math.max(0, st.timer - dt);
      if (this.clients.length >= TOURNOI.taille) st.timer = 0;
      if (st.timer <= 0) this.startTournoi();
    } else if (st.phase === 'jeu') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) {
        // temps écoulé : le duelliste avec le plus de PV (en %) l'emporte
        for (const d of this.duels) {
          if (d.winner) continue;
          const A = st.players.get(d.a), B = st.players.get(d.b);
          const ra = A?.alive ? A.hp / A.maxHp : -1, rb = B?.alive ? B.hp / B.maxHp : -1;
          const loser = ra >= rb ? d.b : d.a, L = st.players.get(loser);
          if (L) { L.alive = false; L.lives = 0; this.broadcast('kill', { killer: st.players.get(loser === d.a ? d.b : d.a)?.name || null, victim: L.name, kid: loser === d.a ? d.b : d.a, vid: loser }); }
          this.duelOver(loser);
        }
      }
      let alive = 0; st.players.forEach((p) => { if (p.alive && p.duel !== 255) alive++; });
      if (alive !== st.alive) st.alive = alive;
    } else if (st.phase === 'entracte') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.startDuels(this.qualifies);
    } else if (st.phase === 'fin') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.resetTournoi();
    }
  },

  startTournoi() {
    this.lancement = true; this.balanceBots(); this.lancement = false;
    if (this.classe) {
      // adversaires à la hauteur : niveau des bots selon la cote moyenne des joueurs
      const cotes = [...this.ent.values()].filter((e) => !e.bot).map((e) => e.cote || 1000);
      const N = niveauBots(cotes.reduce((a, b) => a + b, 0) / (cotes.length || 1));
      this.ent.forEach((e) => { if (e.bot) Object.assign(e.ai, { skill: Math.min(0.98, N.skill * (0.92 + Math.random() * 0.16)), react: N.react }); });
    }
    const ids = [...this.state.players.keys()];
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    this.state.players.forEach((p, id) => { p.kills = 0; p.deaths = 0; p.zk = 0; this.spawn(id); });
    this.state.round = 0;
    this.startDuels(ids.slice(0, TOURNOI.taille));
  },

  startDuels(ids) {
    const st = this.state;
    st.round++;
    const pairs = [];
    for (let i = 0; i + 1 < ids.length; i += 2) pairs.push([ids[i], ids[i + 1]]);
    this.duels = pairs.map(([a, b], k) => ({ a, b, k, winner: null }));
    const inDuel = new Set(ids);
    st.players.forEach((p, id) => {
      p.duel = 255;
      if (!inDuel.has(id)) { p.alive = false; p.lives = 0; }
    });
    this.duels.forEach((d) => {
      const c = tournoiPit(d.k, this.duels.length);
      [d.a, d.b].forEach((id, side) => {
        const p = st.players.get(id), e = this.ent.get(id);
        if (!p || !e) return;
        p.duel = d.k; e.opp = side ? d.a : d.b;
        const pos = resolveCollisions({ x: c.x + (side ? 1 : -1) * c.r * 0.45, y: c.y }, CONFIG.playerRadius, this.blds);
        Object.assign(p, { x: pos.x, y: pos.y, hp: p.maxHp, shield: 0, alive: true, lives: 1, locked: 1.6,
          burn: 0, wet: 0, slow: 0, root: 0, frost: 0, mark: 0, invis: 0, armor: 0, haste: 0, blind: 0, vine: 0 });
        e.dash = null; e.spin = null; e.kx = e.ky = 0;
        for (const k in e.cds) e.cds[k] = 0;
      });
    });
    // un nombre impair de qualifiés : le dernier passe directement
    this.byes = ids.length % 2 ? [ids[ids.length - 1]] : [];
    this.state.zones.forEach((z, zid) => { this.state.zones.delete(zid); this.zoneData.delete(zid); }); this.murs?.clear();
    st.phase = 'jeu'; st.timer = TOURNOI.duree;
    st.alive = pairs.length * 2;
    this.emit('fx', { t: 'tround', nom: NOMS_TOURS[pairs.length] || `TOUR ${st.round}` });
    if (!pairs.length) this.finishTournoi(ids[0]);
  },

  // Un duelliste est tombé (ou a quitté) : son adversaire est qualifié
  duelOver(loserId) {
    if (this.mode !== 'tournoi' || this.state.phase !== 'jeu' || !this.duels) return;
    const d = this.duels.find((x) => !x.winner && (x.a === loserId || x.b === loserId));
    if (!d) return;
    d.winner = d.a === loserId ? d.b : d.a;
    if (this.classe) this.resultatClasse(loserId, ({ 4: 5, 2: 3, 1: 2 })[this.duels.length] ?? 5);
    const W = this.state.players.get(d.winner), We = this.ent.get(d.winner);
    if (W && We) { W.duel = 255; W.locked = 0; W.hp = W.maxHp; W.shield = 0; }
    this.emit('fx', { t: 'qualif', nom: W?.name || '', id: d.winner, x: W?.x || 0, y: W?.y || 0 });
    if (this.duels.every((x) => x.winner)) {
      const next = [...this.duels.map((x) => x.winner), ...(this.byes || [])].filter((id) => this.state.players.has(id));
      if (next.length <= 1) return this.finishTournoi(next[0]);
      this.qualifies = next;
      this.state.phase = 'entracte'; this.state.timer = TOURNOI.entracte;
    }
  },

  forfeit(id) { this.duelOver(id); },

  // Tournoi classé : un joueur humain termine à la place « place » → sa cote change
  resultatClasse(id, place) {
    const e = this.ent.get(id), p = this.state.players.get(id);
    if (!e || e.bot || !p || e.classeFait) return;
    e.classeFait = true;
    const avant = e.cote || 1000, delta = deltaCote(place, avant);
    e.cote = Math.max(0, avant + delta);
    this.stats.cote?.(e.jeton, p.name, e.cote, place);
    this.clients.find((c) => c.sessionId === id)?.send('cote', { avant, cote: e.cote, delta, place });
  },

  finishTournoi(id) {
    const st = this.state, w = st.players.get(id);
    st.phase = 'fin'; st.timer = TOURNOI.fin; st.winner = w ? w.name : '';
    if (this.classe && id) this.resultatClasse(id, 1);
    this.broadcast('win', { name: w?.name || null, fusion: w?.fusion, id, tournoi: true });
    if (w) { this.stats.fusion(w.fusion, 'victoires'); if (!w.bot) { this.stats.joueur(w.name, 'victoires'); this.stats.fusion(w.fusion, 'victoiresJ'); } }
  },

  resetTournoi() {
    const st = this.state;
    st.phase = 'attente'; st.timer = this.solo ? FILE.solo : FILE.suivante; st.winner = ''; st.round = 0; this.duels = [];
    this.ent.forEach((e) => { e.classeFait = false; });
    this.oublierChoix();
    this.balanceBots();
    st.players.forEach((p, id) => { p.lives = -1; p.duel = 255; this.spawn(id); });
  },

  // ------------------------------------------------------------------
  //  DUO 2v2 : attente -> manches (jeu / entracte) -> fin. Première équipe à 3 manches.
  // ------------------------------------------------------------------
  // Répartit les joueurs : les humains d'abord (ensemble chez les Bleus quand ils sont 2), puis les bots
  equipes() {
    const ids = [...this.state.players.keys()].sort((a, b) => (this.state.players.get(a).bot ? 1 : 0) - (this.state.players.get(b).bot ? 1 : 0));
    ids.forEach((id, i) => { this.state.players.get(id).eq = i < 2 ? 1 : 2; });
  },

  updateDuo(dt) {
    const st = this.state;
    if (st.phase === 'attente') {
      if (this.clients.length > 0) st.timer = Math.max(0, st.timer - dt);
      if (this.clients.length >= DUO.taille) st.timer = 0;
      if (st.timer <= 0) this.lancerDuo();
    } else if (st.phase === 'jeu') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.finManche(true);
    } else if (st.phase === 'entracte') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) this.manche();
    } else if (st.phase === 'fin') {
      st.timer = Math.max(0, st.timer - dt);
      if (st.timer <= 0) {
        st.phase = 'attente'; st.timer = this.solo ? FILE.solo : FILE.suivante; st.winner = ''; st.round = 0; st.sA = st.sB = 0;
        this.oublierChoix();
        this.balanceBots(); this.equipes();
        st.players.forEach((p, id) => { p.lives = -1; this.spawn(id); });
      }
    }
  },

  lancerDuo() {
    this.lancement = true; this.balanceBots(); this.lancement = false;
    this.equipes();
    const st = this.state; st.round = 0; st.sA = st.sB = 0;
    // un seul tirage par match : chaque duo garde ses champions et construit ses combos
    st.players.forEach((p, id) => { p.kills = 0; p.deaths = 0; this.spawn(id); });
    this.manche();
  },

  // Nouvelle manche : chacun revient à son camp, PV pleins
  manche() {
    const st = this.state, A = DUO.arene;
    st.round++;
    const parEq = { 1: 0, 2: 0 };
    st.players.forEach((p, id) => {
      const e = this.ent.get(id); if (!e || !p.eq) return;
      const k = parEq[p.eq]++, cote = p.eq === 1 ? -1 : 1;
      const pos = resolveCollisions({ x: A.x + cote * A.r * 0.6, y: A.y + (k ? 140 : -140) }, CONFIG.playerRadius, this.blds);
      Object.assign(p, { x: pos.x, y: pos.y, hp: p.maxHp, shield: 0, alive: true, lives: 1, locked: 1.6, ult: Math.min(p.ult, 60),
        burn: 0, wet: 0, slow: 0, root: 0, frost: 0, mark: 0, invis: 0, armor: 0, haste: 0, blind: 0, vine: 0 });
      e.dash = null; e.spin = null; e.kx = e.ky = 0; e.coups = null;
      for (const k2 in e.cds) e.cds[k2] = 0;
    });
    this.state.zones.forEach((z, zid) => { this.state.zones.delete(zid); this.zoneData.delete(zid); }); this.murs?.clear();
    this.projs.clear();
    st.phase = 'jeu'; st.timer = DUO.duree;
    this.emit('fx', { t: 'tround', nom: `MANCHE ${st.round} — ${st.sA} : ${st.sB}` });
  },

  // Fin de manche quand une équipe est entièrement à terre (ou au temps : l'équipe avec le plus de PV)
  finManche(temps = false) {
    const st = this.state;
    if (this.mode !== 'duo' || st.phase !== 'jeu') return;
    const vie = { 1: 0, 2: 0 }, pv = { 1: 0, 2: 0 };
    st.players.forEach((p) => { if (!p.eq) return; if (p.alive) { vie[p.eq]++; pv[p.eq] += p.hp / p.maxHp; } });
    let gagnant = 0;
    if (!vie[1] && !vie[2]) gagnant = 0;
    else if (!vie[1]) gagnant = 2; else if (!vie[2]) gagnant = 1;
    else if (temps) gagnant = pv[1] === pv[2] ? 0 : pv[1] > pv[2] ? 1 : 2;
    else return;
    if (gagnant === 1) st.sA++; else if (gagnant === 2) st.sB++;
    const noms = (eq) => [...st.players.values()].filter((p) => p.eq === eq).map((p) => p.name).join(' & ');
    this.emit('fx', { t: 'manche', eq: gagnant, sA: st.sA, sB: st.sB, noms: gagnant ? noms(gagnant) : '' });
    if (st.sA >= DUO.gagner || st.sB >= DUO.gagner) {
      const eq = st.sA >= DUO.gagner ? 1 : 2;
      st.phase = 'fin'; st.timer = DUO.fin; st.winner = noms(eq);
      this.broadcast('win', { name: st.winner, eq, duo: true });
      st.players.forEach((p) => { if (p.eq === eq) { this.stats.fusion(p.fusion, 'victoires'); if (!p.bot) { this.stats.joueur(p.name, 'victoires'); this.stats.fusion(p.fusion, 'victoiresJ'); } } });
      return;
    }
    st.phase = 'entracte'; st.timer = DUO.entracte;
  },

  // Combo d'équipe : la cible a été touchée par un coéquipier il y a moins de 2 s avec un autre élément
  comboEquipe(srcId, src, t, tid, te, element) {
    const now = this.now || 0;
    te.coups ||= [];
    const avant = te.coups.find((c) => c.id !== srcId && now - c.t < 2 && c.el !== element && this.state.players.get(c.id)?.eq === src.eq);
    te.coups = te.coups.filter((c) => now - c.t < 2 && c.id !== srcId); te.coups.push({ id: srcId, el: element, t: now });
    if (!avant || (te.comboT || 0) > now) return;
    const C = comboEquipe(avant.el, element); if (!C) return;
    te.comboT = now + 2.5; te.coups = [];
    const x = t.x, y = t.y;
    this.emit('fx', { t: 'comboEq', x: Math.round(x), y: Math.round(y), r: C.r, nom: C.nom, el1: avant.el, el2: element, eq: src.eq });
    this.aoe(srcId, x, y, C.r, C.dmg, ['combo', ...(C.tags || [])], element, null, true);
    if (C.statut === 'immobile') {
      this.eachTarget((o, oid) => {
        if (!o.alive || !this.canHarm(srcId, oid) || dist(o.x, o.y, x, y) > C.r) return;
        if ((this.rootImm ||= new Map()).get(oid) > now) return;
        o.root = 0.8; this.rootImm.set(oid, now + 2.3);
      });
    }
    if (C.soin) this.state.players.forEach((p) => { if (p.alive && p.eq === src.eq) p.hp = Math.min(p.maxHp, p.hp + C.soin); });
  },

};
