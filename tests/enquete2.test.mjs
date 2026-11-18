// Les Ombres de Baker Street : chapitre 2 et héritage du chapitre 1, joués automatiquement
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../shared/enquete/moteur.js';
import { chapitre1 } from '../shared/enquete/chapitre1.js';
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
const fouille = (e, ...zones) => zones.forEach((z) => assert.ok(M.fouiller(ch, e, z), `fouiller ${z}`));
const deduit = (e, a, b) => assert.ok(M.deduire(ch, e, a, b).ok, `déduire ${a} + ${b}`);
const RECRUE = { chapitre: 'ch1', fin: 'recrue', finTitre: 'La recrue', titre: 'Indic de la Chandelle', jauges: { justice: -30, yard: -35 }, argent: 100, drapeaux: { offre_acceptee: true, plans_doyen: true } };

// l'enquête jusqu'à la confession d'Edmund (héritage par défaut : « Justice rendue » au chapitre 1)
function enquete(h = null) {
  const e = M.nouvelEtat(ch, 'Testeur', h);
  dire(e, 'vane', 'J’y vais');
  dire(e, 'reed', 'De qui', 'Merci, madame');
  va(e, 'banque'); fouille(e, 'chambre', 'manivelle', 'bureau');
  dire(e, 'crale', 'Qui connaît', 'Dans votre carnet', 'Puis-je voir', 'Merci');
  deduit(e, 'porte_intacte', 'combinaison');
  va(e, 'yard'); dire(e, 'gribble', 'Vous allez vite', 'légiste', 'Merci');
  deduit(e, 'registre_garde', 'legiste2'); deduit(e, 'legiste2', 'manivelle');
  va(e, 'manoir', 12); fouille(e, 'bureau', 'garderobe', 'cheminee');
  dire(e, 'edmund', 'Où étiez-vous', 'Je vérifierai');
  va(e, 'pub', 13); dire(e, 'pip', '(Un shilling)'); dire(e, 'pip', '(Deux shillings)'); fouille(e, 'comptoir');
  deduit(e, 'temoin_pip2', 'chemise'); deduit(e, 'dettes_edmund', 'lettre_doyen');
  return e;
}

test('le chapitre 2 est cohérent et chaque indice peut être trouvé', () => {
  assert.deepEqual(M.verifierChapitre(ch), []);
  assert.equal(Object.keys(ch.indices).length, 17);
});

test('héritage : la fin et les choix du chapitre 1 changent le départ du chapitre 2', () => {
  const e1 = M.nouvelEtat(chapitre1, 'Testeur');
  e1.fin = 'justice'; e1.drapeaux = { plans_rendus: true, soutien: true, _vu_vane: ['x'] }; e1.jauges = { justice: 30, yard: 20 }; e1.argent = 450;
  const h = M.heritage(chapitre1, e1);
  assert.equal(h.finTitre, 'Justice rendue'); assert.ok(!('_vu_vane' in h.drapeaux));
  const e = M.nouvelEtat(ch, 'Testeur', h);
  assert.ok(e.drapeaux.prec_fin_justice && e.drapeaux.prec_plans_rendus && e.drapeaux.prec_soutien);
  assert.ok(e.drapeaux.arthur_libre && e.drapeaux.lusk_cellule && e.drapeaux.doyen_ennemi && !e.drapeaux.doyen_ami);
  assert.deepEqual(e.jauges, { justice: 30, yard: 20 }); assert.equal(e.argent, 460);
  assert.ok(M.presents(ch, e, 'yard').includes('lusk') && !M.presents(ch, e, 'yard').includes('arthur'));
  assert.match(e.journal[0].texte, /Justice rendue/);
  // une recrue de la Chandelle, elle, reçoit une mission du Doyen, et les tueurs du Doyen ne la cherchent pas
  const r = M.nouvelEtat(ch, 'Testeur', RECRUE);
  assert.ok(r.drapeaux.doyen_ami && r.drapeaux.mission_doyen && !r.drapeaux.arthur_libre && r.lieux.includes('music') && r.lieux.includes('boutique'));
  assert.equal(ch.rencontres.filter((x) => M.verifier(ch, r, x.cond)).length, 2);
  assert.equal(ch.rencontres.filter((x) => M.verifier(ch, e, x.cond)).length, 3);
});

