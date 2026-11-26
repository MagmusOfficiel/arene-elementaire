// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le Grimoire (v80)
//  Pur (client + serveur). Deux livres :
//   - les cartes : toutes celles que ta classe (et ta branche) peut avoir,
//     les inconnues cachées ;
//   - le bestiaire : les monstres déjà vaincus (13 par terre + les 3 titans).
//  Des récompenses à réclamer une seule fois quand on complète une partie.
// =====================================================================
import { CARTES, RARES, RARETES } from './cartes.js';
import { MONSTRES, BOSS_CAUCHEMAR, TERRITOIRES, tousDe } from './monstres.js';
import { pourClasse, pourClan } from './profil.js';

export const TERRES = Object.keys(TERRITOIRES);
export const ORDRE_RARETE = Object.keys(RARETES);
const g = (p) => (p.grimoire ||= { b: {}, r: [] });

// ---------- le bestiaire ----------
export const monstresDe = (terr) => tousDe(terr).filter((m) => m !== BOSS_CAUCHEMAR[terr]);
export const TITANS = TERRES.map((t) => BOSS_CAUCHEMAR[t]);
export const TOUS_MONSTRES = TERRES.flatMap((t) => tousDe(t));
const ID_VALIDES = new Set(TOUS_MONSTRES.map((m) => m.id));
export const vaincus = (p) => p.grimoire?.b || {};
export const vu = (p, id) => (vaincus(p)[id] || 0) > 0;
// le serveur note les monstres vaincus à chaque victoire
export function vaincre(p, ids) {
  const b = g(p).b;
  for (const id of ids || []) if (ID_VALIDES.has(id)) b[id] = Math.min(99999, (b[id] || 0) + 1);
}
// où on croise ce monstre (affiché sous les monstres vaincus)
export function ouVoir(m, terr) {
  if (m === BOSS_CAUCHEMAR[terr]) return 'Boss du Cauchemar';
  const M = MONSTRES[terr];
  if (m.rang === 'boss') return 'Boss de la terre (un des deux, selon l’expédition)';
  if (m.rang === 'elite') return 'Élite (salle 💀)';
  if (m.rang === 'rare') return 'Monstre rare (salle ⭐)';
  return M.normaux.includes(m) ? 'Combat ordinaire' : '';
}

// v101 : chaque fiche se remplit en 3 étapes — découvert (1 victoire), étudié, maîtrisé ;
// il faut moins de victoires pour les monstres rares, élites et boss
export const SEUILS = { normal: [1, 10, 25], rare: [1, 5, 12], elite: [1, 5, 12], boss: [1, 3, 6] };
const seuilsDe = (m) => (TITANS.includes(m) ? [1, 2, 3] : SEUILS[m.rang] || SEUILS.normal);
export const NIVEAUX_FICHE = ['inconnu', 'découvert', 'étudié', 'maîtrisé'];
export const niveauFiche = (p, m) => { const v = vaincus(p)[m.id] || 0, s = seuilsDe(m); return s.filter((x) => v >= x).length; };
export const prochainSeuil = (p, m) => seuilsDe(m)[niveauFiche(p, m)] ?? null;
export const maitrise = (p, m) => niveauFiche(p, m) >= 3;

// ---------- les cartes ----------
// celles que ce joueur peut avoir (élément + sa classe + sa branche), rangées par rareté puis par nom
export const cartesDe = (p) => Object.keys(CARTES).filter((id) => pourClasse(id, p.classe, p.branche || null) && pourClan(id, p.clan))   // v116
  .sort((a, b) => ORDRE_RARETE.indexOf(CARTES[a].rarete) - ORDRE_RARETE.indexOf(CARTES[b].rarete) || CARTES[a].nom.localeCompare(CARTES[b].nom, 'fr'));
export const possede = (p, id) => (p.collection?.[id]?.n || 0) > 0;

// ---------- les récompenses ----------
// rec : essence, eclats, rare (ressource rare : celle de la terre, sinon celle de ton clan), titre
const PCT = [[25, { essence: 200 }], [50, { essence: 400, eclats: 15 }], [75, { eclats: 40, rare: 4 }], [100, { eclats: 100, rare: 8, titre: 'gri:cartes' }]];
const PAR_RARETE = { commune: { essence: 300 }, rare: { essence: 600, eclats: 20 }, epique: { eclats: 60, rare: 5 }, legendaire: { eclats: 150, rare: 10 } };
export const TITRES = { cartes: 'Maître du grimoire', bestiaire: 'Savant des bêtes',
  // v101 : un titre par région dont on maîtrise tous les monstres
  b_feu: 'Dompteur des braises', b_eau: 'Dompteur des marées', b_plante: 'Dompteur de la sylve', b_brisees: 'Chasseur du Néant',
  b_cimes: 'Chasseur des tempêtes', b_ambre: 'Chasseur des sables', b_ciel: 'Chasseur d’étoiles' };

