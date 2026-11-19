// Les Clans Élémentaires : sanctuaires (contrôle des territoires) et arène classée
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../shared/clans/territoires.js';
import * as A from '../shared/clans/arene.js';
import { nouveauDuel, jouer, finTour } from '../shared/clans/duel.js';
import { deckDepart } from '../shared/clans/cartes.js';

const s0 = () => ({ id: 'x', prop: 'feu', capt: null, conteste: false });

test('sanctuaire : un joueur seul le prend en 20 s, le défenseur efface la progression', () => {
  const s = s0(); let r = null, t = 0;
  while (!r && t < 60) { r = T.avancer(s, { feu: 0, eau: 1, plante: 0 }); t++; }
  assert.equal(t, 20); assert.deepEqual(r, { pris: 'eau', ancien: 'feu' }); assert.equal(s.prop, 'eau');
  // à 4, c'est plus rapide
  const s2 = s0(); t = 0; r = null; while (!r) { r = T.avancer(s2, { eau: 4 }); t++; } assert.ok(t <= 10);
  // le propriétaire revient : la capture adverse retombe
  const s3 = s0(); for (let i = 0; i < 10; i++) T.avancer(s3, { eau: 1 }); assert.equal(s3.capt.p, 50);
  T.avancer(s3, { feu: 1 }); assert.equal(s3.capt.p, 38);
  // deux clans dans le cercle : contesté, rien ne bouge
  const avant = s3.capt.p; assert.equal(T.avancer(s3, { feu: 1, eau: 2 }), null); assert.ok(s3.conteste); assert.equal(s3.capt.p, avant);
  // un troisième clan doit d'abord effacer la capture de l'eau
  T.avancer(s3, { plante: 1 }); assert.equal(s3.capt.clan, 'eau');
  for (let i = 0; i < 5; i++) T.avancer(s3, { plante: 1 }); assert.equal(s3.capt.clan, 'plante');
  // cercle vide : ça s'oublie
  const s4 = s0(); T.avancer(s4, { eau: 1 }); T.avancer(s4, {}); T.avancer(s4, {}); assert.equal(s4.capt, null);
});

test('sanctuaires : 2 par territoire, bonus de production', () => {
  for (const k of ['feu', 'eau', 'plante']) assert.equal(T.SANCTUAIRES.filter((s) => s.terr === k).length, 2);
  const props = T.proprietairesDepart(); assert.equal(T.tenus(props, 'eau'), 2);
  assert.ok(Math.abs(T.bonusProduction(3) - 0.3) < 1e-9);
  assert.equal(T.sanctuaireEn(T.SANCTUAIRES[0].x + 30, T.SANCTUAIRES[0].y).id, T.SANCTUAIRES[0].id);
  assert.equal(T.sanctuaireEn(0, 0), null);
});

test('arène : Elo, rangs, gains limités par jour, Reflet compté à moitié', () => {
  const p = { ress: { essence: 0, eclats: 0 } }; A.aJour(p, Date.UTC(2026, 10, 19));
  assert.equal(p.arene.elo, 1000);
  const r = A.resultat(p, 1000, 'victoire', false, '2026-11-19');
  assert.equal(r.delta, 16); assert.equal(p.arene.elo, 1016); assert.equal(p.ress.essence, A.ARENE.gainVictoire.essence);
  assert.equal(A.resultat(p, 1016, 'victoire', true, '2026-11-19').delta, 8);
  for (let i = 0; i < 20; i++) A.resultat(p, 1000, 'defaite', false, '2026-11-19');
  assert.equal(p.arene.payees, A.ARENE.partiesPayeesParJour);
  const e = p.ress.essence; A.resultat(p, 1000, 'victoire', false, '2026-11-19'); assert.equal(p.ress.essence, e);   // plus payé aujourd'hui
  A.resultat(p, 1000, 'victoire', false, '2026-11-20'); assert.ok(p.ress.essence > e);                              // le lendemain si
  assert.equal(A.rangDe(1000).id, 'bronze'); assert.equal(A.rangDe(1260).id, 'or'); assert.equal(A.rangDe(1800).id, 'maitre');
});

test('arène : changement de saison = récompense du meilleur rang, Elo ramené vers 1000', () => {
  const p = { ress: { essence: 0, eclats: 0 } }; A.aJour(p, Date.UTC(2026, 10, 19));
  p.arene.elo = 1300; p.arene.meilleur = 1420; p.arene.v = 12;
  assert.equal(A.aJour(p, Date.UTC(2026, 10, 30)), null);                 // même mois
  const r = A.aJour(p, Date.UTC(2026, 11, 2));
  assert.equal(r.rang.id, 'platine'); assert.equal(p.ress.essence, 800); assert.equal(p.arene.elo, 1150); assert.equal(p.arene.v, 0);
});

test('Reflet : l’IA joue des duels complets sans se bloquer', () => {
  for (let g = 1; g <= 20; g++) {
    const mk = (clan, classe) => ({ nom: clan, clan, classe, pvMax: 70, deck: deckDepart(clan, classe).map((id) => ({ id, niv: 1 })) });
    const d = nouveauDuel(mk('feu', 'mage'), mk('eau', 'combattant'), g);
    let n = 0;
    while (!d.fini && n++ < 2000) { const i = A.coupBot(d, d.actif); if (!(i >= 0 && jouer(d, d.actif, i))) finTour(d, d.actif); }
    assert.ok(d.fini, `duel ${g} fini`);
  }
  // l'IA préfère un coup fatal
  const d = nouveauDuel({ nom: 'a', clan: 'feu', classe: 'tireur', pvMax: 70, deck: deckDepart('feu', 'tireur').map((id) => ({ id, niv: 1 })) }, { nom: 'b', clan: 'eau', classe: 'tireur', pvMax: 70, deck: deckDepart('eau', 'tireur').map((id) => ({ id, niv: 1 })) }, 3);
  const adv = d.j[1 - d.actif]; adv.pv = 3; adv.bloc = 0;
  const i = A.coupBot(d, d.actif); assert.ok(i >= 0); jouer(d, d.actif, i);
});

test('journal d’événements : n’existe que si on le demande, et ne change pas le combat', async () => {
  const C = await import('../shared/clans/combat.js');
  const { deckDepart } = await import('../shared/clans/cartes.js');
  const { MONSTRES } = await import('../shared/clans/monstres.js');
  const ennemis = MONSTRES.feu.normaux.slice(0, 2);
  const def = { deck: deckDepart('feu', 'mage').map((id) => ({ id, niv: 1 })), joueur: { pv: 60, pvMax: 60 }, ennemis, graine: 77, classe: 'mage' };
  const a = C.nouveauCombat(def), b = C.nouveauCombat(def); b.ev = [];
  for (let t = 0; t < 40 && !a.fini; t++) {
    for (let k = 0; k < 4; k++) { const i = a.main.findIndex((_, n) => C.jouable(a, n)); if (i < 0) break; C.jouerCarte(a, i, a.ennemis.find((e) => e.pv > 0)?.uid); C.jouerCarte(b, i, b.ennemis.find((e) => e.pv > 0)?.uid); }
    C.finTour(a); C.finTour(b);
  }
  assert.equal(a.ev, undefined);
  assert.ok(b.ev.length > 10);
  assert.deepEqual({ ...a, _r: 0, ev: 0 }, { ...b, _r: 0, ev: 0 });
  const types = new Set(b.ev.map((e) => e.t));
  for (const t of ['carte', 'coup', 'tourEnnemi', 'agit', 'tour']) assert.ok(types.has(t), t);
});
