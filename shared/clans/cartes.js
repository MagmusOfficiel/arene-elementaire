// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les cartes (les sorts)
//  Chaque carte : coût en énergie, type, rareté, élément et une liste
//  d'effets appliqués dans l'ordre par le moteur de combat (combat.js).
//  Effets : degats (+ fois, + tous), bouclier, soin, brulure, trempe,
//  affaibli, epines, regen, force, pioche, energie,
//  degatsParBrulure (×), bouclierEnDegats, epuise (la carte disparaît
//  du combat une fois jouée).
//  Feu : gros dégâts et brûlure. Eau : bouclier, trempé (+50 % de
//  dégâts subis), pioche. Plante : soin, régénération, épines.
// =====================================================================
export const ELEMENTS = {
  feu: { nom: 'Feu', clan: 'Clan du Feu', couleur: '#e0552a', fonce: '#5a1a0a', ico: '🔥', materiau: 'braises', nomMat: 'Braises' },
  eau: { nom: 'Eau', clan: "Clan de l'Eau", couleur: '#2a8ae0', fonce: '#0a2a5a', ico: '💧', materiau: 'perles', nomMat: 'Perles' },
  plante: { nom: 'Plante', clan: 'Clan de la Plante', couleur: '#3aa84a', fonce: '#0e3a14', ico: '🌿', materiau: 'seve', nomMat: 'Sève' },
  neutre: { nom: 'Neutre', couleur: '#9a8a7a', fonce: '#2a2420', ico: '✦' },
};
export const CLANS = ['feu', 'eau', 'plante'];
// les classes : PV en plus ou en moins, un talent (géré par combat.js) et leurs propres cartes
export const CLASSES = {
  combattant: { nom: 'Combattant', ico: '⚔️', pv: 15, talent: 'Endurci', desc: 'Commence chaque combat avec 6 de bouclier.', depart: ['charge', 'rempart'] },
  mage: { nom: 'Mage', ico: '🔮', pv: -10, talent: 'Arcanes', desc: 'Le premier sort élémentaire de chaque tour coûte 1 énergie de moins.', depart: ['eclair_arcanique', 'bouclier_arcanique'] },
  tireur: { nom: 'Tireur', ico: '🏹', pv: 0, talent: 'Visée', desc: 'Une attaque sur trois inflige double dégâts.', depart: ['tir', 'piege'] },
  escrimeur: { nom: 'Escrimeur', ico: '🤺', pv: 0, talent: 'Enchaînement', desc: 'Chaque attaque jouée après une autre attaque, dans le même tour, inflige +2 dégâts par coup.', depart: ['estoc', 'parade'] },
};
export const LISTE_CLASSES = Object.keys(CLASSES);
export const RARETES = {
  commune: { nom: 'Commune', couleur: '#a8a8a8', eclats: 5 },
  rare: { nom: 'Rare', couleur: '#4a9ae8', eclats: 15 },
  epique: { nom: 'Épique', couleur: '#b05ae8', eclats: 40 },
  legendaire: { nom: 'Légendaire', couleur: '#f0b030', eclats: 100 },
};

