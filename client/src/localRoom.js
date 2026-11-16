// =====================================================================
//  Salle locale : fait tourner toute la logique du jeu dans le navigateur.
//  Même interface qu'une salle Colyseus (state, sessionId, send, onMessage, onLeave)
//  -> le jeu marche sans serveur (Netlify, hors-ligne), contre les mannequins et les zombies.
// =====================================================================
import { ArenaLogic } from '../../shared/game/ArenaLogic.js';

export class LocalRoom {
  constructor(mode, name, titre = '', extra = {}) {
    this.sessionId = 'local';
    this.handlers = {};
    this.queue = [];                // messages émis avant que le client écoute
    const self = this;
    const L = Object.create(ArenaLogic.prototype);
    const timers = [];
    Object.assign(L, {
      clients: [{ sessionId: 'local', send: (t, m) => self.emit(t, m) }],
      broadcast: (t, m) => self.emit(t, m),
      clock: { setTimeout: (f, ms) => { const h = setTimeout(f, ms); timers.push(h); return h; } },
      setState(s) { this.state = s; },
      setPatchRate() {},
      onMessage(t, cb) { (this.msg ||= {})[t] = cb; },
      // Temps réel : si le navigateur prend du retard, on rattrape par pas de 50 ms (max 6 pas)
      setSimulationInterval(cb, ms) {
        let last = performance.now(), acc = 0;
        self.loop = setInterval(() => {
          const now = performance.now(); acc += now - last; last = now;
          let n = 0;
          while (acc >= ms && n < 6) { cb(ms); acc -= ms; n++; }
          if (n === 6) acc = 0;
        }, ms / 2);
      },
    });
    L.onCreate({ mode: mode === 'classe' ? 'tournoi' : ['royale', 'tournoi', 'survie', 'duo'].includes(mode) ? mode : 'melee', classe: mode === 'classe', solo: true });
    L.onJoin(L.clients[0], { name, titre, ...extra });
    this.logic = L;
    this.state = L.state;
    this.timers = timers;
  }

  emit(type, msg) {
    const h = this.handlers[type];
    if (h) h(msg); else this.queue.push([type, msg]);
  }

  onMessage(type, cb) {
    this.handlers[type] = cb;
    const pending = this.queue.filter(([t]) => t === type);
    this.queue = this.queue.filter(([t]) => t !== type);
    pending.forEach(([, m]) => cb(m));
  }

  send(type, msg) { this.logic.msg?.[type]?.(this.logic.clients[0], msg); }
  onLeave(cb) { this.leaveCb = cb; }
  leave() { clearInterval(this.loop); this.timers.forEach(clearTimeout); this.leaveCb?.(); }
}
