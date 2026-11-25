// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — la connexion au serveur, la reconnexion, les actions, le chat et la liste des joueurs
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { cg } from './crazygames.js';
import { cleMaison } from '../../../shared/clans/geo.js';
import * as F from '../../../shared/clans/familiers.js';
import * as MT from '../../../shared/clans/montures.js';
import * as DC from '../../../shared/clans/deco.js';
import { Client } from 'colyseus.js';
import { ELEMENTS, CLANS, CLASSES, RARES } from '../../../shared/clans/cartes.js';
import * as P from '../../../shared/clans/profil.js';
import * as Q from '../../../shared/clans/quetes.js';
import * as AP from '../../../shared/clans/apparence.js';
import { sfx } from '../sfx.js';
import { lancerMondial, majMondial, recompenseMondiale } from './ui-combat.js';
import { $, CLE, ICO_RESS, ILLUS, ILLUS_MONSTRES, precharger, SERVER_URL, compte, esc, monId, nf, niveau, p, pause, room, setMonId, setP, setRoom, toast } from './ui-commun.js';
import { afficherDuel, fermerDuel, finDuel } from './ui-duel.js';
import { dansMonde, ecranClan, entrerMonde, majBarre, monde } from './ui-monde.js';
import { majProjets } from './ui-projets.js';
import { suivrePasse } from './ui-passe.js';
import { fenetreFiche, suivreHautsFaits } from './ui-fiche.js';
import { suivreAscension } from './ui-ascension.js';
import { suivreMontures } from './ui-montures.js';
import { noterPerso } from './ui-compte.js';
import { majPastilleG } from './ui-grimoire.js';
import { feteNiveau } from './ui-notifs.js';
import * as GR from '../../../shared/clans/grimoire.js';
import * as HF from '../../../shared/clans/hautsfaits.js';
import { afficherClassement, alerteSanctuaire, classArene, enFile, fenetreArene, majBandeauArene, sanctEtat, setClassArene, setEnFile, setSanctEtat, vueFenetre } from './ui-social.js';

