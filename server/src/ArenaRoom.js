import colyseus from 'colyseus';
import { ArenaLogic } from '../../shared/game/ArenaLogic.js';
import { statFusion, statJoueur, coteDe, majCote, partieSurvie } from './stats.js';

const { Room } = colyseus;

// La salle Colyseus réutilise toute la logique de shared/game/ArenaLogic.js
export class ArenaRoom extends Room {
  maxClients = 16;
}
for (const k of Object.getOwnPropertyNames(ArenaLogic.prototype)) {
  if (k !== 'constructor') ArenaRoom.prototype[k] = ArenaLogic.prototype[k];
}
const baseCreate = ArenaLogic.prototype.onCreate;
ArenaRoom.prototype.onCreate = function (options) {
  this.stats = { fusion: statFusion, joueur: statJoueur, cote: majCote, survie: partieSurvie };
  this.maxClients = options?.mode === 'royale' ? 50 : options?.mode === 'tournoi' ? 8 : options?.mode === 'survie' || options?.mode === 'duo' ? 4 : 16;
  if (options?.prive) {
    // Salon privé : invisible du matchmaking, on le rejoint avec son code
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.salonCode = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
    this.setPrivate(true);
    this.setMetadata({ code: this.salonCode, mode: options.mode || 'melee' });
  }
  return baseCreate.call(this, options);
};

// Mode classé : la cote enregistrée sur le serveur fait foi (pas celle envoyée par le navigateur)
const baseJoin = ArenaLogic.prototype.onJoin;
ArenaRoom.prototype.onJoin = function (client, options = {}) {
  const c = coteDe(String(options.jeton || ''));
  // jeton inconnu : on reprend la cote du navigateur (parties hors-ligne), plafonnée pour éviter la triche
  return baseJoin.call(this, client, { ...options, cote: c ? c.cote : Math.min(Number(options.cote) || 1000, 1200) });
};
