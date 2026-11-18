// =====================================================================
//  LES OMBRES DE BAKER STREET — client (page /enquete/)
//  Tout le jeu est dans le moteur (shared/enquete/moteur.js) et les
//  données du chapitre ; ici on ne fait qu'afficher et transmettre les clics.
//  Les illustrations (Anifusion) sont cherchées dans /enquete/img/ ; tant
//  qu'elles manquent, des silhouettes et des médaillons tiennent leur place.
// =====================================================================
import './style.css';
import * as M from '../../../shared/enquete/moteur.js';
import { chapitre1 } from '../../../shared/enquete/chapitre1.js';
import { chapitre2 } from '../../../shared/enquete/chapitre2.js';
import { progress } from '../progress.js';
import { creerCompte } from '../compte.js';

const $ = (id) => document.getElementById(id);
const CHAPITRES = { ch1: chapitre1, ch2: chapitre2 };
let ch = chapitre1;
const CLE = 'ombresBS';
const SERVER_URL = new URLSearchParams(location.search).get('serveur') || window.ARENE_SERVEUR || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `ws://${location.hostname}:2567` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const compte = creerCompte(SERVER_URL.replace(/^ws/, 'http'));
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const SIL = { vane: '🎩', pell: '👵', gribble: '👮', arthur: '🧑‍🦰', hannah: '👩', crale: '🧔', lusk: '🕴️', margot: '💃', pip: '👦', bill: '🧔‍♂️', gardien: '👤', doyen: '👤', edmund: '🤵', reed: '👩‍🦳' };
const SIL_LIEU = { baker: '🕯️', atelier: '🕰️', yard: '🏛️', pub: '🍺', banque: '🏦', boutique: '🔐', music: '🎭', entrepot: '📦', manoir: '🏰' };

let e = null;            // état de la partie
let vue = 'carte';
let nouveauxLieux = new Set();

// ---------- images (si elles existent) ----------
function brancherImage(img, cle) {
  if (!img) return;
  img.classList.remove('ok');
  if (!cle) { img.removeAttribute('src'); return; }
  img.onload = () => img.classList.add('ok');
  img.onerror = () => img.classList.remove('ok');
  img.src = `/enquete/img/${cle}.jpg`;
}
document.querySelectorAll('img[data-img]').forEach((i) => i.dataset.img && brancherImage(i, i.dataset.img));
function portrait(pnj, grand = false) {
  const p = ch.personnages[pnj] || { nom: pnj, couleur: '#4a3a2a' };
  const ini = p.nom.replace(/«.*»/, '').split(/\s+/).filter((m) => /^[A-ZÉ]/.test(m)).map((m) => m[0]).slice(0, 2).join('') || p.nom[0];
  const d = document.createElement('div'); d.className = `portrait${grand ? ' grand' : ''}`; d.style.setProperty('--c', p.couleur);
  d.innerHTML = `<img alt=""><span class="sil">${SIL[pnj] || '👤'}</span><span class="ini">${esc(ini)}</span>`;
  brancherImage(d.querySelector('img'), `portrait_${pnj}`);
  return d;
}

// ---------- sauvegarde (navigateur + compte) ----------
function sauver() {
  if (!e) return;
  try { localStorage.setItem(CLE, JSON.stringify(e)); } catch { /* plein */ }
}
let tCompte = 0;
function sauverCompte() { clearTimeout(tCompte); tCompte = setTimeout(() => compte.sauvegarder?.(), 3000); }
const charger = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch { return null; } };

// ---------- messages ----------
function toast(txt, rouge = false) {
  const t = document.createElement('div'); t.className = `toast${rouge ? ' rouge' : ''}`; t.innerHTML = txt; $('toasts').append(t);
  setTimeout(() => t.remove(), 4600);
}
function annoncer(nouv = []) {
  for (const n of nouv) {
    if (n.type === 'indice') toast(`🔎 Nouvel indice : <b>${esc(n.nom)}</b>`);
    else if (n.type === 'lieu') { toast(`🗺 Nouveau lieu sur la carte : <b>${esc(n.nom)}</b>`); nouveauxLieux.add(n.id); }
    else if (n.type === 'deduction') toast(`💡 Déduction : <b>${esc(ch.deductions[n.id].nom)}</b>`);
    else if (n.type === 'argent') toast(`${n.n > 0 ? '💰 +' : '💸 '}${M.texteArgent(Math.abs(n.n))}`, n.n < 0);
    else if (n.type === 'blesse') toast('🩸 Tu es blessé. Une seconde blessure pourrait être la dernière.', true);
  }
  majCarnetCompteur();
}

