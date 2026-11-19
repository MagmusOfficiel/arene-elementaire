// Les Clans Élémentaires : hauts faits et titres (v60)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as HF from '../shared/clans/hautsfaits.js';
import * as P from '../shared/clans/profil.js';
import * as A from '../shared/clans/arene.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const profil = () => P.nouveauProfil('feu', 'Ana', Date.now(), 'mage');

test('hauts faits : trois paliers, calculés sur le profil', () => {
  const p = profil();
  assert.equal(HF.total(p), 0); assert.equal(HF.IDS.length * 3, HF.MAX);
  p.stats.victoires = 150; p.stats.boss = 1; p.duels.gagnes = 100;
  assert.equal(HF.palierDe(p, 'victoires'), 2); assert.equal(HF.palierDe(p, 'boss'), 1); assert.equal(HF.palierDe(p, 'duels'), 3);
  assert.equal(HF.total(p), 6);
  assert.deepEqual([...HF.obtenus(p)].sort(), ['boss:1', 'duels:1', 'duels:2', 'duels:3', 'victoires:1', 'victoires:2']);
  for (const id of HF.IDS) { const h = HF.HAUTS_FAITS[id]; assert.equal(h.n.length, 3); assert.equal(h.titres.length, 3); assert.ok(h.n[0] < h.n[1] && h.n[1] < h.n[2]); }
});

test('hauts faits : le record d’arène survit aux saisons', () => {
  const p = profil(); p.arene = A.nouvelleArene();
  p.arene.elo = 1390; A.resultat(p, 1400, 'victoire', false, '2026-11-19');
  assert.ok(p.stats.areneMax >= 1400); assert.equal(HF.palierDe(p, 'arene'), 2);
  p.arene = A.nouvelleArene(); assert.equal(HF.palierDe(p, 'arene'), 2, 'nouvelle saison : le palier reste');
});

test('titres : seulement ceux débloqués, affichables et retirables', () => {
  const p = profil(); p.stats.boss = 12;
  assert.equal(ACTIONS.titreChoisir(p, { t: 'boss:3' }).ok, false);
  assert.equal(ACTIONS.titreChoisir(p, { t: 'nimporte:1' }).ok, false);
  assert.ok(ACTIONS.titreChoisir(p, { t: 'boss:2' }).ok); assert.equal(HF.titreDe(p), 'boss:2'); assert.equal(HF.nomTitre('boss:2'), 'Fléau des boss');
  assert.ok(ACTIONS.titreChoisir(p, { t: null }).ok); assert.equal(HF.titreDe(p), '');
  p.titre = 'cauchemar:3'; assert.equal(HF.titreDe(p), '', 'un titre non mérité n’est pas affiché');
});
