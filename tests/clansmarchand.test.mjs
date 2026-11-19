// Les Clans Élémentaires : marchand ambulant (v58)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as MA from '../shared/clans/marchand.js';
import * as P from '../shared/clans/profil.js';
import { obstacles, praticable } from '../shared/clans/geo.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const T0 = Date.UTC(2026, 10, 19, 14, 5);
const riche = () => { const p = P.nouveauProfil('feu', 'Ana', T0, 'mage'); Object.assign(p.ress, { essence: 9999, eclats: 999, braises: 999, perles: 999, seve: 999, cristal: 9, perle_noire: 9, graine_or: 9 }); return p; };

test('marchand : ses places sont praticables, il bouge à chaque passage', () => {
  const o = obstacles();
  for (const pl of MA.PLACES) assert.ok(praticable(pl.pos[0], pl.pos[1], o), pl.nom);
  let avant = null;
  for (let k = 0; k < 200; k++) {
    const m = MA.marchandDe(T0 + k * MA.DUREE);
    assert.equal(m.offres.length, 3);
    for (const of of m.offres) { assert.ok(Object.keys(of.donne).length === 1 && Object.keys(of.recoit).length === 1); assert.notDeepEqual(Object.keys(of.donne), Object.keys(of.recoit)); }
    if (avant) assert.notEqual(m.place, avant, 'jamais deux fois de suite au même endroit');
    avant = m.place;
  }
  // même heure → même marchand (le client et le serveur sont d'accord)
  assert.deepEqual(MA.marchandDe(T0), MA.marchandDe(T0 + 60000));
});

test('marchand : acheter une fois par passage, à côté de lui', () => {
  const p = riche(), m = MA.marchandDe(T0), pos = { x: m.x, y: m.y };
  assert.equal(MA.acheter(p, 0, { x: m.x + 400, y: m.y }, T0).ok, false, 'trop loin');
  const avant = { ...p.ress }, r = MA.acheter(p, 0, pos, T0);
  assert.ok(r.ok);
  for (const [k, v] of Object.entries(m.offres[0].donne)) assert.equal(p.ress[k], avant[k] - v);
  for (const [k, v] of Object.entries(m.offres[0].recoit)) assert.equal(p.ress[k], avant[k] + v);
  assert.equal(MA.acheter(p, 0, pos, T0).ok, false, 'une fois par passage');
  assert.ok(MA.acheter(p, 1, pos, T0).ok);
  assert.equal(MA.acheter(p, 5, pos, T0).ok, false);
  // au passage suivant, on peut de nouveau
  const m2 = MA.marchandDe(T0 + MA.DUREE);
  assert.ok(MA.acheter(p, 0, { x: m2.x, y: m2.y }, T0 + MA.DUREE).ok);
  // sans les moyens
  const pauvre = P.nouveauProfil('eau', 'Bo', T0, 'mage'); for (const k of Object.keys(pauvre.ress)) pauvre.ress[k] = 0;
  assert.equal(MA.acheter(pauvre, 0, pos, T0).ok, false);
  assert.equal(ACTIONS.marchandAcheter(riche(), { i: 0 }, {}).ok, false, 'le serveur exige la position');
});
