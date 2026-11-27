// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le panneau admin des joueurs (v112)
//  Page : /clans/admin-joueurs.html. Chercher un joueur, voir son niveau et
//  ses ressources, lui fixer un niveau ou lui donner (ou retirer) des ressources.
//  Protégé par la clé ADMIN_CLE (ou, à défaut, JOURNAL_CLE) : sans clé définie
//  sur le serveur, le panneau est fermé.
//  Un joueur connecté est modifié en mémoire (il voit le changement tout de
//  suite, avec un message) ; un joueur absent est modifié dans la sauvegarde.
// =====================================================================
import express from 'express';
import * as P from '../../shared/clans/profil.js';
import * as QP from '../../shared/clans/quetesPnj.js';
import * as CO from '../../shared/clans/consecration.js';
import { BRANCHES, CHEFS } from '../../shared/clans/cartes.js';
import { ClansRoom } from './ClansRoom.js';
import { lireProfilClans, ecrireProfilClans, listerProfilsClans, jetonValide } from './stats.js';

const cle = () => process.env.ADMIN_CLE || process.env.JOURNAL_CLE || '';
const autorise = (req) => !!cle() && (req.query.cle || req.get('x-admin-cle')) === cle();
export const RESSOURCES = Object.keys(P.nouveauProfil('feu', 'x').ress);
const MAX_RESS = 1e9;

// le résumé d'un profil pour la liste et la fiche
function resume(jeton, p, enLigne) {
  const niv = P.niveau(p), xp = P.xpDe(p);
  return { jeton, enLigne, nom: p.nom, clan: p.clan, classe: p.classe, niv, xp,
    xpNiv: P.xpPourNiveau(niv), xpSuivant: niv >= P.NIVEAU_MAX ? null : P.xpPourNiveau(niv + 1),
    xpDetail: { victoires: p.stats?.victoires || 0, boss: (p.stats?.boss || 0) * P.XP_BOSS, quetes: QP.xpQuetes(p) },
    ress: Object.fromEntries(RESSOURCES.map((k) => [k, p.ress?.[k] || 0])), creeLe: p.creeLe || null, branche: p.branche || null, chef: p.chef || null };
}

