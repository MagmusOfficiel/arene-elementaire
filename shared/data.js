import { EQUILIBRAGE } from './equilibrage.js';
import { CHAMPIONS, CLASSES } from './champions.js';
import { SIGNATURES } from './signatures.js';
export { CHAMPIONS, CLASSES };

// =====================================================================
//  DONNÉES DU JEU — partagées entre le serveur et le client
//  Ajouter un élément / une fusion = ajouter une entrée ici, sans code.
// =====================================================================

export const ARENA = { width: 5600, height: 4200 };   // carte agrandie (x1,4)

export const CONFIG = {
  playerRadius: 22,
  playerSpeed: 250,
  maxHp: 120,
  pureChance: 0.05,      // chance d'obtenir une forme Pure (même élément x2)
  rollLockTime: 3.0,     // secondes figées pendant l'animation de tirage
  respawnTime: 4,
  ultPerDamage: 0.32,     // charge d'ultime par point de dégât infligé
  ultPerSecond: 0.45,    // charge passive
  ultLock: 12,           // secondes sans recharge après un ultime
  biomeBonus: 1.15,      // bonus de dégâts dans le biome de ton élément
  orbCount: 55,
  botCount: 3,
};

// ---------------------------------------------------------------------
//  BIOMES — un par élément, plaine neutre au centre
// ---------------------------------------------------------------------
export const BIOMES = [
  // 4 colonnes x 3 rangées : la ville occupe le centre de la rangée du milieu
  { id: 'volcan',     nom: 'Volcan',            element: 'feu',     x: 0,    y: 0,    w: 1300, h: 1300, color: 0x3a1a12 },
  { id: 'pics',       nom: 'Pics gelés',        element: 'glace',   x: 1433, y: 0,    w: 1300, h: 1300, color: 0x1c3440 },
  { id: 'sanctuaire', nom: 'Sanctuaire',        element: 'lumiere', x: 2867, y: 0,    w: 1300, h: 1300, color: 0x4a4430 },
  { id: 'lac',        nom: 'Lac',               element: 'eau',     x: 4300, y: 0,    w: 1300, h: 1300, color: 0x10283f },
  { id: 'marais',     nom: "Marais d'ombre",    element: 'ombre',   x: 0,    y: 1450, w: 1300, h: 1300, color: 0x221a33 },
  { id: 'orage',      nom: "Champs d'orage",    element: 'eclair',  x: 4300, y: 1450, w: 1300, h: 1300, color: 0x33301a },
  { id: 'montagne',   nom: 'Montagne',          element: 'terre',   x: 0,    y: 2900, w: 1300, h: 1300, color: 0x33291b },
  { id: 'foret',      nom: 'Forêt ancienne',    element: 'nature',  x: 1433, y: 2900, w: 1300, h: 1300, color: 0x1c3a1a },
  { id: 'fonderie',   nom: 'Fonderie',          element: 'metal',   x: 2867, y: 2900, w: 1300, h: 1300, color: 0x2a2d33 },
  { id: 'plateau',    nom: 'Plateau venteux',   element: 'vent',    x: 4300, y: 2900, w: 1300, h: 1300, color: 0x173329 },
];

// La ville en ruines au centre : c'est là que les zombies grouillent
export const CITY = { nom: 'Ville en ruines', x: 1650, y: 1450, w: 2300, h: 1300 };

// ---------------------------------------------------------------------
//  BATTLE ROYALE
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
//  SURVIE (roguelike infini) : une seule arène, « La Brèche ». Des vagues de monstres
//  sortent de 4 portails, toujours plus nombreuses et plus fortes. Une seule vie.
// ---------------------------------------------------------------------
export const SURVIE = {
  arene: { x: 2800, y: 2100, r: 1100 },
  portails: [-Math.PI / 2, 0, Math.PI / 2, Math.PI],        // nord, est, sud, ouest
  pauseDebut: 6, pause: 7,           // secondes avant la 1re vague / entre deux vagues
  base: 8, parVague: 4,              // nombre de monstres : 8 + 4 × (vague - 1)
  pvParVague: 0.2, degatsParVague: 0.15, vitesseParVague: 0.03,    // +20 % PV, +15 % dégâts, +3 % vitesse par vague
  bossToutesLes: 5,                  // un Titan toutes les 5 vagues
  enMemeTemps: 50, cadence: 0.25,    // max de monstres sur le terrain, et délai entre deux apparitions
  soinPause: 0.25,                   // entre deux vagues : 25 % des PV rendus
  fin: 12,                           // écran de fin avant une nouvelle partie
  orbes: 10,
  piliers: [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2 + Math.PI / 6, d = 620; return { x: Math.round(2800 + Math.cos(a) * d - 45), y: Math.round(2100 + Math.sin(a) * d - 45), w: 90, h: 90, pilier: true }; }),
};
// File d'attente (battle royale, tournoi) : on attend de vrais joueurs, puis on complète avec des bots
export const FILE = { premiere: 60, suivante: 20, solo: 8 };
export const ROYALE = {
  attente: 15,        // décompte avant la manche (s)
  taille: 50,         // 50 combattants : complétés par des bots
  zoneStart: 3700, zoneEnd: 200, zoneDuree: 240,   // la zone rétrécit sur 4 min
  degatsZone: 4,      // dégâts/s hors zone (augmentent avec le temps)
  fin: 8,             // durée de l'écran de victoire
};

// ---------------------------------------------------------------------
//  TOURNOI : 8 combattants, duels à élimination directe (quarts, demies, finale)
// ---------------------------------------------------------------------
// Le tournoi se joue dans le COLISÉE : une carte à part, avec 4 grandes arènes de duel
// (une par quart de finale) et la grande arène de la finale au centre. Sol dégagé,
// seulement 4 piliers par arène pour se mettre à couvert.
const ARENES = [{ x: 1400, y: 1050, r: 820 }, { x: 4200, y: 1050, r: 820 }, { x: 1400, y: 3150, r: 820 }, { x: 4200, y: 3150, r: 820 }];
const FINALE = { x: 2800, y: 2100, r: 900 };
const PILIER = 70;
export const COLISEE = {
  arenes: ARENES, finale: FINALE,
  piliers: [...ARENES, FINALE].flatMap((a) => [0, 1, 2, 3].map((k) => {
    const ang = Math.PI / 4 + (k * Math.PI) / 2, d = a.r * 0.52;
    return { x: Math.round(a.x + Math.cos(ang) * d - PILIER / 2), y: Math.round(a.y + Math.sin(ang) * d - PILIER / 2), w: PILIER, h: PILIER, pilier: true };
  })),
};
// Arène du Colisée la plus proche d'un point (celle où l'on se trouve)
export const areneProche = (x, y) => [...ARENES, FINALE].reduce((best, a) => (Math.hypot(x - a.x, y - a.y) - a.r < Math.hypot(x - best.x, y - best.y) - best.r ? a : best));
export const TOURNOI = {
  taille: 8, attente: 12, duree: 90, entracte: 7, fin: 9,
  pits: ARENES, finale: FINALE,
};
export const tournoiPit = (duel, nbDuels) => (nbDuels === 1 ? TOURNOI.finale : TOURNOI.pits[duel % TOURNOI.pits.length]);
// ---------------------------------------------------------------------
//  DUO 2v2 : Bleus contre Rouges dans la grande arène du Colisée, première équipe à 3 manches
// ---------------------------------------------------------------------
export const DUO = { taille: 4, gagner: 3, duree: 75, entracte: 5, fin: 9, arene: FINALE };
// Combos d'équipe : deux coéquipiers touchent la même cible avec leurs éléments en moins de 2 s
// effet : dmg = dégâts en zone autour de la cible, r = rayon, statut appliqué (racine = immobilisé 0,8 s)
export const COMBOS_EQUIPE = {
  'eau+eclair':     { nom: 'Électrocution', dmg: 14, r: 130, statut: 'immobile' },
  'feu+vent':       { nom: 'Tornade ardente', dmg: 18, r: 140, tags: ['brulure'] },
  'feu+glace':      { nom: 'Choc thermique', dmg: 24, r: 80 },
  'eau+feu':        { nom: 'Vapeur aveuglante', dmg: 10, r: 150, tags: ['aveugle'] },
  'eau+terre':      { nom: 'Bourbier', dmg: 10, r: 150, tags: ['lourd'] },
  'feu+nature':     { nom: 'Incendie', dmg: 16, r: 150, tags: ['brulure'] },
  'lumiere+ombre':  { nom: 'Éclipse', dmg: 22, r: 100, tags: ['marque'] },
  'eclair+metal':   { nom: 'Conduction', dmg: 20, r: 120, statut: 'immobile' },
  'glace+vent':     { nom: 'Blizzard', dmg: 12, r: 160, tags: ['gel'] },
  'nature+terre':   { nom: 'Ronces', dmg: 12, r: 130, tags: ['racine'] },
  'eau+glace':      { nom: 'Gel profond', dmg: 12, r: 120, tags: ['gel'] },
  'eclair+vent':    { nom: 'Orage', dmg: 18, r: 150 },
  'metal+terre':    { nom: 'Séisme', dmg: 18, r: 140, tags: ['poussee'] },
  'lumiere+nature': { nom: 'Floraison', dmg: 8, r: 160, soin: 15 },
  'feu+ombre':      { nom: 'Flammes noires', dmg: 16, r: 110, tags: ['brulure', 'marque'] },
};
export const SYNERGIE = { nom: 'Synergie', dmg: 10, r: 90 };   // toute autre paire d'éléments différents
export const comboEquipe = (a, b) => (a === b ? null : COMBOS_EQUIPE[[a, b].sort().join('+')] || SYNERGIE);

