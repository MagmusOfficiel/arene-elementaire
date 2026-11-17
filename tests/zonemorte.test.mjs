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
import { nouveauSurvivant, blesser, bander, majSurvivant, tirerBlessure, DUREE_INFECTION_MIN, utiliser, userArme, armeTenue, surcharge, peutCourir, completerSurvivant, humeurs } from '../shared/survie/survivant.js';
import { OBJETS, genererContenu, typeMeuble, ajouterObjet } from '../shared/survie/objets.js';

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
  assert.ok(bander(s)); assert.equal(s.saignements, 0); assert.equal(s.inv.find((o) => o.id === 'chiffon').n, 2);
  blesser(s, 'morsure', () => 0.99); assert.ok(s.infecte);
  for (let t = 0; t < DUREE_INFECTION_MIN + 10 && !s.mort; t += 10) { s.faim = s.soif = 0; majSurvivant(s, 0.1, { minutes: 10 }); }
  assert.ok(s.mort);
  // encerclé ou de dos : la morsure devient bien plus probable
  const freq = (enc, dos) => { let n = 0; for (let i = 0; i < 2000; i++) if (tirerBlessure(enc, dos, i / 2000) === 'morsure') n++; return n / 2000; };
  assert.ok(freq(3, true) > freq(1, false) * 3);
});

// ---------------------------------------------------------------- phase 3
test('faim, soif et fatigue montent avec le temps ; sans boire, on meurt en quelques jours', () => {
  const s = nouveauSurvivant();
  majSurvivant(s, 0.1, { minutes: 600 });   // 10 h
  assert.ok(s.soif > 45 && s.faim > 30 && s.fatigue > 50, JSON.stringify([s.soif, s.faim, s.fatigue]));
  assert.ok(humeurs(s).length >= 2);
  let h = 0; while (!s.mort && h < 24 * 7) { majSurvivant(s, 0.1, { minutes: 60 }); s.fatigue = 0; h++; }
  assert.ok(s.mort && h > 24 && h < 24 * 5, `${s.mort} après ${h} h`);
});

test('manger et boire font baisser les besoins ; la bouteille vide reste, on la remplit', () => {
  const s = nouveauSurvivant(); s.faim = 50; s.soif = 60;
  utiliser(s, s.inv.findIndex((o) => o.id === 'barre')); assert.equal(s.faim, 40);
  utiliser(s, s.inv.findIndex((o) => o.id === 'eau')); assert.equal(s.soif, 20);
  assert.ok(s.inv.some((o) => o.id === 'bouteille'));
});

test('dormir fait baisser la fatigue, et on se réveille reposé', () => {
  const s = nouveauSurvivant(); s.fatigue = 80; s.dort = true;
  let m = 0; while (s.dort && m < 1000) { majSurvivant(s, 0.1, { minutes: 10 }); m += 10; }
  assert.ok(!s.dort && s.fatigue === 0 && m > 300 && m < 700, `${m} min`);
});

test('fouille : le butin dépend du meuble et de la graine, et il y a de quoi manger en ville', () => {
  assert.deepEqual(genererContenu(5, 10, 10, 'frigo'), genererContenu(5, 10, 10, 'frigo'));
  let nourriture = 0, armes = 0;
  for (let i = 0; i < 300; i++) {
    for (const o of genererContenu(5, i, 3, 'rayon:supermarché')) if (OBJETS[o.id].type === 'nourriture' || OBJETS[o.id].type === 'boisson') nourriture += o.n;
    for (const o of genererContenu(5, i, 4, 'rayon:quincaillerie')) if (OBJETS[o.id].type === 'arme') armes += o.n;
  }
  assert.ok(nourriture > 400 && armes > 50, `${nourriture} / ${armes}`);
  // chaque meuble du monde a un type connu
  const m = new Monde(8); const types = new Set();
  for (let y = 0; y < 3 * CH; y++) for (let x = 0; x < 3 * CH; x++) if ([T.meuble, T.lit, T.etagere].includes(m.tuile(x, y))) types.add(typeMeuble(m, x, y));
  assert.ok(types.has('lit') && [...types].every((t) => genererContenu(1, 0, 0, t)), [...types].join(','));
});

