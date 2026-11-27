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
  // v87 : les Terres Brisées (pas un clan : une région, son matériau et sa ressource rare)
  brisees: { nom: 'Faille', couleur: '#8a60e0', fonce: '#1a0e2a', ico: '🌀', materiau: 'fragments', nomMat: 'Fragments de faille' },
  // v96 : les Cimes Orageuses
  cimes: { nom: 'Tempête', couleur: '#4a90d8', fonce: '#0e1a2e', ico: '⚡', materiau: 'plumes', nomMat: 'Plumes d’orage' },
  // v99 : les Îles Célestes
  ciel: { nom: 'Étoiles', couleur: '#b090ff', fonce: '#14102e', ico: '🌌', materiau: 'poussiere_etoile', nomMat: 'Poussière d’étoile' },
  // v98 : le Désert d'Ambre
  ambre: { nom: 'Ambre', couleur: '#e0a030', fonce: '#3a2008', ico: '🏜️', materiau: 'sable_dore', nomMat: 'Sable doré' },
};
export const CLANS = ['feu', 'eau', 'plante'];
// les ressources rares : une par territoire, ramassée sur les filons ou sur les monstres rares
export const RARES = {
  feu: { id: 'cristal', nom: 'Cristal de lave', ico: '💎' },
  eau: { id: 'perle_noire', nom: 'Perle noire', ico: '⚫' },
  plante: { id: 'graine_or', nom: "Graine d'or", ico: '🌰' },
  brisees: { id: 'eclat_vide', nom: 'Éclat du vide', ico: '🔷' },
  cimes: { id: 'cristal_foudre', nom: 'Cristal de foudre', ico: '⚡' },
  ambre: { id: 'larme_ambre', nom: 'Larme d’ambre', ico: '🟠' },
  ciel: { id: 'coeur_etoile', nom: 'Cœur d’étoile', ico: '⭐' },
};
export const RECETTES = { epique: { rare: 6, essence: 300 }, legendaire: { rare: 15, essence: 800 } };
// les classes : PV en plus ou en moins, un talent (géré par combat.js) et leurs propres cartes
export const CLASSES = {
  combattant: { nom: 'Combattant', ico: '⚔️', pv: 15, talent: 'Endurci', desc: 'Commence chaque combat avec 6 de bouclier.', depart: ['charge', 'rempart'] },
  mage: { nom: 'Mage', ico: '🔮', pv: -10, talent: 'Arcanes', desc: 'Le premier sort élémentaire de chaque tour coûte 1 énergie de moins.', depart: ['eclair_arcanique', 'bouclier_arcanique'] },
  tireur: { nom: 'Tireur', ico: '🏹', pv: 0, talent: 'Visée', desc: 'Une attaque sur trois inflige double dégâts.', depart: ['tir', 'piege'] },
  escrimeur: { nom: 'Escrimeur', ico: '🤺', pv: 0, talent: 'Enchaînement', desc: 'Chaque attaque jouée après une autre attaque, dans le même tour, inflige +2 dégâts par coup.', depart: ['estoc', 'parade'] },
};
export const LISTE_CLASSES = Object.keys(CLASSES);
// ---------- les branches (v69) : au niveau 20, chaque classe choisit sa spécialisation ----------
// le talent de la branche s'ajoute à celui de la classe (géré par combat.js et duel.js)
export const NIV_ASCENSION = 20;
export const BRANCHES = {
  gardien: { classe: 'combattant', nom: 'Gardien', ico: '🛡️', talent: 'Égide', desc: 'Endurci donne 10 de bouclier, et chaque carte Défense donne 2 bouclier de plus.', titre: 'Gardien inébranlable' },
  berserker: { classe: 'combattant', nom: 'Berserker', ico: '🪓', talent: 'Furie', desc: 'Tes attaques infligent +1 dégât par tranche de 8 PV qui te manquent.', titre: 'Berserker furieux' },
  archimage: { classe: 'mage', nom: 'Archimage', ico: '📖', talent: 'Double arcane', desc: 'Arcanes s’applique aux deux premiers sorts élémentaires de chaque tour.', titre: 'Archimage' },
  invocateur: { classe: 'mage', nom: 'Invocateur', ico: '🐾', talent: 'Esprit lié', desc: 'Commence chaque combat avec Appel 3 : un esprit frappe un ennemi au début de chacun de tes tours.', titre: 'Maître des esprits' },
  sniper: { classe: 'tireur', nom: 'Sniper', ico: '🎯', talent: 'Œil de lynx', desc: 'Visée double une attaque sur deux, au lieu d’une sur trois.', titre: 'Œil de lynx' },
  artificier: { classe: 'tireur', nom: 'Artificier', ico: '💣', talent: 'Poudre noire', desc: 'Tes attaques qui touchent tous les ennemis infligent +3 dégâts.', titre: 'Artificier fou' },
  duelliste: { classe: 'escrimeur', nom: 'Duelliste', ico: '⚜️', talent: 'Crescendo', desc: 'Enchaînement donne +2 par attaque déjà jouée ce tour (+2, +4, +6…).', titre: 'Lame virtuose' },
  ombre: { classe: 'escrimeur', nom: 'Lame d’ombre', ico: '🌑', talent: 'Lame sournoise', desc: 'Ta première attaque de chaque tour applique Affaibli 1.', titre: 'Lame d’ombre' },
};
export const branchesDe = (classe) => Object.keys(BRANCHES).filter((b) => BRANCHES[b].classe === classe);
// ---------- les chefs de guerre (v122) : au niveau 50, la Consécration ----------
// un duel contre le Fantôme de l'ancien chef ; victoire → le titre, le talent du chef et ses 3 sorts.
// Un chef par branche : changer de branche (parchemin) change aussi de chef.
export const NIV_CHEF = 50;
export const CHEFS = {
  porte_banniere: { branche: 'gardien', nom: 'Porte-Bannière', ico: '🚩', talent: 'Rempart du clan', desc: 'La moitié de ton bouclier inutilisé reste au tour suivant.', titre: 'Porte-Bannière' },
  chef_horde: { branche: 'berserker', nom: 'Chef de Horde', ico: '🐗', talent: 'Sang de la horde', desc: '+1 énergie à chaque tour tant que tu es sous 50 % de tes PV.', titre: 'Chef de Horde' },
  grand_arcaniste: { branche: 'archimage', nom: 'Grand Arcaniste', ico: '🌌', talent: 'Résonance', desc: 'La 3e carte que tu joues à chaque tour te rend 2 énergie.', titre: 'Grand Arcaniste' },
  seigneur_betes: { branche: 'invocateur', nom: 'Seigneur des Bêtes', ico: '🦁', talent: 'Roi de la meute', desc: 'Tes alliés invoqués ont +50 % de PV et frappent deux fois.', titre: 'Seigneur des Bêtes' },
  oeil_aigle: { branche: 'sniper', nom: 'Œil de l’Aigle', ico: '🦅', talent: 'Premier sang', desc: 'Ta première attaque du combat inflige triple dégâts.', titre: 'Œil de l’Aigle' },
  maitre_artilleur: { branche: 'artificier', nom: 'Maître Artilleur', ico: '🧨', talent: 'Obus élémentaires', desc: 'Tes attaques sur tous les ennemis appliquent aussi Brûlure 2 (Feu), Trempé 1 (Eau) ou Affaibli 1 (Plante).', titre: 'Maître Artilleur' },
  champion_clan: { branche: 'duelliste', nom: 'Champion du Clan', ico: '🏆', talent: 'Second souffle', desc: 'Ta 2e attaque de chaque tour te rend 1 énergie.', titre: 'Champion du Clan' },
  main_noire: { branche: 'ombre', nom: 'Main Noire', ico: '✋', talent: 'Coup de grâce', desc: 'Tes attaques infligent +3 dégâts aux cibles affaiblies.', titre: 'Main Noire' },
};
export const chefDe = (branche) => Object.keys(CHEFS).find((k) => CHEFS[k].branche === branche) || null;
export const RARETES = {
  commune: { nom: 'Commune', couleur: '#a8a8a8', eclats: 5 },
  rare: { nom: 'Rare', couleur: '#4a9ae8', eclats: 15 },
  epique: { nom: 'Épique', couleur: '#b05ae8', eclats: 40 },
  legendaire: { nom: 'Légendaire', couleur: '#f0b030', eclats: 100 },
};

