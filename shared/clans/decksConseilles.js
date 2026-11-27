// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les decks conseillés (v85)
//  Pur (client + serveur). Pour chaque clan et chaque classe, trois styles
//  de jeu construits depuis les cartes du jeu : on voit la liste complète,
//  ce qu'on possède déjà, et on peut l'appliquer (les cartes manquantes sont
//  remplacées par les meilleures cartes qu'on a pour ce style).
// =====================================================================
import { CARTES, RARETES } from './cartes.js';
import { DECK_MIN, copiesMax, nettoyerDeck, pourClasse } from './profil.js';

export const TAILLE = 20;   // v91
export const STYLES = {
  assaut: { nom: 'Assaut', ico: '⚔️', desc: 'Frapper fort et vite : beaucoup d’attaques, de la force, des dégâts de zone.', diff: 1 },
  rempart: { nom: 'Rempart', ico: '🛡️', desc: 'Tenir le choc : boucliers, soins, épines, puis contre-attaque.', diff: 1 },
  maitrise: { nom: 'Maîtrise', ico: '🧠', desc: 'Contrôler le combat : affaiblir, tremper, piocher, copier et jouer plus de cartes par tour.', diff: 2 },
};
// les deux styles mis en avant pour chaque clan (le premier est conseillé pour débuter)
export const PAR_CLAN = { feu: ['assaut', 'maitrise', 'rempart'], eau: ['maitrise', 'rempart', 'assaut'], plante: ['rempart', 'assaut', 'maitrise'] };

const RANG = Object.fromEntries(Object.keys(RARETES).map((r, i) => [r, i]));
function score(id, style) {
  const c = CARTES[id], e = c.effets || {};
  const deg = (e.degats || 0) * (e.fois || 1) * (e.tous ? 1.6 : 1) + (e.degatsParBrulure || 0) * 3 + (e.degatsParAffaibli || 0) * 3 + (e.bouclierEnDegats ? 6 : 0);
  const def = (e.bouclier || 0) + (e.soin || 0) * 1.2 + (e.regen || 0) * 2 + (e.epines || 0) * 2.5 + (e.doubleBouclier ? 8 : 0);
  const ctrl = (e.affaibli || 0) * 4 + (e.trempe || 0) * 4 + (e.pioche || 0) * 3.5 + (e.dupliquer || 0) * 5 + (e.reduction || 0) * 6 + (e.energie || 0) * 5;
  const bonus = (e.force || 0) * 4 + (e.brulure || 0) * 2.5 + (e.appel || 0) * 2;
  const v = style === 'assaut' ? deg * 1.4 + bonus + ctrl * 0.4 + def * 0.2 : style === 'rempart' ? def * 1.4 + (e.epines || 0) * 2 + deg * 0.5 + ctrl * 0.4 : ctrl * 1.4 + bonus * 0.6 + deg * 0.6 + def * 0.5;
  return v / Math.max(1, c.cout) + RANG[c.rarete] * 0.8 - (c.cout >= 3 ? 2 : 0);
}
// les cartes que ce clan + cette classe (+ branche) peut avoir : son élément, les neutres, sa classe
export const pool = (clan, classe, branche = null) => Object.keys(CARTES).filter((id) => {
  const c = CARTES[id]; return !c.cachee && !c.trophee && (c.element === clan || c.element === 'neutre') && pourClasse(id, classe, branche) && !(c.exclusif && c.exclusif !== clan);
});
// le deck conseillé (14 cartes) ; possede(id) -> nombre d'exemplaires, pour « ce que j'ai »
// quotas : de quoi taper et de quoi tenir dans tous les styles
const QUOTAS = { assaut: { attaque: 11, defense: 5 }, rempart: { defense: 9, attaque: 6 }, maitrise: { attaque: 7, defense: 5 } };
export function construire(clan, classe, style, branche = null, possede = null) {
  const ids = pool(clan, classe, branche).filter((id) => !possede || possede(id) > 0).sort((a, b) => score(b, style) - score(a, style) || a.localeCompare(b));
  const deck = [], compte = {}; let chers = 0;
  const prendre = (id) => {
    const max = Math.min(copiesMax(id), possede ? possede(id) : copiesMax(id));
    if ((compte[id] || 0) >= max || deck.length >= TAILLE || (CARTES[id].cout >= 2 && chers >= 7)) return false;
    deck.push(id); compte[id] = (compte[id] || 0) + 1; if (CARTES[id].cout >= 2) chers++; return true;
  };
  for (const [type, n] of Object.entries(QUOTAS[style] || {})) { let k = 0; for (const id of ids) { if (k >= n) break; if (CARTES[id].type !== type) continue; while (k < n && prendre(id)) k++; } }
  for (const id of ids) { while (deck.length < TAILLE && prendre(id)); if (deck.length >= TAILLE) break; }
  return deck.sort((a, b) => CARTES[a].cout - CARTES[b].cout || CARTES[a].nom.localeCompare(CARTES[b].nom, 'fr'));
}
export const conseilles = (clan, classe, branche = null) => PAR_CLAN[clan].map((style, i) => ({ style, ...STYLES[style], conseille: i === 0, cartes: construire(clan, classe, style, branche) }));
// appliquer un style au deck actif : la liste idéale, avec ce qu'on possède ; on complète avec les meilleures cartes qu'on a
export function appliquer(p, style) {
  if (!STYLES[style]) return { ok: false, raison: 'Style inconnu.' };
  if (p.expedition) return { ok: false, raison: 'Impossible de changer de deck pendant une expédition.' };
  const a = (id) => p.collection?.[id]?.n || 0;
  const ideal = construire(p.clan, p.classe, style, p.branche || null), deck = [], compte = {};
  for (const id of ideal) if ((compte[id] || 0) < a(id)) { deck.push(id); compte[id] = (compte[id] || 0) + 1; }
  for (const id of construire(p.clan, p.classe, style, p.branche || null, a)) { if (deck.length >= TAILLE) break; if ((compte[id] || 0) < Math.min(a(id), copiesMax(id))) { deck.push(id); compte[id] = (compte[id] || 0) + 1; } }
  const propre = nettoyerDeck(p, deck);
  if (propre.length < DECK_MIN) return { ok: false, raison: `Il te faut au moins ${DECK_MIN} cartes utiles pour ce style : tire d’autres cartes à l’autel.` };
  p.deck = propre;
  return { ok: true, n: propre.length, manque: ideal.length - ideal.filter((id, i) => ideal.slice(0, i + 1).filter((x) => x === id).length <= a(id)).length };
}
