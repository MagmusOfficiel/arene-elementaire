// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'apparence du personnage
//  Pur (client + serveur). Quatre emplacements : tenue, cheveux, chapeau,
//  aura. Certaines pièces s'achètent (essence, éclats), d'autres se
//  gagnent (rang d'arène, boss vaincus, sanctuaires pris, Cauchemar…).
//  « clan » / « aucun » : l'apparence de base, toujours disponible.
// =====================================================================
export const EMPLACEMENTS = {
  tenue: { nom: 'Tenue', ico: '👕' },
  cheveux: { nom: 'Cheveux', ico: '💇' },
  chapeau: { nom: 'Coiffe', ico: '🎩' },
  aura: { nom: 'Aura', ico: '✨' },
};
const prix = (essence, eclats = 0) => ({ prix: { essence, eclats } });
const gagne = (cond) => ({ cond });
const passe = (lot) => ({ passe: lot });   // exclusives du passe de saison (v54) : ni à vendre, ni à gagner autrement
// cond : { type, n, txt } — vérifié sur le profil
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
};
export const DEFAUT = { tenue: 't_clan', cheveux: 'c_clan', chapeau: 'h_classe', aura: 'a_aucune' };

// où en est le joueur pour une condition
export function progression(p, cond) {
  const s = p.stats || {};
  const v = { arene: p.arene?.meilleur || 0, cauchemar: s.cauchemar || 0, duels: p.duels?.gagnes || 0, quetes: s.quetes || 0, victoires: s.victoires || 0, boss: s.boss || 0, sanct: s.sanct || 0 }[cond.type] || 0;
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
export const code = (p) => { const a = portee(p); return `${a.tenue}.${a.cheveux}.${a.chapeau}.${a.aura}`; };
export function lireCode(t) {
  const [tenue, cheveux, chapeau, aura] = String(t || '').split('.');
  const ok = (id, k) => (PIECES[id]?.slot === k ? id : DEFAUT[k]);
  return { tenue: ok(tenue, 'tenue'), cheveux: ok(cheveux, 'cheveux'), chapeau: ok(chapeau, 'chapeau'), aura: ok(aura, 'aura') };
}
