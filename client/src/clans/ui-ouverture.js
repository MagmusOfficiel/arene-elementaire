// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'ouverture d'un tirage (v119), façon booster
//  Un paquet aux couleurs du clan au centre de l'écran : on clique, il
//  tremble et explose en lumière ; les cartes se posent face cachée, chacune
//  entourée de l'aura de sa rareté (bleue = rare, violette = épique, dorée =
//  légendaire). On les retourne une à une (clic), ou toutes d'un coup.
//  Une légendaire fait trembler l'écran et pleuvoir des étincelles.
// =====================================================================
import { CARTES, ELEMENTS, RARETES } from '../../../shared/clans/cartes.js';
import { sfx } from '../sfx.js';
import { cg } from './crazygames.js';
import { ICO_RESS, carteHTML, esc, p } from './ui-commun.js';

const ORDRE = { commune: 0, rare: 1, epique: 2, legendaire: 3 };
const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// cartes : [{ id, nouveau, eclats }] (le résultat du serveur) ; fini : appelée quand on ferme
export function ouvrirTirage(cartes, fini = () => {}) {
  if (!cartes?.length) return fini();
  document.querySelector('.ouvTirage')?.remove();
  const meilleure = cartes.reduce((m, x) => Math.max(m, ORDRE[CARTES[x.id].rarete] || 0), 0);
  const clan = p?.clan || 'feu', el = ELEMENTS[clan];
  const o = document.createElement('div');
  o.className = `ouvTirage c-${clan}`;
  o.innerHTML = `<div class="ouvFond"></div>
    <div class="ouvPaquet" role="button" tabindex="0" aria-label="Ouvrir le paquet">
      <div class="ouvPaquetFace"><span class="ouvEmbleme">${el.ico}</span><b>${cartes.length > 1 ? `×${cartes.length}` : ''}</b><small>Clique pour ouvrir</small></div>
    </div>
    <div class="ouvCartes n${cartes.length > 5 ? 'Beaucoup' : 'Peu'}"></div>
    <div class="ouvBas"><button class="bouton second" id="ouvTout">Tout retourner</button><button class="bouton cache" id="ouvFini">Continuer</button></div>`;
  document.body.appendChild(o);
  const zone = o.querySelector('.ouvCartes'), paquet = o.querySelector('.ouvPaquet');
  let reste = cartes.length, ouvert = false;

  const finir = () => { o.classList.add('sortie'); setTimeout(() => { o.remove(); fini(); }, calme() ? 0 : 300); };
  const retourner = (el, x) => {
    if (el.classList.contains('face')) return;
    el.classList.add('face');
    const r = CARTES[x.id].rarete;
    if (r === 'legendaire') { sfx.tirage('legendaire'); zone.classList.add('secousse'); setTimeout(() => zone.classList.remove('secousse'), 600); etincelles(el); cg.fete(); }
    else if (r === 'epique') sfx.tirage('epique');
    else if (r === 'rare') sfx.tirage('rare');
    else sfx.tick?.();
    if (!--reste) { o.querySelector('#ouvTout').classList.add('cache'); o.querySelector('#ouvFini').classList.remove('cache'); o.querySelector('#ouvFini').focus(); }
  };
  const ouvrir = () => {
    if (ouvert) return; ouvert = true;
    paquet.classList.add('tremble', `aura${meilleure}`);
    sfx.orb?.();
    setTimeout(() => {
      paquet.classList.add('explose'); o.classList.add('flash');
      cartes.forEach((x, i) => {
        const r = CARTES[x.id].rarete;
        const d = document.createElement('div');
        d.className = `ouvCarte r-${r}`;
        d.style.setProperty('--i', i);
        d.title = 'Clique pour retourner';
        d.innerHTML = `<div class="ouvInt"><div class="ouvDos"><span>${el.ico}</span></div>
          <div class="ouvFace">${carteHTML(x.id, p.collection[x.id]?.niv || 1)}
            ${x.nouveau ? '<span class="ouvNouveau">NOUVEAU</span>' : ''}
            ${x.eclats ? `<span class="ouvEclats">+${x.eclats} ${ICO_RESS.eclats}</span>` : ''}
            <span class="ouvRarete">${esc(RARETES[r].nom)}</span></div></div>`;
        d.onclick = () => retourner(d, x);
        zone.appendChild(d);
      });
      setTimeout(() => paquet.remove(), 500);
    }, calme() ? 0 : 750);
  };
  paquet.onclick = ouvrir;
  paquet.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } };
  o.querySelector('#ouvTout').onclick = () => {
    if (!ouvert) ouvrir();
    // les plus rares en dernier, pour garder la surprise
    setTimeout(() => [...zone.children].map((d, i) => [d, cartes[i]]).sort((a, b) => ORDRE[CARTES[a[1].id].rarete] - ORDRE[CARTES[b[1].id].rarete])
      .forEach(([d, x], k) => setTimeout(() => retourner(d, x), k * (calme() ? 0 : 140))), ouvert && zone.children.length ? 0 : 900);
  };
  o.querySelector('#ouvFini').onclick = finir;
  o.addEventListener('keydown', (e) => { if (e.key === 'Enter' && reste === 0) finir(); });
  setTimeout(() => paquet.focus(), 50);
}

// une pluie d'étincelles dorées autour d'une légendaire
function etincelles(el) {
  if (calme()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('i');
    s.className = 'ouvEtincelle';
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
    s.style.left = `${r.left + r.width / 2}px`; s.style.top = `${r.top + r.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    s.style.animationDelay = `${Math.random() * 0.15}s`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  }
}