const c = (id, nom, element, rarete, cout, type, ico, effets, classe = null, exclusif = null) => ({ id, nom, element, rarete, cout, type, ico, effets, classe, exclusif });
const X = (terr) => (id, nom, rarete, cout, type, ico, effets) => c(id, nom, terr, rarete, cout, type, ico, effets, null, terr);
const k = (classe) => (id, nom, rarete, cout, type, ico, effets) => c(id, nom, 'neutre', rarete, cout, type, ico, effets, classe);
const CO = k('combattant'), MA = k('mage'), TI = k('tireur'), ES = k('escrimeur');
// une carte de branche : elle appartient à la classe ET à la branche
const br = (branche) => (id, nom, rarete, cout, type, ico, effets) => ({ ...c(id, nom, 'neutre', rarete, cout, type, ico, effets, BRANCHES[branche].classe), branche });
// une carte de chef (v122) : elle appartient à la classe, à la branche ET au chef
const ch = (chef) => (id, nom, rarete, cout, type, ico, effets) => ({ ...c(id, nom, 'neutre', rarete, cout, type, ico, effets, BRANCHES[CHEFS[chef].branche].classe), branche: CHEFS[chef].branche, chef });
const PB = ch('porte_banniere'), CH = ch('chef_horde'), GR = ch('grand_arcaniste'), SB = ch('seigneur_betes'), OA = ch('oeil_aigle'), MA2 = ch('maitre_artilleur'), CC = ch('champion_clan'), MN = ch('main_noire');
const GA = br('gardien'), BE = br('berserker'), AR = br('archimage'), IN = br('invocateur'), SN = br('sniper'), AF = br('artificier'), DU = br('duelliste'), OM = br('ombre');
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
  c('combustion', 'Combustion', 'feu', 'rare', 1, 'attaque', '💥', { degatsParBrulure: 1.5 }),   // v95 : ×2 → ×1,5 (47 dégâts en moyenne pour 1 énergie)
  c('rage_ardente', 'Rage ardente', 'feu', 'rare', 1, 'pouvoir', '😤', { force: 2, epuise: true }),
  c('phenix', 'Phénix', 'feu', 'epique', 2, 'pouvoir', '🐦‍🔥', { soin: 10, force: 2, epuise: true }),
  c('meteore', 'Pluie de météores', 'feu', 'epique', 3, 'attaque', '🌠', { degats: 18, tous: true }),
  c('dragon', 'Souffle du dragon', 'feu', 'legendaire', 2, 'attaque', '🐉', { degats: 10, fois: 3 }),
  c('coeur_volcan', 'Cœur du volcan', 'feu', 'legendaire', 3, 'pouvoir', '❤️‍🔥', { brulure: 10, tous: true, force: 3, epuise: true }),
  // v123 : nouvelles mécaniques du feu — attiser, se consumer, l'aura ardente, renaître de ses cendres
  c('embrasement', 'Embrasement', 'feu', 'rare', 1, 'attaque', '🔥', { degats: 4, doubleBrulure: true }),
  c('fournaise', 'Fournaise intérieure', 'feu', 'rare', 0, 'pouvoir', '♨️', { energie: 2, brulureSoi: 3 }),
  c('mur_flammes', 'Mur de flammes', 'feu', 'epique', 1, 'defense', '🧱', { bouclier: 7, ardeur: 4 }),
  c('cendres_phenix', 'Cendres du phénix', 'feu', 'legendaire', 2, 'pouvoir', '🪶', { renaissance: 30, epuise: true }),
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
  // v123 : nouvelles mécaniques de l'eau — laver, se fondre dans la brume, le reflux, la marée qui monte
  c('source_pure', 'Source pure', 'eau', 'rare', 1, 'defense', '💧', { bouclier: 7, purifie: true }),
  c('retour_flots', 'Retour des flots', 'eau', 'rare', 1, 'pouvoir', '🔄', { reflux: 1, bouclier: 3 }),
  c('voile_brume', 'Voile de brume', 'eau', 'epique', 1, 'defense', '🌫️', { esquive: 1, pioche: 1 }),
  c('maree_montante', 'Marée montante', 'eau', 'legendaire', 2, 'attaque', '🌊', { degats: 6, degatsParMain: 3 }),
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
  // v123 : nouvelles mécaniques de la plante — pousser, bourgeonner, s'enraciner, la photosynthèse
  c('pousse', 'Pousse vivace', 'plante', 'rare', 1, 'attaque', '🌱', { degats: 5, pousse: 3 }),
  c('bourgeon', 'Bourgeon', 'plante', 'rare', 1, 'defense', '🌷', { bouclier: 5, bourgeon: 12 }),
  c('racines', 'Racines profondes', 'plante', 'epique', 1, 'defense', '🪴', { regen: 2, bouclierParRegen: 3 }),
  c('photosynthese', 'Photosynthèse', 'plante', 'legendaire', 1, 'pouvoir', '☀️', { pioche: 2, energieProchain: 3 }),
  // ---- cartes exclusives : elles ne sortent pas aux tirages, on les fabrique avec les ressources rares d'un territoire
  X('feu')('lance_magma', 'Lance de magma', 'epique', 2, 'attaque', '🔱', { degats: 12, brulure: 6 }),
  X('feu')('coeur_phenix', 'Cœur de phénix', 'legendaire', 3, 'pouvoir', '🔥', { soin: 20, force: 3, brulure: 5, tous: true, epuise: true }),
  X('eau')('perle_abysses', 'Perle des abysses', 'epique', 1, 'defense', '🦪', { bouclier: 10, pioche: 2 }),
  X('eau')('trident', 'Trident du roi des mers', 'legendaire', 2, 'attaque', '🔱', { degats: 12, fois: 2, trempe: 2 }),
  X('plante')('seve_doree', 'Sève dorée', 'epique', 1, 'defense', '🍯', { soin: 8, regen: 4 }),
  X('plante')('couronne', "Couronne de l'arbre-monde", 'legendaire', 2, 'pouvoir', '👑', { bouclier: 12, epines: 6, force: 2, epuise: true }),
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
  // ---- v84 : piocher, dupliquer, réduire les coûts
  c('reflexion', 'Réflexion', 'neutre', 'commune', 1, 'pouvoir', '🤔', { pioche: 2 }),
  c('miroir', 'Miroir', 'neutre', 'rare', 1, 'pouvoir', '🪞', { dupliquer: 1 }),
  c('souffle_vif', 'Souffle vif', 'neutre', 'rare', 1, 'pouvoir', '🌬️', { reduction: 1, pioche: 1, epuise: true }),
  c('echo', 'Écho', 'neutre', 'epique', 2, 'pouvoir', '🔁', { dupliquer: 2, epuise: true }),
  c('grimoire_infini', 'Grimoire infini', 'neutre', 'legendaire', 2, 'pouvoir', '📖', { reduction: 1, pioche: 2, dupliquer: 1, epuise: true }),
  c('brasier_vif', 'Brasier vif', 'feu', 'rare', 1, 'attaque', '🔥', { degats: 5, brulure: 1, pioche: 1 }),
  c('flammes_jumelles', 'Flammes jumelles', 'feu', 'epique', 1, 'pouvoir', '♊', { dupliquer: 1, force: 1 }),
  c('reflux', 'Reflux', 'eau', 'epique', 1, 'pouvoir', '🌊', { reduction: 1, bouclier: 4 }),
  c('courant', 'Courant porteur', 'eau', 'commune', 1, 'defense', '💧', { bouclier: 4, pioche: 1 }),
  c('bouture', 'Bouture', 'plante', 'rare', 1, 'pouvoir', '🌿', { dupliquer: 1, regen: 1 }),
  c('germination', 'Germination', 'plante', 'commune', 1, 'defense', '🌱', { bouclier: 4, pioche: 1 }),
  CO('plan_bataille', 'Plan de bataille', 'rare', 1, 'pouvoir', '🗺️', { reduction: 1, pioche: 1, epuise: true }),
  MA('reflet', 'Reflet arcanique', 'epique', 1, 'pouvoir', '🔮', { dupliquer: 2 }),
  TI('carquois', 'Carquois plein', 'rare', 1, 'pouvoir', '🏹', { pioche: 3, epuise: true }),
  ES('estocade_vive', 'Estocade vive', 'commune', 0, 'attaque', '🤺', { degats: 3, pioche: 1 }),
  // ---- v87 : les invocations (Chapitre 2) — on les forge avec des éclats du vide des Terres Brisées
  c('loup_spectral', 'Loup spectral', 'neutre', 'epique', 1, 'pouvoir', '🐺', { invoque: { nom: 'Loup spectral', img: 'loup_spectral', ico: '🐺', pv: 12, deg: 5 } }, null, 'brisees'),
  c('golem_pierre', 'Golem de pierre', 'neutre', 'epique', 2, 'pouvoir', '🗿', { invoque: { nom: 'Golem de pierre', img: 'golem_pierre', ico: '🗿', pv: 30, deg: 3 }, bouclier: 4 }, null, 'brisees'),
  c('esprit_faille', 'Esprit de la faille', 'neutre', 'legendaire', 2, 'pouvoir', '🌀', { invoque: { nom: 'Esprit de la faille', img: 'esprit_faille', ico: '🌀', pv: 22, deg: 7 }, pioche: 1 }, null, 'brisees'),
  c('dragonnet', 'Dragonnet élémentaire', 'neutre', 'legendaire', 3, 'pouvoir', '🐉', { invoque: { nom: 'Dragonnet', img: 'dragonnet', ico: '🐉', pv: 26, deg: 9 }, brulure: 2, tous: true }, null, 'brisees'),
  // ---- v96 : les cartes de la tempête (Chapitre 3) — forgées avec des cristaux de foudre ; elles ÉTOURDISSENT
  c('chaine_eclairs', 'Chaîne d’éclairs', 'neutre', 'epique', 2, 'attaque', '⚡', { degats: 7, tous: true, trempe: 1 }, null, 'cimes'),
  c('oeil_tempete', 'Œil de la tempête', 'neutre', 'epique', 1, 'pouvoir', '🌀', { etourdit: 1, pioche: 1 }, null, 'cimes'),
  c('marteau_tonnerre', 'Marteau du tonnerre', 'neutre', 'legendaire', 2, 'attaque', '🔨', { degats: 18, etourdit: 1 }, null, 'cimes'),
  c('avatar_tempete', 'Avatar de la tempête', 'neutre', 'legendaire', 3, 'attaque', '🌩️', { degats: 10, tous: true, etourdit: 1, epuise: true }, null, 'cimes'),
  // ---- v98 : les cartes du désert (Chapitre 4) — forgées avec des larmes d'ambre ; elles MARQUENT (3 marques = explosion de 20)
  c('sable_aveuglant', 'Sable aveuglant', 'neutre', 'epique', 1, 'pouvoir', '🌪️', { marque: 1, affaibli: 1, tous: true }, null, 'ambre'),
  c('fleche_scarabee', 'Flèche du scarabée', 'neutre', 'epique', 1, 'attaque', '🪲', { degats: 6, marque: 2 }, null, 'ambre'),
  c('oeil_ra', 'Œil du soleil', 'neutre', 'legendaire', 2, 'attaque', '☀️', { degats: 8, tous: true, marque: 1, pioche: 1 }, null, 'ambre'),
  c('jugement_pharaon', 'Jugement du pharaon', 'neutre', 'legendaire', 2, 'attaque', '⚱️', { degats: 10, marque: 3, epuise: true }, null, 'ambre'),
  // ---- v99 : les cartes des étoiles (Chapitre 5) — forgées avec des cœurs d'étoile ; elles VOLENT LA VIE
  c('morsure_astrale', 'Morsure astrale', 'neutre', 'epique', 1, 'attaque', '🌙', { degats: 8, volVie: 0.5 }, null, 'ciel'),
  c('faux_etoiles', 'Faux des étoiles', 'neutre', 'epique', 1, 'attaque', '✨', { degats: 5, tous: true, volVie: 0.5 }, null, 'ciel'),
  c('comete_vorace', 'Comète vorace', 'neutre', 'legendaire', 2, 'attaque', '☄️', { degats: 6, fois: 3, volVie: 0.5 }, null, 'ciel'),
  c('festin_etoiles', 'Festin des étoiles', 'neutre', 'legendaire', 2, 'attaque', '🌠', { degats: 14, volVie: 1, epuise: true }, null, 'ciel'),
  // ---- v102 : les cartes de fusion — un élément (Feu, Eau, Plante) mêlé à une région des chapitres 2 à 5.
  // Une par élément et par région ; on les forge à l'atelier avec la ressource rare de la région.
  c('flamme_neant', 'Flamme du Néant', 'feu', 'epique', 1, 'attaque', '🟣', { degats: 6, brulure: 2, affaibli: 1 }, null, 'brisees'),
  c('maree_neant', 'Marée du Néant', 'eau', 'epique', 1, 'defense', '🌊', { bouclier: 7, affaibli: 1, tous: true }, null, 'brisees'),
  c('ronces_neant', 'Ronces du Néant', 'plante', 'epique', 1, 'pouvoir', '🥀', { epines: 4, affaibli: 1 }, null, 'brisees'),
  c('vapeur_orage', 'Vapeur d’orage', 'feu', 'epique', 2, 'attaque', '♨️', { degats: 9, brulure: 2, etourdit: 1 }, null, 'cimes'),
  c('blizzard', 'Blizzard', 'eau', 'epique', 2, 'attaque', '❄️', { degats: 5, tous: true, trempe: 1 }, null, 'cimes'),
  c('pin_givre', 'Pin de givre', 'plante', 'epique', 1, 'defense', '🌲', { bouclier: 6, epines: 3 }, null, 'cimes'),
  c('mirage_ardent', 'Mirage ardent', 'feu', 'epique', 1, 'attaque', '🔥', { degats: 5, brulure: 1, marque: 1 }, null, 'ambre'),
  c('oasis', 'Oasis', 'eau', 'epique', 1, 'defense', '🏝️', { soin: 6, bouclier: 4 }, null, 'ambre'),
  c('cactus_geant', 'Cactus géant', 'plante', 'epique', 1, 'pouvoir', '🌵', { epines: 5, marque: 1 }, null, 'ambre'),
  c('comete_feu', 'Comète de feu', 'feu', 'epique', 2, 'attaque', '☄️', { degats: 10, brulure: 2, volVie: 0.5 }, null, 'ciel'),
  c('pluie_etoiles', 'Pluie d’étoiles', 'eau', 'epique', 2, 'attaque', '🌠', { degats: 4, fois: 2, tous: true, volVie: 0.25 }, null, 'ciel'),
  c('seve_etoiles', 'Sève des étoiles', 'plante', 'epique', 1, 'defense', '✨', { soin: 7, regen: 3 }, null, 'ciel'),
  // ---- les cartes de branche (v69) : seulement à l'autel, seulement pour sa branche
  GA('gd_egide', 'Égide', 'rare', 1, 'defense', '🔰', { bouclier: 10, epines: 2 }),
  GA('gd_represailles', 'Représailles', 'rare', 1, 'attaque', '💢', { bouclierEnDegats: true, bouclier: 4 }),
  GA('gd_bastion', 'Bastion vivant', 'epique', 2, 'defense', '🏯', { doubleBouclier: true, bouclier: 6 }),
  GA('gd_serment', 'Serment du gardien', 'epique', 1, 'pouvoir', '🤞', { epines: 5, regen: 3, epuise: true }),
  GA('gd_mur', 'Mur éternel', 'legendaire', 3, 'defense', '🗿', { bouclier: 30, epines: 6 }),
  GA('gd_jugement', 'Jugement de l’égide', 'legendaire', 2, 'attaque', '⚖️', { bouclierEnDegats: true, tous: true, bouclier: 8 }),
  BE('bs_entaille', 'Entaille sauvage', 'rare', 1, 'attaque', '🩸', { degats: 9, rage: 6 }),
  BE('bs_soif', 'Soif de sang', 'rare', 0, 'pouvoir', '🍷', { sacrifice: 4, energie: 2 }),
  BE('bs_frenesie', 'Frénésie', 'epique', 2, 'attaque', '🌀', { degats: 6, fois: 3, rage: 8 }),
  BE('bs_hurlement', 'Hurlement bestial', 'epique', 1, 'pouvoir', '🐺', { sacrifice: 6, force: 4, epuise: true }),
  BE('bs_carnage', 'Carnage', 'legendaire', 2, 'attaque', '💀', { degats: 12, tous: true, rage: 5 }),
  BE('bs_fureur', 'Fureur immortelle', 'legendaire', 1, 'pouvoir', '🔥', { soin: 15, force: 3, regen: 4, epuise: true }),
  AR('am_prisme', 'Prisme élémentaire', 'rare', 1, 'attaque', '🔺', { degats: 7, brulure: 2, trempe: 1 }),
  AR('am_flux', 'Flux arcanique', 'rare', 0, 'pouvoir', '🌊', { energie: 1, pioche: 2 }),
  AR('am_tempete', 'Tempête des quatre vents', 'epique', 2, 'attaque', '🌪️', { degats: 10, tous: true, affaibli: 1, trempe: 1 }),
  AR('am_canalisation', 'Canalisation', 'epique', 1, 'pouvoir', '🔋', { energie: 3, epuise: true }),
  AR('am_singularite', 'Singularité', 'legendaire', 3, 'attaque', '🕳️', { degats: 34 }),
  AR('am_grimoire', 'Grimoire infini', 'legendaire', 1, 'pouvoir', '📚', { pioche: 4, energie: 2, force: 2, epuise: true }),
  IN('iv_lien', 'Lien d’âme', 'rare', 1, 'pouvoir', '🔗', { appel: 2, bouclier: 4 }),
  IN('iv_morsure', 'Morsure spectrale', 'rare', 1, 'attaque', '👻', { degats: 7, appel: 1 }),
  IN('iv_meute', 'Appel de la meute', 'epique', 2, 'pouvoir', '🐺', { appel: 4, epuise: true }),
  IN('iv_totem', 'Totem protecteur', 'epique', 1, 'defense', '🪵', { bouclier: 9, regen: 3 }),
  IN('iv_pacte', 'Pacte des esprits', 'legendaire', 2, 'pouvoir', '🕯️', { appel: 6, force: 2, epuise: true }),
  IN('iv_colosse', 'Colosse invoqué', 'legendaire', 3, 'attaque', '🗻', { degats: 18, appel: 3 }),
  SN('sn_marque', 'Marque du chasseur', 'rare', 0, 'pouvoir', '❌', { trempe: 2, pioche: 1 }),
  SN('sn_precis', 'Tir précis', 'rare', 1, 'attaque', '🎯', { degats: 11 }),
  SN('sn_perforant', 'Tir perforant', 'epique', 2, 'attaque', '➶', { degats: 16, trempe: 2 }),
  SN('sn_patience', 'Patience du chasseur', 'epique', 1, 'pouvoir', '⏳', { force: 3, bouclier: 6, epuise: true }),
  SN('sn_balle', 'Balle d’argent', 'legendaire', 2, 'attaque', '🌙', { degats: 20, epuise: true }),   // v95 : 30 → 20 (116 dégâts en moyenne par tir en jeu)
  SN('sn_pluie', 'Pluie de flèches', 'legendaire', 3, 'attaque', '🏹', { degats: 5, fois: 4, tous: true }),
  AF('af_grenade', 'Grenade', 'rare', 1, 'attaque', '💣', { degats: 6, tous: true }),
  AF('af_mine', 'Mine incendiaire', 'rare', 1, 'attaque', '🧨', { degats: 4, brulure: 4, tous: true }),
  AF('af_tourelle', 'Tourelle mécanique', 'epique', 2, 'pouvoir', '⚙️', { appel: 3, bouclier: 5 }),
  AF('af_fumigene', 'Fumigène', 'epique', 1, 'defense', '💨', { bouclier: 8, affaibli: 2, tous: true }),
  AF('af_barrage', 'Barrage d’artillerie', 'legendaire', 3, 'attaque', '🎆', { degats: 9, fois: 2, tous: true }),
  AF('af_dynamite', 'Méga-dynamite', 'legendaire', 2, 'attaque', '💥', { degats: 20, tous: true, sacrifice: 5 }),
  DU('du_feinte', 'Feinte', 'rare', 0, 'attaque', '🎭', { degats: 4, pioche: 1 }),
  DU('du_riposte', 'Riposte', 'rare', 1, 'defense', '🔄', { bouclier: 6, epines: 4 }),
  DU('du_ballet', 'Ballet de lames', 'epique', 1, 'attaque', '💃', { degats: 3, fois: 4 }),
  DU('du_elan', 'Élan du duelliste', 'epique', 0, 'pouvoir', '🏃', { energie: 2, pioche: 1, epuise: true }),
  DU('du_mille', 'Mille entailles', 'legendaire', 2, 'attaque', '✨', { degats: 4, fois: 6 }),
  DU('du_grace', 'Coup de grâce', 'legendaire', 1, 'attaque', '🗡️', { degats: 15, force: 2 }),
  OM('om_poison', 'Lame empoisonnée', 'rare', 1, 'attaque', '🧪', { degats: 6, affaibli: 2 }),
  OM('om_voile', 'Voile d’ombre', 'rare', 1, 'defense', '🌫️', { bouclier: 8, pioche: 1 }),
  OM('om_assassinat', 'Assassinat', 'epique', 2, 'attaque', '🔪', { degats: 6, degatsParAffaibli: 6 }),
  OM('om_brume', 'Brume noire', 'epique', 1, 'pouvoir', '🌑', { affaibli: 3, tous: true, epuise: true }),
  OM('om_execution', 'Exécution silencieuse', 'legendaire', 2, 'attaque', '🥷', { degats: 18, affaibli: 3 }),
  OM('om_nuee', 'Nuée de dagues', 'legendaire', 2, 'attaque', '🌠', { degats: 3, fois: 5, tous: true, affaibli: 1 }),
  // ---- v124 : la Fêlure, carte parasite que le Briseur de mondes glisse dans ton deck (jamais dans une collection)
  { ...c('felure', 'Fêlure', 'neutre', 'commune', 1, 'pouvoir', '🪨', { parasite: true, epuise: true }), cachee: true },
  // ---- v124 : les trophées des Seigneurs de chapitre — une légendaire unique, gagnée en battant le Seigneur (jamais aux tirages)
  { ...c('coeur_triarque', 'Cœur du Triarque', 'neutre', 'legendaire', 2, 'attaque', '🔱', { degats: 8, brulure: 3, trempe: 1, affaibli: 1, tous: true }), trophee: 'triarque' },
  { ...c('eclat_briseur', 'Éclat du Briseur', 'neutre', 'legendaire', 1, 'pouvoir', '🪨', { dupliquer: 2, pioche: 1, epuise: true }), trophee: 'briseur' },
  { ...c('foudre_titan', 'Foudre du Titan', 'neutre', 'legendaire', 3, 'attaque', '⛈️', { degats: 30, etourdit: 1 }), trophee: 'titan' },
  { ...c('sablier_sphinx', 'Sablier du Sphinx', 'neutre', 'legendaire', 1, 'pouvoir', '⏳', { energie: 1, pioche: 1, energieProchain: 2, epuise: true }), trophee: 'sphinx' },
  { ...c('coeur_astre', 'Cœur de l’Astre', 'neutre', 'legendaire', 2, 'defense', '🌠', { bouclier: 12, renaissance: 20, epuise: true }), trophee: 'astre' },
  // ---- les sorts des chefs de guerre (v122) : reçus à la Consécration, jamais dans les tirages
  PB('ch_etendard', 'Étendard du clan', 'epique', 1, 'pouvoir', '🚩', { bouclier: 8, force: 1, epuise: true }),
  PB('ch_mur_vivant', 'Mur vivant', 'epique', 2, 'defense', '🧱', { bouclier: 18, epines: 3 }),
  PB('ch_serment', 'Serment de la bannière', 'legendaire', 2, 'attaque', '⚜️', { bouclierEnDegats: true, bouclier: 12 }),
  CH('ch_hurlement', 'Hurlement de guerre', 'epique', 1, 'pouvoir', '📯', { force: 2, affaibli: 1, tous: true, epuise: true }),
  CH('ch_charge', 'Charge de la horde', 'epique', 2, 'attaque', '🐗', { degats: 9, fois: 2, rage: 10 }),
  CH('ch_massacre', 'Massacre', 'legendaire', 3, 'attaque', '🪓', { degats: 14, tous: true, rage: 6, volVie: 0.3 }),
  GR('ch_flux', 'Flux arcanique', 'epique', 0, 'pouvoir', '🌀', { pioche: 2, energie: 1, epuise: true }),
  GR('ch_nova', 'Nova arcanique', 'epique', 2, 'attaque', '✴️', { degats: 11, tous: true, affaibli: 1 }),
  GR('ch_apotheose', 'Apothéose', 'legendaire', 1, 'pouvoir', '🌟', { reduction: 1, pioche: 2, epuise: true }),
  SB('ch_meute', 'Appel de la meute', 'epique', 1, 'pouvoir', '🐺', { appel: 4, pioche: 1 }),
  SB('ch_ours', 'Ours ancestral', 'epique', 2, 'pouvoir', '🐻', { invoque: { nom: 'Ours ancestral', ico: '🐻', pv: 30, deg: 7 } }),
  SB('ch_roi_bete', 'Roi des bêtes', 'legendaire', 3, 'pouvoir', '🦁', { invoque: { nom: 'Roi des bêtes', ico: '🦁', pv: 42, deg: 11 }, appel: 3 }),
  OA('ch_tir_vise', 'Tir visé', 'epique', 1, 'attaque', '🎯', { degats: 12, marque: 1 }),
  OA('ch_fleche', 'Flèche perçante', 'epique', 2, 'attaque', '🏹', { degats: 10, fois: 2, affaibli: 1 }),
  OA('ch_trait_divin', 'Trait divin', 'legendaire', 2, 'attaque', '🦅', { degats: 26, marque: 2 }),
  MA2('ch_barrage', 'Barrage d’obus', 'epique', 1, 'attaque', '💥', { degats: 4, fois: 2, tous: true }),
  MA2('ch_mortier', 'Mortier', 'epique', 2, 'attaque', '🧨', { degats: 10, tous: true, etourdit: 1 }),
  MA2('ch_grand_canon', 'Grand canon', 'legendaire', 3, 'attaque', '💣', { degats: 22, tous: true }),
  CC('ch_botte_royale', 'Botte royale', 'epique', 1, 'attaque', '🤺', { degats: 7, pioche: 1 }),
  CC('ch_valse', 'Valse des lames', 'epique', 1, 'attaque', '🗡️', { degats: 3, fois: 4 }),
  CC('ch_gloire', 'Gloire du champion', 'legendaire', 2, 'attaque', '🏆', { degats: 16, force: 1, energie: 1 }),
  MN('ch_poison', 'Poison noir', 'epique', 1, 'attaque', '🧪', { degats: 6, affaibli: 2, brulure: 3 }),
  MN('ch_main', 'Main de l’exécuteur', 'epique', 2, 'attaque', '✋', { degats: 8, degatsParAffaibli: 5 }),
  MN('ch_nuit', 'Nuit éternelle', 'legendaire', 2, 'pouvoir', '🌑', { affaibli: 3, tous: true, dupliquer: 2, epuise: true }),
].map((x) => [x.id, x]));
// v121 : les 16 reliques neutres des zones sont réparties entre les classes (une par classe et par zone,
// deux épiques et deux légendaires chacune) : la forge ne montre plus que celles de son élément et de sa classe
export const CLASSE_RELIQUES = {
  combattant: ['golem_pierre', 'marteau_tonnerre', 'sable_aveuglant', 'festin_etoiles'],
  mage: ['esprit_faille', 'chaine_eclairs', 'oeil_ra', 'faux_etoiles'],
  tireur: ['loup_spectral', 'avatar_tempete', 'fleche_scarabee', 'comete_vorace'],
  escrimeur: ['dragonnet', 'oeil_tempete', 'jugement_pharaon', 'morsure_astrale'],
};
for (const [k, l] of Object.entries(CLASSE_RELIQUES)) for (const id of l) CARTES[id].classe = k;

