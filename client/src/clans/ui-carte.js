// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la grande carte du monde (v101)
//  Touche C, ou un clic sur la mini-carte. Molette / pincer / boutons
//  pour zoomer, glisser pour se déplacer. Un clic sur un lieu y met la
//  flèche du guide.
// =====================================================================
import { toucheFermer, NOM_FERMER } from './touches.js';
import { MONDE, LIEUX, CENTRES, CENTRE_FAILLE, CENTRE_CIMES, CENTRE_AMBRE, CENTRE_CIEL, PASSE_AMBRE, PONT_CIEL, CARREFOUR } from '../../../shared/clans/geo.js';
import { SANCTUAIRES } from '../../../shared/clans/territoires.js';
import { REPERES } from '../../../shared/clans/reperes.js';
import * as QP from '../../../shared/clans/quetesPnj.js';
import { p as moi } from './ui-commun.js';
import { BOSS_MONDIAUX } from '../../../shared/clans/mondial.js';
import { $, esc, toast } from './ui-commun.js';
import { monde } from './ui-monde.js';

const COUL = { feu: '#e8602c', eau: '#3a9ad8', plante: '#4aa84a', brisees: '#8a60e0', cimes: '#4a90d8', ambre: '#e0a030', ciel: '#b090ff' };
const REGIONS = [
  ['🔥 Terres de Braise', CENTRES.feu, COUL.feu], ['💧 Lagons d’Azur', CENTRES.eau, COUL.eau], ['🌿 Sylve d’Émeraude', CENTRES.plante, COUL.plante],
  ['🌀 Terres Brisées · niv. 30', CENTRE_FAILLE, COUL.brisees], ['⚡ Cimes Orageuses · niv. 50', CENTRE_CIMES, COUL.cimes],
  ['🏜️ Désert d’Ambre · niv. 70', CENTRE_AMBRE, COUL.ambre], ['🌌 Îles Célestes · niv. 90', [CENTRE_CIEL[0], CENTRE_CIEL[1] + 110], COUL.ciel],
];
const ICO_LIEU = (l) => (l.action === 'tirage' ? '✨' : '🌀');

let el = null, cv = null, ctx = null, ouverte = false, zoom = 0.2, cx = MONDE.l / 2, cy = MONDE.h / 2, raf = 0, survol = null;
const pointeurs = new Map();
let pincement = null, glisse = null;

const dpr = () => Math.min(2, devicePixelRatio || 1);
const zMin = () => Math.min(cv.width / MONDE.l, cv.height / MONDE.h) * 0.95;
const zMax = () => 1.6 * dpr();
const borner = () => {
  zoom = Math.max(zMin(), Math.min(zMax(), zoom));
  const dw = cv.width / zoom / 2, dh = cv.height / zoom / 2;
  cx = dw * 2 >= MONDE.l ? MONDE.l / 2 : Math.max(dw, Math.min(MONDE.l - dw, cx));
  cy = dh * 2 >= MONDE.h ? MONDE.h / 2 : Math.max(dh, Math.min(MONDE.h - dh, cy));
};
const versEcran = (x, y) => [(x - cx) * zoom + cv.width / 2, (y - cy) * zoom + cv.height / 2];
const versMonde = (px, py) => [(px - cv.width / 2) / zoom + cx, (py - cv.height / 2) / zoom + cy];
const zoomerAutour = (k, px, py) => { const [wx, wy] = versMonde(px, py); zoom *= k; borner(); const [nx, ny] = versMonde(px, py); cx += wx - nx; cy += wy - ny; borner(); };

