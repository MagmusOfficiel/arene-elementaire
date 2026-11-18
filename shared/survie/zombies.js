// =====================================================================
//  ZONE MORTE — les zombies (logique pure, sans Phaser)
//  • Population par morceau de 32 m, tirée de la graine : beaucoup en
//    centre-ville, moins en quartier, presque pas à la campagne.
//  • Seuls les morceaux autour du joueur sont simulés ; quand on s'éloigne,
//    on range les zombies (on garde juste combien il en reste par morceau).
//  • Ils ENTENDENT (bruits avec un rayon), VOIENT (ligne de vue, moins la
//    nuit), ERRENT, POURSUIVENT en contournant les murs (chemin sur la grille),
//    cassent les fenêtres et finissent par enfoncer les portes.
// =====================================================================
import { CH, T, hash, alea, zoneDe } from './monde.js';
import { visible, RAYON_JOUEUR } from './physique.js';
import { frapperBarricade } from './construction.js';

export const ZOMBIE = {
  vitesse: 1.45, vitesseNuit: 1.75, vitesseErrance: 0.55,   // m/s (le joueur marche à 3,2 et court à 5,6)
  vue: 13, vueNuit: 6.5, vueAccroupi: 0.55,                // l'accroupi n'est vu qu'à 55 % de la distance
  allonge: 0.85, preparation: 0.7, recharge: 1.6,          // attaque : portée, temps de préparation, pause
  rayon: 0.3, frappePorte: 1.6, pvPorte: 12, tempsVitre: 3,
  rayonSimu: 2,                                             // morceaux simulés autour du joueur (5 × 5)
};

const fdiv = (a, b) => Math.floor(a / b);
// combien de zombies au départ dans un morceau
export function populationInitiale(seed, cx, cy) {
  const z = zoneDe(seed, cx, cy), r = hash(seed, cx, cy, 31);
  const danger = z.ville ? z.ville.danger : 1 + Math.hypot(cx, cy) / 40;
  const base = z.type === 'centre' ? 6 + (r % 5) : z.type === 'ville' ? 2 + (r % 4) : (r % 100 < 25 ? 1 : 0);
  return Math.round(base * Math.min(2.5, danger));
}

// passable pour un zombie qui poursuit : les portes fermées et les fenêtres aussi (il va les casser)
const CASSABLE = new Set([T.porte, T.fenetre]);

export class Horde {
  constructor(monde, sauvegarde = {}) {
    this.monde = monde;
    this.pop = sauvegarde.pop || {};          // "cx,cy" -> zombies restants dans ce morceau (rangé)
    this.portes = sauvegarde.portes || {};    // "x,y" -> coups reçus
    this.z = [];
    this.actifs = new Set();
    this.prochainId = 1;
    this.evenements = [];                     // pour le client : { type, x, y, ... } (sons, sang, messages)
  }
  sauvegarde() {
    // on range tout ce qui est actif dans pop avant d'écrire
    const pop = { ...this.pop };
    for (const k of this.actifs) pop[k] = 0;
    for (const z of this.z) { const k = `${fdiv(Math.floor(z.x), CH)},${fdiv(Math.floor(z.y), CH)}`; pop[k] = (pop[k] || 0) + 1; }
    return { pop, portes: this.portes };
  }

