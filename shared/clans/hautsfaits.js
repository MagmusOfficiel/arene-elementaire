// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — hauts faits et titres (v60)
//  Pur (client + serveur). Chaque haut fait a trois paliers (bronze,
//  argent, or), calculés d'après le profil : rien à stocker, rien à
//  réclamer. Chaque palier atteint débloque un titre que le joueur peut
//  afficher sous son nom (p.titre = 'victoires:2').
// =====================================================================
import { BRANCHES, NIV_MAX } from './cartes.js';
import * as QP from './quetesPnj.js';
import * as GR from './grimoire.js';
import { possedes as familiers } from './familiers.js';

const v = (p) => p.stats || {};
// n : les trois seuils ; titres : un par palier
export const HAUTS_FAITS = {
  victoires: { nom: 'Aventurier', ico: '⚔️', txt: 'combats d’expédition gagnés', n: [10, 100, 500], titres: ['Aventurier', 'Vétéran des expéditions', 'Légende des expéditions'], val: (p) => v(p).victoires || 0 },
  boss: { nom: 'Tueur de boss', ico: '👑', txt: 'boss d’expédition vaincus', n: [1, 10, 50], titres: ['Tueur de boss', 'Fléau des boss', 'Briseur de couronnes'], val: (p) => v(p).boss || 0 },
  cauchemar: { nom: 'Cauchemar', ico: '💀', txt: 'boss du Cauchemar vaincus', n: [1, 5, 20], titres: ['Éveillé', 'Chasseur de cauchemars', 'Celui qui ne dort pas'], val: (p) => v(p).cauchemar || 0 },
  expeditions: { nom: 'Explorateur', ico: '🧭', txt: 'expéditions commencées', n: [5, 50, 200], titres: ['Explorateur', 'Cartographe', 'Arpenteur des mondes'], val: (p) => v(p).expeditions || 0 },
  quetes: { nom: 'Serviable', ico: '📜', txt: 'quêtes réclamées', n: [10, 60, 250], titres: ['Serviable', 'Héros du village', 'Pilier du clan'], val: (p) => v(p).quetes || 0 },
  sanct: { nom: 'Conquérant', ico: '🏳️', txt: 'prises de sanctuaire', n: [1, 10, 50], titres: ['Porte-étendard', 'Conquérant', 'Seigneur des sanctuaires'], val: (p) => v(p).sanct || 0 },
  duels: { nom: 'Duelliste', ico: '🤺', txt: 'duels gagnés', n: [1, 25, 100], titres: ['Duelliste', 'Fine lame', 'Maître duelliste'], val: (p) => p.duels?.gagnes || 0 },
  arene: { nom: 'Gladiateur', ico: '🏟️', txt: 'meilleur classement d’arène (Elo)', n: [1100, 1400, 1700], titres: ['Gladiateur', 'Champion de l’arène', 'Maître de l’arène'], val: (p) => Math.max(v(p).areneMax || 0, p.arene?.meilleur || 0), seuils: ['Argent', 'Platine', 'Maître'] },
  tirages: { nom: 'Invocateur de cartes', ico: '🎴', txt: 'tirages à l’autel', n: [10, 100, 500], titres: ['Curieux', 'Collectionneur compulsif', 'Favori de l’autel'], val: (p) => p.tirages?.total || 0 },
  collection: { nom: 'Collectionneur', ico: '📚', txt: 'cartes différentes possédées', n: [20, 40, 55], titres: ['Collectionneur', 'Archiviste', 'Gardien du grimoire'], val: (p) => Object.values(p.collection || {}).filter((c) => c.n > 0).length },
  maitrise: { nom: 'Forgeron', ico: '🔨', txt: `cartes au niveau ${NIV_MAX}`, n: [1, 10, 30], titres: ['Apprenti forgeron', 'Forgeron', 'Maître forgeron'], val: (p) => Object.values(p.collection || {}).filter((c) => c.n > 0 && c.niv >= NIV_MAX).length },
  projet: { nom: 'Bâtisseur', ico: '🏗️', txt: 'points donnés aux projets du clan', n: [100, 1500, 8000], titres: ['Bâtisseur', 'Architecte du clan', 'Bienfaiteur légendaire'], val: (p) => v(p).projet || 0 },
  faille: { nom: 'La Faille', ico: '🌀', txt: 'parties de l’histoire des Terres Brisées finies', n: [1, 3, 5], titres: ['Voyageur de la Faille', 'Arpenteur du vide', 'Sauveur des trois clans'], val: (p) => QP.histoireFaille(p) },   // v90
  cimes: { nom: 'Les Cimes', ico: '⚡', txt: 'parties de l’histoire des Cimes Orageuses finies', n: [1, 3, 5], titres: ['Voyageur des cimes', 'Chasseur d’orages', 'Celui qui ferma l’Œil'], val: (p) => QP.histoireCimes(p) },   // v96
  tour: { nom: 'La Tour', ico: '🗼', txt: 'meilleur étage de la Tour infinie', n: [10, 50, 100], titres: ['Grimpeur', 'Conquérant de la Tour', 'Maître de la Tour'], val: (p) => Math.max(p.tour?.record || 0, p.tour?.max || 0) },   // v91
  familiers: { nom: 'Ami des bêtes', ico: '🐾', txt: 'familiers', n: [1, 3, 6], titres: ['Ami des bêtes', 'Dresseur', 'Gardien de la ménagerie'], val: (p) => familiers(p).length },
};
export const IDS = Object.keys(HAUTS_FAITS);
export const PALIERS = ['🥉', '🥈', '🥇'];
// le palier atteint (0 : aucun, 1 à 3)
export const palierDe = (p, id) => { const h = HAUTS_FAITS[id], x = h.val(p); return h.n.filter((s) => x >= s).length; };
export const etat = (p) => IDS.map((id) => ({ id, ...HAUTS_FAITS[id], v: HAUTS_FAITS[id].val(p), palier: palierDe(p, id) }));
export const total = (p) => IDS.reduce((s, id) => s + palierDe(p, id), 0);   // sur 3 × 13
export const MAX = IDS.length * 3;
// les titres : 'id:palier'
// le titre de sa branche (v69) : 'br:<branche>'
export const titreValide = (p, t) => { if (typeof t !== 'string') return false; const [id, n] = t.split(':'); if (id === 'br') return !!BRANCHES[n] && p.branche === n; if (id === 'vil') return !!QP.TITRES[n] && QP.amiDe(p, n); if (id === 'gri') return !!GR.TITRES[n] && GR.aTitre(p, n); return !!HAUTS_FAITS[id] && +n >= 1 && +n <= 3 && palierDe(p, id) >= +n; };
export const nomTitre = (t) => { const [id, n] = String(t || '').split(':'); if (id === 'br') return BRANCHES[n]?.titre || ''; if (id === 'vil') return QP.TITRES[n] || ''; if (id === 'gri') return GR.TITRES[n] || ''; return HAUTS_FAITS[id]?.titres[+n - 1] || ''; };
export const titreDe = (p) => (titreValide(p, p.titre) ? p.titre : '');
export function choisirTitre(p, t) {
  if (t === null || t === '') { p.titre = ''; return { ok: true }; }
  if (!titreValide(p, t)) return { ok: false, raison: 'Titre pas encore débloqué.' };
  p.titre = t; return { ok: true };
}
// tous les paliers atteints, sous forme 'id:palier' (pour repérer les nouveaux)
export const obtenus = (p) => new Set(IDS.flatMap((id) => Array.from({ length: palierDe(p, id) }, (_, i) => `${id}:${i + 1}`)));
