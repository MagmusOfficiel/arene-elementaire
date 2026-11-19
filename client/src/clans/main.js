// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'interface
//  Écran du clan → le monde partagé (monde.js) → fenêtres : parcelle,
//  deck, tirages, expéditions → combat de cartes.
//  Le profil est gardé par le SERVEUR : chaque action (tirage, amélioration,
//  expédition…) lui est envoyée avec act() et il renvoie le profil à jour.
//  Le navigateur garde une copie signée (clé « clansProfil », synchronisée
//  avec le compte du site) qui sert à retrouver le profil.
// =====================================================================
// Le code est réparti dans les modules ui-*.js (v51) ; ici, seulement le démarrage.
// ui-commun.js ne dépend d'aucun autre module ui-* : il est évalué en premier.
import './style.css';
import * as C from '../../../shared/clans/combat.js';
import * as P from '../../../shared/clans/profil.js';
import * as X from '../../../shared/clans/expedition.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso, dessinerAura } from './monde.js';
import './combat.css';
import './ui-commun.js';
import { fenetreExpedition } from './ui-fenetres.js';
import './ui-reseau.js';
import './ui-monde.js';
import './ui-fenetres.js';
import './ui-combat.js';
import './ui-social.js';
import './ui-duel.js';
import './ui-projets.js';
import './ui-familiers.js';
import './ui-passe.js';
import './ui-marchand.js';
import './ui-fiche.js';
import './ui-ascension.js';
import './ui-montures.js';
import './ui-aide.js';
import { coups, etatMondial, lancerCombat } from './ui-combat.js';
import { $, combat, p, room } from './ui-commun.js';
import { monde } from './ui-monde.js';
import { act, connecter } from './ui-reseau.js';

// la barre du haut peut passer sur deux lignes : ce qui est dessous (guide, joueurs en ligne…) se place d'après sa hauteur réelle
new ResizeObserver(() => document.documentElement.style.setProperty('--hautBarre', `${$('barre').offsetHeight}px`)).observe($('barre'));
$('ecranClan').classList.add('cache');
connecter();
window.__clans = { get room() { return room; }, AP, feuillePerso, dessinerAura, get p() { return p; }, get combat() { return combat; }, get coups() { return coups; }, monde, C, P, X, act, lancerCombat, fenetreExpedition, get etatMondial() { return etatMondial; } };
