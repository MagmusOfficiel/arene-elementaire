// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la Tour infinie (v91)
//  100 étages. Chaque étage : un combat contre 5 monstres (les sorts de
//  zone brillent ici). Tous les 10 étages, un boss avec 2 ou 4 gardes.
//  Les étages sont les mêmes pour tout le monde (composition fixe) ; on
//  monte un étage à la fois, PV pleins à chaque combat, essais illimités.
//  Récompenses à chaque étage, et des cosmétiques aux étages 25/50/75/100.
// =====================================================================
import { MONSTRES } from './monstres.js';
import { niveau, deckCombat, pvMax } from './profil.js';
import { RARES } from './cartes.js';
import * as F from './familiers.js';
import { saisonDe } from './arene.js';

export const NIV_TOUR = 10, ETAGES = 100;
export const estBoss = (n) => n % 10 === 0;

// un petit hasard fixe par étage (le même pour tous les joueurs)
const hasard = (n, k) => { let x = (n * 9973 + k * 7919 + 17) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
const choisir = (l, n, k) => l[Math.floor(hasard(n, k) * l.length)];
const TERRES = ['feu', 'eau', 'plante'];

// les monstres qu'on peut croiser selon la hauteur
function reserve(n) {
  const terres = n > 88 ? [...TERRES, 'brisees', 'cimes'] : n > 75 ? [...TERRES, 'brisees'] : TERRES;   // v96 : les monstres des Cimes en haut de la Tour
  const l = terres.flatMap((t) => MONSTRES[t].normaux);
  if (n > 30) for (const t of terres) l.push(MONSTRES[t].rare);
  if (n > 55) for (const t of terres) l.push(MONSTRES[t].autres?.rare || MONSTRES[t].rare);
  return l;
}
const BOSS = () => [
  ...TERRES.map((t) => MONSTRES[t].elite), ...TERRES.map((t) => MONSTRES[t].boss),
  ...TERRES.map((t) => MONSTRES[t].autres?.elite).filter(Boolean), ...TERRES.map((t) => MONSTRES[t].autres?.boss).filter(Boolean),
  MONSTRES.brisees.elite, MONSTRES.brisees.boss, MONSTRES.brisees.autres.elite, MONSTRES.brisees.autres.boss,
];

// la difficulté monte doucement : les monstres sont plus faibles qu'en expédition au début (ils sont 5)
export const palierEtage = (n) => ({ n: 1, nom: `Tour · étage ${n}`, pv: +(0.6 + 0.024 * n).toFixed(3), deg: +(0.65 + 0.015 * n).toFixed(3), butin: 1 });

export function ennemisEtage(n) {
  const l = reserve(n);
  if (!estBoss(n)) return Array.from({ length: 5 }, (_, k) => choisir(l, n, k));
  const b = BOSS()[(n / 10 - 1) % BOSS().length], gardes = (n / 10) % 2 === 0 ? 4 : 2;
  // le boss au milieu, ses gardes autour ; le boss est un peu plus solide que dans les expéditions
  const g = Array.from({ length: gardes }, (_, k) => choisir(l, n, k + 10));
  const moitie = gardes / 2;
  return [...g.slice(0, moitie), { ...b, pv: Math.round(b.pv * 1.6), rang: 'boss' }, ...g.slice(moitie)];
}

// ---------- les récompenses ----------
export const COSMETIQUES = { 25: 't_tour', 50: 'k_tour', 75: 'r_tour', 100: 'l_tour' };
export function recompense(n, clan) {
  const r = { essence: 40 + n * 6, eclats: n % 5 === 0 ? 5 + Math.floor(n / 5) * 2 : 0 };
  if (estBoss(n)) { r.essence += 150 + n * 10; r.rare = { id: RARES[clan]?.id || 'cristal', n: 1 + Math.floor(n / 20) }; if (n >= 70) r.eclat_vide = Math.floor(n / 30); }
  if (COSMETIQUES[n]) r.piece = COSMETIQUES[n];
  return r;
}

// ---------- l'état du joueur : p.tour = { saison, max, record, essai: { etage, graine } } ----------
// v92 : remise à zéro chaque mois (comme l'arène) — on remonte et on regagne les récompenses d'étage ;
// le record (meilleur étage de tous les temps) garde les cosmétiques et le haut fait.
export function majSaison(p, t = Date.now()) {
  const s = saisonDe(t).id;
  if (!p.tour) return false;
  if (p.tour.saison === s) return false;
  const record = Math.max(p.tour.record || 0, p.tour.max || 0);
  p.tour = { saison: s, max: 0, record, essais: 0, ...(p.tour.saison ? { precedent: p.tour.max || 0 } : {}) };
  return true;
}
export const record = (p) => Math.max(p.tour?.record || 0, p.tour?.max || 0);
export const finSaison = (t = Date.now()) => saisonDe(t).fin;
export const etageMax = (p) => p.tour?.max || 0;
export const prochain = (p) => Math.min(ETAGES, etageMax(p) + 1);
export function commencer(p, graine) {
  if (niveau(p) < NIV_TOUR) return { ok: false, raison: `La Tour s'ouvre au niveau ${NIV_TOUR}.` };
  if (p.tour) majSaison(p);
  if (etageMax(p) >= ETAGES) return { ok: false, raison: 'Tu as conquis les 100 étages ce mois-ci ! La Tour se remet à zéro au début du mois prochain.' };
  if (p.expedition) return { ok: false, raison: 'Termine ton expédition d’abord.' };
  p.tour ||= { saison: saisonDe().id, max: 0, record: 0 };
  majSaison(p);
  p.tour.essai = { etage: prochain(p), graine }; p.tour.essais = (p.tour.essais || 0) + 1;
  return { ok: true, etage: p.tour.essai.etage, graine };
}
export function defEtage(p) {
  const n = p.tour?.essai?.etage || prochain(p), pv = pvMax(p);
  return { deck: deckCombat(p), joueur: { pv, pvMax: pv }, ennemis: ennemisEtage(n), palier: palierEtage(n), graine: p.tour?.essai?.graine || 1, classe: p.classe, branche: p.branche || null, familier: F.actif(p) };
}
export function finir(p, c) {
  const e = p.tour?.essai;
  if (!e) return { ok: false };
  delete p.tour.essai;
  if (c.fini !== 'victoire') return { ok: true, victoire: false, etage: e.etage };
  const rec = recompense(e.etage, p.clan);
  p.tour.max = Math.max(p.tour.max || 0, e.etage); p.tour.record = Math.max(p.tour.record || 0, p.tour.max);
  p.ress.essence += rec.essence; p.ress.eclats = (p.ress.eclats || 0) + rec.eclats;
  if (rec.rare) p.ress[rec.rare.id] = (p.ress[rec.rare.id] || 0) + rec.rare.n;
  if (rec.eclat_vide) p.ress.eclat_vide = (p.ress.eclat_vide || 0) + rec.eclat_vide;
  return { ok: true, victoire: true, etage: e.etage, rec };
}
