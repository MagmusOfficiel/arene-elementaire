// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la scène de combat, ses animations et le boss mondial
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import * as RQ from '../../../shared/clans/reliques.js';
import * as F from '../../../shared/clans/familiers.js';
import { feuilleFamilier } from './familiersArt.js';
import { BRANCHES, CARTES, CLASSES, RARES, STATUTS } from '../../../shared/clans/cartes.js';
import { TERRITOIRES, PALIERS, MALEDICTIONS } from '../../../shared/clans/monstres.js';
import * as C from '../../../shared/clans/combat.js';
import * as P from '../../../shared/clans/profil.js';
import { BOSS_MONDIAUX, PALIER_MONDIAL } from '../../../shared/clans/mondial.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso } from './monde.js';
import { decor, ambiance, creerFx, PALETTES } from './scene.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, ILLUS, ILLUS_MONSTRES, carteChoisie, carteHTML, centre, combat, esc, nf, p, pause, room, setCarteChoisie, setCombat, statutsHTML, toast } from './ui-commun.js';
import { bilanExpedition, fenetreExpedition } from './ui-fenetres.js';
import { fermer, monde, ouvrir } from './ui-monde.js';
import { act } from './ui-reseau.js';

export let typeCombat = null, mondialEnCours = null, coups = [];
export function rejouerAnim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
export function nombre(el, txt, cls, dy = 0) {
  if (!el) return; const r = el.getBoundingClientRect(), d = document.createElement('div');
  d.className = `nombre ${cls}`; d.textContent = txt; d.style.left = `${r.left + r.width / 2}px`; d.style.top = `${r.top + r.height * 0.3 + dy}px`; d.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 60)}px`);
  document.body.append(d); setTimeout(() => d.remove(), 1150);
}
export function banniere(id, html, cls = '', duree = 1150) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; $(id).replaceChildren(d); if (duree) setTimeout(() => d.remove(), duree); return d; }
export function secouer(sc, fort) { const c = fort ? 'grosseSecousse' : 'secousse'; sc.classList.remove('secousse', 'grosseSecousse'); void sc.offsetWidth; sc.classList.add(c); setTimeout(() => sc.classList.remove(c), 520); }
export function flash(sc, couleur) { const f = document.createElement('div'); f.className = 'flash'; f.style.background = couleur; sc.append(f); setTimeout(() => f.remove(), 380); }
export function dessinerSprite(canvas, clan, classe, dir, app = '') { const g = canvas.getContext('2d'); g.clearRect(0, 0, 24, 26); g.drawImage(feuillePerso(clan, classe || 'combattant', app), 0, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 24, 26, 0, 0, 24, 26); }
export const PAL_AURA = { a_braises: 'feu', a_bulles: 'eau', a_lucioles: 'plante', a_or: 'or' };
export function lancerAuras(fx, liste) {
  const id = setInterval(() => {
    for (const [el, aura] of liste()) {
      if (!el || !aura || aura === 'a_aucune' || !el.isConnected) continue;
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      const x = r.left + r.width / 2, y = r.bottom - r.height * 0.15;
      if (aura === 'a_ombre') fx.eclats(x, y, ['#3a0a3a', '#5a1a5a', '#2a0828'], 3, { vitesse: 40, g: -60, taille: 7, vie: 1.2, frein: 1 });
      else if (aura === 'a_givre') fx.eclats(x + (Math.random() - 0.5) * r.width, y - Math.random() * r.height, ['#ffffff', '#bfeaff', '#8ad0ff'], 2, { vitesse: 20, g: 0, taille: 3, vie: 0.8 });
      else fx.monte(x, y - 10, PALETTES[PAL_AURA[aura]] || PALETTES.or, 2, r.width * 0.8);
    }
  }, 160);
  return () => clearInterval(id);
}
export let stopAuraCb = null, stopAuraDu = null;
export function regler(sc) {
  const ar = sc.querySelector('.arene')?.getBoundingClientRect(); if (!ar || !ar.height) return;
  const portrait = innerWidth / innerHeight < 0.8, h = ar.height;
  sc.style.setProperty('--z', Math.max(3, Math.min(8, Math.floor((portrait ? h * 0.3 : h * 0.6) / 26))));
  sc.style.setProperty('--e', `${Math.round(Math.max(60, Math.min(165, portrait ? Math.min(h * 0.3, (innerWidth - 40) / 3.3) : Math.min(h * 0.5, innerWidth * 0.12))))}px`);
}
addEventListener('resize', () => { for (const id of ['combat', 'duel']) if (!$(id).classList.contains('cache')) regler($(id)); });
// v87 : l'allié invoqué, à côté du héros
function majAllie(a) {
  const el = $('cbAllie'); el.classList.toggle('cache', !(a?.pv > 0));
  if (!(a?.pv > 0)) { delete el.querySelector('.jauge').dataset.pv; return; }
  const po = el.querySelector('.portrait'), illus = a.img && ILLUS.has(a.img);   // v87 : le portrait tiré de l'illustration de la carte
  po.classList.toggle('illus', !!illus); po.style.backgroundImage = illus ? `url(${import.meta.env.BASE_URL}clans/cartes/${a.img}.webp)` : ''; po.textContent = illus ? '' : a.ico; el.querySelector('.nomA').textContent = `${a.nom} · ⚔ ${a.deg}`;
  el.title = `${a.nom} : frappe pour ${a.deg} au début de chacun de tes tours et encaisse les coups à ta place.`;
  majJauge(el.querySelector('.jauge'), a.pv, a.pvMax, a.bloc);
}
export function majJauge(j, pv, pvMax, bloc) {
  if (!j) return;
  pv = Math.max(0, pv);
  const f = j.querySelector('.fantome'), i = j.querySelector('i:not(.fantome)'), w = `${(pv / pvMax) * 100}%`;
  i.style.width = w;
  if (pv >= +(j.dataset.pv ?? -1)) { f.style.transition = 'none'; f.style.width = w; void f.offsetWidth; f.style.transition = ''; } else f.style.width = w;
  j.dataset.pv = pv; j.querySelector('b').textContent = `${pv} / ${pvMax}`;
  if (bloc != null) {
    const s = j.querySelector('.bouclier'), t = bloc > 0 ? String(bloc) : '';
    if (s.textContent !== t) { s.textContent = t; s.classList.remove('vu'); if (bloc > 0) { void s.offsetWidth; s.classList.add('vu'); } }
    j.querySelector('.barre').classList.toggle('protege', bloc > 0);
  }
}
export async function voler(el, cible, element, fx, { duree = 380, petite = 0.35 } = {}) {
  if (!el || !cible) return;
  const r = el.getBoundingClientRect(), c = centre(cible), v = el.cloneNode(true);
  v.classList.add('carteVol'); Object.assign(v.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px`, transform: 'none' });
  document.body.append(v); el.style.visibility = 'hidden';
  const dx = c.x - (r.left + el.offsetWidth / 2), dy = c.y - (r.top + el.offsetHeight / 2);
  try {
    await v.animate([{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${dx * 0.2}px, ${dy * 0.2 - 70}px) rotate(-6deg) scale(1.18)`, offset: 0.35 }, { transform: `translate(${dx}px, ${dy}px) rotate(14deg) scale(${petite})`, opacity: 0.8 }], { duration: duree, easing: 'cubic-bezier(.5,0,.7,.2)' }).finished;
  } catch { /* animation interrompue */ }
  v.remove();
  if (fx) { const pal = PALETTES[element] || PALETTES.neutre; fx.eclair(c.x, c.y, pal[1], 120); fx.eclats(c.x, c.y, pal, 22, { vitesse: 230, g: 160 }); }
}
export async function defausserMain(mainEl, pile) {
  const cartes = [...mainEl.querySelectorAll('.carte')];
  cartes.forEach((k, i) => setTimeout(() => voler(k, pile, null, null, { duree: 260, petite: 0.25 }), i * 45));
  if (cartes.length) { await pauseCb(260 + cartes.length * 45); rejouerAnim(pile, 'recoit'); }
}
export function distribuer(mainEl, pile, delai = 0) {
  const pc = centre(pile);
  [...mainEl.querySelectorAll('.carte')].forEach((k, i) => {
    const r = k.getBoundingClientRect();
    k.style.setProperty('--dx', `${pc.x - (r.left + r.width / 2)}px`); k.style.setProperty('--dy', `${pc.y - (r.top + r.height / 2)}px`);
    k.style.animationDelay = `${delai + i * 75}ms`; k.classList.add('distribue');
    setTimeout(() => sfx.carte?.('neutre'), delai + i * 75);
  });
}
export let fxCb = null, ambCb = null, animCb = false;
export function lancerCombat(def, type) {
  setCombat(C.nouveauCombat(def)); setCarteChoisie(null); typeCombat = type; coups = []; animCb = false;
  $('fenetre').classList.add('cache');
  const sc = $('combat'); sc.className = 'scene'; $('cbBanniere').replaceChildren(); sc.querySelector('.rayons')?.remove();
  const terr = mondialEnCours?.terr || p.expedition?.territoire || p.clan;
  decor($('cbDecor'), terr);
  ambCb?.arreter(); ambCb = ambiance($('cbAmbiance'), terr);
  fxCb ||= creerFx($('cbFx'));
  $('cbTitre').textContent = { combat: 'Combat', elite: 'Combat d’élite', boss: 'Combat contre le boss', mondial: `☠ ${BOSS_MONDIAUX[terr]?.nom || 'Boss mondial'}`, ascension: '🌟 Épreuve d’ascension', tour: `🗼 Tour infinie · étage ${p.tour?.essai?.etage || ''}` }[type] || 'Combat';
  $('cbInfo').innerHTML = type === 'tour' ? (p.tour?.essai?.etage % 10 === 0 ? 'Étage du boss : abats-le, ses gardes avec' : 'Cinq monstres : les sorts de zone font merveille') : type === 'ascension' ? 'Bats la Chimère de l’ascension pour choisir ta branche' : type === 'mondial' ? `${TERRITOIRES[terr].nom} · tes dégâts s'ajoutent à ceux de tous les joueurs` : `${TERRITOIRES[terr].nom} · ${PALIERS[p.expedition.palier - 1].nom}${(p.expedition.mods || []).map((k) => ` <span class="malediction" title="${esc(MALEDICTIONS[k].desc)}">${MALEDICTIONS[k].ico} ${MALEDICTIONS[k].nom}</span>`).join('')}`;
  sc.classList.toggle('cauchemar', !!PALIERS[p.expedition?.palier - 1]?.cauchemar && type !== 'mondial');
  dessinerSprite($('cbSprite'), p.clan, p.classe, 'droite', AP.code(p));
  // le familier, à côté du héros (expéditions et boss mondial)
  { const cv = $('cbFam'), g = cv.getContext('2d'), fam = combat.familier; g.clearRect(0, 0, 12, 11); cv.classList.toggle('cache', !fam); if (fam) g.drawImage(feuilleFamilier(fam), 0, 0, 12, 11, 0, 0, 12, 11); cv.title = fam ? `${F.FAMILIERS[fam].nom} : ${F.FAMILIERS[fam].desc}` : ''; }
  stopAuraCb?.(); stopAuraCb = lancerAuras(fxCb, () => [[$('cbHeros').querySelector('.combattant'), AP.portee(p).aura]]);
  delete $('cbHeros').querySelector('.jauge').dataset.pv;
  regler(sc);
  dessinerCombat(true, true);
  regler(sc);
  rejouerAnim($('cbHeros'), 'entreeG');
  banniere('cbBanniere', `${type === 'boss' || type === 'mondial' ? '☠ ' : ''}${$('cbTitre').textContent}<small>${esc(combat.ennemis.map((e) => e.nom).join(' · '))}</small>`, type === 'boss' || type === 'mondial' ? 'rouge' : '', 1300);
  if (type === 'boss' || type === 'mondial') sfx.rugissement?.();
  setTimeout(() => import('./ui-coach.js').then((m) => m.tutoCombat()), 1900);   // v94 : le tutoriel, au tout premier combat
}
// ce que l'ennemi va faire, en toutes lettres (au survol de son intention) — v61
const TITRES_INTENTION = {
  attaque: (t) => { const [d, n] = t.split('×'); return `Au prochain tour, il t'attaque : ${d} dégâts${n ? `, ${n} fois` : ''}. Ton bouclier absorbe d'abord les dégâts.`; },
  defense: (t) => `Il va se protéger : ${t} de bouclier.`,
  buff: (t) => `Il se renforce : ${t} de force (ses attaques feront plus mal).`,
  groupe: (t) => `Il protège tout son groupe : ${t} de bouclier pour chaque monstre.`,
  soin: (t) => `Il soigne tout son groupe : ${t} PV pour chaque monstre blessé.`,
  epines: (t) => `Il se couvre d'épines : chaque attaque que tu lui portes te renvoie ${t} dégâts.`,
  malus: (t) => (t === '❓' ? 'Brouillard : ses intentions sont cachées.' : `Il va t'infliger un mauvais statut : ${t.replace('🔥', 'brûlure ').replace('💧', 'trempé ').replace('🥀', 'affaibli ')}.`),
};
// voir le contenu de la pioche (dans le désordre) ou de la défausse
function voirPile(quoi) {
  if (!combat) return;
  const l = quoi === 'pioche' ? combat.pioche : quoi === 'defausse' ? combat.defausse : combat.epuisees, n = {};
  for (const k of l) n[k.id] = (n[k.id] || 0) + 1;
  const ids = Object.keys(n).sort((a, b) => CARTES[a].cout - CARTES[b].cout || CARTES[a].nom.localeCompare(CARTES[b].nom));
  document.querySelector('#combat .voirPile')?.remove();
  const d = document.createElement('div'); d.className = 'voirPile';
  d.innerHTML = `<div class="boitePile"><b>${{ pioche: '🂠 Pioche', defausse: '♻ Défausse', epuisees: '🔥 Cartes épuisées' }[quoi]} — ${l.length} carte${l.length > 1 ? 's' : ''}</b><small>${quoi === 'pioche' ? 'Dans le désordre : l’ordre de pioche reste un secret.' : quoi === 'defausse' ? 'Quand la pioche est vide, la défausse est mélangée et redevient la pioche.' : 'Elles ne reviendront pas avant le prochain combat.'}</small>
    <div class="lignesPile">${ids.map((id) => `<span><i>${CARTES[id].cout}</i>${CARTES[id].ico} ${esc(CARTES[id].nom)}<em>×${n[id]}</em></span>`).join('') || '<span>Vide</span>'}</div><button class="bouton">Fermer</button></div>`;
  d.onclick = (e) => { if (e.target === d || e.target.tagName === 'BUTTON') d.remove(); };
  $('combat').append(d);
}
$('cbPioche').onclick = () => voirPile('pioche'); $('cbDefausse').onclick = () => voirPile('defausse'); $('cbEpuisees').onclick = () => voirPile('epuisees');
$('cbPioche').title = 'Ta pioche — cliquer pour voir ce qu’il reste'; $('cbDefausse').title = 'Ta défausse — cliquer pour la voir';
// ce que je vais perdre si je finis mon tour maintenant
function majMenace(c) {
  let total = 0;
  for (const e of c.ennemis) if (e.pv > 0) for (const it of C.decrireIntention(c, e)) if (it.type === 'attaque') { const [d, n] = it.txt.split('×').map(Number); if (!Number.isNaN(d)) total += d * (n || 1); }
  const el = $('cbMenace'); if (!el) return;
  if (!total || c.fini) { el.className = 'menace'; el.textContent = ''; return; }
  if (c.allie?.pv > 0) { el.className = 'menace vu bloquee'; el.innerHTML = `${c.allie.ico} ${c.allie.nom} encaisse : <b>−${total}</b>`; el.title = 'Ton invocation prend les coups à ta place tant qu’elle tient debout.'; return; }   // v87
  const perte = Math.max(0, total - c.joueur.bloc);
  el.className = `menace vu ${perte ? (perte >= c.joueur.pv ? 'mortelle' : '') : 'bloquee'}`;
  el.innerHTML = perte ? `${perte >= c.joueur.pv ? '☠ ' : ''}Au prochain tour : <b>−${perte} PV</b>${c.joueur.bloc ? ` <small>(${total} − 🛡${c.joueur.bloc})</small>` : ''}` : `🛡 Tu bloques tout (${total})`;
  el.title = 'Somme des attaques annoncées par les ennemis, moins ton bouclier actuel.';
}
export function dessinerCombat(donner = false, entree = false) {
  const c = combat;
  $('cbEnnemis').classList.toggle('beaucoup', c.ennemis.length >= 4);   // v93 : la Tour (5 monstres) tient sur l'écran, même sur téléphone
  $('cbEnnemis').innerHTML = c.ennemis.map((e, n) => {
    const its = C.decrireIntention(c, e), illus = ILLUS_MONSTRES.has(e.id);
    return `<div class="ennemi ${e.rang || ''} ${e.maudit ? 'maudit' : ''} ${typeCombat === 'mondial' ? 'mondial' : ''} ${e.pv <= 0 ? 'parti' : ''} ${e.pv > 0 && e.pv / e.pvMax < 0.35 ? 'blesse' : ''} ${carteChoisie != null ? 'ciblable' : ''} ${entree ? 'entreeD' : ''}" data-e="${e.uid}" style="--respire:${(3 + ((n * 0.7 + e.pvMax) % 1.4)).toFixed(2)}s;--decale:-${((n * 1.3 + e.pvMax * 0.37) % 3).toFixed(2)}s;${entree ? `animation-delay:${150 + n * 120}ms` : ''}">
      <div class="intention ${its.some((x) => x.type === 'attaque') ? 'menace' : ''}">${its.map((it) => `<span class="${it.type}" title="${esc(TITRES_INTENTION[it.type](it.txt))}">${{ attaque: '🗡️', defense: '🛡️', buff: '💪', malus: '', epines: '🌵', groupe: '🛡️👥', soin: '💚' }[it.type]}${it.txt}</span>`).join('') || '<span>…</span>'}</div>
      <div class="corps"><div class="portrait" style="${illus ? `background-image:url(${import.meta.env.BASE_URL}clans/monstres/${e.id}.webp)` : ''}">${illus ? '' : e.ico}</div><div class="ombre"></div></div>
      <div class="nomE">${e.maudit ? '<span class="tagMaudit">MAUDIT</span> ' : ''}${esc(e.nom)}</div>
      <div class="jauge" data-pv="${e.pv}"><span class="bouclier ${e.bloc ? 'vu' : ''}">${e.bloc || ''}</span><div class="barre vie ${e.bloc ? 'protege' : ''}"><i class="fantome" style="width:${(Math.max(0, e.pv) / e.pvMax) * 100}%"></i><i style="width:${(Math.max(0, e.pv) / e.pvMax) * 100}%"></i><b>${Math.max(0, e.pv)} / ${e.pvMax}</b></div></div>
      <div class="statuts">${statutsHTML(e)}</div></div>`;
  }).join('');
  const j = c.joueur;
  majJauge($('cbHeros').querySelector('.jauge'), j.pv, j.pvMax, j.bloc);
  majAllie(c.allie);
  $('cbStatuts').innerHTML = statutsHTML(j);
  majMenace(c); $('cbTour').textContent = c.fini ? '' : `Tour ${c.tour}`;
  $('cbReliques').innerHTML = (c.reliques || []).map((id) => `<i title="${esc(RQ.RELIQUES[id].nom)} : ${esc(RQ.RELIQUES[id].desc)}">${RQ.RELIQUES[id].ico}</i>`).join('');
  $('cbEnergieTxt').textContent = `${c.energie}/${c.energieMax}`;
  $('cbEnergie').classList.toggle('vide', c.energie === 0);
  const cl = CLASSES[p.classe];
  if (cl) {
    const br = BRANCHES[c.branche], per = C.periodeVisee(c);
    const etat = p.classe === 'tireur' ? (C.viseeProchaine(c) ? ' — <b>la prochaine attaque est doublée !</b>' : ` — tir ${(c.tirs % per) + 1}/${per}`) : p.classe === 'escrimeur' ? (c.attaquesTour ? ` — <b>+${c.branche === 'duelliste' ? 2 * c.attaquesTour : 2} par coup actif</b>` : '') : p.classe === 'mage' ? (c.arcanes ? ' — utilisé ce tour' : ' — <b>prêt</b>') : '';
    $('cbTalent').innerHTML = `<b>${cl.ico} ${cl.talent}</b> : ${cl.desc}${etat}${br ? `<br><b>${br.ico} ${esc(br.talent)}</b> : ${esc(br.desc)}` : ''}`;
    $('cbTalent').classList.toggle('pret', (p.classe === 'tireur' && C.viseeProchaine(c)) || (p.classe === 'escrimeur' && c.attaquesTour > 0));
  }
  const n = c.main.length;
  $('cbMain').innerHTML = c.main.map((k, i) => { const rot = (i - (n - 1) / 2) * 5, dy = Math.abs(i - (n - 1) / 2) * 7; const cout = C.coutDe(c, i); let h = carteHTML(k.id, k.niv); if (cout < CARTES[k.id].cout) h = h.replace(`<span class="cc">${CARTES[k.id].cout}</span>`, `<span class="cc reduit">${cout}</span>`); return h.replace('class="carte', `style="transform: rotate(${rot}deg) translateY(${dy}px)" data-i="${i}" class="carte ${k.eph ? 'eph' : ''} ${C.jouable(c, i) ? '' : 'injouable'} ${carteChoisie === i ? 'choisie' : ''}`); }).join('');
  $('cbPioche').querySelector('b').textContent = c.pioche.length; $('cbDefausse').querySelector('b').textContent = c.defausse.length;
  $('cbEpuisees').textContent = c.epuisees.length ? `🔥 ${c.epuisees.length}` : '';
  $('btFinTour').classList.toggle('invite', !c.fini && !c.main.some((_, i) => C.jouable(c, i)));
  $('cbAide').textContent = carteChoisie != null ? (monde.tactile ? 'Touche un ennemi pour le viser' : 'Choisis une cible (clic droit ou Échap pour annuler)') : '';
  $('cbMain').querySelectorAll('.carte').forEach((d) => {
    d.onclick = (ev) => { ev.stopPropagation(); if (appuiLong) { appuiLong = false; return; } choisirCarte(+d.dataset.i); };
    // aperçu au survol (souris) ; au doigt : appui long (la carte n'est alors pas jouée en relâchant)
    d.onpointerenter = (ev) => { if (ev.pointerType === 'mouse' && carteChoisie == null && !animCb) apercu(+d.dataset.i); };
    d.onpointerleave = (ev) => { clearTimeout(minuterieAppui); if (ev.pointerType === 'mouse' && carteChoisie == null) effacerApercu(); };
    d.onpointerdown = (ev) => { if (ev.pointerType === 'mouse' || animCb) return; appuiLong = false; clearTimeout(minuterieAppui); minuterieAppui = setTimeout(() => { appuiLong = true; apercu(+d.dataset.i); d.classList.add('inspectee'); }, 320); };
    d.onpointerup = d.onpointercancel = (ev) => { if (ev.pointerType === 'mouse') return; clearTimeout(minuterieAppui); if (appuiLong) { d.classList.remove('inspectee'); setTimeout(() => { if (carteChoisie == null) effacerApercu(); }, 900); } };
    d.oncontextmenu = (ev) => { if (ev.pointerType !== 'mouse') ev.preventDefault(); };
  });
  if (carteChoisie != null) apercu(carteChoisie); else effacerApercu();
  $('cbEnnemis').querySelectorAll('.ennemi').forEach((d) => d.onclick = () => { if (carteChoisie != null) jouer(carteChoisie, d.dataset.e); });
  if (donner) distribuer($('cbMain'), $('cbPioche'), entree ? 450 : 0);
}
// ---------- vitesse des animations (v57) : ×1, ×2 ou ×3, gardée d'une partie à l'autre ----------
let vitesseCb = (() => { try { return [1, 2, 3].includes(+localStorage.getItem('clansVitesse')) ? +localStorage.getItem('clansVitesse') : 1; } catch { return 1; } })();
const pauseCb = (ms) => pause(ms / vitesseCb);
function majVitesse() { $('btVitesse').textContent = `⏩ ×${vitesseCb}`; $('btVitesse').classList.toggle('rapide', vitesseCb > 1); document.documentElement.style.setProperty('--vitesseCb', vitesseCb); }
function changerVitesse() { vitesseCb = vitesseCb % 3 + 1; try { localStorage.setItem('clansVitesse', vitesseCb); } catch { /* rien */ } majVitesse(); }
$('btVitesse').onclick = (e) => { e.stopPropagation(); changerVitesse(); };
addEventListener('keydown', (e) => { if ((e.key === 'v' || e.key === 'V') && e.target.tagName !== 'INPUT' && !$('combat').classList.contains('cache')) changerVitesse(); });
majVitesse();

// ---------- aperçu des effets réels d'une carte (v57) ----------
// on joue la carte sur une copie du combat : force, affaibli, trempé, talents, bouclier ennemi… tout est compté.
function simuler(i, cible) {
  const k = structuredClone({ ...combat, _r: undefined, ev: undefined });
  k._r = () => 0.5; k.journal = [];
  if (!C.jouerCarte(k, i, cible)) return null;
  return k;
}
export function apercu(i) {
  effacerApercu();
  if (i == null || !combat || combat.fini || !C.jouable(combat, i)) return;
  const k = combat.main[i], vivants = combat.ennemis.filter((e) => e.pv > 0), cible = C.besoinCible(k.id) && vivants.length > 1;
  const resultats = cible ? vivants.map((e) => [e.uid, simuler(i, e.uid)]) : [[null, simuler(i, vivants[0]?.uid)]];
  let heros = null;
  for (const [uid, s] of resultats) {
    if (!s) continue;
    for (const e of combat.ennemis) {
      if (e.pv <= 0 || (uid && e.uid !== uid)) continue;
      const apres = s.ennemis.find((x) => x.uid === e.uid), pv = e.pv - Math.max(0, apres.pv), bloc = e.bloc - apres.bloc;
      const st = ['brulure', 'trempe', 'affaibli'].filter((x) => apres[x] > e[x]).map((x) => `${STATUTS[x].ico}+${apres[x] - e[x]}`);
      if (!pv && !bloc && !st.length) continue;
      const d = document.createElement('div'); d.className = `apercu ${apres.pv <= 0 ? 'mortel' : ''}`;
      d.innerHTML = `${apres.pv <= 0 ? '☠ ' : ''}${pv ? `−${pv}` : ''}${bloc > 0 ? ` <small>🛡−${bloc}</small>` : ''}${st.length ? ` <small>${st.join(' ')}</small>` : ''}`;
      elEnnemi(e.uid)?.append(d);
    }
    heros ||= s;
  }
  if (heros) {
    const j = combat.joueur, h = heros.joueur, parts = [];
    if (h.bloc > j.bloc) parts.push(`🛡+${h.bloc - j.bloc}`);
    if (h.pv > j.pv) parts.push(`❤+${h.pv - j.pv}`);
    if (h.force > j.force) parts.push(`💪+${h.force - j.force}`);
    if (heros.energie > combat.energie - C.coutDe(combat, i)) parts.push(`⚡+${heros.energie - (combat.energie - C.coutDe(combat, i))}`);
    if (parts.length) { const d = document.createElement('div'); d.className = 'apercu soi'; d.textContent = parts.join(' '); $('cbHeros').append(d); }
  }
}
let appuiLong = false, minuterieAppui = null;
export function effacerApercu() { document.querySelectorAll('#combat .apercu').forEach((d) => d.remove()); }

export function choisirCarte(i) {
  if (animCb) return;
  if (!C.jouable(combat, i)) return toast("Pas assez d'énergie.");
  const k = combat.main[i], vivants = combat.ennemis.filter((e) => e.pv > 0);
  if (C.besoinCible(k.id) && vivants.length > 1) { setCarteChoisie(carteChoisie === i ? null : i); return dessinerCombat(); }
  jouer(i, vivants[0]?.uid);
}
export const elEnnemi = (uid) => document.querySelector(`#cbEnnemis [data-e="${uid}"]`);
export const corpsDe = (a) => (a === 'j' ? $('cbHeros').querySelector('.combattant') : a === 'allie' ? $('cbAllie').querySelector('.portrait') : elEnnemi(a)?.querySelector('.portrait'));
export const blocDe = (a) => (a === 'j' ? $('cbHeros') : a === 'allie' ? $('cbAllie') : elEnnemi(a));
export const jaugeDe = (a) => blocDe(a)?.querySelector('.jauge');
export const pvMaxDe = (a) => (a === 'j' ? combat.joueur.pvMax : a === 'allie' ? combat.allie?.pvMax || 1 : combat.ennemis.find((e) => e.uid === a)?.pvMax || 1);
export async function jouerEvenements(evs) {
  const sc = $('combat'), fx = fxCb;
  let element = 'neutre', coupsCarte = 0;
  for (const e of evs) {
    const z = e.a ? corpsDe(e.a) : null;
    switch (e.t) {
      case 'carte': element = CARTES[e.id]?.element || 'neutre'; coupsCarte = 0; break;
      case 'invoque': majAllie(e.allie); rejouerAnim($('cbAllie'), 'entreeG'); sfx.bouclier?.(); await pauseCb(320); break;   // v87
      case 'coup': {
        if (!z) break;
        const c = centre(z), pal = e.de === 'j' ? PALETTES[element] : PALETTES.mal;
        // v65 : un sort élémentaire part du héros et file vers sa cible (le premier coup de la carte)
        if (e.de === 'j' && e.a !== 'j' && PALETTES[element] && element !== 'neutre' && coupsCarte++ === 0) {
          const h = centre($('cbSprite')); fx.proj(h.x + 20, h.y - 10, c.x, c.y, PALETTES[element], { r: e.deg >= 15 ? 16 : 11, arc: element === 'eau' ? 60 : element === 'plante' ? 20 : 40 });
          await pauseCb(190);
        }
        if (e.de === 'j' && e.a !== 'j') fx.signature(element, c.x, c.y, e.deg >= 15);
        fx.entaille(c.x, c.y, pal[2] || pal[1], { a: e.de === 'j' ? -0.75 : 2.3, l: e.deg >= 15 ? 210 : 150, n: e.double ? 4 : 3 });
        fx.eclats(c.x, c.y, pal, e.deg >= 15 ? 40 : 22, { vitesse: 280 });
        rejouerAnim(blocDe(e.a), 'touche');
        if (e.deg > 0) nombre(z, `−${e.deg}`, `deg${e.deg >= 15 || e.double ? ' gros' : ''}`);
        if (e.bloque > 0) nombre(z, `🛡 ${e.bloque}`, 'bloque', 34);
        majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), e.bloc);
        if (e.a === 'allie' && e.pv <= 0) setTimeout(() => $('cbAllie').classList.add('cache'), 450);   // v87 : l'invocation tombe
        if (e.a === 'j') { secouer(sc, e.deg >= 10); if (e.deg) flash(sc, 'rgba(220,30,20,.32)'); sfx.hurt(); } else { sfx.coup(); if (e.deg >= 15) secouer(sc, false); const el2 = elEnnemi(e.a); if (el2) el2.classList.toggle('blesse', e.pv > 0 && e.pv / pvMaxDe(e.a) < 0.35); if (e.deg >= 15) await pauseCb(70); }
        await pauseCb(e.de === 'j' ? 210 : 300); break;
      }
      case 'epines': {
        if (!z) break; const c = centre(z);
        fx.eclats(c.x, c.y, PALETTES.plante, 14, { vitesse: 200 }); nombre(z, `🌵 −${e.deg}`, 'deg'); rejouerAnim(blocDe(e.a), 'touche');
        majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), e.bloc); await pauseCb(220); break;
      }
      case 'mort': {
        const el = elEnnemi(e.a); if (!el) break; const c = centre(el.querySelector('.portrait'));
        fx.eclats(c.x, c.y, PALETTES.mort, 56, { vitesse: 360, g: 90, taille: 5, vie: 1.2 }); fx.anneau(c.x, c.y, '#d8c8ff', 150, { ep: 10, vie: 0.6 }); fx.eclair(c.x, c.y, '#ffffff', 160);
        el.classList.remove('touche'); el.classList.add('mort'); sfx.orb();
        setTimeout(() => { const r = el.querySelector('.portrait').getBoundingClientRect(); fx.eclats(r.left + r.width / 2, r.bottom, ['#8a7a6a', '#6a5a4a', '#b0a090', '#4a3e34'], 30, { vitesse: 180, g: 260, taille: 5, angle: -1.57, ecart: 2.6, vie: 1 }); }, 420);   // la poussière quand il s'effondre
        await pauseCb(380); break;
      }
      case 'bloc': {
        if (!z) break; const c = centre(z);
        fx.anneau(c.x, c.y, '#8ac8ff', 95, { ep: 9 }); fx.eclats(c.x, c.y, PALETTES.bloc, 16, { vitesse: 170, g: 0 });
        nombre(z, `+${e.n} 🛡`, 'bloc'); const j = jaugeDe(e.a); majJauge(j, +j.dataset.pv, pvMaxDe(e.a), e.bloc); sfx.bouclier(); await pauseCb(220); break;
      }
      case 'soin': {
        if (!z || !e.n) break; const c = centre(z);
        fx.monte(c.x, c.y + 20, PALETTES.soin, 22, 70); nombre(z, `+${e.n}`, 'soin'); majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), null); sfx.heal(); await pauseCb(240); break;
      }
      case 'statut': {
        if (!z) break; const c = centre(z), st = STATUTS[e.k];
        const pal = { brulure: PALETTES.feu, trempe: PALETTES.eau, affaibli: PALETTES.mort, epines: PALETTES.plante, regen: PALETTES.soin, force: PALETTES.or }[e.k] || PALETTES.neutre;
        if (e.k === 'force' || e.k === 'regen') fx.monte(c.x, c.y + 20, pal, 14, 60); else fx.eclats(c.x, c.y, pal, 12, { vitesse: 140, g: -40 });
        nombre(z, `${st?.ico || ''}+${e.n}`, 'statut', -10); await pauseCb(170); break;
      }
      case 'brule': {
        if (!z) break; const c = centre(z);
        fx.eclats(c.x, c.y + 10, PALETTES.feu, 24, { vitesse: 160, g: -260, angle: -1.57, ecart: 1.4 }); nombre(z, `${e.sang ? '🩸' : '🔥'} −${e.deg}`, 'brule');
        rejouerAnim(blocDe(e.a), 'touche'); majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), null); if (e.a === 'j') sfx.hurt(); await pauseCb(300); break;
      }
      case 'energie': rejouerAnim($('cbEnergie'), 'change'); break;
      case 'tourEnnemi': banniere('cbBanniere', 'Tour ennemi', 'rouge', 950); await pauseCb(700); break;
      case 'resiste': { if (!z) break; nombre(z, '🛡 résiste', 'statut', -10); await pauseCb(200); break; }
      case 'etourdi': { if (!z) break; nombre(z, '💫 étourdi', 'statut', -10); rejouerAnim(z, 'touche'); await pauseCb(260); break; }   // v96
      case 'agit': {
        const el = elEnnemi(e.a); if (!el) break;
        el.classList.add('agit'); setTimeout(() => el.classList.remove('agit'), 600);
        if (e.attaque) { rejouerAnim(el, 'frappe'); await pauseCb(160); } else await pauseCb(240);
        break;
      }
      default: break;
    }
  }
}
export async function jouer(i, cibleUid) {
  if (animCb || !combat) return;
  effacerApercu();
  const el = $('cbMain').querySelector(`[data-i="${i}"]`), k = CARTES[combat.main[i]?.id];
  setCarteChoisie(null);
  combat.ev = [];
  if (!C.jouerCarte(combat, i, cibleUid)) { combat.ev = null; return; }
  coups.push(cibleUid ? ['j', i, cibleUid] : ['j', i]);
  const evs = combat.ev; combat.ev = null;
  animCb = true; $('combat').classList.add('attente');
  document.querySelectorAll('#cbEnnemis .ennemi.ciblable').forEach((x) => x.classList.remove('ciblable')); $('cbAide').textContent = '';
  const cibles = evs.find((x) => x.t === 'carte')?.cibles || [];
  const offensive = k && (k.type === 'attaque' || (cibles.length && evs.some((x) => x.t === 'coup' || (x.t === 'statut' && x.a !== 'j'))));
  const vers = offensive ? (cibles.length === 1 ? corpsDe(cibles[0]) : $('cbEnnemis')) : $('cbHeros').querySelector('.combattant');
  if (k) (k.type === 'defense' ? sfx.bouclier() : k.type === 'pouvoir' ? sfx.pouvoir() : sfx.carte(k.element));
  if (k?.type === 'attaque') rejouerAnim($('cbHeros'), 'frappe');
  $('cbEnergieTxt').textContent = `${combat.energie}/${combat.energieMax}`; rejouerAnim($('cbEnergie'), 'change');
  await voler(el, vers, k?.element, fxCb);
  await jouerEvenements(evs);
  animCb = false; $('combat').classList.remove('attente');
  if (!combat) return;
  dessinerCombat();
  if (combat.fini) finCombatAnim();
}
$('btFinTour').onclick = async () => {
  if (!combat || combat.fini || animCb) return;
  animCb = true; setCarteChoisie(null); const sc = $('combat'); sc.classList.add('attente'); $('btFinTour').disabled = true; $('btFinTour').classList.remove('invite');
  await defausserMain($('cbMain'), $('cbDefausse'));
  combat.ev = []; C.finTour(combat); coups.push(['f']); const evs = combat.ev; combat.ev = null; sfx.melange();
  $('cbMain').innerHTML = '';
  await jouerEvenements(evs);
  animCb = false; $('btFinTour').disabled = false; sc.classList.remove('attente');
  if (!combat) return;
  if (combat.fini) { dessinerCombat(); return finCombatAnim(); }
  banniere('cbBanniere', `Ton tour<small>Tour ${combat.tour}</small>`, '', 900);
  dessinerCombat(true);
};
export async function finCombatAnim() {
  const sc = $('combat'), gagne = combat.fini === 'victoire';
  sc.classList.add('finie', gagne ? 'gagne' : 'perdu');
  if (gagne) {
    const r = document.createElement('div'); r.className = 'rayons'; sc.append(r);
    const c = centre($('cbHeros').querySelector('.combattant'));
    fxCb.eclats(innerWidth / 2, innerHeight * 0.42, PALETTES.or, 70, { vitesse: 420, g: 260, taille: 5, vie: 1.4 }); fxCb.monte(c.x, c.y, PALETTES.or, 26, 80);
    sfx.victory();
  } else sfx.defaite();
  banniere('cbBanniere', gagne ? 'Victoire !' : 'Défaite…', `fin ${gagne ? 'victoire' : 'defaite'}`, 0);
  await pauseCb(1600);
  finCombat();
}
$('combat').addEventListener('contextmenu', (e) => { e.preventDefault(); if (animCb || !combat) return; setCarteChoisie(null); dessinerCombat(); });
addEventListener('keydown', (e) => {
  if ($('combat').classList.contains('cache') || animCb || !combat || document.getElementById('coachBulle')) return;   // v94 : pas de raccourci pendant le tutoriel
  if (e.key === 'Escape') { setCarteChoisie(null); dessinerCombat(); }
  else if (e.key === 'e' || e.key === 'E') $('btFinTour').click();
  else if (/^[1-9]$/.test(e.key)) choisirCarte(+e.key - 1);
});
export let envoiCombat = false;
export function fermerScene() { stopAuraCb?.(); stopAuraCb = null; $('combat').classList.add('cache'); ambCb?.arreter(); ambCb = null; fxCb?.vider(); $('cbBanniere').replaceChildren(); $('combat').querySelector('.rayons')?.remove(); }
export async function finCombat() {
  if (envoiCombat) return;
  if (mondialEnCours) { fermerScene(); return finManche(); }
  if (typeCombat === 'tour') {   // v91
    envoiCombat = true; $('cbAide').textContent = 'Le serveur valide l’étage…';
    const rep = await act('tourCombat', { coups });
    envoiCombat = false; fermerScene(); setCombat(null); typeCombat = null;
    return (await import('./ui-tour.js')).apresEtage(rep);
  }
  if (typeCombat === 'ascension') {
    envoiCombat = true; $('cbAide').textContent = 'Le serveur valide l’épreuve…';
    const rep = await act('ascensionCombat', { coups });
    envoiCombat = false; fermerScene(); setCombat(null); typeCombat = null;
    return (await import('./ui-ascension.js')).apresEpreuve(rep);
  }
  // le serveur rejoue nos coups : c'est SON résultat qui compte
  envoiCombat = true; $('cbAide').textContent = 'Le serveur valide le combat…';
  let rep = await act('expeCombat', { coups });
  if (!rep.ok && /répond|connexion/.test(rep.raison || '')) { await new Promise((ok) => setTimeout(ok, 3000)); rep = await act('expeCombat', { coups }); }
  envoiCombat = false;
  fermerScene(); setCombat(null);
  if (!rep.ok) { toast(esc(rep.raison || 'Combat refusé par le serveur.')); return p.expedition ? fenetreExpedition(p.expedition.territoire) : fermer(); }
  const r = rep.res;
  if (r.fin) return bilanExpedition(r);
  if (r.aTerre) { toast('💀 Tu es à terre ! Tes compagnons continuent : le prochain feu de camp te relèvera.'); return fenetreExpedition(p.expedition.territoire); }
  toast(`Victoire ! +${r.gain.essence} ${ICO_RESS.essence} · +${r.gain.mat} matériaux${r.gain.rare ? ` · +${r.gain.rare} ${ICO_RESS[RARES[p.expedition.territoire].id]}` : ''}`);
  fenetreExpedition(p.expedition.territoire);
}
export let etatMondial = null, minuterieMondial = null;
export function majMondial(m) {
  const nouveau = m && (!etatMondial || etatMondial.id !== m.id);
  etatMondial = m; monde.majMondial(m);
  if (nouveau) { sfx.rugissement(); setTimeout(() => sfx.cor(), 600); }
  if (nouveau) toast(`☠ ${m.nom} apparaît dans les ${TERRITOIRES[m.terr].nom} ! Regarde la mini-carte.`);
  clearInterval(minuterieMondial);
  const b = $('bandeauMondial');
  if (!m) { b.classList.add('cache'); return; }
  const maj = () => { const s = Math.max(0, Math.round((m.fin - Date.now()) / 1000)); b.innerHTML = `☠ <b>${esc(m.nom)}</b> · ${TERRITOIRES[m.terr].nom} · <span class="pvM"><i style="width:${(m.pv / m.pvMax) * 100}%"></i></span> ${nf(m.pv)} PV · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  maj(); minuterieMondial = setInterval(maj, 1000); b.classList.remove('cache');
}
export function lancerMondial(m) {
  if (!$('combat').classList.contains('cache')) return;
  mondialEnCours = { terr: m.terr };
  const pv = P.pvMax(p);
  lancerCombat({ deck: P.deckCombat(p), joueur: { pv, pvMax: pv }, ennemis: [{ ...BOSS_MONDIAUX[m.terr], pv: m.pv }], palier: PALIER_MONDIAL, graine: m.graine, classe: p.classe, branche: p.branche || null, familier: F.actif(p) }, 'mondial');
}
export function finManche() {
  const deg = combat.ennemis.reduce((t, e) => t + Math.max(0, e.pvMax - Math.max(0, e.pv)), 0), gagne = combat.fini === 'victoire';
  room?.send('mondialCoup', { coups });
  setCombat(null); mondialEnCours = null; typeCombat = null;
  toast(gagne ? `💥 Manche gagnée : ${deg} dégâts au boss mondial !` : `💀 Tu tombes, mais tes ${deg} dégâts comptent. Reprends ton souffle 15 s et retente !`);
}
export function recompenseMondiale(r) {
  sfx.fanfare();
  const rare = Object.values(RARES).find((x) => x.id === r.rare.id);
  ouvrir(`<h2>🏆 ${esc(r.boss)} est vaincu !</h2>
    <p>Vous étiez <b>${r.nb}</b> à l'affronter. Tu as infligé <b>${nf(r.deg)}</b> dégâts sur ${nf(r.total)} (${Math.round((r.deg / Math.max(1, r.total)) * 100)} %) : tu es <b>${r.rang === 1 ? '🥇 1er' : `${r.rang}e`}</b>.</p>
    <p class="recolte">+${nf(r.essence)} ${ICO_RESS.essence} · +${r.eclats} ${ICO_RESS.eclats} · +${r.rare.n} ${rare ? ICO_RESS[rare.id] : ''} ${esc(rare?.nom || '')}</p>
    <p class="cout">Ton clan gagne aussi des points au classement de la semaine.</p>
    <button class="bouton" id="btOk">Super !</button>`, () => { $('btOk').onclick = fermer; });
}

// pour modifier ces variables depuis les autres modules
export const setStopAuraDu = (v) => (stopAuraDu = v);
