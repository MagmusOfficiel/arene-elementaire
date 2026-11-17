// =====================================================================
//  ZONE MORTE — le survivant : santé, endurance, blessures, infection,
//  faim, soif, fatigue, inventaire, sommeil
// =====================================================================
import { OBJETS, CAPACITE_BASE, ajouterObjet, retirerObjet, poidsInventaire, trouver } from './objets.js';
import { facteurCourse, niveauComp } from './competences.js';

export const BLESSURES = {
  egratignure: { nom: 'Égratignure', degats: 4, saigne: 0.3, infection: 0.07 },
  laceration: { nom: 'Lacération', degats: 9, saigne: 1, infection: 0.25 },
  morsure: { nom: 'Morsure', degats: 15, saigne: 1, infection: 1 },
};
export const DUREE_INFECTION_MIN = 2160;   // une morsure tue en un jour et demi de jeu (~1 h réelle)

// besoins (sur 100) : combien ils montent par HEURE de jeu
export const BESOINS = { soif: 3.2, faim: 1.8, fatigue: 4.4, repos: 15 };
export const SEUILS = { faim: [45, 70, 90], soif: [40, 60, 85], fatigue: [50, 70, 90] };   // gêné, sérieux, critique

export function nouveauSurvivant() {
  const inv = [];
  ajouterObjet(inv, 'batte', 1, 50);
  ajouterObjet(inv, 'chiffon', 3);
  ajouterObjet(inv, 'eau', 1);
  ajouterObjet(inv, 'barre', 1);
  return {
    sante: 100, endurance: 100, saignements: 0, infecte: false, infection: 0, blessures: [], tues: 0, mort: null, accroupi: false,
    faim: 20, soif: 15, fatigue: 10, inv, arme: 0, sac: false, lampe: null, comp: {}, metier: 'chomeur',   // lampe : { allumee, charge } quand on en tient une
  };
}
// anciennes sauvegardes (phase 2) : on complète
export function completerSurvivant(s) {
  const n = nouveauSurvivant();
  const r = { ...n, ...s };
  if (!Array.isArray(s.inv)) { r.inv = n.inv; if (typeof s.bandages === 'number') r.inv[1].n = s.bandages; }
  delete r.bandages; delete r.action;
  return r;
}
export const capacite = (s) => CAPACITE_BASE + (s.sac ? OBJETS.sac.capacite : 0);
export const poids = (s) => poidsInventaire(s.inv);
export const surcharge = (s) => poids(s) / capacite(s);   // > 1 : ralenti, > 1.5 : plus de course
export const armeTenue = (s) => (s.arme != null && OBJETS[s.inv[s.arme]?.id]?.type === 'arme' ? s.inv[s.arme] : null);
export const niveau = (s, besoin) => SEUILS[besoin].filter((v) => s[besoin] >= v).length;   // 0..3

// tirage du type de coup : 'agrippe' = le zombie t'attrape sans blesser (cas le plus fréquent seul face à un zombie)
export function tirerBlessure(encercle, deDos, r = Math.random()) {
  const morsure = 0.05 + (encercle >= 3 ? 0.22 : encercle === 2 ? 0.08 : 0) + (deDos ? 0.1 : 0);
  const rate = Math.max(0.1, 0.45 - (encercle - 1) * 0.12 - (deDos ? 0.15 : 0));
  if (r < morsure) return 'morsure';
  if (r < morsure + 0.22) return 'laceration';
  if (r < 1 - rate) return 'egratignure';
  return 'agrippe';
}
export function blesser(s, type, r = Math.random) {
  const b = BLESSURES[type]; if (!b || s.mort) return;   // 'agrippe' : pas de blessure
  s.sante -= b.degats;
  if (r() < b.saigne) s.saignements++;
  if (r() < b.infection) s.infecte = true;
  s.blessures.push(type);
  if (s.blessures.length > 12) s.blessures.shift();
  s.dort = false;
  if (s.sante <= 0) { s.sante = 0; s.mort = type === 'morsure' ? 'Dévoré par les morts' : 'Mort de ses blessures'; }
}
// bander une plaie : bandage stérile d'abord, sinon bandage de fortune
export function bander(s) {
  if (s.mort || s.saignements <= 0) return false;
  const i = trouver(s.inv, 'bandage', 'chiffon'); if (i < 0) return false;
  retirer(s, i); s.saignements--; return true;
}
// retirer d'un inventaire en gardant l'arme tenue cohérente (son index peut glisser)
export function retirer(s, i, n = 1) {
  const avant = s.inv.length, r = retirerObjet(s.inv, i, n);
  if (r && s.inv.length < avant && s.arme != null) { if (s.arme === i) s.arme = null; else if (i < s.arme) s.arme--; }
  return r;
}

