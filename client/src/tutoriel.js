// =====================================================================
//  TUTORIEL INTERACTIF (première partie) — environ une minute
//  Chaque étape se valide en faisant l'action ; des repères s'affichent dans le monde
//  (cercle à atteindre, flèche vers l'ennemi, zone rouge à éviter) et sur l'interface.
//  Tout est affiché seulement chez le joueur : rien n'est envoyé au serveur.
// =====================================================================
import { TOUCH } from './touch.js';
import { insideBuilding, ARENA } from '../../shared/data.js';

const $ = (id) => document.getElementById(id);
const K = TOUCH
  ? { bouge: 'le joystick (pouce gauche)', att: 'le gros bouton ⚔', sorts: 'les boutons de sorts', esq: 'le bouton 💨', ult: 'le bouton ★' }
  : { bouge: 'ZQSD (ou WASD / flèches)', att: 'le clic gauche', sorts: 'E, Shift ou F', esq: 'Espace', ult: 'R' };

const ETAPES = [
  { id: 'move', titre: 'Se déplacer', txt: `Rejoins le cercle lumineux avec ${K.bouge}` },
  { id: 'basique', titre: 'Attaquer', txt: `Attaque avec ${K.att}${TOUCH ? ' — la visée est automatique' : ' en visant avec la souris'}` },
  { id: 'sort', titre: 'Les sorts', txt: `Lance un sort avec ${K.sorts}${TOUCH ? ' (glisse depuis le bouton pour viser)' : ''}` },
  { id: 'zone', titre: 'Éviter', txt: `Une zone rouge = un sort va tomber ! Sors-en vite, ou roule avec ${K.esq}` },
  { id: 'ultime', titre: 'L’ultime', txt: `Tes dégâts remplissent la jauge ★. Pleine, lance ton ULTIME avec ${K.ult}` },
  { id: 'fin', titre: 'Prêt !', txt: 'Les orbes soignent et chargent l’ultime. Tu sais tout, bonne chance !' },
];
const FOCUS = { basique: TOUCH ? '#tb-b' : '#slot-b', sort: TOUCH ? '#tb-s1, #tb-s2, #tb-s3' : '#slot-s1, #slot-s2, #slot-s3', zone: TOUCH ? '#tb-dg' : '#slot-dg', ultime: TOUCH ? '#tb-ult' : '#slot-ult' };

export class Tutoriel {
  constructor(scene, hud) {
    this.scene = scene; this.hud = hud; this.i = -1; this.g = scene.add.graphics().setDepth(4800);
    $('tutoSkip').onclick = () => this.fin();
    $('tuto').classList.remove('hidden');
    this.suivante();
  }
  get etape() { return ETAPES[this.i]; }
  moi() { const sc = this.scene; return { p: sc.room.state.players.get(sc.room.sessionId), d: sc.disp.get(sc.room.sessionId) }; }

  suivante() {
    this.i++;
    document.querySelectorAll('.tutoFocus').forEach((e) => e.classList.remove('tutoFocus'));
    if (this.i >= ETAPES.length) return this.fin();
    const E = this.etape, el = $('tuto');
    el.querySelector('.tt').innerHTML = `<small>${this.i + 1} / ${ETAPES.length} · ${E.titre}</small>${E.txt}`;
    el.querySelector('.td').textContent = ETAPES.map((_, k) => (k < this.i ? '●' : k === this.i ? '◉' : '○')).join(' ');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    if (FOCUS[E.id]) document.querySelectorAll(FOCUS[E.id]).forEach((e) => e.classList.add('tutoFocus'));
    if (this.i > 0) this.hud.sfxOk?.();
    this.t = 0; this.debut = performance.now(); this.cible = null; this.zone = null;
    clearTimeout(this.minuteur);
    if (E.id === 'ultime') this.minuteur = setTimeout(() => this.etape?.id === 'ultime' && this.suivante(), 12000);
    if (E.id === 'fin') this.minuteur = setTimeout(() => this.fin(), 5000);
  }
  // Appelé par le jeu quand le joueur fait une action
  evenement(ev) {
    const E = this.etape; if (!E) return;
    if (ev === 'move') return;                               // le déplacement se valide en atteignant le cercle
    if (ev === 'esquive' && E.id === 'zone') { this.roule = true; return; }
    if (ev === E.id || (E.id === 'sort' && /^sort[123]$/.test(ev))) this.suivante();
  }

