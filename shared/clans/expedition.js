// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les expéditions (la carte façon Slay the Spire)
//  Une expédition = 6 étages de salles à choisir, puis le boss.
//  Salles : combat, élite (plus dur, plus de butin), repos (soin),
//  trésor. Les PV se gardent d'un combat à l'autre. Mourir fait perdre
//  la moitié du butin ramassé ; vaincre le boss débloque le palier suivant.
// =====================================================================
import { actif as actifFamilier } from './familiers.js';
import { MONSTRES, PALIERS, TERRITOIRES, MALEDICTIONS, BOSS_CAUCHEMAR } from './monstres.js';
import { ELEMENTS, RARES } from './cartes.js';
import { alea } from './combat.js';
import { pvMax, deckCombat } from './profil.js';
import * as RQ from './reliques.js';

export const ETAGES = 6;
export const SALLES = {
  combat: { nom: 'Combat', ico: '⚔️' },
  elite: { nom: 'Élite', ico: '💀' },
  repos: { nom: 'Feu de camp', ico: '🏕️' },
  tresor: { nom: 'Trésor', ico: '💎' },
  rare: { nom: 'Monstre rare', ico: '🌟' },
  boss: { nom: 'Boss', ico: '👑' },
};

export function genererCarte(graine) {
  const r = alea(graine), etages = [];
  for (let e = 0; e < ETAGES; e++) {
    const n = e === 0 ? 3 : 2 + Math.floor(r() * 3);
    etages.push(Array.from({ length: n }, (_, i) => {
      let type = 'combat';
      const x = r();
      if (e === 0) type = 'combat';
      else if (e === ETAGES - 1) type = 'repos';
      else if (e >= 2 && x < 0.22) type = 'elite';
      else if (e >= 1 && x < 0.3) type = 'rare';
      else if (x < 0.4) type = 'repos';
      else if (x < 0.55) type = 'tresor';
      return { id: `${e}-${i}`, etage: e, i, type, vers: [] };
    }));
  }
  // liens : chaque salle mène à 1 ou 2 salles de l'étage suivant, et chaque salle est atteignable
  for (let e = 0; e < ETAGES - 1; e++) {
    const a = etages[e], b = etages[e + 1];
    a.forEach((s, i) => { const j = Math.round((i / Math.max(1, a.length - 1)) * (b.length - 1)); s.vers.push(b[j].id); if (r() < 0.45 && b[j + 1]) s.vers.push(b[j + 1].id); else if (r() < 0.3 && b[j - 1]) s.vers.push(b[j - 1].id); });
    b.forEach((t) => { if (!a.some((s) => s.vers.includes(t.id))) { const s = a[Math.min(a.length - 1, Math.round((t.i / Math.max(1, b.length - 1)) * (a.length - 1)))]; s.vers.push(t.id); } });
  }
  etages[ETAGES - 1].forEach((s) => s.vers.push('boss'));
  return { etages, boss: { id: 'boss', etage: ETAGES, type: 'boss', vers: [] } };
}
export const salle = (carte, id) => (id === 'boss' ? carte.boss : carte.etages[+id.split('-')[0]][+id.split('-')[1]]);

