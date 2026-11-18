// =====================================================================
//  Effets sonores synthétisés en direct (Web Audio) — aucun fichier audio
// =====================================================================
let ctx = null, master, sfxBus, musicBus, ambBus, noiseBuf, music = null, muted = false;
const last = new Map();   // anti-spam par type de son

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = 0.5; ambBus.connect(comp);
  appliquerVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

// Volumes (0 à 1) gardés dans le navigateur
const lireVol = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };
export const volumes = { musique: lireVol('vol_musique', 0.6), effets: lireVol('vol_effets', 0.8) };
function appliquerVolumes() {
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(0.5 * volumes.musique, ctx.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(0.7 * volumes.effets, ctx.currentTime, 0.05);
  ambBus.gain.setTargetAtTime(0.6 * volumes.effets, ctx.currentTime, 0.05);
}
export function setVolume(k, v) { volumes[k] = v; try { localStorage.setItem('vol_' + k, v); } catch { /* stockage indisponible */ } appliquerVolumes(); }

// Ambiance de fond en boucle (foule du Colisée, grondement de la Brèche, vent du monde)
let ambNodes = null, ambNom = null, ambLevel = null;
export function setAmbiance(nom) {
  if (!ctx || nom === ambNom) return;
  ambNom = nom;
  if (ambNodes) { const old = ambNodes; old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6); setTimeout(() => old.stop(), 3000); ambNodes = null; }
  if (!nom) return;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(ambBus); g.gain.setTargetAtTime(1, ctx.currentTime, 1);
  const srcs = [];
  const bruit = (type, f, q, vol, lfoF = 0, lfoA = 0) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = vol;
    s.connect(fl); fl.connect(gg); gg.connect(g); s.start(0, Math.random());
    srcs.push(s);
    if (lfoF) { const l = ctx.createOscillator(), la = ctx.createGain(); l.frequency.value = lfoF; la.gain.value = lfoA; l.connect(la); la.connect(gg.gain); l.start(); srcs.push(l); }
    return gg;
  };
  if (nom === 'foule') {        // brouhaha de la foule : bandes de bruit qui ondulent
    bruit('bandpass', 420, 0.8, 0.22, 0.13, 0.08); bruit('bandpass', 900, 1.2, 0.12, 0.21, 0.06); bruit('bandpass', 1800, 2, 0.05, 0.31, 0.03);
    ambLevel = bruit('bandpass', 700, 0.7, 0);    // poussée de la foule (acclamations)
  } else if (nom === 'breche') {   // grondement sourd + souffle des portails
    bruit('lowpass', 120, 1, 0.5, 0.07, 0.2); bruit('bandpass', 300, 4, 0.06, 0.4, 0.05);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 55; const og = ctx.createGain(); og.gain.value = 0.08; o.connect(og); og.connect(g); o.start(); srcs.push(o);
  } else if (nom === 'vent') {      // monde ouvert : vent léger
    bruit('bandpass', 500, 0.6, 0.08, 0.09, 0.05); bruit('highpass', 3000, 0.5, 0.015, 0.17, 0.01);
  }
  // Clans Élémentaires : un fond par territoire, avec des petits bruits ponctuels
  let minuterie = null;
  const ponctuel = (f, min, max) => { const go = () => { if (ambNom !== nom) return; f(); minuterie = setTimeout(go, min + Math.random() * (max - min)); }; minuterie = setTimeout(go, min); };
  if (nom === 'braise') {         // grondement du volcan + crépitements de braises
    bruit('lowpass', 90, 1, 0.45, 0.05, 0.15); bruit('bandpass', 260, 2, 0.05, 0.23, 0.03);
    ponctuel(() => noise(0.03 + Math.random() * 0.04, 0.12 + Math.random() * 0.15, g, 'highpass', 2500 + Math.random() * 3000), 60, 420);
  } else if (nom === 'lagon') {   // vagues qui vont et viennent + mouettes au loin
    bruit('lowpass', 700, 0.7, 0.16, 0.11, 0.14); bruit('highpass', 2500, 0.5, 0.02, 0.11, 0.018);
    ponctuel(() => { const t = ctx.currentTime, f = 1300 + Math.random() * 400; osc('sine', f, f * 0.7, 0.18, 0.05, g, t, 0.03); osc('sine', f * 1.05, f * 0.72, 0.2, 0.04, g, t + 0.22, 0.03); }, 5000, 14000);
  } else if (nom === 'sylve') {   // vent dans les arbres + oiseaux
    bruit('bandpass', 700, 0.6, 0.07, 0.07, 0.04); bruit('highpass', 4000, 0.5, 0.012, 0.19, 0.008);
    ponctuel(() => { const t = ctx.currentTime, f = 2400 + Math.random() * 1600; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) osc('sine', f, f * (1.2 + Math.random() * 0.3), 0.07, 0.06, g, t + k * 0.1, 0.01); }, 1500, 6000);
  } else if (nom === 'carrefour') { // vent doux et clapotis de l'autel
    bruit('bandpass', 500, 0.6, 0.06, 0.09, 0.04);
    ponctuel(() => { const f = 1200 + Math.random() * 800; osc('sine', f, f * 1.5, 0.12, 0.03, g); }, 2500, 7000);
  }
  ambNodes = { g, stop: () => { clearTimeout(minuterie); srcs.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }); } };
}
// La foule réagit : 0..1 (acclamation)
export function foule(intensite = 1, duree = 1.5) {
  if (!ctx || !ambLevel || ambNom !== 'foule') return;
  const t = ctx.currentTime, g = ambLevel.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0.5 * intensite, t + 0.25); g.setTargetAtTime(0, t + 0.25 + duree * 0.4, duree * 0.4);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  return muted;
}

