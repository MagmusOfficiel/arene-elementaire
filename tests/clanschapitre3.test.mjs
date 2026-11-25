// v96 : Chapitre 3 — les Cimes Orageuses, l'étourdissement, la paralysie, l'histoire, les montures
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../shared/clans/combat.js';
import * as D from '../shared/clans/duel.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import * as QP from '../shared/clans/quetesPnj.js';
import * as G from '../shared/clans/geo.js';
import * as MO from '../shared/clans/montures.js';
import * as HF from '../shared/clans/hautsfaits.js';
import { MONSTRES, TERRITOIRES, tousDe, BOSS_CAUCHEMAR } from '../shared/clans/monstres.js';
import { BOSS_MONDIAUX } from '../shared/clans/mondial.js';
import { CARTES } from '../shared/clans/cartes.js';

const deck = (ids) => ids.map((id) => ({ id, niv: 1 }));
const haut = (p, n) => { p.stats.victoires = P.xpPourNiveau(n); return p; };
const fini = (p, ids) => { p.pnjQ ||= {}; for (const id of ids) p.pnjQ[id] = { fait: true }; };

test('la région : à l’est, niveau 50, 14 monstres + titan + boss mondial', () => {
  assert.equal(G.MONDE.l, 4000); assert.equal(TERRITOIRES.cimes.niv, 50);
  assert.ok(G.dansCimes(3640, 1100) && !G.dansCimes(2568, 1544) && !G.dansFaille(3640, 2600));
  assert.equal(G.territoireDe(3640, 1100), null);
  assert.equal(tousDe('cimes').length, 14); assert.ok(BOSS_CAUCHEMAR.cimes && BOSS_MONDIAUX.cimes);
  assert.ok(MONSTRES.cimes.boss.pv > MONSTRES.brisees.boss.pv, 'plus dur que la Faille');
  const p = P.nouveauProfil('feu', 'T', 0); haut(p, 45);
  assert.equal(X.commencerExpedition(p, 'cimes', 1, 3).ok, false);
  haut(p, 50); assert.ok(X.commencerExpedition(p, 'cimes', 1, 3).ok);
  assert.equal(P.niveau({ stats: { victoires: 1e6 } }), 100);
});
test('étourdir : le monstre perd son action ; paralysie : une énergie de moins', () => {
  const c = C.nouveauCombat({ deck: deck(Array(10).fill('oeil_tempete')), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 'm', nom: 'm', ico: 'x', pv: 50, intentions: [{ a: 10 }] }], graine: 2 });
  assert.ok(C.jouerCarte(c, 0, 'e0')); assert.equal(c.ennemis[0].etourdi, 1);
  const pv = c.joueur.pv; C.finTour(c); assert.equal(c.joueur.pv, pv, 'étourdi : pas d’attaque');
  C.finTour(c); assert.ok(c.joueur.pv < pv, 'le tour d’après, il frappe');
  const c2 = C.nouveauCombat({ deck: deck(Array(10).fill('frappe')), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 'h', nom: 'h', ico: 'x', pv: 50, intentions: [{ a: 1, p: 1 }] }], graine: 2 });
  assert.equal(c2.energie, 3); C.finTour(c2); assert.equal(c2.energie, 2, 'paralysé : 2 énergies au lieu de 3');
  for (const id of ['chaine_eclairs', 'oeil_tempete', 'marteau_tonnerre', 'avatar_tempete']) assert.equal(CARTES[id].exclusif, 'cimes');
  assert.ok(P.coutFabrication('avatar_tempete').cristal_foudre > 0);
});
test('en duel, étourdir coûte une énergie à l’adversaire', () => {
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 300, deck: deck(Array(20).fill('marteau_tonnerre')) }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 300, deck: deck(Array(20).fill('frappe')) }, 4);
  const a = d.actif; D.jouer(d, a, 0); D.finTour(d, a);
  assert.equal(d.j[1 - a].energie, 2);
});
test('l’histoire des Cimes : 5 quêtes aux niveaux 50, 60, 70 ; monture, cosmétiques, haut fait', () => {
  const p = haut(P.nouveauProfil('plante', 'T', 0, 'tireur'), 50);
  assert.equal(QP.etat(p, 'brann'), 'libre'); assert.equal(QP.etat(p, 'aela'), 'verrou');
  fini(p, ['brann', 'aela']); assert.equal(QP.etat(p, 'torvald'), 'verrou', 'niveau 60');
  haut(p, 60); assert.equal(QP.etat(p, 'torvald'), 'libre');
  fini(p, ['torvald', 'skadi']); haut(p, 70); assert.equal(QP.accepter(p, 'odra').ok, true);
  QP.avancer(p, 'victoire', 1, { terr: 'cimes', type: 'boss', cauchemar: true }); QP.rendre(p, 'odra');
  assert.equal(QP.histoireCimes(p), 5); assert.ok(QP.amiDe(p, 'cimes'));
  assert.ok(MO.possedees(p).includes('griffon')); assert.equal(HF.palierDe(p, 'cimes'), 3);
  const q = P.nouveauProfil('eau', 'T', 0); fini(q, ['orin', 'lyra', 'varda']); assert.ok(!MO.possedees(q).includes('lynx_vide'));
  fini(q, ['sel']); assert.ok(MO.possedees(q).includes('lynx_vide'), 'la monture du Chapitre 2');
});

test('v97 : le Kirin (Chapitre 1) et le Wyrm de la Tour (étage 100)', () => {
  const p = P.nouveauProfil('feu', 'K', 0);
  fini(p, [...QP.PAR_CLAN.feu, ...QP.PAR_CLAN.eau]); assert.ok(!MO.possedees(p).includes('kirin'), 'il faut les trois villages');
  fini(p, QP.PAR_CLAN.plante); assert.ok(MO.possedees(p).includes('kirin'));
  const q = P.nouveauProfil('eau', 'W', 0); q.tour = { max: 99, record: 99 }; assert.ok(!MO.possedees(q).includes('wyrm_tour'));
  q.tour = { max: 3, record: 100 }; assert.ok(MO.possedees(q).includes('wyrm_tour'), 'le record compte, même après la remise à zéro');
});
