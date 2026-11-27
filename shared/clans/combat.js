// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le combat de cartes (façon Slay the Spire)
//  Pur et sans affichage : le client et les tests l'utilisent pareil.
//  Tour du joueur : 3 énergie, 5 cartes piochées ; il joue ce qu'il veut,
//  puis finit son tour. Les monstres agissent selon leur intention,
//  affichée à l'avance. Le combat se gagne quand tous sont à 0 PV.
// =====================================================================
import { BRANCHES, CARTES, CHEFS, effetsDe } from './cartes.js';
import { FAMILIERS } from './familiers.js';
import * as RQ from './reliques.js';

export function alea(graine) {
  let a = graine >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function melanger(l, r) { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }
const statuts = () => ({ bloc: 0, force: 0, brulure: 0, trempe: 0, affaibli: 0, epines: 0, regen: 0, appel: 0, etourdi: 0, paralysie: 0, marque: 0, ardeur: 0, esquive: 0, renaissance: 0, bourgeon: 0, photosynthese: 0 });

// deck : [{ id, niv }] ; joueur : { pv, pvMax } ; ennemis : modèles de monstres.js ; palier : { pv, deg }
// classe : son talent s'applique pendant le combat (Endurci, Arcanes, Visée, Enchaînement)
export function nouveauCombat({ deck, joueur, ennemis, palier = { pv: 1, deg: 1 }, graine = 1, energieMax = 3, classe = null, branche = null, mods = null, familier = null, reliques = null, clan = null, chef = null }) {
  const r = alea(graine);
  let n = 0;
  const c = {
    tour: 0, fini: null, journal: [], energie: 0, energieMax, graine, classe, branche: BRANCHES[branche]?.classe === classe ? branche : null, clan, tirs: 0, cartesTour: 0, attaquesCombat: 0, arcN: 0, attaquesTour: 0, arcanes: false, familier: FAMILIERS[familier] ? familier : null, reliques: Array.isArray(reliques) ? reliques.filter(RQ.valide) : [], mods: mods && mods.length ? mods.slice() : null,
    joueur: { pv: joueur.pv, pvMax: joueur.pvMax, ...statuts() },
    ennemis: ennemis.map((m, i) => ennemiDe(m, `e${i}`, palier, m.phases ? 0 : Math.floor(r() * m.intentions.length))),
    pioche: melanger(deck.map((x) => ({ uid: `c${n++}`, id: x.id, niv: x.niv || 1 })), r), main: [], defausse: [], epuisees: [],
  };
  c._r = r; c.allie = null; c._palier = palier;
  // v124 : les Seigneurs de chapitre — le sablier du Sphinx (combat limité en tours)
  { const l = Math.max(0, ...c.ennemis.map((e) => e.sablier || 0)); if (l) c.limite = l; }
  c.chef = c.branche && CHEFS[chef]?.branche === c.branche ? chef : null;   // v122 : le talent du chef de guerre
  if (c.branche) c.energieMax += 1;   // v84 : la 2e classe (branche d'Ascension) donne 4 énergie au lieu de 3
  // malédictions du Cauchemar
  if (c.mods?.includes('rage')) for (const e of c.ennemis) e.force += 2;
  if (c.mods?.includes('carapace')) for (const e of c.ennemis) e.bloc = Math.round(e.pvMax * 0.15);
  debutTour(c);
  if (classe === 'combattant') c.joueur.bloc += c.branche === 'gardien' ? 10 : 6;     // Endurci (Égide : 10)
  if (c.branche === 'invocateur') c.joueur.appel += 3;     // Esprit lié
  // le familier (v53) : un petit coup de pouce au début du combat
  const f = c.familier && FAMILIERS[c.familier].effet;
  if (f) {
    if (f.brulureEnnemis) for (const e of c.ennemis) e.brulure += f.brulureEnnemis;
    if (f.affaiblirEnnemis) for (const e of c.ennemis) e.affaibli += f.affaiblirEnnemis;
    if (f.bloc) c.joueur.bloc += f.bloc;
    if (f.energie) c.energie += f.energie;
    if (f.pioche) piocher(c, f.pioche);
    if (f.regen) c.joueur.regen += f.regen;
    // v102 : les familiers des nouvelles régions
    if (f.marqueEnnemis) for (const e of c.ennemis) e.marque = (e.marque || 0) + f.marqueEnnemis;
    if (f.etourdirPremier && c.ennemis.length) { const e = c.ennemis.reduce((a, b) => (b.pv > a.pv ? b : a)); e.etourdi = (e.etourdi || 0) + 1; }
  }
  // les reliques de l'expédition (v59)
  RQ.debutCombat(c, c.reliques);
  if (RQ.a(c.reliques, 'besace')) piocher(c, 2);
  return c;
}
// les bonus de dégâts des branches (Furie, Poudre noire) et de la rage d'une carte
export function bonusBranche(branche, j, e) {
  let b = 0;
  if (branche === 'berserker') b += Math.floor((j.pvMax - j.pv) / 8);
  if (e.rage) b += Math.floor((j.pvMax - j.pv) / e.rage);
  if (branche === 'artificier' && e.tous) b += 3;
  return b;
}
const vivants = (c) => c.ennemis.filter((e) => e.pv > 0);
// un ennemi en combat (v124 : avec les champs des Seigneurs de chapitre : phases, élément, étoiles, paratonnerres, sablier)
function ennemiDe(m, uid, palier, i0 = 0) {
  return { uid, id: m.id, nom: m.nom, ico: m.ico, rang: m.rang, maudit: !!m.maudit, pv: Math.round(m.pv * palier.pv), pvMax: Math.round(m.pv * palier.pv), intentions: m.intentions, i: i0, deg: palier.deg, ...statuts(),
    ...(m.phases ? { phases: m.phases, phase: 0 } : {}), ...(m.element ? { element: m.element } : {}), ...(m.etoiles ? { etoiles: true } : {}), ...(m.etoile ? { etoile: true } : {}), ...(m.paratonnerre ? { paratonnerre: true } : {}), ...(m.sablier ? { sablier: m.sablier } : {}), ...(m.seigneur ? { seigneur: m.seigneur } : {}) };
}
// ---------- v124 : les mécaniques des Seigneurs de chapitre ----------
// l'élément qui bat l'autre (Triarque) : l'eau éteint le feu, le feu brûle la plante, la plante boit l'eau
export const BAT = { eau: 'feu', feu: 'plante', plante: 'eau' };
export const affinite = (elCarte, elCible) => (!elCarte || !elCible || !BAT[elCarte] ? 1 : elCarte === elCible ? 0.5 : BAT[elCarte] === elCible ? 1.5 : 1);
// les énigmes du Sphinx : posées pendant son tour, vérifiées à la fin de ton tour suivant
export const ENIGMES = [
  { k: 'attaques', txt: 'Joue au moins 2 attaques ce tour.', ok: (c) => c.typesTour.attaque >= 2 },
  { k: 'sansDefense', txt: 'Ne joue aucune défense ce tour (mais joue au moins une carte).', ok: (c) => !c.typesTour.defense && c.cartesTour >= 1 },
  { k: 'cartes', txt: 'Joue au moins 4 cartes ce tour.', ok: (c) => c.cartesTour >= 4 },
  { k: 'pouvoir', txt: 'Joue au moins un pouvoir ce tour.', ok: (c) => c.typesTour.pouvoir >= 1 },
  { k: 'econome', txt: 'Finis ton tour avec au moins 1 énergie.', ok: (c) => c.energie >= 1 },
];
function invoquer(c, modele, k = 1) {
  for (let n = 0; n < k; n++) {
    if (vivants(c).length >= 5) return;
    const e = ennemiDe({ ...modele, rang: 'normal' }, `e${c.ennemis.length}`, c._palier || { pv: 1, deg: 1 });
    c.ennemis.push(e); ev(c, { t: 'invoque', a: e.uid }); c.journal.push(`${e.nom} apparaît !`);
  }
}
function passerPhase(c, e) {
  while (e.pv > 0 && e.phases[e.phase] && e.pv / e.pvMax <= e.phases[e.phase].seuil) {
    const ph = e.phases[e.phase++];
    e.intentions = ph.intentions; e.i = 0;
    if (ph.element) e.element = ph.element;
    if (ph.bloc) e.bloc += Math.round(ph.bloc * e.deg);
    if (ph.force) e.force += ph.force;
    if (ph.inv) invoquer(c, ph.inv, ph.k || 1);
    e.etourdi = 0;
    ev(c, { t: 'phase', a: e.uid, nom: ph.nom, element: e.element || null }); c.journal.push(`${e.nom} : ${ph.nom} !`);
  }
}
// la foudre du Titan : chaque paratonnerre encore debout en absorbe 30 % (au plus 90 %)
const reductionFoudre = (c) => Math.max(0.1, 1 - 0.3 * c.ennemis.filter((o) => o.paratonnerre && o.pv > 0).length);
// v122 : les talents des chefs de guerre (communs au combat et au duel)
export const CHEF_STATUT = { feu: ['brulure', 2], eau: ['trempe', 1], plante: ['affaibli', 1] };
export const bonusChefCible = (chef, t) => (chef === 'main_noire' && t.affaibli > 0 ? 3 : 0);
export const blocGarde = (chef, bloc) => (chef === 'porte_banniere' ? Math.floor(bloc / 2) : 0);
// ---------- journal d'événements (pour les animations) ----------
// Seulement si l'appelant a mis c.ev = [] : le serveur, qui rejoue les combats, ne le fait pas.
// Ne change JAMAIS les règles : on note ce qui se passe, c'est tout.
const ev = (c, x) => { if (c.ev) c.ev.push(x); };
const qui = (x) => x.uid || 'j';
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
  c.typesTour = { attaque: 0, defense: 0, pouvoir: 0 };   // v124 : pour les énigmes du Sphinx
  if (c.limite && c.tour > c.limite && !c.fini) { c.fini = 'defaite'; c.journal.push('Le sablier est vide : le temps est écoulé.'); ev(c, { t: 'sablier' }); return; }
  const j = c.joueur;
  j.bloc = blocGarde(c.chef, j.bloc);   // v122 : Rempart du clan
  if (j.brulure > 0) { const [d] = blesser(c, j, j.brulure, true); ev(c, { t: 'brule', a: 'j', deg: d, pv: j.pv }); c.journal.push(`Tu brûles : −${j.brulure} PV.`); j.brulure--; if (verifierFin(c)) return; }
  if (j.trempe > 0) j.trempe--;
  if (j.affaibli > 0) j.affaibli--;
  c.energie = Math.max(1, c.energieMax - (j.paralysie || 0) + (c.chef === 'chef_horde' && j.pv < j.pvMax / 2 ? 1 : 0)); j.paralysie = 0; c.attaquesTour = 0; c.cartesTour = 0; c.arcanes = false; c.arcN = 0;
  piocher(c, c.tour === 1 && c.mods?.includes('epuisement') ? 4 : 5);
  // v123 : l'aura ardente s'éteint ; le bourgeon éclot ; la photosynthèse rend son énergie
  j.ardeur = 0;
  if (j.bourgeon > 0) { const avant = j.pv; j.pv = Math.min(j.pvMax, j.pv + j.bourgeon); ev(c, { t: 'soin', a: 'j', n: j.pv - avant, pv: j.pv }); c.journal.push(`Ton bourgeon éclot : +${j.pv - avant} PV.`); j.bourgeon = 0; }
  if (j.photosynthese > 0) { c.energie += j.photosynthese; ev(c, { t: 'energie', n: j.photosynthese }); j.photosynthese = 0; }
  if (RQ.a(c.reliques, 'pierre_lune')) j.bloc += 3;
  if (RQ.a(c.reliques, 'sablier') && c.tour % 3 === 0) c.energie += 1;
  ev(c, { t: 'tour', n: c.tour });
  // Appel : l'allié invoqué frappe l'ennemi le plus faible
  if (j.appel > 0 && c.tour > 1) {
    const cible = vivants(c).sort((a, b) => a.pv - b.pv)[0];
    if (cible) { attaquer(c, { force: 0, affaibli: 0, pv: 1, bloc: 0 }, cible, j.appel); c.journal.push(`Ton allié invoqué frappe ${cible.nom}.`); verifierFin(c); }
  }
  // v87 : l'allié invoqué frappe au début de chacun de tes tours
  if (c.tour > 1 && c.allie?.pv > 0) for (let f = 0; f < (c.chef === 'seigneur_betes' ? 2 : 1) && !c.fini; f++) { const v = vivants(c); if (v.length) { attaquer(c, c.allie, v[Math.floor(c._r() * v.length)], c.allie.deg); verifierFin(c); } }   // v122 : Roi de la meute, deux fois
}
// dégâts d'une attaque : force, affaibli (−25 %), trempé (+50 %)
export function calculerDegats(base, attaquant, cible) {
  let d = base + (attaquant.force || 0);
  if (attaquant.affaibli > 0) d *= 0.75;
  if (cible.trempe > 0) d *= 1.5;
  return Math.max(0, Math.floor(d));
}
// renvoie [dégâts subis, dégâts arrêtés par le bouclier]
function blesser(c, cible, d, direct = false) {
  let b = 0;
  if (!direct && cible.bloc > 0) { b = Math.min(cible.bloc, d); cible.bloc -= b; d -= b; }
  cible.pv = Math.max(0, cible.pv - d);
  if (cible.phases && d > 0) passerPhase(c, cible);   // v124
  return [d, b];
}
function attaquer(c, att, cible, base, mult = 1) {
  if (cible.pv <= 0) return 0;
  // v123 : Esquive (le coup ne fait rien) et Aura ardente (l'attaquant prend feu) — pour le joueur
  if (cible === c.joueur && att.uid) {
    if (cible.ardeur > 0 && att.pv > 0) { att.brulure += cible.ardeur; ev(c, { t: 'statut', a: att.uid, k: 'brulure', n: cible.ardeur }); }
    if (cible.esquive > 0) { cible.esquive--; ev(c, { t: 'esquive', a: 'j' }); c.journal.push('Tu esquives le coup !'); return 0; }
  }
  // v124 : l'Astre déchu est intouchable tant qu'une de ses étoiles brille ; l'affinité des éléments (Triarque)
  if (cible.etoiles && c.ennemis.some((o) => o.etoile && o.pv > 0)) { ev(c, { t: 'resiste', a: cible.uid }); c.journal.push(`${cible.nom} est protégé par ses étoiles.`); return 0; }
  if (cible.element && att === c.joueur) mult *= affinite(c._elem, cible.element);
  const [d, b] = blesser(c, cible, Math.round(calculerDegats(base, att, cible) * mult));
  ev(c, { t: 'coup', de: qui(att), a: qui(cible), deg: d, bloque: b, pv: cible.pv, bloc: cible.bloc, double: mult > 1 });
  if (cible.pv <= 0 && cible.uid) ev(c, { t: 'mort', a: cible.uid });
  if (cible.epines > 0 && att.pv > 0) {
    const [d2] = blesser(c, att, cible.epines);
    ev(c, { t: 'epines', de: qui(cible), a: qui(att), deg: d2, pv: att.pv, bloc: att.bloc });
    if (att.pv <= 0 && att.uid) ev(c, { t: 'mort', a: att.uid });
  }
  return d;
}
// v99 : le Vol de vie — on se soigne d'une part des dégâts vraiment infligés (pas ceux pris par le bouclier)
function volerVie(c, qui_, total, part) {
  const n = Math.floor(total * part); if (n <= 0 || qui_.pv <= 0) return;
  const avant = qui_.pv; qui_.pv = Math.min(qui_.pvMax, qui_.pv + n);
  if (qui_.pv > avant) ev(c, { t: 'soin', a: qui(qui_), n: qui_.pv - avant, pv: qui_.pv, vol: true });
}
// v98 : la Marque — à 3 marques, elles explosent (dégâts directs, le bouclier ne protège pas)
export const MARQUES = 3, DETONATION = 20, DETONATION_MONSTRE = 12;
function marquer(c, t, n, deg = DETONATION) {
  if (t.pv <= 0) return;
  t.marque = (t.marque || 0) + n; ev(c, { t: 'statut', a: qui(t), k: 'marque', n });
  while (t.marque >= MARQUES && t.pv > 0) {
    t.marque -= MARQUES;
    const [d] = blesser(c, t, deg, true);
    ev(c, { t: 'brule', a: qui(t), deg: d, pv: t.pv, marque: true });
    c.journal.push(t.uid ? `Les marques explosent sur ${t.nom} : −${d} PV !` : `Les marques explosent sur toi : −${d} PV !`);
    if (t.pv <= 0 && t.uid) ev(c, { t: 'mort', a: t.uid });
  }
}
function verifierFin(c) {
  const j = c.joueur;
  if (j.pv <= 0 && j.renaissance > 0) { j.pv = Math.min(j.pvMax, j.renaissance); j.renaissance = 0; j.brulure = 0; ev(c, { t: 'soin', a: 'j', n: j.pv, pv: j.pv }); c.journal.push('Tu renais de tes cendres !'); }   // v123
  if (c.joueur.pv <= 0) { c.fini = 'defaite'; return true; }
  if (!vivants(c).length) { c.fini = 'victoire'; return true; }
  return false;
}
// le coût réel d'une carte de la main : Arcanes (Mage) retire 1 au premier sort élémentaire du tour
export function coutDe(c, i) {
  const k = c.main[i]; if (!k) return 99;
  const carte = CARTES[k.id];
  const base = c.classe === 'mage' && !c.arcanes && carte.element !== 'neutre' ? Math.max(0, carte.cout - 1) : carte.cout;
  return Math.max(0, base - (k.remise || 0));   // v84 : réduction de coût (ce tour)
}
export const jouable = (c, i) => { const k = c.main[i]; return !!k && !c.fini && coutDe(c, i) <= c.energie; };
// Visée (Tireur) : la prochaine attaque sera-t-elle doublée ?
export const periodeVisee = (c) => (c.branche === 'sniper' ? 2 : 3);
export const viseeProchaine = (c) => c.classe === 'tireur' && (c.tirs + 1) % periodeVisee(c) === 0;
export const besoinCible = (id) => { const e = CARTES[id].effets; return CARTES[id].type === 'attaque' && !e.tous || ((e.trempe || e.affaibli || e.brulure || e.etourdit || e.marque) && !e.tous && !e.degats && !e.degatsParBrulure && !e.bouclierEnDegats); };

