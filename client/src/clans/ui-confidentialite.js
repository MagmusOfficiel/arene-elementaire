// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — confidentialité et conditions (v111)
//  Exigence CrazyGames : le jeu garde des données (pseudo, progression,
//  messages de chat) sur son propre serveur, il doit donc le dire aux
//  nouveaux joueurs. Une mention discrète sur l'écran de création (pas de
//  fenêtre qui bloque) et cette page, ouverte aussi depuis le menu ☰.
// =====================================================================
import { $ } from './ui-commun.js';
import { ouvrir, fermer } from './ui-monde.js';

export function fenetreConfidentialite() {
  ouvrir(`<div class="confidentialite">
    <h2>🔒 Confidentialité et conditions</h2>
    <h3>Ce que le jeu garde</h3>
    <ul>
      <li>Ton pseudo, ton clan, ta classe et ta progression (cartes, ressources, quêtes, maison), sur le serveur du jeu, pour que tu retrouves ton personnage.</li>
      <li>Un identifiant anonyme rangé dans ton navigateur : il relie ce navigateur à ton personnage. Aucune adresse e-mail, aucun mot de passe, aucun nom réel.</li>
      <li>Les messages de chat sont envoyés aux joueurs connectés, filtrés contre les grossièretés, et ne sont pas archivés.</li>
      <li>Ton adresse IP n’est utilisée qu’un instant, pour bloquer les abus ; elle n’est pas enregistrée avec ton personnage.</li>
    </ul>
    <h3>Ce que le jeu ne fait pas</h3>
    <ul>
      <li>Il ne vend ni ne partage tes données, et ne t’affiche aucune publicité ciblée.</li>
      <li>Sur CrazyGames, la plateforme gère ses propres données selon sa politique de confidentialité.</li>
    </ul>
    <h3>Tes choix</h3>
    <ul>
      <li>Tu peux supprimer ton personnage à tout moment : menu ☰ → Personnages et compte → 🗑️. Tout est effacé du serveur.</li>
      <li>Sur CrazyGames, tu peux désactiver le chat dans les réglages de la plateforme.</li>
    </ul>
    <h3>Règles du jeu</h3>
    <ul>
      <li>Reste respectueux : pas d’insultes, de harcèlement ni de pseudo choquant. Les pseudos grossiers sont refusés.</li>
      <li>Pas de triche ni d’exploitation de bugs : un personnage qui triche peut être supprimé.</li>
      <li>Le jeu est fourni tel quel : il peut évoluer, et un personnage inactif très longtemps peut être effacé.</li>
    </ul>
    <button class="bouton" id="btConfOk">Compris</button>
  </div>`, () => { $('btConfOk').onclick = fermer; });
}
