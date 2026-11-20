import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as GR from '../shared/clans/grimoire.js';
import * as HF from '../shared/clans/hautsfaits.js';
import { MONSTRES, tousDe, variante } from '../shared/clans/monstres.js';
import * as C from '../shared/clans/combat.js';

test('13 monstres par terre, ids uniques, deux versions du boss selon la graine', () => {
  const ids = ['feu', 'eau', 'plante'].flatMap((t) => tousDe(t).map((m) => m.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const t of ['feu', 'eau', 'plante']) {
    assert.equal(GR.monstresDe(t).length, 13);
    const vus = new Set([1, 2, 3, 4].map((g) => variante(t, 'boss', g).id));
    assert.deepEqual([...vus].sort(), [MONSTRES[t].boss.id, MONSTRES[t].autres.boss.id].sort());
  }
});
test('soin et bouclier de groupe des monstres', () => {
  const chaman = MONSTRES.feu.normaux.find((m) => m.id === 'chaman_braise'), golem = MONSTRES.feu.normaux.find((m) => m.id === 'golem_cendre');
  const c = C.nouveauCombat({ deck: Array(10).fill({ id: 'frappe' }), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ ...chaman, intentions: [{ g: 5 }] }, golem], graine: 2 });
  C.finTour(c);
  assert.ok(c.ennemis.every((e) => e.bloc >= 5));
  const d = C.nouveauCombat({ deck: Array(10).fill({ id: 'frappe' }), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ ...chaman, intentions: [{ s: 7 }] }, golem], graine: 2 });
  d.ennemis[1].pv -= 10; C.finTour(d);
  assert.equal(d.ennemis[1].pv, d.ennemis[1].pvMax - 3);
  assert.deepEqual(C.decrireIntention(d, { ...d.ennemis[0], i: 0 }).map((x) => x.type), ['soin']);
});
test('bestiaire, récompenses et titre', () => {
  const p = P.nouveauProfil('feu', 'Test', Date.now(), 'combattant');
  assert.equal(GR.aReclamer(p), 0);
  GR.vaincre(p, GR.monstresDe('feu').slice(0, 7).map((m) => m.id).concat(['inconnu']));
  assert.equal(Object.keys(GR.vaincus(p)).length, 7);
  assert.ok(GR.reclamer(p, 'b-feu-1').ok);
  assert.equal(GR.reclamer(p, 'b-feu-1').ok, false);
  assert.equal(GR.reclamer(p, 'b-feu-2').ok, false);
  GR.vaincre(p, GR.TOUS_MONSTRES.map((m) => m.id));
  const av = p.ress.graine_or || 0;
  assert.ok(GR.reclamer(p, 'b-eau-2').ok && (p.ress.perle_noire || 0) === 6 && (p.ress.graine_or || 0) === av);
  assert.equal(HF.titreValide(p, 'gri:bestiaire'), false);
  assert.ok(GR.reclamer(p, 'b-tout').ok);
  assert.ok(HF.titreValide(p, 'gri:bestiaire'));
  assert.equal(HF.nomTitre('gri:bestiaire'), 'Savant des bêtes');
  // les cartes : seulement celles de sa classe
  assert.ok(GR.cartesDe(p).every((id) => P.pourClasse(id, 'combattant')));
});
