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

test('v112 : les quêtes d’une zone donnent environ 60 % de l’XP vers la zone suivante, les expéditions le reste, sans blocage', () => {
  const ZONES = { feu: [1, 30], eau: [1, 30], plante: [1, 30], brisees: [30, 50], cimes: [50, 70], ambre: [70, 90], ciel: [90, 100] };
  for (const [z, [d, f]] of Object.entries(ZONES)) {
    const ids = QP.QUETES_ZONE[z], fait = new Set(); let x = d === 1 ? 0 : P.xpPourNiveau(d), farm = 0, qx = 0;
    while (fait.size < ids.length) {
      const pnjQ = Object.fromEntries([...fait].map((i) => [i, { fait: true }]));
      const p = { clan: z, stats: { victoires: Math.max(0, x - QP.xpQuetes({ clan: z, pnjQ })) }, pnjQ };
      const rest = ids.filter((i) => !fait.has(i)), dispo = rest.filter((i) => QP.etat(p, i) === 'libre');
      if (!dispo.length) {   // le joueur fait des expéditions jusqu'au niveau de la prochaine quête
        const ouvertes = rest.filter((i) => QP.etat({ ...p, stats: { victoires: 1e6 } }, i) === 'libre');
        assert.ok(ouvertes.length, `${z} : bloqué (${rest.join(', ')})`);
        const besoin = P.xpPourNiveau(Math.min(...ouvertes.map((i) => QP.QUETES[i].niv || 1))) - x;
        assert.ok(besoin > 0, `${z} : boucle`); farm += besoin; x += besoin; continue;
      }
      const q = QP.QUETES[dispo[0]], g = QP.xpQuete({ clan: z }, dispo[0]); fait.add(dispo[0]); qx += g; x += g + naturel(q);
    }
    assert.ok(niv(x) < f, `${z} : les quêtes seules ne doivent plus amener au niveau ${f} (niveau ${niv(x)})`);
    farm += Math.max(0, P.xpPourNiveau(f) - x);
    const part = qx / (qx + farm);
    assert.ok(part > 0.5 && part < 0.7, `${z} : part des quêtes ${Math.round(part * 100)} %`);
  }
});

test('v108 : l’XP des quêtes compte dans le niveau (village : seulement le sien)', () => {
  const p = P.nouveauProfil('feu', 'Test');
  assert.equal(P.niveau(p), 1);
  p.pnjQ = { ignis: { fait: true }, feu_gardien: { fait: true }, nerea: { fait: true } };
  assert.equal(P.xpDe(p), 12 + 13);   // v112 : × 0,6   // la quête de Néréa (village de l'Eau) ne rapporte rien à un joueur du Feu
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
  const r = QP.rendre(p, 'feu_statue'); assert.ok(r.ok); assert.equal(r.xp, 10);
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

test('v116 : les cartes d’élément ne vont qu’à leur clan (tirages, deck, forge, grimoire, anciens profils)', async () => {
  const { CARTES, CLANS } = await import('../shared/clans/cartes.js');
  const G = await import('../shared/clans/grimoire.js');
  const autre = (clan, id) => CLANS.includes(CARTES[id].element) && CARTES[id].element !== clan;
  for (const clan of CLANS) {
    const p = P.nouveauProfil(clan, 'T', 0, 'combattant'); p.ress.essence = 1e7;
    for (let i = 0; i < 40; i++) for (const x of P.tirer(p, 10, i + 11).cartes) assert.ok(!autre(clan, x.id), `${clan} a tiré ${x.id}`);
    assert.ok(G.cartesDe(p).every((id) => !autre(clan, id)), 'le grimoire ne demande pas les autres éléments');
    assert.ok(G.cartesDe(p).some((id) => CARTES[id].element === clan) && G.cartesDe(p).some((id) => CARTES[id].element === 'neutre'));
  }
  // un ancien profil du Feu qui avait des cartes Eau et Plante : elles deviennent des éclats et quittent le deck
  const p = P.nouveauProfil('feu', 'Vieux', 0, 'combattant');
  const eau = Object.keys(CARTES).find((id) => CARTES[id].element === 'eau' && !CARTES[id].exclusif && !CARTES[id].classe);
  const plante = Object.keys(CARTES).find((id) => CARTES[id].element === 'plante' && !CARTES[id].exclusif && !CARTES[id].classe);
  p.collection[eau] = { n: 2, niv: 2 }; p.collection[plante] = { n: 1, niv: 1 }; p.deck.push(eau, eau, plante);
  const e0 = p.ress.eclats || 0;
  P.completer(p);
  assert.ok(!p.collection[eau] && !p.collection[plante]); assert.ok(!p.deck.includes(eau) && !p.deck.includes(plante));
  assert.ok(p.ress.eclats > e0); assert.equal(p.avisClasse.elem, 3);
  assert.ok(p.deck.length >= 20, 'le deck est complété');
  // et on ne peut plus en ajouter
  p.collection[eau] = { n: 1, niv: 1 };
  const r = P.ajouterAuDeck(p, eau); assert.equal(r.ok, false); assert.match(r.raison, /Clan de l/);
});
