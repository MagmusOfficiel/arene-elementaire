// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'aide (v61)
//  Tout ce qu'il faut savoir sur une seule page, en onglets : les
//  commandes, les ressources (à quoi elles servent, où les trouver),
//  les statuts du combat et les systèmes du jeu.
// =====================================================================
import { toucheFermer, NOM_FERMER } from './touches.js';
import { CLASSES, ELEMENTS, RARES, STATUTS } from '../../../shared/clans/cartes.js';
import { $, ICO_RESS, esc, p } from './ui-commun.js';
import { dansMonde, menuBarre, monde, ouvrir } from './ui-monde.js';

let onglet = 'bases';
const ONGLETS = { bases: '🎮 Les bases', ressources: '💰 Ressources', combat: '⚔️ Combat', systemes: '🗺️ Le monde' };
const ligne = (ico, titre, txt) => `<div class="aideL"><span>${ico}</span><div><b>${titre}</b><p>${txt}</p></div></div>`;

function contenu() {
  if (onglet === 'bases') {
    const t = monde.tactile;
    return `${ligne('🚶', 'Se déplacer', t ? 'Le joystick en bas à gauche. Touche la mini-carte pour y aller tout seul.' : '<kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou les flèches. Un clic sur la carte ou la mini-carte t’y emmène.')}
      ${ligne('✋', 'Agir', t ? 'Le gros bouton ✋ quand une action s’affiche (autel, portail, maison, marchand…).' : '<kbd>E</kbd> quand une action s’affiche en bas de l’écran (autel, portail, maison, marchand…).')}
      ${ligne('⌨️', 'Raccourcis', t ? 'Tout est dans la barre du haut et le menu ☰.' : `<kbd>J</kbd> quêtes · <kbd>P</kbd> passe · <kbd>F</kbd> familiers · <kbd>N</kbd> écurie · <kbd>H</kbd> ta fiche · <kbd>U</kbd> ascension · <kbd>M</kbd> son · <kbd>?</kbd> cette aide · <kbd>${NOM_FERMER}</kbd> fermer.<br>En combat : <kbd>1</kbd>…<kbd>9</kbd> jouer une carte · <kbd>E</kbd> fin du tour · <kbd>V</kbd> vitesse · clic droit annuler.`)}
      ${ligne('🎯', 'Le but', 'Fais grandir ton personnage et ton clan : tire des cartes à l’autel, construis ton deck, pars en expédition, améliore tes cartes, et affronte les autres joueurs en duel et dans l’arène.')}
      ${ligne(CLASSES[p.classe]?.ico || '🎴', 'Ta classe', `Ton talent de ${esc(CLASSES[p.classe]?.nom || 'classe')} : ${esc(CLASSES[p.classe]?.desc || '')} Tu ne tires et ne joues que <b>les cartes de ta classe</b> (marquées ${CLASSES[p.classe]?.ico || ''}), plus les cartes d’élément et neutres. Au <b>niveau 20</b> : l’Ascension (menu ☰, touche U) t’ouvre une branche avec un talent et des sorts en plus.`)}
      ${ligne('🏠', 'Ta maison', 'Ta parcelle produit des ressources même quand tu n’es pas là. Passe récolter, et améliore ses bâtiments.')}`;
  }
  if (onglet === 'ressources') {
    return `${ligne(ICO_RESS.essence, 'Essence', 'La monnaie de tout : tirages à l’autel, bâtiments, apparences, marchand. On la gagne partout : expéditions, quêtes, parcelle, arène.')}
      ${ligne(ICO_RESS.eclats, 'Éclats', 'Pour <b>améliorer tes cartes</b>. Ils viennent des doublons (au-delà de 4 exemplaires d’une carte), des quêtes, du passe et de l’arène.')}
      ${Object.entries(ELEMENTS).filter(([k]) => k !== 'neutre').map(([k, e]) => ligne(ICO_RESS[e.materiau], `${e.nomMat} (${e.nom})`, `Pour améliorer les cartes ${e.nom === 'Eau' ? 'd’Eau' : `de ${e.nom}`}. Ta parcelle produit le matériau de ton clan ; les autres se gagnent en expédition dans leur territoire, ou chez le marchand ambulant.`)).join('')}
      ${Object.entries(RARES).map(([k, r]) => ligne(ICO_RESS[r.id], `${r.nom} (rare)`, `Pour forger les cartes uniques des ${k === 'feu' ? 'Terres de Braise' : k === 'eau' ? 'Lagons d’Azur' : 'Sylves d’Émeraude'} et fabriquer des familiers. Filons sur la carte, monstres rares 🌟, boss.`)).join('')}`;
  }
  if (onglet === 'combat') {
    return `${ligne('⚡', 'Énergie', 'Chaque carte coûte de l’énergie (le chiffre en haut à gauche). Tu en as 3 par tour. Quand tu n’as plus rien à jouer : <b>Fin du tour</b>.')}
      ${ligne('🗡️', 'Intentions', 'Au-dessus de chaque ennemi : ce qu’il fera à son tour. Passe la souris dessus pour le détail. Sous ton héros, le total des dégâts prévus.')}
      ${ligne('🛡️', 'Bouclier', 'Absorbe les dégâts jusqu’au début de ton prochain tour. Bloque l’attaque annoncée, puis frappe.')}
      ${ligne('🔎', 'Aperçu', 'Survole une carte (ou garde le doigt dessus) : tu vois exactement ce qu’elle fera, force et statuts compris.')}
      ${Object.values(STATUTS).map((s) => ligne(s.ico, s.nom, esc(s.desc))).join('')}
      ${ligne('🔥', 'Épuisée', 'La carte quitte le combat une fois jouée.')}
      ${ligne('🏺', 'Reliques', 'Gagnées pendant une expédition (élites, trésors) : des bonus passifs jusqu’à la fin de l’expédition.')}`;
  }
  return `${ligne('🧭', 'Expéditions', 'Par le portail de chaque territoire : 6 étages de salles, puis le boss. Tes PV se gardent d’un combat à l’autre. Bats le boss pour débloquer le palier suivant (jusqu’au Cauchemar).')}
    ${ligne('🏳️', 'Sanctuaires', 'Reste dans le cercle d’un sanctuaire pour le prendre à ton clan : chacun tenu augmente la production de toutes vos parcelles.')}
    ${ligne('🏗️', 'Projet du clan', 'Au centre de ton village : donnez ensemble de l’essence et des matériaux. Terminé avant lundi, il donne un bonus à tout le clan la semaine suivante.')}
    ${ligne('🛒', 'Marchand ambulant', 'Il change de place toutes les 20 minutes et échange les matériaux des autres clans, des éclats et des ressources rares.')}
    ${ligne('🏟️', 'Arène et duels', 'L’arène classée t’oppose à d’autres joueurs (ou à leur Reflet), une saison par mois. Sur ton territoire, tu peux défier un intrus en duel.')}
    ${ligne('☠', 'Boss mondial', 'De temps en temps, un boss géant apparaît sur la carte : tous les joueurs l’affrontent ensemble.')}
    ${ligne('🎟️', 'Passe et quêtes', 'Chaque activité fait gagner de l’XP de passe (30 niveaux par mois, gratuit). Les quêtes du jour et de la semaine donnent essence et éclats.')}
    ${ligne('🏅', 'Hauts faits', 'Tes exploits débloquent des titres à afficher sous ton nom. Clique sur un joueur pour voir sa fiche.')}`;
}
export function fenetreAide() {
  ouvrir(`<h2>❓ Comment jouer</h2>
    <div class="filtres">${Object.entries(ONGLETS).map(([k, t]) => `<button data-oa="${k}" class="${k === onglet ? 'actif' : ''}">${t}</button>`).join('')}</div>
    <div class="aide">${contenu()}</div>`, () => {
    $('fenetreCorps').dataset.vue = 'aide';
    $('fenetreCorps').querySelectorAll('[data-oa]').forEach((b) => b.onclick = () => { onglet = b.dataset.oa; fenetreAide(); });
  });
}
$('btAide').onclick = () => fenetreAide();
addEventListener('keydown', (e) => { if ((e.key === '?' || e.key === ',') && e.target.tagName !== 'INPUT' && dansMonde && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) { menuBarre(false); fenetreAide(); } });
