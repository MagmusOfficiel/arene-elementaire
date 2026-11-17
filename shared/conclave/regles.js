// =====================================================================
//  LE CONCLAVE DES ÉLÉMENTS — règles (données pures, partagées serveur/client)
//  Source : Game Design Document du 17 nov. 2026. Les valeurs marquées
//  « levier » sont celles à régler après les premières parties de test.
// =====================================================================

export const CONCLAVE = {
  minJoueurs: 5,
  maxJoueurs: 10,
  manchesMax: 5,
  mainDepart: 4,
  piocheParManche: 2,
  mainMax: 7,              // au-delà, on ne repioche plus (évite les mains énormes)
  bonnesPourSceller: 2,    // levier : 2 au départ, 3 si les Gardiens gagnent trop
  sanctuaireMin: 2,        // en dessous, le rituel n'a pas lieu
  sanctuaireMax: 4,
  victoireSanctuaires: 3,  // 3 sanctuaires sur 5 scellés (Gardiens) ou corrompus (Corrompus)
  reconnexion: 60,         // secondes pour revenir après une coupure
  // durées des phases (secondes) — levier pour le débat
  durees: { deplacement: 20, rituel: 15, revelation: 6, debat: 90, vote: 20, resultat: 6, pouvoirMiroir: 12 },
  debatRaccourci: 30,      // Pic corrompu : le débat suivant dure 30 s de moins
};

// ---------- Rôles ----------
export const ROLES = {
  gardien:    { nom: 'Gardien',    camp: 'gardiens',   desc: 'Tu ne sais rien : déduis qui sabote et fais-le exiler.' },
  oracle:     { nom: 'Oracle',     camp: 'gardiens',   desc: 'À chaque manche, tu vois une carte révélée avec le nom de celui qui l’a posée.' },
  sentinelle: { nom: 'Sentinelle', camp: 'gardiens',   desc: 'Une fois par partie, tu protèges un joueur de l’exil.' },
  corrompu:   { nom: 'Corrompu',   camp: 'corrompus',  desc: 'Tu connais les autres Corrompus. Sabote les rituels avec tes cartes Corruption sans te faire prendre.' },
  mercenaire: { nom: 'Mercenaire', camp: 'mercenaire', desc: 'Tu gagnes seul si tu te fais exiler par un vote. La partie continue sans toi.' },
};
export const CAMPS = {
  gardiens: { nom: 'Gardiens', couleur: '#f2c94c' },
  corrompus: { nom: 'Corrompus', couleur: '#a259ff' },
  mercenaire: { nom: 'Mercenaire', couleur: '#9aa0a6' },
};

// Répartition par nombre de joueurs (GDD) : [gardiens simples, oracle, sentinelle, corrompus, mercenaire]
const REPARTITION = {
  5: { gardien: 3, oracle: 1, sentinelle: 0, corrompu: 1, mercenaire: 0 },
  6: { gardien: 4, oracle: 1, sentinelle: 0, corrompu: 1, mercenaire: 0 },
  7: { gardien: 3, oracle: 1, sentinelle: 1, corrompu: 2, mercenaire: 0 },
  8: { gardien: 3, oracle: 1, sentinelle: 1, corrompu: 2, mercenaire: 1 },
  9: { gardien: 4, oracle: 1, sentinelle: 1, corrompu: 2, mercenaire: 1 },
  10: { gardien: 4, oracle: 1, sentinelle: 1, corrompu: 3, mercenaire: 1 },
};
export function repartition(n) { return REPARTITION[Math.max(5, Math.min(10, n))]; }

// ---------- Sanctuaires ----------
export const SANCTUAIRES = {
  forge:   { nom: 'Forge',   element: 'feu',    reussi: 'Tous les joueurs piochent 1 carte.',                corrompu: 'Les joueurs présents défaussent 1 carte.' },
  source:  { nom: 'Source',  element: 'eau',    reussi: 'Le dernier joueur exilé revient en jeu.',            corrompu: 'Le prochain vote est secret.' },
  pic:     { nom: 'Pic',     element: 'foudre', reussi: 'L’Oracle verra une carte de plus.',                  corrompu: 'Le prochain débat dure 30 s de moins.' },
  racines: { nom: 'Racines', element: 'terre',  reussi: 'Un joueur présent est protégé de l’exil.',          corrompu: 'Personne ne peut bouger à la manche suivante.' },
  cime:    { nom: 'Cime',    element: 'vent',   reussi: 'Les présents montrent combien de Corruptions ils ont en main.', corrompu: 'Les Corrompus échangent une carte en secret.' },
};
export const ORDRE_SANCTUAIRES = ['forge', 'source', 'pic', 'racines', 'cime'];

