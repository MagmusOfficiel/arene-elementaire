// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les quêtes des habitants (v76)
//  Pur (client + serveur). Chaque habitant a une quête (une seule fois par
//  joueur). On l'accepte en lui parlant ; elle avance avec les mêmes
//  événements que les quêtes du jour (le serveur les voit passer), ou on lui
//  apporte des ressources. On revient le voir pour être payé.
//  Finir les 6 quêtes d'un village donne le titre « Ami du village ».
// =====================================================================
import { niveau as niveauDe } from './profil.js';
const T = { feu: 'Terres de Braise', eau: 'Lagons d’Azur', plante: 'Sylve d’Émeraude', brisees: 'Terres Brisées' };
// ev : l'événement compté (comme quetes.js) et f son filtre ; donner : ce qu'on apporte au moment de rendre la quête
export const QUETES = {
  bram: { txt: 'Montre-moi que tu sais te servir d’une forge : améliore 2 cartes.', ev: 'ameliorer', n: 2, rec: { essence: 200, eclats: 40 }, merci: 'Pas mal du tout ! Tiens, des éclats pour la suite.' },
  ignis: { txt: 'Le boss des Terres de Braise rôde encore. Va le terrasser.', ev: 'victoire', f: { terr: 'feu', type: ['boss'] }, n: 1, rec: { essence: 400, cristal: 3 }, merci: 'Le portail est plus calme grâce à toi. Prends ces cristaux.' },
  cendrillon: { txt: 'J’ai perdu ma toupie dans une salle mystère… ou deux. Tu peux regarder ?', ev: 'mystere', n: 2, rec: { essence: 150, eclats: 12 }, merci: 'Tu l’as pas trouvée ? Bah, c’est pas grave. Merci quand même !' },
  mordred: { txt: 'Pour finir mon histoire, il me faut 2 cristaux de lave. Tu m’en apportes ?', donner: { cristal: 2 }, rec: { essence: 350, eclats: 15 }, merci: '… et c’est ainsi que la lave devint la mémoire du clan. Merci, jeune âme.' },
  pyra: { txt: 'Mon étal est vide ! Apporte-moi 80 braises, je te paierai bien.', donner: { braises: 80 }, rec: { essence: 300, eclats: 15 }, merci: 'Voilà de quoi rallumer mon commerce. Marché conclu !' },
  gorran: { txt: 'Un sanctuaire mal gardé, c’est une porte ouverte. Aide à en prendre un.', ev: 'sanctuaire', n: 1, rec: { essence: 300, eclats: 20 }, merci: 'Voilà du travail de garde. Bienvenue dans la ronde.' },
  marin: { txt: 'Des filons rares brillent sur la carte. Ramasses-en 2, moussaillon.', ev: 'filon', n: 2, rec: { essence: 250, perle_noire: 2 }, merci: 'Bon œil ! Voilà deux perles noires de ma réserve.' },
  nerea: { txt: 'Bats 3 élites ou monstres rares dans les Lagons d’Azur.', ev: 'victoire', f: { terr: 'eau', type: ['elite', 'rare'] }, n: 3, rec: { essence: 350, eclats: 20 }, merci: 'Les Lagons te respectent. Moi aussi.' },
  loupiot: { txt: 'Je veux faire un collier ! Tu m’apportes 30 perles ?', donner: { perles: 30 }, rec: { essence: 200, eclats: 10 }, merci: 'Il est trop beau ! Je le garde pour toujours. Ou jusqu’à demain.' },
  oracle: { txt: 'Les cartes parlent à ceux qui les invoquent. Fais 10 tirages à l’autel.', ev: 'tirage', n: 10, rec: { eclats: 45 }, merci: 'Je vois… de belles cartes dans ton avenir. Et ces éclats dans ta main.' },
  coralie: { txt: 'Les champions de l’arène portent mes tenues. Gagne 2 combats d’arène !', ev: 'arene', n: 2, rec: { essence: 350 }, merci: 'Superbe ! Tu ferais un très bon mannequin.' },
  tholos: { txt: 'Quand le boss mondial revient, frappe-le : 100 dégâts, au moins.', ev: 'mondial', n: 100, rec: { essence: 300, eclats: 15 }, merci: 'Joli coup. Le clan se souviendra de toi.' },
  sylvain: { txt: 'Une parcelle bien tenue nourrit tout le monde. Récolte la tienne 3 fois.', ev: 'recolter', n: 3, rec: { essence: 200, seve: 60 }, merci: 'Voilà un jardinier ! Prends de la sève de ma serre.' },
  faune: { txt: 'Le boss de la Sylve d’Émeraude est réveillé. Endors-le pour de bon.', ev: 'victoire', f: { terr: 'plante', type: ['boss'] }, n: 1, rec: { essence: 400, graine_or: 3 }, merci: 'La forêt respire à nouveau. Ces graines d’or sont pour toi.' },
  mousse: { txt: 'Il paraît qu’il y a des salles mystère en expédition. Visite-en 3 et raconte-moi !', ev: 'mystere', n: 3, rec: { essence: 150, eclats: 12 }, merci: 'Waouh ! Un couloir piégé ?! Un jour j’irai aussi.' },
  aelia: { txt: 'Le grand ouvrage du village a besoin de bras. Donne-lui 60 points.', ev: 'projet', n: 60, rec: { essence: 300, eclats: 15 }, merci: 'La Sylve te remercie, et moi aussi.' },
  brindille: { txt: 'Il me manque de la sève pour mes poutres : 60, s’il te plaît.', donner: { seve: 60 }, rec: { essence: 250, eclats: 15 }, merci: 'Avec ça, je te bâtis une charpente qui tiendra cent ans.' },
  ronce: { txt: 'Prouve ta valeur : gagne 10 combats en expédition.', ev: 'victoire', n: 10, rec: { essence: 300, eclats: 20 }, merci: 'Tu as la peau dure. Comme les ronces.' },
  // ---- v87 : Chapitre 2, l'histoire des Terres Brisées (5 quêtes qui se suivent ; niv = niveau requis, apres = quête à finir avant)
  orin: { histoire: 1, niv: 30, txt: 'La Faille s’est ouverte il y a trois nuits. Des choses en sortent : ni Feu, ni Eau, ni Plante… les trois à la fois. Abats 3 de ces monstres et dis-moi ce que tu as vu.', ev: 'victoire', f: { terr: 'brisees' }, n: 3, rec: { essence: 600, fragments: 40 }, merci: 'Fusionnés… Alors les vieilles histoires étaient vraies. Va voir Lyra aux archives, elle saura.' },
  lyra: { histoire: 2, niv: 30, apres: 'orin', txt: 'Les fragments que laissent ces monstres gardent la mémoire du monde d’avant les clans. Rapporte-m’en 60, je les lirai.', donner: { fragments: 60 }, rec: { eclats: 50, eclat_vide: 2 }, merci: 'Les trois clans n’en faisaient qu’un, jadis. Le Cœur de la Faille les a séparés… et il se réveille. Prends ces éclats du vide : Varda en fera des invocations.' },
  varda: { histoire: 3, niv: 40, apres: 'lyra', txt: 'Avec des éclats du vide, je forge des cartes qui appellent des alliés. Mais d’abord, prouve que tu tiens debout là-bas : bats 3 élites ou monstres rares des Terres Brisées.', ev: 'victoire', f: { terr: 'brisees', type: ['elite', 'rare'] }, n: 3, rec: { essence: 800, eclat_vide: 4 }, merci: 'Tu as l’étoffe. Va à l’atelier : avec ces éclats, forge ta première invocation. Sel t’attend près du Cœur.' },
  sel: { histoire: 4, niv: 40, apres: 'varda', txt: 'Le Cœur de la Faille bat au bout du portail. Chaque battement fend la terre un peu plus. Fais-le taire.', ev: 'victoire', f: { terr: 'brisees', type: ['boss'] }, n: 1, rec: { essence: 1000, eclat_vide: 6 }, merci: 'Le silence… enfin. Mais sous le Cœur, il y avait autre chose. Quelque chose de vide. Nyx t’en dira plus.' },
  nyx: { histoire: 5, niv: 50, apres: 'sel', txt: 'Sous le Cœur dort le Néant originel, ce qui restait avant les éléments. Il ne s’éveille que dans le Cauchemar. Va le chercher, et finis cette histoire.', ev: 'victoire', f: { terr: 'brisees', type: ['boss'], cauchemar: true }, n: 1, rec: { essence: 2000, eclat_vide: 10, eclats: 100 }, merci: 'Le Néant est retombé dans le sommeil. Les trois clans te doivent leur monde — même s’ils ne le sauront jamais. Merci, Héros de la Faille.' },
};
export const PAR_CLAN = { brisees: ['orin', 'lyra', 'varda', 'sel', 'nyx'], feu: ['bram', 'ignis', 'cendrillon', 'mordred', 'pyra', 'gorran'], eau: ['marin', 'nerea', 'loupiot', 'oracle', 'coralie', 'tholos'], plante: ['sylvain', 'faune', 'mousse', 'aelia', 'brindille', 'ronce'] };
export const TITRES = { brisees: 'Héros de la Faille', feu: 'Ami des Terres de Braise', eau: 'Ami des Lagons d’Azur', plante: 'Ami de la Sylve' };
export const valide = (id) => typeof id === 'string' && Object.hasOwn(QUETES, id);

