// =====================================================================
//  ZONE MORTE — client (page /zone-morte)
//  Phase 1 « Socle » : monde infini par morceaux, déplacement, portes et
//  fenêtres, champ de vision, jour / nuit, carte, sauvegarde locale.
//  Phase 2 « Zombies » : ouïe, vue, errance, poursuite, combat, blessures,
//  saignement, infection, mort définitive.
// =====================================================================
import './style.css';
import Phaser from 'phaser';
import { Monde, CH, T, zoneDe, hash } from '../../../shared/survie/monde.js';
import { deplacer, cibleInteraction, texteInteraction, interagir, champDeVision, visible, heure, obscurite, MIN_PAR_S } from '../../../shared/survie/physique.js';
import { Horde, ARMES } from '../../../shared/survie/zombies.js';
import { nouveauSurvivant, blesser, bander, majSurvivant, tirerBlessure, peutCourir, BLESSURES } from '../../../shared/survie/survivant.js';

const TILE = 24;                 // pixels par tuile (1 tuile = 1 m)
const PORTEE_VUE = 24;
const CLE_SAUVEGARDE = 'zoneMorte';
const $ = (id) => document.getElementById(id);

// ---------- couleurs des tuiles ----------
const COUL = {
  [T.herbe]: '#4a5b34', [T.route]: '#3a3b3d', [T.trottoir]: '#7b7a74', [T.chemin]: '#8a7b60', [T.arbre]: '#4a5b34', [T.buisson]: '#4a5b34',
  [T.parquet]: '#7a5a3a', [T.carrelage]: '#a9aaa2', [T.mur]: '#2c2a28', [T.porte]: '#5c3a1e', [T.porteOuverte]: '#7a5a3a', [T.fenetre]: '#2c2a28',
  [T.fenetreCassee]: '#2c2a28', [T.meuble]: '#7a5a3a', [T.cloture]: '#4a5b34', [T.parking]: '#45464a', [T.beton]: '#8d8c86', [T.etagere]: '#8d8c86',
  [T.lit]: '#7a5a3a', [T.champ]: '#7c7040', [T.ligne]: '#3a3b3d', [T.comptoir]: '#8d8c86', [T.voiture]: '#3a3b3d',
};
const COUL_TOIT = { tuiles: ['#7d3b2a', '#6a3022'], ardoise: ['#3f4652', '#343a44'], brun: ['#5d4a3a', '#4d3c2f'], plat: ['#5b5d5a', '#4b4d4a'] };
const COUL_VOITURES = ['#7a1f1f', '#22406b', '#c9c4b5', '#2f2f2f', '#4f6b3a', '#8a6a1f'];

// ---------- état de la partie ----------
let partie = null;   // { graine, joueur:{x,y}, temps, vus:Set, survivant, debut }
let monde = null, horde = null;
function chargerSauvegarde() { try { return JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null'); } catch { return null; } }
function sauver() {
  if (!partie || partie.survivant.mort) return;
  try {
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ v: 2, graine: partie.graine, x: partie.joueur.x, y: partie.joueur.y, temps: partie.temps, modifs: monde.modifs, vus: [...partie.vus], survivant: partie.survivant, horde: horde.sauvegarde() }));
  } catch { /* stockage plein ou bloqué : tant pis */ }
}
function nouvellePartie(graineTexte) {
  const g = graineTexte ? [...String(graineTexte)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) : (Math.random() * 4294967296) >>> 0;
  monde = new Monde(g, {});
  partie = { graine: g, joueur: monde.depart(), temps: 480, vus: new Set(), survivant: nouveauSurvivant() };
  horde = new Horde(monde);
  horde.activer(partie.joueur.x, partie.joueur.y, { ...partie.joueur, r: 18 });   // pas de zombie juste à côté au réveil
  sauver();
}
function reprendre(s) {
  monde = new Monde(s.graine, s.modifs || {});
  partie = { graine: s.graine, joueur: { x: s.x, y: s.y }, temps: s.temps, vus: new Set(s.vus || []), survivant: { ...nouveauSurvivant(), ...(s.survivant || {}), action: null } };
  horde = new Horde(monde, s.horde || {});
  horde.activer(s.x, s.y, { x: s.x, y: s.y, r: 8 });
}
// mort : la sauvegarde est effacée (mort définitive), on garde le record
function mourir() {
  const sv = partie.survivant, jours = (partie.temps - 480) / 1440;
  localStorage.removeItem(CLE_SAUVEGARDE);
  let rec = {}; try { rec = JSON.parse(localStorage.getItem('zoneMorteRecord') || '{}'); } catch { /* rien */ }
  const record = !rec.jours || jours > rec.jours;
  if (record) localStorage.setItem('zoneMorteRecord', JSON.stringify({ jours, tues: sv.tues }));
  $('mortCause').textContent = sv.mort;
  $('mortStats').innerHTML = `Tu as survécu <b>${Math.floor(jours)} jour${Math.floor(jours) > 1 ? 's' : ''} et ${Math.floor((jours % 1) * 24)} h</b> · <b>${sv.tues}</b> zombie${sv.tues > 1 ? 's' : ''} tué${sv.tues > 1 ? 's' : ''}${record ? '<br>🏆 Nouveau record !' : rec.jours ? `<br>Record : ${Math.floor(rec.jours)} j ${Math.floor((rec.jours % 1) * 24)} h, ${rec.tues} zombies` : ''}`;
  setTimeout(() => $('mort').classList.remove('cache'), 1500);
}

