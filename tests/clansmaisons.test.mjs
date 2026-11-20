// v72 : le parchemin de réorientation, les montures à gagner, la maison posée
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as MT from '../shared/clans/montures.js';
import * as G from '../shared/clans/geo.js';
import { CARTES } from '../shared/clans/cartes.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const riche = (classe = 'mage') => { const p = P.nouveauProfil('feu', 'Test', 0, classe); Object.assign(p.ress, { essence: 50000, eclats: 1000, cristal: 50, perle_noire: 50, graine_or: 50 }); return p; };

test('parchemin : fabriquer puis changer de branche, les anciens sorts deviennent des éclats', () => {
  const p = riche('mage');
  assert.equal(ACTIONS.parcheminFabriquer(p).ok, false, 'pas sans branche');
  p.branche = 'archimage'; p.titre = 'br:archimage';
  const sort = Object.values(CARTES).find((c) => c.branche === 'archimage').id;
  p.collection[sort] = { n: 2, niv: 1 }; p.deck = [...p.deck, sort];
  assert.match(ACTIONS.ascensionChanger(p, { b: 'invocateur' }).raison, /Parchemin/);
  assert.ok(ACTIONS.parcheminFabriquer(p).ok); assert.equal(p.parchemins, 1); assert.equal(p.ress.essence, 44000);
  assert.equal(ACTIONS.ascensionChanger(p, { b: 'gardien' }).ok, false, 'pas une branche du Mage');
  const ecl = p.ress.eclats, r = ACTIONS.ascensionChanger(p, { b: 'invocateur' });
  assert.ok(r.ok); assert.equal(p.branche, 'invocateur'); assert.equal(p.parchemins, 0);
  assert.equal(p.collection[sort], undefined); assert.ok(!p.deck.includes(sort)); assert.ok(p.ress.eclats > ecl);
  assert.equal(p.titre, null, 'le titre de l’ancienne branche part');
});

test('montures à gagner : ni achetables, débloquées par le Cauchemar et l’arène', () => {
  const p = riche();
  assert.match(ACTIONS.montureAcheter(p, { id: 'loup' }).raison, /ne s’achète pas/);
  assert.equal(ACTIONS.montureChoisir(p, { id: 'loup' }).ok, false);
  p.stats.cauchemar = 1;
  assert.ok(ACTIONS.montureChoisir(p, { id: 'loup' }).ok); assert.equal(MT.actif(p), 'loup');
  assert.ok(!MT.possedees(p).includes('phenix'));
  p.stats.areneMax = 1420; assert.ok(MT.possedees(p).includes('phenix'));
});

test('poser sa maison : sur sa terre, au bon endroit, la 1re fois gratuite puis 1 000 essence', () => {
  const p = riche(); p.ress.essence = 1500;
  const libres = [];
  for (let y = 40; y < G.MONDE.h && libres.length < 2; y += 16) for (let x = 40; x < G.MONDE.l && libres.length < 2; x += 16) {
    const e = G.emplacementMaison('feu', x, y, libres); if (!e.raison) libres.push(e);
  }
  const [a, b] = libres, ctx = (m) => ({ pos: { x: m.x, y: m.y + 40 }, cle: 'test-maison' });
  assert.match(ACTIONS.maisonPoser(p, { x: a.x, y: a.y }, { pos: { x: 0, y: 0 }, cle: 'k' }).raison, /sur place/);
  const r = ACTIONS.maisonPoser(p, a, ctx(a)); assert.ok(r.ok, r.raison); assert.equal(r.res.prix, 0);
  assert.equal(G.cleMaison(p), `${a.x},${a.y}`); assert.deepEqual(G.posMaison('feu', G.cleMaison(p)), { ...a, posee: true });
  const r2 = ACTIONS.maisonPoser(p, b, ctx(b)); assert.ok(r2.ok, r2.raison); assert.equal(r2.res.prix, 1000); assert.equal(p.ress.essence, 500);
  assert.match(ACTIONS.maisonPoser(p, a, ctx(a)).raison, /1000 essence/);
  // pas chez les autres, pas collée à une autre maison
  const eau = Object.values(G.CENTRES)[1];
  assert.match(G.emplacementMaison('feu', 2600, 2600).raison || G.emplacementMaison('feu', b.x + 40, b.y, [b]).raison, /terre|maison|libre|village|lieu/);
  assert.match(G.emplacementMaison('feu', b.x + 40, b.y, [b]).raison, /maison|libre/);
});
