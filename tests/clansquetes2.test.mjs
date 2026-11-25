import test from 'node:test';
import assert from 'node:assert/strict';
import * as QP from '../shared/clans/quetesPnj.js';
import * as P from '../shared/clans/profil.js';
import { REPERES, REPERE } from '../shared/clans/reperes.js';
import { PNJ_PAR_ID } from '../shared/clans/pnj.js';
import * as G from '../shared/clans/geo.js';

const niv = (x) => { let n = 1; while (n < P.NIVEAU_MAX && x >= P.xpPourNiveau(n + 1)) n++; return n; };
const zoneIci = (x, y) => (G.dansCiel(x, y) ? 'ciel' : G.dansFaille(x, y) ? 'brisees' : G.dansAmbre(x, y) ? 'ambre' : G.dansCimes(x, y) ? 'cimes' : G.territoireDe(x, y));
// l'XP des combats qu'une quête oblige à faire (estimation basse)
const naturel = (q) => (q.ev === 'mystere' ? q.n * 2 : q.ev !== 'victoire' ? 0 : q.f?.type?.includes('boss') ? q.n * 10 : q.f?.type ? q.n * 3 : q.n);

test('v108 : 5 quêtes de plus par zone, toutes valides', () => {
  const obs = G.obstacles();
  for (const z of ['feu', 'eau', 'plante', 'brisees', 'cimes', 'ambre', 'ciel']) assert.equal(QP.QUETES_ZONE[z].filter((id) => QP.QUETES[id].pnj).length, 5, z);
  for (const [id, q] of Object.entries(QP.QUETES)) {
    assert.ok(q.xp > 0, `${id} : xp`);
    assert.ok(PNJ_PAR_ID[QP.pnjDe(id)], `${id} : habitant`);
    assert.ok(QP.zoneDe(id), `${id} : zone`);
    for (const l of q.lieux || []) assert.ok(REPERE[l], `${id} : lieu ${l}`);
    for (const [i] of (q.objets || []).entries()) {
      const o = QP.posObjetQuete(q, i);
      assert.ok(G.praticable(o.x, o.y, obs), `${id} : objet ${i} pas praticable`);
      assert.equal(zoneIci(o.x, o.y), QP.zoneDe(id), `${id} : objet ${i} hors de sa zone`);
    }
  }
});

test('v108 : les lieux à visiter sont dans leur zone, praticables autour et pas collés', () => {
  const obs = G.obstacles();
  for (const r of REPERES) {
    assert.equal(zoneIci(r.x, r.y), r.zone, r.id);
    assert.ok(!G.praticable(r.x, r.y, obs), `${r.id} : le socle bloque`);
    let ok = 0; for (let a = 0; a < 16; a++) { const an = (a / 16) * Math.PI * 2; if (G.praticable(r.x + Math.cos(an) * 60, r.y + Math.sin(an) * 50 + 10, obs)) ok++; }
    assert.ok(ok >= 14, `${r.id} : la place autour est praticable (${ok}/16)`);
    for (const s of REPERES) if (s !== r) assert.ok(Math.hypot(r.x - s.x, r.y - s.y) > 500, `${r.id} trop près de ${s.id}`);
  }
});

test('v108 : finir les quêtes d’une zone amène au niveau de la suivante (ou un en dessous), sans blocage', () => {
  const ZONES = { feu: [1, 30], eau: [1, 30], plante: [1, 30], brisees: [30, 50], cimes: [50, 70], ambre: [70, 90], ciel: [90, 100] };
  for (const [z, [d, f]] of Object.entries(ZONES)) {
    const ids = QP.QUETES_ZONE[z], fait = new Set(); let x = d === 1 ? 0 : P.xpPourNiveau(d);
    while (fait.size < ids.length) {
      const p = { clan: z, stats: {}, pnjQ: Object.fromEntries([...fait].map((i) => [i, { fait: true }])) };
      p.stats.victoires = Math.max(0, x - QP.xpQuetes(p));   // le niveau du joueur simulé = x
      const dispo = ids.filter((i) => !fait.has(i) && QP.etat(p, i) === 'libre');
      assert.ok(dispo.length, `${z} : bloqué au niveau ${niv(x)} (${ids.filter((i) => !fait.has(i)).join(', ')})`);
      const q = QP.QUETES[dispo[0]]; fait.add(dispo[0]); x += q.xp + naturel(q);
    }
    assert.ok(niv(x) >= f - 1 && niv(x) <= f, `${z} : niveau ${niv(x)} à la fin (visé ${f})`);
  }
});

test('v108 : l’XP des quêtes compte dans le niveau (village : seulement le sien)', () => {
  const p = P.nouveauProfil('feu', 'Test');
  assert.equal(P.niveau(p), 1);
  p.pnjQ = { ignis: { fait: true }, feu_gardien: { fait: true }, nerea: { fait: true } };
  assert.equal(P.xpDe(p), 20 + 22);   // la quête de Néréa (village de l'Eau) ne rapporte rien à un joueur du Feu
  assert.ok(P.niveau(p) > 1);
});

