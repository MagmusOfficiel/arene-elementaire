// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'écurie (v70)
//  Les règles sont dans shared/clans/montures.js ; le dessin dans montureArt.js.
// =====================================================================
import * as MT from '../../../shared/clans/montures.js';
import { sfx } from '../sfx.js';
import { $, coutHTML, esc, niveau, p, toast } from './ui-commun.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { vignetteMonture } from './montureArt.js';

export function fenetreMontures() {
  if (!p) return;
  const l = MT.possedees(p), actif = MT.actif(p), n = niveau();
  ouvrir(`<h2>🐎 L’écurie</h2>
    <p class="sousTitre">Une monture te porte sur la carte : tu vas bien plus vite d’un village à l’autre, et tout le monde la voit. Elle ne change rien en combat. Tu peux en avoir plusieurs et changer quand tu veux.</p>
    <div class="familiers montures">${MT.IDS.map((id) => {
      const m = MT.MONTURES[id], a = l.includes(id), bloque = n < m.niv;
      return `<div class="fam ${a ? '' : 'inconnu'} ${actif === id ? 'actif' : ''}"><span data-vigm="${id}"></span>
        <h3>${esc(m.nom)}</h3><p>${esc(m.desc)}</p><p class="vitM">⚡ Vitesse <b>+${Math.round((m.vit - 1) * 100)} %</b></p>
        ${a ? (actif === id ? '<button class="bouton" data-monter="">✓ Tu la montes — descendre</button>' : `<button class="bouton" data-monter="${id}">La monter</button>`)
          : bloque ? `<p class="cout">🔒 Niveau ${m.niv} requis (tu es niveau ${n})</p>`
          : `<p class="cout">${coutHTML(m.cout)}</p><button class="bouton" data-acheter="${id}">Acheter</button>`}
      </div>`;
    }).join('')}</div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-vigm]').forEach((s) => s.replaceWith(vignetteMonture(s.dataset.vigm)));
    $('fenetreCorps').querySelectorAll('[data-monter]').forEach((b) => b.onclick = async () => { const r = await faire('montureChoisir', { id: b.dataset.monter || null }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); fenetreMontures(); });
    $('fenetreCorps').querySelectorAll('[data-acheter]').forEach((b) => b.onclick = async () => {
      const r = await faire('montureAcheter', { id: b.dataset.acheter }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.niveau(); toast(`🐎 ${esc(MT.MONTURES[b.dataset.acheter].nom)} est à toi ! Tu la montes déjà.`); fenetreMontures();
    });
  });
}
$('btMontures').onclick = () => fenetreMontures();
// touche N : l'écurie (sur la carte, sans fenêtre ni combat ouverts)
addEventListener('keydown', (e) => { if ((e.key === 'n' || e.key === 'N') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) { menuBarre(false); fenetreMontures(); } });
