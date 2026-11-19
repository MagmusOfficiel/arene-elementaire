// Les Clans Élémentaires : familiers (v53)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../shared/clans/familiers.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { nouveauCombat, rejouer, alea } from '../shared/clans/combat.js';
import { ACTIONS } from '../server/src/clansProfils.js';
import { TERRITOIRES } from '../shared/clans/monstres.js';

const profil = (clan = 'feu') => { const p = P.nouveauProfil(clan, 'Ana', Date.now(), 'mage'); p.ress.essence = 10000; p.ress.cristal = 20; p.ress.perle_noire = 20; p.ress.graine_or = 20; return p; };
const def = (familier) => ({ deck: P.deckCombat(profil()), joueur: { pv: 50, pvMax: 50 }, ennemis: [{ id: 'x', nom: 'X', ico: 'x', pv: 30, intentions: [{ a: 6 }] }, { id: 'y', nom: 'Y', ico: 'y', pv: 30, intentions: [{ a: 6 }] }], graine: 42, classe: 'mage', familier });

test('familiers : 6, deux par territoire, chacun avec un effet', () => {
  assert.equal(F.IDS.length, 6);
  for (const t of ['feu', 'eau', 'plante']) assert.equal(F.IDS.filter((id) => F.FAMILIERS[id].terr === t).length, 2);
  for (const id of F.IDS) assert.ok(Object.keys(F.FAMILIERS[id].effet).length === 1 && F.FAMILIERS[id].desc);
});

test('familiers : l’effet au début du combat, et rien sans familier', () => {
  const sans = nouveauCombat(def(null));
  const v = (id) => nouveauCombat(def(id));
  assert.ok(v('salamandre').ennemis.every((e) => e.brulure === 2) && sans.ennemis.every((e) => e.brulure === 0));
  assert.equal(v('braisillon').energie, sans.energie + 1);
  assert.equal(v('tortue').joueur.bloc, sans.joueur.bloc + 5);
  assert.equal(v('loutre').main.length, sans.main.length + 1);
  assert.equal(v('pousse').joueur.regen, 3);
  assert.ok(v('luciole').ennemis.every((e) => e.affaibli === 1));
  assert.equal(nouveauCombat(def('nimporte')).familier, null, 'un familier inconnu ne fait rien');
  // le serveur rejoue pareil : même combat, mêmes coups → même résultat
  const coups = [['f'], ['f'], ['f']];
  assert.deepEqual(rejouer(def('salamandre'), coups).ennemis.map((e) => e.pv), rejouer(def('salamandre'), coups).ennemis.map((e) => e.pv));
});

test('familiers : fabriquer, choisir, renvoyer', () => {
  const p = profil();
  assert.equal(F.actif(p), null);
  assert.equal(ACTIONS.familierFabriquer(p, { id: 'zzz' }).ok, false);
  assert.ok(ACTIONS.familierFabriquer(p, { id: 'tortue' }).ok);
  assert.equal(p.ress.perle_noire, 14); assert.equal(p.ress.essence, 8800); assert.equal(F.actif(p), 'tortue', 'le premier familier suit tout de suite');
  assert.equal(ACTIONS.familierFabriquer(p, { id: 'tortue' }).ok, false, 'pas deux fois le même');
  p.ress.graine_or = 2; assert.equal(ACTIONS.familierFabriquer(p, { id: 'pousse' }).ok, false, 'pas assez de graines d’or');
  assert.ok(ACTIONS.familierFabriquer(p, { id: 'salamandre' }).ok); assert.equal(F.actif(p), 'tortue');
  assert.ok(ACTIONS.familierChoisir(p, { id: 'salamandre' }).ok); assert.equal(F.actif(p), 'salamandre');
  assert.equal(ACTIONS.familierChoisir(p, { id: 'loutre' }).ok, false);
  assert.ok(ACTIONS.familierChoisir(p, { id: null }).ok); assert.equal(F.actif(p), null);
});

test('familiers : trouvés sur les boss, fixés au départ de l’expédition', () => {
  const p = profil('eau');
  let n = 0; for (let g = 0; g < 400; g++) { const q = profil('eau'); if (F.butinBoss(q, 'eau', 1, alea(g))) n++; }
  assert.ok(n > 80 && n < 160, `environ 30 % au palier I (${n}/400)`);
  // on ne trouve que ceux qu'on n'a pas, du bon territoire
  for (let g = 0; g < 50; g++) F.butinBoss(p, 'eau', 4, alea(g));
  assert.deepEqual(F.possedes(p).sort(), ['loutre', 'tortue']);
  assert.equal(F.butinBoss(p, 'eau', 4, alea(1)), null);
  // l'expédition garde le familier du départ, et ses combats aussi
  F.choisir(p, 'loutre'); X.commencerExpedition(p, 'eau', 1, 7);
  assert.equal(p.expedition.familier, 'loutre');
  F.choisir(p, 'tortue');
  const id = X.choixPossibles(p.expedition)[0]; X.entrer(p, id);
  if (p.expedition.combatEnCours) assert.equal(X.combatDe(p, id).familier, 'loutre');
  assert.ok(TERRITOIRES.eau);
});
