// v93 : cadeau de connexion, quêtes de la Tour, amis
import test from 'node:test';
import assert from 'node:assert/strict';
import * as CX from '../shared/clans/connexion.js';
import * as P from '../shared/clans/profil.js';
import * as Q from '../shared/clans/quetes.js';

const J = (j) => Date.parse(`2026-11-${String(j).padStart(2, '0')}T10:00:00Z`);
test('le cadeau du jour : un par jour, cycle de 7, un jour raté et on repart au jour 1', () => {
  const p = P.nouveauProfil('feu', 'T', 0, 'mage'), e0 = p.ress.essence;
  assert.ok(CX.etat(p, J(1)).dispo);
  assert.equal(CX.reclamer(p, J(1)).res.n, 1); assert.equal(p.ress.essence, e0 + 300);
  assert.equal(CX.reclamer(p, J(1)).ok, false, 'une fois par jour');
  for (let j = 2; j <= 7; j++) assert.equal(CX.reclamer(p, J(j)).res.n, j);
  assert.ok(p.ress.cristal >= 10, 'le coffre du 7e jour (ressource rare du clan)');
  assert.equal(CX.reclamer(p, J(8)).res.n, 1, 'le cycle recommence');
  assert.equal(CX.reclamer(p, J(9)).res.n, 2);
  const e = CX.etat(p, J(11)); assert.ok(e.dispo && e.n === 1 && e.rompu, 'un jour raté : retour au jour 1');
});
test('les quêtes de la Tour n’arrivent qu’à partir du niveau 10', () => {
  for (let k = 0; k < 40; k++) {
    const p = P.nouveauProfil('eau', `N${k}`, k, 'tireur');
    const e = Q.etat(p, J(3));
    assert.ok(![...e.j, ...e.s].some((q) => q.id.startsWith('tour')));
  }
  let vu = false;
  for (let k = 0; k < 60 && !vu; k++) { const p = P.nouveauProfil('eau', `H${k}`, k, 'tireur'); p.stats.victoires = 500; const e = Q.etat(p, J(3)); vu = [...e.j, ...e.s].some((q) => q.id.startsWith('tour')); }
  assert.ok(vu, 'un joueur de haut niveau peut les recevoir');
});
test('la liste d’amis est nettoyée au chargement', () => {
  const p = P.nouveauProfil('feu', 'T', 0, 'mage');
  p.amis = [{ pid: 'abc', nom: 'Ana' }, { pid: 3 }, null, ...Array.from({ length: 40 }, (_, i) => ({ pid: `x${i}`, nom: `X${i}` }))];
  P.completer(p);
  assert.equal(p.amis.length, 30); assert.deepEqual(p.amis[0], { pid: 'abc', nom: 'Ana' });
});
