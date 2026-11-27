// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le choix du clan, la carte, la barre du haut, le son, le guide et les commandes tactiles
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { toucheFermer, NOM_FERMER } from './touches.js';
import * as G from '../../../shared/clans/geo.js';
import { cleMaison } from '../../../shared/clans/geo.js';
import * as QP from '../../../shared/clans/quetesPnj.js';
import * as P from '../../../shared/clans/profil.js';
import * as PC from '../../../shared/clans/parcours.js';
import { PNJ_PAR_ID, posPnj } from '../../../shared/clans/pnj.js';
import { ELEMENTS, CLANS, CLASSES, LISTE_CLASSES, RARES } from '../../../shared/clans/cartes.js';
import { TERRITOIRES } from '../../../shared/clans/monstres.js';
import * as X from '../../../shared/clans/expedition.js';
import { LIEUX } from '../../../shared/clans/geo.js';
import { creerMonde } from './monde.js';
import { cg, pret } from './crazygames.js';
import { RAYON_VISITE } from '../../../shared/clans/reperes.js';
import { langue, changerLangue } from './i18n.js';
import { style2, basculerStyle } from './style2.js';
const estMuetCG = () => document.body.dataset.cgMuet === '1';
import { initAudio, setMusic, setAmbiance, setDoux, setVolume, estMuet, volumes, sfx, toggleMute } from '../sfx.js';
import { musique } from './musique.js';
import { lancerCombat, typeCombat } from './ui-combat.js';
import { $, ICO_RESS, esc, nf, niveau, p, room, statut, toast } from './ui-commun.js';
import { NOMS_RESS } from './ui-icones.js';
import { fenetreDeck, fenetreExpedition, fenetreParcelle, fenetreTirages } from './ui-fenetres.js';
import { etatChargement, faire, majPastille } from './ui-reseau.js';
import { cibleAlerte } from './ui-social.js';
import { fenetreProjet } from './ui-projets.js';
import { fenetreMarchand, marchandBouge } from './ui-marchand.js';
import { voirFiche } from './ui-fiche.js';
import * as PJ from '../../../shared/clans/projets.js';
import * as F from '../../../shared/clans/familiers.js';
import * as PS from '../../../shared/clans/passe.js';
import * as T from '../../../shared/clans/territoires.js';
import { OUVRAGES } from '../../../shared/clans/geo.js';

