// Les Ombres de Baker Street : moteur d'enquête et chapitre 1, joués automatiquement
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../shared/enquete/moteur.js';
import { chapitre1 as ch } from '../shared/enquete/chapitre1.js';

// petits outils : parler à quelqu'un en suivant des répliques (par un bout de leur texte)
function dire(e, pnj, ...repliques) {
  let n = M.parler(ch, e, pnj);
  assert.ok(n, `${pnj} n'est pas là (${e.lieu}, ${M.texteHeure(e.temps)})`);
  for (const r of repliques) {
    const c = n.choix.find((x) => x.texte.includes(r));
    assert.ok(c, `${pnj} : pas de réplique « ${r} » parmi ${n.choix.map((x) => x.texte).join(' | ')}`);
    const res = M.choisir(ch, e, c.i); n = res.noeud;
    if (!n) break;
  }
  M.quitterDialogue(e);
}
const va = (e, lieu, h) => { if (h != null) { const j = M.heureDe(e.temps).jour; e.temps = Math.max(e.temps, (j - 1) * M.JOUR + h * 60); } if (e.lieu !== lieu) assert.ok(M.aller(ch, e, lieu, 'fiacre').ok, `aller à ${lieu}`); };
const fouille = (e, ...zones) => zones.forEach((z) => assert.ok(M.fouiller(ch, e, z), `fouiller ${z}`));

// enquête complète jusqu'à Lusk (utilisée par plusieurs fins)
function enquete() {
  const e = M.nouvelEtat(ch, 'Testeur');
  dire(e, 'vane', 'Je m’en occupe');
  va(e, 'atelier'); fouille(e, 'porte', 'serrure', 'etabli', 'carnet', 'coffre', 'patere', 'table');
  dire(e, 'hannah', 'Qu’avez-vous vu', 'Merci', 'ressort', 'Victor Lusk');
  assert.ok(M.deduire(ch, e, 'verrou', 'ressort').ok);
  assert.ok(M.deduire(ch, e, 'page', 'temoin_hannah').ok);
  va(e, 'boutique'); fouille(e, 'trousse', 'creuset', 'manteau');
  dire(e, 'lusk', 'Où étiez-vous', 'Bien sûr');
  assert.ok(M.deduire(ch, e, 'limaille', 'alliage').ok);
  return e;
}

test('le chapitre 1 est cohérent : chaque indice, lieu et réplique existe et chaque indice peut être trouvé', () => {
  assert.deepEqual(M.verifierChapitre(ch), []);
  assert.equal(Object.keys(ch.indices).length, 16);
});

test('heure, argent, nuit et plages horaires', () => {
  assert.equal(M.texteHeure(540), 'Jour 1 · 09:00 · matin');
  assert.equal(M.texteArgent(30), '£1 10s'); assert.equal(M.texteArgent(7), '7s');
  assert.ok(M.estNuit(23 * 60) && M.estNuit(M.JOUR + 3 * 60) && !M.estNuit(12 * 60));
  assert.ok(M.dansPlage(M.JOUR + 60, [18, 26]) && !M.dansPlage(M.JOUR + 3 * 60, [18, 26]));
});

test('fin « Affaire résolue » : la bonne enquête, les bonnes preuves', () => {
  const e = enquete();
  dire(e, 'lusk', 'Votre sœur', 'Vous direz tout ça');
  assert.ok(e.indices.includes('faux_alibi'));
  va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'légiste', 'Merci');
  const r = M.accuser(ch, e, 'lusk', ['lusk_atelier', 'client_21h', 'faux_alibi', 'outils_lusk']);
  assert.equal(r.fin, 'resolu'); assert.equal(e.fin, 'resolu');
  const rap = M.rapport(ch, e);
  assert.equal(rap.fin, 'Affaire résolue'); assert.ok(rap.reussi && rap.trouves.length >= 12 && rap.xp > 150);
  assert.match(rap.verite, /Victor Lusk/);
});

test('fin « Faute de preuves » : accuser le bon suspect sans assez de preuves', () => {
  const e = enquete();
  assert.equal(M.accuser(ch, e, 'lusk', ['limaille']).fin, 'relache');
});

test('fin « L’erreur » : faire inculper Arthur, pourtant innocent', () => {
  const e = M.nouvelEtat(ch);
  va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'légiste', 'Merci');
  dire(e, 'arthur', 'Qui peut le confirmer', 'Je vais vérifier', 'Je reviendrai');
  va(e, 'pub', 13); dire(e, 'pip', 'Arthur Fenwick');
  assert.ok(M.deduire(ch, e, 'legiste', 'temoin_pip').ok);
  M.accuser(ch, e, 'arthur', []);
  assert.equal(e.fin, 'erreur'); assert.ok(!M.rapport(ch, e).reussi);
  assert.match(M.rapport(ch, e).suite, /vrai coupable/);
});

test('fin « Trop tard » : le délai de trois jours expire', () => {
  const e = M.nouvelEtat(ch);
  e.temps = 2 * M.JOUR + 19 * 60 + 50;
  M.aller(ch, e, 'atelier', 'fiacre');
  assert.equal(e.fin, 'delai');
});

