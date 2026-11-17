import { Hud } from './hud.js';
import { debutPartie, finPartie } from './mesures.js';
import { COULEURS, CADRES, couleurDe, cadreDe, styleCadre, xpPourNiveau, NIV_MAX } from '../../shared/cosmetiques.js';
import { VERSION_JEU } from '../../shared/version.js';
import { initAudio, setMusic, setAmbiance, volumes, setVolume } from './sfx.js';
import { FUSIONS, ELEMENTS, tokenUrl, portraitUrl, generateKit } from '../../shared/data.js';
import { kitHtml } from '../../shared/describe.js';
import { TOUCH, initTouch } from './touch.js';
import { progress, TITRES } from './progress.js';
import { CLASSES } from '../../shared/champions.js';
import { classe, renderClasse, badge } from './classe.js';
import { rangDe } from '../../shared/classe.js';

// Adresse du serveur multijoueur, par ordre de priorité :
//  1. ?serveur=wss://… dans l'URL   2. window.ARENE_SERVEUR (fichier config.js)
//  3. variable de build VITE_SERVER_URL   4. même machine que la page
const SERVER_URL = new URLSearchParams(location.search).get('serveur')
  || window.ARENE_SERVEUR
  || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV
    ? `ws://${location.hostname}:2567`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const HTTP_URL = SERVER_URL.replace(/^ws/, 'http');

// Le moteur du jeu (Phaser, scène, réseau) est chargé à part : le menu s'ouvre tout de suite,
// puis on le télécharge en arrière-plan pendant que le joueur choisit son mode.
let moteur = null;
const chargerMoteur = () => (moteur ||= Promise.all([import('phaser'), import('colyseus.js'), import('./ArenaScene.js'), import('./localRoom.js')])
  .then(([ph, cy, sc, lr]) => ({ Phaser: ph.default, Client: cy.Client, ArenaScene: sc.ArenaScene, LocalRoom: lr.LocalRoom })));
// Préchargement des images et musiques du jeu dans le cache du navigateur, en tâche de fond
function prechargerAssets() {
  const urls = [
    ...[0, 1].flatMap((i) => [0, 1].map((j) => `/art/ground_${i}_${j}${reglages.qualite === 'bas' || (reglages.qualite === 'auto' && ('ontouchstart' in window)) ? '_bas' : ''}.webp`)),
    ...Object.keys(FUSIONS).map((k) => `/sprites/${encodeURIComponent(k)}.webp`),
    '/audio/monde.ogg',
  ];
  let i = 0;
  const next = () => { if (i >= urls.length || game) return; fetch(urls[i++], { priority: 'low' }).catch(() => {}).finally(next); };
  for (let k = 0; k < 3; k++) next();     // 3 téléchargements à la fois, sans gêner le reste
}
const auRepos = window.requestIdleCallback || ((f) => setTimeout(f, 600));
auRepos(() => { chargerMoteur(); setTimeout(prechargerAssets, 800); });

import { creerCompte } from './compte.js';
import { astuce, oublierAstuces } from './astuces.js';
import { reglages, changerReglage } from './reglages.js';
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('délai dépassé')), ms))]);