function creer() {
  el = document.createElement('div'); el.id = 'grandeCarte'; el.className = 'cache';
  el.innerHTML = `<canvas></canvas>
    <div class="gcHaut"><b>🗺️ Carte du monde</b><span class="gcAide">Molette ou pincer : zoom · glisser : se déplacer · clic sur un lieu : y aller</span><button class="bouton" id="gcFermer" title="Fermer (C ou ${NOM_FERMER})">✕</button></div>
    <div class="gcZoom"><button class="bouton" id="gcPlus" title="Zoomer">＋</button><button class="bouton" id="gcMoins" title="Dézoomer">－</button><button class="bouton" id="gcMoi" title="Centrer sur moi">📍</button><button class="bouton" id="gcTout" title="Voir tout le monde">🌍</button></div>
    <div class="gcInfo" id="gcInfo"></div>`;
  document.body.append(el);
  cv = el.querySelector('canvas'); ctx = cv.getContext('2d');
  $('gcFermer').onclick = fermerCarte;
  $('gcPlus').onclick = () => zoomerAutour(1.5, cv.width / 2, cv.height / 2);
  $('gcMoins').onclick = () => zoomerAutour(1 / 1.5, cv.width / 2, cv.height / 2);
  $('gcMoi').onclick = () => { const j = monde.etatCarte().joueur; zoom = Math.max(zoom, 0.6 * dpr()); cx = j.x; cy = j.y; borner(); };
  $('gcTout').onclick = () => { zoom = zMin(); borner(); };
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const k = dpr(); zoomerAutour(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX * k, e.offsetY * k); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pointeurs.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); glisse = pointeurs.size === 1 ? { x: e.offsetX, y: e.offsetY, cx, cy, bouge: 0 } : null; if (pointeurs.size === 2) { const [a, b] = [...pointeurs.values()]; pincement = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; } });
  cv.addEventListener('pointermove', (e) => {
    const k = dpr();
    if (!pointeurs.has(e.pointerId)) { survol = lieuSous(e.offsetX * k, e.offsetY * k); cv.style.cursor = survol ? 'pointer' : 'grab'; return; }
    pointeurs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pointeurs.size === 2 && pincement) { const [a, b] = [...pointeurs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); const mx = (a.x + b.x) / 2 * k, my = (a.y + b.y) / 2 * k; zoomerAutour((pincement.z * d / pincement.d) / zoom, mx, my); return; }
    if (glisse) { const dx = e.offsetX - glisse.x, dy = e.offsetY - glisse.y; glisse.bouge = Math.max(glisse.bouge, Math.hypot(dx, dy)); cx = glisse.cx - dx * k / zoom; cy = glisse.cy - dy * k / zoom; borner(); cv.style.cursor = 'grabbing'; }
  });
  const lacher = (e) => {
    const g = glisse; pointeurs.delete(e.pointerId); if (pointeurs.size < 2) pincement = null;
    if (g && g.bouge < 6 && e.type === 'pointerup') { const k = dpr(), l = lieuSous(e.offsetX * k, e.offsetY * k); if (l) { monde.guider({ x: l.x, y: l.y, nom: l.nom }); toast(`📍 La flèche te guide vers <b>${esc(l.nom)}</b>.`); fermerCarte(); return; } }
    glisse = null; cv.style.cursor = 'grab';
  };
  cv.addEventListener('pointerup', lacher); cv.addEventListener('pointercancel', lacher);
  addEventListener('resize', () => { if (ouverte) taille(); });
}
function taille() { const k = dpr(); cv.width = Math.round(innerWidth * k); cv.height = Math.round(innerHeight * k); borner(); }

// les points qu'on peut cliquer
function lieux() {
  const e = monde.etatCarte(), l = LIEUX.map((p) => ({ x: p.x, y: p.y, nom: p.nom, ico: ICO_LIEU(p), coul: p.terr ? COUL[p.terr] : '#ffe070' }));
  l.push({ x: e.maison.x, y: e.maison.y + 20, nom: 'Ta maison', ico: '🏠', coul: '#ffffff' });
  // v108 : les lieux à visiter ; ceux d'une quête en cours sont marqués (anneau doré + « ❗ »)
  const cibles = new Set([...QP.lieuxAVoir(moi).map((r) => r.lieu), ...QP.objetsAVoir(moi).map((o) => QP.QUETES[o.id].objets[o.i][0])]);
  for (const r of REPERES) l.push({ x: r.x, y: r.y, nom: cibles.has(r.id) ? `❗ ${r.nom} (quête)` : r.nom, ico: r.ico, coul: cibles.has(r.id) ? '#ffd860' : '#c8b088', quete: cibles.has(r.id) });
  for (const s of SANCTUAIRES) l.push({ x: s.x, y: s.y, nom: s.nom, ico: '🏛️', coul: COUL[e.sanct?.[s.id]?.prop || s.terr] || '#aaa' });
  if (e.mondial) l.push({ x: e.mondial.x, y: e.mondial.y, nom: `${BOSS_MONDIAUX[e.mondial.terr]?.nom || 'Boss mondial'} (boss mondial)`, ico: '💀', coul: '#ff3a2a' });
  return l;
}
function lieuSous(px, py) { let best = null, d0 = 22 * dpr(); for (const l of lieux()) { const [x, y] = versEcran(l.x, l.y), d = Math.hypot(px - x, py - y); if (d < d0) { d0 = d; best = l; } } return best; }