  // ---------- apparition / rangement selon la position du joueur ----------
  // activer(x, y, zoneSure) en solo, ou activer([{ x, y }, …], zoneSure) en coop
  activer(px, py, zoneSure = null) {
    const pos = Array.isArray(px) ? px : [{ x: px, y: py }];
    if (Array.isArray(px)) zoneSure = py ?? null;
    if (!pos.length) return;
    const R = ZOMBIE.rayonSimu, centres = pos.map((q) => [fdiv(Math.floor(q.x), CH), fdiv(Math.floor(q.y), CH)]);
    for (const [pcx, pcy] of centres) for (let cx = pcx - R; cx <= pcx + R; cx++) for (let cy = pcy - R; cy <= pcy + R; cy++) {
      const k = `${cx},${cy}`; if (this.actifs.has(k)) continue;
      this.actifs.add(k);
      const n = this.pop[k] ?? populationInitiale(this.monde.seed, cx, cy);
      delete this.pop[k];
      const R2 = alea(hash(this.monde.seed, cx, cy, 33, n, Object.keys(this.pop).length));
      for (let i = 0, essais = 0; i < n && essais < n * 30; essais++) {
        const x = cx * CH + 0.5 + Math.floor(R2() * CH), y = cy * CH + 0.5 + Math.floor(R2() * CH);
        if (this.monde.solide(x, y)) continue;
        if (zoneSure && Math.hypot(x - zoneSure.x, y - zoneSure.y) < zoneSure.r) continue;
        this.ajouter(x, y, R2); i++;
      }
    }
    // on range les morceaux trop loin (avec les zombies qui s'y trouvent)
    for (const k of [...this.actifs]) {
      const [cx, cy] = k.split(',').map(Number);
      if (centres.some(([pcx, pcy]) => Math.abs(cx - pcx) <= R + 1 && Math.abs(cy - pcy) <= R + 1)) continue;
      this.actifs.delete(k);
      const restants = this.z.filter((z) => fdiv(Math.floor(z.x), CH) === cx && fdiv(Math.floor(z.y), CH) === cy);
      this.pop[k] = (this.pop[k] || 0) + restants.length;
      this.z = this.z.filter((z) => !restants.includes(z));
    }
    // un zombie qui a erré dans un morceau rangé est rangé avec lui
    this.z = this.z.filter((z) => {
      const k = `${fdiv(Math.floor(z.x), CH)},${fdiv(Math.floor(z.y), CH)}`;
      if (this.actifs.has(k)) return true;
      this.pop[k] = (this.pop[k] || 0) + 1; return false;
    });
  }
  ajouter(x, y, R = Math.random) {
    const z = { id: this.prochainId++, x, y, pv: 1, etat: 'errance', angle: R() * Math.PI * 2, cible: null, attente: R() * 3, prep: 0, recharge: 0, aTerre: 0, chemin: null, tChemin: R(), frappe: 0, look: Math.floor(R() * 6), grogne: 2 + R() * 8, vu: null };
    this.z.push(z); return z;
  }

  // ---------- bruit : tous les zombies dans le rayon viennent voir ----------
  bruit(x, y, rayon) {
    if (rayon <= 0) return;
    for (const z of this.z) {
      if (z.etat === 'chasse') continue;
      const d = Math.hypot(z.x - x, z.y - y); if (d > rayon) continue;
      z.etat = 'alerte'; z.cible = { x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2 }; z.chemin = null; z.tChemin = 0; z.attente = 0;
    }
  }

