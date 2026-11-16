import { sfx } from './sfx.js';
import { couleurDe, cadreDe, EMOTES } from '../../shared/cosmetiques.js';
// couleur de nom (cosmétique) pour les listes HTML ; « prismatique » = dégradé
const nomCss = (p) => { const c = p.coul && couleurDe(p.coul).css; return !c ? '#e8ecf4' : c === 'prisme' ? '#ff9ad5' : c; };
import { iconesBoutons } from './touch.js';
import { TOUCH } from './touch.js';
import { spellHtml, kitHtml } from '../../shared/describe.js';
import { ELEMENTS, FUSIONS, BIOMES, TAGS, CITY, ESQUIVE, UPGRADES, RELIQUES, ZOMBIES, TOURNOI, NOMS_TOURS, portraitUrl, tokenUrl, hasStatus as S } from '../../shared/data.js';

// Icône de chaque type de sort
const ICONES = { projectile: '☄', melee: '⚔', charge: '➹', saut: '⤊', tourbillon: '🌀', rayon: '⚡', frappe: '🗡', piege: '✴', eventail: '✦',
  impact: '💥', dash: '💨', soin: '✚', bouclier: '🛡', blink: '👁', hate: '⚡', armure: '🪨', pluie: '☔', tornade: '🌪', nova: '✺', zone: '◎' };

const $ = (id) => document.getElementById(id);
const EL_KEYS = Object.keys(ELEMENTS);

export class Hud {
  constructor() {
    this.cdEnd = { sort1: 0, sort2: 0, sort3: 0 };   // recharges suivies localement (message 'cd' du serveur)
    this.slotsBuilt = null;
    this.bannerTimer = null;
  }

  show() { $('hud').classList.remove('hidden'); }
  setCooldown({ slot, t }) { this.cdEnd[slot] = performance.now() + t * 1000; }

  // ---------------- Animation de tirage ----------------
  showRoll({ a, b, fusion }) {
    this.cdEnd = { sort1: 0, sort2: 0, sort3: 0 };
    const roll = $('roll'), sA = $('slotA'), sB = $('slotB'), fr = $('fusionReveal'), ur = $('ultReveal');
    const F = FUSIONS[fusion];
    roll.classList.remove('hidden');
    fr.classList.remove('show'); ur.classList.remove('show');
    [sA, sB].forEach((s) => { s.classList.remove('locked'); s.style.boxShadow = ''; });

    let lockA = false, lockB = false;
    const paint = (slot, key) => {
      const E = ELEMENTS[key];
      slot.textContent = E.nom.toUpperCase();
      slot.style.color = E.css;
      slot.style.borderColor = E.css;
    };
    const spin = setInterval(() => {
      if (!lockB) sfx.tick();
      if (!lockA) paint(sA, EL_KEYS[Math.floor(Math.random() * EL_KEYS.length)]);
      if (!lockB) paint(sB, EL_KEYS[Math.floor(Math.random() * EL_KEYS.length)]);
    }, 70);

    const lock = (slot, key) => {
      paint(slot, key);
      slot.classList.add('locked');
      slot.style.boxShadow = `0 0 30px ${ELEMENTS[key].css}`;
    };
    setTimeout(() => { lockA = true; lock(sA, a); }, 1000);
    setTimeout(() => { lockB = true; lock(sB, b); clearInterval(spin); }, 1600);
    const img = $('rollPortrait');
    img.classList.remove('show');
    img.onerror = () => { img.style.display = 'none'; };
    img.onload = () => { img.style.display = ''; };
    img.src = portraitUrl(fusion);
    setTimeout(() => {
      img.classList.add('show');
      img.style.filter = `drop-shadow(0 0 30px ${F.css})`;
      sfx.reveal(F.pure);
      fr.innerHTML = (F.pure ? '<span class="pure">✦ FORME PURE ✦</span>' : '') + F.nom.toUpperCase();
      fr.style.color = F.css;
      fr.style.textShadow = `0 0 30px ${F.css}`;
      fr.classList.add('show');
      ur.textContent = `Ultime : ${F.ultime.nom}`;
      ur.classList.add('show');
    }, 2000);
    setTimeout(() => roll.classList.add('hidden'), 3600);
  }