const $ = (id) => document.getElementById(id);
let game = null;
// Grimoire : fusions déjà obtenues (mémorisées dans le navigateur)
const grimoire = new Set(JSON.parse(localStorage.getItem('grimoire') || '[]'));
function renderGrimoire() {
  const total = Object.keys(FUSIONS).length;
  $('grimoireTitle').textContent = `GRIMOIRE : ${grimoire.size} / ${total} FUSIONS DÉCOUVERTES`;
  $('gallery').innerHTML = Object.entries(FUSIONS).map(([k, f]) => {
    const known = grimoire.has(k);
    return `<img data-k="${k}" src="${tokenUrl(k)}" title="${f.nom}${known ? '' : ' (pas encore obtenue)'} — clic pour voir ses sorts" style="border-color:${f.css}" class="${f.pure ? 'pure' : ''} ${known ? '' : 'locked'}">`;
  }).join('');
  $('gallery').querySelectorAll('img').forEach((im) => im.addEventListener('click', () => showFiche(im.dataset.k)));
}
// Fiche d'un champion : ses 5 sorts expliqués
function showFiche(k) {
  const [a, b] = k.split('+'), kit = generateKit(a, b), F = FUSIONS[k], fi = $('fiche');
  fi.style.setProperty('--fc', F.css);
  fi.querySelector('.fi-h').innerHTML = `<img src="${portraitUrl(k)}" onerror="this.remove()"><div><b style="color:${F.css}">${F.nom}</b><small>${ELEMENTS[a].nom} + ${ELEMENTS[b].nom} · ${kit.classeNom} · ${kit.arme}${grimoire.has(k) ? '' : ' · 🔒 pas encore obtenue'}</small><br><small>${F.desc || ''}</small></div>`;
  fi.querySelector('.sb-list').innerHTML = kitHtml(kit);
  fi.classList.remove('hidden');
}
$('fiche').addEventListener('click', (e) => { if (e.target.id === 'fiche' || e.target.classList.contains('fi-x')) $('fiche').classList.add('hidden'); });
renderGrimoire();
fetch(`${HTTP_URL}/api/classement`).then((r) => r.json()).then((rows) => {
  if (!rows.length) return;
  $('classement').innerHTML = '<div style="letter-spacing:2px;margin-bottom:4px">CLASSEMENT</div>' + rows.slice(0, 5).map((r, i) =>
    `<div class="row"><span>${i + 1}. <b>${r.nom.replace(/[<>&]/g, '')}</b></span><span>👑 ${r.victoires} · ⚔ ${r.kills} · 🧟 ${r.zombies}</span></div>`).join('');
}).catch(() => {});
// ---------------- Mode classé : ma cote, ma place, le top de la saison ----------------
let topClasse = null, maPlace = null;
function refreshClasse() {
  renderClasse($('rangBox'), topClasse, maPlace);
  Promise.all([
    withTimeout(fetch(`${HTTP_URL}/api/classe`).then((r) => r.json()), 4000),
    withTimeout(fetch(`${HTTP_URL}/api/classe/${classe.jeton}`).then((r) => r.json()), 4000),
    withTimeout(fetch(`${HTTP_URL}/api/palmares`).then((r) => r.json()), 4000).catch(() => null),
  ]).then(([top, moi, palm]) => { topClasse = top; if (moi) { classe.sync(moi); maPlace = moi.place; } renderClasse($('rangBox'), topClasse, maPlace, palm); renderProgress(); }).catch(() => {});
}
refreshClasse();
// ---------------- Compte (sauvegarde en ligne) ----------------
const compte = creerCompte(HTTP_URL);
function renderCompte() {
  const m = compte.maj ? Math.round((Date.now() - compte.maj) / 60000) : null;
  $('compteTxt').innerHTML = compte.code ? `☁ Compte <b>${compte.code}</b> · sauvegardé ${m === 0 ? "à l'instant" : `il y a ${m} min`}` : '☁ Compte : pas de serveur joignable — progression gardée sur cet appareil';
  $('compteCopier').style.display = compte.code ? '' : 'none';
}
compte.onChange = renderCompte;
renderCompte(); compte.sauvegarder();
setInterval(renderCompte, 60000);
$('compteCopier').onclick = () => navigator.clipboard?.writeText(compte.code).then(() => { $('compteCopier').textContent = 'Copié ✓'; setTimeout(() => { $('compteCopier').textContent = 'Copier le code'; }, 1500); });
$('compteRecup').onclick = async () => {
  if (!confirm('Remplacer la progression de cet appareil par celle de ce compte ?')) return;
  try { await compte.recuperer($('compteCode').value); location.reload(); }
  catch (e) { $('status').style.color = '#ff8a8a'; $('status').textContent = `Compte : ${e.message}`; }
};
// ---------------- Survie : mon record + top en ligne ----------------
function refreshSurvie() {
  const rec = +(localStorage.getItem('survie_record') || 0), box = $('survieBox');
  const esc = (s) => String(s).replace(/[<>&]/g, '');
  const draw = (top) => {
    box.innerHTML = `<div class="hd"><span>☠ SURVIE — LA BRÈCHE</span><span>ton record : ${rec ? `vague ${rec}` : '—'}</span></div>` +
      (top?.length ? top.slice(0, 5).map((r, i) => `<div class="row"><span>${i + 1}. <b>${esc(r.noms.join(' + '))}</b>${r.coop ? ' 👥' : ''}</span><span>vague ${r.vague} · ${r.kills} ☠</span></div>`).join('') : '<div class="row"><span>Tiens le plus de vagues possible. Une seule vie.</span></div>');
  };
  draw(null);
  withTimeout(fetch(`${HTTP_URL}/api/survie`).then((r) => r.json()), 4000).then(draw).catch(() => {});
}
refreshSurvie();
// ---------------- Défis du jour & titres ----------------
function renderProgress() {
  progress.ensureDay();
  const ms = progress.msAvantDemain(), h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  $('defis').innerHTML = `<div class="hd"><span>DÉFIS DU JOUR</span><span>nouveaux dans ${h} h ${String(m).padStart(2, '0')}</span></div>` +
    progress.d.defis.map((d) => `<div class="df ${d.done ? 'done' : ''}">${d.done ? '✅ ' : ''}${d.txt} <b>+${d.gain} ✦</b>
      <div class="bar"><i style="width:${Math.min(100, (d.v / d.n) * 100)}%"></i></div></div>`).join('');
  $('gloire').textContent = `✦ ${progress.gloire} gloire · ${progress.d.titres.length}/${TITRES.length} titres`;
  $('titreSel').innerHTML = progress.d.titres.map((t) => `<option ${t === progress.d.titre ? 'selected' : ''}>${t}</option>`).join('');
  // Profil : niveau de compte, aperçu du portrait avec cadre, nom en couleur
  const verrou = (c) => (c.rang ? `fin de saison ${c.rang}` : `niveau ${c.niv}`);
  $('coulSel').innerHTML = COULEURS.map((c) => { const ok = progress.couleurOk(c.id); return `<option value="${c.id}" ${c.id === progress.coul ? 'selected' : ''} ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${c.nom}${ok ? '' : ` (${verrou(c)})`}</option>`; }).join('');
  $('cadreSel').innerHTML = CADRES.map((c) => { const ok = progress.cadreOk(c.id); return `<option value="${c.id}" ${c.id === progress.cadre ? 'selected' : ''} ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${c.nom}${ok ? '' : ` (${verrou(c)})`}</option>`; }).join('');
  const cc = couleurDe(progress.coul).css, fus = localStorage.getItem('derniereFusion') || 'feu+lumiere', C = cadreDe(progress.cadre);
  const pseudo = (localStorage.getItem('pseudo') || 'Ton pseudo').replace(/[<>&]/g, '');
  $('profil').innerHTML = `<img class="pf-img ${C.anim ? 'cadreAnim' : ''}" style="${styleCadre(progress.cadre)};--lueur:${C.lueur || 'transparent'}" src="${portraitUrl(fus)}" onerror="this.style.visibility='hidden'">
    <div class="pf-t"><b class="${cc === 'prisme' ? 'prisme' : ''}" style="color:${cc && cc !== 'prisme' ? cc : '#e8ecf4'}">${pseudo}</b>${progress.titre ? `<small>« ${progress.titre} »</small>` : ''}
    <div class="pf-niv">⭐ Niveau de compte ${progress.niv}${progress.niv >= NIV_MAX ? ' (max)' : ` · ${progress.d.xp} / ${xpPourNiveau(progress.niv)} XP`}</div>
    <div class="bar"><i style="width:${Math.round(progress.xpProg * 100)}%"></i></div></div>`;
  if (progress.recompenseEnAttente) { const r = progress.recompenseEnAttente; progress.recompenseEnAttente = null; setTimeout(() => { $('status').style.color = '#ffcf3a'; $('status').textContent = r; }, 400); }
  $('titresListe').innerHTML = TITRES.map((t) => `<span class="${progress.d.titres.includes(t.nom) ? 'ok' : ''}">${progress.d.titres.includes(t.nom) ? '🏅' : '🔒'} ${t.nom}<small>${t.desc}</small></span>`).join('');
}
renderProgress();
$('titreSel').addEventListener('change', (e) => { progress.titre = e.target.value; renderProgress(); });
$('coulSel').addEventListener('change', (e) => { progress.coul = e.target.value; renderProgress(); });
$('cadreSel').addEventListener('change', (e) => { progress.cadre = e.target.value; renderProgress(); });
const nameInput = $('name');
nameInput.value = localStorage.getItem('pseudo') || '';
nameInput.focus();

