// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le profil des joueurs, gardé par le serveur
//  Le navigateur n'a plus qu'une copie en lecture : toute action qui change
//  le profil (tirage, amélioration, construction, expédition…) passe par ici
//  et utilise exactement les mêmes règles que le client (shared/clans/*.js).
//  Les combats d'expédition sont rejoués coup par coup à partir de la graine :
//  impossible de déclarer une victoire qu'on n'a pas jouée.
//  Une copie signée (HMAC) est renvoyée au navigateur : si la base du serveur
//  est perdue (redémarrage sans Upstash), on peut la restaurer sans pouvoir
//  la falsifier.
// =====================================================================
import crypto from 'node:crypto';
import * as P from '../../shared/clans/profil.js';
import * as X from '../../shared/clans/expedition.js';
import { rejouer } from '../../shared/clans/combat.js';
import * as Q from '../../shared/clans/quetes.js';
import * as T from '../../shared/clans/territoires.js';
import * as AP from '../../shared/clans/apparence.js';
import * as PJ from '../../shared/clans/projets.js';
import * as F from '../../shared/clans/familiers.js';
import * as PS from '../../shared/clans/passe.js';
import * as MA from '../../shared/clans/marchand.js';
import * as HF from '../../shared/clans/hautsfaits.js';
import { alea } from '../../shared/clans/combat.js';
import * as AS from '../../shared/clans/ascension.js';
import * as MT from '../../shared/clans/montures.js';
import * as QP from '../../shared/clans/quetesPnj.js';
import * as DC from '../../shared/clans/deco.js';
import { PNJ_PAR_ID, posPnj } from '../../shared/clans/pnj.js';
import { noterCombat } from './clansEquilibrage.js';
import { CARTES, CLANS, CLASSES } from '../../shared/clans/cartes.js';
import { lireProfilClans, ecrireProfilClans, jetonValide, maisonsPosees, ecrireMaison } from './stats.js';
import { emplacementMaison } from '../../shared/clans/geo.js';

const SECRET = process.env.CLANS_SECRET || 'clans-elementaires-secret-par-defaut';
if (!process.env.CLANS_SECRET) console.warn('⚠️  CLANS_SECRET non défini : les copies de profil sont signées avec la clé par défaut.');