// ---------- barre du haut ----------
function majBarre() {
  $('heure').textContent = M.texteHeure(e.temps);
  $('argent').textContent = M.texteArgent(e.argent);
  $('etat').textContent = [e.blesse ? '🩸 blessé' : '', M.estNuit(e.temps) ? '🌙 nuit' : ''].filter(Boolean).join(' · ');
  $('btDormir').classList.toggle('cache', !ch.lieux[e.lieu].dormir);
  majCarnetCompteur();
}
function majCarnetCompteur() { if (e) $('nbCarnet').textContent = `${e.indices.length}`; }

// ---------- carte ----------
function afficherCarte() {
  vue = 'carte'; $('vueCarte').classList.remove('cache'); $('vueLieu').classList.add('cache'); $('popLieu').classList.add('cache');
  const pins = $('pins'); pins.innerHTML = '';
  for (const id of e.lieux) {
    const l = ch.lieux[id], b = document.createElement('button');
    const ouvert = M.lieuOuvert(ch, e, id);
    b.className = `pin${id === e.lieu ? ' ici' : ''}${ouvert ? '' : ' ferme'}${l.danger ? ' danger' : ''}${nouveauxLieux.has(id) ? ' nouveau' : ''}`;
    b.style.left = `${l.carte[0]}%`; b.style.top = `${l.carte[1]}%`;
    b.innerHTML = `<i></i><span>${esc(l.nom)}</span>`;
    b.onclick = () => choisirLieu(id);
    pins.append(b);
  }
  majBarre();
}
function horaires(l) {
  const o = l.ouvert; if (!o) return 'ouvert jour et nuit';
  if (o.nuit) return `seulement la nuit${o.jour ? `, à partir du jour ${o.jour}` : ''}`;
  if (o.heures) return `ouvert de ${o.heures[0]} h à ${o.heures[1] % 24} h`;
  return '';
}
function choisirLieu(id) {
  nouveauxLieux.delete(id);
  const l = ch.lieux[id], pop = $('popLieu');
  if (id === e.lieu) { afficherLieu(); return; }
  const f = M.trajet(ch, e, id, 'fiacre'), p = M.trajet(ch, e, id, 'pied'), ouvert = M.lieuOuvert(ch, e, id);
  const risque = M.estNuit(e.temps) && (l.danger || ch.lieux[e.lieu].danger);
  pop.innerHTML = `<h3>${esc(l.nom)}</h3><p class="q">${esc(l.quartier)} · ${horaires(l)}</p>
    ${ouvert ? '' : '<p class="alerte">C’est fermé à cette heure-ci : tu trouveras porte close.</p>'}
    ${risque ? '<p class="alerte">⚠ La nuit, ce quartier est dangereux à pied.</p>' : ''}
    <div class="btns"><button id="btFiacre" class="principal" ${e.argent < f.cout ? 'disabled' : ''}>🐎 En fiacre · ${f.minutes} min · 1s</button><button id="btPied">🚶 À pied · ${p.minutes} min</button><button id="btAnnulerPop">Annuler</button></div>`;
  pop.classList.remove('cache');
  $('btFiacre').onclick = () => voyager(id, 'fiacre');
  $('btPied').onclick = () => voyager(id, 'pied');
  $('btAnnulerPop').onclick = () => pop.classList.add('cache');
}
function voyager(id, mode) {
  const r = M.aller(ch, e, id, mode);
  $('popLieu').classList.add('cache');
  if (!r.ok) { toast(r.raison === 'argent' ? 'Pas assez d’argent pour un fiacre.' : 'Impossible pour l’instant.', true); return; }
  sauver();
  if (e.fin) return finChapitre();
  if (r.rencontre) return afficherRencontre();
  afficherLieu();
}

