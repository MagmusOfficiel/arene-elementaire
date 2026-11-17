// =====================================================================
//  LE CONCLAVE DES ÉLÉMENTS — client (page /conclave)
//  Le serveur envoie à chaque changement « vue » : l'état public + ce que
//  CE joueur a le droit de savoir (sa main, son rôle). On redessine tout.
// =====================================================================
import './style.css';
import { Client } from 'colyseus.js';
import { CONCLAVE, ROLES, CAMPS, SANCTUAIRES, ORDRE_SANCTUAIRES, CARTES, CHAMPIONS_CONCLAVE, PHASES } from '../../../shared/conclave/regles.js';
import { progress } from '../progress.js';
import { creerCompte } from '../compte.js';
import { son, debloquerSon } from './sons.js';

const SERVER_URL = new URLSearchParams(location.search).get('serveur') || window.ARENE_SERVEUR || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `ws://${location.hostname}:2567` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const HTTP_URL = SERVER_URL.replace(/^ws/, 'http');
const compte = creerCompte(HTTP_URL);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const portrait = (f) => (f ? `/portraits/${encodeURIComponent(f)}.webp` : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%225%22 fill=%22%23333%22/%3E%3C/svg%3E');
const ELEM_SANCT = { feu: 'forge', eau: 'source', foudre: 'pic', terre: 'racines', vent: 'cime' };

let client = null, room = null, vue = null, ancienne = null;
let selection = null;          // mode « choisir une cible » : { type: 'pouvoir'|'proteger', cible: 'joueur'|'sanctuaire'|'carte' }
let roleCache = false;
let vusJournal = 0, vusChat = 0, xpDonnee = false;

// ---------------------------------------------------------------- écrans
function ecran(id) { for (const e of document.querySelectorAll('.ecran')) e.classList.toggle('cache', e.id !== id); }
function toast(t, ms = 2600) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), ms); }
function etatCo(t) { $('etatCo').textContent = t || ''; }

$('pseudo').value = localStorage.getItem('pseudo') || '';
const pseudo = () => { const n = $('pseudo').value.trim().slice(0, 16) || 'Champion'; localStorage.setItem('pseudo', n); return n; };
const codeUrl = new URLSearchParams(location.search).get('salon');
if (codeUrl) $('codeSalon').value = codeUrl.toUpperCase();

async function connecter(fn) {
  debloquerSon();
  $('msgAccueil').textContent = 'Connexion au Temple…';
  try {
    client ||= new Client(SERVER_URL);
    room = await fn();
    brancher(room);
    $('msgAccueil').textContent = '';
    localStorage.setItem('conclave_reco', JSON.stringify({ roomId: room.roomId, token: room.reconnectionToken, t: Date.now() }));
    return room;
  } catch (e) {
    $('msgAccueil').textContent = /introuvable|not found|locked|full/i.test(e.message || '') ? 'Salon introuvable, complet ou déjà lancé.' : `Connexion impossible (${e.message || e}). Le serveur se réveille peut-être : réessaie dans 30 s.`;
    throw e;
  }
}
const optionsJoin = () => ({ nom: pseudo(), compte: compte.code || undefined, champion: localStorage.getItem('conclave_champion') || undefined });
$('btCreer').onclick = () => connecter(() => client.create('conclave', optionsJoin())).catch(() => {});
$('btRapide').onclick = () => connecter(() => client.create('conclave', optionsJoin())).then((r) => setTimeout(() => r.send('demarrer'), 400)).catch(() => {});
$('btRejoindre').onclick = async () => {
  const code = $('codeSalon').value.trim().toUpperCase();
  if (code.length !== 4) { $('msgAccueil').textContent = 'Le code fait 4 caractères.'; return; }
  try {
    const r = await fetch(`${HTTP_URL}/api/salon/${code}`).then((x) => (x.ok ? x.json() : null));
    if (!r || r.mode !== 'conclave') { $('msgAccueil').textContent = 'Aucune partie du Conclave avec ce code.'; return; }
    await connecter(() => client.joinById(r.roomId, optionsJoin()));
  } catch { /* message déjà affiché */ }
};
$('codeSalon').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btRejoindre').click(); });

// reprise après une coupure (onglet rechargé) : on retente la dernière partie pendant 60 s
(async () => {
  try {
    const r = JSON.parse(localStorage.getItem('conclave_reco') || 'null');
    if (r && Date.now() - r.t < CONCLAVE.reconnexion * 1000) {
      client ||= new Client(SERVER_URL);
      room = await client.reconnect(r.token); brancher(room); toast('Partie retrouvée !');
    }
  } catch { localStorage.removeItem('conclave_reco'); }
})();