// les effets qui grandissent quand on améliore une carte (niveau 1 à 3)
const CROISSANTS = ['degats', 'bouclier', 'soin', 'brulure', 'epines', 'regen', 'appel', 'degatsParAffaibli', 'ardeur', 'renaissance', 'bourgeon', 'pousse'];   // v123
export const NIV_MAX = 3;
export function effetsDe(id, niv = 1) {
  const e = { ...CARTES[id].effets };
  if (e.invoque) e.invoque = { ...e.invoque, pv: Math.round(e.invoque.pv * (1 + 0.3 * (niv - 1))), deg: Math.round(e.invoque.deg * (1 + 0.3 * (niv - 1))) };   // v87
  for (const k of CROISSANTS) if (e[k]) e[k] = Math.round(e[k] * (1 + 0.3 * (niv - 1)));
  if (niv >= 3 && e.force) e.force += 1;
  return e;
}
// le texte d'une carte, construit depuis ses effets
export function decrire(id, niv = 1) {
  const e = effetsDe(id, niv), t = [], zone = e.tous ? ' à tous les ennemis' : '';
  if (e.degats) t.push(`Inflige ${e.degats} dégâts${e.fois > 1 ? ` ${e.fois} fois` : ''}${zone}.`);
  if (e.degatsParBrulure) t.push(`Inflige ${String(e.degatsParBrulure).replace('.', ',')}× la brûlure de la cible.`);
  if (e.bouclierEnDegats) t.push(`Inflige autant de dégâts que ton bouclier${zone}.`);
  if (e.degatsParAffaibli) t.push(`Inflige ${e.degatsParAffaibli}× l’affaibli de la cible.`);
  if (e.degatsParMain) t.push(`+${e.degatsParMain} dégâts par carte dans ta main.`);
  if (e.pousse) t.push(`Pousse : +${e.pousse} dégâts chaque fois que tu la rejoues ce combat.`);
  if (e.doubleBrulure) t.push('Double la brûlure de la cible.');
  if (e.rage) t.push(`+1 dégât par tranche de ${e.rage} PV qui te manquent.`);
  if (e.sacrifice) t.push(`Perds ${e.sacrifice} PV.`);
  if (e.doubleBouclier) t.push('Double ton bouclier.');
  if (e.bouclier) t.push(`Gagne ${e.bouclier} bouclier.`);
  if (e.soin) t.push(`Soigne ${e.soin} PV.`);
  if (e.brulure) t.push(`Brûlure ${e.brulure}${e.degats ? '' : zone}.`);
  if (e.trempe) t.push(`Trempé ${e.trempe}${e.degats ? '' : zone}.`);
  if (e.affaibli) t.push(`Affaibli ${e.affaibli}${e.degats ? '' : zone}.`);
  if (e.epines) t.push(`Épines ${e.epines}.`);
  if (e.regen) t.push(`Régénération ${e.regen}.`);
  if (e.bouclierParRegen) t.push(`Gagne ${e.bouclierParRegen}× ta régénération en bouclier.`);
  if (e.bourgeon) t.push(`Bourgeon ${e.bourgeon}.`);
  if (e.ardeur) t.push(`Aura ardente ${e.ardeur}.`);
  if (e.esquive) t.push(`Esquive ${e.esquive}.`);
  if (e.renaissance) t.push(`Renaissance ${e.renaissance}.`);
  if (e.purifie) t.push('Retire tes brûlure, trempé, affaibli et marques.');
  if (e.brulureSoi) t.push(`Tu subis Brûlure ${e.brulureSoi}.`);
  if (e.energieProchain) t.push(`+${e.energieProchain} énergie au prochain tour.`);
  if (e.reflux) t.push('Reprends en main la dernière carte de ta défausse.');
  if (e.parasite) t.push('Ne fait rien : une fêlure du Briseur de mondes.');
  if (e.force) t.push(`+${e.force} Force.`);
  if (e.appel) t.push(`Appel ${e.appel}.`);
  if (e.energie) t.push(`+${e.energie} énergie.`);
  if (e.pioche) t.push(`Pioche ${e.pioche} carte${e.pioche > 1 ? 's' : ''}.`);
  // v121 : textes de cartes courts (Invoque, Étourdit, Marque, Vol de vie) : l'explication complète est dans l'infobulle du mot
  if (e.invoque) t.push(`Invoque ${e.invoque.ico} ${e.invoque.nom} : ${e.invoque.pv} PV, frappe ${e.invoque.deg} par tour.`);
  if (e.etourdit) t.push(e.tous ? 'Étourdit tous les ennemis.' : 'Étourdit la cible.');
  if (e.volVie) t.push(`Vol de vie ${Math.round(e.volVie * 100)} %.`);
  if (e.marque) t.push(`${e.tous ? 'Marque tous les ennemis' : 'Marque la cible'} ${e.marque} fois.`);
  if (e.dupliquer) t.push(`Copie ${e.dupliquer > 1 ? `${e.dupliquer} cartes` : 'une carte'} de ta main au hasard (copie éphémère).`);
  if (e.reduction) t.push(`Les cartes de ta main coûtent ${e.reduction} de moins ce tour.`);
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
  etourdi: { nom: 'Étourdi', ico: '💫', desc: 'Perd sa prochaine action (son intention attend un tour). Ensuite, il résiste à l’étourdissement pendant un tour.' },
  paralysie: { nom: 'Paralysie', ico: '⚡', desc: 'Une énergie de moins au prochain tour (par point).' },
  marque: { nom: 'Marque', ico: '🎯', desc: 'À 3 marques, elles explosent : 20 dégâts directs (12 × la force du monstre quand c’est toi qui es marqué), le bouclier ne protège pas.' },
  invoque: { nom: 'Invocation', ico: '🐾', desc: 'L’allié invoqué frappe un ennemi au début de chacun de tes tours et encaisse les coups à ta place tant qu’il tient debout.' },
  volVie: { nom: 'Vol de vie', ico: '🩸', desc: 'Tu te soignes de ce pourcentage des dégâts que la carte inflige.' },
  ardeur: { nom: 'Aura ardente', ico: '♨️', desc: 'Jusqu’à ton prochain tour, chaque ennemi qui t’attaque prend autant de Brûlure.' },
  esquive: { nom: 'Esquive', ico: '🌫️', desc: 'La prochaine attaque reçue (par point) ne t’inflige rien.' },
  renaissance: { nom: 'Renaissance', ico: '🪶', desc: 'La première fois que tu tombes à 0 PV, tu reviens avec autant de PV (une fois).' },
  bourgeon: { nom: 'Bourgeon', ico: '🌷', desc: 'Au début de ton prochain tour, il éclot et te soigne d’autant.' },
  photosynthese: { nom: 'Photosynthèse', ico: '☀️', desc: 'Autant d’énergie en plus au début de ton prochain tour.' },
  pousse: { nom: 'Pousse', ico: '🌱', desc: 'Cette carte gagne des dégâts chaque fois que tu la joues, jusqu’à la fin du combat.' },
  appel: { nom: 'Appel', ico: '🐾', desc: 'Au début de ton tour, ton allié invoqué inflige autant de dégâts à un ennemi.' },
};
// le deck de départ selon le clan
export const DECK_DEPART = {
  feu: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'etincelle', 'tison', 'flamme', 'cendres'],
  eau: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'vague', 'vague', 'jet', 'maree'],
  plante: ['frappe', 'frappe', 'frappe', 'frappe', 'garde', 'garde', 'garde', 'garde', 'ronce', 'ronce', 'liane', 'seve'],
};
// le deck de départ (12 cartes) : 2 Frappe, 2 Garde, 2 cartes de la classe, 6 cartes de l'élément (v83 : 2 exemplaires au plus)
// v91 : le deck de départ fait 20 cartes (le minimum)
const ELEM_DEPART = { feu: ['etincelle', 'etincelle', 'tison', 'tison', 'flamme', 'flamme', 'cendres', 'cendres'], eau: ['vague', 'vague', 'jet', 'jet', 'maree', 'maree', 'bulle', 'bulle'], plante: ['ronce', 'ronce', 'liane', 'liane', 'seve', 'seve', 'graine', 'graine'] };
const CLASSE_DEPART = { combattant: 'fracas', mage: 'missiles', tireur: 'tir_rapide', escrimeur: 'botte' };
export const deckDepart = (clan, classe) => ['frappe', 'frappe', 'garde', 'garde', 'coup_double', 'coup_double', ...(CLASSES[classe]?.depart || []), ...(CLASSES[classe]?.depart || []), ...(CLASSE_DEPART[classe] ? [CLASSE_DEPART[classe], CLASSE_DEPART[classe]] : ['reflexion', 'reflexion']), ...ELEM_DEPART[clan]];
