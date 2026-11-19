// Les Clans Élémentaires : passe de saison (v54)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PS from '../shared/clans/passe.js';
import * as P from '../shared/clans/profil.js';
import * as Q from '../shared/clans/quetes.js';
import * as AP from '../shared/clans/apparence.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const NOV = Date.UTC(2026, 10, 19, 12), DEC = Date.UTC(2026, 11, 2, 12);
const profil = () => P.nouveauProfil('eau', 'Ana', NOV, 'mage');

test('passe : 30 niveaux, des récompenses à chaque niveau, 3 apparences exclusives', () => {
  const pieces = [];
  for (let n = 1; n <= PS.NIVEAUX; n++) { const r = PS.recompense(n, '2026-11'); assert.ok(r.essence || r.eclats || r.piece, `niveau ${n}`); if (r.piece) pieces.push(r.piece); }
  assert.deepEqual(pieces.sort(), ['a_aube', 'c_aube', 't_aube']);
  for (const id of pieces) { assert.ok(AP.PIECES[id].passe); assert.equal(AP.acheter({ ...profil(), ress: { essence: 1e6, eclats: 1e6 } }, id).ok, false, 'pas à vendre'); }
  // les lots tournent chaque mois
  assert.equal(PS.lotDe('2026-11').nom, 'Aube'); assert.equal(PS.lotDe('2026-12').nom, 'Abysses'); assert.equal(PS.lotDe('2027-03').nom, 'Aube');
  for (const l of PS.LOTS) for (const id of l.pieces) assert.ok(AP.PIECES[id], id);
});

test('passe : l’XP vient des événements des quêtes (serveur)', () => {
  const p = profil();
  Q.evenement(p, 'victoire', 1, { type: 'combat' }, NOV); assert.equal(p.passe.xp, 20);
  Q.evenement(p, 'victoire', 1, { type: 'boss' }, NOV); assert.equal(p.passe.xp, 100);
  Q.evenement(p, 'arene', 1, {}, NOV); Q.evenement(p, 'sanctuaire', 1, {}, NOV); assert.equal(p.passe.xp, 200);
  Q.evenement(p, 'mondial', 1000, {}, NOV); assert.equal(p.passe.xp, 260, 'le boss mondial est plafonné');
  assert.equal(PS.gagner(p, 'inconnu', 5, {}, NOV), 0);
  // pas plus que 30 niveaux
  for (let i = 0; i < 100; i++) PS.gagner(p, 'queteSemaine', 1, {}, NOV);
  assert.equal(PS.niveauDe(p.passe.xp), 30); assert.equal(p.passe.xp, PS.NIVEAUX * PS.XP_NIVEAU);
});

test('passe : réclamer, puis nouvelle saison (le reste est donné d’office)', () => {
  const p = profil(); const e0 = p.ress.essence;
  assert.equal(PS.reclamer(p, NOV).ok, false, 'rien au niveau 0');
  PS.gagner(p, 'queteSemaine', 2, {}, NOV);   // 400 XP : niveau 1
  const r = PS.reclamer(p, NOV); assert.ok(r.ok); assert.equal(p.ress.essence, e0 + PS.recompense(1, '2026-11').essence);
  assert.equal(PS.reclamer(p, NOV).ok, false, 'déjà réclamé');
  for (let i = 0; i < 20; i++) PS.gagner(p, 'queteSemaine', 1, {}, NOV);   // 4 400 XP : niveau 14
  assert.equal(PS.aReclamer(p, NOV), 13);
  const r2 = PS.reclamer(p, NOV); assert.ok(r2.total.pieces.includes('c_aube')); assert.ok(AP.possede(p, 'c_aube')); assert.ok(AP.porter(p, 'c_aube').ok);
  assert.ok(r2.total.rare > 0 && p.ress.perle_noire > 0, 'les ressources rares de son clan');
  for (let i = 0; i < 6; i++) PS.gagner(p, 'queteSemaine', 1, {}, NOV);   // niveau 18, pas réclamé
  const ecl = p.ress.eclats;
  PS.aJour(p, DEC);
  assert.equal(p.passe.s, '2026-12'); assert.equal(p.passe.xp, 0); assert.ok(p.ress.eclats > ecl, 'les niveaux 15 à 18 ont été donnés');
  assert.ok(AP.possede(p, 'c_aube'), 'les apparences gagnées restent');
});

test('passe : l’action du serveur, et les quêtes réclamées donnent de l’XP', () => {
  const p = profil();
  assert.equal(ACTIONS.passeReclamer(p).ok, false);
  Q.evenement(p, 'victoire', 3);
  const r = ACTIONS.quete(p, { quel: Q.etat(p).j.find((x) => Q.prete(x))?.id ? `j${Q.etat(p).j.findIndex((x) => Q.prete(x))}` : 'j0' }, {});
  if (r.ok) assert.ok(p.passe.xp >= 60 + 60);
  PS.gagner(p, 'queteSemaine', 2); assert.ok(ACTIONS.passeReclamer(p).ok);
});
