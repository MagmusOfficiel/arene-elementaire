import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const EN = JSON.parse(fs.readFileSync(new URL('../client/src/clans/i18n/en.json', import.meta.url), 'utf8'));
const parties = (s) => new Set(s.match(/\{\d+\}/g) || []);

test('anglais : le dictionnaire est complet et cohérent', () => {
  assert.ok(Object.keys(EN).length > 2500);
  for (const [fr, en] of Object.entries(EN)) {
    assert.ok(en.trim(), `traduction vide : ${fr}`);
    for (const p of parties(en)) assert.ok(parties(fr).has(p), `« ${en} » utilise ${p} absent de « ${fr} »`);
  }
});
test('anglais : les mots du jeu', () => {
  for (const [fr, en] of [['Clan du Feu', 'Fire Clan'], ['Fin du tour', 'End turn'], ['Inflige {0} dégâts{1}{2}.', 'Deals {0} damage{1}{2}.'], ['Terres de Braise', 'Ember Lands'], ['Combattant', 'Warrior']])
    assert.equal(EN[fr], en);
});

test('anglais : toutes les quêtes, les habitants, les lieux et les monstres sont traduits (v109)', async () => {
  const QP = await import('../shared/clans/quetesPnj.js'), { PNJ } = await import('../shared/clans/pnj.js'), { REPERES } = await import('../shared/clans/reperes.js'), { TERRITOIRES } = await import('../shared/clans/monstres.js');
  const manque = [];
  for (const [id, q] of Object.entries(QP.QUETES)) for (const k of [q.txt, q.merci, q.titre, ...(q.objets || []).map((o) => o[4])]) if (k && !EN[k]) manque.push(`${id} : ${k.slice(0, 40)}`);
  for (const n of PNJ) for (const k of [n.role, ...(n.dits || [])]) if (!EN[k]) manque.push(`${n.id} : ${k.slice(0, 40)}`);
  for (const r of REPERES) if (!EN[r.nom]) manque.push(r.nom);
  for (const t of Object.values(TERRITOIRES)) for (const m of Object.values(t.monstres || {})) if (m.nom && !EN[m.nom]) manque.push(m.nom);
  assert.deepEqual(manque, []);
});