export function commencerExpedition(p, territoire, palier = 1, graine = Date.now()) {
  if (!TERRITOIRES[territoire]) return { ok: false };
  if (palier > (p.paliers[territoire] || 1)) return { ok: false, raison: 'Palier pas encore débloqué.' };
  p.expedition = { territoire, palier, graine, carte: genererCarte(graine), position: null, pv: pvMax(p), pvMax: pvMax(p), butin: { essence: 0, mat: 0 }, salles: 0, fini: null, reliques: [], choixRelique: null };
  const fam = actifFamilier(p); if (fam) p.expedition.familier = fam;   // fixé pour toute l'expédition
  if (PALIERS[palier - 1]?.cauchemar) p.expedition.mods = tirerMaledictions(graine);
  p.stats.expeditions++;
  return { ok: true, expedition: p.expedition };
}
// 2 malédictions différentes, tirées de la graine (le serveur et le client tombent d'accord)
export function tirerMaledictions(graine) {
  const r = alea(graine + 4242), l = Object.keys(MALEDICTIONS);
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l.slice(0, 2);
}
const maudit = (m) => ({ ...m, maudit: true });
// les salles où l'on peut aller maintenant
export function choixPossibles(x) {
  if (x.fini) return [];
  if (!x.position) return x.carte.etages[0].map((s) => s.id);
  return salle(x.carte, x.position).vers;
}
// les monstres d'une salle de combat
export function ennemisDe(x, id) {
  const s = salle(x.carte, id), M = MONSTRES[x.territoire], r = alea(x.graine + s.etage * 31 + (s.i || 0) * 7);
  const cauch = !!PALIERS[x.palier - 1]?.cauchemar, f = cauch ? maudit : (m) => m;
  if (s.type === 'boss') return [cauch ? BOSS_CAUCHEMAR[x.territoire] : M.boss];
  if (s.type === 'elite') return [f(M.elite)];
  if (s.type === 'rare') return [f(M.rare)];
  let n = s.etage <= 1 ? 1 : r() < 0.55 ? 2 : 1;
  if (x.mods?.includes('horde')) n = Math.min(3, n + 1);
  const l = [];
  for (let k = 0; k < n; k++) l.push(f(M.normaux[Math.floor(r() * M.normaux.length)]));
  return l;
}
export function combatDe(p, id) {
  const x = p.expedition;
  return { deck: deckCombat(p), joueur: { pv: x.pv, pvMax: x.pvMax }, ennemis: ennemisDe(x, id), palier: PALIERS[x.palier - 1], graine: x.graine + Number(String(id).replace(/\D/g, '') || 99), classe: p.classe, mods: x.mods || null, familier: x.familier || null, reliques: x.reliques || [] };
}
// entrer dans une salle : renvoie ce qu'il s'y passe (combat à lancer, ou effet immédiat)
export function entrer(p, id) {
  const x = p.expedition;
  if (!x || !choixPossibles(x).includes(id)) return { ok: false };
  if (x.choixRelique) return { ok: false, raison: 'Choisis d’abord une relique.' };
  x.position = id; x.salles++;
  const s = salle(x.carte, id), mult = PALIERS[x.palier - 1].butin;
  if (s.type === 'repos') { const soin = Math.round(x.pvMax * (x.mods?.includes('disette') ? 0.175 : 0.35) * (RQ.a(x.reliques, 'tente') ? 1.5 : 1)); x.pv = Math.min(x.pvMax, x.pv + soin); return { ok: true, type: 'repos', soin }; }
  if (s.type === 'tresor') {
    const g = { essence: Math.round(45 * mult), mat: Math.round(5 * mult) }; x.butin.essence += g.essence; x.butin.mat += g.mat;
    const [rel] = RQ.tirerChoix(x, 1); if (rel) RQ.ajouter(x, rel);   // un trésor contient une relique (s'il en reste)
    return { ok: true, type: 'tresor', gain: g, relique: rel || null };
  }
  x.combatEnCours = id;   // si la page se recharge pendant le combat, on le reprend
  return { ok: true, type: s.type, combat: combatDe(p, id) };
}
// après un combat : on garde les PV, on ramasse le butin
export function apresCombat(p, combat) {
  const x = p.expedition, s = salle(x.carte, x.position), mult = PALIERS[x.palier - 1].butin;
  p.stats.combats++; x.combatEnCours = null;
  if (combat.fini === 'defaite') return terminer(p, 'defaite');
  p.stats.victoires++;
  x.pv = combat.joueur.pv;
  if (RQ.a(x.reliques, 'gourde')) x.pv = Math.min(x.pvMax, x.pv + 5);
  const base = { combat: [22, 3], elite: [60, 9], boss: [160, 22], rare: [30, 4] }[s.type] || [0, 0];
  const g = { essence: Math.round(base[0] * mult * (RQ.a(x.reliques, 'bourse') ? 1.3 : 1)), mat: Math.round(base[1] * mult) };
  x.butin.essence += g.essence; x.butin.mat += g.mat;
  // les monstres rares et les boss donnent la ressource rare du territoire
  const rare = s.type === 'rare' ? 1 + x.palier : s.type === 'boss' ? 2 * x.palier : 0;
  if (rare) { x.butin.rare = (x.butin.rare || 0) + rare; g.rare = rare; }
  if (s.type === 'boss') { p.stats.boss++; if (PALIERS[x.palier - 1]?.cauchemar) p.stats.cauchemar = (p.stats.cauchemar || 0) + 1; return { ...terminer(p, 'victoire'), gain: g }; }
  // un élite vaincu : une relique à choisir parmi trois avant de continuer
  if (s.type === 'elite') { const ch = RQ.tirerChoix(x); if (ch.length) x.choixRelique = ch; }
  return { ok: true, gain: g, choixRelique: x.choixRelique || null };
}
// choisir une relique (id) ou passer (null : 40 essence de consolation)
export function choisirRelique(p, id) {
  const x = p.expedition; if (!x?.choixRelique) return { ok: false };
  if (id === null) { x.choixRelique = null; x.butin.essence += 40; return { ok: true, relique: null }; }
  if (!x.choixRelique.includes(id) || !RQ.ajouter(x, id)) return { ok: false };
  x.choixRelique = null;
  return { ok: true, relique: id };
}
// fin de l'expédition : la défaite fait perdre la moitié du butin ; le boss débloque le palier suivant
export function terminer(p, issue) {
  const x = p.expedition; if (!x) return { ok: false };
  // x.bonusButin : bonus du Phare des marées (projet de clan terminé la semaine passée), fixé au départ
  const garde = issue === 'victoire' ? 1 : 0.5, mat = ELEMENTS[x.territoire].materiau, b = 1 + (x.bonusButin || 0);
  const gain = { essence: Math.floor(x.butin.essence * garde * b), [mat]: Math.floor(x.butin.mat * garde * b) };
  p.ress.essence += gain.essence; p.ress[mat] += gain[mat];
  if (x.butin.rare) { const r = RARES[x.territoire].id; gain[r] = Math.floor(x.butin.rare * garde); p.ress[r] = (p.ress[r] || 0) + gain[r]; }
  let debloque = null;
  if (issue === 'victoire' && x.palier === p.paliers[x.territoire] && x.palier < PALIERS.length) { p.paliers[x.territoire]++; debloque = p.paliers[x.territoire]; }
  x.fini = issue;
  const bilan = { ok: true, fin: issue, gainTotal: gain, debloque, territoire: x.territoire, palier: x.palier, bonus: x.bonusButin || 0, reliques: x.reliques || [] };
  p.expedition = null;
  return bilan;
}
