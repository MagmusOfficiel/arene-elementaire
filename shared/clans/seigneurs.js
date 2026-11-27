// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les Seigneurs de chapitre (v124)
//  Cinq boss à part, un par chapitre, qu'on défie à un monument de la
//  carte une fois le palier III du chapitre vaincu (le Cauchemar débloqué).
//  Chacun change de phase à 66 % et 33 % de ses PV et a une mécanique
//  à comprendre (moteur : combat.js) :
//   · le Triarque change d'élément (affinités : ×1,5 / ×0,5) ;
//   · le Briseur de mondes glisse des Fêlures (cartes inutiles) dans ta défausse ;
//   · le Titan charge une foudre énorme, que ses paratonnerres atténuent ;
//   · le Sphinx pose des énigmes, et le combat est limité à 15 tours ;
//   · l'Astre déchu est intouchable tant qu'une de ses étoiles brille.
//  Première victoire : une carte légendaire unique (le trophée), un titre,
//  une annonce au serveur. Ensuite : rejouable à volonté, butin plus modeste.
// =====================================================================
import { RARES } from './cartes.js';
import { deckCombat, pvMax, niveau } from './profil.js';
import * as F from './familiers.js';

const PARATONNERRE = { id: 'paratonnerre', nom: 'Paratonnerre', ico: '🗼', pv: 26, intentions: [{ a: 5 }, { a: 3, p: 1 }], paratonnerre: true };
const ETOILE = { id: 'etoile_dechue', nom: 'Étoile déchue', ico: '⭐', pv: 30, intentions: [{ s: 10 }, { a: 6 }], etoile: true };

const boss = (id, nom, ico, pv, intentions, extra = {}) => ({ id, nom, ico, pv, intentions, rang: 'boss', seigneur: id, ...extra });