export const NOMS_TOURS = { 4: 'QUARTS DE FINALE', 2: 'DEMI-FINALES', 1: 'FINALE' };

// ---------------------------------------------------------------------
//  ÉVÉNEMENTS DE CARTE (monde ouvert et battle royale)
// ---------------------------------------------------------------------
export const EVENTS = {
  every: [55, 85],          // secondes entre deux événements (aléatoire dans l'intervalle)
  meteores: { nom: 'PLUIE DE MÉTÉORES', icon: '☄', duree: 16, every: 0.55, r: 140, dmg: 30, delay: 1.3 },
  orbe:     { nom: 'ORBE LÉGENDAIRE',   icon: '💎', duree: 40, xp: 60 },
  eclipse:  { nom: 'ÉCLIPSE',           icon: '🌑', duree: 25, bonus: 1.3 },
  tempete:  { nom: 'TEMPÊTE ÉLÉMENTAIRE', icon: '🌪', duree: 25, bonus: 1.3 },
  ruee:     { nom: 'RUÉE AUX ORBES',    icon: '✨', duree: 20, orbes: 18 },
};

// ---------------------------------------------------------------------
//  ESQUIVE (Espace) et PROGRESSION (niveaux + améliorations au choix)
// ---------------------------------------------------------------------
export const ESQUIVE = { distance: 230, duree: 0.2, invuln: 0.32, cd: 2.5 };
export const PROGRESSION = { xpKill: 60, xpZombie: 14, xpOrbe: 4, xpDegat: 0.3, base: 40, parNiveau: 25, max: 12 };
export const UPGRADES = {
  puissance: { nom: 'Puissance',     desc: '+12 % de dégâts',            icon: '🔥' },
  vivacite:  { nom: 'Vivacité',      desc: '-12 % de temps de recharge', icon: '⏱' },
  vitalite:  { nom: 'Vitalité',      desc: '+20 PV max (et soigne 20)',  icon: '❤' },
  vitesse:   { nom: 'Pas de vent',   desc: '+8 % de vitesse',            icon: '💨' },
  vampire:   { nom: 'Vampirisme',    desc: 'Vole 6 % des dégâts infligés', icon: '🩸' },
  ultime:    { nom: 'Âme ardente',   desc: '+15 % de charge d’ultime',   icon: '★' },
  peau:      { nom: 'Peau de pierre', desc: '-8 % de dégâts subis',      icon: '🛡' },
  critique:  { nom: 'Œil du tueur',  desc: '+10 % de coups critiques (x1,6)', icon: '🎯' },
};
export const newMods = () => ({ dmg: 1, cd: 1, speed: 1, vamp: 0, ult: 1, def: 1, crit: 0 });
export function applyUpgrade(mods, key) {
  if (key === 'puissance') mods.dmg *= 1.12;
  else if (key === 'vivacite') mods.cd *= 0.88;
  else if (key === 'vitesse') mods.speed *= 1.08;
  else if (key === 'vampire') mods.vamp += 0.06;
  else if (key === 'ultime') mods.ult *= 1.15;
  else if (key === 'peau') mods.def *= 0.92;
  else if (key === 'critique') mods.crit += 0.1;
}

// ---------------------------------------------------------------------
//  ZOMBIES (PvPvE) — en tuer charge l'ultime et peut lâcher un orbe
// ---------------------------------------------------------------------
export const ZOMBIES = {
  rodeur:  { nom: 'Rôdeur',  hp: 45,  speed: 85,  dmg: 8,  r: 18, color: 0x6b8f4e, poids: 6 },
  coureur: { nom: 'Coureur', hp: 24,  speed: 185, dmg: 5,  r: 14, color: 0xa3b84a, poids: 3 },
  colosse: { nom: 'Colosse', hp: 240, speed: 55,  dmg: 22, r: 32, color: 0x4a5e3a, poids: 1 },
  titan:   { nom: 'Titan de la horde', hp: 1400, speed: 64, dmg: 26, r: 46, color: 0x8a2a2a, poids: 0, boss: true },
  // --- monstres de la Survie (poids 0 : n'apparaissent pas dans le monde ouvert) ---
  cracheur: { nom: 'Cracheur', hp: 34,  speed: 80,  dmg: 8,  r: 17, color: 0x9ad13a, poids: 0, distance: 330, crachat: { cd: 3.2, r: 58, delai: 1.15, portee: 520 } },
  kamikaze: { nom: 'Kamikaze', hp: 20,  speed: 175, dmg: 32, r: 14, color: 0xff5a2a, poids: 0, boum: { r: 105, meche: 0.55 } },
  chaman:   { nom: 'Chaman',   hp: 55,  speed: 72,  dmg: 6,  r: 18, color: 0xb06aff, poids: 0, distance: 380, soin: { cd: 3.5, r: 230, part: 0.25 } },
  porteur:  { nom: 'Porte-bouclier', hp: 130, speed: 62, dmg: 12, r: 26, color: 0x6a8ab0, poids: 0, aura: { r: 170, reduc: 0.5 } },
  esprit:   { nom: 'Esprit élémentaire', hp: 28, speed: 125, dmg: 7, r: 15, color: 0xffffff, poids: 0, esprit: true },
  // --- boss de la Survie : un différent à chaque palier de 5 vagues ---
  liche:    { nom: 'Liche des abysses', hp: 1100, speed: 52, dmg: 18, r: 34, color: 0x5a2a8a, poids: 0, boss: true, distance: 420 },
  behemoth: { nom: 'Béhémoth', hp: 1900, speed: 70, dmg: 30, r: 44, color: 0x8a4a2a, poids: 0, boss: true },
};
// Pouvoirs des monstres d'élite (Survie) : plus gros, plus forts, et un pouvoir au hasard
export const ELITES = {
  1: { nom: 'Rapide',     desc: 'se déplace bien plus vite' },
  2: { nom: 'Explosif',   desc: 'explose à sa mort' },
  3: { nom: 'Vampire',    desc: 'se soigne en frappant' },
  4: { nom: 'Invocateur', desc: 'appelle des renforts' },
  5: { nom: 'Blindé',     desc: 'subit 40 % de dégâts en moins' },
};
// Reliques (Survie) : après chaque boss, un bonus puissant au choix parmi 3
export const RELIQUES = {
  R_phenix:   { nom: 'Cœur de phénix',   desc: 'Une fois : revient à la vie avec 50 % des PV', icon: '🔥' },
  R_sablier:  { nom: 'Sablier brisé',    desc: 'Ultime chargé 2× plus vite',                   icon: '⌛' },
  R_croc:     { nom: 'Croc de vampire',  desc: 'Vole 10 % des dégâts infligés',                icon: '🩸' },
  R_epines:   { nom: 'Couronne d’épines', desc: 'Renvoie 50 % des coups reçus au corps à corps', icon: '🌵' },
  R_moisson:  { nom: 'Moisson',          desc: 'Chaque monstre tué rend 4 PV',                 icon: '🌾' },
  R_tempo:    { nom: 'Tempo divin',      desc: '-25 % de temps de recharge',                    icon: '⏱' },
  R_egide:    { nom: 'Égide',            desc: '+50 PV max',                                    icon: '🛡' },
  R_furie:    { nom: 'Furie',            desc: '+35 % de dégâts sous 50 % de PV',              icon: '😡' },
  R_eclats:   { nom: 'Éclats',           desc: 'Les monstres tués explosent (petits dégâts autour)', icon: '💥' },
};
export const ZOMBIE_CONFIG = {
  base: 24,           // zombies présents en permanence
  max: 60,
  hordeEvery: 75,     // secondes entre deux hordes
  hordeSize: 18,
  aggro: 650,         // distance de détection
  attackCd: 1.0,
  ultReward: 2,
  orbChance: 0.3,
  // Boss : un Titan accompagne une horde sur trois
  bossEvery: 3,
  boss: { slamCd: 5, slamR: 230, slamDmg: 34, slamDelay: 1.1, summonCd: 12, summonN: 3, xp: 220, orbs: 6, ult: 30 },
};

