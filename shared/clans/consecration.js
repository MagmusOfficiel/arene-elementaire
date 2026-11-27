// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la Consécration (v122)
//  Au niveau 50, avec une branche, on peut devenir chef de guerre :
//  un duel contre le Fantôme de l'ancien chef — le chef qu'on va devenir.
//  Il a ses sorts, ses talents, un deck au niveau max, joue avec une IA
//  qui calcule ses enchaînements, et des PV fixes (les nôtres aussi).
//  Victoire → le titre, le talent du chef et ses 3 sorts.
// =====================================================================
import { CARTES, CHEFS, BRANCHES, CLASSES, NIV_CHEF, NIV_MAX, chefDe } from './cartes.js';
import { niveau, copiesMax, deckCombat } from './profil.js';
import { jouer, coutDe } from './duel.js';

export const PV_FANTOME = 500;     // fixes : le fantôme est plus solide que toi…
export const PV_CONSACRE = 420;    // …mais tu joues ton propre deck
export const ORDRE_RAR = { legendaire: 0, epique: 1, rare: 2, commune: 3 };

export const peut = (p) => !!p?.branche && !p.chef && niveau(p) >= NIV_CHEF;
export const etat = (p) => (p.chef ? 'fait' : !p.branche ? 'branche' : niveau(p) >= NIV_CHEF ? 'pret' : 'verrou');
export const chefVise = (p) => chefDe(p.branche);
export const nomFantome = (chef) => `Fantôme du ${CHEFS[chef].nom}`.replace('du Œil', 'de l’Œil');

// les sorts du chef (v122) : la Consécration en donne un exemplaire, les suivants sortent aux tirages
export const sortsChef = (chef) => Object.values(CARTES).filter((c) => c.chef === chef).sort((a, b) => ORDRE_RAR[a.rarete] - ORDRE_RAR[b.rarete] || a.cout - b.cout).map((c) => c.id);

// le deck du fantôme : ses sorts de chef, ceux de sa branche, de sa classe et de son élément, tous au niveau max
export const NIV_FANTOME = 2;   // ses cartes : niveau 2 (calibré par simulation, v122)
export function deckFantome(clan, branche, niv = NIV_FANTOME) {
  const chef = chefDe(branche), classe = BRANCHES[branche].classe, deck = [];
  const meilleurs = (f, n) => Object.values(CARTES).filter(f).sort((a, b) => ORDRE_RAR[a.rarete] - ORDRE_RAR[b.rarete] || a.cout - b.cout || (a.id < b.id ? -1 : 1)).slice(0, n);
  const mettre = (l, fois) => { for (const c of l) for (let i = 0; i < Math.min(fois, copiesMax(c.id)); i++) deck.push({ id: c.id, niv }); };
  mettre(meilleurs((c) => c.chef === chef, 3), 2);                                               // 5 cartes
  mettre(meilleurs((c) => c.branche === branche && !c.chef, 6), 1);                              // 6
  mettre(meilleurs((c) => c.classe === classe && !c.branche && !c.exclusif && c.rarete !== 'commune', 4), 1);   // 4
  mettre(meilleurs((c) => c.element === clan && !c.exclusif && c.rarete !== 'commune', 4), 1);   // 4
  mettre([CARTES.garde, CARTES.second_souffle].filter(Boolean), 2);                             // ~4 : de quoi tenir
  return deck;
}
// l'adversaire du duel, au format de nouveauDuel
export function fantome(p) {
  const chef = chefVise(p);
  return { nom: nomFantome(chef), clan: p.clan, classe: p.classe, branche: p.branche, chef, pvMax: PV_FANTOME, deck: deckFantome(p.clan, p.branche), app: '', fantome: true };
}
export const joueurConsecration = (p, base) => ({ ...base, chef: null, pvMax: PV_CONSACRE, deck: deckCombat(p) });

// ---------- l'IA du fantôme : elle essaie ses enchaînements de 2 cartes sur une copie du duel ----------
const VAL_STATUT = { brulure: 1.6, trempe: 2.2, affaibli: 1.8, marque: 5 };
function valeur(d, qui) {
  const m = d.j[qui], a = d.j[1 - qui];
  if (a.pv <= 0) return 1e6;
  if (m.pv <= 0) return -1e6;
  let v = -a.pv * 1.2 - (a.allie?.pv > 0 ? a.allie.pv * 0.7 : 0) + m.pv * 0.6;
  v += Math.min(m.bloc || 0, 28) * 0.55 + Math.max(0, (m.bloc || 0) - 28) * 0.1;
  for (const [k, w] of Object.entries(VAL_STATUT)) v += (a[k] || 0) * w;
  v -= (m.brulure || 0) * 1.2 + (m.affaibli || 0) * 1.4 + (m.trempe || 0) * 1.6;
  v += (m.force || 0) * 4 + (m.appel || 0) * 2.5 + (m.regen || 0) * 1.6 + (m.epines || 0) * 1.2;
  if (m.allie?.pv > 0) v += m.allie.pv * 0.4 + m.allie.deg * 2.5;
  v += m.main.length * 1.8 + m.energie * 1.5;
  return v;
}
function copie(d, qui) { const k = structuredClone({ ...d, _r: undefined, journal: [] }); k._r = () => 0.5; return k; }
export function coupFantome(d, qui) {
  if (d.fini || d.actif !== qui) return -1;
  const j = d.j[qui];
  let mieux = -1, best = valeur(d, qui) + 0.5;   // finir le tour, sauf si une carte fait mieux
  for (let i = 0; i < j.main.length; i++) {
    if (coutDe(j, i) > j.energie) continue;
    let k; try { k = copie(d, qui); if (!jouer(k, qui, i)) continue; } catch { continue; }
    let s = valeur(k, qui);
    // la meilleure 2e carte derrière
    if (!k.fini) {
      const jk = k.j[qui];
      for (let i2 = 0; i2 < jk.main.length; i2++) {
        if (coutDe(jk, i2) > jk.energie) continue;
        try { const k2 = copie(k, qui); if (jouer(k2, qui, i2)) s = Math.max(s, valeur(k2, qui) - 0.3); } catch { /* rien */ }
      }
    }
    if (s > best) { best = s; mieux = i; }
  }
  return mieux;
}

// ---------- la victoire : on devient chef ----------
export function consacrer(p) {
  if (!peut(p)) return { ok: false, raison: p.chef ? 'Tu es déjà chef de guerre.' : `Il faut être niveau ${NIV_CHEF} avec une branche.` };
  const chef = chefVise(p);
  p.chef = chef; p.consecration = { t: Date.now(), essais: p.consecration?.essais || 1 };
  donnerSorts(p, chef);
  p.titre = `ch:${chef}`;
  return { ok: true, chef };
}
export function donnerSorts(p, chef) {
  const ids = sortsChef(chef);
  for (const id of ids) { const c = (p.collection[id] ||= { n: 0, niv: 1 }); c.n = Math.max(c.n, 1); }   // un exemplaire : les autres sortent à l'autel
  return ids;
}
// le Parchemin de réorientation : le chef suit la nouvelle branche
export function suivreBranche(p) {
  if (!p.chef) return null;
  const ancien = p.chef, chef = chefDe(p.branche);
  if (!chef || chef === ancien) return null;
  p.chef = chef;
  if (p.titre === `ch:${ancien}`) p.titre = `ch:${chef}`;
  donnerSorts(p, chef);
  return chef;
}
export const essai = (p) => { p.consecration = { ...(p.consecration || {}), essais: (p.consecration?.essais || 0) + 1 }; };
export { CHEFS, CLASSES };