// l'état d'une quête pour ce joueur : 'libre' (à proposer), 'cours', 'prete' (à rendre), 'faite'
export const suivi = (p) => (p.pnjQ ||= {});
export function etat(p, id) {
  const q = QUETES[id], s = p.pnjQ?.[id];
  if (!q) return null;
  if (!s) return verrou(p, id) ? 'verrou' : 'libre';
  if (s.fait) return 'faite';
  if (q.donner) return Object.entries(q.donner).every(([k, v]) => (p.ress[k] || 0) >= v) ? 'prete' : 'cours';
  return (s.n || 0) >= q.n ? 'prete' : 'cours';
}
// v87 : les quêtes d'histoire attendent un niveau et la quête d'avant
export function verrou(p, id) {
  const q = QUETES[id];
  if (q.apres && !p.pnjQ?.[q.apres]?.fait) return `Pas encore : il te faut d’abord finir la quête de ${q.apres[0].toUpperCase() + q.apres.slice(1)}.`;
  if (q.niv && niveauDe(p) < q.niv) return `Reviens au niveau ${q.niv}.`;
  return null;
}
export const progres = (p, id) => (QUETES[id]?.donner ? null : { n: Math.min(QUETES[id].n, p.pnjQ?.[id]?.n || 0), max: QUETES[id].n });

