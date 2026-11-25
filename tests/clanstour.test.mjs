// v91 : la Tour infinie, le deck à 20 cartes, les duels à 300 PV
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../shared/clans/tour.js';
import * as P from '../shared/clans/profil.js';
import * as C from '../shared/clans/combat.js';
import * as D from '../shared/clans/duel.js';
import * as AP from '../shared/clans/apparence.js';
import * as HF from '../shared/clans/hautsfaits.js';

const haut = (p, n) => { p.stats.victoires = P.xpPourNiveau(n); return p; };

test('la Tour : 5 monstres par étage, un boss et 2 ou 4 gardes tous les 10', () => {
  for (const n of [1, 7, 33, 66, 99]) { const e = T.ennemisEtage(n); assert.equal(e.length, 5, `étage ${n}`); assert.ok(e.every((m) => m.rang !== 'boss')); }
  assert.equal(T.ennemisEtage(10).length, 3); assert.equal(T.ennemisEtage(20).length, 5); assert.equal(T.ennemisEtage(100).length, 5);
  for (const n of [10, 20, 50, 100]) assert.equal(T.ennemisEtage(n).filter((m) => m.rang === 'boss').length, 1);
  assert.deepEqual(T.ennemisEtage(42).map((m) => m.id), T.ennemisEtage(42).map((m) => m.id), 'le même étage pour tout le monde');
  assert.ok(T.palierEtage(80).pv > T.palierEtage(10).pv && T.palierEtage(80).deg > T.palierEtage(10).deg);
});
test('la Tour : niveau 10, un étage à la fois, récompenses et cosmétiques', () => {
  const p = P.nouveauProfil('eau', 'T', 0, 'mage');
  assert.equal(T.commencer(p, 5).ok, false);
  haut(p, 12);
  const r = T.commencer(p, 5); assert.ok(r.ok); assert.equal(r.etage, 1);
  const def = T.defEtage(p); assert.equal(def.ennemis.length, 5); assert.equal(def.deck.length, 20);
  const avant = p.ress.essence;
  assert.ok(T.finir(p, { fini: 'defaite' }).ok); assert.equal(T.etageMax(p), 0);
  T.commencer(p, 6); const v = T.finir(p, { fini: 'victoire' }); assert.ok(v.victoire); assert.equal(T.etageMax(p), 1); assert.ok(p.ress.essence > avant);
  assert.equal(T.finir(p, { fini: 'victoire' }).ok, false, 'pas deux fois le même combat');
  p.tour.max = 24; assert.equal(AP.possede(p, 't_tour'), false); p.tour.max = 25; assert.ok(AP.possede(p, 't_tour'));
  p.tour.max = 25; T.commencer(p, 7); assert.equal(p.tour.essai.etage, 26);
  assert.ok(T.recompense(25, 'eau').piece === 't_tour' && T.recompense(30, 'eau').rare.id === 'perle_noire');
  p.tour.max = 50; assert.equal(HF.palierDe(p, 'tour'), 2);
});
test('un étage de la Tour se joue jusqu’au bout', () => {
  const p = haut(P.nouveauProfil('feu', 'T', 0, 'combattant'), 12); T.commencer(p, 3);
  const c = C.nouveauCombat(T.defEtage(p));
  for (let t = 0; t < 60 && !c.fini; t++) { for (let i = 0; i < 10 && !c.fini; i++) { const j = c.main.findIndex((_, q) => C.jouable(c, q)); if (j < 0) break; C.jouerCarte(c, j, c.ennemis.find((e) => e.pv > 0)?.uid); } if (!c.fini) C.finTour(c); }
  assert.ok(c.fini);
});
test('deck : 20 cartes au moins, 30 au plus ; duels à 300 PV', () => {
  assert.equal(P.DECK_MIN, 20); assert.equal(P.DECK_MAX, 30);
  for (const cl of ['feu', 'eau', 'plante']) for (const k of ['combattant', 'mage', 'tireur', 'escrimeur']) assert.equal(P.nouveauProfil(cl, 'T', 0, k).deck.length, 20);
  const vieux = P.nouveauProfil('feu', 'T', 0, 'mage'); vieux.deck = vieux.deck.slice(0, 12); P.completer(vieux); assert.equal(vieux.deck.length, 20);
  assert.equal(D.PV_DUEL(80, 'tireur'), 300); assert.ok(D.PV_DUEL(80, 'combattant') > D.PV_DUEL(80, 'mage'));
  assert.equal(D.deckValide(Array(12).fill({ id: 'frappe', niv: 1 })), false);
});
test('v92 : la Tour se remet à zéro chaque mois, le record garde les cosmétiques', () => {
  const p = haut(P.nouveauProfil('feu', 'T', 0, 'mage'), 15);
  T.commencer(p, 1); T.finir(p, { fini: 'victoire' });
  p.tour.max = 60; p.tour.record = 60;
  assert.equal(T.majSaison(p), false, 'même mois : rien ne bouge');
  p.tour.saison = '2020-01';
  assert.equal(T.majSaison(p), true);
  assert.equal(T.etageMax(p), 0); assert.equal(T.record(p), 60); assert.equal(p.tour.precedent, 60);
  assert.ok(AP.possede(p, 'k_tour') && !AP.possede(p, 'r_tour'));
  assert.equal(HF.palierDe(p, 'tour'), 2);
  const r = T.commencer(p, 9); assert.equal(r.etage, 1, 'on regrimpe depuis le bas');
});
test('v92 : le classement du mois (le plus haut, puis le premier arrivé)', async () => {
  const S = await import('../server/src/stats.js');
  S.tourEnregistrer('a', { nom: 'Ana', clan: 'feu', classe: 'mage', etage: 12 });
  S.tourEnregistrer('b', { nom: 'Bob', clan: 'eau', classe: 'tireur', etage: 30 });
  S.tourEnregistrer('c', { nom: 'Cid', clan: 'plante', classe: 'escrimeur', etage: 12 });
  S.tourEnregistrer('a', { nom: 'Ana', clan: 'feu', classe: 'mage', etage: 5 });   // plus bas : ignoré
  const c = S.classementTour('c');
  assert.deepEqual(c.top.slice(0, 3).map((e) => e.nom), ['Bob', 'Ana', 'Cid']);
  assert.equal(c.rang, 3); assert.ok(c.fin > Date.now());
});
