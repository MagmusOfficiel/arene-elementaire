// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la musique, composée en direct (v62)
//  Aucun fichier : de la synthèse douce (nappes, kalimba, basse ronde,
//  percussions feutrées) jouée sur une grille de temps, avec une
//  réverbération et un écho. Chaque lieu a son morceau (carte, chaque
//  territoire, combat, boss) ; on passe de l'un à l'autre en fondu.
//  Les mélodies suivent une marche douce dans une gamme pentatonique :
//  jamais de fausse note, jamais deux fois tout à fait pareil.
// =====================================================================
import { audio } from '../sfx.js';

// notes : demi-tons au-dessus du La 220 Hz (0 = La2)
const hz = (n) => 220 * 2 ** (n / 12);
// chaque morceau : tempo, accords (fondamentale + intervalles), gamme de la mélodie, couleur des instruments
const MORCEAUX = {
  monde: { bpm: 70, accords: [[3, [0, 4, 7, 11]], [0, [0, 3, 7, 10]], [8, [0, 4, 7, 11]], [10, [0, 2, 7, 10]]], gamme: [3, 5, 7, 10, 12, 15, 17, 19, 22, 24], melo: 0.5, pluck: 'kalimba', perc: 0, brillance: 2200 },
  carrefour: { bpm: 70, accords: [[3, [0, 4, 7, 11]], [0, [0, 3, 7, 10]], [8, [0, 4, 7, 11]], [10, [0, 2, 7, 10]]], gamme: [3, 5, 7, 10, 12, 15, 17, 19, 22, 24], melo: 0.5, pluck: 'kalimba', perc: 0, brillance: 2200 },
  braise: { bpm: 66, accords: [[5, [0, 3, 7, 10]], [3, [0, 4, 7, 14]], [1, [0, 4, 7, 11]], [3, [0, 4, 7, 10]]], gamme: [5, 8, 10, 12, 15, 17, 20, 22], melo: 0.4, pluck: 'harpe', perc: 0.4, brillance: 1500, tambour: true },
  lagon: { bpm: 64, accords: [[8, [0, 4, 7, 11, 14]], [10, [0, 4, 7, 14]], [7, [0, 3, 7, 10]], [0, [0, 3, 7, 10]]], gamme: [8, 10, 12, 15, 17, 20, 22, 24, 27], melo: 0.45, pluck: 'cloche', perc: 0, brillance: 2600, echo: 0.42 },
  sylve: { bpm: 76, accords: [[10, [0, 4, 7, 11]], [5, [0, 3, 7, 10]], [3, [0, 4, 7, 14]], [5, [0, 4, 7, 10]]], gamme: [10, 12, 14, 17, 19, 22, 24, 26, 29], melo: 0.55, pluck: 'flute', perc: 0.25, brillance: 2400 },
  combat: { bpm: 96, accords: [[0, [0, 3, 7, 10]], [8, [0, 4, 7, 11]], [3, [0, 4, 7, 10]], [10, [0, 4, 7, 14]]], gamme: [0, 3, 5, 7, 10, 12, 15, 17, 19], melo: 0.6, pluck: 'harpe', perc: 1, brillance: 2400, basse8: true },
  boss: { bpm: 104, accords: [[5, [0, 3, 7, 10]], [1, [0, 4, 7, 11]], [8, [0, 4, 7, 10]], [3, [0, 4, 7, 14]]], gamme: [5, 8, 10, 12, 13, 17, 20, 22], melo: 0.55, pluck: 'harpe', perc: 1.2, brillance: 1900, basse8: true, tambour: true },
};

let A = null, bus, verb, echo, actuel = null, prochain = 0, pas = 0, minuterie = null, note = 7;
const pistes = new Map();   // nom → gain (pour les fondus)