const c = (id, nom, element, rarete, cout, type, ico, effets, classe = null) => ({ id, nom, element, rarete, cout, type, ico, effets, classe });
const k = (classe) => (id, nom, rarete, cout, type, ico, effets) => c(id, nom, 'neutre', rarete, cout, type, ico, effets, classe);
const CO = k('combattant'), MA = k('mage'), TI = k('tireur'), ES = k('escrimeur');
export const CARTES = Object.fromEntries([
  // ---- neutres (le deck de départ)
  c('frappe', 'Frappe', 'neutre', 'commune', 1, 'attaque', '🗡️', { degats: 6 }),
  c('garde', 'Garde', 'neutre', 'commune', 1, 'defense', '🛡️', { bouclier: 5 }),
  c('coup_double', 'Coup double', 'neutre', 'commune', 1, 'attaque', '⚔️', { degats: 4, fois: 2 }),
  c('concentration', 'Concentration', 'neutre', 'rare', 0, 'pouvoir', '🧘', { pioche: 2, epuise: true }),
  c('second_souffle', 'Second souffle', 'neutre', 'rare', 1, 'defense', '💨', { bouclier: 6, pioche: 1 }),
  // ---- feu
  c('etincelle', 'Étincelle', 'feu', 'commune', 0, 'attaque', '✨', { degats: 3, brulure: 2 }),
  c('flamme', 'Flamme', 'feu', 'commune', 1, 'attaque', '🔥', { degats: 8 }),
  c('tison', 'Tison', 'feu', 'commune', 1, 'attaque', '🪵', { degats: 5, brulure: 3 }),
  c('cendres', 'Rideau de cendres', 'feu', 'commune', 1, 'defense', '🌫️', { bouclier: 4, brulure: 2, tous: true }),
  c('boule_de_feu', 'Boule de feu', 'feu', 'rare', 2, 'attaque', '☄️', { degats: 14, brulure: 4 }),
  c('incendie', 'Incendie', 'feu', 'rare', 2, 'attaque', '🌋', { degats: 6, brulure: 3, tous: true }),
  c('combustion', 'Combustion', 'feu', 'rare', 1, 'attaque', '💥', { degatsParBrulure: 2 }),
  c('rage_ardente', 'Rage ardente', 'feu', 'rare', 1, 'pouvoir', '😤', { force: 2, epuise: true }),
  c('phenix', 'Phénix', 'feu', 'epique', 2, 'pouvoir', '🐦‍🔥', { soin: 10, force: 2, epuise: true }),
  c('meteore', 'Pluie de météores', 'feu', 'epique', 3, 'attaque', '🌠', { degats: 18, tous: true }),
  c('dragon', 'Souffle du dragon', 'feu', 'legendaire', 2, 'attaque', '🐉', { degats: 10, fois: 3 }),
  c('coeur_volcan', 'Cœur du volcan', 'feu', 'legendaire', 3, 'pouvoir', '❤️‍🔥', { brulure: 10, tous: true, force: 3, epuise: true }),
  // ---- eau
  c('jet', "Jet d'eau", 'eau', 'commune', 0, 'attaque', '💦', { degats: 4 }),
  c('vague', 'Vague', 'eau', 'commune', 1, 'attaque', '🌊', { degats: 6, trempe: 1 }),
  c('bulle', 'Bulle', 'eau', 'commune', 1, 'defense', '🫧', { bouclier: 7 }),
  c('maree', 'Marée', 'eau', 'commune', 1, 'defense', '🌀', { bouclier: 5, pioche: 1 }),
  c('tsunami', 'Tsunami', 'eau', 'rare', 2, 'attaque', '🌊', { degats: 9, trempe: 2, tous: true }),
  c('carapace', 'Carapace de nacre', 'eau', 'rare', 2, 'defense', '🐚', { bouclier: 14 }),
  c('ressac', 'Ressac', 'eau', 'rare', 1, 'attaque', '↩️', { bouclierEnDegats: true }),
  c('source', 'Source vive', 'eau', 'rare', 0, 'pouvoir', '⛲', { energie: 1, pioche: 1, epuise: true }),
  c('geyser', 'Geyser', 'eau', 'epique', 2, 'attaque', '⛲', { degats: 16, trempe: 2 }),
  c('brume', 'Brume glacée', 'eau', 'epique', 1, 'defense', '🌁', { bouclier: 6, affaibli: 2, tous: true }),
  c('leviathan', 'Léviathan', 'eau', 'legendaire', 3, 'attaque', '🐋', { degats: 30, trempe: 3 }),
  c('ocean', 'Océan éternel', 'eau', 'legendaire', 2, 'defense', '🌐', { bouclier: 20, pioche: 3, epuise: true }),
  // ---- plante
  c('ronce', 'Ronce', 'plante', 'commune', 1, 'attaque', '🌵', { degats: 5, epines: 2 }),
  c('seve', 'Sève', 'plante', 'commune', 1, 'defense', '🍃', { soin: 4, bouclier: 3 }),
  c('liane', 'Liane', 'plante', 'commune', 1, 'attaque', '🌿', { degats: 7, affaibli: 1 }),
  c('graine', 'Graine', 'plante', 'commune', 0, 'pouvoir', '🌱', { regen: 2 }),
  c('chene', 'Écorce de chêne', 'plante', 'rare', 2, 'defense', '🌳', { bouclier: 12, epines: 3 }),
  c('floraison', 'Floraison', 'plante', 'rare', 1, 'pouvoir', '🌸', { regen: 5, epuise: true }),
  c('spores', 'Spores', 'plante', 'rare', 2, 'attaque', '🍄', { degats: 5, affaibli: 2, tous: true }),
  c('croissance', 'Croissance', 'plante', 'rare', 1, 'pouvoir', '🌾', { force: 1, regen: 2, epuise: true }),
  c('fouet', 'Fouet épineux', 'plante', 'epique', 1, 'attaque', '🥀', { degats: 4, fois: 3 }),
  c('gardien', 'Gardien sylvestre', 'plante', 'epique', 2, 'defense', '🪵', { bouclier: 10, epines: 5 }),
  c('colere', 'Colère de la forêt', 'plante', 'legendaire', 2, 'attaque', '🌲', { degats: 8, fois: 2, tous: true }),
  c('arbre_monde', 'Arbre-monde', 'plante', 'legendaire', 3, 'pouvoir', '🌳', { soin: 15, bouclier: 15, regen: 4, epuise: true }),
  // ---- combattant
  CO('charge', 'Charge', 'commune', 1, 'attaque', '🐂', { degats: 9 }),
  CO('rempart', 'Rempart', 'commune', 1, 'defense', '🧱', { bouclier: 7 }),
  CO('fracas', 'Fracas', 'commune', 2, 'attaque', '🔨', { degats: 11, affaibli: 2 }),
  CO('coup_bouclier', 'Coup de bouclier', 'rare', 1, 'attaque', '🛡️', { bouclierEnDegats: true }),
  CO('tourbillon', 'Tourbillon', 'rare', 2, 'attaque', '🌪️', { degats: 8, tous: true }),
  CO('cri_guerre', 'Cri de guerre', 'rare', 1, 'pouvoir', '📯', { force: 2, affaibli: 1, tous: true, epuise: true }),
  CO('second_vent', 'Second vent', 'rare', 1, 'defense', '💪', { soin: 6, bouclier: 6 }),
  CO('forteresse', 'Forteresse', 'epique', 2, 'defense', '🏰', { bouclier: 16, epines: 3 }),
  CO('execution', 'Exécution', 'epique', 2, 'attaque', '🪓', { degats: 22, epuise: true }),
  CO('titan', 'Colère du titan', 'legendaire', 3, 'attaque', '🗿', { degats: 14, fois: 2, force: 2 }),
  // ---- mage
  MA('eclair_arcanique', 'Éclair arcanique', 'commune', 0, 'attaque', '⚡', { degats: 5 }),
  MA('bouclier_arcanique', 'Bouclier arcanique', 'commune', 1, 'defense', '🔷', { bouclier: 8 }),
  MA('missiles', 'Missiles magiques', 'commune', 1, 'attaque', '✴️', { degats: 3, fois: 3 }),
  MA('meditation', 'Méditation', 'rare', 0, 'pouvoir', '🧘', { pioche: 3, epuise: true }),
  MA('torrent', 'Torrent de mana', 'rare', 0, 'pouvoir', '💠', { energie: 2, epuise: true }),
  MA('nova', 'Nova', 'rare', 2, 'attaque', '💫', { degats: 10, tous: true }),
  MA('savoir', 'Savoir interdit', 'rare', 1, 'pouvoir', '📜', { pioche: 2, energie: 1 }),
  MA('transmutation', 'Transmutation', 'epique', 1, 'attaque', '⚗️', { degats: 6, brulure: 4, trempe: 1 }),
  MA('rayon', 'Rayon céleste', 'epique', 3, 'attaque', '🌟', { degats: 26 }),
  MA('archimage', 'Éveil de l’archimage', 'legendaire', 2, 'pouvoir', '🧙', { force: 3, energie: 1, pioche: 2, epuise: true }),
  // ---- tireur
  TI('tir', 'Tir', 'commune', 1, 'attaque', '🏹', { degats: 7 }),
  TI('piege', 'Piège', 'commune', 1, 'defense', '🪤', { bouclier: 5, affaibli: 1 }),
  TI('tir_rapide', 'Tir rapide', 'commune', 0, 'attaque', '➶', { degats: 4 }),
  TI('volee', 'Volée', 'rare', 1, 'attaque', '🎯', { degats: 3, fois: 3 }),
  TI('fleche_poison', 'Flèche empoisonnée', 'rare', 1, 'attaque', '☠️', { degats: 4, brulure: 4 }),
  TI('repli', 'Repli', 'rare', 1, 'defense', '🏃', { bouclier: 8, pioche: 1 }),
  TI('pluie_fleches', 'Pluie de flèches', 'rare', 2, 'attaque', '🌧️', { degats: 5, fois: 2, tous: true }),
  TI('oeil_faucon', 'Œil de faucon', 'epique', 1, 'pouvoir', '🦅', { force: 2, pioche: 1, epuise: true }),
  TI('tir_precis', 'Tir précis', 'epique', 2, 'attaque', '🎯', { degats: 17 }),
  TI('fleche_lourde', 'Flèche de siège', 'legendaire', 3, 'attaque', '🏹', { degats: 32, affaibli: 2 }),
  // ---- escrimeur
  ES('estoc', 'Estoc', 'commune', 0, 'attaque', '🗡️', { degats: 3 }),
  ES('parade', 'Parade', 'commune', 1, 'defense', '🤺', { bouclier: 6, epines: 2 }),
  ES('botte', 'Botte', 'commune', 1, 'attaque', '⚔️', { degats: 4, fois: 2 }),
  ES('fente', 'Fente', 'rare', 1, 'attaque', '🗡️', { degats: 9 }),
  ES('feinte', 'Feinte', 'rare', 0, 'pouvoir', '🎭', { affaibli: 2, pioche: 1 }),
  ES('garde_haute', 'Garde haute', 'rare', 1, 'defense', '🛡️', { bouclier: 9 }),
  ES('elan', 'Élan', 'rare', 0, 'pouvoir', '💨', { energie: 1, pioche: 1, epuise: true }),
  ES('danse_lames', 'Danse des lames', 'epique', 2, 'attaque', '🌀', { degats: 3, fois: 5 }),
  ES('coup_grace', 'Coup de grâce', 'epique', 2, 'attaque', '💀', { degats: 20, epuise: true }),
  ES('maitre_armes', 'Maître d’armes', 'legendaire', 1, 'pouvoir', '👑', { force: 2, energie: 2, pioche: 2, epuise: true }),
].map((x) => [x.id, x]));

