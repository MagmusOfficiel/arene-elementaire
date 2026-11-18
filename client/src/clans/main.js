// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'interface
//  Écran du clan → le monde partagé (monde.js) → fenêtres : parcelle,
//  deck, tirages, expéditions → combat de cartes.
//  Le profil est gardé dans le navigateur (clé « clansProfil ») et sur
//  le compte du site.
// =====================================================================
import './style.css';
import { Client } from 'colyseus.js';
import { CARTES, ELEMENTS, CLANS, CLASSES, LISTE_CLASSES, RARETES, RARES, STATUTS, decrire, NIV_MAX } from '../../../shared/clans/cartes.js';
import { TERRITOIRES, PALIERS } from '../../../shared/clans/monstres.js';
import * as C from '../../../shared/clans/combat.js';
import * as P from '../../../shared/clans/profil.js';
import * as X from '../../../shared/clans/expedition.js';
import { creerMonde } from './monde.js';
import { creerCompte } from '../compte.js';
import { progress } from '../progress.js';

const SERVER_URL = new URLSearchParams(location.search).get('serveur') || window.ARENE_SERVEUR || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `ws://${location.hostname}:2567` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const compte = creerCompte(SERVER_URL.replace(/^ws/, 'http'));
const CLE = 'clansProfil';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (n) => Math.floor(n).toLocaleString('fr-FR');

let p = null;            // le profil
let room = null, monId = null;
let combat = null, cible = null, carteChoisie = null;

// ---------- sauvegarde ----------
function charger() { try { const x = JSON.parse(localStorage.getItem(CLE) || 'null'); return P.profilValide(x) ? P.completer(x) : null; } catch { return null; } }
let minuteur = null;
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* plein */ }
  clearTimeout(minuteur); minuteur = setTimeout(() => { compte.sauvegarder(); envoyerProfil(); }, 2000);
  majBarre();
}
const niveau = () => 1 + Math.floor((p?.stats.victoires || 0) / 6) + (p?.stats.boss || 0) * 2;

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = t; $('toasts').append(d); setTimeout(() => d.remove(), 3300); }

// ---------- une carte en HTML ----------
// Cartes illustrées (images dans client/public/clans/cartes/<id>.webp) ; les autres gardent leur emoji
const ILLUS = new Set(['lance_magma', 'dragon', 'coeur_volcan', 'leviathan', 'ocean', 'arbre_monde', 'coeur_phenix', 'perle_abysses', 'trident', 'seve_doree', 'titan', 'archimage', 'fleche_lourde', 'maitre_armes', 'colere', 'couronne',
  'frappe', 'garde', 'coup_double', 'second_souffle', 'etincelle', 'flamme', 'tison', 'cendres', 'boule_de_feu',
  'incendie', 'combustion', 'phenix', 'meteore', 'jet', 'vague', 'bulle', 'maree', 'tsunami',
  'carapace', 'ressac', 'source', 'geyser', 'brume', 'ronce', 'seve', 'liane', 'graine', 'chene',
  'floraison', 'spores', 'croissance', 'fouet', 'gardien', 'charge', 'rempart', 'fracas', 'tourbillon',
  'cri_guerre', 'second_vent', 'forteresse', 'execution', 'eclair_arcanique', 'bouclier_arcanique', 'missiles', 'meditation', 'torrent', 'nova',
  'savoir', 'transmutation', 'rayon', 'tir', 'piege', 'tir_rapide', 'volee', 'fleche_poison', 'repli', 'pluie_fleches',
  'oeil_faucon', 'tir_precis', 'estoc', 'parade', 'botte', 'fente', 'garde_haute', 'elan', 'danse_lames', 'coup_grace', 'concentration', 'rage_ardente', 'feinte', 'coup_bouclier']);
const ILLUS_MONSTRES = new Set(['seigneur_magma', 'hydre', 'reine_epine', 'salamandre', 'diablotin', 'golem_cendre', 'feu_follet', 'phenix_cendre', 'chimere', 'crabe', 'meduse', 'sirene', 'anguille', 'tortue_dragon', 'kraken', 'champignon', 'loup_ronces', 'treant', 'guepe', 'cerf_emeraude', 'mante']);
function carteHTML(id, niv = 1, extra = '') {
  const c = CARTES[id];
  return `<div class="carte ${c.element} r-${c.rarete}${ILLUS.has(id) ? ' aIllus' : ''}" data-id="${id}" title="${esc(RARETES[c.rarete].nom)} · ${esc(ELEMENTS[c.element].nom)}">
    <span class="cc">${c.cout}</span><div class="cn">${esc(c.nom)}${niv > 1 ? ` ${'+'.repeat(niv - 1)}` : ''}</div>
    ${ILLUS.has(id) ? `<div class="ci illus" style="background-image:url(${import.meta.env.BASE_URL}clans/cartes/${id}.webp)"></div>` : `<div class="ci">${c.ico}</div>`}<div class="ct">${c.type} · ${RARETES[c.rarete].nom}</div>
    <div class="cd">${esc(decrire(id, niv))}</div>${c.classe ? `<span class="cclasse" title="Carte de ${esc(CLASSES[c.classe].nom)}">${CLASSES[c.classe].ico}</span>` : ''}${extra}</div>`;
}
const coutHTML = (cout) => Object.entries(cout).map(([k, v]) => `<span class="${(p.ress[k] || 0) < v ? 'manque' : ''}">${nf(v)} ${ICO_RESS[k]}</span>`).join(' · ');
const ICO_RESS = { essence: '✨', braises: '🔥', perles: '🫧', seve: '🍃', eclats: '💠', cristal: '💎', perle_noire: '⚫', graine_or: '🌰' };

