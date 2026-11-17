// =====================================================================
//  SORTS SIGNATURE — chaque champion a ses propres sorts (d'après sa fiche)
//  b  : nom de l'attaque de base        u : nom du sort utilitaire (Shift)
//  s1 : sort principal (E)              s3 : technique (F)
//  Formes : projectile (+ pierce, explode, bm = boomerang, pull = grappin,
//  attire = ramène la cible), salve, eventail, impact, pluie, fissure,
//  tornade, zone, nova, rayon, charge, saut, tourbillon, frappe, piege, bouclier
// =====================================================================
const P = (nom, o) => ({ nom, forme: 'projectile', speed: 700, radius: 13, range: 640, cd: 3.5, dmg: 18, ...o });
const SAL = (nom, o) => ({ nom, forme: 'salve', count: 3, gap: 0.11, speed: 900, radius: 10, range: 600, cd: 4, dmg: 9, ...o });
const EV = (nom, o) => ({ nom, forme: 'eventail', count: 3, spread: 0.4, speed: 800, radius: 11, range: 600, cd: 3.5, dmg: 11, ...o });
const IMP = (nom, o) => ({ nom, forme: 'impact', radius: 80, delay: 0.45, range: 600, cd: 4, dmg: 24, ...o });
const PL = (nom, o) => ({ nom, forme: 'pluie', centre: 'cible', count: 3, spread: 90, radius: 65, delay: 0.5, stagger: 0.12, range: 620, cd: 4.5, dmg: 15, ...o });
const FIS = (nom, o) => ({ nom, forme: 'fissure', count: 5, spacing: 70, radius: 58, delay: 0.32, stagger: 0.08, cd: 5.5, dmg: 16, ...o });
const TOR = (nom, o) => ({ nom, forme: 'tornade', radius: 110, speed: 260, duree: 2.8, tick: 0.3, cd: 7, dmg: 5, ...o });
const ZO = (nom, o) => ({ nom, forme: 'zone', centre: 'cible', range: 580, radius: 170, duree: 3.5, tick: 0.5, cd: 7.5, dmg: 5, ...o });
const NO = (nom, o) => ({ nom, forme: 'nova', radius: 150, cd: 6, dmg: 22, ...o });
const RA = (nom, o) => ({ nom, forme: 'rayon', length: 560, width: 40, cd: 6, dmg: 26, ...o });
const CH = (nom, o) => ({ nom, forme: 'charge', distance: 320, cd: 4.5, dmg: 22, ...o });
const SA = (nom, o) => ({ nom, forme: 'saut', distance: 360, radius: 135, cd: 5.5, dmg: 26, ...o });
const TB = (nom, o) => ({ nom, forme: 'tourbillon', radius: 118, duree: 1, tick: 0.14, cd: 7, dmg: 8, ...o });
const FR = (nom, o) => ({ nom, forme: 'frappe', range: 450, cd: 5, dmg: 30, ...o });
const PI = (nom, o) => ({ nom, forme: 'piege', radius: 80, duree: 12, range: 500, cd: 6, dmg: 30, ...o });
const BO = (nom, o) => ({ nom, forme: 'bouclier', shield: 70, duree: 4, cd: 11, ...o });

