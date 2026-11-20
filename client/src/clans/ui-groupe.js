// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les expéditions en groupe (v78)
//  Le chef invite 1 ou 2 joueurs proches, choisit le palier, puis chaque
//  salle. Chacun combat les mêmes monstres avec son propre deck ; un membre
//  vaincu tombe « à terre » et suit le groupe jusqu'au prochain feu de camp.
//  Si le boss tombe, tout le groupe gagne. +25 % de butin par compagnon.
//  Les règles sont côté serveur (ClansRoom.js) et dans expedition.js.
// =====================================================================
import { $, esc, p, room, toast } from './ui-commun.js';
import { monde } from './ui-monde.js';
import { vueFenetre } from './ui-social.js';

export let groupe = null;
const COUL = { feu: '#e0552a', eau: '#2a8ae0', plante: '#3aa84a' };
const ETATS = { pret: '✅ prêt', combat: '⚔️ en combat', choix: '🤔 choisit', aTerre: '💀 à terre', fini: '🏁 fini' };
export const suisChef = () => !!groupe && groupe.chef === groupe.moi;

// le panneau du groupe, dans la fenêtre d'expédition
let terrVue = null;
export function panneauGroupe(terr) {
  terrVue = terr || terrVue;
  if (!groupe) {
    if (p.expedition) return '';
    const proches = monde.proches(260);
    return `<div class="groupe"><h3>👥 Partir en groupe <small>(+25 % de butin par compagnon)</small></h3>
      ${proches.length ? `<p class="cout">Joueurs près de toi :</p><div class="invites">${proches.map((a) => `<button class="bouton second" data-inviter="${a.id}"><span style="color:${COUL[a.clan]}">●</span> ${esc(a.nom)} <small>niv. ${a.niv || '?'}</small></button>`).join('')}</div>` : '<p class="cout">Personne près de toi pour l’instant : un compagnon doit venir jusqu’au portail.</p>'}</div>`;
  }
  const moi = groupe.moi;
  return `<div class="groupe"><h3>👥 Ton groupe${groupe.parti ? '' : ' (en préparation)'}</h3>
    <div class="membresGroupe">${groupe.membres.map((m) => `<div class="membre ${m.etat}"><b style="color:${COUL[m.clan]}">${m.sid === groupe.chef ? '👑 ' : ''}${esc(m.nom)}${m.sid === moi ? ' (toi)' : ''}</b>
      ${m.pv !== null ? `<span class="pvG"><i style="width:${Math.round((m.pv / m.pvMax) * 100)}%"></i></span><small>${m.pv} / ${m.pvMax} PV</small>` : ''}<small>${groupe.parti ? ETATS[m.etat] || '' : ''}</small></div>`).join('')}</div>
    ${!groupe.parti ? (suisChef() ? (() => { const proches = monde.proches(260).filter((a) => !groupe.membres.some((m) => m.sid === a.id)); return groupe.membres.length < 3 && proches.length ? `<div class="invites">${proches.map((a) => `<button class="bouton second" data-inviter="${a.id}">+ ${esc(a.nom)}</button>`).join('')}</div>` : ''; })() + `<p class="cout">${groupe.membres.length < 2 ? 'Attends qu’un compagnon accepte ton invitation.' : 'Choisis le palier ci-dessous : tout le groupe part ensemble.'}</p>` : '<p class="cout">Le chef choisit le palier.</p>') : suisChef() ? '<p class="cout">Tu es le chef : c’est toi qui choisis les salles. Attends que tout le monde ait fini son combat.</p>' : '<p class="cout">Le chef choisit les salles ; tu combats les mêmes monstres avec ton deck.</p>'}
    <button class="lien" id="btQuitterGroupe">Quitter le groupe</button></div>`;
}
export function brancherGroupe() {
  $('fenetreCorps').querySelectorAll('[data-inviter]').forEach((b) => b.onclick = () => { room?.send('groupeInviter', { cible: b.dataset.inviter }); b.disabled = true; b.textContent = 'Invité…'; });
  if ($('btQuitterGroupe')) $('btQuitterGroupe').onclick = () => room?.send('groupeQuitter', {});
}

// les messages du serveur
let invitation = null;
export function brancherMessagesGroupe(r, { fenetreExpedition, traiterSalle, bilanExpedition }) {
  r.onMessage('groupe', (g) => {
    const avant = groupe; groupe = g;
    if (g?.depart) { toast(`👥 Le groupe part en expédition !`); fenetreExpedition(g.terr); return; }
    if (!g && avant) toast('👥 Le groupe est dissous.');
    if (vueFenetre() === 'expedition' && $('combat').classList.contains('cache')) { const t = g?.terr || p.expedition?.territoire || avant?.terr || terrVue; if (t) fenetreExpedition(t); }
  });
  r.onMessage('groupeSalle', (m) => traiterSalle(m.salle, m.res));
  r.onMessage('groupeBilan', (b) => { if (b?.ok) setTimeout(() => bilanExpedition(b), $('combat').classList.contains('cache') ? 0 : 1500); });
  r.onMessage('groupeInvitation', (m) => {
    invitation?.remove();
    invitation = document.createElement('div'); invitation.id = 'invitationGroupe';
    invitation.innerHTML = `<div>👥 <b>${esc(m.de)}</b> t’invite à partir en expédition avec lui.</div><button class="bouton" data-rep="1">Rejoindre</button><button class="bouton second" data-rep="0">Non merci</button>`;
    document.body.append(invitation);
    invitation.querySelectorAll('[data-rep]').forEach((b) => b.onclick = () => { r.send('groupeRepondre', { gid: m.gid, oui: b.dataset.rep === '1' }); invitation.remove(); invitation = null; });
    setTimeout(() => { if (invitation?.isConnected) { invitation.remove(); invitation = null; } }, 30000);
  });
}
