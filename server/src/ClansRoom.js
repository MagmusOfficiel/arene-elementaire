// =====================================================================
//  Salle Colyseus des CLANS ÉLÉMENTAIRES : le monde partagé
//  Une seule salle publique (jusqu'à 80 joueurs) : chacun envoie sa
//  position, le serveur renvoie 8 fois par seconde la liste de tout le
//  monde (nom, clan, position, en expédition ou non). Chat général et
//  chat de clan. Le profil (cartes, ressources) reste dans le navigateur
//  du joueur ; seuls son nom, son clan et son niveau passent ici.
// =====================================================================
import colyseus from 'colyseus';
import { noterErreur } from './journal.js';

const { Room } = colyseus;
export const MONDE = { l: 1600, h: 1000 };
const CLANS = ['feu', 'eau', 'plante'], CLASSES = ['combattant', 'mage', 'tireur', 'escrimeur'];
export const DEPARTS = { feu: [330, 760], eau: [800, 190], plante: [1270, 760] };
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const propre = (t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export class ClansRoom extends Room {
  maxClients = 80;

  onCreate() {
    this.setMetadata({ mode: 'clans' });
    this.joueurs = new Map();
    const sur = (type, f) => this.onMessage(type, (client, m = {}) => {
      try { const j = this.joueurs.get(client.sessionId); if (j) f(client, m || {}, j); } catch (e) { noterErreur(`clans · ${type}`, e); }
    });
    sur('pos', (c, m, j) => {
      const x = Math.max(0, Math.min(MONDE.l, num(m.x, j.x))), y = Math.max(0, Math.min(MONDE.h, num(m.y, j.y)));
      if (Math.hypot(x - j.x, y - j.y) < 200) { j.x = x; j.y = y; }   // un saut trop grand est ignoré
      j.dir = num(m.dir) | 0;
    });
    sur('statut', (c, m, j) => { j.statut = ['libre', 'expedition', 'parcelle', 'tirage'].includes(m.s) ? m.s : 'libre'; j.niv = Math.max(1, Math.min(99, num(m.niv, j.niv) | 0)); });
    sur('chat', (c, m, j) => {
      const t = propre(m.t, 140); if (!t) return;
      if (Date.now() - (j.dernierChat || 0) < 1200) return;   // pas plus d'un message par seconde
      j.dernierChat = Date.now();
      const msg = { de: j.nom, clan: j.clan, t, canal: m.canal === 'clan' ? 'clan' : 'tous' };
      if (msg.canal === 'clan') { for (const cl of this.clients) if (this.joueurs.get(cl.sessionId)?.clan === j.clan) cl.send('chat', msg); }
      else this.broadcast('chat', msg);
    });
    this.setSimulationInterval(() => this.envoyer(), 125);
  }

  onJoin(client, o = {}) {
    const clan = CLANS.includes(o.clan) ? o.clan : 'feu', [x, y] = DEPARTS[clan];
    this.joueurs.set(client.sessionId, { nom: propre(o.nom, 16) || 'Joueur', clan, classe: CLASSES.includes(o.classe) ? o.classe : '', niv: Math.max(1, Math.min(99, num(o.niv, 1) | 0)), x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 40, dir: 0, statut: 'libre' });
    client.send('bienvenue', { id: client.sessionId });
    this.broadcast('chat', { systeme: true, t: `${this.joueurs.get(client.sessionId).nom} rejoint le ${clan === 'feu' ? 'Clan du Feu' : clan === 'eau' ? "Clan de l'Eau" : 'Clan de la Plante'}.` });
  }

  onLeave(client) { this.joueurs.delete(client.sessionId); }

  envoyer() {
    if (!this.clients.length) return;
    const liste = [];
    for (const [id, j] of this.joueurs) liste.push([id, j.nom, j.clan, Math.round(j.x), Math.round(j.y), j.dir, j.statut, j.niv, j.classe]);
    this.broadcast('monde', liste);
  }
}
