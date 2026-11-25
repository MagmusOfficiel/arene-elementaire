// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les lieux à visiter (v108)
//  Pur (client + serveur). Des monuments posés dans chaque zone, hors des
//  chemins : statues, ruines, épave, phare, arbre-mère… Les quêtes des
//  habitants y envoient les joueurs (« va voir la statue », « rapporte
//  ce qui traîne près de l'épave »). Chacun a une petite place dégagée
//  autour de lui (pas de décor) et un socle qu'on ne traverse pas.
//  Coordonnées du monde (les emplacements ont été choisis par calcul :
//  sol praticable, accessible depuis le Carrefour, loin des villages,
//  des portails, des sanctuaires et des autres lieux).
// =====================================================================
export const REPERES = [
  // ---- Terres de Braise
  { id: 'statue_forgeron', zone: 'feu', x: 2140, y: 2620, type: 'statue', teinte: 'feu', ico: '🗿', nom: 'Statue du Premier Forgeron' },
  { id: 'cratere', zone: 'feu', x: 700, y: 1756, type: 'cratere', teinte: 'feu', ico: '🌋', nom: 'Cratère des Cendres' },
  { id: 'flamme', zone: 'feu', x: 1628, y: 1820, type: 'brasero', teinte: 'feu', ico: '🔥', nom: 'Autel de la Flamme éternelle' },
  // ---- Lagons d'Azur
  { id: 'epave', zone: 'eau', x: 2684, y: 1436, type: 'epave', teinte: 'eau', ico: '⚓', nom: 'Épave du Grand Nautile' },
  { id: 'phare', zone: 'eau', x: 2524, y: 700, type: 'phare', teinte: 'eau', ico: '🗼', nom: 'Vieux phare' },
  { id: 'statue_marees', zone: 'eau', x: 1948, y: 1212, type: 'statue', teinte: 'eau', ico: '🗿', nom: 'Statue de la Dame des Marées' },
  // ---- Sylve d'Émeraude
  { id: 'arbre_mere', zone: 'plante', x: 3804, y: 1436, type: 'arbre_mere', teinte: 'plante', ico: '🌳', nom: 'Arbre-Mère' },
  { id: 'cercle', zone: 'plante', x: 2492, y: 2044, type: 'cercle', teinte: 'plante', ico: '🪨', nom: 'Cercle de pierres levées' },
  { id: 'statue_gardien', zone: 'plante', x: 3420, y: 2716, type: 'statue', teinte: 'plante', ico: '🗿', nom: 'Statue du Gardien Sylvestre' },
  // ---- Terres Brisées
  { id: 'monolithe', zone: 'brisees', x: 4412, y: 2908, type: 'monolithe', teinte: 'brisees', ico: '🗿', nom: 'Monolithe fêlé' },
  { id: 'ruines', zone: 'brisees', x: 252, y: 2972, type: 'ruines', teinte: 'brisees', ico: '🏛️', nom: 'Ruines du Premier Peuple' },
  // ---- Cimes Orageuses
  { id: 'statue_roi', zone: 'cimes', x: 4412, y: 956, type: 'statue', teinte: 'cimes', ico: '🗿', nom: 'Statue gelée du Roi des Tempêtes' },
  { id: 'cairn', zone: 'cimes', x: 3964, y: 2044, type: 'cairn', teinte: 'cimes', ico: '🪨', nom: 'Cairn des Disparus' },
  // ---- Désert d'Ambre
  { id: 'sphinx', zone: 'ambre', x: 380, y: 764, type: 'sphinx', teinte: 'ambre', ico: '🗿', nom: 'Sphinx ensablé' },
  { id: 'obelisque_soleil', zone: 'ambre', x: 476, y: 2268, type: 'obelisque', teinte: 'ambre', ico: '🗼', nom: 'Obélisque du Soleil' },
  // ---- Îles Célestes
  { id: 'cadran', zone: 'ciel', x: 476, y: 252, type: 'cadran', teinte: 'ciel', ico: '✨', nom: 'Cadran des Étoiles' },
  { id: 'statue_archange', zone: 'ciel', x: 3836, y: 316, type: 'statue', teinte: 'ciel', ico: '🗿', nom: 'Statue de l’Archange déchu' },
];
export const REPERE = Object.fromEntries(REPERES.map((r) => [r.id, r]));
export const RAYON_VISITE = 90;   // à cette distance du monument, on « l'a vu »
export const RAYON_OBJET = 60;    // pour ramasser un objet de quête
// un objet de quête posé près d'un lieu : [id du lieu, dx, dy] → coordonnées du monde
export const posObjet = ([id, dx, dy]) => ({ x: REPERE[id].x + dx, y: REPERE[id].y + dy });
