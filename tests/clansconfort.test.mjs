import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import { CARTES } from '../shared/clans/cartes.js';
import * as PS from '../shared/clans/passe.js';

test('v83 : 2 exemplaires par deck, 1 pour une légendaire', () => {
  const p = P.nouveauProfil('feu', 'T', 0, 'mage');
  assert.equal(p.deck.length, 12);
  const compte = {}; for (const id of p.deck) compte[id] = (compte[id] || 0) + 1;
  assert.ok(Object.values(compte).every((n) => n <= 2));
  const leg = Object.keys(CARTES).find((id) => CARTES[id].rarete === 'legendaire' && P.pourClasse(id, 'mage'));
  p.collection[leg] = { n: 3, niv: 1 };
  assert.ok(P.ajouterAuDeck(p, leg).ok); assert.equal(P.ajouterAuDeck(p, leg).ok, false);
  p.collection.flamme = { n: 4, niv: 1 };
  assert.ok(P.ajouterAuDeck(p, 'flamme').ok); assert.equal(P.ajouterAuDeck(p, 'flamme').ok, false);
  // un ancien deck à 4 exemplaires est remis aux règles
  const vieux = P.nouveauProfil('feu', 'V', 0, 'mage'); vieux.collection.frappe.n = 4; vieux.deck.push('frappe', 'frappe');
  P.completer(vieux);
  assert.equal(vieux.deck.filter((x) => x === 'frappe').length, 2); assert.equal(vieux.avisDeck, 2);
  P.completer(vieux); assert.equal(vieux.avisDeck, undefined);
});
test('v83→v87 : niveau maximum 80', () => {
  const p = P.nouveauProfil('eau', 'T', 0); p.stats.victoires = 100000;
  assert.equal(P.niveau(p), 80);
});
test('v83 : quand revient une pièce du passe', () => {
  const q = PS.quandPiece('a_abysses', Date.UTC(2026, 10, 20));
  assert.deepEqual(q, { maintenant: false, niv: 30, dansMois: 1 });
});
