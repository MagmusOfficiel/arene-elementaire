// Les Clans Élémentaires : moteur de combat, tirages, parcelle, expéditions
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARTES, decrire, effetsDe, CLANS, CLASSES, LISTE_CLASSES } from '../shared/clans/cartes.js';
import { MONSTRES } from '../shared/clans/monstres.js';
import * as C from '../shared/clans/combat.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';

// un joueur automatique simple : joue la carte jouable la plus chère, vise l'ennemi le plus faible
export function jouerCombat(c, max = 60) {
  for (let t = 0; t < max && !c.fini; t++) {
    for (;;) {
      const i = c.main.map((k, n) => [n, CARTES[k.id].cout]).filter(([n]) => C.jouable(c, n)).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (i == null) break;
      const cible = c.ennemis.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv)[0]?.uid;
      C.jouerCarte(c, i, cible);
      if (c.fini) break;
    }
    C.finTour(c);
  }
  return c.fini;
}
function expeditionAuto(p, terr, palier, graine) {
  X.commencerExpedition(p, terr, palier, graine);
  for (let g = 0; g < 20 && p.expedition; g++) {
    const ch = X.choixPossibles(p.expedition);
    const id = ch.find((k) => X.salle(p.expedition.carte, k).type === 'repos' && p.expedition.pv < p.expedition.pvMax * 0.6) || ch[0];
    const r = X.entrer(p, id);
    if (r.combat) { const c = C.nouveauCombat(r.combat); jouerCombat(c); const a = X.apresCombat(p, c); if (a.fin) return a; }
  }
  return null;
}

test('chaque carte a un texte, un coût et un élément valides', () => {
  for (const [id, c] of Object.entries(CARTES)) {
    assert.ok(decrire(id).length > 5, id); assert.ok(c.cout >= 0 && c.cout <= 3, id);
    assert.ok(['feu', 'eau', 'plante', 'neutre'].includes(c.element), id);
  }
  assert.ok(Object.keys(CARTES).length >= 80);
  for (const k of LISTE_CLASSES) assert.ok(Object.values(CARTES).filter((c) => c.classe === k).length >= 10, k);
  assert.equal(effetsDe('flamme', 3).degats, Math.round(8 * 1.6));
});

test('combat : énergie, pioche, bouclier, brûlure, trempé et épines', () => {
  const c = C.nouveauCombat({ deck: Array(10).fill({ id: 'frappe' }), joueur: { pv: 50, pvMax: 50 }, ennemis: [MONSTRES.feu.normaux[2]], graine: 3 });
  assert.equal(c.energie, 3); assert.equal(c.main.length, 5);
  const e = c.ennemis[0], pv0 = e.pv;
  C.jouerCarte(c, 0, e.uid); assert.equal(e.pv, pv0 - 6); assert.equal(c.energie, 2);
  e.trempe = 1; C.jouerCarte(c, 0, e.uid); assert.equal(e.pv, pv0 - 6 - 9);
  // brûlure : dégâts au début du tour du monstre, puis elle baisse
  e.brulure = 4; e.trempe = 0; const avant = e.pv; C.finTour(c); assert.equal(e.pv, avant - 4); assert.equal(e.brulure, 3);
  // épines : l'attaquant se blesse
  const d = C.nouveauCombat({ deck: Array(10).fill({ id: 'garde' }), joueur: { pv: 50, pvMax: 50 }, ennemis: [{ id: 't', nom: 't', pv: 30, intentions: [{ a: 5 }] }], graine: 1 });
  d.joueur.epines = 3; C.finTour(d); assert.equal(d.ennemis[0].pv, 27); assert.equal(d.joueur.pv, 45);
});

test('combat : victoire et défaite', () => {
  const v = C.nouveauCombat({ deck: Array(10).fill({ id: 'flamme' }), joueur: { pv: 60, pvMax: 60 }, ennemis: [MONSTRES.feu.normaux[1]], graine: 2 });
  assert.equal(jouerCombat(v), 'victoire');
  const d = C.nouveauCombat({ deck: Array(10).fill({ id: 'garde' }), joueur: { pv: 5, pvMax: 5 }, ennemis: [MONSTRES.eau.boss], graine: 2 });
  assert.equal(jouerCombat(d), 'defaite');
});

