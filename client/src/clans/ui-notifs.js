// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — historique des messages et fête du niveau (v83)
// =====================================================================
import * as P from '../../../shared/clans/profil.js';
import { NIV_ASCENSION } from '../../../shared/clans/cartes.js';
import { sfx } from '../sfx.js';
import { $, esc, historique, majCloche } from './ui-commun.js';
import { ouvrir } from './ui-monde.js';

const ilYA = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'à l’instant' : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`; };
export function fenetreNotifs() {
  majCloche(true);
  ouvrir(`<h2>🔔 Derniers messages</h2>${historique.length ? `<div class="notifs">${historique.map((x) => `<div class="notif">${x.t}<small>${ilYA(x.quand)}</small></div>`).join('')}</div>` : '<p class="sousTitre">Aucun message pour l’instant.</p>'}`);
}
$('btNotifs').onclick = fenetreNotifs;

// ---------- la fête du niveau : grande animation au centre, on clique au travers ----------
const PALIERS = { 5: 'Nouveaux décors à la boutique', [NIV_ASCENSION]: 'L’Ascension est débloquée : choisis ta branche !', [P.NIVEAU_MAX]: 'Niveau maximum atteint !' };
export function feteNiveau(n) {
  const d = document.createElement('div');
  d.className = 'feteNiveau';
  d.innerHTML = `<div class="fnRayons"></div><div class="fnCarte"><small>Niveau supérieur</small><b>${n}</b>${PALIERS[n] ? `<em>${esc(PALIERS[n])}</em>` : ''}</div>
    ${Array.from({ length: 22 }, (_, i) => `<i style="--a:${(i * 360) / 22}deg;--d:${120 + (i % 5) * 30}px;--t:${0.6 + (i % 4) * 0.15}s"></i>`).join('')}`;
  document.body.append(d);
  sfx.niveau(); setTimeout(() => sfx.fanfare?.(), 250);
  setTimeout(() => d.remove(), 3200);
}