export const SIGNATURES = {
  'feu+vent':      { b: 'Plume ardente',      u: 'Envolée',             s1: SAL('Rafale de plumes', { count: 3, dmg: 9, speed: 820 }),            s3: TOR('Spirale de feu', { radius: 95, speed: 330, duree: 2.2, tick: 0.3, dmg: 4 }) },
  'eau+feu':       { b: 'Jet brûlant',        u: 'Jaillissement',       s1: PL('Geyser', { count: 3, spread: 80, dmg: 16 }),                     s3: ZO('Nuage de vapeur', { radius: 160 }) },
  'feu+terre':     { b: 'Poing de lave',      u: 'Carapace de basalte', s1: SA('Plongeon magmatique', { radius: 140, dmg: 28 }),                 s3: FIS('Faille de lave') },
  'eau+terre':     { b: 'Coup de racine',     u: 'Mur de boue',         s1: P('Racine agrippante', { pull: true, dmg: 14, speed: 900, range: 520, cd: 5 }), s3: ZO('Bourbier', { centre: 'lanceur', radius: 170, duree: 3, cd: 7 }) },
  'eau+vent':      { b: 'Ruban d’eau',        u: 'Courant d’air',       s1: P('Ruban tranchant', { bm: true, pierce: true, dmg: 14, radius: 14 }), s3: TOR('Trombe', { duree: 3, tags: ['mouille', 'lourd'] }) },
  'terre+vent':    { b: 'Lame de sable',      u: 'Tourbillon de sable', s1: FR('Mirage', { tags: ['lourd', 'aveugle'] }),                     s3: PI('Sables mouvants', { radius: 100, dmg: 22, cd: 6, tags: ['racine', 'lourd'] }) },   // assassin : enlise et aveugle au lieu de repousser
  'feu+feu':       { b: 'Poing incandescent', u: 'Embrasement',         s1: CH('Comète humaine', { dmg: 26, recul: true, cd: 5 }),               s3: NO('Couronne solaire', { radius: 165, dmg: 26 }) },
  'eau+eau':       { b: 'Pointe de corail',   u: 'Source sacrée',       s1: P('Trident lancé', { pierce: true, dmg: 22, speed: 800, range: 720 }), s3: PL('Raz-de-marée', { count: 5, spread: 130, radius: 75, dmg: 14, delay: 0.6, cd: 7 }) },
  'terre+terre':   { b: 'Coup de marteau',    u: 'Muraille',            s1: SA('Marteau tombant', { distance: 320, radius: 150, cd: 6 }),        s3: BO('Forteresse') },
  'vent+vent':     { b: 'Taillade du vent',   u: 'Pas du vent',         s1: P('Lame céleste', { pierce: true, dmg: 18, speed: 1000, radius: 16 }), s3: TB('Danse des mille lames', { radius: 120, tick: 0.12 }) },
  'eclair+feu':    { b: 'Poing plasma',       u: 'Surtension',          s1: CH('Ruée électrique', { distance: 340, dmg: 24 }),                   s3: RA('Décharge plasma', { length: 420, width: 70 }) },
  'eau+eclair':    { b: 'Goutte chargée',     u: 'Électrisation',       s1: PL('Foudre ciblée', { radius: 60, delay: 0.45, range: 650, cd: 4 }), s3: ZO('Nuée orageuse', { radius: 180, tick: 0.4, dmg: 6, cd: 8 }) },
  'eclair+terre':  { b: 'Poing aimanté',      u: 'Champ magnétique',    s1: P('Attraction', { pull: true, dmg: 16, speed: 1000, range: 560, cd: 5 }), s3: NO('Répulsion', { radius: 170, dmg: 20, recul: true }) },
  'eclair+vent':   { b: 'Griffe d’éclair',    u: 'Vitesse foudroyante', s1: CH('Éclair fulgurant', { distance: 420, cd: 4 }),                    s3: EV('Étincelles volantes', { count: 5, spread: 0.6, dmg: 8, speed: 1100, range: 480, cd: 5 }) },
  'eclair+glace':  { b: 'Éclat prismatique',  u: 'Bouclier prismatique', s1: EV('Prismes réfractés', { dmg: 12, speed: 900, range: 650 }),       s3: RA('Rayon réfracté', { length: 620, width: 36 }) },
  'eclair+ombre':  { b: 'Griffes noires',     u: 'Fondu noir',          s1: FR('Éclair noir', { range: 480 }),                                  s3: NO('Orage d’ombres', { radius: 140 }) },
  'eclair+metal':  { b: 'Rail',               u: 'Plaque conductrice',  s1: SAL('Rafale de rails', { dmg: 10, speed: 1400, range: 800 }),        s3: RA('Tir électromagnétique', { dmg: 42, length: 1000, width: 28, cd: 7 }) },
  'feu+glace':     { b: 'Double poing',       u: 'Carapace bouillante', s1: SA('Impact thermique', { radius: 130 }),                             s3: EV('Gerbe feu et glace', { count: 6, spread: 1, dmg: 9, speed: 750, range: 380, cd: 6 }) },
  'eau+glace':     { b: 'Flocon',             u: 'Givre protecteur',    s1: P('Sphère de givre', { explode: 80, speed: 600, radius: 18 }),       s3: ZO('Blizzard', { radius: 190, cd: 8 }) },
  'glace+terre':   { b: 'Coup de hache',      u: 'Mur de glace',        s1: FIS('Fissure glaciaire', { count: 6, spacing: 65, radius: 55, dmg: 15, cd: 5 }), s3: SA('Chute de glacier', { distance: 340, radius: 140, dmg: 28, cd: 6 }) },
  'glace+vent':    { b: 'Éventail de neige',  u: 'Glissade',            s1: P('Éventail tournoyant', { bm: true, pierce: true, dmg: 13, radius: 16, range: 600 }), s3: ZO('Blizzard figé', { radius: 185, dmg: 6, tags: ['gel'] }) },
  'glace+ombre':   { b: 'Fauchage',           u: 'Voile spectral',      s1: CH('Glissement spectral', { cd: 4 }),                                s3: NO('Moisson gelée', { dmg: 24 }) },
  'glace+metal':   { b: 'Tranche',            u: 'Trempe',              s1: FR('Iaï', { range: 400, dmg: 32 }),                                  s3: EV('Lames de givre', { count: 4, spread: 0.5, dmg: 10, speed: 900, range: 500, cd: 5 }) },
  'feu+ombre':     { b: 'Lame noire',         u: 'Ombre ardente',       s1: P('Croissant noir', { pierce: true, speed: 850, radius: 18, range: 560 }), s3: TB('Brasier tournoyant', { radius: 120, tick: 0.15, dmg: 9 }) },
  'eau+ombre':     { b: 'Encre',              u: 'Plongée',             s1: P('Tentacule agrippeur', { attire: true, dmg: 14, speed: 850, range: 560, cd: 5 }), s3: PI('Gouffre abyssal', { radius: 85 }) },
  'ombre+terre':   { b: 'Coup de pelle',      u: 'Exhumation',          s1: FIS('Tranchée', { cd: 5 }),                                         s3: ZO('Terre maudite', { centre: 'lanceur', radius: 160, duree: 3, dmg: 6, cd: 7 }) },
  'ombre+vent':    { b: 'Dague spectrale',    u: 'Évanescence',         s1: P('Dague revenante', { bm: true, pierce: true, dmg: 14, speed: 900, radius: 11, range: 560 }), s3: FR('Assaut fantôme', { dmg: 28, cd: 6 }) },
  'metal+ombre':   { b: 'Coup de faux',       u: 'Linceul',             s1: FR('Faux de l’au-delà', { dmg: 32 }),                               s3: P('Faux lancée', { bm: true, pierce: true, speed: 750, radius: 18, range: 520, cd: 5 }) },
  'feu+metal':     { b: 'Lame chauffée',      u: 'Trempe ardente',      s1: CH('Estoc rougeoyant', { distance: 300, dmg: 24, cd: 4 }),           s3: PL('Pluie d’étincelles', { count: 4, spread: 110, radius: 60, dmg: 13, range: 500, cd: 6 }) },
  'eau+metal':     { b: 'Fouet de mercure',   u: 'Peau de mercure',     s1: RA('Fouet liquide', { dmg: 20, length: 380, width: 50, cd: 3.5 }),  s3: SAL('Billes de mercure', { count: 5, dmg: 7, speed: 800, range: 560, cd: 5 }) },
  'metal+terre':   { b: 'Coup de bouclier',   u: 'Ancrage',             s1: CH('Bélier', { dmg: 20, recul: true, cd: 5 }),                       s3: BO('Mur de titane', { shield: 75 }) },
  'metal+vent':    { b: 'Lame orbitale',      u: 'Envol d’acier',       s1: P('Disque d’acier', { bm: true, pierce: true, dmg: 16, radius: 16, range: 600 }), s3: TB('Orbite tranchante', { radius: 130, duree: 1.2, tick: 0.12 }) },
  'eclair+eclair': { b: 'Étincelle divine',   u: 'Surcharge divine',    s1: PL('Jugement', { count: 4, radius: 60, delay: 0.4, stagger: 0.1, range: 650, cd: 4 }), s3: RA('Lance de foudre', { dmg: 30, length: 700, width: 34 }) },
  'glace+glace':   { b: 'Éclat de cristal',   u: 'Armure de cristal',   s1: EV('Gerbe de cristaux', { count: 5, spread: 0.5, dmg: 9, speed: 700 }), s3: FIS('Mur de cristal', { count: 6, spacing: 60, radius: 55, dmg: 14, delay: 0.4, stagger: 0.06, cd: 6 }) },
  'ombre+ombre':   { b: 'Ombre mordante',     u: 'Pas des ténèbres',    s1: IMP('Main des ténèbres', { radius: 80, delay: 0.4 }),                s3: PL('Nuée d’ombres', { count: 5, spread: 120, radius: 60, dmg: 12, cd: 7 }) },
  'metal+metal':   { b: 'Taille d’espadon',   u: 'Blindage',            s1: TB('Moulinet d’espadon', { radius: 125, duree: 0.9, tick: 0.15, dmg: 9, cd: 6 }), s3: CH('Percée d’acier', { dmg: 24, distance: 300, recul: true, cd: 6 }) },
  // ---- Lumière & Nature ----
  'eau+lumiere':     { b: 'Perle lumineuse',   u: 'Source de lumière',   s1: P('Prisme d’eau', { explode: 70, dmg: 16, speed: 700, radius: 15 }),  s3: PL('Pluie irisée', { count: 4, spread: 110, radius: 65, dmg: 13, cd: 6 }) },
  'feu+lumiere':     { b: 'Taille solaire',    u: 'Éclat de l’aube',     s1: CH('Ruée solaire', { distance: 340, dmg: 24 }),                    s3: RA('Lame de soleil', { length: 380, width: 60, dmg: 26 }) },
  'lumiere+terre':   { b: 'Coup béni',         u: 'Prière de pierre',    s1: SA('Bond sacré', { distance: 300, radius: 150, cd: 6 }),        s3: NO('Éclat sacré', { radius: 165, dmg: 24, tags: ['aveugle', 'lourd'] }) },
  'lumiere+vent':    { b: 'Plume de lumière',  u: 'Vol céleste',         s1: EV('Éventail de plumes', { count: 5, spread: 0.55, dmg: 9, speed: 950 }), s3: TOR('Colonne céleste', { radius: 100, speed: 300, duree: 2.4, dmg: 6 }) },
  'eclair+lumiere':  { b: 'Flèche sacrée',     u: 'Ailes de foudre',     s1: SAL('Triple flèche', { count: 3, dmg: 11, speed: 1300, range: 760 }), s3: RA('Flèche du jugement', { dmg: 40, length: 980, width: 30, cd: 7 }) },
  'glace+lumiere':   { b: 'Éclat d’aurore',    u: 'Voile boréal',        s1: RA('Prisme gelé', { length: 600, width: 44, dmg: 26, tags: ['gel', 'aveugle'] }), s3: ZO('Halo glacé', { radius: 175, cd: 8 }) },
  'lumiere+ombre':   { b: 'Dague jumelle',     u: 'Pas du crépuscule',   s1: FR('Coup du crépuscule', { dmg: 30 }),                              s3: EV('Croissants d’éclipse', { count: 3, spread: 0.35, dmg: 13, speed: 880, cd: 4.5, tags: ['marque', 'aveugle'] }) },
  'lumiere+metal':   { b: 'Taille sacrée',     u: 'Armure bénie',        s1: CH('Charge du croisé', { dmg: 22, recul: true, cd: 4.5 }),         s3: NO('Croix de lumière', { radius: 150, dmg: 24 }) },
  'lumiere+nature':  { b: 'Pétale de lumière', u: 'Bourgeon protecteur', s1: PL('Bourgeons explosifs', { count: 3, spread: 90, radius: 70, dmg: 15 }), s3: PI('Fleur piège', { radius: 85 }) },
  'lumiere+lumiere': { b: 'Rayon divin',       u: 'Grâce divine',        s1: P('Orbe sacré', { pierce: true, explode: 60, dmg: 18, speed: 800, radius: 16, range: 700 }), s3: RA('Colonne de lumière', { dmg: 30, length: 650, width: 44 }) },
  'eau+nature':      { b: 'Liane mouillée',    u: 'Marée verte',         s1: P('Liane agrippante', { attire: true, dmg: 14, speed: 850, range: 560, cd: 5 }), s3: ZO('Marais vivant', { radius: 175, cd: 7.5 }) },
  'feu+nature':      { b: 'Poing de braise',   u: 'Écorce ardente',      s1: SA('Bond enflammé', { radius: 135, dmg: 26 }),                      s3: FIS('Racines brûlantes', { count: 5, dmg: 15 }) },
  'nature+terre':    { b: 'Coup d’écorce',     u: 'Enracinement',        s1: CH('Ruée du chêne', { dmg: 20, recul: true, cd: 5 }),              s3: BO('Écorce millénaire', { shield: 75 }) },
  'nature+vent':     { b: 'Lame-feuille',      u: 'Brise des bois',      s1: FR('Danse des feuilles', { dmg: 28 }),                             s3: EV('Pluie de feuilles', { count: 6, spread: 0.8, dmg: 8, speed: 900, range: 480, cd: 5 }) },
  'eclair+nature':   { b: 'Coup de ronce',     u: 'Sève électrique',     s1: P('Ronce foudroyante', { pull: true, dmg: 16, speed: 1000, range: 540, cd: 5 }), s3: TB('Fouet tournoyant', { radius: 125, duree: 1, dmg: 8 }) },
  'glace+nature':    { b: 'Aiguille de pin',   u: 'Manteau de neige',    s1: SAL('Salve d’aiguilles', { count: 4, dmg: 8, speed: 1150, range: 720 }), s3: FIS('Forêt de glace', { count: 6, spacing: 65, radius: 55, dmg: 14, cd: 6 }) },
  'nature+ombre':    { b: 'Spore sombre',      u: 'Brume de spores',     s1: IMP('Champignon explosif', { radius: 90, delay: 0.55, dmg: 24 }),   s3: ZO('Nuage de spores', { radius: 165, dmg: 6, cd: 7 }) },
  'metal+nature':    { b: 'Poing à épines',    u: 'Carapace d’épines',   s1: P('Grappin d’épines', { pull: true, dmg: 16, speed: 1000, range: 520, cd: 5 }), s3: NO('Explosion d’épines', { radius: 160, dmg: 24 }) },
  'nature+nature':   { b: 'Graine',            u: 'Sève de vie',         s1: FIS('Racines du monde', { count: 6, spacing: 70, radius: 60, dmg: 15, cd: 5 }), s3: PL('Pluie de graines', { count: 5, spread: 130, radius: 65, dmg: 13, cd: 7 }) },
};
