// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les monstres de chaque territoire
//  intentions : ce que le monstre fera à son tour, dans l'ordre, en boucle.
//  a : dégâts (n : nombre de coups), d : bouclier, f : force,
//  b : brûlure, t : trempé, w : affaibli (sur le joueur), e : épines,
//  s : soigne tous ses alliés (lui compris), g : bouclier à tous ses alliés (v80).
//  p : paralysie (v96), m : pose des marques sur le joueur — à 3, elles explosent (v98).
//  v : vol de vie, le monstre se soigne de cette part des dégâts qu'il t'inflige (v99).
// =====================================================================
export const TERRITOIRES = {
  feu: { nom: 'Terres de Braise', element: 'feu', ico: '🌋' },
  eau: { nom: "Lagons d'Azur", element: 'eau', ico: '🏝️' },
  plante: { nom: "Sylve d'Émeraude", element: 'plante', ico: '🌲' },
  // v87 (Chapitre 2) : la région neutre du sud, ouverte au niveau 30
  brisees: { nom: 'Terres Brisées', element: 'brisees', ico: '🌀', niv: 30 },
  // v96 (Chapitre 3) : les Cimes Orageuses, à l'est, ouvertes au niveau 50 — le plus dur du jeu
  cimes: { nom: 'Cimes Orageuses', element: 'cimes', ico: '⚡', niv: 50 },
  // v99 (Chapitre 5) : les Îles Célestes, au-delà du désert, ouvertes au niveau 90
  ciel: { nom: 'Îles Célestes', element: 'ciel', ico: '🌌', niv: 90 },
  // v98 (Chapitre 4) : le Désert d'Ambre, tout à l'est, ouvert au niveau 70
  ambre: { nom: 'Désert d’Ambre', element: 'ambre', ico: '🏜️', niv: 70 },
};