// fixe le niveau : l'XP vient des victoires, des boss et des quêtes ; on règle les victoires
export function fixerNiveau(p, n) {
  n = Math.max(1, Math.min(P.NIVEAU_MAX, Math.floor(+n) || 1));
  const autre = (p.stats?.boss || 0) * P.XP_BOSS + QP.xpQuetes(p);
  p.stats ||= {}; p.stats.victoires = Math.max(0, P.xpPourNiveau(n) - autre);
  const obtenu = P.niveau(p);
  return { ok: true, niv: obtenu, avertissement: obtenu > n ? `Ses quêtes et ses boss donnent déjà le niveau ${obtenu} : impossible de descendre plus bas.` : null };
}
// v122 : fixer la branche d'Ascension (sans épreuve) et retirer le titre de chef de guerre (pour retenter la Consécration)
export function fixerBranche(p, b) {
  if (!BRANCHES[b] || BRANCHES[b].classe !== p.classe) return { ok: false, avertissement: 'Cette branche n’est pas pour sa classe.' };
  if (p.branche === b) return { ok: false };
  p.branche = b; delete p.ascension; CO.suivreBranche(p); P.convertirAutresClasses(p); delete p.avisClasse;
  return { ok: true };
}
export function retirerChef(p) {
  if (!p.chef) return { ok: false };
  if (p.titre === `ch:${p.chef}`) p.titre = null;
  delete p.chef; delete p.consecration; P.convertirAutresClasses(p); delete p.avisClasse;
  return { ok: true };
}
// ajoute (ou retire, avec un nombre négatif) des ressources, ou les fixe
export function changerRessources(p, ress, mode = 'ajouter') {
  const fait = {};
  for (const [k, v0] of Object.entries(ress || {})) {
    if (!RESSOURCES.includes(k)) continue;
    const v = Math.trunc(+v0); if (!Number.isFinite(v) || (mode === 'ajouter' && !v)) continue;
    const avant = p.ress[k] || 0, apres = Math.max(0, Math.min(MAX_RESS, mode === 'fixer' ? v : avant + v));
    if (apres !== avant) { p.ress[k] = apres; fait[k] = apres - avant; }
  }
  return fait;
}
const ICO = { essence: '✨', eclats: '💎' };
const texteDon = (fait) => Object.entries(fait).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${ICO[k] || k}`).join(', ');

export function brancherAdmin(app) {
  app.use('/api/clans/admin', express.json({ limit: '8kb' }));
  app.use('/api/clans/admin', (req, res, next) => {
    if (!cle()) return res.status(403).json({ erreur: 'Panneau fermé : définis ADMIN_CLE (ou JOURNAL_CLE) sur le serveur.' });
    if (!autorise(req)) return res.status(403).json({ erreur: 'Clé incorrecte.' });
    next();
  });
  // la liste (q : un bout du nom ou du code) — les joueurs connectés d'abord
  app.get('/api/clans/admin/joueurs', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim().toLowerCase(), vus = new Map();
      for (const j of ClansRoom.tousEnLigne()) vus.set(j.jeton, resume(j.jeton, j.p, true));
      for (const { jeton, p } of await listerProfilsClans()) if (!vus.has(jeton) && P.profilValide?.(p) !== false && p?.nom) { try { P.completer(p); vus.set(jeton, resume(jeton, p, false)); } catch { /* profil abîmé */ } }
      let l = [...vus.values()];
      if (q) l = l.filter((x) => x.nom.toLowerCase().includes(q) || x.jeton.toLowerCase().startsWith(q));
      l.sort((a, b) => b.enLigne - a.enLigne || b.niv - a.niv || a.nom.localeCompare(b.nom));
      res.json({ total: vus.size, enLigne: l.filter((x) => x.enLigne).length, joueurs: l.slice(0, 300), ressources: RESSOURCES, nivMax: P.NIVEAU_MAX });
    } catch (e) { res.status(500).json({ erreur: e.message }); }
  });
  app.get('/api/clans/admin/joueur/:jeton', async (req, res) => {
    const jeton = String(req.params.jeton); if (!jetonValide(jeton)) return res.status(400).json({ erreur: 'Code invalide.' });
    const e = ClansRoom.enLigne(jeton);
    if (e) return res.json(resume(jeton, e.j.p, true));
    const p = await lireProfilClans(jeton).catch(() => null);
    if (!p) return res.status(404).json({ erreur: 'Joueur introuvable.' });
    res.json(resume(jeton, P.completer(p), false));
  });
  // { niveau?, ress?: { cle: nombre }, mode?: 'ajouter' | 'fixer', message? }
  app.post('/api/clans/admin/joueur/:jeton', async (req, res) => {
    const jeton = String(req.params.jeton); if (!jetonValide(jeton)) return res.status(400).json({ erreur: 'Code invalide.' });
    const b = req.body || {}, e = ClansRoom.enLigne(jeton);
    let p = e?.j.p || null;
    if (!p) { p = await lireProfilClans(jeton).catch(() => null); if (!p) return res.status(404).json({ erreur: 'Joueur introuvable.' }); P.completer(p); }
    if (e?.j.duel || e?.j.manche) return res.status(409).json({ erreur: 'Ce joueur est en plein duel : réessaie dans un instant.' });
    const nivAvant = P.niveau(p), out = { avertissements: [] };
    if (b.niveau != null && b.niveau !== '') { const r = fixerNiveau(p, b.niveau); if (r.avertissement) out.avertissements.push(r.avertissement); }
    const fait = changerRessources(p, b.ress, b.mode === 'fixer' ? 'fixer' : 'ajouter');
    const nivApres = P.niveau(p), autres = [];
    if (b.branche) { const r = fixerBranche(p, String(b.branche)); if (r.avertissement) out.avertissements.push(r.avertissement); if (r.ok) autres.push(`branche ${BRANCHES[p.branche].nom}`); }
    if (b.chef === 'retirer') { const ancien = p.chef; if (retirerChef(p).ok) autres.push(`titre de ${CHEFS[ancien].nom} retiré`); }
    if (nivApres === nivAvant && !Object.keys(fait).length && !autres.length) return res.json({ ...out, ok: true, rien: true, joueur: resume(jeton, p, !!e) });
    // le message que voit le joueur connecté
    const morceaux = [];
    if (nivApres !== nivAvant) morceaux.push(`niveau ${nivApres}`);
    if (Object.keys(fait).length) morceaux.push(texteDon(fait));
    morceaux.push(...autres);
    const perso = String(b.message || '').trim().slice(0, 140);
    const msg = `🎁 L’équipe du jeu : ${morceaux.join(' · ')}${perso ? ` — « ${perso} »` : ''}`;
    if (e) e.salle.apresAdmin(e.client, e.j, msg);
    else await ecrireProfilClans(jeton, p);
    console.log(`🛠️  admin · ${p.nom} (${jeton.slice(0, 6)}…) : niveau ${nivAvant} → ${nivApres}${Object.keys(fait).length ? ` · ${texteDon(fait)}` : ''}${autres.length ? ` · ${autres.join(', ')}` : ''}${e ? ' (en ligne)' : ''}`);
    res.json({ ...out, ok: true, enLigne: !!e, joueur: resume(jeton, p, !!e) });
  });
}
