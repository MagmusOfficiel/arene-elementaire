// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la fenêtre des familiers (v53)
//  Les règles sont dans shared/clans/familiers.js ; le dessin dans familiersArt.js.
// =====================================================================
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import * as F from '../../../shared/clans/familiers.js';
import { sfx } from '../sfx.js';
import { $, coutHTML, esc, p, toast } from './ui-commun.js';
import { dansMonde, guide, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { vignetteFamilier } from './familiersArt.js';

export function fenetreFamiliers() {
  guide.vu('a_familiers');
  const l = F.possedes(p), actif = F.actif(p);
  ouvrir(`<h2>🐾 Tes familiers</h2>
    <p class="sousTitre">Un familier te suit sur la carte et t'accompagne dans les combats contre les monstres (expéditions et boss mondial, jamais en duel ni dans l'arène). Au début de chaque combat, il te donne un petit coup de pouce. On en trouve en battant le boss d'un territoire (${F.CHANCE_BOSS.map((x) => `${x * 100} %`).join(' / ')} de chances selon le palier), ou on les fabrique avec les ressources rares du territoire.</p>
    <div class="familiers">${F.IDS.map((id) => {
      const f = F.FAMILIERS[id], a = l.includes(id), cout = F.coutFabrication(id);
      return `<div class="fam ${f.terr} ${a ? '' : 'inconnu'} ${actif === id ? 'actif' : ''}"><span data-vig="${id}"></span>
        <h3>${esc(f.nom)} <small>${TERRITOIRES[f.terr].ico}</small></h3><p>${esc(f.desc)}</p>
        ${a ? (actif === id ? '<button class="bouton" data-choisir="">✓ Te suit — le renvoyer</button>' : `<button class="bouton" data-choisir="${id}">Le prendre avec moi</button>`)
          : `<p class="cout">Boss du territoire (${esc(TERRITOIRES[f.terr].nom)}), ou : ${coutHTML(cout)}</p><button class="bouton" data-fab="${id}">Fabriquer</button>`}
      </div>`;
    }).join('')}</div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-vig]').forEach((s) => s.replaceWith(vignetteFamilier(s.dataset.vig)));
    $('fenetreCorps').querySelectorAll('[data-choisir]').forEach((b) => b.onclick = async () => { const r = await faire('familierChoisir', { id: b.dataset.choisir || null }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); fenetreFamiliers(); });
    $('fenetreCorps').querySelectorAll('[data-fab]').forEach((b) => b.onclick = async () => {
      const r = await faire('familierFabriquer', { id: b.dataset.fab }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.niveau(); toast(`🐾 ${esc(F.FAMILIERS[b.dataset.fab].nom)} te rejoint !`); fenetreFamiliers();
    });
  });
}
// un familier trouvé en battant un boss : on l'annonce dans le bilan de l'expédition
export function annonceFamilier(id) {
  if (!F.valide(id)) return '';
  return `<div class="famNouveau"><span data-vig-nouveau="${id}"></span><p>🐾 <b>Un familier te rejoint : ${esc(F.FAMILIERS[id].nom)} !</b><br><small>${esc(F.FAMILIERS[id].desc)}</small></p></div>`;
}
export const placerVignettes = () => $('fenetreCorps').querySelectorAll('[data-vig-nouveau]').forEach((s) => s.replaceWith(vignetteFamilier(s.dataset.vigNouveau)));
$('btFamiliers').onclick = () => fenetreFamiliers();
// touche F : la fenêtre des familiers (sur la carte, sans fenêtre ni combat ouverts)
addEventListener('keydown', (e) => { if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) fenetreFamiliers(); });
