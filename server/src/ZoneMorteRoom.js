// =====================================================================
//  Salle Colyseus de ZONE MORTE en coop (2 à 4 survivants)
//  Le serveur fait vivre le MONDE partagé : zombies, portes et vitres,
//  barricades, meubles fouillés, feux de camp, heure et événements.
//  Chaque joueur garde SON survivant (santé, sac, besoins) dans son
//  navigateur : entre amis, on se fait confiance pour l'inventaire.
//  Pas d'état synchronisé automatiquement : des messages courts, et une
//  « photo » des zombies proches de chaque joueur 10 fois par seconde.
// =====================================================================
import colyseus from 'colyseus';
import { Monde } from '../../shared/survie/monde.js';
import { Horde } from '../../shared/survie/zombies.js';
import { MIN_PAR_S, obscurite, heure } from '../../shared/survie/physique.js';
import { genererContenu, ajouterObjet, retirerObjet, OBJETS } from '../../shared/survie/objets.js';
import { tirer, FUSILS } from '../../shared/survie/tir.js';
import { ARMES } from '../../shared/survie/zombies.js';
import { calendrier, nuitDeHorde, frigoPerime, PERISSABLE } from '../../shared/survie/evenements.js';
import { noterErreur } from './journal.js';

const { Room } = colyseus;
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const COULEURS = ['#4a7ac8', '#c8a84a', '#9a4ac8', '#4ac88a'];
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const cleValide = (c) => typeof c === 'string' && /^(sol:|feu:)?-?\d+,-?\d+$/.test(c);

export class ZoneMorteRoom extends Room {
  maxClients = 4;