// Lien d'invitation : ?salon=CODE
const salonParam = new URLSearchParams(location.search).get('salon');
if (salonParam) setTimeout(async () => {
  const code = salonParam.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  $('code').value = code;
  // Grand bouton d'invitation en haut du menu, avec le mode et le nombre de joueurs du salon
  const box = document.createElement('div'); box.id = 'invitation';
  box.innerHTML = `<div>🔗 Invitation au salon <b>${code}</b> <span id="invInfo"></span></div><button type="button">Rejoindre</button>`;
  $('name').before(box);
  box.querySelector('button').onclick = () => $('joinCode').click();
  const NOM = { melee: 'Monde ouvert', royale: 'Battle royale', tournoi: 'Tournoi', survie: 'Survie', duo: 'Duo 2v2' };
  try {
    const info = await withTimeout(fetch(`${HTTP_URL}/api/salon/${code}`).then((r) => (r.ok ? r.json() : null)), 5000);
    $('invInfo').textContent = info ? `· ${NOM[info.mode] || info.mode} · ${info.joueurs}/${info.max} joueurs` : '· salon introuvable (fermé ?)';
  } catch { $('invInfo').textContent = '· serveur injoignable'; }
  if (!$('name').value) $('name').focus();
}, 0);
if (TOUCH) { document.body.classList.add('touch'); requestAnimationFrame(() => { $('lobby').scrollTop = 0; }); }
// Réglages du son (gardés dans le navigateur)
for (const [id, k] of [['volMusique', 'musique'], ['volEffets', 'effets']]) {
  const el = $(id); if (!el) continue;
  el.value = volumes[k]; el.oninput = () => setVolume(k, parseFloat(el.value));
}

