// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le classement des clans, les sanctuaires et l’arène
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { ELEMENTS, CLANS, CLASSES } from '../../../shared/clans/cartes.js';
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import { POINTS, NOMS_CLANS } from '../../../shared/clans/mondial.js';
import * as Q from '../../../shared/clans/quetes.js';
import * as T from '../../../shared/clans/territoires.js';
import * as A from '../../../shared/clans/arene.js';
import { sfx } from '../sfx.js';
import { $, esc, nf, p, room, toast } from './ui-commun.js';
import { dureeAvant } from './ui-fenetres.js';
import { dansMonde, fermer, monde, ouvrir } from './ui-monde.js';
import { ajouterChat } from './ui-reseau.js';

export function fenetreClassement() {
  if (!room) return toast('Le classement des clans vit dans le monde en ligne : connexion au serveur…');
  ouvrir('<h2>🏆 Rivalité des clans</h2><p class="sousTitre">Chargement…</p>');
  $('fenetreCorps').dataset.vue = 'classement';
  room.send('classement');
}
export function afficherClassement(c) {
  if ($('fenetre').classList.contains('cache') || $('fenetreCorps').dataset.vue !== 'classement') return;
  const total = Math.max(1, ...Object.values(c.clans)), ordre = CLANS.slice().sort((a, b) => c.clans[b] - c.clans[a]);
  const reste = Math.max(0, c.fin - Date.now()), j = Math.floor(reste / 864e5), h = Math.floor((reste % 864e5) / 36e5);
  ouvrir(`<h2>🏆 Rivalité des clans</h2>
    <p class="sousTitre">Saison de la semaine · fin dans ${j} j ${h} h. Le clan en tête devient <b>champion 👑</b> pour la semaine suivante.${c.champion ? ` Champion actuel : <b class="${c.champion}">${ELEMENTS[c.champion].ico} ${NOMS_CLANS[c.champion]}</b>.` : ''}</p>
    <div class="classClans">${ordre.map((k, i) => `<div class="ligneClan ${k}"><span class="rangC">${['🥇', '🥈', '🥉'][i]}</span><b>${ELEMENTS[k].ico} ${NOMS_CLANS[k]}${k === p.clan ? ' (toi)' : ''}</b><span class="jauge"><i style="width:${(c.clans[k] / total) * 100}%"></i></span><em>${nf(c.clans[k])} pts</em></div>`).join('')}</div>
    <h3>🏳️ Sanctuaires</h3>
    <div class="sanctListe">${T.SANCTUAIRES.map((d) => { const st = sanctEtat.find((x) => x.id === d.id) || { prop: d.terr }; return `<div class="sanct ${st.prop}"><b>${esc(d.nom)}</b><small>${TERRITOIRES[d.terr].nom}</small><span>${ELEMENTS[st.prop].ico} ${NOMS_CLANS[st.prop]}${st.conteste ? ' · ⚔ contesté' : st.capt ? ` · capture ${ELEMENTS[st.capt.clan].ico} ${st.capt.p} %` : ''}</span></div>`; }).join('')}</div>
    <p class="cout">Chaque sanctuaire tenu : <b>+${Math.round(T.CAPTURE.bonus * 100)} %</b> de production pour toutes les parcelles du clan, et ${POINTS.sanctuaire} point au clan toutes les 10 minutes.</p>
    <h3>Meilleurs joueurs de la semaine</h3>
    <ol class="topJoueurs">${c.joueurs.length ? c.joueurs.map((x) => `<li class="${x.clan}${x.nom === p.nom && x.clan === p.clan ? ' moi' : ''}"><span>${ELEMENTS[x.clan].ico} ${esc(x.nom)}</span><em>${nf(x.pts)} pts</em></li>`).join('') : '<li>Personne encore : à toi de lancer la saison !</li>'}</ol>
    <h3>Comment gagner des points</h3>
    <ul class="commentPts"><li>⚔️ Victoire en duel : <b>${POINTS.duel}</b></li><li>💎 Filon rare ramassé : <b>${POINTS.filon}</b></li><li>👑 Boss d'expédition vaincu : <b>${POINTS.bossExpe}</b></li><li>☠ Boss mondial : <b>1</b> pt tous les ${POINTS.mondialPar} dégâts, <b>+${POINTS.mondialFin}</b> s'il tombe, <b>+${POINTS.mondialTop}</b> pour le meilleur</li><li>🏳️ Prise d'un sanctuaire : <b>${POINTS.capture}</b> pour chaque joueur présent</li><li>🏟️ Victoire en arène : <b>${POINTS.arene}</b> (<b>${POINTS.areneReflet}</b> contre un Reflet)</li><li>📜 Quête réclamée : <b>${POINTS.quete}</b> (<b>${POINTS.queteSemaine}</b> pour une quête de la semaine)</li></ul>
    ${c.palmares?.length ? `<h3>Palmarès</h3><p class="cout">${c.palmares.map((x) => `Semaine du ${x.semaine.split('-').reverse().join('/')} : ${ELEMENTS[x.champion].ico} ${NOMS_CLANS[x.champion]}`).join(' · ')}</p>` : ''}`);
  $('fenetreCorps').dataset.vue = 'classement';
}
$('btClassement').onclick = fenetreClassement;
export let sanctEtat = [];
export const propsSanct = () => Object.fromEntries(T.SANCTUAIRES.map((d) => [d.id, sanctEtat.find((x) => x.id === d.id)?.prop || d.terr]));
setInterval(() => {
  const b = $('bandeauSanct'); if (!b || !dansMonde || !p) return;
  const j = monde.joueur, d = j && T.sanctuaireEn(j.x, j.y);
  if (!d || !$('combat').classList.contains('cache') || !$('duel').classList.contains('cache')) return b.classList.add('cache');
  const st = sanctEtat.find((x) => x.id === d.id) || { prop: d.terr }, eux = (c) => NOMS_CLANS[c];
  let t, cls = '';
  if (st.conteste) { t = `⚔ ${d.nom} contesté ! Chasse les autres clans du cercle.`; cls = 'alerte'; }
  else if (st.prop === p.clan) t = st.capt ? `🛡️ Tu défends le ${d.nom} : la capture du ${eux(st.capt.clan)} retombe (${st.capt.p} %).` : `🏳️ ${d.nom} — tenu par ton clan (+${Math.round(T.CAPTURE.bonus * 100)} % de production).`;
  else if (st.capt?.clan === p.clan) { t = `🏳️ Capture du ${d.nom} : <b>${st.capt.p} %</b> — reste dans le cercle !`; cls = 'capture'; }
  else if (st.capt) t = `Efface d'abord la capture du ${eux(st.capt.clan)} : ${st.capt.p} %…`;
  else t = `🏳️ Reste dans le cercle pour prendre le ${d.nom} au ${eux(st.prop)}.`;
  b.className = cls; b.innerHTML = t;
}, 300);
export let alerteCible = null, alerteFin = 0;
export function cibleAlerte() {
  if (!alerteCible || Date.now() > alerteFin) return (alerteCible = null);
  const j = monde.joueur; if (j && Math.hypot(j.x - alerteCible.x, j.y - alerteCible.y) < 90) return (alerteCible = null);
  return alerteCible;
}
export function alerteSanctuaire(m) {
  const b = $('alerteSanct'); sfx.gong?.();
  b.innerHTML = `⚠️ Le <b>${NOMS_CLANS[m.par]}</b> attaque le <b>${esc(m.nom)}</b>${m.n > 1 ? ` (${m.n} joueurs)` : ''} ! <button id="btYAller">📍 Y aller</button><button id="btAlerteX" title="Fermer">✕</button>`;
  b.classList.remove('cache');
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.add('cache'), 15000);
  $('btYAller').onclick = () => { alerteCible = { x: m.x, y: m.y, nom: m.nom }; alerteFin = Date.now() + 120000; b.classList.add('cache'); };
  $('btAlerteX').onclick = () => b.classList.add('cache');
  ajouterChat({ systeme: true, t: `⚠️ Le ${NOMS_CLANS[m.par]} attaque le ${m.nom} !` });
}
export let enFile = null, classArene = null;
export const vueFenetre = () => (!$('fenetre').classList.contains('cache') && $('fenetreCorps').dataset.vue) || '';
export const monArene = () => p.arene || A.nouvelleArene();
export function majBandeauArene() {
  const b = $('bandeauArene'); if (!enFile) return b.classList.add('cache');
  const s = Math.floor((Date.now() - enFile) / 1000);
  b.classList.remove('cache'); b.innerHTML = `🏟️ Recherche d'un adversaire… <b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b> <button id="btAnnulerArene">Annuler</button>`;
  $('btAnnulerArene').onclick = () => room?.send('areneFile', { en: false });
}
setInterval(() => { if (enFile) majBandeauArene(); }, 1000);
export function fenetreArene(demander = true) {
  if (!room) return toast('L’arène vit dans le monde en ligne : connexion au serveur…');
  if (demander) room.send('areneClassement');
  const a = monArene(), r = A.rangDe(a.elo), suivant = A.RANGS[A.RANGS.indexOf(r) + 1], fin = A.saisonDe().fin;
  const c = classArene;
  ouvrir(`<h2>🏟️ Arène classée</h2>
    <p class="sousTitre">Des duels à distance contre des joueurs de ton niveau, où que tu sois. Si personne n'est libre, tu affrontes un <b>Reflet</b> : le deck d'un vrai joueur, joué par le serveur (Elo compté à moitié). Saison du mois · fin dans ${dureeAvant(fin)}.</p>
    <div class="areneMoi"><span class="rangGros">${r.ico}</span><div><b>${r.nom}</b> · <b>${a.elo}</b> Elo${suivant ? ` <small>(${suivant.ico} ${suivant.nom} à ${suivant.min})</small>` : ''}<br><small>${a.v} victoire${a.v > 1 ? 's' : ''} · ${a.d} défaite${a.d > 1 ? 's' : ''} · meilleur : ${a.meilleur}${c?.rang ? ` · ${c.rang}ᵉ sur ${c.total}` : ''}</small><br><small>Parties payées aujourd'hui : ${a.jour === Q.jourDe() ? a.payees : 0} / ${A.ARENE.partiesPayeesParJour} (+${A.ARENE.gainVictoire.essence} ✨ par victoire, +${A.ARENE.gainDefaite.essence} ✨ par défaite)</small></div>
      ${enFile ? '<button class="bouton" id="btFile">Annuler la recherche</button>' : '<button class="bouton grosBouton" id="btFile">⚔️ Chercher un adversaire</button>'}</div>
    <h3>Récompenses de fin de saison <small class="qTemps">selon le meilleur rang atteint</small></h3>
    <div class="rangsArene">${A.RANGS.map((x) => `<div class="${x === r ? 'actuel' : ''}"><span>${x.ico}</span><b>${x.nom}</b><small>${x.min ? `${x.min}+` : '—'}</small><em>${nf(x.rec.essence)} ✨ · ${x.rec.eclats} 💠</em></div>`).join('')}</div>
    <h3>Meilleurs joueurs de la saison</h3>
    ${c ? `<ol class="topJoueurs">${c.top.length ? c.top.map((x) => `<li class="${x.clan}${x.nom === p.nom && x.clan === p.clan ? ' moi' : ''}"><span>${A.rangDe(x.elo).ico} ${esc(x.nom)} <small>${CLASSES[x.classe]?.ico || ''}</small></span><em>${x.elo} · ${x.v}V ${x.d}D</em></li>`).join('') : '<li>Personne encore : à toi d’ouvrir la saison !</li>'}</ol>
      ${c.palmares?.length ? `<p class="cout">Saisons passées : ${c.palmares.map((s2) => `${s2.saison} : ${s2.top.map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.nom)}`).join(' ')}`).join(' · ')}</p>` : ''}` : '<p class="sousTitre">Chargement…</p>'}`, () => {
    $('btFile').onclick = () => { if (p.expedition) return toast('Termine d’abord ton expédition.'); room?.send('areneFile', { en: !enFile }); };
  });
  $('fenetreCorps').dataset.vue = 'arene';
}
$('btArene').onclick = () => fenetreArene();
export function finArene(r, titre, raison) {
  const a = r.arene, monte = a.delta >= 0;
  ouvrir(`<h2>${titre}</h2><p>Arène contre <b>${esc(r.adv)}</b>. ${raison}</p>
    <div class="areneMoi"><span class="rangGros">${a.rang.ico}</span><div><b>${a.rang.nom}</b> · <b>${a.elo}</b> Elo <b class="${monte ? 'gain' : 'perte'}">${monte ? '+' : ''}${a.delta}</b><br><small>${a.gain.essence ? `+${a.gain.essence} ✨${a.gain.eclats ? ` · +${a.gain.eclats} 💠` : ''}` : 'Plus de récompenses pour aujourd’hui (le classement compte toujours).'}</small></div></div>
    <div class="boutons"><button class="bouton" id="btRejouer">⚔️ Rejouer</button> <button class="bouton" id="btOk">Retour au monde</button></div>`, () => {
    $('btOk').onclick = fermer; $('btRejouer').onclick = () => { fermer(); room?.send('areneFile', { en: true }); };
  });
}

// pour modifier ces variables depuis les autres modules
export const setSanctEtat = (v) => (sanctEtat = v);
export const setEnFile = (v) => (enFile = v);
export const setClassArene = (v) => (classArene = v);
