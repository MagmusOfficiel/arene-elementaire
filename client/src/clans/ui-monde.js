// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le choix du clan, la carte, la barre du haut, le son, le guide et les commandes tactiles
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { ELEMENTS, CLANS, CLASSES, LISTE_CLASSES, RARES } from '../../../shared/clans/cartes.js';
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import * as X from '../../../shared/clans/expedition.js';
import { LIEUX } from '../../../shared/clans/geo.js';
import { creerMonde } from './monde.js';
import { initAudio, setMusic, setAmbiance, sfx, toggleMute } from '../sfx.js';
import { lancerCombat, typeCombat } from './ui-combat.js';
import { $, ICO_RESS, esc, nf, niveau, p, room, statut, toast } from './ui-commun.js';
import { fenetreDeck, fenetreExpedition, fenetreParcelle, fenetreTirages } from './ui-fenetres.js';
import { etatChargement, faire, majPastille } from './ui-reseau.js';
import { cibleAlerte } from './ui-social.js';
import { fenetreProjet } from './ui-projets.js';
import { fenetreMarchand, marchandBouge } from './ui-marchand.js';
import * as PJ from '../../../shared/clans/projets.js';
import * as F from '../../../shared/clans/familiers.js';
import * as PS from '../../../shared/clans/passe.js';
import * as T from '../../../shared/clans/territoires.js';
import { OUVRAGES } from '../../../shared/clans/geo.js';

