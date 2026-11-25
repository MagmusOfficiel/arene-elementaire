// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l’état partagé (profil, connexion, combat) et les petits outils de l’interface
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { icone, NOMS_RESS } from './ui-icones.js';
import { BRANCHES, CARTES, ELEMENTS, CLASSES, RARETES, STATUTS, NIV_MAX, decrire } from '../../../shared/clans/cartes.js';
import * as P from '../../../shared/clans/profil.js';
import { creerCompte } from '../compte.js';

export const SERVER_URL = new URLSearchParams(location.search).get('serveur') || window.ARENE_SERVEUR || import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? `ws://${location.hostname}:2567` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
export const compte = creerCompte(SERVER_URL.replace(/^ws/, 'http'));
export const CLE = 'clansProfil';
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nf = (n) => Math.floor(n).toLocaleString('fr-FR');
export let p = null;
export let room = null, monId = null;
export let combat = null, cible = null, carteChoisie = null;
export const niveau = () => P.niveau(p);
// les messages éphémères (v61) : 3 au plus à l'écran, pas deux fois le même, et le temps de les lire
// v83 : les messages éphémères s'empilent en haut à droite, ne bloquent jamais un clic (on clique au travers),
// et chacun est gardé dans l'historique (🔔 dans la barre du haut)
export const historique = [];
let nonLus = 0;
export function toast(t) {
  const box = $('toasts');
  for (const x of box.children) if (x.dataset.t === t) { x.classList.remove('rejoue'); void x.offsetWidth; x.classList.add('rejoue'); return; }
  while (box.children.length >= 4) box.firstElementChild.remove();
  const d = document.createElement('div'), duree = Math.min(7000, 2400 + String(t).replace(/<[^>]+>/g, '').length * 40);
  d.className = 'toast'; d.dataset.t = t; d.innerHTML = t; d.style.setProperty('--duree', `${duree}ms`);
  box.append(d); setTimeout(() => d.remove(), duree);
  historique.unshift({ t, quand: Date.now() }); historique.length = Math.min(historique.length, 40);
  nonLus = Math.min(99, nonLus + 1); majCloche();
}
export function majCloche(lu = false) {
  if (lu) nonLus = 0;
  const el = $('pastilleN'); if (el) { el.textContent = nonLus; el.classList.toggle('cache', !nonLus); }
}
export const ILLUS = new Set([...'gd_egide gd_represailles gd_bastion gd_serment gd_mur gd_jugement bs_entaille bs_soif bs_frenesie bs_hurlement bs_carnage am_prisme am_flux am_tempete am_canalisation am_singularite am_grimoire iv_lien iv_morsure iv_meute iv_totem iv_pacte iv_colosse sn_marque sn_precis sn_perforant sn_patience sn_balle sn_pluie af_grenade af_mine af_tourelle af_fumigene af_barrage af_dynamite du_feinte du_riposte du_ballet bs_fureur du_mille du_grace om_poison om_voile om_assassinat om_brume om_execution om_nuee du_elan miroir echo brasier_vif loup_spectral golem_pierre esprit_faille dragonnet chaine_eclairs oeil_tempete marteau_tonnerre avatar_tempete morsure_astrale faux_etoiles comete_vorace festin_etoiles sable_aveuglant fleche_scarabee oeil_ra jugement_pharaon'.split(' '), 'lance_magma', 'dragon', 'coeur_volcan', 'leviathan', 'ocean', 'arbre_monde', 'coeur_phenix', 'perle_abysses', 'trident', 'seve_doree', 'titan', 'archimage', 'fleche_lourde', 'maitre_armes', 'colere', 'couronne',
  'reflexion', 'souffle_vif', 'grimoire_infini', 'flammes_jumelles', 'estocade_vive', 'carquois', 'reflet', 'plan_bataille', 'germination', 'bouture', 'courant', 'reflux',
  'frappe', 'garde', 'coup_double', 'second_souffle', 'etincelle', 'flamme', 'tison', 'cendres', 'boule_de_feu',
  'incendie', 'combustion', 'phenix', 'meteore', 'jet', 'vague', 'bulle', 'maree', 'tsunami',
  'carapace', 'ressac', 'source', 'geyser', 'brume', 'ronce', 'seve', 'liane', 'graine', 'chene',
  'floraison', 'spores', 'croissance', 'fouet', 'gardien', 'charge', 'rempart', 'fracas', 'tourbillon',
  'cri_guerre', 'second_vent', 'forteresse', 'execution', 'eclair_arcanique', 'bouclier_arcanique', 'missiles', 'meditation', 'torrent', 'nova',
  'savoir', 'transmutation', 'rayon', 'tir', 'piege', 'tir_rapide', 'volee', 'fleche_poison', 'repli', 'pluie_fleches',
  'oeil_faucon', 'tir_precis', 'estoc', 'parade', 'botte', 'fente', 'garde_haute', 'elan', 'danse_lames', 'coup_grace', 'concentration', 'rage_ardente', 'feinte', 'coup_bouclier']);