test('fin « Justice rendue » : Edmund arrêté, obligations rendues', () => {
  const e = enquete();
  va(e, 'manoir', 15); dire(e, 'edmund', 'Le fiacre', 'Où sont les obligations', 'Vous direz tout');
  assert.ok(e.indices.includes('aveu_edmund') && e.lieux.includes('entrepot'));
  va(e, 'entrepot', 23); dire(e, 'gardien', '(L’attaquer)'); fouille(e, 'caisses');
  assert.ok(e.indices.includes('obligations') && e.blesse);
  va(e, 'baker'); assert.ok(M.dormir(ch, e));
  va(e, 'yard', 9);
  const r = M.accuser(ch, e, 'edmund', ['interieur', 'visiteur_2h', 'arme_manivelle', 'edmund_banque'], { obligations: 'rendre' });
  assert.equal(r.fin, 'justice');
  const rap = M.rapport(ch, e);
  assert.equal(rap.fin, 'Justice rendue'); assert.match(rap.verite, /Edmund Crale/); assert.ok(rap.xp > 200);
});

test('fin « Faute de preuves » : laisser fuir Edmund contre deux cents livres', () => {
  const e = enquete();
  va(e, 'manoir', 15); dire(e, 'edmund', 'Le fiacre', '(Prendre l’argent');
  assert.ok(e.drapeaux.edmund_fui && !M.presents(ch, e, 'manoir').includes('edmund'));
  assert.equal(M.accuser(ch, e, 'edmund', ['interieur', 'visiteur_2h', 'arme_manivelle']).fin, 'relache');
});

test('fin « Le maître chanteur » : vendre son silence au banquier', () => {
  const e = enquete();
  va(e, 'manoir', 19); dire(e, 'crale', 'Votre fils a tué', 'Marché conclu');
  assert.equal(e.fin, 'chantage'); assert.equal(M.titre(ch, e), 'Maître chanteur');
});

test('fin « Le bras droit » : une recrue du chapitre 1 livre les obligations au Doyen', () => {
  const e = M.nouvelEtat(ch, 'Testeur', RECRUE);
  dire(e, 'vane', 'J’y vais');
  va(e, 'music', 21); dire(e, 'margot', 'Où sont les obligations', 'Merci');
  va(e, 'entrepot', 23); dire(e, 'gardien', 'Le Doyen m’attend'); fouille(e, 'caisses');
  dire(e, 'doyen', '(Lui remettre');
  assert.equal(e.fin, 'bras_droit'); assert.equal(M.titre(ch, e), 'Bras droit du Doyen');
});

test('fin « Le complice » : faire tomber Hannah pour le Doyen', () => {
  const e = M.nouvelEtat(ch, 'Testeur', RECRUE);
  assert.equal(M.accuser(ch, e, 'hannah', []).fin, 'complice');
  assert.equal(M.titre(ch, e), 'Complice de la Chandelle');
});

test('fin « Le nouveau Doyen » : avec Gros Bill et les obligations, prendre la pègre', () => {
  const e = M.nouvelEtat(ch, 'Testeur', { chapitre: 'ch1', fin: 'double_jeu', jauges: { justice: -10, yard: 0 }, argent: 1000, drapeaux: { travail_bill: true, plans_vendus: true } });
  dire(e, 'vane', 'J’y vais'); dire(e, 'pell', 'On dit quoi');
  va(e, 'pub', 14); dire(e, 'bill', 'Le Doyen se fait vieux', 'Marché conclu, Bill');
  e.lieux.push('music');
  va(e, 'music', 21); dire(e, 'margot', '(Deux livres)', 'Merci');
  va(e, 'entrepot', 23); dire(e, 'gardien', '(Lui offrir une livre)'); fouille(e, 'caisses');
  va(e, 'pub'); dire(e, 'bill', '(Montrer les obligations)', 'On prend la Chandelle');
  assert.equal(e.fin, 'chef'); assert.equal(M.titre(ch, e), 'Le nouveau Doyen');
});

test('erreur, délai, et Vane qui se souvient de l’argent du chapitre 1', () => {
  const e = enquete();
  va(e, 'atelier', 15); dire(e, 'arthur', 'Où était Hannah'); deduit(e, 'alibi_hannah', 'legiste2');
  const r = M.accuser(ch, e, 'hannah', ['combinaison']);
  assert.equal(r.fin, 'erreur'); assert.ok(e.jauges.justice < 0);
  const d = M.nouvelEtat(ch, 'Testeur'); d.temps = 2 * M.JOUR + 21 * 60; M.verifierDelai(ch, d); assert.equal(d.fin, 'delai');
  const riche = M.nouvelEtat(ch, 'Testeur', { fin: 'double_jeu', jauges: {}, argent: 1000, drapeaux: { plans_vendus: true } });
  dire(riche, 'vane', 'J’y vais'); dire(riche, 'vane', 'avancer', 'Je vois');
  assert.equal(riche.argent, 1010);
});
