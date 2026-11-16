import { Schema, MapSchema, defineTypes } from '@colyseus/schema';

export class Player extends Schema {
  constructor() {
    super();
    this.name = '';
    this.x = 0; this.y = 0;
    this.hp = 0; this.maxHp = 0; this.shield = 0;
    this.a = ''; this.b = ''; this.fusion = '';
    this.ult = 0;
    this.cd1 = 0; this.cd2 = 0;
    this.alive = false;
    this.locked = 0;   // > 0 : animation de tirage / atterrissage
    this.kills = 0; this.deaths = 0;
    this.burn = 0; this.wet = 0; this.slow = 0; this.root = 0;
    this.bot = false;
    this.zk = 0;
    this.frost = 0; this.mark = 0; this.invis = 0; this.armor = 0; this.haste = 0;
    this.st = 0; this.lives = -1;
    this.lvl = 1; this.xp = 0; this.duel = 255; this.titre = ''; this.eq = 0; this.coul = ''; this.cadre = '';
  }
}
// Les timers de statut (burn, wet…) restent côté serveur : seul un masque de bits est synchronisé (st)
defineTypes(Player, {
  name: 'string', x: 'float32', y: 'float32',
  hp: 'uint8', maxHp: 'uint8', shield: 'uint8',
  a: 'string', b: 'string', fusion: 'string',
  ult: 'uint8', alive: 'boolean', locked: 'float32',
  kills: 'uint16', deaths: 'uint16', zk: 'uint16',
  bot: 'boolean', st: 'uint16', lives: 'int8',
  lvl: 'uint8', xp: 'uint8', duel: 'uint8', titre: 'string', eq: 'uint8', coul: 'string', cadre: 'string',
});

export class Projectile extends Schema {
  constructor() { super(); this.x = 0; this.y = 0; this.r = 0; this.el = ''; }
}
defineTypes(Projectile, { x: 'number', y: 'number', r: 'number', el: 'string' });

// kind : telegraph (impact à venir) | zone (persistante) | tornade (mobile)
export class Zone extends Schema {
  constructor() { super(); this.x = 0; this.y = 0; this.r = 0; this.el = ''; this.el2 = ''; this.kind = ''; this.t = 0; this.a = 0; this.len = 0; this.f = ''; }
}
defineTypes(Zone, { x: 'float32', y: 'float32', r: 'uint16', el: 'string', el2: 'string', kind: 'string', t: 'float32', a: 'float32', len: 'uint16', f: 'string' });

export class Zombie extends Schema {
  constructor() {
    super();
    this.kind = ''; this.x = 0; this.y = 0; this.hp = 0; this.maxHp = 0;
    this.burn = 0; this.wet = 0; this.slow = 0; this.root = 0; this.frost = 0; this.mark = 0;
    this.invis = 0; this.armor = 0; this.st = 0; this.elite = 0; this.el = '';
    this.alive = true; this.locked = 0; this.shield = 0; // non synchronisés : compatibilité avec hit()
  }
}
defineTypes(Zombie, { kind: 'string', x: 'float32', y: 'float32', hp: 'uint16', maxHp: 'uint16', st: 'uint16', elite: 'uint8', el: 'string' });

export class Orb extends Schema {
  constructor() { super(); this.x = 0; this.y = 0; this.k = 0; }
}
// k = 1 : orbe légendaire (événement)
defineTypes(Orb, { x: 'float32', y: 'float32', k: 'uint8' });

export class ArenaState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.zones = new MapSchema();
    this.orbs = new MapSchema();
    this.zombies = new MapSchema();
    this.hordeIn = 0;
    this.mode = 'melee'; this.phase = 'jeu'; this.timer = 0;
    this.zoneX = 0; this.zoneY = 0; this.zoneR = 0; this.alive = 0; this.winner = ''; this.round = 0;
    this.event = ''; this.eventT = 0; this.eventEl = '';
    this.sA = 0; this.sB = 0;   // Duo : manches gagnées par les Bleus (A) et les Rouges (B)
  }
}
defineTypes(ArenaState, {
  players: { map: Player },
  zones: { map: Zone },
  orbs: { map: Orb },
  zombies: { map: Zombie },
  hordeIn: 'uint8',
  mode: 'string', phase: 'string', timer: 'float32',
  zoneX: 'float32', zoneY: 'float32', zoneR: 'float32', alive: 'uint8', winner: 'string', round: 'uint8', sA: 'uint8', sB: 'uint8',
  event: 'string', eventT: 'uint8', eventEl: 'string',
});
