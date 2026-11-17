// =====================================================================
//  ZONE MORTE — objets, butin des meubles, inventaire au poids
// =====================================================================
import { hash, alea, CH, T } from './monde.js';

// faim / soif : de combien l'objet fait baisser le besoin (sur 100)
export const OBJETS = {
  // nourriture
  conserve: { nom: 'Conserve de haricots', ic: '🥫', poids: 0.45, type: 'nourriture', faim: 35 },
  chips: { nom: 'Paquet de chips', ic: '🥔', poids: 0.12, type: 'nourriture', faim: 12, soif: -4 },
  barre: { nom: 'Barre de céréales', ic: '🍫', poids: 0.08, type: 'nourriture', faim: 10 },
  pain: { nom: 'Pain', ic: '🍞', poids: 0.3, type: 'nourriture', faim: 22 },
  pomme: { nom: 'Pomme', ic: '🍎', poids: 0.2, type: 'nourriture', faim: 9, soif: 6 },
  // ingrédients (à cuisiner ; la viande crue rend malade)
  pates: { nom: 'Paquet de pâtes', ic: '🍝', poids: 0.5, type: 'ingredient' },
  legumes: { nom: 'Légumes', ic: '🥕', poids: 0.4, type: 'nourriture', faim: 8 },
  viande: { nom: 'Steak cru', ic: '🥩', poids: 0.3, type: 'nourriture', faim: 18, malade: 0.5 },
  // plats cuisinés
  platPates: { nom: 'Plat de pâtes', ic: '🍲', poids: 0.6, type: 'nourriture', faim: 50 },
  soupe: { nom: 'Soupe de légumes', ic: '🥣', poids: 0.6, type: 'nourriture', faim: 35, soif: 20 },
  steak: { nom: 'Steak grillé', ic: '🍖', poids: 0.25, type: 'nourriture', faim: 40 },
  // boissons
  eau: { nom: "Bouteille d'eau", ic: '💧', poids: 0.55, type: 'boisson', soif: 40, vide: 'bouteille' },
  soda: { nom: 'Canette de soda', ic: '🥤', poids: 0.35, type: 'boisson', soif: 25, faim: 4 },
  lait: { nom: 'Brique de lait', ic: '🥛', poids: 0.5, type: 'boisson', soif: 22, faim: 10 },
  bouteille: { nom: 'Bouteille vide', ic: '🍶', poids: 0.05, type: 'divers', remplir: 'eau' },
  // soins
  chiffon: { nom: 'Bandage de fortune', ic: '🩹', poids: 0.05, type: 'soin' },
  bandage: { nom: 'Bandage stérile', ic: '🩹', poids: 0.05, type: 'soin', propre: true },
  antidouleur: { nom: 'Antidouleurs', ic: '💊', poids: 0.05, type: 'soin', endurance: 40 },
  // armes (l'usure est dans ARMES, côté zombies.js)
  batte: { nom: 'Batte de baseball', ic: '🏏', poids: 1.0, type: 'arme' },
  couteau: { nom: 'Couteau de cuisine', ic: '🔪', poids: 0.3, type: 'arme' },
  poele: { nom: 'Poêle', ic: '🍳', poids: 1.2, type: 'arme' },
  piedbiche: { nom: 'Pied-de-biche', ic: '🔧', poids: 1.4, type: 'arme' },
  hache: { nom: 'Hache', ic: '🪓', poids: 2.0, type: 'arme' },
  marteau: { nom: 'Marteau', ic: '🔨', poids: 0.8, type: 'arme' },
  matraque: { nom: 'Matraque', ic: '🦯', poids: 0.7, type: 'arme' },
  // armes à feu (très bruyantes) et munitions
  pistolet: { nom: 'Pistolet', ic: '🔫', poids: 0.9, type: 'arme', feu: true },
  fusil: { nom: 'Fusil à pompe', ic: '🎯', poids: 3.2, type: 'arme', feu: true },
  balles: { nom: 'Balles 9 mm', ic: '•', poids: 0.01, type: 'munition' },
  cartouches: { nom: 'Cartouches', ic: '▮', poids: 0.03, type: 'munition' },
  pourri: { nom: 'Nourriture avariée', ic: '🦠', poids: 0.3, type: 'nourriture', faim: 5, malade: 0.9 },
  // équipement
  lampe: { nom: 'Lampe torche', ic: '🔦', poids: 0.4, type: 'equipement' },
  piles: { nom: 'Piles', ic: '🔋', poids: 0.1, type: 'divers' },
  sac: { nom: 'Sac à dos', ic: '🎒', poids: 0.8, type: 'equipement', capacite: 12 },
  // matériaux (barricades à la phase 4)
  planche: { nom: 'Planche', ic: '🪵', poids: 1.5, type: 'materiau' },
  clous: { nom: 'Clous', ic: '📌', poids: 0.02, type: 'materiau' },
  allumettes: { nom: 'Allumettes', ic: '🔥', poids: 0.05, type: 'divers' },
};
export const CAPACITE_BASE = 8;   // kg qu'on porte sans être gêné