// Musique : une piste par mode (monde, royale, tournoi) + boss, avec fondu enchaîné
const musicCache = new Map();
let musicName = null, musicGain = null;
export async function playMusic(url) { return setMusic(url.replace(/^.*\//, '').replace('.ogg', '')); }
export async function setMusic(name) {
  if (!ctx || name === musicName) return;
  musicName = name;
  try {
    if (!musicCache.has(name)) musicCache.set(name, ctx.decodeAudioData(await (await fetch(`/audio/${name}.ogg`)).arrayBuffer()));
    const buf = await musicCache.get(name);
    if (name !== musicName) return;            // une autre piste a été demandée entre-temps
    const now = ctx.currentTime;
    if (music) { const old = music, og = musicGain; og.gain.setTargetAtTime(0, now, 0.5); setTimeout(() => { try { old.stop(); } catch { /* déjà arrêtée */ } }, 2500); }
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(musicBus);
    musicGain.gain.setTargetAtTime(1, now, 0.6);
    music = ctx.createBufferSource(); music.buffer = buf; music.loop = true; music.connect(musicGain); music.start();
  } catch { /* pas de musique : tant pis */ }
}

// ---------- briques ----------
function out(vol, pan) {
  const g = ctx.createGain(); g.gain.value = vol;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(sfxBus); }
  else g.connect(sfxBus);
  return g;
}
function env(g, t, a, dcy, peak = 1) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
}
function osc(type, f0, f1, dur, vol, dest, t = ctx.currentTime, a = 0.005) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, a, dur, vol); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05);
}
function noise(dur, vol, dest, filter = 'lowpass', f0 = 2000, f1 = null, q = 1, t = ctx.currentTime, a = 0.005) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = filter; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, a, dur, vol);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
}
function throttle(key, ms) { const n = performance.now(); if ((last.get(key) || 0) > n - ms) return false; last.set(key, n); return true; }

