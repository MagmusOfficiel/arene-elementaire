// =====================================================================
//  ZONE MORTE — déplacement, interactions, champ de vision, heure
//  (logique pure, sans Phaser : testable et réutilisable pour la coop)
// =====================================================================
import { T, LENT } from './monde.js';

export const VITESSE = { marche: 3.2, course: 5.6 };   // tuiles (mètres) par seconde
export const RAYON_JOUEUR = 0.3;
export const DUREE_JOUR_S = 40 * 60;                   // une journée de jeu = 40 minutes réelles
export const MIN_PAR_S = 1440 / DUREE_JOUR_S;

// Collision cercle / tuiles, axe par axe (on glisse le long des murs)
function touche(monde, x, y, r) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
    if (!monde.solide(tx, ty)) continue;
    const px = Math.max(tx, Math.min(x, tx + 1)), py = Math.max(ty, Math.min(y, ty + 1));
    if ((px - x) ** 2 + (py - y) ** 2 < r * r) return true;
  }
  return false;
}
export function deplacer(monde, p, dx, dy, dt, course = false, facteur = 1) {
  const len = Math.hypot(dx, dy); if (!len) return 0;
  let v = (course ? VITESSE.course : VITESSE.marche) * facteur;
  const sol = monde.tuile(p.x, p.y);
  if (LENT.has(sol)) v *= 0.65;
  if (sol === T.fenetreCassee) v *= 0.4;     // on enjambe une fenêtre cassée
  const sx = (dx / len) * v * dt, sy = (dy / len) * v * dt;
  // petits pas pour ne pas traverser une tuile à grande vitesse
  const n = Math.ceil(Math.max(Math.abs(sx), Math.abs(sy)) / 0.2);
  let fait = 0;
  for (let i = 0; i < n; i++) {
    const ox = p.x, oy = p.y;
    if (!touche(monde, p.x + sx / n, p.y, RAYON_JOUEUR)) p.x += sx / n;
    if (!touche(monde, p.x, p.y + sy / n, RAYON_JOUEUR)) p.y += sy / n;
    fait += Math.hypot(p.x - ox, p.y - oy);
  }
  return fait;
}

// Ce qu'on peut utiliser devant soi : porte, fenêtre, meuble
const INTERACTIF = new Set([T.porte, T.porteOuverte, T.fenetre, T.meuble, T.lit, T.etagere]);
export function cibleInteraction(monde, p, dir) {
  const essais = [[p.x + dir.x * 0.85, p.y + dir.y * 0.85], [p.x + dir.x * 1.3, p.y + dir.y * 1.3]];
  for (const [x, y] of essais) { const v = monde.tuile(x, y); if (INTERACTIF.has(v)) return { x: Math.floor(x), y: Math.floor(y), type: v }; }
  // sinon la tuile interactive la plus proche autour
  let best = null;
  for (let ty = Math.floor(p.y) - 1; ty <= Math.floor(p.y) + 1; ty++) for (let tx = Math.floor(p.x) - 1; tx <= Math.floor(p.x) + 1; tx++) {
    const v = monde.tuile(tx, ty); if (!INTERACTIF.has(v)) continue;
    const d = Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y); if (d < 1.4 && (!best || d < best.d)) best = { x: tx, y: ty, type: v, d };
  }
  return best;
}
export function texteInteraction(type) {
  return { [T.porte]: 'ouvrir la porte', [T.porteOuverte]: 'fermer la porte', [T.fenetre]: 'casser la fenêtre', [T.meuble]: 'fouiller', [T.lit]: 'fouiller', [T.etagere]: 'fouiller' }[type] || '';
}
// Renvoie ce qui s'est passé (pour le son et le message)
export function interagir(monde, p, cible) {
  if (!cible) return null;
  const { x, y, type } = cible;
  if (monde.barricade(x, y)) return 'barricadee';
  if (type === T.porte) { monde.poser(x, y, T.porteOuverte); return 'porteOuverte'; }
  if (type === T.porteOuverte) {
    // on ne referme pas une porte sur soi
    const dedans = p.x + 0.3 > x && p.x - 0.3 < x + 1 && p.y + 0.3 > y && p.y - 0.3 < y + 1;
    if (dedans) return 'bloque';
    monde.poser(x, y, T.porte); return 'porteFermee';
  }
  if (type === T.fenetre) { monde.poser(x, y, T.fenetreCassee); return 'vitre'; }
  return 'fouille';   // l'inventaire arrive à la phase 3
}

// Champ de vision : on lance des rayons, ils s'arrêtent sur les tuiles opaques.
// Renvoie la liste des points du polygone visible (coordonnées monde, en tuiles).
export function champDeVision(monde, x, y, portee = 24, rayons = 540) {
  const pts = [];
  for (let i = 0; i < rayons; i++) {
    const a = (i / rayons) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    // parcours de grille (DDA)
    let tx = Math.floor(x), ty = Math.floor(y);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9));
    let sideX = (dx > 0 ? tx + 1 - x : x - tx) * tdx, sideY = (dy > 0 ? ty + 1 - y : y - ty) * tdy;
    let d = 0;
    while (d < portee) {
      if (sideX < sideY) { d = sideX; sideX += tdx; tx += stepX; } else { d = sideY; sideY += tdy; ty += stepY; }
      if (d >= portee) { d = portee; break; }
      if (monde.opaque(tx, ty)) { d += 0.55; break; }   // on voit la face du mur
    }
    pts.push(x + dx * Math.min(d, portee), y + dy * Math.min(d, portee));
  }
  return pts;
}
export function visible(monde, x0, y0, x1, y1, portee = 24) {
  const d = Math.hypot(x1 - x0, y1 - y0); if (d > portee) return false;
  const n = Math.ceil(d * 3);
  for (let i = 1; i < n; i++) { const t = i / n; if (monde.opaque(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}

// ---------- Heure ----------
// temps = minutes de jeu depuis le début (jour 1, 8 h 00 = 480)
export function heure(temps) {
  const j = Math.floor(temps / 1440) + 1, m = temps % 1440;
  return { jour: j, h: Math.floor(m / 60), min: Math.floor(m % 60), texte: `Jour ${j} · ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}` };
}
// obscurité ambiante : 0 en plein jour, ~0.82 en pleine nuit, transitions à l'aube et au crépuscule
export function obscurite(temps) {
  const h = (temps % 1440) / 60;
  if (h >= 7 && h < 19) return 0;
  if (h >= 19 && h < 21.5) return ((h - 19) / 2.5) * 0.82;
  if (h >= 5 && h < 7) return (1 - (h - 5) / 2) * 0.82;
  return 0.82;
}
