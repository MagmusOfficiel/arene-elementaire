// =====================================================================
//  MODE CLASSÉ : cote (points de classement), rangs et saison.
//  Un tournoi classé de 8 : la cote monte ou descend selon la place obtenue,
//  et les adversaires (bots) sont plus forts quand la cote est haute.
// =====================================================================
// Une saison = un mois civil (heure UTC). Saison 1 = novembre 2026.
export function saisonDe(t = Date.now()) {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
  const n = Math.max(1, (y - 2026) * 12 + (m - 10) + 1);
  return { n, nom: `Saison ${n}`, debut: Date.UTC(y, m, 1), fin: Date.UTC(y, m + 1, 1) };
}
export const SAISON = { get nom() { return saisonDe().nom; }, get n() { return saisonDe().n; }, depart: 1000 };
// Début de saison : la cote revient à mi-chemin de 1000 (on garde une partie de son niveau)
export const resetDoux = (cote) => Math.round(SAISON.depart + (cote - SAISON.depart) * 0.5);

export const RANGS = [
  { nom: 'Bronze',  min: 0,    css: '#c98a52', icone: '🥉' },
  { nom: 'Argent',  min: 1150, css: '#c8d2dc', icone: '🥈' },
  { nom: 'Or',      min: 1300, css: '#ffcf3a', icone: '🥇' },
  { nom: 'Platine', min: 1450, css: '#7fe0c2', icone: '💠' },
  { nom: 'Diamant', min: 1600, css: '#8fc8ff', icone: '💎' },
  { nom: 'Maître',  min: 1750, css: '#ff6ad5', icone: '👑' },
];

// Rang + division (III, II, I) + progression vers le palier suivant
export function rangDe(cote) {
  let i = 0;
  while (i + 1 < RANGS.length && cote >= RANGS[i + 1].min) i++;
  const R = RANGS[i], next = RANGS[i + 1];
  if (!next) return { ...R, div: '', label: R.nom, prog: 1, i };
  const lo = i === 0 ? 1000 : R.min, span = (next.min - lo) / 3;
  const d = Math.max(0, Math.min(2, Math.floor((cote - lo) / span)));
  const prog = Math.max(0, Math.min(1, (cote - lo - d * span) / span));
  const div = ['III', 'II', 'I'][d];
  return { ...R, div, label: `${R.nom} ${div}`, prog, i };
}

// Points gagnés / perdus selon la place (1 = vainqueur, 2 = finaliste, 3 = demi, 5 = quart)
export function deltaCote(place, cote) {
  const base = { 1: 38, 2: 20, 3: 6, 5: -14 }[place] ?? -14;
  const ajust = Math.max(-14, Math.min(10, -(cote - 1100) / 40));   // plus dur de monter tout en haut
  let d = Math.round(base + ajust);
  if (place === 1) d = Math.max(12, d);
  if (place === 5) d = Math.min(-6, d);
  return d;
}

// Niveau des adversaires bots selon la cote moyenne des joueurs
export const niveauBots = (cote) => ({
  skill: Math.max(0.3, Math.min(0.95, 0.35 + (cote - 900) / 1400)),
  react: Math.max(0.12, Math.min(0.55, 0.55 - (cote - 900) / 2500)),
});

export const coteValide = (c) => (Number.isFinite(c) ? Math.max(0, Math.min(4000, Math.round(c))) : SAISON.depart);