// ---------- butin : [objet, poids du tirage], 'rien' = case vide ----------
const BUTIN = {
  frigo: [['eau', 2], ['soda', 3], ['pain', 2], ['pomme', 2], ['lait', 2], ['viande', 2], ['legumes', 2], ['rien', 3]],
  placard: [['conserve', 4], ['chips', 2], ['barre', 2], ['pates', 2], ['couteau', 1], ['poele', 1], ['bouteille', 1], ['allumettes', 1], ['rien', 3]],
  evier: [['couteau', 1], ['chiffon', 1], ['bouteille', 1], ['rien', 5]],
  cuisiniere: [['poele', 1], ['pates', 1], ['allumettes', 1], ['rien', 5]],
  armoire: [['chiffon', 2], ['sac', 1], ['lampe', 1], ['fusil', 0.15], ['cartouches', 0.3], ['rien', 4]],
  commode: [['chiffon', 2], ['piles', 1], ['lampe', 1], ['antidouleur', 1], ['allumettes', 1], ['clous', 1], ['rien', 4]],
  bibliotheque: [['piles', 1], ['barre', 1], ['rien', 6]],
  lit: [['chiffon', 1], ['rien', 8]],
  'rayon:supermarché': [['conserve', 4], ['chips', 3], ['soda', 3], ['eau', 3], ['barre', 3], ['pain', 1], ['pomme', 2], ['pates', 2], ['legumes', 1], ['allumettes', 1]],
  'rayon:pharmacie': [['bandage', 4], ['antidouleur', 3], ['eau', 1], ['barre', 1]],
  'rayon:quincaillerie': [['marteau', 2], ['clous', 3], ['planche', 2], ['hache', 1], ['piedbiche', 1], ['lampe', 2], ['piles', 2]],
  'rayon:station-service': [['chips', 3], ['soda', 3], ['eau', 2], ['barre', 3], ['lampe', 1], ['piles', 2], ['allumettes', 2]],
  'rayon:commissariat': [['matraque', 2], ['pistolet', 1.5], ['balles', 2.5], ['fusil', 0.6], ['cartouches', 1.5], ['bandage', 1], ['lampe', 2], ['piles', 1], ['rien', 2]],
  'rayon:boutique': [['sac', 2], ['chiffon', 2], ['soda', 1], ['rien', 2]],
};
function tirer(table, R) {
  const total = table.reduce((a, [, p]) => a + p, 0); let r = R() * total;
  for (const [id, p] of table) { r -= p; if (r <= 0) return id; }
  return table[0][0];
}
// contenu d'un meuble, toujours le même pour une graine donnée (tant qu'on ne l'a pas fouillé)
export function genererContenu(seed, x, y, type) {
  const table = BUTIN[type] || BUTIN.commode, R = alea(hash(seed, x, y, 41));
  const n = type.startsWith('rayon:') ? 1 + Math.floor(R() * 4) : Math.floor(R() * 4);
  const inv = [];
  for (let i = 0; i < n; i++) { const id = tirer(table, R); if (id !== 'rien') ajouterObjet(inv, id, id === 'clous' ? 6 + Math.floor(R() * 10) : id === 'balles' ? 6 + Math.floor(R() * 12) : id === 'cartouches' ? 3 + Math.floor(R() * 6) : 1); }
  return inv;
}
// nature d'un meuble à une position du monde
export function typeMeuble(monde, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  const v = monde.tuile(x, y);
  if (v === T.lit) return 'lit';
  const cx = Math.floor(x / CH), cy = Math.floor(y / CH), m = monde.morceau(cx, cy);
  const lx = x - cx * CH, ly = y - cy * CH;
  const e = m.meubles.find((f) => f.x === lx && f.y === ly);
  if (v === T.etagere) { const b = monde.batimentEn(x, y); return e?.type || `rayon:${b?.type || 'boutique'}`; }
  if (!e) return 'commode';
  if (e.type === 'placard' && hash(monde.seed, x, y, 43) % 3 === 0) return 'evier';        // un placard de cuisine sur trois est un évier
  if (e.type === 'placard' && hash(monde.seed, x, y, 43) % 3 === 1) return 'cuisiniere';   // un autre, une cuisinière
  return e.type;
}
export const NOM_MEUBLE = { cuisiniere: 'Cuisinière', feu: 'Feu de camp', frigo: 'Frigo', placard: 'Placard', evier: 'Évier', armoire: 'Armoire', commode: 'Commode', bibliotheque: 'Bibliothèque', lit: 'Lit', sol: 'Au sol' };
export const nomMeuble = (t) => NOM_MEUBLE[t] || (t.startsWith('rayon:') ? `Rayon (${t.slice(6)})` : 'Meuble');

// ---------- inventaire : [{ id, n, etat? }] ----------
const EMPILABLE = (id) => OBJETS[id]?.type !== 'arme' && id !== 'lampe' && id !== 'sac';
export function ajouterObjet(inv, id, n = 1, etat) {
  if (EMPILABLE(id)) { const e = inv.find((o) => o.id === id); if (e) { e.n += n; return e; } }
  const e = { id, n }; if (etat !== undefined) e.etat = etat; inv.push(e); return e;
}
export function retirerObjet(inv, i, n = 1) {
  const e = inv[i]; if (!e) return null;
  e.n -= n; if (e.n <= 0) inv.splice(i, 1);
  return { id: e.id, n, etat: e.etat };
}
export const poidsInventaire = (inv) => inv.reduce((a, o) => a + (OBJETS[o.id]?.poids || 0) * o.n, 0);
export const trouver = (inv, ...ids) => inv.findIndex((o) => ids.includes(o.id));