export const ILLUS_MONSTRES = new Set(['ver_sables', 'pharaon_maudit', 'reine_scorpion', 'soleil_noir', 'sphinx_ambre', 'scorpion_ambre', 'momie', 'chacal_dunes', 'serpent_sables', 'scarabee_sacre', 'djinn_mirage', 'vautour_os', 'sphinge_doree', 'mirage_vivant', 'gardien_obsidienne', 'seraphin_dechu', 'archange_argent', 'devoreuse_etoiles', 'etoile_mere', 'baleine_etoiles', 'meduse_stellaire', 'chouette_astre', 'feu_follet', 'golem_nuage', 'raie_nuees', 'pegase_noir', 'gargouille_etoile', 'constellation', 'vampire_astral', 'chevalier_aube', 'esprit_aurore', 'dragon_givre', 'reine_blizzard', 'oeil_cyclone', 'colosse_orage', 'harpie_orage', 'golem_givre', 'loup_blizzard', 'elementaire_foudre', 'yeti', 'wyverne_glace', 'chamane_tempete', 'oiseau_tonnerre', 'geant_givre', 'roi_tempetes', 'gardien_neant', 'coeur_faille', 'hydre_fusion', 'archonte_vide', 'neant_originel', 'golem_vapeur', 'liane_ardente', 'spectre_brume', 'chimere_faille', 'eclat_vivant', 'rodeur_abime', 'tisseuse_vide', 'prisme', 'colosse_fusion', 'sentinelle_brisee', 'seigneur_magma', 'hydre', 'reine_epine', 'salamandre', 'diablotin', 'golem_cendre', 'feu_follet', 'phenix_cendre', 'chimere', 'crabe', 'meduse', 'sirene', 'anguille', 'tortue_dragon', 'kraken', 'champignon', 'loup_ronces', 'treant', 'guepe', 'cerf_emeraude', 'mante', 'titan_magma', 'leviathan_abyssal', 'ancien_sylvain',
  'scarabee_braise', 'chaman_braise', 'chauve_souris', 'djinn', 'golem_obsidienne', 'roi_scorpion', 'grenouille', 'pretresse_ecume', 'requin',
  'esprit_marees', 'crocodile', 'reine_corail', 'araignee', 'druide_fou', 'sanglier', 'grand_duc', 'ours_ronces', 'colosse_racines']);
