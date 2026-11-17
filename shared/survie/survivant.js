// =====================================================================
//  ZONE MORTE — le survivant : santé, endurance, blessures, infection
// =====================================================================
export const BLESSURES = {
  egratignure: { nom: 'Égratignure', degats: 4, saigne: 0.3, infection: 0.07 },
  laceration: { nom: 'Lacération', degats: 9, saigne: 1, infection: 0.25 },
  morsure: { nom: 'Morsure', degats: 15, saigne: 1, infection: 1 },
};
export const DUREE_INFECTION_S = 3600;   // une morsure tue en ~1 h de jeu réel (un jour et demi de jeu)

export function nouveauSurvivant() {
  return { sante: 100, endurance: 100, saignements: 0, infecte: false, infection: 0, blessures: [], bandages: 3, tues: 0, mort: null, accroupi: false, action: null };
}

// tirage du type de blessure : plus on est encerclé ou pris de dos, plus la morsure est probable
// 'agrippe' = le zombie t'attrape sans blesser (tu es ralenti un instant) : c'est le cas le plus fréquent seul face à un zombie
export function tirerBlessure(encercle, deDos, r = Math.random()) {
  const morsure = 0.05 + (encercle >= 3 ? 0.22 : encercle === 2 ? 0.08 : 0) + (deDos ? 0.1 : 0);
  const rate = Math.max(0.1, 0.45 - (encercle - 1) * 0.12 - (deDos ? 0.15 : 0));
  if (r < morsure) return 'morsure';
  if (r < morsure + 0.22) return 'laceration';
  if (r < 1 - rate) return 'egratignure';
  return 'agrippe';
}
export function blesser(s, type, r = Math.random) {
  const b = BLESSURES[type]; if (!b || s.mort) return;   // 'agrippe' : pas de blessure
  s.sante -= b.degats;
  if (r() < b.saigne) s.saignements++;
  if (r() < b.infection) s.infecte = true;
  s.blessures.push(type);
  if (s.blessures.length > 12) s.blessures.shift();
  if (s.sante <= 0) { s.sante = 0; s.mort = type === 'morsure' ? 'Dévoré par les morts' : 'Mort de ses blessures'; }
}
// bander une plaie : il faut un bandage de fortune (vêtements déchirés)
export function bander(s) {
  if (s.mort || s.saignements <= 0 || s.bandages <= 0) return false;
  s.saignements--; s.bandages--; return true;
}

export function majSurvivant(s, dt, { course = false, bouge = false } = {}) {
  if (s.mort) return;
  // endurance : la course et les coups fatiguent, le repos la recharge
  if (course && bouge) s.endurance = Math.max(0, s.endurance - 11 * dt);
  else s.endurance = Math.min(100, s.endurance + (bouge ? 6 : 10) * dt);
  // saignement
  if (s.saignements > 0) s.sante -= 0.45 * s.saignements * dt;
  else if (!s.infecte && s.sante < 100) s.sante = Math.min(100, s.sante + 0.08 * dt);   // ça cicatrise doucement
  // infection : la fièvre monte, la santé maximale baisse, puis c'est la fin
  if (s.infecte) {
    s.infection = Math.min(1, s.infection + dt / DUREE_INFECTION_S);
    s.sante = Math.min(s.sante, 100 - s.infection * 100);
    if (s.infection >= 1) s.sante = 0;
  }
  if (s.sante <= 0) { s.sante = 0; s.mort = s.infecte && s.infection >= 0.99 ? "Emporté par l'infection" : s.saignements ? 'Vidé de son sang' : 'Mort de ses blessures'; }
}
// la course n'est plus possible quand on est à bout de souffle
export const peutCourir = (s) => s.endurance > 8;
