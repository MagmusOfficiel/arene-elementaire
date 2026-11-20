// v79 : le parcours des nouveaux venus
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as PC from '../shared/clans/parcours.js';
import * as MT from '../shared/clans/montures.js';
import { PNJ_PAR_ID, posPnj } from '../shared/clans/pnj.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const pres = (p) => { const q = posPnj(PNJ_PAR_ID[PC.pnjDe(p, PC.etape(p))], Date.now() / 1000); return { pos: { x: q.x, y: q.y } }; };

test('six étapes dans l’ordre, récompensées une fois, le poney à la fin', () => {
  const p = P.nouveauProfil('plante', 'N', 0, 'tireur'); P.completer(p);
  assert.equal(PC.etape(p), 0);
  assert.equal(ACTIONS.parcours(p, {}, { pos: { x: 0, y: 0 } }).ok, false, 'il faut parler à l’habitant');
  assert.ok(ACTIONS.parcours(p, {}, pres(p)).ok); assert.equal(PC.etape(p), 1);
  assert.equal(ACTIONS.parcours(p, {}, {}).ok, false, 'pas de tirage encore');
  p.tirages.total = 1; assert.ok(PC.prete(p)); assert.ok(ACTIONS.parcours(p, {}, {}).ok);
  p.deck.push(Object.keys(p.collection).find((id) => !p.deck.includes(id)) || 'flamme'); assert.ok(ACTIONS.parcours(p, {}, {}).ok);
  p.stats.victoires = 1; assert.ok(ACTIONS.parcours(p, {}, {}).ok);
  p.stats.recoltes = 1; assert.ok(ACTIONS.parcours(p, {}, {}).ok);
  assert.equal(MT.possedees(p).includes('poney'), false);
  assert.ok(ACTIONS.parcours(p, {}, pres(p)).ok);
  assert.ok(PC.fini(p)); assert.ok(MT.possedees(p).includes('poney')); assert.equal(MT.actif(p), 'poney');
  assert.equal(ACTIONS.parcours(p, {}, {}).ok, false);
});
test('un ancien joueur a déjà fait ses premiers pas', () => {
  const p = P.nouveauProfil('feu', 'A', 0, 'mage'); delete p.parcours; p.stats.combats = 4; P.completer(p);
  assert.ok(PC.fini(p));
});