export function majBarre() {
  if (!p) return;
  const el = ELEMENTS[p.clan];
  $('moi').innerHTML = `${esc(p.nom)} <span class="badge ${p.clan}" title="${el.clan}">${el.ico}<i class="nomClan"> ${el.clan}</i></span> ${p.classe ? `<span title="${esc(CLASSES[p.classe].talent)} : ${esc(CLASSES[p.classe].desc)}">${CLASSES[p.classe].ico} ${CLASSES[p.classe].nom}</span>` : ''} <small title="${(() => { const n = niveau(), x = P.xpDe(p); return n >= P.NIVEAU_MAX ? `Niveau maximum (${x} XP)` : `XP : ${x} / ${P.xpPourNiveau(n + 1)} pour le niveau ${n + 1} — 1 XP par combat gagné, ${P.XP_BOSS} par boss`; })()}">niv. ${niveau()}</small>`;
  // v119 : toujours visibles : essence, éclats, le matériau de son clan, et le matériau rare de la zone où l'on est ;
  // tout le reste (dès qu'on a beaucoup de ressources, la barre débordait) va dans le sac 🎒, qui s'ouvre au clic
  const TITRES_RESS = { essence: 'Essence : pour les tirages et les constructions', eclats: 'Éclats : pour améliorer les cartes', cristal: 'Cristal de lave (ressource rare)', perle_noire: 'Perle noire (ressource rare)', graine_or: "Graine d'or (ressource rare)", fragments: 'Fragments de faille (Terres Brisées)', eclat_vide: 'Éclat du vide (ressource rare des Terres Brisées)', plumes: 'Plumes d’orage (Cimes Orageuses)', cristal_foudre: 'Cristal de foudre (ressource rare des Cimes)', poussiere_etoile: 'Poussière d’étoile (matériau des Îles Célestes)', coeur_etoile: 'Cœur d’étoile (ressource rare des Îles Célestes)', sable_dore: 'Sable doré (matériau du Désert d’Ambre)', larme_ambre: 'Larme d’ambre (ressource rare du Désert)' };
  const ORDRE = ['essence', 'eclats', 'braises', 'perles', 'seve', 'cristal', 'perle_noire', 'graine_or', 'fragments', 'eclat_vide', 'plumes', 'cristal_foudre', 'sable_dore', 'larme_ambre', 'poussiere_etoile', 'coeur_etoile'];
  const principales = ['essence', 'eclats', ELEMENTS[p.clan].materiau];
  const autres = ORDRE.filter((k) => !principales.includes(k) && p.ress[k] > 0);
  const puce = (k) => `<span title="${esc(TITRES_RESS[k] || NOMS_RESS[k] || k)}">${ICO_RESS[k]} ${nf(p.ress[k] || 0)}</span>`;
  $('ressources').innerHTML = principales.map(puce).join('')
    + (autres.length ? `<span class="sacRess" role="button" tabindex="0" title="Toutes tes ressources">🎒 ${autres.length}<div class="sacListe">${ORDRE.filter((k) => p.ress[k] > 0 || principales.includes(k)).map((k) => `<div><i>${ICO_RESS[k]}</i><span>${esc(NOMS_RESS[k] || k)}</span><b>${nf(p.ress[k] || 0)}</b></div>`).join('')}</div></span>` : '')
    + (P.blesse(p) ? `<span class="vieBarre" title="Tu es blessé : repose-toi devant ta maison pour remonter tes PV">❤️ ${P.vie(p)}/${P.pvMax(p)}</span>` : '')
    + `<span title="Duels gagnés / perdus">⚔️ ${p.duels?.gagnes || 0}/${p.duels?.perdus || 0}</span>`;
  // v112 (nouveau style) : l'interface se découvre au fil des premiers pas, au lieu de tout montrer d'un coup
  if (style2) {
    const e = PC.etape(p), fini = e >= PC.ETAPES.length || niveau() >= 3;
    const montrer = { btDeck: fini || e >= 2, btParcelle: fini || e >= 4, btQuetes: fini, btPasse: fini, btNotifs: fini, enLigne: fini };
    for (const [id, v] of Object.entries(montrer)) { const b = $(id); if (b && b.classList.contains('a2Verrou') === v) { b.classList.toggle('a2Verrou', !v); if (v && b.tagName === 'BUTTON' && b.dataset.vu !== '1') { b.dataset.vu = '1'; if (e > 0) { b.classList.add('a2Nouveau'); setTimeout(() => b.classList.remove('a2Nouveau'), 6000); } } } }
    document.body.classList.toggle('a2Debut', !fini);
  }
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
// ---------- v85 : la création du héros, en 3 étapes (clan, classe, nom) avec un aperçu vivant ----------
// v112 : le nouvel accueil — « Jouer », puis un seul écran (clan illustré, classe déjà choisie, nom déjà rempli)
const CLASSE_ILLU = { feu: 'combattant', eau: 'mage', plante: 'tireur' };
const RESUME_CLAN = { feu: 'Frappe fort et brûle tout.', eau: 'Protège-toi et contrôle le combat.', plante: 'Soigne-toi et épuise l’ennemi.' };
function accueilNouveau() {
  const ec = $('ecranClan'); ec.classList.add('a2'); $('accueil2').classList.remove('cache');
  let clan = null, classe = null;
  const page = (n) => { document.querySelectorAll('#accueil2 .a2Page').forEach((x) => x.classList.toggle('cache', +x.dataset.a2 !== n)); ec.dataset.page = n; };
  // un nom tout prêt : celui de CrazyGames, le dernier utilisé, ou un nom tiré au sort
  const nomAuHasard = () => `${['Braise', 'Ondine', 'Sylve', 'Orage', 'Cendre', 'Écume', 'Ronce', 'Étoile'][Math.floor(Math.random() * 8)]}${100 + Math.floor(Math.random() * 900)}`;
  const nom0 = (() => { try { return localStorage.getItem('pseudo'); } catch { return null; } })();
  $('a2Nom').value = p?.nom || nom0 || nomAuHasard();
  pret.then(() => { if (cg.pseudo && !nom0) $('a2Nom').value = [...cg.pseudo].slice(0, 16).join(''); });
  $('a2Nom').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('a2Go').click(); };
  // les personnages déjà créés sur cet appareil
  import('./ui-compte.js').then((C) => {
    const l = C.persos().filter((x) => x.jeton !== C.jetonActif());
    $('a2Persos').innerHTML = l.length ? `<small>Continuer avec</small>${l.map((x) => `<button class="a2Perso" data-jouer="${esc(x.jeton)}">${esc(x.nom)} · niv. ${x.niv || 1}</button>`).join('')}` : '';
    $('a2Persos').querySelectorAll('[data-jouer]').forEach((b) => b.onclick = () => C.jouer(b.dataset.jouer));
  });
  const majClasses = () => {
    $('a2Classes').innerHTML = LISTE_CLASSES.map((k) => `<button role="radio" aria-checked="${k === classe}" class="a2Classe${k === classe ? ' choisi' : ''}" data-c="${k}" title="${esc(DESC_CLASSES[k])}"><span>${CLASSES[k].ico}</span>${esc(CLASSES[k].nom)}</button>`).join('');
    $('a2Classes').querySelectorAll('.a2Classe').forEach((b) => b.onclick = () => { classe = b.dataset.c; sfx.tick?.(); majClasses(); });
    $('a2Go').disabled = !clan;
    // v114 : la carte du clan choisi montre le héros de la classe choisie
    $('a2Clans').querySelectorAll('.a2Clan').forEach((b) => { const k = b.dataset.k, c = k === clan && classe ? classe : CLASSE_ILLU[k]; b.style.setProperty('--img', `url(${import.meta.env.BASE_URL}clans/heros/${k}_${c}.webp), url(${import.meta.env.BASE_URL}clans/accueil/${k}.webp)`); });
  };
  $('a2Clans').innerHTML = CLANS.map((k) => `<button class="a2Clan ${k}" data-k="${k}" style="--img:url(${import.meta.env.BASE_URL}clans/accueil/${k}.webp)"><span class="a2Ico">${ELEMENTS[k].ico}</span><b>${esc(ELEMENTS[k].clan)}</b><small>${esc(RESUME_CLAN[k])}</small></button>`).join('');
  $('a2Clans').querySelectorAll('.a2Clan').forEach((b) => b.onclick = () => {
    clan = b.dataset.k; classe = CLASSE_ILLU[clan]; sfx.tick?.();
    $('a2Clans').querySelectorAll('.a2Clan').forEach((x) => x.classList.toggle('choisi', x === b));
    ec.dataset.clan = clan; majClasses();
  });
  majClasses();
  $('a2Jouer').onclick = () => { demarrerSon(); sfx.tick?.(); page(2); };
  $('a2Conf').onclick = (e) => { e.preventDefault(); import('./ui-confidentialite.js').then((m) => m.fenetreConfidentialite()); };
  $('a2Go').onclick = () => {
    if (!clan) return;
    const nom = $('a2Nom').value.trim() || nomAuHasard();
    try { localStorage.setItem('pseudo', nom); } catch { /* rien */ }
    $('a2Go').disabled = true;
    faire('creer', { clan, nom, classe }).then((r) => {
      $('a2Go').disabled = false;
      if (!r.ok) { $('a2Nom').focus(); return toast(esc(r.raison || 'Impossible de créer ton profil.')); }
      entrerMonde();
    });
  };
  page(1);
}
export function ecranClan(seulementClasse = false) {
  $('ecranClan').classList.remove('cache'); $('ecranMonde').classList.add('cache');
  $('btStyleCrea').textContent = '✨ Nouveau style'; $('btStyleCrea').classList.toggle('cache', style2);
  $('btStyleCrea').onclick = basculerStyle;
  if (style2 && !seulementClasse) { cg.jeuFin(); cg.chargementFin(); import('./ui-invitation.js').then((I) => I.quitterSalle()); return accueilNouveau(); }
  $('ecranClan').classList.remove('a2'); $('accueil2').classList.add('cache');
  cg.jeuFin(); cg.chargementFin();   // v106 : l'écran de création est un menu
  import('./ui-invitation.js').then((I) => I.quitterSalle());
  $('nomJoueur').value = p?.nom || localStorage.getItem('pseudo') || '';
  // v110 : sur CrazyGames, on propose le pseudo du joueur (ses amis le reconnaîtront)
  pret.then(() => { if (!$('nomJoueur').value && cg.pseudo) { $('nomJoueur').value = [...cg.pseudo].slice(0, 16).join(''); $('nomJoueur').dispatchEvent(new Event('input')); } });
  // v79 : revenir à un autre personnage, ou retrouver son compte venu d'un autre appareil
  import('./ui-compte.js').then((C) => {
    const l = C.persos().filter((x) => x.jeton !== C.jetonActif());
    $('dejaCompte').innerHTML = `${l.length ? `<div class="codeCompte"><h3>👥 Revenir à un personnage</h3><div class="persos">${l.map((x) => `<button class="bouton second" data-jouer="${esc(x.jeton)}">${esc(x.nom)} · niv. ${x.niv || 1}</button>`).join('')}</div></div>` : ''}${C.blocRecuperer ? C.blocRecuperer() : ''}`;
    $('dejaCompte').querySelectorAll('[data-jouer]').forEach((b) => b.onclick = () => C.jouer(b.dataset.jouer));
    C.brancherCode($('dejaCompte'));
  });
  let clan = seulementClasse ? p?.clan : null, classe = null, etape = seulementClasse ? 2 : 1;
  const apercu = () => {
    const cv = $('apercuHeros'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 24, 26);
    if (clan) import('./ui-combat.js').then((U) => U.dessinerSprite(cv, clan, classe || 'combattant', 'bas', ''));
    const c = classe && CLASSES[classe];
    $('apNom').textContent = $('nomJoueur').value.trim() || 'Ton héros';
    $('apDesc').innerHTML = clan ? `${ELEMENTS[clan].ico} ${esc(ELEMENTS[clan].clan)}${c ? ` · ${c.ico} ${esc(c.nom)}` : ''}` : 'Choisis ton clan pour commencer.';
    $('apStats').innerHTML = c ? `<li>❤️ ${60 + c.pv} PV</li><li>⚡ 3 énergie</li><li>✨ ${esc(c.talent)} : ${esc(c.desc)}</li>` : clan ? `<li>${esc(DESC_CLANS[clan][0])}</li>` : '';
    $('apercuHeros').closest('.apercuHeros').dataset.clan = clan || '';
  };
  const aller = (e) => {
    etape = e;
    document.querySelectorAll('#ecranClan .creaPage').forEach((x) => x.classList.toggle('cache', +x.dataset.e !== e));
    document.querySelectorAll('#ecranClan .pas li').forEach((x) => { x.classList.toggle('actif', +x.dataset.e === e); x.classList.toggle('fait', +x.dataset.e < e); });
    $('creaRetour').classList.toggle('cache', e === 1 || (seulementClasse && e === 2));
    if (e === 3) {
      $('recapCrea').innerHTML = `<p>${ELEMENTS[clan].ico} <b>${esc(ELEMENTS[clan].clan)}</b> · ${CLASSES[classe].ico} <b>${esc(CLASSES[classe].nom)}</b></p><p class="cout">Ces choix sont définitifs (ta classe pourra évoluer au niveau 20 avec l’Ascension).</p>`;
      setTimeout(() => $('nomJoueur').focus(), 50);
    }
    apercu();
  };
  $('creaRetour').onclick = () => aller(etape - 1);
  $('nomJoueur').oninput = apercu;
  $('nomJoueur').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('btCreer').click(); };
  $('choixClans').innerHTML = CLANS.map((k) => `<button class="clanCarte ${k}" data-k="${k}"><span class="gros">${ELEMENTS[k].ico}</span><h2>${ELEMENTS[k].clan}</h2><p>${DESC_CLANS[k][0]}</p><p class="sec">${DESC_CLANS[k][1]}</p></button>`).join('');
  $('choixClans').querySelectorAll('.clanCarte').forEach((b) => b.onclick = () => { clan = b.dataset.k; $('choixClans').querySelectorAll('.clanCarte').forEach((x) => x.classList.toggle('choisi', x === b)); sfx.tick?.(); aller(2); });
  $('choixClasses').innerHTML = classesHTML();
  $('choixClasses').querySelectorAll('.classeCarte').forEach((b) => {
    b.onmouseenter = () => { if (!classe) { const v = classe; classe = b.dataset.c; apercu(); classe = v; } };
    b.onclick = () => {
      classe = b.dataset.c; $('choixClasses').querySelectorAll('.classeCarte').forEach((x) => x.classList.toggle('choisi', x === b)); sfx.tick?.();
      if (seulementClasse) return faire('classe', { classe }).then((r) => { if (!r.ok) return toast(esc(r.raison || 'Impossible.')); entrerMonde(); toast(`Te voilà ${CLASSES[classe].nom} ! Tes deux cartes de classe sont dans ton deck.`); });
      aller(3);
    };
  });
  $('btCreer').onclick = () => {
    const nom = $('nomJoueur').value.trim() || localStorage.getItem('pseudo') || 'Joueur';
    localStorage.setItem('pseudo', nom); $('btCreer').disabled = true;
    faire('creer', { clan, nom, classe }).then((r) => {
      $('btCreer').disabled = false;
      if (!r.ok) return toast(esc(r.raison || 'Impossible de créer ton profil.'));
      entrerMonde();
      setTimeout(() => toast(`Bienvenue dans le ${ELEMENTS[p.clan].clan} ! Tu as 300 essences : va à l'<b>Autel des tirages</b>, au Carrefour.`), 600);
    });
  };
  if (seulementClasse) $('etapeClasse').textContent = 'Nouveau : choisis ta classe (ce choix est définitif).';
  aller(etape);
}
export let derniereTerr = undefined;
export const monde = creerMonde($('monde'), {
  // v87 : les Terres Brisées s'ouvrent au niveau 30
  niveau: () => niveau(),
  ciel: (() => { let vu = 0; return () => { if (Date.now() - vu > 4000) { vu = Date.now(); toast('🌌 Les Îles Célestes flottent au-dessus de tout : il faut être <b>niveau 90</b> pour traverser le Pont des Étoiles.'); } }; })(),   // v99
  ambre: (() => { let vu = 0; return () => { if (Date.now() - vu > 4000) { vu = Date.now(); toast('🏜️ Le Désert d’Ambre est le lieu le plus dangereux du monde : il faut être <b>niveau 70</b> pour franchir la passe.'); } }; })(),   // v98
  cimes: (() => { let vu = 0; return () => { if (Date.now() - vu > 4000) { vu = Date.now(); toast('⚡ Les Cimes Orageuses sont mortelles : il faut être <b>niveau 50</b> pour franchir le col.'); } }; })(),   // v96
  faille: (() => { let vu = 0; return () => { if (Date.now() - vu > 4000) { vu = Date.now(); toast('🌀 Les Terres Brisées sont trop dangereuses : il faut être <b>niveau 30</b> pour y entrer.'); } }; })(),
  libre: () => Date.now() >= etourdiJusqua && ($('grandeCarte')?.classList.contains('cache') ?? true) && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache') && document.activeElement !== $('chatTexte'),
  marchandBouge: (m) => marchandBouge(m),
  fiche: (id) => voirFiche(id),
  carte: () => import('./ui-carte.js').then((m) => m.ouvrirCarte()),   // v101 : clic sur la mini-carte
  etatPnj: (id) => (p ? QP.etatPnj(p, id) : null),
  // v108 : les objets de quête à ramasser (recalculés quand le profil change)
  objetsQuete: () => objetsQueteCache(),
  agir: (l) => {
    if (l.action === 'tirage') fenetreTirages(); else if (l.action === 'expedition') fenetreExpedition(l.terr); else if (l.action === 'parcelle') fenetreParcelle(); else if (l.action === 'pnj') import('./ui-pnj.js').then((m) => m.parlerA(l.id));
    else if (l.action === 'projet') fenetreProjet();
    else if (l.action === 'marchand') fenetreMarchand();
    else if (l.action === 'filon') room?.send('ramasser', { id: l.id });
    else if (l.action === 'objetQuete') ramasserObjet(l);
    else if (l.action === 'mondial') room?.send('mondialEntrer');
    else if (l.action === 'seigneur') import('./ui-seigneurs.js').then((m) => m.fenetreSeigneur(l.seigneur));   // v124
    else if (l.action === 'defier') { if (p.expedition) return toast('Termine d’abord ton expédition.'); room?.send('defier', { cible: l.id }); }
  },
  position: (j) => {
    const t = G.dansCiel(j.x, j.y) ? 'ciel' : G.dansAmbre(j.x, j.y) ? 'ambre' : G.dansCimes(j.x, j.y) ? 'cimes' : G.dansFaille(j.x, j.y) ? 'brisees' : monde.territoire();   // v87, v96
    if (t !== derniereTerr) {
      derniereTerr = t;
      const b = $('bandeau');
      if (t === 'ciel') { b.className = ''; b.textContent = '🌌 Les Îles Célestes — îles flottantes, vide sans fond et monstres qui volent la vie'; }
      else if (t === 'ambre') { b.className = ''; b.textContent = '🏜️ Le Désert d’Ambre — dunes, cité ensevelie et monstres qui marquent'; }
      else if (t === 'cimes') { b.className = ''; b.textContent = '⚡ Les Cimes Orageuses — neige, foudre et monstres redoutables'; }
      else if (t === 'brisees') { b.className = ''; b.textContent = '🌀 Les Terres Brisées — terre sans clan, monstres fusionnés'; }
      else if (!t) { b.className = ''; b.textContent = 'Le Carrefour — terre neutre'; }
      else if (t === p.clan) { b.className = ''; b.textContent = `${TERRITOIRES[t].ico} ${TERRITOIRES[t].nom} — ton territoire`; }
      else { b.className = 'ennemi'; b.innerHTML = `⚠️ ${esc(TERRITOIRES[t].nom)} — territoire du ${esc(ELEMENTS[t].clan)}. Ses joueurs peuvent t'attaquer ici. Filons : ${ICO_RESS[RARES[t].id]} ${esc(RARES[t].nom)}.`; }
      clearTimeout(b._t); b._t = setTimeout(() => b.classList.add('cache'), 5000);
    }
    envoyerPos(j);
    lieuxQuete(j);
  },
});
// ---------- v108 : les quêtes « va voir » et « ramasse » ----------
let cacheObj = { p: null, l: [] };
function objetsQueteCache() { if (!p) return []; if (cacheObj.p !== p || cacheObj.v !== JSON.stringify(p.pnjQ || {})) cacheObj = { p, v: JSON.stringify(p.pnjQ || {}), l: QP.objetsAVoir(p) }; return cacheObj.l; }
async function ramasserObjet(o) {
  const r = await faire('pnjObjet', { id: o.id, i: o.i });
  if (!r.ok) return r.raison && toast(esc(r.raison));
  sfx.orb?.(); const n = PNJ_PAR_ID[QP.pnjDe(o.id)];
  toast(r.res.n >= r.res.max ? `🎒 ${esc(o.nom)} : tu as tout trouvé ! Retourne voir <b>${esc(n.nom)}</b>.` : `🎒 Tu ramasses ${esc(o.nom)} (${r.res.n} / ${r.res.max}).`);
}
let lieuEnCours = 0;
function lieuxQuete(j) {
  if (!p || Date.now() - lieuEnCours < 1500) return;
  const l = QP.lieuxAVoir(p).find((r) => Math.hypot(j.x - r.x, j.y - r.y) < RAYON_VISITE); if (!l) return;
  lieuEnCours = Date.now();
  setTimeout(async () => {   // laisse partir la position d'abord : le serveur la vérifie
    const r = await faire('pnjLieu', { id: l.id }); if (!r.ok) { lieuEnCours = 0; return; }
    sfx.fanfare?.(); const n = PNJ_PAR_ID[QP.pnjDe(l.id)];
    toast(`🗺️ <b>${esc(l.nom)}</b> : te voilà ! ${r.res.n >= r.res.max ? `Retourne voir <b>${esc(n.nom)}</b>.` : `(${r.res.n} / ${r.res.max})`}`);
  }, 300);
}
export let derniereEnvoi = 0, dernierePos = '';
export function envoyerPos(j) {
  if (!room || performance.now() - derniereEnvoi < 120) return;
  const k = `${Math.round(j.x)},${Math.round(j.y)}`; if (k === dernierePos) return;
  derniereEnvoi = performance.now(); dernierePos = k;
  room.send('pos', { x: j.x, y: j.y, dir: ['bas', 'haut', 'gauche', 'droite'].indexOf(j.dir) });
}
export let dansMonde = false;
// v84 : étourdi après une défaite en duel (10 s), puis renvoyé au village par le serveur
let etourdiJusqua = 0;
export function etourdir(s = 10) {
  etourdiJusqua = Date.now() + s * 1000; monde.arreter?.();
  let el = $('etourdi'); if (!el) { el = document.createElement('div'); el.id = 'etourdi'; document.body.append(el); }
  el.classList.remove('cache');
  const maj = () => { const r = Math.ceil((etourdiJusqua - Date.now()) / 1000); if (r <= 0) { el.classList.add('cache'); return; } el.innerHTML = `<b>💫 Étourdi</b><small>Retour à ton village dans ${r} s…</small>`; setTimeout(maj, 250); };
  maj();
}
export async function entrerMonde() {
  if (dansMonde) return; dansMonde = true;
  $('ecranClan').classList.add('cache');
  // le sol de la carte : peint une première fois (barre de progression), ensuite relu depuis l'appareil
  etatChargement('Préparation de la carte… 0 %');
  await monde.preparer((f) => etatChargement(`Préparation de la carte… ${Math.round(f * 100)} %<br><small>(seulement la première fois)</small>`));
  etatChargement('');
  $('ecranMonde').classList.remove('cache');
  majBarre(); monde.demarrer(p.clan, p.nom, p.classe, cleMaison(p)); monde.majMaParcelle(p.parcelle);
  cg.jeuDebut();   // v106 : CrazyGames « gameplayStart »
  import('./ui-invitation.js').then((I) => I.entrerSalle());   // v110 : le salon CrazyGames (inviter un ami)
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
// le son (v62) : la musique est composée en direct (musique.js), un morceau par lieu ; on attend
// quelques secondes avant de changer de morceau en passant une frontière, pour ne pas hacher
let morceauVoulu = null, depuis = 0;
export function majSon() {
  if (!sonPret || !p) return;
  setMusic(null); setDoux(true);
  const enCombat = !$('combat').classList.contains('cache'), enDuel = !$('duel').classList.contains('cache'), dansMonde = !$('ecranMonde').classList.contains('cache');
  const t = dansMonde && !enCombat && !enDuel ? monde.territoire() : undefined;
  const voulu = enDuel || (enCombat && (typeCombat === 'boss' || typeCombat === 'mondial' || typeCombat === 'elite')) ? 'boss' : enCombat ? 'combat' : ({ feu: 'braise', eau: 'lagon', plante: 'sylve' }[t] || 'monde');
  if (voulu !== morceauVoulu) { morceauVoulu = voulu; depuis = performance.now(); }
  if (enCombat || enDuel || performance.now() - depuis > 3500 || !musiqueLancee) { musique(voulu); musiqueLancee = true; }
  setAmbiance(t === undefined ? null : { feu: 'braise', eau: 'lagon', plante: 'sylve' }[t] || 'carrefour');
}
let musiqueLancee = false;
setInterval(majSon, 700);
setInterval(() => majPastille(), 30000);
export const basculerSon = () => { if (cg.actif && estMuetCG()) { toast('🔇 Le son est coupé dans les réglages de CrazyGames.'); return true; } demarrerSon(); const m = toggleMute(); $('btSon').innerHTML = m ? '🔇 Son coupé <small>M</small>' : '🔊 Son <small>M</small>'; toast(m ? '🔇 Son coupé (touche M pour le remettre)' : '🔊 Son remis'); return m; };
// les réglages du son : trois curseurs et la coupure
export function fenetreSon() {
  demarrerSon();
  const curseur = (k, nom, ico, aide) => `<label class="curseurSon"><span>${ico} <b>${nom}</b><small>${aide}</small></span><input type="range" min="0" max="100" value="${Math.round(volumes[k] * 100)}" data-vol="${k}"><output>${Math.round(volumes[k] * 100)} %</output></label>`;
  ouvrir(`<h2>🔊 Le son</h2>
    <p class="sousTitre">La musique est composée en direct par le jeu : un morceau calme sur la carte, un par territoire, un plus rythmé en combat et contre les boss.</p>
    <div class="reglagesSon">${curseur('musique', 'Musique', '🎵', 'les morceaux')}${curseur('ambiance', 'Ambiance', '🌿', 'vagues, oiseaux, lave…')}${curseur('effets', 'Effets', '✨', 'cartes, coups, interface')}</div>
    <p><button class="bouton second" id="btMuet">${estMuet() ? '🔊 Remettre le son' : '🔇 Couper tout le son'}</button> <small class="cout">Raccourci : touche M</small></p>`, () => {
    $('fenetreCorps').querySelectorAll('[data-vol]').forEach((r) => r.oninput = () => { setVolume(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = `${r.value} %`; if (r.dataset.vol === 'effets') sfx.orb(); });
    $('btMuet').onclick = () => { basculerSon(); fenetreSon(); };
  });
}
$('btSon').onclick = () => fenetreSon();
// v107 : français / anglais (on recharge pour que tout, carte comprise, soit redessiné dans la bonne langue)
$('btLangue').textContent = langue === 'en' ? '🌐 Français' : '🌐 English';
$('btStyle').textContent = style2 ? '↩ Ancien style' : '✨ Nouveau style';
$('btStyle').onclick = () => basculerStyle();   // v112
$('btConf').onclick = () => import('./ui-confidentialite.js').then((m) => m.fenetreConfidentialite());   // v111
$('lienConf').onclick = (e) => { e.preventDefault(); import('./ui-confidentialite.js').then((m) => m.fenetreConfidentialite()); };
$('btLangue').onclick = () => { changerLangue(langue === 'en' ? 'fr' : 'en'); location.reload(); };
// le menu « Plus » de la barre du haut (v56) : les boutons moins fréquents
export function menuBarre(ouvert) {
  const l = $('menuListe'); ouvert ??= l.classList.contains('cache');
  l.classList.toggle('cache', !ouvert); $('barre').classList.toggle('menuOuvert', ouvert); $('btMenu').setAttribute('aria-expanded', String(ouvert));
  if (ouvert) placerMenu();
}
// v97 : sur un petit écran, le bouton « Plus » peut passer à gauche (la barre se replie) ;
// on place la liste sous le bouton, sans jamais sortir de l'écran, et elle défile si elle est trop haute.
function placerMenu() {
  const l = $('menuListe'), b = $('btMenu').getBoundingClientRect(), m = 8;
  l.style.position = 'fixed'; l.style.right = 'auto';
  const larg = Math.min(l.offsetWidth, innerWidth - 2 * m);
  l.style.maxWidth = `${innerWidth - 2 * m}px`;
  l.style.left = `${Math.max(m, Math.min(b.right - larg, innerWidth - larg - m))}px`;
  const haut = Math.min(b.bottom + 6, innerHeight - 160);
  l.style.top = `${Math.max(m, haut)}px`;
  l.style.maxHeight = `${innerHeight - Math.max(m, haut) - m}px`;
}
addEventListener('resize', () => { if (!$('menuListe').classList.contains('cache')) placerMenu(); });
$('btMenu').onclick = (e) => { e.stopPropagation(); menuBarre(); };
$('menuListe').addEventListener('click', (e) => { if (e.target.closest('button')) menuBarre(false); });
addEventListener('pointerdown', (e) => { if (!e.target.closest('#menuBarre')) menuBarre(false); });
addEventListener('keydown', (e) => { if (toucheFermer(e)) menuBarre(false); });
addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT') basculerSon(); });
$('fenetre').addEventListener('pointerdown', (e) => { if (e.target === $('fenetre')) fermer(); });
addEventListener('keydown', (e) => { if (toucheFermer(e) && !$('fenetre').classList.contains('cache')) { e.preventDefault(); fermer(); } });   // v117 : Échap ou ⌫ (Échap quitte le plein écran sur CrazyGames)
$('btParcelle').onclick = () => fenetreParcelle();
// v119 : le sac des ressources s'ouvre dans une liste posée sur la page (la barre peut défiler ou flouter, elle la couperait)
function fermerSac() { document.getElementById('sacRessListe')?.remove(); }
$('ressources').addEventListener('click', (e) => {
  const sac = e.target.closest('.sacRess'); if (!sac) return;
  if (document.getElementById('sacRessListe')) return fermerSac();
  const r = sac.getBoundingClientRect(), l = document.createElement('div');
  l.id = 'sacRessListe'; l.className = 'sacListe'; l.innerHTML = sac.querySelector('.sacListe').innerHTML;
  l.style.top = `${r.bottom + 8}px`; l.style.left = `${Math.max(8, Math.min(r.left, innerWidth - 268))}px`;
  document.body.appendChild(l); e.stopPropagation();
});
addEventListener('click', (e) => { if (!e.target.closest('#sacRessListe')) fermerSac(); });
$('btZoomPlus').onclick = () => monde.zoomer(1); $('btZoomMoins').onclick = () => monde.zoomer(-1);   // v118
$('btDeck').onclick = () => fenetreDeck();
export const guide = (() => {
  const CLEG = 'clansGuide';
  let etat = (() => { try { return JSON.parse(localStorage.getItem(CLEG)) || { n: 0, vu: {} }; } catch { return { n: 0, vu: {} }; } })();
  etat.vu ||= {};
  const garder = () => { try { localStorage.setItem(CLEG, JSON.stringify(etat)); } catch { /* plein */ } };
  const lieu = (id) => LIEUX.find((l) => l.id === id);
  const touche = (k) => (monde.tactile ? '' : ` (touche <b>${k}</b>)`);
  // 1) les premiers pas : dans l'ordre, une étape après l'autre
  // v79 : les premiers pas sont présentés par les habitants du village, avec une récompense à chaque étape
  // (le serveur la donne : shared/clans/parcours.js). Le texte de chaque étape est dit par l'habitant.
  const habitant = (i) => { const id = PC.pnjDe(p, i); return id ? PNJ_PAR_ID[id] : null; };
  const recTxt = (r) => Object.entries(r).map(([k, v]) => (k === 'monture' ? '🐴 un poney' : `${v} ${ICO_RESS[k] || k}`)).join(' + ');
  const ETAPES = PC.ETAPES.map((e, i) => ({
    txt: () => { if (style2) return `<b class="a2Obj">${esc(e.titre)}</b> ${esc(e.txt)} <small class="a2Rec">🎁 ${recTxt(e.rec)}</small>`; const h = habitant(i); return `<b>${esc(h?.nom || '')}</b> <small>(${esc(h?.role || '')})</small> : « ${esc(e.txt)} »<br><small>Récompense : ${recTxt(e.rec)}</small>`; },
    cible: () => {
      if (e.parler) { const h = habitant(i); if (!h) return null; const q = posPnj(h, Date.now() / 1000); return { x: q.x, y: q.y, nom: h.nom }; }
      if (i === 1) return lieu('autel');
      if (i === 3) return lieu(`portail_${p.clan}`);
      if (i === 4) { const m = monde.maison(); return { x: m.x, y: m.y + 16, nom: 'Ta maison' }; }
      return null;
    },
    fait: () => PC.etape(p) > i,
  }));
  // une étape faite (sauf « parler ») : on réclame la récompense une fois
  let reclame = -1;
  function verifierParcours() {
    const i = PC.etape(p);
    if (!PC.prete(p) || reclame === i) return;
    reclame = i;
    faire('parcours', {}).then((r) => { if (!r.ok) { reclame = -1; return; } sfx.orb(); toast(`🎓 ${esc(PC.ETAPES[i].titre)} : bravo ! ${recTxt(r.res.rec)}`); });
  }
  // 2) les découvertes (v55) : une astuce à la fois, quand elle devient utile, jusqu'à ce que le joueur
  //    l'ait essayée ou ait cliqué sur « Compris »
  const ASTUCES = [
    { id: 'projet', quand: () => p.stats.victoires >= 1, fait: () => p.projet?.pts > 0,
      txt: () => `Au centre de ton village se construit le <b>${PJ.PROJETS[p.clan].ico} ${PJ.PROJETS[p.clan].nom}</b>, le projet de ton clan cette semaine. Donne-lui essence ou matériaux (touche <b>E</b> devant) : terminé, il donne un bonus à <b>tout le clan</b>.`,
      cible: () => ({ ...OUVRAGES[p.clan], nom: PJ.PROJETS[p.clan].nom }) },
    { id: 'ameliorer', quand: () => (p.ress.eclats || 0) >= 20, fait: () => Object.values(p.collection).some((c) => c.niv > 1),
      txt: () => `Tu as des <b>éclats ${ICO_RESS.eclats}</b> : ouvre ton <b>Deck 🃏</b> et améliore une carte. Elle frappe plus fort, protège mieux, et ça se voit en combat.` },
    { id: 'marchand', quand: () => p.stats.victoires >= 2 && monde.marchand.present, fait: () => !!p.marchand,
      txt: () => `Un <b>marchand ambulant 🛒</b> passe 20 minutes par heure, chaque fois à un autre endroit. Il échange les matériaux des autres clans, des éclats et des ressources rares : suis la flèche !`,
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
    verifierParcours();
    etat.n = Math.max(etat.n, Math.min(PC.etape(p), ETAPES.length) - 1);
    while (etat.n < ETAPES.length && ETAPES[etat.n].fait()) {
      etat.n++; garder();
      if (etat.n >= ETAPES.length) { sfx.fanfare(); toast('🎓 <b>Premiers pas terminés !</b> Ton poney t’attend à l’écurie (touche N). Le guide te montrera encore quelques astuces, et le menu ☰ → <b>Comment jouer</b> explique tout.'); attente = Date.now() + 30000; return maj(); }
      sfx.orb();
    }
    let e, titre;
    if (etat.n < ETAPES.length) { e = ETAPES[etat.n]; titre = style2 ? `🎯 Objectif ${etat.n + 1} / ${ETAPES.length}` : `Guide · ${etat.n + 1} / ${ETAPES.length}`; }
    else {
      // une astuce que le joueur vient de suivre : on la retire
      for (const a of ASTUCES) if (!etat.vu[`a_${a.id}`] && a.fait()) { etat.vu[`a_${a.id}`] = true; garder(); if (etat.actuelle === a.id) { sfx.orb(); attente = Date.now() + 20000; } }
      e = Date.now() > attente ? astuce() : null; titre = '💡 Astuce';
      if (e && etat.actuelle !== e.id) { etat.actuelle = e.id; garder(); }
    }
    if (!e) { g.classList.add('cache'); monde.guider(cibleAlerte()); return; }
    $('guideEtape').textContent = titre;
    if ($('guideEtape').dataset.v !== titre + e.id) { $('guideEtape').dataset.v = titre + e.id; g.classList.remove('replie'); }   // v93 : une nouvelle étape se déplie
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

// v93 : sur téléphone, toucher le titre du guide le replie (il couvre moins la carte)
$('guideEtape').addEventListener('click', () => $('guide').classList.toggle('replie'));

// v101 : la grande carte (touche C, menu, clic sur la mini-carte)
import('./ui-carte.js').then((m) => { $('btCarte').onclick = () => { menuBarre(false); m.ouvrirCarte(); }; });
