// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la Tour infinie (v91)
//  Des étages sans fin (v99) de 5 monstres ; un boss et ses gardes tous les 10 étages.
// =====================================================================
import * as T from '../../../shared/clans/tour.js';
import { PIECES } from '../../../shared/clans/apparence.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, ILLUS_MONSTRES, esc, niveau, p, room, toast } from './ui-commun.js';
import { ELEMENTS, CLASSES } from '../../../shared/clans/cartes.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { lancerCombat } from './ui-combat.js';

const portrait = (m) => (ILLUS_MONSTRES.has(m.id)
  ? `<img src="${import.meta.env.BASE_URL}clans/monstres/${m.id}.webp" alt="" loading="lazy">`
  : `<span class="tourIco">${m.ico}</span>`);
const recHTML = (r) => [`+${r.essence} ${ICO_RESS.essence}`, r.eclats ? `+${r.eclats} ${ICO_RESS.eclats}` : '', r.rare ? `+${r.rare.n} ${ICO_RESS[r.rare.id] || ''}` : '', r.eclat_vide ? `+${r.eclat_vide} ${ICO_RESS.eclat_vide}` : '', r.piece ? `👕 ${esc(PIECES[r.piece].nom)}` : ''].filter(Boolean).join(' · ');

// v92 : le classement du mois (envoyé par le serveur)
let classTour = null;
export function recevoirClassement(c) { classTour = c; if ($('fenetreCorps').dataset.vue === 'tour' && !$('fenetre').classList.contains('cache')) fenetreTour(false); }
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const nomSaison = (s) => { const [a, m] = String(s || '').split('-'); return m ? `${MOIS[+m - 1]} ${a}` : ''; };
function classementHTML() {
  const c = classTour;
  if (!c) return '<p class="sousTitre">Chargement du classement…</p>';
  const jours = Math.max(0, Math.ceil((c.fin - Date.now()) / 864e5));
  const lignes = c.top.length ? c.top.map((e, i) => `<li class="${i < 3 ? 'podium' : ''}"><span class="rangT">${['🥇', '🥈', '🥉'][i] || i + 1}</span> ${ELEMENTS[e.clan]?.ico || ''} ${CLASSES[e.classe]?.ico || ''} <b>${esc(e.nom)}</b> <span class="etageT">étage ${e.etage}</span></li>`).join('') : '<li>Personne n’a encore grimpé ce mois-ci. À toi !</li>';
  const pal = (c.palmares || [])[0];
  return `<h3>🏆 Classement de ${nomSaison(c.saison)} <small>· remise à zéro dans ${jours} jour${jours > 1 ? 's' : ''}</small></h3>
    <ol class="classeTour">${lignes}</ol>
    <p class="cout">${c.rang ? `Ta place : <b>${c.rang}</b> sur ${c.total}` : 'Gagne un étage pour entrer au classement.'}</p>
    ${pal ? `<p class="cout">Mois dernier (${nomSaison(pal.saison)}) : ${pal.top.map((e, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(e.nom)} (${e.etage})`).join(' · ')}</p>` : ''}`;
}
export function fenetreTour(demander = true) {
  if (!p) return;
  if (demander) room?.send('tourClassement');
  T.majSaison(p);
  const max = T.etageMax(p), n = T.prochain(p), fini = false, ok = niveau() >= T.NIV_TOUR;
  const ens = T.ennemisEtage(n), boss = T.estBoss(n);
  // la frise : les 10 étages de la dizaine en cours
  const base = Math.floor((n - 1) / 10) * 10;
  const frise = Array.from({ length: 10 }, (_, k) => { const e = base + 10 - k; return `<div class="tourEtage ${e <= max ? 'fait' : e === n ? 'actuel' : ''} ${T.estBoss(e) ? 'boss' : ''}"><b>${e}</b>${T.estBoss(e) ? ' 👑' : ''}${T.COSMETIQUES[e] ? ' 👕' : ''}</div>`; }).join('');
  const rec = T.record(p), cosm = Object.entries(T.COSMETIQUES).map(([e, id]) => `<li class="${rec >= +e ? 'fait' : ''}">${rec >= +e ? '✅' : '🔒'} Étage <b>${e}</b> : ${esc(PIECES[id].nom)}</li>`).join('') + `<li class="${rec >= 100 ? 'fait' : ''}">${rec >= 100 ? '✅' : '🔒'} Étage <b>100</b> : monture 🐲 <b>Wyrm de la Tour</b></li>`
    + [[125, 'Au-delà du ciel'], [150, 'Gardien de l’Infini'], [200, 'Légende de la Tour']].map(([e, t]) => `<li class="${rec >= e ? 'fait' : ''}">${rec >= e ? '✅' : '🔒'} Étage <b>${e}</b> : titre 🌌 « ${t} »</li>`).join('');
  ouvrir(`<div class="tour">
    <h2>🗼 Tour infinie <small>· ce mois-ci : étage ${max}${max >= 100 ? ' 🌌 au-delà du sommet' : ''} · record : ${T.record(p)}</small></h2>
    <p class="sousTitre">Chaque étage, <b>5 monstres</b> à la fois : les cartes qui touchent <b>tous les ennemis</b> font la différence. Tous les 10 étages, un <b>boss</b> et ses gardes. PV pleins à chaque étage, essais illimités. Les étages sont les mêmes pour tout le monde. <b>La Tour se remet à zéro chaque mois</b> : on regrimpe et on regagne les récompenses d’étage (les cosmétiques débloqués restent à toi).</p>
    <div class="tourCorps">
      <div class="tourFrise">${frise}</div>
      <div class="tourDroite">
        ${fini ? '<p class="tourFini">🏆 Tu as conquis les 100 étages ce mois-ci. Respect. Rendez-vous au début du mois prochain !</p>' : `
        <h3>${boss ? '👑 ' : ''}Étage ${n}${boss ? ' — boss' : ''}</h3>
        <div class="tourEnnemis">${ens.map((m) => `<div class="tourEnnemi ${m.rang === 'boss' ? 'chef' : ''}" title="${esc(m.nom)}">${portrait(m)}<small>${esc(m.nom)}</small></div>`).join('')}</div>
        <p class="cout">Récompense : ${recHTML(T.recompense(n, p.clan))}</p>
        ${ok ? '<button class="bouton" id="btMonter">⚔️ Monter à l’étage ' + n + '</button>' : `<p class="raison">La Tour s’ouvre au <b>niveau ${T.NIV_TOUR}</b>.</p>`}`}
        <h3>Récompenses de la Tour <small>(selon ton record)</small></h3><ul class="tourCosm">${cosm}</ul>
        ${classementHTML()}
      </div>
    </div>
  </div>`);
  $('fenetreCorps').dataset.vue = 'tour';
  const bt = $('btMonter');
  if (bt) bt.onclick = async () => {
    bt.disabled = true;
    const r = await faire('tourDebut', {});
    if (!r.ok) { bt.disabled = false; return toast(esc(r.raison || 'Impossible.')); }
    p.tour = { ...(p.tour || { max: 0 }), essai: { etage: r.res.etage, graine: r.res.graine } };
    lancerCombat({ ...T.defEtage(p), graine: r.res.graine }, 'tour');
  };
}
export function apresEtage(rep) {
  if (!rep?.ok) { toast(esc(rep?.raison || 'Étage refusé par le serveur.')); return fenetreTour(); }
  const r = rep.res;
  if (r.victoire) { sfx.fanfare?.(); toast(`🗼 Étage ${r.etage} conquis ! ${recHTML(r.rec)}`); }
  else toast(`💀 L’étage ${r.etage} t’a eu. Pense aux sorts de zone, et retente !`);
  setTimeout(fenetreTour, 400);
}
$('btTour').onclick = () => { menuBarre(false); fenetreTour(); };
addEventListener('keydown', (e) => { if ((e.key === 't' || e.key === 'T') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) { menuBarre(false); fenetreTour(); } });
