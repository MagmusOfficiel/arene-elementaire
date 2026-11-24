import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as D from '../shared/clans/decksConseilles.js';
import { CARTES } from '../shared/clans/cartes.js';
import { styleTitre, titreHTML } from '../shared/clans/titresStyle.js';

test('v85 : decks conseillés valables pour chaque clan et classe', () => {
  for (const clan of ['feu', 'eau', 'plante']) for (const classe of ['combattant', 'mage', 'tireur', 'escrimeur']) {
    const l = D.conseilles(clan, classe); assert.equal(l.length, 3); assert.equal(l.filter((x) => x.conseille).length, 1);
    for (const d of l) {
      assert.equal(d.cartes.length, D.TAILLE, `${clan}/${classe}/${d.style}`);
      const n = {}; for (const id of d.cartes) { n[id] = (n[id] || 0) + 1; assert.ok(n[id] <= P.copiesMax(id)); assert.ok(P.pourClasse(id, classe)); }
      assert.ok(d.cartes.filter((id) => CARTES[id].type === 'attaque').length >= 4, `${clan}/${classe}/${d.style} : assez d'attaques`);
    }
  }
});
test('v85 : appliquer un deck conseillé avec ses propres cartes', () => {
  const p = P.nouveauProfil('feu', 'T', 0, 'combattant');
  const r = D.appliquer(p, 'assaut'); assert.ok(r.ok); assert.ok(p.deck.length >= P.DECK_MIN);
  assert.ok(p.deck.every((id) => p.collection[id]?.n > 0));
  assert.equal(D.appliquer(p, 'nimporte').ok, false);
});
test('v85 : allure des titres', () => {
  assert.equal(styleTitre('br:berserker').deco, 'sang');
  assert.equal(styleTitre('victoires:3').rang, 'or'); assert.equal(styleTitre('victoires:1').rang, 'bronze');
  assert.ok(titreHTML('br:berserker', 'Berserker furieux').includes('deco-sang'));
  assert.equal(styleTitre(''), null);
});
import * as AP from '../shared/clans/apparence.js';
test('v86 : ailes, armes et capes (code compatible avec les anciens)', () => {
  const p = { garde: ['l_ange', 'r_epee', 'k_rouge'], ress: { essence: 0 }, stats: {} };
  for (const id of ['l_ange', 'r_epee', 'k_rouge']) assert.ok(AP.porter(p, id).ok);
  assert.equal(AP.code(p).split('.').length, 7);
  assert.deepEqual(AP.lireCode('t_nuit.c_blond.h_couronne.a_or'), { tenue: 't_nuit', cheveux: 'c_blond', chapeau: 'h_couronne', aura: 'a_or', ailes: 'l_aucune', arme: 'r_aucune', cape: 'k_aucune' });
  assert.equal(AP.porter({ garde: [], ress: {}, stats: {} }, 'l_demon').ok, false);
});