  // Appelé à chaque image
  maj(dt) {
    const E = this.etape, g = this.g.clear(), { p, d } = this.moi();
    if (!E || !p || !d) return;
    this.t += dt;
    const now = this.scene.time.now;
    if (E.id === 'move') {
      if (!this.cible) {
        // un endroit libre (pas dans un bâtiment ni hors de l'arène), à quelques pas
        for (let k = 0; k < 24 && !this.cible; k++) {
          const a = Math.random() * Math.PI * 2, L = 200 + Math.random() * 80, x = d.x + Math.cos(a) * L, y = d.y + Math.sin(a) * L * 0.7;
          const libre = x > 80 && y > 80 && x < ARENA.width - 80 && y < ARENA.height - 80 && !insideBuilding(x, y, 70, this.scene.blds)
            && [0.25, 0.5, 0.75].every((f) => !insideBuilding(d.x + (x - d.x) * f, d.y + (y - d.y) * f, 30, this.scene.blds));
          if (libre && (!this.scene.colisee || Math.hypot(x - d.x, y - d.y) < 300)) this.cible = { x, y };
        }
        this.cible ||= { x: d.x + 120, y: d.y };
      }
      const c = this.cible, pul = 1 + Math.sin(now / 180) * 0.08;
      g.fillStyle(0x7fe0c2, 0.18).fillCircle(c.x, c.y, 55 * pul).lineStyle(4, 0x7fe0c2, 0.9).strokeCircle(c.x, c.y, 55 * pul);
      this.fleche(g, d, c, 0x7fe0c2);
      if (Math.hypot(d.x - c.x, d.y - c.y) < 60) this.suivante();
      else if (performance.now() - this.debut > 25000) this.suivante();   // ne bloque jamais
    } else if (E.id === 'basique' || E.id === 'sort') {
      // flèche vers l'ennemi le plus proche
      let best = null, bd = 1400;
      this.scene.room.state.players.forEach((o, id) => { if (id === this.scene.room.sessionId || !o.alive) return; const dd = Math.hypot(o.x - d.x, o.y - d.y); if (dd < bd) { bd = dd; best = o; } });
      this.scene.room.state.zombies?.forEach((z) => { if (!z.alive) return; const dd = Math.hypot(z.x - d.x, z.y - d.y); if (dd < bd) { bd = dd; best = z; } });
      if (best && bd > 160) this.fleche(g, d, best, 0xff8a6a);
      if (performance.now() - this.debut > 30000) this.suivante();
    } else if (E.id === 'zone') {
      // zone rouge d'entraînement sous le joueur : il doit en sortir avant l'impact
      if (!this.zone) this.zone = { x: d.x, y: d.y, r: 120, t: 1.6, essais: (this.essais || 0) + 1 };
      const z = this.zone; z.t -= dt;
      const k = 1 - Math.max(0, z.t) / 1.6;
      g.fillStyle(0xff3a3a, 0.15 + k * 0.1).fillCircle(z.x, z.y, z.r).fillStyle(0xff3a3a, 0.25).fillCircle(z.x, z.y, z.r * k);
      g.lineStyle(4, 0xff3a3a, 0.7 + Math.sin(now / 60) * 0.3).strokeCircle(z.x, z.y, z.r);
      if (z.t <= 0) {
        const dehors = Math.hypot(d.x - z.x, d.y - z.y) > z.r || p.dodge > 0 || this.roule;
        this.scene.cameras.main.shake(120, dehors ? 0.002 : 0.006);
        this.scene.floatText?.(z.x, z.y - 40, dehors ? 'Esquivé !' : 'Touché… recommence', dehors ? '#7fe0c2' : '#ff8a6a', 22, true);
        this.essais = z.essais; this.zone = null; this.roule = false;
        if (dehors || this.essais >= 3) this.suivante();
      }
    }
  }
  fleche(g, de, vers, col) {
    const a = Math.atan2(vers.y - de.y, vers.x - de.x), r = 70, x = de.x + Math.cos(a) * r, y = de.y - 30 + Math.sin(a) * r;
    g.fillStyle(col, 0.9).fillTriangle(x + Math.cos(a) * 18, y + Math.sin(a) * 18, x + Math.cos(a + 2.4) * 12, y + Math.sin(a + 2.4) * 12, x + Math.cos(a - 2.4) * 12, y + Math.sin(a - 2.4) * 12);
  }
  fin() {
    clearTimeout(this.minuteur); this.g.destroy();
    document.querySelectorAll('.tutoFocus').forEach((e) => e.classList.remove('tutoFocus'));
    $('tuto').classList.add('hidden'); localStorage.setItem('tutoFait', '1');
    this.scene.tuto = null;
  }
}