// ---------- utiliser un objet de l'inventaire ----------
// renvoie un texte pour le joueur (ou null si rien ne se passe)
export function utiliser(s, i) {
  const o = s.inv[i], d = o && OBJETS[o.id]; if (!d || s.mort) return null;
  if (d.type === 'nourriture' || d.type === 'boisson') {
    const cuisine = ['platPates', 'soupe', 'steak'].includes(o.id) && s.metier === 'cuisinier' ? 1.3 : 1;   // les plats du cuisinier nourrissent plus
    if (d.faim) s.faim = Math.max(0, s.faim - d.faim * cuisine);
    const tombeMalade = d.malade && Math.random() < d.malade;
    if (tombeMalade) s.malade = 480;   // 8 heures de jeu d'intoxication
    if (d.soif) s.soif = Math.max(0, Math.min(100, s.soif - d.soif));
    retirer(s, i);
    if (d.vide) { ajouterObjet(s.inv, d.vide, 1); }
    return `${d.type === 'boisson' ? 'Tu bois' : 'Tu manges'} : ${d.nom.toLowerCase()}.${tombeMalade ? ' Ça passe mal… tu te sens nauséeux.' : d.malade ? ' Cru… tu as eu de la chance.' : ''}`;
  }
  if (o.id === 'chiffon' || o.id === 'bandage') { const ok = bander(s); return ok ? 'Tu bandes la plaie.' : 'Tu ne saignes pas.'; }
  if (o.id === 'antidouleur') { s.endurance = Math.min(100, s.endurance + d.endurance); retirer(s, i); return 'Les antidouleurs te redonnent un peu de forces.'; }
  if (d.type === 'arme') { s.arme = s.arme === i ? null : i; return s.arme === i ? `Tu prends ${d.nom.toLowerCase()} en main.` : 'Tu ranges ton arme.'; }
  if (o.id === 'sac') { if (s.sac) return 'Tu portes déjà un sac.'; s.sac = true; retirer(s, i); return 'Tu enfiles le sac à dos : tu portes plus.'; }
  if (o.id === 'lampe') {
    if (!s.lampe) { s.lampe = { allumee: false, charge: o.etat ?? 100 }; retirer(s, i); return 'Tu accroches la lampe torche (L pour l’allumer).'; }
    return 'Tu as déjà une lampe.';
  }
  if (o.id === 'piles') {
    if (!s.lampe) return 'Il te faut une lampe.';
    s.lampe.charge = 100; retirer(s, i); return 'Piles neuves dans la lampe.';
  }
  return null;
}
export function basculerLampe(s) {
  if (!s.lampe) return 'Pas de lampe.';
  if (s.lampe.charge <= 0) { s.lampe.allumee = false; return 'Les piles sont mortes.'; }
  s.lampe.allumee = !s.lampe.allumee; return s.lampe.allumee ? 'Lampe allumée.' : 'Lampe éteinte.';
}
// une arme s'use à chaque coup qui porte
export function userArme(s) {
  const a = armeTenue(s); if (!a) return null;
  a.etat = (a.etat ?? 50) - 1;
  if (a.etat > 0) return null;
  const nom = OBJETS[a.id].nom; retirer(s, s.arme);
  return `${nom} s'est cassé${a.id === 'batte' || a.id === 'hache' || a.id === 'poele' || a.id === 'matraque' ? 'e' : ''} !`;
}

