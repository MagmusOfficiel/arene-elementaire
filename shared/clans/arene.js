// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'arène classée
//  Pur (client + serveur). Duels à distance avec classement Elo, rangs et
//  saisons d'un mois. Quand personne n'est disponible, on affronte un
//  « Reflet » : le deck d'un vrai joueur de son niveau, joué par le serveur
//  (Elo compté à moitié).
// =====================================================================
import { CARTES, effetsDe } from './cartes.js';
import { coutDe } from './duel.js';

export const ELO_DEPART = 1000;
export const RANGS = [
  { id: 'bronze', nom: 'Bronze', ico: '🥉', min: 0, rec: { essence: 100, eclats: 10 } },
  { id: 'argent', nom: 'Argent', ico: '🥈', min: 1100, rec: { essence: 250, eclats: 20 } },
  { id: 'or', nom: 'Or', ico: '🥇', min: 1250, rec: { essence: 500, eclats: 40 } },
  { id: 'platine', nom: 'Platine', ico: '💠', min: 1400, rec: { essence: 800, eclats: 60 } },
  { id: 'diamant', nom: 'Diamant', ico: '💎', min: 1550, rec: { essence: 1200, eclats: 90 } },
  { id: 'maitre', nom: 'Maître', ico: '👑', min: 1700, rec: { essence: 2000, eclats: 150 } },
];
export const rangDe = (elo) => RANGS.slice().reverse().find((r) => elo >= r.min) || RANGS[0];
export const ARENE = {
  K: 32, kReflet: 16,
  gainVictoire: { essence: 40, eclats: 2 }, gainDefaite: { essence: 10, eclats: 0 },
  partiesPayeesParJour: 10,       // au-delà, l'arène ne paie plus (le classement compte toujours)
  delaiReflet: 25000,             // ms d'attente avant de proposer un Reflet
  ecartBase: 100, ecartParSeconde: 15,
};

// saison = un mois (UTC)
export function saisonDe(t = Date.now()) {
  const d = new Date(t), id = d.toISOString().slice(0, 7), fin = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return { id, fin };
}
export const nouvelleArene = (t = Date.now()) => ({ saison: saisonDe(t).id, elo: ELO_DEPART, meilleur: ELO_DEPART, v: 0, d: 0, jour: '', payees: 0 });

// au changement de saison : récompense selon le meilleur rang atteint, puis Elo ramené à mi-chemin de 1000
export function aJour(p, t = Date.now()) {
  if (!p.arene) { p.arene = nouvelleArene(t); return null; }
  const a = p.arene, s = saisonDe(t).id;
  if (a.saison === s) return null;
  const joue = a.v + a.d > 0, rang = rangDe(a.meilleur), rec = joue ? rang.rec : null;
  if (rec) { p.ress.essence += rec.essence; p.ress.eclats = (p.ress.eclats || 0) + rec.eclats; }
  const elo = Math.round(ELO_DEPART + (a.elo - ELO_DEPART) / 2);
  p.arene = { ...nouvelleArene(t), elo, meilleur: elo };
  return rec ? { saison: a.saison, rang, rec } : null;
}

export const attendu = (ea, eb) => 1 / (1 + 10 ** ((eb - ea) / 400));
// score : 1 victoire, 0.5 égalité, 0 défaite
export const variation = (ea, eb, score, reflet = false) => Math.round((reflet ? ARENE.kReflet : ARENE.K) * (score - attendu(ea, eb)));

// le résultat d'une partie d'arène pour un joueur : Elo, compteurs, gains du jour
export function resultat(p, eloAdv, issue, reflet, jour) {
  const a = p.arene, score = issue === 'victoire' ? 1 : issue === 'nul' ? 0.5 : 0;
  const delta = variation(a.elo, eloAdv, score, reflet);
  a.elo = Math.max(0, a.elo + delta); a.meilleur = Math.max(a.meilleur, a.elo);
  if (p.stats) p.stats.areneMax = Math.max(p.stats.areneMax || 0, a.meilleur);   // le record de toutes les saisons (hauts faits, v60)
  if (issue === 'victoire') a.v++; else if (issue === 'defaite') a.d++;
  if (a.jour !== jour) { a.jour = jour; a.payees = 0; }
  let gain = { essence: 0, eclats: 0 };
  if (a.payees < ARENE.partiesPayeesParJour) { a.payees++; gain = issue === 'victoire' ? ARENE.gainVictoire : ARENE.gainDefaite; }
  p.ress.essence += gain.essence; p.ress.eclats = (p.ress.eclats || 0) + gain.eclats;
  return { delta, elo: a.elo, gain, rang: rangDe(a.elo) };
}

// ---------- l'IA d'un Reflet : quelle carte jouer (index), ou -1 pour finir le tour ----------
export function coupBot(d, qui) {
  if (d.fini || d.actif !== qui) return -1;
  const j = d.j[qui], adv = d.j[1 - qui], vie = j.pv / j.pvMax;
  let mieux = -1, score = 0;
  j.main.forEach((k, i) => {
    const cout = coutDe(j, i); if (cout > j.energie) return;
    const c = CARTES[k.id], e = effetsDe(k.id, k.niv);
    let deg = (e.degats || 0) * (e.fois || 1) + (e.degatsParBrulure ? adv.brulure * e.degatsParBrulure : 0) + (e.bouclierEnDegats ? j.bloc : 0);
    if (deg) deg += j.force * (e.fois || 1);
    let s = deg + (e.brulure || 0) * 1.6 + (e.trempe || 0) * 2 + (e.affaibli || 0) * 2
      + (e.bouclier || 0) * (vie < 0.6 ? 1.1 : 0.6) + (e.soin || 0) * (1 - vie) * 1.6
      + (e.force || 0) * 3 + (e.energie || 0) * 4 + (e.pioche || 0) * 2.4 + (e.epines || 0) * 1.4 + (e.regen || 0) * 2;
    if (deg && deg >= adv.pv + adv.bloc) s += 100;   // coup fatal
    if (c.type === 'pouvoir' && d.tour > 12) s *= 0.5;
    s = s / Math.max(0.7, cout) + (cout === 0 ? 1 : 0);
    if (s > score) { score = s; mieux = i; }
  });
  return mieux;
}
