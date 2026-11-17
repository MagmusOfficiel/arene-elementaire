// =====================================================================
//  FICHES DES CHAMPIONS — chaque fusion a une classe (sa façon de se battre)
//  qui correspond à son illustration, et un ultime spectaculaire.
// =====================================================================

// ---------- Classes : modèles de sorts (A = élément principal, B = secondaire) ----------
// Formes de sorts :
//   melee (arc devant soi) · charge (ruée qui blesse) · saut (bond + impact) · tourbillon (tourne sur soi)
//   rayon (faisceau instantané) · frappe (téléportation dans le dos + coup) · piege (mine au sol)
//   + celles d'origine : projectile, eventail, impact, dash, soin, bouclier, blink, hate, armure
export const CLASSES = {
  bretteur: {
    nom: 'Bretteur', melee: true,
    basique: { nom: 'Taillade', forme: 'melee', dmg: 14, range: 100, arc: 1.7, cd: 0.5 },
    sort1:   { nom: 'Estocade', forme: 'charge', dmg: 24, distance: 280, cd: 4 },
    sort3:   { nom: 'Lame tourbillon', forme: 'tourbillon', dmg: 9, radius: 115, duree: 0.9, tick: 0.15, cd: 7 },
  },
  brute: {
    nom: 'Brute', melee: true,
    basique: { nom: 'Coup de poing', forme: 'melee', dmg: 16, range: 85, arc: 1.4, cd: 0.6, recul: true },
    sort1:   { nom: 'Bond sismique', forme: 'saut', dmg: 28, distance: 380, radius: 130, cd: 5 },
    sort3:   { nom: 'Onde de choc', forme: 'rayon', dmg: 24, length: 280, width: 120, cd: 6 },
  },
  assassin: {
    nom: 'Assassin', melee: true,
    basique: { nom: 'Lames jumelles', forme: 'melee', dmg: 10, range: 80, arc: 1.3, cd: 0.32 },
    sort1:   { nom: 'Frappe fantôme', forme: 'frappe', dmg: 32, range: 450, cd: 5 },
    sort3:   { nom: 'Kunaïs', forme: 'eventail', count: 3, spread: 0.25, dmg: 12, speed: 950, radius: 9, range: 540, cd: 4 },
  },
  tank: {
    nom: 'Colosse', melee: true,
    basique: { nom: 'Coup lourd', forme: 'melee', dmg: 13, range: 95, arc: 1.6, cd: 0.7, recul: true },
    sort1:   { nom: 'Charge du colosse', forme: 'charge', dmg: 20, distance: 300, cd: 5, recul: true },
    sort3:   { nom: 'Rempart', forme: 'bouclier', shield: 60, duree: 4, cd: 10 },
    pv: 150,
  },
  mage: {
    nom: 'Mage', melee: false,
    sort3: { nom: 'Rayon', forme: 'rayon', dmg: 28, length: 560, width: 40, cd: 6 },
  },
  tireur: {
    nom: 'Tireur', melee: false,
    basique: { nom: 'Tir', forme: 'projectile', dmg: 9, speed: 1200, radius: 8, range: 700, cd: 0.4 },
    sort3: { nom: 'Tir chargé', forme: 'rayon', dmg: 42, length: 950, width: 30, cd: 7 },
  },
  invocateur: {
    nom: 'Invocateur', melee: false,
    sort3: { nom: 'Glyphe piège', forme: 'piege', dmg: 34, radius: 75, duree: 12, range: 500, cd: 6 },
  },
};

// ---------- Ultimes spectaculaires ----------
// meteore : énorme impact après une chute · rayon_ult : faisceau géant
// domaine : zone qui écrase puis implose · dragon : serpent élémentaire qui ondule
// invocation : esprit géant du champion qui frappe le sol
const U = {
  meteore:    (nom, o = {}) => ({ nom, forme: 'meteore', range: 650, radius: 240, dmg: 78, delay: 1.3, ...o }),
  rayon:      (nom, o = {}) => ({ nom, forme: 'rayon_ult', length: 1100, width: 95, duree: 1.4, tick: 0.2, dmg: 8, ...o }),
  domaine:    (nom, o = {}) => ({ nom, forme: 'domaine', radius: 430, duree: 3.5, tick: 0.5, dmg: 5, final: 46, ...o }),
  dragon:     (nom, o = {}) => ({ nom, forme: 'dragon', radius: 115, speed: 560, duree: 2.2, tick: 0.1, dmg: 11, amp: 95, ...o }),
  tornade:    (nom, o = {}) => ({ nom, forme: 'tornade', radius: 140, speed: 220, duree: 4.5, tick: 0.3, dmg: 8, ...o }),
  invocation: (nom, o = {}) => ({ nom, forme: 'invocation', range: 520, radius: 360, dmg: 72, delay: 1.1, ...o }),
  // prison : anneau de piliers qui enferme la zone visée + étourdit au centre
  prison:     (nom, o = {}) => ({ nom, forme: 'prison', range: 600, radius: 190, count: 14, epaisseur: 28, duree: 3.5, dmg: 40, ...o }),
  // sanctuaire : grand cercle de soin autour de toi, bouclier immédiat pour toi et tes alliés
  sanctuaire: (nom, o = {}) => ({ nom, forme: 'sanctuaire', radius: 300, duree: 5, tick: 0.5, soin: 7, dmg: 8, bouclier: 40, dmgInitial: 24, ...o }),
  // armée : plusieurs totems qui mitraillent les ennemis autour du point visé
  armee:      (nom, o = {}) => ({ nom, forme: 'armee', range: 520, count: 4, ecart: 120, duree: 8, tick: 0.7, portee: 460, dmg: 11, speed: 820, ...o }),
};