function preparer(a = audio()) {
  if (!a) return false;
  if (A) return true;
  A = a;
  bus = A.ctx.createGain(); bus.gain.value = 3.4;   // calé pour être un peu plus bas que les anciennes musiques (ambiance de fond)
  const doux = A.ctx.createBiquadFilter(); doux.type = 'lowpass'; doux.frequency.value = 7000; doux.Q.value = 0.4;
  bus.connect(doux); doux.connect(A.musicBus);
  // réverbération : une réponse faite de bruit qui s'éteint en 3 s (stéréo)
  verb = A.ctx.createConvolver();
  const L = Math.floor(A.ctx.sampleRate * 3.2), ir = A.ctx.createBuffer(2, L, A.ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L) ** 3.2; }
  verb.buffer = ir;
  const vg = A.ctx.createGain(); vg.gain.value = 0.42; verb.connect(vg); vg.connect(doux);
  // écho doux (pour la kalimba et les cloches)
  echo = A.ctx.createDelay(1.5); const fb = A.ctx.createGain(), ef = A.ctx.createBiquadFilter(), eg = A.ctx.createGain();
  echo.delayTime.value = 0.43; fb.gain.value = 0.32; ef.type = 'lowpass'; ef.frequency.value = 2200; eg.gain.value = 0.28;
  echo.connect(ef); ef.connect(fb); fb.connect(echo); ef.connect(eg); eg.connect(bus); eg.connect(verb);
  return true;
}
// une voix : enveloppe douce, vers le bus (sec) et la réverbération (mouillé)
function voix(dest, t, { type = 'sine', f, a = 0.01, d = 1, v = 0.1, coupe = 3000, mouille = 0.3, detune = 0, pan = 0, vib = 0, versEcho = 0 }) {
  const c = A.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.1); }
  fl.type = 'lowpass'; fl.frequency.value = coupe; fl.Q.value = 0.3;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  o.connect(fl); fl.connect(g);
  let sortie = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); sortie = p; }
  sortie.connect(dest);
  if (mouille) { const w = c.createGain(); w.gain.value = mouille; sortie.connect(w); w.connect(verb); }
  if (versEcho) { const e = c.createGain(); e.gain.value = versEcho; sortie.connect(e); e.connect(echo); }
  o.start(t); o.stop(t + a + d + 0.1);
}
function bruitBref(dest, t, { f = 6000, q = 1, d = 0.05, v = 0.03, type = 'bandpass' }) {
  const c = A.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = A.noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
}
// les instruments de mélodie
const PLUCKS = {
  kalimba: (g, t, f, m) => { voix(g, t, { f, d: 1.4, v: 0.11, coupe: m.brillance, mouille: 0.35, versEcho: 0.5, pan: (Math.random() - 0.5) * 0.6 }); voix(g, t, { f: f * 4.02, d: 0.25, v: 0.012, coupe: 5000, mouille: 0.2 }); },
  harpe: (g, t, f, m) => { voix(g, t, { type: 'triangle', f, d: 1.1, v: 0.085, coupe: m.brillance, mouille: 0.4, pan: (Math.random() - 0.5) * 0.5 }); voix(g, t, { f: f * 2, d: 0.5, v: 0.02, coupe: m.brillance, mouille: 0.3 }); },
  cloche: (g, t, f, m) => { voix(g, t, { f, d: 2.2, v: 0.075, coupe: m.brillance, mouille: 0.5, versEcho: 0.7, pan: (Math.random() - 0.5) * 0.8 }); voix(g, t, { f: f * 2.76, d: 0.7, v: 0.012, coupe: 6000, mouille: 0.4 }); },
  flute: (g, t, f, m) => { voix(g, t, { type: 'sine', f, a: 0.08, d: 0.9, v: 0.075, coupe: m.brillance, mouille: 0.45, vib: 3, pan: (Math.random() - 0.5) * 0.4 }); voix(g, t, { type: 'triangle', f, a: 0.08, d: 0.6, v: 0.015, coupe: 1800, mouille: 0.3 }); },
};
// un pas de la grille (une croche) pour le morceau m, à l'instant t
function jouerPas(nom, m, g, t, k) {
  const croche = 30 / m.bpm, mesure = Math.floor(k / 8), dans = k % 8, [rac, iv] = m.accords[mesure % m.accords.length];
  // la nappe : au début de chaque mesure, l'accord tenu (deux voix un peu désaccordées)
  if (dans === 0) {
    const dur = croche * 8 + 1.5;
    for (const i of iv) for (const dt of [-6, 6]) voix(g, t, { type: 'triangle', f: hz(rac + i - 12), a: 1.2, d: dur, v: 0.018, coupe: 900, mouille: 0.6, detune: dt, pan: dt / 20 });
    voix(g, t, { type: 'sine', f: hz(rac - 24), a: 0.05, d: croche * (m.basse8 ? 1.6 : 6), v: 0.07, coupe: 400, mouille: 0.1 });   // la basse
  }
  if (m.basse8 && dans % 2 === 0 && dans) voix(g, t, { type: 'sine', f: hz(rac - 24 + (dans === 4 ? 7 : 0)), a: 0.02, d: croche * 1.4, v: 0.05, coupe: 380, mouille: 0.05 });
  if (!m.basse8 && dans === 4) voix(g, t, { type: 'sine', f: hz(rac - 24 + 7), a: 0.05, d: croche * 3.5, v: 0.04, coupe: 400, mouille: 0.1 });
  // la mélodie : une marche douce dans la gamme, avec des silences
  const temps = dans % 2 === 0, chance = m.melo * (temps ? 1 : 0.45) * (dans === 0 ? 1.3 : 1);
  if (Math.random() < chance) {
    note = Math.max(0, Math.min(m.gamme.length - 1, note + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    PLUCKS[m.pluck](g, t, hz(m.gamme[note]), m);
    if (dans === 0 && Math.random() < 0.35) PLUCKS[m.pluck](g, t + croche * 0.02, hz(m.gamme[Math.max(0, note - 2)]), m);   // une tierce dessous, parfois
  }
  // percussions feutrées
  if (m.perc) {
    if (dans === 0 || (dans === 4 && m.perc >= 1)) { voix(g, t, { type: 'sine', f: 72, a: 0.003, d: 0.22, v: 0.085 * m.perc, coupe: 300, mouille: 0.05 }); }
    if (m.perc >= 1 && dans % 2 === 1) bruitBref(g, t, { f: 7000, q: 0.8, d: 0.04, v: 0.008 * m.perc });
    if (m.tambour && (dans === 6 || dans === 7) && mesure % 2 === 1) voix(g, t, { type: 'sine', f: dans === 6 ? 140 : 110, a: 0.003, d: 0.3, v: 0.05 * Math.max(0.6, m.perc), coupe: 600, mouille: 0.2 });
    if (m.perc < 1 && dans === 4) bruitBref(g, t, { f: 3000, q: 1.2, d: 0.06, v: 0.006 });
  }
}
function planifier() {
  if (!A || !actuel) return;
  const m = MORCEAUX[actuel], croche = 30 / m.bpm, g = pistes.get(actuel);
  const avance = document.hidden ? 1.6 : 0.3;   // onglet caché : le navigateur ralentit les minuteries
  if (prochain < A.ctx.currentTime) prochain = A.ctx.currentTime + 0.05;
  while (prochain < A.ctx.currentTime + avance) { jouerPas(actuel, m, g, prochain, pas++); prochain += croche; }
}
// changer de morceau (null : silence), en fondu
export function musique(nom) {
  if (!preparer()) return;
  if (nom && !MORCEAUX[nom]) nom = 'monde';
  if (nom === actuel) return;
  const t = A.ctx.currentTime;
  if (actuel && pistes.has(actuel)) { const old = pistes.get(actuel), k = actuel; old.gain.setTargetAtTime(0, t, 0.8); setTimeout(() => { if (actuel !== k) { old.disconnect(); pistes.delete(k); } }, 5000); }
  actuel = nom;
  if (!nom) return;
  const g = pistes.get(nom) || A.ctx.createGain(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(pistes.has(nom) ? g.gain.value : 0.0001, t); g.gain.setTargetAtTime(1, t + 0.3, 1.2);
  if (!pistes.has(nom)) { g.connect(bus); pistes.set(nom, g); }
  prochain = Math.max(prochain, t + 0.1); pas = 0; note = Math.floor(MORCEAUX[nom].gamme.length / 2);
  if (!minuterie) minuterie = setInterval(planifier, 90);
}
export const MORCEAUX_NOMS = Object.keys(MORCEAUX);

// pour les essais (rendu hors ligne d'un morceau) : a = { ctx: OfflineAudioContext, musicBus, noiseBuf }
export function rendreHorsLigne(a, nom, secondes) {
  A = null; preparer(a);
  const m = MORCEAUX[nom], g = a.ctx.createGain(); g.connect(bus); note = Math.floor(m.gamme.length / 2);
  for (let k = 0, t = 0.05; t < secondes; k++, t += 30 / m.bpm) jouerPas(nom, m, g, t, k);
}
