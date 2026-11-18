// =====================================================================
//  Salle Colyseus des CLANS ÉLÉMENTAIRES : le monde partagé
//  Une seule salle publique (jusqu'à 80 joueurs) : chacun envoie sa
//  position, le serveur renvoie 8 fois par seconde la liste de tout le
//  monde (nom, clan, position, en expédition ou non). Chat général et
//  chat de clan. Le profil (cartes, ressources) reste dans le navigateur
//  du joueur ; seuls son nom, son clan et son niveau passent ici.
//  Phase 2 : les filons rares (le serveur les fait pousser et décide qui
//  les ramasse) et les duels (le serveur fait tourner le combat de cartes :
//  on peut défier un joueur d'un autre clan qui se trouve sur SON territoire).
// =====================================================================
import colyseus from 'colyseus';
import { noterErreur } from './journal.js';
import { territoireDe, obstacles, praticable, CENTRES, MONDE as GEO } from '../../shared/clans/geo.js';
import { nouveauDuel, jouer as jouerDuel, finTour as finTourDuel, vue as vueDuel, deckValide, PV_DUEL } from '../../shared/clans/duel.js';
import { BUTIN_DUEL } from '../../shared/clans/profil.js';

const { Room } = colyseus;
export const MONDE = GEO;
const CLANS = ['feu', 'eau', 'plante'], CLASSES = ['combattant', 'mage', 'tireur', 'escrimeur'];
export const DEPARTS = Object.fromEntries(Object.entries(CENTRES).map(([k, [x, y]]) => [k, [x, y + 40]]));
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
    sur('statut', (c, m, j) => { if (j.duel) return; j.statut = ['libre', 'expedition', 'parcelle', 'tirage'].includes(m.s) ? m.s : 'libre'; j.niv = Math.max(1, Math.min(99, num(m.niv, j.niv) | 0)); });
    sur('chat', (c, m, j) => {
      const t = propre(m.t, 140); if (!t) return;
      if (Date.now() - (j.dernierChat || 0) < 1200) return;   // pas plus d'un message par seconde
      j.dernierChat = Date.now();
      const msg = { de: j.nom, clan: j.clan, t, canal: m.canal === 'clan' ? 'clan' : 'tous' };
      if (msg.canal === 'clan') { for (const cl of this.clients) if (this.joueurs.get(cl.sessionId)?.clan === j.clan) cl.send('chat', msg); }
      else this.broadcast('chat', msg);
    });
    // ---------- profil de combat (deck, PV, essence pour le butin) ----------
    sur('profil', (c, m, j) => {
      if (deckValide(m.deck)) j.deck = m.deck.map((k) => ({ id: k.id, niv: k.niv || 1 }));
      j.pvMax = PV_DUEL(m.pvMax, j.classe); j.essence = Math.max(0, Math.min(1e7, num(m.essence)));
    });
    // ---------- filons rares ----------
    this.obs = obstacles(); this.filons = new Map(); this.nFilon = 0;
    for (let i = 0; i < 12; i++) this.pousser();
    this.clock.setInterval(() => { if (this.filons.size < 15) { this.pousser(); this.broadcast('filons', this.listeFilons()); } }, 20000);
    sur('ramasser', (c, m, j) => {
      const f = this.filons.get(String(m.id));
      if (!f || Math.hypot(j.x - f.x, j.y - f.y) > 50 || j.duel) return;
      this.filons.delete(f.id);
      c.send('ramasse', { terr: f.terr, n: 1 });
      this.broadcast('filons', this.listeFilons());
    });
    // ---------- duels ----------
    this.duels = new Map();   // sessionId -> duel
    sur('defier', (c, m, j) => {
      const cible = this.joueurs.get(String(m.cible)), cl = this.clients.find((x) => x.sessionId === String(m.cible));
      const refus = (t) => c.send('info', { t });
      if (!cible || !cl) return refus('Ce joueur est parti.');
      if (j.duel || cible.duel) return refus('Un duel est déjà en cours.');
      if (cible.clan === j.clan) return refus('On ne défie pas quelqu’un de son propre clan.');
      if (territoireDe(cible.x, cible.y) !== j.clan) return refus('Tu ne peux défier un ennemi que sur le territoire de ton clan.');
      if (Math.hypot(cible.x - j.x, cible.y - j.y) > 110) return refus('Approche-toi d’abord.');
      if (cible.statut === 'expedition') return refus(`${cible.nom} est en expédition : impossible de le défier maintenant.`);
      const t = Date.now();
      if ((cible.protege || 0) > t) return refus(`${cible.nom} sort d'un duel : il est protégé encore ${Math.ceil((cible.protege - t) / 1000)} s.`);
      if ((j.protege || 0) > t) return refus('Tu sors d’un duel : reprends ton souffle un instant.');
      if (!j.deck || !cible.deck) return refus('Deck introuvable, réessaie dans un instant.');
      this.lancerDuel(c, j, cl, cible);
    });
    sur('duelJouer', (c, m, j) => { const x = this.duels.get(c.sessionId); if (x && jouerDuel(x.d, x.ids.indexOf(c.sessionId), Math.floor(num(m.i, -1)))) this.majDuel(x); });
    sur('duelFin', (c, m, j) => { const x = this.duels.get(c.sessionId); if (x && finTourDuel(x.d, x.ids.indexOf(c.sessionId))) this.majDuel(x); });
    sur('duelAbandon', (c) => { const x = this.duels.get(c.sessionId); if (x) this.terminerDuel(x, 1 - x.ids.indexOf(c.sessionId), 'abandon'); });

    this.setSimulationInterval(() => this.envoyer(), 125);
  }

  // un filon rare dans un territoire, loin du village et sur un sol praticable
  pousser() {
    const terrs = Object.keys(CENTRES), terr = terrs[this.nFilon % 3];
    for (let essai = 0; essai < 60; essai++) {
      const x = 40 + Math.random() * (GEO.l - 80), y = 40 + Math.random() * (GEO.h - 80);
      if (territoireDe(x, y) !== terr || Math.hypot(x - CENTRES[terr][0], y - CENTRES[terr][1]) < 420 || !praticable(x, y, this.obs)) continue;
      const id = `f${++this.nFilon}`; this.filons.set(id, { id, terr, x: Math.round(x), y: Math.round(y) }); return;
    }
    this.nFilon++;
  }
  listeFilons() { return [...this.filons.values()]; }

  lancerDuel(ca, a, cb, b) {
    const d = nouveauDuel({ nom: a.nom, clan: a.clan, classe: a.classe, pvMax: a.pvMax, deck: a.deck }, { nom: b.nom, clan: b.clan, classe: b.classe, pvMax: b.pvMax, deck: b.deck }, (Math.random() * 1e9) >>> 0);
    const x = { d, ids: [ca.sessionId, cb.sessionId], clients: [ca, cb], noms: [a.nom, b.nom], essence: [a.essence || 0, b.essence || 0], tourVu: 0, limite: 0 };
    a.duel = b.duel = true; a.statut = b.statut = 'duel';
    this.duels.set(ca.sessionId, x); this.duels.set(cb.sessionId, x);
    cb.send('info', { t: `⚔️ ${a.nom} t'attaque sur le territoire de son clan !` });
    this.broadcast('chat', { systeme: true, t: `⚔️ ${a.nom} défie ${b.nom} en duel !` });
    this.majDuel(x);
  }
  majDuel(x) {
    if (x.d.fini) return this.terminerDuel(x, x.d.gagnant, 'pv');
    if (x.d.tour !== x.tourVu) {            // un nouveau tour : 40 secondes pour jouer
      x.tourVu = x.d.tour; x.minuteur?.clear();
      x.minuteur = this.clock.setTimeout(() => { if (!x.d.fini) { finTourDuel(x.d, x.d.actif); this.majDuel(x); } }, 40000);
      x.limite = Date.now() + 40000;
    }
    x.clients.forEach((c, q) => c.send('duel', { ...vueDuel(x.d, q), limite: x.limite }));
  }
  terminerDuel(x, gagnant, raison) {
    if (x.fin) return; x.fin = true; x.minuteur?.clear();
    const butin = gagnant === null ? 0 : BUTIN_DUEL(x.essence[1 - gagnant]);
    x.clients.forEach((c, q) => {
      const issue = gagnant === null ? 'nul' : gagnant === q ? 'victoire' : 'defaite';
      c.send('duelResultat', { issue, butin: issue === 'victoire' ? butin : issue === 'defaite' ? -butin : 0, adv: x.noms[1 - q], raison, vue: vueDuel(x.d, q) });
      this.duels.delete(c.sessionId);
      const j = this.joueurs.get(c.sessionId);
      if (j) { j.duel = false; j.statut = 'libre'; j.protege = Date.now() + 120000; j.essence = Math.max(0, (j.essence || 0) + (issue === 'victoire' ? butin : issue === 'defaite' ? -butin : 0)); }
    });
    this.broadcast('chat', { systeme: true, t: gagnant === null ? `Le duel entre ${x.noms[0]} et ${x.noms[1]} se termine sur une égalité.` : `🏆 ${x.noms[gagnant]} a vaincu ${x.noms[1 - gagnant]} en duel${raison === 'abandon' ? ' (abandon)' : raison === 'depart' ? ' (fuite)' : ''} !` });
  }

  onJoin(client, o = {}) {
    const clan = CLANS.includes(o.clan) ? o.clan : 'feu', [x, y] = DEPARTS[clan];
    client.send('filons', this.listeFilons());
    this.joueurs.set(client.sessionId, { nom: propre(o.nom, 16) || 'Joueur', clan, classe: CLASSES.includes(o.classe) ? o.classe : '', niv: Math.max(1, Math.min(99, num(o.niv, 1) | 0)), x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 40, dir: 0, statut: 'libre' });
    const jj = this.joueurs.get(client.sessionId);
    if (deckValide(o.deck)) jj.deck = o.deck.map((k) => ({ id: k.id, niv: k.niv || 1 }));
    jj.pvMax = PV_DUEL(o.pvMax, jj.classe); jj.essence = Math.max(0, Math.min(1e7, num(o.essence)));
    client.send('bienvenue', { id: client.sessionId });
    this.broadcast('chat', { systeme: true, t: `${this.joueurs.get(client.sessionId).nom} rejoint le ${clan === 'feu' ? 'Clan du Feu' : clan === 'eau' ? "Clan de l'Eau" : 'Clan de la Plante'}.` });
  }

  onLeave(client) {
    const x = this.duels.get(client.sessionId);
    if (x) this.terminerDuel(x, 1 - x.ids.indexOf(client.sessionId), 'depart');   // fuir un duel, c'est le perdre
    this.joueurs.delete(client.sessionId);
  }

  envoyer() {
    if (!this.clients.length) return;
    const liste = [];
    for (const [id, j] of this.joueurs) liste.push([id, j.nom, j.clan, Math.round(j.x), Math.round(j.y), j.dir, j.statut, j.niv, j.classe]);
    this.broadcast('monde', liste);
  }
}