export function accepter(p, id) {
  if (!valide(id)) return { ok: false };
  const v = verrou(p, id); if (!p.pnjQ?.[id] && v) return { ok: false, raison: v };
  if (etat(p, id) !== 'libre') return { ok: false, raison: 'Tu as déjà cette quête.' };
  suivi(p)[id] = { n: 0 };
  return { ok: true };
}
export function rendre(p, id) {
  if (!valide(id)) return { ok: false };
  if (etat(p, id) !== 'prete') return { ok: false, raison: 'Ce n’est pas encore fait.' };
  const q = QUETES[id];
  if (q.donner) for (const [k, v] of Object.entries(q.donner)) p.ress[k] -= v;
  for (const [k, v] of Object.entries(q.rec)) p.ress[k] = (p.ress[k] || 0) + v;
  p.pnjQ[id].fait = true;
  return { ok: true, rec: q.rec, merci: q.merci };
}
// chaque événement fait avancer les quêtes des habitants en cours (appelé par quetes.js)
export function avancer(p, ev, n = 1, info = {}) {
  if (!p.pnjQ) return;
  for (const [id, s] of Object.entries(p.pnjQ)) {
    const q = QUETES[id]; if (!q || s.fait || q.ev !== ev) continue;
    if (q.f && !Object.entries(q.f).every(([k, v]) => (Array.isArray(v) ? v.includes(info?.[k]) : info?.[k] === v))) continue;
    s.n = Math.min(q.n, (s.n || 0) + Math.max(0, n | 0));
  }
}
export const amiDe = (p, clan) => PAR_CLAN[clan].every((id) => p.pnjQ?.[id]?.fait);
export const nomTerre = (clan) => T[clan];
