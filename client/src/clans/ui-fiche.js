// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — fiche de joueur et hauts faits (v60)
//  Ma fiche : calculée sur mon profil, avec la progression de chaque haut
//  fait et le choix du titre. La fiche d'un autre : demandée au serveur
//  (message « fiche »), seulement ce qui est public.
// =====================================================================
import { boutonAmi, brancherFiche } from './ui-amis.js';
import * as QP from '../../../shared/clans/quetesPnj.js';
import * as SG from '../../../shared/clans/seigneurs.js';
import { BRANCHES, CHEFS, ELEMENTS, CLASSES } from '../../../shared/clans/cartes.js';
import * as HF from '../../../shared/clans/hautsfaits.js';
import * as F from '../../../shared/clans/familiers.js';
import * as GR from '../../../shared/clans/grimoire.js';
import * as TS from '../../../shared/clans/titresStyle.js';
import * as AP from '../../../shared/clans/apparence.js';
import { rangDe } from '../../../shared/clans/arene.js';
import { sfx } from '../sfx.js';
import { $, esc, nf, niveau, p, room, toast } from './ui-commun.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { feuillePerso } from './monde.js';
import { vignetteFamilier } from './familiersArt.js';

function portrait(clan, classe, app, z = 5) {
  const c = document.createElement('canvas'); c.width = 24 * z; c.height = 26 * z; c.className = 'portraitFiche';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(feuillePerso(clan, classe, app), 0, 0, 24, 26, 0, 0, 24 * z, 26 * z);
  return c;
}
const rangTxt = (elo) => { const r = rangDe(elo); return `${r.ico} ${r.nom}`; };