test('inventaire au poids : trop chargé on ralentit puis on ne court plus ; un sac aide', () => {
  const s = nouveauSurvivant(); s.inv.splice(1, 3);   // garde la batte seule
  ajouterObjet(s.inv, 'planche', 6);                  // 9 + 1 kg
  assert.ok(surcharge(s) > 1 && peutCourir(s));
  ajouterObjet(s.inv, 'planche', 2);                  // 13 kg
  assert.ok(!peutCourir(s));
  ajouterObjet(s.inv, 'sac', 1); utiliser(s, s.inv.findIndex((o) => o.id === 'sac'));
  assert.ok(s.sac && surcharge(s) < 1);
  assert.equal(armeTenue(s).id, 'batte', 'la batte reste en main malgré les retraits');
});

test('les armes s\'usent et cassent ; on change d\'arme', () => {
  const s = nouveauSurvivant(); ajouterObjet(s.inv, 'couteau', 1, 2);
  utiliser(s, s.inv.findIndex((o) => o.id === 'couteau')); assert.equal(armeTenue(s).id, 'couteau');
  assert.equal(userArme(s), null);
  assert.match(userArme(s), /cassé/); assert.equal(armeTenue(s), null);
  assert.ok(!s.inv.some((o) => o.id === 'couteau'));
});

test('vieille sauvegarde (phase 2) : le survivant est complété', () => {
  const s = completerSurvivant({ sante: 50, bandages: 1, tues: 4 });
  assert.equal(s.sante, 50); assert.equal(s.tues, 4); assert.ok(Array.isArray(s.inv)); assert.equal(s.inv.find((o) => o.id === 'chiffon').n, 1); assert.equal(s.bandages, undefined);
});

// ---------------------------------------------------------------- phase 4
import { raisonBarricade, barricader, demonter, raisonDemontage, RECETTES, cuisiner, peutCuisiner, raisonFeu, allumerFeu, BARRICADE } from '../shared/survie/construction.js';

function bricoleur() {
  const s = nouveauSurvivant(); ajouterObjet(s.inv, 'marteau', 1, 80); ajouterObjet(s.inv, 'planche', 4); ajouterObjet(s.inv, 'clous', 10); return s;
}
test('barricader : il faut un marteau, une planche et 2 clous ; 3 planches au plus ; ça bloque le passage', () => {
  const m = mondeVide(); m.poser(5, 5, T.fenetreCassee);
  const s0 = nouveauSurvivant(); assert.match(raisonBarricade(s0, m, 5, 5), /marteau/);
  const s = bricoleur();
  assert.ok(!m.solide(5, 5));
  for (let i = 0; i < 3; i++) assert.ok(barricader(s, m, 5, 5));
  assert.equal(m.barricade(5, 5).n, 3); assert.ok(m.solide(5, 5) && m.opaque(5, 5));
  assert.match(raisonBarricade(s, m, 5, 5), /maximum/);
  assert.equal(s.inv.find((o) => o.id === 'planche').n, 1); assert.equal(s.inv.find((o) => o.id === 'clous').n, 4);
  assert.match(raisonBarricade(s, m, 6, 6), /portes et les fenêtres/);
  // une porte barricadée ne s'ouvre plus ; on retire une planche avec X
  m.poser(8, 5, T.porte); barricader(s, m, 8, 5);
  assert.equal(interagir(m, { x: 8.5, y: 6.3 }, { x: 8, y: 5, type: T.porte }), 'barricadee');
  assert.equal(demonter(s, m, 8, 5), 1); assert.equal(m.barricade(8, 5), null);
});

test('les zombies arrachent les planches une à une avant de passer', () => {
  const m = mondeVide(), s = bricoleur();
  for (let y = 0; y < 30; y++) m.poser(15, y, y === 10 ? T.fenetreCassee : T.mur);
  barricader(s, m, 15, 10); barricader(s, m, 15, 10);
  const h = new Horde(m), z = h.ajouter(12.5, 10.5);
  let t = 0, planches = 0;
  while (m.barricade(15, 10) && t < 120) { h.maj(0.05, { x: 18.5, y: 10.5 }, 0); h.bruit(18.5, 10.5, 15); t += 0.05; planches += h.evenements.filter((e) => e.type === 'planche').length; h.evenements.length = 0; }
  assert.ok(!m.barricade(15, 10) && planches === 2, `${planches} planches en ${t.toFixed(0)} s`);
  assert.ok(t > 2 * BARRICADE.pvPlanche * 1.5, `trop vite : ${t.toFixed(0)} s`);
  for (let i = 0; i < 100 && z.x < 15.5; i++) h.maj(0.05, { x: 18.5, y: 10.5 }, 0);
  assert.ok(z.x > 15, 'puis il passe par la fenêtre');
});

