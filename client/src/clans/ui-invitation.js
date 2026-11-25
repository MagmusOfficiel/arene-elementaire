// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — inviter un ami sur CrazyGames (v110)
//  Le « salon » CrazyGames d'un joueur, c'est son groupe d'expédition :
//  seul, il est joignable (son ami qui clique le lien crée le groupe avec
//  lui) ; en groupe, il l'est tant qu'il reste de la place et que le groupe
//  n'est pas parti. Le lien porte l'identifiant public du chef (« ami »).
//  Hors de CrazyGames, rien de tout ça ne s'affiche.
// =====================================================================
import { cg } from './crazygames.js';
import { groupe } from './ui-groupe.js';
import { $, esc, p, room, toast } from './ui-commun.js';
import { monde, dansMonde } from './ui-monde.js';

let monPub = null;
export const lienPret = () => cg.actif && !!monPub;
// le lien à partager : celui du chef du groupe (ou le sien, seul)
export const amiDuSalon = () => (groupe ? groupe.pubChef : monPub);
export const joignable = () => (groupe ? !groupe.parti && groupe.membres.length < (groupe.taille || 3) : !p?.expedition);

export function majSalle() {
  if (!cg.actif || !monPub || !dansMonde) return;
  const ami = amiDuSalon(); if (!ami) return;
  cg.salle({ id: ami, ami, joignable: joignable() });
}
function suivreLien() {
  const a = cg.prendreAmi(); if (!a || a === monPub || !room) return;
  room.send('groupeLien', { ami: a });
}
// appelé à l'entrée dans le monde
export function entrerSalle() { if (cg.actif && room) room.send('lienAmi', {}); }
export function quitterSalle() { if (cg.actif) cg.quitterSalle(); }

export function brancherInvitations(r) {
  r.onMessage('lienAmi', (m) => { monPub = m?.pub || null; majSalle(); suivreLien(); });
  r.onMessage('groupeLienOk', (m) => {
    toast(`🔗 Tu as rejoint le groupe de <b>${esc(m.de)}</b> ! Retrouve-le et partez en expédition ensemble.`);
    const a = monde.etatCarte().autres.find((x) => x.id === m.sid); if (a) monde.guider({ x: a.x, y: a.y, nom: m.de });
  });
  r.onMessage('groupe', () => setTimeout(majSalle, 0));
}
cg.onRejoindre(() => { if (dansMonde) suivreLien(); });
setInterval(majSalle, 3000);   // une expédition solo qui commence ou finit change aussi la place libre

// le bouton du panneau de groupe : copier le lien d'invitation
export const boutonInviter = () => (lienPret() && joignable() ? '<button class="bouton second" id="btLienAmi">🔗 Inviter un ami (lien)</button>' : '');
export function brancherBoutonInviter() {
  const b = $('btLienAmi'); if (!b) return;
  b.onclick = async () => {
    const l = cg.lien(amiDuSalon()); if (!l) return toast('Le lien d’invitation n’est pas disponible pour le moment.');
    try { await navigator.clipboard.writeText(l); toast('🔗 Lien copié ! Envoie-le à un ami : il arrivera directement dans ton groupe.'); }
    catch { toast(`🔗 Ton lien d’invitation : <b>${esc(l)}</b>`); }
  };
}