// Le serveur gratuit de Render s'endort après 15 min sans joueur et met jusqu'à ~1 min à se réveiller :
// on patiente (avec un compteur) au lieu de basculer tout de suite en solo. Bouton pour jouer en solo en attendant.
async function verifierServeur() {
  const debut = Date.now();
  let abandon = false;
  while (Date.now() - debut < 75000 && !abandon) {
    const v = await withTimeout(fetch(`${HTTP_URL}/api/version`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : r.status === 404 ? 'absent' : null)), 5000).catch(() => null);
    if (v === 'absent') return null;   // pas de serveur de jeu à cette adresse : solo tout de suite
    if (v) { $('status').textContent = 'Connexion à l\'arène…'; return v; }
    const sec = Math.round((Date.now() - debut) / 1000);
    $('status').style.color = '#ffcf3a';
    $('status').innerHTML = `⏳ Réveil du serveur… ${sec} s <small>(jusqu'à 1 min après une pause)</small> <button type="button" id="soloAttente">Jouer en solo</button>`;
    $('soloAttente').onclick = () => { abandon = true; };
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  $('status').style.color = '#9aa3b5';
  return null;
}
fetch(`${HTTP_URL}/api/version`, { cache: 'no-store' }).catch(() => {});   // réveille le serveur dès l'ouverture du menu

// Erreurs du navigateur envoyées au journal du serveur (5 au plus par visite, chacune une seule fois)
const errEnvoyees = new Set();
function signaler(ou, err) {
  const msg = String(err?.message || err || '').slice(0, 300);
  if (!msg || errEnvoyees.has(msg) || errEnvoyees.size >= 5 || /ResizeObserver|Script error/.test(msg)) return;
  errEnvoyees.add(msg);
  const appareil = `${/Mobi|Android/i.test(navigator.userAgent) ? 'téléphone' : 'ordinateur'} · ${(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/) || [''])[0]}`;
  fetch(`${HTTP_URL}/api/erreurs`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ou, msg, pile: String(err?.stack || '').slice(0, 900), version: VERSION_JEU, appareil }) }).catch(() => {});
}
addEventListener('error', (e) => signaler(e.filename?.split('/').pop() || 'page', e.error || e.message));
addEventListener('unhandledrejection', (e) => signaler('promesse', e.reason));