test('démonter un meuble donne des planches, mais seulement s\'il est vide', () => {
  const m = mondeVide(), s = nouveauSurvivant(); m.poser(4, 4, T.lit);
  assert.match(raisonDemontage(s, m, 4, 4, []), /marteau/);
  ajouterObjet(s.inv, 'piedbiche', 1, 100);
  assert.match(raisonDemontage(s, m, 4, 4, [{ id: 'pain', n: 1 }]), /Vide/);
  assert.equal(demonter(s, m, 4, 4, []), 3);
  assert.ok(!m.solide(4, 4)); assert.equal(s.inv.find((o) => o.id === 'planche').n, 3);
});

test('cuisine : pâtes + eau = plat de pâtes, la bouteille revient ; la viande crue peut rendre malade', () => {
  const s = nouveauSurvivant(); ajouterObjet(s.inv, 'pates', 1);
  const r = RECETTES.find((x) => x.id === 'platPates');
  assert.ok(peutCuisiner(s, r) && cuisiner(s, r));
  assert.ok(s.inv.some((o) => o.id === 'platPates') && s.inv.some((o) => o.id === 'bouteille') && !s.inv.some((o) => o.id === 'eau'));
  assert.ok(!peutCuisiner(s, r));
  let malades = 0;
  for (let i = 0; i < 200; i++) { const t = nouveauSurvivant(); ajouterObjet(t.inv, 'viande', 1); utiliser(t, t.inv.findIndex((o) => o.id === 'viande')); if (t.malade) malades++; }
  assert.ok(malades > 60 && malades < 140, `${malades} / 200`);
  const t = nouveauSurvivant(); t.malade = 480; majSurvivant(t, 0.1, { minutes: 240 }); assert.ok(t.sante < 90 && t.malade === 240);
});

test('feu de camp : dehors, 2 planches et des allumettes ; il s\'éteint après 4 heures', () => {
  const m = new Monde(3), s = bricoleur(), feux = [];
  const d = m.depart();
  assert.match(raisonFeu(s, m, d.x, d.y), /allumettes/);
  ajouterObjet(s.inv, 'allumettes', 1);
  assert.ok(allumerFeu(s, m, feux, d.x, d.y, 600)); assert.equal(feux[0].fin, 840);
  // dans une maison : non
  let dedans = null; for (let y = 0; y < 3 * CH && !dedans; y++) for (let x = 0; x < 3 * CH && !dedans; x++) if (m.tuile(x, y) === T.parquet) dedans = { x, y };
  ajouterObjet(s.inv, 'allumettes', 1); ajouterObjet(s.inv, 'planche', 2);
  assert.match(raisonFeu(s, m, dedans.x, dedans.y), /intérieur/);
});

test('le butin contient maintenant de quoi bâtir et cuisiner', () => {
  const vus = new Set();
  for (let i = 0; i < 400; i++) for (const t of ['rayon:quincaillerie', 'placard', 'frigo', 'commode']) for (const o of genererContenu(9, i, 7, t)) vus.add(o.id);
  for (const id of ['marteau', 'clous', 'planche', 'pates', 'viande', 'legumes', 'allumettes']) assert.ok(vus.has(id), id);
});

// ---------------------------------------------------------------- phase 5
import { appliquerMetier, METIERS, gagnerComp, niveauComp, bonusDegats, vitesseTravail } from '../shared/survie/competences.js';
import { FUSILS, tirer, recharger } from '../shared/survie/tir.js';
import { calendrier, elecCoupee, eauCoupee, nuitDeHorde } from '../shared/survie/evenements.js';