// ---------- petits sons (Web Audio, sans fichier) ----------
let ac = null;
function bruitBlanc(duree, decroit) {
  const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * duree, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * decroit));
  n.buffer = b; return n;
}
// volume selon la distance (sons de zombies)
function son(type, distance = 0) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    const vol = Math.max(0, 1 - distance / 22);
    if (vol <= 0) return;
    if (type === 'grogne') {   // râle : bruit filtré grave qui ondule
      const n = bruitBlanc(1.2, 0.6), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(140 + Math.random() * 80, t); f.frequency.linearRampToValueAtTime(90 + Math.random() * 40, t + 1.1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.25); g.gain.linearRampToValueAtTime(0, t + 1.15);
      n.connect(f); f.connect(g); n.start(t); return;
    }
    if (type === 'swing') { const n = bruitBlanc(0.25, 0.08), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2200, t + 0.2); g.gain.value = 0.18; n.connect(f); f.connect(g); n.start(t); return; }
    if (type === 'impact' || type === 'coupPorte' || type === 'tue') {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(type === 'coupPorte' ? 70 : 120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime((type === 'tue' ? 0.6 : 0.45) * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); o.start(t); o.stop(t + 0.22);
      const n = bruitBlanc(0.12, 0.03), g2 = ac.createGain(); g2.gain.value = 0.25 * vol; n.connect(g2); g2.connect(ac.destination); n.start(t); return;
    }
    if (type === 'blesse') {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.3);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(f); f.connect(g); o.start(t); o.stop(t + 0.36); return;
    }
    if (type === 'vitre') {
      g.gain.value = vol;
      const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.08)) * (Math.random() < 0.3 ? 1 : 0.3);
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      n.buffer = b; n.connect(f); f.connect(g); g.gain.value = 0.5 * vol; n.start(t);
    } else {
      const o = ac.createOscillator(); o.type = type === 'bloque' ? 'square' : 'triangle';
      o.frequency.setValueAtTime(type === 'porteFermee' ? 90 : 140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); o.start(t); o.stop(t + 0.2);
    }
  } catch { /* pas de son */ }
}

let minuterieMsg = 0;
function message(txt, ms = 2500) { const m = $('message'); m.innerHTML = txt; m.classList.add('on'); clearTimeout(minuterieMsg); minuterieMsg = setTimeout(() => m.classList.remove('on'), ms); }

// ---------- commandes (clavier + tactile) ----------
const touches = new Set();
const tactile = { dx: 0, dy: 0, course: false };
let actionDemandee = false, coupDemande = false, bousculeDemandee = false, bandageDemande = false;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); touches.add(k);
  if (k === 'e' && !e.repeat) actionDemandee = true;
  if (k === ' ') { coupDemande = true; e.preventDefault(); }
  if (k === 'f' && !e.repeat) bousculeDemandee = true;
  if (k === 'b' && !e.repeat) bandageDemande = true;
  if (k === 'c' && !e.repeat && partie) partie.survivant.accroupi = !partie.survivant.accroupi;
  if (k === 'm' && !e.repeat) $('minicarte').classList.toggle('grand');
  if (k === 'escape') basculerMenu();
});
addEventListener('keyup', (e) => touches.delete(e.key.toLowerCase()));
addEventListener('blur', () => touches.clear());
function directionClavier() {
  let dx = 0, dy = 0;
  if (touches.has('z') || touches.has('w') || touches.has('arrowup')) dy -= 1;
  if (touches.has('s') || touches.has('arrowdown')) dy += 1;
  if (touches.has('q') || touches.has('a') || touches.has('arrowleft')) dx -= 1;
  if (touches.has('d') || touches.has('arrowright')) dx += 1;
  return { dx: dx + tactile.dx, dy: dy + tactile.dy, course: touches.has('shift') || tactile.course };
}
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('tactile');
(function joystick() {
  const j = $('joystick'), bouton = j.querySelector('i'); let id = null;
  const bouger = (e) => {
    const r = j.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2, l = Math.hypot(x, y), max = r.width / 2 - 20;
    const k = l > max ? max / l : 1; bouton.style.transform = `translate(${x * k}px, ${y * k}px)`;
    tactile.dx = l > 8 ? x / Math.max(l, max) : 0; tactile.dy = l > 8 ? y / Math.max(l, max) : 0;
  };
  j.addEventListener('pointerdown', (e) => { id = e.pointerId; j.setPointerCapture(id); bouger(e); });
  j.addEventListener('pointermove', (e) => { if (e.pointerId === id) bouger(e); });
  const fin = () => { id = null; tactile.dx = tactile.dy = 0; bouton.style.transform = ''; };
  j.addEventListener('pointerup', fin); j.addEventListener('pointercancel', fin);
  $('btAction').addEventListener('pointerdown', () => { actionDemandee = true; });
  $('btFrapper').addEventListener('pointerdown', () => { coupDemande = true; });
  $('btBousculer').addEventListener('pointerdown', () => { bousculeDemandee = true; });
  $('btAccroupi').addEventListener('pointerdown', () => { if (partie) partie.survivant.accroupi = !partie.survivant.accroupi; });
  $('btBander').addEventListener('pointerdown', () => { bandageDemande = true; });
  $('btCourir').addEventListener('pointerdown', () => { tactile.course = !tactile.course; $('btCourir').classList.toggle('on', tactile.course); });
  $('minicarte').addEventListener('click', () => $('minicarte').classList.toggle('grand'));
}());

