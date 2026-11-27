// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'Ascension (v69)
//  Au niveau 20, l'Épreuve d'ascension s'ouvre : un combat contre la
//  Chimère de l'ascension. Victoire → on choisit une des 2 branches de sa
//  classe (talent en plus, et ses 6 sorts entrent dans les tirages).
// =====================================================================
import { BRANCHES, NIV_ASCENSION } from './cartes.js';
import { niveau, deckCombat, pvMax, convertirAutresClasses } from './profil.js';
import * as F from './familiers.js';
import * as CO from './consecration.js';

export const GARDIEN = { id: 'chimere', nom: 'Chimère de l’ascension', ico: '🦁', pv: 230, rang: 'boss',
  intentions: [{ a: 14 }, { d: 12, f: 2 }, { a: 6, n: 3 }, { w: 2, a: 10 }, { b: 4, t: 1, a: 12 }, { a: 22 }] };
export const PALIER_EPREUVE = { n: 3, nom: 'Épreuve d’ascension', pv: 1, deg: 1.1, butin: 1 };

export const peutAscension = (p) => !!p?.classe && !p.branche && niveau(p) >= NIV_ASCENSION;
export const etat = (p) => (p.branche ? 'fait' : p.ascension?.reussie ? 'choix' : niveau(p) >= NIV_ASCENSION ? 'epreuve' : 'verrou');

export function commencer(p, graine) {
  if (!peutAscension(p)) return { ok: false, raison: p.branche ? 'Tu as déjà choisi ta branche.' : `Il faut être niveau ${NIV_ASCENSION}.` };
  if (p.ascension?.reussie) return { ok: false, raison: 'Épreuve déjà réussie : choisis ta branche.' };
  if (p.expedition) return { ok: false, raison: 'Termine ton expédition d’abord.' };
  p.ascension = { graine, reussie: false, essais: (p.ascension?.essais || 0) + 1 };
  return { ok: true, graine };
}
// le combat de l'épreuve : le même sur le client et sur le serveur (même graine)
export function defEpreuve(p) {
  const pv = pvMax(p);
  return { deck: deckCombat(p), joueur: { pv, pvMax: pv }, ennemis: [GARDIEN], palier: PALIER_EPREUVE, graine: p.ascension?.graine || 1, classe: p.classe, familier: F.actif(p) };
}
export function finir(p, c) {
  if (!p.ascension || p.ascension.reussie) return { ok: false };
  if (c.fini === 'victoire') p.ascension.reussie = true;
  return { ok: true, victoire: c.fini === 'victoire' };
}
export function choisir(p, b) {
  if (p.branche) return { ok: false, raison: 'Tu as déjà choisi ta branche.' };
  if (!p.ascension?.reussie) return { ok: false, raison: 'Réussis d’abord l’Épreuve d’ascension.' };
  if (BRANCHES[b]?.classe !== p.classe) return { ok: false, raison: 'Cette branche n’est pas pour ta classe.' };
  p.branche = b; delete p.ascension;
  convertirAutresClasses(p);
  return { ok: true };
}

// ---------- le Parchemin de réorientation (v72) : changer de branche ----------
// on le fabrique dans la fenêtre de l'Ascension ; l'utiliser change la branche,
// et les sorts de l'ancienne branche deviennent des éclats (comme pour les classes)
export const COUT_PARCHEMIN = { essence: 6000, eclats: 200, cristal: 10, perle_noire: 10, graine_or: 10 };
export function fabriquerParchemin(p) {
  if (!p.branche) return { ok: false, raison: 'Choisis d’abord une branche.' };
  for (const [k, v] of Object.entries(COUT_PARCHEMIN)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(COUT_PARCHEMIN)) p.ress[k] -= v;
  p.parchemins = (p.parchemins || 0) + 1;
  return { ok: true };
}
export function changer(p, b) {
  if (!p.branche) return { ok: false, raison: 'Tu n’as pas encore de branche.' };
  if (!(p.parchemins > 0)) return { ok: false, raison: 'Il te faut un Parchemin de réorientation.' };
  if (b === p.branche) return { ok: false, raison: 'C’est déjà ta branche.' };
  if (BRANCHES[b]?.classe !== p.classe) return { ok: false, raison: 'Cette branche n’est pas pour ta classe.' };
  const ancienne = p.branche;
  p.parchemins--; p.branche = b;
  if (p.titre === `br:${ancienne}`) p.titre = null;
  const chef = CO.suivreBranche(p);   // v122 : un chef de guerre change aussi de chef (ses anciens sorts deviennent des éclats)
  const conv = convertirAutresClasses(p);
  delete p.avisClasse;   // le message de la v68 ne concerne pas ce cas
  return { ok: true, res: { n: conv.n, eclats: conv.eclats, chef } };
}
