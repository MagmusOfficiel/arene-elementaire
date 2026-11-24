// v74 : les habitants des terres, et le marchand / boss moins fréquents
import { FAILLE_Y } from '../shared/clans/geo.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNJ, posPnj, cheminDe } from '../shared/clans/pnj.js';
import { obstacles, praticable, territoireDe } from '../shared/clans/geo.js';
import { MONDIAL } from '../shared/clans/mondial.js';

test('6 habitants par terre, chez eux, qui marchent sur des endroits praticables', () => {
  const o = obstacles();
  for (const c of ['feu', 'eau', 'plante']) assert.equal(PNJ.filter((p) => p.clan === c).length, 6);
  for (const p of PNJ) {
    assert.ok(p.dits.length >= 3, p.id);
    assert.ok(cheminDe(p).etapes.length >= 1);
    for (let t = 0; t < 120; t += 1.7) {
      const q = posPnj(p, t);
      assert.ok(praticable(q.x, q.y, o), `${p.id} bloqué à t=${t}`);
      if (p.clan === 'brisees') assert.ok(q.y > FAILLE_Y - 120, `${p.id} loin de la Faille`);   // v87 : les gens de la Faille (Orin garde la porte, juste devant)
      else assert.equal(territoireDe(q.x, q.y), p.clan, `${p.id} sort de sa terre`);
    }
    assert.deepEqual(posPnj(p, 1234.5), posPnj(p, 1234.5), 'même heure → même place pour tout le monde');
  }
});

test('le boss mondial vient moins souvent', () => {
  assert.ok(MONDIAL.intervalle >= 45 * 60e3);
  assert.ok(MONDIAL.premier >= 10 * 60e3);
});
