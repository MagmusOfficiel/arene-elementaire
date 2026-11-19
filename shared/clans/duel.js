// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le duel de cartes entre deux joueurs
//  Mêmes cartes, mêmes statuts et mêmes talents que contre les monstres,
//  mais à tour de rôle : chacun a 3 énergie et pioche 5 cartes à son
//  tour, puis passe la main. Le serveur fait tourner ce moteur ; les
//  joueurs ne lui envoient que « je joue la carte n° i » et « fin du tour ».
// =====================================================================
import { CARTES, CLASSES, effetsDe } from './cartes.js';
import { alea, calculerDegats } from './combat.js';

export const TOURS_MAX = 30;          // au-delà, le duel s'arrête : le plus de PV (en %) gagne
const statuts = () => ({ bloc: 0, force: 0, brulure: 0, trempe: 0, affaibli: 0, epines: 0, regen: 0 });
function melanger(l, r) { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }

// a, b : { nom, clan, classe, pvMax, deck: [{ id, niv }] }
export function nouveauDuel(a, b, graine = 1) {
  const r = alea(graine);
  let n = 0;
  const joueur = (x) => ({
    nom: x.nom, clan: x.clan, classe: x.classe, app: typeof x.app === 'string' ? x.app.slice(0, 80) : '', pv: x.pvMax, pvMax: x.pvMax, ...statuts(),
    pioche: melanger(x.deck.map((k) => ({ uid: `c${n++}`, id: k.id, niv: k.niv || 1 })), r), main: [], defausse: [], epuisees: [],
    energie: 0, tirs: 0, attaquesTour: 0, arcanes: false,
  });
  const d = { j: [joueur(a), joueur(b)], actif: r() < 0.5 ? 0 : 1, tour: 0, fini: false, gagnant: null, journal: [], _r: r };
  for (const j of d.j) if (j.classe === 'combattant') j.bloc = 6;     // Endurci : le bouclier tient jusqu'à son premier tour
  debutTour(d);
  return d;
}
function piocher(d, j, k) {
  for (let i = 0; i < k; i++) {
    if (!j.pioche.length) { if (!j.defausse.length) return; j.pioche = melanger(j.defausse, d._r || alea(d.tour + 7)); j.defausse = []; }
    if (j.main.length >= 10) return;
    j.main.push(j.pioche.pop());
  }
}
function blesser(cible, v, direct = false) {
  if (!direct && cible.bloc > 0) { const a = Math.min(cible.bloc, v); cible.bloc -= a; v -= a; }
  cible.pv = Math.max(0, cible.pv - v);
}
function attaquer(att, cible, base, mult = 1) {
  if (cible.pv <= 0) return;
  blesser(cible, calculerDegats(base, att, cible) * mult);
  if (cible.epines > 0 && att.pv > 0) blesser(att, cible.epines);
}
function verifier(d) {
  const [a, b] = d.j;
  if (a.pv <= 0 || b.pv <= 0) { d.fini = true; d.gagnant = a.pv <= 0 && b.pv <= 0 ? null : a.pv > 0 ? 0 : 1; return true; }
  if (d.tour > TOURS_MAX) { d.fini = true; const pa = a.pv / a.pvMax, pb = b.pv / b.pvMax; d.gagnant = pa === pb ? null : pa > pb ? 0 : 1; return true; }
  return false;
}
function debutTour(d) {
  d.tour++;
  const j = d.j[d.actif];
  if (d.tour > 2 || j.classe !== 'combattant') j.bloc = 0;
  if (j.brulure > 0) { blesser(j, j.brulure, true); j.brulure--; if (verifier(d)) return; }
  if (j.trempe > 0) j.trempe--;
  if (j.affaibli > 0) j.affaibli--;
  j.energie = 3; j.attaquesTour = 0; j.arcanes = false;
  piocher(d, j, 5);
  verifier(d);
}
export function coutDe(j, i) {
  const k = j.main[i]; if (!k) return 99;
  const c = CARTES[k.id];
  return j.classe === 'mage' && !j.arcanes && c.element !== 'neutre' ? Math.max(0, c.cout - 1) : c.cout;
}
// le joueur actif (0 ou 1) joue la carte n° i de sa main
export function jouer(d, qui, i) {
  if (d.fini || qui !== d.actif) return false;
  const j = d.j[qui], adv = d.j[1 - qui], k = j.main[i];
  if (!k || coutDe(j, i) > j.energie) return false;
  const carte = CARTES[k.id], e = effetsDe(k.id, k.niv), cout = coutDe(j, i);
  if (cout < carte.cout) j.arcanes = true;
  j.energie -= cout; j.main.splice(i, 1);
  let bonus = 0, mult = 1;
  if (carte.type === 'attaque') {
    if (j.classe === 'escrimeur' && j.attaquesTour > 0) bonus = 2;
    if (j.classe === 'tireur') { j.tirs++; if (j.tirs % 3 === 0) mult = 2; }
    j.attaquesTour++;
  }
  if (e.degats) for (let f = 0; f < (e.fois || 1); f++) attaquer(j, adv, e.degats + bonus, mult);
  if (e.degatsParBrulure) attaquer(j, adv, adv.brulure * e.degatsParBrulure + bonus, mult);
  if (e.bouclierEnDegats) attaquer(j, adv, j.bloc + bonus, mult);
  if (e.brulure) adv.brulure += e.brulure;
  if (e.trempe) adv.trempe += e.trempe;
  if (e.affaibli) adv.affaibli += e.affaibli;
  if (e.bouclier) j.bloc += e.bouclier;
  if (e.soin) j.pv = Math.min(j.pvMax, j.pv + e.soin);
  if (e.epines) j.epines += e.epines;
  if (e.regen) j.regen += e.regen;
  if (e.force) j.force += e.force;
  if (e.energie) j.energie += e.energie;
  (e.epuise ? j.epuisees : j.defausse).push(k);
  if (e.pioche) piocher(d, j, e.pioche);
  d.journal.push(`${j.nom} joue ${carte.nom}.`);
  verifier(d);
  return true;
}
export function finTour(d, qui) {
  if (d.fini || qui !== d.actif) return false;
  const j = d.j[qui];
  j.defausse.push(...j.main); j.main = [];
  if (j.regen > 0) { j.pv = Math.min(j.pvMax, j.pv + j.regen); j.regen--; }
  d.actif = 1 - qui;
  debutTour(d);
  return true;
}
// ce que voit un joueur : sa main, et seulement le nombre de cartes de l'adversaire
export function vue(d, qui) {
  const pub = (j) => ({ nom: j.nom, clan: j.clan, classe: j.classe, app: j.app, pv: j.pv, pvMax: j.pvMax, bloc: j.bloc, force: j.force, brulure: j.brulure, trempe: j.trempe, affaibli: j.affaibli, epines: j.epines, regen: j.regen, energie: j.energie, nMain: j.main.length, nPioche: j.pioche.length, nDefausse: j.defausse.length, tirs: j.tirs, attaquesTour: j.attaquesTour, arcanes: j.arcanes });
  const moi = d.j[qui];
  return { moi: { ...pub(moi), main: moi.main.map((k, i) => ({ id: k.id, niv: k.niv, cout: coutDe(moi, i) })) }, adv: pub(d.j[1 - qui]), aMoi: d.actif === qui, tour: d.tour, fini: d.fini, gagnant: d.gagnant === null ? null : d.gagnant === qui ? 'moi' : 'adv', journal: d.journal.slice(-4) };
}
// un deck reçu d'un navigateur : des cartes qui existent, de 10 à 25, niveaux de 1 à 3
export function deckValide(deck) {
  return Array.isArray(deck) && deck.length >= 10 && deck.length <= 25 && deck.every((k) => k && CARTES[k.id] && [1, 2, 3].includes(k.niv || 1));
}
export const PV_DUEL = (pvMax, classe) => Math.max(40, Math.min(120, Number(pvMax) || 60 + (CLASSES[classe]?.pv || 0)));