// ---------- la barre du haut ----------
function majBarre() {
  if (!p) return;
  const el = ELEMENTS[p.clan];
  $('moi').innerHTML = `${esc(p.nom)} <span class="badge ${p.clan}">${el.ico} ${el.clan}</span> ${p.classe ? `<span title="${esc(CLASSES[p.classe].talent)} : ${esc(CLASSES[p.classe].desc)}">${CLASSES[p.classe].ico} ${CLASSES[p.classe].nom}</span>` : ''} <small>niv. ${niveau()}</small>`;
  $('ressources').innerHTML = ['essence', 'braises', 'perles', 'seve', 'eclats', 'cristal', 'perle_noire', 'graine_or'].filter((k) => k === 'essence' || p.ress[k] > 0 || ELEMENTS[p.clan].materiau === k)
    .map((k) => `<span title="${{ essence: 'Essence : pour les tirages et les constructions', eclats: 'Éclats : pour améliorer les cartes', cristal: 'Cristal de lave (ressource rare)', perle_noire: 'Perle noire (ressource rare)', graine_or: "Graine d'or (ressource rare)" }[k] || 'Matériau élémentaire'}">${ICO_RESS[k]} ${nf(p.ress[k])}</span>`).join('')
    + `<span title="Duels gagnés / perdus">⚔️ ${p.duels?.gagnes || 0}/${p.duels?.perdus || 0}</span>`;
}

// =====================================================================
//  CHOIX DU CLAN
// =====================================================================
const DESC_CLANS = {
  feu: ['Gros dégâts et brûlure qui ronge les ennemis tour après tour.', 'Ta parcelle : une forge au pied du volcan, qui produit des braises.'],
  eau: ['Boucliers, pioche de cartes, et « trempé » qui fait subir 50 % de dégâts en plus.', 'Ta parcelle : une maison sur pilotis qui récolte des perles.'],
  plante: ['Soins, régénération et épines qui punissent ceux qui t’attaquent.', 'Ta parcelle : une serre au cœur de la forêt qui produit de la sève.'],
};
const DESC_CLASSES = {
  combattant: 'Beaucoup de PV, frappes lourdes, boucliers et rage.',
  mage: 'Peu de PV, mais des sorts dévastateurs, de la pioche et de l’énergie en plus.',
  tireur: 'Des flèches en rafale, des tirs qui touchent tout le monde, des pièges.',
  escrimeur: 'De petites attaques rapides à enchaîner, des parades et des contre-attaques.',
};
function classesHTML() {
  return LISTE_CLASSES.map((k) => { const c = CLASSES[k]; return `<button class="classeCarte" data-c="${k}"><span class="gros">${c.ico}</span><h3>${c.nom}</h3><p>${DESC_CLASSES[k]}</p><p><b>${c.talent}</b> : ${c.desc}</p><p>PV : ${60 + c.pv}</p></button>`; }).join('');
}
// nouveau joueur : le clan, puis la classe. Profil d'avant les classes : la classe seulement.
function ecranClan(seulementClasse = false) {
  $('ecranClan').classList.remove('cache'); $('ecranMonde').classList.add('cache');
  $('nomJoueur').value = p?.nom || localStorage.getItem('pseudo') || '';
  let clan = null;
  const montrerClasses = () => {
    $('etapeClasse').classList.remove('cache'); $('choixClasses').classList.remove('cache');
    $('choixClasses').innerHTML = classesHTML();
    $('choixClasses').querySelectorAll('.classeCarte').forEach((b) => b.onclick = () => {
      const k = b.dataset.c;
      if (seulementClasse) {
        if (!confirm(`Devenir ${CLASSES[k].nom} ? Ce choix est définitif.`)) return;
        P.choisirClasse(p, k); sauver(); entrerMonde(); return toast(`Te voilà ${CLASSES[k].nom} ! Tes deux cartes de classe sont dans ton deck.`);
      }
      const nom = $('nomJoueur').value.trim() || localStorage.getItem('pseudo') || 'Joueur';
      if (!confirm(`Rejoindre le ${ELEMENTS[clan].clan} en tant que ${CLASSES[k].nom} ? Ces choix sont définitifs.`)) return;
      localStorage.setItem('pseudo', nom);
      p = P.nouveauProfil(clan, nom, Date.now(), k); sauver();
      entrerMonde();
      setTimeout(() => toast(`Bienvenue dans le ${ELEMENTS[p.clan].clan} ! Tu as 300 essences : va à l'<b>Autel des tirages</b>, au Carrefour.`), 600);
    });
  };
  if (seulementClasse) {
    $('etapeClan').textContent = 'Nouveau : choisis ta classe'; $('choixClans').innerHTML = ''; $('choixClans').classList.add('cache');
    return montrerClasses();
  }
  $('choixClans').innerHTML = CLANS.map((k) => `<button class="clanCarte ${k}" data-k="${k}"><span class="gros">${ELEMENTS[k].ico}</span><h2>${ELEMENTS[k].clan}</h2><p>${DESC_CLANS[k][0]}</p><p>${DESC_CLANS[k][1]}</p></button>`).join('');
  $('choixClans').querySelectorAll('.clanCarte').forEach((b) => b.onclick = () => {
    clan = b.dataset.k;
    $('choixClans').querySelectorAll('.clanCarte').forEach((x) => x.classList.toggle('choisi', x === b));
    montrerClasses(); $('etapeClasse').scrollIntoView({ behavior: 'smooth' });
  });
}