test('tirages : coût, garanties, doublons en éclats', () => {
  const p = P.nouveauProfil('feu', 'T', 0);
  assert.equal(P.tirer(p, 10).ok, false);
  p.ress.essence = 100000;
  const r = P.tirer(p, 10, 42);
  assert.equal(r.cartes.length, 10); assert.ok(r.cartes.some((x) => ['epique', 'legendaire'].includes(CARTES[x.id].rarete)));
  assert.equal(p.ress.essence, 100000 - 900);
  for (let i = 0; i < 60; i++) P.tirer(p, 1, 1000 + i);
  assert.ok(Object.keys(p.collection).some((id) => CARTES[id].rarete === 'legendaire'), 'une légendaire au plus tard en 60 tirages');
  assert.ok(Object.values(p.collection).every((c) => c.n <= P.COPIES_MAX)); assert.ok(p.ress.eclats > 0);
  // l'élément du clan sort plus souvent
  const q = P.nouveauProfil('eau', 'T', 0); q.ress.essence = 1e6; let eau = 0, feu = 0;
  for (let i = 0; i < 40; i++) for (const x of P.tirer(q, 10, i * 7 + 1).cartes) { if (CARTES[x.id].element === 'eau') eau++; if (CARTES[x.id].element === 'feu') feu++; }
  assert.ok(eau > feu * 2, `${eau} eau / ${feu} feu`);
});

test('deck et amélioration des cartes', () => {
  const p = P.nouveauProfil('plante', 'T', 0);
  assert.ok(P.retirerDuDeck(p, 'garde').ok && P.retirerDuDeck(p, 'garde').ok);
  assert.equal(P.retirerDuDeck(p, 'frappe').ok, false, '10 cartes au moins');
  assert.equal(P.ajouterAuDeck(p, 'frappe').ok, false, 'pas d’autre exemplaire');
  p.collection.chene = { n: 2, niv: 1 };
  assert.ok(P.ajouterAuDeck(p, 'chene').ok && P.ajouterAuDeck(p, 'chene').ok); assert.equal(P.ajouterAuDeck(p, 'chene').ok, false);
  assert.ok(P.retirerDuDeck(p, 'frappe').ok);
  assert.equal(P.ameliorer(p, 'chene').ok, false);
  p.ress.eclats = 500; p.ress.seve = 500;
  assert.equal(P.ameliorer(p, 'chene').niv, 2); assert.equal(P.ameliorer(p, 'chene').niv, 3); assert.equal(P.ameliorer(p, 'chene').ok, false);
  assert.equal(P.deckCombat(p).find((x) => x.id === 'chene').niv, 3);
});

test('parcelle : production plafonnée, récolte et construction', () => {
  const p = P.nouveauProfil('feu', 'T', 0);
  const h = 3600000;
  assert.deepEqual(P.production(p, 2 * h), { heures: 2, essence: 50, braises: 6 });
  assert.equal(P.production(p, 100 * h).heures, P.stockageHeures(p));
  P.recolter(p, 2 * h); assert.equal(p.ress.essence, 350); assert.equal(p.ress.braises, 6);
  assert.equal(P.construire(p, 'autel', 2 * h).ok, false);
  p.ress.braises = 100; assert.equal(P.construire(p, 'autel', 2 * h).niv, 2);
  assert.equal(P.production(p, 3 * h).essence, 35);
  p.ress.essence = 1e5; p.ress.braises = 1e5; P.construire(p, 'maison', 3 * h); assert.equal(P.pvMax(p), 66 + 15, 'Combattant : +15 PV');
});

test('expédition : carte jouable, butin, défaite qui coûte la moitié', () => {
  for (let g = 1; g < 30; g++) {
    const k = X.genererCarte(g);
    let atteint = new Set(k.etages[0].map((s) => s.id));
    for (let e = 0; e < X.ETAGES; e++) { const suiv = new Set(); for (const id of atteint) for (const v of X.salle(k, id).vers) suiv.add(v); if (e < X.ETAGES - 1) assert.equal(suiv.size, k.etages[e + 1].length, `graine ${g} étage ${e}`); atteint = suiv; }
    assert.ok(atteint.has('boss'));
  }
  const p = P.nouveauProfil('eau', 'T', 0);
  assert.equal(X.commencerExpedition(p, 'feu', 2).ok, false, 'palier verrouillé');
  X.commencerExpedition(p, 'plante', 1, 7);
  const id = X.choixPossibles(p.expedition)[0], r = X.entrer(p, id);
  assert.ok(r.combat); const c = C.nouveauCombat(r.combat); jouerCombat(c);
  X.apresCombat(p, c); assert.ok(p.expedition.butin.essence > 0);
  const b = p.expedition.butin.essence, e0 = p.ress.essence;
  X.terminer(p, 'defaite'); assert.equal(p.ress.essence, e0 + Math.floor(b / 2)); assert.equal(p.expedition, null);
});

