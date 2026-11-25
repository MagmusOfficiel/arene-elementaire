// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'apparence du personnage
//  Pur (client + serveur). Sept emplacements : tenue, cheveux, chapeau,
//  aura, et (v86) ailes, arme, cape — purement esthétiques. Certaines pièces s'achètent (essence, éclats), d'autres se
//  gagnent (rang d'arène, boss vaincus, sanctuaires pris, Cauchemar…).
//  « clan » / « aucun » : l'apparence de base, toujours disponible.
// =====================================================================
export const EMPLACEMENTS = {
  tenue: { nom: 'Tenue', ico: '👕' },
  cheveux: { nom: 'Cheveux', ico: '💇' },
  chapeau: { nom: 'Coiffe', ico: '🎩' },
  aura: { nom: 'Aura', ico: '✨' },
  // v86 : purement esthétiques, aucun effet en combat
  ailes: { nom: 'Ailes', ico: '🪽' },
  arme: { nom: 'Arme', ico: '🗡️' },
  cape: { nom: 'Cape', ico: '🧣' },
};
const prix = (essence, eclats = 0) => ({ prix: { essence, eclats } });
const gagne = (cond) => ({ cond });
const passe = (lot) => ({ passe: lot });   // exclusives du passe de saison (v54) : ni à vendre, ni à gagner autrement
// cond : { type, n, txt } — vérifié sur le profil
import { histoireFaille, histoireCimes } from './quetesPnj.js';
export const PIECES = {
  // tenues : [couleur, couleur foncée]
  t_clan: { slot: 'tenue', nom: 'Couleurs du clan', base: true },
  t_nuit: { slot: 'tenue', nom: 'Nuit', couleurs: ['#3a3a52', '#24243a'], ...prix(400) },
  t_neige: { slot: 'tenue', nom: 'Neige', couleurs: ['#e8e8f2', '#a8a8bc'], ...prix(400) },
  t_corail: { slot: 'tenue', nom: 'Corail', couleurs: ['#f07a6a', '#b8483a'], ...prix(600) },
  t_jade: { slot: 'tenue', nom: 'Jade', couleurs: ['#2ab89a', '#16806a'], ...prix(600) },
  t_pourpre: { slot: 'tenue', nom: 'Pourpre', couleurs: ['#8a3aa8', '#5a1a78'], ...prix(800, 10) },
  t_or: { slot: 'tenue', nom: 'Étoffe d’or', couleurs: ['#e8b830', '#a87a10'], ...prix(2500, 40) },
  t_champion: { slot: 'tenue', nom: 'Champion de l’arène', couleurs: ['#c8283a', '#f0c030'], ...gagne({ type: 'arene', n: 1400, txt: 'Atteins le rang Platine en arène' }) },
  t_cauchemar: { slot: 'tenue', nom: 'Linceul du Cauchemar', couleurs: ['#3a0a3a', '#1a0418'], ...gagne({ type: 'cauchemar', n: 1, txt: 'Bats un boss du Cauchemar' }) },
  t_faille: { slot: 'tenue', nom: 'Voile de la Faille', couleurs: ['#6a40c0', '#2a1a5a'], ...gagne({ type: 'faille', n: 1, txt: 'Termine la 1re partie de l’histoire des Terres Brisées' }) },   // v90
  t_cimes: { slot: 'tenue', nom: 'Fourrure des Cimes', couleurs: ['#d8e4f0', '#4a6a8a'], ...gagne({ type: 'cimes', n: 1, txt: 'Termine la 1re partie de l’histoire des Cimes Orageuses' }) },   // v96
  t_tour: { slot: 'tenue', nom: 'Tenue de la Tour', couleurs: ['#c8b8e8', '#4a3a7a'], ...gagne({ type: 'tour', n: 25, txt: 'Atteins l’étage 25 de la Tour infinie' }) },   // v91
  t_aube: { slot: 'tenue', nom: 'Tenue de l’Aube', couleurs: ['#f0a060', '#b85a3a'], ...passe('Aube') },
  t_abysses: { slot: 'tenue', nom: 'Tenue des Abysses', couleurs: ['#1a3a6a', '#0a1a3a'], ...passe('Abysses') },
  t_seve: { slot: 'tenue', nom: 'Tenue de Sève ancienne', couleurs: ['#5a7a2a', '#34501a'], ...passe('Sève ancienne') },
  t_eclipse: { slot: 'tenue', nom: 'Tenue de l’Éclipse', couleurs: ['#30283a', '#c8a030'], ...passe('Éclipse') },
  // cheveux
  c_clan: { slot: 'cheveux', nom: 'Naturels', base: true },
  c_noir: { slot: 'cheveux', nom: 'Noir de jais', couleur: '#1a1418', ...prix(200) },
  c_blond: { slot: 'cheveux', nom: 'Blond', couleur: '#f0d060', ...prix(200) },
  c_roux: { slot: 'cheveux', nom: 'Roux', couleur: '#d0582a', ...prix(200) },
  c_blanc: { slot: 'cheveux', nom: 'Blanc', couleur: '#f0f0f0', ...prix(300) },
  c_rose: { slot: 'cheveux', nom: 'Rose', couleur: '#f080b0', ...prix(300) },
  c_bleu: { slot: 'cheveux', nom: 'Bleu électrique', couleur: '#50a0ff', ...prix(300) },
  c_vert: { slot: 'cheveux', nom: 'Vert mousse', couleur: '#50c050', ...prix(300) },
  c_violet: { slot: 'cheveux', nom: 'Violet', couleur: '#9a5ad8', ...prix(300) },
  c_aube: { slot: 'cheveux', nom: 'Mèches d’aurore', couleur: '#ffb070', ...passe('Aube') },
  c_abysses: { slot: 'cheveux', nom: 'Turquoise des abysses', couleur: '#40e0d0', ...passe('Abysses') },
  c_seve: { slot: 'cheveux', nom: 'Vert sève', couleur: '#a8e060', ...passe('Sève ancienne') },
  c_eclipse: { slot: 'cheveux', nom: 'Argent d’éclipse', couleur: '#e0dcf0', ...passe('Éclipse') },
  // coiffes (remplacent le couvre-chef de la classe)
  h_classe: { slot: 'chapeau', nom: 'Coiffe de classe', base: true },
  h_aucun: { slot: 'chapeau', nom: 'Tête nue', ...prix(0) },
  h_bandeau: { slot: 'chapeau', nom: 'Bandeau de duelliste', ...gagne({ type: 'duels', n: 10, txt: 'Gagne 10 duels' }) },
  h_paille: { slot: 'chapeau', nom: 'Chapeau de paille', ...prix(500) },
  h_fleurs: { slot: 'chapeau', nom: 'Couronne de fleurs', ...prix(700) },
  h_capuche: { slot: 'chapeau', nom: 'Capuche', ...prix(700) },
  h_plume: { slot: 'chapeau', nom: 'Toque à plume', ...gagne({ type: 'quetes', n: 20, txt: 'Réclame 20 quêtes' }) },
  h_casque: { slot: 'chapeau', nom: 'Heaume', ...gagne({ type: 'victoires', n: 60, txt: 'Gagne 60 combats d’expédition' }) },
  h_cornes: { slot: 'chapeau', nom: 'Cornes de démon', ...gagne({ type: 'boss', n: 10, txt: 'Bats 10 boss d’expédition' }) },
  h_aureole: { slot: 'chapeau', nom: 'Auréole', ...gagne({ type: 'sanct', n: 5, txt: 'Participe à la prise de 5 sanctuaires' }) },
  h_couronne: { slot: 'chapeau', nom: 'Couronne', ...gagne({ type: 'arene', n: 1250, txt: 'Atteins le rang Or en arène' }) },
  h_masque: { slot: 'chapeau', nom: 'Masque du Cauchemar', ...gagne({ type: 'cauchemar', n: 1, txt: 'Bats un boss du Cauchemar' }) },
  // auras
  a_aucune: { slot: 'aura', nom: 'Aucune', base: true },
  a_braises: { slot: 'aura', nom: 'Braises', ...prix(1200, 20) },
  a_bulles: { slot: 'aura', nom: 'Bulles', ...prix(1200, 20) },
  a_lucioles: { slot: 'aura', nom: 'Lucioles', ...prix(1200, 20) },
  a_givre: { slot: 'aura', nom: 'Givre', ...prix(1800, 30) },
  a_or: { slot: 'aura', nom: 'Poussière d’or', ...gagne({ type: 'arene', n: 1550, txt: 'Atteins le rang Diamant en arène' }) },
  a_aube: { slot: 'aura', nom: 'Lueur de l’aube', ...passe('Aube') },
  a_abysses: { slot: 'aura', nom: 'Remous des abysses', ...passe('Abysses') },
  a_seve: { slot: 'aura', nom: 'Spores dorées', ...passe('Sève ancienne') },
  a_eclipse: { slot: 'aura', nom: 'Couronne d’éclipse', ...passe('Éclipse') },
  a_ombre: { slot: 'aura', nom: 'Ombre du Cauchemar', ...gagne({ type: 'cauchemar', n: 3, txt: 'Bats 3 boss du Cauchemar' }) },
  // ---- v86 : ailes (dans le dos)
  l_aucune: { slot: 'ailes', nom: 'Aucune', base: true },
  l_papillon: { slot: 'ailes', nom: 'Ailes de papillon', couleurs: ['#f0a0e0', '#8a5ad8'], ...prix(1500, 10) },
  l_fee: { slot: 'ailes', nom: 'Ailes de fée', couleurs: ['#d8f8ff', '#80d0f0'], ...prix(2000, 20) },
  l_ange: { slot: 'ailes', nom: 'Ailes d’ange', couleurs: ['#ffffff', '#c8d0e0'], ...prix(3500, 40) },
  l_demon: { slot: 'ailes', nom: 'Ailes de démon', couleurs: ['#5a1a2a', '#2a0810'], ...gagne({ type: 'boss', n: 25, txt: 'Bats 25 boss d’expédition' }) },
  l_dragon: { slot: 'ailes', nom: 'Ailes de dragon', couleurs: ['#2a7a3a', '#c8a030'], ...gagne({ type: 'cauchemar', n: 3, txt: 'Bats 3 boss du Cauchemar' }) },
  l_cristal: { slot: 'ailes', nom: 'Ailes de cristal du vide', couleurs: ['#c8a0ff', '#5a8ae8'], ...gagne({ type: 'faille', n: 5, txt: 'Termine l’histoire des Terres Brisées' }) },   // v90
  l_orage: { slot: 'ailes', nom: 'Ailes de l’orage', couleurs: ['#e8f6ff', '#4a90d8'], ...gagne({ type: 'cimes', n: 5, txt: 'Termine l’histoire des Cimes Orageuses' }) },   // v96
  l_tour: { slot: 'ailes', nom: 'Ailes du sommet', couleurs: ['#fff8e0', '#f0c030'], ...gagne({ type: 'tour', n: 100, txt: 'Conquiers les 100 étages de la Tour infinie' }) },   // v91
  l_phenix: { slot: 'ailes', nom: 'Ailes de phénix', couleurs: ['#ffd060', '#e04a1a'], ...gagne({ type: 'arene', n: 1550, txt: 'Atteins le rang Diamant en arène' }) },
  // ---- v86 : armes (dans la main)
  r_aucune: { slot: 'arme', nom: 'Aucune', base: true },
  r_epee: { slot: 'arme', nom: 'Épée d’acier', couleurs: ['#d8dce8', '#6a4a2a'], ...prix(800) },
  r_hache: { slot: 'arme', nom: 'Hache de guerre', couleurs: ['#b8bcc8', '#5a3a1a'], ...prix(1200, 10) },
  r_baton: { slot: 'arme', nom: 'Bâton de mage', couleurs: ['#7a4a22', '#8a60ff'], ...prix(1200, 10) },
  r_trident: { slot: 'arme', nom: 'Trident', couleurs: ['#40d0e0', '#2a6a8a'], ...prix(1800, 20) },
  r_arc: { slot: 'arme', nom: 'Arc doré', couleurs: ['#f0c030', '#fff4d0'], ...gagne({ type: 'duels', n: 25, txt: 'Gagne 25 duels' }) },
  r_tour: { slot: 'arme', nom: 'Lame des cent marches', couleurs: ['#f0e8ff', '#8a60e0'], ...gagne({ type: 'tour', n: 75, txt: 'Atteins l’étage 75 de la Tour infinie' }) },   // v91
  r_faux: { slot: 'arme', nom: 'Faux du Cauchemar', couleurs: ['#c8c0d8', '#3a0a3a'], ...gagne({ type: 'cauchemar', n: 1, txt: 'Bats un boss du Cauchemar' }) },
  // ---- v86 : capes (dans le dos)
  k_aucune: { slot: 'cape', nom: 'Aucune', base: true },
  k_rouge: { slot: 'cape', nom: 'Cape écarlate', couleurs: ['#c8283a', '#8a1424'], ...prix(600) },
  k_bleue: { slot: 'cape', nom: 'Cape azur', couleurs: ['#2a6ad0', '#163e8a'], ...prix(600) },
  k_verte: { slot: 'cape', nom: 'Cape de forêt', couleurs: ['#3a9a3a', '#1e5a1e'], ...prix(600) },
  k_noire: { slot: 'cape', nom: 'Cape de nuit', couleurs: ['#2a2434', '#14101c'], ...prix(900) },
  k_etoilee: { slot: 'cape', nom: 'Cape étoilée', couleurs: ['#1a1a5a', '#f0e060'], ...prix(2500, 30) },
  k_royale: { slot: 'cape', nom: 'Cape royale', couleurs: ['#8a1a8a', '#f0c030'], ...gagne({ type: 'arene', n: 1250, txt: 'Atteins le rang Or en arène' }) },
  k_faille: { slot: 'cape', nom: 'Cape de la Faille', couleurs: ['#3a1a6a', '#b080ff'], ...gagne({ type: 'faille', n: 3, txt: 'Termine 3 parties de l’histoire des Terres Brisées' }) },   // v90
  k_cimes: { slot: 'cape', nom: 'Cape de l’orage', couleurs: ['#1a3050', '#ffe060'], ...gagne({ type: 'cimes', n: 3, txt: 'Termine 3 parties de l’histoire des Cimes Orageuses' }) },   // v96
  k_tour: { slot: 'cape', nom: 'Cape des cimes', couleurs: ['#e8e8f8', '#6a5aa8'], ...gagne({ type: 'tour', n: 50, txt: 'Atteins l’étage 50 de la Tour infinie' }) },   // v91
  k_heros: { slot: 'cape', nom: 'Cape du héros', couleurs: ['#e8e0d0', '#c8283a'], ...gagne({ type: 'victoires', n: 200, txt: 'Gagne 200 combats d’expédition' }) },
};
export const DEFAUT = { tenue: 't_clan', cheveux: 'c_clan', chapeau: 'h_classe', aura: 'a_aucune', ailes: 'l_aucune', arme: 'r_aucune', cape: 'k_aucune' };

