// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le cadeau de connexion (v93)
//  Un cadeau par jour (minuit UTC), sur un cycle de 7 jours qui recommence.
//  Rater un jour fait repartir le cycle au jour 1. Le 7e jour : un coffre.
// =====================================================================
import { RARES } from './cartes.js';
import { jourDe } from './quetes.js';

// rare : la ressource rare de son clan
export const CADEAUX = [
  { essence: 300 },
  { eclats: 20 },
  { essence: 500, eclats: 10 },
  { rare: 3 },
  { eclats: 40 },
  { essence: 800, rare: 2 },
  { essence: 1500, eclats: 100, rare: 5, coffre: true },
];
const veille = (jour) => jourDe(Date.parse(`${jour}T12:00:00Z`) - 864e5);

// p.connexion = { jour: dernier jour réclamé, n: numéro du dernier cadeau réclamé (1 à 7) }
export function etat(p, t = Date.now()) {
  const c = p.connexion || {}, auj = jourDe(t);
  if (c.jour === auj) return { dispo: false, n: c.n, prochain: c.n % 7 + 1 };
  const suite = c.jour && c.jour === veille(auj);
  const n = suite ? (c.n % 7) + 1 : 1;
  return { dispo: true, n, rompu: !!c.jour && !suite && c.n > 0 };
}
export function cadeau(n, clan) {
  const g = CADEAUX[n - 1], r = { ...g };
  if (g.rare) { r.rare = { id: RARES[clan]?.id || 'cristal', n: g.rare }; }
  return r;
}
export function reclamer(p, t = Date.now()) {
  const e = etat(p, t);
  if (!e.dispo) return { ok: false, raison: 'Déjà réclamé aujourd’hui : reviens demain !' };
  const g = cadeau(e.n, p.clan);
  p.ress.essence += g.essence || 0;
  p.ress.eclats = (p.ress.eclats || 0) + (g.eclats || 0);
  if (g.rare) p.ress[g.rare.id] = (p.ress[g.rare.id] || 0) + g.rare.n;
  p.connexion = { jour: jourDe(t), n: e.n };
  return { ok: true, res: { n: e.n, cadeau: g } };
}