// les effets qui grandissent quand on améliore une carte (niveau 1 à 3)
const CROISSANTS = ['degats', 'bouclier', 'soin', 'brulure', 'epines', 'regen'];
export const NIV_MAX = 3;
export function effetsDe(id, niv = 1) {
  const e = { ...CARTES[id].effets };
  for (const k of CROISSANTS) if (e[k]) e[k] = Math.round(e[k] * (1 + 0.3 * (niv - 1)));
  if (niv >= 3 && e.force) e.force += 1;
  return e;
}
// le texte d'une carte, construit depuis ses effets
export function decrire(id, niv = 1) {
  const e = effetsDe(id, niv), t = [], zone = e.tous ? ' à tous les ennemis' : '';
  if (e.degats) t.push(`Inflige ${e.degats} dégâts${e.fois > 1 ? ` ${e.fois} fois` : ''}${zone}.`);
  if (e.degatsParBrulure) t.push(`Inflige ${e.degatsParBrulure}× la brûlure de la cible.`);
  if (e.bouclierEnDegats) t.push('Inflige autant de dégâts que ton bouclier.');
  if (e.bouclier) t.push(`Gagne ${e.bouclier} bouclier.`);
  if (e.soin) t.push(`Soigne ${e.soin} PV.`);
  if (e.brulure) t.push(`Brûlure ${e.brulure}${e.degats ? '' : zone}.`);
  if (e.trempe) t.push(`Trempé ${e.trempe}${e.degats ? '' : zone}.`);
  if (e.affaibli) t.push(`Affaibli ${e.affaibli}${e.degats ? '' : zone}.`);
  if (e.epines) t.push(`Épines ${e.epines}.`);
  if (e.regen) t.push(`Régénération ${e.regen}.`);
  if (e.force) t.push(`+${e.force} Force.`);
  if (e.energie) t.push(`+${e.energie} énergie.`);
  if (e.pioche) t.push(`Pioche ${e.pioche} carte${e.pioche > 1 ? 's' : ''}.`);
  if (e.epuise) t.push('Épuisée.');
  return t.join(' ');
}
export const STATUTS = {
  brulure: { nom: 'Brûlure', ico: '🔥', desc: 'Perd autant de PV au début de son tour, puis la brûlure baisse de 1.' },
  trempe: { nom: 'Trempé', ico: '💧', desc: 'Subit 50 % de dégâts en plus. Baisse de 1 à chaque tour.' },
  affaibli: { nom: 'Affaibli', ico: '🥀', desc: 'Inflige 25 % de dégâts en moins. Baisse de 1 à chaque tour.' },
  epines: { nom: 'Épines', ico: '🌵', desc: 'Chaque attaque reçue renvoie ces dégâts à l’attaquant.' },
  regen: { nom: 'Régénération', ico: '💚', desc: 'Soigne autant de PV en fin de tour, puis baisse de 1.' },
  force: { nom: 'Force', ico: '💪', desc: 'Ajoute ces dégâts à chaque attaque.' },
};
// le deck de départ selon le clan
export const DECK_DEPART = {
  feu: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'etincelle', 'tison', 'flamme', 'cendres'],
  eau: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'vague', 'vague', 'jet', 'maree'],
  plante: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'ronce', 'ronce', 'liane', 'seve'],
};
// le deck de départ : 3 Frappe, 3 Garde, 2 cartes de la classe, 4 cartes de l'élément
export const deckDepart = (clan, classe) => ['frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', ...(CLASSES[classe]?.depart || []), ...DECK_DEPART[clan].slice(8)];
