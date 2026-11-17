// Salle Colyseus du Conclave des éléments : tour par tour, quelques messages par phase.
// Pas d'état synchronisé automatiquement : chaque joueur reçoit SA vue (sa main, son rôle)
// et rien d'autre, pour qu'on ne puisse pas tricher en lisant les données du navigateur.
import colyseus from 'colyseus';
import { Partie } from '../../shared/conclave/partie.js';
import { CONCLAVE } from '../../shared/conclave/regles.js';
import { noterErreur } from './journal.js';
import { partieConclave } from './stats.js';
import { valideCouleur } from '../../shared/cosmetiques.js';

const { Room } = colyseus;
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class ConclaveRoom extends Room {
  maxClients = CONCLAVE.maxJoueurs;

  onCreate(options = {}) {
    this.code = Array.from({ length: 4 }, () => LETTRES[Math.floor(Math.random() * LETTRES.length)]).join('');
    const pub = !!options.public && !options.tuto;
    this.partie = new Partie({ code: this.code, options: { bonnes: options.bonnes === 3 ? 3 : 2, tuto: !!options.tuto, public: pub } });
    this.setPrivate(!pub);
    this.setMetadata({ code: this.code, mode: 'conclave' });
    this.envoyee = -1;
    const P = this.partie;
    const sur = (type, f) => this.onMessage(type, (client, m = {}) => {
      try {
        const err = f(client, m || {});
        if (err) client.send('refus', { texte: err });
      } catch (e) { noterErreur(`conclave · ${type}`, e); }
      this.diffuser();
    });
    sur('action', (c, m) => P.action(c.sessionId, String(m.type || ''), m));
    sur('champion', (c, m) => P.choisirChampion(c.sessionId, m.fusion ?? null));
    sur('bot', (c, m) => (c.sessionId !== P.hote ? 'Seul l’hôte gère les bots.' : m.retirer ? P.retirerBot() : P.ajouterBot()));
    sur('option', (c, m) => {
      if (c.sessionId !== P.hote || P.phase !== 'salon') return 'Seul l’hôte règle la partie, avant de la lancer.';
      if (m.bonnes === 2 || m.bonnes === 3) P.options.bonnes = m.bonnes;
      if ([60, 90, 120].includes(m.debat)) P.options.debat = m.debat;
      P.changer();
    });
    sur('demarrer', (c) => { const e = P.demarrer(c.sessionId); if (!e) this.lock(); return e; });
    // horloge : 4 fois par seconde (largement assez pour du tour par tour)
    this.clock.setInterval(() => {
      try { P.tick(0.25); } catch (e) { noterErreur('conclave · tick', e); }
      if (P.phase !== 'salon' && !this.locked) this.lock();   // partie lancée (aussi par la file publique) : plus personne n'entre
      if (P.phase === 'fin' && !this.enregistree) {
        this.enregistree = true;
        try { partieConclave(P.fin, P.bilan(), P.options); } catch (e) { noterErreur('conclave · stats', e); }
      }
      this.diffuser();
    }, 250);
    // le minuteur affiché descend même sans changement : on renvoie les vues chaque seconde
    this.clock.setInterval(() => { if (P.phase !== 'salon') P.changer(); }, 1000);
  }

  diffuser() {
    const P = this.partie;
    if (P.version === this.envoyee) return;
    this.envoyee = P.version;
    for (const c of this.clients) c.send('vue', P.vue(c.sessionId));
  }

  onJoin(client, options = {}) {
    const e = this.partie.ajouter(client.sessionId, options.nom);
    if (e) throw new Error(e);
    const j = this.partie.joueurs.get(client.sessionId);
    if (j && typeof options.compte === 'string' && /^[A-Z0-9-]{9}$/.test(options.compte)) j.compte = options.compte;
    if (options.champion) this.partie.choisirChampion(client.sessionId, options.champion);
    if (j && typeof options.couleur === 'string') j.couleur = valideCouleur(options.couleur);   // couleur de nom gagnée dans l'Arène
    this.diffuser();
  }

  async onLeave(client, consenti) {
    const P = this.partie;
    if (consenti || P.phase === 'salon' || P.phase === 'fin') { P.retirer(client.sessionId); this.diffuser(); return; }
    // coupure : on garde sa place, sa main et son rôle pendant 60 s
    const j = P.joueurs.get(client.sessionId);
    if (j) { j.connecte = false; P.changer(); this.diffuser(); }
    try {
      await this.allowReconnection(client, CONCLAVE.reconnexion);
      if (j) { j.connecte = true; P.changer(); }
      this.envoyee = -1; this.diffuser();
    } catch {
      P.retirer(client.sessionId); this.diffuser();   // ses cartes seront jouées au hasard par les minuteurs
    }
  }
}
