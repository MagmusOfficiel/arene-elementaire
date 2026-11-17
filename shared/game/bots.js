// =====================================================================
//  BOTS : intelligence des joueurs contrôlés par l'ordinateur
//  Méthodes ajoutées à ArenaLogic (voir ArenaLogic.js).
// =====================================================================
import { ArenaState, Player, Zone, Orb, Zombie } from './schema.js';
import { valideCouleur, valideCadre, emoteDe } from '../cosmetiques.js';
import { deltaCote, niveauBots, coteValide } from '../classe.js';
import {
  ARENA, CONFIG, BIOMES, TAGS, INTERACTIONS, ELEMENTS,
  generateKit, rollElements,
  BUILDINGS, CITY, ZOMBIES, ZOMBIE_CONFIG, ROYALE, resolveCollisions, insideBuilding, STATUS_BITS,
  TOURNOI, tournoiPit, NOMS_TOURS, DUO, comboEquipe, FILE, SURVIE, ELITES, RELIQUES, COLISEE, carteDu, areneProche, ESQUIVE, EVENTS, TERRAINS, TERRAIN_TYPES, terrainAt, terrainSpeed, PROGRESSION, UPGRADES, newMods, applyUpgrade,
} from '../data.js';
import { STATUS_FIELD, TIMERS, speedMult, BOT_NAMES, botName, UPG_KEYS, pick3, BOT_DMG, clamp, dist, ANNONCE_ULT, porteeSort } from './commun.js';