test('v108 : un habitant propose ses quêtes l’une après l’autre', () => {
  const p = P.nouveauProfil('feu', 'Test'); p.stats.victoires = 400;   // niveau suffisant
  assert.equal(QP.queteDe(p, 'mordred'), 'mordred');
  assert.equal(QP.etatPnj(p, 'mordred'), 'libre');
  assert.equal(QP.etat(p, 'feu_statue'), 'verrou');   // il faut d'abord finir celle de Mordred
  p.ress.cristal = 2; QP.accepter(p, 'mordred'); assert.ok(QP.rendre(p, 'mordred').ok);
  assert.equal(QP.queteDe(p, 'mordred'), 'feu_statue');
  assert.equal(QP.etatPnj(p, 'mordred'), 'libre');
  QP.accepter(p, 'feu_statue'); QP.visiter(p, 'feu_statue', REPERE.statue_forgeron.x + 40, REPERE.statue_forgeron.y + 40);
  const r = QP.rendre(p, 'feu_statue'); assert.ok(r.ok); assert.equal(r.xp, 16);
  assert.equal(QP.queteDe(p, 'mordred'), null); assert.equal(QP.etatPnj(p, 'mordred'), 'faite');
});

test('v108 : aller voir un lieu, ramasser des objets, apporter à un lieu', () => {
  const p = P.nouveauProfil('feu', 'Test'); p.stats.victoires = 400; p.pnjQ = { bram: { fait: true }, mordred: { fait: true }, feu_statue: { fait: true }, ignis: { fait: true }, feu_cratere: { fait: true }, pyra: { fait: true } };
  // ramasser : il faut être à côté de chaque objet
  QP.accepter(p, 'feu_outils');
  assert.ok(!QP.ramasser(p, 'feu_outils', 0, 0, 0).ok);
  for (let i = 0; i < 3; i++) { const o = QP.posObjetQuete(QP.QUETES.feu_outils, i); assert.ok(QP.ramasser(p, 'feu_outils', i, o.x + 10, o.y).ok); }
  assert.ok(!QP.ramasser(p, 'feu_outils', 0, QP.posObjetQuete(QP.QUETES.feu_outils, 0).x, QP.posObjetQuete(QP.QUETES.feu_outils, 0).y).ok);   // déjà ramassé
  assert.equal(QP.etat(p, 'feu_outils'), 'prete');
  assert.equal(QP.objetsAVoir(p).length, 0);
  // apporter à un lieu : il faut le lieu ET les ressources
  QP.accepter(p, 'feu_flamme');
  assert.ok(!QP.visiter(p, 'feu_flamme', 0, 0).ok);
  assert.ok(QP.visiter(p, 'feu_flamme', REPERE.flamme.x, REPERE.flamme.y + 60).ok);
  p.ress.braises = 0; assert.equal(QP.etat(p, 'feu_flamme'), 'cours');
  p.ress.braises = 300; p.ress.cristal = 5; assert.equal(QP.etat(p, 'feu_flamme'), 'prete');
  assert.ok(QP.rendre(p, 'feu_flamme').ok); assert.equal(p.ress.braises, 50);
});

test('v108 : le palier minimum compte', () => {
  const p = P.nouveauProfil('feu', 'Test'); p.pnjQ = { feu_cratere: { n: 0 } };
  QP.avancer(p, 'victoire', 1, { terr: 'feu', type: 'elite', palier: 1 }); assert.equal(p.pnjQ.feu_cratere.n, 0);
  QP.avancer(p, 'victoire', 1, { terr: 'feu', type: 'elite', palier: 2 }); assert.equal(p.pnjQ.feu_cratere.n, 1);
  QP.avancer(p, 'victoire', 1, { terr: 'feu', type: 'rare', palier: 4 }); assert.equal(p.pnjQ.feu_cratere.n, 2);
});

test('v108 : la maison grandit avec les chapitres (niveaux 6 à 13)', () => {
  const p = P.nouveauProfil('feu', 'Test'); p.parcelle.maison = 5; Object.assign(p.ress, { essence: 1e6, fragments: 1e4, eclat_vide: 1e3, plumes: 1e4, cristal_foudre: 1e3 });
  const pv5 = P.pvMax(p);
  assert.equal(P.nivMax(p, 'maison'), 5);
  assert.ok(!P.construire(p, 'maison').ok);
  assert.ok(P.chapitreAFinir(p));
  p.pnjQ = { nyx: { fait: true } };
  assert.equal(P.nivMax(p, 'maison'), 7);
  assert.deepEqual(P.coutBatiment(p, 'maison'), { essence: 2000, fragments: 120, eclat_vide: 4 });
  assert.ok(P.construire(p, 'maison').ok); assert.ok(P.construire(p, 'maison').ok);
  assert.equal(p.parcelle.maison, 7); assert.equal(P.pvMax(p), pv5 + 20);
  assert.ok(!P.construire(p, 'maison').ok);   // le chapitre 3 n'est pas fini
  p.pnjQ.odra = { fait: true }; assert.ok(P.construire(p, 'maison').ok); assert.equal(p.parcelle.maison, 8);
  assert.equal(P.nivMax(p, 'autel'), 5);
  assert.equal(P.stockageHeures(p), 14);   // le stockage ne bouge plus après le niveau 5
});
