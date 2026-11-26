// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la touche « fermer / annuler » (v117)
//  Sur CrazyGames, Échap sert à quitter le plein écran : le jeu ne doit pas
//  en dépendre. On accepte donc aussi Retour arrière (⌫), et c'est elle qui
//  est affichée sur CrazyGames. Ailleurs, on affiche « Échap ».
// =====================================================================
const surCG = import.meta.env.VITE_CRAZYGAMES === '1' || /crazygames|1001juegos/.test(location.hostname) || new URLSearchParams(location.search).has('crazygames');
const dansChamp = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
// e : un événement clavier ; vrai si c'est la touche pour fermer
export const toucheFermer = (e) => e.key === 'Escape' || (e.key === 'Backspace' && !dansChamp(e));
export const NOM_FERMER = surCG ? '⌫' : 'Échap';
