// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la fenêtre « Décorer ma maison » (v77)
// =====================================================================
import * as DC from '../../../shared/clans/deco.js';
import { sfx } from '../sfx.js';
import { $, coutHTML, esc, niveau, p, toast } from './ui-commun.js';
import { ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { vignetteDeco } from './decoArt.js';

export function fenetreDeco() {
  const pose = p.deco?.pose || {};
  ouvrir(`<h2>🏡 Décorer ma maison</h2>
    <p class="sousTitre">Une décoration par emplacement autour de ta maison. Tout le monde la voit en passant. Une fois achetée, tu peux la poser, l’enlever ou la changer quand tu veux.</p>
    ${Object.entries(DC.EMPL).map(([e, nom]) => `<h3>${nom}${pose[e] ? ` <small>— posée : ${esc(DC.DECOS[pose[e]].nom)} · <button class="lien" data-enlever="${e}">enlever</button></small>` : ''}</h3>
      <div class="familiers decos">${DC.IDS.filter((id) => DC.DECOS[id].empl === e).map((id) => {
        const d = DC.DECOS[id], a = DC.possede(p, id), ici = pose[e] === id;
        return `<div class="fam ${a ? '' : 'inconnu'} ${ici ? 'actif' : ''}"><span data-vigd="${id}"></span><h3>${esc(d.nom)}</h3>${d.desc ? `<p>${esc(d.desc)}</p>` : ''}
          ${a ? (ici ? '<p class="cout">✓ Posée</p>' : `<button class="bouton" data-poser="${id}">La poser</button>`)
            : d.gagne ? `<p class="cout">🏆 À gagner : ${esc(d.gagne.txt)}</p>`
            : d.niv && niveau() < d.niv ? `<p class="cout">🔒 Niveau ${d.niv} requis</p>`
            : `<p class="cout">${coutHTML(d.cout)}</p><button class="bouton" data-acheter="${id}">Acheter</button>`}</div>`;
      }).join('')}</div>`).join('')}`, () => {
    $('fenetreCorps').querySelectorAll('[data-vigd]').forEach((s) => s.replaceWith(vignetteDeco(s.dataset.vigd, DC.DECOS[s.dataset.vigd].empl, p.clan, p.branche)));
    const agir = async (type, m, txt) => { const r = await faire(type, m); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); if (txt) { sfx.niveau?.(); toast(txt); } fenetreDeco(); };
    $('fenetreCorps').querySelectorAll('[data-acheter]').forEach((b) => b.onclick = () => agir('decoAcheter', { id: b.dataset.acheter }, `🏡 ${esc(DC.DECOS[b.dataset.acheter].nom)} posée devant ta maison !`));
    $('fenetreCorps').querySelectorAll('[data-poser]').forEach((b) => b.onclick = () => agir('decoPoser', { empl: DC.DECOS[b.dataset.poser].empl, id: b.dataset.poser }));
    $('fenetreCorps').querySelectorAll('[data-enlever]').forEach((b) => b.onclick = () => agir('decoPoser', { empl: b.dataset.enlever, id: null }));
  });
}
