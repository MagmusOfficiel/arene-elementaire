// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le profil du joueur
//  clan, ressources, collection de cartes, deck, parcelle, tirages,
//  et les règles qui les font évoluer : tirages, amélioration des cartes,
//  production et construction de la parcelle, butin des expéditions.
// =====================================================================
import { CARTES, CLANS, CLASSES, ELEMENTS, RARETES, deckDepart, NIV_MAX } from './cartes.js';
import { alea } from './combat.js';

export const DECK_MIN = 10, DECK_MAX = 25, COPIES_MAX = 4;
export const PRIX_TIRAGE = 100, PRIX_TIRAGE_10 = 900;

export function nouveauProfil(clan, nom = 'Joueur', maintenant = Date.now(), classe = 'combattant') {
  if (!CLANS.includes(clan)) throw new Error('clan inconnu');
  if (!CLASSES[classe]) throw new Error('classe inconnue');
  const deck = deckDepart(clan, classe), collection = {};
  for (const id of deck) collection[id] = { n: (collection[id]?.n || 0) + 1, niv: 1 };
  return {
    v: 2, clan, classe, nom: String(nom).slice(0, 16) || 'Joueur', creeLe: maintenant,
    ress: { essence: 300, braises: 0, perles: 0, seve: 0, eclats: 0 },
    collection, deck,
    parcelle: { maison: 1, autel: 1, atelier: 1, recolte: maintenant },
    tirages: { total: 0, depuisLegendaire: 0 },
    paliers: { feu: 1, eau: 1, plante: 1 },   // le palier max débloqué dans chaque territoire
    stats: { combats: 0, victoires: 0, boss: 0, expeditions: 0 },
    expedition: null,
  };
}
export const pvMax = (p) => 60 + (p.parcelle.maison - 1) * 6 + (CLASSES[p.classe]?.pv || 0);
// un profil d'avant les classes : on lui donne sa classe et ses deux cartes de départ
export function choisirClasse(p, classe) {
  if (p.classe || !CLASSES[classe]) return false;
  p.classe = classe; p.v = 2;
  for (const id of CLASSES[classe].depart) { const c = (p.collection[id] ||= { n: 0, niv: 1 }); if (c.n < COPIES_MAX) c.n++; if (p.deck.length < DECK_MAX) p.deck.push(id); }
  return true;
}

// ---------- tirages ----------
const TAUX = [['legendaire', 0.02], ['epique', 0.09], ['rare', 0.27], ['commune', 0.62]];
function tirerRarete(r, p, garantieEpique) {
  if (p.tirages.depuisLegendaire >= 59) return 'legendaire';      // garantie : une légendaire tous les 60 tirages au plus
  let x = r(), acc = 0;
  for (const [rar, t] of TAUX) { acc += t; if (x < acc) return garantieEpique && (rar === 'rare' || rar === 'commune') ? 'epique' : rar; }
  return 'commune';
}
function tirerCarte(r, clan, rarete, classe) {
  // le pool : l'élément de son clan et les cartes de sa classe sortent bien plus souvent
  const poids = (c) => (c.classe ? (c.classe === classe ? 5 : 0.6) : c.element === clan ? 5 : c.element === 'neutre' ? 2 : 1.2);
  const pool = Object.values(CARTES).filter((c) => c.rarete === rarete);
  const tot = pool.reduce((s, c) => s + poids(c), 0);
  let x = r() * tot;
  for (const c of pool) { x -= poids(c); if (x <= 0) return c.id; }
  return pool[pool.length - 1].id;
}
// n = 1 ou 10. Les doublons au-delà de 3 exemplaires deviennent des éclats.
export function tirer(p, n = 1, graine = Date.now()) {
  const prix = n === 10 ? PRIX_TIRAGE_10 : PRIX_TIRAGE * n;
  if (p.ress.essence < prix) return { ok: false, raison: "Pas assez d'essence." };
  p.ress.essence -= prix;
  const r = alea(graine), res = [];
  for (let i = 0; i < n; i++) {
    const garantie = n === 10 && i === 9 && !res.some((x) => ['epique', 'legendaire'].includes(CARTES[x.id].rarete));
    const rar = tirerRarete(r, p, garantie), id = tirerCarte(r, p.clan, rar, p.classe);
    p.tirages.total++; p.tirages.depuisLegendaire = rar === 'legendaire' ? 0 : p.tirages.depuisLegendaire + 1;
    const c = (p.collection[id] ||= { n: 0, niv: 1 });
    const nouveau = c.n === 0;
    let eclats = 0;
    if (c.n >= COPIES_MAX) { eclats = RARETES[rar].eclats; p.ress.eclats += eclats; } else c.n++;
    res.push({ id, nouveau, eclats });
  }
  return { ok: true, cartes: res };
}

