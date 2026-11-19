// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les projets de clan (v52)
//  Un grand ouvrage par semaine au centre de chaque village (Forge géante,
//  Phare des marées, Arbre-monde). Les membres y donnent essence et
//  matériau ; terminé, il donne un bonus à tout le clan la semaine suivante.
//  Le serveur tient les comptes (shared/clans/projets.js) ; ici, la fenêtre.
// =====================================================================
import { ELEMENTS } from '../../../shared/clans/cartes.js';
import * as PJ from '../../../shared/clans/projets.js';
import { NOMS_CLANS } from '../../../shared/clans/mondial.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, esc, nf, p, toast } from './ui-commun.js';
import { guide, monde, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { dureeAvant } from './ui-fenetres.js';

export let projets = null;   // ce que le serveur montre (PJ.vue)
export function majProjets(v) {
  projets = v; monde.majProjets(v);
  if (!$('fenetre').classList.contains('cache') && $('fenetreCorps').dataset.vue === 'projet') fenetreProjet();
}
// le bonus de mon clan cette semaine (0 si aucun) ; cle : 'remise' | 'butin' | 'production'
export const bonusProjet = (cle) => (p ? PJ.bonusDe(projets, p.clan, cle) : 0);

const DONS = [{ essence: 100 }, { essence: 500 }, { essence: 2000 }, { materiau: 10 }, { materiau: 50 }, { materiau: 200 }];
export function fenetreProjet() {
  if (!p || !projets) return toast('Le chantier se prépare…');
  guide.vu('a_projet');
  const k = p.clan, def = PJ.PROJETS[k], pr = projets.clans[k], km = PJ.MATERIAUX[k];
  const pc = Math.min(100, (pr.pts / pr.objectif) * 100), fini = pr.pts >= pr.objectif, moi = p.projet?.s === projets.semaine ? p.projet.pts : 0;
  const actif = PJ.bonusActif(projets, k);
  const peut = (d) => (d.essence || 0) <= p.ress.essence && (d.materiau || 0) <= (p.ress[km] || 0);
  const autres = Object.keys(PJ.PROJETS).filter((c) => c !== k);
  ouvrir(`<h2>${def.ico} ${esc(def.nom)} — projet du ${esc(NOMS_CLANS[k])}</h2>
    <p class="sousTitre">Chaque semaine, ton clan construit cet ouvrage au centre du village. Tous les membres y donnent de l'essence ✨ et des ${esc(ELEMENTS[k].nomMat.toLowerCase())} ${ICO_RESS[km]} (10 ✨ = 1 point, 1 ${ICO_RESS[km]} = 1 point). S'il est terminé avant lundi, <b>tout le clan</b> en profite la semaine suivante : <b>${esc(def.bonus.toLowerCase())}</b>.</p>
    ${actif ? `<p class="projetActif">✅ Cette semaine, ton clan profite déjà de l'ouvrage de la semaine dernière : ${esc(def.bonus.toLowerCase())}.</p>` : ''}
    <div class="projet ${k}">
      <div class="barre projetBarre"><i style="width:${pc.toFixed(1)}%"></i><b>${nf(pr.pts)} / ${nf(pr.objectif)} points${fini ? ' — terminé ✓' : ''}</b></div>
      <p>Étape <b>${pr.etape + 1} / ${PJ.ETAPES}</b> · ${pr.n} donateur${pr.n > 1 ? 's' : ''} · fin de la semaine dans <b>${dureeAvant(projets.fin)}</b> · ta part : <b>${nf(moi)}</b> point${moi > 1 ? 's' : ''}</p>
      ${fini ? '<p class="projetActif">🎉 Terminé ! Le bonus sera actif toute la semaine prochaine. Tu peux continuer à donner pour le classement des donateurs et les points du clan.</p>' : ''}
      <div class="dons">${DONS.map((d, i) => `<button class="bouton" data-don="${i}" ${peut(d) ? '' : 'disabled'}>Donner ${d.essence ? `${nf(d.essence)} ✨` : `${nf(d.materiau)} ${ICO_RESS[km]}`}</button>`).join('')}</div>
      <p class="cout">Tu as ${nf(p.ress.essence)} ✨ et ${nf(p.ress[km] || 0)} ${ICO_RESS[km]}.</p>
    </div>
    <div class="projetBas">
      <div><h3>🏅 Meilleurs donateurs</h3>${pr.top.length ? `<ol>${pr.top.map(([n, v]) => `<li>${esc(n)} — ${nf(v)}</li>`).join('')}</ol>` : '<p>Personne encore : sois le premier !</p>'}</div>
      <div><h3>Les autres clans</h3>${autres.map((c) => { const o = projets.clans[c]; return `<p>${PJ.PROJETS[c].ico} ${esc(PJ.PROJETS[c].nom)} (${ELEMENTS[c].ico}) : <b>${Math.min(100, Math.floor((o.pts / o.objectif) * 100))} %</b>${PJ.bonusActif(projets, c) ? ' · bonus actif' : ''}</p>`; }).join('')}</div>
    </div>`, () => {
    $('fenetreCorps').dataset.vue = 'projet';
    $('fenetreCorps').querySelectorAll('[data-don]').forEach((b) => b.onclick = async () => {
      const r = await faire('projetDonner', DONS[+b.dataset.don]);
      if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.orb();
      toast(r.res.termine ? `🎉 <b>${esc(def.nom)} terminé !</b> Bonus pour tout le clan la semaine prochaine.` : `+${nf(r.res.pts)} points pour le ${esc(def.nom)}${r.res.monte ? ' — il grandit !' : ''}`);
      fenetreProjet();
    });
  });
}
