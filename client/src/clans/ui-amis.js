// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — amis, messages privés, cadeau du jour (v93)
// =====================================================================
import * as CX from '../../../shared/clans/connexion.js';
import { ELEMENTS, CLASSES } from '../../../shared/clans/cartes.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, esc, p, room, toast } from './ui-commun.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire, infosJ } from './ui-reseau.js';

// ---------- les amis ----------
// qui est en ligne parmi mes amis : pid → { sid, nom, clan, niv, classe }
export function amisEnLigne() {
  const m = new Map();
  for (const i of infosJ.values()) if (i[14]) m.set(i[14], { sid: i[1], nom: i[2], clan: i[3], niv: i[4], classe: i[5] });
  return m;
}
export const estAmi = (pid) => !!pid && (p?.amis || []).some((a) => a.pid === pid);
export function fenetreAmis() {
  if (!p) return;
  const en = amisEnLigne(), l = [...(p.amis || [])].sort((a, b) => (en.has(b.pid) ? 1 : 0) - (en.has(a.pid) ? 1 : 0));
  ouvrir(`<div class="amis"><h2>👥 Amis <small>${l.filter((a) => en.has(a.pid)).length} en ligne · ${l.length} / 30</small></h2>
    <p class="sousTitre">Pour ajouter un ami : clique sur un joueur (sur la carte ou dans la liste « En ligne ») pour ouvrir sa fiche, puis <b>➕ Ajouter en ami</b>. Pour lui écrire en privé : <b>@pseudo ton message</b> dans la discussion.</p>
    ${l.length ? `<ul class="listeAmis">${l.map((a) => { const o = en.get(a.pid); return `<li class="${o ? 'enLigne' : ''}">
      <span class="pt">${o ? '🟢' : '⚫'}</span> <b>${esc(o?.nom || a.nom)}</b> ${o ? `<small>${ELEMENTS[o.clan]?.ico || ''} ${CLASSES[o.classe]?.ico || ''} niv. ${o.niv}</small>` : '<small>hors ligne</small>'}
      <span class="actionsAmi">${o ? `<button class="lien" data-mp="${esc(o.nom)}" title="Message privé">💬</button><button class="lien" data-grp="${esc(o.sid)}" title="Inviter dans ton groupe d’expédition">🤝</button>` : ''}<button class="lien" data-ret="${esc(a.pid)}" title="Retirer de tes amis">✕</button></span></li>`; }).join('')}</ul>` : '<p class="cout">Pas encore d’amis : va dire bonjour aux autres joueurs !</p>'}
  </div>`, () => {
    $('fenetreCorps').dataset.vue = 'amis';
    $('fenetreCorps').querySelectorAll('[data-mp]').forEach((b) => b.onclick = () => ecrireA(b.dataset.mp));
    $('fenetreCorps').querySelectorAll('[data-grp]').forEach((b) => b.onclick = () => { room?.send('groupeInviter', { cible: b.dataset.grp }); toast('🤝 Invitation envoyée.'); });
    $('fenetreCorps').querySelectorAll('[data-ret]').forEach((b) => b.onclick = () => { if (b.dataset.arme) { room?.send('amiRetirer', { pid: b.dataset.ret }); setTimeout(fenetreAmis, 300); } else { b.dataset.arme = '1'; b.textContent = 'Retirer ?'; } });
  });
}
export function ecrireA(nom) {
  $('fenetre').classList.add('cache');
  const t = $('chatTexte'); t.value = `@${nom} `; t.focus();
}
// un bouton dans la fiche d'un autre joueur
export function boutonAmi(f) {
  if (!f?.pid) return '';
  return estAmi(f.pid) ? `<p class="cout">✓ Dans tes amis · <button class="lien" data-mpfiche="${esc(f.nom)}">💬 Lui écrire</button></p>` : `<p class="cout"><button class="bouton petit" data-amifiche="${esc(f.pid)}">➕ Ajouter en ami</button> <button class="lien" data-mpfiche="${esc(f.nom)}">💬 Lui écrire</button></p>`;
}
export function brancherFiche() {
  const c = $('fenetreCorps');
  c.querySelectorAll('[data-amifiche]').forEach((b) => b.onclick = () => { room?.send('amiAjouter', { pid: b.dataset.amifiche }); b.disabled = true; b.textContent = '✓ Ajouté'; });
  c.querySelectorAll('[data-mpfiche]').forEach((b) => b.onclick = () => ecrireA(b.dataset.mpfiche));
}
// prévenir quand un ami se connecte
let vus = null;
export function suivreAmis() {
  if (!p?.amis?.length) return;
  const en = amisEnLigne(), ici = new Set([...en.keys()].filter(estAmi));
  if (vus) for (const pid of ici) if (!vus.has(pid)) toast(`👋 Ton ami <b>${esc(en.get(pid).nom)}</b> vient d’arriver.`);
  vus = ici;
}
setInterval(() => { if (dansMonde) suivreAmis(); }, 4000);

