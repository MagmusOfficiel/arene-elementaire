// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la fenêtre du passe de saison (v54)
//  Les règles sont dans shared/clans/passe.js. L'XP est donnée par le
//  serveur à chaque activité ; ici on l'affiche et on réclame.
// =====================================================================
import { RARES } from '../../../shared/clans/cartes.js';
import * as AP from '../../../shared/clans/apparence.js';
import * as PS from '../../../shared/clans/passe.js';
import { saisonDe } from '../../../shared/clans/arene.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, esc, nf, p, toast } from './ui-commun.js';
import { dansMonde, guide, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { codeAvec, dureeAvant, vignette } from './ui-fenetres.js';

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const nomSaison = (id) => { const [a, m] = id.split('-').map(Number); return `${NOMS_MOIS[m - 1]} ${a}`; };
// l'état du passe tel que le joueur le voit (une saison qui vient de commencer : niveau 0)
const etat = () => (p.passe?.s === saisonDe().id ? p.passe : { s: saisonDe().id, xp: 0, recu: [] });
const texteRec = (r) => [r.essence && `${nf(r.essence)} ✨`, r.eclats && `${r.eclats} 💠`, r.rare && `${r.rare} ${ICO_RESS[RARES[p.clan].id]}`, r.piece && `🎨 ${esc(AP.PIECES[r.piece].nom)}`].filter(Boolean).join(' + ');

export function fenetrePasse() {
  guide.vu('a_passe');
  const x = etat(), niv = PS.niveauDe(x.xp), lot = PS.lotDe(x.s), dans = x.xp - niv * PS.XP_NIVEAU, fini = niv >= PS.NIVEAUX, n = PS.aReclamer(p);
  ouvrir(`<h2>🎟️ Passe de saison — ${esc(nomSaison(x.s))}</h2>
    <p class="sousTitre">Gratuit pour tous : chaque activité fait gagner de l'XP. 30 niveaux, ${PS.XP_NIVEAU} XP chacun. La saison se termine dans <b>${dureeAvant(PS.finSaison())}</b> (les récompenses atteintes et pas réclamées sont données d'office). Ce mois-ci, le lot exclusif est « <b>${esc(lot.nom)}</b> » : une tenue, une couleur de cheveux et une aura, introuvables ailleurs.</p>
    <div class="passeHaut">
      <div class="passeNiv"><b>${niv}</b><small>/ ${PS.NIVEAUX}</small></div>
      <div class="passeJauge"><div class="barre"><i style="width:${fini ? 100 : (dans / PS.XP_NIVEAU) * 100}%"></i><b>${fini ? 'Passe terminé ! Bravo.' : `${nf(dans)} / ${PS.XP_NIVEAU} XP vers le niveau ${niv + 1}`}</b></div><small>${esc(PS.XP_TXT)}.</small></div>
      <button class="bouton" id="btPasseRec" ${n ? '' : 'disabled'}>${n ? `Réclamer (${n})` : 'Rien à réclamer'}</button>
    </div>
    <div class="passeExclu">${lot.pieces.map((id, i) => `<div class="piece ${AP.possede(p, id) ? '' : 'pas'}" data-id="${id}"><div class="vig"></div><b>${esc(AP.PIECES[id].nom)}</b><small>${AP.possede(p, id) ? '✓ à toi' : `niveau ${[20, 10, 30][i]}`}</small></div>`).join('')}</div>
    <div class="passePiste">${Array.from({ length: PS.NIVEAUX }, (_, i) => {
      const k = i + 1, r = PS.recompense(k, x.s), recu = x.recu.includes(k), atteint = k <= niv;
      return `<div class="pnv ${recu ? 'recu' : atteint ? 'pret' : ''} ${r.piece ? 'exclu' : ''}"><span>${k}</span><small>${texteRec(r)}</small>${recu ? '<i>✓</i>' : ''}</div>`;
    }).join('')}</div>`, () => {
    $('fenetreCorps').dataset.vue = 'passe';
    $('fenetreCorps').querySelectorAll('.passeExclu .piece').forEach((d) => d.querySelector('.vig').append(vignette(codeAvec(d.dataset.id), 'bas')));
    $('fenetreCorps').querySelector('.pnv.pret')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('btPasseRec').onclick = async () => {
      const r = await faire('passeReclamer'); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      const t = r.res; sfx.fanfare();
      toast(`🎟️ ${[t.essence && `+${nf(t.essence)} ✨`, t.eclats && `+${t.eclats} 💠`, t.rare && `+${t.rare} ${ICO_RESS[RARES[p.clan].id]}`].filter(Boolean).join(' · ')}${t.pieces.length ? ` · 🎨 ${t.pieces.map((id) => esc(AP.PIECES[id].nom)).join(', ')} (bouton 👕)` : ''}`);
      fenetrePasse();
    };
  });
}

// à chaque profil reçu : la pastille du bouton, et une annonce quand on monte de niveau
let nivVu = null;
export function suivrePasse() {
  if (!p) return;
  const niv = PS.niveauDe(etat().xp), n = PS.aReclamer(p), el = $('pastilleP');
  if (el) { el.textContent = n; el.classList.toggle('cache', !n); }
  if (nivVu !== null && niv > nivVu) { sfx.niveau(); toast(`🎟️ Passe de saison : <b>niveau ${niv}</b> ! Récompense à réclamer (bouton 🎟️ ou touche P).`); }
  nivVu = niv;
  if (!$('fenetre').classList.contains('cache') && $('fenetreCorps').dataset.vue === 'passe') fenetrePasse();
}
$('btPasse').onclick = () => fenetrePasse();
addEventListener('keydown', (e) => { if ((e.key === 'p' || e.key === 'P') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) fenetrePasse(); });
