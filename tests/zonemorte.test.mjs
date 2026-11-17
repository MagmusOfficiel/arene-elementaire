// Zone Morte : monde infini déterministe, collisions, portes, vision, heure
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Monde, genererMorceau, zoneDe, CH, T, SOLIDE } from '../shared/survie/monde.js';
import { deplacer, interagir, cibleInteraction, champDeVision, visible, heure, obscurite, DUREE_JOUR_S, MIN_PAR_S } from '../shared/survie/physique.js';

test('le monde est déterministe : même graine, mêmes morceaux, partout (même très loin)', () => {
  for (const [cx, cy] of [[0, 0], [3, -2], [-40, 17], [100000, -99999]]) {
    assert.deepEqual(genererMorceau(42, cx, cy).t, genererMorceau(42, cx, cy).t);
  }
  assert.notDeepEqual(genererMorceau(42, 1, 1).t, genererMorceau(43, 1, 1).t);
});

test('il y a une ville au départ, des villes ailleurs et beaucoup de campagne', () => {
  assert.notEqual(zoneDe(7, 0, 0).type, 'campagne');
  const z = {}; for (let i = -30; i < 30; i++) for (let j = -30; j < 30; j++) { const t = zoneDe(7, i, j); z[t.type] = (z[t.type] || 0) + 1; }
  assert.ok(z.centre > 5 && z.ville > 30 && z.campagne > z.ville, JSON.stringify(z));
});

test('le point de départ est libre et les maisons ont des portes', () => {
  const m = new Monde(99);
  const d = m.depart(); assert.ok(!m.solide(d.x, d.y));
  let portes = 0, maisons = 0;
  for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) { const mo = m.morceau(i, j); maisons += mo.batiments.length; portes += mo.t.filter((v) => v === T.porte).length; }
  assert.ok(maisons > 10 && portes >= maisons, `${maisons} bâtiments, ${portes} portes`);
});

test('on ne traverse pas les murs, on glisse le long', () => {
  const m = new Monde(5);
  // on cherche un mur horizontal avec du sol libre en dessous
  let trouve = null;
  for (let y = 0; y < 3 * CH && !trouve; y++) for (let x = 0; x < 3 * CH && !trouve; x++) if (m.tuile(x, y) === T.mur && m.tuile(x - 1, y) === T.mur && m.tuile(x + 1, y) === T.mur && !m.solide(x, y + 1) && !m.solide(x - 1, y + 1) && !m.solide(x + 1, y + 1) && !m.solide(x, y + 2)) trouve = { x, y };
  assert.ok(trouve);
  const p = { x: trouve.x + 0.5, y: trouve.y + 1.5 };
  for (let i = 0; i < 60; i++) deplacer(m, p, 0, -1, 0.05, true);
  assert.ok(p.y >= trouve.y + 1 + 0.29, `y=${p.y}`);
});

test('portes : ouvrir, fermer, et les changements restent quand on revient', () => {
  const modifs = {};
  const m = new Monde(11, modifs);
  let porte = null;
  for (let y = 0; y < 2 * CH && !porte; y++) for (let x = 0; x < 2 * CH && !porte; x++) if (m.tuile(x, y) === T.porte) porte = { x, y };
  assert.ok(porte);
  assert.equal(interagir(m, { x: porte.x + 0.5, y: porte.y - 0.8 }, { ...porte, type: T.porte }), 'porteOuverte');
  assert.ok(!m.solide(porte.x, porte.y));
  // monde rechargé depuis la sauvegarde : la porte est toujours ouverte
  const m2 = new Monde(11, JSON.parse(JSON.stringify(modifs)));
  assert.equal(m2.tuile(porte.x, porte.y), T.porteOuverte);
  // on ne referme pas la porte sur soi
  assert.equal(interagir(m2, { x: porte.x + 0.5, y: porte.y + 0.5 }, { ...porte, type: T.porteOuverte }), 'bloque');
  assert.equal(interagir(m2, { x: porte.x + 0.5, y: porte.y - 0.8 }, { ...porte, type: T.porteOuverte }), 'porteFermee');
  assert.ok(m2.solide(porte.x, porte.y));
  // la cible d'interaction trouve la porte juste devant soi
  const c = cibleInteraction(m2, { x: porte.x + 0.5, y: porte.y - 0.6 }, { x: 0, y: 1 });
  assert.equal(c?.type, T.porte);
});

test('fenêtre cassée : on peut l\'enjamber (lentement)', () => {
  const m = new Monde(3);
  let f = null;
  for (let y = 0; y < 2 * CH && !f; y++) for (let x = 0; x < 2 * CH && !f; x++) if (m.tuile(x, y) === T.fenetre) f = { x, y };
  assert.ok(SOLIDE.has(T.fenetre));
  assert.equal(interagir(m, { x: f.x + 0.5, y: f.y + 0.5 }, { ...f, type: T.fenetre }), 'vitre');
  assert.ok(!m.solide(f.x, f.y));
});

