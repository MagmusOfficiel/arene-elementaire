// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les familiers (v53)
//  Pur (client + serveur). Un petit compagnon qui suit le joueur sur la
//  carte et l'accompagne en combat contre les monstres (expéditions, boss
//  mondial — jamais en duel ni dans l'arène). Chacun donne un petit coup
//  de pouce au début de chaque combat.
//  On les trouve en battant le boss d'un territoire, ou on les fabrique
//  avec les ressources rares de ce territoire.
// =====================================================================
import { RARES } from './cartes.js';

// effet : appliqué par le moteur de combat (combat.js) au début du combat
export const FAMILIERS = {
  salamandre: { nom: 'Salamandre', terr: 'feu', ico: '🦎', effet: { brulureEnnemis: 2 }, desc: 'Au début du combat, inflige 2 brûlures à tous les ennemis.' },
  braisillon: { nom: 'Braisillon', terr: 'feu', ico: '🔥', effet: { energie: 1 }, desc: 'Au premier tour, +1 énergie.' },
  tortue: { nom: 'Tortue des lagons', terr: 'eau', ico: '🐢', effet: { bloc: 5 }, desc: 'Au début du combat, 5 de bouclier.' },
  loutre: { nom: 'Loutre', terr: 'eau', ico: '🦦', effet: { pioche: 1 }, desc: 'Au premier tour, pioche 1 carte de plus.' },
  pousse: { nom: 'Pousse', terr: 'plante', ico: '🌱', effet: { regen: 3 }, desc: 'Au début du combat, régénération 3 (soigne 3, puis 2, puis 1).' },
  luciole: { nom: 'Luciole', terr: 'plante', ico: '✨', effet: { affaiblirEnnemis: 1 }, desc: 'Au début du combat, les ennemis sont affaiblis 1 tour (−25 % de dégâts).' },
};
export const IDS = Object.keys(FAMILIERS);
export const valide = (id) => typeof id === 'string' && Object.hasOwn(FAMILIERS, id);

// fabriquer : ressources rares du territoire + essence
export const coutFabrication = (id) => (valide(id) ? { [RARES[FAMILIERS[id].terr].id]: 6, essence: 1200 } : null);
// chance d'en trouver un en battant le boss d'un territoire, selon le palier (1 à 4)
export const CHANCE_BOSS = [0.3, 0.4, 0.5, 0.6];

export const possedes = (p) => (Array.isArray(p.familiers?.l) ? p.familiers.l.filter(valide) : []);
export const actif = (p) => (valide(p.familiers?.actif) && possedes(p).includes(p.familiers.actif) ? p.familiers.actif : null);
const ajouter = (p, id) => { p.familiers ||= { l: [], actif: null }; if (!p.familiers.l.includes(id)) p.familiers.l.push(id); if (!p.familiers.actif) p.familiers.actif = id; };

export function fabriquer(p, id) {
  const cout = coutFabrication(id); if (!cout) return { ok: false };
  if (possedes(p).includes(id)) return { ok: false, raison: 'Tu as déjà ce familier.' };
  for (const [k, v] of Object.entries(cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(cout)) p.ress[k] -= v;
  ajouter(p, id);
  return { ok: true, id };
}
export function choisir(p, id) {
  if (id === null || id === '') { p.familiers ||= { l: [], actif: null }; p.familiers.actif = null; return { ok: true }; }
  if (!possedes(p).includes(id)) return { ok: false, raison: 'Tu n’as pas ce familier.' };
  p.familiers.actif = id; return { ok: true };
}
// après un boss d'expédition vaincu : peut-être un familier du territoire qu'on n'a pas encore. r() : hasard du serveur
export function butinBoss(p, terr, palier, r) {
  const manquants = IDS.filter((id) => FAMILIERS[id].terr === terr && !possedes(p).includes(id));
  if (!manquants.length || r() >= CHANCE_BOSS[Math.max(0, Math.min(3, palier - 1))]) return null;
  const id = manquants[Math.floor(r() * manquants.length)];
  ajouter(p, id);
  return id;
}