// ---------- dessin d'un morceau (une texture par morceau) ----------
function dessinerMorceau(ctx, m) {
  const R = (x, y, k) => hash(monde.seed, m.cx * CH + x, m.cy * CH + y, k) / 4294967296;
  const voit = COUL_VOITURES[hash(monde.seed, m.cx, m.cy, 9) % COUL_VOITURES.length];
  ctx.clearRect(0, 0, CH * TILE, CH * TILE);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
    const v = m.t[y * CH + x], px = x * TILE, py = y * TILE;
    ctx.fillStyle = COUL[v] || '#f0f'; ctx.fillRect(px, py, TILE, TILE);
    // légère variation de teinte pour casser l'effet damier
    const n = R(x, y, 1);
    if (v === T.herbe || v === T.arbre || v === T.buisson || v === T.cloture) { ctx.fillStyle = `rgba(${n < 0.5 ? '0,0,0' : '120,140,60'},${0.03 + n * 0.04})`; ctx.fillRect(px, py, TILE, TILE); }
    if (v === T.parquet || v === T.porteOuverte || v === T.meuble || v === T.lit) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(px, py + (y % 2 ? 0 : TILE / 2), TILE, 1); }
    if (v === T.carrelage) { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1); }
    switch (v) {
      case T.arbre: {
        const r = TILE * (0.62 + n * 0.25);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(px + TILE / 2 + 3, py + TILE / 2 + 4, r, 0, 7); ctx.fill();
        ctx.fillStyle = n < 0.5 ? '#2c4a22' : '#35552a'; ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2, r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(160,200,100,.15)'; ctx.beginPath(); ctx.arc(px + TILE / 2 - r / 3, py + TILE / 2 - r / 3, r / 2, 0, 7); ctx.fill();
        break;
      }
      case T.buisson: ctx.fillStyle = '#3a5a2a'; ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.42, 0, 7); ctx.fill(); break;
      case T.champ: ctx.fillStyle = 'rgba(60,50,20,.35)'; for (let i = 2; i < TILE; i += 6) ctx.fillRect(px, py + i, TILE, 2); break;
      case T.ligne: ctx.fillStyle = '#d8d3b8'; ctx.fillRect(px, py + TILE / 2 - 1, TILE, 2); break;
      case T.trottoir: ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1); break;
      case T.mur: ctx.fillStyle = '#3a3734'; ctx.fillRect(px, py, TILE, 4); break;
      case T.porte: ctx.fillStyle = '#3e2712'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); ctx.fillStyle = '#d9b34a'; ctx.fillRect(px + TILE - 8, py + TILE / 2 - 2, 3, 4); break;
      case T.porteOuverte: ctx.fillStyle = '#5c3a1e'; ctx.fillRect(px, py, 4, TILE); break;
      case T.fenetre: ctx.fillStyle = '#8fb3c9'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(px + 5, py + 5, 4, TILE - 10); break;
      case T.fenetreCassee: ctx.fillStyle = '#6c625a'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6); ctx.fillStyle = '#b5d0de'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 3 + R(x, y, 10 + i) * (TILE - 8), py + 3 + R(x, y, 20 + i) * (TILE - 8), 3, 2); break;
      case T.meuble: ctx.fillStyle = '#4d3420'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px + 4, py + 4, TILE - 8, 3); break;
      case T.lit: ctx.fillStyle = '#d8d4c8'; ctx.fillRect(px + 2, py + 1, TILE - 4, TILE - 2); ctx.fillStyle = '#4a6a8a'; ctx.fillRect(px + 2, py + TILE / 3, TILE - 4, TILE * 0.6); break;
      case T.etagere: ctx.fillStyle = '#5a5c60'; ctx.fillRect(px + 3, py, TILE - 6, TILE); for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#b33', '#3a7', '#dc4', '#36b'][Math.floor(R(x, y, 30 + i) * 4)]; ctx.fillRect(px + 5, py + 3 + i * 7, TILE - 10, 4); } break;
      case T.comptoir: ctx.fillStyle = '#6a5a4a'; ctx.fillRect(px, py + 3, TILE, TILE - 6); break;
      case T.cloture: ctx.fillStyle = '#8a7a5e'; ctx.fillRect(px, py + TILE / 2 - 2, TILE, 4); ctx.fillRect(px + TILE / 2 - 2, py + 2, 4, TILE - 4); break;
      case T.voiture: ctx.fillStyle = voit; ctx.fillRect(px, py, TILE, TILE); ctx.fillStyle = 'rgba(160,190,210,.45)'; if (x % 4 === 1) ctx.fillRect(px + 4, py + 3, TILE - 4, TILE - 6); break;
      case T.parking: ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(px, py, TILE, 1); break;
    }
  }
}

