// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — parler aux habitants et leurs quêtes (v76)
//  Les règles sont dans shared/clans/quetesPnj.js ; les habitants dans pnj.js.
// =====================================================================
import * as QP from '../../../shared/clans/quetesPnj.js';
import * as PC from '../../../shared/clans/parcours.js';
import { PNJ_PAR_ID } from '../../../shared/clans/pnj.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, esc, nf, p, toast } from './ui-commun.js';
import { monde, ouvrir, fermer } from './ui-monde.js';
import { faire } from './ui-reseau.js';

const lot = (o) => Object.entries(o).map(([k, v]) => `<b>${nf(v)}</b> ${ICO_RESS[k] || k}`).join(' + ');
// E sur un habitant : sa quête s'il en a une pour toi, sinon une réplique dans une bulle
export async function parlerA(id) {
  // v79 : une étape du parcours des nouveaux venus se valide en parlant à cet habitant
  const i = PC.etape(p), e = PC.ETAPES[i];
  if (e?.parler && PC.pnjDe(p, i) === id) {
    const r = await faire('parcours', {});
    if (r.ok) { sfx.fanfare?.(); monde.parler(id, r.res.dit); toast(`🎓 ${esc(e.titre)} : ${Object.entries(r.res.rec).map(([k, v]) => (k === 'monture' ? '🐴 un poney (écurie, touche N)' : `+${nf(v)} ${ICO_RESS[k]}`)).join(' · ')}`); return; }
  }
  const et = QP.etat(p, id);
  if (!et || et === 'faite') return monde.parler(id);
  if (et === 'verrou') return monde.parler(id, QP.verrou(p, id));   // v87 : quête d'histoire pas encore ouverte
  const n = PNJ_PAR_ID[id], q = QP.QUETES[id], pr = QP.progres(p, id);
  const couleur = { feu: '#e0552a', eau: '#2a8ae0', plante: '#3aa84a', brisees: '#8a60e0', cimes: '#4a90d8', ambre: '#e0a030', ciel: '#b090ff' }[n.clan];
  const etape = et === 'libre' ? `<p class="dialogue">« ${esc(q.txt)} »</p>`
    : et === 'prete' ? `<p class="dialogue">« Alors, c’est fait ? ${q.donner ? 'Tu as ce que je t’ai demandé ?' : 'Montre-moi ça !'} »</p>`
    : `<p class="dialogue">« ${esc(q.txt)} »</p><p class="cout">${pr ? `Avancement : <b>${pr.n} / ${pr.max}</b>` : `Il te faut : ${lot(q.donner)} (tu as ${Object.keys(q.donner).map((k) => `${nf(p.ress[k] || 0)} ${ICO_RESS[k]}`).join(', ')})`}</p>`;
  ouvrir(`<div class="pnjQuete" style="--clan:${couleur}">
      <h2>${esc(n.nom)} <small>· ${esc(n.role)}</small></h2>${q.histoire ? (q.chap === 5 ? `<p class="sousTitre">🌌 Chapitre 5 · L’histoire des Îles Célestes — partie ${q.histoire} / 5</p>` : q.chap === 4 ? `<p class="sousTitre">🏜️ Chapitre 4 · L’histoire du Désert d’Ambre — partie ${q.histoire} / 5</p>` : q.chap === 3 ? `<p class="sousTitre">⚡ Chapitre 3 · L’histoire des Cimes Orageuses — partie ${q.histoire} / 5</p>` : `<p class="sousTitre">🌀 Chapitre 2 · L’histoire des Terres Brisées — partie ${q.histoire} / 5</p>`) : ''}
      ${etape}
      ${q.donner && et !== 'faite' ? `<p class="cout">À apporter : ${lot(q.donner)}</p>` : ''}
      <p class="cout">Récompense : ${lot(q.rec)}</p>
      <div class="boutonsPnj">
        ${et === 'libre' ? '<button class="bouton" id="btAccepter">J’accepte</button>' : ''}
        ${et === 'prete' ? `<button class="bouton" id="btRendre">${q.donner ? 'Lui donner' : 'Lui raconter'}</button>` : ''}
        <button class="bouton second" id="btPlusTard">${et === 'libre' ? 'Plus tard' : 'Au revoir'}</button>
      </div>
      <p class="sousTitre">Quêtes des ${esc(QP.nomTerre(n.clan))} : ${QP.PAR_CLAN[n.clan].filter((x) => p.pnjQ?.[x]?.fait).length} / ${QP.PAR_CLAN[n.clan].length} — ${QP.PAR_CLAN[n.clan].length === 6 ? 'les 6' : 'toutes'} donnent le titre « ${esc(QP.TITRES[n.clan])} ».</p>
    </div>`, () => {
    $('btPlusTard').onclick = fermer;
    if ($('btAccepter')) $('btAccepter').onclick = async () => { const r = await faire('pnjAccepter', { id }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); sfx.melange?.(); toast(`📜 Nouvelle quête de ${esc(n.nom)} : ${esc(q.txt)}`); fermer(); };
    if ($('btRendre')) $('btRendre').onclick = async () => {
      const r = await faire('pnjRendre', { id }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.fanfare?.(); fermer(); monde.parler(id, r.res.merci);
      toast(`✅ Quête de ${esc(n.nom)} terminée : ${lot(r.res.rec)}${r.res.ami ? `<br>🏅 Tu es désormais « <b>${esc(QP.TITRES[n.clan])}</b> » (titre dans ta fiche).` : ''}`);
    };
  });
}