// ---------- signatures par élément ----------
const CAST = {
  feu:    (o) => { noise(0.35, 0.7, o, 'lowpass', 3000, 400, 1); osc('sawtooth', 160, 60, 0.25, 0.25, o); },
  eau:    (o) => { for (let i = 0; i < 3; i++) osc('sine', 300 + i * 160, 700 + i * 200, 0.08, 0.35, o, ctx.currentTime + i * 0.04); noise(0.2, 0.25, o, 'bandpass', 1200, 600, 2); },
  terre:  (o) => { osc('sine', 120, 45, 0.35, 0.9, o); noise(0.25, 0.4, o, 'lowpass', 600, 150, 1); },
  vent:   (o) => { noise(0.4, 0.6, o, 'bandpass', 600, 3000, 3, ctx.currentTime, 0.08); },
  eclair: (o) => { osc('square', 1800, 120, 0.12, 0.3, o); noise(0.15, 0.5, o, 'highpass', 3000, 6000, 1); },
  glace:  (o) => { osc('triangle', 1800, 2400, 0.3, 0.3, o); osc('sine', 2700, 2700, 0.4, 0.15, o, ctx.currentTime + 0.03); noise(0.15, 0.2, o, 'highpass', 5000, 8000); },
  ombre:  (o) => { osc('sawtooth', 70, 50, 0.5, 0.35, o, ctx.currentTime, 0.12); osc('sawtooth', 73, 52, 0.5, 0.3, o, ctx.currentTime, 0.12); noise(0.4, 0.2, o, 'lowpass', 500, 200, 1, ctx.currentTime, 0.1); },
  metal:  (o) => { [523, 1393, 2311].forEach((f, i) => osc('sine', f, f * 0.98, 0.5, 0.2 / (i + 1), o)); noise(0.06, 0.4, o, 'highpass', 4000); },
  lumiere: (o) => { [880, 1320, 1760].forEach((f, i) => osc('sine', f, f * 1.01, 0.45, 0.18, o, ctx.currentTime + i * 0.03)); noise(0.2, 0.15, o, 'highpass', 6000); },
  nature:  (o) => { noise(0.25, 0.45, o, 'bandpass', 900, 1600, 2); osc('triangle', 260, 320, 0.15, 0.25, o); },
};

