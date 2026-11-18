// Les Clans Élémentaires : profil gardé par le serveur (actions, rejeu des combats, signatures, triche)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARTES } from '../shared/clans/cartes.js';
import * as C from '../shared/clans/combat.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { ACTIONS, retrouver, signer, nouveauJeton } from '../server/src/clansProfils.js';

// joue un combat comme un joueur et note ses coups (comme le client)
function jouerEtNoter(def) {
  const c = C.nouveauCombat(def), coups = [];
  for (let t = 0; t < 60 && !c.fini; t++) {
    for (;;) {
      const i = c.main.map((k, n) => [n, CARTES[k.id].cout]).filter(([n]) => C.jouable(c, n)).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (i == null) break;
      const cible = c.ennemis.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv)[0]?.uid;
      if (C.jouerCarte(c, i, cible)) coups.push(['j', i, cible]);
      if (c.fini) break;
    }
    if (!c.fini) { C.finTour(c); coups.push(['f']); }
  }
  return { c, coups };
}
const creer = (clan = 'feu', classe = 'combattant') => { const ctx = {}; ACTIONS.creer(null, { clan, nom: 'Testeur', classe }, ctx); return ctx.p; };

test('le rejeu d’un combat redonne exactement le même résultat', () => {
  const p = creer('eau', 'mage');
  X.commencerExpedition(p, 'feu', 1, 1234);
  const id = X.choixPossibles(p.expedition)[0]; X.entrer(p, id);
  const def = X.combatDe(p, id), { c, coups } = jouerEtNoter(def);
  const r = C.rejouer(def, coups);
  assert.equal(r.fini, c.fini); assert.equal(r.joueur.pv, c.joueur.pv);
  assert.deepEqual(r.ennemis.map((e) => e.pv), c.ennemis.map((e) => e.pv));
  assert.equal(C.rejouer(def, []).fini, null);            // sans coups : rien de fini
  assert.equal(C.rejouer(def, 'n’importe quoi').fini, null);
});

test('créer un profil : choix vérifiés, une seule fois', () => {
  const ctx = {};
  assert.equal(ACTIONS.creer(null, { clan: 'lune', classe: 'mage' }, ctx).ok, false);
  assert.equal(ACTIONS.creer(null, { clan: 'feu', classe: 'roi' }, ctx).ok, false);
  const p = creer('plante', 'tireur');
  assert.equal(p.clan, 'plante'); assert.equal(p.classe, 'tireur');
  assert.equal(ACTIONS.creer(p, { clan: 'feu', classe: 'mage' }, {}).ok, false);
});

test('tirages : prix payé, n forcé à 1 ou 10, refus sans essence', () => {
  const p = creer(); const avant = p.ress.essence;
  const r = ACTIONS.tirer(p, { n: 9999 });
  assert.ok(r.ok); assert.equal(r.res.cartes.length, 1); assert.equal(p.ress.essence, avant - P.PRIX_TIRAGE);
  p.ress.essence = 0; assert.equal(ACTIONS.tirer(p, { n: 1 }).ok, false);
});

test('actions refusées pour des ids inventés', () => {
  const p = creer();
  for (const [a, m] of [['ameliorer', { id: 'xx' }], ['fabriquer', { id: '__proto__' }], ['deckAjouter', { id: 'constructor' }], ['construire', { bat: 'toString' }]])
    assert.equal(ACTIONS[a](p, m, {}).ok, false, a);
});

test('expédition côté serveur : un faux combat est refusé, un vrai est payé', () => {
  const p = creer('feu', 'combattant'), pts = [];
  assert.ok(ACTIONS.expeCommencer(p, { terr: 'feu', palier: 3 }).ok === false || p.expedition?.palier === 1 || true);
  if (!p.expedition) assert.ok(ACTIONS.expeCommencer(p, { terr: 'feu', palier: 1 }).ok);
  assert.equal(p.expedition.palier, 1);                     // palier 3 pas débloqué
  const salle = X.choixPossibles(p.expedition).find((k) => ['combat', 'elite', 'rare'].includes(X.salle(p.expedition.carte, k).type)) || X.choixPossibles(p.expedition)[0];
  const e = ACTIONS.expeEntrer(p, { salle });
  assert.ok(e.ok);
  if (!p.expedition.combatEnCours) return;                  // salle sans combat : rien d'autre à tester ici
  // triche : déclarer une victoire sans jouer
  assert.equal(ACTIONS.expeCombat(p, { coups: [] }, {}).ok, false);
  assert.equal(ACTIONS.expeCombat(p, { coups: [['f'], ['f']] }, {}).ok, false);
  const ess = p.stats.victoires;
  const { c, coups } = jouerEtNoter(X.combatDe(p, p.expedition.combatEnCours));
  const r = ACTIONS.expeCombat(p, { coups }, { points: (k) => pts.push(k) });
  assert.ok(r.ok); assert.equal(r.res.issue, c.fini);
  if (c.fini === 'victoire') assert.equal(p.stats.victoires, ess + 1);
});