// où en est le joueur pour une condition
export function progression(p, cond) {
  const s = p.stats || {};
  const v = { arene: p.arene?.meilleur || 0, cauchemar: s.cauchemar || 0, duels: p.duels?.gagnes || 0, quetes: s.quetes || 0, victoires: s.victoires || 0, boss: s.boss || 0, sanct: s.sanct || 0, faille: histoireFaille(p), cimes: histoireCimes(p), tour: Math.max(p.tour?.record || 0, p.tour?.max || 0) }[cond.type] || 0;
  return { v, ok: v >= cond.n };
}
export function possede(p, id) {
  const x = PIECES[id]; if (!x) return false;
  if (x.base) return true;
  if (x.cond) return progression(p, x.cond).ok;
  return (p.garde || []).includes(id);
}
export function acheter(p, id) {
  const x = typeof id === 'string' && Object.hasOwn(PIECES, id) ? PIECES[id] : null;
  if (!x || !x.prix) return { ok: false, raison: 'Cette pièce ne s’achète pas.' };
  if (possede(p, id)) return { ok: false, raison: 'Tu l’as déjà.' };
  if (p.ress.essence < x.prix.essence || (p.ress.eclats || 0) < x.prix.eclats) return { ok: false, raison: 'Pas assez de ressources.' };
  p.ress.essence -= x.prix.essence; p.ress.eclats = (p.ress.eclats || 0) - x.prix.eclats;
  (p.garde ||= []).push(id);
  porter(p, id);
  return { ok: true };
}
export function porter(p, id) {
  const x = typeof id === 'string' && Object.hasOwn(PIECES, id) ? PIECES[id] : null;
  if (!x) return { ok: false };
  if (!possede(p, id)) return { ok: false, raison: x.cond ? x.cond.txt : 'Achète-la d’abord.' };
  p.apparence = { ...DEFAUT, ...(p.apparence || {}), [x.slot]: id };
  return { ok: true };
}
// l'apparence portée, en vérifiant qu'on y a toujours droit
export function portee(p) {
  const a = { ...DEFAUT, ...(p?.apparence || {}) };
  for (const k of Object.keys(DEFAUT)) if (!PIECES[a[k]] || PIECES[a[k]].slot !== k || !possede(p, a[k])) a[k] = DEFAUT[k];
  return a;
}
// en texte court, pour le réseau : « t_nuit.c_blond.h_couronne.a_or »
export const code = (p) => { const a = portee(p); return `${a.tenue}.${a.cheveux}.${a.chapeau}.${a.aura}.${a.ailes}.${a.arme}.${a.cape}`; };
export function lireCode(t) {
  const [tenue, cheveux, chapeau, aura, ailes, arme, cape] = String(t || '').split('.');
  const ok = (id, k) => (PIECES[id]?.slot === k ? id : DEFAUT[k]);
  return { tenue: ok(tenue, 'tenue'), cheveux: ok(cheveux, 'cheveux'), chapeau: ok(chapeau, 'chapeau'), aura: ok(aura, 'aura'), ailes: ok(ailes, 'ailes'), arme: ok(arme, 'arme'), cape: ok(cape, 'cape') };
}
