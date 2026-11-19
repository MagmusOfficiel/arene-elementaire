// v69 : l'Ascension (niveau 20, épreuve, choix de branche) et les sorts de branche
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as AS from '../shared/clans/ascension.js';
import * as C from '../shared/clans/combat.js';
import * as D from '../shared/clans/duel.js';
import { BRANCHES, CARTES, NIV_ASCENSION, branchesDe, decrire } from '../shared/clans/cartes.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const profil = (classe = 'mage') => { const p = P.nouveauProfil('feu', 'Asc', 0, classe); p.stats.victoires = (NIV_ASCENSION - 1) * 6; return p; };

test('8 branches, 2 par classe, 6 sorts chacune avec un texte', () => {
  assert.equal(Object.keys(BRANCHES).length, 8);
  for (const cl of ['combattant', 'mage', 'tireur', 'escrimeur']) assert.equal(branchesDe(cl).length, 2);
  for (const b of Object.keys(BRANCHES)) {
    const l = Object.values(CARTES).filter((c) => c.branche === b);
    assert.equal(l.length, 6, b);
    for (const c of l) { assert.equal(c.classe, BRANCHES[b].classe); assert.ok(decrire(c.id).length > 5, c.id); }
  }
});

test('niveau 20 requis, épreuve rejouée par le serveur, puis choix de la branche de sa classe', () => {
  const p = profil('mage'); p.stats.victoires = 0;
  assert.equal(ACTIONS.ascensionDebut(p).ok, false);
  p.stats.victoires = (NIV_ASCENSION - 1) * 6;
  assert.equal(AS.etat(p), 'epreuve');
  const r = ACTIONS.ascensionDebut(p); assert.ok(r.ok);
  assert.equal(ACTIONS.ascensionChoisir(p, { b: 'archimage' }).ok, false, 'pas avant d’avoir réussi');
  // une défaite : rien de débloqué
  assert.equal(ACTIONS.ascensionCombat(p, { coups: Array(60).fill(['f']) }).res.victoire, false);
  // une victoire (on affaiblit la gardienne pour le test)
  const pv = AS.GARDIEN.pv; AS.GARDIEN.pv = 1;
  ACTIONS.ascensionDebut(p);
  const c = C.nouveauCombat(AS.defEpreuve(p)); const coups = [];
  for (let i = 0; i < 30 && !c.fini; i++) { const k = c.main.findIndex((_, j) => C.jouable(c, j) && CARTES[c.main[j].id].type === 'attaque'); if (k >= 0) { coups.push(['j', k, 'e0']); C.jouerCarte(c, k, 'e0'); } else { coups.push(['f']); C.finTour(c); } }
  const v = ACTIONS.ascensionCombat(p, { coups }); AS.GARDIEN.pv = pv;
  assert.equal(v.res.victoire, true);
  assert.equal(ACTIONS.ascensionChoisir(p, { b: 'gardien' }).ok, false, 'pas une branche du Mage');
  assert.ok(ACTIONS.ascensionChoisir(p, { b: 'archimage' }).ok);
  assert.equal(p.branche, 'archimage'); assert.equal(AS.etat(p), 'fait');
  assert.equal(ACTIONS.ascensionChoisir(p, { b: 'invocateur' }).ok, false, 'définitif');
});

test('les sorts de branche : seulement à l’autel, seulement pour sa branche', () => {
  const sans = profil('tireur'); sans.ress.essence = 1e7;
  for (let i = 0; i < 40; i++) P.tirer(sans, 10, 50 + i);
  assert.ok(Object.keys(sans.collection).every((id) => !CARTES[id].branche), 'pas de branche → aucun sort de branche');
  const p = profil('tireur'); p.branche = 'sniper'; p.ress.essence = 1e7;
  for (let i = 0; i < 60; i++) P.tirer(p, 10, 900 + i);
  const ids = Object.keys(p.collection).filter((id) => CARTES[id].branche);
  assert.ok(ids.length > 0 && ids.every((id) => CARTES[id].branche === 'sniper'));
  const autre = Object.values(CARTES).find((c) => c.branche === 'artificier').id;
  p.collection[autre] = { n: 1, niv: 1 };
  assert.match(P.ajouterAuDeck(p, autre).raison, /branche Artificier/);
});

test('les talents de branche en combat et en duel', () => {
  const ennemi = { id: 'x', nom: 'Cible', ico: 'x', pv: 500, intentions: [{}] };
  const deck = Array(10).fill({ id: 'frappe' });
  // Égide : 10 de bouclier au départ
  assert.equal(C.nouveauCombat({ deck, joueur: { pv: 80, pvMax: 80 }, ennemis: [ennemi], classe: 'combattant', branche: 'gardien' }).joueur.bloc, 10);
  // une branche d'une autre classe est ignorée
  assert.equal(C.nouveauCombat({ deck, joueur: { pv: 80, pvMax: 80 }, ennemis: [ennemi], classe: 'mage', branche: 'gardien' }).branche, null);
  // Œil de lynx : visée une attaque sur deux
  const s = C.nouveauCombat({ deck, joueur: { pv: 80, pvMax: 80 }, ennemis: [ennemi], classe: 'tireur', branche: 'sniper' });
  assert.equal(C.periodeVisee(s), 2);
  // Esprit lié : l'allié frappe au début du tour suivant
  const i = C.nouveauCombat({ deck, joueur: { pv: 80, pvMax: 80 }, ennemis: [ennemi], classe: 'mage', branche: 'invocateur' });
  const avant = i.ennemis[0].pv; C.finTour(i); assert.equal(i.ennemis[0].pv, avant - 3);
  // Furie : +1 dégât par tranche de 8 PV manquants
  const b = C.nouveauCombat({ deck, joueur: { pv: 40, pvMax: 80 }, ennemis: [ennemi], classe: 'combattant', branche: 'berserker' });
  const pv0 = b.ennemis[0].pv; C.jouerCarte(b, 0, 'e0'); assert.equal(pv0 - b.ennemis[0].pv, 6 + 5);
  // en duel aussi
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'combattant', branche: 'gardien', pvMax: 80, deck }, { nom: 'B', clan: 'eau', classe: 'mage', branche: 'invocateur', pvMax: 60, deck }, 3);
  assert.equal(d.j[0].branche, 'gardien'); assert.equal(d.j[1].appel, 3);
});
