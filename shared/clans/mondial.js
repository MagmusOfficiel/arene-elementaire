// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — phase 3 : boss mondiaux et rivalité des clans
//  Pur et partagé (client, serveur, tests).
//  - Un boss mondial apparaît régulièrement dans un territoire. Ses PV sont
//    communs à tout le serveur : chaque joueur l'affronte en « manches »
//    (un combat de cartes normal) et les dégâts de toutes les manches
//    s'additionnent. Quand il tombe, chaque participant est récompensé.
//  - Le classement des clans : des points gagnés par les actions vérifiées
//    par le serveur (duels, filons, boss mondial, boss d'expédition),
//    remis à zéro chaque lundi. Le clan en tête est « champion » la semaine suivante.
// =====================================================================
import { RARES } from './cartes.js';

export const BOSS_MONDIAUX = {
  feu: { id: 'titan_magma', nom: 'Titan de magma', ico: '🌋', pv: 200, rang: 'boss', intentions: [{ a: 16 }, { d: 14, f: 2 }, { a: 7, n: 3 }, { w: 2, a: 10 }, { b: 6, a: 12 }] },
  eau: { id: 'leviathan_abyssal', nom: 'Léviathan abyssal', ico: '🐋', pv: 210, rang: 'boss', intentions: [{ a: 9, n: 2 }, { t: 2, d: 10 }, { a: 18 }, { f: 2, d: 10 }, { a: 5, n: 4 }] },
  plante: { id: 'ancien_sylvain', nom: 'Ancien sylvain', ico: '🌳', pv: 205, rang: 'boss', intentions: [{ a: 11, e: 3 }, { d: 16 }, { a: 6, n: 3 }, { w: 2, a: 10 }, { a: 19 }] },
};
export const PALIER_MONDIAL = { pv: 1, deg: 1.15, butin: 1, nom: 'Boss mondial' };

export const MONDIAL = {
  premier: 120e3,            // le premier boss arrive 2 min après le démarrage du serveur
  intervalle: 15 * 60e3,     // puis un toutes les 15 minutes…
  duree: 8 * 60e3,           // … qui reste 8 minutes avant de repartir
  pause: 15e3,               // attente entre deux manches pour un même joueur
  portee: 90,                // distance pour l'engager
  degParSeconde: 14,         // anti-triche : pas plus de dégâts qu'en jouant vraiment
};
// PV communs : de quoi tenir plusieurs manches selon le monde présent
export const pvMondial = (nJoueurs) => Math.min(5000, 700 + 300 * Math.max(1, nJoueurs));
// ce qu'un joueur peut infliger en une manche (le boss de la manche a au plus ses PV de modèle)
export const pvManche = (terr, restant) => Math.max(1, Math.min(BOSS_MONDIAUX[terr].pv, restant));
// des dégâts déclarés plausibles ?
export const degatsValides = (deg, debut, maintenant, terr) => {
  const d = Math.floor(+deg || 0); if (!(d >= 0)) return 0;
  const parTemps = Math.floor(((maintenant - debut) / 1000) * MONDIAL.degParSeconde) + 10;
  return Math.max(0, Math.min(d, BOSS_MONDIAUX[terr].pv, parTemps));
};

// récompense d'un participant quand le boss tombe (part = ses dégâts / total)
export function recompenseMondial(terr, degats, total, rang) {
  const part = total > 0 ? degats / total : 0;
  return {
    essence: 150 + Math.round(450 * part) + (rang === 1 ? 100 : 0),
    eclats: 15 + (rang <= 3 ? 15 : 0),
    rare: { id: RARES[terr].id, n: 2 + (rang === 1 ? 1 : 0) },
  };
}

// ---------- la rivalité des clans ----------
export const POINTS = {
  duel: 10,            // victoire en duel
  filon: 3,            // filon rare ramassé
  bossExpe: 8,         // boss d'expédition vaincu (au plus un toutes les 3 minutes)
  mondialPar: 10,      // 1 point tous les 10 dégâts au boss mondial
  mondialFin: 20,      // participation à un boss mondial vaincu
  mondialTop: 30, quete: 4, queteSemaine: 15,      // meilleur contributeur
};
// numéro de semaine (lundi 0 h UTC) : sert de saison au classement des clans
export function semaineDe(t = Date.now()) {
  const d = new Date(t), jour = (d.getUTCDay() + 6) % 7;
  const lundi = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - jour);
  return { id: new Date(lundi).toISOString().slice(0, 10), fin: lundi + 7 * 864e5 };
}
export const NOMS_CLANS = { feu: 'Clan du Feu', eau: "Clan de l'Eau", plante: 'Clan de la Plante' };
