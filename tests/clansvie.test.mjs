// v97 : la vie se garde entre les expéditions ; on la remonte en se reposant chez soi
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { ACTIONS } from '../server/src/clansProfils.js';
import { posMaison, cleMaison } from '../shared/clans/geo.js';

test('on part avec sa vie, on revient avec ce qu’il en reste', () => {
  const p = P.nouveauProfil('feu', 'Vie', 0), max = P.pvMax(p);
  assert.equal(P.vie(p), max); assert.ok(!P.blesse(p));
  X.commencerExpedition(p, 'feu', 1, 123); assert.equal(p.expedition.pv, max);
  p.expedition.pv = 20; X.terminer(p, 'defaite');
  assert.equal(P.vie(p), 20); assert.ok(P.blesse(p));
  X.commencerExpedition(p, 'feu', 1, 124); assert.equal(p.expedition.pv, 20, 'la 2e expédition part blessée');
  p.expedition.pv = 0; const b = X.terminer(p, 'defaite'); assert.equal(P.vie(p), 1, 'jamais en dessous de 1'); assert.equal(b.pv, 1);
});

test('se reposer : seulement devant sa maison, et pas en expédition', () => {
  const p = P.nouveauProfil('eau', 'Repos', 0); p.vie = 5;
  const h = posMaison(p.clan, cleMaison(p));
  assert.equal(ACTIONS.seReposer(p, {}, { pos: { x: h.x + 900, y: h.y } }).ok, false);
  assert.equal(P.vie(p), 5);
  const r = ACTIONS.seReposer(p, {}, { pos: { x: h.x, y: h.y + 40 } });
  assert.ok(r.ok); assert.equal(P.vie(p), P.pvMax(p)); assert.equal(p.vie, undefined);
  assert.equal(P.seReposer(p).ok, false, 'déjà en pleine forme');
  p.vie = 3; X.commencerExpedition(p, 'eau', 1, 5); assert.equal(P.seReposer(p).ok, false);
});