export const bots = {
  // ------------------------------------------------------------------
  //  IA des bots : choix de cible, distance selon la classe, esquive,
  //  fuite à PV bas, sortie des zones dangereuses, tir anticipé
  // ------------------------------------------------------------------
  botThink(p, id, e, dt) {
    if (p.locked > 0) return;
    const ai = e.ai, st = this.state;
    const tournoi = this.mode === 'tournoi' || this.mode === 'duo';
    if (this.mode === 'tournoi' && p.duel === 255) { e.input = { u: false, d: false, l: false, r: false }; return; }

    // Cible : proche ET affaiblie de préférence
    let target = null, tid = null, best = Infinity, bestD = 0;
    let allie = null;
    if (this.mode === 'duo') for (const [aid, ap] of st.players) if (aid !== id && ap.eq === p.eq && ap.alive) { allie = this.ent.get(aid)?.ai; break; }
    const range = tournoi ? 2000 : 900;
    const px = p.x, py = p.y;
    for (const c of this.cibles || []) {   // copie des positions (voir photo())
      const oid = c.id;
      if (oid === id || !c.alive || c.locked > 0 || c.invis > 0) continue;
      const dx = c.x - px, dy = c.y - py;
      if (dx * dx + dy * dy > range * range) continue;
      if (tournoi && !this.canHarm(id, oid)) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      let score = d - (1 - c.hp / (c.maxHp || 1)) * 220 + (c.z ? 120 : 0);
      if (allie && allie.cible === oid) score -= 320;   // Duo : on concentre le feu avec son coéquipier (combos !)
      if (score < best) { best = score; target = c.t; tid = oid; bestD = d; }
    }
    ai.cible = tid;

    let mx = 0, my = 0, urgent = false;
    const hpPct = p.hp / p.maxHp;

    // 0) Sortir de la lave (sauf les champions de Feu)
    const lti = terrainAt(p.x, p.y, this.ters);
    if (lti >= 0 && this.ters[lti].type === 'lave' && p.a !== 'feu' && p.b !== 'feu') {
      const L = this.ters[lti], d = dist(p.x, p.y, L.x, L.y) || 1; mx = (p.x - L.x) / d; my = (p.y - L.y) / d; urgent = true;
    }
    // 1) Sortir d'une zone dangereuse ennemie (impact annoncé, météore, piège…)
    st.zones.forEach((z, zid) => {
      if (urgent) return;
      const zd = this.zoneData.get(zid);
      if (!zd || zd.owner === id || !['telegraph', 'meteore', 'invoc', 'domaine', 'zone', 'piege'].includes(z.kind)) return;
      const d = dist(p.x, p.y, z.x, z.y);
      if (d < z.r + 30) { mx = (p.x - z.x) / (d || 1); my = (p.y - z.y) / (d || 1); urgent = true; }
    });

    // 1 bis) Un ultime ennemi est annoncé : sortir de sa zone (cercle autour du lanceur ou ligne devant lui)
    if (!urgent && this.annonces > 0) for (const [oid, oe] of this.ent) {
      if (oid === id || !oe.annonce || (tournoi && !this.canHarm(oid, id))) continue;
      const o = st.players.get(oid); if (!o) continue;
      const U = oe.kit?.ultime; if (!U) continue;
      const rx = p.x - o.x, ry = p.y - o.y, d = Math.hypot(rx, ry) || 1;
      if (['nova', 'domaine'].includes(U.forme)) { if (d < (U.radius || 200) + 40) { mx = rx / d; my = ry / d; urgent = true; } }
      else {
        const a = Math.atan2(oe.annonce.ty - o.y, oe.annonce.tx - o.x), ux = Math.cos(a), uy = Math.sin(a);
        const along = rx * ux + ry * uy, perp = rx * uy - ry * ux;
        if (along > 0 && along < 1000 && Math.abs(perp) < (U.width || (U.radius || 80) * 2) / 2 + 40 && Math.random() < ai.skill + 0.2) { const sd = perp > 0 ? 1 : -1; mx = uy * sd; my = -ux * sd; urgent = true; }
      }
      if (urgent) break;
    }

    // 2) Esquiver un projectile qui arrive : roulade si disponible, sinon pas de côté
    if (ai.pasCote > 0) { ai.pasCote -= dt; mx = ai.pcx; my = ai.pcy; urgent = true; }
    else if ((ai.dodgeLook = (ai.dodgeLook || 0) - dt) <= 0) {
      ai.dodgeLook = ai.react;
      for (const pr of this.projs.values()) {
        if (pr.owner === id || (tournoi && !this.canHarm(pr.owner, id))) continue;
        const rx = p.x - pr.x, ry = p.y - pr.y, d = Math.hypot(rx, ry);
        if (d > 300) continue;
        const sp = Math.hypot(pr.vx, pr.vy) || 1, ux = pr.vx / sp, uy = pr.vy / sp;
        const along = rx * ux + ry * uy, perp = Math.abs(rx * uy - ry * ux);
        if (along > 0 && perp < pr.r + 30 && Math.random() < ai.skill) {
          const side = rx * uy - ry * ux > 0 ? 1 : -1;
          if (e.dodgeCd <= 0) {
            e.input = { r: -uy * side > 0.3, l: -uy * side < -0.3, d: ux * side > 0.3, u: ux * side < -0.3 };
            this.dodge(p, id, e, p.x - uy * side * 100, p.y + ux * side * 100);
            return;
          }
          ai.pasCote = 0.3; ai.pcx = -uy * side; ai.pcy = ux * side; mx = ai.pcx; my = ai.pcy; urgent = true;
          break;
        }
      }
    }

    // 3) Battle royale : rester dans la zone
    if (!urgent && this.mode === 'royale' && st.phase === 'jeu' && st.zoneR) {
      const dz = dist(p.x, p.y, st.zoneX, st.zoneY);
      if (dz > st.zoneR * 0.82) { mx = (st.zoneX - p.x) / dz; my = (st.zoneY - p.y) / dz; urgent = dz > st.zoneR * 0.95 || !target; }
    }

    // L'orbe légendaire attire les bots proches
    if (!urgent && st.event === 'orbe' && this.legendId) {
      const lo = st.orbs.get(this.legendId);
      const d = lo ? dist(p.x, p.y, lo.x, lo.y) : Infinity;
      if (d < 900 && (!target || bestD > 160)) { mx = (lo.x - p.x) / d; my = (lo.y - p.y) / d; urgent = true; }
    }
    if (target && !urgent) {
      const dx = (target.x - p.x) / bestD, dy = (target.y - p.y) / bestD;
      ai.strafeT -= dt;
      if (ai.strafeT <= 0) { ai.strafe *= -1; ai.strafeT = (0.9 - ai.skill * 0.5) + Math.random() * (1.6 - ai.skill * 0.8); }   // les bons bots changent de sens plus souvent (plus durs à viser)
      const melee = e.kit?.melee, K = e.kit;
      // distance de combat : au contact pour les corps à corps, aux 2/3 de la portée du tir pour les autres
      const portee = K?.basique?.range || 520;
      const near = melee ? 55 : Math.max(200, portee * 0.5), far = melee ? 80 : Math.max(300, portee * 0.75);
      const fleeing = hpPct < 0.3 && !(target instanceof Zombie) && !tournoi;
      const cc = target.root > 0 || target.frost > 0 || target.slow > 0 || target.vine > 0 || target.locked > 0;   // cible ralentie / immobilisée
      const S2 = K?.sort2, mobilite = S2 && ['dash', 'blink'].includes(S2.forme), defensif = S2 && ['armure', 'bouclier', 'hate', 'soin'].includes(S2.forme);
      if (fleeing) {
        // fuite : s'éloigne, en allant vers un orbe si possible
        mx = -dx; my = -dy;
        let ob = null, od = 600;
        st.orbs.forEach((o) => { const d = dist(p.x, p.y, o.x, o.y); if (d < od) { od = d; ob = o; } });
        if (ob) { mx = mx * 0.4 + ((ob.x - p.x) / od) * 0.6; my = my * 0.4 + ((ob.y - p.y) / od) * 0.6; }
        if (e.cds.sort2 <= 0) this.cast(id, 'sort2', p.x - dx * 300, p.y - dy * 300);
        else if (e.dodgeCd <= 0 && bestD < 160) this.dodge(p, id, e, p.x - dx * 200, p.y - dy * 200);
      } else if (mx === 0 && my === 0) {
        if (bestD > far) { mx = dx; my = dy; }
        else if (bestD < near) { mx = -dx * 0.7 - dy * ai.strafe * 0.7; my = -dy * 0.7 + dx * ai.strafe * 0.7; }
        else { mx = -dy * ai.strafe; my = dx * ai.strafe; }
      }
      // bloqué contre un mur pendant qu'il tourne autour : il change de sens
      ai.bloqueT = (ai.bloqueT || 0) + dt;
      if (ai.bloqueT > 0.5) { if (ai.bx != null && dist(p.x, p.y, ai.bx, ai.by) < 6 && (mx || my)) { ai.strafe *= -1; ai.strafeT = 1.2; } ai.bx = p.x; ai.by = p.y; ai.bloqueT = 0; }

      // Visée anticipée : on vise là où la cible sera
      // vitesse de la cible lissée sur quelques dixièmes de seconde (moins de fausses anticipations)
      if (ai.tLast && ai.tId === tid) { const k = Math.min(1, dt * 6); ai.tvx = (ai.tvx || 0) * (1 - k) + ((target.x - ai.tLast.x) / dt) * k; ai.tvy = (ai.tvy || 0) * (1 - k) + ((target.y - ai.tLast.y) / dt) * k; }
      else { ai.tvx = 0; ai.tvy = 0; }
      const tv = { vx: ai.tvx, vy: ai.tvy };
      ai.tLast = { x: target.x, y: target.y }; ai.tId = tid;
      const lead = melee ? 0 : Math.min(0.9, bestD / (K?.basique?.speed || 620)) * ai.skill;   // temps de vol réel du projectile
      const err = (1 - ai.skill) * 70;
      const aimX = target.x + tv.vx * lead + (Math.random() - 0.5) * err, aimY = target.y + tv.vy * lead + (Math.random() - 0.5) * err;

      ai.shoot -= dt;
      const reach = melee ? K.basique.range + 35 : portee;
      if (bestD < reach && ai.shoot <= 0) { this.cast(id, 'basique', aimX, aimY); ai.shoot = (melee ? 0.4 : 0.6) + Math.random() * 0.4; }
      // sorts offensifs : seulement à bonne portée, tout de suite si la cible est immobilisée
      const envie = (cc ? 4 : 1) * dt;
      for (const slot of ['sort1', 'sort3']) {
        const sp = K?.[slot]; if (!sp || e.cds[slot] > 0) continue;
        if (sp.forme === 'bouclier') { if (hpPct < 0.75 && Math.random() < envie * 1.5) this.cast(id, slot, p.x, p.y); continue; }
        const pr = porteeSort(sp);
        if (bestD < pr * 0.9 && Math.random() < envie * (slot === 'sort1' ? 0.9 : 0.8)) this.cast(id, slot, aimX, aimY);
      }
      // sort 2 : défense quand on prend des coups, mobilité pour engager (corps à corps) ou se replacer
      if (S2 && e.cds.sort2 <= 0 && !fleeing) {
        if (defensif && (hpPct < (S2.forme === 'soin' ? 0.55 : 0.7)) && Math.random() < dt * 1.5) this.cast(id, 'sort2', p.x, p.y);
        else if (defensif && S2.forme === 'hate' && bestD > far + 80 && Math.random() < dt) this.cast(id, 'sort2', p.x, p.y);
        else if (mobilite && melee && bestD > near + 90 && bestD < (S2.distance || 300) + 60 && hpPct > 0.4 && Math.random() < dt * 1.5 * ai.skill) this.cast(id, 'sort2', target.x, target.y);
        else if (mobilite && !melee && bestD < near * 0.6 && Math.random() < dt * 2 * ai.skill) this.cast(id, 'sort2', p.x - dx * 300 - dy * ai.strafe * 120, p.y - dy * 300 + dx * ai.strafe * 120);
      }
      // ultime : sur une cible affaiblie, immobilisée, ou quand plusieurs ennemis sont groupés
      if (p.ult >= 100) {
        const U = K?.ultime, pu = U ? porteeSort(U) : 340;
        let groupe = 0;
        for (const c of this.cibles || []) if (c.id !== id && c.alive && !c.z && dist(c.x, c.y, target.x, target.y) < 220 && (!tournoi || this.canHarm(id, c.id))) groupe++;
        const bonMoment = target.hp / (target.maxHp || 1) < 0.65 || cc || groupe >= 2 || target instanceof Zombie;
        if (bestD < pu * 0.85 && bonMoment && (!(target instanceof Zombie) || Math.random() < dt * 0.2)) this.cast(id, 'ultime', target.x, target.y);
      }
      // un corps à corps adverse trop collant : roulade sur le côté
      if (!melee && bestD < 90 && e.dodgeCd <= 0 && Math.random() < dt * 2 * ai.skill) this.dodge(p, id, e, p.x - dy * ai.strafe * 200, p.y + dx * ai.strafe * 200);
    } else if (!urgent) {
      const pit = tournoi && p.duel !== 255 ? tournoiPit(p.duel, this.duels?.length || 1) : null;
      if (pit) { const d = dist(p.x, p.y, pit.x, pit.y) || 1; mx = (pit.x - p.x) / d; my = (pit.y - p.y) / d; }
      else if (tournoi) {
        // échauffement dans le Colisée : on se balade dans son arène
        if (dist(p.x, p.y, ai.wx, ai.wy) < 40 || (ai.wT = (ai.wT || 0) - dt) <= 0) {
          const c = areneProche(p.x, p.y), a = Math.random() * Math.PI * 2, rr = Math.random() * c.r * 0.8;
          ai.wT = 4; ai.wx = c.x + Math.cos(a) * rr; ai.wy = c.y + Math.sin(a) * rr;
        }
        const d = dist(p.x, p.y, ai.wx, ai.wy) || 1; mx = (ai.wx - p.x) / d; my = (ai.wy - p.y) / d;
      } else {
        if (dist(p.x, p.y, ai.wx, ai.wy) < 40 || (!ai.wx && !ai.wy) || (ai.wT = (ai.wT || 0) - dt) <= 0) {
          ai.wT = 6;
          const zr = this.mode === 'royale' && st.zoneR ? st.zoneR * 0.6 : 0;
          if (zr) { const a = Math.random() * Math.PI * 2, r = Math.random() * zr; ai.wx = st.zoneX + Math.cos(a) * r; ai.wy = st.zoneY + Math.sin(a) * r; }
          else { ai.wx = 200 + Math.random() * (ARENA.width - 400); ai.wy = 200 + Math.random() * (ARENA.height - 400); }
        }
        const d = dist(p.x, p.y, ai.wx, ai.wy) || 1;
        mx = (ai.wx - p.x) / d; my = (ai.wy - p.y) / d;
      }
    }
    e.input = { r: mx > 0.3, l: mx < -0.3, d: my > 0.3, u: my < -0.3 };
  },

};
