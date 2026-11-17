// =====================================================================
//  ZONE MORTE — client (page /zone-morte)
//  Phase 1 « Socle » : monde infini par morceaux, déplacement, portes et
//  fenêtres, champ de vision, jour / nuit, carte, sauvegarde locale.
//  Phase 2 « Zombies » : ouïe, vue, errance, poursuite, combat, blessures,
//  saignement, infection, mort définitive.
//  Phase 3 « Survie » : faim, soif, fatigue, inventaire au poids, fouille
//  des meubles, armes qui s'usent, lampe torche, évier, dormir.
//  Phase 4 « Base » : barricades (R), démontage (X), cuisine, feu de camp,
//  objectifs de départ.
//  Phase 5 « Profondeur » : compétences, métiers, coupures d'eau et
//  d'électricité, armes à feu, hélicoptère et hordes, compte et classement.
// =====================================================================
import './style.css';
import Phaser from 'phaser';
import { Monde, CH, T, zoneDe, hash } from '../../../shared/survie/monde.js';
import { deplacer, cibleInteraction, texteInteraction, interagir, champDeVision, visible, heure, obscurite, MIN_PAR_S } from '../../../shared/survie/physique.js';
import { Horde, ARMES } from '../../../shared/survie/zombies.js';
import { COMPETENCES, METIERS, appliquerMetier, gagnerComp, niveauComp, progresComp, bonusDegats, bonusPrecision, vitesseTravail, facteurPas, vitesseFouille } from '../../../shared/survie/competences.js';
import { FUSILS, tirer, recharger } from '../../../shared/survie/tir.js';
import { calendrier, elecCoupee, eauCoupee, nuitDeHorde, frigoPerime, PERISSABLE } from '../../../shared/survie/evenements.js';
import { progress } from '../progress.js';
import { creerCompte } from '../compte.js';
import { raisonBarricade, barricader, raisonDemontage, demonter, RECETTES, peutCuisiner, cuisiner, nomRecette, raisonFeu, allumerFeu, BARRICADE } from '../../../shared/survie/construction.js';
import { nouveauSurvivant, completerSurvivant, blesser, bander, majSurvivant, tirerBlessure, peutCourir, facteurVitesse, humeurs, BLESSURES, armeTenue, userArme, utiliser, retirer, basculerLampe, capacite, poids, peutDormir } from '../../../shared/survie/survivant.js';
import { OBJETS, genererContenu, typeMeuble, nomMeuble, ajouterObjet, retirerObjet } from '../../../shared/survie/objets.js';

