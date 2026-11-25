// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la fenêtre du Grimoire (v80)
//  Les règles sont dans shared/clans/grimoire.js.
// =====================================================================
import { CARTES, RARETES } from '../../../shared/clans/cartes.js';
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import * as GR from '../../../shared/clans/grimoire.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, ILLUS_MONSTRES, carteHTML, esc, nf, p, toast } from './ui-commun.js';
import { dansMonde, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';

let onglet = 'cartes', terre = null;
const ICO_INT = { a: '🗡️', d: '🛡️', f: '💪', e: '🌵', b: '🔥', t: '💧', w: '🥀', s: '💚', g: '🛡️👥', p: '⚡', m: '🎯', v: '🩸' };
const intentionTxt = (it) => Object.entries(it).filter(([k]) => k !== 'n').map(([k, v]) => `${ICO_INT[k] || ''}${v}${k === 'a' && it.n > 1 ? `×${it.n}` : ''}`).join(' ');
export const texteRec = (p0, x) => [x.rec.essence && `${nf(x.rec.essence)} ${ICO_RESS.essence}`, x.rec.eclats && `${x.rec.eclats} ${ICO_RESS.eclats}`, x.rec.rare && `${x.rec.rare} ${ICO_RESS[GR.rareDe(p0, x)] || ''}`, x.rec.titre && `titre « ${esc(GR.TITRES[x.rec.titre.split(':')[1]])} »`].filter(Boolean).join(' · ');

export function majPastilleG() { const n = p ? GR.aReclamer(p) : 0, el = $('pastilleG'); if (el) { el.textContent = n; el.classList.toggle('cache', !n); } }

function vueCartes() {
  const ids = GR.cartesDe(p), n = ids.filter((id) => GR.possede(p, id)).length;
  return `<p class="sousTitre">Toutes les cartes que ta classe${p.branche ? ' et ta branche' : ''} peut obtenir. Les cartes encore inconnues sont cachées : seules leur rareté et leur élément se devinent. <b>${n} / ${ids.length}</b> découvertes.</p>
    ${GR.ORDRE_RARETE.map((r) => {
      const l = ids.filter((id) => CARTES[id].rarete === r); if (!l.length) return '';
      return `<h3 class="grTitre" style="color:${RARETES[r].couleur}">${esc(RARETES[r].nom)}s <small>${l.filter((id) => GR.possede(p, id)).length} / ${l.length}</small></h3>
        <div class="grilleCartes grCartes">${l.map((id) => (GR.possede(p, id) ? carteHTML(id, p.collection[id].niv || 1)
          : `<div class="carte ${CARTES[id].element} r-${r} grInconnue" title="Carte encore inconnue (${esc(RARETES[r].nom)})"><span class="cc">?</span><div class="cn">???</div><div class="ci">❔</div><div class="ct"><span class="gemme"></span></div></div>`)).join('')}</div>`;
    }).join('')}`;
}
function vueBestiaire() {
  terre = terre || p.clan;
  const ms = [...GR.monstresDe(terre), GR.TITANS[GR.TERRES.indexOf(terre)]], vus = ms.filter((m) => GR.vu(p, m.id)).length;
  return `<div class="filtres">${GR.TERRES.map((t) => `<button data-terre="${t}" class="${t === terre ? 'actif' : ''}">${TERRITOIRES[t].ico} ${esc(TERRITOIRES[t].nom)} <small>${GR.monstresDe(t).filter((m) => GR.vu(p, m.id)).length}/${GR.monstresDe(t).length}</small></button>`).join('')}</div>
    <p class="sousTitre">Les monstres que tu as vaincus en expédition. <b>${vus} / ${ms.length}</b> sur cette terre (titan du Cauchemar compris), dont <b>${ms.filter((m) => GR.maitrise(p, m)).length}</b> fiches maîtrisées ★★★. Maîtrise-les toutes pour gagner le titre « ${esc(GR.TITRES[`b_${terre}`] || '')} ».</p>
    <div class="bestiaire">${ms.map((m) => {
      const v = GR.vaincus(p)[m.id] || 0, illus = ILLUS_MONSTRES.has(m.id);
      if (!v) return `<div class="bete inconnue ${m.rang}"><div class="portrait">❔</div><b>???</b><small>${esc(GR.ouVoir(m, terre))}</small></div>`;
      // v101 : la fiche se remplit : découvert → étudié (ses intentions) → maîtrisé (étoile d'or)
      const nv = GR.niveauFiche(p, m), suiv = GR.prochainSeuil(p, m), etoiles = '★'.repeat(nv) + '☆'.repeat(3 - nv);
      return `<div class="bete ${m.rang} fiche${nv}"><div class="portrait" style="${illus ? `background-image:url(${import.meta.env.BASE_URL}clans/monstres/${m.id}.webp)` : ''}">${illus ? '' : m.ico}</div>
        <b>${esc(m.nom)} <span class="ficheEt" title="Fiche ${GR.NIVEAUX_FICHE[nv]}">${etoiles}</span></b><small>${esc(GR.ouVoir(m, terre))} · vaincu ${nf(v)} fois · fiche <b>${GR.NIVEAUX_FICHE[nv]}</b>${suiv ? ` (prochaine étape : ${suiv} victoires)` : ''}</small>
        ${nv >= 2 ? `<small>${m.pv} PV de base</small><p class="beteInt" title="Ses intentions, dans l’ordre (il commence à un endroit au hasard)">${m.intentions.map(intentionTxt).join(' → ')}</p>` : '<p class="beteInt">🔒 Ses PV et ses intentions se révèlent quand la fiche est « étudiée ».</p>'}</div>`;
    }).join('')}</div>`;
}
function vueRecompenses() {
  const l = GR.recompenses(p);
  const ligne = (x) => `<div class="grRec ${x.recu ? 'recu' : x.fait ? 'pret' : ''}"><span class="grIco">${x.ico}</span><div><b>${esc(x.txt)}</b><small>${texteRec(p, x)}</small>
      <i class="hfBarre"><b style="width:${Math.min(100, (x.v / x.max) * 100)}%"></b></i></div>
      ${x.recu ? '<span class="grOk">✓</span>' : x.fait ? `<button class="bouton" data-rec="${x.cle}">Réclamer</button>` : `<span class="grProg">${x.v} / ${x.max}</span>`}</div>`;
  return `<h3>📖 Les cartes</h3>${l.filter((x) => x.livre === 'cartes').map(ligne).join('')}<h3>🐾 Le bestiaire</h3>${l.filter((x) => x.livre === 'bestiaire').map(ligne).join('')}`;
}
export function fenetreGrimoire(o) {
  if (o) onglet = o;
  const n = GR.aReclamer(p);
  ouvrir(`<h2>📚 Le Grimoire</h2>
    <div class="filtres grOnglets">${[['cartes', '🃏 Cartes'], ['bestiaire', '🐾 Bestiaire'], ['recompenses', `🎁 Récompenses${n ? ` <i class="pastilleMenu">${n}</i>` : ''}`]].map(([k, t]) => `<button data-o="${k}" class="${k === onglet ? 'actif' : ''}">${t}</button>`).join('')}</div>
    ${onglet === 'cartes' ? vueCartes() : onglet === 'bestiaire' ? vueBestiaire() : vueRecompenses()}`, () => {
    $('fenetreCorps').dataset.vue = 'grimoire';
    $('fenetreCorps').querySelectorAll('[data-o]').forEach((b) => b.onclick = () => fenetreGrimoire(b.dataset.o));
    $('fenetreCorps').querySelectorAll('[data-terre]').forEach((b) => b.onclick = () => { terre = b.dataset.terre; fenetreGrimoire(); });
    $('fenetreCorps').querySelectorAll('[data-rec]').forEach((b) => b.onclick = async () => {
      const r = await faire('grimoireReclamer', { cle: b.dataset.rec }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.niveau(); toast(`📚 Récompense du grimoire : ${Object.entries(r.res).map(([k, v]) => (k === 'titre' ? `titre « ${esc(GR.TITRES[v.split(':')[1]])} »` : `+${nf(v)} ${ICO_RESS[k] || ''}`)).join(' · ')}`);
      majPastilleG(); fenetreGrimoire();
    });
  });
}
$('btGrimoire').onclick = () => fenetreGrimoire();
addEventListener('keydown', (e) => { if ((e.key === 'g' || e.key === 'G') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) fenetreGrimoire(); });