// =====================================================================
//  LE MONDE
// =====================================================================
let derniereTerr = undefined;
const monde = creerMonde($('monde'), {
  libre: () => $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache') && document.activeElement !== $('chatTexte'),
  agir: (l) => {
    if (l.action === 'tirage') fenetreTirages(); else if (l.action === 'expedition') fenetreExpedition(l.terr); else if (l.action === 'parcelle') fenetreParcelle();
    else if (l.action === 'filon') { if (room) room.send('ramasser', { id: l.id }); else toast('Les filons rares ne poussent que dans le monde en ligne.'); }
    else if (l.action === 'defier') { if (p.expedition) return toast('Termine d’abord ton expédition.'); room?.send('defier', { cible: l.id }); }
  },
  position: (j) => {
    const t = monde.territoire();
    if (t !== derniereTerr) {
      derniereTerr = t;
      const b = $('bandeau');
      if (!t) { b.className = ''; b.textContent = 'Le Carrefour — terre neutre'; }
      else if (t === p.clan) { b.className = ''; b.textContent = `${TERRITOIRES[t].ico} ${TERRITOIRES[t].nom} — ton territoire`; }
      else { b.className = 'ennemi'; b.textContent = `⚠️ ${TERRITOIRES[t].nom} — territoire du ${ELEMENTS[t].clan}. Ses joueurs peuvent t'attaquer ici. Filons : ${RARES[t].ico} ${RARES[t].nom}.`; }
      clearTimeout(b._t); b._t = setTimeout(() => b.classList.add('cache'), 5000);
    }
    envoyerPos(j);
  },
});
let derniereEnvoi = 0, dernierePos = '';
function envoyerPos(j) {
  if (!room || performance.now() - derniereEnvoi < 120) return;
  const k = `${Math.round(j.x)},${Math.round(j.y)}`; if (k === dernierePos) return;
  derniereEnvoi = performance.now(); dernierePos = k;
  room.send('pos', { x: j.x, y: j.y, dir: ['bas', 'haut', 'gauche', 'droite'].indexOf(j.dir) });
}
function entrerMonde() {
  $('ecranClan').classList.add('cache'); $('ecranMonde').classList.remove('cache');
  majBarre(); monde.demarrer(p.clan, p.nom, p.classe); connecter();
  const x = p.expedition;
  if (x?.combatEnCours) setTimeout(() => lancerCombat(X.combatDe(p, x.combatEnCours), X.salle(x.carte, x.combatEnCours).type), 400);
  else if (x) setTimeout(() => fenetreExpedition(x.territoire), 400);
}
async function connecter() {
  try {
    room = await new Client(SERVER_URL).joinOrCreate('clans', { nom: p.nom, clan: p.clan, classe: p.classe, niv: niveau(), deck: P.deckCombat(p), pvMax: P.pvMax(p), essence: p.ress.essence });
    room.onMessage('bienvenue', (m) => { monId = m.id; });
    room.onMessage('monde', (liste) => { monde.majAutres(liste, monId); listeEnLigne(liste); });
    room.onMessage('chat', ajouterChat);
    room.onMessage('filons', (l) => monde.majFilons(l));
    room.onMessage('ramasse', (m) => { const r = RARES[m.terr]; p.ress[r.id] = (p.ress[r.id] || 0) + m.n; sauver(); toast(`+${m.n} ${r.ico} ${r.nom}`); });
    room.onMessage('info', (m) => toast(esc(m.t)));
    room.onMessage('duel', afficherDuel);
    room.onMessage('duelResultat', finDuel);
    room.onLeave(() => { room = null; ajouterChat({ systeme: true, t: 'Déconnecté du monde. Nouvelle tentative…' }); setTimeout(connecter, 5000); });
  } catch {
    room = null; listeEnLigne([]);
    ajouterChat({ systeme: true, t: 'Le monde partagé est injoignable : tu joues seul pour l’instant.' });
  }
}
function envoyerProfil() { room?.send('profil', { deck: P.deckCombat(p), pvMax: P.pvMax(p), essence: p.ress.essence }); }
function listeEnLigne(liste) {
  const par = { feu: [], eau: [], plante: [] };
  for (const [id, nom, clan, , , , statut, niv, classe] of liste) par[clan]?.push({ nom, niv, statut, classe, moi: id === monId });
  if (!liste.length) par[p.clan].push({ nom: p.nom, niv: niveau(), classe: p.classe, moi: true });
  $('nbEnLigne').textContent = `(${Math.max(1, liste.length)})`;
  $('listeClans').innerHTML = CLANS.map((k) => `<div class="groupeClan"><b class="${k}">${ELEMENTS[k].ico} ${ELEMENTS[k].clan} · ${par[k].length}</b>${par[k].map((j) => `<span>${j.moi ? '★ ' : ''}${CLASSES[j.classe]?.ico || ''} ${esc(j.nom)} <i>niv. ${j.niv}${j.statut === 'expedition' ? ' · en expédition' : j.statut === 'duel' ? ' · ⚔️ en duel' : ''}</i></span>`).join('')}</div>`).join('');
}
// ---------- chat ----------
let canal = 'tous';
document.querySelectorAll('#chatOnglets button').forEach((b) => b.onclick = () => { canal = b.dataset.c; document.querySelectorAll('#chatOnglets button').forEach((x) => x.classList.toggle('actif', x === b)); });
function ajouterChat(m) {
  const d = document.createElement('p');
  d.innerHTML = m.systeme ? `<span class="sys">${esc(m.t)}</span>` : `${m.canal === 'clan' ? '<small>[clan]</small> ' : ''}<b class="n ${m.clan}">${esc(m.de)}</b> : ${esc(m.t)}`;
  $('chatMsgs').append(d); $('chatMsgs').scrollTop = 1e6;
  while ($('chatMsgs').children.length > 60) $('chatMsgs').firstChild.remove();
}
$('chatTexte').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') { const t = $('chatTexte').value.trim(); if (t && room) room.send('chat', { t, canal }); $('chatTexte').value = ''; $('chatTexte').blur(); }
  if (e.key === 'Escape') $('chatTexte').blur();
});
addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('ecranMonde').classList.contains('cache') && document.activeElement !== $('chatTexte') && $('fenetre').classList.contains('cache')) { $('chatTexte').focus(); e.preventDefault(); } });
const statut = (s) => room?.send('statut', { s, niv: niveau() });

// =====================================================================
//  FENÊTRES
// =====================================================================
function ouvrir(html, apres) { $('fenetreCorps').innerHTML = html; $('fenetre').classList.remove('cache'); monde.arreter(); apres?.(); }
function fermer() { $('fenetre').classList.add('cache'); statut(p?.expedition ? 'expedition' : 'libre'); }
$('btFermer').onclick = fermer;
$('fenetre').addEventListener('pointerdown', (e) => { if (e.target === $('fenetre')) fermer(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('fenetre').classList.contains('cache')) fermer(); });
$('btParcelle').onclick = () => fenetreParcelle();
$('btDeck').onclick = () => fenetreDeck();

