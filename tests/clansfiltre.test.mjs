import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrer, grossier, pseudoOk } from '../shared/clans/filtre.js';

test('filtre : les grossièretés FR/EN sont masquées, même déguisées', () => {
  for (const t of ['connard', 'F.U.C.K', 'fuuuuck', 'c0nn4rd', 'espèce de salope', 'fdp', 'bitch!', 'nique ta mère', 'f u c k', 'SHIT'])
    assert.ok(grossier(t), t);
  assert.equal(filtrer('espèce de connard'), 'espèce de *******');
  assert.equal(filtrer('bitch!'), '*****!');
});
test('filtre : les mots innocents passent', () => {
  for (const t of ['calculer', 'assassin', 'classe', 'Sussex', 'piscine', 'dispute', 'pédestre', 'cockpit', 'grape', 'shiitake', 'computer', 'violet', 'salut 🔥 ça va ?', 'Expédition', 'Dickens', 'bonne chance'])
    assert.ok(!grossier(t), t);
  assert.equal(filtrer('salut 🔥 ça va ?'), 'salut 🔥 ça va ?');
});
test('filtre : pseudos', () => { assert.ok(pseudoOk('Eddy')); assert.ok(!pseudoOk('xXfuckXx')); assert.ok(!pseudoOk('Connard')); });
