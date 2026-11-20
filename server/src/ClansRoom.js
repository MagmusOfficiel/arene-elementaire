// =====================================================================
//  Salle Colyseus des CLANS ÉLÉMENTAIRES : le monde partagé
//  Une seule salle publique (jusqu'à 80 joueurs) : chacun envoie sa
//  position, le serveur renvoie 8 fois par seconde la liste de tout le
//  monde (nom, clan, position, en expédition ou non). Chat général et
//  chat de clan. Le profil est gardé par le serveur (clansProfils.js).
//  Phase 4 : les sanctuaires (contrôle des territoires) et l'arène classée.
//  Phase 2 : les filons rares (le serveur les fait pousser et décide qui
//  les ramasse) et les duels (le serveur fait tourner le combat de cartes :
//  on peut défier un joueur d'un autre clan qui se trouve sur SON territoire).
// =====================================================================
import colyseus from 'colyseus';
import { noterErreur } from './journal.js';
import { territoireDe, obstacles, praticable, CENTRES, MONDE as GEO, cleMaison } from '../../shared/clans/geo.js';
import { nouveauDuel, jouer as jouerDuel, finTour as finTourDuel, vue as vueDuel, deckValide, PV_DUEL } from '../../shared/clans/duel.js';
import { BUTIN_DUEL } from '../../shared/clans/profil.js';
import { BOSS_MONDIAUX, MONDIAL, POINTS, NOMS_CLANS, PALIER_MONDIAL, pvMondial, pvManche, degatsValides, recompenseMondial } from '../../shared/clans/mondial.js';
import { pointsClan, classementClans, lireSanctuaires, ecrireSanctuaires, lireProjets, ecrireProjets, areneEnregistrer, areneJoueurs, classementArene } from './stats.js';
import crypto from 'node:crypto';
import * as PJ from '../../shared/clans/projets.js';
import * as F from '../../shared/clans/familiers.js';
import * as MT from '../../shared/clans/montures.js';
import * as DC from '../../shared/clans/deco.js';
import * as HF from '../../shared/clans/hautsfaits.js';
import * as T from '../../shared/clans/territoires.js';
import * as A from '../../shared/clans/arene.js';
import * as AP from '../../shared/clans/apparence.js';
import { noterDuel } from './clansEquilibrage.js';
import { deckDepart } from '../../shared/clans/cartes.js';
import { retrouver, enregistrer, ACTIONS, signer } from './clansProfils.js';
import * as P from '../../shared/clans/profil.js';
import { rejouer } from '../../shared/clans/combat.js';
import * as Q from '../../shared/clans/quetes.js';
import * as X from '../../shared/clans/expedition.js';
import { RARES } from '../../shared/clans/cartes.js';

