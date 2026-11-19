// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les reliques d'expédition (v59)
//  Pur (client + serveur). Des objets passifs, comme dans Slay the Spire :
//  après chaque élite vaincu, on en choisit une parmi trois ; un trésor en
//  donne une au hasard. Elles durent jusqu'à la fin de l'expédition.
//  quand : 'combat' → appliquée par le moteur (combat.js) ;
//          'expe'   → appliquée par l'expédition (expedition.js).
// =====================================================================
import { alea } from './combat.js';

export const RELIQUES = {
  // ---- au début de chaque combat
  ancre: { nom: 'Ancre de bronze', ico: '⚓', quand: 'combat', desc: 'Au début de chaque combat, 8 de bouclier.' },
  lanterne: { nom: 'Lanterne d’éveil', ico: '🏮', quand: 'combat', desc: 'Au premier tour de chaque combat, +1 énergie.' },
  besace: { nom: 'Besace sans fond', ico: '🎒', quand: 'combat', desc: 'Au premier tour de chaque combat, pioche 2 cartes de plus.' },
  griffe: { nom: 'Griffe de wyverne', ico: '🦴', quand: 'combat', desc: 'Commence chaque combat avec 1 de force.' },
  braise: { nom: 'Braise éternelle', ico: '🕯️', quand: 'combat', desc: 'Les ennemis commencent chaque combat avec 3 brûlures.' },
  goutte: { nom: 'Goutte d’abysse', ico: '💧', quand: 'combat', desc: 'Les ennemis commencent chaque combat trempés 2 tours.' },
  ronce: { nom: 'Collier de ronces', ico: '🌿', quand: 'combat', desc: 'Commence chaque combat avec 3 épines.' },
  // ---- pendant le combat
  pierre_lune: { nom: 'Pierre de lune', ico: '🌙', quand: 'combat', desc: 'Au début de chaque tour, 3 de bouclier.' },
  sablier: { nom: 'Sablier d’ambre', ico: '⏳', quand: 'combat', desc: 'Tous les 3 tours, +1 énergie.' },
  pointe: { nom: 'Pointe affûtée', ico: '📌', quand: 'combat', desc: 'Chaque attaque inflige +1 dégât par coup.' },
  // ---- pour l'expédition
  gourde: { nom: 'Gourde du pèlerin', ico: '🫗', quand: 'expe', desc: 'Soigne 5 PV après chaque combat gagné.' },
  bourse: { nom: 'Bourse percée… recousue', ico: '👛', quand: 'expe', desc: '+30 % d’essence sur chaque combat gagné.' },
  fiole: { nom: 'Fiole de vitalité', ico: '🧪', quand: 'expe', desc: '+10 PV max (et 10 PV soignés) tout de suite.' },
  tente: { nom: 'Tente de voyage', ico: '⛺', quand: 'expe', desc: 'Les feux de camp soignent 50 % de plus.' },
};
export const IDS = Object.keys(RELIQUES);
export const valide = (id) => typeof id === 'string' && Object.hasOwn(RELIQUES, id);
export const a = (liste, id) => Array.isArray(liste) && liste.includes(id);

// trois reliques qu'on n'a pas encore, tirées de la graine de l'expédition et de la salle
export function tirerChoix(x, n = 3) {
  const deja = x.reliques || [], l = IDS.filter((id) => !deja.includes(id)), r = alea(x.graine * 3 + x.salles * 977 + 5);
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l.slice(0, n);
}
// ajouter une relique à l'expédition (et appliquer ce qui est immédiat)
export function ajouter(x, id) {
  if (!valide(id) || a(x.reliques, id)) return false;
  (x.reliques ||= []).push(id);
  if (id === 'fiole') { x.pvMax += 10; x.pv = Math.min(x.pvMax, x.pv + 10); }
  return true;
}
// les effets du début de combat (appelé par le moteur après le premier tour préparé)
export function debutCombat(c, liste) {
  const j = c.joueur;
  if (a(liste, 'ancre')) j.bloc += 8;
  if (a(liste, 'lanterne')) c.energie += 1;
  if (a(liste, 'griffe')) j.force += 1;
  if (a(liste, 'ronce')) j.epines += 3;
  if (a(liste, 'braise')) for (const e of c.ennemis) e.brulure += 3;
  if (a(liste, 'goutte')) for (const e of c.ennemis) e.trempe += 2;
}