  // ---------------- Fil des éliminations ----------------
  addKill({ killer, victim, kel, kel2, zombie, kid, vid, kf, vf }, myId) {
    if (myId && vid === myId) { this.streak = 0; this.comboN = 0; }
    if (myId && kid === myId) {
      const now = performance.now();
      this.streak = (now - (this.lastKill || 0) < 10000 ? (this.streak || 0) : 0) + 1;
      this.lastKill = now;
      const NOMS = { 2: ['DOUBLE ÉLIMINATION', '#ffb02e'], 3: ['TRIPLE ÉLIMINATION', '#ff6a2e'], 4: ['CARNAGE', '#ff2e5a'], 5: ['INARRÊTABLE', '#c02eff'] };
      const [txt, c] = NOMS[Math.min(5, this.streak)] || ['ÉLIMINATION', '#ffe066'];
      const st = $('streak'); st.textContent = txt; st.style.setProperty('--c', c);
      st.classList.remove('show'); void st.offsetWidth; st.classList.add('show');
      if (this.streak >= 2) sfx.reveal?.();
    }
    const d = document.createElement('div');
    if (killer) {
      const c1 = ELEMENTS[kel]?.css || '#fff', c2 = ELEMENTS[kel2]?.css || '#fff';
      const tok = (f) => (f ? `<img src="${tokenUrl(f)}" onerror="this.remove()">` : '');
      d.style.setProperty('--kc', c1);
      d.innerHTML = `${tok(kf)}<b style="color:${c1}">${esc(killer)}</b> <span style="color:${c2}">⚔</span> ${esc(victim)}${tok(vf)}`;
      if (kid && kid === myId) d.style.background = 'rgba(80,60,10,.85)';
      if (vid && vid === myId) d.style.background = 'rgba(80,16,16,.85)';
    } else { d.style.setProperty('--kc', '#8fd14f'); d.textContent = zombie ? `🧟 ${victim} s'est fait dévorer` : `☠ ${victim}`; }
    $('killfeed').prepend(d);
    while ($('killfeed').children.length > 6) $('killfeed').lastChild.remove();
    setTimeout(() => d.remove(), 5000);
  }