// ---------- le cadeau du jour ----------
const cadeauHTML = (g) => [g.essence ? `${g.essence} ${ICO_RESS.essence}` : '', g.eclats ? `${g.eclats} ${ICO_RESS.eclats}` : '', g.rare ? `${g.rare.n} ${ICO_RESS[g.rare.id] || ''}` : ''].filter(Boolean).join('<br>');
export function fenetreCadeau() {
  if (!p) return;
  const e = CX.etat(p), fait = e.dispo ? e.n - 1 : e.n;
  ouvrir(`<div class="cadeau"><h2>🎁 Cadeau du jour</h2>
    <p class="sousTitre">Connecte-toi chaque jour : le cadeau grossit jusqu’au <b>coffre du 7e jour</b>, puis le cycle recommence. Un jour raté, et on repart du jour 1.</p>
    ${e.rompu ? '<p class="raison">Tu as raté un jour : le cycle repart au jour 1.</p>' : ''}
    <div class="joursCadeau">${CX.CADEAUX.map((_, i) => { const n = i + 1, g = CX.cadeau(n, p.clan); return `<div class="jourC ${n <= fait ? 'pris' : ''} ${e.dispo && n === e.n ? 'auj' : ''} ${g.coffre ? 'coffre' : ''}"><b>Jour ${n}</b><span class="icoC">${n <= fait ? '✅' : g.coffre ? '🧰' : '🎁'}</span><small>${cadeauHTML(g)}</small></div>`; }).join('')}</div>
    ${e.dispo ? '<button class="bouton" id="btCadeau">🎁 Ouvrir le cadeau du jour ' + e.n + '</button>' : `<p class="cout">Déjà ouvert aujourd’hui. Demain : jour ${e.prochain}.</p>`}
  </div>`, () => {
    $('fenetreCorps').dataset.vue = 'cadeau';
    const b = $('btCadeau');
    if (b) b.onclick = async () => {
      b.disabled = true;
      const r = await faire('connexionReclamer', {});
      if (!r.ok) { b.disabled = false; return toast(esc(r.raison || 'Impossible.')); }
      sfx.fanfare?.(); toast(`🎁 Jour ${r.res.n} : ${cadeauHTML(r.res.cadeau).replace(/<br>/g, ' · ')}`);
      setTimeout(fenetreCadeau, 300);
    };
  });
}
// une fois par session, à l'arrivée dans le monde : si le cadeau attend, on l'ouvre
let montre = false;
export function proposerCadeau() {
  if (montre || !p || !CX.etat(p).dispo || globalThis.__pasDeCadeau) return;   // (les tests de bout en bout le coupent)
  montre = true;
  setTimeout(() => { if ($('fenetre').classList.contains('cache') && $('combat').classList.contains('cache')) fenetreCadeau(); }, 2500);
}
$('btAmis').onclick = () => { menuBarre(false); fenetreAmis(); };
$('btCadeauJour').onclick = () => { menuBarre(false); fenetreCadeau(); };
addEventListener('keydown', (e) => { if ((e.key === 'k' || e.key === 'K') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache')) { menuBarre(false); fenetreAmis(); } });
