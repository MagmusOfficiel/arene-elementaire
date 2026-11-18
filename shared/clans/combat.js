// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le combat de cartes (façon Slay the Spire)
//  Pur et sans affichage : le client et les tests l'utilisent pareil.
//  Tour du joueur : 3 énergie, 5 cartes piochées ; il joue ce qu'il veut,
//  puis finit son tour. Les monstres agissent selon leur intention,
//  affichée à l'avance. Le combat se gagne quand tous sont à 0 PV.
// =====================================================================
import { CARTES, effetsDe } from './cartes.js';

export function alea(graine) {
  let a = graine >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function melanger(l, r) { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }
const statuts = () => ({ bloc: 0, force: 0, brulure: 0, trempe: 0, affaibli: 0, epines: 0, regen: 0 });

// deck : [{ id, niv }] ; joueur : { pv, pvMax } ; ennemis : modèles de monstres.js ; palier : { pv, deg }
// classe : son talent s'applique pendant le combat (Endurci, Arcanes, Visée, Enchaînement)
export function nouveauCombat({ deck, joueur, ennemis, palier = { pv: 1, deg: 1 }, graine = 1, energieMax = 3, classe = null }) {
  const r = alea(graine);
  let n = 0;
  const c = {
    tour: 0, fini: null, journal: [], energie: 0, energieMax, graine, classe, tirs: 0, attaquesTour: 0, arcanes: false,
    joueur: { pv: joueur.pv, pvMax: joueur.pvMax, ...statuts() },
    ennemis: ennemis.map((m, i) => ({ uid: `e${i}`, id: m.id, nom: m.nom, ico: m.ico, rang: m.rang, pv: Math.round(m.pv * palier.pv), pvMax: Math.round(m.pv * palier.pv), intentions: m.intentions, i: Math.floor(r() * m.intentions.length), deg: palier.deg, ...statuts() })),
    pioche: melanger(deck.map((x) => ({ uid: `c${n++}`, id: x.id, niv: x.niv || 1 })), r), main: [], defausse: [], epuisees: [],
  };
  c._r = r;
  debutTour(c);
  if (classe === 'combattant') c.joueur.bloc += 6;     // Endurci
  return c;
}
const vivants = (c) => c.ennemis.filter((e) => e.pv > 0);
export const intention = (e) => e.intentions[e.i % e.intentions.length];

function piocher(c, k) {
  for (let i = 0; i < k; i++) {
    if (!c.pioche.length) { if (!c.defausse.length) return; c.pioche = melanger(c.defausse, c._r || alea(c.graine + c.tour)); c.defausse = []; }
    if (c.main.length >= 10) return;
    c.main.push(c.pioche.pop());
  }
}
function debutTour(c) {
  c.tour++;
  const j = c.joueur;
  j.bloc = 0;
  if (j.brulure > 0) { blesser(c, j, j.brulure, true); c.journal.push(`Tu brûles : −${j.brulure} PV.`); j.brulure--; if (verifierFin(c)) return; }
  if (j.trempe > 0) j.trempe--;
  if (j.affaibli > 0) j.affaibli--;
  c.energie = c.energieMax; c.attaquesTour = 0; c.arcanes = false;
  piocher(c, 5);
}
// dégâts d'une attaque : force, affaibli (−25 %), trempé (+50 %)
export function calculerDegats(base, attaquant, cible) {
  let d = base + (attaquant.force || 0);
  if (attaquant.affaibli > 0) d *= 0.75;
  if (cible.trempe > 0) d *= 1.5;
  return Math.max(0, Math.floor(d));
}
function blesser(c, cible, d, direct = false) {
  if (!direct && cible.bloc > 0) { const a = Math.min(cible.bloc, d); cible.bloc -= a; d -= a; }
  cible.pv = Math.max(0, cible.pv - d);
  return d;
}
function attaquer(c, att, cible, base, mult = 1) {
  if (cible.pv <= 0) return;
  blesser(c, cible, calculerDegats(base, att, cible) * mult);
  if (cible.epines > 0 && att.pv > 0) blesser(c, att, cible.epines);
}
function verifierFin(c) {
  if (c.joueur.pv <= 0) { c.fini = 'defaite'; return true; }
  if (!vivants(c).length) { c.fini = 'victoire'; return true; }
  return false;
}
// le coût réel d'une carte de la main : Arcanes (Mage) retire 1 au premier sort élémentaire du tour
export function coutDe(c, i) {
  const k = c.main[i]; if (!k) return 99;
  const carte = CARTES[k.id];
  return c.classe === 'mage' && !c.arcanes && carte.element !== 'neutre' ? Math.max(0, carte.cout - 1) : carte.cout;
}
export const jouable = (c, i) => { const k = c.main[i]; return !!k && !c.fini && coutDe(c, i) <= c.energie; };
// Visée (Tireur) : la prochaine attaque sera-t-elle doublée ?
export const viseeProchaine = (c) => c.classe === 'tireur' && (c.tirs + 1) % 3 === 0;
export const besoinCible = (id) => { const e = CARTES[id].effets; return CARTES[id].type === 'attaque' && !e.tous || ((e.trempe || e.affaibli || e.brulure) && !e.tous && !e.degats && !e.degatsParBrulure && !e.bouclierEnDegats); };

// jouer la carte n° i de la main, sur l'ennemi « cible » (uid) si elle vise quelqu'un
export function jouerCarte(c, i, cible) {
  if (!jouable(c, i)) return false;
  const k = c.main[i], carte = CARTES[k.id], e = effetsDe(k.id, k.niv), j = c.joueur;
  const vis = vivants(c);
  let cibles = e.tous ? vis : [vis.find((x) => x.uid === cible) || vis[0]];
  cibles = cibles.filter(Boolean);
  const cout = coutDe(c, i);
  if (cout < carte.cout) c.arcanes = true;
  c.energie -= cout;
  c.main.splice(i, 1);
  // talents des attaques : Enchaînement (+2 par coup après une autre attaque du tour), Visée (une sur trois doublée)
  let bonus = 0, mult = 1;
  if (carte.type === 'attaque') {
    if (c.classe === 'escrimeur' && c.attaquesTour > 0) bonus = 2;
    if (c.classe === 'tireur') { c.tirs++; if (c.tirs % 3 === 0) mult = 2; }
    c.attaquesTour++;
  }
  if (e.degats) for (let f = 0; f < (e.fois || 1); f++) for (const t of cibles) attaquer(c, j, t, e.degats + bonus, mult);
  if (e.degatsParBrulure) for (const t of cibles) attaquer(c, j, t, t.brulure * e.degatsParBrulure + bonus, mult);
  if (e.bouclierEnDegats) for (const t of cibles) attaquer(c, j, t, j.bloc + bonus, mult);
  for (const t of cibles) { if (e.brulure) t.brulure += e.brulure; if (e.trempe) t.trempe += e.trempe; if (e.affaibli) t.affaibli += e.affaibli; }
  if (e.bouclier) j.bloc += e.bouclier;
  if (e.soin) j.pv = Math.min(j.pvMax, j.pv + e.soin);
  if (e.epines) j.epines += e.epines;
  if (e.regen) j.regen += e.regen;
  if (e.force) j.force += e.force;
  if (e.energie) c.energie += e.energie;
  (e.epuise ? c.epuisees : c.defausse).push(k);
  if (e.pioche) piocher(c, e.pioche);
  c.journal.push(`Tu joues ${carte.nom}.`);
  verifierFin(c);
  return true;
}

// fin du tour du joueur : régénération, puis chaque monstre agit, puis nouveau tour
export function finTour(c) {
  if (c.fini) return;
  const j = c.joueur;
  c.defausse.push(...c.main); c.main = [];
  if (j.regen > 0) { j.pv = Math.min(j.pvMax, j.pv + j.regen); j.regen--; }
  for (const e of vivants(c)) {
    e.bloc = 0;
    if (e.brulure > 0) { blesser(c, e, e.brulure, true); e.brulure--; if (e.pv <= 0) { c.journal.push(`${e.nom} succombe à ses brûlures.`); continue; } }
    const it = intention(e);
    if (it.d) e.bloc += Math.round(it.d * e.deg);
    if (it.f) e.force += it.f;
    if (it.e) e.epines += it.e;
    if (it.b) j.brulure += it.b;
    if (it.t) j.trempe += it.t;
    if (it.w) j.affaibli += it.w;
    if (it.a) for (let k = 0; k < (it.n || 1); k++) attaquer(c, e, j, Math.round(it.a * e.deg));
    e.i++;
    if (e.trempe > 0) e.trempe--;
    if (e.affaibli > 0) e.affaibli--;
    if (verifierFin(c)) return;
  }
  if (verifierFin(c)) return;
  debutTour(c);
}
// ce que le monstre va faire, en clair (pour l'affichage)
export function decrireIntention(c, e) {
  const it = intention(e), t = [];
  if (it.a) t.push({ type: 'attaque', txt: `${calculerDegats(Math.round(it.a * e.deg), e, c.joueur)}${it.n > 1 ? `×${it.n}` : ''}` });
  if (it.d) t.push({ type: 'defense', txt: `${Math.round(it.d * e.deg)}` });
  if (it.f) t.push({ type: 'buff', txt: `+${it.f}` });
  if (it.e) t.push({ type: 'epines', txt: `${it.e}` });
  if (it.b || it.t || it.w) t.push({ type: 'malus', txt: [it.b && `🔥${it.b}`, it.t && `💧${it.t}`, it.w && `🥀${it.w}`].filter(Boolean).join(' ') });
  return t;
}

// ---------- rejouer un combat à partir de ses coups ----------
// Le moteur est déterministe (même graine, mêmes coups → même combat) : le
// serveur rejoue ce que le client a joué et n'accepte que ce résultat-là.
// coups : [['j', indexCarte, uidCible], ['f'], …]
export const COUPS_MAX = 3000;
export function rejouer(def, coups) {
  const c = nouveauCombat(def);
  if (!Array.isArray(coups)) return c;
  for (const k of coups.slice(0, COUPS_MAX)) {
    if (c.fini || !Array.isArray(k)) break;
    if (k[0] === 'j') jouerCarte(c, k[1] | 0, typeof k[2] === 'string' ? k[2].slice(0, 8) : undefined);
    else if (k[0] === 'f') finTour(c);
  }
  return c;
}
