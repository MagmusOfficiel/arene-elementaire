// v122 : la Consécration — chefs de guerre, sorts de chef, talents, duel contre le fantôme
import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, CARTES, CHEFS, NIV_CHEF, chefDe, decrire } from '../shared/clans/cartes.js';
import * as P from '../shared/clans/profil.js';
import * as AS from '../shared/clans/ascension.js';
import * as CO from '../shared/clans/consecration.js';
import * as HF from '../shared/clans/hautsfaits.js';
import { nouveauDuel, jouer, finTour } from '../shared/clans/duel.js';
import { nouveauCombat, jouerCarte, finTour as finTourC } from '../shared/clans/combat.js';

function profil(clan = 'feu', classe = 'combattant', branche = 'gardien', niv = NIV_CHEF) {
  const p = P.nouveauProfil(clan, 'Test', 0, classe); p.branche = branche; p.stats.victoires = P.xpPourNiveau(niv);
  return p;
}

test('8 chefs, un par branche, 3 sorts chacun (2 épiques, 1 légendaire) avec un texte', () => {
  assert.equal(Object.keys(CHEFS).length, 8);
  for (const b of Object.keys(BRANCHES)) assert.ok(chefDe(b), b);
  const noms = Object.values(CHEFS).map((c) => c.nom);
  assert.equal(noms.filter((n) => n.includes('Maître')).length, 1);
  assert.equal(noms.filter((n) => n.includes('Seigneur')).length, 1);
  for (const k of Object.keys(CHEFS)) {
    const l = Object.values(CARTES).filter((c) => c.chef === k);
    assert.equal(l.length, 3, k);
    assert.equal(l.filter((c) => c.rarete === 'legendaire').length, 1, k);
    for (const c of l) { assert.equal(c.branche, CHEFS[k].branche); assert.ok(decrire(c.id).length > 5, c.id); }
  }
});

test('les sorts de chef : seulement pour son chef, et ils sortent aux tirages de son chef', () => {
  const p = profil();
  assert.ok(!P.pourClasse('ch_etendard', p.classe, p.branche, null));
  assert.ok(P.pourClasse('ch_etendard', p.classe, p.branche, 'porte_banniere'));
  assert.ok(!P.pourClasse('ch_charge', p.classe, p.branche, 'porte_banniere'));
  for (let i = 0; i < 60; i++) { p.ress.essence = 1e7; P.tirer(p, 10, i + 1); }
  assert.ok(!Object.keys(p.collection).some((id) => CARTES[id]?.chef), 'pas avant d’être chef');
  p.chef = 'porte_banniere';
  for (let i = 0; i < 200; i++) { p.ress.essence = 1e7; P.tirer(p, 10, 1000 + i); }
  const sortis = Object.keys(p.collection).filter((id) => CARTES[id]?.chef);
  assert.ok(sortis.length > 0 && sortis.every((id) => CARTES[id].chef === 'porte_banniere'), sortis.join());
});

test('niveau 50 et une branche requis ; la victoire donne le chef, ses sorts et le titre', () => {
  const jeune = profil('eau', 'tireur', 'sniper', 30);
  assert.equal(CO.etat(jeune), 'verrou'); assert.ok(!CO.consacrer(jeune).ok);
  const p = profil('eau', 'tireur', 'sniper');
  assert.equal(CO.etat(p), 'pret');
  const r = CO.consacrer(p);
  assert.ok(r.ok); assert.equal(p.chef, 'oeil_aigle'); assert.equal(CO.etat(p), 'fait');
  for (const id of CO.sortsChef('oeil_aigle')) { assert.ok(p.collection[id].n >= 1, id); assert.ok(P.jouable(id, p), id); }
  assert.equal(HF.nomTitre(HF.titreDe(p)), 'Œil de l’Aigle');
  assert.ok(!CO.consacrer(p).ok);   // une seule fois
});

