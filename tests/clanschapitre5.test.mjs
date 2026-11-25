// v99 : Chapitre 5 — les Îles Célestes, le Vol de vie, l’histoire, la monture
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

test('la région : au-delà du désert, niveau 90, 14 monstres + Étoile mère + boss mondial', () => {
  assert.equal(TERRITOIRES.ciel.niv, 90);
  assert.ok(G.dansCiel(...G.CENTRE_CIEL) && !G.dansAmbre(...G.CENTRE_CIEL) && !G.dansCimes(...G.CENTRE_CIEL));
  assert.ok(G.CENTRE_CIEL[1] < G.CENTRES.eau[1], 'v100 : les îles sont en haut'); assert.ok(G.dansCiel(4500, 100) && G.dansCiel(100, 100), 'tout le haut de la carte');
  assert.ok(G.dansAmbre(...G.CENTRE_AMBRE) && !G.dansCiel(...G.CENTRE_AMBRE));
  assert.equal(G.territoireDe(...G.CENTRE_CIEL), null);
  assert.equal(tousDe('ciel').length, 14); assert.ok(BOSS_CAUCHEMAR.ciel && BOSS_MONDIAUX.ciel);
  assert.ok(MONSTRES.ciel.boss.pv > MONSTRES.ambre.boss.pv, 'plus dur que le désert');
  const p = P.nouveauProfil('feu', 'T', 0); haut(p, 85);
  assert.equal(X.commencerExpedition(p, 'ciel', 1, 3).ok, false);
  haut(p, 90); assert.ok(X.commencerExpedition(p, 'ciel', 1, 3).ok);
  // on rejoint à pied, depuis le désert, la grande place et le portail (et les habitants)
  const o = G.obstacles(), T = G.TUILE, L = G.NT.l, H = G.NT.h, ok = (x, y) => G.praticable(x * T + 8, y * T + 8, o);
  const vu = new Uint8Array(L * H), q = [[Math.floor(G.CENTRE_AMBRE[0] / T), Math.floor((G.CENTRE_AMBRE[1] + 40) / T)]]; vu[q[0][1] * L + q[0][0]] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X2 = x + a, Y2 = y + b; if (X2 < 0 || Y2 < 0 || X2 >= L || Y2 >= H || vu[Y2 * L + X2] || !ok(X2, Y2)) continue; vu[Y2 * L + X2] = 1; q.push([X2, Y2]); } }
  const atteint = (x, y) => vu[Math.floor(y / T) * L + Math.floor(x / T)] === 1;
  const por = G.LIEUX.find((l) => l.id === 'portail_ciel');
  assert.ok(atteint(G.CENTRE_CIEL[0], G.CENTRE_CIEL[1] + 30)); assert.ok(atteint(por.x, por.y + 40));
});
test('le Vol de vie : on se soigne des dégâts vraiment infligés', () => {
  const c = C.nouveauCombat({ deck: deck(Array(10).fill('festin_etoiles')), joueur: { pv: 40, pvMax: 80 }, ennemis: [{ id: 'm', nom: 'm', ico: 'x', pv: 200, intentions: [{ d: 50 }] }], graine: 2 });
  assert.ok(C.jouerCarte(c, 0, 'e0')); assert.equal(c.ennemis[0].pv, 186); assert.equal(c.joueur.pv, 54, 'Festin : 100 % des 14 dégâts');
  C.finTour(c); const pv = c.joueur.pv;
  assert.ok(C.jouerCarte(c, 0, 'e0')); assert.equal(c.joueur.pv, pv, 'tout est pris par le bouclier : rien à voler');
  // les monstres des îles se soignent en frappant
  const c2 = C.nouveauCombat({ deck: deck(Array(10).fill('frappe')), joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 'v', nom: 'v', ico: 'x', pv: 60, intentions: [{ a: 10, v: 1 }] }], palier: { pv: 1, deg: 1 }, graine: 2 });
  C.jouerCarte(c2, 0, 'e0'); const pvM = c2.ennemis[0].pv; C.finTour(c2);
  assert.equal(c2.ennemis[0].pv, Math.min(60, pvM + (80 - c2.joueur.pv)));
  for (const id of ['morsure_astrale', 'faux_etoiles', 'comete_vorace', 'festin_etoiles']) assert.equal(CARTES[id].exclusif, 'ciel');
  assert.ok(P.coutFabrication('festin_etoiles').coeur_etoile > 0);
});
test('en duel, le Vol de vie soigne aussi', () => {
  const d = D.nouveauDuel({ nom: 'A', clan: 'feu', classe: 'mage', pvMax: 300, deck: deck(Array(20).fill('festin_etoiles')) }, { nom: 'B', clan: 'eau', classe: 'tireur', pvMax: 300, deck: deck(Array(20).fill('frappe')) }, 4);
  const a = d.actif, A = d.j[a]; A.pv = 200; D.jouer(d, a, 0); assert.ok(A.pv > 200);
});
test('l’histoire des îles : 5 quêtes aux niveaux 90, 95, 100 ; monture, cosmétiques, haut fait', () => {
  const p = haut(P.nouveauProfil('plante', 'T', 0, 'tireur'), 90);
  assert.equal(QP.etat(p, 'elio'), 'libre'); assert.equal(QP.etat(p, 'astree'), 'verrou');
  fini(p, ['elio', 'astree']); assert.equal(QP.etat(p, 'corvin'), 'verrou', 'niveau 95');
  haut(p, 95); fini(p, ['corvin', 'selene']); haut(p, 100); assert.equal(QP.accepter(p, 'ysolde').ok, true);
  QP.avancer(p, 'victoire', 1, { terr: 'ciel', type: 'boss', cauchemar: true }); QP.rendre(p, 'ysolde');
  assert.equal(QP.histoireCiel(p), 5); assert.ok(QP.amiDe(p, 'ciel'));
  assert.ok(MO.possedees(p).includes('pegase_etoiles')); assert.equal(HF.palierDe(p, 'ciel'), 3);
});