const m = (id, nom, ico, pv, intentions, rang = 'normal') => ({ id, nom, ico, pv, intentions, rang });
export const MONSTRES = {
  feu: {
    normaux: [
      m('salamandre', 'Salamandre', '🦎', 22, [{ a: 7 }, { a: 4, b: 2 }, { d: 6 }]),
      m('diablotin', 'Diablotin', '👺', 16, [{ a: 5, n: 2 }, { f: 2 }]),
      m('golem_cendre', 'Golem de cendre', '🗿', 38, [{ d: 10 }, { a: 12 }]),
      m('feu_follet', 'Feu follet', '🔥', 14, [{ b: 3 }, { a: 6 }]),
      m('scarabee_braise', 'Scarabée de braise', '🪲', 26, [{ d: 7, a: 4 }, { a: 8 }, { e: 1, d: 5 }]),
      m('chaman_braise', 'Chaman des braises', '🧙', 20, [{ g: 5 }, { a: 5, b: 2 }, { s: 7 }]),
      m('chauve_souris', 'Chauve-souris ardente', '🦇', 15, [{ a: 3, n: 2, b: 1 }, { a: 6 }]),
    ],
    rare: m('phenix_cendre', 'Phénix de cendre', '🐦‍🔥', 44, [{ a: 7, b: 3 }, { d: 8, f: 1 }, { a: 4, n: 3 }], 'rare'),
    elite: m('chimere', 'Chimère ardente', '🐲', 50, [{ a: 9, b: 2 }, { a: 5, n: 2 }, { f: 2, d: 6 }], 'elite'),
    boss: m('seigneur_magma', 'Seigneur du Magma', '👹', 90, [{ a: 13 }, { d: 12, f: 2 }, { a: 5, n: 3 }, { w: 2, a: 7 }, { b: 4, a: 8 }], 'boss'),
    // v80 : une 2e version du rare, de l'élite et du boss, tirée au hasard selon l'expédition
    autres: {
      rare: m('djinn', 'Djinn des cendres', '🧞', 46, [{ a: 6, n: 2 }, { f: 2, s: 6 }, { a: 10, b: 2 }], 'rare'),
      elite: m('golem_obsidienne', "Golem d'obsidienne", '🪨', 56, [{ d: 12 }, { a: 13 }, { e: 2, d: 6 }, { a: 5, n: 2 }], 'elite'),
      boss: m('roi_scorpion', 'Roi-scorpion des cendres', '🦂', 94, [{ a: 6, n: 2, b: 1 }, { d: 10, f: 1 }, { w: 2, a: 8 }, { a: 16 }, { s: 10, g: 8 }], 'boss'),
    },
  },
  eau: {
    normaux: [
      m('crabe', 'Crabe-lame', '🦀', 24, [{ d: 8 }, { a: 8 }]),
      m('meduse', 'Méduse', '🪼', 18, [{ a: 4, w: 1 }, { a: 7 }]),
      m('sirene', 'Sirène', '🧜', 28, [{ t: 2 }, { a: 9 }]),
      m('anguille', 'Anguille', '🐍', 20, [{ a: 3, n: 3 }, { d: 5 }]),
      m('grenouille', 'Grenouille-bulle', '🐸', 19, [{ t: 1, a: 5 }, { d: 6 }, { a: 7 }]),
      m('pretresse_ecume', "Prêtresse de l'écume", '🐚', 22, [{ s: 6 }, { g: 6 }, { a: 6, t: 1 }]),
      m('requin', 'Requin-scie', '🦈', 30, [{ a: 10 }, { a: 4, n: 2 }, { f: 1, d: 4 }]),
    ],
    rare: m('tortue_dragon', 'Tortue-dragon', '🐢', 56, [{ d: 12 }, { a: 10, t: 1 }, { a: 6, n: 2 }], 'rare'),
    elite: m('kraken', 'Jeune kraken', '🦑', 52, [{ a: 4, n: 3 }, { d: 10 }, { a: 12, t: 1 }], 'elite'),
    boss: m('hydre', 'Hydre des abysses', '🐉', 95, [{ a: 7, n: 2 }, { f: 1, d: 8 }, { a: 14 }, { t: 1, d: 8 }, { a: 4, n: 3 }], 'boss'),
    // v80 : une 2e version du rare, de l'élite et du boss, tirée au hasard selon l'expédition
    autres: {
      rare: m('esprit_marees', 'Esprit des marées', '🌊', 44, [{ t: 2, d: 8 }, { a: 4, n: 3 }, { s: 5, f: 1 }], 'rare'),
      elite: m('crocodile', 'Crocodile des mangroves', '🐊', 58, [{ a: 12 }, { d: 10, f: 1 }, { a: 5, n: 2, t: 1 }], 'elite'),
      boss: m('reine_corail', 'Reine du corail', '🪸', 80, [{ g: 8, e: 2 }, { a: 6, n: 2, t: 1 }, { s: 7, a: 4 }, { a: 13 }, { w: 1, a: 8 }], 'boss'),
    },
  },
  plante: {
    normaux: [
      m('champignon', 'Champignon', '🍄', 20, [{ w: 1, a: 5 }, { a: 7 }]),
      m('loup_ronces', 'Loup des ronces', '🐺', 26, [{ a: 6, n: 2 }, { a: 9 }]),
      m('treant', 'Tréant', '🌳', 40, [{ d: 12 }, { a: 11 }]),
      m('guepe', 'Guêpe géante', '🐝', 17, [{ a: 4, n: 2 }, { e: 2, a: 5 }]),
      m('araignee', 'Araignée des bois', '🕷️', 18, [{ w: 1, a: 4 }, { a: 4, n: 2 }]),
      m('druide_fou', 'Druide fou', '🧝', 22, [{ s: 6 }, { g: 5, e: 1 }, { a: 7 }]),
      m('sanglier', 'Sanglier moussu', '🐗', 32, [{ a: 11 }, { d: 8 }, { f: 1, a: 5 }]),
    ],
    rare: m('cerf_emeraude', "Cerf d'émeraude", '🦌', 48, [{ a: 9 }, { e: 3, d: 6 }, { a: 5, n: 2, w: 1 }], 'rare'),
    elite: m('mante', 'Mante géante', '🦗', 48, [{ a: 11 }, { a: 4, n: 3 }, { f: 2, e: 2 }], 'elite'),
    boss: m('reine_epine', 'Reine Épine', '🥀', 92, [{ a: 9, e: 2 }, { d: 12 }, { a: 5, n: 3 }, { w: 1, a: 8 }, { a: 15 }], 'boss'),
    // v80 : une 2e version du rare, de l'élite et du boss, tirée au hasard selon l'expédition
    autres: {
      rare: m('grand_duc', 'Grand-duc sylvestre', '🦉', 44, [{ a: 4, n: 3 }, { w: 2, d: 6 }, { a: 11 }], 'rare'),
      elite: m('ours_ronces', 'Ours des ronces', '🐻', 62, [{ a: 13 }, { e: 3, d: 8 }, { a: 6, n: 2 }, { f: 2 }], 'elite'),
      boss: m('colosse_racines', 'Colosse des racines', '🪵', 86, [{ d: 12, e: 2 }, { a: 5, n: 3 }, { s: 6, w: 1 }, { a: 14 }, { f: 1, g: 6 }], 'boss'),
    },
  },
  // v87 : les monstres « fusionnés » nés de la Faille — nettement plus forts que ceux des trois terres
  // v96 : les monstres des Cimes — p : paralysie (une énergie de moins au prochain tour)
  cimes: {
    normaux: [
      m('harpie_orage', 'Harpie des orages', '🦅', 46, [{ a: 6, n: 2, p: 1 }, { a: 11 }, { d: 10, f: 1 }]),
      m('golem_givre', 'Golem de givre', '🧊', 60, [{ d: 14 }, { a: 13, t: 1 }, { a: 8, n: 2 }]),
      m('loup_blizzard', 'Loup du blizzard', '🐺', 44, [{ a: 7, n: 2 }, { a: 12, w: 1 }, { f: 2 }]),
      m('elementaire_foudre', 'Élémentaire de foudre', '🌩️', 40, [{ a: 14, p: 1 }, { e: 3, d: 8 }, { a: 5, n: 3 }]),
      m('yeti', 'Yéti des cimes', '🦍', 62, [{ a: 16 }, { d: 12, s: 6 }, { a: 9, n: 2 }]),
      m('wyverne_glace', 'Wyverne de glace', '🐲', 52, [{ a: 9, n: 2, t: 1 }, { g: 8 }, { a: 15 }]),
      m('chamane_tempete', 'Chamane des tempêtes', '🧙', 38, [{ s: 10, g: 6 }, { w: 2, p: 1 }, { a: 10 }]),
    ],
    rare: m('oiseau_tonnerre', 'Oiseau-tonnerre', '🦚', 80, [{ a: 8, n: 3, p: 1 }, { d: 16, f: 1 }, { a: 20 }], 'rare'),
    elite: m('geant_givre', 'Géant du givre', '🗿', 120, [{ a: 20, t: 2 }, { d: 20, f: 1 }, { a: 9, n: 3 }, { g: 14, p: 1 }], 'elite'),
    boss: m('roi_tempetes', 'Le Roi des Tempêtes', '👑', 170, [{ a: 10, n: 2, p: 1 }, { g: 16, s: 10 }, { a: 26 }, { w: 2, t: 2, a: 12 }, { f: 2, d: 18 }, { a: 7, n: 4, p: 1 }], 'boss'),
    autres: {
      rare: m('esprit_aurore', 'Esprit de l’aurore', '🌈', 76, [{ s: 14, g: 8 }, { a: 15, p: 1 }, { a: 6, n: 3 }], 'rare'),
      elite: m('dragon_givre', 'Dragon de givre', '🐉', 130, [{ a: 8, n: 3, t: 1 }, { d: 18, f: 2 }, { a: 24, p: 1 }, { g: 12 }], 'elite'),
      boss: m('reine_blizzard', 'La Reine du Blizzard', '❄️', 180, [{ g: 18 }, { a: 11, n: 3, t: 1 }, { w: 3, p: 1, a: 14 }, { a: 28 }, { s: 14, f: 2 }, { a: 8, n: 4 }], 'boss'),
    },
  },
  // v99 : les monstres des Îles Célestes — v : ils VOLENT TA VIE (ils se soignent en frappant)
  ciel: {
    normaux: [
      m('meduse_stellaire', 'Méduse stellaire', '🪼', 56, [{ a: 9, n: 2, v: 0.5 }, { w: 2, d: 12 }, { a: 15 }]),
      m('chouette_astre', 'Chouette d’astre', '🦉', 50, [{ a: 7, n: 3 }, { a: 14, v: 0.5 }, { f: 2, d: 10 }]),
      m('feu_follet', 'Feu follet céleste', '✨', 46, [{ b: 3, a: 8 }, { a: 16, v: 1 }, { s: 12 }]),
      m('golem_nuage', 'Golem de nuage', '☁️', 74, [{ d: 20, g: 8 }, { a: 18 }, { a: 10, n: 2, v: 0.5 }]),
      m('raie_nuees', 'Raie des nuées', '🐟', 54, [{ a: 12, v: 0.5 }, { t: 2, a: 8 }, { a: 7, n: 3 }]),
      m('pegase_noir', 'Pégase noir', '🐎', 60, [{ a: 15 }, { a: 8, n: 2, v: 0.5 }, { f: 2, d: 12 }]),
      m('gargouille_etoile', 'Gargouille d’étoile', '🗿', 66, [{ d: 18, e: 3 }, { a: 14, v: 0.5 }, { a: 20 }]),
    ],
    rare: m('constellation', 'Constellation vivante', '🌌', 96, [{ a: 10, n: 3, v: 0.5 }, { s: 18, g: 10 }, { a: 24 }], 'rare'),
    elite: m('chevalier_aube', 'Chevalier de l’aube', '⚔️', 144, [{ a: 24, v: 0.5 }, { d: 24, f: 2 }, { a: 11, n: 3 }, { g: 16, s: 12 }], 'elite'),
    boss: m('archange_argent', 'L’Archange d’argent', '😇', 210, [{ a: 12, n: 3, v: 0.5 }, { g: 20, s: 14 }, { a: 30 }, { w: 2, a: 16, v: 1 }, { f: 2, d: 22 }, { a: 9, n: 4 }], 'boss'),
    autres: {
      rare: m('vampire_astral', 'Vampire astral', '🦇', 90, [{ a: 14, v: 1 }, { w: 2, a: 9, n: 2 }, { a: 20, v: 0.5 }], 'rare'),
      elite: m('seraphin_dechu', 'Séraphin déchu', '👼', 150, [{ a: 10, n: 3, v: 0.5 }, { b: 4, a: 14 }, { a: 28 }, { g: 18, f: 1 }], 'elite'),
      boss: m('devoreuse_etoiles', 'La Dévoreuse d’étoiles', '🌑', 220, [{ g: 22 }, { a: 14, n: 3, v: 0.5 }, { w: 3, a: 18, v: 1 }, { a: 32 }, { s: 18, f: 2 }, { a: 10, n: 4, v: 0.5 }], 'boss'),
    },
  },
  // v98 : les monstres du Désert d'Ambre — m : ils te MARQUENT (à 3 marques, explosion qui ignore le bouclier)
  ambre: {
    normaux: [
      m('scorpion_ambre', 'Scorpion d’ambre', '🦂', 52, [{ a: 8, n: 2, m: 1 }, { d: 12 }, { a: 14 }]),
      m('momie', 'Momie errante', '🧟', 66, [{ a: 12, w: 1 }, { s: 10, d: 10 }, { a: 7, n: 2, m: 1 }]),
      m('chacal_dunes', 'Chacal des dunes', '🐕', 48, [{ a: 7, n: 2 }, { a: 13, m: 1 }, { f: 2 }]),
      m('serpent_sables', 'Serpent des sables', '🐍', 50, [{ a: 10, m: 1, w: 1 }, { e: 3, d: 10 }, { a: 6, n: 3 }]),
      m('scarabee_sacre', 'Scarabée sacré', '🪲', 58, [{ d: 16, e: 2 }, { a: 12, m: 1 }, { g: 8 }]),
      m('djinn_mirage', 'Djinn des mirages', '🧞', 44, [{ w: 2, m: 2 }, { a: 16 }, { s: 10, g: 8 }]),
      m('vautour_os', 'Vautour d’os', '🦅', 46, [{ a: 6, n: 3 }, { a: 12, m: 1 }, { d: 10, f: 1 }]),
    ],
    rare: m('sphinge_doree', 'Sphinge dorée', '🦁', 88, [{ a: 9, n: 3, m: 1 }, { d: 18, f: 1 }, { a: 22 }], 'rare'),
    elite: m('gardien_obsidienne', 'Gardien d’obsidienne', '🗿', 138, [{ a: 22, m: 1 }, { d: 22, f: 1 }, { a: 10, n: 3 }, { g: 16, w: 2 }], 'elite'),
    boss: m('pharaon_maudit', 'Le Pharaon maudit', '👑', 190, [{ a: 11, n: 2, m: 1 }, { g: 18, s: 12 }, { a: 28 }, { w: 2, m: 2, a: 13 }, { f: 2, d: 20 }, { a: 8, n: 4, m: 1 }], 'boss'),
    autres: {
      rare: m('mirage_vivant', 'Mirage vivant', '🌫️', 82, [{ s: 16, g: 10 }, { a: 16, m: 2 }, { a: 7, n: 3 }], 'rare'),
      elite: m('ver_sables', 'Ver des sables', '🪱', 145, [{ a: 9, n: 3, m: 1 }, { d: 20, f: 2 }, { a: 26 }, { g: 14, m: 2 }], 'elite'),
      boss: m('reine_scorpion', 'La Reine-scorpion', '🦂', 200, [{ g: 20 }, { a: 12, n: 3, m: 1 }, { w: 3, m: 2, a: 15 }, { a: 30 }, { s: 16, f: 2 }, { a: 9, n: 4 }], 'boss'),
    },
  },
  brisees: {
    normaux: [
      m('golem_vapeur', 'Golem de vapeur', '♨️', 40, [{ a: 9, t: 1 }, { d: 10 }, { a: 6, n: 1, b: 1 }]),
      m('liane_ardente', 'Liane ardente', '🌶️', 34, [{ a: 7, b: 2 }, { e: 2, d: 6 }, { a: 11 }]),
      m('spectre_brume', 'Spectre de brume', '🌫️', 30, [{ w: 2, a: 6 }, { a: 5, n: 2, t: 1 }, { g: 6 }]),
      m('chimere_faille', 'Chimère de la faille', '🦁', 44, [{ a: 12 }, { f: 2 }, { a: 5, n: 3 }]),
      m('eclat_vivant', 'Éclat vivant', '🔷', 26, [{ d: 8, e: 2 }, { a: 8 }, { s: 8 }]),
      m('rodeur_abime', 'Rôdeur de l’abîme', '👁️', 36, [{ a: 10, w: 1 }, { a: 4, n: 3 }, { d: 8 }]),
      m('tisseuse_vide', 'Tisseuse du vide', '🕸️', 32, [{ w: 2, t: 1 }, { a: 7, n: 2 }, { g: 6, s: 4 }]),
    ],
    rare: m('prisme', 'Prisme errant', '💠', 62, [{ a: 6, n: 3 }, { d: 14, e: 2 }, { s: 10, f: 1 }], 'rare'),
    elite: m('colosse_fusion', 'Colosse fusionné', '🗿', 88, [{ a: 16 }, { d: 16, f: 1 }, { a: 7, n: 2, b: 2 }, { g: 10 }], 'elite'),
    boss: m('coeur_faille', 'Le Cœur de la Faille', '🌀', 120, [{ a: 7, n: 2, b: 1, t: 1 }, { g: 10, s: 8 }, { a: 18 }, { w: 2, a: 10 }, { f: 2, d: 14 }, { a: 6, n: 4 }], 'boss'),
    autres: {
      rare: m('sentinelle_brisee', 'Sentinelle brisée', '🤖', 60, [{ d: 12 }, { a: 14 }, { a: 5, n: 2, w: 1 }], 'rare'),
      elite: m('hydre_fusion', 'Hydre des trois éléments', '🐲', 92, [{ a: 6, n: 3 }, { b: 2, t: 2, a: 8 }, { s: 12 }, { a: 18 }], 'elite'),
      boss: m('archonte_vide', 'L’Archonte du vide', '👑', 140, [{ g: 12 }, { a: 8, n: 3 }, { w: 3, a: 11 }, { a: 20 }, { s: 12, f: 2 }, { b: 3, t: 2, a: 10 }], 'boss'),
    },
  },
};
// la salle de ce type pour cette expédition : la version d'origine ou l'autre (v80), selon la graine
export const variante = (terr, type, graine) => { const M = MONSTRES[terr]; return M.autres?.[type] && ((graine >>> 0) + type.length) % 2 ? M.autres[type] : M[type]; };
// tous les monstres d'une terre (pour le grimoire et les statistiques), Cauchemar compris
export const tousDe = (terr) => { const M = MONSTRES[terr]; return [...M.normaux, M.rare, M.autres.rare, M.elite, M.autres.elite, M.boss, M.autres.boss, BOSS_CAUCHEMAR[terr]]; };
// les paliers : plus de PV et de dégâts, plus de butin
export const PALIERS = [
  { n: 1, nom: 'Palier I', pv: 1.3, deg: 1.2, butin: 1 },
  { n: 2, nom: 'Palier II', pv: 1.7, deg: 1.45, butin: 1.6 },
  { n: 3, nom: 'Palier III', pv: 2.2, deg: 1.9, butin: 2.4 },   // v95 : 1,75 → 1,9 (100 % de victoires en jeu)
  { n: 4, nom: 'Cauchemar', pv: 2.9, deg: 2.25, butin: 3.6, cauchemar: true },   // v95 : 2,6/2 → 2,9/2,25 (95 % de victoires en jeu)
];
// ---------- le palier IV « Cauchemar » ----------
// débloqué en battant le boss du palier III d'un territoire. Chaque expédition tire 2 malédictions au sort,
// les monstres sont « maudits » (plus forts, illustrations assombries) et le boss est un titan ancien.
export const MALEDICTIONS = {
  rage: { nom: 'Rage', ico: '😡', desc: 'Les monstres commencent chaque combat avec +2 de force.' },
  carapace: { nom: 'Carapaces', ico: '🐚', desc: 'Les monstres commencent chaque combat avec un bouclier (15 % de leurs PV).' },
  horde: { nom: 'Horde', ico: '👥', desc: 'Un monstre de plus dans les combats ordinaires.' },
  disette: { nom: 'Disette', ico: '🍂', desc: 'Les feux de camp soignent deux fois moins.' },
  epuisement: { nom: 'Épuisement', ico: '🥱', desc: 'Tu pioches 4 cartes au lieu de 5 au premier tour de chaque combat.' },
  vitalite: { nom: 'Vitalité', ico: '💗', desc: 'Les monstres regagnent 3 PV à la fin de leur tour.' },
  brouillard: { nom: 'Brouillard', ico: '🌫️', desc: 'Les intentions des monstres sont cachées.' },
};
export const BOSS_CAUCHEMAR = {
  feu: m('titan_magma', 'Titan primordial', '🌋', 100, [{ a: 12 }, { d: 12, f: 2 }, { a: 5, n: 3 }, { w: 2, a: 7 }, { b: 4, a: 9 }, { a: 16 }], 'boss'),
  eau: m('leviathan_abyssal', 'Léviathan des abysses', '🐋', 102, [{ a: 6, n: 2 }, { t: 2, d: 10 }, { a: 13 }, { f: 1, d: 10 }, { a: 4, n: 3 }, { t: 1, a: 15 }], 'boss'),
  ciel: m('etoile_mere', 'L’Étoile mère', '⭐', 265, [{ a: 20, v: 0.5 }, { g: 24, w: 2 }, { a: 10, n: 4, v: 0.5 }, { s: 22, f: 2 }, { b: 4, a: 18 }, { a: 40, v: 1 }], 'boss'),
  ambre: m('soleil_noir', 'Le Soleil noir', '🌑', 240, [{ a: 18, m: 1 }, { g: 22, w: 2 }, { a: 9, n: 4 }, { s: 20, f: 2 }, { b: 4, m: 2, a: 15 }, { a: 36 }], 'boss'),
  cimes: m('oeil_cyclone', 'L’Œil du Cyclone', '🌪️', 220, [{ a: 16, p: 1 }, { g: 20, w: 2 }, { a: 8, n: 4 }, { s: 18, f: 2 }, { b: 4, t: 3, a: 14, p: 1 }, { a: 34 }], 'boss'),
  brisees: m('neant_originel', 'Le Néant originel', '🕳️', 200, [{ a: 14 }, { g: 16, w: 2 }, { a: 7, n: 4 }, { s: 16, f: 2 }, { b: 4, t: 3, a: 12 }, { a: 28 }], 'boss'),
  plante: m('ancien_sylvain', 'Ancien sylvain', '🌳', 124, [{ a: 12, e: 3 }, { d: 14, f: 1 }, { a: 7, n: 3 }, { w: 2, a: 10 }, { a: 19 }, { e: 3, d: 10, f: 1 }], 'boss'),
};
