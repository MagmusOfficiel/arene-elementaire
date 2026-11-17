// Petits sons de synthèse (WebAudio), sans fichier à télécharger.
let ctx = null;
export function debloquerSon() { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.(); } catch { /* pas de son */ } }
function bip(f1, f2, dur, type = 'sine', vol = 0.15, delai = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delai, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
}
export function son(nom) {
  switch (nom) {
    case 'clic': return bip(660, 880, 0.08, 'triangle', 0.08);
    case 'pas': return bip(220, 330, 0.12, 'triangle', 0.1);
    case 'carte': return bip(900, 500, 0.1, 'square', 0.05);
    case 'retourne': return bip(500, 1100, 0.09, 'triangle', 0.08);
    case 'phase': return bip(440, 660, 0.18, 'sine', 0.08);
    case 'chat': return bip(1200, 1300, 0.05, 'sine', 0.04);
    case 'vote': return bip(330, 220, 0.15, 'triangle', 0.1);
    case 'pouvoir': bip(300, 1200, 0.35, 'sawtooth', 0.06); return bip(600, 1800, 0.3, 'sine', 0.06, 0.05);
    case 'refus': return bip(200, 140, 0.15, 'square', 0.05);
    case 'scelle': [523, 659, 784, 1046].forEach((f, i) => bip(f, f, 0.35, 'triangle', 0.1, i * 0.09)); return;
    case 'rate': return bip(392, 330, 0.4, 'triangle', 0.09);
    case 'corrompu': bip(110, 55, 0.9, 'sawtooth', 0.12); return bip(233, 116, 0.8, 'square', 0.05, 0.05);
    case 'exil': bip(196, 98, 0.7, 'triangle', 0.14); return bip(147, 73, 0.7, 'sine', 0.1, 0.15);
    case 'victoire': [523, 659, 784, 1046, 1318].forEach((f, i) => bip(f, f, 0.5, 'triangle', 0.1, i * 0.12)); return;
    case 'defaite': [392, 349, 311, 262].forEach((f, i) => bip(f, f * 0.98, 0.5, 'triangle', 0.1, i * 0.18)); return;
  }
}
