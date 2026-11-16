// =====================================================================
//  LOGIQUE DU JEU — indépendante du réseau.
//  Utilisée par le serveur Colyseus (multijoueur) ET par le navigateur (mode solo hors-ligne).
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

const STATUS_FIELD = { brulure: 'burn', mouille: 'wet', lourd: 'slow', gel: 'frost', marque: 'mark', aveugle: 'blind', racine: 'vine' };
const TIMERS = ['burn', 'wet', 'slow', 'root', 'frost', 'mark', 'invis', 'armor', 'haste', 'blind', 'vine'];
const speedMult = (t) => (t.slow > 0 ? 1 - TAGS.lourd.slow : 1) * (t.frost > 0 ? 1 - TAGS.gel.slow : 1) * (t.vine > 0 ? 1 - TAGS.racine.slow : 1);
const BOT_NAMES = ['Mannequin Alpha', 'Mannequin Bêta', 'Mannequin Gamma', 'Mannequin Delta', 'Mannequin Epsilon',
  'Kaito', 'Rena', 'Shinra', 'Aiko', 'Ryuji', 'Mira', 'Taro', 'Yuna', 'Kenji', 'Sora', 'Hana', 'Daichi', 'Emi', 'Haru',
  'Kira', 'Nao', 'Riku', 'Saya', 'Toma', 'Yori', 'Akane', 'Botan', 'Chiyo', 'Genji', 'Isamu', 'Jun', 'Kaede', 'Mako'];
const botName = (i) => (i < BOT_NAMES.length ? BOT_NAMES[i] : `${BOT_NAMES[5 + (i % (BOT_NAMES.length - 5))]} ${Math.floor(i / BOT_NAMES.length) + 1}`);
const UPG_KEYS = Object.keys(UPGRADES);
const pick3 = () => { const k = [...UPG_KEYS]; for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k.slice(0, 3); };
const BOT_DMG = 0.6; // les bots tapent moins fort

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

export class ArenaLogic {