  // ---------- chemin sur la grille (parcours en largeur, rayon limité) ----------
  chemin(z, cx, cy) {
    const m = this.monde, R = 22, sx = Math.floor(z.x), sy = Math.floor(z.y), tx = Math.floor(cx), ty = Math.floor(cy);
    if (Math.abs(tx - sx) > R || Math.abs(ty - sy) > R) return null;
    const W = R * 2 + 1, idx = (x, y) => (y - sy + R) * W + (x - sx + R), prec = new Int32Array(W * W).fill(-1);
    const file = [idx(sx, sy)]; prec[file[0]] = file[0];
    const fin = idx(tx, ty);
    for (let i = 0; i < file.length; i++) {
      const c = file[i]; if (c === fin) break;
      const x = (c % W) + sx - R, y = Math.floor(c / W) + sy - R;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (Math.abs(nx - sx) > R || Math.abs(ny - sy) > R) continue;
        const n = idx(nx, ny); if (prec[n] !== -1) continue;
        if (m.solide(nx, ny) && !this.cassable(nx, ny)) continue;
        prec[n] = c; file.push(n);
      }
    }
    if (prec[fin] === -1) return null;
    const pts = []; for (let c = fin; c !== prec[c]; c = prec[c]) pts.push({ x: (c % W) + sx - R + 0.5, y: Math.floor(c / W) + sy - R + 0.5 });
    return pts.reverse();
  }

  // ---------- un pas de simulation ----------
  // joueur : { x, y, accroupi, mort } ; nuit : 0..1 ; frapper(z, joueur) appelé quand un coup porte
  // joueurs : un joueur { x, y, accroupi, mort, dort, lumiere } en solo, ou une liste en coop
  maj(dt, joueurs, nuit, frapper) {
    const m = this.monde, liste = (Array.isArray(joueurs) ? joueurs : [joueurs]).filter((j) => j && !j.mort);
    const vueDe = (j) => (ZOMBIE.vue + (ZOMBIE.vueNuit - ZOMBIE.vue) * (j.lumiere ? nuit * 0.25 : nuit)) * (j.accroupi ? ZOMBIE.vueAccroupi : 1) * (j.dort ? 0.6 : 1);   // une lampe allumée se voit de loin
    const vit = ZOMBIE.vitesse + (ZOMBIE.vitesseNuit - ZOMBIE.vitesse) * nuit;
    const vues = liste.map(vueDe);
    for (const z of this.z) {
      z.recharge = Math.max(0, z.recharge - dt);
      z.grogne -= dt; if (z.grogne <= 0) { z.grogne = 4 + Math.random() * 10; if (z.etat !== 'errance' || Math.random() < 0.3) this.evenements.push({ type: 'grogne', x: z.x, y: z.y }); }
      if (z.aTerre > 0) { z.aTerre -= dt; z.prep = 0; continue; }
      // vue : le joueur visible le plus proche devient la proie
      let joueur = null, d = Infinity;
      for (let k = 0; k < liste.length; k++) {
        const j = liste[k], dj = Math.hypot(j.x - z.x, j.y - z.y);
        if (dj < d && dj < vues[k] && visible(m, z.x, z.y, j.x, j.y, vues[k])) { joueur = j; d = dj; }
      }
      if (joueur) {
        if (z.etat !== 'chasse') { z.chemin = null; z.tChemin = 0; }
        z.etat = 'chasse'; z.vu = { x: joueur.x, y: joueur.y };
      } else if (z.etat === 'chasse') { z.etat = 'alerte'; z.cible = z.vu || { x: z.x, y: z.y }; }
      // attaque
      if (z.etat === 'chasse' && joueur && d < ZOMBIE.allonge + 0.15) {
        z.angle = Math.atan2(joueur.y - z.y, joueur.x - z.x);
        if (z.prep > 0) { z.prep -= dt; if (z.prep <= 0) { z.recharge = ZOMBIE.recharge; if (d < ZOMBIE.allonge + 0.3) frapper?.(z, joueur); } }
        else if (z.recharge <= 0) z.prep = ZOMBIE.preparation;
        continue;
      }
      z.prep = 0;
      // destination
      let but = null, v = vit;
      if (z.etat === 'chasse') but = { x: joueur.x, y: joueur.y };
      else if (z.etat === 'alerte') {
        but = z.cible;
        if (!but || Math.hypot(but.x - z.x, but.y - z.y) < 0.7) { z.etat = 'errance'; z.cible = null; z.attente = 2 + Math.random() * 4; z.chemin = null; }
      }
      if (z.etat === 'errance') {
        v = ZOMBIE.vitesseErrance;
        if (z.attente > 0) { z.attente -= dt; continue; }
        if (!z.cible || Math.hypot(z.cible.x - z.x, z.cible.y - z.y) < 0.5) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5, nx = z.x + Math.cos(a) * r, ny = z.y + Math.sin(a) * r;
          z.cible = m.solide(nx, ny) ? null : { x: nx, y: ny }; z.attente = Math.random() < 0.5 ? 1 + Math.random() * 4 : 0;
          if (!z.cible) continue;
        }
        but = z.cible;
      }
      if (!but) continue;
      // chemin : en ligne droite si on voit le but, sinon parcours de grille (recalculé de temps en temps)
      let pas = but;
      if (z.etat !== 'errance') {
        const direct = visible(m, z.x, z.y, but.x, but.y, 40) && !this.bloqueDevant(z, but);
        if (!direct) {
          z.tChemin -= dt;
          if (!z.chemin || z.tChemin <= 0) { z.chemin = this.chemin(z, but.x, but.y); z.tChemin = 0.5 + Math.random() * 0.4; }
          if (z.chemin) {
            while (z.chemin.length && Math.hypot(z.chemin[0].x - z.x, z.chemin[0].y - z.y) < 0.35) z.chemin.shift();
            if (z.chemin.length) pas = z.chemin[0];
          }
        } else z.chemin = null;
      }
      // une porte ou une fenêtre fermée devant : on frappe dessus
      const ang = Math.atan2(pas.y - z.y, pas.x - z.x), fx = Math.floor(z.x + Math.cos(ang) * 0.75), fy = Math.floor(z.y + Math.sin(ang) * 0.75);
      const devant = m.tuile(fx, fy);
      if (z.etat !== 'errance' && m.solide(fx, fy) && this.cassable(fx, fy) && (fx !== Math.floor(z.x) || fy !== Math.floor(z.y))) {
        z.angle = ang; z.frappe += dt;
        if (m.barricade(fx, fy)) {   // des planches clouées : il faut les arracher une à une
          if (z.frappe >= ZOMBIE.frappePorte) {
            z.frappe = 0; const r = frapperBarricade(m, fx, fy);
            this.evenements.push({ type: r === 'coup' ? 'coupBarricade' : 'planche', x: fx + 0.5, y: fy + 0.5, fin: r === 'fin' }); this.bruit(fx + 0.5, fy + 0.5, 8);
          }
          continue;
        }
        if (devant === T.fenetre && z.frappe >= ZOMBIE.tempsVitre) { m.poser(fx, fy, T.fenetreCassee); z.frappe = 0; this.evenements.push({ type: 'vitre', x: fx + 0.5, y: fy + 0.5 }); this.bruit(fx + 0.5, fy + 0.5, 20); }
        if (devant === T.porte && z.frappe >= ZOMBIE.frappePorte) {
          z.frappe = 0; const k = `${fx},${fy}`; this.portes[k] = (this.portes[k] || 0) + 1;
          this.evenements.push({ type: 'coupPorte', x: fx + 0.5, y: fy + 0.5 }); this.bruit(fx + 0.5, fy + 0.5, 8);
          if (this.portes[k] >= ZOMBIE.pvPorte) { m.poser(fx, fy, T.porteOuverte); delete this.portes[k]; this.evenements.push({ type: 'porteEnfoncee', x: fx + 0.5, y: fy + 0.5 }); }
        }
        continue;
      }
      z.frappe = 0;
      this.avancer(z, ang, v * dt);
    }
    // les zombies se poussent entre eux (pas de pile au même endroit)
    for (let i = 0; i < this.z.length; i++) for (let j = i + 1; j < this.z.length; j++) {
      const a = this.z[i], b = this.z[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 0.6) { const p = (0.6 - d) / 2; this.glisser(a, -dx / d * p, -dy / d * p); this.glisser(b, dx / d * p, dy / d * p); }
    }
  }
  cassable(x, y) { return CASSABLE.has(this.monde.tuile(x, y)) || !!this.monde.barricade(x, y); }
  bloqueDevant(z, but) {   // la ligne droite traverse une tuile solide (une porte fermée ne bloque pas la vue... si : opaque)
    const d = Math.hypot(but.x - z.x, but.y - z.y), n = Math.ceil(d * 3);
    for (let i = 1; i <= n; i++) { const t = i / n; if (this.monde.solide(z.x + (but.x - z.x) * t, z.y + (but.y - z.y) * t)) return true; }
    return false;
  }
  avancer(z, ang, dist) {
    z.angle = ang;
    this.glisser(z, Math.cos(ang) * dist, Math.sin(ang) * dist);
  }
  glisser(z, dx, dy) {
    const m = this.monde, r = ZOMBIE.rayon;
    const libre = (x, y) => !m.solide(x - r, y - r) && !m.solide(x + r, y - r) && !m.solide(x - r, y + r) && !m.solide(x + r, y + r);
    if (libre(z.x + dx, z.y)) z.x += dx;
    if (libre(z.x, z.y + dy)) z.y += dy;
  }
  // ---------- le joueur frappe : arc devant lui ----------
  // renvoie la liste des zombies touchés (et tués)
  coup(joueur, dir, arme) {
    const touches = [];
    const cand = this.z.map((z) => ({ z, d: Math.hypot(z.x - joueur.x, z.y - joueur.y) })).filter(({ z, d }) => {
      if (d > arme.portee + ZOMBIE.rayon) return false;
      const a = Math.atan2(z.y - joueur.y, z.x - joueur.x) - Math.atan2(dir.y, dir.x);
      const da = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      return da < arme.arc / 2 && visible(this.monde, joueur.x, joueur.y, z.x, z.y, arme.portee + 1);
    }).sort((a, b) => a.d - b.d).slice(0, arme.cibles);
    for (const { z } of cand) {
      const auSol = z.aTerre > 0;
      let degats = arme.degats[0] + Math.random() * (arme.degats[1] - arme.degats[0]);
      if (auSol) degats *= 2;                                     // on achève un zombie à terre
      z.pv -= degats;
      const k = Math.atan2(z.y - joueur.y, z.x - joueur.x);
      if (!auSol) this.glisser(z, Math.cos(k) * arme.recul, Math.sin(k) * arme.recul);
      if (Math.random() < arme.chute) z.aTerre = 1.4 + Math.random();
      z.prep = 0; z.recharge = Math.max(z.recharge, 0.5);
      if (z.etat !== 'chasse') { z.etat = 'chasse'; z.vu = { x: joueur.x, y: joueur.y }; }
      touches.push({ z, mort: z.pv <= 0, auSol });
    }
    const morts = touches.filter((t) => t.mort).map((t) => t.z);
    this.z = this.z.filter((z) => !morts.includes(z));
    return touches;
  }
  // ---------- bousculer : repousse et fait parfois tomber, sans dégâts ----------
  bousculer(joueur, dir) {
    let n = 0;
    for (const z of this.z) {
      const d = Math.hypot(z.x - joueur.x, z.y - joueur.y); if (d > 1.3) continue;
      const a = Math.atan2(z.y - joueur.y, z.x - joueur.x) - Math.atan2(dir.y, dir.x);
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 1.1) continue;
      const k = Math.atan2(z.y - joueur.y, z.x - joueur.x);
      this.glisser(z, Math.cos(k) * 0.9, Math.sin(k) * 0.9); z.prep = 0; z.recharge = Math.max(z.recharge, 0.8);
      if (Math.random() < 0.4) z.aTerre = 1.2 + Math.random() * 0.8;
      n++;
    }
    return n;
  }
  autour(x, y, r) { return this.z.filter((z) => Math.hypot(z.x - x, z.y - y) < r && z.aTerre <= 0).length; }
}

