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
const CHOIX_DELAI = 12;   // secondes pour choisir son champion
import { STATUS_FIELD, TIMERS, speedMult, BOT_NAMES, botName, UPG_KEYS, pick3, BOT_DMG, clamp, dist, ANNONCE_ULT, porteeSort } from './commun.js';
import { combat } from './combat.js';
import { modes } from './modes.js';
import { monstres } from './monstres.js';
import { bots } from './bots.js';

// Cœur de la salle : création, arrivée et départ des joueurs, boucle principale, apparition, outils communs.
// Le reste est rangé par thème dans combat.js, modes.js, monstres.js et bots.js.
export class ArenaLogic {

  onCreate(options = {}) {
    // Une erreur dans un message ou dans un tour de boucle est notée, sans arrêter la partie des autres joueurs
    this.signalerErreur ||= (e, ou) => console.error(`[${ou}]`, e);
    const ecouter = this.onMessage.bind(this);
    this.onMessage = (type, cb) => ecouter(type, (client, m) => { try { cb(client, m); } catch (e) { this.signalerErreur(e, `message « ${type} »`); } });
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
    this.onMessage('ping', (client, m) => client.send('pong', m));   // mesure de la latence par le client
    // Choix du champion parmi 3 fusions proposées
    this.onMessage('choisir', (client, m) => this.choisir(client.sessionId, Number(m?.i)));
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
    // Si le serveur a pris du retard (CPU partagé sur l'offre gratuite), on rattrape le temps en plusieurs
    // petits pas au lieu de le perdre : sinon les joueurs avancent moins vite côté serveur que sur leur écran.
    this.setSimulationInterval((dtMs) => {
      let reste = Math.min(dtMs, 300);
      try { while (reste > 0.5) { const pas = Math.min(reste, 50); this.update(pas / 1000); reste -= pas; } }
      catch (e) { this.signalerErreur(e, `boucle ${this.mode}`); }
      this.state.horloge = Math.round((this.now || 0) * 1000) >>> 0;
    }, 50);
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
    // Un humain choisit son champion parmi 3 fusions, hors de la carte (personne ne peut le toucher).
    // (solo hors-ligne uniquement : ?force=feu,lumiere dans l'adresse pour tester un champion)
    const force = !e.bot && globalThis.FORCE_FUSION;
    if (!e.bot && !force) {
      if (e.choix) { e.choisi = e.choix.props[Math.floor(Math.random() * 3)]; e.choix = null; this.clientDe(id)?.send('choixFin', {}); }   // la partie démarre : choix automatique
      if (!e.choisi) { this.proposerChoix(id); return; }
    }
    const [a, b] = e.bot ? rollElements() : force || e.choisi;
    const choisi = !e.bot && !force;
    if (this.mode === 'melee') e.choisi = null;   // monde ouvert : nouveau choix à chaque vie
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
      locked: e.bot ? 1 : choisi ? 1.2 : CONFIG.rollLockTime,
    });
    if (this.mode === 'survie') p.lives = 1;
    this.stats.fusion(e.kit.fusion, 'parties');
    if (!e.bot) this.stats.fusion(e.kit.fusion, 'partiesJ');   // parties jouées par de vrais joueurs (équilibrage)
    if (!e.bot) {
      const client = this.clients.find((c) => c.sessionId === id);
      client?.send('roll', { a, b, fusion: e.kit.fusion, choisi });
    }
  }

  clientDe(id) { return this.clients.find((c) => c.sessionId === id); }

  // Trois fusions différentes proposées au joueur ; il a 12 s pour choisir (sinon tirage au hasard)
  proposerChoix(id) {
    const e = this.ent.get(id), p = this.state.players.get(id);
    const props = [], vus = new Set();
    for (let k = 0; props.length < 3 && k < 50; k++) {
      const ab = rollElements(), f = generateKit(ab[0], ab[1]).fusion;
      if (vus.has(f)) continue;
      vus.add(f); props.push(ab);
    }
    e.choix = { props, t: CHOIX_DELAI };
    for (const [a, b] of props) this.stats.fusion(generateKit(a, b).fusion, 'proposee');
    p.alive = false;
    this.clientDe(id)?.send('choix', { props: props.map(([a, b]) => ({ a, b, fusion: generateKit(a, b).fusion })), t: CHOIX_DELAI });
  }
  choisir(id, i, auto = false) {
    const e = this.ent.get(id);
    if (!e?.choix) return;
    e.choisi = e.choix.props[Number.isInteger(i) && i >= 0 && i < 3 ? i : 0];
    if (!auto) this.stats.fusion(generateKit(e.choisi[0], e.choisi[1]).fusion, 'choisie');   // vrai choix du joueur (pas le hasard du minuteur)
    e.choix = null;
    this.spawn(id);
  }
  // Nouvelle partie : chacun choisira un nouveau champion
  oublierChoix() { this.ent.forEach((e) => { e.choisi = null; }); }

  // ------------------------------------------------------------------
  //  Boucle de simulation (20 ticks / s, serveur autoritaire)
  // ------------------------------------------------------------------
  update(dt) {
    this.now = (this.now || 0) + dt;
    // Choix de champion en cours : compte à rebours, et la partie attend que tout le monde ait choisi
    let enChoix = false;
    for (const [id, e] of this.ent) if (e.choix) { enChoix = true; if ((e.choix.t -= dt) <= 0) this.choisir(id, Math.floor(Math.random() * 3), true); }
    if (enChoix) {
      const st = this.state;
      if (st.phase === 'attente' || (this.mode === 'survie' && st.phase === 'pause' && st.round === 0)) st.timer = Math.max(st.timer, 1);
    }
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

  spawnOrb() {
    const o = new Orb();
    Object.assign(o, this.freePos(16));
    this.state.orbs.set(String(this.nextId++), o);
  }

  radiusOf(t) { return t instanceof Zombie ? ZOMBIES[t.kind].r : CONFIG.playerRadius; }
}
Object.assign(ArenaLogic.prototype, combat, modes, monstres, bots);
