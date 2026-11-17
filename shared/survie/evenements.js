// =====================================================================
//  ZONE MORTE — ce qui arrive au monde : coupures, hélicoptère, hordes
//  Tout est tiré de la graine : chaque monde a son propre calendrier.
// =====================================================================
import { hash } from './monde.js';

const JOUR = 1440, DEBUT = 480;   // la partie commence le jour 1 à 8 h
// minute de jeu où l'eau / l'électricité sont coupées
export function calendrier(seed) {
  const h = (k) => hash(seed, k, 91);
  const elec = DEBUT + JOUR * (3 + (h(1) % 3)) + (h(2) % 900);          // entre le jour 4 et le jour 6
  const eau = elec + JOUR * (1 + (h(3) % 2)) + (h(4) % 600);             // un ou deux jours après
  const helico = DEBUT + JOUR * (1 + (h(5) % 2)) + 300 + (h(6) % 400);  // jour 2 ou 3, l'après-midi
  return { elec, eau, helico };
}
export const elecCoupee = (seed, temps) => temps >= calendrier(seed).elec;
export const eauCoupee = (seed, temps) => temps >= calendrier(seed).eau;
// une nuit sur trois environ (jamais la première), une horde passe
export function nuitDeHorde(seed, jour) { return jour >= 2 && hash(seed, jour, 92) % 100 < 35 + Math.min(30, jour * 3); }
// la nourriture du frigo s'abîme un jour après la coupure de courant
export const frigoPerime = (seed, temps) => temps >= calendrier(seed).elec + JOUR;
export const PERISSABLE = new Set(['viande', 'lait', 'legumes', 'pain']);