  onCreate(options = {}) {
    this.stats ||= { fusion() {}, joueur() {} };   // statistiques : branchées seulement côté serveur
    this.setState(new ArenaState());
    this.mode = ['royale', 'tournoi', 'survie', 'duo'].includes(options.mode) ? options.mode : 'melee';
    this.classe = this.mode === 'tournoi' && !!options.classe;
    Object.assign(this, carteDu(this.mode));   // obstacles et terrains de la carte (le tournoi : le Colisée)   // tournoi classé : la cote est en jeu
    this.state.mode = this.mode;
    this.solo = !!options.solo;   // partie hors-ligne : personne d'autre ne peut rejoindre, file d'attente courte
    if (this.mode === 'royale' || this.mode === 'tournoi' || this.mode === 'duo') { this.state.phase = 'attente'; this.state.timer = this.solo ? FILE.solo : FILE.premiere; }
    this.ent = new Map();       // données serveur non synchronisées, par joueur
    this.projs = new Map();
    this.zoneData = new Map();
    this.nextId = 1;

    this.onMessage('input', (client, m) => {
      const e = this.ent.get(client.sessionId);
      if (!e || typeof m !== 'object' || !m) return;
      e.input = { u: !!m.u, d: !!m.d, l: !!m.l, r: !!m.r };
    });
    // Emote / message rapide : bulle au-dessus du joueur (1 toutes les 1,5 s au plus)
    this.onMessage('emote', (client, m) => {
      const p = this.state.players.get(client.sessionId), e = this.ent.get(client.sessionId), id = String(m?.e || '');
      if (!p || !e || !emoteDe(id) || (e.emoteT || 0) > (this.now || 0)) return;
      e.emoteT = (this.now || 0) + 1.5;
      this.emit('fx', { t: 'emote', o: client.sessionId, e: id, x: Math.round(p.x), y: Math.round(p.y), global: this.mode === 'duo' });
    });
    this.onMessage('pret', (client) => {
      const e = this.ent.get(client.sessionId);
      if (!e || e.ready) return;
      e.ready = true;
      if (e.pendingSpawn) { e.pendingSpawn = false; this.spawn(client.sessionId); }
    });
    this.onMessage('upgrade', (client, m) => {
      const e = this.ent.get(client.sessionId), p = this.state.players.get(client.sessionId);
      if (!e || !p || !e.pending?.length || !m || ![0, 1, 2].includes(m.i)) return;
      this.takeUpgrade(p, e, e.pending.shift()[m.i]);
    });
    this.onMessage('cast', (client, m) => {
      if (!m || typeof m.slot !== 'string' || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
      this.cast(client.sessionId, m.slot, m.x, m.y);
    });

    this.botSeq = 0;
    for (let i = 0; i < this.botTarget(0); i++) this.addBot();
    for (let i = 0; i < (this.mode === 'survie' ? SURVIE.orbes : this.mode === 'duo' ? 6 : CONFIG.orbCount); i++) this.spawnOrb();
    if (this.mode === 'survie') { this.state.phase = 'pause'; this.state.timer = SURVIE.pauseDebut; this.state.round = 0; this.survie = { reste: 0, aSortir: 0, cad: 0, kills: 0, temps: 0 }; }
    else if (this.mode !== 'tournoi' && this.mode !== 'duo') for (let i = 0; i < ZOMBIE_CONFIG.base; i++) this.spawnZombie(false);
    this.hordeT = ZOMBIE_CONFIG.hordeEvery;
    this.state.hordeIn = ZOMBIE_CONFIG.hordeEvery;
    this.zombieTimer = 0;

    this.setPatchRate(this.mode === 'royale' ? 80 : 50);   // 100 joueurs : patchs un peu moins fréquents
    this.setSimulationInterval((dtMs) => this.update(Math.min(dtMs, 100) / 1000), 50);
  }

  // ------------------------------------------------------------------
  //  Joueurs
  // ------------------------------------------------------------------
  onJoin(client, options) {
    const p = new Player();
    p.name = String(options?.name || 'Joueur').replace(/[<>]/g, '').slice(0, 16) || 'Joueur';
    p.titre = String(options?.titre || '').replace(/[<>]/g, '').slice(0, 24);
    p.coul = valideCouleur(String(options?.coul || '')); p.cadre = valideCadre(String(options?.cadre || ''));
    this.state.players.set(client.sessionId, p);
    const ne = this.newEnt(false);
    ne.cote = coteValide(Number(options?.cote)); ne.jeton = String(options?.jeton || '').slice(0, 40);
    this.ent.set(client.sessionId, ne);
    if (this.classe) client.send('cote', { cote: ne.cote, init: true });
    if (this.salonCode) client.send('salon', { code: this.salonCode });
    if (this.mode !== 'melee' && this.state.phase !== 'attente' && !(this.mode === 'survie' && this.state.phase === 'pause')) { p.alive = false; p.lives = 0; return; }  // spectateur
    this.balanceBots();
    if (this.mode === 'duo') this.equipes();
    this.spawn(client.sessionId);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.ent.delete(client.sessionId);
    if (this.state.phase === 'attente' || this.mode === 'melee') this.balanceBots();
    if (this.mode === 'tournoi') this.forfeit(client.sessionId);
    if (this.mode === 'duo') { if (this.state.phase === 'attente') this.equipes(); else this.finManche(); }
    if (this.mode === 'royale') this.checkWinner();
  }

  // Nombre de bots voulu : complète jusqu'à 100 (royale) ou 8 (tournoi)
  botTarget(humans) {
    // file d'attente : pas de bots tant qu'on attend de vrais joueurs (ils arrivent au lancement)
    if ((this.mode === 'royale' || this.mode === 'tournoi' || this.mode === 'duo') && this.state.phase === 'attente' && !this.lancement) return 0;
    if (this.mode === 'royale') return Math.max(0, ROYALE.taille - humans);
    if (this.mode === 'tournoi') return Math.max(0, TOURNOI.taille - humans);
    if (this.mode === 'duo') return Math.max(0, DUO.taille - humans);
    if (this.mode === 'survie') return 0;
    return CONFIG.botCount;
  }

  balanceBots() {
    const humans = [...this.state.players.values()].filter((p) => !p.bot).length;
    const bots = [...this.state.players.entries()].filter(([, p]) => p.bot).map(([id]) => id);
    const want = this.botTarget(humans + (this.mode === 'melee' ? 0 : 0));
    for (let i = bots.length; i < want; i++) this.addBot();
    for (let i = want; i < bots.length; i++) { const id = bots[bots.length - 1 - (i - want)]; this.state.players.delete(id); this.ent.delete(id); }
  }

  addBot() {
    const i = this.botSeq++;
    const id = `bot_${i}`;
    const p = new Player();
    p.name = botName(i);
    p.bot = true;
    this.state.players.set(id, p);
    this.ent.set(id, this.newEnt(true));
    this.spawn(id);
  }

  newEnt(bot) {
    return {
      bot, kit: null,
      input: { u: false, d: false, l: false, r: false },
      cds: { basique: 0, sort1: 0, sort2: 0, sort3: 0 },
      kx: 0, ky: 0, dash: null, shieldT: 0, burnDps: TAGS.brulure.dps, lastHitBy: null,
      ai: { shoot: 1, strafe: 1, strafeT: 0, wx: 0, wy: 0, react: 0.25 + Math.random() * 0.35, skill: 0.35 + Math.random() * 0.45 },
      dodgeCd: 0, iframe: 0, xp: 0, mods: newMods(), pending: [], opp: null,
    };
  }

  // Tirage des 2 éléments + atterrissage
  spawn(id) {
    const p = this.state.players.get(id);
    const e = this.ent.get(id);
    if (!p || !e) return;
    // Un joueur humain n'entre en jeu qu'une fois son jeu chargé (message « pret »)
    if (!e.bot && !e.ready) { e.pendingSpawn = true; p.alive = false; return; }
    // (solo hors-ligne uniquement : ?force=feu,lumiere dans l'adresse pour tester un champion)
    const [a, b] = (!e.bot && globalThis.FORCE_FUSION) || rollElements();
    e.kit = generateKit(a, b);
    e.cds = { basique: 0, sort1: 0, sort2: 0, sort3: 0 };
    e.kx = e.ky = 0; e.dash = null; e.spin = null; e.shieldT = 0; e.lastHitBy = null;
    e.dodgeCd = 0; e.iframe = 0; e.xp = 0; e.mods = newMods(); e.pending = [];
    Object.assign(p, {
      lvl: 1, xp: 0,
      a, b, fusion: e.kit.fusion,
      maxHp: e.kit.pv, hp: e.kit.pv, shield: 0, ult: 0,
      burn: 0, wet: 0, slow: 0, root: 0, frost: 0, mark: 0, invis: 0, armor: 0, haste: 0, blind: 0, vine: 0,
      ...this.freePos(CONFIG.playerRadius + 10, this.mode === 'royale' ? 90 : 0),
      alive: true,
      locked: e.bot ? 1 : CONFIG.rollLockTime,
    });
    if (this.mode === 'survie') p.lives = 1;
    this.stats.fusion(e.kit.fusion, 'parties');
    if (!e.bot) {
      const client = this.clients.find((c) => c.sessionId === id);
      client?.send('roll', { a, b, fusion: e.kit.fusion });
    }
  }

  // ------------------------------------------------------------------
  //  Boucle de simulation (20 ticks / s, serveur autoritaire)
  // ------------------------------------------------------------------
  update(dt) {
    this.now = (this.now || 0) + dt;
    this.state.players.forEach((p, id) => this.updatePlayer(p, id, dt));
    if (this.mode === 'royale') this.updateRoyale(dt);
    if (this.mode === 'tournoi') this.updateTournoi(dt);
    else if (this.mode === 'duo') this.updateDuo(dt);
    else if (this.mode === 'survie') { this.updateSurvie(dt); this.updateZombies(dt); }
    else { this.updateZombies(dt); this.updateEvents(dt); }
    this.photo();
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.syncStatus();
  }

  // Un seul champ synchronisé pour tous les statuts, et seulement quand il change
  syncStatus() {
    const pack = (t) => {
      let st = 0;
      for (let i = 0; i < STATUS_BITS.length; i++) if (t[STATUS_BITS[i]] > 0) st |= 1 << i;
      if (st !== t.st) t.st = st;
    };
    this.state.players.forEach(pack);
    this.state.zombies.forEach(pack);
  }

  // Position libre (hors bâtiments), optionnellement loin des joueurs
  freePos(r, minPlayerDist = 0, area = null) {
    if (this.mode === 'survie' && !area) {   // Brèche : près du centre de l'arène
      const A = SURVIE.arene;
      for (let i = 0; i < 40; i++) {
        const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * A.r * 0.55, x = A.x + Math.cos(ang) * d, y = A.y + Math.sin(ang) * d;
        if (!insideBuilding(x, y, r, this.blds)) return { x, y };
      }
      return { x: A.x, y: A.y };
    }
    if (this.mode === 'duo' && !area) {   // grande arène : chaque équipe de son côté
      const A = DUO.arene;
      for (let i = 0; i < 40; i++) {
        const x = A.x + (Math.random() - 0.5) * A.r * 1.2, y = A.y + (Math.random() - 0.5) * A.r * 1.2;
        if (Math.hypot(x - A.x, y - A.y) < A.r - r - 40 && !insideBuilding(x, y, r, this.blds)) return { x, y };
      }
      return { x: A.x, y: A.y };
    }
    if (this.mode === 'tournoi' && !area) {
      // Colisée : on apparaît dans une des arènes
      const a = [...COLISEE.arenes, COLISEE.finale][Math.floor(Math.random() * 5)];
      for (let i = 0; i < 40; i++) {
        const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (a.r - r - 40);
        const x = a.x + Math.cos(ang) * d, y = a.y + Math.sin(ang) * d;
        if (!insideBuilding(x, y, r, this.blds)) return { x, y };
      }
      return { x: a.x, y: a.y };
    }
    const A = area || { x: 100, y: 100, w: ARENA.width - 200, h: ARENA.height - 200 };
    for (let i = 0; i < 60; i++) {
      const x = A.x + Math.random() * A.w, y = A.y + Math.random() * A.h;
      if (insideBuilding(x, y, r, this.blds)) continue;
      const ti = terrainAt(x, y, this.ters); if (ti >= 0 && this.ters[ti].type !== 'herbes') continue;   // pas d'apparition dans la lave ou l'eau
      let ok = true;
      if (minPlayerDist) this.state.players.forEach((p) => { if (p.alive && dist(p.x, p.y, x, y) < minPlayerDist) ok = false; });
      if (ok) return { x, y };
    }
    return { x: ARENA.width / 2, y: ARENA.height / 2 - 600 };
  }

  // Photo des positions une fois par tick : lire les champs synchronisés (Colyseus) coûte cher,
  // les boucles les plus fréquentes (collisions des projectiles, cibles des bots) lisent cette copie.
  photo() {
    const a = (this.cibles ||= []); let n = 0;
    const put = (t, id, z) => {
      const c = a[n] || (a[n] = {}); n++;
      c.t = t; c.id = id; c.z = z; c.x = t.x; c.y = t.y; c.alive = t.alive; c.locked = z ? 0 : t.locked; c.invis = z ? 0 : t.invis;
      c.hp = t.hp; c.maxHp = t.maxHp; c.r = z ? ZOMBIES[t.kind].r : CONFIG.playerRadius;
    };
    this.state.players.forEach((t, id) => put(t, id, false));
    this.state.zombies.forEach((t, id) => put(t, id, true));
    a.length = n;
  }

  // Tous les êtres qui peuvent prendre des dégâts : joueurs + zombies
  eachTarget(cb) {
    this.state.players.forEach((t, id) => cb(t, id));
    this.state.zombies.forEach((t, id) => cb(t, id));
  }

  updatePlayer(p, id, dt) {
    const e = this.ent.get(id);
    if (!e || !p.alive) return;

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
  }

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
  }

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
  }

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
      if (p.ult < 100) return;
      spell = e.kit.ultime;
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
  }

  // Dégâts le long d'un segment (rayons, faisceaux)
  lineHit(owner, x1, y1, x2, y2, width, dmg, tags, element, quiet = false) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    this.eachTarget((t, tid) => {
      if (tid === owner || !t.alive || t.locked > 0) return;
      const k = Math.max(0, Math.min(1, ((t.x - x1) * dx + (t.y - y1) * dy) / L2));
      if (dist(t.x, t.y, x1 + dx * k, y1 + dy * k) <= width / 2 + this.radiusOf(t)) this.hit(owner, t, tid, dmg, tags, x1, y1, element, quiet);
    });
  }

  push(tid, t, fx, fy, force) {
    const te = this.ent.get(tid); if (!te) return;
    const a = Math.atan2(t.y - fy, t.x - fx);
    te.kx += Math.cos(a) * force; te.ky += Math.sin(a) * force;
  }

  spawnProjectile(owner, x, y, ang, spell) {
    const pid = this.nextId++;
    const vx = Math.cos(ang) * spell.speed, vy = Math.sin(ang) * spell.speed;
    this.projs.set(pid, { owner, spell, x, y, r: spell.radius, vx, vy, travel: 0, hit: new Set() });
    this.emit('proj', { i: pid, o: owner, x: Math.round(x), y: Math.round(y), vx: Math.round(vx), vy: Math.round(vy), r: spell.radius, el: spell.element, rg: spell.range, ...(spell.bm ? { bm: 1 } : {}) });
  }

  spawnZone(owner, kind, x, y, r, life, spell) {
    const zid = String(this.nextId++);
    const z = new Zone();
    Object.assign(z, { x, y, r, kind, el: spell.element || '', el2: spell.element2 || spell.element || '', t: life });
    this.state.zones.set(zid, z);
    this.zoneData.set(zid, { owner, spell, life, tickT: 0, vx: 0, vy: 0 });
    return zid;
  }

  // Petite explosion à la fin des sorts utilitaires
  nova(owner, x, y, n) {
    if (!n) return;
    const spell = { element: n.element, tags: [ELEMENTS[n.element].tag], dmg: n.dmg };
    this.aoe(owner, x, y, n.radius, n.dmg, spell.tags, n.element);
    this.spawnZone(owner, 'nova', x, y, n.radius, 0.3, spell);
  }

  aoe(owner, x, y, r, dmg, tags, element, exclude = null, quiet = false) {
    this.eachTarget((t, tid) => {
      if (tid === owner || exclude?.has(tid) || !t.alive || t.locked > 0) return;
      if (dist(x, y, t.x, t.y) <= r + this.radiusOf(t)) this.hit(owner, t, tid, dmg, tags, x, y, element, quiet);
    });
  }

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
  }

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
  }

  die(t, tid, killerId) {
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
  }

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
  }

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
  }

  checkWinner() {
    const st = this.state;
    if (st.phase !== 'jeu') return;
    const alive = []; st.players.forEach((p, id) => { if (p.alive && p.lives !== 0) alive.push([id, p]); });
    st.alive = alive.length;
    if (alive.length <= 1) {
      const w = alive[0]?.[1];
      st.phase = 'fin'; st.timer = ROYALE.fin; st.winner = w ? w.name : '';
      this.broadcast('win', { name: w?.name || null, fusion: w?.fusion, id: alive[0]?.[0] });
      if (w) { this.stats.fusion(w.fusion, 'victoires'); if (!w.bot) this.stats.joueur(w.name, 'victoires'); }
    }
  }

  resetRound() {
    const st = this.state;
    st.phase = 'attente'; st.timer = this.solo ? FILE.solo : FILE.suivante; st.zoneR = 0; st.winner = '';
    this.balanceBots();
    st.players.forEach((p, id) => { p.lives = -1; this.spawn(id); });
  }

  // Effets visuels : envoyés seulement aux joueurs assez proches pour les voir
  // (à 100 joueurs, ça divise le trafic réseau). Les annonces globales partent à tous.
  emit(type, msg) {
    const x = msg.x ?? msg.x1, y = msg.y ?? msg.y1;
    if (x === undefined || msg.global || ['horde', 'round', 'tround', 'qualif'].includes(msg.t)) return this.broadcast(type, msg);
    const R = msg.t === 'ult' ? 2400 : 1500;
    for (const c of this.clients) {
      const p = this.state.players.get(c.sessionId);
      if (!p || !p.alive || Math.abs(p.x - x) + Math.abs(p.y - y) < R * 1.4) c.send(type, msg);
    }
  }

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
  }

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
  }

  endEvent() {
    const st = this.state;
    if (st.event === 'orbe' && this.legendId) st.orbs.delete(this.legendId);
    if (st.event === 'ruee') (this.extraOrbs || []).forEach((oid) => st.orbs.delete(oid));
    st.event = ''; st.eventT = 0; st.eventEl = '';
    this.evNext = EVENTS.every[0] + Math.random() * (EVENTS.every[1] - EVENTS.every[0]);
  }

  // Qui peut blesser qui ? (en tournoi : seulement son adversaire de duel)
  canHarm(srcId, tid) {
    if (this.mode === 'duo') {   // pas de tir allié
      const a = this.state.players.get(srcId), b = this.state.players.get(tid);
      return !a || !b || srcId === tid || a.eq !== b.eq;
    }
    if (this.mode !== 'tournoi') return true;
    const a = this.state.players.get(srcId), b = this.state.players.get(tid);
    if (!a || !b) return true;
    return a.duel !== 255 && a.duel === b.duel;
  }

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
  }

  // ------------------------------------------------------------------
  //  PROGRESSION : expérience -> niveau -> 1 amélioration parmi 3
  // ------------------------------------------------------------------
  gainXp(id, amount) {
    const p = this.state.players.get(id), e = this.ent.get(id);
    if (!p || !e?.mods || p.lvl >= PROGRESSION.max || !(amount > 0)) return;
    if (this.mode === 'tournoi' || this.mode === 'duo') return;   // Tournoi / Classé / Duo : PvP pur, pas de niveaux
    e.xp += amount;
    let need = PROGRESSION.base + PROGRESSION.parNiveau * (p.lvl - 1);
    while (e.xp >= need && p.lvl < PROGRESSION.max) {
      e.xp -= need;
      this.levelUp(p, id, e);
      need = PROGRESSION.base + PROGRESSION.parNiveau * (p.lvl - 1);
    }
    const pct = p.lvl >= PROGRESSION.max ? 100 : Math.floor((e.xp / need) * 100);
    if (pct !== p.xp) p.xp = pct;
  }

  levelUp(p, id, e) {
    p.lvl++;
    const choix = pick3();
    this.emit('fx', { t: 'lvl', o: id, x: Math.round(p.x), y: Math.round(p.y), n: p.lvl });
    if (e.bot) { this.takeUpgrade(p, e, choix[Math.floor(Math.random() * 3)]); return; }
    e.pending.push(choix);
    this.clients.find((c) => c.sessionId === id)?.send('lvl', { n: p.lvl, choix });
  }

  takeUpgrade(p, e, key) {
    if (RELIQUES[key]) {   // relique de la Survie
      (e.rel ||= {})[key] = true;
      if (key === 'R_sablier') e.mods.ult *= 2;
      else if (key === 'R_croc') e.mods.vamp += 0.1;
      else if (key === 'R_tempo') e.mods.cd *= 0.75;
      else if (key === 'R_egide') { p.maxHp = Math.min(320, p.maxHp + 50); p.hp = Math.min(p.maxHp, p.hp + 50); }
      return;
    }
    if (!UPGRADES[key]) return;
    if (key === 'vitalite') { p.maxHp = Math.min(250, p.maxHp + 20); p.hp = Math.min(p.maxHp, p.hp + 20); }
    else applyUpgrade(e.mods, key);
  }

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
  }

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
  }

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
    this.state.zones.forEach((z, zid) => { this.state.zones.delete(zid); this.zoneData.delete(zid); });
    st.phase = 'jeu'; st.timer = TOURNOI.duree;
    st.alive = pairs.length * 2;
    this.emit('fx', { t: 'tround', nom: NOMS_TOURS[pairs.length] || `TOUR ${st.round}` });
    if (!pairs.length) this.finishTournoi(ids[0]);
  }

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
  }

  forfeit(id) { this.duelOver(id); }

  // Tournoi classé : un joueur humain termine à la place « place » → sa cote change
  resultatClasse(id, place) {
    const e = this.ent.get(id), p = this.state.players.get(id);
    if (!e || e.bot || !p || e.classeFait) return;
    e.classeFait = true;
    const avant = e.cote || 1000, delta = deltaCote(place, avant);
    e.cote = Math.max(0, avant + delta);
    this.stats.cote?.(e.jeton, p.name, e.cote, place);
    this.clients.find((c) => c.sessionId === id)?.send('cote', { avant, cote: e.cote, delta, place });
  }

  finishTournoi(id) {
    const st = this.state, w = st.players.get(id);
    st.phase = 'fin'; st.timer = TOURNOI.fin; st.winner = w ? w.name : '';
    if (this.classe && id) this.resultatClasse(id, 1);
    this.broadcast('win', { name: w?.name || null, fusion: w?.fusion, id, tournoi: true });
    if (w) { this.stats.fusion(w.fusion, 'victoires'); if (!w.bot) this.stats.joueur(w.name, 'victoires'); }
  }

  resetTournoi() {
    const st = this.state;
    st.phase = 'attente'; st.timer = this.solo ? FILE.solo : FILE.suivante; st.winner = ''; st.round = 0; this.duels = [];
    this.ent.forEach((e) => { e.classeFait = false; });
    this.balanceBots();
    st.players.forEach((p, id) => { p.lives = -1; p.duel = 255; this.spawn(id); });
  }

  // ------------------------------------------------------------------
  //  DUO 2v2 : attente -> manches (jeu / entracte) -> fin. Première équipe à 3 manches.
  // ------------------------------------------------------------------
  // Répartit les joueurs : les humains d'abord (ensemble chez les Bleus quand ils sont 2), puis les bots
  equipes() {
    const ids = [...this.state.players.keys()].sort((a, b) => (this.state.players.get(a).bot ? 1 : 0) - (this.state.players.get(b).bot ? 1 : 0));
    ids.forEach((id, i) => { this.state.players.get(id).eq = i < 2 ? 1 : 2; });
  }

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
        this.balanceBots(); this.equipes();
        st.players.forEach((p, id) => { p.lives = -1; this.spawn(id); });
      }
    }
  }

  lancerDuo() {
    this.lancement = true; this.balanceBots(); this.lancement = false;
    this.equipes();
    const st = this.state; st.round = 0; st.sA = st.sB = 0;
    // un seul tirage par match : chaque duo garde ses champions et construit ses combos
    st.players.forEach((p, id) => { p.kills = 0; p.deaths = 0; this.spawn(id); });
    this.manche();
  }

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
    this.state.zones.forEach((z, zid) => { this.state.zones.delete(zid); this.zoneData.delete(zid); });
    this.projs.clear();
    st.phase = 'jeu'; st.timer = DUO.duree;
    this.emit('fx', { t: 'tround', nom: `MANCHE ${st.round} — ${st.sA} : ${st.sB}` });
  }

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
      st.players.forEach((p) => { if (p.eq === eq) { this.stats.fusion(p.fusion, 'victoires'); if (!p.bot) this.stats.joueur(p.name, 'victoires'); } });
      return;
    }
    st.phase = 'entracte'; st.timer = DUO.entracte;
  }

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
  }

  spawnOrb() {
    const o = new Orb();
    Object.assign(o, this.freePos(16));
    this.state.orbs.set(String(this.nextId++), o);
  }

  radiusOf(t) { return t instanceof Zombie ? ZOMBIES[t.kind].r : CONFIG.playerRadius; }

  // ------------------------------------------------------------------
  //  ZOMBIES
  // ------------------------------------------------------------------
  pickZombieKind() {
    const kinds = Object.entries(ZOMBIES);
    let roll = Math.random() * kinds.reduce((s, [, k]) => s + k.poids, 0);
    for (const [id, k] of kinds) { roll -= k.poids; if (roll <= 0) return id; }
    return 'rodeur';
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  // Un monstre qui explose (kamikaze, élite explosive) : blesse les joueurs autour
  explosionMonstre(z, zid, dmg) {
    const r = ZOMBIES.kamikaze.boum.r, M = this.ent.get(zid)?.dmgM || 1;
    this.state.players.forEach((p, pid) => { if (p.alive && dist(p.x, p.y, z.x, z.y) < r + CONFIG.playerRadius) this.hit(zid, p, pid, dmg * M, ['brulure', 'poussee'], z.x, z.y, 'feu'); });
    this.emit('fx', { t: 'boum', x: Math.round(z.x), y: Math.round(z.y), r });
  }

  // Renfort invoqué près d'un monstre (même puissance que la vague en cours)
  renfort(kind, x, y, M) {
    const K = ZOMBIES[kind], S = this.survie || { pv: 1, vit: 1 }, m = new Zombie(), a = Math.random() * Math.PI * 2;
    const pos = resolveCollisions({ x: clamp(x + Math.cos(a) * 80, 20, ARENA.width - 20), y: clamp(y + Math.sin(a) * 80, 20, ARENA.height - 20) }, K.r, this.blds);
    const hp = Math.round(K.hp * (S.pv || 1));
    Object.assign(m, { kind, hp, maxHp: hp, x: pos.x, y: pos.y });
    if (kind === 'esprit') m.el = ['feu', 'glace', 'eclair', 'ombre', 'nature'][Math.floor(Math.random() * 5)];
    const mid = `z_${this.nextId++}`; this.state.zombies.set(mid, m);
    this.ent.set(mid, { zombie: true, horde: true, kx: 0, ky: 0, burnDps: TAGS.brulure.dps, lastHitBy: null, atkCd: 0.5, wx: m.x, wy: m.y, stuck: 0, detour: 0, dvx: 0, dvy: 0, dmgM: M, vitM: S.vit || 1, spitCd: 2, healCd: 2, sumCd: 6 });
  }

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
  }

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
  }

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
  }

  recommencerSurvie() {
    const st = this.state;
    st.zombies.forEach((_, zid) => this.ent.delete(zid)); st.zombies.clear();
    st.zones.forEach((z, zid) => { st.zones.delete(zid); this.zoneData.delete(zid); });
    st.round = 0; st.phase = 'pause'; st.timer = SURVIE.pauseDebut; st.alive = 0;
    this.survie = { reste: 0, aSortir: 0, cad: 0, kills: 0, temps: 0 };
    st.players.forEach((p, id) => { p.lives = 1; p.kills = 0; p.zk = 0; this.spawn(id); });
  }

  // ------------------------------------------------------------------
  //  IA des bots : choix de cible, distance selon la classe, esquive,
  //  fuite à PV bas, sortie des zones dangereuses, tir anticipé
  // ------------------------------------------------------------------
  botThink(p, id, e, dt) {
    if (p.locked > 0) return;
    const ai = e.ai, st = this.state;
    const tournoi = this.mode === 'tournoi' || this.mode === 'duo';
    if (this.mode === 'tournoi' && p.duel === 255) { e.input = { u: false, d: false, l: false, r: false }; return; }

    // Cible : proche ET affaiblie de préférence
    let target = null, tid = null, best = Infinity, bestD = 0;
    let allie = null;
    if (this.mode === 'duo') for (const [aid, ap] of st.players) if (aid !== id && ap.eq === p.eq && ap.alive) { allie = this.ent.get(aid)?.ai; break; }
    const range = tournoi ? 2000 : 900;
    const px = p.x, py = p.y;
    for (const c of this.cibles || []) {   // copie des positions (voir photo())
      const oid = c.id;
      if (oid === id || !c.alive || c.locked > 0 || c.invis > 0) continue;
      const dx = c.x - px, dy = c.y - py;
      if (dx * dx + dy * dy > range * range) continue;
      if (tournoi && !this.canHarm(id, oid)) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      let score = d - (1 - c.hp / (c.maxHp || 1)) * 220 + (c.z ? 120 : 0);
      if (allie && allie.cible === oid) score -= 320;   // Duo : on concentre le feu avec son coéquipier (combos !)
      if (score < best) { best = score; target = c.t; tid = oid; bestD = d; }
    }
    ai.cible = tid;

    let mx = 0, my = 0, urgent = false;
    const hpPct = p.hp / p.maxHp;

    // 0) Sortir de la lave (sauf les champions de Feu)
    const lti = terrainAt(p.x, p.y, this.ters);
    if (lti >= 0 && this.ters[lti].type === 'lave' && p.a !== 'feu' && p.b !== 'feu') {
      const L = this.ters[lti], d = dist(p.x, p.y, L.x, L.y) || 1; mx = (p.x - L.x) / d; my = (p.y - L.y) / d; urgent = true;
    }
    // 1) Sortir d'une zone dangereuse ennemie (impact annoncé, météore, piège…)
    st.zones.forEach((z, zid) => {
      if (urgent) return;
      const zd = this.zoneData.get(zid);
      if (!zd || zd.owner === id || !['telegraph', 'meteore', 'invoc', 'domaine', 'zone', 'piege'].includes(z.kind)) return;
      const d = dist(p.x, p.y, z.x, z.y);
      if (d < z.r + 30) { mx = (p.x - z.x) / (d || 1); my = (p.y - z.y) / (d || 1); urgent = true; }
    });

    // 2) Esquiver un projectile qui arrive
    if (e.dodgeCd <= 0 && (ai.dodgeLook = (ai.dodgeLook || 0) - dt) <= 0) {
      ai.dodgeLook = ai.react;
      for (const pr of this.projs.values()) {
        if (pr.owner === id || (tournoi && !this.canHarm(pr.owner, id))) continue;
        const rx = p.x - pr.x, ry = p.y - pr.y, d = Math.hypot(rx, ry);
        if (d > 280) continue;
        const sp = Math.hypot(pr.vx, pr.vy) || 1, ux = pr.vx / sp, uy = pr.vy / sp;
        const along = rx * ux + ry * uy, perp = Math.abs(rx * uy - ry * ux);
        if (along > 0 && perp < pr.r + 30 && Math.random() < ai.skill) {
          const side = rx * uy - ry * ux > 0 ? 1 : -1;
          e.input = { r: -uy * side > 0.3, l: -uy * side < -0.3, d: ux * side > 0.3, u: ux * side < -0.3 };
          this.dodge(p, id, e, p.x - uy * side * 100, p.y + ux * side * 100);
          return;
        }
      }
    }

    // 3) Battle royale : rester dans la zone
    if (!urgent && this.mode === 'royale' && st.phase === 'jeu' && st.zoneR) {
      const dz = dist(p.x, p.y, st.zoneX, st.zoneY);
      if (dz > st.zoneR * 0.82) { mx = (st.zoneX - p.x) / dz; my = (st.zoneY - p.y) / dz; urgent = dz > st.zoneR * 0.95 || !target; }
    }

    // L'orbe légendaire attire les bots proches
    if (!urgent && st.event === 'orbe' && this.legendId) {
      const lo = st.orbs.get(this.legendId);
      const d = lo ? dist(p.x, p.y, lo.x, lo.y) : Infinity;
      if (d < 900 && (!target || bestD > 160)) { mx = (lo.x - p.x) / d; my = (lo.y - p.y) / d; urgent = true; }
    }
    if (target && !urgent) {
      const dx = (target.x - p.x) / bestD, dy = (target.y - p.y) / bestD;
      ai.strafeT -= dt;
      if (ai.strafeT <= 0) { ai.strafe *= -1; ai.strafeT = 0.8 + Math.random() * 1.8; }
      const melee = e.kit?.melee;
      const near = melee ? 55 : 230, far = melee ? 80 : 380;
      const fleeing = hpPct < 0.3 && !(target instanceof Zombie) && !tournoi;
      if (fleeing) {
        // fuite : s'éloigne, en allant vers un orbe si possible
        mx = -dx; my = -dy;
        let ob = null, od = 600;
        st.orbs.forEach((o) => { const d = dist(p.x, p.y, o.x, o.y); if (d < od) { od = d; ob = o; } });
        if (ob) { mx = mx * 0.4 + ((ob.x - p.x) / od) * 0.6; my = my * 0.4 + ((ob.y - p.y) / od) * 0.6; }
        if (e.cds.sort2 <= 0) this.cast(id, 'sort2', p.x - dx * 300, p.y - dy * 300);
        else if (e.dodgeCd <= 0 && bestD < 160) this.dodge(p, id, e, p.x - dx * 200, p.y - dy * 200);
      } else if (mx === 0 && my === 0) {
        if (bestD > far) { mx = dx; my = dy; }
        else if (bestD < near) { mx = -dx * 0.7 - dy * ai.strafe * 0.7; my = -dy * 0.7 + dx * ai.strafe * 0.7; }
        else { mx = -dy * ai.strafe; my = dx * ai.strafe; }
      }

      // Visée anticipée : on vise là où la cible sera
      const tv = ai.tLast && ai.tId === tid ? { vx: (target.x - ai.tLast.x) / dt, vy: (target.y - ai.tLast.y) / dt } : { vx: 0, vy: 0 };
      ai.tLast = { x: target.x, y: target.y }; ai.tId = tid;
      const lead = melee ? 0 : Math.min(0.9, bestD / 620) * ai.skill;
      const err = (1 - ai.skill) * 70;
      const aimX = target.x + tv.vx * lead + (Math.random() - 0.5) * err, aimY = target.y + tv.vy * lead + (Math.random() - 0.5) * err;

      ai.shoot -= dt;
      const reach = melee ? e.kit.basique.range + 35 : 520;
      if (bestD < reach && ai.shoot <= 0) { this.cast(id, 'basique', aimX, aimY); ai.shoot = (melee ? 0.4 : 0.6) + Math.random() * 0.4; }
      if (bestD < 460 && e.cds.sort3 <= 0 && Math.random() < dt * 0.8) this.cast(id, 'sort3', aimX, aimY);
      if (bestD < 560 && e.cds.sort1 <= 0 && Math.random() < dt * 0.9) this.cast(id, 'sort1', aimX, aimY);
      if (p.ult >= 100 && bestD < 340 && (!(target instanceof Zombie) || Math.random() < dt * 0.2)) this.cast(id, 'ultime', target.x, target.y);
      // un corps à corps adverse trop collant : roulade sur le côté
      if (!melee && bestD < 90 && e.dodgeCd <= 0 && Math.random() < dt * 2 * ai.skill) this.dodge(p, id, e, p.x - dy * ai.strafe * 200, p.y + dx * ai.strafe * 200);
      if (!fleeing && hpPct < 0.5 && e.cds.sort2 <= 0 && Math.random() < dt * 0.6) this.cast(id, 'sort2', p.x - dx * 250, p.y - dy * 250);
    } else if (!urgent) {
      const pit = tournoi && p.duel !== 255 ? tournoiPit(p.duel, this.duels?.length || 1) : null;
      if (pit) { const d = dist(p.x, p.y, pit.x, pit.y) || 1; mx = (pit.x - p.x) / d; my = (pit.y - p.y) / d; }
      else if (tournoi) {
        // échauffement dans le Colisée : on se balade dans son arène
        if (dist(p.x, p.y, ai.wx, ai.wy) < 40 || (ai.wT = (ai.wT || 0) - dt) <= 0) {
          const c = areneProche(p.x, p.y), a = Math.random() * Math.PI * 2, rr = Math.random() * c.r * 0.8;
          ai.wT = 4; ai.wx = c.x + Math.cos(a) * rr; ai.wy = c.y + Math.sin(a) * rr;
        }
        const d = dist(p.x, p.y, ai.wx, ai.wy) || 1; mx = (ai.wx - p.x) / d; my = (ai.wy - p.y) / d;
      } else {
        if (dist(p.x, p.y, ai.wx, ai.wy) < 40 || (!ai.wx && !ai.wy) || (ai.wT = (ai.wT || 0) - dt) <= 0) {
          ai.wT = 6;
          const zr = this.mode === 'royale' && st.zoneR ? st.zoneR * 0.6 : 0;
          if (zr) { const a = Math.random() * Math.PI * 2, r = Math.random() * zr; ai.wx = st.zoneX + Math.cos(a) * r; ai.wy = st.zoneY + Math.sin(a) * r; }
          else { ai.wx = 200 + Math.random() * (ARENA.width - 400); ai.wy = 200 + Math.random() * (ARENA.height - 400); }
        }
        const d = dist(p.x, p.y, ai.wx, ai.wy) || 1;
        mx = (ai.wx - p.x) / d; my = (ai.wy - p.y) / d;
      }
    }
    e.input = { r: mx > 0.3, l: mx < -0.3, d: my > 0.3, u: my < -0.3 };
  }
}