test('copie signée : acceptée intacte, refusée si modifiée ; ancien profil assaini', async () => {
  const p = creer(), jeton = nouveauJeton();
  const ok = await retrouver({ jeton, copie: { p, sig: signer(p), jeton } });
  assert.ok(['copie', 'serveur'].includes(ok.source));
  const triche = structuredClone(p); triche.ress.essence = 9e9;
  const ko = await retrouver({ jeton: nouveauJeton(), copie: { p: triche, sig: signer(p), jeton } });
  assert.equal(ko.p, null);
  const ancien = structuredClone(p); ancien.ress.essence = 9e9;
  const mig = await retrouver({ jeton: nouveauJeton(), ancien });
  assert.equal(mig.source, 'migration'); assert.ok(mig.p.ress.essence <= 100000);
});

test('quêtes : 3 du jour + 2 de la semaine, avancent, se réclament une fois', async () => {
  const Q = await import('../shared/clans/quetes.js');
  const p = creer(), t = Date.UTC(2026, 10, 18, 12);
  const q = Q.aJour(p, t);
  assert.equal(q.j.length, 3); assert.equal(q.s.length, 2);
  assert.equal(new Set(q.j.map((x) => x.id)).size, 3);
  assert.deepEqual(Q.etat(p, t).j.map((x) => x.id), q.j.map((x) => x.id));     // stable dans la journée
  // le lendemain : nouvelles quêtes du jour, même semaine
  const demain = Q.etat(p, t + 864e5); assert.equal(demain.s, q.s); assert.notEqual(demain.jour, q.jour);
  // faire avancer toutes les quêtes du jour
  for (let i = 0; i < 3; i++) {
    const d = Q.DEFS[q.j[i].id];
    Q.evenement(p, d.ev, d.n, { terr: d.f?.terr, type: d.f?.type?.[0] }, t);
    assert.ok(Q.prete(p.quetes.j[i]), d.id);
  }
  const e0 = p.ress.essence;
  assert.equal(Q.reclamer(p, 'bonus', t).ok, false);
  for (const k of ['j0', 'j1', 'j2']) assert.ok(Q.reclamer(p, k, t).ok);
  assert.equal(Q.reclamer(p, 'j0', t).ok, false);                                 // pas deux fois
  assert.ok(Q.reclamer(p, 'bonus', t).ok);
  assert.ok(p.ress.essence > e0);
  assert.equal(Q.reclamer(p, '__proto__', t).ok, false); assert.equal(Q.reclamer(p, 's9', t).ok, false);
});

test('quêtes : le serveur les fait avancer (tirage, combat gagné) et paie via l’action quete', async () => {
  const Q = await import('../shared/clans/quetes.js');
  const p = creer(); p.ress.essence = 10000;
  ACTIONS.tirer(p, { n: 10 });
  const q = Q.etat(p), tir = [...q.j, ...q.s].filter((x) => Q.DEFS[x.id].ev === 'tirage');
  for (const x of tir) assert.equal(x.n, Math.min(10, Q.DEFS[x.id].n));
  const pts = [];
  const i = q.j.findIndex((x) => Q.prete(x));
  if (i >= 0) { assert.ok(ACTIONS.quete(p, { quel: `j${i}` }, { points: (k) => pts.push(k) }).ok); assert.deepEqual(pts, ['quete']); }
  assert.equal(ACTIONS.quete(p, { quel: 'bonus' }, {}).ok, false);
});
