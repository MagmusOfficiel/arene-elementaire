// v75 : les salles mystère
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import * as MY from '../shared/clans/mystere.js';
import { ACTIONS } from '../server/src/clansProfils.js';

test('des salles mystère apparaissent, jamais au premier étage', () => {
  let n = 0;
  for (let g = 1; g < 60; g++) { const c = X.genererCarte(g * 7919); for (const et of c.etages) for (const s of et) if (s.type === 'mystere') { n++; assert.ok(s.etage >= 1 && s.etage < X.ETAGES - 1); } }
  assert.ok(n > 30, `${n} salles mystère sur 60 cartes`);
});

test('entrer dans une salle mystère : un choix qui bloque la carte, puis son effet', () => {
  for (const evt of MY.LISTE) {
    const p = P.nouveauProfil('feu', 'M', 0, 'mage');
    for (let g = 1; g < 5000; g++) {
      P.completer(p); p.expedition = null;
      X.commencerExpedition(p, 'feu', 1, g);
      const x = p.expedition, id = x.carte.etages.flat().find((s) => s.type === 'mystere' && MY.evenementDe(x, s.id) === evt)?.id;
      if (!id) continue;
      // on y va directement (on place le joueur juste avant)
      x.position = x.carte.etages[+id.split('-')[0] - 1].find((s) => s.vers.includes(id)).id;
      x.butin.essence = 200;
      const r = ACTIONS.expeEntrer(p, { salle: id });
      assert.ok(r.ok && r.res.type === 'mystere', evt); assert.equal(r.res.mystere.evt, evt);
      assert.deepEqual(X.choixPossibles(x), [], 'la carte attend la réponse');
      assert.equal(ACTIONS.expeEntrer(p, { salle: x.carte.etages[+id.split('-')[0] + 1][0].id }).ok, false);
      const dernier = r.res.mystere.choix.length - 1;
      const c = ACTIONS.expeMystere(p, { i: 0 });
      assert.ok(c.ok, `${evt} : ${c.raison}`); assert.ok(c.res.issue.length > 3);
      assert.equal(x.mystere, null); assert.ok(X.choixPossibles(x).length > 0);
      assert.ok(x.pv >= 1 && x.pv <= x.pvMax);
      assert.equal(ACTIONS.expeMystere(p, { i: dernier }).ok, false, 'une seule réponse');
      break;
    }
  }
});

test('un choix trop cher est refusé (le marchand louche sans butin)', () => {
  const x = { graine: 1, pv: 50, pvMax: 60, palier: 1, territoire: 'feu', butin: { essence: 10, mat: 0 }, reliques: [], salles: 3, mystere: { evt: 'louche', salle: '2-1' } };
  const v = MY.vue(x); assert.equal(v.choix[0].ok, false); assert.equal(v.choix[2].ok, true);
  assert.equal(MY.choisir(x, 0).ok, false); assert.ok(MY.choisir(x, 2).ok);
});
