// v68 : chaque classe ne tire et ne joue que ses propres cartes de classe
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import { CARTES } from '../shared/clans/cartes.js';

const autre = (classe) => Object.values(CARTES).find((c) => c.classe && c.classe !== classe).id;
const sienne = (classe) => Object.values(CARTES).find((c) => c.classe === classe && !CARTES[c.id].exclusif).id;

test('les tirages ne donnent jamais de carte d’une autre classe', () => {
  for (const cl of ['combattant', 'mage', 'tireur', 'escrimeur']) {
    const p = P.nouveauProfil('feu', 'T', 0, cl); p.ress.essence = 1e7;
    for (let i = 0; i < 40; i++) P.tirer(p, 10, 1000 + i);
    const ids = Object.keys(p.collection);
    assert.ok(ids.every((id) => P.pourClasse(id, cl)), `${cl} a reçu une carte d’une autre classe`);
    assert.ok(ids.some((id) => CARTES[id].classe === cl), `${cl} reçoit bien ses cartes de classe`);
  }
});

test('on ne peut pas mettre une carte d’une autre classe dans son deck', () => {
  const p = P.nouveauProfil('eau', 'T', 0, 'mage'), id = autre('mage');
  p.collection[id] = { n: 2, niv: 1 };
  const r = P.ajouterAuDeck(p, id);
  assert.equal(r.ok, false); assert.match(r.raison, /réservée/);
  const s = sienne('mage'); p.collection[s] = { n: 4, niv: 1 }; p.deck = p.deck.filter((x) => x !== s);
  assert.equal(P.ajouterAuDeck(p, s).ok, true, 'ses propres cartes de classe, oui');
});

test('un ancien profil : ses cartes d’autres classes deviennent des éclats et quittent ses decks', () => {
  const p = P.nouveauProfil('plante', 'T', 0, 'tireur'), id = autre('tireur');
  p.collection[id] = { n: 3, niv: 2 };
  p.deck = [...p.deck.slice(0, 8), id, id, id];
  p.decks = { actif: 0, l: [null, { nom: 'Vieux', cartes: [id, 'frappe'] }, null] };
  const avant = p.ress.eclats;
  P.completer(p);
  assert.equal(p.collection[id], undefined);
  assert.ok(!p.deck.includes(id) && p.deck.length >= P.DECK_MIN);
  assert.deepEqual(p.decks.l[1].cartes, ['frappe']);
  assert.ok(p.ress.eclats > avant); assert.equal(p.avisClasse.n, 3);
  P.completer(p);   // au chargement suivant : rien de plus, l'avis est effacé
  assert.equal(p.avisClasse, undefined);
});
