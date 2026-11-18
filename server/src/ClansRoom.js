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
import { BOSS_MONDIAUX, MONDIAL, POINTS, NOMS_CLANS, PALIER_MONDIAL, pvMondial, pvManche, degatsValides, recompenseMondial } from '../../shared/clans/mondial.js';
import { pointsClan, classementClans } from './stats.js';
import { retrouver, enregistrer, ACTIONS, signer } from './clansProfils.js';
import * as P from '../../shared/clans/profil.js';
import { rejouer } from '../../shared/clans/combat.js';
import * as Q from '../../shared/clans/quetes.js';
import { RARES } from '../../shared/clans/cartes.js';

const { Room } = colyseus;
export const MONDE = GEO;
const CLANS = ['feu', 'eau', 'plante'], CLASSES = ['combattant', 'mage', 'tireur', 'escrimeur'];
export const DEPARTS = Object.fromEntries(Object.entries(CENTRES).map(([k, [x, y]]) => [k, [x, y + 40]]));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const codeParcelle = (pc) => { const v = (k) => Math.max(1, Math.min(5, num(pc?.[k], 1) | 0)); return v('maison') * 100 + v('autel') * 10 + v('atelier'); };
const propre = (t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export class ClansRoom extends Room {
  maxClients = 80;

  onCreate() {
    this.setMetadata({ mode: 'clans' });
    this.joueurs = new Map();
    const sur = (type, f) => this.onMessage(type, (client, m = {}) => {
      try { const j = this.joueurs.get(client.sessionId); if (j?.p) f(client, m || {}, j); } catch (e) { noterErreur(`clans · ${type}`, e); }
    });
    sur('pos', (c, m, j) => {
      const x = Math.max(0, Math.min(MONDE.l, num(m.x, j.x))), y = Math.max(0, Math.min(MONDE.h, num(m.y, j.y)));
      if (Math.hypot(x - j.x, y - j.y) < 200) { j.x = x; j.y = y; }   // un saut trop grand est ignoré
      j.dir = num(m.dir) | 0;
    });
    sur('statut', (c, m, j) => { if (j.duel) return; j.statut = ['libre', 'expedition', 'parcelle', 'tirage'].includes(m.s) ? m.s : 'libre'; if (j.manche) j.statut = 'combat'; });
    sur('chat', (c, m, j) => {
      const t = propre(m.t, 140); if (!t) return;
      if (Date.now() - (j.dernierChat || 0) < 1200) return;   // pas plus d'un message par seconde
      j.dernierChat = Date.now();
      const msg = { de: j.nom, clan: j.clan, t, canal: m.canal === 'clan' ? 'clan' : 'tous' };
      if (msg.canal === 'clan') { for (const cl of this.clients) if (this.joueurs.get(cl.sessionId)?.clan === j.clan) cl.send('chat', msg); }
      else this.broadcast('chat', msg);
    });
    // ---------- profil de combat (deck, PV, essence pour le butin) ----------
    // ---------- les actions qui changent le profil (le serveur fait foi) ----------
    this.onMessage('act', (c, m = {}) => {
      const j = this.joueurs.get(c.sessionId); if (!j) return;
      const rep = (o) => c.send('r', { id: m.id, ...o, profil: j.p ? { p: j.p, sig: signer(j.p), jeton: j.jeton } : null });
      try {
        const f = Object.hasOwn(ACTIONS, m.type) ? ACTIONS[m.type] : null;
        if (!f) return rep({ ok: false, raison: 'Action inconnue.' });
        if (m.type !== 'creer' && !j.p) return rep({ ok: false, raison: 'Profil introuvable.' });
        if (j.duel || j.manche) return rep({ ok: false, raison: 'Termine d’abord ton combat en cours.' });
        // anti-spam : un seau de 15 actions qui se remplit de 10 par seconde
        const t = Date.now(); j.seau = Math.min(15, (j.seau ?? 15) + ((t - (j.seauT || t)) / 1000) * 10); j.seauT = t;
        if (j.seau < 1) return rep({ ok: false, raison: 'Doucement !' });
        j.seau--;
        const ctx = { points: (k) => this.points(j, POINTS[k]) };
        const r = f(j.p, m, ctx) || { ok: false };
        if (ctx.p) { j.p = ctx.p; this.arriver(c, j); }
        if (r.ok) { j.sale = true; this.identite(j); }
        rep({ ok: !!r.ok, raison: r.raison, res: r.res });
      } catch (e) { noterErreur(`clans · act ${m.type}`, e); rep({ ok: false, raison: 'Erreur du serveur.' }); }
    });
    // les profils modifiés sont enregistrés régulièrement (et au départ du joueur)
    this.clock.setInterval(() => { for (const j of this.joueurs.values()) if (j.sale && j.p) { j.sale = false; enregistrer(j.jeton, j.p); } }, 20000);
    // ---------- filons rares ----------
    this.obs = obstacles(); this.filons = new Map(); this.nFilon = 0;
    for (let i = 0; i < 12; i++) this.pousser();
    this.clock.setInterval(() => { if (this.filons.size < 15) { this.pousser(); this.broadcast('filons', this.listeFilons()); } }, 20000);
    sur('ramasser', (c, m, j) => {
      const f = this.filons.get(String(m.id));
      if (!f || !j.p || Math.hypot(j.x - f.x, j.y - f.y) > 50 || j.duel) return;
      this.filons.delete(f.id);
      j.p.ress[RARES[f.terr].id] = (j.p.ress[RARES[f.terr].id] || 0) + 1; Q.evenement(j.p, 'filon'); j.sale = true;
      c.send('ramasse', { terr: f.terr, n: 1 }); this.pousserProfil(c, j);
      this.points(j, POINTS.filon);
      this.broadcast('filons', this.listeFilons());
    });
    // ---------- rivalité des clans ----------
    sur('classement', (c) => c.send('classement', classementClans()));
    this.scoresChanges = false;
    this.clock.setInterval(() => { if (this.scoresChanges) { this.scoresChanges = false; this.broadcast('scores', this.scores()); } }, 3000);
    // ---------- boss mondial ----------
    this.mondial = null; this.nMondial = 0; this.prochainMondial = Date.now() + (+process.env.CLANS_BOSS_DELAI || MONDIAL.premier);
    this.clock.setInterval(() => this.tickMondial(), 1000);
    sur('mondialEntrer', (c, m, j) => {
      const b = this.mondial, refus = (t) => c.send('info', { t });
      if (!b) return refus('Le boss mondial est parti.');
      if (j.duel) return refus('Termine d’abord ton duel.');
      if (j.manche) return;
      if (Math.hypot(j.x - b.x, j.y - b.y) > MONDIAL.portee + 20) return refus('Approche-toi du boss.');
      if (Date.now() < (j.prochaineManche || 0)) return refus(`Reprends ton souffle : encore ${Math.ceil((j.prochaineManche - Date.now()) / 1000)} s.`);
      if (!j.p) return;
      j.manche = { id: b.id, terr: b.terr, debut: Date.now(), pv: pvManche(b.terr, b.pv), graine: (Math.random() * 1e9) | 0 }; j.statut = 'combat';
      c.send('mondialGo', { terr: b.terr, pv: j.manche.pv, graine: j.manche.graine });
    });
    sur('mondialCoup', (c, m, j) => {
      const mc = j.manche; if (!mc) return;
      j.manche = null; j.statut = 'libre'; j.prochaineManche = Date.now() + MONDIAL.pause;
      const b = this.mondial; if (!b || b.id !== mc.id) return;
      // on rejoue la manche du joueur : seuls les dégâts vraiment infligés comptent
      const pv = P.pvMax(j.p), c2 = rejouer({ deck: P.deckCombat(j.p), joueur: { pv, pvMax: pv }, ennemis: [{ ...BOSS_MONDIAUX[mc.terr], pv: mc.pv }], palier: PALIER_MONDIAL, graine: mc.graine, classe: j.p.classe }, m.coups);
      const reel = c2.ennemis.reduce((t, e) => t + Math.max(0, e.pvMax - Math.max(0, e.pv)), 0);
      const deg = Math.min(mc.pv, degatsValides(reel, mc.debut, Date.now(), b.terr)); if (!deg) return;
      const cle = j.jeton, pa = b.participants.get(cle) || { nom: j.nom, clan: j.clan, jeton: j.jeton, deg: 0 };
      const avant = pa.deg; pa.deg += deg; b.participants.set(cle, pa);
      this.points(j, Math.floor(pa.deg / POINTS.mondialPar) - Math.floor(avant / POINTS.mondialPar));
      Q.evenement(j.p, 'mondial', deg); j.sale = true; this.pousserProfil(c, j);
      b.pv = Math.max(0, b.pv - deg);
      if (b.pv <= 0) this.victoireMondial(); else this.broadcast('mondial', this.etatMondial());
    });
    // ---------- duels ----------
    this.duels = new Map();   // sessionId -> duel
    sur('defier', (c, m, j) => {
      const cible = this.joueurs.get(String(m.cible)), cl = this.clients.find((x) => x.sessionId === String(m.cible));
      const refus = (t) => c.send('info', { t });
      if (!cible || !cl || !cible.p || !j.p) return refus('Ce joueur est parti.');
      if (j.duel || cible.duel) return refus('Un duel est déjà en cours.');
      if (cible.clan === j.clan) return refus('On ne défie pas quelqu’un de son propre clan.');
      if (territoireDe(cible.x, cible.y) !== j.clan) return refus('Tu ne peux défier un ennemi que sur le territoire de ton clan.');
      if (Math.hypot(cible.x - j.x, cible.y - j.y) > 110) return refus('Approche-toi d’abord.');
      if (cible.statut === 'expedition') return refus(`${cible.nom} est en expédition : impossible de le défier maintenant.`);
      if (cible.manche || j.manche) return refus('Un combat contre le boss mondial est en cours.');
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
      this.duels.delete(c.sessionId);
      const j = this.joueurs.get(c.sessionId);
      if (j && issue === 'victoire' && raison !== 'depart') this.points(j, POINTS.duel);
      if (j) {
        j.duel = false; j.statut = 'libre'; j.protege = Date.now() + 120000;
        if (j.p) { j.p.ress.essence = Math.max(0, j.p.ress.essence + (issue === 'victoire' ? butin : issue === 'defaite' ? -butin : 0)); if (issue === 'victoire') { j.p.duels.gagnes++; if (raison !== 'depart') Q.evenement(j.p, 'duel'); } else if (issue === 'defaite') j.p.duels.perdus++; j.sale = true; this.identite(j); this.pousserProfil(c, j); }
      }
      c.send('duelResultat', { issue, butin: issue === 'victoire' ? butin : issue === 'defaite' ? -butin : 0, adv: x.noms[1 - q], raison, vue: vueDuel(x.d, q) });
    });
    this.broadcast('chat', { systeme: true, t: gagnant === null ? `Le duel entre ${x.noms[0]} et ${x.noms[1]} se termine sur une égalité.` : `🏆 ${x.noms[gagnant]} a vaincu ${x.noms[1 - gagnant]} en duel${raison === 'abandon' ? ' (abandon)' : raison === 'depart' ? ' (fuite)' : ''} !` });
  }

  // ---------- arrivée : le serveur retrouve le profil du joueur ----------
  async onJoin(client, o = {}) {
    const r = await retrouver({ jeton: o.jeton, copie: o.copie, ancien: o.ancien });
    // déjà connecté avec ce profil (autre onglet) : on garde le profil en mémoire, l'ancien onglet est fermé
    for (const [id, autre] of this.joueurs) if (autre.jeton === r.jeton && id !== client.sessionId) {
      if (autre.p) r.p = autre.p;
      const vieux = this.clients.find((x) => x.sessionId === id);
      vieux?.send('info', { t: 'Ton profil est ouvert ailleurs : cette page est déconnectée.' }); vieux?.leave(4001);
    }
    const j = { jeton: r.jeton, p: r.p, x: 0, y: 0, dir: 0, statut: 'libre', sale: r.source === 'copie' || r.source === 'migration' };
    this.joueurs.set(client.sessionId, j);
    client.send('bienvenue', { id: client.sessionId });
    client.send('profil', { p: j.p, sig: j.p ? signer(j.p) : null, jeton: j.jeton, source: r.source });
    client.send('filons', this.listeFilons()); client.send('mondial', this.etatMondial()); client.send('scores', this.scores());
    if (j.p) this.arriver(client, j);
  }
  // le joueur (avec un profil) apparaît dans le monde
  arriver(client, j) {
    this.identite(j);
    const [x, y] = DEPARTS[j.clan]; j.x = x + (Math.random() - 0.5) * 60; j.y = y + (Math.random() - 0.5) * 40;
    this.broadcast('chat', { systeme: true, t: `${j.nom} rejoint le ${NOMS_CLANS[j.clan]}.` });
  }
  // nom, clan, deck, PV… tirés du profil (jamais du client)
  identite(j) {
    const p = j.p; if (!p) return;
    j.nom = p.nom; j.clan = p.clan; j.classe = p.classe || ''; j.niv = P.niveau(p);
    j.deck = P.deckCombat(p); j.pvMax = PV_DUEL(P.pvMax(p), j.classe); j.essence = p.ress.essence; j.parcelle = codeParcelle(p.parcelle);
  }
  pousserProfil(client, j) { if (j.p) client.send('profil', { p: j.p, sig: signer(j.p), jeton: j.jeton }); }

  onLeave(client) {
    const x = this.duels.get(client.sessionId);
    if (x) this.terminerDuel(x, 1 - x.ids.indexOf(client.sessionId), 'depart');   // fuir un duel, c'est le perdre
    const j = this.joueurs.get(client.sessionId);
    if (j?.p && ![...this.joueurs.entries()].some(([id, a]) => id !== client.sessionId && a.jeton === j.jeton)) enregistrer(j.jeton, j.p);
    this.joueurs.delete(client.sessionId);
  }
  onDispose() { for (const j of this.joueurs.values()) if (j.p) enregistrer(j.jeton, j.p); }

  // ---------- rivalité des clans ----------
  points(j, n) { if (n > 0) { pointsClan(j.clan, j.nom, n); this.scoresChanges = true; } }
  scores() { const c = classementClans(); return { clans: c.clans, champion: c.champion, fin: c.fin }; }

  // ---------- boss mondial ----------
  etatMondial() { const b = this.mondial; return b ? { id: b.id, terr: b.terr, nom: BOSS_MONDIAUX[b.terr].nom, x: b.x, y: b.y, pv: b.pv, pvMax: b.pvMax, fin: b.fin, n: b.participants.size } : null; }
  tickMondial() {
    const t = Date.now();
    if (!this.mondial && t >= this.prochainMondial && this.clients.length) this.lancerMondial();
    else if (this.mondial && t >= this.mondial.fin) {
      this.broadcast('chat', { systeme: true, t: `💨 ${BOSS_MONDIAUX[this.mondial.terr].nom} s'est enfui… Il lui restait ${this.mondial.pv} PV.` });
      this.mondial = null; this.prochainMondial = t + MONDIAL.intervalle; this.broadcast('mondial', null);
    }
  }
  lancerMondial() {
    const terr = ['feu', 'eau', 'plante'][this.nMondial++ % 3], [cx, cy] = CENTRES[terr];
    let x = cx, y = cy + 300;
    for (let essai = 0; essai < 300; essai++) {
      const a = Math.random() * Math.PI * 2, d = 420 + Math.random() * 380, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
      if (territoireDe(px, py) !== terr || ![[0, 0], [40, 0], [-40, 0], [0, 40], [0, -30]].every(([dx, dy]) => praticable(px + dx, py + dy, this.obs))) continue;
      x = Math.round(px); y = Math.round(py); break;
    }
    const pvMax = +process.env.CLANS_BOSS_PV || pvMondial(this.clients.length);
    this.mondial = { id: `m${this.nMondial}`, terr, x, y, pv: pvMax, pvMax, fin: Date.now() + MONDIAL.duree, participants: new Map() };
    this.broadcast('mondial', this.etatMondial());
    this.broadcast('chat', { systeme: true, t: `⚠️ Un boss mondial apparaît dans les ${terr === 'feu' ? 'Terres de Braise' : terr === 'eau' ? "Lagons d'Azur" : "Sylve d'Émeraude"} : ${BOSS_MONDIAUX[terr].nom} (${pvMax} PV) ! Tous les clans peuvent l'affronter.` });
  }
  victoireMondial() {
    const b = this.mondial, liste = [...b.participants.values()].sort((u, v) => v.deg - u.deg), total = liste.reduce((s, u) => s + u.deg, 0);
    liste.forEach((u, i) => {
      const rang = i + 1, rec = recompenseMondial(b.terr, u.deg, total, rang);
      for (const cl of this.clients) { const j = this.joueurs.get(cl.sessionId); if (j && j.p && j.jeton === u.jeton) { j.p.ress.essence += rec.essence; j.p.ress.eclats = (j.p.ress.eclats || 0) + rec.eclats; j.p.ress[rec.rare.id] = (j.p.ress[rec.rare.id] || 0) + rec.rare.n; j.sale = true; this.identite(j); this.pousserProfil(cl, j); cl.send('mondialRecompense', { ...rec, rang, deg: u.deg, total, nb: liste.length, boss: BOSS_MONDIAUX[b.terr].nom }); this.points(j, POINTS.mondialFin + (rang === 1 ? POINTS.mondialTop : 0)); } }
    });
    const top = liste[0];
    this.broadcast('chat', { systeme: true, t: `🏆 ${BOSS_MONDIAUX[b.terr].nom} est vaincu par ${liste.length} joueur${liste.length > 1 ? 's' : ''} ! Meilleur coup de main : ${top.nom} (${NOMS_CLANS[top.clan]}, ${top.deg} dégâts).` });
    this.mondial = null; this.prochainMondial = Date.now() + MONDIAL.intervalle; this.broadcast('mondial', null);
  }

  envoyer() {
    if (!this.clients.length) return;
    const liste = [];
    for (const [id, j] of this.joueurs) if (j.p) liste.push([id, j.nom, j.clan, Math.round(j.x), Math.round(j.y), j.dir, j.statut, j.niv, j.classe, j.parcelle || 111]);
    this.broadcast('monde', liste);
  }
}