// ---------- la scène ----------
class SceneZone extends Phaser.Scene {
  constructor() { super('zone'); }
  create() {
    this.morceaux = new Map();   // "cx,cy" -> { img, key, version, toits: [] }
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('m_')) this.textures.remove(k);   // après une nouvelle partie
    this.cameras.main.setBackgroundColor('#0d0f0c');
    this.joueur = this.add.graphics().setDepth(50);
    this.dir = { x: 0, y: 1 };
    this.souris = null;
    this.input.on('pointermove', (p) => { if (!p.wasTouch) this.souris = p; });
    this.creerNuit();
    this.scale.on('resize', () => this.creerNuit());
    this.dernierLieu = '';
    this.tMini = 0; this.tSauve = 0;
    // zombies, cadavres, sang, cercle de bruit
    creerTexturesZombies(this);
    this.sprites = new Map();          // id zombie -> image
    this.decors = [];                  // sang et cadavres au sol (les plus anciens disparaissent)
    this.anneau = this.add.graphics().setDepth(49);
    this.bruitVisuel = 0;
    this.arcCoup = this.add.graphics().setDepth(66);
    this.tCoup = 0; this.tAction = 0; this.tAgrippe = 0; this.pas = 0; this.dejaVuZombie = false; this.rouge = 0;
    this.input.on('pointerdown', (pt) => { if (pt.wasTouch) return; if (pt.rightButtonDown()) bousculeDemandee = true; else coupDemande = true; });
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.dessinerJoueur();
    this.cameras.main.centerOn(partie.joueur.x * TILE, partie.joueur.y * TILE);
  }
  // deux calques à demi-résolution (plus léger, et les bords sont adoucis) :
  //  - « ombre » sous les toits : ce qui est hors du champ de vision (on voit le décor dont on se souvient)
  //  - « nuit » par-dessus tout : l'obscurité ambiante, sauf un halo autour du joueur
  creerNuit() {
    const w = Math.ceil(this.scale.width / 2), h = Math.ceil(this.scale.height / 2);
    for (const k of ['ombre', 'nuit']) { this[k]?.destroy(); if (this.textures.exists(k)) this.textures.remove(k); }
    this.texOmbre = this.textures.createCanvas('ombre', w, h); this.texNuit = this.textures.createCanvas('nuit', w, h);
    this.ombre = this.add.image(0, 0, 'ombre').setOrigin(0).setScale(2).setScrollFactor(0).setDepth(55);
    this.nuit = this.add.image(0, 0, 'nuit').setOrigin(0).setScale(2).setScrollFactor(0).setDepth(100);
    this.vueCle = '';
  }
  // morceaux autour de la caméra : on crée ceux qui manquent, on jette ceux qui sont loin
  streamer() {
    const v = this.cameras.main.worldView, s = CH * TILE;
    // textures seulement pour ce qui est à l'écran (+ une marge de 4 tuiles) : chaque morceau pèse 2,3 Mo en mémoire graphique
    const mg = 4 * TILE, x0 = Math.floor((v.x - mg) / s), x1 = Math.floor((v.x + v.width + mg) / s), y0 = Math.floor((v.y - mg) / s), y1 = Math.floor((v.y + v.height + mg) / s);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = `${cx},${cy}`, m = monde.morceau(cx, cy);
      let e = this.morceaux.get(k);
      if (!e) {
        const key = `m_${k}`; const tex = this.textures.createCanvas(key, s, s);
        e = { key, tex, img: this.add.image(cx * s, cy * s, key).setOrigin(0).setDepth(0), version: -1, toits: [] };
        for (const b of m.batiments) e.toits.push(this.creerToit(cx, cy, b));
        this.morceaux.set(k, e);
      }
      if (e.version !== (m.version || 0)) { dessinerMorceau(e.tex.getContext(), m); e.tex.refresh(); e.version = m.version || 0; }
    }
    for (const [k, e] of this.morceaux) {
      const [cx, cy] = k.split(',').map(Number);
      if (cx < x0 - 1 || cx > x1 + 1 || cy < y0 - 1 || cy > y1 + 1) { e.img.destroy(); e.toits.forEach((t) => t.g.destroy()); this.textures.remove(e.key); this.morceaux.delete(k); }
    }
  }
  // toit d'un bâtiment : dessiné une fois dans une petite texture (bien plus léger qu'un Graphics redessiné à chaque image)
  creerToit(cx, cy, b) {
    const M = 8, W = b.w * TILE, H = b.h * TILE, key = `t_${cx},${cy},${b.x},${b.y}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, W + M * 2, H + M * 2), ctx = tex.getContext();
    const [c1, c2] = COUL_TOIT[b.toit] || COUL_TOIT.plat, X = M, Y = M;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X + 6, Y + 6, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
    if (b.toit === 'plat') {
      ctx.fillStyle = c1; ctx.fillRect(X - 2, Y - 2, W + 4, H + 4); ctx.strokeStyle = c2; ctx.lineWidth = 3; ctx.strokeRect(X + 4, Y + 4, W - 8, H - 8);
      ctx.fillStyle = '#6a6c68'; ctx.fillRect(X + W * 0.6, Y + H * 0.3, 30, 22); ctx.fillRect(X + W * 0.25, Y + H * 0.6, 22, 22);   // climatiseurs
      ctx.font = 'bold 15px Segoe UI, sans-serif'; const txt = b.enseigne.toUpperCase(), tw = ctx.measureText(txt).width;
      ctx.fillStyle = '#8a2a1a'; ctx.fillRect(X + W / 2 - tw / 2 - 8, Y + 12, tw + 16, 24); ctx.fillStyle = '#e8e2c8'; ctx.textBaseline = 'middle'; ctx.fillText(txt, X + W / 2 - tw / 2, Y + 25);
    } else if (W >= H) {   // faîtage horizontal
      ctx.fillStyle = c1; ctx.fillRect(X - 4, Y - 4, W + 8, H / 2 + 4); ctx.fillStyle = c2; ctx.fillRect(X - 4, Y + H / 2, W + 8, H / 2 + 4);
      ctx.beginPath(); for (let x = X; x < X + W; x += 10) { ctx.moveTo(x, Y - 4); ctx.lineTo(x, Y + H + 4); } ctx.stroke();
    } else {
      ctx.fillStyle = c1; ctx.fillRect(X - 4, Y - 4, W / 2 + 4, H + 8); ctx.fillStyle = c2; ctx.fillRect(X + W / 2, Y - 4, W / 2 + 4, H + 8);
      ctx.beginPath(); for (let y = Y; y < Y + H; y += 10) { ctx.moveTo(X - 4, y); ctx.lineTo(X + W + 4, y); } ctx.stroke();
    }
    tex.refresh();
    const g = this.add.image((cx * CH + b.x) * TILE - M, (cy * CH + b.y) * TILE - M, key).setOrigin(0).setDepth(60);
    const d = g.destroy.bind(g); g.destroy = () => { d(); this.textures.remove(key); };
    return { g, b };
  }
  dessinerJoueur() {
    const g = this.joueur; g.clear(); g.setScale(partie?.survivant?.accroupi ? 0.85 : 1);
    const a = Math.atan2(this.dir.y, this.dir.x);
    g.fillStyle(0x000000, 0.3).fillEllipse(3, 4, 18, 18);
    g.fillStyle(0x4a5a7a, 1).fillEllipse(0, 0, 18, 14);                          // épaules
    g.fillStyle(0xd9b38c, 1).fillCircle(Math.cos(a) * 2, Math.sin(a) * 2, 6);      // tête
    g.fillStyle(0x3a2a1a, 1).fillCircle(-Math.cos(a) * 1, -Math.sin(a) * 1, 5);    // cheveux
    g.fillStyle(0xffffff, 0.8).fillTriangle(Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 9, Math.cos(a - 0.5) * 9, Math.sin(a - 0.5) * 9);
    g.rotation = 0;
  }
  update(_t, dtMs) {
    if (!partie || menuOuvert) return;
    const dt = Math.min(0.1, (this.game.loop.rawDelta || dtMs) / 1000), p = partie.joueur;
    // déplacement
    const sv = partie.survivant;
    if (sv.mort) { this.majZombies(dt, p, obscurite(partie.temps)); return; }
    let { dx, dy, course } = directionClavier();
    if (this.tAction > 0 || this.tAgrippe > 0) { this.tAction -= dt; this.tAgrippe -= dt; dx *= 0.3; dy *= 0.3; course = false; }   // se bander, ou agrippé
    course = course && peutCourir(sv) && !sv.accroupi;
    if (dx || dy) { const l = Math.hypot(dx, dy); this.dir = { x: dx / l, y: dy / l }; }
    const fait = deplacer(monde, p, dx, dy, dt, course, sv.accroupi ? 0.5 : sv.sante < 25 ? 0.8 : 1);
    majSurvivant(sv, dt, { course, bouge: fait > 0 });
    // bruit des pas : courir s'entend de loin, s'accroupir presque pas
    this.pas += fait;
    if (this.pas >= 1) { this.pas = 0; const r = course ? 9 : sv.accroupi ? 0.8 : 3; horde.bruit(p.x, p.y, r); this.bruitVisuel = Math.max(this.bruitVisuel, r); }
    if (this.souris) {   // à la souris, on regarde vers le curseur
      this.souris.updateWorldPoint(this.cameras.main);
      const sx = this.souris.worldX / TILE - p.x, sy = this.souris.worldY / TILE - p.y, l = Math.hypot(sx, sy);
      if (l > 0.3) this.dir = { x: sx / l, y: sy / l };
    }
    this.joueur.setPosition(p.x * TILE, p.y * TILE); this.dessinerJoueur();
    this.cameras.main.centerOn(p.x * TILE, p.y * TILE);
    // temps qui passe
    partie.temps += dt * MIN_PAR_S;
    this.streamer();
    // interaction
    const cible = cibleInteraction(monde, p, this.dir);
    const inv = $('invite');
    if (cible) { inv.innerHTML = `<kbd>E</kbd>${texteInteraction(cible.type)}`; inv.classList.add('on'); } else inv.classList.remove('on');
    if (actionDemandee) {
      actionDemandee = false;
      const r = interagir(monde, p, cible);
      if (r === 'fouille') message('Rien à fouiller pour l\'instant : l\'inventaire arrive à la phase 3.');
      else if (r === 'bloque') message('Tu es dans l\'embrasure de la porte.');
      else if (r === 'vitre') message('La vitre vole en éclats… <small>(le bruit attire les zombies)</small>');
      if (r) son(r);
      const br = { vitre: 22, porteOuverte: 5, porteFermee: 6 }[r];
      if (br) { horde.bruit(p.x, p.y, br); this.bruitVisuel = Math.max(this.bruitVisuel, br); }
    }
    this.combat(dt, p, sv);
    this.majZombies(dt, p, obscurite(partie.temps));
    if (sv.mort) { message(`<b>${sv.mort}</b>`, 4000); mourir(); return; }
    majHudSurvivant(sv);
    // toits : on enlève celui du bâtiment où l'on se trouve
    const ici = monde.batimentEn(p.x, p.y);
    for (const e of this.morceaux.values()) for (const t of e.toits) {
      const cible2 = t.b === ici ? 0 : 1, a = t.g.alpha + (cible2 - t.g.alpha) * Math.min(1, dt * 10);
      t.g.setAlpha(a);
    }
    this.joueur.setDepth(ici ? 50 : 65);   // dehors on passe devant les toits voisins
    this.dessinerNuit(p, !!ici);
    // lieu
    const z = zoneDe(monde.seed, Math.floor(p.x / CH), Math.floor(p.y / CH));
    const lieu = z.ville ? `${z.ville.nom}${z.type === 'centre' ? ' · centre' : ''}` : 'Campagne';
    if (lieu !== this.dernierLieu) {
      if (z.ville && !this.dernierLieu.startsWith(z.ville.nom) && this.dernierLieu) message(`Bienvenue à <b>${z.ville.nom}</b>`, 3000);
      this.dernierLieu = lieu; $('hudLieu').textContent = lieu;
    }
    $('hudHeure').textContent = heure(partie.temps).texte;
    // zones explorées, carte, sauvegarde
    const cx = Math.floor(p.x / CH), cy = Math.floor(p.y / CH);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) partie.vus.add(`${cx + i},${cy + j}`);
    this.tMini -= dt; if (this.tMini <= 0) { this.tMini = 0.5; dessinerMinicarte(); }
    this.tSauve -= dt; if (this.tSauve <= 0) { this.tSauve = 10; sauver(); }
  }
  // ---------- combat : frapper, bousculer, se bander ----------
  combat(dt, p, sv) {
    this.tCoup -= dt;
    const arme = ARMES[sv.arme || 'batte'];
    if (coupDemande) {
      coupDemande = false;
      if (this.tCoup <= 0 && this.tAction <= 0) {
        const fatigue = sv.endurance < 20 ? 1.6 : 1;
        this.tCoup = arme.recharge * fatigue; sv.endurance = Math.max(0, sv.endurance - arme.endurance);
        son('swing'); this.dessinerArc(p, arme);
        const touches = horde.coup({ ...p }, this.dir, fatigue > 1 ? { ...arme, degats: arme.degats.map((d) => d * 0.6), chute: arme.chute / 2 } : arme);
        for (const t of touches) {
          this.sang(t.z.x, t.z.y, t.mort ? 2 : 1);
          if (t.mort) { sv.tues++; this.cadavre(t.z); son('tue'); } else son('impact');
        }
        if (touches.length) { horde.bruit(p.x, p.y, arme.bruit); this.cameras.main.shake(70, 0.003); }
      }
    }
    if (bousculeDemandee) {
      bousculeDemandee = false;
      if (this.tCoup <= 0 && sv.endurance > 5) { this.tCoup = 0.6; sv.endurance -= 6; const n = horde.bousculer(p, this.dir); this.dessinerArc(p, { portee: 1.2, arc: 2.2 }, 0xc8d0b8); if (n) son('impact'); }
    }
    if (bandageDemande) {
      bandageDemande = false;
      if (sv.saignements <= 0) message('Tu ne saignes pas.');
      else if (sv.bandages <= 0) message('Plus de quoi te bander… <small>(la fouille arrive en phase 3)</small>');
      else if (bander(sv)) { this.tAction = 1.5; message(`Tu déchires tes vêtements pour bander la plaie. <small>(${sv.bandages} restant${sv.bandages > 1 ? 's' : ''})</small>`); }
    }
  }
  dessinerArc(p, arme, couleur = 0xffffff) {
    const g = this.arcCoup, a = Math.atan2(this.dir.y, this.dir.x), r = arme.portee * TILE;
    g.clear().fillStyle(couleur, 0.22).slice(p.x * TILE, p.y * TILE, r, a - arme.arc / 2, a + arme.arc / 2).fillPath();
    g.setAlpha(1); this.tweens.add({ targets: g, alpha: 0, duration: 180 });
  }
  sang(x, y, n = 1) {
    for (let i = 0; i < n * 2; i++) {
      const img = this.add.image((x + (Math.random() - 0.5) * 0.8) * TILE, (y + (Math.random() - 0.5) * 0.8) * TILE, 'sang').setDepth(3).setRotation(Math.random() * 6).setScale(0.5 + Math.random() * 0.7).setAlpha(0.85);
      this.decors.push(img);
    }
    while (this.decors.length > 250) this.decors.shift().destroy();
  }
  cadavre(z) {
    const img = this.add.image(z.x * TILE, z.y * TILE, `zsol${z.look}`).setDepth(4).setRotation(z.angle).setTint(0x9a9a9a);
    this.decors.push(img);
  }
  // ---------- zombies : simulation + affichage (seulement ceux qu'on voit) ----------
  majZombies(dt, p, nuit) {
    const sv = partie.survivant;
    horde.activer(p.x, p.y);
    horde.maj(dt, { x: p.x, y: p.y, accroupi: sv.accroupi, mort: !!sv.mort }, nuit, (z) => {
      // un zombie porte un coup
      const a = Math.atan2(z.y - p.y, z.x - p.x) - Math.atan2(this.dir.y, this.dir.x), deDos = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 2.1;
      const type = tirerBlessure(horde.autour(p.x, p.y, 1.6), deDos);
      if (type === 'agrippe') { this.tAgrippe = 0.6; this.cameras.main.shake(80, 0.004); message('Un zombie t\'agrippe ! <small>F pour le repousser</small>', 1500); return; }
      blesser(sv, type);
      son('blesse'); this.sang(p.x, p.y); this.cameras.main.shake(140, 0.008); this.rouge = 1;
      message(type === 'morsure' ? '<b style="color:#ff6a50">Tu as été mordu…</b>' : `${BLESSURES[type].nom} !${sv.saignements ? ' <small>Tu saignes : B pour te bander</small>' : ''}`, 2500);
    });
    for (const e of horde.evenements.splice(0)) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (e.type === 'grogne') son('grogne', d);
      else if (e.type === 'vitre' || e.type === 'coupPorte') son(e.type, d);
      else if (e.type === 'porteEnfoncee') { son('coupPorte', d); if (d < 25) message('Une porte vient de céder…'); }
    }
    // affichage
    const portee = PORTEE_VUE * (1 - nuit * 0.45), vus = new Set();
    for (const z of horde.z) {
      let img = this.sprites.get(z.id);
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      const voit = d < portee && visible(monde, p.x, p.y, z.x, z.y, portee);
      if (!img) { if (!voit) continue; img = this.add.image(z.x * TILE, z.y * TILE, `z${z.look}`).setDepth(54).setAlpha(0); this.sprites.set(z.id, img); }
      vus.add(z.id);
      img.setPosition(z.x * TILE, z.y * TILE).setRotation(z.angle);
      img.setTexture(z.aTerre > 0 ? `zsol${z.look}` : `z${z.look}`);
      img.setScale(z.prep > 0 ? 1.12 : 1);
      img.setAlpha(Phaser.Math.Linear(img.alpha, voit ? 1 : 0, Math.min(1, dt * 8)));
      if (voit && !this.dejaVuZombie) { this.dejaVuZombie = true; message('Un zombie ! <small>Espace ou clic : frapper · F ou clic droit : bousculer · C : s\'accroupir</small>', 5000); }
    }
    for (const [id, img] of this.sprites) if (!vus.has(id)) { img.destroy(); this.sprites.delete(id); }
    // cercle de bruit autour du joueur
    this.bruitVisuel = Math.max(0, this.bruitVisuel - dt * 12);
    this.anneau.clear();
    if (this.bruitVisuel > 1) this.anneau.lineStyle(2, 0xffffff, Math.min(0.35, this.bruitVisuel / 30)).strokeCircle(p.x * TILE, p.y * TILE, this.bruitVisuel * TILE);
    // voile rouge quand on est touché
    this.rouge = Math.max(0, this.rouge - dt * 1.5);
    $('voileRouge').style.opacity = Math.max(this.rouge * 0.6, sv.sante < 30 && !sv.mort ? (0.25 + 0.15 * Math.sin(performance.now() / 300)) * (1 - sv.sante / 30) : 0);
  }
  // obscurité : hors du champ de vision c'est sombre, et la nuit tout s'assombrit sauf un halo autour du joueur
  dessinerNuit(p, dedans) {
    // la caméra est toujours centrée sur le joueur : on place tout par rapport à lui
    // (worldView n'est mis à jour qu'au rendu, il a une image de retard)
    const cam = this.cameras.main, k = cam.zoom / 2, cxE = this.scale.width / 4, cyE = this.scale.height / 4;
    const ecr = (wx, wy) => [cxE + (wx - p.x) * TILE * k, cyE + (wy - p.y) * TILE * k];
    const ob = obscurite(partie.temps);
    // champ de vision : recalculé seulement si on a bougé (ou si une porte a changé)
    const cle = `${p.x.toFixed(2)},${p.y.toFixed(2)},${Math.round(ob * 20)},${monde.rev || 0},${this.scale.width}`;
    if (cle !== this.vueCle) {
      this.vueCle = cle;
      const ctx = this.texOmbre.getContext(), w = this.texOmbre.width, h = this.texOmbre.height;
      const pts = champDeVision(monde, p.x, p.y, PORTEE_VUE * (1 - ob * 0.45), 400);
      ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(6,8,10,${0.55 + ob * 0.3})`; ctx.fillRect(0, 0, w, h);
      ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const [x, y] = ecr(pts[i], pts[i + 1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      this.texOmbre.refresh();
    }
    const cleNuit = `${Math.round(ob * 50)},${dedans},${this.scale.width}`;
    if (cleNuit !== this.nuitCle) {
      this.nuitCle = cleNuit;
      const ctx = this.texNuit.getContext(), w = this.texNuit.width, h = this.texNuit.height;
      ctx.clearRect(0, 0, w, h);
      if (ob > 0) {
        ctx.fillStyle = `rgba(4,6,18,${ob})`; ctx.fillRect(0, 0, w, h);
        const px = w / 2, py = h / 2, r = (dedans ? 4 : 6) * TILE * k;   // le joueur est toujours au centre de l'écran
        const gr = ctx.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(0,0,0,${ob * 0.85})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = gr; ctx.fillRect(px - r, py - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
      }
      this.texNuit.refresh();
    }
  }
}

// ---------- textures des zombies (dessinées une fois) ----------
const HABITS = ['#5b6b7a', '#7a4a3a', '#3a4a3a', '#8a8a7a', '#4a3a5a', '#7a6a4a'];
function creerTexturesZombies(scene) {
  const peau = '#8a9a78';
  HABITS.forEach((habit, i) => {
    for (const sol of [false, true]) {
      const key = `${sol ? 'zsol' : 'z'}${i}`; if (scene.textures.exists(key)) continue;
      const W = sol ? 44 : 30, H = sol ? 26 : 30, t = scene.textures.createCanvas(key, W, H), c = t.getContext();
      if (!sol) {   // debout, vu de dessus, bras tendus vers l'avant (vers la droite = angle 0)
        c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(17, 17, 10, 10, 0, 0, 7); c.fill();
        c.fillStyle = peau; c.fillRect(15, 6, 13, 4); c.fillRect(15, 20, 12, 4);                 // bras
        c.fillStyle = habit; c.beginPath(); c.ellipse(14, 15, 7, 10, 0, 0, 7); c.fill();         // épaules
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(10, 9, 3, 3); c.fillRect(13, 19, 4, 2);     // vêtements déchirés
        c.fillStyle = peau; c.beginPath(); c.arc(16, 15, 5.5, 0, 7); c.fill();                   // tête
        c.fillStyle = '#5a2a20'; c.fillRect(18, 16, 3, 2);                                        // sang sur la bouche
      } else {      // couché : corps allongé
        c.fillStyle = '#5a1a14'; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(22, 13, 20, 11, 0, 0, 7); c.fill(); c.globalAlpha = 1;
        c.fillStyle = habit; c.fillRect(8, 7, 22, 12);
        c.fillStyle = '#3a3530'; c.fillRect(2, 8, 8, 4); c.fillRect(2, 14, 8, 4);                 // jambes
        c.fillStyle = peau; c.beginPath(); c.arc(34, 13, 5.5, 0, 7); c.fill(); c.fillRect(26, 3, 10, 3); c.fillRect(26, 20, 10, 3);
      }
      t.refresh();
    }
  });
  if (!scene.textures.exists('sang')) {
    const t = scene.textures.createCanvas('sang', 28, 28), c = t.getContext();
    c.fillStyle = '#6a0f0a';
    for (let i = 0; i < 7; i++) { c.globalAlpha = 0.5 + Math.random() * 0.4; c.beginPath(); c.arc(14 + (Math.random() - 0.5) * 14, 14 + (Math.random() - 0.5) * 14, 2 + Math.random() * 5, 0, 7); c.fill(); }
    t.refresh();
  }
}

// ---------- interface du survivant ----------
function majHudSurvivant(sv) {
  $('barreSante').style.width = `${sv.sante}%`;
  $('barreSante').style.background = sv.infecte ? 'linear-gradient(90deg,#6a8a2a,#9ab84a)' : sv.sante < 30 ? '#c0392b' : '#b8483a';
  $('barreEndurance').style.width = `${sv.endurance}%`;
  const etats = [];
  if (sv.accroupi) etats.push('🦶 accroupi');
  if (sv.saignements) etats.push(`🩸 saigne${sv.saignements > 1 ? ` ×${sv.saignements}` : ''}`);
  if (sv.infecte && sv.infection > 0.1) etats.push('🤒 fièvre');
  if (sv.endurance < 15) etats.push('😮‍💨 à bout de souffle');
  const html = `${etats.join(' · ')}${etats.length ? ' · ' : ''}🩹 ${sv.bandages} · 💀 ${sv.tues}`;
  if ($('etats').innerHTML !== html) $('etats').innerHTML = html;
  $('btAccroupi').classList.toggle('on', sv.accroupi);
}

// ---------- carte des zones explorées ----------
const COUL_CARTE = {};
for (const [k, c] of Object.entries(COUL)) COUL_CARTE[k] = c;
Object.assign(COUL_CARTE, { [T.arbre]: '#2c4a22', [T.mur]: '#d8d4c8', [T.porte]: '#d8d4c8', [T.fenetre]: '#8fb3c9', [T.ligne]: '#3a3b3d', [T.voiture]: '#7a1f1f', [T.parquet]: '#9a7a5a', [T.beton]: '#9d9c96' });
function dessinerMinicarte() {
  const c = $('minicarte'), grand = c.classList.contains('grand'), taille = grand ? 400 : 150, echelle = grand ? 0.75 : 1;   // pixels par tuile
  if (c.width !== taille) { c.width = taille; c.height = taille; }
  const ctx = c.getContext('2d', { willReadFrequently: true }), p = partie.joueur;
  ctx.fillStyle = '#0b0c0a'; ctx.fillRect(0, 0, taille, taille);
  const demi = taille / 2 / echelle;
  const img = ctx.getImageData(0, 0, taille, taille), d = img.data, rgb = {};
  const coul = (v) => rgb[v] || (rgb[v] = Phaser.Display.Color.HexStringToColor(COUL_CARTE[v] || '#000'));
  const x0 = Math.floor(p.x - demi), y0 = Math.floor(p.y - demi);
  for (let py = 0; py < taille; py++) {
    const ty = y0 + Math.floor(py / echelle);
    for (let px = 0; px < taille; px++) {
      const tx = x0 + Math.floor(px / echelle);
      if (!partie.vus.has(`${Math.floor(tx / CH)},${Math.floor(ty / CH)}`)) continue;
      const col = coul(monde.tuile(tx, ty)), i = (py * taille + px) * 4;
      d[i] = col.red; d[i + 1] = col.green; d[i + 2] = col.blue; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(taille / 2, taille / 2, grand ? 5 : 3, 0, 7); ctx.fill();
}

// ---------- menu ----------
let menuOuvert = true;
let jeu = null;
function basculerMenu(ouvrir = !menuOuvert) {
  if (!partie || partie.survivant.mort) return;
  menuOuvert = ouvrir; $('menu').classList.toggle('cache', !ouvrir); $('hud').classList.toggle('cache', ouvrir);
  if (ouvrir) { sauver(); majMenu(); }
}
function majMenu() {
  const s = chargerSauvegarde();
  $('btContinuer').classList.toggle('cache', !s);
  if (s) $('btContinuer').textContent = `Continuer · ${heure(s.temps).texte}`;
  try { const r = JSON.parse(localStorage.getItem('zoneMorteRecord') || 'null'); if (r) $('record').textContent = `🏆 Record : ${Math.floor(r.jours)} j ${Math.floor((r.jours % 1) * 24)} h, ${r.tues} zombies tués`; } catch { /* rien */ }
}
function lancer() {
  menuOuvert = false; $('menu').classList.add('cache'); $('mort').classList.add('cache'); $('hud').classList.remove('cache');
  if (!jeu) {
    jeu = new Phaser.Game({ type: Phaser.AUTO, parent: 'jeu', backgroundColor: '#0d0f0c', scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight }, render: { antialias: true }, scene: [SceneZone] });
    window.__zm = { get partie() { return partie; }, get monde() { return monde; }, get horde() { return horde; }, jeu };   // pour les tests
  } else {
    const sc = jeu.scene.getScene('zone'); sc.scene.restart();
  }
  message(heure(partie.temps).h < 9 && partie.temps < 600 ? 'Jour 1. Trouve un abri avant la nuit.' : 'De retour dans la Zone Morte.', 3500);
}
$('btContinuer').onclick = () => { const s = chargerSauvegarde(); if (s) { reprendre(s); lancer(); } };
$('btRecommencer').onclick = () => { nouvellePartie(''); lancer(); };
$('btNouvelle').onclick = () => {
  if (chargerSauvegarde() && !confirm('Commencer une nouvelle partie ? L\'ancienne sera effacée.')) return;
  nouvellePartie($('graine').value.trim()); lancer();
};
addEventListener('beforeunload', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
majMenu();
