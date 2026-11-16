// =====================================================================
//  COSMÉTIQUES DU COMPTE : couleurs de nom, cadres de portrait, titres de niveau.
//  Aucun effet sur la puissance : ça se débloque avec le niveau de compte
//  ou en récompense de fin de saison du Classé (selon le meilleur rang atteint).
// =====================================================================
import { RANGS } from './classe.js';

export const NIV_MAX = 60;
// XP pour passer du niveau n au niveau n+1
export const xpPourNiveau = (n) => 150 + n * 50;

// css 'prisme' = couleur qui change en continu
export const COULEURS = [
  { id: '', nom: 'Couleur du champion', css: null, niv: 1 },
  { id: 'ivoire', nom: 'Ivoire', css: '#f4ead2', niv: 2 },
  { id: 'ambre', nom: 'Ambre', css: '#ffb347', niv: 3 },
  { id: 'azur', nom: 'Azur', css: '#5ab8ff', niv: 5 },
  { id: 'emeraude', nom: 'Émeraude', css: '#4ade80', niv: 8 },
  { id: 'rubis', nom: 'Rubis', css: '#ff4d6d', niv: 12 },
  { id: 'amethyste', nom: 'Améthyste', css: '#b88aff', niv: 16 },
  { id: 'or', nom: 'Or royal', css: '#ffd700', niv: 20 },
  { id: 'givre', nom: 'Givre', css: '#aef4ff', niv: 25 },
  { id: 'corail', nom: 'Corail', css: '#ff7f6a', niv: 30 },
  { id: 'neon', nom: 'Néon', css: '#39ff14', niv: 40 },
  { id: 'prisme', nom: 'Prismatique', css: 'prisme', niv: 50 },
  // récompenses de saison
  { id: 's_platine', nom: 'Platine (saison)', css: '#7fe0c2', rang: 'Platine' },
  { id: 's_diamant', nom: 'Diamant (saison)', css: '#8fc8ff', rang: 'Diamant' },
  { id: 's_maitre', nom: 'Maître (saison)', css: '#ff6ad5', rang: 'Maître' },
];

export const CADRES = [
  { id: '', nom: 'Simple', niv: 1, bord: '#5a6070' },
  { id: 'bronze', nom: 'Bronze forgé', niv: 4, bord: '#c98a52' },
  { id: 'argent', nom: 'Argent poli', niv: 10, bord: '#d6dee6' },
  { id: 'or', nom: 'Or', niv: 18, bord: '#ffcf3a', lueur: '#ffcf3a' },
  { id: 'runique', nom: 'Runique', niv: 25, bord: '#7fe0c2', lueur: '#7fe0c2', double: true },
  { id: 'braise', nom: 'Braise', niv: 35, bord: '#ff6a2a', lueur: '#ff3a00', anim: true },
  { id: 'celeste', nom: 'Céleste', niv: 45, bord: '#e6f2ff', lueur: '#8fc8ff', anim: true, double: true },
  { id: 'eternel', nom: 'Éternel', niv: 60, bord: '#ffd700', lueur: '#ff6ad5', anim: true, double: true },
  // récompenses de saison : un cadre par rang
  ...RANGS.map((R) => ({ id: `rang_${R.nom.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`, nom: `${R.icone} ${R.nom} (saison)`, rang: R.nom, bord: R.css, lueur: R.css, double: true })),
];

export const TITRES_NIVEAU = [
  { niv: 5, nom: 'Aventurier' }, { niv: 10, nom: 'Combattant' }, { niv: 20, nom: 'Vétéran' },
  { niv: 30, nom: 'Héros des arènes' }, { niv: 40, nom: 'Champion élémentaire' }, { niv: 50, nom: 'Mythique' }, { niv: 60, nom: 'Éternel' },
];

export const couleurDe = (id) => COULEURS.find((c) => c.id === id) || COULEURS[0];
export const cadreDe = (id) => CADRES.find((c) => c.id === id) || CADRES[0];
export const valideCouleur = (id) => (COULEURS.some((c) => c.id === id) ? id : '');
export const valideCadre = (id) => (CADRES.some((c) => c.id === id) ? id : '');

// Style CSS d'un cadre (bordure + lueur), pour les portraits du menu et de l'interface
export function styleCadre(id, taille = 3) {
  const C = cadreDe(id);
  const ombre = [C.double ? `0 0 0 ${taille}px #0b0d14, 0 0 0 ${taille * 2}px ${C.bord}` : '', C.lueur ? `0 0 ${taille * 4}px ${C.lueur}` : ''].filter(Boolean).join(', ');
  return `border:${taille}px solid ${C.bord};${ombre ? `box-shadow:${ombre};` : ''}`;
}

// Emotes et messages rapides (roue : touche T, ou bouton 💬 sur téléphone)
export const EMOTES = [
  { id: 'gg', txt: 'GG', niv: 1 }, { id: 'salut', txt: '👋 Salut !', niv: 1 }, { id: 'rire', txt: '😂', niv: 1 },
  { id: 'aide', txt: '🆘 Aide-moi !', niv: 1 }, { id: 'focus', txt: '🎯 Concentrez-le !', niv: 1 }, { id: 'oups', txt: '😅 Oups…', niv: 1 },
  { id: 'feu', txt: '🔥 En feu !', niv: 6 }, { id: 'crane', txt: '💀', niv: 12 }, { id: 'couronne', txt: '👑 Trop fort', niv: 20 },
  { id: 'calme', txt: '😎 Tranquille', niv: 28 }, { id: 'colere', txt: '😤 Revanche !', niv: 36 }, { id: 'legende', txt: '✨ Légendaire', niv: 45 },
];
export const emoteDe = (id) => EMOTES.find((e) => e.id === id);
