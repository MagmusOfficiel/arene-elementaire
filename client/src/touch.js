import { reglages } from './reglages.js';
// =====================================================================
//  Contrôles tactiles (téléphone / tablette)
//  - joystick qui apparaît sous le pouce gauche
//  - boutons de sorts à droite :
//      · toucher = sort lancé avec visée automatique (ennemi le plus proche)
//      · appuyer + glisser = viser soi-même (flèche affichée), relâcher pour lancer
//      · revenir sur le bouton avant de relâcher = annuler
// =====================================================================
export const TOUCH = new URLSearchParams(location.search).has('tactile')
  || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// État lu par la scène à chaque image
export const touch = { mx: 0, my: 0, attack: false, onCast: null, vise: null };
// vise = { slot, dx, dy, k } : direction (unitaire) et force (0..1) du glissé en cours

const $ = (id) => document.getElementById(id);

let ready = false;
export function initTouch() {
  if (!TOUCH || ready) return;
  ready = true;
  document.body.classList.add('touch');
  $('touch').classList.remove('hidden');

  // ---- Joystick dynamique ----
  const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob');
  let sid = null, cx = 0, cy = 0;
  const R = 55;
  const move = (x, y) => {
    let dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.mx = dx / R; touch.my = dy / R;
  };
  zone.addEventListener('pointerdown', (e) => {
    sid = e.pointerId; try { zone.setPointerCapture(sid); } catch { /* pointeur synthétique */ }
    const r = zone.getBoundingClientRect();
    cx = e.clientX; cy = e.clientY;
    base.style.left = `${cx - r.left}px`; base.style.top = `${cy - r.top}px`;
    move(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === sid) move(e.clientX, e.clientY); });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; touch.mx = touch.my = 0; knob.style.transform = ''; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

  // ---- Boutons : toucher = visée auto, glisser = visée manuelle ----
  const SEUIL = 22, PORTEE = 90;
  const bind = (id, slot) => {
    const b = $(id);
    let pid = null, x0 = 0, y0 = 0, glisse = false;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.classList.add('on');
      pid = e.pointerId; try { b.setPointerCapture(pid); } catch { /* pointeur synthétique */ }
      const r = b.getBoundingClientRect(); x0 = r.left + r.width / 2; y0 = r.top + r.height / 2; glisse = false;
      if (slot === 'basique') touch.attack = true;
      else if (slot === 'esquive') touch.onCast?.(slot);          // l'esquive part tout de suite
      if (reglages.vibration && navigator.vibrate) navigator.vibrate(12);
    });
    b.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || slot === 'esquive') return;
      const dx = e.clientX - x0, dy = e.clientY - y0, d = Math.hypot(dx, dy);
      if (d > SEUIL) glisse = true;
      if (!glisse) return;
      b.classList.toggle('annule', d < SEUIL);
      touch.vise = d < SEUIL ? null : { slot, dx: dx / d, dy: dy / d, k: Math.min(1, (d - SEUIL) / PORTEE) };
    });
    const fin = (e, lancer) => {
      if (e.pointerId !== pid) return;
      pid = null; b.classList.remove('on', 'annule');
      const v = touch.vise;
      if (slot === 'basique') touch.attack = false;
      else if (slot !== 'esquive' && lancer) {
        if (!glisse) touch.onCast?.(slot);              // simple toucher : visée auto
        else if (v) touch.onCast?.(slot, v);            // glissé : visée manuelle
        // glissé ramené sur le bouton : annulé
      }
      touch.vise = null;
    };
    b.addEventListener('pointerup', (e) => fin(e, true));
    b.addEventListener('pointercancel', (e) => fin(e, false));
  };
  bind('tb-b', 'basique'); bind('tb-s1', 'sort1'); bind('tb-s2', 'sort2'); bind('tb-s3', 'sort3'); bind('tb-dg', 'esquive'); bind('tb-ult', 'ultime');

  // Roue d'emotes
  $('tb-emote')?.addEventListener('pointerdown', (e) => { e.preventDefault(); touch.onEmote?.(); });

  // Plein écran + paysage quand c'est possible
  try { document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}); } catch { /* navigateur sans plein écran */ }
}

// Icônes des sorts sur les boutons (appelé quand le champion change)
export function iconesBoutons(icones) {
  for (const [id, ic] of Object.entries(icones)) { const b = $(id); if (!b) continue; const t = b.querySelector('.ic') || b.insertBefore(document.createElement('span'), b.firstChild); t.className = 'ic'; t.textContent = ic; for (const n of [...b.childNodes]) if (n.nodeType === 3) n.remove(); }
}