test('la nuit, une ruelle peut tuer ; on reprend au dernier matin', () => {
  const e = M.nouvelEtat(ch);
  M.dormir(ch, e);                        // jour 2, 7 h : sauvegarde du matin
  assert.equal(M.heureDe(e.temps).jour, 2); assert.ok(e.sauvegardeMatin);
  dire(e, 'pell', 'Vous avez entendu', 'Merci.', 'Plus tard');
  e.temps = M.JOUR + 22 * 60;
  const r = M.aller(ch, e, 'pub', 'pied', () => 0);   // tirage : rencontre forcée
  assert.ok(r.rencontre);
  const rc = M.rencontre(ch, e);
  const iBattre = rc.choix.findIndex((c) => c.texte.includes('battre'));
  if (iBattre >= 0) { M.choisirRencontre(ch, e, iBattre, () => 0.99); assert.ok(e.mort); }
  else { const iFuir = rc.choix.findIndex((c) => c.texte.includes('Fuir')); M.choisirRencontre(ch, e, iFuir, () => 0.99); assert.ok(e.blesse); }
  M.reprendreMatin(ch, e);
  assert.ok(!e.mort && !e.blesse && e.lieu === 'baker' && M.heureDe(e.temps).h === 7);
  // en fiacre, pas de mauvaise rencontre
  e.temps = M.JOUR + 22 * 60; assert.ok(!M.aller(ch, e, 'pub', 'fiacre', () => 0).rencontre);
});

test('deux blessures, c’est la mort ; Mrs Pell soigne', () => {
  const e = M.nouvelEtat(ch);
  M.appliquer(ch, e, { blesse: true }); assert.ok(e.blesse && !e.mort);
  dire(e, 'pell', 'Volontiers', 'Merci, Mrs Pell'); assert.ok(!e.blesse);
  M.appliquer(ch, e, { blesse: true }); M.appliquer(ch, e, { blesse: true }); assert.ok(e.mort);
});

test('les lieux ont des horaires et les témoins aussi', () => {
  const e = M.nouvelEtat(ch);
  M.appliquer(ch, e, { lieu: ['banque', 'music', 'pub'] });
  e.temps = 22 * 60;
  assert.ok(!M.lieuOuvert(ch, e, 'banque') && M.lieuOuvert(ch, e, 'music') && M.lieuOuvert(ch, e, 'pub'));
  e.temps = 10 * 60;
  assert.ok(M.lieuOuvert(ch, e, 'banque') && !M.lieuOuvert(ch, e, 'music'));
  va(e, 'atelier'); assert.ok(M.presents(ch, e).includes('hannah'));
  e.temps = 19 * 60; assert.ok(!M.presents(ch, e).includes('hannah'));
});

test('une mauvaise déduction coûte du temps, une bonne ne se fait qu’une fois', () => {
  const e = enquete(), t = e.temps;
  assert.ok(M.deduire(ch, e, 'tasses', 'billet').faux); assert.equal(e.temps, t + 10);
  assert.ok(M.deduire(ch, e, 'verrou', 'ressort').deja);
});

test('plus de voie criminelle : ni pot-de-vin, ni Chandelle, ni jauges', () => {
  const e = M.nouvelEtat(ch);
  va(e, 'atelier'); fouille(e, 'coffre'); va(e, 'banque', 11);
  dire(e, 'crale', 'ont disparu', 'Je les retrouverai');
  assert.equal(e.argent, 30 - 2); assert.deepEqual(e.jauges, { justice: 0, yard: 0 });
  const tout = JSON.stringify(ch.dialogues, (k, v) => (typeof v === 'function' ? String(v) : v));
  assert.ok(!/J’accepte les dix livres|En ami|Le Doyen m’envoie|Je signe/.test(tout));
  assert.deepEqual(Object.keys(ch.fins).sort(), ['delai', 'erreur', 'mort', 'relache', 'resolu']);
});

test('plan vu de dessus : un leurre coûte du temps, un indice caché attend qu’on sache quoi chercher', () => {
  const e = M.nouvelEtat(ch, 'Testeur');
  dire(e, 'vane', 'Je m’en occupe');
  va(e, 'atelier');
  const t0 = e.temps;
  const l = M.examiner(ch, e, 'vitrine1'); assert.ok(l.texte && !l.nouv.length && e.temps === t0 + 3);
  const avant = M.examiner(ch, e, 'serrure'); assert.ok(avant.rien && !e.indices.includes('ressort'));
  M.examiner(ch, e, 'porte'); assert.ok(e.indices.includes('verrou'));
  M.examiner(ch, e, 'serrure'); assert.ok(e.indices.includes('ressort'));
  assert.ok(M.examine(e, 'atelier', ch.lieux.atelier.plan.objets.find((o) => o.id === 'serrure')));
});

test('tableau façon Cluedo : des réponses justes et prouvées font tomber Lusk, deviner ne suffit pas', () => {
  const devin = M.nouvelEtat(ch, 'Testeur');
  const r0 = M.accuserTableau(ch, devin, { qui: 'lusk', arme: 'marteau_lusk', porte: 'ressort', mobile: 'sentinelle' });
  assert.equal(r0.fin, 'relache'); assert.equal(devin.accusation.force, 0);
  assert.ok(devin.accusation.tableau.every((d) => d.juste && !d.fondee));
  const e = enquete();
  va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'légiste', 'Merci');
  assert.ok(M.deduire(ch, e, 'legiste', 'outils_lusk').ok);
  const r = M.accuserTableau(ch, e, { qui: 'lusk', arme: 'marteau_lusk', porte: 'ressort', mobile: 'rivalite' });
  assert.equal(r.fin, 'resolu'); assert.equal(e.accusation.force, 3);
  const rap = M.rapport(ch, e);
  assert.equal(rap.tableau.length, 4); assert.ok(!rap.tableau[3].juste);
  const faux = enquete();
  assert.equal(M.accuserTableau(ch, faux, { qui: 'arthur' }).fin, 'erreur');
});
