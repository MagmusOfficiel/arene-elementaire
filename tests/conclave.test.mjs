// Tests du Conclave des éléments : règles, parties complètes jouées par des bots, secret des vues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Partie } from '../shared/conclave/partie.js';
import { resoudreRituel, repartition, nouveauPaquet, CONCLAVE } from '../shared/conclave/regles.js';

function partie(n, opts = {}) {
  const p = new Partie({ options: opts });
  p.ajouter('h', 'Humain');
  for (let i = 1; i < n; i++) p.ajouterBot();
  return p;
}
const jouer = (p, max = 4000) => { let t = 0; while (p.phase !== 'fin' && t < max) { p.tick(0.5); t += 0.5; } };

test('règles de base : paquet de 60, répartition des rôles, résultat d’un rituel', () => {
  const pq = nouveauPaquet();
  assert.equal(pq.length, 60);
  assert.equal(pq.filter((c) => c === 'corruption').length, 10);
  for (let n = 5; n <= 10; n++) assert.equal(Object.values(repartition(n)).reduce((a, b) => a + b, 0), n, `${n} joueurs`);
  assert.equal(resoudreRituel('forge', ['feu', 'feu', 'eau']), 'scelle');
  assert.equal(resoudreRituel('forge', ['feu', 'eclat']), 'scelle');
  assert.equal(resoudreRituel('forge', ['feu', 'feu', 'corruption']), 'rate');
  assert.equal(resoudreRituel('forge', ['corruption', 'corruption', 'feu']), 'corrompu');
  assert.equal(resoudreRituel('forge', ['feu', 'eau']), 'rate');
  assert.equal(resoudreRituel('forge', ['feu', 'feu', 'eau'], 3), 'rate', 'levier : 3 bonnes cartes');
});

test('100 parties complètes de 5 à 10 joueurs se terminent toutes', () => {
  const camps = { gardiens: 0, corrompus: 0 };
  for (let i = 0; i < 100; i++) {
    const p = partie(5 + (i % 6)); p.joueurs.get('h').bot = true;
    assert.equal(p.demarrer('h'), null);
    jouer(p);
    assert.equal(p.phase, 'fin', `partie ${i} bloquée en ${p.phase}`);
    assert.ok(p.manche <= CONCLAVE.manchesMax);
    camps[p.fin.camp]++;
  }
  assert.ok(camps.gardiens > 0 && camps.corrompus > 0, JSON.stringify(camps));
});

test('chaque joueur ne voit que sa main et son rôle (sauf entre Corrompus)', () => {
  const p = partie(7); p.demarrer('h');
  const v = p.vue('h');
  assert.ok(Array.isArray(v.moi.main) && v.moi.main.length === 4);
  const corr = [...p.joueurs.values()].filter((j) => p.camp(j) === 'corrompus').map((j) => j.id);
  for (const j of v.joueurs) {
    assert.equal(j.main, undefined, 'pas de main des autres');
    if (j.id !== 'h' && !(corr.includes('h') && corr.includes(j.id))) assert.equal(j.role, undefined, `rôle de ${j.id} caché`);
  }
  assert.ok(!JSON.stringify(v).includes('"paquet"'));
});

test('déplacement limité à 4 par sanctuaire, rituel, vote et exil', () => {
  const p = partie(6); p.demarrer('h');
  const ids = [...p.joueurs.keys()];
  for (const j of p.joueurs.values()) j.bot = false;   // on pilote tout à la main
  ids.slice(0, 4).forEach((id) => assert.equal(p.action(id, 'aller', { lieu: 'forge' }), null));
  assert.match(p.action(ids[4], 'aller', { lieu: 'forge' }), /plein/);
  p.action(ids[4], 'aller', { lieu: 'source' }); p.action(ids[5], 'aller', { lieu: 'parvis' });
  p.tick(0.5);
  assert.equal(p.phase, 'rituel');
  assert.deepEqual(p.sanctuairesActifs(), ['forge'], 'la Source seule n’a pas de rituel');
  // on fixe les mains pour un rituel réussi
  ids.slice(0, 4).forEach((id) => { p.joueurs.get(id).main = ['feu', 'eau', 'vent', 'terre']; });
  ids.slice(0, 4).forEach((id) => p.action(id, 'poser', { index: 0 }));
  p.action(ids[5], 'pret');
  p.tick(0.5);
  assert.equal(p.sanctuaires.forge, 'scelle');
  while (p.phase !== 'vote') p.tick(1);
  const cible = ids[1];
  for (const id of ids) if (id !== cible) p.action(id, 'voter', { cible });
  p.action(cible, 'voter', { cible: null });
  p.tick(0.5);
  assert.ok(p.joueurs.get(cible).exile || p.phase === 'fin', 'le plus voté est exilé');
  if (p.phase !== 'fin') assert.match(p.action(cible, 'chat', { texte: 'hé' }) || '', /exilés/);
});

test('pouvoirs : Forger, Souffle, Surcharge ; Sentinelle protège ; une seule fois par partie', () => {
  const p = partie(7); p.demarrer('h');
  const j = p.joueurs.get('h');
  j.champion = 'feu+terre'; j.main = ['corruption', 'feu'];
  assert.equal(p.action('h', 'pouvoir', { index: 0 }), null);
  assert.equal(j.main[0], 'eclat');
  assert.match(p.action('h', 'pouvoir', { index: 1 }), /déjà/);
  const b = [...p.joueurs.values()].find((x) => x.id !== 'h');
  b.champion = 'feu+vent'; b.pouvoirUtilise = false;
  while (p.phase !== 'debat') p.tick(0.5);
  assert.equal(p.action(b.id, 'pouvoir', {}), null);
  for (const x of p.vivants()) x.bot = false;
  while (p.phase !== 'vote') p.tick(1);
  for (const x of p.vivants()) if (x.id !== 'h') p.action(x.id, 'voter', { cible: 'h' });
  p.tick(0.5);
  assert.equal(p.joueurs.get('h').exile, false, 'Souffle : vote annulé');
});

test('le Mercenaire gagne seul s’il est exilé, la partie continue', () => {
  const p = partie(8); p.demarrer('h');
  const m = [...p.joueurs.values()].find((j) => j.role === 'mercenaire');
  for (const x of p.joueurs.values()) x.bot = false;
  while (p.phase !== 'vote') p.tick(1);
  for (const x of p.vivants()) if (x !== m) p.action(x.id, 'voter', { cible: m.id });
  p.action(m.id, 'voter', { cible: null });
  p.tick(0.5);
  assert.ok(m.exile && m.mercenaireGagne);
  assert.notEqual(p.phase, 'fin');
});
