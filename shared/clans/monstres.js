// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les monstres de chaque territoire
//  intentions : ce que le monstre fera à son tour, dans l'ordre, en boucle.
//  a : dégâts (n : nombre de coups), d : bouclier, f : force,
//  b : brûlure, t : trempé, w : affaibli (sur le joueur), e : épines.
// =====================================================================
export const TERRITOIRES = {
  feu: { nom: 'Terres de Braise', element: 'feu', ico: '🌋' },
  eau: { nom: "Lagons d'Azur", element: 'eau', ico: '🏝️' },
  plante: { nom: "Sylve d'Émeraude", element: 'plante', ico: '🌲' },
};

const m = (id, nom, ico, pv, intentions, rang = 'normal') => ({ id, nom, ico, pv, intentions, rang });
export const MONSTRES = {
  feu: {
    normaux: [
      m('salamandre', 'Salamandre', '🦎', 22, [{ a: 7 }, { a: 4, b: 2 }, { d: 6 }]),
      m('diablotin', 'Diablotin', '👺', 16, [{ a: 5, n: 2 }, { f: 2 }]),
      m('golem_cendre', 'Golem de cendre', '🗿', 38, [{ d: 10 }, { a: 12 }]),
      m('feu_follet', 'Feu follet', '🔥', 14, [{ b: 3 }, { a: 6 }]),
    ],
    rare: m('phenix_cendre', 'Phénix de cendre', '🐦‍🔥', 44, [{ a: 7, b: 3 }, { d: 8, f: 1 }, { a: 4, n: 3 }], 'rare'),
    elite: m('chimere', 'Chimère ardente', '🐲', 50, [{ a: 9, b: 2 }, { a: 5, n: 2 }, { f: 2, d: 6 }], 'elite'),
    boss: m('seigneur_magma', 'Seigneur du Magma', '👹', 90, [{ a: 13 }, { d: 12, f: 2 }, { a: 5, n: 3 }, { w: 2, a: 7 }, { b: 4, a: 8 }], 'boss'),
  },
  eau: {
    normaux: [
      m('crabe', 'Crabe-lame', '🦀', 24, [{ d: 8 }, { a: 8 }]),
      m('meduse', 'Méduse', '🪼', 18, [{ a: 4, w: 1 }, { a: 7 }]),
      m('sirene', 'Sirène', '🧜', 28, [{ t: 2 }, { a: 9 }]),
      m('anguille', 'Anguille', '🐍', 20, [{ a: 3, n: 3 }, { d: 5 }]),
    ],
    rare: m('tortue_dragon', 'Tortue-dragon', '🐢', 56, [{ d: 12 }, { a: 10, t: 1 }, { a: 6, n: 2 }], 'rare'),
    elite: m('kraken', 'Jeune kraken', '🦑', 52, [{ a: 4, n: 3 }, { d: 10 }, { a: 12, t: 1 }], 'elite'),
    boss: m('hydre', 'Hydre des abysses', '🐉', 95, [{ a: 7, n: 2 }, { f: 1, d: 8 }, { a: 14 }, { t: 1, d: 8 }, { a: 4, n: 3 }], 'boss'),
  },
  plante: {
    normaux: [
      m('champignon', 'Champignon', '🍄', 20, [{ w: 1, a: 5 }, { a: 7 }]),
      m('loup_ronces', 'Loup des ronces', '🐺', 26, [{ a: 6, n: 2 }, { a: 9 }]),
      m('treant', 'Tréant', '🌳', 40, [{ d: 12 }, { a: 11 }]),
      m('guepe', 'Guêpe géante', '🐝', 17, [{ a: 4, n: 2 }, { e: 2, a: 5 }]),
    ],
    rare: m('cerf_emeraude', "Cerf d'émeraude", '🦌', 48, [{ a: 9 }, { e: 3, d: 6 }, { a: 5, n: 2, w: 1 }], 'rare'),
    elite: m('mante', 'Mante géante', '🦗', 48, [{ a: 11 }, { a: 4, n: 3 }, { f: 2, e: 2 }], 'elite'),
    boss: m('reine_epine', 'Reine Épine', '🥀', 92, [{ a: 9, e: 2 }, { d: 12 }, { a: 5, n: 3 }, { w: 1, a: 8 }, { a: 15 }], 'boss'),
  },
};
// les paliers : plus de PV et de dégâts, plus de butin
export const PALIERS = [
  { n: 1, nom: 'Palier I', pv: 1.3, deg: 1.2, butin: 1 },
  { n: 2, nom: 'Palier II', pv: 1.7, deg: 1.45, butin: 1.6 },
  { n: 3, nom: 'Palier III', pv: 2.2, deg: 1.75, butin: 2.4 },
  { n: 4, nom: 'Cauchemar', pv: 2.6, deg: 2, butin: 3.6, cauchemar: true },
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
  plante: m('ancien_sylvain', 'Ancien sylvain', '🌳', 124, [{ a: 12, e: 3 }, { d: 14, f: 1 }, { a: 7, n: 3 }, { w: 2, a: 10 }, { a: 19 }, { e: 3, d: 10, f: 1 }], 'boss'),
};
