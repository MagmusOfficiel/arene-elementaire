// v70 : les montures et le changement de pseudo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as MT from '../shared/clans/montures.js';
import { ACTIONS } from '../server/src/clansProfils.js';
import { maisonDe } from '../shared/clans/geo.js';

const riche = () => { const p = P.nouveauProfil('eau', 'Cavalier', 0, 'tireur'); Object.assign(p.ress, { essence: 50000, braises: 500, perles: 500, seve: 500, cristal: 40, perle_noire: 40, graine_or: 40 }); return p; };

test('acheter, monter, descendre, changer de monture', () => {
  const p = riche();
  assert.equal(MT.actif(p), null); assert.equal(MT.vitesse(MT.actif(p)), 1);
  assert.ok(ACTIONS.montureAcheter(p, { id: 'poney' }).ok);
  assert.equal(MT.actif(p), 'poney'); assert.equal(p.ress.essence, 50000 - 1500);
  assert.equal(ACTIONS.montureAcheter(p, { id: 'poney' }).ok, false, 'pas deux fois');
  assert.match(ACTIONS.montureAcheter(p, { id: 'dragon' }).raison, /niveau 15/);
  assert.match(ACTIONS.montureAcheter(p, { id: 'raie' }).raison, /niveau 8/);
  p.stats.victoires = P.xpPourNiveau(21);
  assert.ok(ACTIONS.montureAcheter(p, { id: 'dragon' }).ok);
  assert.equal(MT.vitesse(MT.actif(p)), 1.6);
  assert.ok(ACTIONS.montureChoisir(p, { id: 'poney' }).ok); assert.equal(MT.actif(p), 'poney');
  assert.ok(ACTIONS.montureChoisir(p, { id: null }).ok); assert.equal(MT.actif(p), null);
  assert.equal(ACTIONS.montureChoisir(p, { id: 'cerf' }).ok, false, 'pas achetée');
  const pauvre = P.nouveauProfil('feu', 'X', 0, 'mage');
  assert.match(ACTIONS.montureAcheter(pauvre, { id: 'poney' }).raison, /insuffisantes/);
});

test('changer de pseudo sans perdre son compte ni sa maison', () => {
  const p = riche(); p.ress.essence = 1234; const maison = maisonDe(p.clan, p.nom);
  assert.equal(ACTIONS.renommer(p, { nom: 'A' }).ok, false, 'trop court');
  assert.equal(ACTIONS.renommer(p, { nom: 'Cavalier' }).ok, false, 'le même');
  const r = ACTIONS.renommer(p, { nom: '  Nouveau <b>Nom</b> ' });
  assert.ok(r.ok); assert.equal(p.nom, 'Nouveau bNom/b');
  assert.equal(p.ress.essence, 1234, 'rien ne change à part le nom');
  assert.deepEqual(maisonDe(p.clan, p.maison || p.nom), maison, 'la maison ne bouge pas');
  assert.match(ACTIONS.renommer(p, { nom: 'Encore' }).raison, /24 h/);
  p.renomme -= 25 * 3600000;
  assert.ok(ACTIONS.renommer(p, { nom: 'Encore' }).ok);
  assert.deepEqual(maisonDe(p.clan, p.maison || p.nom), maison, 'toujours la même maison');
});