async function play(mode = 'arena', forceSolo = false, salon = null) {
  const name = nameInput.value.trim() || `Joueur${Math.floor(Math.random() * 1000)}`;
  localStorage.setItem('pseudo', name);
  initAudio(); setMusic({ arena: 'monde', royale: 'royale', tournoi: 'tournoi', classe: 'tournoi', survie: 'combat', duo: 'tournoi' }[mode] || 'monde');
  const opts = { name, titre: progress.titre, cote: classe.cote, jeton: classe.jeton, coul: progress.coul, cadre: progress.cadre };
  setButtons(true);
  $('status').style.color = '#9aa3b5';
  $('status').textContent = 'Connexion à l\'arène…';

  try {
    $('status').textContent = moteur ? 'Connexion à l\'arène…' : 'Chargement du jeu…';
    const { Phaser, Client, ArenaScene, LocalRoom } = await chargerMoteur();
    $('status').textContent = 'Connexion à l\'arène…';
    // Serveur multijoueur si disponible, sinon partie solo qui tourne dans le navigateur
    let room, solo = forceSolo, versionKo = false;
    const prive = $('prive').checked;
    if (salon || prive) {
      // Salons privés : uniquement avec le serveur en ligne (pas de repli en solo)
      if (forceSolo) throw new Error('Les salons privés ont besoin du serveur en ligne (décoche « hors-ligne »).');
      const client = new Client(SERVER_URL);
      if (salon) {
        const r = await withTimeout(fetch(`${HTTP_URL}/api/salon/${encodeURIComponent(salon)}`), 5000);
        if (!r.ok) throw new Error(`Salon ${salon} introuvable — vérifie le code.`);
        const info = await r.json();
        room = await withTimeout(client.joinById(info.roomId, opts), 6000);
      } else room = await withTimeout(client.create(mode, { ...opts, prive: true }), 6000);
    } else if (!forceSolo) {
      // Le serveur en ligne doit avoir la même version que le jeu, sinon cartes et règles ne correspondent pas
      const v = await verifierServeur();
      if (!v || v.version !== VERSION_JEU) {
        console.warn('Serveur absent ou pas à jour (version', v?.version, '≠', VERSION_JEU, ') : partie solo');
        solo = true; versionKo = !!v || versionKo;
      } else {
        try { room = await withTimeout(new Client(SERVER_URL).joinOrCreate(mode, opts), 5000); }
        catch (e) { console.warn('Serveur injoignable, passage en solo :', e.message); solo = true; }
      }
    }
    const force = new URLSearchParams(location.search).get('force')?.split(',');
    if (solo && force?.length === 2) globalThis.FORCE_FUSION = force;
    if (solo) room = new LocalRoom(mode, name, progress.titre, { cote: classe.cote, jeton: classe.jeton, coul: progress.coul, cadre: progress.cadre });
    // En ligne : attendre le premier état complet du serveur (mode de jeu, carte, joueurs) avant de construire
    // la scène. Sinon la carte du monde ouvert serait chargée par erreur dans le Colisée ou la Brèche
    // (murs invisibles côté écran, recalages permanents côté serveur).
    if (!solo && !room.state?.mode) {
      await new Promise((ok) => {
        const fini = () => { clearTimeout(t); ok(); };
        const t = setTimeout(fini, 8000);
        room.onStateChange.once(fini);
      });
    }
    const hud = new Hud();
    // Suivi des défis : tout ce qui me concerne
    progress.onToast = (t, c) => hud.toast(t, c);
    if (versionKo) setTimeout(() => hud.toast('Serveur en ligne pas à jour : partie en solo (redéploie le serveur)', '#ffb03a'), 1500);
    const myCtx = () => { const p = room.state.players.get(room.sessionId); if (!p) return {}; const k = bus.scene?.kitOf(p); return { a: p.a, b: p.b, classe: k?.classe }; };
    hud.onCombo = (n) => { if (n >= 5) progress.on('combo', n); };
    const bus = { scene: null };

    hud.onPick = (i) => room.send('upgrade', { i });
    hud.monEq = () => room.state.players.get(room.sessionId)?.eq;
    hud.nivCompte = () => progress.niv;
    hud.onEmote = (e) => room.send('emote', { e });
    window.onbeforeunload = null;
    // Messages du serveur : branchés sur la salle (et rebranchés après une reconnexion)
    const brancher = (r) => {
      // Les messages arrivent dès la connexion : on les branche tout de suite
      r.onMessage('lvl', (m) => { hud.levelUp(m); progress.on('lvl', m.n); astuce(m.relique ? 'relique' : 'niveau'); });
      r.onMessage('salon', (m) => hud.salon(m.code));
      r.onMessage('survieFin', (m) => {   // Survie : fin de partie + record
        const rec = Math.max(m.vague, +(localStorage.getItem('survie_record') || 0)), nouveau = m.vague > +(localStorage.getItem('survie_record') || 0);
        localStorage.setItem('survie_record', rec); hud.survieFin(m, rec, nouveau); progress.on('vague', m.vague);
      });
      r.onMessage('cote', (m) => {
        if (m.init) astuce('classe');
        if (m.init) { classe.set(m.cote); if (mode === 'classe') setTimeout(() => hud.banner(`⚔ Tournoi classé — ${rangDe(m.cote).label} (${m.cote})`, rangDe(m.cote).css), 3700); return; }
        const ra = rangDe(m.avant), rb = rangDe(m.cote);
        classe.set(m.cote, m.place);
        setTimeout(() => hud.coteResult(m, ra, rb, badge(m.cote)), m.place === 1 ? 2500 : 1200);
      });
      r.onMessage('choix', (m) => hud.choixChampion(m, (i) => room.send('choisir', { i })));
      r.onMessage('choixFin', () => hud.finChoix());
      r.onMessage('roll', (m) => { localStorage.setItem('derniereFusion', m.fusion); hud.clearUpgrades(); hud.showRoll(m); setTimeout(() => bus.scene?.lancerTuto?.(), m.choisi ? 1200 : 3800); grimoire.add(m.fusion); localStorage.setItem('grimoire', JSON.stringify([...grimoire])); renderGrimoire(); });
      r.onMessage('win', (m) => { hud.victory(m, m.id === room.sessionId); if (m.id === room.sessionId) progress.on(m.tournoi ? 'winTournoi' : 'winRoyale'); if (m.duo && room.state.players.get(room.sessionId)?.eq === m.eq) progress.on('winDuo'); });
      r.onMessage('kill', (m) => {
        hud.addKill(m, room.sessionId);
        if (m.kid === room.sessionId) progress.on('kill', 1, myCtx());
        // élimination par moi : petit coup de zoom + flash
        if (m.kid === room.sessionId && bus.scene) { const cam = bus.scene.cameras.main; bus.scene.tweens.add({ targets: cam, zoom: bus.scene.baseZoom * 1.08, duration: 90, yoyo: true, hold: 180 }); cam.flash(120, 255, 255, 255, false); }
      });
      r.onMessage('fx', (m) => bus.scene?.fx(m));
      r.onMessage('proj', (m) => bus.scene?.projSpawn(m));
      r.onMessage('pend', (m) => bus.scene?.projEnd(m));
      r.onMessage('anim', (m) => bus.scene?.castAnim(m.o, m.x, m.y, m.el, m.k, m.d, m.f, true));
      r.onMessage('cd', (m) => hud.setCooldown(m));
      r.onMessage('orbe', (m) => { if (!m.k) { progress.on('orb'); astuce('orbe'); } });
      r.onLeave((code) => perdu(r, code));
    };
    const retourMenu = (txt) => {
      finPartie();
      hud.reconnexion?.(false);
      $('status').style.color = '#ff8a8a';
      $('status').textContent = txt;
      $('lobby').classList.remove('hidden');
      $('hud').classList.add('hidden');
      document.body.classList.remove('ingame');
      setAmbiance(null);
      renderProgress();
      refreshClasse();
      refreshSurvie();
      compte.sauvegarder();
      setButtons(false);
      game?.destroy(true);
      game = null;
    };
    // Connexion perdue (wifi qui coupe, téléphone mis en veille…) : on tente de revenir dans la même partie
    // pendant ~15 s ; le serveur garde notre personnage en attendant.
    let quitte = false;
    const perdu = async (ancienne, code) => {
      if (quitte || ancienne !== room) return;
      if (solo || code === 1000) return retourMenu('Partie terminée.');
      hud.reconnexion?.(true);
      const client = new Client(SERVER_URL);
      for (let i = 0; i < 7 && !quitte; i++) {
        try {
          const nr = await withTimeout(client.reconnect(ancienne.reconnectionToken), 5000);
          room = nr; brancher(nr); bus.scene?.nouvelleRoom?.(nr);
          hud.reconnexion?.(false); hud.toast('📡 Reconnecté !', '#7fe0c2');
          return;
        } catch (e) { await new Promise((ok) => setTimeout(ok, 2000)); }
      }
      retourMenu('Connexion perdue avec le serveur. Relance une partie.');
    };
    brancher(room);
    debutPartie(mode, !solo, HTTP_URL, VERSION_JEU);
    $('lobby').classList.add('hidden');
    hud.show();
    document.body.classList.add('ingame');
    initTouch();

    if (solo) setTimeout(() => hud.banner('🤖 Mode solo — contre les mannequins', '#b8e07a'), 3600);

    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#0e1015',
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      antialias: true,
    });
    game.scene.add('arena', ArenaScene, true, { room, hud, bus });
  } catch (err) {
    console.error(err);
    $('status').style.color = '#ff8a8a';
    $('status').textContent = err?.message?.includes('alon') ? err.message : `Impossible de rejoindre le serveur (${SERVER_URL}). Est-il lancé ?`;
    setButtons(false);
  }
}
function setButtons(dis) { ['play', 'playRoyale', 'playTournoi', 'playClasse', 'playSurvie', 'playDuo'].forEach((b) => { $(b).disabled = dis; }); }

