// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l’état partagé (profil, connexion, combat) et les petits outils de l’interface
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { CARTES, ELEMENTS, CLASSES, RARETES, STATUTS, decrire } from '../../../shared/clans/cartes.js';
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
export function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = t; $('toasts').append(d); setTimeout(() => d.remove(), 3300); }
export const ILLUS = new Set(['lance_magma', 'dragon', 'coeur_volcan', 'leviathan', 'ocean', 'arbre_monde', 'coeur_phenix', 'perle_abysses', 'trident', 'seve_doree', 'titan', 'archimage', 'fleche_lourde', 'maitre_armes', 'colere', 'couronne',
  'frappe', 'garde', 'coup_double', 'second_souffle', 'etincelle', 'flamme', 'tison', 'cendres', 'boule_de_feu',
  'incendie', 'combustion', 'phenix', 'meteore', 'jet', 'vague', 'bulle', 'maree', 'tsunami',
  'carapace', 'ressac', 'source', 'geyser', 'brume', 'ronce', 'seve', 'liane', 'graine', 'chene',
  'floraison', 'spores', 'croissance', 'fouet', 'gardien', 'charge', 'rempart', 'fracas', 'tourbillon',
  'cri_guerre', 'second_vent', 'forteresse', 'execution', 'eclair_arcanique', 'bouclier_arcanique', 'missiles', 'meditation', 'torrent', 'nova',
  'savoir', 'transmutation', 'rayon', 'tir', 'piege', 'tir_rapide', 'volee', 'fleche_poison', 'repli', 'pluie_fleches',
  'oeil_faucon', 'tir_precis', 'estoc', 'parade', 'botte', 'fente', 'garde_haute', 'elan', 'danse_lames', 'coup_grace', 'concentration', 'rage_ardente', 'feinte', 'coup_bouclier']);
export const ILLUS_MONSTRES = new Set(['seigneur_magma', 'hydre', 'reine_epine', 'salamandre', 'diablotin', 'golem_cendre', 'feu_follet', 'phenix_cendre', 'chimere', 'crabe', 'meduse', 'sirene', 'anguille', 'tortue_dragon', 'kraken', 'champignon', 'loup_ronces', 'treant', 'guepe', 'cerf_emeraude', 'mante', 'titan_magma', 'leviathan_abyssal', 'ancien_sylvain']);
export function carteHTML(id, niv = 1, extra = '') {
  const c = CARTES[id];
  return `<div class="carte ${c.element} r-${c.rarete}${ILLUS.has(id) ? ' aIllus' : ''}" data-id="${id}" title="${esc(RARETES[c.rarete].nom)} · ${esc(ELEMENTS[c.element].nom)}">
    <span class="cc">${c.cout}</span><div class="cn">${esc(c.nom)}${niv > 1 ? ` ${'+'.repeat(niv - 1)}` : ''}</div>
    ${ILLUS.has(id) ? `<div class="ci illus" style="background-image:url(${import.meta.env.BASE_URL}clans/cartes/${id}.webp)"></div>` : `<div class="ci">${c.ico}</div>`}<div class="ct">${c.type} · ${RARETES[c.rarete].nom}</div>
    <div class="cd">${esc(decrire(id, niv))}</div>${c.classe ? `<span class="cclasse" title="Carte de ${esc(CLASSES[c.classe].nom)}">${CLASSES[c.classe].ico}</span>` : ''}${extra}</div>`;
}
export const coutHTML = (cout) => Object.entries(cout).map(([k, v]) => `<span class="${(p.ress[k] || 0) < v ? 'manque' : ''}">${nf(v)} ${ICO_RESS[k]}</span>`).join(' · ');
export const ICO_RESS = { essence: '✨', braises: '🔥', perles: '🫧', seve: '🍃', eclats: '💠', cristal: '💎', perle_noire: '⚫', graine_or: '🌰' };
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