export const SEIGNEURS = {
  triarque: {
    chap: 1, terres: ['feu', 'eau', 'plante'], lieux: ['statue_forgeron', 'statue_marees', 'statue_gardien'], ressource: null,
    nom: 'Le Triarque élémentaire', ico: '🔱', titre: 'Briseur du Triarque', trophee: 'coeur_triarque', palier: { pv: 1.25, deg: 2.2 },
    regle: 'Il passe du Feu à l’Eau puis à la Plante. Chaque carte de son élément ne lui fait que la moitié des dégâts ; celles de l’élément qui le bat (l’Eau contre le Feu, la Plante contre l’Eau, le Feu contre la Plante) frappent ×1,5.',
    histoire: 'Les trois esprits fondateurs des clans, fondus en un seul gardien. Il ne cède qu’à qui sait changer de main.',
    ennemis: () => [boss('triarque', 'Le Triarque élémentaire', '🔱', 420, [{ a: 9, b: 2 }, { d: 14, f: 1 }, { a: 6, n: 2 }, { b: 4, a: 5 }], {
      element: 'feu',
      phases: [
        { seuil: 0.66, nom: 'Forme de l’Eau', element: 'eau', bloc: 12, intentions: [{ a: 8, t: 1 }, { g: 16 }, { a: 5, n: 3 }, { t: 2, s: 12 }] },
        { seuil: 0.33, nom: 'Forme de la Plante', element: 'plante', bloc: 12, intentions: [{ a: 10, e: 3 }, { d: 12, w: 1 }, { a: 4, n: 4 }, { s: 14, e: 2 }] },
      ],
    })],
  },
  briseur: {
    chap: 2, terres: ['brisees'], lieux: ['monolithe'], ressource: 'brisees',
    nom: 'Le Briseur de mondes', ico: '🪨', titre: 'Celui qui répara le monde', trophee: 'eclat_briseur', palier: { pv: 1.15, deg: 2.05 },
    regle: 'Il glisse des Fêlures dans ta défausse : des cartes qui coûtent 1 et ne font rien (elles s’épuisent quand tu les joues). Plus le combat dure, plus ton deck s’alourdit.',
    histoire: 'Né de la Faille, il fend le monde comme on fend une pierre. Chaque coup laisse une fissure… jusque dans ta main.',
    ennemis: () => [boss('briseur_mondes', 'Le Briseur de mondes', '🪨', 520, [{ a: 12 }, { fe: 2, d: 10 }, { a: 6, n: 2 }, { fe: 1, w: 2, a: 6 }], {
      phases: [
        { seuil: 0.66, nom: 'Le monde se fissure', intentions: [{ a: 14, fe: 1 }, { a: 7, n: 2 }, { fe: 3, g: 12 }, { a: 18 }] },
        { seuil: 0.33, nom: 'Effondrement', force: 2, intentions: [{ a: 9, n: 2, fe: 1 }, { fe: 2, a: 12 }, { a: 22 }] },
      ],
    })],
  },
  titan: {
    chap: 3, terres: ['cimes'], lieux: ['cairn'], ressource: 'cimes',
    nom: 'Le Titan de la Foudre', ico: '⛈️', titre: 'Dompteur de foudre', trophee: 'foudre_titan', palier: { pv: 1, deg: 1.5 },
    regle: 'Il charge un éclair énorme (annoncé un tour à l’avance) : accumule du bouclier ou étourdis-le pour le retarder. Chaque Paratonnerre encore debout absorbe 30 % de l’éclair… mais ils te frappent aussi.',
    histoire: 'Le gardien des Cimes. On dit que l’orage n’est que sa respiration.',
    ennemis: () => [boss('titan_foudre', 'Le Titan de la Foudre', '⛈️', 600, [{ a: 10, n: 2 }, { inv: PARATONNERRE, k: 2, d: 10 }, { ch: 1, d: 16 }, { a: 36, foudre: 1 }, { a: 12, p: 1 }], {
      phases: [
        { seuil: 0.66, nom: 'Orage grondant', intentions: [{ a: 12, n: 2 }, { ch: 1, inv: PARATONNERRE, k: 1 }, { a: 42, foudre: 1 }, { w: 2, a: 10 }] },
        { seuil: 0.33, nom: 'Tempête absolue', force: 2, intentions: [{ ch: 1, d: 20 }, { a: 48, foudre: 1 }, { a: 8, n: 3, p: 1 }, { inv: PARATONNERRE, k: 2 }] },
      ],
    })],
  },
  sphinx: {
    chap: 4, terres: ['ambre'], lieux: ['sphinx'], ressource: 'ambre',
    nom: 'Le Sphinx d’Ambre', ico: '🦁', titre: 'Sage du Sphinx', trophee: 'sablier_sphinx', palier: { pv: 1, deg: 1.7 },
    regle: 'Tous les 3 tours, il pose une énigme pour ton tour suivant (jouer 2 attaques, ne jouer aucune défense, garder de l’énergie…). Réussie : il perd 8 % de ses PV et devient Affaibli. Ratée : il gagne 3 de force. Et le sablier ne pardonne pas : au-delà de 15 tours, tu as perdu.',
    histoire: 'Ensablé depuis mille ans, il ne s’éveille que pour éprouver l’esprit des héros. Le temps est son arme.',
    ennemis: () => [boss('sphinx_eveille', 'Le Sphinx d’Ambre', '🦁', 640, [{ en: 1, d: 14 }, { a: 12, m: 1 }, { a: 7, n: 2 }, { en: 1, a: 10 }, { f: 2, g: 14 }, { a: 16 }], {
      sablier: 15,
      phases: [
        { seuil: 0.66, nom: 'Les sables se lèvent', intentions: [{ en: 1, a: 12, m: 1 }, { a: 8, n: 2 }, { d: 18, f: 1 }] },
        { seuil: 0.33, nom: 'Colère du désert', intentions: [{ en: 1, a: 14 }, { a: 9, n: 3, m: 1 }, { a: 24 }] },
      ],
    })],
  },
  astre: {
    chap: 5, terres: ['ciel'], lieux: ['cadran'], ressource: 'ciel',
    nom: 'L’Astre déchu', ico: '🌠', titre: 'Porteur d’étoiles', trophee: 'coeur_astre', palier: { pv: 1, deg: 1.65 },
    regle: 'Il invoque des Étoiles déchues qui le soignent. Tant qu’une étoile brille, il est intouchable (seules la brûlure et les marques passent). Éteins-les, puis frappe pendant qu’il est exposé.',
    histoire: 'Une étoile tombée du ciel, qui refuse de s’éteindre seule.',
    ennemis: () => [boss('astre_dechu', 'L’Astre déchu', '🌠', 700, [{ inv: ETOILE, k: 2 }, { a: 14 }, { a: 7, n: 2, v: 0.5 }, { a: 18 }, { w: 2, a: 10 }], {
      etoiles: true,
      phases: [
        { seuil: 0.66, nom: 'Constellation', inv: ETOILE, k: 3, intentions: [{ a: 16 }, { a: 8, n: 2, v: 0.5 }, { inv: ETOILE, k: 2 }, { a: 20 }, { g: 14 }] },
        { seuil: 0.33, nom: 'Supernova', intentions: [{ a: 10, n: 3 }, { inv: ETOILE, k: 3 }, { a: 28 }, { a: 12, n: 2, v: 1 }] },
      ],
    })],
  },
};
export const LISTE = Object.keys(SEIGNEURS);
export const valide = (id) => Object.hasOwn(SEIGNEURS, id);
export const deLieu = (lieu) => LISTE.find((id) => SEIGNEURS[id].lieux.includes(lieu)) || null;
export const TROPHEES = Object.fromEntries(LISTE.map((id) => [SEIGNEURS[id].trophee, id]));