export function majBarre() {
  if (!p) return;
  const el = ELEMENTS[p.clan];
  $('moi').innerHTML = `${esc(p.nom)} <span class="badge ${p.clan}" title="${el.clan}">${el.ico}<i class="nomClan"> ${el.clan}</i></span> ${p.classe ? `<span title="${esc(CLASSES[p.classe].talent)} : ${esc(CLASSES[p.classe].desc)}">${CLASSES[p.classe].ico} ${CLASSES[p.classe].nom}</span>` : ''} <small>niv. ${niveau()}</small>`;
  $('ressources').innerHTML = ['essence', 'braises', 'perles', 'seve', 'eclats', 'cristal', 'perle_noire', 'graine_or'].filter((k) => k === 'essence' || p.ress[k] > 0 || ELEMENTS[p.clan].materiau === k)
    .map((k) => `<span title="${{ essence: 'Essence : pour les tirages et les constructions', eclats: 'Éclats : pour améliorer les cartes', cristal: 'Cristal de lave (ressource rare)', perle_noire: 'Perle noire (ressource rare)', graine_or: "Graine d'or (ressource rare)" }[k] || 'Matériau élémentaire'}">${ICO_RESS[k]} ${nf(p.ress[k])}</span>`).join('')
    + `<span title="Duels gagnés / perdus">⚔️ ${p.duels?.gagnes || 0}/${p.duels?.perdus || 0}</span>`;
}
export const DESC_CLANS = {
  feu: ['Gros dégâts et brûlure qui ronge les ennemis tour après tour.', 'Ta parcelle : une forge au pied du volcan, qui produit des braises.'],
  eau: ['Boucliers, pioche de cartes, et « trempé » qui fait subir 50 % de dégâts en plus.', 'Ta parcelle : une maison sur pilotis qui récolte des perles.'],
  plante: ['Soins, régénération et épines qui punissent ceux qui t’attaquent.', 'Ta parcelle : une serre au cœur de la forêt qui produit de la sève.'],
};
export const DESC_CLASSES = {
  combattant: 'Beaucoup de PV, frappes lourdes, boucliers et rage.',
  mage: 'Peu de PV, mais des sorts dévastateurs, de la pioche et de l’énergie en plus.',
  tireur: 'Des flèches en rafale, des tirs qui touchent tout le monde, des pièges.',
  escrimeur: 'De petites attaques rapides à enchaîner, des parades et des contre-attaques.',
};
export function classesHTML() {
  return LISTE_CLASSES.map((k) => { const c = CLASSES[k]; return `<button class="classeCarte" data-c="${k}"><span class="gros">${c.ico}</span><h3>${c.nom}</h3><p>${DESC_CLASSES[k]}</p><p><b>${c.talent}</b> : ${c.desc}</p><p>PV : ${60 + c.pv}</p></button>`; }).join('');
}
export function ecranClan(seulementClasse = false) {
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
        return faire('classe', { classe: k }).then((r) => { if (!r.ok) return toast(esc(r.raison || 'Impossible.')); entrerMonde(); toast(`Te voilà ${CLASSES[k].nom} ! Tes deux cartes de classe sont dans ton deck.`); });
      }
      const nom = $('nomJoueur').value.trim() || localStorage.getItem('pseudo') || 'Joueur';
      if (!confirm(`Rejoindre le ${ELEMENTS[clan].clan} en tant que ${CLASSES[k].nom} ? Ces choix sont définitifs.`)) return;
      localStorage.setItem('pseudo', nom);
      faire('creer', { clan, nom, classe: k }).then((r) => {
        if (!r.ok) return toast(esc(r.raison || 'Impossible de créer ton profil.'));
        entrerMonde();
        setTimeout(() => toast(`Bienvenue dans le ${ELEMENTS[p.clan].clan} ! Tu as 300 essences : va à l'<b>Autel des tirages</b>, au Carrefour.`), 600);
      });
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
export let derniereTerr = undefined;
export const monde = creerMonde($('monde'), {
  libre: () => $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache') && document.activeElement !== $('chatTexte'),
  marchandBouge: (m) => marchandBouge(m),
  agir: (l) => {
    if (l.action === 'tirage') fenetreTirages(); else if (l.action === 'expedition') fenetreExpedition(l.terr); else if (l.action === 'parcelle') fenetreParcelle();
    else if (l.action === 'projet') fenetreProjet();
    else if (l.action === 'marchand') fenetreMarchand();
    else if (l.action === 'filon') room?.send('ramasser', { id: l.id });
    else if (l.action === 'mondial') room?.send('mondialEntrer');
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
export let derniereEnvoi = 0, dernierePos = '';
export function envoyerPos(j) {
  if (!room || performance.now() - derniereEnvoi < 120) return;
  const k = `${Math.round(j.x)},${Math.round(j.y)}`; if (k === dernierePos) return;
  derniereEnvoi = performance.now(); dernierePos = k;
  room.send('pos', { x: j.x, y: j.y, dir: ['bas', 'haut', 'gauche', 'droite'].indexOf(j.dir) });
}
export let dansMonde = false;
export async function entrerMonde() {
  if (dansMonde) return; dansMonde = true;
  $('ecranClan').classList.add('cache');
  // le sol de la carte : peint une première fois (barre de progression), ensuite relu depuis l'appareil
  etatChargement('Préparation de la carte… 0 %');
  await monde.preparer((f) => etatChargement(`Préparation de la carte… ${Math.round(f * 100)} %<br><small>(seulement la première fois)</small>`));
  etatChargement('');
  $('ecranMonde').classList.remove('cache');
  majBarre(); monde.demarrer(p.clan, p.nom, p.classe); monde.majMaParcelle(p.parcelle);
  majPastille(); guide.demarrer(); if (monde.tactile) $('tactile').classList.remove('cache');
  const x = p.expedition;
  if (x?.combatEnCours) setTimeout(() => lancerCombat(X.combatDe(p, x.combatEnCours), X.salle(x.carte, x.combatEnCours).type), 400);
  else if (x) setTimeout(() => fenetreExpedition(x.territoire), 400);
}
export function ouvrir(html, apres) { $('fenetreCorps').dataset.vue = ''; $('fenetreCorps').innerHTML = html; $('fenetre').classList.remove('cache'); monde.arreter(); apres?.(); }
export function fermer() { $('fenetre').classList.add('cache'); statut(p?.expedition ? 'expedition' : 'libre'); }
$('btFermer').onclick = fermer;
export let sonPret = false;
export const demarrerSon = () => { if (sonPret) return; sonPret = true; initAudio(); majSon(); };
addEventListener('pointerdown', demarrerSon, { once: false });
addEventListener('keydown', demarrerSon);
export function majSon() {
  if (!sonPret || !p) return;
  const enCombat = !$('combat').classList.contains('cache'), enDuel = !$('duel').classList.contains('cache'), dansMonde = !$('ecranMonde').classList.contains('cache');
  setMusic(enDuel || (enCombat && (typeCombat === 'boss' || typeCombat === 'mondial' || typeCombat === 'elite')) ? 'boss' : enCombat ? 'combat' : 'monde');
  const t = dansMonde && !enCombat && !enDuel ? monde.territoire() : undefined;
  setAmbiance(t === undefined ? null : { feu: 'braise', eau: 'lagon', plante: 'sylve' }[t] || 'carrefour');
}
setInterval(majSon, 700);
setInterval(() => majPastille(), 30000);
export const basculerSon = () => { demarrerSon(); $('btSon').innerHTML = toggleMute() ? '🔇 Son coupé <small>M</small>' : '🔊 Son <small>M</small>'; };
$('btSon').onclick = basculerSon;
// le menu « Plus » de la barre du haut (v56) : les boutons moins fréquents
export function menuBarre(ouvert) {
  const l = $('menuListe'); ouvert ??= l.classList.contains('cache');
  l.classList.toggle('cache', !ouvert); $('barre').classList.toggle('menuOuvert', ouvert); $('btMenu').setAttribute('aria-expanded', String(ouvert));
}
$('btMenu').onclick = (e) => { e.stopPropagation(); menuBarre(); };
$('menuListe').addEventListener('click', (e) => { if (e.target.closest('button') && e.target.closest('button').id !== 'btSon') menuBarre(false); });
addEventListener('pointerdown', (e) => { if (!e.target.closest('#menuBarre')) menuBarre(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') menuBarre(false); });
addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT') basculerSon(); });
$('fenetre').addEventListener('pointerdown', (e) => { if (e.target === $('fenetre')) fermer(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('fenetre').classList.contains('cache')) fermer(); });
$('btParcelle').onclick = () => fenetreParcelle();
$('btDeck').onclick = () => fenetreDeck();
export const guide = (() => {
  const CLEG = 'clansGuide';
  let etat = (() => { try { return JSON.parse(localStorage.getItem(CLEG)) || { n: 0, vu: {} }; } catch { return { n: 0, vu: {} }; } })();
  etat.vu ||= {};
  const garder = () => { try { localStorage.setItem(CLEG, JSON.stringify(etat)); } catch { /* plein */ } };
  const lieu = (id) => LIEUX.find((l) => l.id === id);
  const touche = (k) => (monde.tactile ? '' : ` (touche <b>${k}</b>)`);
  // 1) les premiers pas : dans l'ordre, une étape après l'autre
  const ETAPES = [
    { txt: () => `Va à l'<b>Autel des tirages</b>, au Carrefour (suis la flèche), et fais ton premier tirage avec tes essences ✨.`, cible: () => lieu('autel'), fait: () => p.tirages.total > 0 },
    { txt: () => `Ouvre ton <b>Deck 🃏</b> : ta nouvelle carte y est. Clique sur <b>+ Deck</b> pour la jouer en combat.`, cible: () => null, fait: () => etat.vu.deck },
    { txt: () => `Pars en <b>expédition</b> : va au portail de ton territoire et choisis le <b>Palier I</b>.`, cible: () => lieu(`portail_${p.clan}`), fait: () => !!p.expedition || p.stats.combats > 0 },
    { txt: () => monde.tactile ? `Gagne ton premier combat : <b>touche une carte</b>, puis un ennemi. Quand tu n'as plus d'énergie ⚡, touche <b>Fin du tour</b>.` : `Gagne ton premier combat : clique une carte (ou touches <b>1</b> à <b>9</b>), puis un ennemi. Plus d'énergie ⚡ ? <b>Fin du tour</b> (touche <b>E</b>).`, cible: () => null, fait: () => p.stats.victoires > 0 },
    { txt: () => `Rentre chez toi (<b>★ Ta maison</b>, dans ton village) : ta parcelle produit même quand tu n'es pas là. Récolte !`, cible: () => { const m = monde.maison(); return { x: m.x, y: m.y + 16, nom: 'Ta maison' }; }, fait: () => etat.vu.parcelle },
    { txt: () => `Dernière étape : ouvre les <b>Quêtes 📜</b>${touche('J')}. Chaque jour, 3 quêtes pour gagner des essences et des éclats.`, cible: () => null, fait: () => etat.vu.quetes },
  ];
  // 2) les découvertes (v55) : une astuce à la fois, quand elle devient utile, jusqu'à ce que le joueur
  //    l'ait essayée ou ait cliqué sur « Compris »
  const ASTUCES = [
    { id: 'projet', quand: () => p.stats.victoires >= 1, fait: () => p.projet?.pts > 0,
      txt: () => `Au centre de ton village se construit le <b>${PJ.PROJETS[p.clan].ico} ${PJ.PROJETS[p.clan].nom}</b>, le projet de ton clan cette semaine. Donne-lui essence ou matériaux (touche <b>E</b> devant) : terminé, il donne un bonus à <b>tout le clan</b>.`,
      cible: () => ({ ...OUVRAGES[p.clan], nom: PJ.PROJETS[p.clan].nom }) },
    { id: 'ameliorer', quand: () => (p.ress.eclats || 0) >= 20, fait: () => Object.values(p.collection).some((c) => c.niv > 1),
      txt: () => `Tu as des <b>éclats 💠</b> : ouvre ton <b>Deck 🃏</b> et améliore une carte. Elle frappe plus fort, protège mieux, et ça se voit en combat.` },
    { id: 'marchand', quand: () => p.stats.victoires >= 2, fait: () => !!p.marchand,
      txt: () => `Un <b>marchand ambulant 🛒</b> change de place toutes les 20 minutes. Il échange les matériaux des autres clans, des éclats et des ressources rares : suis la flèche !`,
      cible: () => { const m = monde.marchand; return { x: m.x, y: m.y, nom: 'Marchand ambulant' }; } },
    { id: 'familiers', quand: () => p.stats.victoires >= 3 || F.possedes(p).length > 0, fait: () => false,
      txt: () => (F.possedes(p).length ? `Un <b>familier</b> t'a rejoint ! Il te suit et t'aide au début de chaque combat. Ouvre les <b>Familiers 🐾</b>${touche('F')} pour le choisir.` : `Les <b>familiers 🐾</b> te suivent partout et t'aident au début de chaque combat. On les trouve sur les boss d'expédition, ou on les fabrique${touche('F')}.`) },
    { id: 'passe', quand: () => PS.aReclamer(p) > 0, fait: () => (p.passe?.recu?.length || 0) > 0,
      txt: () => `Ton <b>passe de saison 🎟️</b> a monté de niveau : chaque activité rapporte de l'XP. Réclame tes récompenses${touche('P')}, dont 3 apparences exclusives ce mois-ci.` },
    { id: 'sanct', quand: () => p.stats.victoires >= 5, fait: () => (p.stats.sanct || 0) > 0,
      txt: () => `Les <b>sanctuaires 🏳️</b> sont dispersés sur la carte. Reste dessus pour les prendre (à plusieurs, c'est plus rapide) : chacun tenu par ton clan augmente la production de toutes vos parcelles.`,
      cible: () => { const j = monde.joueur, s = [...T.SANCTUAIRES].sort((a, b) => Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y))[0]; return { x: s.x, y: s.y, nom: s.nom }; } },
    { id: 'arene', quand: () => p.stats.victoires >= 8, fait: () => (p.arene?.v || 0) + (p.arene?.d || 0) > 0 || (p.duels?.gagnes || 0) > 0,
      txt: () => `Prêt pour le JcJ ? L'<b>arène classée 🏆</b> t'oppose à d'autres joueurs (ou à leur Reflet s'il n'y a personne). Une saison par mois, avec des récompenses de rang.` },
  ];
  let attente = 0;   // pas d'astuce juste après une autre
  const astuce = () => ASTUCES.find((a) => !etat.vu[`a_${a.id}`] && !a.fait() && a.quand());
  function maj() {
    const g = $('guide');
    if (!p || !dansMonde || etat.off) { g.classList.add('cache'); monde.guider(cibleAlerte()); return; }
    while (etat.n < ETAPES.length && ETAPES[etat.n].fait()) {
      etat.n++; garder();
      if (etat.n >= ETAPES.length) { sfx.fanfare(); toast('🎓 <b>Premiers pas terminés !</b> Le guide te montrera encore quelques astuces au fil du jeu.'); attente = Date.now() + 30000; return maj(); }
      sfx.orb();
    }
    let e, titre;
    if (etat.n < ETAPES.length) { e = ETAPES[etat.n]; titre = `Guide · ${etat.n + 1} / ${ETAPES.length}`; }
    else {
      // une astuce que le joueur vient de suivre : on la retire
      for (const a of ASTUCES) if (!etat.vu[`a_${a.id}`] && a.fait()) { etat.vu[`a_${a.id}`] = true; garder(); if (etat.actuelle === a.id) { sfx.orb(); attente = Date.now() + 20000; } }
      e = Date.now() > attente ? astuce() : null; titre = '💡 Astuce';
      if (e && etat.actuelle !== e.id) { etat.actuelle = e.id; garder(); }
    }
    if (!e) { g.classList.add('cache'); monde.guider(cibleAlerte()); return; }
    $('guideEtape').textContent = titre;
    $('guideOk').classList.toggle('cache', etat.n < ETAPES.length);
    const t = e.txt(); if ($('guideTxt').dataset.t !== t) { $('guideTxt').innerHTML = t; $('guideTxt').dataset.t = t; }
    g.classList.remove('cache');
    const c = cibleAlerte() || e.cible?.(); monde.guider(c ? { x: c.x, y: c.y, nom: c.nom } : null);
  }
  $('guidePasser').onclick = () => { if (!confirm('Masquer le guide et ses astuces ? (tu ne les reverras plus)')) return; etat.n = ETAPES.length; etat.off = true; garder(); maj(); };
  $('guideOk').onclick = () => { const a = astuce(); if (a) { etat.vu[`a_${a.id}`] = true; garder(); attente = Date.now() + 20000; } maj(); };
  setInterval(() => maj(), 500);
  return {
    vu(k) { if (!etat.vu[k]) { etat.vu[k] = true; if (`a_${etat.actuelle}` === k) attente = Date.now() + 20000; garder(); } },
    // un joueur qui a déjà joué n'a pas besoin des premiers pas (les astuces restent)
    demarrer() { if (etat.n === 0 && p.tirages.total > 0 && p.stats.victoires > 0) { etat.n = ETAPES.length; garder(); attente = Date.now() + 30000; } maj(); },
  };
})();
if (monde.tactile) {
  document.body.classList.add('tactile');
  const joyEl = $('joy'), bt = $('joyBouton');
  let doigt = null;
  const bouger = (e) => {
    const r = joyEl.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n; }
    bt.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`; monde.pousser(x, y);
  };
  joyEl.addEventListener('pointerdown', (e) => { doigt = e.pointerId; joyEl.setPointerCapture(e.pointerId); demarrerSon(); bouger(e); e.preventDefault(); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === doigt) bouger(e); });
  const lacher = (e) => { if (e.pointerId !== doigt) return; doigt = null; bt.style.transform = ''; monde.pousser(0, 0); };
  joyEl.addEventListener('pointerup', lacher); joyEl.addEventListener('pointercancel', lacher);
  $('btAgir').onclick = () => monde.agir();
  $('btChatMobile').onclick = () => { const c = $('chat'); c.classList.toggle('ouvert'); if (c.classList.contains('ouvert')) $('chatTexte').focus(); };
  setInterval(() => { $('btAgir').classList.toggle('pret', !!monde.action()); }, 200);
  $('aideMonde').innerHTML = 'Joystick pour marcher · <b>✋</b> pour agir · touche la carte pour y aller';
}
