// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les Seigneurs de chapitre (v124)
//  On les défie à leur monument (touche E) ; la fenêtre montre aussi la
//  progression sur les cinq.
// =====================================================================
import * as SG from '../../../shared/clans/seigneurs.js';
import { REPERE } from '../../../shared/clans/reperes.js';
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, ILLUS_MONSTRES, carteHTML, esc, niveau, p, toast } from './ui-commun.js';
import { ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { lancerCombat } from './ui-combat.js';

const B = import.meta.env.BASE_URL;
const portrait = (id, s) => (ILLUS_MONSTRES.has(s.ennemis()[0].id) ? `<img src="${B}clans/monstres/${s.ennemis()[0].id}.webp" alt="">` : `<span class="sgIco">${s.ico}</span>`);
const recHTML = (r) => [`+${r.essence} ${ICO_RESS.essence}`, r.eclats ? `+${r.eclats} ${ICO_RESS.eclats}` : '', r.rare ? `+${r.rare.n} ${ICO_RESS[r.rare.id] || ''}` : ''].filter(Boolean).join(' · ');
const lieuxTxt = (s) => s.lieux.map((l) => REPERE[l]?.nom).filter(Boolean).join(', ');

export function fenetreSeigneur(id = null) {
  if (!p) return;
  id = SG.valide(id) ? id : SG.LISTE.find((k) => SG.ouvert(p, k) && !SG.vaincu(p, k)) || SG.LISTE[0];
  const s = SG.SEIGNEURS[id], ouv = SG.ouvert(p, id), vaincu = SG.vaincu(p, id), e = p.seigneurs?.[id], rec = SG.recompense(p, id);
  const liste = SG.LISTE.map((k) => { const x = SG.SEIGNEURS[k], v = SG.vaincu(p, k), o = SG.ouvert(p, k); return `<button class="sgOnglet ${k === id ? 'actif' : ''} ${v ? 'vaincu' : o ? 'ouvert' : 'verrou'}" data-sg="${k}" title="${esc(x.nom)}">${v ? '👑' : o ? x.ico : '🔒'}<small>Ch. ${x.chap}</small></button>`; }).join('');
  ouvrir(`<div class="seigneurs">
    <h2>👑 Seigneurs de chapitre <small>· ${SG.nbVaincus(p)} / ${SG.LISTE.length} vaincus</small></h2>
    <div class="sgOnglets">${liste}</div>
    <div class="sgCorps">
      <div class="sgPortrait ${vaincu ? 'vaincu' : ''}">${portrait(id, s)}</div>
      <div class="sgTexte">
        <h3>${s.ico} ${esc(s.nom)} <small>· chapitre ${s.chap}</small></h3>
        <p class="sousTitre">${esc(s.histoire)}</p>
        <p class="sgRegle"><b>Sa mécanique :</b> ${esc(s.regle)}</p>
        <p class="cout">Trois phases : à 66 % et à 33 % de ses PV, il change de rythme. Niveau conseillé : ${SG.niveauConseille(id)}. On le défie à : <b>${esc(lieuxTxt(s))}</b>.</p>
        ${vaincu ? `<p class="sgFait">👑 Vaincu ${e.victoires} fois${e.record ? ` · record : ${e.record} tours` : ''} · titre « ${esc(s.titre)} »</p>` : ''}
        <p class="cout">${vaincu ? 'Récompense (revanche)' : 'Première victoire'} : ${recHTML(rec)}${vaincu ? '' : ` · le titre « ${esc(s.titre)} » · la légendaire unique :`}</p>
        ${vaincu ? '' : `<div class="cartesChef">${carteHTML(s.trophee)}</div>`}
        ${ouv ? `<button class="bouton" id="btSeigneur">⚔️ ${vaincu ? 'Revanche' : 'Défier'} ${esc(s.nom)}</button>${e?.essais ? ` <small class="cout">${e.essais} tentative${e.essais > 1 ? 's' : ''}</small>` : ''}`
    : `<p class="raison">🔒 Bats d’abord le boss du <b>palier III</b> ${s.chap === 1 ? 'd’un des trois territoires des clans' : `des ${esc(TERRITOIRES[s.terres[0]].nom)}`} (il débloque le Cauchemar) pour pouvoir le défier.</p>`}
      </div>
    </div>
  </div>`);
  $('fenetreCorps').dataset.vue = 'seigneurs';
  for (const b of document.querySelectorAll('[data-sg]')) b.onclick = () => fenetreSeigneur(b.dataset.sg);
  const bt = $('btSeigneur');
  if (bt) bt.onclick = async () => {
    bt.disabled = true;
    const r = await faire('seigneurDebut', { id });
    if (!r.ok) { bt.disabled = false; return toast(esc(r.raison || 'Impossible.')); }
    p.seigneurEssai = { id, graine: r.res.graine };
    lancerCombat({ ...SG.defCombat(p), graine: r.res.graine, decor: s.ressource || p.clan }, 'seigneur');
  };
}
export function apresCombat(rep) {
  if (!rep?.ok) { toast(esc(rep?.raison || 'Combat refusé par le serveur.')); return fenetreSeigneur(); }
  const r = rep.res, s = SG.SEIGNEURS[r.id];
  delete p.seigneurEssai;
  if (!r.victoire) { toast(`💀 ${esc(s.nom)} t’a vaincu${r.tours ? ` au tour ${r.tours}` : ''}. Relis sa mécanique, adapte ton deck, et retente !`); return setTimeout(() => fenetreSeigneur(r.id), 400); }
  sfx.fanfare?.();
  if (!r.premiere) { toast(`👑 ${esc(s.nom)} vaincu en ${r.tours} tours ! ${recHTML(r.rec)}`); return setTimeout(() => fenetreSeigneur(r.id), 400); }
  ouvrir(`<div class="seigneurs"><h2>👑 ${esc(s.nom)} est vaincu !</h2>
    <p>C’est ta première victoire contre lui, et tout le serveur l’a appris.</p>
    <p>Titre gagné : <b>« ${esc(s.titre)} »</b> (affiché). Butin : ${recHTML(r.rec)}.</p>
    <p>Et sa légendaire unique rejoint ta collection :</p>
    <div class="cartesChef">${carteHTML(s.trophee)}</div>
    <button class="bouton" id="btOk">Retour</button></div>`, () => { $('btOk').onclick = () => fenetreSeigneur(r.id); });
}
export { niveau };