// les mots-clés des cartes sont soulignés et expliqués au survol (v61)
const MOTS = [
  [/(Brûlure|brûlure)( \d+)?/g, STATUTS.brulure], [/Trempés?( \d+)?/g, STATUTS.trempe], [/Affaiblis?( \d+)?/g, STATUTS.affaibli],
  [/Épines( \d+)?/g, STATUTS.epines], [/Régénération( \d+)?/g, STATUTS.regen], [/Force/g, STATUTS.force],
  [/Épuisée/g, { nom: 'Épuisée', desc: 'Une fois jouée, la carte quitte le combat (elle ne revient pas dans la pioche).' }],
  [/bouclier/g, { nom: 'Bouclier', desc: 'Absorbe les dégâts reçus jusqu’au début de ton prochain tour.' }],
];
export function texteCarte(txt) {
  let h = esc(txt);
  for (const [re, d] of MOTS) h = h.replace(re, (m) => `<b class="mot" title="${esc(d.nom)} : ${esc(d.desc)}">${m}</b>`);
  return h.replace(/(\d+)(?![^<]*>)/g, '<b class="nb">$1</b>');
}
export const etoiles = (niv) => '★'.repeat(niv) + '☆'.repeat(Math.max(0, NIV_MAX - niv));
export function carteHTML(id, niv = 1, extra = '') {
  const c = CARTES[id];
  return `<div class="carte ${c.element} r-${c.rarete}${c.branche ? ` br br-${c.branche}` : ''}${ILLUS.has(id) ? ' aIllus' : ''}${niv > 1 ? ` niv${niv}` : ''}" data-id="${id}" title="${esc(c.nom)} — ${esc(RARETES[c.rarete].nom)} · ${esc(ELEMENTS[c.element].nom)} · niveau ${niv}/${NIV_MAX}">
    <span class="cc">${c.cout}</span><div class="cn">${esc(c.nom)}</div>
    ${ILLUS.has(id) ? `<div class="ci illus" style="background-image:url(${import.meta.env.BASE_URL}clans/cartes/${id}.webp)"></div>` : `<div class="ci">${c.ico}</div>`}<div class="ct"><span class="gemme" title="${RARETES[c.rarete].nom}"></span>${{ attaque: 'Attaque', defense: 'Défense', pouvoir: 'Pouvoir' }[c.type] || c.type} · <b class="rarNom">${RARETES[c.rarete].nom}</b></div>
    <div class="cd">${texteCarte(decrire(id, niv))}</div>${niv > 1 ? `<span class="cniv" title="Niveau ${niv} sur ${NIV_MAX}">${etoiles(niv)}</span>` : ''}${c.branche ? `<span class="cclasse cbranche" title="Sort de la branche ${esc(BRANCHES[c.branche].nom)} (${esc(CLASSES[c.classe].nom)})">${BRANCHES[c.branche].ico}</span>` : c.classe ? `<span class="cclasse" title="Carte de ${esc(CLASSES[c.classe].nom)}">${CLASSES[c.classe].ico}</span>` : ''}${extra}</div>`;
}
export const coutHTML = (cout) => Object.entries(cout).map(([k, v]) => `<span class="${(p.ress[k] || 0) < v ? 'manque' : ''}">${nf(v)} ${ICO_RESS[k]}</span>`).join(' · ');
// v66 : de vraies icônes (SVG) à la place des émojis, qui prêtaient à confusion (🔥 braises / feu, ✨ essence / pouvoir…)
export const ICO_RESS = Object.fromEntries(Object.keys(NOMS_RESS).map((k) => [k, icone(k)]));
export const statut = (s) => room?.send('statut', { s });
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
export function statutsHTML(s) { return Object.entries(STATUTS).filter(([k]) => s[k] > 0).map(([k, v]) => `<span class="statut" title="${esc(v.nom)} : ${esc(v.desc)}">${v.ico}${s[k]}</span>`).join(''); }

// pour modifier ces variables depuis les autres modules
export const setP = (v) => (p = v);
export const setRoom = (v) => (room = v);
export const setMonId = (v) => (monId = v);
export const setCombat = (v) => (combat = v);
export const setCarteChoisie = (v) => (carteChoisie = v);

// v94 : on charge en douce, quand le navigateur ne fait rien, les images dont on aura bientôt besoin
// (les cartes du deck, les monstres de sa terre) : le premier combat s'affiche d'un coup.
const dejaPre = new Set();
export function precharger(urls) {
  const file = urls.filter((u) => !dejaPre.has(u)); file.forEach((u) => dejaPre.add(u));
  const suivant = () => { const u = file.shift(); if (!u) return; const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => attendre(suivant); im.src = u; };
  const attendre = (f) => (globalThis.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 200));
  attendre(suivant); attendre(suivant);   // deux à la fois
}