// jouer la carte n° i de la main, sur l'ennemi « cible » (uid) si elle vise quelqu'un
export function jouerCarte(c, i, cible) {
  if (!jouable(c, i)) return false;
  const k = c.main[i], carte = CARTES[k.id], e = effetsDe(k.id, k.niv), j = c.joueur;
  const vis = vivants(c);
  let cibles = e.tous ? vis : [vis.find((x) => x.uid === cible) || vis[0]];
  cibles = cibles.filter(Boolean);
  const cout = coutDe(c, i);
  if (cout < carte.cout) { c.arcN++; c.arcanes = c.arcN >= (c.branche === 'archimage' ? 2 : 1); }
  c.energie -= cout;
  c.main.splice(i, 1);
  ev(c, { t: 'carte', id: k.id, cibles: cibles.map((x) => x.uid) });
  // talents des attaques : Enchaînement (+2 par coup après une autre attaque du tour), Visée (une sur trois doublée)
  let bonus = 0, mult = 1;
  if (carte.type === 'attaque') {
    if (c.classe === 'escrimeur' && c.attaquesTour > 0) bonus = c.branche === 'duelliste' ? 2 * c.attaquesTour : 2;
    if (RQ.a(c.reliques, 'pointe')) bonus += 1;
    if (c.classe === 'tireur') { c.tirs++; if (c.tirs % periodeVisee(c) === 0) mult = 2; }
    bonus += bonusBranche(c.branche, j, e);
    if (c.chef === 'oeil_aigle' && c.attaquesCombat === 0) mult = Math.max(mult, 3);   // v122 : Premier sang
    bonus += k.pousse || 0;   // v123 : Pousse
    c.attaquesCombat++;
    if (c.branche === 'ombre' && c.attaquesTour === 0) for (const t of cibles) { t.affaibli += 1; ev(c, { t: 'statut', a: t.uid, k: 'affaibli', n: 1 }); }
    c.attaquesTour++;
    if (c.chef === 'champion_clan' && c.attaquesTour === 2) { c.energie += 1; ev(c, { t: 'energie', n: 1 }); }   // v122 : Second souffle
  }
  c.cartesTour++;
  if (c.typesTour) c.typesTour[carte.type] = (c.typesTour[carte.type] || 0) + 1;   // v124 : énigmes du Sphinx
  c._elem = carte.element;   // v124 : l'affinité des éléments (Triarque)
  if (c.chef === 'grand_arcaniste' && c.cartesTour === 3) { c.energie += 2; ev(c, { t: 'energie', n: 2 }); }   // v122 : Résonance
  if (e.sacrifice) { const d = Math.min(e.sacrifice, j.pv - 1); j.pv -= d; ev(c, { t: 'brule', a: 'j', deg: d, pv: j.pv, sang: true }); }
  let inflige = 0;
  const dMain = e.degatsParMain ? e.degatsParMain * c.main.length : 0;   // v123 : Marée montante
  if (e.degats) for (let f = 0; f < (e.fois || 1); f++) for (const t of cibles) inflige += attaquer(c, j, t, e.degats + dMain + bonus + bonusChefCible(c.chef, t), mult) || 0;
  if (e.volVie) volerVie(c, j, inflige, e.volVie);   // v99
  if (e.degatsParBrulure) for (const t of cibles) attaquer(c, j, t, Math.floor(t.brulure * e.degatsParBrulure) + bonus, mult);
  if (e.bouclierEnDegats) for (const t of cibles) attaquer(c, j, t, j.bloc + bonus, mult);
  if (e.degatsParAffaibli) for (const t of cibles) attaquer(c, j, t, t.affaibli * e.degatsParAffaibli + bonus, mult);
  // v122 : Obus élémentaires (Maître Artilleur) : une attaque sur tous applique le statut de son élément
  const obus = c.chef === 'maitre_artilleur' && carte.type === 'attaque' && e.tous && CHEF_STATUT[c.clan];
  for (const t of cibles) {
    const vu = t.pv > 0;
    if (obus && vu) { const [k2, n2] = obus; t[k2] += n2; ev(c, { t: 'statut', a: t.uid, k: k2, n: n2 }); }
    if (e.brulure) { t.brulure += e.brulure; if (vu) ev(c, { t: 'statut', a: t.uid, k: 'brulure', n: e.brulure }); }
    if (e.trempe) { t.trempe += e.trempe; if (vu) ev(c, { t: 'statut', a: t.uid, k: 'trempe', n: e.trempe }); }
    if (e.affaibli) { t.affaibli += e.affaibli; if (vu) ev(c, { t: 'statut', a: t.uid, k: 'affaibli', n: e.affaibli }); }
    if (e.doubleBrulure && vu && t.brulure > 0) { const n = t.brulure; t.brulure += n; ev(c, { t: 'statut', a: t.uid, k: 'brulure', n }); }   // v123 : Embrasement
    // v96 : étourdi — mais un monstre qui vient de l'être résiste au tour suivant (pas d'étourdissement en boucle)
    if (e.marque && vu) marquer(c, t, e.marque);   // v98
    if (e.etourdit && vu) { if (t.resiste > 0 || t.etourdi > 0) ev(c, { t: 'resiste', a: t.uid }); else { t.etourdi = 1; ev(c, { t: 'statut', a: t.uid, k: 'etourdi', n: 1 }); } }
  }
  if (e.doubleBouclier && j.bloc > 0) { const n = j.bloc; j.bloc += n; ev(c, { t: 'bloc', a: 'j', n, bloc: j.bloc }); }
  const blocEn = (e.bouclier || 0) + (c.branche === 'gardien' && carte.type === 'defense' ? 2 : 0);
  if (blocEn) { j.bloc += blocEn; ev(c, { t: 'bloc', a: 'j', n: blocEn, bloc: j.bloc }); }
  if (e.soin) { const avant = j.pv; j.pv = Math.min(j.pvMax, j.pv + e.soin); ev(c, { t: 'soin', a: 'j', n: j.pv - avant, pv: j.pv }); }
  if (e.epines) { j.epines += e.epines; ev(c, { t: 'statut', a: 'j', k: 'epines', n: e.epines }); }
  if (e.regen) { j.regen += e.regen; ev(c, { t: 'statut', a: 'j', k: 'regen', n: e.regen }); }
  // v123 : les nouvelles mécaniques des éléments
  if (e.bouclierParRegen && j.regen > 0) { const n = j.regen * e.bouclierParRegen; j.bloc += n; ev(c, { t: 'bloc', a: 'j', n, bloc: j.bloc }); }
  if (e.purifie) { j.brulure = 0; j.trempe = 0; j.affaibli = 0; j.marque = 0; c.journal.push('L’eau pure te lave de tes maux.'); }
  if (e.brulureSoi) { j.brulure += e.brulureSoi; ev(c, { t: 'statut', a: 'j', k: 'brulure', n: e.brulureSoi }); }
  for (const s of ['ardeur', 'esquive', 'bourgeon']) if (e[s]) { j[s] = (j[s] || 0) + e[s]; ev(c, { t: 'statut', a: 'j', k: s, n: e[s] }); }
  if (e.renaissance) j.renaissance = Math.max(j.renaissance || 0, e.renaissance);
  if (e.energieProchain) j.photosynthese = (j.photosynthese || 0) + e.energieProchain;
  if (e.force) { j.force += e.force; ev(c, { t: 'statut', a: 'j', k: 'force', n: e.force }); }
  if (e.appel) { j.appel += e.appel; ev(c, { t: 'statut', a: 'j', k: 'appel', n: e.appel }); }
  if (e.energie) { c.energie += e.energie; ev(c, { t: 'energie', n: e.energie }); }
  if (e.invoque) { const pvI = c.chef === 'seigneur_betes' ? Math.round(e.invoque.pv * 1.5) : e.invoque.pv; c.allie = { uid: 'allie', ...e.invoque, pv: pvI, pvMax: pvI, ...statuts() }; ev(c, { t: 'invoque', allie: { ...c.allie } }); }   // v87
  delete k.remise;
  c._elem = null;
  if (e.pousse) k.pousse = (k.pousse || 0) + e.pousse;   // v123 : la carte grandit
  if (e.reflux) for (let r = 0; r < e.reflux && c.defausse.length && c.main.length < 10; r++) c.main.push(c.defausse.pop());   // v123 : Retour des flots
  if (!k.eph) (e.epuise ? c.epuisees : c.defausse).push(k);   // une copie éphémère disparaît une fois jouée
  if (e.pioche) piocher(c, e.pioche);
  effetsMain(c, e);
  c.journal.push(`Tu joues ${carte.nom}.`);
  verifierFin(c);
  return true;
}

