// v98 : Chapitre 4 — le Désert d’Ambre, la Marque, l’histoire, la monture
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

test('la région : tout à l’est, niveau 70, 14 monstres + Soleil noir + boss mondial', () => {
  assert.equal(TERRITOIRES.ambre.niv, 70);
  assert.ok(G.dansAmbre(...G.CENTRE_AMBRE) && !G.dansCimes(...G.CENTRE_AMBRE) && G.dansCimes(...G.CENTRE_CIMES) && !G.dansAmbre(...G.CENTRE_CIMES));
  assert.ok(G.CENTRE_AMBRE[0] < G.CENTRES.feu[0], 'v100 : le désert est à gauche'); assert.ok(G.dansAmbre(300, G.MONDE.h - 100) && !G.dansFaille(300, G.MONDE.h - 100), 'le sud du désert reste du désert');
  assert.equal(G.territoireDe(...G.CENTRE_AMBRE), null);
  assert.equal(tousDe('ambre').length, 14); assert.ok(BOSS_CAUCHEMAR.ambre && BOSS_MONDIAUX.ambre);
  assert.ok(MONSTRES.ambre.boss.pv > MONSTRES.cimes.boss.pv, 'plus dur que les Cimes');
  const p = P.nouveauProfil('feu', 'T', 0); haut(p, 65);
  assert.equal(X.commencerExpedition(p, 'ambre', 1, 3).ok, false);
  haut(p, 70); assert.ok(X.commencerExpedition(p, 'ambre', 1, 3).ok);
  // le chemin des Cimes mène au désert, et le portail est accessible
  const obs = G.obstacles(), por = G.LIEUX.find((l) => l.id === 'portail_ambre');
  assert.ok(G.praticable(por.x, por.y + 40, obs)); assert.ok(G.praticable(G.CENTRE_AMBRE[0], G.CENTRE_AMBRE[1] + 30, obs));
});
test('la Marque : à 3, elles explosent et ignorent le bouclier', () => {
  const c = C.nouveauCombat({ deck: deck(Array(10).fill('fleche_scarabee')), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 'm', nom: 'm', ico: 'x', pv: 200, intentions: [{ d: 50 }] }], graine: 2 });
  assert.ok(C.jouerCarte(c, 0, 'e0')); assert.equal(c.ennemis[0].marque, 2); assert.equal(c.ennemis[0].pv, 194);
  C.finTour(c); assert.ok(c.ennemis[0].bloc >= 50);
  assert.ok(C.jouerCarte(c, 0, 'e0'));
  assert.equal(c.ennemis[0].marque, 1, '2 + 2 = 4 : une explosion, il en reste 1');
  assert.equal(c.ennemis[0].pv, 194 - C.DETONATION, 'le bouclier a pris la flèche, pas l’explosion');
  // les monstres du désert marquent le joueur
  const c2 = C.nouveauCombat({ deck: deck(Array(10).fill('garde')), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 's', nom: 's', ico: 'x', pv: 50, intentions: [{ m: 3 }] }], palier: { pv: 1, deg: 1 }, graine: 2 });
  C.jouerCarte(c2, 0); C.finTour(c2); assert.equal(c2.joueur.pv, 80 - C.DETONATION_MONSTRE); assert.equal(c2.joueur.marque, 0);
  for (const id of ['sable_aveuglant', 'fleche_scarabee', 'oeil_ra', 'jugement_pharaon']) assert.equal(CARTES[id].exclusif, 'ambre');
  assert.ok(P.coutFabrication('jugement_pharaon').larme_ambre > 0);
});
test('en duel, la Marque explose aussi', () => {
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 300, deck: deck(Array(20).fill('jugement_pharaon')) }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 300, deck: deck(Array(20).fill('frappe')) }, 4);
  const a = d.actif, b = d.j[1 - a], pv = b.pv; D.jouer(d, a, 0);
  assert.ok(pv - b.pv >= C.DETONATION, 'Jugement : 3 marques d’un coup → explosion'); assert.equal(b.marque, 0);
});
test('l’histoire du désert : 5 quêtes aux niveaux 70, 80, 90 ; monture, cosmétiques, haut fait', () => {
  const p = haut(P.nouveauProfil('plante', 'T', 0, 'tireur'), 70);
  assert.equal(QP.etat(p, 'kesh'), 'libre'); assert.equal(QP.etat(p, 'neferet'), 'verrou');
  fini(p, ['kesh', 'neferet']); assert.equal(QP.etat(p, 'hakim'), 'verrou', 'niveau 80');
  haut(p, 80); assert.equal(QP.etat(p, 'hakim'), 'libre');
  fini(p, ['hakim', 'saia']); haut(p, 90); assert.equal(QP.accepter(p, 'imhet').ok, true);
  QP.avancer(p, 'victoire', 1, { terr: 'ambre', type: 'boss', cauchemar: true }); QP.rendre(p, 'imhet');
  assert.equal(QP.histoireAmbre(p), 5); assert.ok(QP.amiDe(p, 'ambre'));
  assert.ok(MO.possedees(p).includes('lion_sables')); assert.equal(HF.palierDe(p, 'ambre'), 3);
});
