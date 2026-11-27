// v123 : 12 nouvelles cartes d'élément, 11 mécaniques nouvelles (combat et duel)
import test from 'node:test';
import assert from 'node:assert/strict';
import { CARTES, decrire } from '../shared/clans/cartes.js';
import { nouveauCombat, jouerCarte, finTour } from '../shared/clans/combat.js';
import { nouveauDuel, jouer, finTour as finTourD } from '../shared/clans/duel.js';
import * as P from '../shared/clans/profil.js';

const NOUVELLES = { feu: ['embrasement', 'fournaise', 'mur_flammes', 'cendres_phenix'], eau: ['source_pure', 'retour_flots', 'voile_brume', 'maree_montante'], plante: ['pousse', 'bourgeon', 'racines', 'photosynthese'] };
// un combat où la main commence par la carte voulue
function combat(id, { pv = 80, ennemi = { a: 10 }, pvE = 300 } = {}) {
  const deck = [...Array(19).fill({ id: 'garde', niv: 1 }), { id, niv: 1 }];
  const c = nouveauCombat({ deck, joueur: { pv, pvMax: 80 }, ennemis: [{ id: 'x', nom: 'X', ico: 'x', pv: pvE, intentions: [ennemi] }], graine: 1 });
  const i = c.main.findIndex((k) => k.id === id); if (i < 0) { c.main.unshift({ uid: 'z', id, niv: 1 }); return [c, 0]; }
  return [c, i];
}

test('12 nouvelles cartes : 4 par élément, chacune de son clan, avec un texte', () => {
  for (const [el, l] of Object.entries(NOUVELLES)) for (const id of l) { assert.equal(CARTES[id]?.element, el, id); assert.ok(decrire(id).length > 5, id); }
  assert.equal(CARTES.reflux.effets.reduction, 1, 'l’ancien Reflux est intact');
});

test('feu : Embrasement double la brûlure, Fournaise brûle son lanceur, Aura ardente, Renaissance', () => {
  let [c, i] = combat('embrasement'); c.ennemis[0].brulure = 5; c.energie = 9; jouerCarte(c, i); assert.equal(c.ennemis[0].brulure, 10);
  [c, i] = combat('fournaise'); const e0 = c.energie; jouerCarte(c, i); assert.equal(c.energie, e0 + 2); assert.equal(c.joueur.brulure, 3);
  [c, i] = combat('mur_flammes'); jouerCarte(c, i); finTour(c); assert.equal(c.ennemis[0].brulure >= 3, true, 'l’attaquant prend feu');
  [c, i] = combat('cendres_phenix', { pv: 5, ennemi: { a: 40 } }); jouerCarte(c, i); finTour(c);
  assert.notEqual(c.fini, 'defaite'); assert.equal(c.joueur.pv, 30); assert.equal(c.joueur.renaissance, 0);
});

test('eau : Source pure lave, Retour des flots reprend une carte, Esquive, Marée montante', () => {
  let [c, i] = combat('source_pure'); Object.assign(c.joueur, { brulure: 4, trempe: 2, affaibli: 2, marque: 1 }); jouerCarte(c, i);
  assert.deepEqual([c.joueur.brulure, c.joueur.trempe, c.joueur.affaibli, c.joueur.marque], [0, 0, 0, 0]);
  [c, i] = combat('retour_flots'); c.defausse.push({ uid: 'q', id: 'flamme', niv: 1 }); jouerCarte(c, i); assert.ok(c.main.some((k) => k.id === 'flamme'));
  [c, i] = combat('voile_brume', { ennemi: { a: 30 } }); const pv0 = c.joueur.pv; jouerCarte(c, i); finTour(c); assert.equal(c.joueur.pv, pv0, 'le coup est esquivé');
  [c, i] = combat('maree_montante'); c.energie = 9; const n = c.main.length - 1; jouerCarte(c, i); assert.equal(300 - c.ennemis[0].pv, 6 + 3 * n);
});

test('plante : Pousse grandit, Bourgeon éclot, Racines, Photosynthèse', () => {
  let [c, i] = combat('pousse'); const k = c.main[i]; c.energie = 9; jouerCarte(c, i); assert.equal(300 - c.ennemis[0].pv, 5); assert.equal(k.pousse, 3);
  c.main.push(k); c.defausse = c.defausse.filter((x) => x !== k); jouerCarte(c, c.main.length - 1); assert.equal(300 - c.ennemis[0].pv, 5 + 8);
  [c, i] = combat('bourgeon', { pv: 40, ennemi: { d: 1 } }); jouerCarte(c, i); finTour(c); assert.equal(c.joueur.pv, 52);
  [c, i] = combat('racines'); c.joueur.regen = 3; jouerCarte(c, i); assert.ok(c.joueur.bloc >= 15);
  [c, i] = combat('photosynthese', { ennemi: { d: 1 } }); jouerCarte(c, i); finTour(c); assert.equal(c.energie, c.energieMax + 3);
});

test('en duel aussi : esquive, renaissance, embrasement', () => {
  const deck = (id) => [...Array(19).fill({ id: 'frappe', niv: 1 }), { id, niv: 1 }];
  const d = nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 100, deck: deck('cendres_phenix') }, { nom: 'B', clan: 'eau', classe: 'mage', pvMax: 100, deck: deck('voile_brume') }, 5);
  const a = d.j[0], b = d.j[1];
  a.renaissance = 30; a.pv = 1; a.brulure = 5; d.actif = 1; finTourD(d, 1);
  assert.equal(a.pv, 30, 'A renaît'); assert.ok(!d.fini);
  b.esquive = 1; const pvB = b.pv; d.actif = 0; a.energie = 9; a.main.unshift({ uid: 'f', id: 'flamme', niv: 1 }); jouer(d, 0, 0); assert.equal(b.pv, pvB, 'B esquive');
  b.brulure = 4; a.main.unshift({ uid: 'e', id: 'embrasement', niv: 1 }); jouer(d, 0, 0); assert.equal(b.brulure, 8);
});

test('les nouvelles cartes sortent aux tirages du bon clan', () => {
  const p = P.nouveauProfil('plante', 'T', 0, 'mage');
  for (let i = 0; i < 300; i++) { p.ress.essence = 1e7; P.tirer(p, 10, i + 7); }
  assert.ok(NOUVELLES.plante.some((id) => p.collection[id]), 'au moins une nouvelle carte Plante');
  assert.ok(![...NOUVELLES.feu, ...NOUVELLES.eau].some((id) => p.collection[id]));
});