test('équilibrage : le deck de départ gagne souvent le palier I, et le bot ne gagne pas tout au palier III', () => {
  for (const clan of CLANS) for (const classe of LISTE_CLASSES) {
    let gagnees = 0;
    for (let g = 0; g < 20; g++) { const p = P.nouveauProfil(clan, 'B', 0, classe); if (expeditionAuto(p, clan, 1, 100 + g)?.fin === 'victoire') gagnees++; }
    assert.ok(gagnees >= 4 && gagnees <= 19, `${clan}/${classe} : ${gagnees}/20 au palier I`);
  }
  const p = P.nouveauProfil('feu', 'B', 0); p.paliers.feu = 3;
  let dur = 0; for (let g = 0; g < 10; g++) { p.paliers.feu = 3; if (expeditionAuto(p, 'feu', 3, 500 + g)?.fin === 'victoire') dur++; }
  assert.ok(dur <= 3, `palier III : ${dur}/10`);
});

test('classes : les quatre talents', () => {
  const ennemi = [{ id: 'm', nom: 'm', pv: 300, intentions: [{ d: 0 }] }];
  const mk = (classe, deck) => C.nouveauCombat({ deck: deck.map((id) => ({ id })), joueur: { pv: 50, pvMax: 50 }, ennemis: ennemi, graine: 1, classe });
  // Endurci : 6 de bouclier au début du combat
  assert.equal(mk('combattant', Array(10).fill('garde')).joueur.bloc, 6);
  assert.equal(mk('mage', Array(10).fill('garde')).joueur.bloc, 0);
  // Arcanes : le premier sort élémentaire du tour coûte 1 de moins
  const m = mk('mage', Array(10).fill('flamme'));
  assert.equal(C.coutDe(m, 0), 0); C.jouerCarte(m, 0, 'e0'); assert.equal(m.energie, 3); assert.equal(C.coutDe(m, 0), 1);
  C.finTour(m); assert.equal(C.coutDe(m, 0), 0, 'à nouveau au tour suivant');
  // Visée : la troisième attaque fait double dégâts
  const t = mk('tireur', Array(10).fill('frappe')), e = t.ennemis[0];
  C.jouerCarte(t, 0, 'e0'); C.jouerCarte(t, 0, 'e0'); assert.ok(C.viseeProchaine(t)); const avant = e.pv; C.jouerCarte(t, 0, 'e0'); assert.equal(avant - e.pv, 12);
  // Enchaînement : +2 par coup après une première attaque
  const s = mk('escrimeur', Array(10).fill('botte')), f = s.ennemis[0];
  C.jouerCarte(s, 0, 'e0'); assert.equal(300 - f.pv, 8); C.jouerCarte(s, 0, 'e0'); assert.equal(300 - f.pv, 8 + 12);
});

test('classes : deck de départ, PV, tirages et ancien profil', () => {
  const p = P.nouveauProfil('eau', 'T', 0, 'tireur');
  assert.equal(p.deck.length, 12); assert.ok(p.deck.includes('tir') && p.deck.includes('piege') && p.deck.includes('vague'));
  assert.equal(P.pvMax(P.nouveauProfil('eau', 'T', 0, 'mage')), 50);
  p.ress.essence = 1e6; let tireur = 0, autres = 0;
  for (let i = 0; i < 40; i++) for (const x of P.tirer(p, 10, i * 13 + 5).cartes) { const k = CARTES[x.id].classe; if (k === 'tireur') tireur++; else if (k) autres++; }
  assert.ok(tireur > autres, `${tireur} cartes de Tireur / ${autres} d'autres classes`);
  // un profil créé avant les classes en reçoit une, avec ses deux cartes
  const vieux = P.nouveauProfil('feu', 'V', 0); delete vieux.classe;
  assert.ok(P.profilValide(vieux)); assert.ok(P.choisirClasse(vieux, 'escrimeur'));
  assert.ok(vieux.deck.includes('estoc') && vieux.collection.parade.n === 1); assert.equal(P.choisirClasse(vieux, 'mage'), false);
});

import * as D from '../shared/clans/duel.js';
import { RARES } from '../shared/clans/cartes.js';
import { territoireDe, obstacles, praticable, CENTRES, CARREFOUR, MAISONS, LIEUX, NT } from '../shared/clans/geo.js';

const joueurDuel = (nom, clan, classe) => { const p = P.nouveauProfil(clan, nom, 0, classe); return { nom, clan, classe, pvMax: P.pvMax(p), deck: P.deckCombat(p) }; };
function duelAuto(d) {
  for (let t = 0; t < 200 && !d.fini; t++) {
    const q = d.actif, j = d.j[q];
    for (;;) { const i = j.main.findIndex((k, n) => D.coutDe(j, n) <= j.energie); if (i < 0 || !D.jouer(d, q, i)) break; if (d.fini) break; }
    if (!d.fini) D.finTour(d, q);
  }
  return d;
}