// ---------- améliorer une carte (niveau 2 puis 3) ----------
export function coutAmelioration(id, niv) {
  const c = CARTES[id], base = { commune: 1, rare: 2, epique: 3, legendaire: 5 }[c.rarete];
  const eclats = (niv === 1 ? 20 : 60) * base, mat = (niv === 1 ? 10 : 30) * base;
  return c.element === 'neutre' ? { eclats, essence: mat * 5 } : { eclats, [ELEMENTS[c.element].materiau]: mat };
}
export function ameliorer(p, id) {
  const c = p.collection[id];
  if (!c || c.n < 1) return { ok: false, raison: "Tu n'as pas cette carte." };
  if (c.niv >= NIV_MAX) return { ok: false, raison: 'Déjà au niveau maximum.' };
  const cout = coutAmelioration(id, c.niv);
  for (const [k, v] of Object.entries(cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(cout)) p.ress[k] -= v;
  c.niv++;
  return { ok: true, niv: c.niv };
}

// ---------- le deck ----------
export function ajouterAuDeck(p, id) {
  const possede = p.collection[id]?.n || 0, dedans = p.deck.filter((x) => x === id).length;
  if (dedans >= possede) return { ok: false, raison: 'Tu n’as pas d’autre exemplaire de cette carte.' };
  if (dedans >= COPIES_MAX) return { ok: false, raison: `${COPIES_MAX} exemplaires au plus.` };
  if (p.deck.length >= DECK_MAX) return { ok: false, raison: `${DECK_MAX} cartes au plus dans un deck.` };
  p.deck.push(id); return { ok: true };
}
export function retirerDuDeck(p, id) {
  const i = p.deck.indexOf(id);
  if (i < 0) return { ok: false };
  if (p.deck.length <= DECK_MIN) return { ok: false, raison: `${DECK_MIN} cartes au moins dans un deck.` };
  p.deck.splice(i, 1); return { ok: true };
}
export const deckCombat = (p) => p.deck.map((id) => ({ id, niv: p.collection[id]?.niv || 1 }));

// ---------- la parcelle ----------
export const BATIMENTS = {
  maison: { nom: 'Maison', ico: '🏠', desc: (n) => `PV max : ${60 + (n - 1) * 6}. Stockage de la production : ${4 + n * 2} h.` },
  autel: { nom: "Autel d'essence", ico: '🔮', desc: (n) => `Produit ${prodEssence(n)} essence par heure.` },
  atelier: { nom: 'Atelier élémentaire', ico: '⚒️', desc: (n, clan) => `Produit ${prodMat(n)} ${ELEMENTS[clan].nomMat.toLowerCase()} par heure.` },
};
export const NIV_BAT_MAX = 5;
const prodEssence = (n) => 15 + n * 10, prodMat = (n) => 1 + n * 2;
export const stockageHeures = (p) => 4 + p.parcelle.maison * 2;
export function production(p, maintenant = Date.now()) {
  const h = Math.min(stockageHeures(p), Math.max(0, (maintenant - p.parcelle.recolte) / 3600000));
  return { heures: h, essence: Math.floor(prodEssence(p.parcelle.autel) * h), [ELEMENTS[p.clan].materiau]: Math.floor(prodMat(p.parcelle.atelier) * h) };
}
export function recolter(p, maintenant = Date.now()) {
  const pr = production(p, maintenant);
  for (const [k, v] of Object.entries(pr)) if (k !== 'heures') p.ress[k] += v;
  p.parcelle.recolte = maintenant;
  return pr;
}
export function coutBatiment(p, bat) {
  const n = p.parcelle[bat], mat = ELEMENTS[p.clan].materiau;
  const base = { maison: [250, 20], autel: [180, 15], atelier: [180, 25] }[bat];
  return { essence: base[0] * n, [mat]: base[1] * n };
}
export function construire(p, bat, maintenant = Date.now()) {
  if (!BATIMENTS[bat]) return { ok: false };
  if (p.parcelle[bat] >= NIV_BAT_MAX) return { ok: false, raison: 'Niveau maximum.' };
  const cout = coutBatiment(p, bat);
  for (const [k, v] of Object.entries(cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  recolter(p, maintenant);      // on récolte d'abord, au tarif de l'ancien niveau
  for (const [k, v] of Object.entries(cout)) p.ress[k] -= v;
  p.parcelle[bat]++;
  return { ok: true, niv: p.parcelle[bat] };
}

// ---------- vérifier un profil venu du navigateur ou du compte ----------
export function profilValide(p) {
  return !!p && typeof p === 'object' && CLANS.includes(p.clan) && (!p.classe || !!CLASSES[p.classe]) && p.ress && p.collection && Array.isArray(p.deck) && p.parcelle;
}