test('champ de vision : les murs cachent, le vide non', () => {
  const m = new Monde(5);
  let trouve = null;
  for (let y = 2; y < 3 * CH && !trouve; y++) for (let x = 2; x < 3 * CH && !trouve; x++) if (m.tuile(x, y) === T.mur && !m.opaque(x, y - 1) && !m.opaque(x, y + 1) && !m.opaque(x, y + 2) && !m.opaque(x, y - 2)) trouve = { x, y };
  assert.ok(!visible(m, trouve.x + 0.5, trouve.y - 1.5, trouve.x + 0.5, trouve.y + 1.5));
  const pts = champDeVision(m, trouve.x + 0.5, trouve.y - 1.5, 20, 360);
  assert.equal(pts.length, 720);
  // le rayon vers le bas s'arrête au mur
  const bas = pts[90 * 2 + 1] - (trouve.y - 1.5); assert.ok(bas < 2.2, `bas=${bas}`);
});

test('heure et nuit : une journée = 40 minutes, il fait nuit à minuit, jour à midi', () => {
  assert.equal(DUREE_JOUR_S, 2400); assert.equal(MIN_PAR_S * DUREE_JOUR_S, 1440);
  assert.equal(heure(480).texte, 'Jour 1 · 08:00');
  assert.equal(heure(1440 + 600).jour, 2);
  assert.equal(obscurite(720), 0); assert.ok(obscurite(0) > 0.7); assert.ok(obscurite(20 * 60) > 0 && obscurite(20 * 60) < 0.82);
});

// ---------------------------------------------------------------- phase 2
import { Horde, populationInitiale, ZOMBIE, ARMES } from '../shared/survie/zombies.js';
import { nouveauSurvivant, blesser, bander, majSurvivant, tirerBlessure, DUREE_INFECTION_S } from '../shared/survie/survivant.js';

// petit monde vide (tout en herbe) avec des murs posés à la main
function mondeVide() {
  const m = new Monde(1); m.tuile = (x, y) => m.modifs[`${Math.floor(x)},${Math.floor(y)}`] ?? T.herbe;
  m.poser = (x, y, v) => { m.modifs[`${Math.floor(x)},${Math.floor(y)}`] = v; m.rev = (m.rev || 0) + 1; };
  return m;
}

test('population : beaucoup de zombies en centre-ville, peu à la campagne', () => {
  let ville = 0, campagne = 0, nv = 0, nc = 0;
  for (let i = -20; i < 20; i++) for (let j = -20; j < 20; j++) {
    const z = zoneDe(7, i, j), n = populationInitiale(7, i, j);
    if (z.type === 'centre') { ville += n; nv++; } else if (z.type === 'campagne') { campagne += n; nc++; }
  }
  assert.ok(ville / nv > 5 && campagne / nc < 0.6, `${ville / nv} / ${campagne / nc}`);
});

test('les zombies apparaissent autour du joueur, pas dans la zone sûre, et sont rangés quand on part', () => {
  const m = new Monde(21), h = new Horde(m), d = m.depart();
  h.activer(d.x, d.y, { ...d, r: 18 });
  assert.ok(h.z.length > 10, `${h.z.length} zombies`);
  assert.ok(h.z.every((z) => Math.hypot(z.x - d.x, z.y - d.y) >= 18 && !m.solide(z.x, z.y)));
  const avant = h.z.length;
  h.activer(d.x + 500, d.y);          // on part loin
  const ranges = Object.values(h.pop).reduce((a, b) => a + b, 0);
  assert.ok(ranges >= avant, `${ranges} rangés pour ${avant}`);
  // en revenant, ils sont toujours là (même nombre)
  const h2 = new Horde(m, JSON.parse(JSON.stringify(h.sauvegarde())));
  h2.activer(d.x, d.y, { ...d, r: 18 });
  assert.ok(Math.abs(h2.z.length - avant) <= 2, `${h2.z.length} vs ${avant}`);
});

test('un zombie qui voit le joueur le poursuit et le frappe', () => {
  const m = mondeVide(), h = new Horde(m);
  const z = h.ajouter(10.5, 10.5); const j = { x: 16.5, y: 10.5 };
  let coups = 0;
  for (let i = 0; i < 200; i++) h.maj(0.05, j, 0, () => coups++);
  assert.equal(z.etat, 'chasse');
  assert.ok(Math.hypot(z.x - j.x, z.y - j.y) < 1.1);
  assert.ok(coups >= 3, `${coups} coups`);
});

