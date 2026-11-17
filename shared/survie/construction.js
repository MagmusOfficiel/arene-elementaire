// =====================================================================
//  ZONE MORTE — la base : barricades, démontage, cuisine, feu de camp
// =====================================================================
import { T, INTERIEUR } from './monde.js';
import { OBJETS, ajouterObjet, trouver } from './objets.js';
import { retirer } from './survivant.js';
import { bonusPlanche } from './competences.js';

export const BARRICADE = { max: 3, pvPlanche: 8, planches: 1, clous: 2, duree: 2.2, bruit: 12 };
const BARRICADABLE = new Set([T.porte, T.fenetre, T.fenetreCassee]);
const OUTIL_CLOUER = ['marteau'];
const OUTIL_DEMONTER = ['marteau', 'piedbiche', 'hache'];
const DEMONTABLE = { [T.meuble]: 2, [T.lit]: 3, [T.etagere]: 2, [T.comptoir]: 2 };   // planches récupérées

const nb = (s, id) => s.inv.filter((o) => o.id === id).reduce((a, o) => a + o.n, 0);
const aOutil = (s, ids) => s.inv.some((o) => ids.includes(o.id));
function consommer(s, id, n) {
  while (n > 0) { const i = trouver(s.inv, id); if (i < 0) return; const k = Math.min(n, s.inv[i].n); retirer(s, i, k); n -= k; }
}

// ---------- barricades ----------
// renvoie null si c'est possible, sinon la raison (texte pour le joueur)
export function raisonBarricade(s, monde, x, y) {
  const v = monde.tuile(x, y), b = monde.barricade(x, y);
  if (!BARRICADABLE.has(v)) return v === T.porteOuverte ? 'Ferme la porte d\'abord.' : 'On ne peut barricader que les portes et les fenêtres.';
  if (b && b.n >= BARRICADE.max) return 'Déjà barricadée au maximum.';
  if (!aOutil(s, OUTIL_CLOUER)) return 'Il te faut un marteau.';
  if (nb(s, 'planche') < BARRICADE.planches) return 'Il te faut une planche (démonte un meuble : X).';
  if (nb(s, 'clous') < BARRICADE.clous) return 'Il te faut 2 clous.';
  return null;
}
export function barricader(s, monde, x, y) {
  if (raisonBarricade(s, monde, x, y)) return false;
  consommer(s, 'planche', BARRICADE.planches); consommer(s, 'clous', BARRICADE.clous);
  const k = `${Math.floor(x)},${Math.floor(y)}`, b = monde.barricades[k], pv = BARRICADE.pvPlanche + bonusPlanche(s);   // un bon charpentier cloue plus solide
  if (b) { b.n++; b.pv = pv; b.pvMax = pv; } else monde.barricades[k] = { n: 1, pv, pvMax: pv };
  monde.rev = (monde.rev || 0) + 1;
  return true;
}
// un zombie frappe une barricade : renvoie 'planche' quand une planche cède, 'fin' quand il n'y en a plus
export function frapperBarricade(monde, x, y) {
  const k = `${Math.floor(x)},${Math.floor(y)}`, b = monde.barricades[k]; if (!b) return null;
  b.pv--;
  if (b.pv > 0) return 'coup';
  b.n--; b.pv = b.pvMax || BARRICADE.pvPlanche; monde.rev = (monde.rev || 0) + 1;
  if (b.n <= 0) { delete monde.barricades[k]; return 'fin'; }
  return 'planche';
}

// ---------- démonter : un meuble donne des planches, une barricade rend sa planche ----------
export function raisonDemontage(s, monde, x, y, contenu) {
  const v = monde.tuile(x, y);
  if (!monde.barricade(x, y) && !DEMONTABLE[v]) return 'Rien à démonter ici.';
  if (!aOutil(s, OUTIL_DEMONTER)) return 'Il te faut un marteau, un pied-de-biche ou une hache.';
  if (!monde.barricade(x, y) && contenu?.length) return 'Vide le meuble avant de le démonter.';
  return null;
}
export function demonter(s, monde, x, y, contenu) {
  if (raisonDemontage(s, monde, x, y, contenu)) return 0;
  const k = `${Math.floor(x)},${Math.floor(y)}`, b = monde.barricades[k];
  if (b) { b.n--; b.pv = BARRICADE.pvPlanche; if (b.n <= 0) delete monde.barricades[k]; monde.rev = (monde.rev || 0) + 1; ajouterObjet(s.inv, 'planche', 1); return 1; }
  const n = DEMONTABLE[monde.tuile(x, y)];
  monde.poser(x, y, monde.solSous(Math.floor(x), Math.floor(y)));
  ajouterObjet(s.inv, 'planche', n);
  return n;
}

// ---------- cuisine ----------
export const RECETTES = [
  { id: 'platPates', ingredients: [['pates', 1], ['eau', 1]], rend: 'bouteille' },
  { id: 'soupe', ingredients: [['legumes', 1], ['eau', 1]], rend: 'bouteille' },
  { id: 'steak', ingredients: [['viande', 1]] },
];
export const peutCuisiner = (s, r) => r.ingredients.every(([id, n]) => nb(s, id) >= n);
export function cuisiner(s, recette) {
  if (!peutCuisiner(s, recette)) return false;
  for (const [id, n] of recette.ingredients) consommer(s, id, n);
  ajouterObjet(s.inv, recette.id, 1);
  if (recette.rend) ajouterObjet(s.inv, recette.rend, 1);
  return true;
}
export const nomRecette = (r) => `${OBJETS[r.id].ic} ${OBJETS[r.id].nom} (${r.ingredients.map(([id]) => OBJETS[id].nom.toLowerCase()).join(' + ')})`;

// ---------- feu de camp : dehors seulement, 2 planches + allumettes, brûle 4 heures ----------
export const FEU = { planches: 2, dureeMin: 240 };
export function raisonFeu(s, monde, x, y) {
  if (INTERIEUR.has(monde.tuile(x, y)) || monde.batimentEn(x, y)) return 'Pas de feu à l\'intérieur !';
  if (nb(s, 'allumettes') < 1) return 'Il te faut des allumettes.';
  if (nb(s, 'planche') < FEU.planches) return 'Il te faut 2 planches.';
  return null;
}
export function allumerFeu(s, monde, feux, x, y, temps) {
  if (raisonFeu(s, monde, x, y)) return false;
  consommer(s, 'planche', FEU.planches); consommer(s, 'allumettes', 1);
  feux.push({ x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, fin: temps + FEU.dureeMin });
  return true;
}
