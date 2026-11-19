// Les Clans Élémentaires : reliques d'expédition (v59)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as RQ from '../shared/clans/reliques.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { nouveauCombat, jouerCarte, finTour, rejouer } from '../shared/clans/combat.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const def = (reliques) => ({ deck: Array.from({ length: 12 }, (_, i) => ({ id: i % 2 ? 'frappe' : 'garde' })), joueur: { pv: 50, pvMax: 50 }, ennemis: [{ id: 'x', nom: 'X', ico: 'x', pv: 60, intentions: [{ a: 5 }] }, { id: 'y', nom: 'Y', ico: 'y', pv: 60, intentions: [{ a: 5 }] }], graine: 9, reliques });

test('reliques : effets au début du combat et pendant', () => {
  const sans = nouveauCombat(def([]));
  const v = (id) => nouveauCombat(def([id]));
  assert.equal(v('ancre').joueur.bloc, sans.joueur.bloc + 8);
  assert.equal(v('lanterne').energie, sans.energie + 1);
  assert.equal(v('besace').main.length, sans.main.length + 2);
  assert.equal(v('griffe').joueur.force, 1);
  assert.equal(v('ronce').joueur.epines, 3);
  assert.ok(v('braise').ennemis.every((e) => e.brulure === 3));
  assert.ok(v('goutte').ennemis.every((e) => e.trempe === 2));
  assert.equal(v('pierre_lune').joueur.bloc, 3);
  // la pointe : +1 par coup
  const a = nouveauCombat(def([])), b = nouveauCombat(def(['pointe']));
  const i = a.main.findIndex((k) => k.id === 'frappe'), j = b.main.findIndex((k) => k.id === 'frappe');
  jouerCarte(a, i, 'e0'); jouerCarte(b, j, 'e0');
  assert.equal(a.ennemis[0].pv - b.ennemis[0].pv, 1);
  // le sablier : +1 énergie au tour 3
  const s = nouveauCombat(def(['sablier'])); finTour(s); assert.equal(s.energie, 3); finTour(s); assert.equal(s.energie, 4);
  assert.deepEqual(nouveauCombat(def(['nimporte'])).reliques, [], 'une relique inconnue est ignorée');
  // rejoué à l'identique par le serveur
  assert.deepEqual(rejouer(def(['braise', 'pointe']), [['f'], ['f']]).ennemis.map((e) => e.pv), rejouer(def(['braise', 'pointe']), [['f'], ['f']]).ennemis.map((e) => e.pv));
});

test('reliques : trois au choix après un élite, une seule à la fois, pas de doublon', () => {
  const p = P.nouveauProfil('feu', 'Ana', Date.now(), 'mage'); p.paliers.feu = 1;
  X.commencerExpedition(p, 'feu', 1, 1234);
  const x = p.expedition; x.position = '2-0'; x.carte.etages[2][0].type = 'elite'; x.combatEnCours = '2-0';
  const r = X.apresCombat(p, { fini: 'victoire', joueur: { pv: 40 } });
  assert.equal(r.choixRelique.length, 3); assert.equal(new Set(r.choixRelique).size, 3);
  // tant qu'on n'a pas choisi, on n'avance pas
  const suite = X.choixPossibles(x)[0]; assert.equal(X.entrer(p, suite).ok, false);
  assert.equal(ACTIONS.expeRelique(p, { id: 'nimporte' }).ok, false);
  const id = r.choixRelique[0]; assert.ok(ACTIONS.expeRelique(p, { id }).ok);
  assert.deepEqual(x.reliques, [id]); assert.equal(x.choixRelique, null);
  assert.equal(ACTIONS.expeRelique(p, { id }).ok, false, 'plus de choix en attente');
  // elles passent dans les combats de l'expédition
  assert.deepEqual(X.combatDe(p, suite).reliques, [id]);
  // le prochain tirage ne propose pas celle qu'on a
  x.salles++; assert.ok(!RQ.tirerChoix(x).includes(id));
  // passer donne 40 essence
  x.choixRelique = RQ.tirerChoix(x); const e0 = x.butin.essence; assert.ok(X.choisirRelique(p, null).ok); assert.equal(x.butin.essence, e0 + 40);
});

test('reliques : celles de l’expédition (gourde, bourse, fiole, tente) et le trésor', () => {
  const p = P.nouveauProfil('eau', 'Bo', Date.now(), 'mage');
  X.commencerExpedition(p, 'eau', 1, 99); const x = p.expedition;
  RQ.ajouter(x, 'fiole'); assert.equal(x.pvMax, P.pvMax(p) + 10);
  RQ.ajouter(x, 'gourde'); RQ.ajouter(x, 'bourse');
  x.position = '0-0'; x.combatEnCours = '0-0';
  const r = X.apresCombat(p, { fini: 'victoire', joueur: { pv: 20 } });
  assert.equal(x.pv, 25, 'la gourde soigne 5'); assert.equal(r.gain.essence, Math.round(22 * 1 * 1.3));
  // un trésor donne une relique
  const t = P.nouveauProfil('plante', 'Cy', Date.now(), 'mage'); X.commencerExpedition(t, 'plante', 1, 5);
  const xt = t.expedition; xt.carte.etages[0][0].type = 'tresor';
  const rt = X.entrer(t, '0-0'); assert.ok(rt.ok && RQ.valide(rt.relique)); assert.deepEqual(xt.reliques, [rt.relique]);
  // la tente : +50 % au feu de camp
  const u = P.nouveauProfil('feu', 'Dé', Date.now(), 'mage'); X.commencerExpedition(u, 'feu', 1, 5);
  const xu = u.expedition; xu.carte.etages[0][0].type = 'repos'; xu.pv = 10; RQ.ajouter(xu, 'tente');
  assert.equal(X.entrer(u, '0-0').soin, Math.round(xu.pvMax * 0.35 * 1.5));
});
