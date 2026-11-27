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
import './i18n.js';   // v107 : en premier, pour traduire la page dès sa construction
import './style2.js';   // v112 : le réglage « nouveau style » (avant le reste)
import './style.css';
import './style2.css';
import './ouverture.css';
import * as C from '../../../shared/clans/combat.js';
import * as P from '../../../shared/clans/profil.js';
import * as X from '../../../shared/clans/expedition.js';
import * as SG from '../../../shared/clans/seigneurs.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso, dessinerAura } from './monde.js';
import './combat.css';
import './ui-commun.js';
import { cg, pret } from './crazygames.js';
import { fenetreExpedition } from './ui-fenetres.js';
import './ui-reseau.js';
import './ui-monde.js';
import './ui-fenetres.js';
import './ui-combat.js';
import './ui-social.js';
import './ui-duel.js';
import './ui-projets.js';
import './ui-familiers.js';
import './ui-grimoire.js';
import { feteNiveau } from './ui-notifs.js';
import './ui-passe.js';
import './ui-marchand.js';
import './ui-fiche.js';
import './ui-ascension.js';
import './ui-tour.js';
import './ui-amis.js';
import './ui-montures.js';
import './ui-maison.js';
import './ui-compte.js';
import './ui-aide.js';
import { coups, etatMondial, lancerCombat } from './ui-combat.js';
import { $, combat, p, room, toast } from './ui-commun.js';
import { monde } from './ui-monde.js';
import { act, connecter } from './ui-reseau.js';

// la barre du haut peut passer sur deux lignes : ce qui est dessous (guide, joueurs en ligne…) se place d'après sa hauteur réelle
new ResizeObserver(() => document.documentElement.style.setProperty('--hautBarre', `${$('barre').offsetHeight}px`)).observe($('barre'));
$('ecranClan').classList.add('cache');
pret.then(() => { if (document.getElementById('ecranClan').classList.contains('cache') && document.getElementById('ecranMonde').classList.contains('cache')) cg.chargementDebut(); });   // v106 : CrazyGames (rien ailleurs)
connecter();
window.__clans = { feteNiveau, toast, get room() { return room; }, AP, feuillePerso, dessinerAura, get p() { return p; }, get combat() { return combat; }, get coups() { return coups; }, monde, C, P, X, SG, act, lancerCombat, fenetreExpedition, get etatMondial() { return etatMondial; } };
