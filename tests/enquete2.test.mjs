// Les Ombres de Baker Street : chapitre 2, joué automatiquement
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../shared/enquete/moteur.js';
import { chapitre2 as ch } from '../shared/enquete/chapitre2.js';

function dire(e, pnj, ...repliques) {
  let n = M.parler(ch, e, pnj);
  assert.ok(n, `${pnj} n'est pas là (${e.lieu}, ${M.texteHeure(e.temps)})`);
  for (const r of repliques) {
    const c = n.choix.find((x) => x.texte.includes(r));
    assert.ok(c, `${pnj} : pas de réplique « ${r} » parmi ${n.choix.map((x) => x.texte).join(' | ')}`);
    n = M.choisir(ch, e, c.i).noeud;
    if (!n) break;
  }
  M.quitterDialogue(e);
}
const va = (e, lieu, h) => { if (h != null) { const j = M.heureDe(e.temps).jour; e.temps = Math.max(e.temps, (j - 1) * M.JOUR + h * 60); } if (e.lieu !== lieu) assert.ok(M.aller(ch, e, lieu, 'fiacre').ok, `aller à ${lieu}`); };
const examine = (e, ...objets) => objets.forEach((o) => { const r = M.examiner(ch, e, o); assert.ok(r && !r.rien, `examiner ${o}`); });
const deduit = (e, a, b) => assert.ok(M.deduire(ch, e, a, b).ok, `déduire ${a} + ${b}`);
const BONNES = { qui: 'edmund', arme: 'manivelle', entree: 'carnet', mobile: 'dette' };

// toute l'enquête, en examinant les meubles des plans
function enquete() {
  const e = M.nouvelEtat(ch, 'Testeur');
  dire(e, 'vane', 'J’y vais');
  dire(e, 'reed', 'De qui', 'Merci, madame');
  va(e, 'banque'); examine(e, 'chambre', 'manivelle', 'bureau');
  dire(e, 'crale', 'Qui connaît', 'Dans votre carnet', 'Puis-je voir', 'Merci');
  deduit(e, 'porte_intacte', 'combinaison');
  va(e, 'yard'); dire(e, 'gribble', 'Vous allez vite', 'légiste', 'Merci');
  deduit(e, 'registre_garde', 'legiste2'); deduit(e, 'legiste2', 'manivelle');
  va(e, 'manoir', 12); examine(e, 'bureau', 'garderobe', 'cheminee');
  deduit(e, 'porte_intacte', 'carnet_crale');
  dire(e, 'edmund', 'Où étiez-vous', 'Je vérifierai');
  va(e, 'pub', 13); dire(e, 'pip', '(Un shilling)');
  assert.ok(M.examiner(ch, e, 'comptoir').rien, 'Bill garde son registre');
  dire(e, 'pip', '(Deux shillings)'); examine(e, 'comptoir');
  deduit(e, 'temoin_pip2', 'chemise'); deduit(e, 'dettes_edmund', 'lettre_doyen');
  return e;
}

test('le chapitre 2 est cohérent : indices, plans, tableau', () => {
  assert.deepEqual(M.verifierChapitre(ch), []);
  assert.equal(Object.keys(ch.indices).length, 17);
  assert.ok(Object.values(ch.lieux).every((l) => l.plan));
  assert.ok(!ch.heriter && !ch.option);
});

test('chapitre indépendant : même départ quel que soit le chapitre 1', () => {
  const a = M.nouvelEtat(ch, 'A'), b = M.nouvelEtat(ch, 'B', { fin: 'erreur', drapeaux: { truc: 1 }, jauges: { justice: -50 }, argent: 999 });
  assert.equal(a.argent, b.argent); assert.deepEqual(a.drapeaux, b.drapeaux); assert.deepEqual(a.jauges, b.jauges);
});

test('fin « Affaire résolue » : les aveux, les obligations et un tableau prouvé', () => {
  const e = enquete();
  va(e, 'manoir', 15); dire(e, 'edmund', 'Le fiacre', 'Où sont les obligations', 'Vous direz tout');
  assert.ok(e.indices.includes('aveu_edmund') && e.lieux.includes('entrepot'));
  va(e, 'entrepot', 23); dire(e, 'gardien', '(L’attaquer)'); examine(e, 'caisses');
  va(e, 'baker'); assert.ok(M.dormir(ch, e));
  va(e, 'yard', 9);
  const r = M.accuserTableau(ch, e, BONNES);
  assert.equal(r.fin, 'resolu'); assert.equal(e.accusation.force, 4);
  const rap = M.rapport(ch, e);
  assert.ok(rap.reussi); assert.match(rap.verite, /Edmund Crale/); assert.match(r.verdict, /obligations rendues/);
});

test('fin « Faute de preuves » : le bon coupable, deviné sans preuves', () => {
  const e = M.nouvelEtat(ch, 'Testeur');
  const r = M.accuserTableau(ch, e, BONNES);
  assert.equal(r.fin, 'relache'); assert.ok(!M.rapport(ch, e).reussi);
});

test('fin « L’erreur » : Hannah, même avec son alibi sous les yeux', () => {
  const e = enquete();
  va(e, 'atelier', 15); dire(e, 'arthur', 'Où était Hannah'); deduit(e, 'alibi_hannah', 'legiste2');
  assert.equal(M.accuserTableau(ch, e, { ...BONNES, qui: 'hannah' }).fin, 'erreur');
});

test('le carnet de Hannah ne se lit qu’après lui avoir demandé son alibi', () => {
  const e = M.nouvelEtat(ch, 'Testeur'); va(e, 'atelier', 10);
  assert.ok(M.examiner(ch, e, 'comptoir').rien);
  dire(e, 'hannah', 'Où étiez-vous'); examine(e, 'comptoir');
  assert.ok(e.indices.includes('alibi_hannah'));
});

test('délai, et les hommes du Doyen dans les ruelles', () => {
  const d = M.nouvelEtat(ch, 'Testeur'); d.temps = 2 * M.JOUR + 21 * 60; M.verifierDelai(ch, d); assert.equal(d.fin, 'delai');
  const e = M.nouvelEtat(ch, 'Testeur'); e.lieux.push('pub'); e.temps = 22 * 60;
  const r = M.aller(ch, e, 'pub', 'pied', () => 0.9 * 0.45 > 0 ? 0 : 0);
  assert.ok(r.rencontre);
});