// ---------- parcelle ----------
const DECOR_PARCELLE = { feu: ['🌋', '🏠', '🔥', '⚒️'], eau: ['🏝️', '🛖', '🐚', '🌊'], plante: ['🌳', '🏡', '🌻', '🌿'] };
function fenetreParcelle() {
  statut('parcelle');
  const el = ELEMENTS[p.clan], pr = P.production(p), plein = pr.heures >= P.stockageHeures(p);
  ouvrir(`<h2>🏠 Ta parcelle</h2><p class="sous-titre sousTitre">Dans les ${esc(TERRITOIRES[p.clan].nom)}. Ta parcelle produit même quand tu n'es pas là, jusqu'à ${P.stockageHeures(p)} h de réserve.</p>
    <div class="parcelleScene ${p.clan}">${DECOR_PARCELLE[p.clan].map((e, i) => `<span style="font-size:${[70, 96, 48, 56][i]}px">${e}</span>`).join('')}</div>
    <div class="recolte"><div>Production en attente (${pr.heures.toFixed(1)} h${plein ? ', <b>réserve pleine</b>' : ''}) : <b>${nf(pr.essence)} ✨</b> et <b>${nf(pr[el.materiau])} ${ICO_RESS[el.materiau]}</b></div><button class="bouton" id="btRecolter" ${pr.essence + pr[el.materiau] < 1 ? 'disabled' : ''}>Récolter</button></div>
    <div class="batiments">${Object.entries(P.BATIMENTS).map(([k, b]) => {
      const n = p.parcelle[k], max = n >= P.NIV_BAT_MAX, cout = P.coutBatiment(p, k);
      return `<div class="batiment"><h3>${b.ico} ${b.nom}</h3><div class="niv">Niveau ${n} / ${P.NIV_BAT_MAX}</div><p>${b.desc(n, p.clan)}</p>
        ${max ? '<p class="cout">Niveau maximum.</p>' : `<p class="cout">Niveau ${n + 1} : ${b.desc(n + 1, p.clan)}<br>Coût : ${coutHTML(cout)}</p><button class="bouton" data-b="${k}">Améliorer</button>`}</div>`;
    }).join('')}</div>`, () => {
    $('btRecolter').onclick = () => { const g = P.recolter(p); sauver(); toast(`+${nf(g.essence)} ✨ · +${nf(g[el.materiau])} ${ICO_RESS[el.materiau]}`); fenetreParcelle(); };
    $('fenetreCorps').querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { const r = P.construire(p, b.dataset.b); if (!r.ok) return toast(r.raison); sauver(); toast(`${P.BATIMENTS[b.dataset.b].nom} : niveau ${r.niv} !`); fenetreParcelle(); });
  });
}