// f : { nom, clan, classe, niv, app, fam, titre, arene, duels, stats, hf: [[id, palier]] } ; moi : ma propre fiche
export function fenetreFiche(f, moi = false) {
  if (!f) return;
  const el = ELEMENTS[f.clan], cl = CLASSES[f.classe], paliers = Object.fromEntries(f.hf || []), tot = Object.values(paliers).reduce((s, n) => s + n, 0);
  const titre = HF.nomTitre(f.titre);
  ouvrir(`<div class="fiche ${f.clan}">
      <div class="ficheHaut"><span data-portrait></span>
        <div><h2 id="ficheNom">${esc(f.nom)}${moi ? ' <button class="lien" id="btPseudo" title="Changer de pseudo (ton compte et ta progression ne changent pas)">✏️</button>' : ''}</h2>${titre ? `<p class="titreFi">${TS.titreHTML(f.titre, titre, esc)}</p>` : ''}
          <p><span class="badge ${f.clan}">${el.ico} ${el.clan}</span> ${cl ? `${cl.ico} ${cl.nom}` : ''}${BRANCHES[f.branche] ? ` · ${BRANCHES[f.branche].ico} ${esc(BRANCHES[f.branche].nom)}` : ''}${CHEFS[f.chef] ? ` · ${CHEFS[f.chef].ico} <b>${esc(CHEFS[f.chef].nom)}</b>` : ''} · niv. ${f.niv}${f.statut && f.statut !== 'libre' ? ` · <i>${{ expedition: 'en expédition', duel: 'en duel', arene: 'dans l’arène', combat: 'contre le boss mondial' }[f.statut] || ''}</i>` : ''}</p>
          ${f.fam ? `<p class="famFiche"><span data-fam="${esc(f.fam)}"></span> ${esc(F.FAMILIERS[f.fam]?.nom || '')}</p>` : ''}</div></div>
      <div class="ficheStats">
        <div><b>${rangTxt(f.arene.elo)}</b><small>arène · ${nf(f.arene.elo)} Elo</small></div>
        <div><b>${rangTxt(f.arene.meilleur)}</b><small>meilleur rang</small></div>
        <div><b>${f.duels.g} / ${f.duels.p}</b><small>duels gagnés / perdus</small></div>
        <div><b>${nf(f.stats.victoires)}</b><small>combats gagnés</small></div>
        <div><b>${nf(f.stats.boss)}</b><small>boss vaincus</small></div>
        <div><b>${tot} / ${HF.MAX}</b><small>hauts faits</small></div>
      </div>
      <h3>🏅 Hauts faits</h3>
      <div class="hautsFaits">${HF.IDS.map((id) => {
        const h = HF.HAUTS_FAITS[id], n = paliers[id] || 0;
        if (!moi && !n) return '';
        const vv = moi ? h.val(p) : null, seuil = h.n[Math.min(2, n)];
        return `<div class="hf ${n ? `p${n}` : 'aucun'}"><span class="hfIco">${h.ico}</span><div><b>${esc(h.nom)}</b> <span class="hfPal">${HF.PALIERS.map((x, i) => `<i class="${i < n ? 'ok' : ''}">${x}</i>`).join('')}</span>
          <small>${n ? `« ${esc(h.titres[n - 1])} »` : ''}${moi && n < 3 ? ` ${n ? '· ' : ''}${nf(vv)} / ${nf(seuil)} ${esc(h.txt)}${h.seuils ? ` (${h.seuils[n]})` : ''}` : ''}</small>
          ${moi && n < 3 ? `<i class="hfBarre"><b style="width:${Math.min(100, (vv / seuil) * 100)}%"></b></i>` : ''}</div>
          ${moi && n ? `<select data-hf="${id}"><option value="">Afficher un titre…</option>${h.titres.slice(0, n).map((t, i) => `<option value="${id}:${i + 1}" ${p.titre === `${id}:${i + 1}` ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}</div>`;
      }).join('') || '<p>Pas encore de haut fait.</p>'}</div>
      ${moi && p.branche ? `<p class="cout">${p.titre === `br:${p.branche}` ? '' : `<button class="lien" id="btTitreBranche">Afficher le titre « ${esc(BRANCHES[p.branche].titre)} »</button>`}</p>` : ''}${moi && CHEFS[p.chef] && p.titre !== `ch:${p.chef}` ? `<p class="cout"><button class="lien" id="btTitreChef">Afficher le titre « ${esc(CHEFS[p.chef].titre)} »</button></p>` : ''}${moi ? SG.LISTE.filter((k) => SG.vaincu(p, k) && p.titre !== `sg:${k}`).map((k) => `<p class="cout"><button class="lien" data-titre-sg="${k}">Afficher le titre « ${esc(SG.SEIGNEURS[k].titre)} »</button></p>`).join('') : ''}
      ${moi ? ['feu', 'eau', 'plante', 'brisees', 'cimes', 'ambre', 'ciel'].filter((c) => QP.amiDe(p, c) && p.titre !== `vil:${c}`).map((c) => `<p class="cout"><button class="lien" data-titrevil="${c}">Afficher le titre « ${esc(QP.TITRES[c])} »</button></p>`).join('') : ''}
      ${moi ? Object.keys(GR.TITRES).filter((n) => GR.aTitre(p, n) && p.titre !== `gri:${n}`).map((n) => `<p class="cout"><button class="lien" data-titre="gri:${n}">Afficher le titre « ${esc(GR.TITRES[n])} »</button></p>`).join('') : ''}
      ${moi && p.titre ? '<p class="cout"><button class="lien" id="btSansTitre">Ne plus afficher de titre</button></p>' : ''}
      ${moi ? '' : boutonAmi(f)}
    </div>`, () => {
    $('fenetreCorps').dataset.vue = moi ? 'ficheMoi' : 'fiche';
    if (!moi) brancherFiche();   // v93
    $('fenetreCorps').querySelector('[data-portrait]').replaceWith(portrait(f.clan, f.classe, f.app));
    $('fenetreCorps').querySelector('[data-fam]')?.replaceWith(vignetteFamilier(f.fam, 2));
    $('fenetreCorps').querySelectorAll('[data-hf]').forEach((s) => s.onchange = async () => { if (!s.value) return; const r = await faire('titreChoisir', { t: s.value }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); toast(`🏅 Ton titre : « ${esc(HF.nomTitre(s.value))} »`); maFiche(); });
    $('btTitreBranche') && ($('btTitreBranche').onclick = async () => { await faire('titreChoisir', { t: `br:${p.branche}` }); maFiche(); });
    for (const b of document.querySelectorAll('[data-titre-sg]')) b.onclick = async () => { await faire('titreChoisir', { t: `sg:${b.dataset.titreSg}` }); maFiche(); };   // v124
    $('btTitreChef') && ($('btTitreChef').onclick = async () => { await faire('titreChoisir', { t: `ch:${p.chef}` }); maFiche(); });
    $('btPseudo') && ($('btPseudo').onclick = () => {
      $('ficheNom').innerHTML = `<input class="champDeck" id="champPseudo" maxlength="16" value="${esc(p.nom)}"> <button class="bouton" id="okPseudo">OK</button>`;
      const ch = $('champPseudo'); ch.focus(); ch.select();
      const valider = async () => {
        const r = await faire('renommer', { nom: ch.value });
        if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
        toast(`✏️ Tu t’appelles désormais <b>${esc(r.res.nom)}</b>. Ton compte, ta maison et ta progression ne bougent pas. (Prochain changement possible dans 24 h.)`); setTimeout(maFiche, 200);
      };
      $('okPseudo').onclick = valider; ch.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') valider(); if (e.key === 'Escape') maFiche(); };
    });
    $('fenetreCorps').querySelectorAll('[data-titre]').forEach((b) => b.onclick = async () => { await faire('titreChoisir', { t: b.dataset.titre }); maFiche(); });
    $('fenetreCorps').querySelectorAll('[data-titrevil]').forEach((b) => b.onclick = async () => { await faire('titreChoisir', { t: `vil:${b.dataset.titrevil}` }); maFiche(); });
    $('btSansTitre') && ($('btSansTitre').onclick = async () => { await faire('titreChoisir', { t: null }); maFiche(); });
  });
}
export function maFiche() {
  if (!p) return;
  const a = p.arene || {};
  fenetreFiche({ nom: p.nom, clan: p.clan, classe: p.classe, branche: p.branche || '', chef: p.chef || '', niv: niveau(), app: AP.code(p), fam: F.actif(p) || '', titre: HF.titreDe(p),
    arene: { elo: a.elo || 1000, meilleur: Math.max(a.meilleur || 0, p.stats.areneMax || 0), v: a.v || 0, d: a.d || 0 }, duels: { g: p.duels?.gagnes || 0, p: p.duels?.perdus || 0 },
    stats: { victoires: p.stats.victoires || 0, boss: p.stats.boss || 0 }, hf: HF.IDS.map((id) => [id, HF.palierDe(p, id)]).filter((x) => x[1] > 0) }, true);
}
export function voirFiche(id) {
  if (id === 'moi') return maFiche();
  if (!room) return toast('Connexion au serveur…');
  room.send('fiche', { id });
}
// un nouveau palier de haut fait : on l'annonce
let vus = null;
export function suivreHautsFaits() {
  const o = HF.obtenus(p);
  if (vus) for (const k of o) if (!vus.has(k)) { const [id, n] = k.split(':'); sfx.fanfare(); toast(`🏅 Haut fait ${HF.PALIERS[n - 1]} : <b>${esc(HF.HAUTS_FAITS[id].nom)}</b> — titre « ${esc(HF.HAUTS_FAITS[id].titres[n - 1])} » débloqué (menu ☰ → Ma fiche).`); }
  vus = o;
  if (!$('fenetre').classList.contains('cache') && $('fenetreCorps').dataset.vue === 'ficheMoi') maFiche();
}
$('btFiche').onclick = () => maFiche();
$('listeClans').addEventListener('click', (e) => { const s = e.target.closest('[data-fiche]'); if (s) voirFiche(s.dataset.fiche); });
addEventListener('keydown', (e) => { if ((e.key === 'h' || e.key === 'H') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) { menuBarre(false); maFiche(); } });
