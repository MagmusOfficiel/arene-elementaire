// Les Clans Élémentaires : projets de clan (v52)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PJ from '../shared/clans/projets.js';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { ACTIONS } from '../server/src/clansProfils.js';
import { obstacles, OUVRAGES, praticable } from '../shared/clans/geo.js';

const LUNDI = Date.UTC(2026, 10, 16, 10), SEM = 7 * 864e5;
const profil = (clan = 'feu', nom = 'Ana') => { const p = P.nouveauProfil(clan, nom, LUNDI); p.ress.essence = 100000; p.ress[PJ.MATERIAUX[clan]] = 5000; return p; };

test('projet : les dons font grandir l’ouvrage et le terminent', () => {
  const e = PJ.nouvelEtat(LUNDI), p = profil();
  assert.equal(e.clans.feu.objectif, 1200);
  assert.equal(PJ.donner(e, p, { essence: 5 }, 'a').ok, false, 'moins d’un point : refusé');
  const r = PJ.donner(e, p, { essence: 1005, materiau: 20 }, 'a');
  assert.ok(r.ok); assert.equal(r.pts, 120); assert.equal(p.ress.essence, 100000 - 1000, 'les 5 essence qui ne comptent pas restent'); assert.equal(p.ress.braises, 4980);
  assert.equal(PJ.vue(e).clans.feu.etape, 0);
  const r2 = PJ.donner(e, p, { materiau: 300 }, 'a'); assert.ok(r2.monte);
  assert.equal(PJ.donner(e, p, { materiau: 99999 }, 'a').ok, false, 'pas plus que ce qu’on a');
  assert.equal(PJ.donner(e, p, { essence: -500 }, 'a').ok, false);
  const r3 = PJ.donner(e, p, { materiau: 800 }, 'a'); assert.ok(r3.termine); assert.equal(PJ.vue(e).clans.feu.etape, PJ.ETAPES - 1);
  assert.equal(PJ.donner(e, p, { materiau: 10 }, 'a').termine, false, 'terminé une seule fois');
  assert.deepEqual(PJ.vue(e).clans.feu.top, [['Ana', 1230]]); assert.equal(p.projet.pts, 1230);
  // les autres clans ne sont pas touchés
  assert.equal(e.clans.eau.pts, 0);
});

test('projet : semaine suivante, bonus pour le clan qui a fini, objectif selon les donateurs', () => {
  let e = PJ.nouvelEtat(LUNDI);
  for (let i = 0; i < 5; i++) PJ.donner(e, profil('eau', `J${i}`), { materiau: 300 }, `cle${i}`);
  assert.ok(e.clans.eau.fini); assert.equal(PJ.bonusActif(e, 'eau'), false, 'pas encore : la semaine prochaine');
  assert.equal(PJ.aJour(e, LUNDI + 3600e3).change, false);
  const { etat, change } = PJ.aJour(e, LUNDI + SEM); e = etat;
  assert.ok(change); assert.equal(PJ.bonusActif(e, 'eau'), true); assert.equal(PJ.bonusActif(e, 'feu'), false);
  assert.equal(e.clans.eau.pts, 0); assert.equal(e.clans.eau.objectif, 3000, '5 donateurs × 600');
  assert.equal(PJ.bonusDe(e, 'eau', 'butin'), PJ.BONUS); assert.equal(PJ.bonusDe(e, 'eau', 'remise'), 0);
  // deux semaines sans personne : le bonus ne reste pas
  assert.equal(PJ.bonusActif(PJ.aJour(e, LUNDI + 3 * SEM).etat, 'eau'), false);
});

test('projet : les trois bonus s’appliquent côté serveur', () => {
  const e = PJ.nouvelEtat(LUNDI); e.actifs = { feu: true, eau: true, plante: true };
  // Forge géante : −20 % sur l'amélioration
  const p = profil('feu'), id = p.deck[0], c0 = P.coutAmelioration(id, 1), c1 = P.coutAmelioration(id, 1, 0.2);
  assert.ok(Object.keys(c0).every((k) => c1[k] === Math.ceil(c0[k] * 0.8)));
  p.ress.eclats = 1000; const e0 = p.ress.eclats;
  assert.ok(ACTIONS.ameliorer(p, { id }, { projets: e }).ok); assert.equal(e0 - p.ress.eclats, c1.eclats);
  // Arbre-monde : +20 % à la récolte
  const q = profil('plante'); q.parcelle.recolte = Date.now() - 2 * 3600e3;
  const g = ACTIONS.recolter(q, {}, { projets: e, sanctuaires: 0 }).res; assert.ok(Math.abs(g.bonus - 0.2) < 1e-9);
  // Phare des marées : +20 % du butin au retour
  const w = profil('eau'); assert.ok(ACTIONS.expeCommencer(w, { terr: 'eau', palier: 1 }, { projets: e }).ok);
  assert.equal(w.expedition.bonusButin, 0.2); w.expedition.butin = { essence: 100, mat: 10 };
  const b = X.terminer(w, 'victoire'); assert.equal(b.gainTotal.essence, 120); assert.equal(b.gainTotal.perles, 12);
  // sans bonus : rien
  const v = profil('feu'); ACTIONS.expeCommencer(v, { terr: 'feu', palier: 1 }, { projets: PJ.nouvelEtat(LUNDI) }); assert.equal(v.expedition.bonusButin, undefined);
});

test('projet : l’action projetDonner et l’ouvrage bloque le passage', () => {
  const e = PJ.nouvelEtat(LUNDI), p = profil('plante'); let vu = null;
  const r = ACTIONS.projetDonner(p, { essence: 200, materiau: 5 }, { projets: e, cle: 'k', projetDon: (d) => { vu = d; } });
  assert.ok(r.ok); assert.equal(vu.pts, 25); assert.equal(e.clans.plante.pts, 25);
  assert.equal(ACTIONS.projetDonner(p, { essence: 200 }, {}).ok, false);
  const obs = obstacles();
  for (const o of Object.values(OUVRAGES)) { assert.equal(praticable(o.x, o.y - 4, obs), false); assert.ok(praticable(o.x, o.y + 40, obs)); }
  // l'état reste petit : au plus 300 donateurs gardés par clan
  for (let i = 0; i < 400; i++) PJ.donner(e, profil('feu', `J${i}`), { materiau: 1 + (i % 7) }, `c${i}`);
  PJ.compacter(e); assert.equal(Object.keys(e.clans.feu.donneurs).length, 300);
});