// ---------- deck ----------
let filtreDeck = 'tous';
function fenetreDeck() {
  const ids = Object.keys(p.collection).filter((id) => p.collection[id].n > 0 && (filtreDeck === 'tous' || (filtreDeck === 'classe' ? !!CARTES[id].classe : filtreDeck === 'neutre' ? CARTES[id].element === 'neutre' && !CARTES[id].classe : CARTES[id].element === filtreDeck)))
    .sort((a, b) => CARTES[a].element.localeCompare(CARTES[b].element) || CARTES[a].cout - CARTES[b].cout);
  const dansDeck = (id) => p.deck.filter((x) => x === id).length;
  const lignes = [...new Set(p.deck)].sort((a, b) => CARTES[a].cout - CARTES[b].cout).map((id) => `<div class="ligne" data-r="${id}" title="Cliquer pour retirer"><span class="cout1">${CARTES[id].cout}</span>${CARTES[id].ico} ${esc(CARTES[id].nom)}${p.collection[id].niv > 1 ? ' +'.repeat(p.collection[id].niv - 1) : ''}<span style="margin-left:auto">×${dansDeck(id)}</span></div>`).join('');
  ouvrir(`<h2>🃏 Ta collection et ton deck</h2><p class="sousTitre">Ton deck : de ${P.DECK_MIN} à ${P.DECK_MAX} cartes, ${P.COPIES_MAX} exemplaires d'une même carte au plus. Améliore tes cartes avec des éclats 💠 (tes doublons) et des matériaux.</p>
    <div class="filtres">${['tous', 'classe', 'feu', 'eau', 'plante', 'neutre'].map((f) => `<button data-f="${f}" class="${f === filtreDeck ? 'actif' : ''}">${f === 'tous' ? 'Toutes' : f === 'classe' ? `${CLASSES[p.classe].ico} Classes` : `${ELEMENTS[f].ico} ${ELEMENTS[f].nom}`}</button>`).join('')}</div>
    <div class="deckZone"><div class="grilleCartes">${ids.map((id) => {
      const c = p.collection[id], cout = c.niv < NIV_MAX ? P.coutAmelioration(id, c.niv) : null;
      return `<div class="carteCol">${carteHTML(id, c.niv, `<span class="cnb">×${c.n}</span>`)}<div class="actions"><button data-a="${id}" ${dansDeck(id) >= Math.min(c.n, P.COPIES_MAX) || p.deck.length >= P.DECK_MAX ? 'disabled' : ''}>+ Deck</button><button data-u="${id}" ${cout ? '' : 'disabled'} title="${cout ? Object.entries(cout).map(([k, v]) => `${v} ${k}`).join(', ') : 'Niveau max'}">⬆ ${cout ? coutHTML(cout) : 'max'}</button></div></div>`;
    }).join('') || '<p>Aucune carte de ce type. Va faire des tirages !</p>'}</div>
    <div><h3>Ton deck (${p.deck.length})</h3><div class="listeDeck">${lignes}</div></div></div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtreDeck = b.dataset.f; fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { const r = P.ajouterAuDeck(p, b.dataset.a); if (!r.ok) return toast(r.raison); sauver(); fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { const r = P.retirerDuDeck(p, b.dataset.r); if (!r.ok) return toast(r.raison || 'Impossible.'); sauver(); fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-u]').forEach((b) => b.onclick = () => { const r = P.ameliorer(p, b.dataset.u); if (!r.ok) return toast(r.raison); sauver(); toast(`${CARTES[b.dataset.u].nom} passe au niveau ${r.niv} !`); fenetreDeck(); });
  });
}

// ---------- tirages ----------
function fenetreTirages(resultat = null) {
  statut('tirage');
  ouvrir(`<h2>🔮 L'Autel des tirages</h2><p class="sousTitre">Chaque tirage invoque un sort. Les sorts de ton élément sortent plus souvent. Au-delà de ${P.COPIES_MAX} exemplaires, un doublon devient des éclats 💠.</p>
    <div class="banniere"><span class="orbe">🔮</span><p>Tu as <b>${nf(p.ress.essence)} ✨</b> · ${p.tirages.total} tirages faits · légendaire garantie dans <b>${60 - p.tirages.depuisLegendaire}</b> tirages</p>
      <button class="bouton" id="bt1" ${p.ress.essence < P.PRIX_TIRAGE ? 'disabled' : ''}>Tirer ×1 — ${P.PRIX_TIRAGE} ✨</button>
      <button class="bouton" id="bt10" ${p.ress.essence < P.PRIX_TIRAGE_10 ? 'disabled' : ''}>Tirer ×10 — ${P.PRIX_TIRAGE_10} ✨ <small>(une épique au moins)</small></button>
      <p class="taux">Commune 62 % · Rare 27 % · Épique 9 % · Légendaire 2 %</p></div>
    <h3>🏺 Reliques des territoires</h3><p class="sousTitre">Ces cartes ne sortent jamais aux tirages : on les forge avec les ressources rares d'un territoire (filons sur la carte, monstres rares 🌟 et boss en expédition).</p>
    <div class="reliques">${Object.values(CARTES).filter((c) => c.exclusif).map((c) => { const cout = P.coutFabrication(c.id), n = p.collection[c.id]?.n || 0; return `<div class="carteCol">${carteHTML(c.id, p.collection[c.id]?.niv || 1, n ? `<span class="cnb">×${n}</span>` : '')}<small class="cout">${coutHTML(cout)}</small><button class="bouton" data-fab="${c.id}">Forger</button></div>`; }).join('')}</div>
    ${resultat ? `<div class="grilleCartes resultatTirage">${resultat.map((x, i) => `<div style="position:relative;animation-delay:${i * 0.12}s" class="carteCol">${carteHTML(x.id, p.collection[x.id].niv)}${x.nouveau ? '<span class="nouveau">NOUVEAU</span>' : ''}${x.eclats ? `<small>+${x.eclats} 💠</small>` : ''}</div>`).join('')}</div>` : ''}`, () => {
    const t = (n) => { const r = P.tirer(p, n, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); if (!r.ok) return toast(r.raison); sauver(); const meilleur = r.cartes.map((x) => CARTES[x.id].rarete).find((x) => x === 'legendaire') || r.cartes.map((x) => CARTES[x.id].rarete).find((x) => x === 'epique'); if (meilleur) toast(meilleur === 'legendaire' ? '🌟 <b>LÉGENDAIRE !</b>' : '💜 Une carte épique !'); fenetreTirages(r.cartes); };
    $('bt1').onclick = () => t(1); $('bt10').onclick = () => t(10);
    $('fenetreCorps').querySelectorAll('[data-fab]').forEach((b) => b.onclick = () => { const r = P.fabriquer(p, b.dataset.fab); if (!r.ok) return toast(r.raison || 'Impossible.'); sauver(); toast(`🏺 ${CARTES[b.dataset.fab].nom} forgée ! Ajoute-la à ton deck.`); fenetreTirages(); });
  });
}

// ---------- expédition ----------
function fenetreExpedition(terr) {
  const x = p.expedition;
  if (x && x.territoire !== terr) return ouvrir(`<h2>Expédition en cours</h2><p>Tu es déjà en expédition dans les ${esc(TERRITOIRES[x.territoire].nom)}.</p><button class="bouton" id="btReprendre">Reprendre</button>`, () => { $('btReprendre').onclick = () => fenetreExpedition(x.territoire); });
  if (!x) {
    const max = p.paliers[terr], T = TERRITOIRES[terr];
    return ouvrir(`<h2>${T.ico} ${esc(T.nom)}</h2><p class="sousTitre">Six étages de salles à choisir, puis le boss du territoire. Tes PV se gardent d'un combat à l'autre. Mourir fait perdre la moitié du butin. ${terr === p.clan ? 'C’est ton territoire.' : `Ici, tu récoltes des ${ELEMENTS[terr].nomMat.toLowerCase()} ${ICO_RESS[ELEMENTS[terr].materiau]}, introuvables chez toi.`}</p>
      <p>Ton deck : ${p.deck.length} cartes · ${P.pvMax(p)} PV</p>
      <div class="paliers">${PALIERS.map((pa) => `<button class="bouton ${pa.n > max ? 'second' : ''}" data-p="${pa.n}" ${pa.n > max ? 'disabled' : ''}>${pa.nom}${pa.n > max ? ' 🔒' : ` — butin ×${pa.butin}`}</button>`).join('')}</div>
      <p class="cout">Bats le boss d'un palier pour débloquer le suivant.</p>`, () => {
      $('fenetreCorps').querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { X.commencerExpedition(p, terr, +b.dataset.p, Date.now() >>> 0); sauver(); statut('expedition'); fenetreExpedition(terr); });
    });
  }
  statut('expedition');
  const poss = X.choixPossibles(x), etages = [...x.carte.etages, [x.carte.boss]];
  ouvrir(`<h2>${TERRITOIRES[x.territoire].ico} ${esc(TERRITOIRES[x.territoire].nom)} — ${PALIERS[x.palier - 1].nom}</h2>
    <div class="etatExpe"><span>❤️ ${x.pv} / ${x.pvMax}</span><span>Butin : ${nf(x.butin.essence)} ✨ · ${nf(x.butin.mat)} ${ICO_RESS[ELEMENTS[x.territoire].materiau]}</span><span class="espace" style="flex:1"></span><button class="bouton second" id="btAbandon">Abandonner (moitié du butin)</button></div>
    <p class="sousTitre">Choisis ta prochaine salle (elles brillent). ⚔️ combat · 🌟 monstre rare (${RARES[x.territoire].ico}) · 💀 élite · 🏕️ feu de camp · 💎 trésor · 👑 boss</p>
    <div class="carteExpe" id="carteExpe"><svg id="liensExpe"></svg>${etages.map((et) => `<div class="etage">${et.map((s) => `<button class="salle ${s.type === 'boss' ? 'boss' : ''} ${poss.includes(s.id) ? 'possible' : ''} ${x.position === s.id ? 'ici' : ''}" data-s="${s.id}" ${poss.includes(s.id) ? '' : 'disabled'} title="${X.SALLES[s.type].nom}">${X.SALLES[s.type].ico}</button>`).join('')}</div>`).join('')}</div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-s]').forEach((b) => b.onclick = () => entrerSalle(b.dataset.s));
    $('btAbandon').onclick = () => { if (!confirm('Abandonner l’expédition ? Tu gardes la moitié du butin.')) return; const r = X.terminer(p, 'defaite'); sauver(); bilanExpedition(r); };
    requestAnimationFrame(tracerLiens);
  });
}
function tracerLiens() {
  const svg = $('liensExpe'), boite = $('carteExpe'); if (!svg || !boite) return;
  const r0 = boite.getBoundingClientRect(), x = p.expedition; let h = '';
  svg.setAttribute('width', r0.width); svg.setAttribute('height', r0.height);
  const centre = (id) => { const b = boite.querySelector(`[data-s="${id}"]`)?.getBoundingClientRect(); return b ? [b.left - r0.left + b.width / 2, b.top - r0.top + b.height / 2] : null; };
  for (const et of x.carte.etages) for (const s of et) for (const v of s.vers) { const a = centre(s.id), b = centre(v); if (a && b) h += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(232,192,96,.3)" stroke-width="2" stroke-dasharray="5 5"/>`; }
  svg.innerHTML = h;
}
function entrerSalle(id) {
  const r = X.entrer(p, id); if (!r.ok) return;
  sauver();
  if (r.type === 'repos') { toast(`🏕️ Tu te reposes : +${r.soin} PV`); return fenetreExpedition(p.expedition.territoire); }
  if (r.type === 'tresor') { toast(`💎 Trésor : +${r.gain.essence} ✨, +${r.gain.mat} matériaux`); return fenetreExpedition(p.expedition.territoire); }
  lancerCombat(r.combat, X.salle(p.expedition.carte, id).type);
}
function bilanExpedition(r) {
  const mat = ELEMENTS[r.territoire].materiau, xp = r.fin === 'victoire' ? 150 * r.palier : 40;
  try { progress.gagnerXp(xp); progress.save(); } catch { /* rien */ }
  statut('libre');
  ouvrir(`<h2>${r.fin === 'victoire' ? '👑 Expédition réussie !' : '💀 Expédition terminée'}</h2>
    <p>${r.fin === 'victoire' ? 'Le boss est tombé.' : 'Tu rentres au village en boitant, avec la moitié de ton butin.'}</p>
    <p class="recolte">Tu ramènes <b>${nf(r.gainTotal.essence)} ✨</b> et <b>${nf(r.gainTotal[mat])} ${ICO_RESS[mat]}</b>${r.gainTotal[RARES[r.territoire].id] ? ` et <b>${r.gainTotal[RARES[r.territoire].id]} ${RARES[r.territoire].ico}</b>` : ''} · +${xp} XP de compte</p>
    ${r.debloque ? `<p>🔓 <b>${PALIERS[r.debloque - 1].nom}</b> débloqué dans les ${esc(TERRITOIRES[r.territoire].nom)} !</p>` : ''}
    <button class="bouton" id="btOk">Retour au monde</button>`, () => { $('btOk').onclick = fermer; });
}

