// =====================================================================
//  ZONE MORTE — compétences (on progresse en faisant) et métiers de départ
// =====================================================================
import { ajouterObjet } from './objets.js';

export const COMPETENCES = {
  combat: { nom: 'Combat', ic: '⚔️', effet: '+8 % de dégâts au corps à corps par niveau' },
  tir: { nom: 'Tir', ic: '🎯', effet: '+6 % de précision par niveau' },
  charpente: { nom: 'Charpenterie', ic: '🔨', effet: 'cloue et démonte plus vite, planches plus solides' },
  discretion: { nom: 'Discrétion', ic: '🦶', effet: 'pas plus silencieux' },
  course: { nom: 'Course', ic: '🏃', effet: 'la course fatigue moins' },
  fouille: { nom: 'Fouille', ic: '🔍', effet: 'fouille plus vite' },
  soins: { nom: 'Premiers soins', ic: '🩹', effet: 'les plaies bandées saignent moins longtemps, cicatrisation plus rapide' },
};
export const PALIERS_XP = [10, 30, 70, 150, 300];   // niveaux 1 à 5
export const niveauComp = (s, c) => PALIERS_XP.filter((p) => (s.comp?.[c] || 0) >= p).length;
// gagner de l'expérience : renvoie le nouveau niveau s'il vient de monter
export function gagnerComp(s, c, n = 1) {
  s.comp ||= {};
  const avant = niveauComp(s, c);
  s.comp[c] = (s.comp[c] || 0) + n * (s.metier === 'chomeur' ? 1.3 : 1);
  const apres = niveauComp(s, c);
  return apres > avant ? apres : 0;
}
// progression vers le niveau suivant (0..1)
export function progresComp(s, c) {
  const n = niveauComp(s, c), xp = s.comp?.[c] || 0;
  if (n >= PALIERS_XP.length) return 1;
  const bas = n ? PALIERS_XP[n - 1] : 0;
  return (xp - bas) / (PALIERS_XP[n] - bas);
}

// ---------- effets des compétences ----------
export const bonusDegats = (s) => 1 + 0.08 * niveauComp(s, 'combat');
export const bonusPrecision = (s) => 0.06 * niveauComp(s, 'tir');
export const vitesseTravail = (s) => 1 - 0.1 * niveauComp(s, 'charpente');   // durée × (1 → 0,5)
export const bonusPlanche = (s) => niveauComp(s, 'charpente');                 // +1 coup par niveau
export const facteurPas = (s) => 1 - 0.12 * niveauComp(s, 'discretion');      // bruit des pas × (1 → 0,4)
export const facteurCourse = (s) => 1 - 0.1 * niveauComp(s, 'course');        // endurance perdue en courant
export const vitesseFouille = (s) => 1 - 0.12 * niveauComp(s, 'fouille');

// ---------- métiers : un point de départ différent ----------
export const METIERS = {
  chomeur: { nom: 'Sans emploi', ic: '🧢', desc: 'Rien de spécial… mais tu apprends 30 % plus vite.', comp: {}, objets: [] },
  policier: { nom: 'Policier', ic: '👮', desc: 'Un pistolet chargé et une boîte de balles. Tir niveau 2.', comp: { tir: 30 }, objets: [['pistolet', 1, { etat: 200, charge: 9 }], ['balles', 12]] },
  charpentier: { nom: 'Charpentier', ic: '🪚', desc: 'Marteau, clous et planches. Charpenterie niveau 2.', comp: { charpente: 30 }, objets: [['marteau', 1, { etat: 80 }], ['clous', 12], ['planche', 2]] },
  infirmier: { nom: 'Infirmier', ic: '🧑‍⚕️', desc: 'Bandages stériles et antidouleurs. Premiers soins niveau 2.', comp: { soins: 30 }, objets: [['bandage', 4], ['antidouleur', 2]] },
  coureur: { nom: 'Coureur', ic: '👟', desc: 'Endurant et discret. Course et Discrétion niveau 1.', comp: { course: 10, discretion: 10 }, objets: [['eau', 1]] },
  cuisinier: { nom: 'Cuisinier', ic: '👨‍🍳', desc: 'Un couteau, des réserves et de quoi cuisiner. Ses plats nourrissent plus.', comp: {}, objets: [['couteau', 1, { etat: 40 }], ['pates', 2], ['conserve', 2], ['allumettes', 1]] },
};
export function appliquerMetier(s, id) {
  const m = METIERS[id] || METIERS.chomeur;
  s.metier = METIERS[id] ? id : 'chomeur'; s.comp = { ...m.comp };
  for (const [obj, n, extra] of m.objets) { const e = ajouterObjet(s.inv, obj, n, extra?.etat); if (extra?.charge != null) e.charge = extra.charge; }
  return s;
}
