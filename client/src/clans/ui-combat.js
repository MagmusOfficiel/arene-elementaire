// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la scène de combat, ses animations et le boss mondial
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import * as F from '../../../shared/clans/familiers.js';
import { feuilleFamilier } from './familiersArt.js';
import { CARTES, CLASSES, RARES, STATUTS } from '../../../shared/clans/cartes.js';
import { TERRITOIRES, PALIERS, MALEDICTIONS } from '../../../shared/clans/monstres.js';
import * as C from '../../../shared/clans/combat.js';
import * as P from '../../../shared/clans/profil.js';
import { BOSS_MONDIAUX, PALIER_MONDIAL } from '../../../shared/clans/mondial.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso } from './monde.js';
import { decor, ambiance, creerFx, PALETTES } from './scene.js';
import { sfx } from '../sfx.js';
import { $, ILLUS_MONSTRES, carteChoisie, carteHTML, centre, combat, esc, nf, p, pause, room, setCarteChoisie, setCombat, statutsHTML, toast } from './ui-commun.js';
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
export function dessinerSprite(canvas, clan, classe, dir, app = '') { const g = canvas.getContext('2d'); g.clearRect(0, 0, 16, 26); g.drawImage(feuillePerso(clan, classe || 'combattant', app), 0, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 16, 26, 0, 0, 16, 26); }
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
  if (cartes.length) { await pause(260 + cartes.length * 45); rejouerAnim(pile, 'recoit'); }
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
  const terr = mondialEnCours?.terr || p.expedition.territoire;
  decor($('cbDecor'), terr);
  ambCb?.arreter(); ambCb = ambiance($('cbAmbiance'), terr);
  fxCb ||= creerFx($('cbFx'));
  $('cbTitre').textContent = { combat: 'Combat', elite: 'Combat d’élite', boss: 'Combat contre le boss', mondial: `☠ ${BOSS_MONDIAUX[terr].nom}` }[type] || 'Combat';
  $('cbInfo').innerHTML = type === 'mondial' ? `${TERRITOIRES[terr].nom} · tes dégâts s'ajoutent à ceux de tous les joueurs` : `${TERRITOIRES[terr].nom} · ${PALIERS[p.expedition.palier - 1].nom}${(p.expedition.mods || []).map((k) => ` <span class="malediction" title="${esc(MALEDICTIONS[k].desc)}">${MALEDICTIONS[k].ico} ${MALEDICTIONS[k].nom}</span>`).join('')}`;
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
}
export function dessinerCombat(donner = false, entree = false) {
  const c = combat;
  $('cbEnnemis').innerHTML = c.ennemis.map((e, n) => {
    const its = C.decrireIntention(c, e), illus = ILLUS_MONSTRES.has(e.id);
    return `<div class="ennemi ${e.rang || ''} ${e.maudit ? 'maudit' : ''} ${typeCombat === 'mondial' ? 'mondial' : ''} ${e.pv <= 0 ? 'parti' : ''} ${carteChoisie != null ? 'ciblable' : ''} ${entree ? 'entreeD' : ''}" data-e="${e.uid}" style="${entree ? `animation-delay:${150 + n * 120}ms` : ''}">
      <div class="intention ${its.some((x) => x.type === 'attaque') ? 'menace' : ''}">${its.map((it) => `<span class="${it.type}">${{ attaque: '🗡️', defense: '🛡️', buff: '💪', malus: '', epines: '🌵' }[it.type]}${it.txt}</span>`).join('') || '<span>…</span>'}</div>
      <div class="corps"><div class="portrait" style="${illus ? `background-image:url(${import.meta.env.BASE_URL}clans/monstres/${e.id}.webp)` : ''}">${illus ? '' : e.ico}</div><div class="ombre"></div></div>
      <div class="nomE">${e.maudit ? '<span class="tagMaudit">MAUDIT</span> ' : ''}${esc(e.nom)}</div>
      <div class="jauge" data-pv="${e.pv}"><span class="bouclier ${e.bloc ? 'vu' : ''}">${e.bloc || ''}</span><div class="barre vie ${e.bloc ? 'protege' : ''}"><i class="fantome" style="width:${(Math.max(0, e.pv) / e.pvMax) * 100}%"></i><i style="width:${(Math.max(0, e.pv) / e.pvMax) * 100}%"></i><b>${Math.max(0, e.pv)} / ${e.pvMax}</b></div></div>
      <div class="statuts">${statutsHTML(e)}</div></div>`;
  }).join('');
  const j = c.joueur;
  majJauge($('cbHeros').querySelector('.jauge'), j.pv, j.pvMax, j.bloc);
  $('cbStatuts').innerHTML = statutsHTML(j);
  $('cbEnergieTxt').textContent = `${c.energie}/${c.energieMax}`;
  $('cbEnergie').classList.toggle('vide', c.energie === 0);
  const cl = CLASSES[p.classe];
  if (cl) {
    const etat = p.classe === 'tireur' ? (C.viseeProchaine(c) ? ' — <b>la prochaine attaque est doublée !</b>' : ` — tir ${(c.tirs % 3) + 1}/3`) : p.classe === 'escrimeur' ? (c.attaquesTour ? ' — <b>+2 par coup actif</b>' : '') : p.classe === 'mage' ? (c.arcanes ? ' — utilisé ce tour' : ' — <b>prêt</b>') : '';
    $('cbTalent').innerHTML = `<b>${cl.ico} ${cl.talent}</b> : ${cl.desc}${etat}`;
    $('cbTalent').classList.toggle('pret', (p.classe === 'tireur' && C.viseeProchaine(c)) || (p.classe === 'escrimeur' && c.attaquesTour > 0));
  }
  const n = c.main.length;
  $('cbMain').innerHTML = c.main.map((k, i) => { const rot = (i - (n - 1) / 2) * 5, dy = Math.abs(i - (n - 1) / 2) * 7; const cout = C.coutDe(c, i); let h = carteHTML(k.id, k.niv); if (cout < CARTES[k.id].cout) h = h.replace(`<span class="cc">${CARTES[k.id].cout}</span>`, `<span class="cc reduit">${cout}</span>`); return h.replace('class="carte', `style="transform: rotate(${rot}deg) translateY(${dy}px)" data-i="${i}" class="carte ${C.jouable(c, i) ? '' : 'injouable'} ${carteChoisie === i ? 'choisie' : ''}`); }).join('');
  $('cbPioche').querySelector('b').textContent = c.pioche.length; $('cbDefausse').querySelector('b').textContent = c.defausse.length;
  $('cbEpuisees').textContent = c.epuisees.length ? `🔥 ${c.epuisees.length}` : '';
  $('btFinTour').classList.toggle('invite', !c.fini && !c.main.some((_, i) => C.jouable(c, i)));
  $('cbAide').textContent = carteChoisie != null ? (monde.tactile ? 'Touche un ennemi pour le viser' : 'Choisis une cible (clic droit ou Échap pour annuler)') : '';
  $('cbMain').querySelectorAll('.carte').forEach((d) => d.onclick = (ev) => { ev.stopPropagation(); choisirCarte(+d.dataset.i); });
  $('cbEnnemis').querySelectorAll('.ennemi').forEach((d) => d.onclick = () => { if (carteChoisie != null) jouer(carteChoisie, d.dataset.e); });
  if (donner) distribuer($('cbMain'), $('cbPioche'), entree ? 450 : 0);
}
export function choisirCarte(i) {
  if (animCb) return;
  if (!C.jouable(combat, i)) return toast("Pas assez d'énergie.");
  const k = combat.main[i], vivants = combat.ennemis.filter((e) => e.pv > 0);
  if (C.besoinCible(k.id) && vivants.length > 1) { setCarteChoisie(carteChoisie === i ? null : i); return dessinerCombat(); }
  jouer(i, vivants[0]?.uid);
}
export const elEnnemi = (uid) => document.querySelector(`#cbEnnemis [data-e="${uid}"]`);
export const corpsDe = (a) => (a === 'j' ? $('cbHeros').querySelector('.combattant') : elEnnemi(a)?.querySelector('.portrait'));
export const blocDe = (a) => (a === 'j' ? $('cbHeros') : elEnnemi(a));
export const jaugeDe = (a) => blocDe(a)?.querySelector('.jauge');
export const pvMaxDe = (a) => (a === 'j' ? combat.joueur.pvMax : combat.ennemis.find((e) => e.uid === a)?.pvMax || 1);
export async function jouerEvenements(evs) {
  const sc = $('combat'), fx = fxCb;
  let element = 'neutre';
  for (const e of evs) {
    const z = e.a ? corpsDe(e.a) : null;
    switch (e.t) {
      case 'carte': element = CARTES[e.id]?.element || 'neutre'; break;
      case 'coup': {
        if (!z) break;
        const c = centre(z), pal = e.de === 'j' ? PALETTES[element] : PALETTES.mal;
        fx.entaille(c.x, c.y, pal[2] || pal[1], { a: e.de === 'j' ? -0.75 : 2.3, l: e.deg >= 15 ? 210 : 150, n: e.double ? 4 : 3 });
        fx.eclats(c.x, c.y, pal, e.deg >= 15 ? 40 : 22, { vitesse: 280 });
        rejouerAnim(blocDe(e.a), 'touche');
        if (e.deg > 0) nombre(z, `−${e.deg}`, `deg${e.deg >= 15 || e.double ? ' gros' : ''}`);
        if (e.bloque > 0) nombre(z, `🛡 ${e.bloque}`, 'bloque', 34);
        majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), e.bloc);
        if (e.a === 'j') { secouer(sc, e.deg >= 10); if (e.deg) flash(sc, 'rgba(220,30,20,.32)'); sfx.hurt(); } else { sfx.coup(); if (e.deg >= 15) secouer(sc, false); }
        await pause(e.de === 'j' ? 210 : 300); break;
      }
      case 'epines': {
        if (!z) break; const c = centre(z);
        fx.eclats(c.x, c.y, PALETTES.plante, 14, { vitesse: 200 }); nombre(z, `🌵 −${e.deg}`, 'deg'); rejouerAnim(blocDe(e.a), 'touche');
        majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), e.bloc); await pause(220); break;
      }
      case 'mort': {
        const el = elEnnemi(e.a); if (!el) break; const c = centre(el.querySelector('.portrait'));
        fx.eclats(c.x, c.y, PALETTES.mort, 56, { vitesse: 360, g: 90, taille: 5, vie: 1.2 }); fx.anneau(c.x, c.y, '#d8c8ff', 150, { ep: 10, vie: 0.6 }); fx.eclair(c.x, c.y, '#ffffff', 160);
        el.classList.remove('touche'); el.classList.add('mort'); sfx.orb(); await pause(380); break;
      }
      case 'bloc': {
        if (!z) break; const c = centre(z);
        fx.anneau(c.x, c.y, '#8ac8ff', 95, { ep: 9 }); fx.eclats(c.x, c.y, PALETTES.bloc, 16, { vitesse: 170, g: 0 });
        nombre(z, `+${e.n} 🛡`, 'bloc'); const j = jaugeDe(e.a); majJauge(j, +j.dataset.pv, pvMaxDe(e.a), e.bloc); sfx.bouclier(); await pause(220); break;
      }
      case 'soin': {
        if (!z || !e.n) break; const c = centre(z);
        fx.monte(c.x, c.y + 20, PALETTES.soin, 22, 70); nombre(z, `+${e.n}`, 'soin'); majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), null); sfx.heal(); await pause(240); break;
      }
      case 'statut': {
        if (!z) break; const c = centre(z), st = STATUTS[e.k];
        const pal = { brulure: PALETTES.feu, trempe: PALETTES.eau, affaibli: PALETTES.mort, epines: PALETTES.plante, regen: PALETTES.soin, force: PALETTES.or }[e.k] || PALETTES.neutre;
        if (e.k === 'force' || e.k === 'regen') fx.monte(c.x, c.y + 20, pal, 14, 60); else fx.eclats(c.x, c.y, pal, 12, { vitesse: 140, g: -40 });
        nombre(z, `${st?.ico || ''}+${e.n}`, 'statut', -10); await pause(170); break;
      }
      case 'brule': {
        if (!z) break; const c = centre(z);
        fx.eclats(c.x, c.y + 10, PALETTES.feu, 24, { vitesse: 160, g: -260, angle: -1.57, ecart: 1.4 }); nombre(z, `🔥 −${e.deg}`, 'brule');
        rejouerAnim(blocDe(e.a), 'touche'); majJauge(jaugeDe(e.a), e.pv, pvMaxDe(e.a), null); if (e.a === 'j') sfx.hurt(); await pause(300); break;
      }
      case 'energie': rejouerAnim($('cbEnergie'), 'change'); break;
      case 'tourEnnemi': banniere('cbBanniere', 'Tour ennemi', 'rouge', 950); await pause(700); break;
      case 'agit': {
        const el = elEnnemi(e.a); if (!el) break;
        el.classList.add('agit'); setTimeout(() => el.classList.remove('agit'), 600);
        if (e.attaque) { rejouerAnim(el, 'frappe'); await pause(160); } else await pause(240);
        break;
      }
      default: break;
    }
  }
}
export async function jouer(i, cibleUid) {
  if (animCb || !combat) return;
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
  await pause(1600);
  finCombat();
}
$('combat').addEventListener('contextmenu', (e) => { e.preventDefault(); if (animCb || !combat) return; setCarteChoisie(null); dessinerCombat(); });
addEventListener('keydown', (e) => {
  if ($('combat').classList.contains('cache') || animCb || !combat) return;
  if (e.key === 'Escape') { setCarteChoisie(null); dessinerCombat(); }
  else if (e.key === 'e' || e.key === 'E') $('btFinTour').click();
  else if (/^[1-9]$/.test(e.key)) choisirCarte(+e.key - 1);
});
export let envoiCombat = false;
export function fermerScene() { stopAuraCb?.(); stopAuraCb = null; $('combat').classList.add('cache'); ambCb?.arreter(); ambCb = null; fxCb?.vider(); $('cbBanniere').replaceChildren(); $('combat').querySelector('.rayons')?.remove(); }
export async function finCombat() {
  if (envoiCombat) return;
  if (mondialEnCours) { fermerScene(); return finManche(); }
  // le serveur rejoue nos coups : c'est SON résultat qui compte
  envoiCombat = true; $('cbAide').textContent = 'Le serveur valide le combat…';
  let rep = await act('expeCombat', { coups });
  if (!rep.ok && /répond|connexion/.test(rep.raison || '')) { await new Promise((ok) => setTimeout(ok, 3000)); rep = await act('expeCombat', { coups }); }
  envoiCombat = false;
  fermerScene(); setCombat(null);
  if (!rep.ok) { toast(esc(rep.raison || 'Combat refusé par le serveur.')); return p.expedition ? fenetreExpedition(p.expedition.territoire) : fermer(); }
  const r = rep.res;
  if (r.fin) return bilanExpedition(r);
  toast(`Victoire ! +${r.gain.essence} ✨ · +${r.gain.mat} matériaux${r.gain.rare ? ` · +${r.gain.rare} ${RARES[p.expedition.territoire].ico}` : ''}`);
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
  lancerCombat({ deck: P.deckCombat(p), joueur: { pv, pvMax: pv }, ennemis: [{ ...BOSS_MONDIAUX[m.terr], pv: m.pv }], palier: PALIER_MONDIAL, graine: m.graine, classe: p.classe, familier: F.actif(p) }, 'mondial');
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
    <p class="recolte">+${nf(r.essence)} ✨ · +${r.eclats} 💠 · +${r.rare.n} ${rare?.ico || ''} ${esc(rare?.nom || '')}</p>
    <p class="cout">Ton clan gagne aussi des points au classement de la semaine.</p>
    <button class="bouton" id="btOk">Super !</button>`, () => { $('btOk').onclick = fermer; });
}

// pour modifier ces variables depuis les autres modules
export const setStopAuraDu = (v) => (stopAuraDu = v);