// ---------- le temps passe ----------
// dt : secondes réelles (saignement, endurance) ; minutes : minutes de jeu écoulées (besoins, infection, sommeil)
export function majSurvivant(s, dt, { course = false, bouge = false, minutes = 0 } = {}) {
  if (s.mort) return;
  const h = minutes / 60;
  // besoins
  const effort = course && bouge ? 1.6 : 1;
  s.soif = Math.min(100, s.soif + BESOINS.soif * h * effort * (s.dort ? 0.5 : 1));
  s.faim = Math.min(100, s.faim + BESOINS.faim * h * (s.dort ? 0.5 : 1));
  if (s.dort) s.fatigue = Math.max(0, s.fatigue - BESOINS.repos * h);
  else s.fatigue = Math.min(100, s.fatigue + BESOINS.fatigue * h * effort);
  // endurance : la course et les coups fatiguent, le repos la recharge (moins bien quand on a faim, soif ou sommeil)
  const recup = (s.malade > 0 ? 0.7 : 1) * (niveau(s, 'faim') >= 2 ? 0.7 : 1) * (niveau(s, 'soif') >= 2 ? 0.6 : 1) * (niveau(s, 'fatigue') >= 2 ? 0.6 : 1);
  if (course && bouge) s.endurance = Math.max(0, s.endurance - 11 * dt * facteurCourse(s));
  else s.endurance = Math.min(100, s.endurance + (bouge ? 6 : 10) * dt * recup);
  // saignement, ou cicatrisation (seulement si on a mangé et bu)
  if (s.saignements > 0) s.sante -= 0.45 * s.saignements * dt;
  else if (!s.infecte && !(s.malade > 0) && s.sante < 100 && niveau(s, 'faim') < 2 && niveau(s, 'soif') < 2) s.sante = Math.min(100, s.sante + (0.08 * dt + 1.5 * h) * (1 + 0.2 * niveauComp(s, 'soins')));
  // intoxication alimentaire (viande crue)
  if (s.malade > 0) { s.malade = Math.max(0, s.malade - minutes); s.sante -= 3 * h; }
  // déshydratation et famine
  if (s.soif >= SEUILS.soif[2]) s.sante -= 2.5 * h;
  if (s.faim >= SEUILS.faim[2]) s.sante -= 1.2 * h;
  // infection : la fièvre monte, la santé maximale baisse, puis c'est la fin
  if (s.infecte) {
    s.infection = Math.min(1, s.infection + minutes / DUREE_INFECTION_MIN);
    s.sante = Math.min(s.sante, 100 - s.infection * 100);
    if (s.infection >= 1) s.sante = 0;
  }
  // lampe : 100 % tiennent 10 heures de jeu
  if (s.lampe?.allumee) { s.lampe.charge = Math.max(0, s.lampe.charge - 10 * h); if (s.lampe.charge <= 0) s.lampe.allumee = false; }
  if (s.dort && s.fatigue <= 0) s.dort = false;
  if (s.sante <= 0) {
    s.sante = 0;
    s.mort = s.infecte && s.infection >= 0.99 ? "Emporté par l'infection" : s.malade > 0 ? 'Intoxication alimentaire' : s.saignements ? 'Vidé de son sang' : s.soif >= SEUILS.soif[2] ? 'Mort de soif' : s.faim >= SEUILS.faim[2] ? 'Mort de faim' : 'Mort de ses blessures';
  }
}
// la course n'est plus possible à bout de souffle, épuisé ou trop chargé
export const peutCourir = (s) => s.endurance > 8 && s.fatigue < SEUILS.fatigue[2] && surcharge(s) <= 1.5;
export function facteurVitesse(s) {
  return (s.accroupi ? 0.5 : 1) * (s.sante < 25 ? 0.8 : 1) * (surcharge(s) > 1 ? 0.75 : 1) * (niveau(s, 'fatigue') >= 3 ? 0.85 : 1);
}
// texte des « humeurs » (comme les moodles de Project Zomboid)
export function humeurs(s) {
  const t = [];
  const f = niveau(s, 'faim'), b = niveau(s, 'soif'), z = niveau(s, 'fatigue');
  if (f) t.push(['🍽️', ['Un creux', 'Affamé', 'Famine'][f - 1], f]);
  if (b) t.push(['💧', ['Soif', 'Assoiffé', 'Déshydraté'][b - 1], b]);
  if (z) t.push(['😴', ['Fatigué', 'Épuisé', 'À bout'][z - 1], z]);
  if (s.malade > 0) t.push(['🤢', 'Nauséeux', 2]);
  if (surcharge(s) > 1) t.push(['🎒', 'Trop chargé', surcharge(s) > 1.5 ? 3 : 2]);
  return t;
}
export const peutDormir = (s) => s.fatigue >= 25;
