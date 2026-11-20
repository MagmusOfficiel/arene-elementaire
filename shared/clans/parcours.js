// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le parcours des nouveaux venus (v79)
//  Pur (client + serveur). Six étapes, chacune présentée par un habitant
//  de ton village, avec une récompense que le serveur donne quand
//  l'étape est vraiment faite. La dernière offre un poney.
//  p.parcours : le nombre d'étapes déjà récompensées.
// =====================================================================
import { deckDepart } from './cartes.js';

// qui parle à chaque étape, selon le clan
const QUI = {
  conteur: { feu: 'mordred', eau: 'oracle', plante: 'aelia' },
  portail: { feu: 'ignis', eau: 'nerea', plante: 'faune' },
  artisan: { feu: 'bram', eau: 'coralie', plante: 'brindille' },
  garde: { feu: 'gorran', eau: 'tholos', plante: 'ronce' },
};
// parler : l'étape se valide en parlant à cet habitant ; fait(p) : sinon, ce que le serveur vérifie
export const ETAPES = [
  { qui: 'conteur', parler: true, titre: 'Les présentations', txt: 'Bienvenue, nouvelle âme du clan ! Viens me voir au village, j’ai deux mots à te dire.', dit: 'Le monde est divisé en trois clans, et le nôtre a besoin de toi. Je vais demander aux autres de t’apprendre l’essentiel. Tiens, pour bien commencer !', rec: { essence: 100 } },
  { qui: 'conteur', titre: 'L’autel', txt: 'Va à l’Autel des tirages, au Carrefour, et invoque ton premier sort.', fait: (p) => (p.tirages?.total || 0) > 0, rec: { essence: 150 } },
  { qui: 'artisan', titre: 'Ton deck', txt: 'Ouvre ton deck 🃏 et ajoute-y ta nouvelle carte avec « + Deck ». Un bon deck, ça se construit !', fait: (p) => p.deck.some((id) => !deckDepart(p.clan, p.classe).includes(id)), rec: { eclats: 15 } },
  { qui: 'portail', titre: 'L’expédition', txt: 'Rejoins-moi au portail de notre terre, choisis le Palier I et gagne ton premier combat.', fait: (p) => (p.stats?.victoires || 0) >= 1, rec: { essence: 200 } },
  { qui: 'garde', titre: 'Ta parcelle', txt: 'Ta maison produit même quand tu n’es pas là. Rentre chez toi et récolte ta parcelle.', fait: (p) => (p.stats?.recoltes || 0) >= 1, rec: { essence: 100, eclats: 10 } },
  { qui: 'conteur', parler: true, titre: 'Le cadeau du village', txt: 'Tu as bien appris. Reviens me voir : le village a un cadeau pour toi.', dit: 'Voilà, tu es des nôtres. Ce poney t’attend à l’écurie : avec lui, le monde est deux fois moins grand. Bonne route !', rec: { essence: 300, monture: 'poney' } },
];
export const pnjDe = (p, i) => QUI[ETAPES[i]?.qui]?.[p.clan] || null;
export const etape = (p) => p.parcours || 0;
export const fini = (p) => etape(p) >= ETAPES.length;
// l'étape actuelle est-elle faite (hors étapes « parler ») ?
export const prete = (p) => { const e = ETAPES[etape(p)]; return !!e && !e.parler && !!e.fait?.(p); };
// donner la récompense de l'étape actuelle (le serveur vérifie la distance pour les étapes « parler »)
export function valider(p, aCote = false) {
  const i = etape(p), e = ETAPES[i];
  if (!e) return { ok: false };
  if (e.parler ? !aCote : !e.fait(p)) return { ok: false, raison: 'Pas encore.' };
  for (const [k, v] of Object.entries(e.rec)) {
    if (k === 'monture') { p.montures ||= { l: [], actif: null }; if (!p.montures.l.includes(v)) p.montures.l.push(v); p.montures.actif ||= v; }
    else p.ress[k] = (p.ress[k] || 0) + v;
  }
  p.parcours = i + 1;
  return { ok: true, i, rec: e.rec, dit: e.dit || null };
}
