// Les Clans Élémentaires : plusieurs decks enregistrés (v64)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import { CARTES } from '../shared/clans/cartes.js';
import * as X from '../shared/clans/expedition.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const profil = () => P.nouveauProfil('feu', 'Ana', Date.now(), 'mage');

test('decks : trois emplacements, l’actif est le deck joué', () => {
  const p = profil(), d0 = [...p.deck], e = P.emplacements(p);
  assert.equal(e.l.length, 3); assert.equal(e.actif, 0); assert.deepEqual(e.l[0].cartes, d0); assert.equal(e.l[1].cartes, null);
  // un emplacement vide commence comme une copie
  assert.ok(ACTIONS.deckChoisir(p, { i: 1 }).ok); assert.deepEqual(p.deck, d0); assert.equal(P.emplacements(p).actif, 1);
  // on modifie le deck 2, puis on revient au 1 : chacun garde ses cartes
  const id = Object.keys(CARTES).find((k) => CARTES[k].element === 'feu' && !CARTES[k].classe && !CARTES[k].exclusif && !p.deck.includes(k)); p.collection[id] = { n: 1, niv: 1 }; assert.ok(P.ajouterAuDeck(p, id).ok); const d1 = [...p.deck];
  assert.ok(ACTIONS.deckChoisir(p, { i: 0 }).ok); assert.deepEqual(p.deck, d0);
  assert.ok(ACTIONS.deckChoisir(p, { i: 1 }).ok); assert.deepEqual(p.deck, d1);
  assert.equal(ACTIONS.deckChoisir(p, { i: 7 }).ok, false); assert.equal(ACTIONS.deckChoisir(p, { i: '1' }).ok, false);
});

test('decks : renommer, et pas de changement pendant une expédition', () => {
  const p = profil();
  assert.ok(ACTIONS.deckRenommer(p, { i: 2, nom: '  Contre les boss <b>  ' }).ok); assert.equal(P.emplacements(p).l[2].nom, 'Contre les boss b');
  assert.equal(ACTIONS.deckRenommer(p, { i: 2, nom: '   ' }).ok, false);
  assert.equal(P.emplacements(p).l[0].nom, 'Expédition');
  X.commencerExpedition(p, 'feu', 1, 1);
  assert.equal(ACTIONS.deckChoisir(p, { i: 1 }).ok, false);
});

test('decks : un deck enregistré devenu invalide est nettoyé', () => {
  const p = profil();
  p.decks = { actif: 0, l: [null, { nom: 'Vieux', cartes: ['frappe', 'nimporte', 'frappe', 'frappe', 'frappe', 'frappe', 'frappe'] }, null] };
  const r = ACTIONS.deckChoisir(p, { i: 1 }); assert.equal(r.ok, false, 'trop peu de cartes valables'); assert.match(r.raison, /cartes valables/);
  assert.equal(P.emplacements(p).actif, 0);
});