// ouvert quand le palier III d'un territoire du chapitre est vaincu (le Cauchemar y est débloqué)
export const ouvert = (p, id) => SEIGNEURS[id].terres.some((t) => (p.paliers?.[t] || 1) >= 4);
export const vaincu = (p, id) => !!p.seigneurs?.[id]?.vaincu;
export const nbVaincus = (p) => LISTE.filter((id) => vaincu(p, id)).length;

// ---------- les récompenses ----------
export function recompense(p, id) {
  const s = SEIGNEURS[id], premiere = !vaincu(p, id);
  const terr = s.ressource || p.clan, rare = RARES[terr]?.id;
  const r = { essence: (premiere ? 1500 : 400) + 150 * s.chap, eclats: premiere ? 40 : 10 };
  if (rare) r.rare = { id: rare, n: premiere ? 6 + 2 * s.chap : 2 + s.chap };
  if (premiere) { r.trophee = s.trophee; r.titre = `sg:${id}`; }
  return r;
}

// ---------- l'état : p.seigneurs = { <id>: { vaincu, essais, victoires } } ; p.seigneurEssai = { id, graine } ----------
export function commencer(p, id, graine) {
  if (!valide(id)) return { ok: false, raison: 'Seigneur inconnu.' };
  if (!ouvert(p, id)) return { ok: false, raison: `Bats d’abord le boss du palier III ${SEIGNEURS[id].chap === 1 ? 'd’un territoire du chapitre 1' : 'de ce territoire'}.` };
  if (p.expedition) return { ok: false, raison: 'Termine ton expédition d’abord.' };
  p.seigneurs ||= {};
  const e = (p.seigneurs[id] ||= { vaincu: false, essais: 0, victoires: 0 });
  e.essais++;
  p.seigneurEssai = { id, graine };
  return { ok: true, id, graine };
}
export function defCombat(p) {
  const x = p.seigneurEssai; if (!x) return null;
  const s = SEIGNEURS[x.id], pv = pvMax(p);
  return { deck: deckCombat(p), joueur: { pv, pvMax: pv }, ennemis: s.ennemis(), palier: s.palier, graine: x.graine || 1, classe: p.classe, branche: p.branche || null, clan: p.clan, chef: p.chef || null, familier: F.actif(p) };
}
export function finir(p, c) {
  const x = p.seigneurEssai; if (!x) return { ok: false };
  delete p.seigneurEssai;
  const id = x.id, s = SEIGNEURS[id];
  if (c.fini !== 'victoire') return { ok: true, victoire: false, id, tours: c.tour };
  const rec = recompense(p, id), premiere = !!rec.trophee;
  p.ress.essence += rec.essence; p.ress.eclats = (p.ress.eclats || 0) + rec.eclats;
  if (rec.rare) p.ress[rec.rare.id] = (p.ress[rec.rare.id] || 0) + rec.rare.n;
  if (premiere) { const k = (p.collection[rec.trophee] ||= { n: 0, niv: 1 }); k.n = Math.max(k.n, 1); p.titre = rec.titre; }
  const e = (p.seigneurs[id] ||= { vaincu: false, essais: 1, victoires: 0 });
  e.vaincu = true; e.victoires++;
  if (!e.record || c.tour < e.record) e.record = c.tour;
  return { ok: true, victoire: true, id, premiere, rec, tours: c.tour, nom: s.nom };
}
export const niveauConseille = (id) => ({ 1: 30, 2: 40, 3: 55, 4: 75, 5: 95 })[SEIGNEURS[id].chap];
export { niveau };