function brancher(r) {
  r.onMessage('vue', (v) => { ancienne = vue; vue = v; dessiner(); });
  r.onMessage('refus', (m) => { toast(m.texte); son('refus'); });
  r.onLeave((codeFermeture) => {
    if (codeFermeture === 1000 || vue?.phase === 'fin') return;
    etatCo('Connexion perdue… reconnexion');
    (async () => {
      for (let i = 0; i < 12; i++) {
        await new Promise((ok) => setTimeout(ok, 2500));
        try { room = await client.reconnect(r.reconnectionToken); brancher(room); etatCo(''); toast('Reconnecté !'); return; } catch { /* on réessaie */ }
      }
      etatCo('Partie perdue'); toast('Impossible de revenir dans la partie.', 5000);
    })();
  });
}
const envoyer = (type, m = {}) => room?.send(type, m);
const action = (type, m = {}) => envoyer('action', { type, ...m });

// ---------------------------------------------------------------- dessin général
const nomDe = (id) => vue?.joueurs.find((j) => j.id === id)?.nom || '?';
const moiJ = () => vue?.joueurs.find((j) => j.id === vue.moi?.id);

function dessiner() {
  if (!vue) return;
  document.body.dataset.phase = vue.phase;
  for (const e of document.querySelectorAll('.nbBonnes')) e.textContent = vue.bonnes;
  if (vue.phase === 'salon') { ecran('ecranSalon'); dessinerSalon(); return; }
  ecran('ecranJeu');
  if (ancienne?.phase !== vue.phase) { selection = null; son('phase'); }
  dessinerBarre(); dessinerPlateau(); dessinerRole(); dessinerActions(); dessinerSavoir(); dessinerMain(); dessinerChat(); dessinerJournal(); dessinerVoile();
  if (vue.phase === 'fin') finDePartie();
}

// ---------------------------------------------------------------- salon
function dessinerSalon() {
  const hote = vue.hote === vue.moi?.id;
  $('salonCode').textContent = vue.code;
  $('nbJoueurs').textContent = `(${vue.joueurs.length}/${CONCLAVE.maxJoueurs})`;
  $('salonInfo').textContent = `Rituel : ${vue.bonnes} bonnes cartes pour sceller`;
  $('listeSalon').innerHTML = vue.joueurs.map((j) => `<li><img src="${portrait(j.champion)}" alt=""><b>${esc(j.nom)}</b>${j.bot ? ' <small>bot</small>' : ''}${j.id === vue.hote ? ' <small class="hote">hôte</small>' : ''}<span>${j.champion ? esc(CHAMPIONS_CONCLAVE[j.champion]?.nom) : j.bot ? 'au lancement' : 'choisit…'}</span></li>`).join('');
  $('hoteCtrl').classList.toggle('cache', !hote);
  $('attenteHote').classList.toggle('cache', hote);
  $('optBonnes').value = vue.bonnes;
  const mien = moiJ()?.champion;
  $('choixChampions').innerHTML = Object.entries(CHAMPIONS_CONCLAVE).map(([k, c]) => {
    const pris = vue.joueurs.find((j) => j.champion === k && j.id !== vue.moi?.id);
    return `<button class="champion ${k === mien ? 'choisi' : ''} ${pris ? 'pris' : ''}" data-k="${k}" ${pris ? 'disabled' : ''}>
      <img src="${portrait(k)}" alt=""><b>${esc(c.nom)}</b><small>${esc(c.pouvoir)} : ${esc(c.desc)}</small>${pris ? `<em>${esc(pris.nom)}</em>` : ''}</button>`;
  }).join('');
  for (const b of document.querySelectorAll('#choixChampions .champion')) b.onclick = () => { envoyer('champion', { fusion: b.dataset.k }); localStorage.setItem('conclave_champion', b.dataset.k); son('clic'); };
}
$('btBotPlus').onclick = () => envoyer('bot');
$('btBotMoins').onclick = () => envoyer('bot', { retirer: true });
$('optBonnes').onchange = (e) => envoyer('option', { bonnes: +e.target.value });
$('optDebat').onchange = (e) => envoyer('option', { debat: +e.target.value });
$('btLancer').onclick = () => envoyer('demarrer');
$('btCopier').onclick = () => {
  const lien = `${location.origin}/conclave/?salon=${vue.code}`;
  navigator.clipboard?.writeText(lien).then(() => toast('Lien copié : envoie-le à tes amis !'), () => toast(lien, 6000));
};

