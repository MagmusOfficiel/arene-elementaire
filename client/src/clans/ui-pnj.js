// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — parler aux habitants et leurs quêtes (v76)
//  Les règles sont dans shared/clans/quetesPnj.js ; les habitants dans pnj.js.
// =====================================================================
import * as QP from '../../../shared/clans/quetesPnj.js';
import * as PC from '../../../shared/clans/parcours.js';
import { PNJ_PAR_ID } from '../../../shared/clans/pnj.js';
import { REPERE } from '../../../shared/clans/reperes.js';
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
  // v108 : un habitant peut avoir plusieurs quêtes, l'une après l'autre
  const qid = QP.queteDe(p, id), et = qid ? QP.etat(p, qid) : 'faite';
  if (!qid || et === 'faite') return monde.parler(id);
  if (et === 'verrou') return monde.parler(id, QP.verrou(p, qid));   // v87 : quête pas encore ouverte (niveau, quête d'avant)
  const n = PNJ_PAR_ID[id], q = QP.QUETES[qid], pr = QP.progres(p, qid), xp = QP.xpQuete(p, qid), zone = QP.zoneDe(qid), liste = QP.QUETES_ZONE[zone] || [];
  const couleur = { feu: '#e0552a', eau: '#2a8ae0', plante: '#3aa84a', brisees: '#8a60e0', cimes: '#4a90d8', ambre: '#e0a030', ciel: '#b090ff' }[n.clan];
  const CHAP = { 2: ['🌀', 'Terres Brisées'], 3: ['⚡', 'Cimes Orageuses'], 4: ['🏜️', 'Désert d’Ambre'], 5: ['🌌', 'Îles Célestes'] };
  const chap = q.histoire ? CHAP[q.chap || 2] : null;
  const aFaire = [
    q.lieux ? `<li>🗺️ Aller voir : ${q.lieux.map((l, i) => `<b>${esc(REPERE[l].nom)}</b>${p.pnjQ?.[qid]?.vus & (1 << i) ? ' ✓' : ''}`).join(', ')}</li>` : '',
    q.objets ? `<li>🎒 Ramasser près de <b>${esc(REPERE[q.objets[0][0]].nom)}</b> : ${q.objets.map((o, i) => `${o[3]}${p.pnjQ?.[qid]?.pris & (1 << i) ? '✓' : ''}`).join(' ')}</li>` : '',
    q.donner ? `<li>📦 Apporter : ${lot(q.donner)}${et === 'libre' ? '' : ` <small>(tu as ${Object.keys(q.donner).map((k) => `${nf(p.ress[k] || 0)} ${ICO_RESS[k]}`).join(', ')})</small>`}</li>` : '',
  ].join('');
  const etape = et === 'prete' ? `<p class="dialogue">« Alors, c’est fait ? ${q.donner ? 'Tu as ce que je t’ai demandé ?' : 'Raconte-moi tout !'} »</p>`
    : `<p class="dialogue">« ${esc(q.txt)} »</p>${aFaire ? `<ul class="pnjObjectifs">${aFaire}</ul>` : ''}${et === 'cours' && pr ? `<p class="cout">Avancement : <b>${pr.n} / ${pr.max}</b></p>` : ''}`;
  const cible = q.lieux ? QP.lieuxAVoir(p).find((x) => x.id === qid) || REPERE[q.lieux[0]] : q.objets ? QP.objetsAVoir(p).find((x) => x.id === qid) || REPERE[q.objets[0][0]] : null;
  ouvrir(`<div class="pnjQuete" style="--clan:${couleur}">
      <h2>${esc(n.nom)} <small>· ${esc(n.role)}</small></h2>
      ${chap ? `<p class="sousTitre">${chap[0]} Chapitre ${q.chap || 2} · L’histoire des ${chap[1]} — partie ${q.histoire} / 5</p>` : ''}
      ${q.titre ? `<h3 class="pnjTitre">📜 ${esc(q.titre)}</h3>` : ''}
      ${etape}
      <p class="cout">Récompense : ${lot(q.rec)}${xp ? ` + <b class="xpQ">${xp} XP</b>` : ''}</p>
      <div class="boutonsPnj">
        ${et === 'libre' ? '<button class="bouton" id="btAccepter">J’accepte</button>' : ''}
        ${et === 'prete' ? `<button class="bouton" id="btRendre">${q.donner ? 'Lui donner' : 'Lui raconter'}</button>` : ''}
        ${et === 'cours' && cible ? '<button class="bouton second" id="btChemin">📍 Montre-moi le chemin</button>' : ''}
        <button class="bouton second" id="btPlusTard">${et === 'libre' ? 'Plus tard' : 'Au revoir'}</button>
      </div>
      <p class="sousTitre">Quêtes des ${esc(QP.nomTerre(zone))} : ${liste.filter((x) => p.pnjQ?.[x]?.fait).length} / ${liste.length}${QP.PAR_CLAN[n.clan]?.length === 6 && QP.PAR_CLAN[n.clan].includes(qid) ? ` — les 6 premières donnent le titre « ${esc(QP.TITRES[n.clan])} »` : ''}.</p>
    </div>`, () => {
    $('btPlusTard').onclick = fermer;
    if ($('btChemin')) $('btChemin').onclick = () => { monde.guider({ x: cible.x, y: cible.y, nom: cible.nom }); fermer(); toast(`📍 La flèche te guide vers <b>${esc(cible.nom)}</b>.`); };
    if ($('btAccepter')) $('btAccepter').onclick = async () => {
      const r = await faire('pnjAccepter', { id }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.melange?.(); fermer();
      const c2 = q.lieux ? REPERE[q.lieux[0]] : q.objets ? REPERE[q.objets[0][0]] : null;
      if (c2) monde.guider({ x: c2.x, y: c2.y, nom: c2.nom });
      toast(`📜 Nouvelle quête de ${esc(n.nom)} : <b>${esc(q.titre || q.txt)}</b>${c2 ? `<br>📍 La flèche te guide vers <b>${esc(c2.nom)}</b>.` : ''}`);
    };
    if ($('btRendre')) $('btRendre').onclick = async () => {
      const r = await faire('pnjRendre', { id }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.fanfare?.(); fermer(); monde.parler(id, r.res.merci);
      toast(`✅ Quête de ${esc(n.nom)} terminée : ${lot(r.res.rec)}${r.res.xp ? ` · <b>+${r.res.xp} XP</b>` : ''}${r.res.ami ? `<br>🏅 Tu es désormais « <b>${esc(QP.TITRES[n.clan])}</b> » (titre dans ta fiche).` : ''}`);
    };
  });
}