test('duel : chacun son tour, on ne joue pas chez l’autre, et quelqu’un finit par gagner', () => {
  const d = D.nouveauDuel(joueurDuel('A', 'feu', 'combattant'), joueurDuel('B', 'eau', 'mage'), 5);
  const q = d.actif;
  assert.equal(d.j[q].main.length, 5); assert.equal(d.j[q].energie, 3);
  assert.equal(D.jouer(d, 1 - q, 0), false, 'pas son tour');
  assert.equal(D.finTour(d, 1 - q), false);
  assert.ok(D.finTour(d, q)); assert.equal(d.actif, 1 - q);
  const v = D.vue(d, q); assert.equal(v.aMoi, false); assert.ok(!('main' in v.adv)); assert.equal(typeof v.adv.nMain, 'number');
  duelAuto(d); assert.ok(d.fini && (d.gagnant === 0 || d.gagnant === 1 || d.gagnant === null));
  // aucune combinaison ne gagne tout : sur 24 duels Feu contre Eau, chacun en remporte
  let a = 0, b = 0;
  for (let g = 0; g < 24; g++) { const x = duelAuto(D.nouveauDuel(joueurDuel('A', 'feu', 'tireur'), joueurDuel('B', 'plante', 'escrimeur'), g + 1)); if (x.gagnant === 0) a++; if (x.gagnant === 1) b++; }
  assert.ok(a >= 3 && b >= 3, `${a} / ${b}`);
});

test('duel : decks venus du navigateur vérifiés, butin plafonné', () => {
  assert.ok(D.deckValide(joueurDuel('A', 'feu', 'mage').deck));
  assert.equal(D.deckValide([{ id: 'frappe' }]), false);
  assert.equal(D.deckValide(Array(10).fill({ id: 'triche' })), false);
  assert.equal(D.deckValide(Array(10).fill({ id: 'frappe', niv: 9 })), false);
  assert.equal(P.BUTIN_DUEL(1000), 150); assert.equal(P.BUTIN_DUEL(100000), 300); assert.equal(P.BUTIN_DUEL(-5), 0);
});

test('ressources rares : monstres rares, cartes exclusives, géographie', () => {
  for (const t of CLANS) assert.ok(MONSTRES[t].rare);
  // les exclusives ne sortent pas aux tirages
  const p = P.nouveauProfil('feu', 'T', 0, 'mage'); p.ress.essence = 1e6;
  for (let i = 0; i < 60; i++) for (const x of P.tirer(p, 10, i + 3).cartes) assert.ok(!CARTES[x.id].exclusif, x.id);
  assert.equal(P.fabriquer(p, 'trident').ok, false);
  p.ress.perle_noire = 15; assert.ok(P.fabriquer(p, 'trident').ok); assert.equal(p.collection.trident.n, 1); assert.equal(p.ress.perle_noire, 0);
  // un ancien profil reçoit les nouveaux champs
  const v = P.nouveauProfil('eau', 'V', 0); delete v.ress.cristal; delete v.duels; P.completer(v); assert.equal(v.ress.cristal, 0); assert.ok(v.duels);
  // la géographie partagée
  for (const k of ['feu', 'eau', 'plante']) assert.equal(territoireDe(...CENTRES[k]), k);
  assert.equal(territoireDe(...CARREFOUR), null);
  const o = obstacles(); assert.ok(praticable(CARREFOUR[0], CARREFOUR[1] + 80, o));
  // tout se rejoint à pied depuis le Carrefour : maisons, portails, autel
  const L = NT.l, vu = new Uint8Array(L * NT.h), pile = [[Math.floor(CARREFOUR[0] / 16), Math.floor((CARREFOUR[1] + 80) / 16)]]; vu[pile[0][1] * L + pile[0][0]] = 1;
  while (pile.length) { const [x, y] = pile.pop(); for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (a < 0 || b < 0 || a >= L || b >= NT.h || vu[b * L + a] || o.grille[b * L + a]) continue; vu[b * L + a] = 1; pile.push([a, b]); } }
  const accessible = (x, y) => vu[Math.floor(y / 16) * L + Math.floor(x / 16)] === 1;
  for (const k in MAISONS) for (const m of MAISONS[k]) assert.ok(accessible(m.x, m.y + 40) && praticable(m.x, m.y + 40, o), `maison ${k}`);
  for (const l of LIEUX) assert.ok(accessible(l.x, l.y + 50), l.id);
  assert.ok(Object.values(RARES).every((r) => r.id && r.ico));
});