function etiquette(t, x, y, coul, taille = 13) {
  const k = dpr(); ctx.font = `800 ${Math.round(taille * k)}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center';
  const w = ctx.measureText(t).width + 12 * k, h = (taille + 8) * k;
  ctx.fillStyle = 'rgba(10,8,14,.82)'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = coul; ctx.fillRect(x - w / 2, y - h / 2, 3 * k, h);
  ctx.fillStyle = '#f8ecd0'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 1 * k, y + 1 * k); ctx.textBaseline = 'alphabetic';
}
function dessiner() {
  if (!ouverte) return;
  raf = requestAnimationFrame(dessiner);
  const e = monde.etatCarte(), k = dpr(), t = performance.now() / 1000;
  ctx.fillStyle = '#0c0a10'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingEnabled = zoom < 0.5;
  const [x0, y0] = versEcran(0, 0);
  const src = e.fond || e.mini; if (src) ctx.drawImage(src, x0, y0, MONDE.l * zoom, MONDE.h * zoom);
  ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2 * k; ctx.strokeRect(x0, y0, MONDE.l * zoom, MONDE.h * zoom);
  // les régions
  for (const [nom, c, coul] of REGIONS) { const [x, y] = versEcran(c[0], c[1]); etiquette(nom, x, y - 40 * k, coul, zoom > 0.5 * k ? 15 : 12); }
  { const [x, y] = versEcran(...PASSE_AMBRE); etiquette('Passe des Sables', x, y - 18 * k, COUL.ambre, 10); }
  { const [x, y] = versEcran(...PONT_CIEL); etiquette('Pont des Étoiles', x, y, COUL.ciel, 10); }
  { const [x, y] = versEcran(...CARREFOUR); etiquette('✨ Carrefour', x, y + 26 * k, '#ffe070', 11); }
  // les habitants (de près)
  if (zoom > 0.45 * k) for (const p of e.pnj || []) { const [x, y] = versEcran(p.x, p.y); ctx.fillStyle = '#f8ecd0'; ctx.beginPath(); ctx.arc(x, y, 3 * k, 0, 7); ctx.fill(); if (zoom > 0.9 * k) { ctx.font = `700 ${10 * k}px Nunito, system-ui`; ctx.textAlign = 'center'; ctx.fillText(p.n.nom, x, y - 7 * k); } }
  // les lieux
  for (const l of lieux()) {
    const [x, y] = versEcran(l.x, l.y), r = (l === survol ? 13 : 10) * k;
    if (l.quete) { ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(x, y, r + (5 + Math.sin(t * 4) * 2) * k, 0, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(10,8,14,.85)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = l.coul; ctx.lineWidth = 2 * k; ctx.stroke();
    ctx.font = `${Math.round(r * 1.1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.ico, x, y + k); ctx.textBaseline = 'alphabetic';
    if (l === survol || zoom > 0.7 * k) etiquette(l.nom, x, y + r + 12 * k, l.coul, 11);
  }
  // les filons
  for (const f of e.filons || []) { const [x, y] = versEcran(f.x, f.y); ctx.fillStyle = '#fff8c0'; ctx.fillRect(x - 2 * k, y - 2 * k, 4 * k, 4 * k); }
  // les autres joueurs
  for (const a of e.autres) { const [x, y] = versEcran(a.x, a.y); ctx.fillStyle = COUL[a.clan] || '#fff'; ctx.beginPath(); ctx.arc(x, y, 4 * k, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = k; ctx.stroke(); if (zoom > 0.6 * k) { ctx.font = `700 ${10 * k}px Nunito, system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(a.nom, x, y - 8 * k); } }
  // la cible du guide
  if (e.cible) { const [x, y] = versEcran(e.cible.x, e.cible.y); ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(x, y, (14 + Math.sin(t * 5) * 3) * k, 0, 7); ctx.stroke(); }
  // moi
  { const [x, y] = versEcran(e.joueur.x, e.joueur.y), p = 1 + Math.sin(t * 6) * 0.25; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x, y, 12 * k * p, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 5 * k, 0, 7); ctx.fill(); ctx.strokeStyle = COUL[e.clan]; ctx.lineWidth = 2 * k; ctx.stroke(); etiquette('Toi', x, y - 18 * k, COUL[e.clan], 10); }
  $('gcInfo').textContent = `Zoom ×${(zoom / zMin()).toFixed(1)}`;
}

export function ouvrirCarte() {
  if (!el) creer();
  if (ouverte) return; ouverte = true; el.classList.remove('cache'); taille();
  const j = monde.etatCarte().joueur; zoom = Math.max(zMin(), 0.25 * dpr()); cx = j.x; cy = j.y; borner();
  monde.arreter?.(); cancelAnimationFrame(raf); dessiner();
}
export function fermerCarte() { if (!ouverte) return; ouverte = false; el.classList.add('cache'); cancelAnimationFrame(raf); }
export const carteOuverte = () => ouverte;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'c' || e.key === 'C') { ouverte ? fermerCarte() : (monde.etatCarte && ouvrirCarte()); }
  else if (toucheFermer(e) && ouverte) { e.preventDefault(); fermerCarte(); }
});