// ---------------------------------------------------------------------
//  CARTE — bâtiments générés de façon déterministe (même carte serveur/client)
// ---------------------------------------------------------------------
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (a, b, pad) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

export function generateMap(seed = 1337) {
  const rng = mulberry32(seed);
  const buildings = [];

  // Ville : quadrillage de pâtés de maisons, place centrale vide
  const cols = 5, rows = 4, street = 90;
  const cw = (CITY.w - street * (cols - 1)) / cols, ch = (CITY.h - street * (rows - 1)) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if ((i === 2) && (j === 1 || j === 2)) continue; // place centrale
      const cx = CITY.x + i * (cw + street), cy = CITY.y + j * (ch + street);
      const ruine = rng() < 0.3;
      const w = cw * (0.6 + rng() * 0.4), h = ch * (0.6 + rng() * 0.4);
      buildings.push({
        x: Math.round(cx + (cw - w) * rng()), y: Math.round(cy + (ch - h) * rng()),
        w: Math.round(w), h: Math.round(h),
        type: ruine ? 'ruine' : (rng() < 0.25 ? 'tour' : 'maison'),
      });
    }
  }

  // Structures thématiques dans chaque biome + ruines éparses
  const theme = { volcan: 'forge', lac: 'cabane', montagne: 'mine', plateau: 'moulin', pics: 'igloo', fonderie: 'usine', marais: 'crypte', orage: 'pylone', sanctuaire: 'temple', foret: 'hutte' };
  for (const b of BIOMES) {
    let placed = 0, tries = 0;
    while (placed < Math.round((b.w * b.h) / 300000) && tries++ < 500) {
      const w = 110 + rng() * 120, h = 90 + rng() * 110;
      const r = { x: Math.round(b.x + 120 + rng() * (b.w - 240 - w)), y: Math.round(b.y + 120 + rng() * (b.h - 240 - h)), w: Math.round(w), h: Math.round(h), type: theme[b.id] };
      if (buildings.some((o) => overlaps(o, r, 140))) continue;
      buildings.push(r); placed++;
    }
  }
  let tries = 0, extra = 0;
  while (extra < 26 && tries++ < 800) {
    const w = 80 + rng() * 120, h = 70 + rng() * 100;
    const r = { x: Math.round(150 + rng() * (ARENA.width - 300 - w)), y: Math.round(150 + rng() * (ARENA.height - 300 - h)), w: Math.round(w), h: Math.round(h), type: 'ruine' };
    if (buildings.some((o) => overlaps(o, r, 160))) continue;
    if (overlaps(r, CITY, 60)) continue;
    buildings.push(r); extra++;
  }
  return buildings;
}

export const BUILDINGS = generateMap();

// ---------------------------------------------------------------------
//  TERRAINS ÉLÉMENTAIRES : flaques de lave, eau, glace, herbes hautes
//  lave  : brûle (sauf Feu, qui y court plus vite)
//  eau   : ralentit (sauf Eau) ; un sort d'Éclair qui touche quelqu'un dans l'eau électrocute toute la flaque
//  glace : on glisse (sauf Glace)
//  herbes: on y devient invisible tant qu'on n'attaque pas
// ---------------------------------------------------------------------
export const TERRAIN_TYPES = {
  lave:   { nom: 'Lave',          color: 0xff5a1f, dps: 6 },
  eau:    { nom: 'Eau profonde',  color: 0x2f8cff, lent: 0.75 },
  glace:  { nom: 'Glace',         color: 0xbfefff, glisse: 0.12 },
  herbes: { nom: 'Herbes hautes', color: 0x3f8f3a },
};
function generateTerrains(seed = 77) {
  const rng = mulberry32(seed), out = [];
  const plan = [['volcan', 'lave', 4, 80, 130], ['lac', 'eau', 3, 110, 170], ['marais', 'eau', 3, 90, 130], ['pics', 'glace', 4, 100, 150],
    ['plateau', 'herbes', 4, 100, 150], ['montagne', 'herbes', 2, 90, 130], ['orage', 'eau', 2, 80, 120], ['fonderie', 'lave', 2, 70, 110],
    ['foret', 'herbes', 6, 90, 150], ['foret', 'eau', 1, 90, 120]];
  for (const [bid, type, n, r0, r1] of plan) {
    const b = BIOMES.find((x) => x.id === bid);
    let placed = 0, tries = 0;
    while (placed < n && tries++ < 400) {
      const r = Math.round(r0 + rng() * (r1 - r0));
      const x = Math.round(b.x + r + 60 + rng() * (b.w - 2 * r - 120)), y = Math.round(b.y + r + 60 + rng() * (b.h - 2 * r - 120));
      const box = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
      if (BUILDINGS.some((o) => overlaps(o, box, 30)) || out.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 60)) continue;
      out.push({ type, x, y, r }); placed++;
    }
  }
  // quelques touffes d'herbes hautes dans la prairie entre les biomes
  let extra = 0, tries = 0;
  while (extra < 6 && tries++ < 600) {
    const r = Math.round(80 + rng() * 60), x = Math.round(200 + rng() * (ARENA.width - 400)), y = Math.round(200 + rng() * (ARENA.height - 400));
    const box = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
    if (BIOMES.some((b) => overlaps(b, box, 0)) || overlaps(CITY, box, 40) || BUILDINGS.some((o) => overlaps(o, box, 30)) || out.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 60)) continue;
    out.push({ type: 'herbes', x, y, r }); extra++;
  }
  return out;
}
export const TERRAINS = generateTerrains();
export function terrainAt(x, y, ters = TERRAINS) {
  for (let i = 0; i < ters.length; i++) { const t = ters[i]; const dx = x - t.x, dy = y - t.y; if (dx * dx + dy * dy < t.r * t.r) return i; }
  return -1;
}
// Multiplicateur de vitesse du terrain (utilisé aussi par la prédiction du client)
export function terrainSpeed(idx, a, b) {
  if (idx < 0) return 1;
  const T = TERRAINS[idx].type, has = (el) => a === el || b === el;
  if (T === 'lave') return has('feu') ? 1.15 : 1;
  if (T === 'eau') return has('eau') ? 1.15 : TERRAIN_TYPES.eau.lent;
  return 1;
}

