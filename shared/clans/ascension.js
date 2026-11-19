// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'Ascension (v69)
//  Au niveau 20, l'Épreuve d'ascension s'ouvre : un combat contre la
//  Chimère de l'ascension. Victoire → on choisit une des 2 branches de sa
//  classe (talent en plus, et ses 6 sorts entrent dans les tirages).
// =====================================================================
import { BRANCHES, NIV_ASCENSION } from './cartes.js';
import { niveau, deckCombat, pvMax, convertirAutresClasses } from './profil.js';
import * as F from './familiers.js';

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
