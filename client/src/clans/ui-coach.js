// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le tutoriel guidé (v94)
//  Une bulle qui montre un endroit de l'écran (le reste s'assombrit) et
//  explique en une phrase. « Suivant » ou un clic sur la zone montrée.
//  Chaque tutoriel n'est montré qu'une fois par appareil.
// =====================================================================
import { $ } from './ui-commun.js';

const vu = (cle) => { try { return localStorage.getItem(`clansTuto:${cle}`) === '1'; } catch { return false; } };
const marquer = (cle) => { try { localStorage.setItem(`clansTuto:${cle}`, '1'); } catch { /* rien */ } };
let actif = null;

// etapes : [{ cible: sélecteur CSS, txt: HTML, cote: 'haut'|'bas'|'gauche'|'droite' }]
export function coach(cle, etapes) {
  if (actif || vu(cle) || globalThis.__pasDeTuto) return false;
  let i = 0;
  const voile = document.createElement('div'); voile.id = 'coachVoile';
  const trou = document.createElement('div'); trou.id = 'coachTrou';
  const bulle = document.createElement('div'); bulle.id = 'coachBulle';
  document.body.append(voile, trou, bulle);
  const fin = () => { marquer(cle); voile.remove(); trou.remove(); bulle.remove(); removeEventListener('resize', placer); actif = null; };
  function placer() {
    const e = etapes[i], el = e.cible ? document.querySelector(e.cible) : null;
    const r = el?.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 8;
    if (r && r.width) Object.assign(trou.style, { display: 'block', left: `${r.left - m}px`, top: `${r.top - m}px`, width: `${r.width + 2 * m}px`, height: `${r.height + 2 * m}px` });
    else trou.style.display = 'none';
    bulle.innerHTML = `<p>${e.txt}</p><div class="coachBas"><small>${i + 1} / ${etapes.length}</small><button class="lien" data-passer>Passer</button><button class="bouton petit" data-suivant>${i === etapes.length - 1 ? 'Compris !' : 'Suivant ›'}</button></div>`;
    const bw = Math.min(320, W - 20), bh = bulle.offsetHeight || 120;
    let x = W / 2 - bw / 2, y = H / 2 - bh / 2;
    if (r && r.width) {
      const cote = e.cote || (r.top > H / 2 ? 'haut' : 'bas');
      if (cote === 'haut') { x = r.left + r.width / 2 - bw / 2; y = r.top - bh - 18; }
      else if (cote === 'bas') { x = r.left + r.width / 2 - bw / 2; y = r.bottom + 18; }
      else if (cote === 'gauche') { x = r.left - bw - 18; y = r.top + r.height / 2 - bh / 2; }
      else { x = r.right + 18; y = r.top + r.height / 2 - bh / 2; }
    }
    Object.assign(bulle.style, { width: `${bw}px`, left: `${Math.max(10, Math.min(W - bw - 10, x))}px`, top: `${Math.max(10, Math.min(H - bh - 10, y))}px` });
    bulle.querySelector('[data-suivant]').onclick = suivant;
    bulle.querySelector('[data-passer]').onclick = fin;
  }
  function suivant() { i++; if (i >= etapes.length) fin(); else placer(); }
  voile.onclick = suivant; trou.onclick = suivant;
  addEventListener('resize', placer);
  actif = { fin }; placer(); requestAnimationFrame(placer);
  return true;
}
export const coachActif = () => !!actif;
export const fermerCoach = () => actif?.fin();

// ---------- le premier combat ----------
export function tutoCombat() {
  return coach('combat', [
    { cible: '#cbMain', txt: '🃏 <b>Ta main</b> : 5 cartes tirées de ton deck à chaque tour. Le rond en haut à gauche d’une carte, c’est son <b>coût en énergie</b>.' },
    { cible: '#cbEnergie', txt: '⚡ <b>Ton énergie</b> : 3 par tour (4 avec une branche d’Ascension). Elle revient pleine à chaque tour, alors dépense-la !' },
    { cible: '#cbEnnemis', txt: '👁️ Au-dessus de chaque ennemi : <b>ce qu’il va faire</b> à la fin de ton tour (🗡 attaque, 🛡 bouclier, 💚 soin…). Survole-le pour le détail.' },
    { cible: '#cbMain', txt: '⚔️ Pour jouer : <b>clique une carte, puis un ennemi</b> (ou touche 1 à 9). Les boucliers et les sorts sans cible partent tout de suite.' },
    { cible: '#cbHeros', txt: '🛡 Ton <b>bouclier</b> (le chiffre bleu) encaisse les coups avant tes PV, mais il disparaît au tour suivant. L’annonce rouge dit combien tu vas perdre.' },
    { cible: '#btFinTour', txt: '⏭ Plus d’énergie ou plus rien d’utile ? <b>Fin du tour</b> (touche E) : les ennemis agissent, puis tu repioches. À toi de jouer !' },
  ]);
}
// ---------- la première visite du deck ----------
export function tutoDeck() {
  return coach('deck', [
    { cible: '.grilleCartes', txt: '📚 À gauche, <b>ta collection</b> : toutes les cartes que tu possèdes. Tu en gagnes à l’<b>Autel des tirages</b>, au Carrefour.' },
    { cible: '.colDeck', txt: '🃏 À droite, <b>ton deck</b> : les cartes que tu joues en combat. Entre <b>20 et 30 cartes</b>, 2 exemplaires au plus (1 pour une légendaire).' },
    { cible: '.grilleCartes .actions', txt: '➕ <b>+ Deck</b> ajoute un exemplaire, <b>⬆</b> améliore la carte (éclats + matériaux de ton clan) : plus de dégâts, plus de bouclier.' },
    { cible: '#btConseils', txt: '📋 Pas d’idée ? Les <b>decks conseillés</b> construisent un deck tout prêt (assaut, rempart ou maîtrise) avec les cartes que tu as.' },
  ]);
}
