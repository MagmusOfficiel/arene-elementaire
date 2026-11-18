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

test('fin « Justice rendue » : la bonne enquête, les bonnes preuves', () => {
  const e = enquete();
  dire(e, 'lusk', 'Votre sœur', 'Vous direz tout ça');
  assert.ok(e.indices.includes('faux_alibi'));
  va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'légiste', 'Merci');
  const r = M.accuser(ch, e, 'lusk', ['lusk_atelier', 'client_21h', 'faux_alibi', 'outils_lusk']);
  assert.equal(r.fin, 'justice'); assert.equal(e.fin, 'justice');
  const rap = M.rapport(ch, e);
  assert.equal(rap.fin, 'Justice rendue'); assert.ok(rap.trouves.length >= 12 && rap.xp > 150 && rap.jauges.justice > 0);
  assert.match(rap.verite, /Victor Lusk/);
});

test('fin « Faute de preuves » : accuser le bon suspect sans assez de preuves', () => {
  const e = enquete();
  assert.equal(M.accuser(ch, e, 'lusk', ['limaille']).fin, 'relache');
});

test('fin « L’erreur » : faire inculper Arthur, en le sachant innocent', () => {
  const e = M.nouvelEtat(ch);
  va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'Comment puis-je vous aider', 'Je signe', 'légiste', 'Merci');
  assert.equal(e.jauges.yard, 15);
  dire(e, 'arthur', 'Qui peut le confirmer', 'Je vais vérifier', 'Je reviendrai');
  va(e, 'pub', 13); dire(e, 'pip', 'Arthur Fenwick');
  assert.ok(M.deduire(ch, e, 'legiste', 'temoin_pip').ok);
  M.accuser(ch, e, 'arthur', []);
  assert.equal(e.fin, 'erreur'); assert.ok(e.jauges.justice <= -40);
  assert.match(M.rapport(ch, e).suite, /vrai tueur/);
});

test('fin « Trop tard » : le délai de trois jours expire', () => {
  const e = M.nouvelEtat(ch);
  e.temps = 2 * M.JOUR + 19 * 60 + 50;
  M.aller(ch, e, 'atelier', 'fiacre');
  assert.equal(e.fin, 'delai');
});

test('fin « La recrue » : passer du côté de la Chandelle et livrer les plans au Doyen', () => {
  const e = enquete();
  va(e, 'music', 21); dire(e, 'margot', 'Victor Lusk était', 'Où est ce paquet', 'En ami', 'Marché conclu');
  assert.ok(e.lieux.includes('entrepot') && e.drapeaux.offre_acceptee && e.jauges.yard < 0);
  // l'entrepôt n'ouvre que la nuit, à partir du jour 2
  e.temps = M.JOUR + 23 * 60; va(e, 'entrepot');
  assert.ok(M.lieuOuvert(ch, e, 'entrepot'));
  assert.equal(M.fouiller(ch, e, 'caisses'), null, 'le gardien protège la caisse');
  dire(e, 'gardien', 'Le Doyen m’envoie', '…');
  fouille(e, 'caisses');
  assert.ok(M.presents(ch, e).includes('doyen'));
  dire(e, 'doyen', 'Lui remettre les plans');
  assert.equal(e.fin, 'recrue');
  assert.equal(M.titre(ch, e), 'Indic de la Chandelle');
});

test('fin « Le double jeu » : Gribble à l’entrepôt, puis vendre les plans', () => {
  const e = enquete();
  va(e, 'music', 21); dire(e, 'margot', 'Victor Lusk était', 'Où est ce paquet', 'arrêter pour recel', 'Je vous écoute', 'Merci, Margot');
  e.temps = M.JOUR + 10 * 60; va(e, 'yard'); dire(e, 'gribble', 'Bien, inspecteur', 'plans volés', 'Marché conclu');
  e.temps = M.JOUR + 23 * 60; va(e, 'entrepot'); fouille(e, 'caisses');
  assert.ok(e.indices.includes('plans'));
  e.temps = 2 * M.JOUR + 10 * 60; va(e, 'yard');
  const avant = e.argent;
  M.accuser(ch, e, 'lusk', ['lusk_atelier', 'client_21h', 'outils_lusk'], { plans: 'vendre' });
  assert.equal(e.fin, 'double_jeu'); assert.equal(e.argent, avant + 1000);
});

test('fin « Le marché » : laisser filer Lusk contre le nom du Doyen', () => {
  const e = enquete();
  dire(e, 'lusk', 'Votre sœur', 'Je vous écoute', 'Le nom', '…');
  assert.ok(e.drapeaux.lusk_parti && !M.presents(ch, e).includes('lusk'));
  M.accuser(ch, e, 'personne', []);
  assert.equal(e.fin, 'marche');
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

test('Crale achète le silence ; le titre suit les jauges', () => {
  const e = M.nouvelEtat(ch);
  va(e, 'atelier'); fouille(e, 'coffre'); va(e, 'banque', 11);
  dire(e, 'crale', 'ont disparu', 'J’accepte');
  assert.equal(e.argent, 30 - 2 + 200); assert.ok(e.drapeaux.crale_paye);
  e.jauges = { justice: 50, yard: 30 }; assert.equal(M.titre(ch, e), 'Bras droit de Vane');
  e.jauges = { justice: 20, yard: -20 }; assert.equal(M.titre(ch, e), "Justicier de l'ombre");
  e.jauges = { justice: -20, yard: 20 }; assert.equal(M.titre(ch, e), 'Flic véreux');
});
