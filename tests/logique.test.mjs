// Tests de la logique de jeu : de vraies parties accélérées, dans chaque mode.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerSalle, verifierInvariants } from './outils.mjs';
import { FUSIONS, generateKit, ELEMENTS, comboEquipe, DUO } from '../shared/data.js';
import { saisonDe, resetDoux, rangDe, deltaCote } from '../shared/classe.js';
import { valideCouleur, valideCadre, EMOTES, xpPourNiveau } from '../shared/cosmetiques.js';

function partie(mode, secondes, options = {}, arret) {
  const r = creerSalle(mode, options);
  const h = r.ajouterHumain('Testeur', options.joueur || {});
  const erreurs = [];
  r.arret = arret ? () => arret(r) : null;
  r.avancer(secondes, () => { for (const e of verifierInvariants(r)) if (erreurs.length < 10) erreurs.push(`t=${r.temps.now.toFixed(0)}s ${e}`); });
  assert.deepEqual(erreurs, [], 'règles de jeu non respectées');
  return { r, h };
}

test('les 55 champions ont un kit valide', () => {
  assert.equal(Object.keys(FUSIONS).length, 55);
  for (const k of Object.keys(FUSIONS)) {
    const [a, b] = k.split('+'), kit = generateKit(a, b);
    assert.ok(kit.pv > 50 && kit.pv < 400, `${k} PV ${kit.pv}`);
    for (const s of ['basique', 'sort1', 'sort2', 'sort3', 'ultime']) {
      const sp = kit[s];
      assert.ok(sp && sp.forme, `${k} ${s} sans forme`);
      assert.ok(ELEMENTS[sp.element], `${k} ${s} élément inconnu ${sp.element}`);
      for (const [c, v] of Object.entries(sp)) if (typeof v === 'number') assert.ok(Number.isFinite(v) && v >= 0, `${k} ${s}.${c} = ${v}`);
      if (s !== 'ultime') assert.ok(sp.cd > 0, `${k} ${s} sans recharge`);
    }
  }
});

test('monde ouvert : combats, zombies, niveaux', () => {
  const { r, h } = partie('melee', 90);
  assert.ok(r.state.players.size >= 4, 'des bots ont rejoint');
  assert.ok(r.trouver('kill').length + r.trouver('zdie').length > 0, 'il y a eu des éliminations');
  assert.ok([...r.state.players.values()].some((p) => p.lvl > 1), 'quelqu’un a pris un niveau');
});

test('battle royale : file d’attente, 50 joueurs, un vainqueur', () => {
  const { r } = partie('royale', 480, {}, (s) => s.trouver('win').length > 0);
  assert.ok(r.trouver('win').length > 0, 'la partie se termine par une victoire');
});

test('tournoi : duels jusqu’au champion, sans niveaux', () => {
  const { r } = partie('tournoi', 600, {}, (s) => s.trouver('win').length > 0);
  assert.ok(r.trouver('win').length > 0, 'un champion du tournoi');
  assert.ok([...r.state.players.values()].every((p) => p.lvl === 1), 'pas de niveaux en tournoi');
});

test('classé : la cote du joueur est mise à jour à la fin', () => {
  const { r, h } = partie('tournoi', 600, { classe: true, joueur: { cote: 1200 } }, (s) => s.trouver('cote', (m) => !m.init).length > 0);
  const res = r.trouver('cote', (m) => !m.init);
  assert.ok(res.length > 0, 'résultat de cote envoyé');
  assert.ok(Number.isFinite(res[0].msg.cote) && Math.abs(res[0].msg.delta) < 80);
});

test('survie : les vagues s’enchaînent et durcissent', () => {
  const { r } = partie('survie', 240, {}, (s) => s.trouver('survieFin').length > 0);
  const vagues = r.trouver('vague');
  assert.ok(vagues.length >= 2 || r.trouver('survieFin').length > 0, 'au moins deux vagues ou une fin de partie');
});

test('duo 2v2 : équipes, combos, 3 manches gagnantes', () => {
  const { r } = partie('duo', 400, {}, (s) => s.trouver('win').length > 0);
  const eqs = [...r.state.players.values()].map((p) => p.eq).sort().join('');
  assert.equal(eqs, '1122', 'deux équipes de deux');
  const w = r.trouver('win');
  assert.ok(w.length > 0 && w[0].msg.duo, 'un match se termine');
  assert.ok(Math.max(r.state.sA, r.state.sB) >= DUO.gagner || r.state.phase === 'fin' || r.state.phase === 'attente');
  assert.ok(comboEquipe('eau', 'eclair').nom === 'Électrocution' && comboEquipe('feu', 'feu') === null);
});

