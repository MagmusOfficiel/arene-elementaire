// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — personnages et compte (v79)
//  - Plusieurs personnages (4 au plus) sur un même compte : chacun a son
//    profil sur le serveur (son jeton) ; la liste est gardée dans le
//    navigateur et dans le compte du site.
//  - Le code du compte (« K7QF-2XMB ») permet de tout retrouver sur un
//    autre ordinateur ou sur un téléphone.
// =====================================================================
import { CLASSES, ELEMENTS, BRANCHES } from '../../../shared/clans/cartes.js';
import * as P from '../../../shared/clans/profil.js';
import { $, CLE, SERVER_URL, compte, esc, p, toast } from './ui-commun.js';
import { ouvrir } from './ui-monde.js';

export const MAX_PERSOS = 4;
const CLEP = 'clansPersos';
export const persos = () => { try { const l = JSON.parse(localStorage.getItem(CLEP) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } };
const garder = (l) => { try { localStorage.setItem(CLEP, JSON.stringify(l)); } catch { /* plein */ } };
export const jetonActif = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null')?.jeton || null; } catch { return null; } };
// à chaque profil reçu : on met à jour (ou on ajoute) ce personnage dans la liste
export function noterPerso(jeton, pr, niv) {
  if (!jeton || !pr) return;
  const l = persos(), e = { jeton, nom: pr.nom, clan: pr.clan, classe: pr.classe, niv, branche: pr.branche || '' };
  const i = l.findIndex((x) => x.jeton === jeton);
  if (i >= 0) { if (JSON.stringify(l[i]) === JSON.stringify(e)) return; l[i] = e; } else l.push(e);
  garder(l);
}
// changer de personnage : on garde son jeton comme jeton actif, et on recharge la page
export function jouer(jeton) { try { localStorage.setItem(CLE, JSON.stringify({ jeton, sig: 'aucun', p: null })); } catch { /* rien */ } compte.sauvegarder(); location.reload(); }
export function nouveau() {
  if (persos().length >= MAX_PERSOS) return toast(`Tu as déjà ${MAX_PERSOS} personnages.`);
  try { localStorage.removeItem(CLE); } catch { /* rien */ }
  location.reload();
}
export async function recupererCode(code) {
  try { await compte.recuperer(code); toast('✅ Compte retrouvé ! Chargement…'); setTimeout(() => location.reload(), 600); }
  catch (e) { toast(esc(e.message || 'Code introuvable.')); }
}
const carteP = (x, actif) => `<div class="perso ${actif ? 'actif' : ''}"><span class="icoP">${CLASSES[x.classe]?.ico || '❔'}</span>
  <div><b>${esc(x.nom)}</b><small>${ELEMENTS[x.clan]?.ico || ''} ${esc(ELEMENTS[x.clan]?.clan || '')} · ${esc(CLASSES[x.classe]?.nom || 'sans classe')}${x.branche && BRANCHES[x.branche] ? ` ${BRANCHES[x.branche].ico} ${esc(BRANCHES[x.branche].nom)}` : ''} · niv. ${Math.min(P.NIVEAU_MAX, x.niv || 1)}</small></div>
  <button class="lien" data-code="${esc(x.jeton)}" title="Le code secret de ce personnage">🔑 Code</button>
  <button class="lien supP" data-sup="${esc(x.jeton)}" title="Supprimer ce personnage">🗑️</button>
  ${actif ? '<span class="porte">✓ En jeu</span>' : `<button class="bouton" data-jouer="${esc(x.jeton)}">Jouer</button>`}</div>`;
// v81 : reprendre un personnage avec son code (le jeton : 20 à 40 lettres, chiffres, - ou _)
export function ajouterParCode(v) {
  const j = String(v || '').trim();
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(j)) return toast('Ce code de personnage n’est pas valide (20 à 40 caractères).');
  toast('Chargement du personnage…'); jouer(j);
}
const blocPerso = () => `<div class="codeCompte"><h3>🧩 Reprendre un personnage avec son code</h3>
  <p class="sousTitre">Chaque personnage a son propre code secret (bouton 🔑 Code). Garde-le précieusement : quelqu’un qui l’a peut jouer ce personnage.</p>
  <div class="code"><input id="champPerso" maxlength="40" placeholder="code du personnage" autocomplete="off"><button class="bouton" id="btPerso">Reprendre</button></div></div>`;
export const blocCode = () => `<div class="codeCompte"><h3>🔑 Ton code de compte</h3>
  <p class="sousTitre">Note-le bien : sur un autre ordinateur ou sur ton téléphone, entre ce code pour retrouver <b>tous tes personnages</b>.</p>
  ${compte.code ? `<div class="code"><span id="codeC">${esc(compte.code)}</span><button class="bouton second" id="btCopier">Copier</button></div>` : '<p class="cout">Ton code est en cours de création… (il faut être connecté au serveur)</p>'}</div>`;