const TILE = 24;                 // pixels par tuile (1 tuile = 1 m)
const PORTEE_VUE = 24;
const CLE_SAUVEGARDE = 'zoneMorte';
const $ = (id) => document.getElementById(id);
const SERVER_URL = new URLSearchParams(location.search).get('serveur') || window.ARENE_SERVEUR || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `ws://${location.hostname}:2567` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const HTTP_URL = SERVER_URL.replace(/^ws/, 'http');
const compte = creerCompte(HTTP_URL);
let metierChoisi = localStorage.getItem('zoneMorteMetier') || 'chomeur';

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
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ v: 2, graine: partie.graine, x: partie.joueur.x, y: partie.joueur.y, temps: partie.temps, modifs: monde.modifs, vus: [...partie.vus], survivant: partie.survivant, horde: horde.sauvegarde(), conteneurs: partie.conteneurs, barricades: monde.barricades, feux: partie.feux, obj: partie.obj, evts: partie.evts }));
  } catch { /* stockage plein ou bloqué : tant pis */ }
}
function nouvellePartie(graineTexte) {
  const g = graineTexte ? [...String(graineTexte)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) : (Math.random() * 4294967296) >>> 0;
  monde = new Monde(g, {});
  partie = { graine: g, joueur: monde.depart(), temps: 480, vus: new Set(), survivant: appliquerMetier(nouveauSurvivant(), metierChoisi), conteneurs: {}, feux: [], obj: {}, evts: {} };
  horde = new Horde(monde);
  horde.activer(partie.joueur.x, partie.joueur.y, { ...partie.joueur, r: 18 });   // pas de zombie juste à côté au réveil
  sauver();
}
function reprendre(s) {
  monde = new Monde(s.graine, s.modifs || {}, s.barricades || {});
  partie = { graine: s.graine, joueur: { x: s.x, y: s.y }, temps: s.temps, vus: new Set(s.vus || []), survivant: completerSurvivant(s.survivant || {}), conteneurs: s.conteneurs || {}, feux: s.feux || [], obj: s.obj || {}, evts: s.evts || {} };
  horde = new Horde(monde, s.horde || {});
  horde.activer(s.x, s.y, { x: s.x, y: s.y, r: 8 });
}
// mort : la sauvegarde est effacée (mort définitive), on garde le record
// sauvegarde sur le compte : la partie compressée (gzip + base64), si elle n'est pas trop grosse
async function sauverSurCompte() {
  try {
    if (!partie || partie.survivant.mort || typeof CompressionStream === 'undefined') return;
    const brut = localStorage.getItem(CLE_SAUVEGARDE); if (!brut) return;
    const flux = new Blob([brut]).stream().pipeThrough(new CompressionStream('gzip'));
    const octets = new Uint8Array(await new Response(flux).arrayBuffer());
    let b64 = ''; for (let i = 0; i < octets.length; i += 0x8000) b64 += String.fromCharCode(...octets.subarray(i, i + 0x8000));
    b64 = btoa(b64);
    if (b64.length > 46000) return;   // trop gros pour le compte : la partie reste dans ce navigateur
    localStorage.setItem('zoneMorteCompte', JSON.stringify({ maj: Date.now(), d: b64 }));
    compte.sauvegarder?.();
  } catch { /* pas grave */ }
}
async function lireSauvegardeCompte() {
  try {
    const c = JSON.parse(localStorage.getItem('zoneMorteCompte') || 'null'); if (!c?.d) return null;
    const octets = Uint8Array.from(atob(c.d), (ch) => ch.charCodeAt(0));
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(flux).text());
  } catch { return null; }
}
function mourir() {
  const sv = partie.survivant, jours = (partie.temps - 480) / 1440;
  localStorage.removeItem(CLE_SAUVEGARDE); localStorage.removeItem('zoneMorteCompte');
  // XP du compte (partagée avec l'Arène et le Conclave) et classement en ligne
  const xp = Math.round(30 + jours * 80 + sv.tues * 2);
  try { progress.gagnerXp(xp); progress.save(); } catch { /* rien */ }
  const nom = (localStorage.getItem('pseudo') || '').trim() || 'Survivant';
  fetch(`${HTTP_URL}/api/zonemorte/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, jours, tues: sv.tues, metier: METIERS[sv.metier]?.nom, cause: sv.mort }), signal: AbortSignal.timeout(6000) })
    .then((r) => r.json()).then((r) => { if (r.place) $('mortPlace').innerHTML = `🌍 ${r.place <= 10 ? `<b>${r.place === 1 ? '1er' : `${r.place}e`}</b> au classement mondial !` : `${r.place}e au classement mondial`}`; }).catch(() => {})
    .finally(() => compte.sauvegarder?.());
  const comps = Object.keys(COMPETENCES).filter((c) => niveauComp(sv, c)).map((c) => `${COMPETENCES[c].ic} ${COMPETENCES[c].nom} ${niveauComp(sv, c)}`).join(' · ');
  $('mortXp').innerHTML = `${METIERS[sv.metier]?.ic || ''} ${METIERS[sv.metier]?.nom || ''} · +${xp} XP de compte${comps ? `<br><small>${comps}</small>` : ''}`;
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
    if (type === 'tir' || type === 'fusil') {   // détonation : bruit blanc sec + grave
      const n = bruitBlanc(type === 'fusil' ? 0.6 : 0.4, type === 'fusil' ? 0.09 : 0.05), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000;
      g.gain.value = 0.8; n.connect(f); f.connect(g); n.start(t);
      const o = ac.createOscillator(), g2 = ac.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
      g2.gain.setValueAtTime(0.7, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g2); g2.connect(ac.destination); o.start(t); o.stop(t + 0.3); return;
    }
    if (type === 'clic') { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1800; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03); o.connect(g); o.start(t); o.stop(t + 0.04); return; }
    if (type === 'helico') {   // battement de pales
      for (let i = 0; i < 6; i++) { const n = bruitBlanc(0.12, 0.04), f = ac.createBiquadFilter(), g3 = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 400; g3.gain.value = 0.5 * vol; n.connect(f); f.connect(g3); g3.connect(ac.destination); n.start(t + i * 0.16); }
      return;
    }
    if (type === 'alerte') { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.8); g.gain.linearRampToValueAtTime(0, t + 2.5); o.connect(g); o.start(t); o.stop(t + 2.6); return; }
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
let constructionDemandee = null;
let actionDemandee = false, coupDemande = false, bousculeDemandee = false, bandageDemande = false;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); touches.add(k);
  if (k === 'e' && !e.repeat) actionDemandee = true;
  if (k === ' ') { coupDemande = true; e.preventDefault(); }
  if (k === 'f' && !e.repeat) bousculeDemandee = true;
  if (k === 'b' && !e.repeat) bandageDemande = true;
  if (k === 'c' && !e.repeat && partie) partie.survivant.accroupi = !partie.survivant.accroupi;
  if ((k === 'i' || k === 'tab') && !e.repeat) { e.preventDefault(); basculerInventaire(); }
  if (k === 'r' && !e.repeat) constructionDemandee = 'r';
  if (k === 'x' && !e.repeat) constructionDemandee = 'x';
  if (k === 'l' && !e.repeat && partie) { message(basculerLampe(partie.survivant)); son('porteFermee'); }
  if (k === 'm' && !e.repeat) $('minicarte').classList.toggle('grand');
  if (k === 'escape') { if (partie?.survivant.dort) reveiller('Tu te lèves.'); else if (panneauOuvert()) fermerPanneau(); else basculerMenu(); }
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
  $('btSac').addEventListener('pointerdown', () => basculerInventaire());
  $('btOutil').addEventListener('pointerdown', () => { constructionDemandee = 'auto'; });
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
    if (sv.dort) { this.majSommeil(dt, p, sv); return; }
    let { dx, dy, course } = directionClavier();
    if ((dx || dy) && this.fouille) { this.fouille = null; message('Fouille interrompue.'); }
    if (this.tAction > 0 || this.tAgrippe > 0) { this.tAction -= dt; this.tAgrippe -= dt; dx *= 0.3; dy *= 0.3; course = false; }   // se bander, ou agrippé
    course = course && peutCourir(sv) && !sv.accroupi;
    if (dx || dy) { const l = Math.hypot(dx, dy); this.dir = { x: dx / l, y: dy / l }; }
    const fait = deplacer(monde, p, dx, dy, dt, course, facteurVitesse(sv));
    majSurvivant(sv, dt, { course, bouge: fait > 0, minutes: dt * MIN_PAR_S });
    // bruit des pas : courir s'entend de loin, s'accroupir presque pas
    this.pas += fait;
    if (this.pas >= 1) {
      this.pas = 0; const r = (course ? 9 : sv.accroupi ? 0.8 : 3) * facteurPas(sv); horde.bruit(p.x, p.y, r); this.bruitVisuel = Math.max(this.bruitVisuel, r);
      // on apprend en faisant : se faufiler près des morts, courir
      if (sv.accroupi && horde.z.some((z) => Math.hypot(z.x - p.x, z.y - p.y) < 10)) this.xp('discretion', 0.25);
      if (course) this.xp('course', 0.08);
    }
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
    const pile = pileProche(p), feu = feuProche(p);
    const cible = cibleInteraction(monde, p, this.dir) || (feu ? { feu } : pile ? { pile } : null);
    const cc = cibleConstruction(p, this.dir);
    const inv = $('invite');
    if (this.fouille) { inv.innerHTML = `${this.fouille.texte || 'Fouille'}… ${Math.round(100 * (1 - this.fouille.t / this.fouille.duree))} %`; inv.classList.add('on'); }
    else if (cible || cc) {
      const morceaux = [];
      if (cible) morceaux.push(`<kbd>E</kbd>${cible.feu ? 'cuisiner sur le feu' : cible.pile ? 'regarder ce qui est par terre' : monde.barricade(cible.x, cible.y) ? 'barricadée' : cible.type === T.meuble || cible.type === T.lit || cible.type === T.etagere ? `fouiller : ${nomMeuble(typeMeuble(monde, cible.x, cible.y)).toLowerCase()}` : texteInteraction(cible.type)}`);
      if (cc?.barricade && (monde.barricade(cc.x, cc.y)?.n || 0) < BARRICADE.max) morceaux.push(`<kbd>R</kbd>barricader${monde.barricade(cc.x, cc.y) ? ` (${monde.barricade(cc.x, cc.y).n}/${BARRICADE.max})` : ''}`);
      if (cc?.demonter) morceaux.push(`<kbd>X</kbd>${monde.barricade(cc.x, cc.y) ? 'retirer une planche' : 'démonter'}`);
      inv.innerHTML = morceaux.join(' &nbsp; '); inv.classList.add('on');
    } else inv.classList.remove('on');
    if (this.fouille) {
      this.fouille.t -= dt;
      if (this.fouille.t <= 0) { const f = this.fouille; this.fouille = null; if (f.fin) f.fin(); else ouvrirConteneur(f.cle, f.type); }
    }
    if (constructionDemandee) { this.construire(constructionDemandee, cc, p, sv); constructionDemandee = null; }
    if (panneau.cle && panneau.pos && Math.hypot(panneau.pos.x - p.x, panneau.pos.y - p.y) > 2.2) fermerPanneau();
    if (actionDemandee) {
      actionDemandee = false;
      const r = cible?.feu ? (ouvrirConteneur(cible.feu, 'feu'), null) : cible?.pile ? (ouvrirConteneur(cible.pile, 'sol'), null) : [T.meuble, T.lit, T.etagere].includes(cible?.type) ? 'fouille' : interagir(monde, p, cible);
      if (r === 'fouille') {
        const cle = `${cible.x},${cible.y}`, type = typeMeuble(monde, cible.x, cible.y);
        if (partie.conteneurs[cle]) ouvrirConteneur(cle, type);   // déjà fouillé : on regarde tout de suite
        else { const d = 1.2 * vitesseFouille(sv); this.fouille = { cle, type, t: d, duree: d }; horde.bruit(p.x, p.y, 2); this.xp('fouille', 1); }
        fermerPanneau(true);
      } else if (r === 'bloque') message('Tu es dans l\'embrasure de la porte.');
      else if (r === 'barricadee') message('C\'est barricadé. <small>X pour retirer une planche.</small>');
      else if (r === 'vitre') message('La vitre vole en éclats… <small>(le bruit attire les zombies)</small>');
      if (r && r !== 'fouille') son(r);
      const br = { vitre: 22, porteOuverte: 5, porteFermee: 6 }[r];
      if (br) { horde.bruit(p.x, p.y, br); this.bruitVisuel = Math.max(this.bruitVisuel, br); }
    }
    this.combat(dt, p, sv);
    this.majZombies(dt, p, obscurite(partie.temps));
    if (sv.mort) { message(`<b>${sv.mort}</b>`, 4000); mourir(); return; }
    majHudSurvivant(sv);
    if (panneau.ouvert) majPanneauSiChange();
    // toits : on enlève celui du bâtiment où l'on se trouve
    const ici = monde.batimentEn(p.x, p.y);
    for (const e of this.morceaux.values()) for (const t of e.toits) {
      const cible2 = t.b === ici ? 0 : 1, a = t.g.alpha + (cible2 - t.g.alpha) * Math.min(1, dt * 10);
      t.g.setAlpha(a);
    }
    this.joueur.setDepth(ici ? 50 : 65);   // dehors on passe devant les toits voisins
    this.dessinerNuit(p, !!ici, !!sv.lampe?.allumee);
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
    this.tMini -= dt; if (this.tMini <= 0) { this.tMini = 0.5; dessinerMinicarte(); this.majPiles(p); majObjectifs(); }
    this.majBase(p, dt);
    this.majEvenements(dt, p);
    this.tSauve -= dt; if (this.tSauve <= 0) { this.tSauve = 10; sauver(); this.nSauve = (this.nSauve || 0) + 1; if (this.nSauve % 12 === 0) sauverSurCompte(); }
  }
  // ---------- combat : frapper, bousculer, se bander ----------
  combat(dt, p, sv) {
    this.tCoup -= dt;
    const tenue = armeTenue(sv), arme = ARMES[tenue?.id] || ARMES.poings;
    if (coupDemande && FUSILS[tenue?.id]) { coupDemande = false; this.tirer(p, sv, tenue); }
    if (coupDemande) {
      coupDemande = false;
      if (this.tCoup <= 0 && this.tAction <= 0) {
        const fatigue = sv.endurance < 20 || sv.fatigue >= 70 ? 1.6 : 1;
        this.tCoup = arme.recharge * fatigue; sv.endurance = Math.max(0, sv.endurance - arme.endurance);
        son('swing'); this.dessinerArc(p, arme);
        const k = bonusDegats(sv) * (fatigue > 1 ? 0.6 : 1);
        const touches = horde.coup({ ...p }, this.dir, { ...arme, degats: arme.degats.map((d) => d * k), chute: fatigue > 1 ? arme.chute / 2 : arme.chute });
        if (touches.length) this.xp('combat', touches.length);
        for (const t of touches) {
          this.sang(t.z.x, t.z.y, t.mort ? 2 : 1);
          if (t.mort) { sv.tues++; this.cadavre(t.z); son('tue'); } else son('impact');
        }
        if (touches.length) { const casse = userArme(sv); if (casse) { message(casse); son('coupPorte'); } }
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
      else if (bander(sv)) { this.tAction = 1.5; this.xp('soins', 2); if (niveauComp(sv, 'soins') >= 3 && sv.saignements > 0 && Math.random() < 0.3) sv.saignements--; const n = sv.inv.filter((o) => o.id === 'chiffon' || o.id === 'bandage').reduce((a, o) => a + o.n, 0); message(`Tu bandes la plaie. <small>(${n} bandage${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''})</small>`); }
      else message('Plus de bandages… <small>Fouille les armoires et les pharmacies.</small>');
    }
  }
  // ---------- armes à feu ----------
  tirer(p, sv, tenue) {
    const def = FUSILS[tenue.id];
    if (this.tCoup > 0 || this.tAction > 0 || this.fouille) return;
    if (!(tenue.charge > 0)) { this.recharger(sv, tenue); if (!this.fouille) son('clic'); return; }
    tenue.charge--; this.tCoup = def.cadence;
    const r = tirer(horde, { x: p.x, y: p.y }, this.dir, def, bonusPrecision(sv));
    son(tenue.id === 'fusil' ? 'fusil' : 'tir'); this.cameras.main.shake(90, tenue.id === 'fusil' ? 0.009 : 0.005);
    this.bruitVisuel = Math.max(this.bruitVisuel, def.bruit);
    // traînée et éclair au bout du canon
    const g = this.arcCoup; g.clear().lineStyle(2, 0xfff2b0, 0.9).lineBetween(p.x * TILE, p.y * TILE, r.fin.x * TILE, r.fin.y * TILE).fillStyle(0xffd060, 0.9).fillCircle((p.x + this.dir.x * 0.5) * TILE, (p.y + this.dir.y * 0.5) * TILE, 6);
    g.setAlpha(1); this.tweens.add({ targets: g, alpha: 0, duration: 120 });
    for (const t of r.touches) { this.sang(t.z.x, t.z.y, t.mort ? 2 : 1); if (t.mort) { sv.tues++; this.cadavre(t.z); } }
    if (r.touches.length) this.xp('tir', r.touches.length * 1.5); else this.xp('tir', 0.3);
    tenue.etat = (tenue.etat ?? def.usure) - 1;
    if (tenue.etat <= 0) { message(`${OBJETS[tenue.id].nom} s'est enrayé pour de bon !`); retirer(sv, sv.arme); }
    if (!this.dejaTire) { this.dejaTire = true; message('<b>BANG.</b> Tout le quartier t\'a entendu…', 3000); }
  }
  recharger(sv, tenue) {
    const def = FUSILS[tenue.id];
    if ((tenue.charge || 0) >= def.chargeur) { message('Chargeur plein.'); return; }
    if (!sv.inv.some((o) => o.id === def.munition)) { message(`Plus de ${OBJETS[def.munition].nom.toLowerCase()}…`); return; }
    this.fouille = { texte: 'Rechargement', t: def.recharge, duree: def.recharge, fin: () => { const n = recharger(sv, def, tenue); if (n) message(`${tenue.charge}/${def.chargeur} ${OBJETS[def.munition].nom.toLowerCase()}`); son('clic'); } };
  }
  // ---------- compétences : un message quand on monte de niveau ----------
  xp(c, n) {
    const niv = gagnerComp(partie.survivant, c, n);
    if (niv) message(`${COMPETENCES[c].ic} <b>${COMPETENCES[c].nom} niveau ${niv}</b> <small>${COMPETENCES[c].effet}</small>`, 3500);
  }
  // ---------- le monde qui s'effondre : coupures, hélicoptère, hordes ----------
  majEvenements(dt, p) {
    const ev = partie.evts, t = partie.temps, cal = calendrier(monde.seed);
    if (!ev.elec && t >= cal.elec) { ev.elec = true; son('alerte'); message('💡 <b>L\'électricité vient de sauter.</b> Les cuisinières ne marchent plus, les frigos vont tourner.', 6000); }
    if (!ev.eau && t >= cal.eau) { ev.eau = true; son('alerte'); message('🚱 <b>L\'eau ne coule plus au robinet.</b> Garde tes bouteilles précieusement.', 6000); }
    // hélicoptère : il traverse le quartier en attirant tous les morts sous lui
    if (!ev.helico && t >= cal.helico) {
      ev.helico = true;
      const a = Math.random() * Math.PI * 2, vit = 7;
      this.helico = { x: p.x - Math.cos(a) * 70, y: p.y - Math.sin(a) * 70, vx: Math.cos(a) * vit, vy: Math.sin(a) * vit, t: 20, son: 0 };
      message('🚁 <b>Un hélicoptère !</b> Le bruit va rameuter tous les morts du coin…', 6000);
    }
    if (this.helico) {
      const h = this.helico; h.x += h.vx * dt; h.y += h.vy * dt; h.t -= dt; h.son -= dt;
      if (h.son <= 0) { h.son = 1; son('helico', Math.hypot(h.x - p.x, h.y - p.y) / 4); horde.bruit(h.x, h.y, 28); }
      if (!this.helicoImg) {
        if (!this.textures.exists('helico')) {
          const tx = this.textures.createCanvas('helico', 90, 90), c = tx.getContext();
          c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(45, 45, 14, 7, 0, 0, 7); c.fill(); c.fillRect(45, 43, 34, 4);
          c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 3; c.beginPath(); c.arc(45, 45, 38, 0, 7); c.stroke(); tx.refresh();
        }
        this.helicoImg = this.add.image(0, 0, 'helico').setDepth(90).setScale(1.4);
      }
      this.helicoImg.setPosition(h.x * TILE, h.y * TILE).setRotation(Math.atan2(h.vy, h.vx) + Math.PI).setAngle(this.helicoImg.angle);
      if (h.t <= 0) { this.helicoImg.destroy(); this.helicoImg = null; this.helico = null; }
    }
    // horde : certaines nuits, un groupe de morts marche droit vers ton quartier
    const jour = heure(t).jour, hr = heure(t).h;
    if (hr >= 22 && !ev[`horde${jour}`] && nuitDeHorde(monde.seed, jour)) {
      ev[`horde${jour}`] = true;
      const a = Math.random() * Math.PI * 2, n = 12 + Math.min(20, jour * 2) + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        const x = p.x + Math.cos(a) * 55 + (Math.random() - 0.5) * 10, y = p.y + Math.sin(a) * 55 + (Math.random() - 0.5) * 10;
        if (monde.solide(x, y)) continue;
        const z = horde.ajouter(x, y); z.etat = 'alerte'; z.cible = { x: p.x + (Math.random() - 0.5) * 16, y: p.y + (Math.random() - 0.5) * 16 };
      }
      son('alerte'); message('🌑 <b>Un grondement au loin…</b> une horde approche. Barricade-toi et ne fais pas de bruit.', 6000);
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
    horde.maj(dt, { x: p.x, y: p.y, accroupi: sv.accroupi, mort: !!sv.mort, dort: !!sv.dort, lumiere: !!sv.lampe?.allumee }, nuit, (z) => {
      // un zombie porte un coup
      const a = Math.atan2(z.y - p.y, z.x - p.x) - Math.atan2(this.dir.y, this.dir.x), deDos = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 2.1;
      const type = tirerBlessure(horde.autour(p.x, p.y, 1.6), deDos);
      if (sv.dort) reveiller('<b>Réveillé en sursaut !</b>');
      if (type === 'agrippe') { this.tAgrippe = 0.6; this.cameras.main.shake(80, 0.004); message('Un zombie t\'agrippe ! <small>F pour le repousser</small>', 1500); return; }
      blesser(sv, type);
      son('blesse'); this.sang(p.x, p.y); this.cameras.main.shake(140, 0.008); this.rouge = 1;
      message(type === 'morsure' ? '<b style="color:#ff6a50">Tu as été mordu…</b>' : `${BLESSURES[type].nom} !${sv.saignements ? ' <small>Tu saignes : B pour te bander</small>' : ''}`, 2500);
    });
    for (const e of horde.evenements.splice(0)) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (e.type === 'grogne') son('grogne', d);
      else if (e.type === 'coupBarricade') { son('coupPorte', d); if (d < 20 && !this.alerteBarr) { this.alerteBarr = 8; message('Ils frappent sur tes planches…'); } }
      else if (e.type === 'planche') { son('coupPorte', d); if (d < 25) message(e.fin ? '<b>La barricade a cédé !</b>' : 'Une planche vient d\'être arrachée…'); }
      else if (e.type === 'vitre' || e.type === 'coupPorte') son(e.type, d);
      else if (e.type === 'porteEnfoncee') { son('coupPorte', d); if (d < 25) message('Une porte vient de céder…'); }
    }
    // affichage
    const portee = PORTEE_VUE * (1 - nuit * (sv.lampe?.allumee ? 0.15 : 0.45)), vus = new Set();
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
  // ---------- construction : R barricader, X démonter (bouton 🔨 tactile : l'un ou l'autre) ----------
  construire(quoi, cc, p, sv) {
    const tenue = armeTenue(sv);
    if (quoi === 'r' && FUSILS[tenue?.id] && !cc?.barricade) { this.recharger(sv, tenue); return; }
    if (!cc) { message('Vise une porte, une fenêtre ou un meuble.'); return; }
    if (this.fouille) return;
    const cle = `${cc.x},${cc.y}`;
    if (quoi === 'auto') quoi = cc.barricade && !raisonBarricade(sv, monde, cc.x, cc.y) ? 'r' : 'x';
    if (quoi === 'r') {
      const r = cc.barricade ? raisonBarricade(sv, monde, cc.x, cc.y) : 'On ne peut barricader que les portes et les fenêtres.';
      if (r) { message(r); return; }
      const d = BARRICADE.duree * vitesseTravail(sv);
      this.fouille = { texte: 'Tu cloues une planche', t: d, duree: d, fin: () => {
        if (barricader(sv, monde, cc.x, cc.y)) { son('coupPorte'); partie.obj.barricade = true; this.xp('charpente', 3); message(`Planche clouée (${monde.barricade(cc.x, cc.y).n}/${BARRICADE.max}).`); }
      } };
      horde.bruit(p.x, p.y, BARRICADE.bruit); this.bruitVisuel = Math.max(this.bruitVisuel, BARRICADE.bruit); son('impact');
    } else {
      if (!monde.barricade(cc.x, cc.y) && DEMONTABLES.has(monde.tuile(cc.x, cc.y))) contenuDe(cle, typeMeuble(monde, cc.x, cc.y));   // on regarde d'abord ce qu'il y a dedans
      const r = raisonDemontage(sv, monde, cc.x, cc.y, partie.conteneurs[cle]);
      if (r && partie.conteneurs[cle]?.length && !monde.barricade(cc.x, cc.y)) { message(r); ouvrirConteneur(cle, typeMeuble(monde, cc.x, cc.y)); return; }
      if (r) { message(r); return; }
      const barr = !!monde.barricade(cc.x, cc.y);
      const d = (barr ? 1.5 : 3) * vitesseTravail(sv);
      this.fouille = { texte: barr ? 'Tu arraches une planche' : 'Tu démontes le meuble', t: d, duree: d, fin: () => {
        this.xp('charpente', 2);
        const n = demonter(sv, monde, cc.x, cc.y, barr ? null : []);
        if (n) { delete partie.conteneurs[cle]; message(`+${n} planche${n > 1 ? 's' : ''}.`); son('coupPorte'); }
      } };
      horde.bruit(p.x, p.y, 8); son('impact');
    }
  }
  // barricades dessinées par-dessus les tuiles, feux de camp qui crépitent
  majBase(p, dt) {
    this.alerteBarr = Math.max(0, (this.alerteBarr || 0) - dt);
    this.barrImg ||= new Map(); this.feuxImg ||= new Map();
    if (!this.textures.exists('barr1')) {
      for (let n = 1; n <= 3; n++) {
        const t = this.textures.createCanvas(`barr${n}`, TILE + 8, TILE + 8), c = t.getContext();
        const planche = (y, a) => { c.save(); c.translate((TILE + 8) / 2, y); c.rotate(a); c.fillStyle = '#9a7448'; c.fillRect(-(TILE + 6) / 2, -3, TILE + 6, 6); c.fillStyle = '#6e4f2c'; c.fillRect(-(TILE + 6) / 2, 2, TILE + 6, 1); c.fillStyle = '#ccc'; c.fillRect(-(TILE + 6) / 2 + 2, -1, 2, 2); c.fillRect((TILE + 6) / 2 - 4, -1, 2, 2); c.restore(); };
        planche((TILE + 8) / 2, 0.5); if (n >= 2) planche((TILE + 8) / 2, -0.5); if (n >= 3) planche((TILE + 8) / 2, 0);
        t.refresh();
      }
      const f = this.textures.createCanvas('feu', 26, 26), c = f.getContext();
      c.fillStyle = '#5a4030'; c.fillRect(3, 15, 20, 4); c.fillRect(6, 9, 4, 14); c.fillRect(16, 9, 4, 14);
      const g = c.createRadialGradient(13, 12, 1, 13, 12, 10); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(200,40,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(13, 12, 10, 0, 7); c.fill(); f.refresh();
    }
    if (this.revBarr !== monde.rev) {
      this.revBarr = monde.rev;
      const vus = new Set();
      for (const [k, b] of Object.entries(monde.barricades)) {
        const [x, y] = k.split(',').map(Number); if (Math.abs(x - p.x) > 60 || Math.abs(y - p.y) > 60) continue;
        vus.add(k); let img = this.barrImg.get(k);
        if (!img) { img = this.add.image((x + 0.5) * TILE, (y + 0.5) * TILE, 'barr1').setDepth(6); this.barrImg.set(k, img); }
        img.setTexture(`barr${Math.min(3, b.n)}`);
      }
      for (const [k, img] of this.barrImg) if (!vus.has(k)) { img.destroy(); this.barrImg.delete(k); }
    }
    partie.feux = partie.feux.filter((f) => f.fin > partie.temps);
    const fv = new Set();
    for (const f of partie.feux) {
      const k = `${f.x},${f.y}`; fv.add(k);
      let img = this.feuxImg.get(k); if (!img) { img = this.add.image(f.x * TILE, f.y * TILE, 'feu').setDepth(7); this.feuxImg.set(k, img); }
      img.setScale(0.9 + Math.random() * 0.2);
    }
    for (const [k, img] of this.feuxImg) if (!fv.has(k)) { img.destroy(); this.feuxImg.delete(k); }
  }
  // objets posés par terre : un petit sac sur le sol
  majPiles(p) {
    this.piles ||= new Map();
    if (!this.textures.exists('pile')) {
      const t = this.textures.createCanvas('pile', 20, 20), c = t.getContext();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(11, 13, 8, 6, 0, 0, 7); c.fill();
      c.fillStyle = '#8a6a3a'; c.beginPath(); c.ellipse(10, 11, 7, 6, 0, 0, 7); c.fill(); c.fillStyle = '#5a4020'; c.fillRect(8, 4, 4, 4); t.refresh();
    }
    const vus = new Set();
    for (const [cle, inv] of Object.entries(partie.conteneurs)) {
      if (!cle.startsWith('sol:') || !inv.length) continue;
      const [x, y] = cle.slice(4).split(',').map(Number); if (Math.abs(x - p.x) > 40 || Math.abs(y - p.y) > 40) continue;
      vus.add(cle);
      if (!this.piles.has(cle)) this.piles.set(cle, this.add.image((x + 0.5) * TILE, (y + 0.5) * TILE, 'pile').setDepth(5));
    }
    for (const [cle, img] of this.piles) if (!vus.has(cle)) { img.destroy(); this.piles.delete(cle); }
  }
  // ---------- sommeil : le temps file 30 fois plus vite, les zombies, eux, continuent ----------
  majSommeil(dt, p, sv) {
    const minutes = dt * MIN_PAR_S * 30;
    partie.temps += minutes;
    majSurvivant(sv, dt, { minutes });
    this.majZombies(dt, p, obscurite(partie.temps));
    // un zombie qui te poursuit tout près te réveille
    if (sv.dort && horde.z.some((z) => z.etat === 'chasse' && Math.hypot(z.x - p.x, z.y - p.y) < 7)) reveiller('<b>Des râles tout près… tu te réveilles !</b>');
    if (!sv.dort && !sv.mort && $('sommeil').classList.contains('on')) reveiller(sv.fatigue <= 0 ? 'Tu te réveilles reposé.' : '');
    if (sv.mort) { mourir(); return; }
    $('sommeilHeure').textContent = heure(partie.temps).texte;
    majHudSurvivant(sv);
    this.dessinerNuit(p, true, false);
    $('hudHeure').textContent = heure(partie.temps).texte;
  }
  // obscurité : hors du champ de vision c'est sombre, et la nuit tout s'assombrit sauf un halo autour du joueur
  dessinerNuit(p, dedans, lampe = false) {
    // la caméra est toujours centrée sur le joueur : on place tout par rapport à lui
    // (worldView n'est mis à jour qu'au rendu, il a une image de retard)
    const cam = this.cameras.main, k = cam.zoom / 2, cxE = this.scale.width / 4, cyE = this.scale.height / 4;
    const ecr = (wx, wy) => [cxE + (wx - p.x) * TILE * k, cyE + (wy - p.y) * TILE * k];
    const ob = obscurite(partie.temps);
    // champ de vision : recalculé seulement si on a bougé (ou si une porte a changé)
    const cle = `${p.x.toFixed(2)},${p.y.toFixed(2)},${Math.round(ob * 20)},${monde.rev || 0},${this.scale.width},${lampe}`;
    if (cle !== this.vueCle) {
      this.vueCle = cle;
      const ctx = this.texOmbre.getContext(), w = this.texOmbre.width, h = this.texOmbre.height;
      const pts = champDeVision(monde, p.x, p.y, PORTEE_VUE * (1 - ob * (lampe ? 0.15 : 0.45)), 400);
      this.ptsVue = pts.map((v, i) => (i % 2 ? ecr(pts[i - 1], v)[1] : ecr(v, pts[i + 1])[0]));
      ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(6,8,10,${0.55 + ob * 0.3})`; ctx.fillRect(0, 0, w, h);
      ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const [x, y] = ecr(pts[i], pts[i + 1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      this.texOmbre.refresh();
    }
    const angle = Math.atan2(this.dir.y, this.dir.x);
    const feux = (partie.feux || []).filter((f) => Math.abs(f.x - p.x) < 40 && Math.abs(f.y - p.y) < 30);
    const cleNuit = `${Math.round(ob * 50)},${dedans},${this.scale.width},${lampe},${lampe ? `${Math.round(angle * 20)},${this.vueCle}` : 0},${feux.length ? `${p.x.toFixed(1)},${p.y.toFixed(1)},${feux.length}` : ''}`;
    if (cleNuit !== this.nuitCle) {
      this.nuitCle = cleNuit;
      const ctx = this.texNuit.getContext(), w = this.texNuit.width, h = this.texNuit.height;
      ctx.clearRect(0, 0, w, h);
      if (ob > 0) {
        ctx.fillStyle = `rgba(4,6,18,${ob})`; ctx.fillRect(0, 0, w, h);
        const px = w / 2, py = h / 2, r = (dedans ? 4 : 6) * TILE * k;   // le joueur est toujours au centre de l'écran
        const gr = ctx.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(0,0,0,${ob * 0.85})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = gr; ctx.fillRect(px - r, py - r, r * 2, r * 2);
        if (lampe) {   // faisceau de la lampe torche, dans la direction où l'on regarde
          const R = 14 * TILE * k, g2 = ctx.createRadialGradient(px, py, 0, px, py, R);
          g2.addColorStop(0, `rgba(0,0,0,${ob})`); g2.addColorStop(0.65, `rgba(0,0,0,${ob * 0.8})`); g2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.save(); ctx.beginPath(); const q = this.ptsVue || []; for (let i = 0; i < q.length; i += 2) i ? ctx.lineTo(q[i], q[i + 1]) : ctx.moveTo(q[i], q[i + 1]); ctx.closePath(); ctx.clip();   // la lumière ne traverse pas les murs
          ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, R, angle - 0.42, angle + 0.42); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        for (const f of feux) {   // un feu de camp éclaire autour de lui
          const [fx, fy] = ecr(f.x, f.y), R = 7 * TILE * k, g3 = ctx.createRadialGradient(fx, fy, 0, fx, fy, R);
          g3.addColorStop(0, `rgba(0,0,0,${ob})`); g3.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g3; ctx.fillRect(fx - R, fy - R, R * 2, R * 2);
        }
        ctx.globalCompositeOperation = 'source-over';
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
  if (sv.saignements) etats.push(`<b class="n3">🩸 saigne${sv.saignements > 1 ? ` ×${sv.saignements}` : ''}</b>`);
  if (sv.infecte && sv.infection > 0.1) etats.push('<b class="n2">🤒 fièvre</b>');
  if (sv.endurance < 15) etats.push('😮‍💨 à bout de souffle');
  for (const [ic, txt, n] of humeurs(sv)) etats.push(`<b class="n${n}">${ic} ${txt}</b>`);
  const a = armeTenue(sv), arme = !a ? '👊 poings' : FUSILS[a.id] ? `${OBJETS[a.id].ic} ${a.charge || 0}/${FUSILS[a.id].chargeur} <small>(${sv.inv.filter((o) => o.id === FUSILS[a.id].munition).reduce((x, o) => x + o.n, 0)})</small>` : `${OBJETS[a.id].ic} ${Math.round(100 * a.etat / ARMES[a.id].usure)} %`;
  const lampe = sv.lampe ? ` · 🔦 ${sv.lampe.allumee ? 'allumée' : 'éteinte'} ${Math.round(sv.lampe.charge)} %` : '';
  const html = `${arme}${lampe} · 💀 ${sv.tues}${etats.length ? `<br>${etats.join(' ')}` : ''}`;
  if ($('etats').innerHTML !== html) $('etats').innerHTML = html;
  $('btAccroupi').classList.toggle('on', sv.accroupi);
}

// ---------- inventaire et meubles fouillés (un seul panneau, deux colonnes) ----------
const panneau = { ouvert: false, cle: null, type: null, pos: null, signature: '' };
const panneauOuvert = () => panneau.ouvert;
function contenuDe(cle, type) {
  if (!partie.conteneurs[cle]) {
    if (type === 'sol' || type === 'feu') partie.conteneurs[cle] = [];
    else { const [x, y] = cle.split(',').map(Number); partie.conteneurs[cle] = genererContenu(monde.seed, x, y, type); }
  }
  return partie.conteneurs[cle];
}
function ouvrirConteneur(cle, type) {
  const c = contenuDe(cle, type);
  // après la coupure de courant, ce qui était au frigo s'abîme
  if (type === 'frigo' && frigoPerime(monde.seed, partie.temps)) for (const o of c) if (PERISSABLE.has(o.id)) o.id = 'pourri';
  const [x, y] = cle.replace(/^[a-z]+:/, '').split(',').map(Number);
  Object.assign(panneau, { ouvert: true, cle, type, pos: { x: x + 0.5, y: y + 0.5 }, signature: '' });
  $('panneau').classList.remove('cache'); dessinerPanneau();
}
function basculerInventaire() {
  if (!partie || partie.survivant.mort) return;
  if (panneau.ouvert) { fermerPanneau(); return; }
  Object.assign(panneau, { ouvert: true, cle: null, type: null, pos: null, signature: '' });
  $('panneau').classList.remove('cache'); dessinerPanneau();
}
function fermerPanneau(silencieux) {
  panneau.ouvert = false; panneau.cle = null; $('panneau').classList.add('cache');
  if (!silencieux) panneau.pos = null;
}
function majPanneauSiChange() {
  const sig = JSON.stringify([partie.survivant.inv, partie.survivant.arme, panneau.cle && partie.conteneurs[panneau.cle], partie.survivant.saignements]);
  if (sig !== panneau.signature) dessinerPanneau();
}
// une pile d'objets posée par terre, à portée de main
function pileProche(p) {
  for (const [cle, inv] of Object.entries(partie.conteneurs)) {
    if (!cle.startsWith('sol:') || !inv.length) continue;
    const [x, y] = cle.slice(4).split(',').map(Number);
    if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 1.3) return cle;
  }
  return null;
}
function feuProche(p) {
  const f = (partie.feux || []).find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1.6);
  return f ? `feu:${Math.floor(f.x)},${Math.floor(f.y)}` : null;
}
// ce qu'on peut barricader ou démonter devant soi
const BARRICADABLES = new Set([T.porte, T.fenetre, T.fenetreCassee]), DEMONTABLES = new Set([T.meuble, T.lit, T.etagere, T.comptoir]);
function cibleConstruction(p, dir) {
  const essais = [[p.x + dir.x * 0.85, p.y + dir.y * 0.85], [p.x + dir.x * 1.3, p.y + dir.y * 1.3]];
  for (let ty = Math.floor(p.y) - 1; ty <= Math.floor(p.y) + 1; ty++) for (let tx = Math.floor(p.x) - 1; tx <= Math.floor(p.x) + 1; tx++) essais.push([tx + 0.5, ty + 0.5]);
  for (const [x, y] of essais) {
    const tx = Math.floor(x), ty = Math.floor(y), v = monde.tuile(tx, ty), b = monde.barricade(tx, ty);
    if (Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) > 1.5) continue;
    if (BARRICADABLES.has(v) || b || DEMONTABLES.has(v)) return { x: tx, y: ty, barricade: BARRICADABLES.has(v), demonter: !!b || DEMONTABLES.has(v) };
  }
  return null;
}
// objectifs du début de partie (le fil rouge d'une première partie)
const OBJECTIFS = [
  ['manger', 'Manger quelque chose (fouille les cuisines : E)'],
  ['outils', 'Trouver un marteau et des clous (quincaillerie, commodes)'],
  ['barricade', 'Barricader une porte ou une fenêtre (R ; planches : démonter un meuble avec X)'],
  ['dormir', 'Dormir dans un lit, à l\'abri'],
  ['jours', 'Survivre 3 jours'],
];
function majObjectifs() {
  const o = partie.obj, sv = partie.survivant;
  if (!o.outils && sv.inv.some((x) => x.id === 'marteau') && sv.inv.some((x) => x.id === 'clous')) o.outils = true;
  if (!o.jours && partie.temps >= 480 + 3 * 1440) o.jours = true;
  const faits = OBJECTIFS.filter(([k]) => o[k]).length, suivant = OBJECTIFS.find(([k]) => !o[k]);
  if (faits !== o.vus) { if (o.vus != null && faits > o.vus) message(faits === OBJECTIFS.length ? '🏆 <b>Tous les objectifs remplis !</b> Maintenant, tiens le plus longtemps possible.' : '✅ Objectif rempli !', 3000); o.vus = faits; }
  const html = suivant ? `🎯 <b>${faits + 1}/${OBJECTIFS.length}</b> ${suivant[1]}` : '';
  if ($('objectif').innerHTML !== html) $('objectif').innerHTML = html;
}
const pourcent = (o) => (FUSILS[o.id] ? ` <small>${o.charge || 0}/${FUSILS[o.id].chargeur}</small>` : o.etat != null && ARMES[o.id] ? ` <small>${Math.round(100 * o.etat / ARMES[o.id].usure)} %</small>` : '');
function verbe(o, sv, i) {
  const d = OBJETS[o.id];
  if (d.type === 'nourriture') return 'Manger';
  if (d.type === 'boisson') return 'Boire';
  if (o.id === 'chiffon' || o.id === 'bandage') return sv.saignements ? 'Bander' : null;
  if (o.id === 'antidouleur') return 'Prendre';
  if (d.type === 'arme') return sv.arme === i ? 'Ranger' : 'Prendre en main';
  if (o.id === 'sac') return sv.sac ? null : 'Enfiler';
  if (o.id === 'lampe') return sv.lampe ? null : 'Équiper';
  if (o.id === 'piles') return sv.lampe ? 'Recharger la lampe' : null;
  if (o.id === 'allumettes') return 'FEU';
  return null;
}
function dessinerPanneau() {
  const sv = partie.survivant;
  panneau.signature = JSON.stringify([sv.inv, sv.arme, panneau.cle && partie.conteneurs[panneau.cle], sv.saignements]);
  const pds = poids(sv), cap = capacite(sv);
  $('poidsInv').innerHTML = `<span class="${pds > cap ? 'trop' : ''}">${pds.toFixed(1)} / ${cap} kg</span>${sv.sac ? ' · 🎒' : ''}`;
  const depot = panneau.cle ? 'Poser ici' : 'Poser par terre';
  $('listeInv').innerHTML = sv.inv.length ? sv.inv.map((o, i) => {
    const d = OBJETS[o.id], v = verbe(o, sv, i);
    return `<li class="${sv.arme === i ? 'tenu' : ''}"><span class="ic">${d.ic}</span><span class="nom">${d.nom}${o.n > 1 ? ` ×${o.n}` : ''}${pourcent(o)}${sv.arme === i ? ' <em>en main</em>' : ''}</span>
      ${v === 'FEU' ? '<button id="btFeu">Faire un feu ici</button>' : v ? `<button data-u="${i}">${v}</button>` : ''}<button data-p="${i}" title="${depot}">⤵</button></li>`;
  }).join('') : '<li class="vide">Rien sur toi.</li>';
  const col = $('colCont');
  if (!panneau.cle) {   // inventaire seul : la colonne de droite montre les compétences
    col.classList.remove('cache');
    $('titreCont').textContent = `${METIERS[sv.metier]?.ic || ''} ${METIERS[sv.metier]?.nom || ''} · Compétences`;
    $('actionsCont').innerHTML = '';
    $('listeCont').innerHTML = Object.entries(COMPETENCES).map(([c, d]) => `<li title="${d.effet}"><span class="ic">${d.ic}</span><span class="nom">${d.nom} <b>${niveauComp(sv, c)}</b><i class="jauge"><i style="width:${Math.round(100 * progresComp(sv, c))}%"></i></i><small>${d.effet}</small></span></li>`).join('');
    return;
  }
  col.classList.remove('cache');
  const cont = partie.conteneurs[panneau.cle];
  $('titreCont').textContent = nomMeuble(panneau.type);
  const actions = [];
  if (panneau.type === 'lit') actions.push(`<button id="btDormir" class="principal">💤 Dormir</button>`);
  const sansCourant = panneau.type === 'cuisiniere' && elecCoupee(monde.seed, partie.temps);
  if (sansCourant) actions.push('<span class="info">💡 Plus d\'électricité : fais un feu de camp dehors (2 planches + allumettes).</span>');
  if ((panneau.type === 'cuisiniere' && !sansCourant) || panneau.type === 'feu') {
    for (const [i, r] of RECETTES.entries()) actions.push(`<button data-r="${i}" ${peutCuisiner(sv, r) ? '' : 'disabled'}>${nomRecette(r)}</button>`);
  }
  if (panneau.type === 'evier' && eauCoupee(monde.seed, partie.temps)) actions.push('<span class="info">🚱 L\'eau ne coule plus.</span>');
  else if (panneau.type === 'evier') { actions.push('<button id="btBoireRobinet">🚰 Boire au robinet</button>'); if (sv.inv.some((o) => o.id === 'bouteille')) actions.push('<button id="btRemplir">🍶 Remplir les bouteilles</button>'); }
  if (cont.length > 1) actions.push('<button id="btToutPrendre">Tout prendre</button>');
  $('actionsCont').innerHTML = actions.join('');
  $('listeCont').innerHTML = cont.length ? cont.map((o, i) => `<li><span class="ic">${OBJETS[o.id].ic}</span><span class="nom">${OBJETS[o.id].nom}${o.n > 1 ? ` ×${o.n}` : ''}${pourcent(o)}</span><button data-t="${i}">Prendre</button></li>`).join('') : '<li class="vide">Vide.</li>';
}
function prendre(i, tout) {
  const cont = partie.conteneurs[panneau.cle], o = cont[i]; if (!o) return;
  const n = tout ? o.n : 1, r = retirerObjet(cont, i, n);
  const e = ajouterObjet(partie.survivant.inv, r.id, r.n, o.etat ?? (ARMES[r.id] ? ARMES[r.id].usure : FUSILS[r.id] ? FUSILS[r.id].usure : r.id === 'lampe' ? 100 : undefined));
  if (FUSILS[r.id]) e.charge = o.charge ?? Math.floor(Math.random() * (FUSILS[r.id].chargeur + 1));   // une arme trouvée est plus ou moins chargée
}
$('panneau').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !partie) return;
  const sv = partie.survivant;
  if (b.id === 'fermerPanneau') return fermerPanneau();
  if (b.dataset.u != null) { const o = sv.inv[+b.dataset.u]; const t = utiliser(sv, +b.dataset.u); if (t) message(t); if (o && OBJETS[o.id].type === 'nourriture') partie.obj.manger = true; }
  if (b.dataset.p != null) {
    const i = +b.dataset.p, o = sv.inv[i]; if (!o) return;
    if (!panneau.cle) { const p = partie.joueur; panneau.cle = `sol:${Math.floor(p.x)},${Math.floor(p.y)}`; panneau.type = 'sol'; panneau.pos = { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 }; contenuDe(panneau.cle, 'sol'); }
    const etat = o.etat, charge = o.charge, r = retirer(sv, i, o.n); const e = ajouterObjet(partie.conteneurs[panneau.cle], r.id, r.n, etat); if (charge != null) e.charge = charge;
  }
  if (b.dataset.t != null) prendre(+b.dataset.t, true);
  if (b.id === 'btToutPrendre') { const c = partie.conteneurs[panneau.cle]; while (c.length) prendre(0, true); }
  if (b.id === 'btBoireRobinet') { sv.soif = 0; message('Tu bois longuement au robinet. L\'eau coule encore… pour combien de temps ?'); }
  if (b.id === 'btRemplir') { let n = 0; sv.inv.forEach((o) => { if (o.id === 'bouteille') { o.id = 'eau'; n += o.n; } }); const fus = sv.inv.filter((o) => o.id === 'eau'); if (fus.length > 1) { fus[0].n = fus.reduce((a, o) => a + o.n, 0); sv.inv = sv.inv.filter((o) => o.id !== 'eau' || o === fus[0]); } message(`${n} bouteille${n > 1 ? 's' : ''} remplie${n > 1 ? 's' : ''}.`); }
  if (b.id === 'btDormir') dormir();
  if (b.dataset.r != null && cuisiner(sv, RECETTES[+b.dataset.r])) { message(`${OBJETS[RECETTES[+b.dataset.r].id].nom} : c'est prêt !`); son('porteFermee'); }
  if (b.id === 'btFeu') {
    const p = partie.joueur, r = raisonFeu(sv, monde, p.x, p.y);
    if (r) message(r); else if (allumerFeu(sv, monde, partie.feux, p.x, p.y, partie.temps)) message('Le feu prend. Il brûlera 4 heures : cuisine, réchauffe… et se voit de loin.');
  }
  dessinerPanneau();
});
function dormir() {
  partie.obj.dormir = true;
  const sv = partie.survivant;
  if (!peutDormir(sv)) { message('Tu n\'as pas sommeil.'); return; }
  if (horde.z.some((z) => z.etat === 'chasse' && Math.hypot(z.x - partie.joueur.x, z.y - partie.joueur.y) < 15)) { message('Impossible de dormir avec des zombies à tes trousses !'); return; }
  sv.dort = true; sv.accroupi = false; if (sv.lampe) sv.lampe.allumee = false; fermerPanneau();
  $('sommeil').classList.add('on');
}
function reveiller(txt) {
  const sv = partie.survivant; sv.dort = false;
  $('sommeil').classList.remove('on');
  if (txt) message(txt, 3000);
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
  if (ouvrir) { sauver(); sauverSurCompte(); majMenu(); }
}
function majMenu() {
  const s = chargerSauvegarde();
  $('btContinuer').classList.toggle('cache', !s);
  if (s) $('btContinuer').textContent = `Continuer · ${heure(s.temps).texte}${s.survivant?.metier ? ` · ${METIERS[s.survivant.metier]?.nom || ''}` : ''}`;
  // pas de partie ici, mais une sur le compte (autre appareil) : on propose de la reprendre
  $('btCompte').classList.add('cache');
  if (!s) lireSauvegardeCompte().then((c) => { if (c) { $('btCompte').classList.remove('cache'); $('btCompte').textContent = `☁️ Reprendre la partie du compte · ${heure(c.temps).texte}`; $('btCompte').onclick = () => { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(c)); reprendre(c); lancer(); }; } });
  $('metiers').innerHTML = Object.entries(METIERS).map(([id, m]) => `<button data-m="${id}" class="${id === metierChoisi ? 'on' : ''}" title="${m.desc}"><span>${m.ic}</span>${m.nom}</button>`).join('');
  $('metierDesc').textContent = METIERS[metierChoisi].desc;
  $('codeCompte').textContent = compte.code ? `Compte : ${compte.code}` : 'Compte (sauvegarde en ligne)';
  fetch(`${HTTP_URL}/api/zonemorte/classement`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).then((l) => {
    $('classement').innerHTML = l.length ? `<b>🌍 Les plus longues survies</b><ol>${l.map((e) => `<li><span>${esc(e.nom)}</span><small>${esc(e.metier || '')}</small><b>${Math.floor(e.jours)} j ${Math.floor((e.jours % 1) * 24)} h</b></li>`).join('')}</ol>` : '';
  }).catch(() => {});
  try { const r = JSON.parse(localStorage.getItem('zoneMorteRecord') || 'null'); if (r) $('record').textContent = `🏆 Record : ${Math.floor(r.jours)} j ${Math.floor((r.jours % 1) * 24)} h, ${r.tues} zombies tués`; } catch { /* rien */ }
}
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
$('metiers').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-m]'); if (!b) return;
  metierChoisi = b.dataset.m; localStorage.setItem('zoneMorteMetier', metierChoisi); majMenu();
});
$('btRecupCompte').onclick = async () => {
  try { await compte.recuperer($('saisieCompte').value); $('msgCompte').textContent = 'Compte récupéré.'; majMenu(); } catch (e) { $('msgCompte').textContent = e.message; }
};
function lancer() {
  menuOuvert = false; $('menu').classList.add('cache'); $('mort').classList.add('cache'); $('hud').classList.remove('cache');
  if (!jeu) {
    jeu = new Phaser.Game({ type: Phaser.AUTO, parent: 'jeu', backgroundColor: '#0d0f0c', scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight }, render: { antialias: true }, scene: [SceneZone] });
    window.__zm = { get partie() { return partie; }, get monde() { return monde; }, get horde() { return horde; }, jeu, sauverSurCompte, lireSauvegardeCompte };   // pour les tests
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