const { Room } = colyseus;
export const MONDE = GEO;
const CLANS = ['feu', 'eau', 'plante'], CLASSES = ['combattant', 'mage', 'tireur', 'escrimeur'];
export const DEPARTS = Object.fromEntries(Object.entries(CENTRES).map(([k, [x, y]]) => [k, [x, y + 64]]));   // sous l’ouvrage du projet de clan
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const codeParcelle = (pc) => { const v = (k) => Math.max(1, Math.min(5, num(pc?.[k], 1) | 0)); return v('maison') * 100 + v('autel') * 10 + v('atelier'); };
const empreinte = (jeton) => crypto.createHash('sha256').update(String(jeton)).digest('base64url').slice(0, 16);
const esc = (t) => String(t).replace(/[<>&]/g, '');
const STATUTS = ['libre', 'expedition', 'parcelle', 'tirage', 'combat', 'duel', 'arene'];
const VUE = { l: 760, h: 480 };   // demi-largeur et demi-hauteur de ce qu'un joueur peut voir (avec de la marge)
const propre = (t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export class ClansRoom extends Room {
  maxClients = 80;

  onCreate() {
    this.setMetadata({ mode: 'clans' });
    this.joueurs = new Map();
    const sur = (type, f) => this.onMessage(type, (client, m = {}) => {
      try { const j = this.joueurs.get(client.sessionId); if (j?.p) f(client, m || {}, j); } catch (e) { noterErreur(`clans · ${type}`, e); }
    });
    // la fiche publique d'un joueur (v60) : ce que tout le monde peut voir
    sur('fiche', (c, m) => {
      const k = this.joueurs.get(String(m.id || '')); if (!k?.p) return;
      const p = k.p, a = p.arene || {};
      c.send('fiche', { id: String(m.id), nom: k.nom, clan: k.clan, classe: p.classe, branche: p.branche || '', niv: k.niv, app: k.app || '', fam: k.fam || '', titre: k.titre || '',
        arene: { elo: a.elo || 1000, meilleur: Math.max(a.meilleur || 0, p.stats.areneMax || 0), v: a.v || 0, d: a.d || 0 }, duels: { g: p.duels?.gagnes || 0, p: p.duels?.perdus || 0 },
        stats: { victoires: p.stats.victoires || 0, boss: p.stats.boss || 0, cauchemar: p.stats.cauchemar || 0, expeditions: p.stats.expeditions || 0 },
        hf: HF.IDS.map((id) => [id, HF.palierDe(p, id)]).filter((x) => x[1] > 0), statut: k.statut || 'libre' });
    });
    sur('pos', (c, m, j) => {
      const x = Math.max(0, Math.min(MONDE.l, num(m.x, j.x))), y = Math.max(0, Math.min(MONDE.h, num(m.y, j.y)));
      if (Math.hypot(x - j.x, y - j.y) < 200) { j.x = x; j.y = y; }
      // un saut trop grand est refusé : on ramène le joueur là où le serveur le voit (sinon il resterait « coincé » ailleurs)
      else if (Date.now() - (j.recale || 0) > 1500) { j.recale = Date.now(); c.send('recale', { x: Math.round(j.x), y: Math.round(j.y) }); }
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
      const rep = (o) => c.send('r', { id: m.rid, ...o, profil: j.p ? { p: j.p, sig: signer(j.p), jeton: j.jeton } : null });
      try {
        const f = Object.hasOwn(ACTIONS, m.type) ? ACTIONS[m.type] : null;
        if (!f) return rep({ ok: false, raison: 'Action inconnue.' });
        if (m.type !== 'creer' && !j.p) return rep({ ok: false, raison: 'Profil introuvable.' });
        if (j.duel || j.manche) return rep({ ok: false, raison: 'Termine d’abord ton combat en cours.' });
        // anti-spam : un seau de 15 actions qui se remplit de 10 par seconde
        const t = Date.now(); j.seau = Math.min(15, (j.seau ?? 15) + ((t - (j.seauT || t)) / 1000) * 10); j.seauT = t;
        if (j.seau < 1) return rep({ ok: false, raison: 'Doucement !' });
        j.seau--;
        const ctx = { points: (k) => this.points(j, POINTS[k]), sanctuaires: j.p ? T.tenus(this.props(), j.p.clan) : 0, projets: this.projetsAJour(), cle: empreinte(j.jeton), projetDon: (d) => this.apresDon(j, d), pos: { x: j.x, y: j.y } };
        const ancienNom = j.nom;
        const r = f(j.p, m, ctx) || { ok: false };
        if (ctx.p) { j.p = ctx.p; this.arriver(c, j); }
        if (r.ok) { j.sale = true; this.identite(j); }
        if (r.ok && j.groupe && ['expeCombat', 'expeRelique', 'expeMystere', 'expeAbandon'].includes(m.type)) this.apresActionGroupe(c, j, m.type, r.res);
        if (r.ok && m.type === 'renommer') this.broadcast('chat', { systeme: true, t: `${ancienNom} s’appelle désormais ${j.nom}.` });
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
      const pv = P.pvMax(j.p), c2 = rejouer({ deck: P.deckCombat(j.p), joueur: { pv, pvMax: pv }, ennemis: [{ ...BOSS_MONDIAUX[mc.terr], pv: mc.pv }], palier: PALIER_MONDIAL, graine: mc.graine, classe: j.p.classe, branche: j.p.branche || null, familier: F.actif(j.p) }, m.coups);
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

    // ---------- expéditions en groupe (v78) ----------
    this.groupes = new Map();   // id -> { id, chef (sid), membres [sid], terr, palier, bossGagne, parti }
    this.nGroupe = 0;
    const cliDe = (sid) => this.clients.find((k) => k.sessionId === sid);
    sur('groupeInviter', (c, m, j) => {
      const sid = String(m.cible || ''), cible = this.joueurs.get(sid), cl = cliDe(sid), refus = (t) => c.send('info', { t });
      if (!cible?.p || !cl || sid === c.sessionId) return refus('Ce joueur n’est plus là.');
      if (j.p.expedition) return refus('Termine d’abord ton expédition en cours.');
      if (cible.groupe) return refus(`${cible.nom} est déjà dans un groupe.`);
      if (cible.p.expedition) return refus(`${cible.nom} est déjà en expédition.`);
      let g = j.groupe && this.groupes.get(j.groupe);
      if (g && g.chef !== c.sessionId) return refus('Seul le chef du groupe peut inviter.');
      if (g?.parti) return refus('Le groupe est déjà parti.');
      if (!g) { g = { id: `g${++this.nGroupe}`, chef: c.sessionId, membres: [c.sessionId], invites: new Set() }; this.groupes.set(g.id, g); j.groupe = g.id; }
      if (g.membres.length >= X.TAILLE_GROUPE) return refus(`Un groupe compte ${X.TAILLE_GROUPE} joueurs au plus.`);
      g.invites.add(sid); cl.send('groupeInvitation', { gid: g.id, de: j.nom, clan: j.clan });
      c.send('info', { t: `Invitation envoyée à ${cible.nom}.` }); this.envoyerGroupe(g);
    });
    sur('groupeRepondre', (c, m, j) => {
      const g = this.groupes.get(String(m.gid || '')); if (!g || !g.invites.has(c.sessionId)) return;
      g.invites.delete(c.sessionId);
      const chef = cliDe(g.chef);
      if (!m.oui) { chef?.send('info', { t: `${j.nom} a décliné l’invitation.` }); return; }
      if (j.groupe || j.p.expedition || g.parti || g.membres.length >= X.TAILLE_GROUPE) return c.send('info', { t: 'Trop tard : impossible de rejoindre ce groupe.' });
      g.membres.push(c.sessionId); j.groupe = g.id; this.envoyerGroupe(g);
    });
    sur('groupeQuitter', (c, m, j) => this.quitterGroupe(c.sessionId, 'quitte'));
    sur('groupePartir', (c, m, j) => {
      const g = j.groupe && this.groupes.get(j.groupe), refus = (t) => c.send('info', { t });
      if (!g || g.chef !== c.sessionId || g.parti) return;
      const terr = String(m.terr || ''), palier = Math.floor(Number(m.palier)) || 1;
      if (g.membres.length < 2) return refus('Invite au moins un compagnon d’abord.');
      for (const sid of g.membres) { const k = this.joueurs.get(sid); if (!k?.p || k.p.expedition || k.duel || k.manche) return refus(`${k?.nom || 'Un membre'} n’est pas prêt.`); if (palier > (k.p.paliers[terr] || 1)) return refus(`${k.nom} n’a pas encore débloqué ce palier.`); }
      const graine = Math.floor(Math.random() * 2 ** 31);
      for (const sid of g.membres) {
        const k = this.joueurs.get(sid), r = X.commencerExpedition(k.p, terr, palier, graine);
        if (!r.ok) continue;
        const b = PJ.bonusDe(this.projetsAJour(), k.p.clan, 'butin'); if (b) k.p.expedition.bonusButin = b;
        k.p.expedition.groupe = { id: g.id, n: g.membres.length };
        k.statut = 'expedition'; k.sale = true; const cl = cliDe(sid); if (cl) this.pousserProfil(cl, k);
      }
      Object.assign(g, { parti: true, terr, palier, bossGagne: false });
      this.envoyerGroupe(g, { depart: true });
    });
    sur('groupeEntrer', (c, m, j) => {
      const g = j.groupe && this.groupes.get(j.groupe); if (!g?.parti) return;
      if (g.chef !== c.sessionId) return c.send('info', { t: 'C’est le chef du groupe qui choisit la salle.' });
      const actifs = g.membres.map((sid) => this.joueurs.get(sid)).filter((k) => k?.p?.expedition);
      const pasPret = actifs.find((k) => !X.pretAPartir(k.p.expedition));
      if (pasPret) return c.send('info', { t: `Attends ${pasPret.nom} : ${pasPret.p.expedition.combatEnCours ? 'il est en plein combat' : 'il doit encore faire un choix'}.` });
      const salle = String(m.salle || '');
      if (!X.choixPossibles(j.p.expedition).includes(salle)) return;
      for (const k of actifs) {
        const r = X.entrer(k.p, salle); if (!r.ok) continue;
        k.sale = true; const cl = cliDe(this.sidDe(k));
        if (cl) { this.pousserProfil(cl, k); cl.send('groupeSalle', { salle, res: { type: r.type, soin: r.soin, gain: r.gain, relique: r.relique, mystere: r.mystere, aTerre: r.aTerre, releve: r.releve } }); }
      }
      this.envoyerGroupe(g);
    });
    // ---------- sanctuaires : le contrôle des territoires ----------
    const gardes = lireSanctuaires() || {};
    this.sanct = T.SANCTUAIRES.map((x) => ({ id: x.id, prop: ['feu', 'eau', 'plante'].includes(gardes[x.id]) ? gardes[x.id] : x.terr, capt: null, conteste: false }));
    this.sanctVu = '';
    this.clock.setInterval(() => this.tickSanctuaires(), 1000);
    this.clock.setInterval(() => { if (!this.clients.length) return; for (const x of this.sanct) pointsClan(x.prop, null, POINTS.sanctuaire); this.scoresChanges = true; }, 600000);   // 1 pt / 10 min par sanctuaire tenu
    // ---------- projets de clan (un grand ouvrage par semaine dans chaque village) ----------
    this.projets = null; this.projetsAJour();
    this.clock.setInterval(() => this.projetsAJour(), 60000);
    this.clock.setInterval(() => { if (this.projetsSales) { this.projetsSales = false; this.broadcast('projets', PJ.vue(this.projets)); } }, 1000);
    // ---------- arène classée ----------
    this.file = [];            // { sid, t } : les joueurs qui cherchent un adversaire
    this.nReflet = 0;
    this.clock.setInterval(() => this.tickArene(), 1000);
    sur('areneFile', (c, m, j) => {
      const i = this.file.findIndex((f) => f.sid === c.sessionId);
      if (!m.en) { if (i >= 0) this.file.splice(i, 1); return c.send('areneFile', { en: false }); }
      if (j.duel || j.manche) return c.send('info', { t: 'Termine d’abord ton combat en cours.' });
      if (j.statut === 'expedition') return c.send('info', { t: 'Reviens d’expédition avant d’entrer dans l’arène.' });
      const recu = A.aJour(j.p); if (recu) this.recompenseSaison(c, j, recu);
      if (i < 0) this.file.push({ sid: c.sessionId, t: Date.now() });
      c.send('areneFile', { en: true, depuis: this.file.find((f) => f.sid === c.sessionId).t });
    });
    sur('areneClassement', (c, m, j) => c.send('areneClassement', classementArene(empreinte(j.jeton))));

    this.setSimulationInterval(() => this.envoyer(), 125);
  }

  // ---------- sanctuaires ----------
  props() { return Object.fromEntries(this.sanct.map((x) => [x.id, x.prop])); }
  etatSanctuaires() { return this.sanct.map((x) => ({ id: x.id, prop: x.prop, capt: x.capt ? { clan: x.capt.clan, p: Math.round(x.capt.p) } : null, conteste: x.conteste })); }
  tickSanctuaires() {
    const vitesse = +process.env.CLANS_CAPTURE_VITESSE || 1;
    for (const x of this.sanct) {
      const def = T.SANCTUAIRES.find((d) => d.id === x.id), presents = { feu: 0, eau: 0, plante: 0 }, la = [];
      for (const [sid, j] of this.joueurs) {
        if (!j.p || j.absent || j.duel || j.manche || j.statut === 'expedition') continue;
        if (Math.hypot(j.x - def.x, j.y - def.y) <= T.CAPTURE.rayon) { presents[j.clan]++; la.push([sid, j]); }
      }
      const avant = x.capt?.clan;
      const r = T.avancer(x, presents, 1, vitesse);
      // une capture commence : on prévient le clan qui tient le sanctuaire (au plus une fois toutes les 90 s)
      if (x.capt && x.capt.clan !== avant && Date.now() - (x.alerte || 0) > 90000) {
        x.alerte = Date.now();
        const m = { id: def.id, nom: def.nom, x: def.x, y: def.y, par: x.capt.clan, n: presents[x.capt.clan] };
        for (const cl of this.clients) if (this.joueurs.get(cl.sessionId)?.clan === x.prop) cl.send('alerte', m);
      }
      if (!r) continue;
      ecrireSanctuaires(this.props());
      this.broadcast('chat', { systeme: true, t: `🏳️ Le ${NOMS_CLANS[r.pris]} s'empare du ${def.nom}${r.ancien ? ` (tenu par le ${NOMS_CLANS[r.ancien]})` : ''} !` });
      for (const [sid, j] of la) if (j.clan === r.pris) {
        this.points(j, POINTS.capture); Q.evenement(j.p, 'sanctuaire'); j.p.stats.sanct = (j.p.stats.sanct || 0) + 1; j.sale = true;
        const cl = this.clients.find((k) => k.sessionId === sid); if (cl) this.pousserProfil(cl, j);
      }
    }
    const etat = JSON.stringify(this.etatSanctuaires());
    if (etat !== this.sanctVu) { this.sanctVu = etat; this.broadcast('sanctuaires', JSON.parse(etat)); }
  }

  // ---------- projets de clan ----------
  // l'état de la semaine (on change de semaine le lundi à 0 h UTC)
  projetsAJour() {
    const { etat, change } = PJ.aJour(this.projets || lireProjets());
    this.projets = etat;
    if (change) {
      ecrireProjets(etat);
      if (this.clients?.length) {
        this.broadcast('projets', PJ.vue(etat));
        for (const [k, a] of Object.entries(etat.actifs || {})) if (a) this.broadcast('chat', { systeme: true, t: `${PJ.PROJETS[k].ico} Le ${NOMS_CLANS[k]} profite cette semaine de son ${PJ.PROJETS[k].nom} : ${PJ.PROJETS[k].bonus.toLowerCase()}.` });
      }
    }
    return etat;
  }
  apresDon(j, d) {
    const pr = PJ.PROJETS[j.clan], e = this.projets;
    const avant = e.clans[j.clan].pts - d.pts;
    this.points(j, Math.floor(e.clans[j.clan].pts / POINTS.projetPar) - Math.floor(avant / POINTS.projetPar));
    PJ.compacter(e); ecrireProjets(e);
    if (d.termine) this.broadcast('chat', { systeme: true, t: `${pr.ico} Le ${NOMS_CLANS[j.clan]} a terminé son ${pr.nom} ! La semaine prochaine : ${pr.bonus.toLowerCase()}.` });
    else if (d.monte) for (const cl of this.clients) if (this.joueurs.get(cl.sessionId)?.clan === j.clan) cl.send('chat', { systeme: true, t: `${pr.ico} Le ${pr.nom} grandit (étape ${d.etape + 1}/${PJ.ETAPES}) grâce à ${j.nom} !` });
    this.projetsSales = true;
  }

  // ---------- arène : l'appariement ----------
  tickArene() {
    const t = Date.now(), delai = +process.env.CLANS_ARENE_REFLET || A.ARENE.delaiReflet;
    // on retire ceux qui sont partis ou occupés
    this.file = this.file.filter((f) => {
      const j = this.joueurs.get(f.sid), cl = this.clients.find((k) => k.sessionId === f.sid);
      if (j?.p && (cl || j.absent) && !j.duel && !j.manche && j.statut !== 'expedition') return true;
      cl?.send('areneFile', { en: false }); return false;
    });
    const pris = new Set();
    for (const a of [...this.file].sort((u, v) => u.t - v.t)) {
      if (pris.has(a.sid) || this.joueurs.get(a.sid)?.absent) continue;
      const ja = this.joueurs.get(a.sid), ea = ja.p.arene?.elo ?? A.ELO_DEPART, ecart = A.ARENE.ecartBase + A.ARENE.ecartParSeconde * ((t - a.t) / 1000);
      let mieux = null, dm = Infinity;
      for (const b of this.file) {
        if (b.sid === a.sid || pris.has(b.sid)) continue;
        const jb = this.joueurs.get(b.sid); if (jb.absent || jb.jeton === ja.jeton) continue;
        const dd = Math.abs((jb.p.arene?.elo ?? A.ELO_DEPART) - ea); if (dd <= ecart && dd < dm) { dm = dd; mieux = b; }
      }
      const ca = this.clients.find((k) => k.sessionId === a.sid);
      if (mieux) {
        pris.add(a.sid); pris.add(mieux.sid);
        const jb = this.joueurs.get(mieux.sid), cb = this.clients.find((k) => k.sessionId === mieux.sid);
        this.lancerArene(ca, ja, cb, jb, null);
      } else if (t - a.t >= delai) { pris.add(a.sid); this.lancerArene(ca, ja, null, null, this.reflet(ja)); }
    }
    if (pris.size) this.file = this.file.filter((f) => !pris.has(f.sid));
  }
  // un Reflet : le deck d'un vrai joueur de niveau proche, joué par le serveur
  reflet(j) {
    const id = empreinte(j.jeton), elo = j.p.arene?.elo ?? A.ELO_DEPART;
    const l = Object.entries(areneJoueurs()).filter(([k, e]) => k !== id && deckValide(e.deck)).sort((x, y) => Math.abs(x[1].elo - elo) - Math.abs(y[1].elo - elo)).slice(0, 3);
    if (l.length) { const e = l[Math.floor(Math.random() * l.length)][1]; return { nom: `Reflet de ${e.nom}`, clan: e.clan, classe: e.classe, branche: e.branche || null, pvMax: e.pvMax, deck: e.deck, elo: e.elo, app: e.app || '' }; }
    const clan = ['feu', 'eau', 'plante'][Math.floor(Math.random() * 3)], classe = CLASSES[Math.floor(Math.random() * 4)];
    return { nom: 'Gardien de l’Arène', clan, classe, pvMax: PV_DUEL(0, classe), deck: deckDepart(clan, classe).map((id2) => ({ id: id2, niv: elo >= 1250 ? 2 : 1 })), elo };
  }
  lancerArene(ca, a, cb, b, bot) {
    for (const [c, j] of [[ca, a], [cb, b]]) if (j) { const r = A.aJour(j.p); if (r) this.recompenseSaison(c, j, r); c.send('areneFile', { en: false }); }
    const ea = a.p.arene.elo;
    if (bot) {
      const sid = `reflet${++this.nReflet}`, faux = { sessionId: sid, send() {} };
      const adv = { nom: bot.nom, clan: bot.clan, classe: bot.classe, pvMax: bot.pvMax, deck: bot.deck, essence: 0, app: bot.app || '' };
      ca.send('info', { t: `🏟️ Personne de libre : tu affrontes ${esc(bot.nom)} (${A.rangDe(bot.elo).nom}, ${bot.elo}).` });
      return this.lancerDuel(ca, a, faux, adv, { elos: [ea, bot.elo], reflet: true, bot: 1 });
    }
    const eb = b.p.arene.elo;
    ca.send('info', { t: `🏟️ Adversaire trouvé : ${esc(b.nom)} (${A.rangDe(eb).nom}, ${eb}).` });
    cb.send('info', { t: `🏟️ Adversaire trouvé : ${esc(a.nom)} (${A.rangDe(ea).nom}, ${ea}).` });
    this.broadcast('chat', { systeme: true, t: `🏟️ Arène : ${a.nom} affronte ${b.nom} !` });
    this.lancerDuel(ca, a, cb, b, { elos: [ea, eb], reflet: false });
  }
  recompenseSaison(c, j, r) {
    j.sale = true; this.identite(j); this.pousserProfil(c, j);
    c.send('info', { t: `🏟️ Fin de la saison ${r.saison} de l'arène : rang ${r.rang.ico} ${r.rang.nom} → +${r.rec.essence} ✨ +${r.rec.eclats} 💠 !` });
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

  lancerDuel(ca, a, cb, b, arene = null) {
    this.file = this.file.filter((f) => f.sid !== ca.sessionId && f.sid !== cb.sessionId);
    const d = nouveauDuel({ nom: a.nom, clan: a.clan, classe: a.classe, branche: a.branche, pvMax: a.pvMax, deck: a.deck, app: a.app }, { nom: b.nom, clan: b.clan, classe: b.classe, branche: b.branche, pvMax: b.pvMax, deck: b.deck, app: b.app }, (Math.random() * 1e9) >>> 0);
    const x = { d, decks: [a.deck, b.deck], ids: [ca.sessionId, cb.sessionId], clients: [ca, cb], noms: [a.nom, b.nom], essence: [a.essence || 0, b.essence || 0], tourVu: 0, limite: 0, arene, bot: arene?.bot ?? null };
    a.duel = b.duel = true; a.statut = b.statut = arene ? 'arene' : 'duel';
    this.duels.set(ca.sessionId, x); this.duels.set(cb.sessionId, x);
    if (!arene) {
      cb.send('info', { t: `⚔️ ${a.nom} t'attaque sur le territoire de son clan !` });
      this.broadcast('chat', { systeme: true, t: `⚔️ ${a.nom} défie ${b.nom} en duel !` });
    }
    this.majDuel(x);
  }
  majDuel(x) {
    if (x.d.fini) return this.terminerDuel(x, x.d.gagnant, 'pv');
    if (x.d.tour !== x.tourVu) {            // un nouveau tour : 40 secondes pour jouer
      x.tourVu = x.d.tour; x.minuteur?.clear();
      x.minuteur = this.clock.setTimeout(() => { if (!x.d.fini) { finTourDuel(x.d, x.d.actif); this.majDuel(x); } }, 40000);
      x.limite = Date.now() + 40000;
    }
    x.clients.forEach((c, q) => this.joueurs.get(c.sessionId)?.absent || c.send('duel', { ...vueDuel(x.d, q), limite: x.limite, arene: x.arene ? { moi: x.arene.elos[q], adv: x.arene.elos[1 - q], reflet: x.arene.reflet } : null }));
    // le Reflet joue son tour, carte après carte, comme un joueur
    if (x.bot !== null && x.d.actif === x.bot && !x.d.fini && !x.botAttend) {
      x.botAttend = true;
      this.clock.setTimeout(() => {
        x.botAttend = false; if (x.fin || x.d.fini) return;
        const i = A.coupBot(x.d, x.bot);
        if (!(i >= 0 && jouerDuel(x.d, x.bot, i))) finTourDuel(x.d, x.bot);
        this.majDuel(x);
      }, 700 + Math.random() * 700);
    }
  }
  terminerDuel(x, gagnant, raison) {
    if (x.fin) return; x.fin = true; x.minuteur?.clear();
    // statistiques : seulement les duels joués jusqu'au bout (ni abandon ni fuite)
    if (gagnant !== null && raison === 'pv') { const pj = (q) => x.d.j[q]; noterDuel({ gagnant: { classe: pj(gagnant).classe, clan: pj(gagnant).clan, deck: x.decks?.[gagnant] }, perdant: { classe: pj(1 - gagnant).classe, clan: pj(1 - gagnant).clan, deck: x.decks?.[1 - gagnant] }, arene: !!x.arene, reflet: !!x.arene?.reflet }); }
    if (x.arene) return this.finArene(x, gagnant, raison);
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

  finArene(x, gagnant, raison) {
    const jour = Q.jourDe();
    x.clients.forEach((c, q) => {
      this.duels.delete(c.sessionId);
      const j = this.joueurs.get(c.sessionId); if (!j) return;
      const issue = gagnant === null ? 'nul' : gagnant === q ? 'victoire' : 'defaite';
      j.duel = false; j.statut = 'libre'; j.protege = Date.now() + 15000;
      let ar = null;
      if (j.p) {
        A.aJour(j.p);
        ar = A.resultat(j.p, x.arene.elos[1 - q], issue, x.arene.reflet, jour);
        if (issue === 'victoire') { Q.evenement(j.p, 'arene'); this.points(j, x.arene.reflet ? POINTS.areneReflet : POINTS.arene); }
        j.sale = true; this.identite(j);
        areneEnregistrer(empreinte(j.jeton), { nom: j.nom, clan: j.clan, classe: j.classe, branche: j.branche || null, elo: j.p.arene.elo, v: j.p.arene.v, d: j.p.arene.d, deck: j.deck, pvMax: j.pvMax, app: j.app });
        this.pousserProfil(c, j);
      }
      c.send('duelResultat', { issue, butin: 0, adv: x.noms[1 - q], raison, vue: vueDuel(x.d, q), arene: ar });
    });
    if (!x.arene.reflet && gagnant !== null) this.broadcast('chat', { systeme: true, t: `🏟️ Arène : ${x.noms[gagnant]} bat ${x.noms[1 - gagnant]}${raison === 'abandon' ? ' (abandon)' : raison === 'depart' ? ' (fuite)' : ''} !` });
  }

  // ---------- arrivée : le serveur retrouve le profil du joueur ----------
  async onJoin(client, o = {}) {
    const r = await retrouver({ jeton: o.jeton, copie: o.copie, ancien: o.ancien });
    // déjà connecté avec ce profil (autre onglet) : on garde le profil en mémoire, l'ancien onglet est fermé
    for (const [id, autre] of this.joueurs) if (autre.jeton === r.jeton && id !== client.sessionId) {
      if (autre.p) r.p = autre.p;
      autre.remplace = true;
      const vieux = this.clients.find((x) => x.sessionId === id);
      vieux?.send('info', { t: 'Ton profil est ouvert ailleurs : cette page est déconnectée.' }); vieux?.leave(4001);
    }
    const j = { jeton: r.jeton, p: r.p, n: (this.nJ = (this.nJ || 0) + 1), x: 0, y: 0, dir: 0, statut: 'libre', sale: r.source === 'copie' || r.source === 'migration' };
    this.joueurs.set(client.sessionId, j);
    client.send('bienvenue', { id: client.sessionId });
    client.send('infos', { tout: [...this.joueurs.entries()].filter(([, x]) => x.p).map(([id, x]) => this.infosDe(id, x)) });
    client.send('profil', { p: j.p, sig: j.p ? signer(j.p) : null, jeton: j.jeton, source: r.source });
    client.send('filons', this.listeFilons()); client.send('mondial', this.etatMondial()); client.send('scores', this.scores()); client.send('sanctuaires', this.etatSanctuaires()); client.send('projets', PJ.vue(this.projetsAJour()));
    if (j.p) this.arriver(client, j);
  }
  // le joueur (avec un profil) apparaît dans le monde
  arriver(client, j) {
    const recu = A.aJour(j.p); if (recu) this.recompenseSaison(client, j, recu);
    this.identite(j);
    const [x, y] = DEPARTS[j.clan]; j.x = x + (Math.random() - 0.5) * 60; j.y = y + (Math.random() - 0.5) * 40;
    this.broadcast('chat', { systeme: true, t: `${j.nom} rejoint le ${NOMS_CLANS[j.clan]}.` });
  }
  // nom, clan, deck, PV… tirés du profil (jamais du client)
  identite(j) {
    const p = j.p; if (!p) return;
    j.nom = p.nom; j.clan = p.clan; j.classe = p.classe || ''; j.branche = p.branche || null; j.niv = P.niveau(p);
    j.deck = P.deckCombat(p); j.pvMax = PV_DUEL(P.pvMax(p), j.classe); j.essence = p.ress.essence; j.parcelle = codeParcelle(p.parcelle); j.app = AP.code(p); j.fam = F.actif(p) || ''; j.titre = HF.titreDe(p); j.maison = cleMaison(p); j.mont = MT.actif(p) || ''; j.deco = DC.code(p); j.branche = p.branche || null;
  }
  // ---------- expéditions en groupe (v78) ----------
  sidDe(k) { for (const [sid, x] of this.joueurs) if (x === k) return sid; return null; }
  envoyerGroupe(g, extra = {}) {
    const vue = { id: g.id, parti: !!g.parti, terr: g.terr || null, palier: g.palier || null, chef: g.chef,
      membres: g.membres.map((sid) => { const k = this.joueurs.get(sid), x = k?.p?.expedition; return { sid, nom: k?.nom || '?', clan: k?.clan, classe: k?.classe, pv: x?.pv ?? null, pvMax: x?.pvMax ?? null, etat: !x ? (g.parti ? 'fini' : 'pret') : x.aTerre ? 'aTerre' : x.combatEnCours ? 'combat' : (x.choixRelique || x.mystere) ? 'choix' : 'pret', position: x?.position || null }; }), ...extra };
    for (const sid of g.membres) this.clients.find((k) => k.sessionId === sid)?.send('groupe', { ...vue, moi: sid });
  }
  apresActionGroupe(c, j, type, res) {
    const g = this.groupes.get(j.groupe); if (!g) return;
    if (type === 'expeAbandon') return this.quitterGroupe(c.sessionId, 'abandon');
    if (type === 'expeCombat' && res?.fin === 'victoire') g.bossGagne = true;
    this.verifierGroupe(g);
  }
  // fin de l'expédition du groupe : quand plus personne ne peut avancer
  verifierGroupe(g) {
    if (!g.parti) return this.envoyerGroupe(g);
    const ks = g.membres.map((sid) => [sid, this.joueurs.get(sid)]).filter(([, k]) => k?.p);
    const encore = ks.filter(([, k]) => k.p.expedition), debout = encore.filter(([, k]) => !k.p.expedition.aTerre);
    if (debout.length === 0) {
      // tous à terre (ou tous arrivés) : ceux qui restent finissent, victoire si le boss est tombé
      for (const [sid, k] of encore) {
        const b = X.terminer(k.p, g.bossGagne ? 'victoire' : 'defaite'); k.statut = 'libre'; k.sale = true;
        const cl = this.clients.find((x) => x.sessionId === sid); if (cl) { this.pousserProfil(cl, k); cl.send('groupeBilan', b); }
      }
      for (const [sid, k] of ks) { k.groupe = null; this.clients.find((x) => x.sessionId === sid)?.send('groupe', null); }
      this.groupes.delete(g.id); return;
    }
    this.envoyerGroupe(g);
  }
  quitterGroupe(sid, raison) {
    const k = this.joueurs.get(sid), g = k?.groupe && this.groupes.get(k.groupe); if (!g) return;
    g.membres = g.membres.filter((x) => x !== sid); k.groupe = null;
    const cl = this.clients.find((x) => x.sessionId === sid); cl?.send('groupe', null);
    // il continue seul (un membre à terre qui part finit son expédition)
    const x = k.p?.expedition;
    if (x?.groupe) { delete x.groupe; if (x.aTerre) { const b = X.terminer(k.p, 'defaite'); cl?.send('groupeBilan', b); } k.sale = true; if (cl) this.pousserProfil(cl, k); }
    for (const s2 of g.membres) this.clients.find((y) => y.sessionId === s2)?.send('info', { t: `${k.nom} a quitté le groupe${raison === 'depart' ? ' (déconnexion)' : ''}.` });
    if (g.membres.length < 2) {
      // plus qu'un joueur : le groupe se dissout, il continue seul (ou finit s'il est à terre)
      for (const s2 of g.membres) {
        const k2 = this.joueurs.get(s2), c2 = this.clients.find((y) => y.sessionId === s2); if (!k2) continue;
        k2.groupe = null; c2?.send('groupe', null);
        const x2 = k2.p?.expedition;
        if (x2?.groupe) {
          delete x2.groupe;
          if (x2.aTerre) { const b = X.terminer(k2.p, g.bossGagne ? 'victoire' : 'defaite'); c2?.send('groupeBilan', b); }
          k2.sale = true; if (c2) this.pousserProfil(c2, k2);
        }
      }
      this.groupes.delete(g.id); return;
    }
    if (g.chef === sid) g.chef = g.membres[0];
    for (const s2 of g.membres) { const k2 = this.joueurs.get(s2); if (k2?.p?.expedition?.groupe) k2.p.expedition.groupe.n = g.membres.length; }
    this.verifierGroupe(g);
  }
  pousserProfil(client, j) { if (j.p) client.send('profil', { p: j.p, sig: signer(j.p), jeton: j.jeton }); }

  async onLeave(client, consenti) {
    // une coupure (pas un départ voulu) : on garde la place 20 s — duel, arène et file d'attente compris
    const jj = this.joueurs.get(client.sessionId);
    if (jj?.p && !consenti && !jj.remplace) {
      jj.absent = true;
      try {
        const nc = await this.allowReconnection(client, +process.env.CLANS_RECONNEXION || 20);
        jj.absent = false; this.reprise(nc, jj);
        return;
      } catch { jj.absent = false; /* trop tard : on le fait partir pour de bon */ }
    }
    const x = this.duels.get(client.sessionId);
    if (x) this.terminerDuel(x, 1 - x.ids.indexOf(client.sessionId), 'depart');   // fuir un duel, c'est le perdre
    this.file = this.file.filter((f) => f.sid !== client.sessionId);
    this.quitterGroupe(client.sessionId, 'depart');
    const j = this.joueurs.get(client.sessionId);
    if (j?.p && ![...this.joueurs.entries()].some(([id, a]) => id !== client.sessionId && a.jeton === j.jeton)) enregistrer(j.jeton, j.p);
    this.joueurs.delete(client.sessionId);
  }
  // de retour après une coupure : on renvoie tout ce qu'il faut pour reprendre où il en était
  reprise(client, j) {
    const x = this.duels.get(client.sessionId);
    if (x) { const q = x.ids.indexOf(client.sessionId); if (q >= 0) x.clients[q] = client; }
    client.send('bienvenue', { id: client.sessionId });
    client.send('infos', { tout: [...this.joueurs.entries()].filter(([, a]) => a.p).map(([id, a]) => this.infosDe(id, a)) });
    this.pousserProfil(client, j);
    client.send('filons', this.listeFilons()); client.send('mondial', this.etatMondial()); client.send('scores', this.scores()); client.send('sanctuaires', this.etatSanctuaires()); client.send('projets', PJ.vue(this.projetsAJour()));
    const f = this.file.find((e) => e.sid === client.sessionId); if (f) client.send('areneFile', { en: true, depuis: f.t });
    if (x && !x.fin) this.majDuel(x);
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

  // ---------- ce que voit chaque joueur ----------
  // 8 fois par seconde : les joueurs proches de lui (positions, en nombres) ;
  // 1 fois par seconde : tout le monde, pour la mini-carte et la liste des clans ;
  // nom, clan, niveau… : seulement quand ça change.
  infosDe(id, j) { return [j.n, id, j.nom, j.clan, j.niv, j.classe, j.parcelle || 111, j.app || '', j.fam || '', j.titre || '', j.maison === j.nom ? '' : j.maison || '', j.mont || '', j.deco || '', j.branche || '']; }
  envoyer() {
    if (!this.clients.length) return;
    this.tick = (this.tick || 0) + 1;
    const maj = [];
    for (const [id, j] of this.joueurs) {
      if (!j.p) continue;
      const inf = this.infosDe(id, j), sig = inf.join('|');
      if (sig !== j.infosVu) { j.infosVu = sig; maj.push(inf); }
    }
    if (maj.length) this.broadcast('infos', { maj });
    const vivants = [...this.joueurs.entries()].filter(([, j]) => j.p);
    for (const c of this.clients) {
      const moi = this.joueurs.get(c.sessionId); if (!moi?.p) continue;
      const proches = [];
      for (const [id, j] of vivants) {
        if (id === c.sessionId || Math.abs(j.x - moi.x) > VUE.l || Math.abs(j.y - moi.y) > VUE.h) continue;
        proches.push(j.n, Math.round(j.x), Math.round(j.y), j.dir | 0, STATUTS.indexOf(j.statut));
      }
      if (proches.length || moi.vuProches) c.send('m', proches);
      moi.vuProches = proches.length > 0;
    }
    if (this.tick % 8 === 0) {
      const carte = [];
      for (const [, j] of vivants) carte.push(j.n, Math.round(j.x), Math.round(j.y), STATUTS.indexOf(j.statut));
      this.broadcast('carte', carte);
    }
  }
}