export const blocRecuperer = () => `<div class="codeCompte"><h3>📲 Retrouver un compte</h3>
  <p class="sousTitre">Tu joues déjà ailleurs ? Entre le code affiché dans « Personnages et compte » sur ton autre appareil.</p>
  <div class="code"><input id="champCode" maxlength="9" placeholder="K7QF-2XMB" autocomplete="off"><button class="bouton" id="btRecuperer">Retrouver</button></div></div>`;
export function brancherCode(racine = document) {
  const c = racine.querySelector('#btCopier'); if (c) c.onclick = () => { navigator.clipboard?.writeText(compte.code).then(() => toast('Code copié !'), () => toast(compte.code)); };
  const r = racine.querySelector('#btRecuperer'), ch = racine.querySelector('#champCode');
  if (r && ch) { r.onclick = () => recupererCode(ch.value); ch.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') recupererCode(ch.value); }; }
}
export function fenetreCompte() {
  compte.sauvegarder();
  const l = persos(), a = jetonActif();
  ouvrir(`<h2>👥 Personnages et compte</h2>
    <h3>Tes personnages <small>(${l.length})</small></h3>
    <div class="persos">${l.map((x) => carteP(x, x.jeton === a)).join('') || '<p class="cout">Aucun personnage.</p>'}</div>
    ${l.length < MAX_PERSOS ? '<button class="bouton" id="btNouveauPerso">+ Créer un nouveau personnage</button> <small class="cout">Ton personnage actuel reste sauvegardé : tu pourras revenir dessus quand tu veux.</small>' : ''}
    ${blocCode()}${blocRecuperer()}${blocPerso()}`, () => {
    $('fenetreCorps').querySelectorAll('[data-jouer]').forEach((b) => b.onclick = () => jouer(b.dataset.jouer));
    $('fenetreCorps').querySelectorAll('[data-sup]').forEach((b) => b.onclick = () => confirmerSuppression(b.dataset.sup));
    if ($('btNouveauPerso')) $('btNouveauPerso').onclick = nouveau;
    $('fenetreCorps').querySelectorAll('[data-code]').forEach((b) => b.onclick = () => { const c = b.dataset.code; navigator.clipboard?.writeText(c).then(() => toast(`Code copié : <b>${esc(c)}</b>`), () => toast(`Code : <b>${esc(c)}</b>`)); });
    const cp = $('champPerso'); $('btPerso').onclick = () => ajouterParCode(cp.value); cp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') ajouterParCode(cp.value); };
    brancherCode($('fenetreCorps'));
    compte.onChange = () => { if ($('codeC') === null && $('fenetreCorps').querySelector('.codeCompte')) fenetreCompte(); };
  });
}
$('btCompte').onclick = () => fenetreCompte();

// ---------- v83 : supprimer un personnage (confirmation, et le nom à retaper au-delà du niveau 10) ----------
function confirmerSuppression(jeton) {
  const x = persos().find((e) => e.jeton === jeton); if (!x) return;
  const gros = (x.niv || 1) >= 10;
  ouvrir(`<h2>🗑️ Supprimer ${esc(x.nom)} ?</h2>
    <p class="sousTitre">${esc(ELEMENTS[x.clan]?.clan || '')} · ${esc(CLASSES[x.classe]?.nom || '')} · niveau ${x.niv || 1}</p>
    <p class="alerteSup">⚠️ C'est <b>définitif</b> : ses cartes, ses ressources, sa maison et toute sa progression seront effacées pour toujours.</p>
    ${gros ? `<p>Ce personnage a déjà bien progressé. Pour confirmer, écris son nom : <b>${esc(x.nom)}</b></p><div class="code"><input id="supNom" maxlength="16" autocomplete="off" placeholder="${esc(x.nom)}"></div>` : ''}
    <div class="choixSup"><button class="bouton" id="supNon">Annuler</button><button class="bouton danger" id="supOui" ${gros ? 'disabled' : ''}>Supprimer définitivement</button></div>`, () => {
    $('supNon').onclick = () => fenetreCompte();
    if (gros) { const c = $('supNom'); c.onkeydown = (e) => e.stopPropagation(); c.oninput = () => { $('supOui').disabled = c.value.trim() !== x.nom; }; c.focus(); }
    $('supOui').onclick = async () => {
      $('supOui').disabled = true;
      try {
        const r = await fetch(`${SERVER_URL.replace(/^ws/, 'http')}/api/clans/supprimer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeton }) }).then((y) => y.json());
        if (!r.ok) throw new Error(r.erreur || 'refus');
      } catch (e) { $('supOui').disabled = false; return toast(`Suppression impossible : ${esc(e.message)}`); }
      try { localStorage.setItem(CLEP, JSON.stringify(persos().filter((e) => e.jeton !== jeton))); } catch { /* rien */ }
      toast(`🗑️ ${esc(x.nom)} a été supprimé.`);
      if (jeton === jetonActif()) { try { localStorage.removeItem(CLE); } catch { /* rien */ } compte.sauvegarder(); setTimeout(() => location.reload(), 800); return; }
      compte.sauvegarder(); fenetreCompte();
    };
  });
}
