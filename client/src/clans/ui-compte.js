// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — personnages et compte (v79)
//  - Plusieurs personnages (4 au plus) sur un même compte : chacun a son
//    profil sur le serveur (son jeton) ; la liste est gardée dans le
//    navigateur et dans le compte du site.
//  - Le code du compte (« K7QF-2XMB ») permet de tout retrouver sur un
//    autre ordinateur ou sur un téléphone.
// =====================================================================
import { CLASSES, ELEMENTS, BRANCHES } from '../../../shared/clans/cartes.js';
import { $, CLE, compte, esc, p, toast } from './ui-commun.js';
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
  <div><b>${esc(x.nom)}</b><small>${ELEMENTS[x.clan]?.ico || ''} ${esc(ELEMENTS[x.clan]?.clan || '')} · ${esc(CLASSES[x.classe]?.nom || 'sans classe')}${x.branche && BRANCHES[x.branche] ? ` ${BRANCHES[x.branche].ico} ${esc(BRANCHES[x.branche].nom)}` : ''} · niv. ${x.niv || 1}</small></div>
  ${actif ? '<span class="porte">✓ En jeu</span>' : `<button class="bouton" data-jouer="${esc(x.jeton)}">Jouer</button>`}</div>`;
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
    <h3>Tes personnages <small>(${l.length} / ${MAX_PERSOS})</small></h3>
    <div class="persos">${l.map((x) => carteP(x, x.jeton === a)).join('') || '<p class="cout">Aucun personnage.</p>'}</div>
    ${l.length < MAX_PERSOS ? '<button class="bouton" id="btNouveauPerso">+ Créer un nouveau personnage</button> <small class="cout">Ton personnage actuel reste sauvegardé : tu pourras revenir dessus quand tu veux.</small>' : ''}
    ${blocCode()}${blocRecuperer()}`, () => {
    $('fenetreCorps').querySelectorAll('[data-jouer]').forEach((b) => b.onclick = () => jouer(b.dataset.jouer));
    if ($('btNouveauPerso')) $('btNouveauPerso').onclick = nouveau;
    brancherCode($('fenetreCorps'));
    compte.onChange = () => { if ($('codeC') === null && $('fenetreCorps').querySelector('.codeCompte')) fenetreCompte(); };
  });
}
$('btCompte').onclick = () => fenetreCompte();
