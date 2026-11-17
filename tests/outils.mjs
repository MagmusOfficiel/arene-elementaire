// Outils de test : une salle de jeu complète qui tourne sans réseau ni navigateur.
// Les « humains » sont pilotés par l'IA des bots, pour jouer de vraies parties accélérées.
import { ArenaLogic } from '../shared/game/ArenaLogic.js';
import { ARENA, insideBuilding } from '../shared/data.js';

export function creerSalle(mode = 'melee', options = {}) {
  const r = Object.create(ArenaLogic.prototype);
  const temps = { now: 0, minuteurs: [] };
  r.messages = [];          // tout ce qui est envoyé (diffusé ou à un joueur)
  r.clients = [];
  Object.assign(r, {
    setState(s) { this.state = s; }, setPatchRate() {}, setSimulationInterval() {},
    onMessage(t, cb) { (this.handlers ||= {})[t] = cb; },
    broadcast(type, msg) { r.messages.push({ type, msg, a: '*' , t: temps.now }); },
    clock: { setTimeout(f, ms) { temps.minuteurs.push([temps.now + ms / 1000, f]); } },
  });
  r.onCreate({ mode, solo: true, ...options });
  r.ajouterHumain = (nom = 'Humain', opts = {}) => {
    const id = `h${r.clients.length}`;
    const c = { sessionId: id, send(type, msg) { r.messages.push({ type, msg, a: id, t: temps.now }); } };
    r.clients.push(c);
    r.onJoin(c, { name: nom, ...opts });
    r.handlers.pret?.(c);
    return id;
  };
  r.envoyer = (id, type, msg) => r.handlers[type]?.(r.clients.find((c) => c.sessionId === id), msg);
  // Avance la partie de `sec` secondes (pas de 50 ms) ; les humains jouent comme des bots
  r.avancer = (sec, chaqueSeconde) => {
    const pas = 0.05;
    for (let t = 0; t < sec; t += pas) {
      for (const c of r.clients) { const p = r.state.players.get(c.sessionId), e = r.ent.get(c.sessionId); if (e?.choix && r.autoChoix !== false) r.choisir(c.sessionId, 0); if (p?.alive && e) r.botThink(p, c.sessionId, e, pas); }
      r.update(pas); temps.now += pas;
      const prets = temps.minuteurs.filter(([w]) => w <= temps.now); temps.minuteurs = temps.minuteurs.filter(([w]) => w > temps.now); prets.forEach(([, f]) => f());
      if (chaqueSeconde && Math.abs(temps.now % 1) < pas / 2) chaqueSeconde(temps.now);
      if (r.arret?.()) break;
    }
  };
  r.temps = temps;
  r.trouver = (type, filtre = () => true) => r.messages.filter((m) => (m.type === type || m.msg?.t === type) && filtre(m.msg));
  return r;
}

// Règles qui doivent toujours être vraies pendant une partie
export function verifierInvariants(r) {
  const erreurs = [];
  r.state.players.forEach((p, id) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) erreurs.push(`${id} position invalide`);
    if (p.x < 0 || p.y < 0 || p.x > ARENA.width || p.y > ARENA.height) erreurs.push(`${id} hors de la carte (${p.x}, ${p.y})`);
    if (!Number.isFinite(p.hp) || p.hp < 0 || p.hp > p.maxHp + 0.01) erreurs.push(`${id} PV invalides ${p.hp}/${p.maxHp}`);
    if (p.alive && p.locked <= 0 && insideBuilding(p.x, p.y, 4, r.blds)) erreurs.push(`${id} coincé dans un obstacle`);
    if (p.ult < 0 || p.ult > 100) erreurs.push(`${id} jauge d'ultime ${p.ult}`);
  });
  if (r.projs.size > 600) erreurs.push(`trop de projectiles (${r.projs.size})`);
  if (r.state.zombies.size > 120) erreurs.push(`trop de monstres (${r.state.zombies.size})`);
  return erreurs;
}