// ---------------------------------------------------------------- barre du haut
const DUREES = { deplacement: CONCLAVE.durees.deplacement, rituel: CONCLAVE.durees.rituel, revelation: CONCLAVE.durees.revelation, debat: 90, vote: CONCLAVE.durees.vote, resultat: CONCLAVE.durees.resultat };
function dessinerBarre() {
  $('mancheTxt').textContent = `Manche ${vue.manche}/${vue.manchesMax}`;
  $('phaseTxt').textContent = PHASES[vue.phase] || vue.phase;
  if (vue.phase !== ancienne?.phase) DUREES[vue.phase] = Math.max(vue.timer, 1);
  const tot = DUREES[vue.phase] || 1;
  $('minuteurBarre').style.width = `${Math.max(0, Math.min(100, (100 * vue.timer) / tot))}%`;
  $('minuteurBarre').classList.toggle('urgent', vue.timer <= 5 && vue.phase !== 'fin');
  $('minuteurTxt').textContent = vue.phase === 'fin' ? '' : `${vue.timer} s`;
  const ef = [];
  if (vue.effets.voteSecret) ef.push('🤫 prochain vote secret');
  if (vue.effets.souffle) ef.push('🌬️ prochain vote annulé');
  if (vue.effets.immobile) ef.push('🪨 personne ne bouge à la prochaine manche');
  if (vue.effets.debatCourt) ef.push('⚡ débat raccourci');
  $('effetsTxt').textContent = ef.join(' · ');
}

