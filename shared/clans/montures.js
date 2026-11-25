// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les montures (v70)
//  Pur (client + serveur). Une monture se voit sous le joueur sur la carte
//  et le fait aller plus vite. Elle ne change rien en combat.
//  On les achète à l'écurie (menu ☰ ou touche N) : essence, matériaux,
//  et les ressources rares pour les plus belles.
// =====================================================================
import { niveau } from './profil.js';
import { histoireFaille, histoireCimes, amiDe } from './quetesPnj.js';

// vit : multiplicateur de vitesse sur la carte ; niv : niveau de compte requis
export const MONTURES = {
  poney: { nom: 'Poney des prés', ico: '🐴', vit: 1.25, niv: 1, cout: { essence: 1500 }, desc: 'Fidèle et robuste. Pour commencer.' },
  destrier: { nom: 'Destrier de braise', ico: '🔥', vit: 1.4, niv: 8, cout: { essence: 3000, braises: 150 }, desc: 'Un cheval noir à la crinière de flammes.' },
  raie: { nom: 'Raie des lagons', ico: '🌊', vit: 1.4, niv: 8, cout: { essence: 3000, perles: 150 }, desc: 'Elle flotte au-dessus du sol comme dans l’eau.' },
  cerf: { nom: 'Cerf sylvestre', ico: '🦌', vit: 1.4, niv: 8, cout: { essence: 3000, seve: 150 }, desc: 'Ses bois fleurissent au printemps.' },
  dragon: { nom: 'Dragon élémentaire', ico: '🐉', vit: 1.6, niv: 15, cout: { essence: 9000, cristal: 15, perle_noire: 15, graine_or: 15 }, desc: 'La monture des légendes.' },
  // v72 : deux montures qui ne s'achètent pas, elles se gagnent (et restent à vie)
  loup: { nom: 'Loup spectral', ico: '🐺', vit: 1.5, niv: 1, desc: 'Il a suivi ton retour du Cauchemar.', gagnee: { txt: 'Bats un boss d’expédition en Cauchemar.', test: (p) => (p.stats?.cauchemar || 0) >= 1 } },
  phenix: { nom: 'Phénix doré', ico: '🦅', vit: 1.65, niv: 1, desc: 'L’oiseau des champions. Il ne touche jamais le sol.', gagnee: { txt: 'Atteins le rang Platine (1 400 Elo) en arène classée.', test: (p) => Math.max(p.stats?.areneMax || 0, p.arene?.meilleur || 0) >= 1400 } },
};
// v96 : une monture par chapitre, gagnée dans l'histoire
MONTURES.lynx_vide = { nom: 'Lynx du vide', ico: '🐈‍⬛', vit: 1.6, niv: 1, desc: 'Né de la Faille. Il marche sans bruit, même sur les cristaux.', gagnee: { txt: 'Abats le Cœur de la Faille (4e partie de l’histoire des Terres Brisées).', test: (p) => histoireFaille(p) >= 4 } };
MONTURES.griffon = { nom: 'Griffon des tempêtes', ico: '🦅', vit: 1.75, niv: 1, desc: 'Il a grandi dans l’Œil du Cyclone. Le plus rapide de tous.', gagnee: { txt: 'Termine l’histoire des Cimes Orageuses (ferme l’Œil du Cyclone).', test: (p) => histoireCimes(p) >= 5 } };
// v97 : le Chapitre 1 et la Tour infinie ont aussi la leur
MONTURES.kirin = { nom: 'Kirin des trois clans', ico: '🦄', vit: 1.55, niv: 1, desc: 'Braise, lagon et sève : il porte les trois villages sur son dos.', gagnee: { txt: 'Deviens « Ami » des trois villages (les 18 quêtes des habitants du Chapitre 1).', test: (p) => ['feu', 'eau', 'plante'].every((c) => amiDe(p, c)) } };
MONTURES.wyrm_tour = { nom: 'Wyrm de la Tour', ico: '🐲', vit: 1.7, niv: 1, desc: 'Il dormait au sommet de la Tour. Il t’a attendu cent étages.', gagnee: { txt: 'Atteins l’étage 100 de la Tour infinie.', test: (p) => Math.max(p.tour?.record || 0, p.tour?.max || 0) >= 100 } };
export const IDS = Object.keys(MONTURES);
export const valide = (id) => typeof id === 'string' && Object.hasOwn(MONTURES, id);
export const gagnees = (p) => IDS.filter((id) => MONTURES[id].gagnee?.test(p || {}));
export const possedees = (p) => [...new Set([...(Array.isArray(p?.montures?.l) ? p.montures.l.filter(valide) : []), ...gagnees(p)])];
export const actif = (p) => (valide(p?.montures?.actif) && possedees(p).includes(p.montures.actif) ? p.montures.actif : null);
export const vitesse = (id) => MONTURES[id]?.vit || 1;

export function acheter(p, id) {
  if (!valide(id)) return { ok: false };
  const m = MONTURES[id];
  if (m.gagnee) return { ok: false, raison: `Cette monture ne s’achète pas : ${m.gagnee.txt}` };
  if (possedees(p).includes(id)) return { ok: false, raison: 'Tu as déjà cette monture.' };
  if (niveau(p) < m.niv) return { ok: false, raison: `Il faut être niveau ${m.niv}.` };
  for (const [k, v] of Object.entries(m.cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(m.cout)) p.ress[k] -= v;
  p.montures ||= { l: [], actif: null };
  p.montures.l.push(id); p.montures.actif = id;
  return { ok: true, id };
}
export function choisir(p, id) {
  p.montures ||= { l: [], actif: null };
  if (id === null || id === '') { p.montures.actif = null; return { ok: true }; }
  if (!possedees(p).includes(id)) return { ok: false, raison: 'Tu n’as pas cette monture.' };
  p.montures.actif = id; return { ok: true };
}