// =====================================================================
//  LE COMBAT
// =====================================================================
function lancerCombat(def, type) {
  combat = C.nouveauCombat(def); carteChoisie = null;
  $('fenetre').classList.add('cache'); $('combat').classList.remove('cache');
  $('cbFond').className = p.expedition.territoire;
  $('cbTitre').textContent = { combat: 'Combat', elite: 'Combat d’élite', boss: 'Combat contre le boss' }[type] || 'Combat';
  $('cbInfo').textContent = `${TERRITOIRES[p.expedition.territoire].nom} · ${PALIERS[p.expedition.palier - 1].nom}`;
  $('cbPortrait').textContent = CLASSES[p.classe]?.ico || ELEMENTS[p.clan].ico;
  dessinerCombat();
}
function statutsHTML(s) { return Object.entries(STATUTS).filter(([k]) => s[k] > 0).map(([k, v]) => `<span class="statut" title="${esc(v.nom)} : ${esc(v.desc)}">${v.ico}${s[k]}</span>`).join(''); }
function dessinerCombat() {
  const c = combat;
  $('cbEnnemis').innerHTML = c.ennemis.map((e) => `<div class="ennemi ${e.rang} ${e.pv <= 0 ? 'mort' : ''} ${carteChoisie != null ? 'ciblable' : ''}" data-e="${e.uid}">
    <div class="intention">${C.decrireIntention(c, e).map((it) => `<span class="${it.type}">${{ attaque: '🗡️', defense: '🛡️', buff: '💪', malus: '', epines: '🌵' }[it.type]}${it.txt}</span>`).join('')}</div>
    ${ILLUS_MONSTRES.has(e.id) ? `<div class="corpsE illus" style="background-image:url(${import.meta.env.BASE_URL}clans/monstres/${e.id}.webp)"></div>` : `<div class="corpsE">${e.ico}</div>`}<div class="nomE">${esc(e.nom)}</div>
    <div class="barre"><i style="width:${(e.pv / e.pvMax) * 100}%"></i><b>${e.pv} / ${e.pvMax}</b></div>
    ${e.bloc ? `<span class="bloc">🛡️ ${e.bloc}</span>` : ''}<div class="statuts">${statutsHTML(e)}</div></div>`).join('');
  const j = c.joueur;
  $('cbPv').style.width = `${(j.pv / j.pvMax) * 100}%`; $('cbPvTxt').textContent = `${j.pv} / ${j.pvMax}${j.bloc ? `  ·  🛡️ ${j.bloc}` : ''}`;
  $('cbStatuts').innerHTML = `<div class="statuts" style="justify-content:flex-start">${statutsHTML(j)}</div>`;
  $('cbEnergieTxt').textContent = `${c.energie}/${c.energieMax}`;
  const cl = CLASSES[p.classe];
  if (cl) {
    const etat = p.classe === 'tireur' ? (C.viseeProchaine(c) ? ' — <b>la prochaine attaque est doublée !</b>' : ` — tir ${(c.tirs % 3) + 1}/3`) : p.classe === 'escrimeur' ? (c.attaquesTour ? ' — <b>+2 par coup actif</b>' : '') : p.classe === 'mage' ? (c.arcanes ? ' — utilisé ce tour' : ' — <b>prêt</b>') : '';
    $('cbTalent').innerHTML = `<b>${cl.ico} ${cl.talent}</b> : ${cl.desc}${etat}`;
    $('cbTalent').classList.toggle('pret', (p.classe === 'tireur' && C.viseeProchaine(c)) || (p.classe === 'escrimeur' && c.attaquesTour > 0));
  }
  const n = c.main.length;
  $('cbMain').innerHTML = c.main.map((k, i) => { const rot = (i - (n - 1) / 2) * 5, dy = Math.abs(i - (n - 1) / 2) * 6; const cout = C.coutDe(c, i); let h = carteHTML(k.id, k.niv); if (cout < CARTES[k.id].cout) h = h.replace(`<span class="cc">${CARTES[k.id].cout}</span>`, `<span class="cc reduit">${cout}</span>`); return h.replace('class="carte', `style="transform: rotate(${rot}deg) translateY(${dy}px)" data-i="${i}" class="carte ${C.jouable(c, i) ? '' : 'injouable'} ${carteChoisie === i ? 'choisie' : ''}`); }).join('');
  $('cbPioche').textContent = `📚 ${c.pioche.length}`; $('cbDefausse').textContent = `🗑️ ${c.defausse.length}`; $('cbEpuisees').textContent = `🔥 ${c.epuisees.length}`;
  $('cbAide').textContent = carteChoisie != null ? 'Choisis une cible (clic droit ou Échap pour annuler)' : '';
  $('cbMain').querySelectorAll('.carte').forEach((d) => d.onclick = (ev) => { ev.stopPropagation(); choisirCarte(+d.dataset.i); });
  $('cbEnnemis').querySelectorAll('.ennemi').forEach((d) => d.onclick = () => { if (carteChoisie != null) jouer(carteChoisie, d.dataset.e); });
}
function choisirCarte(i) {
  if (!C.jouable(combat, i)) return toast("Pas assez d'énergie.");
  const k = combat.main[i], vivants = combat.ennemis.filter((e) => e.pv > 0);
  if (C.besoinCible(k.id) && vivants.length > 1) { carteChoisie = carteChoisie === i ? null : i; return dessinerCombat(); }
  jouer(i, vivants[0]?.uid);
}
function flotter(el, txt, cls) {
  if (!el) return; const r = el.getBoundingClientRect(), d = document.createElement('div');
  d.className = `chiffre ${cls}`; d.textContent = txt; d.style.left = `${r.left + r.width / 2 - 20 + (Math.random() - 0.5) * 30}px`; d.style.top = `${r.top + r.height * 0.3}px`;
  document.body.append(d); setTimeout(() => d.remove(), 1000);
}
function photo() { return { j: { ...combat.joueur }, e: combat.ennemis.map((e) => ({ uid: e.uid, pv: e.pv, bloc: e.bloc })) }; }
function montrerChangements(avant) {
  const j = combat.joueur, cj = $('cbPortrait');
  if (j.pv < avant.j.pv) { flotter(cj, `−${avant.j.pv - j.pv}`, 'deg'); cj.classList.remove('touche'); void cj.offsetWidth; cj.classList.add('touche'); }
  if (j.pv > avant.j.pv) flotter(cj, `+${j.pv - avant.j.pv}`, 'soin');
  if (j.bloc > avant.j.bloc) flotter(cj, `🛡️+${j.bloc - avant.j.bloc}`, 'bloc');
  for (const a of avant.e) { const e = combat.ennemis.find((x) => x.uid === a.uid), el = document.querySelector(`[data-e="${a.uid}"] .corpsE`); if (e && e.pv < a.pv) { flotter(el, `−${a.pv - e.pv}`, 'deg'); el?.classList.add('touche'); } }
}
function jouer(i, cibleUid) {
  const avant = photo();
  carteChoisie = null;
  if (!C.jouerCarte(combat, i, cibleUid)) return;
  montrerChangements(avant); dessinerCombat();
  if (combat.fini) setTimeout(finCombat, 700);
}
$('btFinTour').onclick = () => {
  if (!combat || combat.fini) return;
  carteChoisie = null;
  const avant = photo(); C.finTour(combat);
  dessinerCombat(); montrerChangements(avant);
  if (combat.fini) setTimeout(finCombat, 800);
};
$('combat').addEventListener('contextmenu', (e) => { e.preventDefault(); carteChoisie = null; dessinerCombat(); });
addEventListener('keydown', (e) => {
  if ($('combat').classList.contains('cache')) return;
  if (e.key === 'Escape') { carteChoisie = null; dessinerCombat(); }
  else if (e.key === 'e' || e.key === 'E') $('btFinTour').click();
  else if (/^[1-9]$/.test(e.key)) choisirCarte(+e.key - 1);
});
function finCombat() {
  const r = X.apresCombat(p, combat); sauver();
  $('combat').classList.add('cache'); combat = null;
  if (r.fin) return bilanExpedition(r);
  toast(`Victoire ! +${r.gain.essence} ✨ · +${r.gain.mat} matériaux${r.gain.rare ? ` · +${r.gain.rare} ${RARES[p.expedition.territoire].ico}` : ''}`);
  fenetreExpedition(p.expedition.territoire);
}