  onCreate(options = {}) {
    this.code = Array.from({ length: 4 }, () => LETTRES[Math.floor(Math.random() * LETTRES.length)]).join('');
    this.setPrivate(true);
    this.setMetadata({ code: this.code, mode: 'zonemorte' });
    const g = options.graine ? [...String(options.graine).slice(0, 20)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) : (Math.random() * 4294967296) >>> 0;
    this.monde = new Monde(g, {});
    // chaque changement de tuile (porte enfoncée par un zombie…) part chez tout le monde
    const poser = this.monde.poser.bind(this.monde);
    this.monde.poser = (x, y, v) => { poser(x, y, v); this.broadcast('poser', { x: Math.floor(x), y: Math.floor(y), v }); };
    this.horde = new Horde(this.monde);
    this.depart = this.monde.depart();
    this.horde.activer([this.depart], { ...this.depart, r: 18 });
    this.conteneurs = {}; this.feux = []; this.temps = 480; this.evts = {};
    this.joueurs = new Map();   // sessionId -> { nom, couleur, x, y, dir, accroupi, dort, lumiere, mort }

    const sur = (type, f) => this.onMessage(type, (client, m = {}) => {
      try { const j = this.joueurs.get(client.sessionId); if (j) f(client, m || {}, j); } catch (e) { noterErreur(`zonemorte · ${type}`, e); }
    });
    sur('pos', (c, m, j) => {
      const x = num(m.x, j.x), y = num(m.y, j.y);
      if (Math.hypot(x - j.x, y - j.y) < 12) { j.x = x; j.y = y; }   // un saut trop grand est ignoré
      j.dir = num(m.dir); j.accroupi = !!m.accroupi; j.dort = !!m.dort; j.lumiere = !!m.lumiere; j.sante = Math.max(0, Math.min(100, num(m.sante, 100)));
    });
    sur('bruit', (c, m) => this.horde.bruit(num(m.x), num(m.y), Math.min(50, num(m.r))));
    sur('poser', (c, m) => {
      const v = Math.floor(num(m.v, -1)); if (v < 0 || v > 30) return;
      this.monde.poser(num(m.x), num(m.y), v);
    });
    sur('barr', (c, m) => {
      if (!cleValide(m.k)) return;
      if (m.b && typeof m.b === 'object') this.monde.barricades[m.k] = { n: Math.max(1, Math.min(3, Math.floor(num(m.b.n, 1)))), pv: Math.min(20, num(m.b.pv, 8)), pvMax: Math.min(20, num(m.b.pvMax, 8)) };
      else delete this.monde.barricades[m.k];
      this.monde.rev = (this.monde.rev || 0) + 1;
      this.broadcast('barr', { k: m.k, b: this.monde.barricades[m.k] || null }, { except: c });
    });
    // meubles : le serveur garde le contenu, les joueurs prennent et posent
    sur('ouvrir', (c, m) => { if (cleValide(m.cle)) c.send('conteneur', { cle: m.cle, inv: this.contenu(m.cle, String(m.type || 'commode')) }); });
    sur('prendre', (c, m) => {
      const inv = this.conteneurs[m.cle]; if (!inv) return;
      const i = Math.floor(num(m.i, -1)), o = inv[i]; if (!o || (m.id && o.id !== m.id)) return c.send('conteneur', { cle: m.cle, inv });
      const n = Math.max(1, Math.min(o.n, Math.floor(num(m.n, o.n))));
      const r = retirerObjet(inv, i, n);
      c.send('pris', { id: r.id, n: r.n, etat: o.etat, charge: o.charge });
      this.broadcast('conteneur', { cle: m.cle, inv });
    });
    sur('deposer', (c, m) => {
      if (!cleValide(m.cle) || !OBJETS[m.id]) return;
      const inv = this.contenu(m.cle, String(m.type || 'sol'));
      const e = ajouterObjet(inv, m.id, Math.max(1, Math.min(999, Math.floor(num(m.n, 1)))), m.etat != null ? num(m.etat) : undefined);
      if (m.charge != null) e.charge = num(m.charge);
      this.broadcast('conteneur', { cle: m.cle, inv });
    });
    sur('vider', (c, m) => { if (cleValide(m.cle)) { delete this.conteneurs[m.cle]; this.broadcast('conteneur', { cle: m.cle, inv: null }); } });
    sur('feu', (c, m) => {
      if (this.feux.length > 30) this.feux.shift();
      this.feux.push({ x: Math.floor(num(m.x)) + 0.5, y: Math.floor(num(m.y)) + 0.5, fin: this.temps + 240 });
      this.broadcast('feux', this.feux);
    });
    // combat : le serveur tient les zombies, c'est lui qui décide qui est touché
    sur('coup', (c, m, j) => {
      const a = ARMES[m.arme] || ARMES.poings, k = Math.min(1.6, Math.max(0.3, num(m.k, 1)));
      const touches = this.horde.coup({ x: j.x, y: j.y }, { x: Math.cos(num(m.dir)), y: Math.sin(num(m.dir)) }, { ...a, degats: a.degats.map((d) => d * k), chute: m.fatigue ? a.chute / 2 : a.chute });
      this.resultat(c, 'coup', touches);
      if (touches.length) this.horde.bruit(j.x, j.y, a.bruit);
    });
    sur('bouscule', (c, m, j) => { c.send('bouscule', { n: this.horde.bousculer({ x: j.x, y: j.y }, { x: Math.cos(num(m.dir)), y: Math.sin(num(m.dir)) }) }); });
    sur('tir', (c, m, j) => {
      const a = FUSILS[m.arme]; if (!a) return;
      const r = tirer(this.horde, { x: j.x, y: j.y }, { x: Math.cos(num(m.dir)), y: Math.sin(num(m.dir)) }, a, Math.min(0.3, num(m.bonus)));
      this.resultat(c, 'tir', r.touches, { fin: r.fin, de: c.sessionId, x: j.x, y: j.y, arme: m.arme });
    });
    sur('chat', (c, m, j) => {
      const t = String(m.texte || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return;
      const now = Date.now(); if (now - (j.dernierChat || 0) < 600) return; j.dernierChat = now;
      this.broadcast('chat', { nom: j.nom, couleur: j.couleur, texte: t });
    });
    sur('mort', (c, m, j) => { j.mort = true; this.broadcast('message', { texte: `💀 <b>${j.nom}</b> est mort${m.cause ? ` : ${String(m.cause).slice(0, 40).toLowerCase()}` : ''}.` }); });
    sur('renaitre', (c, m, j) => {
      Object.assign(j, { mort: false, x: this.depart.x, y: this.depart.y });
      c.send('init', this.init(c));
      this.broadcast('message', { texte: `🧍 <b>${j.nom}</b> reprend la route avec un nouveau survivant.` }, { except: c });
    });

    // simulation 20 fois par seconde, photos 10 fois par seconde
    this.tPhoto = 0;
    this.clock.setInterval(() => { try { this.tick(0.05); } catch (e) { noterErreur('zonemorte · tick', e); } }, 50);
  }

  contenu(cle, type) {
    if (!this.conteneurs[cle]) {
      if (cle.startsWith('sol:') || cle.startsWith('feu:')) this.conteneurs[cle] = [];
      else { const [x, y] = cle.split(',').map(Number); this.conteneurs[cle] = genererContenu(this.monde.seed, x, y, type); }
    }
    const c = this.conteneurs[cle];
    if (type === 'frigo' && frigoPerime(this.monde.seed, this.temps)) for (const o of c) if (PERISSABLE.has(o.id)) o.id = 'pourri';
    return c;
  }
  // résultat d'un coup ou d'un tir : au tireur le détail, aux autres juste le sang
  resultat(client, type, touches, extra = {}) {
    const t = touches.map((x) => ({ x: x.z.x, y: x.z.y, mort: x.mort, auSol: !!x.auSol, angle: x.z.angle, look: x.z.look }));
    client.send(`res_${type}`, { touches: t, ...extra });
    if (t.length || type === 'tir') this.broadcast('sang', { touches: t, ...extra }, { except: client });
  }
  init(client) {
    const sols = Object.fromEntries(Object.entries(this.conteneurs).filter(([k, v]) => k.startsWith('sol:') && v.length));
    return { code: this.code, graine: this.monde.seed, modifs: this.monde.modifs, barricades: this.monde.barricades, sols, feux: this.feux, temps: this.temps, evts: this.evts, depart: this.depart, moi: client.sessionId };
  }

  onJoin(client, options = {}) {
    const libres = COULEURS.filter((c) => ![...this.joueurs.values()].some((j) => j.couleur === c));
    const j = { nom: String(options.nom || 'Survivant').slice(0, 16), couleur: libres[0] || COULEURS[0], x: this.depart.x, y: this.depart.y, dir: 0, accroupi: false, dort: false, lumiere: false, mort: false, sante: 100 };
    this.joueurs.set(client.sessionId, j);
    client.send('init', this.init(client));
    this.broadcast('message', { texte: `🧍 <b>${j.nom}</b> a rejoint la partie.` }, { except: client });
  }
  async onLeave(client, consenti) {
    const j = this.joueurs.get(client.sessionId); if (!j) return;
    j.parti = true;
    try { if (consenti) throw new Error('parti'); await this.allowReconnection(client, 60); j.parti = false; client.send('init', this.init(client)); }
    catch { this.joueurs.delete(client.sessionId); this.broadcast('message', { texte: `🚪 <b>${j.nom}</b> a quitté la partie.` }); }
  }

  tick(dt) {
    const vivants = [...this.joueurs.values()].filter((j) => !j.mort && !j.parti);
    // le temps n'accélère que si tous les survivants dorment
    const tousDorment = vivants.length > 0 && vivants.every((j) => j.dort);
    this.temps += dt * MIN_PAR_S * (tousDorment ? 30 : 1);
    if (!vivants.length) return;
    const nuit = obscurite(this.temps);
    this.horde.activer(vivants);
    this.horde.maj(dt, vivants, nuit, (z, j) => {
      const id = [...this.joueurs.entries()].find(([, v]) => v === j)?.[0];
      const c = this.clients.find((x) => x.sessionId === id);
      c?.send('touche', { zx: z.x, zy: z.y, encercle: this.horde.autour(j.x, j.y, 1.6) });
    });
    for (const e of this.horde.evenements.splice(0)) {
      if (e.type === 'grogne') { if (Math.random() < 0.5) this.broadcast('ev', e); continue; }
      this.broadcast('ev', e);
      if (e.type === 'coupBarricade' || e.type === 'planche') { const k = `${Math.floor(e.x)},${Math.floor(e.y)}`; this.broadcast('barr', { k, b: this.monde.barricades[k] || null }); }
    }
    this.feux = this.feux.filter((f) => f.fin > this.temps);
    this.evenements(dt, vivants);
    this.tPhoto -= dt;
    if (this.tPhoto <= 0) { this.tPhoto = 0.1; this.photos(); }
  }
  // hélicoptère et hordes, comme en solo mais autour des joueurs
  evenements(dt, vivants) {
    const ev = this.evts, t = this.temps, cal = calendrier(this.monde.seed), p = vivants[Math.floor(Math.random() * vivants.length)];
    if (!ev.helico && t >= cal.helico) {
      ev.helico = true; const a = Math.random() * Math.PI * 2;
      this.helico = { x: p.x - Math.cos(a) * 70, y: p.y - Math.sin(a) * 70, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, t: 20, b: 0 };
      this.broadcast('ev', { type: 'helico' });
    }
    if (this.helico) {
      const h = this.helico; h.x += h.vx * dt; h.y += h.vy * dt; h.t -= dt; h.b -= dt;
      if (h.b <= 0) { h.b = 1; this.horde.bruit(h.x, h.y, 28); }
      if (h.t <= 0) this.helico = null;
    }
    const { jour, h: hr } = heure(t);
    if (hr >= 22 && !ev[`horde${jour}`] && nuitDeHorde(this.monde.seed, jour)) {
      ev[`horde${jour}`] = true;
      const a = Math.random() * Math.PI * 2, n = 16 + Math.min(24, jour * 3);   // plus nombreuse qu'en solo : vous êtes plusieurs
      for (let i = 0; i < n; i++) {
        const x = p.x + Math.cos(a) * 55 + (Math.random() - 0.5) * 10, y = p.y + Math.sin(a) * 55 + (Math.random() - 0.5) * 10;
        if (this.monde.solide(x, y)) continue;
        const z = this.horde.ajouter(x, y); z.etat = 'alerte'; z.cible = { x: p.x + (Math.random() - 0.5) * 16, y: p.y + (Math.random() - 0.5) * 16 };
      }
      this.broadcast('ev', { type: 'horde' });
    }
  }
  // à chacun : les zombies à moins de 45 m, les autres joueurs, l'heure
  photos() {
    const joueurs = [...this.joueurs.entries()].filter(([, j]) => !j.parti).map(([id, j]) => [id, j.nom, j.couleur, Math.round(j.x * 100) / 100, Math.round(j.y * 100) / 100, Math.round(j.dir * 100) / 100, (j.accroupi ? 1 : 0) | (j.dort ? 2 : 0) | (j.lumiere ? 4 : 0) | (j.mort ? 8 : 0), Math.round(j.sante)]);
    const helico = this.helico ? [Math.round(this.helico.x), Math.round(this.helico.y), Math.round(Math.atan2(this.helico.vy, this.helico.vx) * 100) / 100] : null;
    for (const c of this.clients) {
      const j = this.joueurs.get(c.sessionId); if (!j) continue;
      const z = this.horde.z.filter((q) => Math.abs(q.x - j.x) < 45 && Math.abs(q.y - j.y) < 45)
        .map((q) => [q.id, Math.round(q.x * 100), Math.round(q.y * 100), Math.round(q.angle * 100), (q.aTerre > 0 ? 1 : 0) | (q.prep > 0 ? 2 : 0) | (q.etat === 'chasse' ? 4 : 0), q.look]);
      c.send('photo', { t: this.temps, z, j: joueurs, h: helico });
    }
  }
}