export const sfx = {
  cast(el, vol = 1, pan = 0) { if (!ctx || !throttle('cast' + el, 45)) return; (CAST[el] || CAST.feu)(out(0.5 * vol, pan)); },
  impact(el, vol = 1, pan = 0) {
    if (!ctx || !throttle('hit', 35)) return;
    const o = out(0.55 * vol, pan);
    osc('sine', 180, 50, 0.12, 0.8, o); noise(0.1, 0.5, o, 'lowpass', 2500, 300);
    if (el === 'eclair') noise(0.08, 0.4, o, 'highpass', 5000);
    if (el === 'glace' || el === 'metal') osc('triangle', 2200, 1800, 0.12, 0.25, o);
  },
  explosion(el, vol = 1, pan = 0, big = false) {
    if (!ctx || !throttle('boom', 60)) return;
    const o = out((big ? 0.9 : 0.6) * vol, pan);
    osc('sine', big ? 90 : 140, 30, big ? 0.8 : 0.45, 1, o); noise(big ? 1.0 : 0.5, 0.8, o, 'lowpass', 2500, 120, 1);
    (CAST[el] || (() => {}))(o);
  },
  ultimate(el) {
    if (!ctx) return;
    const o = out(0.8, 0);
    noise(0.7, 0.5, o, 'bandpass', 300, 4000, 2, ctx.currentTime, 0.6);     // montée
    osc('sawtooth', 110, 440, 0.7, 0.25, o, ctx.currentTime, 0.6);
    setTimeout(() => this.explosion(el, 1, 0, true), 650);
  },
  zap() { if (!ctx || !throttle('zap', 50)) return; const o = out(0.35); osc('square', 2400, 300, 0.09, 0.4, o); noise(0.08, 0.4, o, 'highpass', 4000); },
  orb() { if (!ctx || !throttle('orb', 80)) return; const o = out(0.4); [880, 1320, 1760].forEach((f, i) => osc('sine', f, f, 0.18, 0.4, o, ctx.currentTime + i * 0.06)); },
  groan(vol = 1, pan = 0) { if (!ctx || !throttle('groan', 900)) return; const o = out(0.35 * vol, pan); osc('sawtooth', 110 + Math.random() * 30, 70, 0.7, 0.4, o, ctx.currentTime, 0.15); noise(0.6, 0.15, o, 'bandpass', 500, 300, 4, ctx.currentTime, 0.15); },
  zdie(vol = 1, pan = 0) { if (!ctx || !throttle('zdie', 60)) return; const o = out(0.45 * vol, pan); noise(0.3, 0.6, o, 'lowpass', 1200, 200); osc('sine', 200, 40, 0.3, 0.6, o); },
  horde() { if (!ctx) return; const o = out(0.7); [110, 104].forEach((f) => osc('sawtooth', f, f * 0.95, 1.6, 0.35, o, ctx.currentTime, 0.3)); noise(1.4, 0.2, o, 'lowpass', 400, 200, 1, ctx.currentTime, 0.3); },
  death() { if (!ctx) return; const o = out(0.6); osc('sawtooth', 400, 60, 0.9, 0.4, o); noise(0.8, 0.4, o, 'lowpass', 1500, 100); },
  land(vol = 1, pan = 0) { if (!ctx) return; const o = out(0.7 * vol, pan); osc('sine', 100, 35, 0.4, 1, o); noise(0.35, 0.5, o, 'lowpass', 900, 100); },
  tick() { if (!ctx) return; osc('square', 1400, 1400, 0.025, 0.12, out(0.4)); },
  reveal(pure) { if (!ctx) return; const o = out(0.6); (pure ? [523, 659, 784, 1047, 1319] : [392, 523, 659, 784]).forEach((f, i) => osc('triangle', f, f, 0.5, 0.35, o, ctx.currentTime + i * 0.07)); noise(0.6, 0.2, o, 'highpass', 6000, 9000, 1, ctx.currentTime, 0.05); },
  heal() { if (!ctx) return; const o = out(0.4); [660, 880, 1100].forEach((f, i) => osc('sine', f, f * 1.05, 0.3, 0.3, o, ctx.currentTime + i * 0.05)); },
  // --- touche / prise de coups ---
  // élimination confirmée : coup sourd + carillon montant
  kill() { if (!ctx || !throttle('kill', 200)) return; const o = out(0.55); osc('sine', 160, 50, 0.22, 0.9, o); noise(0.1, 0.4, o, 'lowpass', 1800, 300); [784, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.22, 0.28, o, ctx.currentTime + 0.05 + i * 0.05)); },
  hitmark() { if (!ctx || !throttle('hitmark', 55)) return; const o = out(0.32); osc('square', 1900, 1500, 0.035, 0.35, o); osc('sine', 950, 700, 0.05, 0.4, o); },
  hurt() { if (!ctx || !throttle('hurt', 140)) return; const o = out(0.5); osc('sine', 120, 55, 0.18, 0.9, o); noise(0.12, 0.35, o, 'lowpass', 900, 200); },
  heartbeat() { if (!ctx || !throttle('coeur', 850)) return; const o = out(0.55); osc('sine', 62, 40, 0.12, 1, o); osc('sine', 58, 38, 0.12, 0.8, o, ctx.currentTime + 0.2); },
  // --- tournoi ---
  gong() { if (!ctx) return; const o = out(0.75); [98, 147, 196, 262, 349].forEach((f, i) => osc('sine', f, f * 0.98, 2.4 - i * 0.3, 0.5 / (i + 1), o, ctx.currentTime, 0.004)); noise(0.3, 0.3, o, 'bandpass', 800, 300, 2); foule(1, 2.5); },
  fanfare() { if (!ctx) return; const o = out(0.6); [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4]].forEach(([f, d]) => { osc('sawtooth', f, f, 0.3, 0.18, o, ctx.currentTime + d, 0.01); osc('triangle', f * 2, f * 2, 0.3, 0.12, o, ctx.currentTime + d, 0.01); }); foule(1, 3); },
  defaite() { if (!ctx) return; const o = out(0.6); [392, 370, 349, 262].forEach((f, i) => osc('triangle', f, f * 0.97, 0.45, 0.35, o, ctx.currentTime + i * 0.22)); },
  // --- survie ---
  cor() { if (!ctx) return; const o = out(0.7); [[110, 0], [110, 0.5], [147, 1.0]].forEach(([f, d]) => { osc('sawtooth', f, f * 1.01, d === 1 ? 1.2 : 0.38, 0.3, o, ctx.currentTime + d, 0.06); osc('sawtooth', f * 1.5, f * 1.5, d === 1 ? 1.2 : 0.38, 0.12, o, ctx.currentTime + d, 0.06); }); },
  vagueOk() { if (!ctx) return; const o = out(0.5); [659, 784, 988, 1319].forEach((f, i) => osc('sine', f, f, 0.5, 0.3, o, ctx.currentTime + i * 0.09)); },
  rugissement(vol = 1) { if (!ctx || !throttle('rugit', 1500)) return; const o = out(0.8 * vol); osc('sawtooth', 90, 45, 1.3, 0.5, o, ctx.currentTime, 0.1); osc('sawtooth', 135, 60, 1.2, 0.3, o, ctx.currentTime, 0.1); noise(1.2, 0.5, o, 'bandpass', 600, 150, 2, ctx.currentTime, 0.1); },
  crachat(vol = 1, pan = 0) { if (!ctx || !throttle('crachat', 120)) return; const o = out(0.4 * vol, pan); noise(0.15, 0.6, o, 'bandpass', 1400, 500, 3); osc('sine', 500, 200, 0.12, 0.3, o); },
  meche(vol = 1, pan = 0) { if (!ctx || !throttle('meche', 300)) return; const o = out(0.35 * vol, pan); noise(0.55, 0.4, o, 'highpass', 5000, 7000, 1, ctx.currentTime, 0.02); },
  elite(vol = 1, pan = 0) { if (!ctx || !throttle('elite', 400)) return; const o = out(0.45 * vol, pan); [440, 554, 659].forEach((f, i) => osc('square', f, f, 0.12, 0.15, o, ctx.currentTime + i * 0.06)); },
  relique() { if (!ctx) return; const o = out(0.6); [523, 784, 1047, 1568, 2093].forEach((f, i) => osc('sine', f, f * 1.01, 0.7, 0.25, o, ctx.currentTime + i * 0.06)); noise(0.8, 0.12, o, 'highpass', 7000, 10000, 1, ctx.currentTime, 0.05); },
  pop(vol = 1, pan = 0) { if (!ctx || !throttle('pop', 120)) return; const o = out(0.35 * vol, pan); osc('sine', 600, 1100, 0.08, 0.5, o); osc('sine', 1300, 1500, 0.06, 0.2, o, ctx.currentTime + 0.05); },
  niveau() { if (!ctx) return; const o = out(0.45); [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, f, 0.25, 0.3, o, ctx.currentTime + i * 0.06)); },
  // --- Clans Élémentaires : cartes ---
  carte(el = 'feu') { if (!ctx || !throttle('carte', 60)) return; const o = out(0.45); noise(0.12, 0.35, o, 'bandpass', 900, 2600, 1.5); (CAST[{ feu: 'feu', eau: 'eau', plante: 'nature' }[el]] || CAST.metal)(out(0.35)); },
  bouclier() { if (!ctx || !throttle('bouclier', 80)) return; const o = out(0.45); [330, 660, 990].forEach((f, i) => osc('triangle', f, f * 1.02, 0.35, 0.2 / (i + 1), o)); noise(0.12, 0.25, o, 'bandpass', 2000, 1200, 2); },
  pouvoir() { if (!ctx || !throttle('pouvoir', 80)) return; const o = out(0.45); [440, 554, 659, 880].forEach((f, i) => osc('sine', f, f * 1.01, 0.4, 0.22, o, ctx.currentTime + i * 0.05)); },
  coup() { if (!ctx || !throttle('coup', 50)) return; const o = out(0.55); osc('sine', 170, 45, 0.16, 0.9, o); noise(0.1, 0.55, o, 'lowpass', 2600, 300); },
  melange() { if (!ctx || !throttle('melange', 200)) return; const o = out(0.3); for (let i = 0; i < 6; i++) noise(0.03, 0.25, o, 'bandpass', 2500, 1800, 2, ctx.currentTime + i * 0.035); },
  tirage(rarete) { if (!ctx) return; if (rarete === 'legendaire') { this.relique(); setTimeout(() => this.fanfare(), 350); } else if (rarete === 'epique') this.reveal(true); else if (rarete === 'rare') this.reveal(false); else this.pop(); },
  victory() { if (!ctx) return; const o = out(0.7); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => osc('triangle', f, f, 0.35, 0.4, o, ctx.currentTime + i * 0.14)); },
};