export function circleHitsRect(x, y, r, b) {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
}

// Repousse un cercle hors des bâtiments (glisse le long des murs)
export function resolveCollisions(pos, r, blds = BUILDINGS) {
  for (const b of blds) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w)), cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - cx, dy = pos.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2), push = r - d;
      pos.x += (dx / d) * push; pos.y += (dy / d) * push;
    } else {
      // centre à l'intérieur : sortie par le côté le plus proche
      const left = pos.x - b.x, right = b.x + b.w - pos.x, top = pos.y - b.y, bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - r; else if (m === right) pos.x = b.x + b.w + r;
      else if (m === top) pos.y = b.y - r; else pos.y = b.y + b.h + r;
    }
  }
  return pos;
}

export const insideBuilding = (x, y, r = 0, blds = BUILDINGS) => blds.some((b) => circleHitsRect(x, y, r, b));
// Obstacles et terrains de la carte selon le mode (le tournoi a sa propre carte : le Colisée)
export const carteDu = (mode) => (mode === 'tournoi' || mode === 'duo' ? { blds: COLISEE.piliers, ters: [] } : mode === 'survie' ? { blds: SURVIE.piliers, ters: [] } : { blds: BUILDINGS, ters: TERRAINS });

// ---------------------------------------------------------------------
//  TAGS — effets appliqués à l'impact
// ---------------------------------------------------------------------
export const TAGS = {
  brulure: { nom: 'Brûlure', duree: 3,   dps: 4 },
  mouille: { nom: 'Mouillé', duree: 4 },
  lourd:   { nom: 'Ralenti', duree: 1.5, slow: 0.45 },
  poussee: { nom: 'Poussée', force: 520 },
  chaine:  { nom: 'Chaîne',  rebonds: 2, portee: 210, ratio: 0.5 },
  gel:     { nom: 'Givre',   duree: 2, slow: 0.35 },
  marque:  { nom: 'Marqué',  duree: 4, bonus: 1.2 },
  perce:   { nom: 'Perforant' },           // ignore bouclier et armure
  aveugle: { nom: 'Aveuglé', duree: 1.8, malus: 0.15 },   // inflige 15 % de dégâts en moins
  racine:  { nom: 'Enlacé',  duree: 2, slow: 0.15 },     // ralenti ; une 2e racine immobilise
  poussee_l: { nom: 'Poussée', force: 170 },   // poussée légère (coups au corps à corps)
  etourdi: { nom: 'Étourdi', duree: 0.8, immunite: 2 },   // ni déplacement, ni sort ; puis 2 s d'immunité
};

// Interactions entre un tag entrant et un statut déjà présent sur la cible
export const INTERACTIONS = [
  { entrant: 'brulure', statut: 'mouille', nom: 'Vaporisation !', dmgMult: 1.5, retire: ['mouille'], bloque: 'brulure' },
  { entrant: 'poussee', statut: 'brulure', nom: 'Attisé !',       dmgMult: 1.2, renforce: 'brulure' },
  { entrant: 'lourd',   statut: 'mouille', nom: 'Embourbé !',     dmgMult: 1.0, root: 1.2 },
  { entrant: 'mouille', statut: 'brulure', nom: 'Éteint',         dmgMult: 1.0, retire: ['brulure'] },
  { entrant: 'chaine',  statut: 'mouille', nom: 'Électrocuté !',  dmgMult: 1.4, root: 0.6, retire: ['mouille'] },
  { entrant: 'gel',     statut: 'mouille', nom: 'Gelé !',         dmgMult: 1.0, root: 1.5, retire: ['mouille'] },
  { entrant: 'brulure', statut: 'gel',     nom: 'Dégel',          dmgMult: 1.3, retire: ['gel'] },
  { entrant: 'perce',   statut: 'gel',     nom: 'Brisé !',        dmgMult: 1.7, retire: ['gel'] },
  { entrant: 'marque',  statut: 'brulure', nom: 'Flamme noire !', dmgMult: 1.15, renforce: 'brulure' },
  { entrant: 'chaine',  statut: 'marque',  nom: 'Foudre maudite !', dmgMult: 1.4 },
  { entrant: 'racine',  statut: 'racine',  nom: 'Enraciné !',     dmgMult: 1.0, root: 0.5, retire: ['racine'], bloque: 'racine' },
  { entrant: 'brulure', statut: 'racine',  nom: 'Incendie !',     dmgMult: 1.4, retire: ['racine'], renforce: 'brulure' },
  { entrant: 'mouille', statut: 'racine',  nom: 'Croissance !',   dmgMult: 1.0, root: 1.2 },
  { entrant: 'aveugle', statut: 'marque',  nom: 'Purification !', dmgMult: 1.5, retire: ['marque'] },
  { entrant: 'marque',  statut: 'aveugle', nom: 'Éclipse !',      dmgMult: 1.3 },
  { entrant: 'aveugle', statut: 'gel',     nom: 'Prisme !',       dmgMult: 1.3, retire: ['gel'] },
  { entrant: 'etourdi', statut: 'gel',     nom: 'Fracas !',       dmgMult: 1.3, retire: ['gel'] },
  { entrant: 'chaine',  statut: 'stun',    nom: 'Surtension !',   dmgMult: 1.25 },
];