  // Cinématique d'ultime : portrait qui traverse l'écran sur des lignes de vitesse
  cutin({ who, nom, f }) {
    const F = FUSIONS[f]; if (!F) return;
    const c = $('cutin');
    c.style.setProperty('--c', F.css);
    $('cutImg').src = portraitUrl(f);
    $('cutWho').textContent = who.toUpperCase();
    $('cutName').textContent = nom.toUpperCase();
    c.classList.remove('hidden');
    // relance les animations CSS
    c.querySelectorAll('.cut-band, .cut-lines, .cut-band img').forEach((el) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
    clearTimeout(this._cut); this._cut = setTimeout(() => c.classList.add('hidden'), 1000);
  }

  victory({ name, fusion, tournoi, duo, eq }, isMe) {
    const v = $('victory'), F = FUSIONS[fusion];
    if (duo) {   // Duo : victoire de l'équipe
      const me = this.monEq?.(); isMe = me === eq;
      v.querySelector('.v-title').textContent = isMe ? '🤝 VICTOIRE EN DUO !' : `🔴 ${String(name || '').toUpperCase()} GAGNENT`;
      v.querySelector('.v-sub').textContent = 'Nouveau match dans quelques secondes';
      $('vImg').style.display = 'none'; v.classList.remove('hidden');
      if (isMe) sfx.victory(); else sfx.defaite?.();
      clearTimeout(this._vic); this._vic = setTimeout(() => v.classList.add('hidden'), 6500);
      return;
    }
    v.querySelector('.v-title').textContent = isMe ? (tournoi ? '🏆 CHAMPION DU TOURNOI !' : '🏆 VICTOIRE !') : name ? `🏆 ${name.toUpperCase()} ${tournoi ? 'REMPORTE LE TOURNOI' : 'GAGNE'}` : 'PAS DE SURVIVANT';
    v.querySelector('.v-sub').textContent = F ? `${F.nom} — nouvelle manche dans quelques secondes` : 'Nouvelle manche dans quelques secondes';
    const img = $('vImg'); img.style.display = F ? '' : 'none'; if (F) img.src = portraitUrl(fusion);
    v.classList.remove('hidden');
    if (isMe) sfx.victory();
    clearTimeout(this._vic); this._vic = setTimeout(() => v.classList.add('hidden'), 6500);
  }

  // ---------------- Survie : fin de partie ----------------
  survieFin({ vague, kills, temps }, record, nouveau) {
    let el = document.getElementById('survieFin');
    if (!el) { el = document.createElement('div'); el.id = 'survieFin'; document.getElementById('hud').appendChild(el); }
    el.innerHTML = `<div class="t">☠ TOMBÉ À LA VAGUE ${vague}</div><div class="s">${kills} monstres vaincus · ${Math.floor(temps / 60)} min ${String(temps % 60).padStart(2, '0')} s</div>
      <div class="r">${nouveau ? '🏆 NOUVEAU RECORD !' : `Record : vague ${record}`}</div><div class="s" style="font-size:14px;opacity:.7">Nouvelle partie dans quelques secondes…</div>`;
    el.classList.remove('hidden'); sfx.death?.();
    clearTimeout(this._sf); this._sf = setTimeout(() => el.classList.add('hidden'), 11000);
  }

  // ---------------- Mode classé : résultat du tournoi ----------------
  coteResult({ avant, cote, delta, place }, rangAvant, rangApres, badgeHtml) {
    let el = document.getElementById('coteRes');
    if (!el) { el = document.createElement('div'); el.id = 'coteRes'; document.getElementById('hud').appendChild(el); }
    const PL = { 1: '🏆 VAINQUEUR', 2: '🥈 FINALISTE', 3: 'DEMI-FINALE', 5: 'QUARTS DE FINALE' };
    const change = rangApres.label !== rangAvant.label ? (rangApres.min > rangAvant.min || (rangApres.min === rangAvant.min && delta > 0) ? `⬆ PROMOTION : ${rangApres.label} !` : `⬇ ${rangApres.label}`) : '';
    el.style.setProperty('--rc', rangApres.css);
    el.innerHTML = `<div class="t">TOURNOI CLASSÉ · ${PL[place] || ''}</div><div class="d ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</div>
      <div>${badgeHtml} <b style="color:#fff">${cote}</b> <small style="color:#9aa3b5">(${avant} avant)</small></div>${change ? `<div class="u">${change}</div>` : ''}`;
    el.classList.remove('hidden');
    if (change && delta > 0) sfx.victory?.();
    clearTimeout(this._cote); this._cote = setTimeout(() => el.classList.add('hidden'), 7000);
  }

  // ---------------- Niveaux : 3 cartes au choix ----------------
  levelUp({ n, choix, relique }) {
    (this.upQueue ||= []).push({ n, choix, relique });
    if (this.upQueue.length === 1) this.showUpgrade();
    sfx.reveal?.(true);
  }
  showUpgrade() {
    const box = $('upgrades'), q = this.upQueue?.[0];
    if (!q) { box.classList.add('hidden'); return; }
    box.querySelector('.up-title').textContent = q.relique ? '👑 BOSS VAINCU — CHOISIS UNE RELIQUE' : `NIVEAU ${q.n} — CHOISIS UN BONUS`;
    box.classList.toggle('relique', !!q.relique);
    box.querySelector('.up-cards').innerHTML = q.choix.map((k, i) => { const U = UPGRADES[k] || RELIQUES[k];
      return `<div class="up-card" data-i="${i}"><div class="ic">${U.icon}</div><div class="nm">${U.nom}</div><div class="ds">${U.desc}</div><span class="k">${i + 1}</span></div>`; }).join('');
    box.querySelectorAll('.up-card').forEach((c) => c.addEventListener('click', () => this.pickUpgrade(+c.dataset.i)));
    box.classList.remove('hidden');
  }
  pickUpgrade(i) {
    if (!this.upQueue?.length) return false;
    const q = this.upQueue.shift();
    this.onPick?.(i);
    const U = UPGRADES[q.choix[i]] || RELIQUES[q.choix[i]];
    this.banner(`${U.icon} ${U.nom}`, q.relique ? '#ff9a3a' : '#ffcf3a');
    this.showUpgrade();
    return true;
  }
  clearUpgrades() { this.upQueue = []; this.showUpgrade(); }

  royale(state, me, players, myId) {
    const el = $('royale');
    if (state.mode === 'tournoi') return this.tournoi(state, me, players, myId);
    if (state.mode === 'duo') return this.duo(state, me, players, myId);
    if (state.mode === 'survie') {
      el.classList.remove('hidden');
      const rec = +(localStorage.getItem('survie_record') || 0);
      let txt = '', danger = false;
      if (state.phase === 'pause') txt = state.round === 0 ? `☠ Survie — la première vague arrive dans ${Math.ceil(state.timer)} s · record : vague ${rec}` : `✅ Vague ${state.round} repoussée ! Vague ${state.round + 1} dans ${Math.ceil(state.timer)} s`;
      else if (state.phase === 'jeu') { txt = `☠ VAGUE ${state.round} — ${state.alive} monstre${state.alive > 1 ? 's' : ''} restant${state.alive > 1 ? 's' : ''}${me && !me.alive ? ' · 💀 spectateur' : ''} · record ${rec}`; danger = state.round % 5 === 0; }
      else txt = `☠ Partie terminée — vague ${state.round}`;
      el.textContent = txt; el.classList.toggle('danger', danger); return;
    }
    if (state.mode !== 'royale') { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    let txt = '', danger = false;
    if (state.phase === 'attente') { let h = 0; players.forEach((p) => { if (!p.bot) h++; });
      txt = `⏳ File d'attente Battle royale — ${h} / 50 joueurs · lancement dans ${Math.ceil(state.timer)} s (complété par des bots)`; }
    else if (state.phase === 'jeu') {
      const out = me && me.alive && Math.hypot(me.x - state.zoneX, me.y - state.zoneY) > state.zoneR;
      danger = out;
      txt = me && !me.alive ? `💀 Éliminé — spectateur · ${state.alive} survivants` : `👑 ${state.alive} survivants${out ? ' · ⚠ HORS DE LA ZONE !' : ''}`;
    } else txt = '🏆 Fin de manche';
    el.textContent = txt; el.classList.toggle('danger', danger);
  }

  // Compteur de coups enchaînés (se remet à zéro après 2,2 s sans toucher)
  combo(v) {
    const now = performance.now();
    if (now - (this.lastHit || 0) > 2200) { this.comboN = 0; this.comboDmg = 0; }
    this.lastHit = now; this.comboN = (this.comboN || 0) + 1; this.comboDmg = (this.comboDmg || 0) + v;
    this.onCombo?.(this.comboN);
    if (this.comboN < 3) return;
    const el = $('combo');
    const c = this.comboN >= 20 ? '#ff2e5a' : this.comboN >= 10 ? '#c02eff' : this.comboN >= 6 ? '#ff6a2e' : '#ffb02e';
    el.style.setProperty('--c', c);
    el.querySelector('b').textContent = `${this.comboN}`;
    el.querySelector('i').textContent = `${this.comboDmg} dégâts`;
    el.classList.remove('hidden', 'fade', 'pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(this._combo); this._combo = setTimeout(() => el.classList.add('fade'), 2000);
  }

  // Notification (défi réussi, nouveau titre…)
  toast(text, color = '#7fe0c2') {
    const d = document.createElement('div');
    d.textContent = text; d.style.setProperty('--tc', color);
    $('toasts').prepend(d);
    setTimeout(() => d.remove(), 6000);
    sfx.reveal?.();
  }

  // Événement de carte en cours : pastille + ambiance d'écran
  event(st) {
    const ev = st.event || '';
    if (ev !== this._ev) {
      this._ev = ev;
      $('evfx').className = ev;
      if (ev === 'tempete') $('evfx').style.setProperty('--evc', `${ELEMENTS[st.eventEl]?.css || '#fff'}88`);
      $('evpill').classList.toggle('hidden', !ev);
    }
    if (ev) {
      const N = { meteores: '☄ PLUIE DE MÉTÉORES', orbe: '💎 ORBE LÉGENDAIRE — cherche la colonne dorée', eclipse: '🌑 ÉCLIPSE — Ombre +30 %', tempete: `🌪 TEMPÊTE ${(ELEMENTS[st.eventEl]?.nom || '').toUpperCase()} — +30 %`, ruee: '✨ RUÉE AUX ORBES — orbes x2' };
      const t = `${N[ev] || ev} · ${st.eventT} s`;
      if (t !== this._evT) { $('evpill').textContent = t; this._evT = t; }
    }
  }

  lowHp(on) { if (on !== this._low) { this._low = on; $('lowhp').classList.toggle('on', on); } }

  duo(state, me, players, myId) {
    const el = $('royale'); el.classList.remove('hidden');
    const t = `${Math.floor(state.timer / 60)}:${String(Math.floor(state.timer % 60)).padStart(2, '0')}`;
    const nous = me?.eq === 2 ? state.sB : state.sA, eux = me?.eq === 2 ? state.sA : state.sB;
    let allie = null; players.forEach((p, id) => { if (id !== myId && me && p.eq === me.eq) allie = p; });
    const al = allie ? ` · coéquipier : ${esc(allie.name)} ${allie.alive ? `${Math.ceil((allie.hp / allie.maxHp) * 100)} %` : '💀'}` : '';
    let txt = '', danger = false;
    if (state.phase === 'attente') { let h = 0; players.forEach((p) => { if (!p.bot) h++; });
      txt = `⏳ File d'attente Duo — ${h} / 4 joueurs · lancement dans ${Math.ceil(state.timer)} s (complété par des bots)`; }
    else if (state.phase === 'jeu') { txt = `🤝 MANCHE ${state.round} — 🔵 ${nous} : ${eux} 🔴 · ${t}${al}`; danger = state.timer < 10; }
    else if (state.phase === 'entracte') txt = `🤝 Manche suivante dans ${Math.ceil(state.timer)} s — 🔵 ${nous} : ${eux} 🔴 (3 manches pour gagner)`;
    else txt = `🏆 ${nous > eux ? 'VICTOIRE' : 'DÉFAITE'} — ${nous} : ${eux} · vainqueurs : ${esc(state.winner || '?')}`;
    if (txt !== this._duoT) { el.innerHTML = txt; this._duoT = txt; }
    el.classList.toggle('danger', danger);
  }

  tournoi(state, me, players, myId) {
    const el = $('royale');
    el.classList.remove('hidden');
    let txt = '', danger = false;
    const t = `${Math.floor(state.timer / 60)}:${String(Math.floor(state.timer % 60)).padStart(2, '0')}`;
    if (state.phase === 'attente') { let h = 0; players.forEach((p) => { if (!p.bot) h++; });
      txt = `⏳ File d'attente Tournoi — ${h} / 8 joueurs · lancement dans ${Math.ceil(state.timer)} s (complété par des bots)`; }
    else if (state.phase === 'jeu') {
      let opp = null; if (me && me.duel !== 255) players.forEach((p, id) => { if (id !== myId && p.duel === me.duel) opp = p; });
      const nbDuels = Math.max(1, Math.ceil(state.alive / 2));
      const tour = NOMS_TOURS[nbDuels] || `TOUR ${state.round}`;
      if (opp) { txt = `🏆 ${tour} — ⚔ contre ${esc(opp.name)} · ${t}`; danger = state.timer < 10; }
      else if (me?.alive) txt = `🏆 ${tour} — ✅ qualifié ! Les autres duels continuent… · ${t}`;
      else txt = `💀 Éliminé — spectateur · ${tour} · ${t}`;
    } else if (state.phase === 'entracte') txt = `🏆 Tour suivant dans ${Math.ceil(state.timer)} s${me?.alive ? ' — tu es qualifié !' : ''}`;
    else txt = `🏆 Tournoi terminé — vainqueur : ${esc(state.winner || '?')}`;
    el.innerHTML = txt; el.classList.toggle('danger', danger);
  }

  hurt() { const h = $('hurt'); h.classList.add('on'); clearTimeout(this._hurt); this._hurt = setTimeout(() => h.classList.remove('on'), 60); }

  banner(text, css) {
    const b = $('banner');
    b.textContent = text; b.style.color = css; b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 1800);
  }

  // ---------------- Mise à jour par frame ----------------
  update(me, kit, players, myId, hordeIn, mode) {
    const h = $('horde');
    if (h) h.style.display = mode === 'tournoi' || mode === 'survie' || mode === 'duo' ? 'none' : '';
    if (h && mode !== 'tournoi' && mode !== 'survie' && mode !== 'duo') { h.textContent = hordeIn <= 10 ? `🧟 HORDE DANS ${Math.ceil(hordeIn)} s` : `Prochaine horde : ${Math.floor(hordeIn / 60)}:${String(Math.floor(hordeIn % 60)).padStart(2, '0')}`; h.classList.toggle('urgent', hordeIn <= 10); }
    if (!me || !kit) return;
    const F = FUSIONS[kit.fusion];

    if (this._cadre !== me.cadre) {   // cadre cosmétique autour de mon portrait
      this._cadre = me.cadre; const pi = $('hudPortrait');
      if (me.cadre) { const C = cadreDe(me.cadre); pi.style.setProperty('border', `3px solid ${C.bord}`, 'important'); pi.style.setProperty('box-shadow', `${C.double ? `0 0 0 3px #0b0d14, 0 0 0 6px ${C.bord},` : ''} 0 0 14px ${C.lueur || C.bord}`, 'important'); pi.classList.toggle('cadreAnim', !!C.anim); pi.style.setProperty('--lueur', C.lueur || C.bord); }
      else { pi.style.removeProperty('border'); pi.style.removeProperty('box-shadow'); pi.classList.remove('cadreAnim'); }
    }
    if (this._portrait !== kit.fusion) {
      this._portrait = kit.fusion;
      const pi = $('hudPortrait');
      pi.onerror = () => { pi.style.display = 'none'; };
      pi.onload = () => { pi.style.display = ''; };
      pi.src = portraitUrl(kit.fusion);
      document.documentElement.style.setProperty('--fc', F.css);
      $('fusionName').textContent = F.nom.toUpperCase();
      $('fusionName').style.color = F.css;
      const chip = (k) => `<span style="background:${ELEMENTS[k].css}">${ELEMENTS[k].nom.toUpperCase()}</span>`;
      $('elChips').innerHTML = kit.a === kit.b ? `${chip(kit.a)}<span style="background:#ffe066">PURE</span>` : chip(kit.a) + chip(kit.b);
      $('fusionDesc').textContent = `${kit.classeNom} · ${kit.arme}`;
    }
    // Lieu (texte mis à jour seulement s'il change)
    let lieu, lieuC;
    if (mode === 'survie') { lieu = '☠ La Brèche — tiens le plus longtemps possible'; lieuC = '#d08aff'; }
    else if (mode === 'duo') { lieu = '🤝 Colisée — Grande arène · Duo 2v2'; lieuC = '#6ab8ff'; }
    else if (mode === 'tournoi') {
      const NOMS = ['Arène du Levant', 'Arène du Couchant', 'Arène des Tempêtes', 'Arène des Braises'];
      const i = TOURNOI.pits.findIndex((a) => Math.hypot(me.x - a.x, me.y - a.y) < a.r + 10);
      lieu = `🏛 Colisée — ${i >= 0 ? NOMS[i] : 'Arène de la Grande Finale'}`; lieuC = '#d8b878';
    } else {
      const biome = BIOMES.find((bi) => me.x >= bi.x && me.x <= bi.x + bi.w && me.y >= bi.y && me.y <= bi.y + bi.h);
      const bonus = biome && (biome.element === kit.a || biome.element === kit.b);
      const inCity = me.x >= CITY.x && me.x <= CITY.x + CITY.w && me.y >= CITY.y && me.y <= CITY.y + CITY.h;
      lieu = biome ? `${biome.nom}${bonus ? ' — bonus élémentaire +15 %' : ''}` : (inCity ? `${CITY.nom} — attention aux zombies` : 'Terres sauvages');
      lieuC = bonus ? '#ffe066' : '#8a93a6';
    }
    if (lieu !== this._lieu) { $('biome').textContent = lieu; $('biome').style.color = lieuC; this._lieu = lieu; }
    // Tournoi : pur PvP, pas de niveaux
    document.body.classList.toggle('sansNiveau', mode === 'tournoi' || mode === 'duo');

    // PV + bouclier
    const hpPct = (me.hp / me.maxHp) * 100;
    $('hpfill').style.width = `${hpPct}%`;
    $('hplag').style.width = `${hpPct}%`;
    $('hpfill').className = hpPct < 30 ? 'low' : hpPct < 60 ? 'mid' : '';
    $('shieldfill').style.width = `${Math.min(100, (me.shield / me.maxHp) * 100)}%`;
    $('hptext').textContent = `${Math.ceil(me.hp)} / ${me.maxHp}${me.shield > 0 ? `  (+${Math.ceil(me.shield)})` : ''}`;

    // Statuts
    const st = [];
    if (S(me, 'burn')) st.push(['#ff5a1f', TAGS.brulure.nom]);
    if (S(me, 'wet')) st.push(['#2f8cff', TAGS.mouille.nom]);
    if (S(me, 'slow')) st.push(['#c08a45', TAGS.lourd.nom]);
    if (S(me, 'root')) st.push(['#8a6a3a', 'Immobilisé']);
    if (S(me, 'frost')) st.push(['#9be7ff', TAGS.gel.nom]);
    if (S(me, 'mark')) st.push(['#8a5cff', TAGS.marque.nom]);
    if (S(me, 'invis')) st.push(['#c0a8ff', 'Invisible']);
    if (S(me, 'armor')) st.push(['#b8c2cc', 'Peau d’acier']);
    if (S(me, 'haste')) st.push(['#ffe14a', 'Surcharge']);
    if (S(me, 'blind')) st.push(['#fff1b0', 'Aveuglé (-15 % dégâts)']);
    if (S(me, 'vine')) st.push(['#5fcf4a', 'Enlacé']);
    const stHtml = st.map(([c, n]) => `<span style="color:${c}">${n}</span>`).join('');
    if (stHtml !== this._st) { $('statuses').innerHTML = stHtml; this._st = stHtml; }

    // Emplacements de sorts
    const sig = kit.a + kit.b;
    if (this.slotsBuilt !== sig) this.buildSlots(kit);
    const now = performance.now();
    this.setCd('s1', Math.max(0, (this.cdEnd.sort1 - now) / 1000), kit.sort1.cd);
    this.setCd('s2', Math.max(0, (this.cdEnd.sort2 - now) / 1000), kit.sort2.cd);
    this.setCd('s3', Math.max(0, (this.cdEnd.sort3 - now) / 1000), kit.sort3.cd);
    this.setCd('dg', Math.max(0, ((this.cdEnd.esquive || 0) - now) / 1000), ESQUIVE.cd);
    $('lvl').textContent = `${me.lvl || 1}`;
    $('xpfill').style.width = `${me.xp || 0}%`;
    const ult = $('slot-ult');
    ult.style.setProperty('--u', me.ult / 100);
    ult.querySelector('.cdtxt').textContent = me.ult >= 100 ? '' : `${Math.floor(me.ult)}%`;
    ult.classList.toggle('ready', me.ult >= 100);
    const tu = $('tb-ult'); if (tu) { tu.classList.toggle('ready', me.ult >= 100); tu.querySelector('.cd').style.height = `${100 - me.ult}%`; }

    $('dead').classList.toggle('hidden', me.alive || mode !== 'melee');

    // Classement
    this._sbT = (this._sbT || 0) + 1;
    if (this._sbT % 15 === 0) {
      const rows = [];
      players.forEach((p, id) => rows.push({ p, id }));
      rows.sort((x, y) => y.p.kills - x.p.kills || x.p.deaths - y.p.deaths);
      const top = rows.slice(0, 8); const mine = rows.find((r) => r.id === myId);
      if (mine && !top.includes(mine)) top.push(mine);
      $('scoreboard').innerHTML = `<div class="hd"><span>CLASSEMENT</span><span>⚔ / ☠ · 🧟</span></div>` + top.map(({ p, id }) =>
        `<div class="row ${id === myId ? 'me' : ''}"><span><b class="rk">${rows.indexOf(rows.find((r) => r.id === id)) + 1}</b>` +
        `<i class="dots" style="background:${ELEMENTS[p.a]?.css}"></i><i class="dots" style="background:${ELEMENTS[p.b]?.css}"></i> ` +
        `<span style="color:${nomCss(p)}">${esc(p.name)}</span> <small style="color:#ffcf3a">${p.lvl > 1 ? 'Nv' + p.lvl : ''}</small></span><span>${p.kills} / ${p.deaths} · 🧟 ${p.zk}</span></div>`).join('');
    }
  }

  buildSlots(kit) {
    const F = FUSIONS[kit.fusion];
    const slot = (id, key, sp, el, extra = '') => {
      const c = ELEMENTS[el]?.css || F.css;
      const nom = sp.nom || sp, ic = sp.icon || ICONES[sp.forme] || '✦';
      return `<div class="spell ${extra}" id="slot-${id}" style="--ec:${c};--glow:${F.css}" title="${esc(nom)}">
        <div class="ic">${ic}</div><span class="key">${key}</span><div class="nm" style="color:${c}">${esc(nom)}</div>
        <div class="cd"></div><div class="cdtxt"></div></div>`;
    };
    this.kit = kit;
    $('spellslots').innerHTML =
      slot('b', 'CLIC', kit.basique, kit.a) +
      slot('s1', 'E', kit.sort1, kit.a) +
      slot('s2', 'SHIFT', kit.sort2, kit.b) +
      slot('s3', 'F', kit.sort3, kit.b) +
      slot('dg', 'ESPACE', { nom: 'Esquive', icon: '💨' }, kit.a, 'small') +
      `<div class="spell ult" id="slot-ult" style="--ec:${F.css};--glow:${F.css}" title="${esc(kit.ultime.nom)}">
        <div class="ic">★</div><span class="key">R</span><div class="nm" style="color:${F.css}">${esc(kit.ultime.nom)}</div>
        <div class="cd"></div><div class="cdtxt"></div></div>`;
    const ic = (sp) => sp.icon || ICONES[sp.forme] || '✦';
    iconesBoutons({ 'tb-b': ic(kit.basique), 'tb-s1': ic(kit.sort1), 'tb-s2': ic(kit.sort2), 'tb-s3': ic(kit.sort3), 'tb-ult': '★' });
    this.bindTips(kit, F);
    this.slotsBuilt = kit.a + kit.b;
  }

  setCd(id, remaining, total) {
    const h = `${total ? (remaining / total) * 100 : 0}%`;
    const tb = $(`tb-${id}`); if (tb) tb.querySelector('.cd').style.height = h;
    const s = $(`slot-${id}`);
    if (!s) return;
    s.querySelector('.cd').style.setProperty('--p', total ? Math.min(1, remaining / total) : 0);
    s.classList.toggle('oncd', remaining > 0);
    s.querySelector('.cdtxt').textContent = remaining > 0 ? (remaining >= 10 ? Math.ceil(remaining) : remaining.toFixed(1)) : '';
    // petit éclat quand le sort redevient disponible
    const was = (this._cdWas ||= {})[id] || 0;
    if (was > 0 && remaining <= 0) { s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
    this._cdWas[id] = remaining;
  }

  // ---------------- Explications des sorts ----------------
  bindTips(kit, F) {
    const map = { b: ['basique', 'CLIC'], s1: ['sort1', 'E'], s2: ['sort2', 'SHIFT'], s3: ['sort3', 'F'], ult: ['ultime', 'R'], dg: ['esquive', 'ESPACE'] };
    const tip = $('sptip');
    for (const [id, [slot, key]] of Object.entries(map)) {
      const el = $(`slot-${id}`); if (!el) continue;
      el.style.pointerEvents = 'auto';
      el.onmouseenter = () => {
        let html;
        if (slot === 'esquive') html = spellHtml({ nom: 'Esquive', forme: 'dash', cd: 2.5 }, key).replace('Bond rapide dans la direction visée.', 'Roulade rapide : tu es invincible pendant la roulade.');
        else {
          const sp = slot === 'ultime' ? { ...kit.ultime, cd: 0 } : kit[slot];
          const col = (slot === 'sort2' || slot === 'sort3' ? ELEMENTS[kit.b] : ELEMENTS[kit.a])?.css;
          html = spellHtml(sp, key, slot === 'ultime' ? '#ffcf3a' : col);
        }
        tip.innerHTML = html;
        const r = el.getBoundingClientRect();
        tip.style.left = `${Math.max(8, Math.min(innerWidth - 300, r.left + r.width / 2 - 145))}px`;
        tip.classList.remove('hidden');
        tip.style.top = `${r.top - tip.offsetHeight - 26}px`;
      };
      el.onmouseleave = () => tip.classList.add('hidden');
    }
    $('avatar').onclick = () => this.toggleSpellbook();
  }

  toggleSpellbook(force) {
    const sb = $('spellbook'), kit = this.kit;
    const open = force ?? sb.classList.contains('hidden');
    if (!open || !kit) { sb.classList.add('hidden'); return; }
    const F = FUSIONS[kit.fusion];
    sb.querySelector('.sb-h').innerHTML = `<img src="${portraitUrl(kit.fusion)}" onerror="this.remove()"><div><b style="color:${F.css}">${F.nom}</b><small>${ELEMENTS[kit.a].nom} + ${ELEMENTS[kit.b].nom} · ${kit.classeNom} · ${kit.arme}</small><br><small>${F.desc || ''}</small></div>`;
    sb.querySelector('.sb-list').innerHTML = kitHtml(kit);
    sb.classList.remove('hidden');
    sb.onclick = (e) => { if (e.target === sb) sb.classList.add('hidden'); };
  }

  // ---------------- Boss ----------------
  boss(z) {
    const b = $('bossbar');
    if (!z) { if (!this._bossHidden) { b.classList.add('hidden'); this._bossHidden = true; } return; }
    if (this._bossHidden !== false) { b.classList.remove('hidden'); this._bossHidden = false; }
    b.querySelector('.bf').style.width = `${(z.hp / z.maxHp) * 100}%`;
    const nm = b.querySelector('.bn'); if (nm && nm.dataset.k !== z.kind) { nm.dataset.k = z.kind; nm.textContent = `👹 ${(ZOMBIES[z.kind]?.nom || 'Boss').toUpperCase()}`; }
  }

  // ---------------- Salon privé ----------------
  // Roue d'emotes : touche T ou bouton 💬, puis choisir (clic, toucher, ou touches 4 à 9)
  roueEmotes(ouvrir) {
    let r = document.getElementById('roue');
    if (!r) {
      r = document.createElement('div'); r.id = 'roue'; r.className = 'hidden'; document.getElementById('hud').appendChild(r);
      r.addEventListener('pointerdown', (e) => { if (e.target === r) this.roueEmotes(false); });
      addEventListener('keydown', (e) => {
        if (r.classList.contains('hidden')) return;
        const k = '456789'.indexOf(e.key); if (k >= 0 && this._emotes?.[k]) { this.envoyerEmote(this._emotes[k].id); e.preventDefault(); }
        if (e.key === 'Escape') this.roueEmotes(false);
      });
    }
    const ouvre = ouvrir ?? r.classList.contains('hidden');
    if (!ouvre) { r.classList.add('hidden'); return; }
    const niv = this.nivCompte?.() || 1;
    this._emotes = EMOTES.filter((e) => niv >= e.niv);
    const n = this._emotes.length, R = n > 8 ? 150 : 125;
    r.innerHTML = `<div class="roue-c">💬<small>T pour fermer</small></div>` + this._emotes.map((e, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return `<button data-e="${e.id}" style="transform:translate(${Math.cos(a) * R}px,${Math.sin(a) * R}px)">${e.txt}${i < 6 ? `<small>${i + 4}</small>` : ''}</button>`;
    }).join('');
    r.querySelectorAll('button').forEach((b) => { b.onclick = () => this.envoyerEmote(b.dataset.e); });
    r.classList.remove('hidden');
  }
  envoyerEmote(id) { this.onEmote?.(id); this.roueEmotes(false); }

  salon(code) {
    const c = $('salonChip');
    const link = `${location.origin}${location.pathname}?salon=${code}`;
    c.textContent = `🔒 Salon ${code} · toucher pour copier le lien`;
    c.classList.remove('hidden');
    c.onclick = () => {
      (navigator.share ? navigator.share({ title: 'Arène Élémentaire', text: `Rejoins mon salon ${code} !`, url: link }) : navigator.clipboard.writeText(link))
        .then(() => this.banner('🔗 Lien copié — envoie-le à tes amis', '#7fe0c2')).catch(() => this.banner(`Code : ${code}`, '#7fe0c2'));
    };
  }

  // ---------------- Tutoriel (première partie seulement) ----------------
  startTuto() {
    if (localStorage.getItem('tutoFait')) return;
    const K = TOUCH
      ? ['Déplace-toi avec le joystick (pouce gauche)', 'Attaque avec le gros bouton ⚔ — la visée est automatique', 'Lance tes sorts : boutons E, ⇧ et F', 'Esquive avec 💨 : tu es invincible pendant la roulade', 'Inflige des dégâts pour remplir ★, puis lance ton ULTIME', 'Monte de niveau pour choisir des bonus. Bonne chance !']
      : ['Déplace-toi avec ZQSD (ou WASD / flèches)', 'Attaque avec le clic gauche (maintenu) — vise avec la souris', 'Lance tes sorts : E, Shift et F', 'Esquive avec Espace : tu es invincible pendant la roulade', 'Inflige des dégâts pour remplir ta jauge, puis R pour l’ULTIME', 'Monte de niveau pour choisir des bonus (1, 2, 3). Bonne chance !'];
    this.tuto = { step: 0, txt: K, need: ['move', 'basique', 'sort', 'esquive', 'ultime', null] };
    $('tutoSkip').onclick = () => this.endTuto();
    $('tuto').classList.remove('hidden');
    this.showTuto();
  }
  showTuto() {
    const t = this.tuto; if (!t) return;
    const el = $('tuto');
    el.querySelector('.tt').textContent = t.txt[t.step];
    el.querySelector('.td').textContent = t.txt.map((_, i) => (i < t.step ? '●' : i === t.step ? '◉' : '○')).join(' ');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(this._tutoT);
    // étape de l'ultime : on n'attend pas forcément que la jauge soit pleine
    if (t.need[t.step] === 'ultime') this._tutoT = setTimeout(() => this.nextTuto(), 9000);
    if (t.need[t.step] === null) this._tutoT = setTimeout(() => this.endTuto(), 5000);
  }
  tutoEvent(ev) {
    const t = this.tuto; if (!t) return;
    const need = t.need[t.step];
    if (ev === need || (need === 'sort' && /^sort[123]$/.test(ev))) this.nextTuto();
  }
  nextTuto() { if (!this.tuto) return; this.tuto.step++; sfx.tick?.(); this.showTuto(); }
  endTuto() { this.tuto = null; clearTimeout(this._tutoT); $('tuto').classList.add('hidden'); localStorage.setItem('tutoFait', '1'); }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
