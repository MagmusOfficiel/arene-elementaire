// v87 : Chapitre 2 — les Terres Brisées, les invocations, l'histoire, le niveau 80
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../shared/clans/combat.js';
import * as D from '../shared/clans/duel.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import * as QP from '../shared/clans/quetesPnj.js';
import * as G from '../shared/clans/geo.js';
import { MONSTRES, TERRITOIRES, tousDe } from '../shared/clans/monstres.js';
import { CARTES, effetsDe, decrire } from '../shared/clans/cartes.js';
import { PNJ } from '../shared/clans/pnj.js';

const deck = (ids) => ids.map((id) => ({ id, niv: 1 }));
const avecNiveau = (p, n) => { p.stats.victoires = P.xpPourNiveau(n); return p; };

test('la région : 12 monstres + rare/élite/boss, niveau 30, une porte au sud', () => {
  assert.equal(TERRITOIRES.brisees.niv, 30);
  assert.equal(MONSTRES.brisees.normaux.length, 7);
  assert.equal(tousDe('brisees').length, 14);
  assert.ok(G.dansFaille(...G.CENTRE_FAILLE)); assert.ok(!G.dansFaille(G.CENTRE_FAILLE[0], 1500 + G.OY));
  assert.equal(G.territoireDe(...G.CENTRE_FAILLE), null);
  assert.ok(G.LIEUX.some((l) => l.terr === 'brisees' && l.action === 'expedition'));
});
test('l’expédition des Terres Brisées est fermée avant le niveau 30', () => {
  const p = P.nouveauProfil('feu', 'T', 0);
  assert.equal(X.commencerExpedition(p, 'brisees', 1, 7).ok, false);
  avecNiveau(p, 30); P.completer(p);
  assert.equal(X.commencerExpedition(p, 'brisees', 1, 7).ok, true);
});
test('niveau max 100 (v96), nouvelles ressources présentes', () => {
  const p = P.nouveauProfil('eau', 'T', 0); p.stats.victoires = 1e6;
  assert.equal(P.niveau(p), 100);
  assert.equal(p.ress.fragments, 0); assert.equal(p.ress.eclat_vide, 0);
  const vieux = P.nouveauProfil('eau', 'T', 0); delete vieux.ress.fragments; delete vieux.paliers.brisees; P.completer(vieux);
  assert.equal(vieux.ress.fragments, 0); assert.equal(vieux.paliers.brisees, 1);
});
test('les invocations : un allié qui frappe à chaque tour et encaisse à ta place', () => {
  const c = C.nouveauCombat({ deck: deck(Array(10).fill('frappe')), joueur: { pv: 80, pvMax: 80 }, ennemis: [MONSTRES.brisees.normaux[3]], graine: 5 });
  c.main[0] = { uid: 'x', id: 'golem_pierre', niv: 1 };
  assert.ok(C.jouerCarte(c, 0));
  assert.equal(c.allie.pv, 30);
  const pvJ = c.joueur.pv, pvE = c.ennemis[0].pv;
  C.finTour(c);
  assert.equal(c.joueur.pv, pvJ, 'le héros n’a rien pris : le golem a encaissé');
  assert.ok(c.allie.pv < 30 || c.ennemis[0].pv < pvE);
  assert.ok(c.ennemis[0].pv < pvE, 'le golem a frappé au début du tour');
  assert.ok(decrire('golem_pierre').includes('Invoque'));
  assert.ok(effetsDe('dragonnet', 3).invoque.pv > effetsDe('dragonnet', 1).invoque.pv);
  for (const id of ['loup_spectral', 'golem_pierre', 'esprit_faille', 'dragonnet']) assert.equal(CARTES[id].exclusif, 'brisees');
  assert.ok(P.coutFabrication('dragonnet').eclat_vide > 0);
});
test('un combat avec une invocation va jusqu’au bout', () => {
  const def = { deck: deck(['loup_spectral', ...Array(9).fill('frappe')]), joueur: { pv: 80, pvMax: 80 }, ennemis: [MONSTRES.brisees.normaux[0]], graine: 11 };
  const c = C.nouveauCombat(def);
  for (let t = 0; t < 30 && !c.fini; t++) {
    for (let k = 0; k < 4 && c.main.length && !c.fini; k++) if (!C.jouerCarte(c, 0)) break;
    C.finTour(c);
  }
  assert.ok(c.fini);
});
test('en duel, l’invocation protège son maître', () => {
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 60, deck: deck(Array(10).fill('golem_pierre')) }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 60, deck: deck(Array(10).fill('frappe')) }, 3);
  const a = d.actif; const moi = d.j[a];
  assert.ok(D.jouer(d, a, 0).ok !== false);
  assert.ok(moi.allie?.pv > 0);
  const pv = moi.pv; D.finTour(d, a);
  const b = d.actif; const i = d.j[b].main.findIndex((k) => k.id === 'frappe');
  D.jouer(d, b, i);
  assert.equal(moi.pv, pv); assert.ok(moi.allie.pv < moi.allie.pvMax);
  assert.ok(D.vue(d, a).moi.allie);
});
test('l’histoire : 5 quêtes en chaîne, ouvertes aux niveaux 30, 40 et 50', () => {
  const p = avecNiveau(P.nouveauProfil('plante', 'T', 0), 30);
  assert.equal(QP.etat(p, 'lyra'), 'verrou');
  assert.equal(QP.accepter(p, 'lyra').ok, false);
  assert.equal(QP.accepter(p, 'orin').ok, true);
  QP.avancer(p, 'victoire', 1, { terr: 'feu' }); assert.equal(QP.progres(p, 'orin').n, 0);
  for (let k = 0; k < 3; k++) QP.avancer(p, 'victoire', 1, { terr: 'brisees', type: 'combat' });
  assert.equal(QP.rendre(p, 'orin').ok, true);
  assert.equal(QP.etat(p, 'lyra'), 'libre');
  p.pnjQ.lyra = { n: 0, fait: true };
  assert.equal(QP.etat(p, 'varda'), 'verrou', 'niveau 40 requis');
  avecNiveau(p, 40); assert.equal(QP.etat(p, 'varda'), 'libre');
  p.pnjQ.varda = { fait: true }; p.pnjQ.sel = { fait: true };
  assert.equal(QP.etat(p, 'nyx'), 'verrou'); avecNiveau(p, 50); assert.equal(QP.accepter(p, 'nyx').ok, true);
  QP.avancer(p, 'victoire', 1, { terr: 'brisees', type: 'boss', cauchemar: false }); assert.equal(QP.etat(p, 'nyx'), 'cours');
  QP.avancer(p, 'victoire', 1, { terr: 'brisees', type: 'boss', cauchemar: true }); assert.equal(QP.etat(p, 'nyx'), 'prete');
  QP.rendre(p, 'nyx'); assert.ok(QP.amiDe(p, 'brisees'));
  assert.equal(PNJ.filter((n) => n.clan === 'brisees').length, 5);
});