test('accroupi et de nuit, on est vu de beaucoup moins loin', () => {
  const m = mondeVide(), h = new Horde(m);
  const z = h.ajouter(10.5, 10.5);
  h.maj(0.05, { x: 20.5, y: 10.5, accroupi: false }, 0); assert.equal(z.etat, 'chasse');
  const z2 = new Horde(m).ajouter(10.5, 10.5), h2 = new Horde(m); h2.z.push(z2);
  h2.maj(0.05, { x: 20.5, y: 10.5, accroupi: true }, 1); assert.equal(z2.etat, 'errance');
});

test('le bruit attire, un mur cache, et le zombie contourne le mur pour rejoindre le bruit', () => {
  const m = mondeVide();
  for (let y = 0; y < 20; y++) m.poser(15, y, T.mur);          // long mur, ouvert en bas (y >= 20)
  const h = new Horde(m), z = h.ajouter(12.5, 5.5);
  const j = { x: 18.5, y: 5.5 };
  h.maj(0.05, j, 0); assert.equal(z.etat, 'errance');       // le mur cache le joueur
  h.bruit(18.5, 5.5, 15); assert.equal(z.etat, 'alerte');
  for (let i = 0; i < 1200 && z.x < 15; i++) h.maj(0.05, j, 0);
  assert.ok(z.x > 15, `le zombie a contourné (x=${z.x.toFixed(1)}, y=${z.y.toFixed(1)})`);
});

test('une porte fermée arrête un zombie… un moment ; une fenêtre se casse', () => {
  const m = mondeVide();
  for (let y = 0; y < 30; y++) m.poser(15, y, y === 10 ? T.porte : T.mur);
  const h = new Horde(m), z = h.ajouter(12.5, 10.5);
  h.bruit(18.5, 10.5, 15);
  let t = 0; while (m.tuile(15, 10) === T.porte && t < 60) { h.maj(0.05, { x: 18.5, y: 10.5 }, 0); h.bruit(18.5, 10.5, 15); t += 0.05; }
  assert.ok(t > 12 && t < 60, `porte enfoncée en ${t.toFixed(1)} s`);
  assert.equal(m.tuile(15, 10), T.porteOuverte);
  const m2 = mondeVide(); for (let y = 0; y < 30; y++) m2.poser(15, y, y === 10 ? T.fenetre : T.mur);
  const h2 = new Horde(m2); h2.ajouter(12.5, 10.5); h2.bruit(18.5, 10.5, 15);
  for (let i = 0; i < 200; i++) h2.maj(0.05, { x: 18.5, y: 10.5 }, 0);
  assert.equal(m2.tuile(15, 10), T.fenetreCassee);
});

test('la batte tue un zombie en 2-3 coups, à terre il meurt plus vite ; bousculer repousse', () => {
  const m = mondeVide(), h = new Horde(m);
  const z = h.ajouter(11.5, 10.5), j = { x: 10.5, y: 10.5 };
  let n = 0; while (h.z.includes(z) && n < 10) { z.x = 11.5; z.y = 10.5; h.coup(j, { x: 1, y: 0 }, { ...ARMES.batte, chute: 0 }); n++; }
  assert.ok(n >= 2 && n <= 3, `${n} coups`);
  const z2 = h.ajouter(11.5, 10.5); z2.aTerre = 2;
  h.coup(j, { x: 1, y: 0 }, { ...ARMES.batte, degats: [0.5, 0.5] }); assert.ok(!h.z.includes(z2), 'achevé au sol');
  const z3 = h.ajouter(11.3, 10.5); h.coup(j, { x: -1, y: 0 }, ARMES.batte); assert.equal(z3.pv, 1, 'pas touché dans le dos');
  h.bousculer(j, { x: 1, y: 0 }); assert.ok(z3.x > 11.9);
});

test('blessures : saignement, bandage, infection mortelle après une morsure', () => {
  const s = nouveauSurvivant();
  blesser(s, 'laceration', () => 0.5);   // 0.5 < 1 : saigne ; 0.5 > 0.25 : pas infecté
  assert.equal(s.saignements, 1); assert.ok(!s.infecte); assert.equal(s.sante, 91);
  majSurvivant(s, 10); assert.ok(s.sante < 91);
  assert.ok(bander(s)); assert.equal(s.saignements, 0); assert.equal(s.bandages, 2);
  blesser(s, 'morsure', () => 0.99); assert.ok(s.infecte);
  for (let t = 0; t < DUREE_INFECTION_S + 10 && !s.mort; t += 10) majSurvivant(s, 10);
  assert.ok(s.mort);
  // encerclé ou de dos : la morsure devient bien plus probable
  const freq = (enc, dos) => { let n = 0; for (let i = 0; i < 2000; i++) if (tirerBlessure(enc, dos, i / 2000) === 'morsure') n++; return n / 2000; };
  assert.ok(freq(3, true) > freq(1, false) * 3);
});