$('play').addEventListener('click', () => play('arena', $('solo').checked));
$('playRoyale').addEventListener('click', () => play('royale', $('solo').checked));
$('playTournoi').addEventListener('click', () => play('tournoi', $('solo').checked));
$('playClasse').addEventListener('click', () => play('classe', $('solo').checked));
$('playSurvie').addEventListener('click', () => play('survie', $('solo').checked));
$('playDuo').addEventListener('click', () => play('duo', $('solo').checked));
$('joinCode').addEventListener('click', () => {
  const code = $('code').value.trim().toUpperCase();
  if (code.length < 4) { $('status').style.color = '#ff8a8a'; $('status').textContent = 'Entre le code à 4 caractères de ton ami.'; return; }
  play('arena', false, code);
});
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinCode').click(); });
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') play('arena', $('solo').checked); });

// ---------------- Onglets du menu ----------------
function onglet(nom) {
  document.querySelectorAll('#onglets button').forEach((b) => b.classList.toggle('on', b.dataset.o === nom));
  document.querySelectorAll('#lobby .onglet').forEach((sec) => sec.classList.toggle('hidden', sec.dataset.o !== nom));
  try { localStorage.setItem('onglet', nom === 'reglages' ? 'jouer' : nom); } catch { /* rien */ }
}
document.querySelectorAll('#onglets button').forEach((b) => { b.onclick = () => onglet(b.dataset.o); });
onglet(salonParam ? 'jouer' : localStorage.getItem('onglet') || 'jouer');
// Badge « défis restants » sur l'onglet Défis
function badgeDefis() { const n = progress.d.defis?.filter((d) => !d.done).length || 0; $('defisBadge').textContent = n ? n : ''; }
badgeDefis(); setInterval(badgeDefis, 5000);

// ---------------- Réglages ----------------
$('rgQualite').value = reglages.qualite;
$('rgQualite').onchange = (e) => changerReglage('qualite', e.target.value);
$('rgPing').checked = reglages.ping; $('rgPing').onchange = (e) => changerReglage('ping', e.target.checked);
$('rgFps').checked = reglages.fps; $('rgFps').onchange = (e) => changerReglage('fps', e.target.checked);
$('rgInterface').value = String(reglages.interface); $('rgInterface').onchange = (e) => changerReglage('interface', parseFloat(e.target.value));
$('rgVibration').checked = reglages.vibration; $('rgVibration').onchange = (e) => changerReglage('vibration', e.target.checked);
const majJoy = () => { $('rgJoystickV').textContent = reglages.joystick <= 0.25 ? 'très sensible' : reglages.joystick <= 0.4 ? 'normale' : 'peu sensible'; };
$('rgJoystick').value = reglages.joystick; majJoy();
$('rgJoystick').oninput = (e) => { changerReglage('joystick', parseFloat(e.target.value)); majJoy(); };

$('rgTuto').onclick = () => { oublierAstuces(); $('rgTuto').textContent = '✓ Le tutoriel et les astuces reviendront à la prochaine partie'; };