export const nouveauJeton = () => crypto.randomBytes(18).toString('base64url');
export const signer = (p) => crypto.createHmac('sha256', SECRET).update(JSON.stringify(p)).digest('base64url');
function signatureValide(copie) {
  if (!copie || typeof copie !== 'object' || !copie.p || typeof copie.sig !== 'string') return false;
  const a = Buffer.from(signer(copie.p)), b = Buffer.from(copie.sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const PRIX_DEMENAGEMENT = 1000;
const pres = (id, ctx) => { const n = PNJ_PAR_ID[id]; if (!n || !ctx?.pos) return false; const q = posPnj(n, Date.now() / 1000); return Math.hypot(ctx.pos.x - q.x, ctx.pos.y - q.y) < 200; };
const num = (v) => (Number.isFinite(+v) ? +v : NaN);
export const DELAI_PSEUDO = 24 * 3600000;   // un changement de pseudo par jour
const propre = (t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// Retrouver le profil d'un joueur qui se connecte
// 1. ce que le serveur a gardé ; 2. sa copie signée ; 3. un ancien profil local (migration, une fois) ; 4. rien : il le crée.
export async function retrouver({ jeton, copie, ancien }) {
  if (!jetonValide(jeton)) jeton = nouveauJeton();
  let p = null, source = 'nouveau';
  try { p = await lireProfilClans(jeton); if (p) source = 'serveur'; } catch (e) { console.warn('Lecture du profil des Clans impossible :', e.message); }
  if (!p && signatureValide(copie) && copie.jeton === jeton && P.profilValide(copie.p)) { p = copie.p; source = 'copie'; }
  if (!p && ancien) { p = P.assainir(ancien); if (p) source = 'migration'; }
  if (p) P.completer(p);
  return { jeton, p, source };
}
export async function enregistrer(jeton, p) { try { await ecrireProfilClans(jeton, p); } catch (e) { console.warn('Sauvegarde du profil des Clans impossible :', e.message); } }

// ---------- les actions du joueur ----------
// chacune reçoit (profil, message, contexte) et renvoie { ok, raison?, res? }
// ctx.points(n) : points pour la rivalité des clans ; ctx.p : le profil (création)
// ctx.projets : l'état des projets de clan (bonus de la semaine) ; ctx.cle : identifiant stable du joueur
const carte = (id) => typeof id === 'string' && Object.hasOwn(CARTES, id);
const graine = () => crypto.randomInt(0, 2 ** 31);
export const ACTIONS = {
  creer(p, m, ctx) {
    if (p) return { ok: false, raison: 'Tu as déjà un profil.' };
    if (!CLANS.includes(m.clan) || typeof m.classe !== 'string' || !Object.hasOwn(CLASSES, m.classe)) return { ok: false, raison: 'Choix invalide.' };
    ctx.p = P.nouveauProfil(m.clan, propre(m.nom, 16) || 'Joueur', Date.now(), m.classe);
    // tests de bout en bout seulement (jamais en production) : un profil riche pour tout essayer
    if (+process.env.CLANS_TEST_NIVEAU > 1) ctx.p.stats.victoires = (+process.env.CLANS_TEST_NIVEAU - 1) * 6;   // tests seulement
    if (process.env.CLANS_TEST_DEPART === '1') { const r = ctx.p.ress; r.essence = 50000; r.eclats = 3000; for (const k of ['braises', 'perles', 'seve']) r[k] = 800; for (const k of ['cristal', 'perle_noire', 'graine_or']) r[k] = 60; }
    return { ok: true };
  },
  classe(p, m) { if (typeof m.classe !== 'string' || !Object.hasOwn(CLASSES, m.classe)) return { ok: false }; return P.choisirClasse(p, m.classe) ? { ok: true } : { ok: false, raison: 'Choix impossible.' }; },
  tirer(p, m) { const n = m.n === 10 ? 10 : 1, r = P.tirer(p, n, graine()); if (r.ok) Q.evenement(p, 'tirage', n); return r.ok ? { ok: true, res: r } : r; },
  fabriquer(p, m, ctx) { if (!carte(m.id)) return { ok: false }; return P.fabriquer(p, m.id, PJ.bonusDe(ctx?.projets, p.clan, 'remise')); },
  ameliorer(p, m, ctx) { if (!carte(m.id)) return { ok: false }; const r = P.ameliorer(p, m.id, PJ.bonusDe(ctx?.projets, p.clan, 'remise')); if (r.ok) Q.evenement(p, 'ameliorer'); return r.ok ? { ok: true, res: r } : r; },
  deckAjouter(p, m) { if (!carte(m.id)) return { ok: false }; return P.ajouterAuDeck(p, m.id); },
  deckRetirer(p, m) { if (!carte(m.id)) return { ok: false }; return P.retirerDuDeck(p, m.id); },
  // plusieurs decks (v64) : passer à un autre emplacement, ou le renommer
  deckChoisir(p, m) { return P.choisirDeck(p, m.i); },
  deckRenommer(p, m) { return P.renommerDeck(p, m.i, m.nom); },
  recolter(p, m, ctx) {
    const g = P.recolter(p, Date.now()), b = T.bonusProduction(ctx?.sanctuaires || 0) + PJ.bonusDe(ctx?.projets, p.clan, 'production');
    // bonus des sanctuaires tenus par le clan, et de l'Arbre-monde
    if (b > 0) for (const [k, v] of Object.entries(g)) if (typeof v === 'number' && v > 0 && typeof p.ress[k] === 'number') { const e = Math.floor(v * b); p.ress[k] += e; g[k] += e; }
    g.bonus = b;
    if ((g.essence || 0) >= 1) Q.evenement(p, 'recolter');
    return { ok: true, res: g };
  },
  construire(p, m) { if (typeof m.bat !== 'string' || !Object.hasOwn(P.BATIMENTS, m.bat)) return { ok: false }; const r = P.construire(p, m.bat); return r.ok ? { ok: true, res: r } : r; },
  expeCommencer(p, m, ctx) {
    if (p.expedition) return { ok: false, raison: 'Une expédition est déjà en cours.' };
    const r = ['feu', 'eau', 'plante'].includes(m.terr) && X.commencerExpedition(p, m.terr, Math.max(1, Math.min(4, m.palier | 0)), graine());
    if (r?.ok) { const b = PJ.bonusDe(ctx?.projets, p.clan, 'butin'); if (b) p.expedition.bonusButin = b; }
    return r?.ok ? { ok: true } : (r || { ok: false });
  },
  expeEntrer(p, m) {
    if (p.expedition?.groupe) return { ok: false, raison: 'En groupe, c’est le chef qui choisit la salle.' };
    if (p.expedition?.combatEnCours) return { ok: false, raison: 'Un combat est en cours.' };
    const r = X.entrer(p, String(m.salle || ''));
    return r.ok ? { ok: true, res: { type: r.type, soin: r.soin, gain: r.gain, relique: r.relique, mystere: r.mystere, aTerre: r.aTerre, releve: r.releve } } : { ok: false, raison: r.raison || 'Salle inaccessible.' };
  },
  // le client envoie ses coups ; on rejoue le combat et on garde CE résultat
  expeCombat(p, m, ctx) {
    const x = p.expedition; if (!x?.combatEnCours) return { ok: false, raison: 'Aucun combat en cours.' };
    const type = X.salle(x.carte, x.combatEnCours).type, terr = x.territoire, def = X.combatDe(p, x.combatEnCours);
    const c = rejouer(def, m.coups, { journal: true });
    if (!c.fini) return { ok: false, raison: 'Combat inachevé.' };
    noterCombat({ classe: p.classe, clan: p.clan, terr, palier: x.palier, type, deck: def.deck, c, pvAvant: x.pv });
    const r = X.apresCombat(p, c);
    if (c.fini === 'victoire') Q.evenement(p, 'victoire', 1, { terr, type });
    let familier = null;
    if (type === 'boss' && c.fini === 'victoire') { ctx.points?.('bossExpe'); familier = F.butinBoss(p, terr, def.palier?.n || 1, alea(graine())); }
    return { ok: true, res: { ...r, issue: c.fini, familier } };
  },
  // réclamer la récompense d'une quête (les quêtes avancent toutes seules côté serveur)
  quete(p, m, ctx) {
    const r = Q.reclamer(p, typeof m.quel === 'string' ? m.quel : '');
    if (r.ok) { ctx.points?.(r.semaine ? 'queteSemaine' : 'quete'); p.stats.quetes = (p.stats.quetes || 0) + 1; PS.gagner(p, r.semaine ? 'queteSemaine' : 'quete'); }
    return r.ok ? { ok: true, res: r } : r;
  },
  // l'apparence : acheter une pièce, ou porter une pièce qu'on a
  apparenceAcheter(p, m) { return AP.acheter(p, m.id); },
  apparencePorter(p, m) { return AP.porter(p, m.id); },
  // une relique à choisir après un élite (id, ou null pour passer)
  expeMystere(p, m) { const r = X.choisirMystere(p, Math.floor(Number(m.i))); if (r.ok) Q.evenement(p, 'mystere'); return r.ok ? { ok: true, res: { issue: r.issue, evt: r.evt } } : r; },
  expeRelique(p, m) { if (m.id !== null && typeof m.id !== 'string') return { ok: false }; return X.choisirRelique(p, m.id); },
  // le titre affiché sous le nom (un haut fait atteint), ou aucun
  // changer de pseudo (v70) : le compte (le jeton) ne change pas ; la maison reste à sa place
  renommer(p, m) {
    const nom = propre(m.nom, 16);
    if ([...nom].length < 2) return { ok: false, raison: 'Ton pseudo doit faire au moins 2 caractères.' };
    if (nom === p.nom) return { ok: false, raison: 'C’est déjà ton pseudo.' };
    const reste = (p.renomme || 0) + DELAI_PSEUDO - Date.now();
    if (reste > 0) return { ok: false, raison: `Tu pourras rechanger de pseudo dans ${Math.ceil(reste / 3600000)} h.` };
    p.maison ||= p.nom; p.nom = nom; p.renomme = Date.now();
    return { ok: true, res: { nom } };
  },
  titreChoisir(p, m) { return HF.choisirTitre(p, m.t ?? null); },
  // l'Ascension (v69) : l'épreuve (rejouée par le serveur), puis le choix de la branche
  ascensionDebut(p) { const r = AS.commencer(p, graine()); return r.ok ? { ok: true, res: { graine: r.graine } } : r; },
  ascensionCombat(p, m) {
    if (!p.ascension || p.ascension.reussie) return { ok: false, raison: 'Aucune épreuve en cours.' };
    const c = rejouer(AS.defEpreuve(p), m.coups);
    if (!c.fini) return { ok: false, raison: 'Combat inachevé.' };
    const r = AS.finir(p, c); return r.ok ? { ok: true, res: { victoire: r.victoire } } : { ok: false };
  },
  // poser sa maison où l'on veut sur la terre de son clan (v72) : la 1re fois gratuite, ensuite 1 000 essence
  maisonPoser(p, m, ctx) {
    const x = num(m.x), y = num(m.y);
    if (!ctx.pos || Math.hypot(ctx.pos.x - x, ctx.pos.y - (y + 40)) > 90) return { ok: false, raison: 'Va sur place pour poser ta maison.' };
    const e = emplacementMaison(p.clan, x, y, maisonsPosees(p.clan, ctx.cle));
    if (e.raison) return { ok: false, raison: e.raison };
    const prix = p.maisonPos ? PRIX_DEMENAGEMENT : 0;
    if (p.ress.essence < prix) return { ok: false, raison: `Il faut ${prix} essence pour déménager.` };
    p.ress.essence -= prix; p.maisonPos = { x: e.x, y: e.y };
    ecrireMaison(ctx.cle, p.clan, e.x, e.y);
    return { ok: true, res: { x: e.x, y: e.y, prix } };
  },
  // les quêtes des habitants (v76) : il faut être près de l'habitant
  pnjAccepter(p, m, ctx) { if (!pres(m.id, ctx)) return { ok: false, raison: 'Approche-toi de lui.' }; return QP.accepter(p, m.id); },
  pnjRendre(p, m, ctx) { if (!pres(m.id, ctx)) return { ok: false, raison: 'Approche-toi de lui.' }; const r = QP.rendre(p, m.id); return r.ok ? { ok: true, res: { rec: r.rec, merci: r.merci, ami: QP.amiDe(p, PNJ_PAR_ID[m.id].clan) } } : r; },
  decoAcheter(p, m) { return DC.acheter(p, m.id); },
  decoPoser(p, m) { return DC.poser(p, String(m.empl || ''), m.id === null ? null : String(m.id || '')); },
  parcheminFabriquer(p) { return AS.fabriquerParchemin(p); },
  ascensionChanger(p, m) { return AS.changer(p, typeof m.b === 'string' ? m.b : ''); },
  ascensionChoisir(p, m) { return AS.choisir(p, typeof m.b === 'string' ? m.b : ''); },
  // le marchand ambulant : prendre une de ses 3 offres (il faut être à côté de lui)
  marchandAcheter(p, m, ctx) { return MA.acheter(p, m.i, ctx?.pos); },
  // le passe de saison : réclamer les récompenses des niveaux atteints
  passeReclamer(p) { const r = PS.reclamer(p); return r.ok ? { ok: true, res: r.total } : r; },
  // les familiers : en fabriquer un, ou choisir celui qui nous suit
  familierFabriquer(p, m) { return F.valide(m.id) ? F.fabriquer(p, m.id) : { ok: false }; },
  montureAcheter(p, m) { return MT.acheter(p, m.id); },
  montureChoisir(p, m) { return m.id === null || MT.valide(m.id) ? MT.choisir(p, m.id) : { ok: false }; },
  familierChoisir(p, m) { return m.id === null || F.valide(m.id) ? F.choisir(p, m.id) : { ok: false }; },
  // un don au projet de clan de la semaine
  projetDonner(p, m, ctx) {
    if (!ctx?.projets) return { ok: false };
    const r = PJ.donner(ctx.projets, p, { essence: m.essence, materiau: m.materiau }, ctx.cle);
    if (r.ok) { Q.evenement(p, 'projet', r.pts); ctx.projetDon?.(r); }
    return r.ok ? { ok: true, res: r } : r;
  },
  expeAbandon(p) {
    if (!p.expedition) return { ok: false };
    p.expedition.combatEnCours = null;
    return { ok: true, res: X.terminer(p, 'defaite') };
  },
};
