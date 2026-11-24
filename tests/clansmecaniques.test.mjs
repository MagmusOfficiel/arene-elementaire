import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../shared/clans/combat.js';
import * as D from '../shared/clans/duel.js';
import { MONSTRES } from '../shared/clans/monstres.js';

const deck = (ids) => ids.map((id) => ({ id, niv: 1 }));
const combat = (ids, o = {}) => C.nouveauCombat({ deck: deck(ids), joueur: { pv: 80, pvMax: 80 }, ennemis: [MONSTRES.feu.normaux[0]], graine: 3, ...o });

test('v84 : 4 énergie avec une branche d’Ascension', () => {
  assert.equal(combat(Array(10).fill('frappe')).energie, 3);
  assert.equal(combat(Array(10).fill('frappe'), { classe: 'combattant', branche: 'gardien' }).energie, 4);
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', branche: 'archimage', pvMax: 60, deck: deck(Array(10).fill('frappe')) }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 60, deck: deck(Array(10).fill('frappe')) }, 5);
  assert.equal(d.j[0].energieMax, 4); assert.equal(d.j[1].energieMax, 3);
});
test('v84 : Miroir copie une carte de la main (éphémère), Élan réduit les coûts', () => {
  const c = combat(Array(10).fill('frappe')); c.main[0] = { uid: 'm', id: 'miroir', niv: 1 }; const i = 0;
  const n = c.main.length; assert.ok(C.jouerCarte(c, i));
  assert.equal(c.main.length, n); assert.ok(c.main.some((k) => k.eph));
  const e = c.main.findIndex((k) => k.eph), avant = c.defausse.length;
  if (C.jouable(c, e)) { C.jouerCarte(c, e); assert.equal(c.defausse.length, avant, 'la copie ne va pas dans la défausse'); }
  C.finTour(c); assert.ok(!c.main.some((k) => k.eph) && !c.defausse.some((k) => k.eph));
  // réduction
  const r = combat(Array(10).fill('frappe')); r.main[0] = { uid: 'x', id: 'souffle_vif', niv: 1 };
  assert.ok(C.jouerCarte(r, 0)); assert.ok(r.main.every((k, j) => C.coutDe(r, j) === 0));
  C.finTour(r); assert.ok(r.main.every((k, j) => C.coutDe(r, j) === 1));
});
test('v84 : le familier vient en duel', () => {
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 60, deck: deck(Array(10).fill('frappe')), familier: 'salamandre' }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 60, deck: deck(Array(10).fill('frappe')), familier: 'tortue' }, 5);
  assert.ok(d.j[1].brulure >= 1 || d.j[1].pv < 60); assert.ok(d.j[1].bloc >= 5 || d.actif === 1);
});