test('ultimes annoncés : la zone s’affiche avant l’impact', () => {
  const r = creerSalle('melee'); const h = r.ajouterHumain();
  const p = r.state.players.get(h), e = r.ent.get(h);
  e.kit = generateKit('eclair', 'terre'); Object.assign(p, { alive: true, locked: 0, ult: 100 });
  r.handlers.cast(r.clients[0], { slot: 'ultime', x: p.x + 100, y: p.y });
  assert.equal(r.trouver('annonce').length, 1);
  assert.equal(r.trouver('ult').length, 0, 'pas encore déclenché');
  r.update(0.25); r.update(0.25);
  assert.equal(r.trouver('ult').length, 1, 'déclenché après l’annonce');
});

test('emotes : limitées à une toutes les 1,5 s, refusées si inconnues', () => {
  const r = creerSalle('melee'); const h = r.ajouterHumain();
  r.envoyer(h, 'emote', { e: 'gg' }); r.envoyer(h, 'emote', { e: 'gg' }); r.envoyer(h, 'emote', { e: 'nimporte' });
  assert.equal(r.trouver('emote').length, 1);
  r.avancer(1.6); r.envoyer(h, 'emote', { e: EMOTES[1].id });
  assert.equal(r.trouver('emote').length, 2);
});

test('saisons, rangs et cosmétiques', () => {
  assert.equal(saisonDe(Date.UTC(2026, 10, 16)).n, 1);
  assert.equal(saisonDe(Date.UTC(2027, 0, 5)).n, 3);
  assert.equal(resetDoux(1600), 1300);
  assert.equal(rangDe(1610).nom, 'Diamant');
  assert.ok(deltaCote(1, 1000) > 0 && deltaCote(5, 1500) < 0);
  assert.equal(valideCouleur('or'), 'or'); assert.equal(valideCouleur('<script>'), '');
  assert.equal(valideCadre('rang_maitre'), 'rang_maitre'); assert.equal(valideCadre('xx'), '');
  assert.ok(xpPourNiveau(1) > 0 && xpPourNiveau(50) > xpPourNiveau(1));
});

test('un joueur qui envoie n’importe quoi ne casse pas la partie', () => {
  const r = creerSalle('melee'); const h = r.ajouterHumain();
  for (const m of [null, 5, 'x', {}, { slot: 'ultime' }, { slot: 'inconnu', x: NaN, y: Infinity }, { u: 1, d: 'oui' }]) {
    for (const type of ['input', 'cast', 'upgrade', 'emote', 'ping']) assert.doesNotThrow(() => r.envoyer(h, type, m), `${type} ${JSON.stringify(m)}`);
  }
  r.avancer(3);
  assert.deepEqual(verifierInvariants(r), []);
});

test('choix du champion : 3 fusions, hors d’atteinte pendant le choix, gardé pour le match', () => {
  // Battle royale : on choisit pendant la file d'attente, la partie attend, le champion est gardé au départ
  const r = creerSalle('royale');
  const c = { sessionId: 'h', send(type, msg) { r.messages.push({ type, msg, a: 'h' }); } };
  r.clients.push(c); r.onJoin(c, { name: 'Choix' }); r.handlers.pret(c);
  const choix = r.trouver('choix')[0]?.msg;
  assert.ok(choix && choix.props.length === 3, '3 propositions');
  assert.equal(new Set(choix.props.map((p) => p.fusion)).size, 3, 'trois fusions différentes');
  assert.equal(r.state.players.get('h').alive, false, 'pas sur la carte pendant le choix (on ne peut pas le toucher)');
  for (let i = 0; i < 160; i++) r.update(0.05);   // 8 s : plus que la file d'attente en solo
  assert.equal(r.state.phase, 'attente', 'la partie attend que le joueur ait choisi');
  r.handlers.choisir(c, { i: 2 });
  const p = r.state.players.get('h');
  assert.ok(p.alive && p.fusion === choix.props[2].fusion, 'le champion choisi apparaît');
  assert.equal(r.trouver('roll')[0].msg.choisi, true);
  for (let i = 0; i < 400 && r.state.phase === 'attente'; i++) r.update(0.05);
  assert.equal(r.state.phase, 'jeu');
  assert.equal(r.state.players.get('h').fusion, choix.props[2].fusion, 'même champion pour tout le match');
});

test('choix du champion : nouveau choix à chaque vie en monde ouvert, choix automatique si on ne répond pas', () => {
  const r = creerSalle('melee');
  const c = { sessionId: 'h', send(type, msg) { r.messages.push({ type, msg, a: 'h' }); } };
  r.clients.push(c); r.onJoin(c, { name: 'Choix' }); r.handlers.pret(c);
  for (let i = 0; i < 260; i++) r.update(0.05);   // 13 s sans répondre
  const p = r.state.players.get('h');
  assert.ok(p.alive, 'choix automatique au bout de 12 s');
  const n = r.trouver('choix').length;
  r.die(p, 'h', null);
  r.autoChoix = false;   // l'outil de test ne choisit pas à notre place
  const avant = r.ent.get('h');
  for (let t = 0; t < 12 && r.trouver('choix').length === n; t += 0.5) { r.avancer(0.5); if (avant.choix) break; }
  assert.equal(r.trouver('choix').length, n + 1, 'nouvelle proposition à la réapparition');
  assert.equal(r.state.players.get('h').alive, false);
  r.handlers.choisir(c, { i: 'n’importe quoi' });
  assert.ok(r.state.players.get('h').alive, 'une réponse invalide prend la première proposition');
});

