// v78 : les règles d'une expédition en groupe (le serveur les orchestre dans ClansRoom.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../shared/clans/profil.js';
import * as X from '../shared/clans/expedition.js';
import { ACTIONS } from '../server/src/clansProfils.js';

const membre = (g) => { const p = P.nouveauProfil('feu', 'G', 0, 'mage'); X.commencerExpedition(p, 'feu', 1, g); p.expedition.groupe = { id: 'g1', n: 2 }; return p; };

test('en groupe : seul le serveur fait entrer (pas l’action solo)', () => {
  const p = membre(5);
  assert.match(ACTIONS.expeEntrer(p, { salle: X.choixPossibles(p.expedition)[0] }).raison, /chef/);
});

test('vaincu en groupe : à terre, il suit sans combattre, un feu de camp le relève', () => {
  const p = membre(7), x = p.expedition, id = X.choixPossibles(x)[0];
  X.entrer(p, id);
  const r = X.apresCombat(p, { fini: 'defaite', joueur: { pv: 0 } });
  assert.ok(r.ok && r.aTerre); assert.ok(p.expedition, 'l’expédition continue'); assert.equal(x.pv, 0);
  assert.ok(X.pretAPartir(x));
  // une salle de combat : pas de combat pour lui
  let s = X.choixPossibles(x).find((k) => X.salle(x.carte, k).type !== 'repos');
  const r2 = X.entrer(p, s); assert.ok(r2.aTerre); assert.ok(!x.combatEnCours);
  // on avance jusqu'à un feu de camp
  for (let k = 0; k < 8 && x.aTerre; k++) { const ch = X.choixPossibles(x); s = ch.find((c) => X.salle(x.carte, c).type === 'repos') || ch[0]; X.entrer(p, s); }
  assert.equal(x.aTerre, false); assert.equal(x.pv, Math.round(x.pvMax * 0.3));
});

test('le butin : +25 % par compagnon', () => {
  const seul = P.nouveauProfil('feu', 'S', 0, 'mage'); X.commencerExpedition(seul, 'feu', 1, 9); seul.expedition.butin = { essence: 100, mat: 20 };
  const g = membre(9); g.expedition.groupe.n = 3; g.expedition.butin = { essence: 100, mat: 20 };
  assert.equal(X.terminer(seul, 'victoire').gainTotal.essence, 100);
  const b = X.terminer(g, 'victoire'); assert.equal(b.gainTotal.essence, 150); assert.equal(b.groupe, 3);
});