test('métiers : chacun part avec son matériel et ses compétences', () => {
  for (const id of Object.keys(METIERS)) assert.ok(appliquerMetier(nouveauSurvivant(), id).metier === id);
  const flic = appliquerMetier(nouveauSurvivant(), 'policier');
  const p = flic.inv.find((o) => o.id === 'pistolet'); assert.equal(p.charge, 9); assert.ok(niveauComp(flic, 'tir') >= 2);
  const charp = appliquerMetier(nouveauSurvivant(), 'charpentier');
  assert.ok(!raisonBarricade(charp, (() => { const m = mondeVide(); m.poser(1, 1, T.porte); return m; })(), 1, 1));
});

test('compétences : on progresse en faisant, et ça se sent', () => {
  const s = nouveauSurvivant();
  assert.equal(niveauComp(s, 'combat'), 0); assert.equal(bonusDegats(s), 1);
  let monte = 0; for (let i = 0; i < 80; i++) if (gagnerComp(s, 'combat', 1)) monte++;
  assert.equal(niveauComp(s, 'combat'), 3); assert.equal(monte, 3); assert.ok(bonusDegats(s) > 1.2);
  gagnerComp(s, 'charpente', 400); assert.equal(niveauComp(s, 'charpente'), 5); assert.equal(vitesseTravail(s), 0.5);
  const c = appliquerMetier(nouveauSurvivant(), 'chomeur'); gagnerComp(c, 'tir', 10); assert.equal(c.comp.tir, 13);   // le sans-emploi apprend plus vite
});

test('armes à feu : un tir touche de loin, s\'arrête aux murs et s\'entend de très loin', () => {
  const m = mondeVide(), h = new Horde(m);
  const z = h.ajouter(20.5, 10.5), loin = h.ajouter(10.5, 50.5), moyen = h.ajouter(10.5, 30.5);
  const r = tirer(h, { x: 10.5, y: 10.5 }, { x: 1, y: 0 }, { ...FUSILS.pistolet, precision: 1, degats: [0.5, 0.5] }, 0, () => 0);
  assert.equal(r.touches.length, 1); assert.equal(z.pv, 0.5);
  assert.equal(loin.etat, 'errance', 'à 40 m, il n\'entend pas'); assert.equal(moyen.etat, 'alerte', 'à 20 m, il accourt');
  // un mur arrête la balle
  m.poser(15, 10, T.mur); const z2 = h.ajouter(18.5, 10.5);
  const r2 = tirer(h, { x: 10.5, y: 10.5 }, { x: 1, y: 0 }, { ...FUSILS.pistolet, precision: 1 }, 0, () => 0);
  assert.equal(r2.touches.length, 0); assert.equal(z2.pv, 1);
  // le fusil à pompe touche plusieurs zombies en cône
  const m3 = mondeVide(), h3 = new Horde(m3); h3.ajouter(14.5, 10.5); h3.ajouter(14.5, 11.3); h3.ajouter(14.5, 9.7);
  const r3 = tirer(h3, { x: 10.5, y: 10.5 }, { x: 1, y: 0 }, { ...FUSILS.fusil, precision: 1 }, 0, () => 0);
  assert.equal(r3.touches.length, 3);
});

test('recharger prend les munitions de l\'inventaire', () => {
  const s = appliquerMetier(nouveauSurvivant(), 'policier');
  const p = s.inv.find((o) => o.id === 'pistolet'); p.charge = 2; s.arme = s.inv.indexOf(p);
  assert.equal(recharger(s, FUSILS.pistolet, p), 7); assert.equal(p.charge, 9);
  assert.equal(s.inv.find((o) => o.id === 'balles').n, 5); assert.equal(s.inv[s.arme], p);
});

test('le monde s\'effondre : électricité puis eau coupées, hélicoptère, nuits de horde', () => {
  for (const g of [1, 2, 3, 99, 12345]) {
    const c = calendrier(g);
    assert.ok(c.elec >= 480 + 3 * 1440 && c.elec < 480 + 7 * 1440, `élec ${c.elec}`);
    assert.ok(c.eau > c.elec && c.helico < c.elec);
    assert.ok(!elecCoupee(g, c.elec - 1) && elecCoupee(g, c.elec) && eauCoupee(g, c.eau));
  }
  assert.ok(!nuitDeHorde(5, 1));
  let n = 0; for (let j = 2; j < 32; j++) if (nuitDeHorde(5, j)) n++;
  assert.ok(n > 8 && n < 28, `${n} nuits de horde sur 30`);
});
