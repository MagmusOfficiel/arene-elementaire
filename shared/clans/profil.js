// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le profil du joueur
//  clan, ressources, collection de cartes, deck, parcelle, tirages,
//  et les règles qui les font évoluer : tirages, amélioration des cartes,
//  production et construction de la parcelle, butin des expéditions.
// =====================================================================
import { xpQuetes } from './quetesPnj.js';
import { OX, OY } from './decalage.js';
import { BRANCHES, CARTES, CLANS, CLASSES, ELEMENTS, RARETES, RARES, RECETTES, deckDepart, NIV_MAX } from './cartes.js';
import { alea } from './combat.js';

export const DECK_MIN = 20, DECK_MAX = 30, COPIES_MAX = 2;   // v91 : 20 cartes au moins (avant : 10)
// v83 : 2 exemplaires d'une même carte au plus dans un deck, 1 seul pour une légendaire
export const copiesMax = (id) => (CARTES[id]?.rarete === 'legendaire' ? 1 : COPIES_MAX);
export const PRIX_TIRAGE = 100, PRIX_TIRAGE_10 = 900;

export function nouveauProfil(clan, nom = 'Joueur', maintenant = Date.now(), classe = 'combattant') {
  if (!CLANS.includes(clan)) throw new Error('clan inconnu');
  if (!CLASSES[classe]) throw new Error('classe inconnue');
  const deck = deckDepart(clan, classe), collection = {};
  for (const id of deck) collection[id] = { n: (collection[id]?.n || 0) + 1, niv: 1 };
  return { geoV: 1,   // v100 : déjà dans le monde décalé
    v: 2, clan, classe, nom: String(nom).slice(0, 16) || 'Joueur', creeLe: maintenant,
    ress: { essence: 300, braises: 0, perles: 0, seve: 0, eclats: 0, cristal: 0, perle_noire: 0, graine_or: 0, fragments: 0, eclat_vide: 0, plumes: 0, cristal_foudre: 0, sable_dore: 0, larme_ambre: 0, poussiere_etoile: 0, coeur_etoile: 0 },
    duels: { gagnes: 0, perdus: 0 },
    collection, deck,
    parcelle: { maison: 1, autel: 1, atelier: 1, recolte: maintenant },
    tirages: { total: 0, depuisLegendaire: 0 },
    paliers: { feu: 1, eau: 1, plante: 1, brisees: 1, cimes: 1, ambre: 1, ciel: 1 },   // le palier max débloqué dans chaque territoire
    stats: { combats: 0, victoires: 0, boss: 0, expeditions: 0 },
    expedition: null,
  };
}
// v108 : au-delà du niveau 5, chaque niveau de maison donne 10 PV (et non 6)
export const pvMaison = (n) => 60 + (Math.min(n, 5) - 1) * 6 + Math.max(0, n - 5) * 10;
export const pvMax = (p) => pvMaison(p.parcelle.maison) + (CLASSES[p.classe]?.pv || 0);
// v97 : la vie se garde entre les expéditions ; on la remet au max en se reposant chez soi (p.vie absent = vie pleine)
export const vie = (p) => { const m = pvMax(p); return p.vie == null ? m : Math.max(1, Math.min(m, Math.round(+p.vie || 1))); };
export const blesse = (p) => vie(p) < pvMax(p);
export function seReposer(p) { if (p.expedition) return { ok: false, raison: 'Finis d’abord ton expédition.' }; if (!blesse(p)) return { ok: false, raison: 'Tu es déjà en pleine forme.' }; const avant = vie(p); delete p.vie; return { ok: true, soin: pvMax(p) - avant, pv: pvMax(p) }; }
// un profil d'avant les classes : on lui donne sa classe et ses deux cartes de départ
export function choisirClasse(p, classe) {
  if (p.classe || !CLASSES[classe]) return false;
  p.classe = classe; p.v = 2;
  for (const id of CLASSES[classe].depart) { const c = (p.collection[id] ||= { n: 0, niv: 1 }); if (c.n < copiesMax(id)) c.n++; if (p.deck.length < DECK_MAX) p.deck.push(id); }
  const conv = convertirAutresClasses(p); if (conv.n) p.avisClasse = conv;
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
function tirerCarte(r, clan, rarete, classe, branche, chef = null) {
  // le pool : l'élément de son clan et les cartes de sa classe sortent bien plus souvent
  // les cartes des autres classes ne sortent jamais (v68)
  const poids = (c) => (c.classe ? 5 : c.element === clan ? 5 : c.element === 'neutre' ? 2 : 1.2);
  const pool = Object.values(CARTES).filter((c) => c.rarete === rarete && !c.exclusif && !c.trophee && pourClasse(c.id, classe, branche, chef) && pourClan(c.id, clan));   // v122 : les sorts de chef sortent aussi (pour son chef)   // v116 : jamais l'élément d'un autre clan
  const tot = pool.reduce((s, c) => s + poids(c), 0);
  let x = r() * tot;
  for (const c of pool) { x -= poids(c); if (x <= 0) return c.id; }
  return pool[pool.length - 1].id;
}
// n = 1 ou 10. Les doublons au-delà de 2 exemplaires (1 pour une légendaire) deviennent des éclats.
export function tirer(p, n = 1, graine = Date.now()) {
  const prix = n === 10 ? PRIX_TIRAGE_10 : PRIX_TIRAGE * n;
  if (p.ress.essence < prix) return { ok: false, raison: "Pas assez d'essence." };
  p.ress.essence -= prix;
  const r = alea(graine), res = [];
  for (let i = 0; i < n; i++) {
    const garantie = n === 10 && i === 9 && !res.some((x) => ['epique', 'legendaire'].includes(CARTES[x.id].rarete));
    const rar = tirerRarete(r, p, garantie), id = tirerCarte(r, p.clan, rar, p.classe, p.branche, p.chef || null);
    p.tirages.total++; p.tirages.depuisLegendaire = rar === 'legendaire' ? 0 : p.tirages.depuisLegendaire + 1;
    const c = (p.collection[id] ||= { n: 0, niv: 1 });
    const nouveau = c.n === 0;
    let eclats = 0;
    if (c.n >= copiesMax(id)) { eclats = RARETES[rar].eclats; p.ress.eclats += eclats; } else c.n++;
    res.push({ id, nouveau, eclats });
  }
  return { ok: true, cartes: res };
}

// ---------- améliorer une carte (niveau 2 puis 3) ----------
// remise : 0,2 = 20 % de moins (bonus de la Forge géante)
const remiser = (cout, remise) => (remise > 0 ? Object.fromEntries(Object.entries(cout).map(([k, v]) => [k, Math.ceil(v * (1 - remise))])) : cout);
export function coutAmelioration(id, niv, remise = 0) {
  const c = CARTES[id], base = { commune: 1, rare: 2, epique: 3, legendaire: 5 }[c.rarete];
  const eclats = (niv === 1 ? 20 : 60) * base, mat = (niv === 1 ? 10 : 30) * base;
  return remiser(c.element === 'neutre' ? { eclats, essence: mat * 5 } : { eclats, [ELEMENTS[c.element].materiau]: mat }, remise);
}
export function ameliorer(p, id, remise = 0) {
  const c = p.collection[id];
  if (!c || c.n < 1) return { ok: false, raison: "Tu n'as pas cette carte." };
  if (c.niv >= NIV_MAX) return { ok: false, raison: 'Déjà au niveau maximum.' };
  const cout = coutAmelioration(id, c.niv, remise);
  for (const [k, v] of Object.entries(cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(cout)) p.ress[k] -= v;
  c.niv++;
  return { ok: true, niv: c.niv };
}

// ---------- fabriquer une carte exclusive avec les ressources rares de son territoire ----------
export function coutFabrication(id, remise = 0) {
  const c = CARTES[id]; if (!c?.exclusif) return null;
  const r = RECETTES[c.rarete];
  return remiser({ [RARES[c.exclusif].id]: r.rare, essence: r.essence }, remise);
}
export function fabriquer(p, id, remise = 0) {
  if (!pourClasse(id, p.classe, p.branche, p.chef)) return { ok: false, raison: `Cette relique est réservée à une autre classe.` };
  if (!pourClan(id, p.clan)) return { ok: false, raison: `Cette carte est réservée au ${ELEMENTS[CARTES[id].element].clan}.` };
  const cout = coutFabrication(id, remise); if (!cout) return { ok: false };
  const c = (p.collection[id] ||= { n: 0, niv: 1 });
  if (c.n >= copiesMax(id)) return { ok: false, raison: `${copiesMax(id)} exemplaire${copiesMax(id) > 1 ? 's' : ''} au plus.` };
  for (const [k, v] of Object.entries(cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(cout)) p.ress[k] -= v;
  c.n++;
  return { ok: true };
}
// ---------- le butin d'un duel (calculé par le serveur, appliqué par chacun) ----------
export const BUTIN_DUEL = (essencePerdant) => Math.min(300, Math.floor(Math.max(0, essencePerdant) * 0.15));
// un profil plus ancien : les champs ajoutés depuis
export function completer(p) {
  // v100 : l'ancien monde a été décalé (désert à gauche, îles en haut) — on décale une seule fois la maison posée
  if (!p.geoV) { if (p.maisonPos && Number.isFinite(p.maisonPos.x)) p.maisonPos = { x: p.maisonPos.x + OX, y: p.maisonPos.y + OY }; p.geoV = 1; }
  for (const k of ['cristal', 'perle_noire', 'graine_or', 'fragments', 'eclat_vide', 'plumes', 'cristal_foudre', 'sable_dore', 'larme_ambre', 'poussiere_etoile', 'coeur_etoile']) p.ress[k] ??= 0;
  p.duels ??= { gagnes: 0, perdus: 0 };
  if (p.paliers) { p.paliers.brisees ??= 1; p.paliers.cimes ??= 1; p.paliers.ambre ??= 1; p.paliers.ciel ??= 1; }   // v87, v96, v98, v99
  if (p.amis !== undefined) p.amis = Array.isArray(p.amis) ? p.amis.filter((x) => x && typeof x.pid === 'string' && typeof x.nom === 'string').slice(0, 30).map((x) => ({ pid: x.pid.slice(0, 16), nom: x.nom.slice(0, 20) })) : [];   // v93
  p.parcours ??= (p.stats?.combats || 0) > 0 ? 6 : 0;   // v79 : les anciens joueurs ont déjà fait leurs premiers pas
  // v83 : decks remis aux nouvelles limites (2 par carte, 1 par légendaire), puis complétés si besoin
  delete p.avisDeck;
  const avant = p.deck.length;
  p.deck = nettoyerDeck(p, p.deck);
  p.deck = remplirDeck(p, p.deck);
  if (p.decks?.l) for (const d of p.decks.l) if (Array.isArray(d?.cartes)) d.cartes = remplirDeck(p, nettoyerDeck(p, d.cartes));   // v91 : chaque deck enregistré remonte à 20
  if (p.deck.length < avant) p.avisDeck = avant - p.deck.length;
  delete p.avisClasse;
  const conv = convertirAutresClasses(p);
  if (conv.n) p.avisClasse = conv;   // le client prévient le joueur une fois (effacé au chargement suivant)
  return p;
}

// ---------- les cartes de classe (v68) : chaque classe ne joue que ses propres cartes de classe ----------
// une carte sans classe (élément ou neutre) va à tout le monde
// une carte de branche (v69) ne va qu'à sa branche
// v122 : une carte de chef ne va qu'à son chef
export const pourClasse = (id, classe, branche = null, chef = null) => { const c = CARTES[id]; return !c?.classe || (c.classe === classe && (!c.branche || c.branche === branche) && (!c.chef || c.chef === chef)); };
// v116 : une carte d'élément (Feu, Eau, Plante) ne va qu'au clan de cet élément ; les cartes neutres et de zone vont à tous
export const pourClan = (id, clan) => { const c = CARTES[id]; if (c?.cachee) return false; return !c || !CLANS.includes(c.element) || c.element === clan; };   // v124 : les cartes cachées (Fêlure) ne sont à personne
export const jouable = (id, p) => pourClasse(id, p.classe, p.branche, p.chef) && pourClan(id, p.clan);
// un ancien profil qui avait des cartes d'une autre classe : elles partent du deck et deviennent des éclats
export function convertirAutresClasses(p) {
  if (!p?.classe || !p.collection) return { n: 0, eclats: 0 };
  // v116 : aussi les cartes des éléments des autres clans (elem : combien, parmi n)
  let n = 0, eclats = 0, elem = 0;
  for (const [id, c] of Object.entries(p.collection)) {
    if (!CARTES[id] || jouable(id, p) || !(c.n > 0)) continue;
    n += c.n; eclats += c.n * RARETES[CARTES[id].rarete].eclats * (c.niv || 1);
    if (pourClasse(id, p.classe, p.branche, p.chef)) elem += c.n;
    delete p.collection[id];
  }
  if (!n) return { n: 0, eclats: 0, elem: 0 };
  p.ress.eclats = (p.ress.eclats || 0) + eclats;
  p.deck = p.deck.filter((id) => jouable(id, p));
  // un deck devenu trop petit est complété avec les cartes de base
  for (const id of deckDepart(p.clan, p.classe)) {
    if (p.deck.length >= DECK_MIN) break;
    const c = (p.collection[id] ||= { n: 0, niv: 1 });
    if (p.deck.filter((x) => x === id).length >= Math.min(c.n, copiesMax(id))) { if (c.n < copiesMax(id)) c.n++; else continue; }
    p.deck.push(id);
  }
  if (p.decks?.l) for (const d of p.decks.l) if (Array.isArray(d?.cartes)) d.cartes = d.cartes.filter((id) => jouable(id, p));
  return { n, eclats, elem };
}

// ---------- le deck ----------
export function ajouterAuDeck(p, id) {
  if (!pourClan(id, p.clan)) return { ok: false, raison: `Cette carte est réservée au ${ELEMENTS[CARTES[id].element].clan}.` };
  if (!pourClasse(id, p.classe, p.branche, p.chef)) return { ok: false, raison: CARTES[id].branche ? `Cette carte est réservée à la branche ${BRANCHES[CARTES[id].branche].nom}.` : `Cette carte est réservée à la classe ${CLASSES[CARTES[id].classe].nom}.` };
  const possede = p.collection[id]?.n || 0, dedans = p.deck.filter((x) => x === id).length;
  if (dedans >= possede) return { ok: false, raison: 'Tu n’as pas d’autre exemplaire de cette carte.' };
  if (dedans >= copiesMax(id)) return { ok: false, raison: CARTES[id].rarete === 'legendaire' ? 'Une seule légendaire de chaque sorte par deck.' : `${COPIES_MAX} exemplaires au plus dans un deck.` };
  if (p.deck.length >= DECK_MAX) return { ok: false, raison: `${DECK_MAX} cartes au plus dans un deck.` };
  p.deck.push(id); return { ok: true };
}
export function retirerDuDeck(p, id) {
  const i = p.deck.indexOf(id);
  if (i < 0) return { ok: false };
  if (p.deck.length <= DECK_MIN) return { ok: false, raison: `${DECK_MIN} cartes au moins dans un deck.` };
  p.deck.splice(i, 1); return { ok: true };
}
// ---------- plusieurs decks enregistrés (v64) ----------
// p.deck reste le deck actif (celui qu'on joue) ; p.decks garde les 3 emplacements
export const NB_DECKS = 3, NOMS_DECKS = ['Expédition', 'Arène', 'Cauchemar'];
export function emplacements(p) {
  const d = p.decks && Array.isArray(p.decks.l) ? p.decks : { actif: 0, l: [] };
  const l = Array.from({ length: NB_DECKS }, (_, i) => ({ nom: String(d.l[i]?.nom || NOMS_DECKS[i]).slice(0, 20), cartes: Array.isArray(d.l[i]?.cartes) ? d.l[i].cartes : null }));
  const actif = Number.isInteger(d.actif) && d.actif >= 0 && d.actif < NB_DECKS ? d.actif : 0;
  l[actif].cartes = [...p.deck];   // l'emplacement actif, c'est toujours le deck joué
  return { actif, l };
}
// v91 : un deck trop court est complété jusqu'au minimum avec les cartes de départ (offertes s'il le faut), puis la collection
export function remplirDeck(p, cartes) {
  const deck = [...cartes];
  for (const id of [...deckDepart(p.clan, p.classe || 'combattant'), ...Object.keys(p.collection)]) {
    if (deck.length >= DECK_MIN) break;
    if (!CARTES[id] || !pourClasse(id, p.classe, p.branche, p.chef)) continue;
    const c = (p.collection[id] ||= { n: 0, niv: 1 }), k = deck.filter((x) => x === id).length;
    if (k >= copiesMax(id)) continue;
    if (k >= c.n) c.n++;
    deck.push(id);
  }
  return deck;
}
// un deck enregistré peut ne plus être valable (cartes perdues…) : on garde ce qui l'est
export function nettoyerDeck(p, cartes) {
  const deck = [], compte = {};
  for (const id of Array.isArray(cartes) ? cartes : []) { if (!CARTES[id] || !p.collection[id] || !pourClasse(id, p.classe, p.branche, p.chef) || deck.length >= DECK_MAX) continue; compte[id] = (compte[id] || 0) + 1; if (compte[id] <= Math.min(copiesMax(id), p.collection[id].n)) deck.push(id); }
  return deck;
}
export function choisirDeck(p, i) {
  if (!Number.isInteger(i) || i < 0 || i >= NB_DECKS) return { ok: false };
  if (p.expedition) return { ok: false, raison: 'Impossible de changer de deck pendant une expédition.' };
  const e = emplacements(p); if (i === e.actif) return { ok: true };
  // un emplacement vide commence comme une copie du deck actuel
  const cible = e.l[i].cartes ? nettoyerDeck(p, e.l[i].cartes) : [...p.deck];
  if (cible.length < DECK_MIN) return { ok: false, raison: `Ce deck n'a plus que ${cible.length} cartes valables (il en faut ${DECK_MIN}).` };
  e.l[i].cartes = cible; p.deck = [...cible];
  p.decks = { actif: i, l: e.l };
  return { ok: true };
}
export function renommerDeck(p, i, nom) {
  if (!Number.isInteger(i) || i < 0 || i >= NB_DECKS || typeof nom !== 'string') return { ok: false };
  const n = nom.replace(/[<>]/g, '').trim().slice(0, 20); if (!n) return { ok: false, raison: 'Donne un nom au deck.' };
  const e = emplacements(p); e.l[i].nom = n; p.decks = { actif: e.actif, l: e.l };
  return { ok: true };
}
export const deckCombat = (p) => p.deck.map((id) => ({ id, niv: p.collection[id]?.niv || 1 }));

// ---------- la parcelle ----------
export const BATIMENTS = {
  maison: { nom: 'Maison', ico: '🏠', desc: (n) => `PV max : ${pvMaison(n)}. Stockage de la production : ${4 + Math.min(n, 5) * 2} h.` },
  autel: { nom: "Autel d'essence", ico: '🔮', desc: (n) => `Produit ${prodEssence(n)} essence par heure.` },
  atelier: { nom: 'Atelier élémentaire', ico: '⚒️', desc: (n, clan) => `Produit ${prodMat(n)} ${ELEMENTS[clan].nomMat.toLowerCase()} par heure.` },
};
export const NIV_BAT_MAX = 5;
// v108 : la maison continue de grandir avec les chapitres. Chaque histoire finie (sa dernière quête rendue)
// ouvre 2 niveaux de plus, qui se paient avec les matériaux de ce chapitre.
export const CHAPITRES_MAISON = [
  { fin: 'nyx', nom: 'Chapitre 2 · Terres Brisées', niv: [6, 7], cout: [{ essence: 2000, fragments: 120, eclat_vide: 4 }, { essence: 2600, fragments: 180, eclat_vide: 6 }] },
  { fin: 'odra', nom: 'Chapitre 3 · Cimes Orageuses', niv: [8, 9], cout: [{ essence: 3500, plumes: 150, cristal_foudre: 6 }, { essence: 4200, plumes: 220, cristal_foudre: 9 }] },
  { fin: 'imhet', nom: 'Chapitre 4 · Désert d’Ambre', niv: [10, 11], cout: [{ essence: 5000, sable_dore: 180, larme_ambre: 8 }, { essence: 6000, sable_dore: 260, larme_ambre: 12 }] },
  { fin: 'ysolde', nom: 'Chapitre 5 · Îles Célestes', niv: [12, 13], cout: [{ essence: 7000, poussiere_etoile: 220, coeur_etoile: 10 }, { essence: 8500, poussiere_etoile: 320, coeur_etoile: 14 }] },
];
export const NIV_MAISON_ABSOLU = 13;
const chapitreDe = (n) => CHAPITRES_MAISON.find((c) => c.niv.includes(n));
// le niveau maximum de chaque bâtiment pour ce joueur
export const nivMax = (p, bat) => { if (bat !== 'maison') return NIV_BAT_MAX; let m = NIV_BAT_MAX; for (const c of CHAPITRES_MAISON) if (p.pnjQ?.[c.fin]?.fait) m = c.niv[1]; else break; return m; };
// le prochain niveau de maison est-il fermé par un chapitre pas encore fini ? (pour l'afficher)
export const chapitreAFinir = (p) => { const n = p.parcelle.maison + 1, c = chapitreDe(n); return c && !p.pnjQ?.[c.fin]?.fait ? c : null; };
const prodEssence = (n) => 15 + n * 10, prodMat = (n) => 1 + n * 2;
export const stockageHeures = (p) => 4 + Math.min(p.parcelle.maison, 5) * 2;
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
  if (bat === 'maison' && n >= NIV_BAT_MAX) { const c = chapitreDe(n + 1); return c ? { ...c.cout[c.niv.indexOf(n + 1)] } : null; }
  const base = { maison: [250, 20], autel: [180, 15], atelier: [180, 25] }[bat];
  return { essence: base[0] * n, [mat]: base[1] * n };
}
export function construire(p, bat, maintenant = Date.now()) {
  if (!BATIMENTS[bat]) return { ok: false };
  if (p.parcelle[bat] >= nivMax(p, bat)) { const c = bat === 'maison' && chapitreAFinir(p); return { ok: false, raison: c ? `Finis d’abord l’histoire du ${c.nom} pour agrandir encore ta maison.` : 'Niveau maximum.' }; }
  const cout = coutBatiment(p, bat); if (!cout) return { ok: false, raison: 'Niveau maximum.' };
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

// niveau de compte (affiché à côté du nom)
// niveau maximum : 60 (v83), 80 depuis le chapitre 2 (v87)
export const NIVEAU_MAX = 100;   // v87 : 80 (chapitre 2) ; v96 : 100 (chapitre 3)
// v87 : rééquilibrage — de l'XP (1 par combat gagné, 4 par boss), et une courbe qui ralentit :
// passer du niveau n au niveau n+1 coûte de plus en plus. Niveau 20 ≈ 111 XP, 30 ≈ 213, 50 ≈ 507, 80 ≈ 1173.
export const XP_BOSS = 4;
// v108 : les quêtes des habitants rapportent aussi de l'XP (calculée à partir des quêtes rendues : rien à stocker)
export const xpDe = (p) => (p?.stats?.victoires || 0) + (p?.stats?.boss || 0) * XP_BOSS + xpQuetes(p);
export const xpPourNiveau = (n) => { const k = Math.max(0, n - 1); return Math.ceil(3 * k + 0.15 * k * k); };
export const niveau = (p) => { const x = xpDe(p); let n = 1; while (n < NIVEAU_MAX && x >= xpPourNiveau(n + 1)) n++; return n; };

// ---------- migration : un ancien profil gardé dans le navigateur ----------
// On l'accepte une seule fois, en le nettoyant (valeurs bornées, cartes connues).
export function assainir(x) {
  if (!profilValide(x)) return null;
  const num = (v, max) => Math.max(0, Math.min(max, Math.floor(+v || 0)));
  const p = nouveauProfil(x.clan, String(x.nom || 'Joueur').replace(/[<>]/g, '').slice(0, 16), +x.creeLe || Date.now(), CLASSES[x.classe] ? x.classe : 'combattant');
  if (!x.classe) p.classe = '';
  for (const k of Object.keys(p.ress)) p.ress[k] = num(x.ress?.[k], 100000);
  p.collection = {};
  for (const [id, c] of Object.entries(x.collection || {})) if (CARTES[id]) p.collection[id] = { n: Math.max(1, num(c?.n, 40)), niv: Math.max(1, Math.min(NIV_MAX, num(c?.niv, NIV_MAX))) };
  const deck = [], compte = {};
  for (const id of Array.isArray(x.deck) ? x.deck : []) { if (!p.collection[id] || deck.length >= DECK_MAX) continue; compte[id] = (compte[id] || 0) + 1; if (compte[id] <= Math.min(copiesMax(id), p.collection[id].n)) deck.push(id); }
  if (deck.length >= DECK_MIN) p.deck = deck; else { p.deck = deckDepart(p.clan, p.classe || 'combattant'); for (const id of p.deck) p.collection[id] ||= { n: copiesMax(id), niv: 1 }; }
  for (const k of ['maison', 'autel', 'atelier']) p.parcelle[k] = Math.max(1, Math.min(k === 'maison' ? NIV_MAISON_ABSOLU : 5, num(x.parcelle?.[k], 5)));
  p.parcelle.recolte = Math.min(Date.now(), +x.parcelle?.recolte || Date.now());
  for (const k of [...CLANS, 'brisees', 'cimes', 'ambre', 'ciel']) p.paliers[k] = Math.max(1, Math.min(4, num(x.paliers?.[k], 3)));
  for (const k of Object.keys(p.stats)) p.stats[k] = num(x.stats?.[k], 1e6);
  p.tirages = { total: num(x.tirages?.total, 1e6), depuisLegendaire: Math.min(59, num(x.tirages?.depuisLegendaire, 59)) };
  p.duels = { gagnes: num(x.duels?.gagnes, 1e6), perdus: num(x.duels?.perdus, 1e6) };
  p.expedition = null;   // une expédition en cours n'est pas reprise
  return p;
}