// ---------- lieu ----------
// la scène d'un lieu est toujours au format 3:2, la plus grande possible dans la place disponible
function ajusterScene() {
  const d = $('decor'), sc = $('scene'); if (!d || !sc) return;
  const w = d.clientWidth, h = d.clientHeight; if (!w || !h) return;
  const l = Math.min(w, h * 1.5);
  sc.style.width = `${l}px`; sc.style.height = `${l / 1.5}px`;
}
addEventListener('resize', ajusterScene);
function afficherLieu() {
  vue = 'lieu'; $('vueCarte').classList.add('cache'); $('vueLieu').classList.remove('cache');
  const l = ch.lieux[e.lieu];
  $('nomLieu').textContent = l.nom;
  brancherImage($('imgDecor'), `decor_${l.decor}`);
  $('silhouette').textContent = SIL_LIEU[e.lieu] || '🏚️';
  if (!M.lieuOuvert(ch, e, e.lieu)) {
    $('introLieu').textContent = `Porte close (${horaires(l)}). Il faudra revenir.`;
    $('texteFouille').textContent = ''; $('zones').innerHTML = ''; $('presents').innerHTML = '<span class="vide">Personne.</span>';
    majBarre(); requestAnimationFrame(ajusterScene); return;
  }
  $('introLieu').textContent = l.intro;
  dessinerZones(); dessinerPresents(); majBarre(); requestAnimationFrame(ajusterScene);
}
function dessinerZones() {
  const z = $('zones'); z.innerHTML = '';
  for (const zone of M.zonesVisibles(ch, e)) {
    const b = document.createElement('button');
    b.className = `zone${e.fouilles.includes(`${e.lieu}:${zone.id}`) ? ' fait' : ''}`;
    Object.assign(b.style, { left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.l}%`, height: `${zone.h}%` });
    b.innerHTML = `<span>${esc(zone.nom)}</span>`; b.title = zone.nom;
    b.onclick = () => {
      const r = M.fouiller(ch, e, zone.id); if (!r) return;
      $('texteFouille').textContent = r.texte;
      annoncer(r.nouv); sauver();
      if (e.mort || e.fin) return finChapitre();
      dessinerZones(); dessinerPresents(); majBarre();
    };
    z.append(b);
  }
}
function dessinerPresents() {
  const box = $('presents'); box.innerHTML = '';
  const ici = M.presents(ch, e);
  if (!ici.length) { box.innerHTML = '<span class="vide">Personne à qui parler ici pour le moment.</span>'; return; }
  for (const id of ici) {
    const b = document.createElement('button'); b.className = 'perso';
    b.append(portrait(id)); const n = document.createElement('span'); n.textContent = ch.personnages[id].nom; b.append(n);
    b.onclick = () => ouvrirDialogue(id);
    box.append(b);
  }
}

// ---------- dialogue ----------
function ouvrirDialogue(pnj) {
  const n = M.parler(ch, e, pnj); if (!n) return;
  e.drapeaux[`_rencontre_${pnj}`] = true;
  afficherNoeud(n);
}
function afficherNoeud(n) {
  if (!n) { $('dialogue').classList.add('cache'); sauver(); if (e.fin || e.mort) return finChapitre(); if (vue === 'lieu') afficherLieu(); majBarre(); return; }
  $('dialogue').classList.remove('cache');
  const p = ch.personnages[n.pnj];
  const box = $('dlgPortrait'); box.replaceWith(Object.assign(portrait(n.pnj, true), { id: 'dlgPortrait' }));
  $('dlgNom').textContent = p.nom; $('dlgRole').textContent = p.role;
  $('dlgTexte').textContent = n.texte;
  const c = $('dlgChoix'); c.innerHTML = '';
  for (const x of n.choix) {
    const b = document.createElement('button'); b.textContent = x.texte;
    if (x.effets && (x.effets.justice < 0 || x.effets.fin || x.effets.yard <= -10)) b.classList.add('fort');
    b.onclick = () => {
      const r = M.choisir(ch, e, x.i); if (!r) return;
      annoncer(r.nouv); sauver();
      if (r.action === 'accuser') { $('dialogue').classList.add('cache'); M.quitterDialogue(e); ouvrirAccusation(); return; }
      afficherNoeud(r.noeud);
    };
    c.append(b);
  }
  if (!n.choix.length) { const b = document.createElement('button'); b.textContent = '…'; b.onclick = () => { M.quitterDialogue(e); afficherNoeud(null); }; c.append(b); }
  majBarre();
}

// ---------- carnet ----------
let ongletCarnet = 'indices', choixDeduire = [];
function ouvrirCarnet(onglet = ongletCarnet) {
  ongletCarnet = onglet; choixDeduire = [];
  document.querySelectorAll('#ongletsCarnet button').forEach((b) => b.classList.toggle('on', b.dataset.o === onglet));
  $('carnet').classList.remove('cache');
  const c = $('contenuCarnet');
  if (onglet === 'indices') {
    if (!e.indices.length) { c.innerHTML = '<p class="note">Aucun indice pour l’instant. Fouille les lieux et fais parler les gens.</p>'; return; }
    c.innerHTML = `<p class="note">Choisis deux indices qui vont ensemble, puis « Relier » : une bonne déduction ouvre de nouvelles pistes. Une mauvaise te fait perdre dix minutes.</p>
      <div class="fiches">${e.indices.map((i) => `<button class="fiche" data-i="${i}"><b>${esc(ch.indices[i].nom)}</b>${esc(ch.indices[i].desc)}</button>`).join('')}</div>
      <div class="barreDeduire"><span id="choixDed">Choisis deux indices.</span><button id="btRelier" class="principal" disabled>Relier</button></div>`;
    c.querySelectorAll('.fiche').forEach((f) => f.onclick = () => {
      const i = f.dataset.i;
      if (choixDeduire.includes(i)) choixDeduire = choixDeduire.filter((x) => x !== i); else { choixDeduire.push(i); if (choixDeduire.length > 2) choixDeduire.shift(); }
      c.querySelectorAll('.fiche').forEach((g) => g.classList.toggle('choisi', choixDeduire.includes(g.dataset.i)));
      $('choixDed').textContent = choixDeduire.length ? choixDeduire.map((x) => ch.indices[x].nom).join(' + ') : 'Choisis deux indices.';
      $('btRelier').disabled = choixDeduire.length !== 2;
    });
    $('btRelier').onclick = () => {
      const r = M.deduire(ch, e, ...choixDeduire);
      if (r.ok && !r.deja) { annoncer(r.nouv); toast(`💡 ${esc(ch.deductions[r.id].texte)}`); }
      else if (r.deja) toast('Tu as déjà tiré cette conclusion.');
      else toast('Ces deux indices ne racontent rien ensemble… (10 minutes perdues)', true);
      sauver(); majBarre(); ouvrirCarnet(r.ok ? 'deductions' : 'indices');
      if (e.fin) { $('carnet').classList.add('cache'); finChapitre(); }
    };
  } else if (onglet === 'deductions') {
    c.innerHTML = e.deductions.length ? `<div class="fiches">${e.deductions.map((d) => `<div class="fiche"><b>💡 ${esc(ch.deductions[d].nom)}</b>${esc(ch.deductions[d].texte)}</div>`).join('')}</div>` : '<p class="note">Aucune déduction. Relie deux indices dans l’onglet Indices.</p>';
  } else if (onglet === 'personnes') {
    const vus = Object.keys(ch.personnages).filter((p) => e.drapeaux[`_rencontre_${p}`]);
    c.innerHTML = vus.length ? `<div class="fiches">${vus.map((p) => `<div class="fiche"><b>${esc(ch.personnages[p].nom)}</b>${esc(ch.personnages[p].role)}</div>`).join('')}</div>` : '<p class="note">Tu n’as encore parlé à personne.</p>';
  } else {
    c.innerHTML = `<p><b>${esc(ch.titre)}</b><br>${esc(ch.resume)}</p><p class="note">Délai : ${esc(ch.delai?.texte || '')}</p>
      ${e.journal.length ? `<ul>${e.journal.map((j) => `<li><small>${esc(M.texteHeure(j.t))}</small> — ${esc(j.texte)}</li>`).join('')}</ul>` : '<p class="note">Rien de notable pour l’instant.</p>'}`;
  }
}
document.querySelectorAll('#ongletsCarnet button').forEach((b) => b.onclick = () => ouvrirCarnet(b.dataset.o));
document.querySelectorAll('[data-fermer]').forEach((b) => b.onclick = () => $(b.dataset.fermer).classList.add('cache'));

// ---------- rencontre dans une ruelle ----------
function afficherRencontre() {
  const rc = M.rencontre(ch, e); if (!rc) return afficherLieu();
  $('rencontre').classList.remove('cache');
  $('rencontre').style.background = 'linear-gradient(rgba(8,4,4,.55), rgba(8,4,4,.85)), url(/enquete/img/decor_ruelle.jpg) center / cover, #080404';   // la ruelle (si l'illustration est là)
  $('rcTexte').textContent = rc.texte;
  const c = $('rcChoix'); c.innerHTML = '';
  rc.choix.forEach((x, i) => {
    if (!M.verifier(ch, e, x.cond)) return;
    const b = document.createElement('button'); b.textContent = x.texte;
    b.onclick = () => {
      const r = M.choisirRencontre(ch, e, i);
      $('rcTexte').textContent = r.texte; annoncer(r.nouv); sauver();
      c.innerHTML = ''; const ok = document.createElement('button'); ok.className = 'principal'; ok.textContent = 'Continuer';
      ok.onclick = () => { $('rencontre').classList.add('cache'); if (e.mort || e.fin) finChapitre(); else afficherLieu(); };
      c.append(ok);
    };
    c.append(b);
  });
}

// ---------- accusation ----------
let acSuspect = null;
function ouvrirAccusation() {
  acSuspect = null;
  $('accusation').classList.remove('cache');
  const s = $('acSuspects'); s.innerHTML = '';
  for (const id of [...ch.suspects, 'personne']) {
    const b = document.createElement('button'); b.className = 'perso';
    if (id === 'personne') { const d = document.createElement('div'); d.className = 'portrait'; d.innerHTML = '<span class="sil">∅</span>'; b.append(d); }
    else b.append(portrait(id));
    const n = document.createElement('span'); n.textContent = id === 'personne' ? 'Personne' : ch.personnages[id].nom; b.append(n);
    b.onclick = () => { acSuspect = id; s.querySelectorAll('.perso').forEach((x) => x.classList.toggle('choisi', x === b)); $('btAccuser').disabled = false; };
    s.append(b);
  }
  const opt = ch.option;
  const preuves = [...e.deductions.map((d) => [d, `💡 ${ch.deductions[d].nom}`]), ...e.indices.filter((i) => i !== opt?.indice).map((i) => [i, ch.indices[i].nom])];
  $('acPreuves').innerHTML = preuves.length ? preuves.map(([id, nom]) => `<label><input type="checkbox" value="${id}"> ${esc(nom)}</label>`).join('') : '<p class="note">Tu n’as aucune preuve…</p>';
  const voirOpt = !!opt && e.indices.includes(opt.indice) && !(opt.cache || []).some((f) => e.drapeaux[f]);
  $('acPlans').innerHTML = opt ? `<h3>${esc(opt.nom)}</h3>${opt.choix.map(([v, t], k) => `<label><input type="radio" name="optAcc" value="${v}"${k ? '' : ' checked'}> ${esc(t)}</label>`).join('')}` : '';
  $('acPlans').classList.toggle('cache', !voirOpt);
  $('btAccuser').disabled = true;
}
$('btAccuser').onclick = () => {
  if (!acSuspect) return;
  const preuves = [...$('acPreuves').querySelectorAll('input:checked')].map((x) => x.value);
  const val = document.querySelector('input[name="optAcc"]:checked')?.value;
  M.accuser(ch, e, acSuspect, preuves, ch.option && val ? { [ch.option.cle]: val } : {});
  $('accusation').classList.add('cache'); sauver(); finChapitre();
};

// ---------- fin de chapitre : le rapport ----------
function finChapitre() {
  $('dialogue').classList.add('cache'); $('rencontre').classList.add('cache');
  const r = M.rapport(ch, e);
  $('rpChapitre').textContent = r.titreChapitre;
  $('rpFin').textContent = r.fin;
  $('rpVerdict').textContent = e.accusation?.verdict || '';
  $('rpTexte').textContent = r.texteFin;
  $('rpVerite').textContent = e.mort ? 'Tu n’as pas vécu assez longtemps pour le savoir.' : r.verite;
  $('rpScore').textContent = r.score;
  $('rpTrouves').innerHTML = r.trouves.map((t) => `<li>${esc(t)}</li>`).join('') || '<li>Aucun</li>';
  $('rpRates').textContent = r.rates.length && !e.mort ? `Manqués : ${r.rates.join(', ')}.` : '';
  $('rpDecisions').innerHTML = r.decisions.map((t) => `<li>${esc(t)}</li>`).join('') || '<li>Aucune décision marquante.</li>';
  $('rpTitre').textContent = r.titre;
  $('jgJustice').style.left = `${50 + r.jauges.justice / 2}%`; $('jgYard').style.left = `${50 + r.jauges.yard / 2}%`;
  $('rpSuite').textContent = r.suite;
  $('btReprendre').classList.toggle('cache', !e.mort);
  $('btSuivant').classList.toggle('cache', !!e.mort || !CHAPITRES[ch.suivant]);
  if (!e.mort && !e.xpDonne) {
    e.xpDonne = true;
    try { progress.gagnerXp(r.xp); progress.save(); } catch { /* rien */ }
    $('rpXp').textContent = `+${r.xp} XP de compte (partagée avec l'Arène, le Conclave et Zone Morte).`;
    sauver(); sauverCompte();
  }
  $('rapport').classList.remove('cache');
}
$('btReprendre').onclick = () => { M.reprendreMatin(ch, e); $('rapport').classList.add('cache'); sauver(); toast('Tu te réveilles au 7 Baker Street, le souffle court.'); afficherCarte(); };
$('btRejouer').onclick = () => { $('rapport').classList.add('cache'); nouvellePartie(ch.id, e.heritage); };
$('btSuivant').onclick = () => {
  const h = M.heritage(ch, e);
  $('rapport').classList.add('cache');
  nouvellePartie(ch.suivant, h);
};

// ---------- boutons de la barre ----------
$('btCarte').onclick = () => { $('dialogue').classList.add('cache'); if (e.dialogue) M.quitterDialogue(e); afficherCarte(); };
$('btCarnet').onclick = () => ouvrirCarnet();
$('btDormir').onclick = () => {
  if (!M.dormir(ch, e)) return;
  sauver(); sauverCompte();
  if (e.fin) return finChapitre();
  toast(`🌅 ${M.texteHeure(e.temps)} — une nouvelle journée commence.`);
  afficherLieu();
};
addEventListener('keydown', (ev) => {
  if (ev.target.tagName === 'INPUT' || !e) return;
  if (ev.key === 'Escape') { for (const id of ['carnet', 'accusation', 'popLieu']) $(id).classList.add('cache'); }
  if (ev.key.toLowerCase() === 'c' && $('dialogue').classList.contains('cache')) ouvrirCarnet();
});

// ---------- démarrage ----------
function lancer() {
  $('ecranTitre').classList.add('cache'); $('ecranJeu').classList.remove('cache');
  nouveauxLieux = new Set();
  if (e.fin || e.mort) return finChapitre();
  afficherLieu();
  if (!e.drapeaux.briefing) setTimeout(() => ouvrirDialogue('vane'), 400);
}
function nouvellePartie(id = 'ch1', h = null) {
  const nom = e?.nom || $('nomJoueur').value.trim() || localStorage.getItem('pseudo') || 'Toi';
  ch = CHAPITRES[id] || chapitre1;
  e = M.nouvelEtat(ch, nom, h); e.sauvegardeMatin = JSON.stringify({ ...e, sauvegardeMatin: null });
  sauver(); lancer();
}
// l'héritage pour le chapitre 2 : la dernière fin du chapitre 1 sauvegardée, sinon celle par défaut
function heritageSauve() {
  const s = charger(); if (!s) return null;
  if (s.chapitre === 'ch1' && s.fin && !s.mort) return M.heritage(chapitre1, s);
  return s.heritage || null;
}
const enCours = () => { const s = charger(); return s && !s.fin && !s.mort; };
$('btNouvelle').onclick = () => {
  if (enCours() && !confirm('Commencer le chapitre 1 ? L’enquête en cours sera perdue.')) return;
  e = null; nouvellePartie('ch1');
};
$('btChap2').onclick = () => {
  if (enCours() && !confirm('Commencer le chapitre 2 ? L’enquête en cours sera perdue.')) return;
  const h = heritageSauve(); e = null; nouvellePartie('ch2', h);
};
$('btContinuer').onclick = () => { e = charger(); if (!e) return; ch = CHAPITRES[e.chapitre] || chapitre1; lancer(); };
$('nomJoueur').value = localStorage.getItem('pseudo') || '';
const s0 = charger();
if (s0) { $('btContinuer').classList.remove('cache'); $('btContinuer').textContent = `Continuer · ${s0.chapitre === 'ch2' ? 'Chapitre 2' : 'Chapitre 1'} · ${M.texteHeure(s0.temps)}`; }
{ const h0 = heritageSauve(); if (h0?.finTitre) $('noteChap2').textContent = `Le chapitre 2 reprendra ta fin du chapitre 1 : « ${h0.finTitre} » (${h0.titre}).`; }
window.__ombres = { get e() { return e; }, M, get ch() { return ch; } };   // pour les tests
addEventListener('pagehide', sauver);
