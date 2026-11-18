// Tests du vrai serveur : API, comptes, version, parties en ligne, reconnexion.
// Lance un serveur sur un port de test, puis s'y connecte comme un navigateur.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from 'colyseus.js';
import { VERSION_JEU } from '../shared/version.js';

const PORT = 2591, HTTP = `http://localhost:${PORT}`, WS = `ws://localhost:${PORT}`;
let srv;
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const silence = (room) => { room.onMessage('*', () => {}); return room; };
const json = (url, opts) => fetch(HTTP + url, opts).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

before(async () => {
  const dossier = mkdtempSync(path.join(tmpdir(), 'arene-test-'));
  srv = spawn(process.execPath, ['server/src/index.js'], { env: { ...process.env, PORT: String(PORT), STATS_FILE: path.join(dossier, 'stats.json'), UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' }, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(HTTP + '/api/version')).ok) return; } catch { /* pas encore prêt */ } await attendre(200); }
  throw new Error('le serveur de test ne démarre pas');
});
after(() => srv?.kill());

test('version et santé', async () => {
  const v = await json('/api/version');
  assert.equal(v.status, 200);
  assert.equal(v.body.version, VERSION_JEU);
  assert.equal(v.body.sauvegarde, 'fichier');
  assert.equal((await fetch(HTTP + '/health')).status, 200);
});

test('classements et palmarès répondent', async () => {
  for (const u of ['/api/classe', '/api/survie', '/api/classement', '/api/palmares', '/api/stats']) {
    const r = await json(u);
    assert.equal(r.status, 200, u);
  }
});

test('Zone Morte : score, classement, anti-spam', async () => {
  const post = (b) => json('/api/zonemorte/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const r = await post({ nom: 'Testeur Zone', jours: 4.5, tues: 87, metier: 'Policier', cause: 'Dévoré par les morts' });
  assert.equal(r.status, 200); assert.ok(r.body.place >= 1);
  assert.equal((await post({ nom: 'Spam', jours: 999, tues: 1 })).status, 429);
  const c = await json('/api/zonemorte/classement');
  assert.equal(c.status, 200); assert.ok(c.body.some((e) => e.nom === 'Testeur Zone' && e.jours === 4.5), JSON.stringify(c.body));
});

test('comptes : créer, sauvegarder, relire, refuser un mauvais code', async () => {
  const c = await json('/api/compte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Testeur', progression: { niv: 7 } }) });
  assert.equal(c.status, 200); assert.match(c.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const put = await json(`/api/compte/${c.body.code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Testeur', progression: { niv: 9 }, survie: 12 }) });
  assert.equal(put.status, 200);
  const g = await json(`/api/compte/${c.body.code.toLowerCase()}`);
  assert.equal(g.body.progression.niv, 9); assert.equal(g.body.survie, 12);
  // Zone Morte : la partie compressée et le record suivent le compte
  await json(`/api/compte/${c.body.code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Testeur', progression: { niv: 9 }, survie: 12, zm: '{"maj":1,"d":"abc"}', zmRecord: { jours: 2, tues: 5 } }) });
  const zm = await json(`/api/compte/${c.body.code}`);
  assert.equal(zm.body.zm, '{"maj":1,"d":"abc"}'); assert.deepEqual(zm.body.zmRecord, { jours: 2, tues: 5 });
  assert.equal((await json('/api/compte/ZZZZ-ZZZZ')).status, 404);
  assert.equal((await json('/api/compte/n-importe-quoi')).status, 400);
  const trop = await json('/api/compte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(trop.status, 429, 'création limitée (anti-abus)');
});

test('partie en ligne : on rejoint, on reçoit l’état, on bouge', async () => {
  const room = await new Client(WS).joinOrCreate('arena', { name: 'Testeur' });
  room.onMessage('*', () => {});
  await new Promise((ok) => room.onStateChange.once(ok));
  let propose = null;
  room.onMessage('choix', (m) => { propose = m; room.send('choisir', { i: 1 }); });   // on choisit le 2e champion proposé
  room.send('pret');   // jeu chargé côté navigateur
  assert.equal(room.state.mode, 'melee');
  await attendre(2000);
  assert.equal(propose?.props?.length, 3, '3 champions proposés');
  assert.equal(room.state.players.get(room.sessionId)?.fusion, propose.props[1].fusion, 'le champion choisi');
  const p0 = room.state.players.get(room.sessionId);
  assert.ok(p0, 'mon joueur existe');
  const x0 = p0.x;
  room.send('input', { r: true }); await attendre(800); room.send('input', {});
  await attendre(200);
  assert.ok(room.state.players.get(room.sessionId).x > x0 + 50, 'le serveur me fait avancer');
  let pong = null; room.onMessage('pong', (m) => { pong = m; }); room.send('ping', { t: 42 }); await attendre(300);
  assert.equal(pong?.t, 42);
  await room.leave();
});

test('chaque mode a sa salle et sa carte', async () => {
  const attendu = { royale: 'royale', tournoi: 'tournoi', classe: 'tournoi', survie: 'survie', duo: 'duo' };
  for (const [salle, mode] of Object.entries(attendu)) {
    const room = silence(await new Client(WS).joinOrCreate(salle, { name: 'Testeur', jeton: 'test-jeton' }));
    await new Promise((ok) => room.onStateChange.once(ok));
    assert.equal(room.state.mode, mode, salle);
    await room.leave();
  }
});

test('salon privé : code, recherche par code, rejoindre à deux', async () => {
  const a = await new Client(WS).create('duo', { name: 'A', prive: true });
  const code = await new Promise((ok) => a.onMessage('salon', (m) => ok(m.code)));
  const info = await json(`/api/salon/${code}`);
  assert.equal(info.status, 200); assert.equal(info.body.mode, 'duo');
  const b = silence(await new Client(WS).joinById(info.body.roomId, { name: 'B' }));
  await attendre(300);
  assert.equal(a.state.players.size, 2);
  await a.leave(); await b.leave();
});

test('reconnexion : on revient dans la même partie avec le même joueur', async () => {
  const client = new Client(WS);
  const room = silence(await client.joinOrCreate('arena', { name: 'Reco' }));
  room.onMessage('choix', () => room.send('choisir', { i: 0 }));
  room.send('pret');
  await attendre(2500);
  const id = room.sessionId, fusion = room.state.players.get(id)?.fusion, jeton = room.reconnectionToken;
  room.connection.close(4999);   // coupure brutale, comme un wifi qui tombe
  await attendre(1500);
  const r2 = silence(await client.reconnect(jeton));
  await new Promise((ok) => r2.onStateChange.once(ok));
  assert.equal(r2.sessionId, id);
  assert.equal(r2.state.players.get(id)?.fusion, fusion);
  await r2.leave();
});

test('Zone Morte en coop : salon par code, monde partagé, zombies, meubles, combat', async () => {
  const msgs = (room) => { const l = []; room.onMessage('*', (t, m) => l.push([t, m])); return l; };
  const attendreMsg = async (l, t, f = () => true, ms = 4000) => { for (let i = 0; i < ms / 50; i++) { const m = l.find(([x, v]) => x === t && f(v)); if (m) return m[1]; await attendre(50); } return null; };
  const a = await new Client(WS).create('zonemorte', { nom: 'Alice', graine: 'coop' }); const la = msgs(a);
  const ia = await attendreMsg(la, 'init');
  assert.match(ia.code, /^[A-Z2-9]{4}$/); assert.ok(ia.depart && ia.graine);
  const s = await json(`/api/salon/${ia.code}`); assert.equal(s.body.mode, 'zonemorte');
  const b = await new Client(WS).joinById(s.body.roomId, { nom: 'Bob' }); const lb = msgs(b);
  assert.ok(await attendreMsg(lb, 'init'));
  // la photo montre les deux joueurs et des zombies
  const ph = await attendreMsg(lb, 'photo', (p) => p.j.length === 2);
  assert.ok(ph && Array.isArray(ph.z) && typeof ph.t === 'number');
  // Alice ouvre une porte : Bob le voit
  a.send('poser', { x: 40, y: 41, v: 10 });
  assert.ok(await attendreMsg(lb, 'poser', (m) => m.x === 40 && m.y === 41 && m.v === 10));
  // un meuble : contenu fixé par le serveur, ce qu'Alice prend disparaît pour Bob
  a.send('ouvrir', { cle: '3,4', type: 'rayon:supermarché' });
  const c = await attendreMsg(la, 'conteneur', (m) => m.cle === '3,4');
  assert.ok(c.inv.length >= 1);
  a.send('prendre', { cle: '3,4', i: 0, id: c.inv[0].id });
  assert.equal((await attendreMsg(la, 'pris')).id, c.inv[0].id);
  b.send('deposer', { cle: 'sol:5,5', id: 'eau', n: 2 });
  assert.equal((await attendreMsg(la, 'conteneur', (m) => m.cle === 'sol:5,5')).inv[0].n, 2);
  // Bob frappe dans le vide : le serveur répond quand même
  b.send('coup', { arme: 'batte', dir: 0, k: 1 });
  assert.ok(await attendreMsg(lb, 'res_coup'));
  await a.leave(); await b.leave();
});

test('journal des erreurs : une erreur de navigateur est notée et regroupée', async () => {
  const envoi = () => fetch(HTTP + '/api/erreurs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ou: 'test.js', msg: 'boum de test', version: VERSION_JEU }) });
  assert.equal((await envoi()).status, 204);
  assert.equal((await envoi()).status, 429, 'limité');
  const j = await json('/api/erreurs');
  const e = j.body.erreurs.find((x) => x.msg === 'boum de test');
  assert.ok(e && e.ou.includes('navigateur'));
});

test('une erreur dans un message ne fait pas tomber la salle', async () => {
  const room = silence(await new Client(WS).joinOrCreate('arena', { name: 'Casse' }));
  room.send('pret');
  for (const m of [{ slot: { toString: null } }, [1, 2, 3], 'texte', { i: -5 }, { e: { a: 1 } }]) for (const t of ['cast', 'upgrade', 'emote', 'input']) room.send(t, m);
  await attendre(600);
  assert.equal((await json('/api/version')).status, 200, 'le serveur répond toujours');
  room.send('ping', { t: 7 }); let ok = false; room.onMessage('pong', () => { ok = true; }); await attendre(400);
  assert.ok(ok, 'la salle répond toujours');
  await room.leave();
});