export function lireStockage() {
  try {
    const x = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (x && x.sig && x.jeton) return { jeton: x.jeton, copie: x };
    if (P.profilValide(x)) return { ancien: x };   // profil d'avant : le serveur le reprend une fois
  } catch { /* illisible */ }
  return {};
}
export let minuteur = null;
let avisClasseVu = false, avisDeckVu = false;
export function recevoirProfil(m) {
  if (!m) return;
  // v68 : les cartes d'une autre classe ont été changées en éclats
  if (m.p?.avisClasse?.n && !avisClasseVu) { avisClasseVu = true; const a = m.p.avisClasse; setTimeout(() => toast(`🎴 Chaque classe ne joue plus que ses propres cartes de classe : tes ${a.n} carte${a.n > 1 ? 's' : ''} d’autres classes ${a.n > 1 ? 'ont été changées' : 'a été changée'} en ${nf(a.eclats)} éclats.`), 1500); }
  // v83 : decks remis à 2 exemplaires par carte (1 par légendaire)
  if (m.p?.avisDeck && !avisDeckVu) { avisDeckVu = true; setTimeout(() => toast(`🃏 Nouvelle règle : 2 exemplaires d'une même carte au plus par deck (1 pour une légendaire). ${m.p.avisDeck} carte${m.p.avisDeck > 1 ? 's ont' : ' a'} été retirée${m.p.avisDeck > 1 ? 's' : ''} de ton deck.`), 1500); }
  const avant = p ? Q.etat(p) : null, gagneesAvant = p ? piecesGagnees() : null, grAvant = p ? GR.aReclamer(p) : null, nivAvant = p && m.p && p.nom === m.p.nom && p.clan === m.p.clan ? P.niveau(p) : null;
  if (m.p) noterPerso(m.jeton, m.p, P.niveau(m.p));
  if (m.p) { setP(P.completer(m.p)); try { localStorage.setItem(CLE, JSON.stringify({ p: m.p, sig: m.sig, jeton: m.jeton })); } catch { /* plein */ } }
  else try { localStorage.setItem(CLE, JSON.stringify({ jeton: m.jeton, sig: 'aucun', p: null })); } catch { /* plein */ }
  clearTimeout(minuteur); minuteur = setTimeout(() => compte.sauvegarder(), 2000);
  if (p) { majBarre(); monde.majApparence(AP.code(p)); monde.majFamilier(F.actif(p)); monde.majTitre(HF.nomTitre(HF.titreDe(p)), HF.titreDe(p)); monde.majNom(p.nom, cleMaison(p)); monde.majMonture(MT.actif(p)); monde.majDeco(DC.code(p), p.branche); if (dansMonde) monde.majMaParcelle(p.parcelle); }
  if (p && avant) annoncerQuetes(avant);
  if (p) { suivrePasse(); suivreHautsFaits(); suivreAscension(); suivreMontures(); import('./ui-amis.js').then((m) => m.proposerCadeau()); prechargerUtile(); }
  if (p && nivAvant != null && m.p && P.niveau(p) > nivAvant && dansMonde) feteNiveau(P.niveau(p));
  if (p) { const n = GR.aReclamer(p); if (grAvant != null && n > grAvant) { sfx.niveau(); toast('📚 Le Grimoire a une récompense pour toi ! (menu ☰ → Grimoire)'); } majPastilleG(); }
  if (p && gagneesAvant) for (const id of piecesGagnees()) if (!gagneesAvant.has(id)) { sfx.fanfare(); toast(`🎨 Nouvelle apparence débloquée : <b>${esc(AP.PIECES[id].nom)}</b> ! (bouton 👕)`); }
}
export const piecesGagnees = () => new Set(Object.keys(AP.PIECES).filter((id) => AP.PIECES[id].cond && AP.possede(p, id)));
export function annoncerQuetes(avant) {
  const apres = Q.etat(p), finie = (x) => x.n >= (Q.DEFS[x.id]?.n ?? Infinity);
  for (const k of ['j', 's']) apres[k].forEach((x, i) => {
    const y = avant[k][i];
    if (finie(x) && !x.ok && (!y || y.id !== x.id || !finie(y))) { sfx.niveau(); toast(`📜 Quête ${k === 's' ? 'de la semaine ' : ''}terminée : <b>${esc(Q.DEFS[x.id].txt)}</b> — récompense à réclamer !`); }
  });
  majPastille();
}
export function majPastille() { const n = p ? Q.aReclamer(p) : 0, el = $('pastilleQ'); if (!el) return; el.textContent = n; el.classList.toggle('cache', !n); }
export let nAct = 0;
export const attente = new Map();
export function act(type, m = {}) {
  if (!room) return Promise.resolve({ ok: false, raison: 'Pas de connexion au serveur : réessaie dans un instant.' });
  const id = ++nAct;
  return new Promise((res) => {
    const t = setTimeout(() => { attente.delete(id); res({ ok: false, raison: 'Le serveur ne répond pas.' }); }, 8000);
    attente.set(id, (r) => { clearTimeout(t); res(r); });
    room.send('act', { ...m, type, rid: id });   // rid : le numéro de la demande (id est déjà pris par les cartes et les pièces)
  });
}
export let occupe = false;
export async function faire(type, m) { if (occupe) return { ok: false }; occupe = true; try { return await act(type, m); } finally { occupe = false; } }
export const chargement = document.createElement('div');
chargement.id = 'chargement';
document.body.append(chargement);
export function etatChargement(t) { chargement.innerHTML = t ? `<div><span class="orbeC">🔮</span><p>${t}</p></div>` : ''; chargement.classList.toggle('cache', !t); }
export let essais = 0;
export async function connecter() {
  if (!dansMonde) etatChargement(essais ? `Le serveur ne répond pas… nouvelle tentative (${essais}).` : 'Connexion au monde des clans…');
  try {
    setRoom(await new Client(SERVER_URL).joinOrCreate('clans', lireStockage()));
    essais = 0;
    brancher(room);
  } catch {
    setRoom(null); essais++;
    if (dansMonde) ajouterChat({ systeme: true, t: 'Le monde est injoignable. Nouvelle tentative…' });
    setTimeout(connecter, Math.min(15000, 2000 + essais * 2000));
  }
}
export function brancher(room) {
    room.onMessage('bienvenue', (m) => { setMonId(m.id); });
    room.onMessage('profil', (m) => {
      recevoirProfil(m);
      if (dansMonde) return;
      etatChargement('');
      if (!p) ecranClan(); else if (!p.classe) ecranClan(true); else entrerMonde();
      if (m.source === 'migration') setTimeout(() => toast('Ton profil est maintenant gardé par le serveur 🔒'), 900);
    });
    room.onMessage('r', (r) => { recevoirProfil(r.profil); attente.get(r.id)?.(r); attente.delete(r.id); });
    room.onMessage('infos', (m) => { if (m.tout) infosJ.clear(); for (const i of m.tout || m.maj || []) infosJ.set(i[0], i); });
    room.onMessage('m', (l) => { for (let k = 0; k < l.length; k += 5) { const q = posJ.get(l[k]); posJ.set(l[k], { x: l[k + 1], y: l[k + 2], dir: l[k + 3], s: l[k + 4] }); if (q && !presents.has(l[k])) presents.add(l[k]); } monde.majAutres(listeJoueurs(), monId); });
    room.onMessage('carte', (l) => {
      presents = new Set();
      for (let k = 0; k < l.length; k += 4) { const n = l[k], q = posJ.get(n); presents.add(n); posJ.set(n, { x: l[k + 1], y: l[k + 2], dir: q?.dir ?? 0, s: l[k + 3] }); }
      for (const n of [...posJ.keys()]) if (!presents.has(n)) { posJ.delete(n); infosJ.delete(n); }
      const liste = listeJoueurs(); monde.majAutres(liste, monId); listeEnLigne(liste);
    });
    room.onMessage('chat', ajouterChat);
    room.onMessage('filons', (l) => monde.majFilons(l));
    room.onMessage('ramasse', (m) => { sfx.orb(); const r = RARES[m.terr]; toast(`+${m.n} ${ICO_RESS[r.id]} ${r.nom}`); });
    room.onMessage('info', (m) => toast(esc(m.t)));
    room.onMessage('recale', (m) => { const j = monde.joueur; if (j) { j.x = m.x; j.y = m.y; } if (m.retour) toast('🏠 Défaite : te voilà renvoyé devant ta maison, étourdi 10 secondes. Reprends des forces !'); });
    room.onMessage('duel', afficherDuel);
    room.onMessage('duelResultat', finDuel);
    room.onMessage('mondial', majMondial);
    room.onMessage('mondialGo', lancerMondial);
    room.onMessage('mondialRecompense', recompenseMondiale);
    room.onMessage('scores', (sc) => { scores = sc; listeEnLigne(derniereListe); });
    room.onMessage('classement', afficherClassement);
    room.onMessage('sanctuaires', (l) => { setSanctEtat(l); monde.majSanctuaires(l); });
    room.onMessage('projets', (v) => majProjets(v));
    import('./ui-groupe.js').then((G) => import('./ui-fenetres.js').then((Fe) => G.brancherMessagesGroupe(room, Fe)));
    room.onMessage('fiche', (f) => fenetreFiche(f));
    room.onMessage('alerte', alerteSanctuaire);
    room.onMessage('areneFile', (m) => { setEnFile(m.en ? m.depuis : null); majBandeauArene(); if (vueFenetre() === 'arene') fenetreArene(false); });
    room.onMessage('tourClassement', (c) => import('./ui-tour.js').then((m) => m.recevoirClassement(c)));   // v92
    room.onMessage('areneClassement', (c) => { setClassArene(c); if (vueFenetre() === 'arene') fenetreArene(false); });
    room.onLeave((code) => {
      const jeton = room.reconnectionToken;
      room = null;
      if (code === 4002) return etatChargement('La sauvegarde du jeu ne répond pas pour le moment. Ton personnage est en sécurité. <button class="bouton" onclick="location.reload()">Réessayer</button>');
      if (code === 4001) return etatChargement('Ton profil est ouvert dans un autre onglet. <button class="bouton" onclick="location.reload()">Jouer ici</button>');
      if (code === 4000) return;   // départ voulu (room.leave)
      reconnecter(jeton);
    });
}
export async function reconnecter(jeton) {
  const fin = Date.now() + 19000;
  $('reseau').classList.remove('cache'); $('reseau').textContent = '📡 Connexion perdue… reconnexion';
  while (Date.now() < fin) {
    try {
      setRoom(await Promise.race([new Client(SERVER_URL).reconnect(jeton), pause(4000).then(() => { throw new Error('délai'); })]));
      brancher(room);
      $('reseau').classList.add('cache'); toast('📡 Reconnecté !');
      return;
    } catch { setRoom(null); await pause(1500); }
  }
  // trop tard : on repart de zéro (le profil, lui, est gardé par le serveur)
  $('reseau').textContent = '📡 Reconnexion…';
  if (!$('duel').classList.contains('cache')) { fermerDuel(); toast('La connexion a été trop longue : le duel est perdu.'); }
  await connecter();
  $('reseau').classList.add('cache');
}
export let scores = null, derniereListe = [];
export const ETATS_JOUEUR = ['libre', 'expedition', 'parcelle', 'tirage', 'combat', 'duel', 'arene'];
export const infosJ = new Map(), posJ = new Map();
export let presents = new Set();
export function listeJoueurs() {
  const l = [];
  for (const n of presents) { const i = infosJ.get(n), q = posJ.get(n); if (i && q) l.push([i[1], i[2], i[3], q.x, q.y, q.dir, ETATS_JOUEUR[q.s] || 'libre', i[4], i[5], i[6], i[7] || '', i[8] || '', i[9] || '', i[10] || '', i[11] || '', i[12] || '', i[13] || '', i[14] || '']); }
  return l;
}
export function listeEnLigne(liste) {
  derniereListe = liste; if (!p) return;
  const par = { feu: [], eau: [], plante: [] };
  for (const [id, nom, clan, , , , statut, niv, classe] of liste) par[clan]?.push({ id, nom, niv, statut, classe, moi: id === monId });
  if (!liste.length) par[p.clan].push({ nom: p.nom, niv: niveau(), classe: p.classe, moi: true });
  $('nbEnLigne').textContent = `(${Math.max(1, liste.length)})`;
  $('listeClans').innerHTML = CLANS.map((k) => `<div class="groupeClan"><b class="${k}">${scores?.champion === k ? '👑 ' : ''}${ELEMENTS[k].ico} ${ELEMENTS[k].clan} · ${par[k].length}${scores ? ` <em class="pts">${nf(scores.clans[k])} pts</em>` : ''}</b>${par[k].map((j) => `<span class="lienFiche" data-fiche="${j.moi ? 'moi' : esc(j.id || 'moi')}" title="Voir la fiche">${j.moi ? '★ ' : ''}${CLASSES[j.classe]?.ico || ''} ${esc(j.nom)} <i>niv. ${j.niv}${j.statut === 'expedition' ? ' · en expédition' : j.statut === 'duel' ? ' · ⚔️ en duel' : j.statut === 'combat' ? ' · ☠ contre le boss' : ''}</i></span>`).join('')}</div>`).join('');
}
export let canal = 'tous';
document.querySelectorAll('#chatOnglets button').forEach((b) => b.onclick = () => { canal = b.dataset.c; document.querySelectorAll('#chatOnglets button').forEach((x) => x.classList.toggle('actif', x === b)); });
export function ajouterChat(m) {
  if (!m.systeme && cg.chatCoupe) return;   // v106 : chat désactivé par CrazyGames (les messages du jeu restent)
  const d = document.createElement('p');
  d.innerHTML = m.systeme ? `<span class="sys">${esc(m.t)}</span>` : (m.canal === 'mp' ? `<span class="mp"><small>[privé${m.de === p?.nom ? ` → ${esc(m.a)}` : ''}]</small> <b class="n ${m.clan}">${esc(m.de)}</b> : ${esc(m.t)}</span>` : `${m.canal === 'clan' ? '<small>[clan]</small> ' : ''}<b class="n ${m.clan}">${esc(m.de)}</b> : ${esc(m.t)}`);
  if (!m.systeme) d.setAttribute('translate', 'no');   // v107 : on ne traduit pas ce qu'écrivent les joueurs
  $('chatMsgs').append(d); $('chatMsgs').scrollTop = 1e6;
  while ($('chatMsgs').children.length > 60) $('chatMsgs').firstChild.remove();
}
$('chatTexte').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const t = $('chatTexte').value.trim(), mp = /^@(\S+)\s+(.+)$/.exec(t);   // v93 : « @pseudo message » = message privé
    if (t && room && !cg.chatCoupe) room.send('chat', mp ? { t: mp[2], canal: 'mp', a: mp[1] } : { t, canal });
    $('chatTexte').value = ''; $('chatTexte').blur();
  }
  if (e.key === 'Escape') $('chatTexte').blur();
});
addEventListener('keydown', (e) => { if (e.key === 'Enter' && !cg.chatCoupe && !$('ecranMonde').classList.contains('cache') && document.activeElement !== $('chatTexte') && $('fenetre').classList.contains('cache')) { $('chatTexte').focus(); e.preventDefault(); } });

// v94 : les images du deck et des monstres de sa terre, chargées pendant qu'on se promène
let preFait = false;
function prechargerUtile() {
  if (preFait || !p) return; preFait = true;
  const B = import.meta.env.BASE_URL;
  import('../../../shared/clans/monstres.js').then(({ tousDe }) => precharger([
    ...[...new Set(p.deck)].filter((id) => ILLUS.has(id)).map((id) => `${B}clans/cartes/${id}.webp`),
    ...tousDe(p.clan).map((m) => m.id).filter((id) => ILLUS_MONSTRES.has(id)).map((id) => `${B}clans/monstres/${id}.webp`),
  ]));
}