// =====================================================================
//  LE DUEL (le serveur fait tourner le combat, on affiche et on envoie nos coups)
// =====================================================================
let vueDu = null, minuterieDu = null;
function afficherDuel(v) {
  const premier = $('duel').classList.contains('cache');
  vueDu = v;
  if (premier) { $('fenetre').classList.add('cache'); $('combat').classList.add('cache'); monde.arreter(); $('duel').classList.remove('cache'); }
  const a = v.adv, m = v.moi;
  $('duTitre').textContent = `⚔️ Duel contre ${a.nom}`;
  $('duAdv').innerHTML = `<div class="corpsE">${CLASSES[a.classe]?.ico || ELEMENTS[a.clan].ico}</div><div class="nomE">${esc(a.nom)} <span class="badge ${a.clan}">${ELEMENTS[a.clan].ico}</span></div>
    <div class="barre"><i style="width:${(a.pv / a.pvMax) * 100}%"></i><b>${a.pv} / ${a.pvMax}</b></div>${a.bloc ? `<span class="bloc">🛡️ ${a.bloc}</span>` : ''}<div class="statuts">${statutsHTML(a)}</div>
    <div class="mainAdv" title="Cartes en main">${'🂠'.repeat(a.nMain)}</div>`;
  $('duPortrait').textContent = CLASSES[p.classe]?.ico || ELEMENTS[p.clan].ico;
  $('duPv').style.width = `${(m.pv / m.pvMax) * 100}%`; $('duPvTxt').textContent = `${m.pv} / ${m.pvMax}${m.bloc ? `  ·  🛡️ ${m.bloc}` : ''}`;
  $('duStatuts').innerHTML = `<div class="statuts" style="justify-content:flex-start">${statutsHTML(m)}</div>`;
  $('duEnergieTxt').textContent = v.aMoi ? `${m.energie}/3` : '–';
  const n = m.main.length;
  $('duMain').innerHTML = m.main.map((k, i) => { const rot = (i - (n - 1) / 2) * 5, dy = Math.abs(i - (n - 1) / 2) * 6; let h = carteHTML(k.id, k.niv); if (k.cout < CARTES[k.id].cout) h = h.replace(`<span class="cc">${CARTES[k.id].cout}</span>`, `<span class="cc reduit">${k.cout}</span>`); return h.replace('class="carte', `style="transform: rotate(${rot}deg) translateY(${dy}px)" data-i="${i}" class="carte ${v.aMoi && k.cout <= m.energie ? '' : 'injouable'}`); }).join('');
  $('duMain').querySelectorAll('.carte').forEach((d) => d.onclick = () => { if (!vueDu?.aMoi) return toast("Ce n'est pas ton tour."); room?.send('duelJouer', { i: +d.dataset.i }); });
  $('btDuelFin').disabled = !v.aMoi;
  $('duJournal').innerHTML = v.journal.map((t) => `<p>${esc(t)}</p>`).join('');
  clearInterval(minuterieDu);
  const maj = () => { const s = Math.max(0, Math.ceil((v.limite - Date.now()) / 1000)); $('duTour').className = v.aMoi ? 'moi' : ''; $('duTour').textContent = `${v.aMoi ? 'À toi de jouer !' : `${a.nom} réfléchit…`} · ${s} s`; };
  maj(); minuterieDu = setInterval(maj, 500);
}
$('btDuelFin').onclick = () => room?.send('duelFin');
$('btDuelAbandon').onclick = () => { if (confirm('Abandonner le duel ? Ton adversaire gagne.')) room?.send('duelAbandon'); };
addEventListener('keydown', (e) => { if (!$('duel').classList.contains('cache') && (e.key === 'e' || e.key === 'E') && vueDu?.aMoi) room?.send('duelFin'); });
function finDuel(r) {
  clearInterval(minuterieDu); $('duel').classList.add('cache'); vueDu = null;
  p.ress.essence = Math.max(0, p.ress.essence + r.butin);
  if (r.issue === 'victoire') p.duels.gagnes++; else if (r.issue === 'defaite') p.duels.perdus++;
  sauver();
  const titre = { victoire: '🏆 Victoire !', defaite: '💀 Défaite', nul: '🤝 Égalité' }[r.issue];
  const raison = r.raison === 'abandon' ? (r.issue === 'victoire' ? `${esc(r.adv)} a abandonné.` : 'Tu as abandonné.') : r.raison === 'depart' ? `${esc(r.adv)} a pris la fuite.` : '';
  ouvrir(`<h2>${titre}</h2><p>Duel contre <b>${esc(r.adv)}</b>. ${raison}</p>
    <p class="recolte">${r.butin > 0 ? `Tu remportes <b>${nf(r.butin)} ✨</b> de son essence.` : r.butin < 0 ? `Tu perds <b>${nf(-r.butin)} ✨</b>.` : 'Personne ne perd rien.'}</p>
    <p class="cout">Après un duel, tu es protégé 2 minutes. Bilan : ${p.duels.gagnes} victoire${p.duels.gagnes > 1 ? 's' : ''}, ${p.duels.perdus} défaite${p.duels.perdus > 1 ? 's' : ''}.</p>
    <button class="bouton" id="btOk">Retour au monde</button>`, () => { $('btOk').onclick = fermer; });
}

// =====================================================================
//  DÉMARRAGE
// =====================================================================
p = charger();
if (p) { if (!p.nom) p.nom = localStorage.getItem('pseudo') || 'Joueur'; if (p.classe) entrerMonde(); else ecranClan(true); } else ecranClan();
addEventListener('pagehide', () => { if (p) localStorage.setItem(CLE, JSON.stringify(p)); });
window.__clans = { get p() { return p; }, get combat() { return combat; }, monde, C, P, X, lancerCombat };
