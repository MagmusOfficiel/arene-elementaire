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

test('comptes : créer, sauvegarder, relire, refuser un mauvais code', async () => {
  const c = await json('/api/compte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Testeur', progression: { niv: 7 } }) });
  assert.equal(c.status, 200); assert.match(c.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const put = await json(`/api/compte/${c.body.code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Testeur', progression: { niv: 9 }, survie: 12 }) });
  assert.equal(put.status, 200);
  const g = await json(`/api/compte/${c.body.code.toLowerCase()}`);
  assert.equal(g.body.progression.niv, 9); assert.equal(g.body.survie, 12);
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