// ---------- Les 36 fiches ----------
// classe · arme (pour l'ambiance) · ultime (remplace celui de FUSIONS si présent)
export const CHAMPIONS = {
  'feu+vent':      { classe: 'mage',       arme: 'Ailes de feu',        ultime: U.dragon('Envol du Phénix', { tags: ['brulure', 'poussee'] }) },
  'eau+feu':       { classe: 'invocateur', arme: 'Masque de vapeur',      ultime: U.armee('Armée de geysers', { tags: ['mouille', 'brulure'] }) },
  'feu+terre':     { classe: 'brute',      arme: 'Poings de lave',      ultime: U.meteore('Cataclysme', { tags: ['brulure', 'lourd'] }) },
  'eau+terre':     { classe: 'brute',      arme: 'Bâton de racines',    ultime: U.domaine('Marécage originel', { tags: ['mouille', 'lourd'] }) },
  'eau+vent':      { classe: 'mage',       arme: 'Rubans d’eau',        ultime: U.tornade('Typhon', { tags: ['mouille', 'lourd'] }) },   // tornades qui retiennent au lieu de repousser
  'terre+vent':    { classe: 'assassin',   arme: 'Lames de sable',      ultime: U.domaine('Tempête de sable', { tags: ['lourd', 'aveugle'], dmg: 7 }) },
  'feu+feu':       { classe: 'brute',      arme: 'Couronne de flammes', ultime: U.meteore('Soleil déchu', { radius: 300, dmg: 95, tags: ['brulure'] }) },
  'eau+eau':       { classe: 'mage',       arme: 'Trident de corail',   ultime: U.dragon('Léviathan', { radius: 120, tags: ['mouille'] }) },
  'terre+terre':   { classe: 'tank',       arme: 'Marteau de pierre',   ultime: U.invocation('Golem titanesque', { radius: 400, dmg: 85, tags: ['lourd'] }) },
  'vent+vent':     { classe: 'bretteur',   arme: 'Katana du vent',      ultime: U.rayon('Tranchant céleste', { tags: ['poussee'], dmg: 10 }) },
  'eclair+feu':    { classe: 'brute',      arme: 'Gantelets à plasma',  ultime: U.rayon('Canon à plasma', { tags: ['brulure', 'chaine'], dmg: 6 }) },
  'eau+eclair':    { classe: 'mage',       arme: 'Appel de l’orage',    ultime: U.domaine('Œil de l’orage', { tags: ['mouille', 'chaine'], dmg: 4, final: 40 }) },
  'eclair+terre':  { classe: 'brute',      arme: 'Poings aimantés' },
  'eclair+vent':   { classe: 'assassin',   arme: 'Vitesse de l’éclair', ultime: U.dragon('Serpent d’éclair', { speed: 800, tags: ['poussee', 'chaine'] }) },
  'eclair+glace':  { classe: 'mage',       arme: 'Prismes' },
  'eclair+ombre':  { classe: 'assassin',   arme: 'Griffes noires',      ultime: U.meteore('Jugement noir', { tags: ['marque', 'chaine'] }) },
  'eclair+metal':  { classe: 'tireur',     arme: 'Canon à rails',       ultime: U.rayon('Canon électromagnétique', { width: 70, dmg: 9, tags: ['perce', 'chaine'] }) },
  'feu+glace':     { classe: 'brute',      arme: 'Poings feu et glace' },
  'eau+glace':     { classe: 'mage',       arme: 'Couronne de givre',   ultime: U.domaine('Blizzard royal', { tags: ['gel', 'mouille'] }) },
  'glace+terre':   { classe: 'brute',      arme: 'Hache de glace',      ultime: U.invocation('Géant de givre', { tags: ['gel', 'lourd'] }) },
  'glace+vent':    { classe: 'mage',       arme: 'Éventails de neige' },
  'glace+ombre':   { classe: 'bretteur',   arme: 'Faux spectrale',      ultime: U.domaine('Hiver éternel', { tags: ['gel', 'marque'] }) },
  'glace+metal':   { classe: 'bretteur',   arme: 'Katana trempé',         ultime: U.prison('Prison de givre', { tags: ['gel', 'etourdi'] }) },
  'feu+ombre':     { classe: 'bretteur',   arme: 'Épée de flamme noire', ultime: U.dragon('Dragon noir', { tags: ['brulure', 'marque'] }) },
  'eau+ombre':     { classe: 'invocateur', arme: 'Tentacules des abysses', ultime: U.invocation('Kraken', { tags: ['mouille', 'marque'] }) },
  'ombre+terre':   { classe: 'brute',      arme: 'Pelle de fossoyeur' },
  'ombre+vent':    { classe: 'assassin',   arme: 'Dagues spectrales' },
  'metal+ombre':   { classe: 'assassin',   arme: 'Faux d’acier',        ultime: U.domaine('Moisson des âmes', { tags: ['marque', 'perce'], final: 55 }) },
  'feu+metal':     { classe: 'bretteur',   arme: 'Lame chauffée à blanc' },
  'eau+metal':     { classe: 'mage',       arme: 'Fouets de mercure',   ultime: U.dragon('Serpent de mercure', { tags: ['mouille', 'perce'] }) },
  'metal+terre':   { classe: 'tank',       arme: 'Bouclier-tour',       ultime: U.meteore('Chute du titan', { tags: ['lourd', 'perce'] }) },
  'metal+vent':    { classe: 'bretteur',   arme: 'Lames orbitales' },
  'eclair+eclair': { classe: 'mage',       arme: 'Foudre divine' },
  'glace+glace':   { classe: 'mage',       arme: 'Sceptre de cristal' },
  'ombre+ombre':   { classe: 'invocateur', arme: 'Ombres vivantes',     ultime: U.domaine('Éclipse totale', { radius: 480, tags: ['marque'], final: 60 }) },
  'metal+metal':   { classe: 'tank',       arme: 'Espadon',             ultime: U.prison('Cage d’acier', { radius: 210, count: 16, dmg: 46, tags: ['perce', 'etourdi'] }) },
  // ---- Lumière & Nature ----
  'eau+lumiere':     { classe: 'mage',       arme: 'Bâton de perles',       ultime: U.sanctuaire('Source divine', { tags: ['aveugle'] }) },
  'feu+lumiere':     { classe: 'bretteur',   arme: 'Épée solaire',          ultime: U.rayon('Lame de l’aube', { tags: ['brulure', 'aveugle'], dmg: 9 }) },
  'lumiere+terre':   { classe: 'tank',       arme: 'Épée bénie',            ultime: U.invocation('Jugement du paladin', { tags: ['lourd', 'aveugle'] }) },
  'lumiere+vent':    { classe: 'mage',       arme: 'Ailes de lumière',      ultime: U.dragon('Chœur céleste', { tags: ['poussee', 'aveugle'] }) },
  'eclair+lumiere':  { classe: 'tireur',     arme: 'Arc de lumière' },
  'glace+lumiere':   { classe: 'mage',       arme: 'Sceptre d’aurore',      ultime: U.domaine('Aurore boréale', { tags: ['gel', 'aveugle'] }) },
  'lumiere+ombre':   { classe: 'assassin',   arme: 'Dagues du crépuscule',  ultime: U.domaine('Équilibre', { tags: ['marque', 'aveugle'] }) },
  'lumiere+metal':   { classe: 'bretteur',   arme: 'Épée et bouclier sacrés' },
  'lumiere+nature':  { classe: 'invocateur', arme: 'Bâton fleuri',          ultime: U.sanctuaire('Jardin sacré', { tags: ['racine'], soin: 8 }) },
  'lumiere+lumiere': { classe: 'mage',       arme: 'Halo divin',            ultime: U.meteore('Jugement dernier', { radius: 290, dmg: 92, tags: ['aveugle'] }) },
  'eau+nature':      { classe: 'invocateur', arme: 'Lianes aquatiques' },
  'feu+nature':      { classe: 'brute',      arme: 'Poings de braise',      ultime: U.meteore('Feu de forêt', { tags: ['brulure', 'racine'] }) },
  'nature+terre':    { classe: 'tank',       arme: 'Bouclier d’écorce',     ultime: U.invocation('Golem sylvestre', { tags: ['lourd', 'racine'] }) },
  'nature+vent':     { classe: 'assassin',   arme: 'Lames-feuilles' },
  'eclair+nature':   { classe: 'bretteur',   arme: 'Fouet de ronces' },
  'glace+nature':    { classe: 'tireur',     arme: 'Arc de sapin' },
  'nature+ombre':    { classe: 'invocateur', arme: 'Champignons maudits',   ultime: U.armee('Forêt d’esprits', { count: 5, tags: ['marque', 'racine'] }) },
  'metal+nature':    { classe: 'brute',      arme: 'Gantelets à épines' },
  'nature+nature':   { classe: 'invocateur', arme: 'Bâton de l’arbre-monde' },
};
