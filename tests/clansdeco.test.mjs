// v77 : décorer sa maison
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as DC from '../shared/clans/deco.js';
import { ACTIONS } from '../server/src/clansProfils.js';

test('acheter, poser, enlever, et le code envoyé aux autres', () => {
  const p = P.nouveauProfil('feu', 'D', 0, 'mage'); p.ress.essence = 5000; p.ress.eclats = 50;
  assert.equal(DC.code(p), '...');
  assert.ok(ACTIONS.decoAcheter(p, { id: 'cl_bois' }).ok); assert.equal(p.ress.essence, 4600);
  assert.equal(ACTIONS.decoAcheter(p, { id: 'cl_bois' }).ok, false, 'pas deux fois');
  assert.ok(ACTIONS.decoAcheter(p, { id: 'ba_or' }).ok);
  assert.equal(DC.code(p), 'cl_bois...ba_or');
  assert.deepEqual(DC.lire(DC.code(p)), { cloture: 'cl_bois', jardin: null, statue: null, banniere: 'ba_or' });
  assert.ok(ACTIONS.decoPoser(p, { empl: 'cloture', id: null }).ok); assert.equal(DC.code(p), '...ba_or');
  assert.equal(ACTIONS.decoPoser(p, { empl: 'cloture', id: 'cl_fer' }).ok, false, 'pas achetée');
  assert.equal(ACTIONS.decoPoser(p, { empl: 'jardin', id: 'cl_bois' }).ok, false, 'mauvais emplacement');
  assert.match(ACTIONS.decoAcheter(p, { id: 'st_dragon' }).raison, /niveau 15/);
  // les décorations à gagner
  assert.match(ACTIONS.decoAcheter(p, { id: 'ba_branche' }).raison, /ne s’achète pas/);
  assert.equal(ACTIONS.decoPoser(p, { empl: 'banniere', id: 'ba_branche' }).ok, false);
  p.branche = 'archimage'; assert.ok(ACTIONS.decoPoser(p, { empl: 'banniere', id: 'ba_branche' }).ok);
  assert.equal(DC.lire('x.y.z.w').cloture, null, 'un code bidon ne casse rien');
});