// ---------------------------------------------------------------------
//  ÉLÉMENTS
//  basique   : attaque de base (clic gauche)
//  offensif  : base du Sort 1 quand l'élément est en 1re position
//  utilitaire: base du Sort 2 quand l'élément est en 2e position
//  mod       : modificateur appliqué au Sort 1 quand l'élément est en 2e position
// ---------------------------------------------------------------------
export const ELEMENTS = {
  feu: {
    nom: 'Feu', color: 0xff5a1f, css: '#ff5a1f', tag: 'brulure',
    basique:    { nom: 'Flammèche', forme: 'projectile', dmg: 8, speed: 620, radius: 9, range: 520, cd: 0.42 },
    offensif:   { nom: 'Boule de feu', forme: 'projectile', dmg: 20, speed: 520, radius: 17, range: 650, cd: 3, explode: 70 },
    utilitaire: { nom: 'Bond ardent', forme: 'dash', distance: 250, cd: 6 },
    mod: { dmg: 1.2 },
  },
  eau: {
    nom: 'Eau', color: 0x2f8cff, css: '#2f8cff', tag: 'mouille',
    basique:    { nom: 'Goutte', forme: 'projectile', dmg: 7, speed: 580, radius: 10, range: 500, cd: 0.4 },
    offensif:   { nom: 'Éventail aquatique', forme: 'eventail', count: 5, spread: 0.7, dmg: 9, speed: 540, radius: 11, range: 480, cd: 3.5 },
    utilitaire: { nom: 'Source', forme: 'soin', heal: 20, cd: 10 },
    mod: { radius: 1.3 },
  },
  terre: {
    nom: 'Terre', color: 0xc08a45, css: '#c08a45', tag: 'lourd',
    basique:    { nom: 'Caillou', forme: 'projectile', dmg: 11, speed: 460, radius: 12, range: 480, cd: 0.55 },
    offensif:   { nom: 'Chute de roc', forme: 'impact', dmg: 26, radius: 85, delay: 0.6, range: 600, cd: 4 },
    utilitaire: { nom: 'Rempart', forme: 'bouclier', shield: 40, duree: 4, cd: 10 },
    mod: { dmg: 1.15, speed: 0.85 },
  },
  vent: {
    nom: 'Vent', color: 0x7fe0c2, css: '#7fe0c2', tag: 'poussee',
    basique:    { nom: 'Souffle', forme: 'projectile', dmg: 6, speed: 820, radius: 8, range: 560, cd: 0.3 },
    offensif:   { nom: 'Lame de vent', forme: 'projectile', dmg: 15, speed: 900, radius: 13, range: 720, cd: 2.5, pierce: true },
    utilitaire: { nom: 'Rafale', forme: 'dash', distance: 380, cd: 5 },
    mod: { speed: 1.25, cd: 0.85 },
  },
  eclair: {
    nom: 'Éclair', color: 0xffe14a, css: '#ffe14a', tag: 'chaine',
    basique:    { nom: 'Étincelle', forme: 'projectile', dmg: 7, speed: 950, radius: 8, range: 560, cd: 0.38 },
    offensif:   { nom: 'Arc électrique', forme: 'projectile', dmg: 16, speed: 1100, radius: 12, range: 650, cd: 3 },
    utilitaire: { nom: 'Surcharge', forme: 'hate', bonus: 0.4, duree: 3, cd: 8 },
    mod: { cd: 0.8 },
  },
  glace: {
    nom: 'Glace', color: 0x9be7ff, css: '#9be7ff', tag: 'gel',
    basique:    { nom: 'Éclat de givre', forme: 'projectile', dmg: 8, speed: 600, radius: 10, range: 520, cd: 0.45 },
    offensif:   { nom: 'Pics de glace', forme: 'eventail', count: 3, spread: 0.35, dmg: 13, speed: 700, radius: 12, range: 600, cd: 3.2 },
    utilitaire: { nom: 'Carapace de givre', forme: 'bouclier', shield: 35, duree: 4, cd: 9 },
    mod: { radius: 1.15, dmg: 1.05 },
  },
  ombre: {
    nom: 'Ombre', color: 0x8a5cff, css: '#8a5cff', tag: 'marque',
    basique:    { nom: 'Dague sombre', forme: 'projectile', dmg: 8, speed: 700, radius: 9, range: 520, cd: 0.42 },
    offensif:   { nom: "Frappe de l'ombre", forme: 'impact', dmg: 22, radius: 70, delay: 0.35, range: 550, cd: 3.5 },
    utilitaire: { nom: "Pas de l'ombre", forme: 'blink', distance: 340, invis: 2.5, cd: 7 },
    mod: { dmg: 1.1 },
  },
  metal: {
    nom: 'Métal', color: 0xb8c2cc, css: '#b8c2cc', tag: 'perce',
    basique:    { nom: 'Rivet', forme: 'projectile', dmg: 10, speed: 700, radius: 9, range: 540, cd: 0.55 },
    offensif:   { nom: "Lance d'acier", forme: 'projectile', dmg: 24, speed: 800, radius: 14, range: 750, cd: 3.5, pierce: true },
    utilitaire: { nom: "Peau d'acier", forme: 'armure', reduction: 0.5, duree: 3, cd: 10 },
    mod: { dmg: 1.15, speed: 0.9 },
  },
  lumiere: {
    nom: 'Lumière', color: 0xfff1b0, css: '#fff1b0', tag: 'aveugle',
    basique:    { nom: 'Rayon lumineux', forme: 'projectile', dmg: 7, speed: 1000, radius: 8, range: 580, cd: 0.4 },
    offensif:   { nom: 'Lance sacrée', forme: 'projectile', dmg: 18, speed: 950, radius: 13, range: 700, cd: 3.2, pierce: true },
    utilitaire: { nom: 'Bénédiction', forme: 'bouclier', shield: 40, duree: 3, cd: 10 },
    mod: { cd: 0.9, radius: 1.1 },
  },
  nature: {
    nom: 'Nature', color: 0x5fcf4a, css: '#5fcf4a', tag: 'racine',
    basique:    { nom: 'Épine', forme: 'projectile', dmg: 8, speed: 640, radius: 9, range: 520, cd: 0.45 },
    offensif:   { nom: 'Ronces', forme: 'impact', dmg: 20, radius: 95, delay: 0.5, range: 600, cd: 3.8 },
    utilitaire: { nom: 'Écorce', forme: 'armure', reduction: 0.4, duree: 3.5, cd: 9 },
    mod: { radius: 1.2, dmg: 1.05 },
  },
};

