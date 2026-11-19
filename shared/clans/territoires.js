// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le contrôle des territoires (sanctuaires)
//  Pur (client + serveur). 6 sanctuaires, 2 par territoire. Un clan les
//  prend en restant dans le cercle sans adversaire ; chaque sanctuaire tenu
//  donne +10 % de production à toutes les parcelles du clan et des points
//  au classement des clans. Au départ, chaque clan tient les siens.
// =====================================================================
export const SANCTUAIRES = [
  { id: 'cendres', nom: 'Sanctuaire des Cendres', terr: 'feu', x: 1112, y: 1704 },
  { id: 'brasier', nom: 'Sanctuaire du Brasier', terr: 'feu', x: 408, y: 792 },
  { id: 'marees', nom: 'Sanctuaire des Marées', terr: 'eau', x: 1144, y: 440 },
  { id: 'corail', nom: 'Sanctuaire de Corail', terr: 'eau', x: 2184, y: 616 },
  { id: 'racines', nom: 'Sanctuaire des Racines', terr: 'plante', x: 2120, y: 1880 },
  { id: 'lucioles', nom: 'Sanctuaire des Lucioles', terr: 'plante', x: 2184, y: 1272 },
];
export const CAPTURE = {
  rayon: 70,            // px : il faut être dans le cercle
  base: 5,              // % par seconde pour un joueur seul (20 s)
  parJoueur: 2,         // % de plus par joueur en renfort (jusqu'à 4 joueurs)
  recul: 12,            // % par seconde : un défenseur efface la progression adverse
  oubli: 3,             // % par seconde quand le cercle est vide
  bonus: 0.10,          // production par sanctuaire tenu
};
export const proprietairesDepart = () => Object.fromEntries(SANCTUAIRES.map((s) => [s.id, s.terr]));

// s : { id, prop, capt: { clan, p } | null, conteste } ; presents : { feu: n, eau: n, plante: n }
// dt en secondes ; vitesse : multiplicateur (tests). Renvoie { pris, ancien } quand le sanctuaire change de mains.
export function avancer(s, presents, dt = 1, vitesse = 1) {
  const la = Object.entries(presents).filter(([, n]) => n > 0);
  s.conteste = la.length > 1;
  if (!la.length) { if (s.capt) { s.capt.p -= CAPTURE.oubli * dt; if (s.capt.p <= 0) s.capt = null; } return null; }
  if (la.length > 1) return null;                     // plusieurs clans : rien ne bouge tant qu'ils ne se sont pas départagés
  const [clan, n] = la[0];
  if (clan === s.prop) { if (s.capt) { s.capt.p -= CAPTURE.recul * dt; if (s.capt.p <= 0) s.capt = null; } return null; }
  if (s.capt && s.capt.clan !== clan) { s.capt.p -= CAPTURE.recul * dt; if (s.capt.p <= 0) s.capt = null; return null; }
  s.capt ||= { clan, p: 0 };
  s.capt.p += (CAPTURE.base + CAPTURE.parJoueur * (Math.min(4, n) - 1)) * dt * vitesse;
  if (s.capt.p < 100) return null;
  const ancien = s.prop; s.prop = clan; s.capt = null;
  return { pris: clan, ancien };
}
export const tenus = (props, clan) => Object.values(props || {}).filter((c) => c === clan).length;
export const bonusProduction = (n) => n * CAPTURE.bonus;
// le sanctuaire dans le cercle duquel se trouve un point
export const sanctuaireEn = (x, y) => SANCTUAIRES.find((s) => Math.hypot(x - s.x, y - s.y) <= CAPTURE.rayon) || null;
