// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la fenêtre du marchand ambulant (v58)
//  Les règles sont dans shared/clans/marchand.js.
// =====================================================================
import * as MA from '../../../shared/clans/marchand.js';
import { sfx } from '../sfx.js';
import { $, ICO_RESS, esc, nf, p, toast } from './ui-commun.js';
import { guide, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';

const ICO = ICO_RESS;
const lot = (o) => Object.entries(o).map(([k, v]) => `<b>${nf(v)}</b> ${ICO[k] || k}`).join(' + ');

export function fenetreMarchand() {
  guide.vu('a_marchand');
  const m = MA.marchandDe(), pris = MA.achats(p, m.slot), min = Math.max(1, Math.ceil((m.part - Date.now()) / 60000));
  ouvrir(`<h2>🛒 Le marchand ambulant</h2>
    <p class="sousTitre">« Bien le bonjour ! Je ne reste jamais longtemps au même endroit : encore <b>${min} min</b> ${esc(m.place)}, puis je reprends la route avec d'autres affaires. » Chaque échange se fait une fois par passage.</p>
    <div class="marchand">${m.offres.map((o, i) => {
      const fait = pris.includes(i), ok = MA.peutPayer(p, o);
      return `<div class="offre ${fait ? 'prise' : ''}"><div class="echange"><span>${lot(o.donne)}</span><i>→</i><span>${lot(o.recoit)}</span></div>
        ${fait ? '<span class="porte">✓ Échangé</span>' : `<button class="bouton" data-offre="${i}" ${ok ? '' : 'disabled'}>${ok ? 'Échanger' : 'Pas assez'}</button>`}</div>`;
    }).join('')}</div>
    <p class="cout">Tu as ${['essence', 'eclats', 'braises', 'perles', 'seve', 'cristal', 'perle_noire', 'graine_or'].filter((k) => k === 'essence' || p.ress[k] > 0).map((k) => `${nf(p.ress[k] || 0)} ${ICO[k]}`).join(' · ')}</p>`, () => {
    $('fenetreCorps').dataset.vue = 'marchand';
    $('fenetreCorps').querySelectorAll('[data-offre]').forEach((b) => b.onclick = async () => {
      const r = await faire('marchandAcheter', { i: +b.dataset.offre });
      if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.orb(); toast(`🛒 Marché conclu : ${lot(r.res.recoit)} !`); fenetreMarchand();
    });
  });
}
// quand il change de place : une annonce discrète
export function marchandBouge(m) { if (p) toast(`🛒 Le marchand ambulant s'installe ${esc(m.place)} pour 20 minutes.`); }