// ---------------------------------------------------------------------
//  FUSIONS — clé = éléments triés par ordre alphabétique, joints par "+"
//  formes d'ultime : pluie | tornade | nova | zone
// ---------------------------------------------------------------------
export const FUSIONS = {
  'eau+feu': {
    nom: 'Vapeur', color: 0xdfe8f0, css: '#dfe8f0',
    desc: 'Brouillard brûlant qui alterne mouillé et brûlure.',
    ultime: { nom: 'Champ de geysers', forme: 'pluie', centre: 'lanceur', count: 9, spread: 300, radius: 90, dmg: 28, delay: 0.7, stagger: 0.12, tags: ['mouille', 'brulure'] },
  },
  'feu+terre': {
    nom: 'Magma', color: 0xff8a2a, css: '#ff8a2a',
    desc: 'Lave lourde : ralentit puis consume.',
    ultime: { nom: 'Éruption', forme: 'pluie', centre: 'cible', range: 650, count: 11, spread: 230, radius: 80, dmg: 30, delay: 0.8, stagger: 0.1, tags: ['brulure', 'lourd'] },
  },
  'feu+vent': {
    nom: 'Tempête de flammes', color: 0xffb347, css: '#ffb347',
    desc: 'Le vent attise chaque flamme.',
    ultime: { nom: 'Tornade de feu', forme: 'tornade', radius: 115, speed: 280, duree: 4, tick: 0.25, dmg: 7, tags: ['brulure', 'poussee'] },
  },
  'eau+terre': {
    nom: 'Boue', color: 0x8a6a3a, css: '#8a6a3a',
    desc: 'Englue tout ce qui bouge.',
    ultime: { nom: 'Marécage', forme: 'zone', centre: 'cible', range: 600, radius: 230, duree: 5, tick: 0.5, dmg: 6, tags: ['mouille', 'lourd'] },
  },
  'eau+vent': {
    nom: 'Ouragan', color: 0x9fd4ff, css: '#9fd4ff',
    desc: 'Contrôle de foule par excellence.',
    ultime: { nom: 'Typhon', forme: 'tornade', radius: 140, speed: 220, duree: 4.5, tick: 0.3, dmg: 6, tags: ['mouille', 'poussee'] },
  },
  'terre+vent': {
    nom: 'Sable', color: 0xe2c37a, css: '#e2c37a',
    desc: 'Repousse et alourdit.',
    ultime: { nom: 'Tempête de sable', forme: 'nova', radius: 320, dmg: 38, tags: ['poussee', 'lourd'] },
  },
  // ---- Formes Pures (rares) ----
  'feu+feu': {
    nom: 'Feu Pur', pure: true, color: 0xff2a00, css: '#ff2a00',
    desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Supernova', forme: 'nova', radius: 400, dmg: 65, tags: ['brulure'] },
  },
  'eau+eau': {
    nom: 'Eau Pure', pure: true, color: 0x0060ff, css: '#0060ff',
    desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Déluge', forme: 'zone', centre: 'lanceur', radius: 420, duree: 5, tick: 0.4, dmg: 7, tags: ['mouille'], soinLanceur: 4 },
  },
  'terre+terre': {
    nom: 'Terre Pure', pure: true, color: 0x9a5a20, css: '#9a5a20',
    desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Séisme', forme: 'pluie', centre: 'lanceur', count: 18, spread: 420, radius: 85, dmg: 30, delay: 0.6, stagger: 0.08, tags: ['lourd'] },
  },
  'vent+vent': {
    nom: 'Vent Pur', pure: true, color: 0x3fffd0, css: '#3fffd0',
    desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Œil du cyclone', forme: 'tornade', radius: 170, speed: 320, duree: 5, tick: 0.25, dmg: 8, tags: ['poussee'] },
  },

  // ---- Phase 1 : Éclair, Glace, Ombre, Métal ----
  'eclair+feu':   { nom: 'Plasma', color: 0xffa040, css: '#ffa040', desc: 'Brûle et rebondit de cible en cible.',
    ultime: { nom: 'Tempête de plasma', forme: 'pluie', centre: 'cible', range: 650, count: 10, spread: 240, radius: 85, dmg: 30, delay: 0.6, stagger: 0.08, tags: ['brulure', 'chaine'] } },
  'eau+eclair':   { nom: 'Orage', color: 0x6fb8ff, css: '#6fb8ff', desc: 'Mouille puis électrocute.',
    ultime: { nom: 'Déluge électrique', forme: 'zone', centre: 'cible', range: 600, radius: 220, duree: 3.5, tick: 0.45, dmg: 4, tags: ['mouille', 'chaine'] } },
  'eclair+terre': { nom: 'Magnétisme', color: 0xd9b84a, css: '#d9b84a', desc: 'Alourdit et électrise la foule.',
    ultime: { nom: 'Pulsion magnétique', forme: 'nova', radius: 330, dmg: 40, tags: ['lourd', 'chaine'] } },
  'eclair+vent':  { nom: 'Tempête', color: 0xd8f070, css: '#d8f070', desc: 'Vitesse et foudre.',
    ultime: { nom: 'Cyclone foudroyant', forme: 'tornade', radius: 130, speed: 300, duree: 4, tick: 0.25, dmg: 7, tags: ['poussee', 'chaine'] } },
  'eclair+glace': { nom: 'Cristal-foudre', color: 0xc8f4ff, css: '#c8f4ff', desc: 'Gèle et fait éclater.',
    ultime: { nom: 'Prisme', forme: 'pluie', centre: 'lanceur', count: 12, spread: 320, radius: 80, dmg: 28, delay: 0.6, stagger: 0.08, tags: ['gel', 'chaine'] } },
  'eclair+ombre': { nom: 'Foudre noire', color: 0xb08aff, css: '#b08aff', desc: 'Marque puis foudroie.',
    ultime: { nom: 'Jugement noir', forme: 'pluie', centre: 'cible', range: 650, count: 8, spread: 200, radius: 95, dmg: 34, delay: 0.7, stagger: 0.1, tags: ['marque', 'chaine'] } },
  'eclair+metal': { nom: 'Railgun', color: 0xe0e8f0, css: '#e0e8f0', desc: 'Perce les armures à la vitesse de la foudre.',
    ultime: { nom: 'Canon électromagnétique', forme: 'tornade', radius: 70, speed: 950, duree: 1.3, tick: 0.08, dmg: 12, tags: ['perce', 'chaine'] } },
  'feu+glace':    { nom: 'Choc thermique', color: 0xff9ad0, css: '#ff9ad0', desc: 'Chaud, froid, cassé.',
    ultime: { nom: 'Aurore brisée', forme: 'nova', radius: 340, dmg: 42, tags: ['brulure', 'gel'] } },
  'eau+glace':    { nom: 'Blizzard', color: 0xbfe8ff, css: '#bfe8ff', desc: 'Fige le champ de bataille.',
    ultime: { nom: 'Blizzard', forme: 'zone', centre: 'lanceur', radius: 360, duree: 5, tick: 0.4, dmg: 6, tags: ['gel', 'mouille'] } },
  'glace+terre':  { nom: 'Permafrost', color: 0x8fb0c0, css: '#8fb0c0', desc: 'Lent, lourd, implacable.',
    ultime: { nom: 'Glacier', forme: 'pluie', centre: 'cible', range: 600, count: 10, spread: 250, radius: 90, dmg: 30, delay: 0.8, stagger: 0.1, tags: ['gel', 'lourd'] } },
  'glace+vent':   { nom: 'Tempête de neige', color: 0xe8f8ff, css: '#e8f8ff', desc: 'Repousse et engourdit.',
    ultime: { nom: 'Avalanche', forme: 'tornade', radius: 150, speed: 240, duree: 4.5, tick: 0.25, dmg: 9, tags: ['gel', 'poussee'] } },
  'glace+ombre':  { nom: 'Givre spectral', color: 0x9aa8ff, css: '#9aa8ff', desc: 'Le froid des morts.',
    ultime: { nom: 'Hiver éternel', forme: 'zone', centre: 'cible', range: 600, radius: 250, duree: 5, tick: 0.5, dmg: 7, tags: ['gel', 'marque'] } },
  'glace+metal':  { nom: 'Acier trempé', color: 0xa8d8e8, css: '#a8d8e8', desc: 'Gèle puis brise.',
    ultime: { nom: 'Lames gelées', forme: 'pluie', centre: 'cible', range: 650, count: 14, spread: 260, radius: 70, dmg: 26, delay: 0.6, stagger: 0.07, tags: ['gel', 'perce'] } },
  'feu+ombre':    { nom: 'Flamme noire', color: 0xc04aff, css: '#c04aff', desc: 'Un feu qui ne s’éteint pas.',
    ultime: { nom: 'Enfer', forme: 'zone', centre: 'cible', range: 600, radius: 210, duree: 3.5, tick: 0.45, dmg: 5, tags: ['brulure', 'marque'] } },
  'eau+ombre':    { nom: 'Abysses', color: 0x3a4aa0, css: '#5a6ad0', desc: 'Les profondeurs t’engloutissent.',
    ultime: { nom: 'Gouffre', forme: 'zone', centre: 'cible', range: 600, radius: 220, duree: 4, tick: 0.3, dmg: 5, tags: ['mouille', 'marque'] } },
  'ombre+terre':  { nom: 'Tombe', color: 0x6a5a7a, css: '#8a7a9a', desc: 'Enterre tes ennemis.',
    ultime: { nom: 'Cimetière', forme: 'pluie', centre: 'lanceur', count: 12, spread: 350, radius: 85, dmg: 30, delay: 0.7, stagger: 0.08, tags: ['marque', 'lourd'] } },
  'ombre+vent':   { nom: 'Spectre', color: 0xb0a0ff, css: '#b0a0ff', desc: 'Insaisissable.',
    ultime: { nom: 'Danse des spectres', forme: 'tornade', radius: 130, speed: 320, duree: 4, tick: 0.2, dmg: 9, tags: ['marque', 'poussee'] } },
  'metal+ombre':  { nom: 'Faucheur', color: 0x7a7a9a, css: '#a0a0c0', desc: 'Assassin perce-armure.',
    ultime: { nom: 'Moisson', forme: 'nova', radius: 300, dmg: 45, tags: ['marque', 'perce'] } },
  'feu+metal':    { nom: 'Forge', color: 0xff7a3a, css: '#ff7a3a', desc: 'Acier chauffé à blanc.',
    ultime: { nom: 'Pluie d’épées', forme: 'pluie', centre: 'cible', range: 650, count: 12, spread: 230, radius: 75, dmg: 30, delay: 0.7, stagger: 0.08, tags: ['brulure', 'perce'] } },
  'eau+metal':    { nom: 'Mercure', color: 0xc0d0e0, css: '#c0d0e0', desc: 'Métal liquide.',
    ultime: { nom: 'Marée de mercure', forme: 'zone', centre: 'cible', range: 600, radius: 230, duree: 4.5, tick: 0.4, dmg: 6, tags: ['mouille', 'perce'] } },
  'metal+terre':  { nom: 'Titane', color: 0x9a9080, css: '#b0a898', desc: 'Inarrêtable.',
    ultime: { nom: 'Séisme d’acier', forme: 'nova', radius: 320, dmg: 42, tags: ['lourd', 'perce'] } },
  'metal+vent':   { nom: 'Lames tournoyantes', color: 0xc8e0d8, css: '#c8e0d8', desc: 'Un hachoir dans le vent.',
    ultime: { nom: 'Tourbillon d’acier', forme: 'tornade', radius: 140, speed: 250, duree: 4, tick: 0.2, dmg: 9, tags: ['perce', 'poussee'] } },
  'eclair+eclair': { nom: 'Éclair Pur', pure: true, color: 0xfff27a, css: '#fff27a', desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Colère du ciel', forme: 'pluie', centre: 'lanceur', count: 20, spread: 420, radius: 85, dmg: 32, delay: 0.5, stagger: 0.06, tags: ['chaine'] } },
  'glace+glace':   { nom: 'Glace Pure', pure: true, color: 0xd8f6ff, css: '#d8f6ff', desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Zéro absolu', forme: 'nova', radius: 420, dmg: 55, tags: ['gel'] } },
  'ombre+ombre':   { nom: 'Ombre Pure', pure: true, color: 0x6a2aff, css: '#8a4aff', desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Éclipse', forme: 'zone', centre: 'lanceur', radius: 420, duree: 5, tick: 0.4, dmg: 8, tags: ['marque'], soinLanceur: 3 } },
  'metal+metal':   { nom: 'Métal Pur', pure: true, color: 0xe8eef4, css: '#e8eef4', desc: 'Forme Pure — rarissime.',
    ultime: { nom: 'Forteresse', forme: 'nova', radius: 380, dmg: 60, tags: ['perce'] } },
  'eau+lumiere': {
    nom: 'Arc-en-ciel', color: 0xbfe6ff, css: '#bfe6ff',
    desc: 'Prismes d’eau qui aveuglent et mouillent.',
    ultime: { nom: 'Arc-en-ciel sacré', forme: 'zone', centre: 'lanceur', radius: 380, duree: 4, tick: 0.5, dmg: 6, tags: ['mouille', 'aveugle'], soinLanceur: 5 },
  },
  'feu+lumiere': {
    nom: 'Aube', color: 0xffc24a, css: '#ffc24a',
    desc: 'Le soleil levant : brûle et aveugle.',
    ultime: { nom: 'Lame de l’aube', forme: 'nova', radius: 360, dmg: 60, tags: ['brulure', 'aveugle'] },
  },
  'lumiere+terre': {
    nom: 'Paladin', color: 0xe8d29a, css: '#e8d29a',
    desc: 'Gardien sacré, solide et béni.',
    ultime: { nom: 'Jugement du paladin', forme: 'nova', radius: 300, dmg: 55, tags: ['lourd', 'aveugle'] },
  },
  'lumiere+vent': {
    nom: 'Séraphin', color: 0xf2fff4, css: '#f2fff4',
    desc: 'Ailes de lumière et vents célestes.',
    ultime: { nom: 'Chœur céleste', forme: 'tornade', radius: 130, speed: 260, duree: 4, tick: 0.25, dmg: 7, tags: ['poussee', 'aveugle'] },
  },
  'eclair+lumiere': {
    nom: 'Archange', color: 0xfff7a0, css: '#fff7a0',
    desc: 'Flèches de foudre sacrée.',
    ultime: { nom: 'Pluie de flèches divines', forme: 'pluie', centre: 'cible', range: 650, count: 12, spread: 240, radius: 70, dmg: 26, delay: 0.6, stagger: 0.07, tags: ['chaine', 'aveugle'] },
  },
  'glace+lumiere': {
    nom: 'Aurore', color: 0xd4f4ff, css: '#d4f4ff',
    desc: 'Lueurs boréales qui gèlent et éblouissent.',
    ultime: { nom: 'Aurore boréale', forme: 'zone', centre: 'cible', range: 600, radius: 260, duree: 4.5, tick: 0.45, dmg: 7, tags: ['gel', 'aveugle'] },
  },
  'lumiere+ombre': {
    nom: 'Crépuscule', color: 0xc8b8e8, css: '#c8b8e8',
    desc: 'L’équilibre entre jour et nuit.',
    ultime: { nom: 'Équilibre', forme: 'nova', radius: 340, dmg: 58, tags: ['marque', 'aveugle'] },
  },
  'lumiere+metal': {
    nom: 'Croisé', color: 0xf0e2b0, css: '#f0e2b0',
    desc: 'Chevalier d’acier béni.',
    ultime: { nom: 'Épées de lumière', forme: 'pluie', centre: 'cible', range: 600, count: 10, spread: 220, radius: 75, dmg: 28, delay: 0.7, stagger: 0.08, tags: ['perce', 'aveugle'] },
  },
  'lumiere+nature': {
    nom: 'Floraison', color: 0xffd0e8, css: '#ffd0e8',
    desc: 'Fleurs solaires qui soignent et enlacent.',
    ultime: { nom: 'Jardin sacré', forme: 'zone', centre: 'lanceur', radius: 400, duree: 5, tick: 0.5, dmg: 5, tags: ['racine', 'aveugle'], soinLanceur: 6 },
  },
  'lumiere+lumiere': {
    nom: 'Lumière Pure', color: 0xfffbe0, css: '#fffbe0',
    desc: 'La lumière à l’état pur.',
    ultime: { nom: 'Jugement dernier', forme: 'nova', radius: 420, dmg: 62, tags: ['aveugle'] },
  },
  'eau+nature': {
    nom: 'Mangrove', color: 0x4fb8a0, css: '#4fb8a0',
    desc: 'Lianes gorgées d’eau.',
    ultime: { nom: 'Déluge végétal', forme: 'zone', centre: 'cible', range: 600, radius: 260, duree: 4.5, tick: 0.45, dmg: 6, tags: ['mouille', 'racine'] },
  },
  'feu+nature': {
    nom: 'Incendie', color: 0xff8a3a, css: '#ff8a3a',
    desc: 'La forêt en flammes.',
    ultime: { nom: 'Feu de forêt', forme: 'pluie', centre: 'cible', range: 650, count: 11, spread: 250, radius: 80, dmg: 26, delay: 0.7, stagger: 0.08, tags: ['brulure', 'racine'] },
  },
  'nature+terre': {
    nom: 'Gaïa', color: 0x8ab84a, css: '#8ab84a',
    desc: 'La force de la terre vivante.',
    ultime: { nom: 'Colère de Gaïa', forme: 'nova', radius: 330, dmg: 52, tags: ['lourd', 'racine'] },
  },
  'nature+vent': {
    nom: 'Sylphe', color: 0xa8f0a0, css: '#a8f0a0',
    desc: 'Tempête de feuilles tranchantes.',
    ultime: { nom: 'Tempête de feuilles', forme: 'tornade', radius: 130, speed: 280, duree: 4, tick: 0.25, dmg: 7, tags: ['poussee', 'racine'] },
  },
  'eclair+nature': {
    nom: 'Ronce-foudre', color: 0xc8e84a, css: '#c8e84a',
    desc: 'Ronces électrifiées.',
    ultime: { nom: 'Ronces foudroyantes', forme: 'zone', centre: 'cible', range: 600, radius: 250, duree: 4, tick: 0.4, dmg: 7, tags: ['chaine', 'racine'] },
  },
  'glace+nature': {
    nom: 'Taïga', color: 0xa8d8c8, css: '#a8d8c8',
    desc: 'Forêt boréale glacée.',
    ultime: { nom: 'Pluie d’aiguilles', forme: 'pluie', centre: 'cible', range: 650, count: 12, spread: 240, radius: 65, dmg: 24, delay: 0.6, stagger: 0.07, tags: ['gel', 'racine'] },
  },
  'nature+ombre': {
    nom: 'Sombrebois', color: 0x6a5a8a, css: '#6a5a8a',
    desc: 'Champignons maudits et spores.',
    ultime: { nom: 'Forêt maudite', forme: 'zone', centre: 'cible', range: 600, radius: 270, duree: 5, tick: 0.5, dmg: 6, tags: ['marque', 'racine'] },
  },
  'metal+nature': {
    nom: 'Ronce d’acier', color: 0x9ab89a, css: '#9ab89a',
    desc: 'Épines de métal vivantes.',
    ultime: { nom: 'Barbelés', forme: 'nova', radius: 320, dmg: 54, tags: ['perce', 'racine'] },
  },
  'nature+nature': {
    nom: 'Nature Pure', color: 0x5fcf4a, css: '#5fcf4a',
    desc: 'L’arbre-monde lui-même.',
    ultime: { nom: 'Colère de la forêt', forme: 'zone', centre: 'lanceur', radius: 420, duree: 5, tick: 0.45, dmg: 7, tags: ['racine'], soinLanceur: 5 },
  },
};

export const portraitUrl = (key) => `/portraits/${encodeURIComponent(key)}.webp`;
export const tokenUrl = (key) => `/tokens/${encodeURIComponent(key)}.webp`;

// Les fiches de champions remplacent certains ultimes par des versions spectaculaires
for (const [k, c] of Object.entries(CHAMPIONS)) {
  if (c.ultime && FUSIONS[k]) FUSIONS[k].ultime = { ...c.ultime, tags: c.ultime.tags || FUSIONS[k].ultime.tags };
}

// Statuts synchronisés en masque de bits (Player.st / Zombie.st)
export const STATUS_BITS = ['burn', 'wet', 'slow', 'root', 'frost', 'mark', 'invis', 'armor', 'haste', 'blind', 'vine', 'stun'];
export const hasStatus = (e, name) => ((e.st >> STATUS_BITS.indexOf(name)) & 1) === 1;

export const fusionKey = (a, b) => [a, b].sort().join('+');

// ---------------------------------------------------------------------
//  GÉNÉRATION DU KIT — Sort = Forme + Élément A + modificateur de B
// ---------------------------------------------------------------------
function applyMod(spell, mod) {
  const s = { ...spell };
  if (mod.dmg && s.dmg) s.dmg = Math.round(s.dmg * mod.dmg);
  if (mod.radius && s.radius) s.radius = Math.round(s.radius * mod.radius);
  if (mod.speed && s.speed) s.speed = Math.round(s.speed * mod.speed);
  if (mod.cd && s.cd) s.cd = +(s.cd * mod.cd).toFixed(2);
  return s;
}

export function generateKit(a, b) {
  const A = ELEMENTS[a], B = ELEMENTS[b];
  const key = fusionKey(a, b);
  const fusion = FUSIONS[key];
  const pure = a === b;
  const champ = CHAMPIONS[key] || { classe: 'mage' };
  const C = CLASSES[champ.classe] || CLASSES.mage;

  // Attaque de base : celle de la classe (mêlée…) ou celle de l'élément
  const basique = { ...(C.basique || A.basique), element: a, tags: [A.tag] };
  if (C.basique) basique.nom = `${C.basique.nom} · ${A.nom}`;
  // au corps à corps, une grosse poussée éjecterait la cible hors de portée : on l'adoucit
  if (C.melee && A.tag === 'poussee') basique.tags = ['poussee_l'];

  // Sort 1 : signature de la classe, ou sort offensif de l'élément modifié par B
  let sort1;
  if (C.sort1) {
    sort1 = applyMod({ ...C.sort1 }, B.mod);
    sort1.nom = `${C.sort1.nom} · ${A.nom}`;
  } else {
    sort1 = applyMod({ ...A.offensif }, B.mod);
    if (pure) sort1 = applyMod(sort1, B.mod);
    sort1.nom = pure ? `${A.offensif.nom} suprême` : `${A.offensif.nom} · ${B.nom}`;
  }
  sort1.element = a;
  sort1.tags = pure ? [A.tag] : [A.tag, B.tag];

  // Sort 2 : utilitaire de B, qui se termine par une petite nova de l'élément A
  const sort2 = { ...B.utilitaire, element: b, tags: [A.tag], nova: { radius: 85, dmg: 10, element: a } };
  sort2.nom = pure ? `${B.utilitaire.nom} suprême` : `${B.utilitaire.nom} · ${A.nom}`;

  // Sort 3 : technique de la classe, aux couleurs de l'élément B
  const sort3 = { ...C.sort3, element: b, tags: pure ? [A.tag] : [B.tag, A.tag] };
  sort3.nom = `${C.sort3.nom} · ${B.nom}`;

  // Sorts signature du champion : chacun a les siens
  const sig = SIGNATURES[key];
  if (sig) {
    basique.nom = sig.b;
    sort1 = { ...sig.s1, element: a, tags: sig.s1.tags || sort1.tags };   // une signature peut imposer ses effets
    sort2.nom = sig.u;
    Object.assign(sort3, { ...sig.s3, element: b, tags: sig.s3.tags || sort3.tags });
    for (const k of Object.keys(sort3)) if (!(k in sig.s3) && !['element', 'tags'].includes(k)) delete sort3[k];
  }

  const ultime = { ...fusion.ultime, element: a, element2: b, cd: 0 };

  // Équilibrage : chaque champion a un coefficient de puissance (dégâts et PV)
  const f = EQUILIBRAGE[key] ?? 1;
  const spells = [basique, sort1, sort2, sort3, ultime].map((sp) => scaleDmg(structuredClone(sp), f));

  return {
    a, b, fusion: key, fusionNom: fusion.nom, pure,
    basique: spells[0], sort1: spells[1], sort2: spells[2], sort3: spells[3], ultime: spells[4],
    classe: champ.classe, classeNom: C.nom, arme: champ.arme, melee: !!C.melee,
    pv: Math.round((C.pv || (C.melee ? CONFIG.maxHp + 10 : CONFIG.maxHp)) * Math.sqrt(f)), force: f,
    vitesse: C.melee ? 1.1 : 1,   // les combattants au corps à corps courent un peu plus vite pour rattraper les tireurs
  };
}

// Multiplie tous les « dmg » d'un sort (y compris imbriqués : nova, impact, explosion…)
function scaleDmg(o, f) {
  if (f === 1 || !o || typeof o !== 'object') return o;
  for (const [k, v] of Object.entries(o)) {
    if (k === 'dmg' && typeof v === 'number') o[k] = Math.max(1, Math.round(v * Math.sqrt(f) * 10) / 10);
    else if (v && typeof v === 'object') scaleDmg(v, f);
  }
  return o;
}

export function rollElements(rng = Math.random) {
  const keys = Object.keys(ELEMENTS);
  const a = keys[Math.floor(rng() * keys.length)];
  if (rng() < CONFIG.pureChance) return [a, a];
  const others = keys.filter((k) => k !== a);
  const b = others[Math.floor(rng() * others.length)];
  return [a, b];
}