// usure : nombre de coups qui portent avant que l'arme casse
export const ARMES = {
  batte: { degats: [0.42, 0.62], portee: 1.45, arc: 1.9, cibles: 2, recul: 0.55, chute: 0.3, recharge: 0.75, endurance: 9, bruit: 5, usure: 50 },
  couteau: { degats: [0.3, 0.45], portee: 0.9, arc: 1.0, cibles: 1, recul: 0.15, chute: 0.05, recharge: 0.45, endurance: 4, bruit: 2, usure: 40 },
  poele: { degats: [0.35, 0.5], portee: 1.1, arc: 1.6, cibles: 1, recul: 0.5, chute: 0.4, recharge: 0.7, endurance: 7, bruit: 8, usure: 60 },
  piedbiche: { degats: [0.5, 0.7], portee: 1.2, arc: 1.6, cibles: 1, recul: 0.4, chute: 0.3, recharge: 0.8, endurance: 8, bruit: 5, usure: 100 },
  hache: { degats: [0.75, 1.05], portee: 1.3, arc: 1.8, cibles: 2, recul: 0.4, chute: 0.35, recharge: 1.0, endurance: 12, bruit: 6, usure: 70 },
  marteau: { degats: [0.4, 0.55], portee: 1.0, arc: 1.4, cibles: 1, recul: 0.3, chute: 0.25, recharge: 0.6, endurance: 6, bruit: 5, usure: 80 },
  matraque: { degats: [0.35, 0.5], portee: 1.2, arc: 1.6, cibles: 1, recul: 0.5, chute: 0.45, recharge: 0.6, endurance: 6, bruit: 4, usure: 80 },
  poings: { degats: [0.12, 0.2], portee: 0.95, arc: 1.2, cibles: 1, recul: 0.3, chute: 0.1, recharge: 0.5, endurance: 5, bruit: 3, usure: Infinity },
};
export { RAYON_JOUEUR };
