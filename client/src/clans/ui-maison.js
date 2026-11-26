// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — poser sa maison (v72)
//  On choisit sa place en marchant : un fantôme de la maison suit le joueur
//  (vert : on peut la poser ; rouge : pas ici, avec la raison). E ou le
//  bouton « Poser ici » la pose ; Échap annule. La règle est dans geo.js.
// =====================================================================
import { toucheFermer, NOM_FERMER } from './touches.js';
import { $, esc, p, toast } from './ui-commun.js';
import { faire } from './ui-reseau.js';
import { monde } from './ui-monde.js';
import { sfx } from '../sfx.js';

const PRIX = 1000;
let bandeau = null, minuteur = null;
export function commencerPlacement() {
  monde.placer(true);
  bandeau ||= Object.assign(document.createElement('div'), { id: 'bandeauMaison' });
  bandeau.innerHTML = `<div><b>🏡 Où poser ta maison ?</b> Marche sur la terre de ton clan : la maison suit tes pas.${p.maisonPos ? ` Déménager coûte ${PRIX} essence.` : ' La première fois, c’est gratuit.'}<br><span id="raisonMaison"></span></div>
    <button class="bouton" id="btPoserMaison">Poser ici <small>E</small></button><button class="bouton secondaire" id="btAnnulerMaison">Annuler <small>${NOM_FERMER}</small></button>`;
  document.body.append(bandeau);
  $('btPoserMaison').onclick = poser; $('btAnnulerMaison').onclick = finir;
  clearInterval(minuteur);
  minuteur = setInterval(() => { const g = monde.emplacement(); const r = $('raisonMaison'); if (r) { r.textContent = g.ok ? '✅ Ici, c’est possible.' : `❌ ${g.raison}`; r.className = g.ok ? 'ok' : 'non'; } $('btPoserMaison').disabled = !g.ok; }, 150);
}
function finir() { monde.placer(false); clearInterval(minuteur); bandeau?.remove(); }
async function poser() {
  const g = monde.emplacement(); if (!g.ok) return toast(esc(g.raison));
  const r = await faire('maisonPoser', { x: g.x, y: g.y });
  if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
  finir(); sfx.niveau?.(); toast(`🏡 Ta maison est posée ici !${r.res.prix ? ` (−${r.res.prix} essence)` : ''} Tes bâtiments et ta production n’ont pas bougé.`);
}
addEventListener('clans:poserMaison', poser);
addEventListener('clans:annulerMaison', finir);
