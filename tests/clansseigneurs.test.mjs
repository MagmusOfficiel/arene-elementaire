// v124 : les Seigneurs de chapitre — phases, affinités, fêlures, foudre, énigmes, sablier, étoiles, récompenses
import test from 'node:test';
import assert from 'node:assert/strict';
import { CARTES } from '../shared/clans/cartes.js';
import * as C from '../shared/clans/combat.js';
import * as P from '../shared/clans/profil.js';
import * as SG from '../shared/clans/seigneurs.js';
import * as HF from '../shared/clans/hautsfaits.js';
import { REPERE } from '../shared/clans/reperes.js';

const combat = (id, deck = Array(20).fill({ id: 'garde', niv: 1 }), pv = 500) => { const s = SG.SEIGNEURS[id]; return C.nouveauCombat({ deck, joueur: { pv, pvMax: pv }, ennemis: s.ennemis(), palier: s.palier, graine: 3 }); };
const boss = (c) => c.ennemis.find((e) => e.seigneur);
const mettreEnMain = (c, id) => { c.main.unshift({ uid: `t${Math.random()}`, id, niv: 1 }); c.energie = 99; return 0; };

test('5 Seigneurs, un par chapitre, chacun lié à un monument, avec sa légendaire unique', () => {
  assert.equal(SG.LISTE.length, 5);
  assert.deepEqual(SG.LISTE.map((id) => SG.SEIGNEURS[id].chap), [1, 2, 3, 4, 5]);
  for (const id of SG.LISTE) {
    const s = SG.SEIGNEURS[id];
    for (const l of s.lieux) { assert.ok(REPERE[l], l); assert.equal(REPERE[l].seigneur, id); }
    assert.equal(CARTES[s.trophee]?.rarete, 'legendaire'); assert.equal(CARTES[s.trophee].trophee, id);
    assert.equal(s.ennemis()[0].phases.length, 2);
  }
});

test('les phases : à 66 % puis 33 % le Seigneur change d’intentions (et le Triarque d’élément)', () => {
  const c = combat('triarque'), b = boss(c);
  assert.equal(b.element, 'feu');
  b.pv = Math.round(b.pvMax * 0.7); mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid);
  // une flamme (Feu) contre la forme de Feu : moitié des dégâts
  mettreEnMain(c, 'frappe');
  b.pv = Math.round(b.pvMax * 0.67) ; b.bloc = 0; const avant = b.pv; mettreEnMain(c, 'jet'); C.jouerCarte(c, 0, b.uid);
  assert.equal(b.element, b.pv / b.pvMax <= 0.66 ? 'eau' : 'feu');
  b.bloc = 0; b.pv = Math.round(b.pvMax * 0.4); mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid);
  assert.equal(b.phase >= 1, true);
  b.bloc = 0; b.pv = Math.round(b.pvMax * 0.34); mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid);
  assert.equal(b.element, 'plante'); assert.equal(b.phase, 2);
  assert.ok(avant > 0);
});

test('affinités du Triarque : ×0,5 contre son élément, ×1,5 avec l’élément qui le bat', () => {
  assert.equal(C.affinite('feu', 'feu'), 0.5); assert.equal(C.affinite('eau', 'feu'), 1.5); assert.equal(C.affinite('plante', 'eau'), 1.5); assert.equal(C.affinite('feu', 'plante'), 1.5);
  assert.equal(C.affinite('neutre', 'feu'), 1); assert.equal(C.affinite('feu', 'eau'), 1);
  const c = combat('triarque'), b = boss(c); b.bloc = 0;
  let pv = b.pv; mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid); const dFeu = pv - b.pv;
  b.bloc = 0; pv = b.pv; mettreEnMain(c, 'vague'); C.jouerCarte(c, 0, b.uid); const dEau = pv - b.pv;
  assert.equal(dFeu, Math.round(8 * 0.5)); assert.equal(dEau, Math.round(6 * 1.5));
});

test('le Briseur glisse des Fêlures dans la défausse ; elles ne font rien et s’épuisent', () => {
  const c = combat('briseur'), b = boss(c);
  b.i = 1; C.finTour(c);   // intention { fe: 2, d: 10 }
  const f = [...c.defausse, ...c.main, ...c.pioche].filter((k) => k.id === 'felure');
  assert.ok(f.length >= 2);
  assert.ok(!P.pourClan('felure', 'feu'), 'jamais dans une collection');
  const i = mettreEnMain(c, 'felure'); c.main[i].id = 'felure'; const n = c.epuisees.length; C.jouerCarte(c, i); assert.equal(c.epuisees.length, n + 1);
});