test('changer de branche (parchemin) : le chef suit, les anciens sorts de chef deviennent des éclats', () => {
  const p = profil('plante', 'escrimeur', 'duelliste');
  CO.consacrer(p); P.ajouterAuDeck(p, 'ch_gloire');
  p.parchemins = 1; const e0 = p.ress.eclats || 0;
  const r = AS.changer(p, 'ombre');
  assert.ok(r.ok); assert.equal(r.res.chef, 'main_noire'); assert.equal(p.chef, 'main_noire');
  assert.ok(!p.collection.ch_gloire && !p.deck.includes('ch_gloire'));
  assert.ok(p.collection.ch_nuit?.n >= 1);
  assert.ok((p.ress.eclats || 0) > e0);
  assert.equal(p.titre, 'ch:main_noire');
});

test('le fantôme : PV fixes, deck au complet, et son IA finit toujours le duel', () => {
  for (const b of Object.keys(BRANCHES)) {
    const p = profil('feu', BRANCHES[b].classe, b), f = CO.fantome(p);
    assert.equal(f.pvMax, CO.PV_FANTOME); assert.equal(f.chef, chefDe(b)); assert.ok(f.deck.length >= 20, b);
    assert.ok(f.deck.every((k) => CARTES[k.id] && P.pourClasse(k.id, p.classe, b, f.chef) && P.pourClan(k.id, 'feu')), b);
    const moi = CO.joueurConsecration(p, { nom: 'Moi', clan: p.clan, classe: p.classe, branche: b });
    assert.equal(moi.pvMax, CO.PV_CONSACRE);
    const d = nouveauDuel(moi, f, 42); let n = 0;
    while (!d.fini && n++ < 4000) { const q = d.actif, i = CO.coupFantome(d, q); if (!(i >= 0 && jouer(d, q, i))) finTour(d, q); }
    assert.ok(d.fini, b);
  }
});

test('talents des chefs : Premier sang (×3), Rempart du clan, Second souffle, Coup de grâce', () => {
  const deck = Array.from({ length: 20 }, () => ({ id: 'frappe', niv: 1 }));
  const base = { deck, joueur: { pv: 80, pvMax: 80 }, ennemis: [{ id: 'x', nom: 'X', ico: 'x', pv: 500, intentions: [{ a: 1 }] }], graine: 3 };
  const a = nouveauCombat({ ...base, classe: 'tireur', branche: 'sniper', chef: 'oeil_aigle' }), b = nouveauCombat({ ...base, classe: 'tireur', branche: 'sniper' });
  jouerCarte(a, 0); jouerCarte(b, 0);
  assert.equal(500 - a.ennemis[0].pv, 18); assert.equal(500 - b.ennemis[0].pv, 6);
  const g = nouveauCombat({ ...base, classe: 'combattant', branche: 'gardien', chef: 'porte_banniere' });
  const bloc = g.joueur.bloc; finTourC(g); assert.ok(g.joueur.bloc >= Math.floor((bloc - 1) / 2), 'la moitié du bouclier reste');
  const c = nouveauCombat({ ...base, classe: 'escrimeur', branche: 'duelliste', chef: 'champion_clan' });
  const e0 = c.energie; jouerCarte(c, 0); jouerCarte(c, 0); assert.equal(c.energie, e0 - 1);
  const m = nouveauCombat({ ...base, classe: 'escrimeur', branche: 'ombre', chef: 'main_noire' }), m2 = nouveauCombat({ ...base, classe: 'escrimeur', branche: 'ombre' });
  m.ennemis[0].affaibli = 2; m2.ennemis[0].affaibli = 2; jouerCarte(m, 0); jouerCarte(m2, 0);
  assert.equal(m2.ennemis[0].pv - m.ennemis[0].pv, 3);
  // un chef qui ne correspond pas à la branche est ignoré
  assert.equal(nouveauCombat({ ...base, classe: 'tireur', branche: 'artificier', chef: 'oeil_aigle' }).chef, null);
});
