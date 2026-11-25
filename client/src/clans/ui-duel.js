// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les duels (et les matchs d’arène)
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { CARTES, ELEMENTS, STATUTS } from '../../../shared/clans/cartes.js';
import * as A from '../../../shared/clans/arene.js';
import * as AP from '../../../shared/clans/apparence.js';
import { decor, ambiance, creerFx, PALETTES } from './scene.js';
import { sfx } from '../sfx.js';
import { banniere, defausserMain, dessinerSprite, distribuer, flash, lancerAuras, majJauge, nombre, regler, rejouerAnim, secouer, setStopAuraDu, stopAuraDu, voler, impact } from './ui-combat.js';
import { $, ICO_RESS, ILLUS, carteHTML, centre, esc, nf, p, pause, room, statutsHTML, toast } from './ui-commun.js';
import { etourdir, fermer, monde, ouvrir } from './ui-monde.js';
import { finArene } from './ui-social.js';

export let vueDu = null, minuterieDu = null, fxDu = null, ambDu = null, volDu = null, journalVu = 0;
export const advDu = () => $('duAdv');
export function afficherDuel(v) {
  const premier = $('duel').classList.contains('cache'), avant = vueDu;
  vueDu = v;
  const sc = $('duel'), a = v.adv, m = v.moi;
  if (premier) {
    $('fenetre').classList.add('cache'); $('combat').classList.add('cache'); monde.arreter();
    sc.className = 'scene'; $('duBanniere').replaceChildren(); sc.querySelector('.rayons')?.remove(); journalVu = 0;
    const terr = v.arene ? 'arene' : (monde.territoire() || 'arene');
    decor($('duDecor'), terr); ambDu?.arreter(); ambDu = ambiance($('duAmbiance'), terr); fxDu ||= creerFx($('duFx'));
    dessinerSprite($('duSprite'), p.clan, p.classe, 'droite', AP.code(p)); dessinerSprite($('duSpriteAdv'), a.clan, a.classe, 'gauche', a.app || '');
    stopAuraDu?.(); setStopAuraDu(lancerAuras(fxDu, () => [[$('duHeros').querySelector('.combattant'), AP.portee(p).aura], [advDu().querySelector('.combattant'), AP.lireCode(a.app).aura]]));
    delete $('duHeros').querySelector('.jauge').dataset.pv; delete advDu().querySelector('.jauge').dataset.pv;
    regler(sc);
    rejouerAnim($('duHeros'), 'entreeG'); rejouerAnim(advDu(), 'entreeD');
    banniere('duBanniere', `${v.arene ? '🏟️ Arène' : '⚔️ Duel'}<small>${esc(p.nom)} contre ${esc(a.nom)}</small>`, 'rouge', 1300);
    sfx.gong();
  }
  $('duTitre').textContent = v.arene ? `🏟️ Arène — ${a.nom} (${A.rangDe(v.arene.adv).ico} ${v.arene.adv})` : `⚔️ Duel contre ${a.nom}`;
  advDu().querySelector('.nomAdv').innerHTML = `${esc(a.nom)} <span class="badge ${a.clan}">${ELEMENTS[a.clan].ico}</span>`;
  advDu().querySelector('.mainAdv').textContent = '🂠'.repeat(a.nMain);
  // ce qui a changé depuis la dernière vue : on le montre (après le vol de notre carte, s'il y en a un)
  const montrer = async () => {
    if (volDu) await volDu;
    if (vueDu !== v) return;
    if (avant) animerDuel(avant, v);
    majJauge($('duHeros').querySelector('.jauge'), m.pv, m.pvMax, m.bloc);
    majJauge(advDu().querySelector('.jauge'), a.pv, a.pvMax, a.bloc);
    // v87 : l'invocation de chacun, sous ses statuts
    const inv = (x) => (x.allie ? `<span class="invDuel" title="Encaisse les coups et frappe à chaque tour">${x.allie.img && ILLUS.has(x.allie.img) ? `<i class="invPortrait" style="background-image:url(${import.meta.env.BASE_URL}clans/cartes/${x.allie.img}.webp)"></i>` : x.allie.ico} ${esc(x.allie.nom)} ${x.allie.pv}/${x.allie.pvMax} · ⚔ ${x.allie.deg}</span>` : '');
    $('duStatuts').innerHTML = statutsHTML(m) + inv(m); advDu().querySelector('.statuts').innerHTML = statutsHTML(a) + inv(a);
  };
  montrer();
  $('duEnergieTxt').textContent = v.aMoi ? `${m.energie}/${m.energieMax || 3}` : '–';
  $('duEnergie').classList.toggle('vide', !v.aMoi || m.energie === 0);
  const n = m.main.length, nouveauTour = v.aMoi && (!avant || !avant.aMoi || avant.tour !== v.tour);
  $('duMain').innerHTML = m.main.map((k, i) => { const rot = (i - (n - 1) / 2) * 5, dy = Math.abs(i - (n - 1) / 2) * 7; let h = carteHTML(k.id, k.niv); if (k.cout < CARTES[k.id].cout) h = h.replace(`<span class="cc">${CARTES[k.id].cout}</span>`, `<span class="cc reduit">${k.cout}</span>`); return h.replace('class="carte', `style="transform: rotate(${rot}deg) translateY(${dy}px)" data-i="${i}" class="carte ${k.eph ? 'eph' : ''} ${v.aMoi && k.cout <= m.energie ? '' : 'injouable'}`); }).join('');
  $('duMain').querySelectorAll('.carte').forEach((d) => {
    d.onclick = () => { effacerApercuDu(); jouerDuelCarte(+d.dataset.i, d); };
    const ap = m.main[+d.dataset.i]?.ap;
    d.onpointerenter = () => apercuDu(ap); d.onpointerleave = effacerApercuDu; d.onpointerdown = (e) => { if (e.pointerType !== 'mouse') apercuDu(ap); };
  });
  effacerApercuDu();
  if (nouveauTour) { distribuer($('duMain'), $('duEnergie'), premier ? 500 : 0); if (!premier) banniere('duBanniere', 'À toi de jouer !', '', 950); }
  else if (avant && avant.aMoi && !v.aMoi) banniere('duBanniere', `Tour de ${esc(a.nom)}`, 'rouge', 950);
  $('btDuelFin').disabled = !v.aMoi;
  $('btDuelFin').classList.toggle('invite', v.aMoi && !m.main.some((k) => k.cout <= m.energie));
  $('duJournal').innerHTML = v.journal.map((t) => `<p>${esc(t)}</p>`).join('');
  clearInterval(minuterieDu);
  const maj = () => { const s = Math.max(0, Math.ceil((v.limite - Date.now()) / 1000)); $('duTour').className = v.aMoi ? 'moi' : ''; $('duTour').textContent = `${v.aMoi ? 'À toi de jouer !' : `${a.nom} réfléchit…`} · ${s} s`; };
  maj(); minuterieDu = setInterval(maj, 500);
}
// v103 : comme face aux monstres, survoler une carte affiche sur l'adversaire ce qu'elle lui fera
// (calculé par le serveur sur une copie du duel : bouclier, trempé, affaibli, force, marques, invocation)
function effacerApercuDu() { document.querySelectorAll('#duel .apercu').forEach((d) => d.remove()); }
function apercuDu(a) {
  effacerApercuDu(); if (!a) return;
  const adv = advDu().querySelector('.combattant'), moi = $('duHeros').querySelector('.combattant'), mortel = a.deg >= (vueDu?.adv?.pv || Infinity);
  const t = [a.deg && `${mortel ? '☠ ' : ''}−${a.deg}`, a.bloc && `<small>🛡−${a.bloc}</small>`, a.allie && `<small>🐾−${a.allie}</small>`, a.st && `<small>${a.st.map(([s, n]) => `${{ brulure: '🔥', trempe: '💧', affaibli: '🥀', marque: '🎯' }[s]}+${n}`).join(' ')}</small>`].filter(Boolean);
  if (t.length && adv) { const d = document.createElement('div'); d.className = `apercu ${mortel ? 'mortel' : ''}`; d.innerHTML = t.join(' '); adv.append(d); }
  const s = [a.monBloc && `🛡+${a.monBloc}`, a.soin && `❤+${a.soin}`].filter(Boolean);
  if (s.length && moi) { const d = document.createElement('div'); d.className = 'apercu soi'; d.textContent = s.join(' '); moi.append(d); }
}
export function animerDuel(av, v) {
  const sc = $('duel'), fx = fxDu, moiC = $('duHeros').querySelector('.combattant'), advC = advDu().querySelector('.combattant');
  const coup = (z, deg, mien) => { const c = centre(z); fx.entaille(c.x, c.y, mien ? '#ffb040' : '#e8402a', { a: mien ? -0.75 : 2.3, l: deg >= 15 ? 210 : 150 }); fx.eclats(c.x, c.y, mien ? PALETTES.feu : PALETTES.mal, deg >= 15 ? 40 : 22, { vitesse: 280 }); nombre(z, `−${deg}`, `deg${deg >= 15 ? ' gros' : ''}`); };
  // l'adversaire a joué : on affiche les cartes qu'il vient de poser (d'après le journal)
  if (!av.aMoi) {
    const nouvelles = v.journal.filter((t) => !(av.journal || []).includes(t));
    nouvelles.forEach((t, n) => { const mm = /^(.+) joue (.+)\.$/.exec(t); if (mm && mm[1] === v.adv.nom) setTimeout(() => nombre(advC, `🃏 ${mm[2]}`, 'statut', -50), n * 250); });
  }
  const dAdv = av.adv.pv - v.adv.pv, dMoi = av.moi.pv - v.moi.pv;
  if (dAdv > 0) { coup(advC, dAdv, true); rejouerAnim(advDu(), 'touche'); sfx.coup(); const c = centre(advC); fx.etincelles(c.x, c.y, PALETTES.feu, dAdv >= 15 ? 24 : 12); if (dAdv >= 15) { fx.rayons(c.x, c.y, '#ffd060', { n: 12, len: 170 }); impact(sc, v.adv.pv <= 0); } }   // v105
  if (dMoi > 0) {
    if (!av.aMoi) rejouerAnim(advDu(), 'frappe');
    setTimeout(() => { if (dMoi >= 15) impact(sc, false); coup(moiC, dMoi, false); rejouerAnim($('duHeros'), 'touche'); secouer(sc, dMoi >= 10); flash(sc, 'rgba(220,30,20,.3)'); sfx.hurt(); }, av.aMoi ? 0 : 170);
  }
  for (const [qui, z, x, y] of [['moi', moiC, av.moi, v.moi], ['adv', advC, av.adv, v.adv]]) {
    const c = centre(z);
    if (y.bloc > x.bloc && y.bloc > 0) { fx.anneau(c.x, c.y, '#8ac8ff', 95, { ep: 9 }); nombre(z, `+${y.bloc - x.bloc} 🛡`, 'bloc', 20); sfx.bouclier(); }
    if (y.pv > x.pv) { fx.monte(c.x, c.y + 20, PALETTES.soin, 20, 70); nombre(z, `+${y.pv - x.pv}`, 'soin'); sfx.heal(); }
    for (const k of ['brulure', 'trempe', 'affaibli', 'force', 'epines', 'regen']) if ((y[k] || 0) > (x[k] || 0)) nombre(z, `${STATUTS[k]?.ico || ''}+${y[k] - x[k]}`, 'statut', -12);
    if (qui === 'moi' && y.energie > x.energie && v.aMoi && av.aMoi) rejouerAnim($('duEnergie'), 'change');
  }
}
export async function jouerDuelCarte(i, el) {
  if (!vueDu?.aMoi) return toast("Ce n'est pas ton tour.");
  const k = vueDu.moi.main[i]; if (!k || k.cout > vueDu.moi.energie || volDu) return;
  const c = CARTES[k.id], offensive = c.type === 'attaque' || (c.effets && (c.effets.brulure || c.effets.trempe || c.effets.affaibli));
  c.type === 'defense' ? sfx.bouclier() : c.type === 'pouvoir' ? sfx.pouvoir() : sfx.carte(c.element);
  if (c.type === 'attaque') rejouerAnim($('duHeros'), 'frappe');
  room?.send('duelJouer', { i });
  volDu = voler(el, offensive ? advDu().querySelector('.combattant') : $('duHeros').querySelector('.combattant'), c.element, fxDu);
  await volDu; volDu = null;
}
$('btDuelFin').onclick = async () => { if (!vueDu?.aMoi) return; $('btDuelFin').disabled = true; await defausserMain($('duMain'), $('duEnergie')); room?.send('duelFin'); };
$('btDuelAbandon').onclick = () => { if (confirm('Abandonner le duel ? Ton adversaire gagne.')) room?.send('duelAbandon'); };
addEventListener('keydown', (e) => { if (!$('duel').classList.contains('cache') && (e.key === 'e' || e.key === 'E') && vueDu?.aMoi) $('btDuelFin').click(); });
export function fermerDuel() { stopAuraDu?.(); setStopAuraDu(null); clearInterval(minuterieDu); $('duel').classList.add('cache'); vueDu = null; ambDu?.arreter(); ambDu = null; fxDu?.vider(); $('duBanniere').replaceChildren(); $('duel').querySelector('.rayons')?.remove(); }
export async function finDuel(r) {
  const t0 = Date.now();
  // la fin, mise en scène : derniers coups, bannière, rayons, puis le bilan
  const sc = $('duel');
  if (!sc.classList.contains('cache')) {
    if (vueDu && r.vue) { animerDuel(vueDu, r.vue); majJauge($('duHeros').querySelector('.jauge'), r.vue.moi.pv, r.vue.moi.pvMax, r.vue.moi.bloc); majJauge(advDu().querySelector('.jauge'), r.vue.adv.pv, r.vue.adv.pvMax, r.vue.adv.bloc); }
    clearInterval(minuterieDu); $('duMain').innerHTML = ''; $('btDuelFin').disabled = true;
    const gagne = r.issue === 'victoire';
    sc.classList.add('finie', gagne ? 'gagne' : r.issue === 'defaite' ? 'perdu' : 'nul');
    if (gagne) { const ry = document.createElement('div'); ry.className = 'rayons'; sc.append(ry); fxDu?.eclats(innerWidth / 2, innerHeight * 0.42, PALETTES.or, 70, { vitesse: 420, g: 260, taille: 5, vie: 1.4 }); }
    banniere('duBanniere', { victoire: 'Victoire !', defaite: 'Défaite…', nul: 'Égalité' }[r.issue], `fin ${gagne ? 'victoire' : 'defaite'}`, 0);
    r.issue === 'victoire' ? sfx.fanfare() : r.issue === 'defaite' ? sfx.defaite() : sfx.tick();
    await pause(1700);
  }
  fermerDuel();
  if (r.issue === 'defaite' && r.raison !== 'depart') etourdir(Math.max(1, 10 - (Date.now() - t0) / 1000));   // v84
  const titre = { victoire: '🏆 Victoire !', defaite: '💀 Défaite', nul: '🤝 Égalité' }[r.issue];
  const raison = r.raison === 'abandon' ? (r.issue === 'victoire' ? `${esc(r.adv)} a abandonné.` : 'Tu as abandonné.') : r.raison === 'depart' ? `${esc(r.adv)} a pris la fuite.` : '';
  if (r.arene) return finArene(r, titre, raison);
  ouvrir(`<h2>${titre}</h2><p>Duel contre <b>${esc(r.adv)}</b>. ${raison}</p>
    <p class="recolte">${r.butin > 0 ? `Tu remportes <b>${nf(r.butin)} ${ICO_RESS.essence}</b> de son essence.` : r.butin < 0 ? `Tu perds <b>${nf(-r.butin)} ${ICO_RESS.essence}</b>.` : 'Personne ne perd rien.'}</p>
    <p class="cout">Après un duel, tu es protégé 2 minutes. Bilan : ${p.duels.gagnes} victoire${p.duels.gagnes > 1 ? 's' : ''}, ${p.duels.perdus} défaite${p.duels.perdus > 1 ? 's' : ''}.</p>
    <button class="bouton" id="btOk">Retour au monde</button>`, () => { $('btOk').onclick = fermer; });
}
