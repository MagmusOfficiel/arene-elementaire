// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — décorer sa maison (v77)
//  Pur (client + serveur). 4 emplacements autour de la maison : clôture,
//  jardin, statue, bannière. On achète une décoration une fois, puis on
//  la pose ou on la change quand on veut. Tout le monde la voit.
//  Purement cosmétique. Le dessin est dans client/src/clans/decoArt.js.
// =====================================================================
import { niveau } from './profil.js';

export const EMPL = { cloture: 'Clôture', jardin: 'Jardin', statue: 'Statue', banniere: 'Bannière' };
// gagne(p) : une décoration qu'on ne paie pas, on la mérite
export const DECOS = {
  cl_bois: { empl: 'cloture', nom: 'Barrière de bois', cout: { essence: 400 } },
  cl_pierre: { empl: 'cloture', nom: 'Muret de pierre', cout: { essence: 900 } },
  cl_fer: { empl: 'cloture', nom: 'Grille en fer forgé', cout: { essence: 1600, eclats: 20 } },
  ja_fleurs: { empl: 'jardin', nom: 'Parterre de fleurs', cout: { essence: 300 } },
  ja_potager: { empl: 'jardin', nom: 'Potager', cout: { essence: 500 } },
  ja_element: { empl: 'jardin', nom: 'Jardin élémentaire', desc: 'Fleurs de lave, coraux ou champignons lumineux, selon ton clan.', cout: { essence: 1200, eclats: 10 } },
  st_guerrier: { empl: 'statue', nom: 'Statue du guerrier', cout: { essence: 1500 } },
  st_fontaine: { empl: 'statue', nom: 'Fontaine', cout: { essence: 2000 } },
  st_dragon: { empl: 'statue', nom: 'Statue du dragon', niv: 15, cout: { essence: 3500, cristal: 5, perle_noire: 5, graine_or: 5 } },
  st_champion: { empl: 'statue', nom: 'Trophée du champion', desc: 'Pour les meilleurs de l’arène.', gagne: { txt: 'Atteins le rang Or (1 250 Elo) en arène.', test: (p) => Math.max(p.stats?.areneMax || 0, p.arene?.meilleur || 0) >= 1250 } },
  ba_clan: { empl: 'banniere', nom: 'Bannière du clan', cout: { essence: 300 } },
  ba_or: { empl: 'banniere', nom: 'Étendard doré', cout: { essence: 1000, eclats: 10 } },
  ba_branche: { empl: 'banniere', nom: 'Étendard de ta branche', desc: 'Les couleurs de ta branche de classe.', gagne: { txt: 'Choisis ta branche (Ascension, niveau 20).', test: (p) => !!p.branche } },
};
export const IDS = Object.keys(DECOS);
export const valide = (id) => typeof id === 'string' && Object.hasOwn(DECOS, id);
export const possede = (p, id) => valide(id) && (DECOS[id].gagne ? DECOS[id].gagne.test(p) : (p.deco?.l || []).includes(id));
export function acheter(p, id) {
  if (!valide(id)) return { ok: false };
  const d = DECOS[id];
  if (d.gagne) return { ok: false, raison: `Elle ne s’achète pas : ${d.gagne.txt}` };
  if (possede(p, id)) return { ok: false, raison: 'Tu l’as déjà.' };
  if (d.niv && niveau(p) < d.niv) return { ok: false, raison: `Il faut être niveau ${d.niv}.` };
  for (const [k, v] of Object.entries(d.cout)) if ((p.ress[k] || 0) < v) return { ok: false, raison: 'Ressources insuffisantes.' };
  for (const [k, v] of Object.entries(d.cout)) p.ress[k] -= v;
  p.deco ||= { l: [], pose: {} }; p.deco.l.push(id); p.deco.pose[d.empl] = id;
  return { ok: true };
}
// poser (id) ou enlever (null) la décoration d'un emplacement
export function poser(p, empl, id) {
  if (!Object.hasOwn(EMPL, empl)) return { ok: false };
  p.deco ||= { l: [], pose: {} };
  if (id === null) { delete p.deco.pose[empl]; return { ok: true }; }
  if (!possede(p, id) || DECOS[id].empl !== empl) return { ok: false, raison: 'Tu ne l’as pas.' };
  p.deco.pose[empl] = id; return { ok: true };
}
// ce qui est posé, pour l'envoyer aux autres joueurs (court) : « cl_bois.ja_fleurs..ba_clan »
export const code = (p) => Object.keys(EMPL).map((e) => { const id = p.deco?.pose?.[e]; return id && possede(p, id) ? id : ''; }).join('.');
export const lire = (c) => { const l = String(c || '').split('.'); return Object.fromEntries(Object.keys(EMPL).map((e, i) => [e, valide(l[i]) && DECOS[l[i]].empl === e ? l[i] : null])); };