// ---------------------------------------------------------------- plateau
const POS = (() => {   // centres des lieux en % du plateau (temple vu de dessus, en étoile)
  const p = { parvis: [50, 52] };
  ORDRE_SANCTUAIRES.forEach((s, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; p[s] = [50 + Math.cos(a) * 36, 52 + Math.sin(a) * 36]; });
  return p;
})();
function preparerPlateau() {
  const pl = $('plateau');
  if (pl.dataset.pret) return;
  pl.dataset.pret = '1';
  let svg = '<svg viewBox="0 0 100 100" class="allees" preserveAspectRatio="none">';
  for (const s of ORDRE_SANCTUAIRES) svg += `<line x1="50" y1="52" x2="${POS[s][0]}" y2="${POS[s][1]}"/>`;
  pl.insertAdjacentHTML('afterbegin', svg + '</svg>');
  const parvis = $('parvis'); parvis.style.left = `${POS.parvis[0]}%`; parvis.style.top = `${POS.parvis[1]}%`;
  for (const s of ORDRE_SANCTUAIRES) {
    const S = SANCTUAIRES[s], C = CARTES[S.element];
    pl.insertAdjacentHTML('beforeend', `<div class="lieu sanct" id="s_${s}" data-lieu="${s}" style="left:${POS[s][0]}%;top:${POS[s][1]}%;--c:${C.couleur}">
      <span class="icone">${C.icone}</span><b>${S.nom}</b><small class="etat"></small>
      <div class="infobulle"><b>${S.nom} · ${C.nom}</b><br>✅ ${S.reussi}<br>☠️ ${S.corrompu}</div></div>`);
  }
  for (const l of pl.querySelectorAll('.lieu')) l.onclick = () => clicLieu(l.dataset.lieu);
}
function dessinerPlateau() {
  preparerPlateau();
  for (const s of ORDRE_SANCTUAIRES) {
    const el = $(`s_${s}`), etat = vue.sanctuaires[s];
    el.classList.toggle('scelle', etat === 'scelle'); el.classList.toggle('corrompu', etat === 'corrompu');
    el.classList.toggle('actif', !!vue.actifs?.includes(s));
    const n = vue.joueurs.filter((j) => !j.exile && j.position === s).length;
    el.querySelector('.etat').textContent = etat === 'scelle' ? '⚜ Scellé' : etat === 'corrompu' ? '☠ Corrompu' : vue.phase === 'deplacement' || vue.phase === 'rituel' ? `${n}/4` : '';
    el.classList.toggle('cliquable', (vue.phase === 'deplacement' && etat === 'libre' && !vue.moi?.exile && !vue.moi?.bloque) || selection?.cible === 'sanctuaire');
  }
  $('parvis').classList.toggle('cliquable', vue.phase === 'deplacement' && !vue.moi?.exile && !vue.moi?.bloque);
  // pions
  const pl = $('plateau'), parLieu = {};
  for (const j of vue.joueurs) {
    let lieu = j.exile ? 'exil' : j.position || 'parvis';
    (parLieu[lieu] ||= []).push(j);
  }
  const existants = new Set();
  for (const [lieu, js] of Object.entries(parLieu)) js.forEach((j, i) => {
    existants.add(j.id);
    let el = pl.querySelector(`.pion[data-id="${j.id}"]`);
    if (!el) {
      el = document.createElement('div'); el.className = 'pion'; el.dataset.id = j.id;
      el.innerHTML = `<img alt=""><span class="nom"></span><span class="badge"></span>`;
      el.onclick = (e) => { e.stopPropagation(); clicJoueur(j.id); };
      el.style.left = '50%'; el.style.top = '52%';
      pl.appendChild(el);
    }
    el.querySelector('img').src = portrait(j.champion);
    el.querySelector('.nom').textContent = j.nom;
    const [x, y] = placeDans(lieu, i, js.length);
    el.style.left = `${x}%`; el.style.top = `${y}%`;
    el.classList.toggle('moi', j.id === vue.moi?.id);
    el.classList.toggle('exile', j.exile);
    el.classList.toggle('deco', !j.connecte);
    el.classList.toggle('ciblable', !!selection && selection.cible === 'joueur' && !j.exile && j.id !== vue.moi?.id || (vue.phase === 'vote' && !vue.moi?.exile && !j.exile && j.id !== vue.moi?.id));
    el.classList.toggle('vote', vue.moi?.vote === j.id);
    el.classList.toggle('allie', !!vue.moi?.corrompus?.includes(j.id) && j.id !== vue.moi?.id);
    let badge = '';
    if (j.role && (j.exile || vue.phase === 'fin')) badge = ROLES[j.role]?.nom;
    else if (vue.phase === 'rituel' && j.aPose) badge = '🂠';
    else if (vue.phase === 'vote' && j.aVote) badge = '🗳️';
    else if (vue.phase === 'debat' && j.pret) badge = '✔';
    if (!j.connecte) badge = '📡';
    el.querySelector('.badge').textContent = badge;
    el.title = `${j.nom} · ${CHAMPIONS_CONCLAVE[j.champion]?.nom || ''}${j.pouvoirUtilise ? ' (pouvoir utilisé)' : ''}${j.bloque ? ' · ne peut pas bouger' : ''}`;
  });
  for (const el of pl.querySelectorAll('.pion')) if (!existants.has(el.dataset.id)) el.remove();
  // consigne sous le plateau
  $('consigne').innerHTML = consigne();
}
function placeDans(lieu, i, n) {
  if (lieu === 'exil') return [6 + (i % 6) * 6.5, 94 - Math.floor(i / 6) * 8];
  const [cx, cy] = POS[lieu];
  if (lieu === 'parvis') { if (n === 1) return [cx, cy]; const a = (i / n) * 2 * Math.PI - Math.PI / 2, r = n > 6 ? 9 : 7; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  const off = [[-4.4, 5.8], [4.4, 5.8], [-11, 1.5], [11, 1.5]][i] || [0, 0];   // moitié basse : le nom du sanctuaire reste lisible
  return [cx + off[0], cy + off[1]];
}
function consigne() {
  const m = vue.moi;
  if (!m) return '';
  if (selection) return `<b>Choisis ${selection.cible === 'joueur' ? 'un joueur sur le plateau' : selection.cible === 'sanctuaire' ? 'un sanctuaire' : 'une carte de ta main'}</b> <button class="petit" id="btAnnulerSel">Annuler</button>`;
  if (m.exile && vue.phase !== 'fin') return 'Tu es exilé : tu regardes la suite en spectateur.';
  switch (vue.phase) {
    case 'deplacement': return m.bloque ? 'Tu ne peux pas bouger cette manche.' : m.position ? `Tu vas ${m.position === 'parvis' ? 'rester au parvis' : `à la ${SANCTUAIRES[m.position].nom}`}. Tu peux encore changer.` : 'Clique sur un sanctuaire pour y aller (ou sur le parvis pour rester).';
    case 'rituel':
      if (m.aPoser > m.poses) return `Pose ${m.aPoser - m.poses > 1 ? `${m.aPoser - m.poses} cartes` : 'une carte'} face cachée pour le rituel de la ${SANCTUAIRES[m.position].nom}.`;
      if (m.position === 'parvis' && !m.aDefausse) return 'Tu es au parvis : tu peux défausser une carte (clique dessus) ou passer.';
      if (vue.actifs && !vue.actifs.includes(m.position) && m.position !== 'parvis') return 'Pas assez de monde dans ton sanctuaire : pas de rituel pour toi.';
      return 'En attente des autres…';
    case 'debat': return 'Débattez ! Qui a saboté ? Clique sur « Prêt à voter » quand tu as fini.';
    case 'vote': return m.vote !== undefined ? (m.vote ? `Tu votes contre <b>${esc(nomDe(m.vote))}</b>. Tu peux changer.` : 'Tu t’abstiens.') : 'Clique sur un joueur pour voter contre lui, ou abstiens-toi.';
    default: return '';
  }
}
document.addEventListener('click', (e) => { if (e.target.id === 'btAnnulerSel') { selection = null; dessiner(); } });

function clicLieu(lieu) {
  if (selection?.cible === 'sanctuaire' && lieu !== 'parvis') { utiliser({ sanctuaire: lieu }); return; }
  if (vue.phase === 'deplacement') { action('aller', { lieu }); son('pas'); }
}
function clicJoueur(id) {
  if (selection?.cible === 'joueur') {
    if (id === vue.moi.id) return;
    if (selection.type === 'proteger') { action('proteger', { cible: id }); toast(`Tu protèges ${nomDe(id)} pour ce vote.`); selection = null; dessiner(); return; }
    utiliser({ cible: id }); return;
  }
  if (vue.phase === 'vote' && !vue.moi.exile && id !== vue.moi.id) { action('voter', { cible: id }); son('vote'); }
}
function utiliser(d) { action('pouvoir', d); selection = null; son('pouvoir'); dessiner(); }

// ---------------------------------------------------------------- rôle, actions, savoir
function dessinerRole() {
  const m = vue.moi, r = ROLES[m.role];
  const c = CAMPS[r.camp];
  $('carteRole').className = roleCache ? 'cachee' : '';
  $('carteRole').style.setProperty('--c', c.couleur);
  $('carteRole').innerHTML = roleCache ? '<b>Ton rôle</b><small>(clique pour le voir)</small>'
    : `<small>Ton rôle</small><b>${r.nom}</b><span>${c.nom}</span><p>${r.desc}</p>`;
}
$('carteRole').onclick = () => { roleCache = !roleCache; dessinerRole(); };

function dessinerActions() {
  const m = vue.moi, j = moiJ(), ch = CHAMPIONS_CONCLAVE[j.champion];
  let h = '';
  if (!m.exile && vue.phase !== 'fin') {
    if (ch) {
      const ok = !m.pouvoirUtilise && ch.phases.includes(vue.phase);
      h += `<button id="btPouvoir" ${ok ? '' : 'disabled'} title="${esc(ch.desc)}">✦ ${esc(ch.pouvoir)}${m.pouvoirUtilise ? ' (utilisé)' : ''}</button>`;
    }
    if (m.role === 'sentinelle') h += `<button id="btProteger" ${!m.sentinelleUtilisee && ['debat', 'vote'].includes(vue.phase) ? '' : 'disabled'}>🛡️ Protéger${m.sentinelleUtilisee ? ' (utilisé)' : ''}</button>`;
    if (vue.phase === 'rituel' && m.position === 'parvis' && !m.aDefausse && !j.pret) h += '<button id="btPasser">Passer</button>';
    if (vue.phase === 'debat') h += `<button id="btPret" class="principal" ${j.pret ? 'disabled' : ''}>${j.pret ? 'Prêt ✔' : 'Prêt à voter'}</button>`;
    if (vue.phase === 'vote') h += `<button id="btAbst" ${m.vote === null ? 'disabled' : ''}>S’abstenir</button>`;
  }
  if (ch && !m.exile) h += `<small class="aide">${esc(ch.pouvoir)} (une fois, révélé à tous) : ${esc(ch.desc)}</small>`;
  $('actions').innerHTML = h;
  const b = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  b('btPouvoir', () => {
    if (!ch.cible) { if (confirm(`Utiliser ${ch.pouvoir} ? Tout le monde le saura.`)) utiliser({}); return; }
    selection = { type: 'pouvoir', cible: ch.cible }; dessiner();
  });
  b('btProteger', () => { selection = { type: 'proteger', cible: 'joueur' }; dessiner(); });
  b('btPasser', () => action('pret'));
  b('btPret', () => action('pret'));
  b('btAbst', () => { action('voter', { cible: null }); son('vote'); });
}

function dessinerSavoir() {
  const m = vue.moi, h = [];
  if (m.corrompus?.length > 1) h.push(`<div class="info c">☠️ Tes complices : ${m.corrompus.filter((x) => x !== m.id).map((x) => `<b>${esc(nomDe(x))}</b>`).join(', ')}</div>`);
  for (const o of m.oracle || []) h.push(`<div class="info g">👁️ Manche ${o.manche} : <b>${esc(nomDe(o.auteur))}</b> a posé ${carteMini(o.carte)} à la ${SANCTUAIRES[o.s].nom}</div>`);
  for (const e of m.eclair || []) h.push(`<div class="info">⚡ Main de <b>${esc(nomDe(e.cible))}</b> (manche ${e.manche}) : ${e.main.map(carteMini).join(' ')}</div>`);
  $('savoir').innerHTML = h.join('');
}
const carteMini = (c) => (c === 'brouillard' ? '<span class="mini brouillard">?</span>' : `<span class="mini" style="--c:${CARTES[c].couleur}" title="${CARTES[c].nom}">${CARTES[c].icone}</span>`);

// ---------------------------------------------------------------- main
function dessinerMain() {
  const m = vue.moi;
  const peutPoser = vue.phase === 'rituel' && m.aPoser > m.poses;
  const peutDef = vue.phase === 'rituel' && m.position === 'parvis' && !m.aDefausse && !moiJ().pret;
  const choixCarte = selection?.cible === 'carte' || (vue.miroir?.cible === m.id);
  $('main').classList.toggle('active', peutPoser || peutDef || choixCarte);
  $('main').innerHTML = m.exile && vue.phase !== 'fin' ? '' : m.main.map((c, i) => {
    const C = CARTES[c];
    const bon = m.position && SANCTUAIRES[m.position]?.element === c;
    return `<button class="carte ${bon ? 'bonne' : ''} ${c === 'corruption' ? 'corr' : ''}" data-i="${i}" style="--c:${C.couleur}" title="${esc(C.desc)}">
      <span class="ic">${C.icone}</span><b>${C.nom}</b><small>${esc(C.desc)}</small></button>`;
  }).join('') + (vue.miroir?.cible === m.id ? `<div class="bulle">🪞 ${esc(nomDe(vue.miroir.de))} utilise Miroir : choisis la carte que tu montres à tous.</div>` : '');
  for (const b of document.querySelectorAll('#main .carte')) b.onclick = () => {
    const i = +b.dataset.i;
    if (vue.miroir?.cible === m.id) { action('miroirCarte', { index: i }); return; }
    if (selection?.cible === 'carte') { utiliser({ index: i }); return; }
    if (peutPoser) { action('poser', { index: i }); son('carte'); b.classList.add('partie'); }
    else if (peutDef) { if (confirm(`Défausser ${CARTES[m.main[i]].nom} ?`)) { action('defausser', { index: i }); son('carte'); } }
  };
}

// ---------------------------------------------------------------- chat et journal
for (const b of document.querySelectorAll('#onglets button')) b.onclick = () => {
  for (const x of document.querySelectorAll('#onglets button')) x.classList.toggle('actif', x === b);
  $('chat').classList.toggle('cache', b.dataset.o !== 'chat'); $('journal').classList.toggle('cache', b.dataset.o !== 'journal');
};
$('chatForm').onsubmit = (e) => { e.preventDefault(); const t = $('chatInput').value.trim(); if (t) { action('chat', { texte: t }); $('chatInput').value = ''; } };
function dessinerChat() {
  const L = $('chatListe'), bas = L.scrollHeight - L.scrollTop - L.clientHeight < 40;
  L.innerHTML = vue.chat.map((c) => `<p class="${c.de === vue.moi.id ? 'moi' : ''}"><b>${esc(nomDe(c.de))}</b> ${esc(c.texte)}</p>`).join('');
  if (bas || (vue.chat.at(-1)?.id || 0) > vusChat) L.scrollTop = L.scrollHeight;
  if ((vue.chat.at(-1)?.id || 0) > vusChat && vusChat && vue.chat.at(-1).de !== vue.moi.id) son('chat');
  vusChat = vue.chat.at(-1)?.id || 0;
  const muet = vue.moi.exile && vue.phase !== 'fin';
  $('chatInput').disabled = muet; $('chatInput').placeholder = muet ? 'Les exilés regardent sans parler' : 'Écris au Conclave…';
}
function texteJournal(e) {
  const n = (id) => `<b>${esc(nomDe(id))}</b>`;
  switch (e.t) {
    case 'debut': return `La partie commence à ${e.n} : ${Object.entries(e.roles).filter(([, v]) => v).map(([k, v]) => `${v} ${ROLES[k].nom}${v > 1 ? 's' : ''}`).join(', ')}.`;
    case 'manche': return `— Manche ${e.n} —${e.immobile ? ' (personne ne peut bouger)' : ''}`;
    case 'positions': return e.actifs.length ? `Rituels à : ${e.actifs.map((s) => SANCTUAIRES[s].nom).join(', ')}.` : 'Aucun sanctuaire n’a assez de monde : pas de rituel.';
    case 'pasDeRituel': return '';
    case 'courant': return `🌊 ${n(e.a)} échange sa place avec ${n(e.b)}.`;
    case 'revelation': return e.rituels.map((r) => `${SANCTUAIRES[r.s].nom} : ${r.cartes.map(carteMini).join('')} → <b>${r.res === 'scelle' ? 'scellé ✅' : r.res === 'corrompu' ? 'corrompu ☠️' : 'raté'}</b>${r.brouillard ? ' (brouillard)' : ''}`).join('<br>');
    case 'effet': {
      const S = SANCTUAIRES[e.s];
      let t = `${S.nom} ${e.res === 'scelle' ? 'scellée' : 'corrompue'} : ${e.res === 'scelle' ? S.reussi : S.corrompu}`;
      if (e.revient) t += ` ${n(e.revient)} revient.`;
      if (e.protege) t += ` ${n(e.protege)} est protégé.`;
      if (e.comptes) t += ' ' + Object.entries(e.comptes).map(([id, c]) => `${n(id)} : ${c} ☠️`).join(', ');
      return t;
    }
    case 'pouvoir': return `✦ ${n(e.de)} (${CHAMPIONS_CONCLAVE[e.champion]?.nom}) utilise <b>${e.pouvoir}</b>${e.cible ? ` sur ${n(e.cible)}` : ''}${e.sanctuaire ? ` sur la ${SANCTUAIRES[e.sanctuaire].nom}` : ''}.`;
    case 'miroir': return `🪞 ${n(e.cible)} montre ${carteMini(e.carte)} ${CARTES[e.carte].nom}.`;
    case 'vote': {
      if (e.annule) return '🌬️ Le vote est annulé (Souffle).';
      let t = e.exile ? `🗳️ ${n(e.exile)} est exilé : c’était un <b>${ROLES[e.role].nom}</b>.${e.mercenaire ? ' Le Mercenaire gagne !' : ''}` : e.sauve ? `🛡️ ${n(e.sauve)} devait être exilé mais il est protégé !` : e.egalite ? '🗳️ Égalité : personne n’est exilé.' : '🗳️ Personne n’est exilé.';
      if (!e.secret && e.votants) t += `<br><small>${Object.entries(e.votants).filter(([, v]) => v).map(([a, v]) => `${esc(nomDe(a))} → ${esc(nomDe(v))}`).join(' · ')}</small>`;
      else if (e.secret) t += ' <small>(vote secret)</small>';
      return t;
    }
    case 'fin': return `🏁 Victoire des <b>${CAMPS[e.camp].nom}</b> : ${esc(e.raison)}`;
  }
  return '';
}
function dessinerJournal() {
  const nouveaux = vue.journal.filter((e) => e.id > vusJournal);
  $('journal').innerHTML = vue.journal.map((e) => texteJournal(e)).filter(Boolean).map((t) => `<p>${t}</p>`).reverse().join('');
  for (const e of nouveaux) {
    if (e.t === 'revelation' && e.rituels.length) montrerRevelation(e);
    if (e.t === 'vote') montrerVote(e);
    if (e.t === 'pouvoir' && e.de !== vue.moi.id) { toast(texteJournal(e).replace(/<[^>]+>/g, ''), 3500); son('pouvoir'); }
    if (e.t === 'miroir') toast(texteJournal(e).replace(/<[^>]+>/g, ''), 3500);
    if (e.t === 'effet' && e.comptes) toast(texteJournal(e).replace(/<[^>]+>/g, ''), 5000);
  }
  vusJournal = vue.journal.at(-1)?.id || vusJournal;
}

// ---------------------------------------------------------------- moments forts : révélation, vote, fin
let voileJusqua = 0;
function voile(html, ms) { $('voileContenu').innerHTML = html; $('voile').classList.remove('cache'); voileJusqua = Date.now() + ms; clearTimeout(voile.h); voile.h = setTimeout(() => $('voile').classList.add('cache'), ms); }
$('voile').onclick = () => $('voile').classList.add('cache');
function dessinerVoile() { /* les voiles se ferment tout seuls */ }

function montrerRevelation(e) {
  if (vusJournal === 0) return;   // on arrive en cours de partie : pas de rejeu
  const html = `<h2>Révélation des rituels</h2>${e.rituels.map((r, k) => `
    <div class="rituel ${r.res}"><h3>${CARTES[SANCTUAIRES[r.s].element].icone} ${SANCTUAIRES[r.s].nom}</h3>
      <div class="cartesRev">${r.cartes.map((c, i) => `<div class="carteRev" style="--d:${(k * 0.4 + i * 0.35).toFixed(2)}s;--c:${c === 'brouillard' ? '#556' : CARTES[c].couleur}"><div class="dos">⚜️</div><div class="face">${c === 'brouillard' ? '🌫️' : CARTES[c].icone}<small>${c === 'brouillard' ? '?' : CARTES[c].nom}</small></div></div>`).join('')}</div>
      <div class="verdict" style="--d:${(k * 0.4 + r.cartes.length * 0.35 + 0.3).toFixed(2)}s">${r.res === 'scelle' ? 'Scellé ✅' : r.res === 'corrompu' ? 'Corrompu ☠️' : 'Raté'}${r.brouillard ? ' · brouillard' : ''}</div></div>`).join('')}`;
  voile(html, CONCLAVE.durees.revelation * 1000 - 300);
  const dur = Math.max(...e.rituels.map((r, k) => k * 0.4 + r.cartes.length * 0.35));
  e.rituels.forEach((r, k) => r.cartes.forEach((_, i) => setTimeout(() => son('retourne'), (k * 0.4 + i * 0.35) * 1000 + 250)));
  setTimeout(() => son(e.rituels.some((r) => r.res === 'corrompu') ? 'corrompu' : e.rituels.some((r) => r.res === 'scelle') ? 'scelle' : 'rate'), (dur + 0.6) * 1000);
}
function montrerVote(e) {
  if (vusJournal === 0) return;
  const t = texteJournal(e);
  voile(`<h2>Résultat du vote</h2><div class="voteRes">${e.exile ? `<img src="${portrait(vue.joueurs.find((j) => j.id === e.exile)?.champion)}" class="exil">` : ''}<p>${t}</p></div>`, 4500);
  son(e.exile ? 'exil' : 'rate');
}
function finDePartie() {
  if (ancienne?.phase === 'fin') return;
  const f = vue.fin, moi = vue.joueurs.find((j) => j.id === vue.moi.id);
  const monCamp = ROLES[vue.moi.role].camp, gagne = monCamp === f.camp || f.mercenaire.includes(vue.moi.id);
  const lignes = vue.joueurs.map((j) => `<li class="${ROLES[f.roles[j.id]]?.camp}"><img src="${portrait(j.champion)}"><b>${esc(j.nom)}</b> <span>${ROLES[f.roles[j.id]]?.nom}</span>${j.exile ? ' <small>exilé</small>' : ''}${f.mercenaire.includes(j.id) ? ' <small>a gagné</small>' : ''}</li>`).join('');
  voile(`<h2 style="color:${CAMPS[f.camp].couleur}">Victoire des ${CAMPS[f.camp].nom}</h2><p>${esc(f.raison)}</p><h3>${gagne ? '🏆 Tu as gagné !' : 'Tu as perdu…'}</h3><ul class="roles">${lignes}</ul>
    <div class="boutons"><button id="btRejouer" class="principal">Nouvelle partie</button><button id="btAccueil">Retour au Conclave</button></div>`, 3600 * 1000);
  son(gagne ? 'victoire' : 'defaite');
  $('btRejouer').onclick = () => { room?.leave(); location.reload(); };
  $('btAccueil').onclick = () => { room?.leave(); location.href = '/conclave/'; };
  localStorage.removeItem('conclave_reco');
  // XP du compte, partagée avec l'Arène
  if (!xpDonnee && moi) {
    xpDonnee = true;
    try { progress.gagnerXp(gagne ? 120 : 50); progress.save(); compte.sauvegarder?.(); } catch { /* pas grave */ }
  }
}