export function recompenses(p) {
  const l = [], cartes = cartesDe(p), nb = cartes.filter((id) => possede(p, id)).length, recu = new Set(p.grimoire?.r || []);
  for (const [pc, rec] of PCT) {
    const max = Math.ceil(cartes.length * pc / 100);
    l.push({ cle: `c${pc}`, livre: 'cartes', ico: '📖', txt: `Posséder ${pc} % des cartes de ta classe`, v: Math.min(nb, max), max, rec });
  }
  for (const r of ORDRE_RARETE) {
    const ids = cartes.filter((id) => CARTES[id].rarete === r);
    if (!ids.length) continue;
    l.push({ cle: `r-${r}`, livre: 'cartes', ico: '🃏', txt: `Toutes les cartes ${RARETES[r].nom.toLowerCase()}s`, v: ids.filter((id) => possede(p, id)).length, max: ids.length, rec: PAR_RARETE[r] });
  }
  for (const t of TERRES) {
    const ms = monstresDe(t), v = ms.filter((m) => vu(p, m.id)).length, moitie = Math.ceil(ms.length / 2);
    l.push({ cle: `b-${t}-1`, livre: 'bestiaire', terr: t, ico: TERRITOIRES[t].ico, txt: `${TERRITOIRES[t].nom} : vaincre ${moitie} monstres différents`, v: Math.min(v, moitie), max: moitie, rec: { essence: 250 } });
    l.push({ cle: `b-${t}-2`, livre: 'bestiaire', terr: t, ico: TERRITOIRES[t].ico, txt: `${TERRITOIRES[t].nom} : vaincre tous les monstres`, v, max: ms.length, rec: { eclats: 30, rare: 6 } });
    // v101 : toutes les fiches de la région « maîtrisées » (titan compris) → un titre
    { const tous = [...ms, BOSS_CAUCHEMAR[t]]; l.push({ cle: `b-${t}-3`, livre: 'bestiaire', terr: t, ico: '🏅', txt: `${TERRITOIRES[t].nom} : maîtriser toutes les fiches (titan compris)`, v: tous.filter((m) => maitrise(p, m)).length, max: tous.length, rec: { eclats: 80, rare: 10, titre: `gri:b_${t}` } }); }
  }
  l.push({ cle: 'b-titans', livre: 'bestiaire', ico: '💀', txt: 'Vaincre tous les titans du Cauchemar', v: TITANS.filter((m) => vu(p, m.id)).length, max: TITANS.length, rec: { eclats: 80, rare: 6 } });
  l.push({ cle: 'b-tout', livre: 'bestiaire', ico: '📕', txt: 'Compléter tout le bestiaire', v: TOUS_MONSTRES.filter((m) => vu(p, m.id)).length, max: TOUS_MONSTRES.length, rec: { eclats: 120, titre: 'gri:bestiaire' } });
  for (const x of l) { x.fait = x.v >= x.max; x.recu = recu.has(x.cle); }
  return l;
}
export const aReclamer = (p) => recompenses(p).filter((x) => x.fait && !x.recu).length;
// la ressource rare donnée : celle de la terre pour le bestiaire, celle de ton clan sinon
export const rareDe = (p, x) => RARES[x.terr || p.clan]?.id;
export function reclamer(p, cle) {
  const x = recompenses(p).find((y) => y.cle === cle);
  if (!x) return { ok: false, raison: 'Récompense inconnue.' };
  if (x.recu) return { ok: false, raison: 'Déjà réclamée.' };
  if (!x.fait) return { ok: false, raison: 'Pas encore complété.' };
  const r = x.rec, gain = {};
  if (r.essence) { p.ress.essence = (p.ress.essence || 0) + r.essence; gain.essence = r.essence; }
  if (r.eclats) { p.ress.eclats = (p.ress.eclats || 0) + r.eclats; gain.eclats = r.eclats; }
  if (r.rare) { const id = rareDe(p, x); p.ress[id] = (p.ress[id] || 0) + r.rare; gain[id] = r.rare; }
  if (r.titre) gain.titre = r.titre;
  g(p).r.push(cle);
  return { ok: true, gain };
}
export const aTitre = (p, n) => (p.grimoire?.r || []).includes(n === 'cartes' ? 'c100' : n === 'bestiaire' ? 'b-tout' : `b-${String(n).slice(2)}-3`);
