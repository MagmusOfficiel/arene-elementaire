// v76 : les quêtes des habitants
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as Q from '../shared/clans/quetes.js';
import * as QP from '../shared/clans/quetesPnj.js';
import * as HF from '../shared/clans/hautsfaits.js';
import { PNJ, PNJ_PAR_ID, posPnj } from '../shared/clans/pnj.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const pres = (id) => { const q = posPnj(PNJ_PAR_ID[id], Date.now() / 1000); return { pos: { x: q.x, y: q.y } }; };

test('chaque habitant a une quête', () => {
  for (const n of PNJ) assert.ok(QP.valide(n.id), n.id);
  for (const c of ['feu', 'eau', 'plante']) assert.deepEqual(QP.PAR_CLAN[c].sort(), PNJ.filter((n) => n.clan === c).map((n) => n.id).sort());
});

test('accepter, avancer avec les événements, rendre ; il faut être près de l’habitant', () => {
  const p = P.nouveauProfil('feu', 'Q', 0, 'mage');
  assert.match(ACTIONS.pnjAccepter(p, { id: 'ronce' }, { pos: { x: 0, y: 0 } }).raison, /Approche/);
  assert.ok(ACTIONS.pnjAccepter(p, { id: 'ronce' }, pres('ronce')).ok);
  assert.equal(ACTIONS.pnjAccepter(p, { id: 'ronce' }, pres('ronce')).ok, false, 'pas deux fois');
  assert.equal(QP.etat(p, 'ronce'), 'cours');
  Q.evenement(p, 'tirage', 5); assert.equal(QP.progres(p, 'ronce').n, 0, 'pas le bon événement');
  Q.evenement(p, 'victoire', 1, { terr: 'feu', type: 'combat' }); assert.equal(QP.progres(p, 'ronce').n, 1);
  assert.match(ACTIONS.pnjRendre(p, { id: 'ronce' }, pres('ronce')).raison, /pas encore/);
  Q.evenement(p, 'victoire', 20, { terr: 'eau', type: 'combat' });
  assert.equal(QP.etat(p, 'ronce'), 'prete');
  const e = p.ress.essence, r = ACTIONS.pnjRendre(p, { id: 'ronce' }, pres('ronce'));
  assert.ok(r.ok); assert.equal(p.ress.essence, e + 300); assert.equal(QP.etat(p, 'ronce'), 'faite');
  assert.equal(ACTIONS.pnjRendre(p, { id: 'ronce' }, pres('ronce')).ok, false, 'payé une seule fois');
  // une quête avec un filtre : le boss du bon territoire seulement
  ACTIONS.pnjAccepter(p, { id: 'faune' }, pres('faune'));
  Q.evenement(p, 'victoire', 1, { terr: 'feu', type: 'boss' }); assert.equal(QP.etat(p, 'faune'), 'cours');
  Q.evenement(p, 'victoire', 1, { terr: 'plante', type: 'boss' }); assert.equal(QP.etat(p, 'faune'), 'prete');
});

test('apporter des ressources, et le titre « Ami du village »', () => {
  const p = P.nouveauProfil('eau', 'Q', 0, 'tireur');
  ACTIONS.pnjAccepter(p, { id: 'loupiot' }, pres('loupiot'));
  p.ress.perles = 10; assert.equal(QP.etat(p, 'loupiot'), 'cours');
  p.ress.perles = 45; assert.equal(QP.etat(p, 'loupiot'), 'prete');
  assert.ok(ACTIONS.pnjRendre(p, { id: 'loupiot' }, pres('loupiot')).ok); assert.equal(p.ress.perles, 15);
  assert.equal(HF.titreValide(p, 'vil:eau'), false);
  for (const id of QP.PAR_CLAN.eau) p.pnjQ[id] = { n: 0, fait: true };
  assert.ok(HF.titreValide(p, 'vil:eau')); assert.equal(HF.nomTitre('vil:eau'), 'Ami des Lagons d’Azur');
  assert.ok(ACTIONS.titreChoisir(p, { t: 'vil:eau' }).ok);
});