test('le Titan : paratonnerres invoqués, et chacun absorbe 30 % de la foudre', () => {
  const c = combat('titan'), b = boss(c);
  b.i = 1; C.finTour(c);
  assert.equal(c.ennemis.filter((e) => e.paratonnerre && e.pv > 0).length, 2);
  const c2 = combat('titan'), b2 = boss(c2); b2.i = 3; c2.joueur.bloc = 0; const pv0 = c2.joueur.pv; C.finTour(c2);
  const plein = pv0 - c2.joueur.pv;
  const c3 = combat('titan'), b3 = boss(c3); b3.i = 1; C.finTour(c3); boss(c3).i = 3; c3.joueur.bloc = 0; c3.joueur.pv = 500; for (const k of c3.main) k.id = 'garde';
  const pv1 = c3.joueur.pv; C.finTour(c3);
  assert.ok(pv1 - c3.joueur.pv < plein, 'les paratonnerres atténuent l’éclair');
});

test('le Sphinx : énigme réussie (confondu) ou ratée (+3 force), et le sablier de 15 tours', () => {
  const c = combat('sphinx'), b = boss(c);
  c.enigme = 'econome'; c.enigmeDe = b.uid; c.energie = 2; const pv = b.pv; C.finTour(c);
  assert.ok(b.pv < pv && b.affaibli >= 1, 'énigme réussie');
  const c2 = combat('sphinx'), b2 = boss(c2); c2.enigme = 'cartes'; c2.enigmeDe = b2.uid; const f0 = b2.force; b2.i = 2; C.finTour(c2);
  assert.equal(b2.force, f0 + 3, 'énigme ratée');
  const c3 = combat('sphinx'); for (let t = 0; t < 20 && !c3.fini; t++) { c3.joueur.pv = 500; C.finTour(c3); }
  assert.equal(c3.fini, 'defaite'); assert.equal(c3.tour, 16);
});

test('l’Astre déchu est intouchable tant qu’une étoile brille', () => {
  const c = combat('astre'), b = boss(c);
  b.i = 0; C.finTour(c);
  const etoiles = c.ennemis.filter((e) => e.etoile && e.pv > 0); assert.equal(etoiles.length, 2);
  const pv = b.pv; mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid); assert.equal(b.pv, pv, 'protégé');
  for (const e of etoiles) e.pv = 0;
  b.bloc = 0; mettreEnMain(c, 'flamme'); C.jouerCarte(c, 0, b.uid); assert.ok(b.pv < pv, 'exposé');
});

test('ouverture, première victoire (trophée, titre, haut fait) puis revanche plus modeste', () => {
  const p = P.nouveauProfil('eau', 'T', 0, 'mage'); p.stats.victoires = P.xpPourNiveau(40);
  assert.ok(!SG.commencer(p, 'triarque', 5).ok, 'fermé avant le palier III');
  p.paliers = { ...(p.paliers || {}), eau: 4 };
  assert.ok(SG.commencer(p, 'triarque', 5).ok);
  const def = SG.defCombat(p); assert.equal(def.ennemis[0].id, 'triarque');
  const r = SG.finir(p, { fini: 'victoire', tour: 9 });
  assert.ok(r.premiere); assert.equal(p.collection.coeur_triarque.n, 1); assert.equal(p.titre, 'sg:triarque');
  assert.equal(HF.nomTitre(HF.titreDe(p)), 'Briseur du Triarque');
  const e1 = p.ress.essence; SG.commencer(p, 'triarque', 6); const r2 = SG.finir(p, { fini: 'victoire', tour: 7 });
  assert.ok(!r2.premiere); assert.ok(p.ress.essence - e1 < r.rec.essence); assert.equal(p.seigneurs.triarque.record, 7);
  SG.commencer(p, 'triarque', 7); assert.equal(SG.finir(p, { fini: 'defaite', tour: 4 }).victoire, false);
});

test('les trophées ne sortent jamais aux tirages', () => {
  const p = P.nouveauProfil('feu', 'T', 0, 'combattant');
  for (let i = 0; i < 300; i++) { p.ress.essence = 1e7; P.tirer(p, 10, i + 3); }
  assert.ok(!Object.keys(p.collection).some((id) => CARTES[id]?.trophee || id === 'felure'));
});

// un joueur automatique simple (comme dans clans.test.mjs, recopié pour ne pas réimporter ses tests)
function jouerCombat(c, max = 60) {
  for (let t = 0; t < max && !c.fini; t++) {
    for (;;) {
      const i = c.main.map((k, n) => [n, CARTES[k.id].cout]).filter(([n]) => C.jouable(c, n)).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (i == null) break;
      C.jouerCarte(c, i, c.ennemis.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv)[0]?.uid);
      if (c.fini) break;
    }
    C.finTour(c);
  }
}
test('contre chaque Seigneur, le combat se termine toujours (victoire ou défaite)', () => {
  for (const id of SG.LISTE) {
    const deck = [...Array(6).fill({ id: 'frappe', niv: 3 }), ...Array(6).fill({ id: 'garde', niv: 3 }), ...Array(4).fill({ id: 'boule_de_feu', niv: 3 }), ...Array(4).fill({ id: 'brume', niv: 3 })];
    const c = combat(id, deck, 300); jouerCombat(c, 40); assert.ok(c.fini, id);
  }
});