// v84 : nouvelles mécaniques de main (communes au combat et au duel : x a .main et ._r)
//  dupliquer n : ajoute n copies éphémères de cartes de ta main (elles disparaissent une fois jouées ou en fin de tour)
//  reduction n : les cartes de ta main coûtent n de moins ce tour
export function effetsMain(x, e) {
  if (e.dupliquer) for (let i = 0; i < e.dupliquer && x.main.length && x.main.length < 10; i++) {
    const src = x.main[Math.floor((x._r ? x._r() : Math.random()) * x.main.length)];
    x.nUid = (x.nUid || 5000) + 1;
    x.main.push({ uid: `d${x.nUid}`, id: src.id, niv: src.niv, eph: true, remise: src.remise });
  }
  if (e.reduction) for (const k of x.main) k.remise = (k.remise || 0) + e.reduction;
}
export function defausserMain(x) {
  for (const k of x.main) { delete k.remise; if (!k.eph) x.defausse.push(k); }
  x.main = [];
}
// fin du tour du joueur : régénération, puis chaque monstre agit, puis nouveau tour
export function finTour(c) {
  if (c.fini) return;
  const j = c.joueur;
  defausserMain(c);
  if (j.regen > 0) { const avant = j.pv; j.pv = Math.min(j.pvMax, j.pv + j.regen); j.regen--; ev(c, { t: 'soin', a: 'j', n: j.pv - avant, pv: j.pv }); }
  // v124 : l'énigme du Sphinx — réussie, il est confondu ; ratée, il se renforce
  if (c.enigme) {
    const en = ENIGMES.find((x) => x.k === c.enigme), s = c.ennemis.find((o) => o.uid === c.enigmeDe && o.pv > 0); c.enigme = null;
    if (s && en) {
      if (en.ok(c)) { const [d] = blesser(c, s, Math.round(s.pvMax * 0.08), true); s.affaibli += 2; ev(c, { t: 'enigme', a: s.uid, ok: true, deg: d, pv: s.pv }); c.journal.push(`Énigme résolue ! ${s.nom} est confondu : −${d} PV et Affaibli 2.`); if (verifierFin(c)) return; }
      else { s.force += 3; ev(c, { t: 'enigme', a: s.uid, ok: false }); ev(c, { t: 'statut', a: s.uid, k: 'force', n: 3 }); c.journal.push(`Énigme ratée : ${s.nom} gagne 3 de force.`); }
    }
  }
  ev(c, { t: 'tourEnnemi' });
  for (const e of vivants(c)) {
    e.bloc = 0;
    if (e.brulure > 0) {
      const [d] = blesser(c, e, e.brulure, true); ev(c, { t: 'brule', a: e.uid, deg: d, pv: e.pv }); e.brulure--;
      if (e.pv <= 0) { ev(c, { t: 'mort', a: e.uid }); c.journal.push(`${e.nom} succombe à ses brûlures.`); continue; }
    }
    // v96 : étourdi, il perd son action (son intention est reportée au tour suivant)
    if (e.resiste > 0) e.resiste--;
    if (e.etourdi > 0) { e.etourdi--; e.resiste = 1; ev(c, { t: 'etourdi', a: e.uid }); if (e.trempe > 0) e.trempe--; if (e.affaibli > 0) e.affaibli--; continue; }
    const it = intention(e);
    ev(c, { t: 'agit', a: e.uid, attaque: !!it.a });
    if (it.d) { e.bloc += Math.round(it.d * e.deg); ev(c, { t: 'bloc', a: e.uid, n: Math.round(it.d * e.deg), bloc: e.bloc }); }
    if (it.f) { e.force += it.f; ev(c, { t: 'statut', a: e.uid, k: 'force', n: it.f }); }
    if (it.g) { const n = Math.round(it.g * e.deg); for (const o of vivants(c)) { o.bloc += n; ev(c, { t: 'bloc', a: o.uid, n, bloc: o.bloc }); } }
    if (it.s) { const n = Math.round(it.s * e.deg); for (const o of vivants(c)) if (o.pv < o.pvMax) { const avant = o.pv; o.pv = Math.min(o.pvMax, o.pv + n); ev(c, { t: 'soin', a: o.uid, n: o.pv - avant, pv: o.pv }); } }
    if (it.e) { e.epines += it.e; ev(c, { t: 'statut', a: e.uid, k: 'epines', n: it.e }); }
    if (it.b) { j.brulure += it.b; ev(c, { t: 'statut', a: 'j', k: 'brulure', n: it.b }); }
    if (it.t) { j.trempe += it.t; ev(c, { t: 'statut', a: 'j', k: 'trempe', n: it.t }); }
    if (it.w) { j.affaibli += it.w; ev(c, { t: 'statut', a: 'j', k: 'affaibli', n: it.w }); }
    if (it.m) marquer(c, j, it.m, Math.round(DETONATION_MONSTRE * e.deg));   // v98 : les monstres du désert te marquent
    // v124 : les intentions des Seigneurs
    if (it.fe) { for (let n = 0; n < it.fe; n++) c.defausse.push({ uid: `fe${c.tour}_${e.uid}_${n}`, id: 'felure', niv: 1 }); ev(c, { t: 'felure', a: e.uid, n: it.fe }); c.journal.push(`${e.nom} glisse ${it.fe} Fêlure${it.fe > 1 ? 's' : ''} dans ta défausse.`); }
    if (it.inv) invoquer(c, it.inv, it.k || 1);
    if (it.en) { const en = ENIGMES[Math.floor(c._r() * ENIGMES.length)]; c.enigme = en.k; c.enigmeDe = e.uid; ev(c, { t: 'enigme', a: e.uid, pose: en.k }); c.journal.push(`${e.nom} pose une énigme : ${en.txt}`); }
    if (it.p) { j.paralysie = (j.paralysie || 0) + it.p; ev(c, { t: 'statut', a: 'j', k: 'paralysie', n: it.p }); }   // v96 : moins d'énergie au prochain tour
    // v87 : l'allié invoqué encaisse les coups à ta place tant qu'il tient debout
    { let vol = 0; if (it.a) for (let k = 0; k < (it.n || 1); k++) vol += attaquer(c, e, c.allie?.pv > 0 ? c.allie : j, Math.round(it.a * e.deg * (it.foudre ? reductionFoudre(c) : 1))) || 0; if (it.v) volerVie(c, e, vol, it.v); }   // v99 : v = vol de vie du monstre
    e.i++;
    if (c.mods?.includes('vitalite') && e.pv > 0 && e.pv < e.pvMax) { const avant = e.pv; e.pv = Math.min(e.pvMax, e.pv + 3); ev(c, { t: 'soin', a: e.uid, n: e.pv - avant, pv: e.pv }); }
    if (e.trempe > 0) e.trempe--;
    if (e.affaibli > 0) e.affaibli--;
    if (verifierFin(c)) return;
  }
  if (verifierFin(c)) return;
  debutTour(c);
}
// ce que le monstre va faire, en clair (pour l'affichage)
// v103 : les dégâts annoncés tiennent compte de ce que font les monstres AVANT lui ce tour-ci
// (ils agissent dans l'ordre : un trempé posé par le 2e rend le 3e plus dangereux), de sa propre
// force gagnée juste avant de frapper, de l'allié invoqué qui encaisse à ta place, et des brûlures
// qui l'achèveront avant qu'il agisse.
export function prevoirTour(c) {
  const j = c.joueur, res = new Map();
  let trempeJ = j.trempe || 0, marquesJ = j.marque || 0, alliePv = c.allie?.pv > 0 ? c.allie.pv : 0;
  for (const e of vivants(c)) {
    if (e.brulure >= e.pv) { res.set(e.uid, { meurt: true, degJ: 0, explo: 0 }); continue; }
    if (e.etourdi > 0) { res.set(e.uid, { etourdi: true, degJ: 0, explo: 0 }); continue; }
    const it = intention(e);
    if (it.t) trempeJ += it.t;   // son propre trempé passe avant son coup
    let explo = 0;
    if (it.m) { marquesJ += it.m; while (marquesJ >= MARQUES) { marquesJ -= MARQUES; explo += Math.round(DETONATION_MONSTRE * e.deg); } }
    let deg = 0, degJ = 0, surAllie = false, bonus = false;
    if (it.a) {
      const att = { force: (e.force || 0) + (it.f || 0), affaibli: e.affaibli }, base = Math.round(it.a * e.deg * (it.foudre ? reductionFoudre(c) : 1));   // v124 : la foudre du Titan
      deg = calculerDegats(base, att, { trempe: trempeJ });
      bonus = deg > calculerDegats(base, e, j);
      for (let k = 0; k < (it.n || 1); k++) {
        if (alliePv > 0) { alliePv -= calculerDegats(base, att, c.allie); surAllie = true; } else degJ += deg;
      }
    }
    res.set(e.uid, { deg, degJ, explo, bonus, surAllie });
  }
  return res;
}
export function decrireIntention(c, e, prev = null) {
  if (c.mods?.includes('brouillard')) return [{ type: 'malus', txt: '❓' }];
  const p = (prev || prevoirTour(c)).get(e.uid) || {};
  if (p.meurt) return [{ type: 'malus', txt: '🔥 va succomber' }];
  if (p.etourdi || e.etourdi > 0) return [{ type: 'malus', txt: '💫 étourdi' }];
  const it = intention(e), t = [];
  if (it.a) t.push({ type: 'attaque', txt: `${p.deg ?? calculerDegats(Math.round(it.a * e.deg), e, c.joueur)}${it.n > 1 ? `×${it.n}` : ''}`, bonus: !!p.bonus, allie: !!p.surAllie });
  if (it.d) t.push({ type: 'defense', txt: `${Math.round(it.d * e.deg)}` });
  if (it.f) t.push({ type: 'buff', txt: `+${it.f}` });
  if (it.g) t.push({ type: 'groupe', txt: `${Math.round(it.g * e.deg)}` });
  if (it.s) t.push({ type: 'soin', txt: `${Math.round(it.s * e.deg)}` });
  if (it.e) t.push({ type: 'epines', txt: `${it.e}` });
  // v124 : les Seigneurs
  if (it.ch) t.push({ type: 'charge', txt: '⚡ charge' });
  if (it.fe) t.push({ type: 'malus', txt: `🪨${it.fe} fêlure${it.fe > 1 ? 's' : ''}` });
  if (it.inv) t.push({ type: 'invoque', txt: `${it.inv.ico}${(it.k || 1) > 1 ? `×${it.k}` : ''}` });
  if (it.en) t.push({ type: 'enigme', txt: '❓ énigme' });
  if (it.b || it.t || it.w || it.p || it.m || it.v) t.push({ type: 'malus', txt: [it.b && `🔥${it.b}`, it.t && `💧${it.t}`, it.w && `🥀${it.w}`, it.p && `⚡${it.p}`, it.m && `🎯${it.m}`, it.v && '🩸vol', p.explo && `💥−${p.explo}`].filter(Boolean).join(' ') });
  if (e.etourdi > 0) return [{ type: 'malus', txt: '💫 étourdi' }];
  return t;
}

// ---------- rejouer un combat à partir de ses coups ----------
// Le moteur est déterministe (même graine, mêmes coups → même combat) : le
// serveur rejoue ce que le client a joué et n'accepte que ce résultat-là.
// coups : [['j', indexCarte, uidCible], ['f'], …]
export const COUPS_MAX = 3000;
// journal : true → le combat rejoué garde son journal d'événements (c.ev), pour les statistiques
export function rejouer(def, coups, { journal = false } = {}) {
  const c = nouveauCombat(def);
  if (journal) c.ev = [];
  if (!Array.isArray(coups)) return c;
  for (const k of coups.slice(0, COUPS_MAX)) {
    if (c.fini || !Array.isArray(k)) break;
    if (k[0] === 'j') jouerCarte(c, k[1] | 0, typeof k[2] === 'string' ? k[2].slice(0, 8) : undefined);
    else if (k[0] === 'f') finTour(c);
  }
  return c;
}
