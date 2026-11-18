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
import { CARTES, CLANS, CLASSES } from '../../shared/clans/cartes.js';
import { lireProfilClans, ecrireProfilClans, jetonValide } from './stats.js';

const SECRET = process.env.CLANS_SECRET || 'clans-elementaires-secret-par-defaut';
if (!process.env.CLANS_SECRET) console.warn('⚠️  CLANS_SECRET non défini : les copies de profil sont signées avec la clé par défaut.');

export const nouveauJeton = () => crypto.randomBytes(18).toString('base64url');
export const signer = (p) => crypto.createHmac('sha256', SECRET).update(JSON.stringify(p)).digest('base64url');
function signatureValide(copie) {
  if (!copie || typeof copie !== 'object' || !copie.p || typeof copie.sig !== 'string') return false;
  const a = Buffer.from(signer(copie.p)), b = Buffer.from(copie.sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
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
const carte = (id) => typeof id === 'string' && Object.hasOwn(CARTES, id);
const graine = () => crypto.randomInt(0, 2 ** 31);
export const ACTIONS = {
  creer(p, m, ctx) {
    if (p) return { ok: false, raison: 'Tu as déjà un profil.' };
    if (!CLANS.includes(m.clan) || typeof m.classe !== 'string' || !Object.hasOwn(CLASSES, m.classe)) return { ok: false, raison: 'Choix invalide.' };
    ctx.p = P.nouveauProfil(m.clan, propre(m.nom, 16) || 'Joueur', Date.now(), m.classe);
    return { ok: true };
  },
  classe(p, m) { if (typeof m.classe !== 'string' || !Object.hasOwn(CLASSES, m.classe)) return { ok: false }; return P.choisirClasse(p, m.classe) ? { ok: true } : { ok: false, raison: 'Choix impossible.' }; },
  tirer(p, m) { const n = m.n === 10 ? 10 : 1, r = P.tirer(p, n, graine()); if (r.ok) Q.evenement(p, 'tirage', n); return r.ok ? { ok: true, res: r } : r; },
  fabriquer(p, m) { if (!carte(m.id)) return { ok: false }; return P.fabriquer(p, m.id); },
  ameliorer(p, m) { if (!carte(m.id)) return { ok: false }; const r = P.ameliorer(p, m.id); if (r.ok) Q.evenement(p, 'ameliorer'); return r.ok ? { ok: true, res: r } : r; },
  deckAjouter(p, m) { if (!carte(m.id)) return { ok: false }; return P.ajouterAuDeck(p, m.id); },
  deckRetirer(p, m) { if (!carte(m.id)) return { ok: false }; return P.retirerDuDeck(p, m.id); },
  recolter(p) { const g = P.recolter(p, Date.now()); if ((g.essence || 0) >= 1) Q.evenement(p, 'recolter'); return { ok: true, res: g }; },
  construire(p, m) { if (typeof m.bat !== 'string' || !Object.hasOwn(P.BATIMENTS, m.bat)) return { ok: false }; const r = P.construire(p, m.bat); return r.ok ? { ok: true, res: r } : r; },
  expeCommencer(p, m) {
    if (p.expedition) return { ok: false, raison: 'Une expédition est déjà en cours.' };
    const r = ['feu', 'eau', 'plante'].includes(m.terr) && X.commencerExpedition(p, m.terr, Math.max(1, Math.min(3, m.palier | 0)), graine());
    return r?.ok ? { ok: true } : (r || { ok: false });
  },
  expeEntrer(p, m) {
    if (p.expedition?.combatEnCours) return { ok: false, raison: 'Un combat est en cours.' };
    const r = X.entrer(p, String(m.salle || ''));
    return r.ok ? { ok: true, res: { type: r.type, soin: r.soin, gain: r.gain } } : { ok: false, raison: 'Salle inaccessible.' };
  },
  // le client envoie ses coups ; on rejoue le combat et on garde CE résultat
  expeCombat(p, m, ctx) {
    const x = p.expedition; if (!x?.combatEnCours) return { ok: false, raison: 'Aucun combat en cours.' };
    const type = X.salle(x.carte, x.combatEnCours).type, terr = x.territoire;
    const c = rejouer(X.combatDe(p, x.combatEnCours), m.coups);
    if (!c.fini) return { ok: false, raison: 'Combat inachevé.' };
    const r = X.apresCombat(p, c);
    if (c.fini === 'victoire') Q.evenement(p, 'victoire', 1, { terr, type });
    if (type === 'boss' && c.fini === 'victoire') ctx.points?.('bossExpe');
    return { ok: true, res: { ...r, issue: c.fini } };
  },
  // réclamer la récompense d'une quête (les quêtes avancent toutes seules côté serveur)
  quete(p, m, ctx) {
    const r = Q.reclamer(p, typeof m.quel === 'string' ? m.quel : '');
    if (r.ok) ctx.points?.(r.semaine ? 'queteSemaine' : 'quete');
    return r.ok ? { ok: true, res: r } : r;
  },
  expeAbandon(p) {
    if (!p.expedition) return { ok: false };
    p.expedition.combatEnCours = null;
    return { ok: true, res: X.terminer(p, 'defaite') };
  },
};
