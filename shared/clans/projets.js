// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les projets de clan (v52)
//  Pur (client + serveur). Chaque semaine (lundi 0 h UTC), chaque clan
//  construit un grand ouvrage au centre de son village : les membres y
//  donnent de l'essence et le matériau du clan. L'ouvrage grandit à vue
//  (6 étapes) ; terminé, il donne un bonus à tout le clan la semaine
//  suivante. Le serveur garde l'état ; le client affiche.
// =====================================================================
import { semaineDe } from './mondial.js';

export const PROJETS = {
  feu: { id: 'forge', nom: 'Forge géante', ico: '⚒️', bonus: 'Améliorer et forger les cartes coûte 20 % de moins', cle: 'remise' },
  eau: { id: 'phare', nom: 'Phare des marées', ico: '🗼', bonus: '+20 % de butin au retour d’expédition', cle: 'butin' },
  plante: { id: 'arbre', nom: 'Arbre-monde', ico: '🌳', bonus: '+20 % de production de la parcelle', cle: 'production' },
};
export const BONUS = 0.2;
export const ETAPES = 6;   // 0 (fondations) → 5 (terminé)
// ce que vaut un don : 10 essence = 1 point, 1 matériau du clan = 1 point
export const VALEUR = { essence: 0.1, materiau: 1 };
export const MATERIAUX = { feu: 'braises', eau: 'perles', plante: 'seve' };
// l'objectif de la semaine suit le nombre de donateurs de la semaine précédente
export const objectifDe = (donneurs) => Math.min(16000, Math.max(1200, 600 * (donneurs | 0)));
export const etapeDe = (pts, objectif) => (pts >= objectif ? ETAPES - 1 : Math.min(ETAPES - 2, Math.floor((pts / objectif) * (ETAPES - 1))));
export const DON_MIN = 1;   // en points

// l'état gardé par le serveur
export function nouvelEtat(t = Date.now(), precedent = null) {
  const s = semaineDe(t), clans = {};
  for (const k of Object.keys(PROJETS)) {
    const avant = precedent?.clans?.[k];
    clans[k] = { pts: 0, objectif: objectifDe(avant ? Object.keys(avant.donneurs || {}).length : 0), donneurs: {}, fini: 0 };
  }
  // le bonus de cette semaine : les projets terminés la semaine dernière
  const actifs = {};
  if (precedent && precedent.semaine === semaineDe(t - 7 * 864e5).id) for (const k of Object.keys(PROJETS)) actifs[k] = !!precedent.clans?.[k]?.fini;
  return { semaine: s.id, fin: s.fin, clans, actifs };
}
// passe à la semaine suivante si besoin ; renvoie true si l'état a changé
export function aJour(e, t = Date.now()) {
  if (e && e.semaine === semaineDe(t).id) return { etat: e, change: false };
  return { etat: nouvelEtat(t, e), change: true };
}
export const bonusActif = (e, clan) => !!e?.actifs?.[clan];
export const bonusDe = (e, clan, cle) => (bonusActif(e, clan) && PROJETS[clan].cle === cle ? BONUS : 0);

// un don : { essence, materiau } (nombres entiers) ; vérifie le profil et le modifie
// cle : un identifiant stable du joueur (le serveur passe l'empreinte du jeton)
export function donner(e, p, don, cle, t = Date.now()) {
  const pr = e.clans[p.clan]; if (!pr) return { ok: false };
  const ess = Math.max(0, Math.floor(+don?.essence || 0)), mat = Math.max(0, Math.floor(+don?.materiau || 0)), km = MATERIAUX[p.clan];
  if (!Number.isFinite(ess) || !Number.isFinite(mat) || ess > 1e7 || mat > 1e7) return { ok: false };
  if ((p.ress.essence || 0) < ess || (p.ress[km] || 0) < mat) return { ok: false, raison: 'Ressources insuffisantes.' };
  const pts = Math.floor(ess * VALEUR.essence + mat * VALEUR.materiau);
  if (pts < DON_MIN) return { ok: false, raison: 'Donne au moins 10 essence ou 1 matériau.' };
  // on ne prend que ce qui compte (l'essence au-delà d'un multiple de 10 reste au joueur)
  const essPris = ess - (ess % 10);
  p.ress.essence -= essPris; p.ress[km] -= mat;
  const etapeAvant = etapeDe(pr.pts, pr.objectif), etaitFini = pr.pts >= pr.objectif;
  pr.pts += pts;
  const d = (pr.donneurs[cle] ||= { nom: '', pts: 0 }); d.nom = p.nom || 'Joueur'; d.pts += pts;
  p.stats.projet = (p.stats.projet || 0) + pts;
  p.projet = { s: e.semaine, pts: (p.projet?.s === e.semaine ? p.projet.pts : 0) + pts };   // ma part cette semaine
  if (!etaitFini && pr.pts >= pr.objectif) pr.fini = t;
  return { ok: true, pts, pris: { essence: essPris, [km]: mat }, etape: etapeDe(pr.pts, pr.objectif), monte: etapeDe(pr.pts, pr.objectif) > etapeAvant, termine: !etaitFini && pr.pts >= pr.objectif };
}
// ce que voit le client : les meilleurs donateurs seulement
export function vue(e) {
  const clans = {};
  for (const [k, pr] of Object.entries(e.clans)) {
    clans[k] = { pts: pr.pts, objectif: pr.objectif, etape: etapeDe(pr.pts, pr.objectif), fini: pr.fini, n: Object.keys(pr.donneurs).length,
      top: Object.values(pr.donneurs).sort((a, b) => b.pts - a.pts).slice(0, 5).map((d) => [d.nom, d.pts]) };
  }
  return { semaine: e.semaine, fin: e.fin, clans, actifs: e.actifs };
}
// le contenu garde une taille bornée : au-delà de 300 donateurs par clan, on garde les plus gros
export function compacter(e) {
  for (const pr of Object.values(e.clans)) { const d = Object.entries(pr.donneurs); if (d.length > 300) pr.donneurs = Object.fromEntries(d.sort((a, b) => b[1].pts - a[1].pts).slice(0, 300)); }
  return e;
}