// ---------- Cartes ----------
export const CARTES = {
  feu:        { nom: 'Feu',        nb: 9,  couleur: '#ff6a2a', icone: '🔥', desc: '+1 au sanctuaire Feu (Forge), neutre ailleurs.' },
  eau:        { nom: 'Eau',        nb: 9,  couleur: '#3aa0ff', icone: '💧', desc: '+1 au sanctuaire Eau (Source), neutre ailleurs.' },
  foudre:     { nom: 'Foudre',     nb: 9,  couleur: '#ffd23a', icone: '⚡', desc: '+1 au sanctuaire Foudre (Pic), neutre ailleurs.' },
  terre:      { nom: 'Terre',      nb: 9,  couleur: '#b07a3a', icone: '🪨', desc: '+1 au sanctuaire Terre (Racines), neutre ailleurs.' },
  vent:       { nom: 'Vent',       nb: 9,  couleur: '#7fe0c0', icone: '🌪️', desc: '+1 au sanctuaire Vent (Cime), neutre ailleurs.' },
  corruption: { nom: 'Corruption', nb: 10, couleur: '#8a3cff', icone: '☠️', desc: 'Une seule fait rater le rituel ; deux corrompent le sanctuaire.' },
  eclat:      { nom: 'Éclat',      nb: 5,  couleur: '#ffffff', icone: '✨', desc: 'Joker : compte comme l’élément du sanctuaire.' },
};
export function nouveauPaquet(rng = Math.random) {
  const p = [];
  for (const [k, c] of Object.entries(CARTES)) for (let i = 0; i < c.nb; i++) p.push(k);
  return melanger(p, rng);
}
export function melanger(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Résultat d'un rituel : 'scelle' | 'rate' | 'corrompu'
export function resoudreRituel(sanctuaire, cartes, bonnes = CONCLAVE.bonnesPourSceller) {
  const el = SANCTUAIRES[sanctuaire].element;
  const corr = cartes.filter((c) => c === 'corruption').length;
  const bon = cartes.filter((c) => c === el || c === 'eclat').length;
  if (corr >= 2) return 'corrompu';
  if (corr === 0 && bon >= bonnes) return 'scelle';
  return 'rate';
}

// ---------- Champions de départ (noms et portraits de l'Arène) et pouvoirs de fusion ----------
// cible : 'joueur' (un autre joueur), 'sanctuaire', 'carte' (une carte de sa main), null (aucune)
// phases : quand le pouvoir peut être utilisé
export const CHAMPIONS_CONCLAVE = {
  'eau+feu':      { nom: 'Vapeur',             pouvoir: 'Brouillard',  cible: 'sanctuaire', phases: ['deplacement', 'rituel'], desc: 'Les cartes d’un rituel sont révélées sans montrer les Corruptions.' },
  'feu+terre':    { nom: 'Magma',              pouvoir: 'Forger',      cible: 'carte',      phases: ['deplacement', 'rituel', 'debat'], desc: 'Transforme une carte de ta main en Éclat.' },
  'eclair+vent':  { nom: 'Tempête',            pouvoir: 'Éclair',      cible: 'joueur',     phases: ['deplacement', 'rituel', 'debat', 'vote'], desc: 'Regarde la main d’un joueur (toi seul la vois).' },
  'eau+vent':     { nom: 'Ouragan',            pouvoir: 'Courant',     cible: 'joueur',     phases: ['deplacement'], desc: 'Échange ta place avec un autre pion après les déplacements.' },
  'eclair+terre': { nom: 'Magnétisme',         pouvoir: 'Miroir',      cible: 'joueur',     phases: ['debat'], desc: 'Force un joueur à montrer à tous une carte de sa main (il choisit laquelle).' },
  'feu+vent':     { nom: 'Tempête de flammes', pouvoir: 'Souffle',     cible: null,         phases: ['debat', 'vote'], desc: 'Annule le prochain vote.' },
  'eau+terre':    { nom: 'Boue',               pouvoir: 'Enlisement',  cible: 'joueur',     phases: ['debat', 'vote'], desc: 'Un joueur ne pourra pas bouger à la prochaine manche.' },
  'eclair+feu':   { nom: 'Plasma',             pouvoir: 'Surcharge',   cible: null,         phases: ['deplacement', 'rituel'], desc: 'Pose 2 cartes dans le même rituel cette manche.' },
};
export const PHASES = {
  salon: 'Salon', deplacement: 'Déplacement', rituel: 'Rituel', revelation: 'Révélation', debat: 'Débat', vote: 'Vote', resultat: 'Résultat du vote', fin: 'Fin de partie',
};

// ---------- Progression (purement cosmétique ou de collection, partagée avec l'Arène) ----------
// Champions : 4 offerts ; les autres se débloquent au niveau du compte OU en jouant cette fusion dans l'Arène.
export const DEBLOCAGE = { 'eau+feu': 0, 'feu+terre': 0, 'eclair+vent': 0, 'eau+terre': 0, 'eau+vent': 3, 'eclair+terre': 5, 'feu+vent': 8, 'eclair+feu': 12 };
export const championDebloque = (fusion, niveau = 1, grimoire = []) => !DEBLOCAGE[fusion] || niveau >= DEBLOCAGE[fusion] || grimoire.includes(fusion);
// Dos de cartes (visible pendant les révélations)
export const DOS_CARTES = [
  { id: 'classique', nom: 'Temple', niv: 1 },
  { id: 'or', nom: 'Or sacré', niv: 5 },
  { id: 'abysses', nom: 'Abysses', niv: 10 },
  { id: 'braise', nom: 'Braise', niv: 15 },
  { id: 'prisme', nom: 'Prisme', niv: 20 },
];
// Réactions rapides du débat (pratique sur téléphone)
export const REACTIONS = ['🤔', '😡', '😂', '👍', '👎', '🙏', '🫣', '🔥'];
export const PHRASES_RAPIDES = ['J’ai posé le bon élément.', 'J’étais au parvis.', 'Je n’ai rien vu de louche.', 'Quelqu’un ment sur sa carte !', 'On attend avant de voter ?'];