// ---------- Nouveaux sorts : étourdissement, murs, soin, invocations ----------
function salleDuel(f1, f2) {
  const r = creerSalle('melee'); r.updateZombies = () => {}; r.updateEvents = () => {};
  r.state.players.clear(); r.ent.clear(); r.state.zombies.clear();
  const ids = [];
  [f1, f2].forEach((k, i) => {
    r.addBot(); const id = `bot_${r.botSeq - 1}`; ids.push(id);
    const p = r.state.players.get(id), e = r.ent.get(id), [a, b] = k.split('+');
    e.kit = generateKit(a, b); e.bot = false;   // pas d'IA : on pilote à la main
    Object.assign(p, { a, b, fusion: e.kit.fusion, maxHp: e.kit.pv, hp: e.kit.pv, locked: 0, alive: true, x: 2800 + i * 200, y: 2100 });
  });
  return { r, ids };
}

test('étourdissement : ni déplacement ni sort, puis immunité', () => {
  const { r, ids: [a, b] } = salleDuel('metal+terre', 'feu+vent');
  const pb = r.state.players.get(b), eb = r.ent.get(b);
  r.hit(a, pb, b, 5, ['etourdi'], 0, 0, 'metal');
  assert.ok(pb.stun > 0, 'étourdi');
  const x0 = pb.x; eb.input = { r: true };
  r.cast(b, 'sort1', pb.x + 200, pb.y);
  assert.equal(eb.cds.sort1, 0, 'aucun sort lancé pendant l’étourdissement');
  for (let i = 0; i < 6; i++) r.update(0.05);
  assert.ok(Math.abs(pb.x - x0) < 2, 'ne bouge pas');
  for (let i = 0; i < 20; i++) r.update(0.05);
  assert.equal(pb.stun, 0, 'l’étourdissement s’arrête');
  r.hit(a, pb, b, 5, ['etourdi'], 0, 0, 'metal');
  assert.equal(pb.stun, 0, 'immunité juste après');
});

test('mur : bloque les déplacements et les projectiles ennemis, disparaît ensuite', () => {
  const { r, ids: [a, b] } = salleDuel('terre+terre', 'feu+vent');
  const pa = r.state.players.get(a), pb = r.state.players.get(b);
  pb.x = pa.x + 400; pb.y = pa.y;
  r.cast(a, 'sort3', pa.x + 200, pa.y);
  assert.ok(r.murs.size >= 5, 'piliers posés');
  // b avance vers a : il doit s'arrêter devant le mur
  r.ent.get(b).input = { l: true };
  for (let i = 0; i < 40; i++) r.update(0.05);
  assert.ok(pb.x > pa.x + 200, `b est bloqué par le mur (x=${Math.round(pb.x - pa.x)})`);
  // un projectile de b vers a s'arrête sur le mur
  const hpA = pa.hp; r.spawnProjectile(b, pb.x, pb.y, Math.PI, { dmg: 30, speed: 900, radius: 10, range: 700, element: 'feu', tags: [] });
  for (let i = 0; i < 20; i++) r.update(0.05);
  assert.equal(pa.hp, hpA, 'le projectile ennemi est arrêté');
  for (let i = 0; i < 80; i++) r.update(0.05);
  assert.equal(r.murs.size, 0, 'le mur disparaît');
});

test('cercle de soin : soigne le lanceur ; invocation : le totem tire sur l’ennemi', () => {
  const { r, ids: [a, b] } = salleDuel('lumiere+nature', 'feu+vent');
  const pa = r.state.players.get(a), pb = r.state.players.get(b);
  pa.hp = 40; pa.ult = 100; pb.x = pa.x + 1500;
  r.cast(a, 'ultime', pa.x, pa.y);
  assert.ok(pa.shield > 0, 'bouclier du sanctuaire');
  for (let i = 0; i < 40; i++) r.update(0.05);
  assert.ok(pa.hp > 70, `soigné (${Math.round(pa.hp)} PV)`);
  const { r: r2, ids: [c, d] } = salleDuel('eau+feu', 'feu+vent');
  const pc = r2.state.players.get(c), pd = r2.state.players.get(d), hpD = pd.hp;
  r2.cast(c, 'sort3', pd.x - 100, pd.y);
  for (let i = 0; i < 60; i++) r2.update(0.05);
  assert.ok(pd.hp < hpD, 'le totem a touché l’ennemi');
});
