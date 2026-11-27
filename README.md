# Les Clans Élémentaires

Jeu en ligne : choisis ton clan (Feu, Eau, Plante) et ta classe, fais pousser ta parcelle, tire des sorts,
pars en expédition façon Slay the Spire, affronte les autres joueurs en duel de cartes et prends les territoires ennemis.

## Lancer

```
npm install
npm run dev        # serveur (port 2567) + client (port 5173)
npm test           # tests des règles et du serveur
npm run build && npm run test:clans   # test de bout en bout dans un vrai navigateur
```

En production (Render, Docker), le serveur sert aussi la page compilée (`client/dist`).
Variables : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (le jeton **normal**, pas le « read only »), `CLANS_SECRET`, `JOURNAL_CLE`.

## Structure

- `shared/clans/` : les règles du jeu (cartes, combat, expéditions, profil…), utilisées par le client et le serveur
- `server/src/` : le serveur Colyseus (`ClansRoom.js`), les profils (`clansProfils.js`) et la sauvegarde (`stats.js`)
- `client/index.html` et `client/src/clans/` : la page du jeu ; `client/public/clans/` : illustrations, polices, page d'équilibrage
- `tests/` : tests des règles (`clans*.test.mjs`) et test de bout en bout (`clans_e2e.py`)

## Historique

## Les Clans Élémentaires, phase 1 (v36)

5e jeu du site, page `/clans/`. Un jeu en ligne où l'on rejoint un clan (Feu, Eau ou Plante), fait prospérer sa parcelle, tire des sorts et affronte des monstres en combat de cartes façon Slay the Spire.

- **Moteur partagé** (`shared/clans/`), pur et testé :
  - `cartes.js` : 42 cartes (neutres, feu, eau, plante ; commune à légendaire), effets décrits en données (dégâts, bouclier, soin, brûlure, trempé, affaibli, épines, régénération, force, pioche, énergie…), amélioration au niveau 2 puis 3.
  - `combat.js` : combat au tour par tour (3 énergie, 5 cartes, intentions des monstres affichées à l'avance).
  - `monstres.js` : 4 monstres, 1 élite et 1 boss par territoire ; 3 paliers de difficulté.
  - `profil.js` : profil du joueur, tirages (taux 62/27/9/2 %, une épique garantie par ×10, une légendaire au plus tard en 60 tirages, doublons en éclats), deck (10 à 25 cartes, 4 exemplaires au plus), parcelle (Maison, Autel d'essence, Atelier élémentaire ; production hors ligne plafonnée).
  - `expedition.js` : carte de 6 étages façon Slay the Spire (combat, élite, feu de camp, trésor) puis le boss ; PV conservés ; mourir coûte la moitié du butin ; battre le boss débloque le palier suivant.
- **Monde partagé** : salle Colyseus `clans` (`server/src/ClansRoom.js`), publique, 80 joueurs ; positions 8 fois par seconde, liste des membres de chaque clan, chat général et chat de clan. Sans serveur, on joue seul.
- **Client** (`client/src/clans/`) : la carte du monde dessinée en code (`monde.js` : les trois territoires, le Carrefour et l'Autel des tirages, les villages, les portails d'expédition, une mini-carte), et l'interface (`main.js`) : choix du clan, parcelle, deck, tirages, expéditions, combat.
- Le profil est gardé dans le navigateur (`clansProfil`) et sur le compte du site (champ `clans`).
- Tests : `tests/clans.test.mjs` (combat, tirages, deck, parcelle, expéditions, et un équilibrage joué par un bot).
- **Phase 2** : les duels de cartes entre joueurs dans les territoires ennemis, et les monstres et ressources rares propres à chaque territoire.

## Les Clans Élémentaires : les classes (v37)

Au départ, on choisit son clan puis sa **classe** (12 combinaisons). Un profil créé avant les classes en choisit une à sa prochaine connexion (`P.choisirClasse`), et reçoit ses deux cartes de classe.

| Classe | PV | Talent (géré par `combat.js`) |
|---|---|---|
| Combattant | +15 | **Endurci** : 6 de bouclier au début de chaque combat |
| Mage | −10 | **Arcanes** : le premier sort élémentaire de chaque tour coûte 1 de moins (`coutDe`) |
| Tireur | 0 | **Visée** : une attaque sur trois fait double dégâts (`viseeProchaine`) |
| Escrimeur | 0 | **Enchaînement** : +2 dégâts par coup pour chaque attaque jouée après une autre dans le tour |

- 40 cartes de classe (10 par classe, de commune à légendaire), soit 82 cartes en tout. Elles portent `classe` ; aux tirages, celles de sa classe sortent bien plus souvent que celles des autres.
- Deck de départ : 3 Frappe, 3 Garde, 2 cartes de classe, 4 cartes d'élément (`deckDepart`).
- Paliers rééquilibrés (PV ×1,3 / ×1,7 / ×2,2, dégâts ×1,2 / ×1,45 / ×1,75) : un bot gagne le palier I environ 2 fois sur 3, selon la combinaison.
- La classe s'affiche dans la barre, dans la liste des joueurs en ligne et sur les cartes ; en combat, une bulle montre le talent et son état.

## Les Clans Élémentaires, phase 2 : duels et territoires (v38)
- **Duels PvP** : un joueur ennemi qui entre sur le territoire de ton clan peut être défié (E à côté de lui, anneau rouge). Duel de cartes au tour par tour avec vos decks, arbitré par le serveur (`shared/clans/duel.js`), 40 s par tour, 30 tours max.
- **Enjeu** : le gagnant prend 15 % de l'essence du perdant (300 max). Abandonner ou se déconnecter = défaite. 2 minutes de protection après chaque duel.
- **Filons rares** : le serveur fait pousser des filons (💎 cristal de lave, ⚫ perle noire, 🌰 graine d'or) dans chaque territoire, jusqu'à 15 à la fois. Les monstres rares 🌟 et les boss d'expédition en donnent aussi.
- **Reliques** : 6 cartes exclusives qui ne sortent jamais aux tirages, à forger à l'autel avec les ressources rares (épique : 6 + 300 ✨, légendaire : 15 + 800 ✨).
- Fichiers : `shared/clans/geo.js` (géographie commune client/serveur), `shared/clans/duel.js`, `server/src/ClansRoom.js`.
- **Illustrations (style shōnen, Anifusion)** : les 88 cartes dans `client/public/clans/cartes/<id>.webp` et les 21 monstres dans `client/public/clans/monstres/<id>.webp`. Pour illustrer une autre carte : déposer l'image et ajouter son id à `ILLUS` (ou `ILLUS_MONSTRES`) dans `client/src/clans/main.js`.

## Les Clans Élémentaires : la carte en pixel art (v39)
- Le monde est maintenant une grille de tuiles de 16 px, 200 × 130 tuiles (3200 × 2080, 4 fois plus grand qu'avant).
- Sols par territoire : prairie et place pavée au Carrefour ; roche, cendre et lacs de lave au Feu ; sable, hauts-fonds et lagons à l'Eau ; sylve, mousse et mares à la Plante. La lave, l'eau profonde et les mares sont infranchissables.
- Décor, maisons, autel, portails, bannières, filons et personnages sont des sprites dessinés pixel par pixel en code, triés par profondeur. Chaque classe a sa silhouette (épaulières, chapeau de mage, capuche, cape).
- Affichage avec zoom entier, sans lissage. Mini-carte à un pixel par tuile, avec le champ de vision.
- Fichiers : `shared/clans/geo.js` (grille, sols, collisions partagées avec le serveur) et `client/src/clans/monde.js` (rendu). Un test vérifie que maisons, portails et autel se rejoignent à pied.

## Les Clans Élémentaires, phase 3 : boss mondiaux et rivalité des clans (v40)
- **Boss mondial** : toutes les 15 minutes, un boss apparaît dans un territoire (à tour de rôle : Titan de magma, Léviathan abyssal, Ancien sylvain) et reste 8 minutes. Ses PV sont communs à tout le serveur (700 + 300 par joueur connecté, 5000 max). Chacun l'affronte par manches (un combat de cartes normal, 15 s de pause entre deux) et les dégâts de tout le monde s'additionnent. Le serveur rabote les dégâts impossibles.
- **Récompenses** quand il tombe : essence selon ta part des dégâts, éclats, ressource rare du territoire ; bonus pour le meilleur.
- **Rivalité des clans** : classement de la semaine (lundi → lundi) avec des points gagnés par les actions vérifiées par le serveur : duel gagné 10, filon 3, boss d'expédition 8 (un toutes les 3 min au plus), boss mondial 1 pt / 10 dégâts + 20 s'il tombe + 30 pour le meilleur. Le clan en tête devient champion 👑 la semaine suivante. Bouton 🏆 Clans, scores affichés dans la liste des joueurs en ligne. Sauvegardé avec les autres statistiques (Upstash si configuré).
- Variables de test : `CLANS_BOSS_DELAI` (ms avant le premier boss) et `CLANS_BOSS_PV` (PV forcés).
- Fichiers : `shared/clans/mondial.js`, `server/src/ClansRoom.js`, `server/src/stats.js`.

## Les Clans Élémentaires : la parcelle visible (v41)
- La maison de chaque joueur en ligne montre ses bâtiments sur la carte, pour tout le monde : lanternes (maison niv. 2), drapeau du clan (niv. 3), toit doré (niv. 4), étoile (niv. 5) ; obélisque d'essence qui grandit avec l'autel ; atelier du clan (forge, puits ou potager) à partir de l'atelier niv. 2.
- Les niveaux passent par le serveur (un code à 3 chiffres dans la liste du monde). « Maison de X » s'affiche quand on passe devant.

## Les Clans Élémentaires : le son (v42)
- Réutilise le moteur audio du site (`client/src/sfx.js`, Web Audio) : musique `monde` dans le monde, `combat` en combat, `boss` pour les boss, élites, boss mondiaux et duels, avec fondu enchaîné.
- Ambiances synthétisées par territoire : grondement et crépitements de braises (Feu), vagues et mouettes (Eau), vent et oiseaux (Plante), brise et carillons (Carrefour).
- Bruitages : carte jouée (selon son élément et son type), coup, bouclier, soin, mélange en fin de tour, victoire / défaite, tirages selon la rareté (fanfare pour une légendaire), améliorations, récolte, filon, gong de duel, rugissement et cor du boss mondial.
- Bouton 🔊 dans la barre ou touche **M** pour couper le son. Le son démarre au premier clic (règle des navigateurs).

## Les Clans Élémentaires : profil gardé par le serveur (v43, anti-triche)
- **Le serveur fait foi.** Le profil (ressources, collection, deck, parcelle, expédition) est gardé par le serveur, rattaché à un jeton secret. Le navigateur n'a plus qu'une copie en lecture : modifier le `localStorage` ne sert à rien.
- Chaque action passe par le message `act` (`server/src/clansProfils.js`, table `ACTIONS`) : création, classe, tirages (graine tirée par le serveur), amélioration, forge, deck, récolte, construction, expédition (début, salle, combat, abandon). Les règles sont exactement celles de `shared/clans/*.js`. Le client attend la réponse `r` (`{ ok, raison, res, profil }`).
- **Combats rejoués.** Le client note ses coups (`['j', i, cible]` / `['f']`). Le serveur rejoue le combat depuis la même graine (`rejouer()` dans `shared/clans/combat.js`) et garde *son* résultat. Même chose pour les manches contre le boss mondial : seuls les dégâts vraiment infligés comptent.
- Filons, butin des duels et récompenses du boss mondial sont crédités directement par le serveur. Le nom, le clan, le niveau, le deck et les PV de duel sont lus dans le profil serveur, jamais envoyés par le client.
- Copie signée (HMAC) gardée dans `clansProfil` et synchronisée avec le compte du site : elle porte le jeton (on retrouve son profil sur un autre appareil) et permet de restaurer un profil si la base du serveur est perdue, sans pouvoir le falsifier.
- Migration : un profil d'avant la v43 est repris une fois, nettoyé par `assainir()` (valeurs plafonnées).
- Un même profil ouvert dans deux onglets : l'ancien onglet est déconnecté (« Jouer ici » pour le reprendre). Anti-spam : 15 actions d'avance, 10 par seconde.
- Plus de jeu hors ligne : l'écran de connexion attend le serveur et réessaie tout seul.
- **Variables Render :**
  - `CLANS_SECRET` (obligatoire) : une longue chaîne aléatoire qui signe les copies. Ne la change plus ensuite, sinon les copies existantes ne sont plus reconnues.
  - Upstash (`UPSTASH_REDIS_REST_URL` / `_TOKEN`) fortement conseillé. Sans base, un redémarrage de Render vide le fichier, et les joueurs repartent de leur copie signée, ce qui permet de rejouer une partie déjà jouée.
- Tests : `tests/clansserveur.test.mjs` (rejeu, actions, ids piégés, faux combats, signatures, migration).

## Les Clans Élémentaires : quêtes, guide et mobile (v44)
- **Quêtes** (`shared/clans/quetes.js`) : 3 quêtes du jour (tirées parmi 10) + un bonus quand les 3 sont réclamées, et 2 quêtes de la semaine (parmi 6). Changement à minuit UTC (1 h à Paris) ; mêmes quêtes toute la journée pour un même joueur.
  - Le **serveur** les fait avancer en voyant les événements : combat d'expédition gagné (avec territoire et type de salle), tirage, amélioration, récolte, filon, duel gagné, dégâts au boss mondial. Le client ne fait qu'afficher.
  - Réclamer : action `quete` (`j0`…`j2`, `s0`, `s1`, `bonus`), essence + éclats, et des points pour le clan (`POINTS.quete` = 4, `POINTS.queteSemaine` = 15).
  - Bouton 📜 (touche **J**) avec une pastille quand une récompense attend ; un toast quand une quête est terminée.
- **Guide des nouveaux joueurs** en 6 étapes (tirage → deck → expédition → premier combat → parcelle → quêtes), avec une flèche sur la carte (au-dessus du lieu, ou au bord de l'écran avec la distance) et le lieu qui clignote sur la mini-carte. Étapes vérifiées sur le profil ; « Passer » le masque ; un joueur qui a déjà joué ne le voit pas. État dans `localStorage` (`clansGuide`).
- **Mobile** : sur écran tactile, joystick (vitesse selon la poussée), bouton ✋ pour agir (il s'allume près d'un lieu), bouton 💬 pour le chat. Toucher la carte pour y aller marche toujours. Mise en page adaptée aux téléphones en portrait et couchés (barre en icônes, mini-carte en haut, combat et duel compacts).

## Les Clans Élémentaires : contrôle des territoires et arène classée (v45)
### Sanctuaires (`shared/clans/territoires.js`)
- 6 sanctuaires sur la carte, 2 par territoire (Cendres, Brasier, Marées, Corail, Racines, Lucioles). Au départ, chaque clan tient les siens.
- **Capture** : rester dans le cercle (70 px) sans adversaire. Seul : 20 s ; chaque renfort accélère (jusqu'à 4 joueurs). Un défenseur dans le cercle fait retomber la capture adverse ; deux clans dans le cercle = **contesté**, rien ne bouge. Cercle vide : la progression s'efface doucement. Les joueurs en duel, en combat de boss ou en expédition ne comptent pas.
- **Ce que ça rapporte** : +10 % sur chaque récolte de parcelle par sanctuaire tenu (appliqué par le serveur dans l'action `recolter`), 12 points de clan à chaque joueur présent lors de la prise, 1 point de clan par sanctuaire tenu toutes les 10 minutes (quand quelqu'un est connecté).
- Le serveur fait le calcul chaque seconde et diffuse `sanctuaires` ; qui tient quoi est gardé dans les stats (`clansSanctuaires`), donc ça survit aux redémarrages.
- Carte : socle, cristal et étendard à la couleur du clan, cercle en pointillés qui se remplit pendant la capture, état sur la mini-carte ; bandeau en bas d'écran quand on est dans un cercle ; liste dans la fenêtre 🏆 Clans.
- Le serveur ramène maintenant à sa position un joueur dont le déplacement a sauté de plus de 200 px (message `recale`), au lieu de l'ignorer sans rien dire.
### Arène classée (`shared/clans/arene.js`)
- Bouton 🏟️ : file d'attente, appariement par Elo (écart toléré : 100, +15 par seconde d'attente). Le duel est le même que sur la carte, joué à distance.
- **Reflets** : si personne n'est libre après 25 s, on affronte un Reflet : le deck d'un vrai joueur proche en Elo, joué par une IA côté serveur (`coupBot`), Elo compté à moitié. Sans aucun joueur classé : le Gardien de l'Arène (deck de départ).
- Elo de départ 1000, K = 32 (16 contre un Reflet). Rangs : Bronze, Argent 1100, Or 1250, Platine 1400, Diamant 1550, Maître 1700.
- Gains : +40 ✨ +2 💠 par victoire, +10 ✨ par défaite, sur les 10 premières parties du jour ; 6 points de clan par victoire (3 contre un Reflet). Quitter un match d'arène compte comme une défaite.
- **Saison d'un mois** : à la première connexion de la saison suivante, récompense selon le meilleur rang atteint (100 ✨ en Bronze jusqu'à 2 000 ✨ et 150 💠 en Maître), puis l'Elo est ramené à mi-chemin de 1000. Classement des 20 meilleurs et palmarès des 3 dernières saisons (stats : `clansArene`).
- Nouvelles quêtes : prendre un sanctuaire, gagner en arène (jour) ; 4 sanctuaires, 5 victoires d'arène (semaine).
- Variables de test : `CLANS_CAPTURE_VITESSE` (multiplie la vitesse de capture), `CLANS_ARENE_REFLET` (attente avant un Reflet, en ms).
- Tests : `tests/clansterritoires.test.mjs`.

## Les Clans Élémentaires : optimisation et alertes (v46)
Mesuré avec 40 joueurs simulés et un téléphone moyen (processeur ralenti 4×).
- **Réseau** (`envoyer()` dans `ClansRoom.js`) : 8 fois par seconde, chaque joueur ne reçoit plus que les joueurs **proches** de lui (`m` : nombres seuls) ; une fois par seconde, tout le monde (`carte`, pour la mini-carte et la liste) ; nom, clan, niveau, classe, parcelle seulement quand ils changent (`infos`). Chaque joueur a un petit numéro (`j.n`). La liste des clans n'est plus reconstruite 8 fois par seconde côté navigateur.
  - Avant : 13,2 Ko/s par joueur (≈ 0,5 Mo/s pour le serveur avec 40 joueurs). Après : 3,3 Ko/s si les 40 sont entassés au Carrefour, ~1,4 Ko/s quand ils sont dispersés.
- **Chargement** : le sol de la carte est peint par bandes avec une barre de progression (plus d'écran figé), les couleurs ne sont plus recalculées pour chaque pixel, et le résultat est gardé sur l'appareil (IndexedDB). L'empreinte de la carte change toute seule si la géographie change. Sur téléphone moyen : 2,8 s d'écran figé avant ; ensuite 0,5 s pour entrer dans le monde (première fois : ~3 s, mais sans blocage).
- **Sauvegarde** : les decks de l'arène sont gardés en texte court (4 fois moins de place) et l'arène garde 300 joueurs. Filet de sécurité : si les stats dépassent 850 Ko, le serveur garde moitié moins d'entrées et écrit dans les journaux ce qui prend de la place (la base gratuite refuse plus de 1 Mo).
- **Alertes de sanctuaire** : quand une capture commence, les joueurs connectés du clan qui tient le sanctuaire reçoivent une alerte (au plus une toutes les 90 s par sanctuaire) avec un bouton « 📍 Y aller » qui affiche la flèche du guide. La flèche contourne maintenant la mini-carte.

## Les Clans Élémentaires : nouveaux combats animés (v47)
- **Scène** (`client/src/clans/scene.js`, `combat.css`) : un décor en pixel art par territoire, dessiné par le code (volcan et coulée de lave, mer et arche de rocher, forêt et rayons de lumière, arène de pierre pour les duels), des particules d'ambiance (braises, bulles, lucioles et feuilles, poussière) et un canvas d'effets (éclats, entailles, anneaux, lueurs).
- **Mise en place** : ton personnage (le même sprite que sur la carte, agrandi) à gauche, face aux monstres à droite dans des cadres à la couleur de leur rang (élite, boss, boss mondial), posés sur le sol. Intention de chaque monstre dans une bulle, barres de vie avec un « fantôme » qui suit en retard et un bouclier, orbe d'énergie, pioche et défausse en piles de cartes, bouton « Fin du tour » qui s'allume quand tu ne peux plus rien jouer. Sur téléphone en portrait : les monstres en haut, le héros en bas.
- **Animations** : arrivée des combattants, distribution des cartes depuis la pioche, carte qui s'envole vers sa cible, impacts (couleur de l'élément, chiffres qui sautent, secousse, éclair rouge quand tu es touché), boucliers, soins, statuts, brûlures, épines, morts en éclats, monstres qui frappent l'un après l'autre, bannières « Tour ennemi » / « Ton tour », écran de victoire (rayons, gerbe d'or) ou de défaite.
- **Journal d'événements** (`c.ev` dans `shared/clans/combat.js`) : le moteur note chaque coup, bouclier, soin, statut, mort, tour… seulement si on le lui demande. Les règles ne changent pas : un test vérifie qu'un combat avec et sans journal finit exactement pareil, et le serveur, qui rejoue les combats, ne l'active pas.
- **Duels et arène** : la même scène, face à face. Les effets sont déduits des changements entre deux vues envoyées par le serveur, et les cartes jouées par l'adversaire s'affichent au-dessus de sa tête.

## Les Clans Élémentaires : apparences et palier Cauchemar (v48)
### Apparences (`shared/clans/apparence.js`)
- Quatre emplacements : **tenue** (couleurs), **cheveux**, **coiffe** (remplace le couvre-chef de la classe) et **aura** (particules autour du personnage). Visibles par tout le monde sur la carte, en duel et en arène (code court `t_….c_….h_….a_…` envoyé avec les infos du joueur, et gardé avec les Reflets).
- Pièces à acheter (de 200 ✨ pour des cheveux à 2 500 ✨ + 40 💠 pour l'étoffe d'or) ou **à gagner** : bandeau (10 duels), toque à plume (20 quêtes), heaume (60 combats), cornes (10 boss), auréole (5 sanctuaires), couronne (rang Or en arène), tenue de champion (Platine), poussière d'or (Diamant), masque, linceul et ombre du Cauchemar. Une pièce gagnée se porte dès que la condition est remplie, et l'on revient à la pièce de base si elle ne l'est plus. Le serveur vérifie tout (actions `apparenceAcheter` et `apparencePorter`).
- Fenêtre 👕 : aperçu qui tourne sur lui-même avec son aura, survoler une pièce l'essaie, barre de progression pour les pièces à gagner. Annonce quand une pièce est débloquée.
- Nouveaux compteurs dans le profil : `stats.quetes`, `stats.sanct`, `stats.cauchemar`.
### Palier IV « Cauchemar »
- Débloqué en battant le boss du Palier III d'un territoire. PV ×2,6, dégâts ×2, butin ×3,6.
- **2 malédictions** tirées au sort par expédition (à partir de la graine, donc identiques côté serveur) parmi 7 : Rage (+2 force), Carapaces (bouclier de départ), Horde (+1 monstre), Disette (feux de camp à moitié), Épuisement (4 cartes au 1er tour), Vitalité (les monstres regagnent 3 PV), Brouillard (intentions cachées). Elles passent par `def.mods` dans le moteur de combat ; sans `mods`, rien ne change.
- Monstres **maudits** (cadre et illustration violets, étiquette MAUDIT) et un nouveau boss par territoire, qui reprend l'illustration du boss mondial : Titan primordial, Léviathan des abysses, Ancien sylvain. Décor assombri.
- Équilibrage vérifié par un bot (40 expéditions par territoire) : avec un deck de 16 cartes au niveau 3 et la maison au maximum, environ 45 % de victoires dans chaque territoire ; presque aucune avec des cartes au niveau 2.
### Correction importante
- Depuis la v43, le numéro de chaque demande envoyée au serveur écrasait le champ `id` des actions : améliorer une carte, la forger, l'ajouter au deck ou l'en retirer échouait. Le numéro passe maintenant dans `rid`.

## Les Clans Élémentaires : tests de bout en bout, reconnexion, fluidité (v49)
### Tests de bout en bout : `npm run test:clans`
- `tests/clans_e2e.py` joue au jeu comme un joueur, dans un vrai navigateur (clics, clavier, marche, touche E) et vérifie à chaque étape que le serveur a bien fait le travail : création, guide, tirage ×1 et ×10, forge d'une relique, deck (retirer, ajouter), amélioration d'une carte, construction sur la parcelle, quêtes, achat d'apparences, expédition jouée à la souris jusqu'à la fin d'un combat, arène contre un Reflet, **coupure réseau en plein duel**, prise d'un sanctuaire à deux joueurs avec l'alerte du défenseur, et sur téléphone (joystick, fenêtres, combat). Il échoue aussi à la moindre erreur JavaScript.
- Prérequis : `pip install playwright`, `playwright install chromium`, puis `npm run build`. Le script lance son propre serveur (port 2597, stats dans un dossier temporaire, sans Upstash) avec des réglages de test : `CLANS_TEST_DEPART=1` (profil de départ riche, pour tout essayer ; **jamais en production**), capture 10× plus rapide, Reflet en 1,5 s.
- Vérifié : remis volontairement, le bug de la v43 fait échouer le test (« Forge d'une relique » bloquée, code de sortie 1). Lance-le avant chaque mise en ligne. `DETAIL=1 npm run test:clans` montre le détail d'une étape bloquée.
### Reconnexion
- Une coupure (tunnel, wifi qui change, téléphone en veille quelques secondes) ne fait plus perdre la partie : le serveur garde la place du joueur **20 s** (`allowReconnection`), duel et arène compris, et le client se reconnecte tout seul avec son jeton (`reconnect`). Au retour, le serveur renvoie tout l'état (profil, joueurs, filons, boss, sanctuaires, duel en cours). Bandeau « 📡 Connexion perdue… » pendant ce temps. Au-delà de 20 s, on repart proprement (un duel en cours est alors perdu).
- Un joueur absent ne compte pas pour un sanctuaire et n'est pas apparié dans l'arène. Variable `CLANS_RECONNEXION` pour changer le délai.
### Fluidité sur téléphone
- Mesuré sur un téléphone lent simulé (processeur ÷6, écran haute densité) : le JavaScript prend moins de 5 % du temps, le reste est le dessin des pixels.
  - Le vignettage (bords assombris) était recalculé en plein écran à chaque image : c'est maintenant une couche CSS fixe. 36 → 43 images/s.
  - Mode léger automatique : si l'appareil n'arrive pas à suivre (plus de 24 ms par image en moyenne), la carte est dessinée en résolution ×1 et agrandie sans flou (pixel art). Le choix est gardé (`clansLeger`). → 60 images/s.
- Corrigé au passage : la liste « En ligne » recouvrait de nouveau la mini-carte sur téléphone (depuis la v47).

## Les Clans Élémentaires : statistiques d'équilibrage (v50)
- **Page** : `/clans/admin.html` (par ex. `https://arene-elementaire.onrender.com/clans/admin.html`), protégée par la variable **`JOURNAL_CLE`** (la même que pour le journal des erreurs) : on entre sa valeur dans le champ en haut de la page, le navigateur la retient. Sans `JOURNAL_CLE` sur le serveur, la page est lisible par tous et la remise à zéro est refusée.
- **Collecte** (`server/src/clansEquilibrage.js`) : à chaque combat d'expédition qu'il valide, le serveur le rejoue avec le journal d'événements (il le rejouait déjà pour l'anti-triche) et note, par palier :
  - pour chaque carte : combats où elle est dans le deck, victoires, PV perdus, fois où elle est jouée, dégâts, bouclier et soin qu'elle produit ;
  - pour chaque monstre : combats, joueur vaincu, dégâts infligés, durée ;
  - les rencontres (territoire × palier × type de salle) : victoires, PV perdus, durée ;
  - les classes et les clans ;
  - et, pour les duels et l'arène joués jusqu'au bout (ni abandon ni fuite) : classe, clan et cartes du deck du gagnant et du perdant (arène, duel sur la carte et Reflets séparés).
- Ce sont des compteurs (~40 Ko au total, la taille ne grandit pas avec le nombre de parties), gardés dans les stats (`clansEquilibrage`).
- **Lecture** : en expédition presque tous les combats sont gagnés, donc le meilleur signal pour une carte est « PV perdus / combat » quand elle est dans le deck, comparé à la moyenne du palier. La page signale toute seule : 💪 trop forte ?, 📉 faible ?, 💤 peu jouée, ⚔️ domine en duel, ☠️ monstre très mortel, 🥱 élite inoffensive, classe ou clan au-dessus / en dessous de la moyenne. Filtre par palier, minimum de combats pour conclure (les lignes en dessous sont pâles), tri par colonne, recherche.
- **Remettre à zéro** (bouton) après chaque changement d'équilibrage, pour repartir sur des chiffres propres.
- Testé avec ~3 800 combats et ~500 duels simulés par des bots : la page signale bien que les cartes de Plante font perdre moins de PV, ce qui recoupe la mesure du Cauchemar (v48).

## Les Clans Élémentaires : ménage du code (v51)
- **Rien ne change pour les joueurs.** Le fichier de l'interface (`client/src/clans/main.js`, 1 160 lignes) est découpé en modules :

  | Module | Contenu |
  |---|---|
  | `ui-commun.js` | état partagé (profil, connexion, combat en cours), outils (`$`, `esc`, `toast`, cartes en HTML, ressources) ; ne dépend d'aucun autre module `ui-*`, donc il est chargé en premier |
  | `ui-reseau.js` | connexion, reconnexion, `act()`, réception du profil, chat, joueurs en ligne |
  | `ui-monde.js` | choix du clan, carte, barre du haut, ouverture/fermeture des fenêtres, son, guide, commandes tactiles |
  | `ui-fenetres.js` | parcelle, deck, tirages, expédition, apparence, quêtes |
  | `ui-combat.js` | scène de combat, animations, boss mondial |
  | `ui-social.js` | classement, sanctuaires, arène |
  | `ui-duel.js` | duels et matchs d'arène |
  | `main.js` | démarrage seulement (et `window.__clans` pour les tests) |
- Les variables partagées sont modifiées depuis les autres modules par de petites fonctions (`setP`, `setRoom`, `setCombat`…), puisqu'un module ne peut pas réaffecter une variable importée.
- Le découpage a été fait par un script qui analyse le code (aucune ligne réécrite à la main). Le test de bout en bout (`npm run test:clans`) et les 121 tests unitaires passent.
- **Test du battle royale stabilisé (vrai bug corrigé)** : il échouait environ une fois sur quatre parce qu'un bot finissait **coincé dans un bâtiment**. Un mur de sort pouvait repousser un personnage contre un bâtiment après la sortie des collisions. Maintenant, la sortie des bâtiments est refaite après un mur, et si le personnage reste coincé entre les deux, il ne bouge pas. Ça arrivait aussi aux joueurs dans l'Arène. 0 échec sur 45 parties.

## Les Clans Élémentaires : projets de clan (v52)
- **Un grand ouvrage par semaine** au centre de chaque village. Chaque clan a le sien :

  | Clan | Ouvrage | Bonus pour tout le clan la semaine suivante |
  |---|---|---|
  | Feu | ⚒️ Forge géante | −20 % sur les améliorations de cartes et la forge des reliques |
  | Eau | 🗼 Phare des marées | +20 % de butin (essence et matériaux) au retour d'expédition |
  | Plante | 🌳 Arbre-monde | +20 % de production de la parcelle (s'ajoute aux sanctuaires) |

- **Dons** : on s'approche de l'ouvrage (touche E), et on donne de l'essence ou le matériau du clan. 10 essences valent 1 point, 1 matériau vaut 1 point. Les dons rapportent aussi des points au classement des clans (1 tous les 25), et une nouvelle quête du jour demande d'en faire.
- **Objectif** : 600 points par donateur de la semaine précédente (au moins 1 200, au plus 16 000), pour qu'il reste atteignable quel que soit le nombre de joueurs.
- **Sur la carte, l'ouvrage grandit à vue** en 6 étapes :
  - fondations ;
  - quatre étapes de chantier, avec un échafaudage ;
  - terminé : la forge fume et rougeoie, le faisceau du phare tourne, l'arbre porte des fruits dorés et des lucioles.

  Une étiquette au-dessus de chaque ouvrage donne l'avancement. Le chat annonce chaque étape au clan, un ouvrage terminé à tout le monde, et le bonus actif le lundi.
- **La fenêtre** montre l'avancement, ta part, les 5 meilleurs donateurs, le temps restant et où en sont les deux autres clans. Le bonus actif est rappelé là où il compte : coûts réduits dans le deck et la forge, ligne dans la parcelle, détail dans le bilan d'expédition.
- **Côté serveur** :
  - l'état est dans les stats (`clansProjets`, 300 donateurs au plus par clan) et change de semaine le lundi à 0 h UTC ;
  - les bonus sont appliqués par le serveur ; pour le Phare, le bonus est fixé au départ de l'expédition ;
  - le code partagé est dans `shared/clans/projets.js`, l'interface dans `client/src/clans/ui-projets.js`, les tests dans `tests/clansprojets.test.mjs` et une nouvelle étape du test de bout en bout.

## Les Clans Élémentaires : familiers (v53)
- **Un petit compagnon en pixel art** te suit sur la carte : il trottine derrière toi, saute quand tu marches, et les autres joueurs le voient. Il t'accompagne aussi dans les combats contre les monstres (expéditions et boss mondial), à côté de ton héros. Il n'est **jamais** en duel ni dans l'arène, pour garder le JcJ équitable.
- **6 familiers, 2 par territoire**. Chacun donne un petit coup de pouce au début de chaque combat (appliqué par le moteur de combat, donc rejoué à l'identique par le serveur) :

  | Familier | Territoire | Effet |
  |---|---|---|
  | 🦎 Salamandre | Feu | 2 brûlures à tous les ennemis |
  | 🔥 Braisillon | Feu | +1 énergie au premier tour |
  | 🐢 Tortue des lagons | Eau | 5 de bouclier |
  | 🦦 Loutre | Eau | 1 carte de plus au premier tour |
  | 🌱 Pousse | Plante | régénération 3 |
  | ✨ Luciole | Plante | ennemis affaiblis 1 tour |

- **Obtention** :
  - en battant le boss d'un territoire : 30 / 40 / 50 / 60 % de chances selon le palier, pour un familier de ce territoire qu'on n'a pas encore. Il est annoncé dans le bilan de l'expédition ;
  - ou en le fabriquant : 6 ressources rares du territoire et 1 200 essences.
- **Fenêtre** : bouton 🐾 ou touche **F**. On y prend un familier avec soi, ou on le renvoie. Le familier est fixé au départ de chaque expédition.
- **Pas de nouvelles illustrations** : les familiers sont dessinés en code (`client/src/clans/familiersArt.js`, grilles de 12 × 10 pixels), donc aucun crédit Anifusion n'a été dépensé.
- **Barre du haut** : entre 761 et 1 500 px de large, les boutons n'affichent plus que leur icône (le nom reste dans l'infobulle). Le guide et la liste des joueurs se placent sous la hauteur réelle de la barre : avant, le guide pouvait cacher des boutons quand la barre passait sur deux lignes.
- **Fichiers** : règles dans `shared/clans/familiers.js`, fenêtre dans `client/src/clans/ui-familiers.js`, tests dans `tests/clansfamiliers.test.mjs`, et une nouvelle étape du test de bout en bout.

## Les Clans Élémentaires : passe de saison (v54)
- **Gratuit pour tous, une saison par mois** (calée sur celle de l'arène) : **30 niveaux** de 300 XP, soit environ 3 semaines en jouant un peu chaque jour. Bouton 🎟️ (avec une pastille quand une récompense attend) ou touche **P**.
- **XP de toutes les activités**, donnée par le serveur à chaque événement des quêtes (`Q.evenement`, donc rien à brancher pour les futures activités) et à chaque quête réclamée :
  - combat gagné : 20 XP (élite 35, boss 80) ;
  - quête du jour : 60 XP ; quête de la semaine : 200 XP ;
  - victoire en arène ou en duel : 40 XP ;
  - sanctuaire pris : 60 XP ;
  - filon ou amélioration : 15 XP ;
  - un peu pour le boss mondial (plafonné), les dons au projet du clan, les tirages et les récoltes.
- **Récompenses** :
  - essence et éclats à chaque niveau ;
  - ressources rares de son clan aux niveaux 5, 15 et 25 ;
  - **3 apparences exclusives** : cheveux au niveau 10, tenue au niveau 20, aura (plus 2 000 essences) au niveau 30.
- **Les lots tournent chaque mois** : Aube (novembre 2026), Abysses, Sève ancienne, Éclipse, puis on recommence. Ces pièces ne s'achètent pas et ne se gagnent pas autrement. Dans la fenêtre d'apparence, on voit celles qu'on a déjà et celles du mois.
- On réclame tout en un clic. À la fin du mois, ce qui a été atteint mais pas réclamé est donné d'office, puis le passe repart de zéro. Les apparences gagnées restent pour toujours.
- **Fichiers** : règles dans `shared/clans/passe.js`, fenêtre dans `client/src/clans/ui-passe.js`, tests dans `tests/clanspasse.test.mjs`, et une nouvelle étape du test de bout en bout.

## Les Clans Élémentaires : guide des débuts refait (v55)
- **Premiers pas** : les 6 étapes d'avant ne changent pas (tirage, deck, expédition, premier combat, parcelle, quêtes).
- **Ensuite, des astuces**, une à la fois, au moment où elles deviennent utiles :

  | Astuce | Quand elle apparaît | Ce qu'elle présente |
  |---|---|---|
  | Projet de clan | 1re victoire | l'ouvrage du village (la flèche le montre) |
  | Améliorer une carte | 20 éclats ou plus | l'amélioration dans le deck |
  | Familiers | 3 victoires, ou un premier familier trouvé | les familiers |
  | Passe de saison | une récompense attend | le passe |
  | Sanctuaires | 5 victoires | les sanctuaires (la flèche montre le plus proche) |
  | Arène classée | 8 victoires | l'arène |

- **Une astuce disparaît** dès qu'on a essayé ce qu'elle présente (don, amélioration, fenêtre ouverte, sanctuaire pris, match joué) ou qu'on clique sur « Compris ». Il y a 20 secondes entre deux astuces. « Passer » masque le guide et les astuces pour de bon.
- **Les joueurs déjà avancés** ne revoient pas les premiers pas, mais reçoivent les astuces des systèmes qu'ils n'ont pas encore essayés.

## Les Clans Élémentaires : barre du haut regroupée (v56)
- **Toujours visibles** : 🎟️ Passe et 📜 Quêtes (avec leur pastille), 🏠 Parcelle, 🃏 Deck.
- **Dans le menu ☰ « Plus »** : Apparence, Familiers (F), Arène classée, Rivalité des clans, Son (M). Le menu se ferme au clic ailleurs ou avec Échap, et il passe au-dessus d'une fenêtre ouverte. Les raccourcis clavier n'ont pas changé.
- **Sur ordinateur** : la barre tient sur une seule ligne dès 1 280 px de large. Jusqu'à 1 500 px, les boutons n'affichent que leur icône.
- **Sur téléphone, deux lignes au lieu de trois** :
  - en haut : le nom, l'icône du clan et les 5 boutons ;
  - en dessous : les ressources, sur une seule ligne qui défile au doigt.

  Le menu s'ouvre dans l'écran, aligné à droite.

## Les Clans Élémentaires : confort de combat (v57)
- **Aperçu des effets réels** :
  - **avec la souris**, au survol d'une carte ;
  - **au doigt**, par un appui long (la carte n'est alors pas jouée en relâchant) ;
  - quand on choisit une cible, l'aperçu s'affiche sur chaque ennemi possible.

  On voit les PV que l'ennemi va perdre, le bouclier ennemi entamé, ☠ si le coup l'achève et les statuts posés (🔥 brûlure, trempé, affaibli). Sur le héros s'affichent le bouclier, les soins, la force et l'énergie gagnés.
- **Tout est compté**, car on joue la carte sur une copie du combat avec le même moteur : force, affaibli, trempé, bouclier ennemi, Visée, Enchaînement, Arcanes, cibles multiples. L'aperçu est donc toujours juste.
- **Vitesse des animations** : bouton ⏩ ×1 / ×2 / ×3 dans la scène, ou touche V. Le choix est gardé d'une partie à l'autre.
- Le clic droit et Échap annulaient déjà une cible choisie : rien ne change là-dessus.

## Les Clans Élémentaires : marchand ambulant (v58)
- **Un marchand ambulant change de place toutes les 20 minutes**, pour toujours. Ce n'est pas un événement limité : c'est une raison de circuler entre les villages.
- **Ses 7 places** : près du Carrefour, à mi-chemin sur les trois routes, et à l'entrée de chaque village (même ceux des autres clans, où l'on peut se faire défier). Il passe par toutes les places dans un ordre mélangé, jamais deux fois de suite au même endroit.
- **Sur la carte** : sa roulotte bâchée, un âne et le marchand avec sa lanterne, une étiquette qui donne le temps restant, et un point clignotant sur la mini-carte. Un message annonce chaque nouvelle place, et le guide propose une astuce qui y mène.
- **3 échanges par passage**, chacun une fois par joueur, tirés parmi ces genres :
  - matériau d'un clan contre celui d'un autre (60 → 40) ;
  - essence contre matériau (500 → 45) ;
  - essence contre ressource rare (1 100 → 2) ;
  - matériau contre éclats (90 → 18) ;
  - éclats contre essence (30 → 650) ;
  - une ressource rare contre une autre (3 → 2).

  Le matériau des autres clans servait jusqu'ici surtout à améliorer les cartes des autres éléments.
- **Sans réseau ni état serveur** : sa place et ses offres se déduisent de l'heure (`shared/clans/marchand.js`), donc le client et le serveur sont toujours d'accord. Le serveur vérifie que le joueur est à côté du marchand, et garde les échanges faits dans le profil (`p.marchand`).
- **Fichiers** : fenêtre dans `client/src/clans/ui-marchand.js`, tests dans `tests/clansmarchand.test.mjs`, et une nouvelle étape du test de bout en bout.

## Les Clans Élémentaires : reliques d'expédition (v59)
- **Des objets passifs, comme dans Slay the Spire.** Après chaque **élite** vaincu, on choisit **une relique parmi trois**, ou on passe et on prend 40 essences à la place. Tant qu'on n'a pas choisi, on n'avance pas sur la carte. Chaque **trésor** contient aussi une relique tirée au hasard.
- **Les reliques ne durent qu'une expédition**, et une même relique ne revient pas deux fois.
- **14 reliques** :
  - au début de chaque combat : ⚓ 8 de bouclier, 🏮 +1 énergie, 🎒 +2 cartes, 🦴 +1 force, 🌿 3 épines, 🕯️ 3 brûlures aux ennemis, 💧 ennemis trempés 2 tours ;
  - pendant le combat : 🌙 3 de bouclier à chaque tour, ⏳ +1 énergie tous les 3 tours, 📌 +1 dégât par coup d'attaque ;
  - pour l'expédition : 🫗 soigne 5 PV après chaque victoire, 👛 +30 % d'essence par combat, 🧪 +10 PV max, ⛺ feux de camp 50 % plus efficaces.
- **Côté code** :
  - les effets de combat passent par le moteur (`def.reliques`), donc le serveur les rejoue à l'identique, et l'aperçu des dégâts de la v57 en tient compte ;
  - le tirage dépend de la graine de l'expédition ; le serveur valide le choix (action `expeRelique`) ;
  - les reliques sont affichées sur la carte de l'expédition et dans la scène de combat (détail au survol).
- **Fichiers** : `shared/clans/reliques.js`, tests dans `tests/clansreliques.test.mjs`.

## Les Clans Élémentaires : fiche de joueur et hauts faits (v60)
- **Fiche de joueur** :
  - pour voir celle d'un autre joueur, on clique sur son personnage sur la carte, ou sur son nom dans la liste « En ligne » ;
  - on y voit son portrait avec son apparence, son titre, son clan, sa classe, son niveau et son familier ;
  - et aussi son rang d'arène actuel et son meilleur rang, ses duels, ses combats et boss, et ses hauts faits ;
  - le serveur n'envoie que ces données publiques (message `fiche`).
- **Ma fiche** : menu ☰ → « Ma fiche et hauts faits », ou touche **H**. Elle montre la progression de chaque haut fait et permet de choisir son titre.
- **13 hauts faits à 3 paliers** (🥉 🥈 🥇), soit 39 au total. Ils sont calculés d'après le profil, donc il n'y a rien à stocker ni à réclamer :
  - combats gagnés, boss vaincus, Cauchemar, expéditions ;
  - quêtes, sanctuaires, duels, meilleur rang d'arène ;
  - tirages, collection, cartes au niveau max, dons aux projets, familiers.

  Le record d'arène est gardé d'une saison à l'autre (`stats.areneMax`). Un nouveau palier est annoncé à l'écran.
- **Titres** : chaque palier atteint débloque un titre (par exemple « Fléau des boss » ou « Maître de l'arène »). Celui qu'on choisit s'affiche **sous son nom sur la carte** et sur sa fiche. Le serveur vérifie qu'il est mérité (action `titreChoisir`).
- **Fichiers** : `shared/clans/hautsfaits.js`, `client/src/clans/ui-fiche.js`, tests dans `tests/clanshautsfaits.test.mjs`, et une nouvelle étape du test de bout en bout (choisir un titre, puis le voir depuis un autre joueur).

## Les Clans Élémentaires : passe de qualité générale (v61)
- **Cartes** :
  - les mots-clés (brûlure, trempé, affaibli, épines, force, régénération, bouclier, épuisée) sont soulignés et expliqués au survol, et les chiffres sont en gras ;
  - le niveau s'affiche en étoiles (★★☆), et les cartes de niveau 2 ou 3 ont un liseré doré ;
  - le type (Attaque / Défense / Pouvoir) est écrit en toutes lettres.
- **Deck** :
  - un tableau de bord : nombre de cartes (de 10 à 25), courbe des coûts en énergie, attaques, défenses, pouvoirs et coût moyen ;
  - sur chaque carte, un ruban « Deck ×N » et une pastille ⬆ quand on peut l'améliorer, plus un compteur des cartes améliorables ;
  - « + Deck » grisé explique pourquoi (deck plein, 4 exemplaires au maximum, ou tous les exemplaires déjà dans le deck) ;
  - la liste du deck est triée par coût, avec la couleur de l'élément, les étoiles et un « − » au survol pour retirer.
- **Amélioration, un vrai panneau** :
  - la carte au niveau actuel et au niveau suivant, côte à côte ;
  - ce qui change, ligne par ligne (« Inflige ~~4~~ → 5 dégâts ») ;
  - le coût, avec ce qu'on possède et ce qui manque, et où trouver la ressource ;
  - le bouton « Améliorer au niveau N », suivi d'une animation.
- **Combat** :
  - sous le héros, le total des **dégâts prévus au prochain tour**, bouclier déduit : « −7 PV », « 🛡 Tu bloques tout », ou ☠ si le coup est mortel ;
  - chaque intention ennemie est expliquée en toutes lettres au survol ;
  - le numéro du tour est affiché ;
  - un clic sur la pioche, la défausse ou les cartes épuisées en montre le contenu (la pioche dans le désordre, pour ne pas révéler l'ordre).
- **Carte du monde** :
  - les étiquettes ne se chevauchent plus : elles sont rangées par importance, se décalent avec un petit fil vers leur objet, et les moins importantes s'effacent ;
  - le titre d'un joueur s'affiche dans son étiquette ;
  - le nom du village devient une étiquette discrète au lieu d'un texte posé sur la place ;
  - l'ombre des nuages passe lentement (désactivée en mode léger).
- **Interface** :
  - les messages éphémères s'affichent en bas, 3 au plus, sans doublon ; leur durée dépend de leur longueur, et un clic les ferme. Ils ne cachent plus le titre des fenêtres ;
  - sur ordinateur, le chat s'efface tant qu'on ne s'en sert pas ;
  - une nouvelle fenêtre **« Comment jouer »** (menu ☰ ou touche **?**) présente en 4 onglets les commandes et raccourcis, chaque ressource (à quoi elle sert, où la trouver), les statuts de combat et les systèmes du monde.
- **Bugs corrigés en route** :
  - un conflit de style entre les reliques d'expédition (v59) et la grille de la forge, qui partageaient le même nom de classe ;
  - un empilement de calques qui aurait pu rendre le bouton ✕ des fenêtres impossible à cliquer.

## Les Clans Élémentaires : passe de son (v62)
- **Nouvelle musique composée en direct** (`client/src/clans/musique.js`), sans aucun fichier audio. Elle remplace les pistes `.ogg` dans les Clans ; l'Arène garde les siennes.
  - Instruments doux : nappes d'accords en triangle légèrement désaccordées, mélodie (kalimba, harpe, cloches ou flûte selon le lieu), basse ronde en sinus, percussions feutrées. Le tout passe dans une réverbération de 3 s et un écho filtré.
  - Les mélodies se promènent dans une gamme pentatonique : pas de fausse note, et jamais tout à fait la même chose.
  - **Un morceau par lieu** :

    | Lieu | Ambiance |
    |---|---|
    | Carte et Carrefour | calme et lumineux, kalimba |
    | Terres de Braise | plus sombre, harpe, tambour lointain |
    | Lagons d'Azur | aérien, cloches avec écho |
    | Sylves d'Émeraude | flûte, plus enjoué |
    | Combat | 96 BPM, basse en croches |
    | Boss et élites | 104 BPM, plus tendu |

  - On passe d'un morceau à l'autre en fondu, avec 3,5 s d'attente en franchissant une frontière pour ne pas hacher.
  - Mixage vérifié par rendu hors ligne : graves et médiums équilibrés, presque pas d'aigus (moins de 1 % de l'énergie au-dessus de 4 kHz, donc rien de fatigant au casque), niveau un peu sous les anciennes pistes.
- **Ambiances refaites** :
  - Terres de Braise : le grésillement aigu de la lave a disparu, remplacé par un grondement sourd, des crépitements feutrés et quelques « bloup » de lave ;
  - Lagons d'Azur et Sylves d'Émeraude : le souffle aigu est remplacé par des bandes plus douces.
- **Effets plus doux** : dans les Clans, les effets passent par un filtre qui coupe au-dessus de 5,5 kHz. La carte jouée a un nouveau son (froissement et petite note de l'élément), et la fanfare et le tic sont adoucis.
- **Réglages du son** : menu ☰ → Son, avec trois curseurs (musique, ambiance, effets), gardés dans le navigateur, et un bouton pour tout couper. La touche M coupe toujours le son, avec un message pour le confirmer.

## Les Clans Élémentaires : nouvelles polices (v63)
- **Nunito** pour tout le texte, les chiffres et les étiquettes de la carte, avec des chiffres à largeur fixe (`tabular-nums`) pour que les compteurs ne sautent pas. La police pixel (Pixelify Sans) rendait les chiffres difficiles à lire : elle est retirée partout.
- **Fredoka** pour les titres et les gros chiffres du combat : énergie, PV, dégâts qui s'envolent, intentions, bannières. Elle est arrondie et très lisible, et garde un côté jeu.
- **Hébergées par le jeu** dans `client/public/clans/polices/` (licence OFL, fichiers de licence joints). Il n'y a plus d'appel à Google Fonts : les polices se chargent plus vite et fonctionnent partout. Les deux graisses principales sont préchargées.
- La page d'administration utilise les mêmes polices.

## Les Clans Élémentaires : plusieurs decks enregistrés (v64)
- **3 emplacements de deck**, nommés par défaut ⚔️ Expédition, 🏟️ Arène et 💀 Cauchemar. On peut les renommer avec ✏️ (20 caractères au plus).
- **Changer de deck en un clic** depuis trois endroits :
  - la fenêtre du deck, en haut ;
  - le départ d'une expédition, juste avant de choisir le palier ;
  - la fenêtre de l'arène, avant de chercher un adversaire.
- **Fonctionnement** :
  - le deck actif reste `p.deck`, donc le combat, l'arène, les duels et les Reflets n'ont pas changé ;
  - `p.decks` garde les autres emplacements ;
  - un emplacement vide commence comme une copie du deck actuel ;
  - un deck enregistré qui n'est plus valable (une carte qu'on n'a plus) est nettoyé, et refusé s'il lui reste moins de 10 cartes ;
  - on ne peut pas changer de deck pendant une expédition.
- **Actions serveur** : `deckChoisir` et `deckRenommer`. Tests dans `tests/clansdecks.test.mjs`, plus une nouvelle étape du test de bout en bout.

## Les Clans Élémentaires : monstres animés et décors vivants (v65)
- **Les monstres** :
  - chacun respire à son propre rythme : respiration irrégulière, léger balancement, et l'illustration qui « vit » dans son cadre (zoom lent) ;
  - les élites et les boss ont une aura qui pulse sous leurs pieds ;
  - en dessous d'un tiers de leurs PV, ils halètent et une lueur rouge bat dans leur cadre ;
  - quand ils sont touchés : éclair blanc puis rouge, recul et rotation, avec un court arrêt sur image sur les gros coups (15 dégâts ou plus) ;
  - à leur mort, ils s'illuminent, se fendent, s'effondrent et soulèvent de la poussière, en plus des éclats existants.
- **Les sorts** :
  - le premier coup d'une carte de Feu, d'Eau ou de Plante part du héros en **projectile** lumineux avec une traînée, en arc plus ou moins haut selon l'élément ;
  - chaque élément a sa **signature d'impact** :
    - Feu : explosion, onde orange, braises qui montent ;
    - Eau : éclaboussure qui retombe et vaguelette au sol ;
    - Plante : feuilles qui tourbillonnent et pétales qui montent.
- **Les décors vivent**. Les effets sont calés sur l'image du décor, quel que soit l'écran :

  | Lieu | Ce qui bouge |
  |---|---|
  | Terres de Braise | le cratère et la lave au sol rougeoient en respirant, le volcan fume |
  | Lagons d'Azur | des reflets glissent sur la mer, le reflet de la lune tremble, des oiseaux passent au loin |
  | Sylves d'Émeraude | les rayons de lumière se balancent |
  | Arène (duels) | les torches vacillent |

## Les Clans Élémentaires : icônes des ressources (v66)
- **8 icônes dessinées en SVG** remplacent les émojis, qui prêtaient à confusion : 🔥 servait à la fois aux braises et au Feu, ✨ à l'essence et aux pouvoirs, ⚫ ne ressemblait à rien.

  | Ressource | Icône |
  |---|---|
  | Essence | pièce d'or qui brille |
  | Éclats | cristaux bleus |
  | Braises | charbon fendu de lave avec sa flamme |
  | Perles | perle nacrée sur une vague |
  | Sève | goutte verte avec une feuille |
  | Cristal de lave | gemme rouge taillée |
  | Perle noire | perle sombre aux reflets irisés |
  | Graine d'or | graine dorée qui germe |

  Même style pour toutes : lumière en haut à gauche, contour sombre et ombre portée. Le nom de la ressource s'affiche au survol.
- **Partout** : barre du haut, coûts, récoltes, butins, bilans, marchand, projets, passe, aide, amélioration des cartes. Elles sont posées une fois dans la page (sprite SVG, `client/src/clans/ui-icones.js`) et réutilisées via `ICO_RESS`.
- La barre du haut tient toujours sur une ligne à partir de 1 280 px de large.
- **Test stabilisé** : « partie en ligne : on rejoint… » (Arène) échouait environ 1 fois sur 15, quand le joueur apparaissait contre un bâtiment qui bloquait la direction testée. Le test essaie maintenant les quatre directions. 0 échec sur 10 passes complètes.

## Les Clans Élémentaires : cartes par rareté (v67)

La rareté d'une carte se voit au premier coup d'œil, partout où une carte s'affiche (deck, tirages, forge, main de combat, amélioration, duel) :

- **un cadre par rareté** : fer gris pour les communes, bleu argent pour les rares, violet lumineux pour les épiques, or avec un halo pour les légendaires ;
- **une gemme de rareté** posée sous l'illustration (blanche, bleue, violette ou orange) ; celle des légendaires pulse doucement ;
- **une couronne dorée** au-dessus des cartes légendaires ;
- **un reflet** qui passe de temps en temps sur l'illustration des épiques et des légendaires ;
- le nom est posé sur un bandeau, et le mot de la rareté (« Épique », « Légendaire »…) prend sa couleur ;
- au tirage, une épique ou une légendaire apparaît avec un éclat.

Tout est en CSS (`style.css`, section v67) : `carteHTML` ajoute seulement la gemme (`.gemme`) et le nom de rareté (`.rarNom`).

## Les Clans Élémentaires : chaque classe a ses cartes (v68)

Un Mage ne joue plus les cartes du Combattant, du Tireur ou de l'Escrimeur (et inversement) :

- **à l'autel**, les cartes des autres classes ne sortent plus jamais ; on tire ses propres cartes de classe, celles de son élément et les neutres ;
- **dans le deck**, une carte d'une autre classe est refusée (« Cette carte est réservée à la classe … ») ; les decks enregistrés l'oublient aussi ;
- **les anciens profils** : au chargement, les cartes d'autres classes déjà possédées sont changées en éclats (valeur de rareté × exemplaires × niveau), retirées des 3 decks, et un deck devenu trop petit est complété avec les cartes de base. Un message prévient le joueur une fois ;
- l'aide (« Comment jouer ») rappelle la règle, et le haut fait « Collectionneur » passe à 20 / 40 / 55 cartes (un joueur ne peut plus en avoir que 57).

Code : `pourClasse` et `convertirAutresClasses` dans `shared/clans/profil.js` ; tests dans `tests/clansclasses.test.mjs`.

## Les Clans Élémentaires : l'Ascension et les branches de classe (v69)

Au **niveau 20** du compte, chaque classe se spécialise :

- **l'Épreuve d'ascension** (menu ☰ → Ascension, touche U) : un combat contre la Chimère de l'ascension (230 PV), rejoué par le serveur comme les expéditions. On peut retenter autant de fois qu'on veut ;
- **le choix de la branche**, une fois l'épreuve gagnée (définitif pour l'instant ; un objet rare permettra d'en changer plus tard) :

| Classe | Branche | Talent en plus |
|---|---|---|
| Combattant | 🛡️ Gardien | Égide : Endurci donne 10 de bouclier, chaque Défense +2 bouclier |
| Combattant | 🪓 Berserker | Furie : +1 dégât par tranche de 8 PV manquants |
| Mage | 📖 Archimage | Double arcane : Arcanes sur les 2 premiers sorts élémentaires du tour |
| Mage | 🐾 Invocateur | Esprit lié : Appel 3 au début du combat |
| Tireur | 🎯 Sniper | Œil de lynx : Visée une attaque sur deux |
| Tireur | 💣 Artificier | Poudre noire : +3 dégâts aux attaques sur tous les ennemis |
| Escrimeur | ⚜️ Duelliste | Crescendo : Enchaînement +2 par attaque déjà jouée (+2, +4, +6…) |
| Escrimeur | 🌑 Lame d'ombre | Lame sournoise : la 1re attaque du tour applique Affaibli 1 |

- **48 sorts de branche** (6 par branche : 2 rares, 2 épiques, 2 légendaires), plus puissants. On ne les obtient **qu'à l'autel**, et seulement pour **sa** branche ; ils portent un sceau violet sur la carte. Les cartes d'autres branches sont refusées dans le deck ;
- nouveaux effets : **Appel** (un allié invoqué frappe l'ennemi le plus faible au début de chaque tour), **Perds X PV**, **rage** (+1 dégât par tranche de PV manquants), **dégâts selon l'affaibli**, **double ton bouclier** ;
- les talents de branche marchent partout : expéditions, boss mondial, duels et arène ;
- la fiche montre la branche, et son titre peut s'afficher (« Archimage », « Œil de lynx »…).

Code : `BRANCHES` et les cartes dans `shared/clans/cartes.js`, `shared/clans/ascension.js`, `client/src/clans/ui-ascension.js` ; tests dans `tests/clansascension.test.mjs`. Pour les tests, `CLANS_TEST_NIVEAU=21` crée les profils au niveau 21.

Illustrations : les 48 images sont générées sur Anifusion ; en attendant leur intégration, les cartes affichent leur icône.

## Les Clans Élémentaires : montures et changement de pseudo (v70)

**Les montures** (menu ☰ → Écurie, touche N) :

| Monture | Vitesse | Niveau | Prix |
|---|---|---|---|
| 🐴 Poney des prés | +25 % | 1 | 1 500 essence |
| 🔥 Destrier de braise | +40 % | 8 | 3 000 essence + 150 braises |
| 🌊 Raie des lagons (elle flotte) | +40 % | 8 | 3 000 essence + 150 perles |
| 🦌 Cerf sylvestre | +40 % | 8 | 3 000 essence + 150 sève |
| 🐉 Dragon élémentaire | +60 % | 15 | 9 000 essence + 15 de chaque ressource rare |

- la monture se voit sous le joueur sur la carte (pixel art dessiné en code, au pas et au galop), et tous les joueurs la voient ;
- elle ne change rien en combat ; on peut en avoir plusieurs, en changer ou descendre quand on veut.

**Changer de pseudo** : dans sa fiche (touche H), le crayon ✏️ à côté du nom. Le compte (le jeton), la progression et la maison ne changent pas (la maison garde la place que lui donnait l'ancien nom). Un changement par 24 h ; un message prévient tout le monde dans le chat.

Code : `shared/clans/montures.js`, `client/src/clans/montureArt.js`, `client/src/clans/ui-montures.js`, actions `montureAcheter`, `montureChoisir` et `renommer` ; tests dans `tests/clansmontures.test.mjs`.

Correctif : un effet visuel de combat pouvait demander un cercle de rayon négatif (erreur dans la console sur téléphone).

## Les Clans Élémentaires : les illustrations des sorts de branche (v71)

Les 48 sorts de branche ont leur illustration (générées sur Anifusion, 384 × 384 en WebP dans `client/public/clans/cartes/`). « Élan du duelliste » et « Ballet de lames » ont été régénérées (la première ressemblait trop à une licence existante, la seconde avait un cadrage trop osé).

## Les Clans Élémentaires : parchemin, montures à gagner, maison posée (v72)

- **Parchemin de réorientation** (fenêtre Ascension, une fois sa branche choisie) : il se fabrique pour 6 000 essence, 200 éclats et 10 de chaque ressource rare. L'utiliser fait passer à l'autre branche de sa classe ; les sorts de l'ancienne branche deviennent des éclats et son titre disparaît. Le bouton demande une confirmation (deux clics).
- **Deux montures à gagner** (elles ne s'achètent pas et restent à vie) : 🐺 **Loup spectral** (+50 %) en battant un boss d'expédition en Cauchemar, 🦅 **Phénix doré** (+65 %, il vole) en atteignant le rang Platine (1 400 Elo) en arène. Un message prévient quand on en gagne une.
- **Poser sa maison** : dans la fenêtre de sa maison, « La poser où tu veux sur ta terre ». Un fantôme de la maison suit le joueur (vert : possible ; rouge : la raison) ; E ou « Poser ici » la pose, Échap annule. Règles (`emplacementMaison` dans `shared/clans/geo.js`) : sur la terre de son clan, hors du cœur du village, sur un terrain libre (pas de chemin, d'arbre, de rocher ni d'eau), loin des portails, de l'autel, des sanctuaires et des ouvrages, et à au moins 150 px des autres maisons posées. La première fois est gratuite, chaque déménagement coûte 1 000 essence. Le serveur garde la liste des maisons posées (`clansMaisons`) pour que deux joueurs ne se posent pas au même endroit. Les maisons posées bloquent le passage comme les autres, et les bâtiments de la parcelle (lanternes, obélisque, atelier) les suivent.

Tests : `tests/clansmaisons.test.mjs`.

## Les Clans Élémentaires : deck illustré et cartes de branche (v73)

- **Plus de cadre de couleur par rareté** : toutes les cartes ont le même cadre bronze ; la rareté se lit avec la gemme sous l'illustration, le mot coloré (« Épique », « Légendaire »…) et la couronne des légendaires.
- **Le deck façon Hearthstone** : chaque carte du deck est un bandeau avec son coût, son nom (couleur de la rareté), le nombre d'exemplaires et un morceau de son illustration en fond. Au survol, la carte entière apparaît en grand à côté ; le « − » au survol retire un exemplaire.
- **Un style à part pour les sorts de branche** (niveau 20) : chaque branche a son cadre, son fond, son bandeau et sa lueur — Berserker rouge sang (avec du sang qui coule sur l'illustration), Gardien or et ivoire, Archimage violet étoilé, Invocateur bleu spectral, Sniper vert forêt, Artificier cuivre, Duelliste bleu roi et argent, Lame d'ombre noir et violet.

## Les Clans Élémentaires : moins de boss et de marchand, des habitants dans les terres (v74)

- **Boss mondial** : le premier arrive 10 min après le démarrage du serveur, puis un toutes les **45 min** (au lieu de 2 min puis 15 min). Il reste 8 min.
- **Marchand ambulant** : il ne vient plus qu'**un passage de 20 min sur 3**, soit 20 min par heure, chaque fois à un autre endroit. Quand il est absent, il disparaît de la carte et de la mini-carte ; sa fenêtre dit dans combien de temps il revient. (Pour les tests de bout en bout : `CLANS_TEST_MARCHAND=1` côté serveur et `__marchandToujours` côté page le gardent toujours là.)
- **Les habitants** (`shared/clans/pnj.js`) : 6 PNJ par terre — un forgeron ou une herboriste, le gardien du portail, un enfant qui court partout, un conteur ou une voyante, un artisan, un garde qui fait sa ronde. Ils se promènent dans leur village (ou restent à leur poste) sur des chemins dégagés ; leur position se déduit de l'heure, donc tous les joueurs les voient au même endroit sans rien envoyer sur le réseau. Leur nom et leur métier s'affichent quand on s'approche ; **E** pour leur parler : une bulle s'affiche avec une de leurs répliques (conseils de jeu, histoire du monde, humour), et ils changent de réplique à chaque fois. Un joueur d'un autre clan se fait d'abord accueillir… fraîchement.

Tests : `tests/clanspnj.test.mjs`.

## Les Clans Élémentaires : les salles mystère (v75)

Une nouvelle salle ❓ sur la carte d'expédition (environ une sur sept, jamais au premier ni au dernier étage). On y tombe sur un événement, et il faut choisir avant de continuer :

| Événement | Choix |
|---|---|
| 🩸 L'autel de sang | offrir 15 % de ses PV pour une relique, ou passer |
| 🎩 Le marchand louche | potion (+30 % PV) ou objet mystérieux (une relique), payés avec l'essence du butin ; ou le repousser |
| 🪤 Le couloir piégé | foncer (−12 % PV, +70 essence) ou avancer prudemment (une chance sur deux de se blesser un peu) |
| 🧰 Le coffre scellé | le forcer (60 % : gros butin ; 40 % : il explose) ou le laisser |
| 🤕 Le voyageur blessé | le soigner (−10 % PV, des ressources rares) ou lui laisser de l'eau (+15 essence) |
| ⛲ La source élémentaire | boire (+25 % PV) ou s'y baigner (+8 PV max pour l'expédition) |
| 🪙 La fontaine aux vœux | jeter 40 essence (une chance sur deux d'en gagner 130) ou faire un vœu |

L'événement et son hasard se tirent de la graine de l'expédition : le serveur applique le choix, le client affiche la même chose. Code : `shared/clans/mystere.js`, action `expeMystere` ; tests dans `tests/clansmystere.test.mjs`.

## Les Clans Élémentaires : les quêtes des habitants (v76)

Chacun des 18 habitants a une quête (une seule fois par joueur). Un **« ! »** jaune au-dessus d'un habitant : il a une quête pour toi ; un **« ? »** gris : elle est en cours ; un **« ? »** doré : elle est prête, va le voir. **E** ouvre son dialogue : accepter, puis rendre la quête pour être payé (essence, éclats, ressources rares).

- Deux sortes de quêtes : celles qui avancent toutes seules avec les mêmes événements que les quêtes du jour (combats, boss d'un territoire précis, tirages, filons, arène, sanctuaire, boss mondial, projet du clan, récoltes, améliorations, **salles mystère**), et celles où il faut **apporter** des ressources (cristaux, braises, perles, sève).
- On peut aider les habitants de toutes les terres, pas seulement les siens.
- Finir les 6 quêtes d'un village donne le titre **« Ami des Terres de Braise / des Lagons d'Azur / de la Sylve »** (à afficher depuis sa fiche).
- La fenêtre des quêtes montre les quêtes d'habitants en cours et combien restent à découvrir.

Code : `shared/clans/quetesPnj.js`, `client/src/clans/ui-pnj.js`, actions `pnjAccepter` et `pnjRendre` (il faut être près de l'habitant) ; tests dans `tests/clansquetespnj.test.mjs`.

## Les Clans Élémentaires : décorer sa maison (v77)

Dans la fenêtre de sa maison, **🎨 La décorer** : 4 emplacements autour de la maison, une décoration par emplacement, visible par tous les joueurs (purement cosmétique). On achète une décoration une fois, puis on la pose, l'enlève ou la change quand on veut.

| Emplacement | Décorations |
|---|---|
| Clôture (devant, de part et d'autre de l'allée) | barrière de bois (400), muret de pierre (900), grille en fer forgé (1 600 + 20 éclats) |
| Jardin (deux massifs devant) | parterre de fleurs (300), potager (500), jardin élémentaire (1 200 + 10 éclats : fleurs de lave, coraux ou champignons lumineux selon le clan, qui scintillent) |
| Statue (à gauche) | guerrier (1 500), fontaine animée (2 000), dragon (niveau 15 : 3 500 + 5 de chaque ressource rare, il crache du feu), **trophée du champion** (à gagner : rang Or en arène) |
| Bannière (à droite, elle ondule) | bannière du clan (300), étendard doré (1 000 + 10 éclats), **étendard de ta branche** (à gagner : choisir sa branche) |

Code : `shared/clans/deco.js` (règles), `client/src/clans/decoArt.js` (dessin), `client/src/clans/ui-deco.js` (fenêtre), actions `decoAcheter` et `decoPoser` ; les décorations voyagent avec les infos des joueurs (index 12 ; la branche en 13). Tests : `tests/clansdeco.test.mjs`.

## Les Clans Élémentaires : les expéditions en groupe (v78)

À 2 ou 3 joueurs (de n'importe quels clans) :

- **Former le groupe** : au portail, la fenêtre d'expédition liste les joueurs proches ; « inviter » leur envoie une invitation (Rejoindre / Non merci, 30 s). Celui qui invite devient le **chef** 👑.
- **Partir** : le chef choisit le palier (il doit être débloqué pour chaque membre). Tout le monde part sur **la même carte**.
- **Avancer** : le chef choisit chaque salle, quand tous ont fini leur combat ou leur choix. Chacun affronte les **mêmes monstres** avec son propre deck ; les trésors, reliques, feux de camp et salles mystère s'appliquent à chacun. Le panneau du groupe montre les PV et l'état de chaque membre (prêt, en combat, choisit, à terre).
- **À terre** : un membre vaincu ne perd pas son butin. Il suit le groupe sans combattre, et le prochain **feu de camp le relève** avec 30 % de ses PV. Si tout le groupe est à terre, l'expédition est perdue (moitié du butin, comme en solo).
- **Le boss** : si au moins un membre bat le boss, **tout le groupe gagne**, y compris ceux à terre.
- **Butin** : **+25 % par compagnon** (+50 % à trois).
- **Quitter** : un membre peut quitter le groupe ou abandonner à tout moment ; une déconnexion le fait partir aussi. S'il ne reste qu'un joueur, il continue seul. Si le chef part, le suivant devient chef.

Code : messages `groupeInviter`, `groupeRepondre`, `groupePartir`, `groupeEntrer`, `groupeQuitter` dans `server/src/ClansRoom.js` ; règles d'expédition (à terre, relève, bonus) dans `shared/clans/expedition.js` ; interface dans `client/src/clans/ui-groupe.js`. Tests : `tests/clansgroupe.test.mjs` et l'étape « Expédition en groupe » du test de bout en bout.

## Les Clans Élémentaires : le parcours d'accueil, les personnages et le compte (v79)

**Parcours d'accueil** : le guide du début est maintenant mené par les PNJ de ta terre, en 6 étapes, chacune avec sa récompense : parler au conteur, faire son premier tirage à l'autel, ajouter la carte à son deck (artisan), gagner un premier combat au portail, récolter sa parcelle (garde), puis revenir voir le conteur, qui offre la **monture poney**. Les étapes faites sont validées toutes seules ; les joueurs qui avaient déjà combattu sautent le parcours. Code : `shared/clans/parcours.js`, action `parcours`. Tests : `tests/clansparcours.test.mjs`.

**Plusieurs personnages** (4 au maximum, un par emplacement) : menu ☰ → **👥 Personnages et compte**. On y voit ses personnages (clan, niveau), on passe de l'un à l'autre, et « Nouveau personnage » ramène au choix du clan sans rien effacer.

**Retrouver son compte sur un autre appareil** : la même fenêtre affiche ton **code de compte** (du type `K7QF-2XMB`). Sur l'autre PC ou le téléphone, sur l'écran du choix du clan (ou dans cette fenêtre), entre ce code dans « J'ai déjà un compte » : tous tes personnages reviennent. Correctif : le profil Clans complet pouvait dépasser la taille acceptée par la sauvegarde du compte et n'était pas envoyé ; le compte ne garde plus que la clé de chaque personnage (le profil reste sur le serveur). Code : `client/src/clans/ui-compte.js`, `client/src/compte.js` (clé `clansPersos`).

**Fluidité sur téléphone** : obstacles rangés par ligne, cache du territoire et des maisons, mesures de texte gardées en mémoire, filons et PNJ calculés une seule fois par image. En mode léger (petits écrans ou appareils lents), une image sur deux est sautée et il y a deux fois moins de particules.

## Les Clans Élémentaires : nouveaux monstres et Grimoire (v80)

**18 nouveaux monstres** (13 par terre au lieu de 7) :

| Terre | Ordinaires | Rare | Élite | Boss |
|---|---|---|---|---|
| Terres de Braise | Scarabée de braise, Chaman des braises, Chauve-souris ardente | Djinn des cendres | Golem d'obsidienne | Roi-scorpion des cendres |
| Lagons d'Azur | Grenouille-bulle, Prêtresse de l'écume, Requin-scie | Esprit des marées | Crocodile des mangroves | Reine du corail |
| Sylve d'Émeraude | Araignée des bois, Druide fou, Sanglier moussu | Grand-duc sylvestre | Ours des ronces | Colosse des racines |

- Le rare, l'élite et le boss ont maintenant **deux versions** chacun ; l'expédition tire l'une ou l'autre (le rare et l'élite peuvent changer d'un étage à l'autre).
- Deux nouvelles intentions de monstres : **💚 soin** (soigne tout son groupe) et **🛡️👥 protection** (bouclier pour tout son groupe). Les soigneurs sont à abattre en premier.
- Équilibrage vérifié avec le bot des tests : au palier I, le deck de départ gagne entre 4 et 10 expéditions sur 20 selon la terre et la classe, comme avant.
- Les 18 nouveaux monstres ont leur illustration (`client/public/clans/monstres/*.webp`, 384 × 384), dans le même style que les autres.

**Le Grimoire** (menu ☰ → 📚 Grimoire, touche G), en trois onglets :

- **Cartes** : toutes les cartes que ta classe (et ta branche) peut obtenir, rangées par rareté ; les inconnues sont cachées.
- **Bestiaire** : par terre, les monstres déjà vaincus avec leur illustration, leurs PV de base, leurs intentions dans l'ordre et le nombre de victoires ; les autres restent des « ??? » avec seulement l'endroit où on les croise.
- **Récompenses** (à réclamer une fois) : 25 / 50 / 75 / 100 % des cartes, toutes les cartes d'une rareté, la moitié puis tous les monstres d'une terre, les trois titans du Cauchemar, tout le bestiaire. Deux titres à gagner : « Maître du grimoire » (100 % des cartes) et « Savant des bêtes » (tout le bestiaire). Une pastille et un message préviennent quand une récompense est prête.

Le bestiaire commence à zéro pour tout le monde (les anciens combats n'étaient pas notés). Code : `shared/clans/grimoire.js`, `client/src/clans/ui-grimoire.js`, action `grimoireReclamer`, monstres dans `shared/clans/monstres.js` (`autres`, `variante`, `tousDe`). Tests : `tests/clansgrimoire.test.mjs` et l'étape « Grimoire » du test de bout en bout.

## Les Clans Élémentaires : ne plus jamais perdre un personnage (v81)

- **Code de personnage** : dans ☰ → 👥 Personnages et compte, chaque personnage a un bouton **🔑 Code** (son code secret, à garder pour soi). Le champ « Reprendre un personnage avec son code » le recharge sur n'importe quel appareil.
- **Retrouver un compte ne fait plus perdre de personnage** : la liste des personnages de l'appareil est maintenant fusionnée avec celle du compte (avant, elle était remplacée : entrer le code d'un autre appareil pouvait faire « disparaître » le personnage de celui-ci, qui restait pourtant sauvegardé sur le serveur).
- **Panne de la sauvegarde** : si la base (Upstash) ne répond pas, le jeu ne repart plus d'un personnage vide. Il garde la copie locale si elle existe, sinon il affiche « la sauvegarde ne répond pas, réessaie ». Et avant de créer un personnage, le serveur vérifie une dernière fois qu'aucun personnage n'est déjà gardé sous ce code.
- **Test d’écriture au démarrage** : le serveur essaie d’écrire dans Upstash et affiche dans les logs Render « ✅ Écriture dans la base : OK » ou une grosse alerte si le jeton est en lecture seule (c’était le cas : rien n’était enregistré).
- **Retrouver un personnage perdu à la main** : dans la console Upstash (Data Browser), chercher les clés `arene:stats:clans:*` ; la valeur contient le nom du personnage (`"nom"`), et la fin de la clé (après `clans:`) est son code, à coller dans « Reprendre un personnage avec son code ».

## Un seul jeu : Les Clans Élémentaires (v82)

- Les autres jeux du site (l'Arène des éléments, le Conclave des éléments, Zone Morte, Les Ombres de Baker Street) sont retirés : leur code, leurs images, leurs sons, leurs salles de serveur, leurs adresses d'API et leurs tests.
- Les Clans sont maintenant la page d'accueil (`/`) ; l'ancienne adresse `/clans/` redirige vers `/`.
- Le compte du site ne garde plus que le pseudo et la liste des personnages des Clans ; les anciennes données des autres jeux sont oubliées au démarrage du serveur.
- Phaser n'est plus utilisé : la page est bien plus légère.

## Confort (v83)

- **Fête du niveau** : à chaque niveau gagné, grande animation dorée au centre (on clique au travers), avec ce que le niveau débloque (Ascension au 20…).
- **Niveau maximum 60** (il passera à 80 avec le chapitre 2).
- **Messages** : ils s'empilent en haut à droite, ne bloquent plus jamais un clic (on clique au travers), et restent dans l'historique 🔔 de la barre du haut (40 derniers).
- **Decks** : 2 exemplaires d'une même carte au plus, 1 pour une légendaire. Les doublons au-delà deviennent des éclats. Le deck de départ passe à 2 Frappe, 2 Garde, 2 cartes de classe et 6 cartes d'élément ; les anciens decks sont remis aux règles au chargement (le joueur est prévenu).
- **Terres de Braise et Sylve d'Émeraude** : moins de lave, de mares et de décor qui barrent le passage, chemins plus dégagés (l'Azur ne change pas).
- **Supprimer un personnage** : bouton 🗑️ dans ☰ → Personnages et compte, avec confirmation ; au-delà du niveau 10, il faut retaper le nom du personnage. Le serveur efface son profil et sa maison (`POST /api/clans/supprimer`, avec le code du personnage).
- **Apparences exclusives** : au lieu de « verrouillé », la fenêtre dit quand la pièce revient (« ce mois-ci : niveau 30 du passe » ou « revient dans 2 mois »).
- Tests : `tests/clansconfort.test.mjs`.

## Combat (v84)

- **Nouvelles mécaniques de cartes** (combat et duel) : **piocher**, **dupliquer** (une copie *éphémère* d'une carte de ta main, au hasard : elle disparaît une fois jouée ou en fin de tour, bordure bleue « ✨ copie »), **réduction** (les cartes de ta main coûtent 1 de moins ce tour).
- **15 nouvelles cartes** : Réflexion, Miroir, Souffle vif, Écho, Grimoire infini (légendaire) ; Brasier vif, Flammes jumelles (Feu) ; Reflux, Courant porteur (Eau) ; Bouture, Germination (Plante) ; Plan de bataille (Combattant), Reflet arcanique (Mage), Carquois plein (Tireur), Estocade vive (Escrimeur).
- **4 énergie** dès qu'on a choisi sa branche d'Ascension (niveau 20), partout : expéditions, boss, duels, arène.
- **Familiers en duel et en arène** : même coup de pouce qu'en expédition (ce qui vise « les ennemis » vise l'adversaire). Les talents de classe et de branche y étaient déjà actifs.
- **Duels sur une terre tierce** : on peut défier un ennemi sur sa propre terre (comme avant) ou sur la terre d'un troisième clan (ex. Feu contre Eau sur la Sylve) ; jamais chez lui ni au Carrefour.
- **Défaite en duel** : le perdant est étourdi 10 s (il ne peut plus bouger, on ne peut pas le défier), puis renvoyé devant sa maison.
- Tests : `tests/clansmecaniques.test.mjs`.

## Interface (v85)

- **Création du héros en 3 étapes** (Clan → Classe → Nom), avec un aperçu du personnage qui suit les choix (sprite, PV, énergie, talent). Plus de fenêtre de confirmation du navigateur : un récapitulatif et un bouton « Entrer dans le monde ». Sur téléphone, cartes compactes.
- **Parcelle refaite** : jauge de réserve (heures produites / stockage), bouton Récolter qui pulse quand la réserve est pleine, bonus en pastilles, bâtiments avec niveaux en pastilles, comparaison « maintenant → niveau suivant », coûts en rouge si on n'a pas assez, bouton grisé tant qu'on ne peut pas payer.
- **Decks conseillés** (bouton 📋 dans la fenêtre du deck) : pour chaque clan et chaque classe, 3 styles (Assaut, Rempart, Maîtrise ; un « ⭐ Conseillé » pour débuter), 14 cartes chacun avec assez d'attaques et de défenses, la composition complète (🔒 = pas encore possédée) et « Utiliser ce deck » (les cartes manquantes sont remplacées par les meilleures qu'on a). Code : `shared/clans/decksConseilles.js`, action `deckConseille`.
- **Titres stylés** : sur la carte, le titre devient un ruban à l'allure de son rang (bronze, argent, or, légende) et de son thème ; le titre de branche Berserker est rouge sang avec des gouttes qui coulent, l'Archimage a des runes, l'Artificier des étincelles… Même style dans les fiches. Code : `shared/clans/titresStyle.js`.
- Tests : `tests/clansinterface.test.mjs`.

## Cosmétiques : ailes, armes, capes (v86)

- Trois nouveaux emplacements dans 👕 Apparence, **purement esthétiques** (aucun bonus, aucun effet en combat ni en PvP) :
  - **Ailes** : papillon, fée, ange (à acheter) ; démon (25 boss), dragon (3 boss du Cauchemar), phénix (rang Diamant en arène). Elles battent en marchant.
  - **Armes** (dans la main) : épée, hache de guerre, bâton de mage, trident (à acheter) ; arc doré (25 duels), faux du Cauchemar (1 boss du Cauchemar).
  - **Capes** : écarlate, azur, forêt, nuit, étoilée (à acheter) ; royale (rang Or en arène), du héros (200 combats). Une cape choisie remplace la cape de classe de l'Escrimeur.
- Le personnage est maintenant dessiné dans des cases de 24 px (le corps garde ses 16 px au milieu) pour laisser la place aux ailes et à l'arme.
- Le code d'apparence passe à 7 parties (`tenue.cheveux.coiffe.aura.ailes.arme.cape`) ; les anciens codes à 4 parties restent lus (sans ailes, arme ni cape).

## Chapitre 2 : les Terres Brisées (v87)

- **Une nouvelle région neutre au sud de la carte** (la carte passe à 3200 × 2880) : dalles, cristaux, roche noire et gouffres violets infranchissables. On y entre par la **Porte de la Faille**, au bout de la route du Carrefour, à partir du **niveau 30** (refusé par le client et par le serveur). Aucun clan ne la possède : pas de sanctuaire, pas de duel de territoire.
- **Le Portail de la Faille** ouvre une expédition à 3 paliers + Cauchemar (niveau 30 requis, en groupe aussi pour chaque membre) contre des **monstres fusionnés** (trois éléments à la fois) : 7 normaux, 2 rares, 2 élites, 2 boss (Le Cœur de la Faille, L'Archonte du vide) et un titan du Cauchemar, **Le Néant originel**. Nettement plus durs que dans les trois terres.
- **Deux nouvelles ressources** : les Fragments de faille (le matériau de la région) et l'**Éclat du vide** (sa ressource rare).
- **Les invocations** : 4 nouvelles cartes forgées à l'atelier avec des éclats du vide — Loup spectral, Golem de pierre (épiques), Esprit de la faille, Dragonnet élémentaire (légendaires), jouables par tous les clans. Une invocation pose un **allié** à côté du héros : il frappe un ennemi au début de chacun de tes tours et **encaisse les coups à ta place** tant qu'il tient debout. Ses PV et ses dégâts montent avec le niveau de la carte. Ça marche aussi en duel (l'allié protège son maître).
- **L'histoire** : 5 habitants veillent sur la Faille (Orin le veilleur à la porte, Lyra l'archiviste, Varda la forgeronne du vide, Sel l'ermite, Nyx l'oracle). Leurs 5 quêtes se suivent et racontent l'origine des trois clans ; elles s'ouvrent aux **niveaux 30, 40 et 50**, et la dernière demande d'abattre le Néant originel dans le Cauchemar. Les finir toutes donne le titre « **Héros de la Faille** ».
- **Niveau maximum : 80** (au lieu de 60).
- Correctif : l'écran de combat ne plante plus quand la région n'a pas de boss mondial.
- Tests : `tests/clanschapitre2.test.mjs`.

## Niveaux rééquilibrés (v88)

- Le niveau vient maintenant de l'**XP** : 1 XP par combat gagné, 4 XP par boss vaincu (avant : 1 niveau pour 6 victoires et **2 niveaux par boss**, ce qui faisait monter beaucoup trop vite).
- **La courbe ralentit** : chaque niveau coûte un peu plus que le précédent. Repères : niveau 10 = 40 XP, 20 = 112, 30 = 214, 50 = 508, 80 = 1174.
- Le niveau reste recalculé à chaque connexion depuis les victoires et les boss (rien à migrer). Les joueurs actuels redescendent (ex. 100 victoires + 25 boss : 67 → 28), mais gardent tout ce qu'ils ont déjà débloqué ou acheté (branche d'Ascension, montures, décorations).
- Au survol du niveau dans la barre du haut : l'XP actuelle et l'XP qu'il faut pour le niveau suivant.
- La liste « Revenir à un personnage » n'affiche plus de niveau au-delà du maximum (un vieux « niv. 100 » d'avant la v83 traînait dans certains comptes), et le serveur plafonne ce chiffre.

## Correctifs des Terres Brisées (v89)

- **Bug majeur corrigé** : en approchant de la Faille, le dessin de la carte plantait à chaque image (la couleur de la région manquait) → plus de portail, plus de minimap, plus de noms ni de « ! » au-dessus des habitants. Tout s'affiche de nouveau.
- La lisière de la Faille n'est plus une ligne droite : elle ondule et forme une fissure sombre qui luit en violet.
- Décor propre à la région : cristaux violets, roches d'obsidienne, arbres morts aux lueurs violettes, obélisques brisés (au lieu des cristaux rouges et des cactus du Feu).
- Le bandeau affiche « 🌀 Les Terres Brisées » en entrant (au lieu de « Le Carrefour »).
- Tests : variable `CLANS_TEST_NIVEAU` pour lancer le serveur de test avec un personnage de haut niveau.

## Chapitre 2, la finition (v90)

- **Boss mondial des Terres Brisées : le Gardien du Néant** (240 PV par manche, colosse d'obsidienne fendu de cristaux). Il prend un tour sur quatre dans la rotation des boss mondiaux, mais seulement si au moins un joueur de niveau 30 ou plus est connecté (sinon on passe à une terre de clan). Récompense : essence, éclats et Éclats du vide.
- **Haut fait « La Faille »** (🥉 1, 🥈 3, 🥇 5 parties de l'histoire finies) et ses titres : Voyageur de la Faille, Arpenteur du vide, Sauveur des trois clans.
- **Trois cosmétiques à gagner dans l'histoire** : la tenue Voile de la Faille (1re partie), la Cape de la Faille (3 parties), les Ailes de cristal du vide (histoire finie).
- Les habitants de la Faille portent maintenant le Voile de la Faille (violet).
- En duel, l'invocation s'affiche avec le portrait de sa carte.
- Tests : `CLANS_BOSS_TOUR` choisit la terre du premier boss mondial.

## Deck à 20 cartes, duels à 300 PV, la Tour infinie (v91)

- **Deck : 20 cartes au moins** (30 au plus, avant 10 à 25), pour en finir avec les decks de 10 petites cartes à 0/1 qui détruisaient tout. Le deck de départ fait 20 cartes (2 Frappe, 2 Garde, 2 Coup double, 2 × chaque carte de départ de la classe + 2 × une carte commune de classe, 8 cartes de son élément). Les decks trop courts (actif et enregistrés) sont complétés automatiquement à la connexion avec les cartes de départ, offertes s'il le faut. Les decks conseillés font 20 cartes.
- **Duels à 300 PV** (± la classe : Combattant 330, Mage 280, Tireur et Escrimeur 300), au lieu de 40 à 120. Un duel dure maintenant une dizaine de tours chacun ; la limite passe à 50 tours.
- **La Tour infinie** (menu ☰ ou touche **T**, dès le niveau 10) : 100 étages, **5 monstres** par combat (les sorts de zone brillent), un **boss avec 2 gardes** (étages 10, 30, 50, 70, 90) ou **4 gardes** (20, 40, 60, 80, 100). Les étages sont les mêmes pour tout le monde ; on monte un étage à la fois, PV pleins, essais illimités, combat rejoué par le serveur. Récompenses à chaque étage (essence, éclats tous les 5 étages, ressource rare et Éclats du vide aux boss), et des cosmétiques : Tenue de la Tour (25), Cape des cimes (50), Lame des cent marches (75), Ailes du sommet (100). Haut fait « La Tour » (10 / 50 / 100 étages).
- Tests : `tests/clanstour.test.mjs`.

## La Tour : saison mensuelle et classement (v92)

- **Remise à zéro chaque mois** (le 1er à minuit UTC, comme l'arène) : on regrimpe depuis l'étage 1 et on regagne les récompenses d'étage. Le **record** (meilleur étage de tous les temps) est gardé : c'est lui qui débloque les cosmétiques et le haut fait « La Tour », qui restent acquis.
- **Classement du mois** dans la fenêtre de la Tour : top 20 (à étage égal, le premier arrivé passe devant), ta place, le nombre de jours avant la remise à zéro, et le podium du mois précédent. Gardé dans la base comme l'arène (`clansTour`, `clansTourPalmares`).

## Téléphone, amis, cadeau du jour (v93)

- **Téléphone** : en combat, 4 ou 5 ennemis (la Tour) sont réduits pour tenir à l'écran, l'annonce « Au prochain tour » passe à droite du héros (elle n'est plus cachée par la jauge d'énergie) ; 2 notifications à la fois au plus (le reste est dans 🔔) ; le guide se replie en touchant son titre.
- **Amis** (menu ☰ ou touche **K**, 30 au plus) : « ➕ Ajouter en ami » dans la fiche d'un joueur ; la liste montre qui est en ligne (clan, classe, niveau), avec 💬 message privé, 🤝 invitation dans son groupe d'expédition et ✕ retirer. Un petit message quand un ami se connecte. Identifiant public d'un personnage (`pid`) dérivé du jeton, sans le révéler.
- **Messages privés** : « @pseudo message » dans la discussion.
- **Cadeau du jour** (s'ouvre tout seul à la première connexion du jour, ou menu ☰) : cycle de 7 jours (essence, éclats, ressource rare du clan), **coffre le 7e jour** (1 500 essence, 100 éclats, 5 ressources rares) ; un jour raté et on repart au jour 1.
- **Quêtes de la Tour** : « Monte 2 étages » (jour) et « Monte 10 étages » (semaine), seulement à partir du niveau 10.
- **Gardien du Néant** : illustration en combat (dès réception de l'image).
- Tests : `tests/clanssocial.test.mjs`.

## Chargement plus rapide et tutoriel guidé (v94)

- **Serveur toujours éveillé** : sur Render (offre gratuite), le serveur s'endormait après 15 min sans visite et mettait 30 à 50 s à se réveiller. Il s'appelle maintenant lui-même toutes les 10 min (`/api/ping`, via `RENDER_EXTERNAL_URL` fourni par Render ; `RESTER_EVEILLE=0` pour couper). Un seul service tourne en continu, ce qui tient dans les 750 h gratuites par mois.
- **Images gardées 7 jours** dans le navigateur (au lieu de 10 min), resservies tout de suite pendant la vérification.
- **Préchargement** : une fois dans le monde, les illustrations des cartes du deck et des monstres de sa terre se chargent quand le navigateur ne fait rien : le premier combat s'affiche d'un coup.
- Le sol de la carte (gardé sur l'appareil) est repeint une fois pour tout le monde (lisière de la Faille).
- **Tutoriel guidé** (une fois par appareil, « Passer » à tout moment) : au **premier combat**, 6 bulles qui montrent la main, l'énergie, les intentions des ennemis, comment jouer une carte, le bouclier et « Fin du tour » ; à la **première ouverture du deck**, 4 bulles (collection, deck de 20 à 30 cartes, + Deck / améliorer, decks conseillés). La zone montrée s'éclaire, le reste s'assombrit.

## Équilibrage d'après les statistiques de jeu (v95)

D'après `/api/clans/equilibrage` (543 combats, 171 duels depuis la v89 ; peu de joueurs, donc à confirmer) :
- **Balle d'argent** (Sniper, légendaire) : 30 → **20** dégâts. En jeu : 116 dégâts en moyenne par tir (Visée double une attaque sur deux + trempé + niveau 3), de loin la carte la plus forte, et dans tous les duels gagnés du joueur le plus actif.
- **Combustion** (Feu, rare, 1 énergie) : ×2 → **×1,5** la brûlure de la cible. En jeu : 47 dégâts en moyenne au Cauchemar, plus qu'une légendaire à 2 énergies.
- **Plus de difficulté en haut** : les combats gagnés étaient à 100 % au palier III et à 95 % au Cauchemar. Palier III : dégâts des monstres ×1,75 → ×1,9. Cauchemar : PV ×2,6 → ×2,9, dégâts ×2 → ×2,25. Les paliers I et II ne changent pas (les nouveaux joueurs).
- Conseil : remettre les statistiques à zéro après le déploiement pour mesurer l'effet (`POST /api/clans/equilibrage/reset?cle=…`, il faut définir `JOURNAL_CLE`).

## Chapitre 3 : les Cimes Orageuses (v96)

- **Une nouvelle région neutre à l'est** (la carte passe à 4000 × 2880) : neige, glace, roc gris et crevasses bleues infranchissables ; une lisière de givre. On passe le **Col des Cimes** (par la route du Carrefour, à travers la Sylve) à partir du **niveau 50** (client et serveur). Le **Portail des Cimes** est tout au nord-est.
- **La région la plus dure du jeu** : 14 monstres (7 normaux, 2 rares, 2 élites, 2 boss : le Roi des Tempêtes et la Reine du Blizzard) et un titan du Cauchemar, **l'Œil du Cyclone**. Nouvelle intention des monstres : **⚡ paralysie** (une énergie de moins au prochain tour).
- **Nouvelle mécanique : étourdir** 💫 — un monstre étourdi perd sa prochaine action (son intention attend un tour), puis résiste un tour (pas d'étourdissement en boucle). En duel : une énergie de moins pour l'adversaire à son prochain tour.
- **4 cartes de la tempête** à forger avec des **Cristaux de foudre** : Chaîne d'éclairs, Œil de la tempête (épiques), Marteau du tonnerre, Avatar de la tempête (légendaires).
- **Ressources** : Plumes d'orage (matériau) et Cristal de foudre (rare).
- **L'histoire en 5 quêtes** (Brann au col, Aela, Torvald, Skadi, Odra) aux **niveaux 50, 60 et 70** ; la dernière demande de fermer l'Œil du Cyclone en Cauchemar. Titre « Maître des Tempêtes », haut fait « Les Cimes », Fourrure des Cimes, Cape de l'orage, Ailes de l'orage.
- **Boss mondial : le Colosse de l'orage** (1 tour sur 5, s'il y a un joueur de niveau 50+ en ligne).
- **Deux montures à gagner** : le **Lynx du vide** (Chapitre 2 : abattre le Cœur de la Faille, 4e partie) et le **Griffon des tempêtes** (Chapitre 3 : finir l'histoire), le plus rapide du jeu.
- **Niveau maximum : 100.** Les monstres des Cimes apparaissent aussi en haut de la Tour (étages 89+).
- La barre des ressources défile au lieu de pousser les boutons à la ligne.
- Tests : `tests/clanschapitre3.test.mjs`.

## Montures du Chapitre 1 et de la Tour (v97)

- **Kirin des trois clans** (vitesse 1,55) : gagné en devenant « Ami » des trois villages, c'est-à-dire en finissant les 18 quêtes des habitants du Chapitre 1.
- **Wyrm de la Tour** (vitesse 1,7) : gagné en atteignant l'étage 100 de la Tour infinie. C'est le record qui compte, donc la monture reste après la remise à zéro mensuelle.
- La fenêtre de la Tour affiche maintenant le Wyrm dans ses récompenses.
- Chaque chapitre a désormais sa monture : Kirin (1), Lynx du vide (2), Griffon des tempêtes (3).
- Petits écrans : le menu « Plus » se place toujours sous son bouton sans sortir de l'écran (même quand la barre se replie et que le bouton passe à gauche). Il défile s'il est trop haut et passe au-dessus des messages.
- **La vie se garde entre les expéditions.** On part avec ses PV actuels et on rentre avec ce qu'il en reste (au moins 1 PV, même après une défaite). Pour remonter d'un coup au maximum, il faut se reposer devant sa maison : fenêtre de la parcelle (🏠), bouton 🛌 « Se reposer ». Le serveur vérifie qu'on est bien devant la maison. Un cœur ❤️ s'affiche dans la barre quand on est blessé, et la fenêtre d'expédition prévient avant de partir. La Tour, l'arène, le boss mondial et l'épreuve d'ascension partent toujours avec les PV pleins.

## Chapitre 4 : le Désert d'Ambre (v98)

- **La région.** La carte s'agrandit encore vers l'est (4 800 × 2 880). Au-delà des Cimes, le Désert d'Ambre s'ouvre au **niveau 70** par la *Passe des Sables*, au bout du chemin qui part du centre des Cimes. On y trouve des dunes, du sable rouge, du grès et des sables mouvants infranchissables. Le décor ajoute des cactus, des rochers de grès, des colonnes brisées et des ossements géants. Au sud du désert se dresse la *Porte de la Cité ensevelie* (expéditions).
- **La mécanique : la Marque 🎯.** Les cartes du désert marquent l'ennemi. À 3 marques, elles explosent pour **20 dégâts directs**, que le bouclier n'arrête pas. Les monstres du désert font la même chose au joueur : à 3 marques, il subit 12 × la force du monstre. En duel, une explosion inflige aussi 20 dégâts à l'adversaire.
- **Les monstres.** 7 normaux, 2 rares, 2 élites et 2 boss (le Pharaon maudit, la Reine-scorpion), plus le **Soleil noir** en Cauchemar. Ils sont plus forts que ceux des Cimes. Le nouveau boss mondial est le **Sphinx d'ambre**, qui n'apparaît que si un joueur de niveau 70 ou plus est en ligne (1 tour sur 6).
- **Les ressources.** Le *sable doré* sert de matériau et la *larme d'ambre* de ressource rare.
- **Les cartes.** 4 cartes à forger à l'atelier avec des larmes d'ambre : *Sable aveuglant*, *Flèche du scarabée*, *Œil du soleil* et *Jugement du pharaon*.
- **L'histoire.** 5 quêtes aux niveaux 70, 80 et 90, avec Kesh, Neferet, Hakim, Saïa et Imhet. Le titre final est « Seigneur des Sables ».
- **Les récompenses.** Les cosmétiques *Robe des sables*, *Cape du pharaon* et *Ailes du scarabée d'or*, un haut fait « Le Désert », et la monture **Lion des sables** (vitesse 1,8, la plus rapide du jeu).

## Tour sans fin et Chapitre 5 : les Îles Célestes (v99)

**La Tour infinie ne s'arrête plus à l'étage 100.**
- Au-delà, on croise les monstres de toutes les régions (Cimes et Désert compris), et des boss qui tournent avec leurs gardes. La difficulté continue de monter.
- Récompenses : essence, éclats et larmes d'ambre. Elles sont plafonnées à l'étage 300, sauf le bonus de boss.
- Un nouveau haut fait, « Au-delà du sommet », donne des titres aux étages 125, 150 et 200 : « Au-delà du ciel », « Gardien de l'Infini » et « Légende de la Tour ».
- Le classement mensuel ne change pas.

**Les Îles Célestes (niveau 90).**
- **La région.** La carte s'agrandit encore vers l'est (5 600 px). Au-delà du désert, des îles flottent sur un vide étoilé infranchissable. On y entre par le *Pont des Étoiles*. On y trouve de l'herbe astrale, du roc de lune et des nuages solides, ainsi qu'une grande place de marbre céleste. Le décor ajoute des arbres astraux, des cristaux d'étoile, des colonnes de lune et des sphères armillaires. Les expéditions partent du *Portail de l'Observatoire*, au nord.
- **La mécanique : le Vol de vie 🩸.** Les cartes des étoiles soignent d'une part des dégâts vraiment infligés (ceux absorbés par le bouclier ne comptent pas). Les monstres des îles font pareil sur le joueur (intention `v`). Le vol de vie marche aussi en duel.
- **Les monstres.** 7 normaux, 2 rares et 2 élites, l'Archange d'argent, la Dévoreuse d'étoiles, et l'**Étoile mère** en Cauchemar. Le nouveau boss mondial est la **Baleine des étoiles** (s'il y a un joueur de niveau 90 ou plus ; elle apparaît sur la grande place).
- **Les ressources.** La *poussière d'étoile* sert de matériau et le *cœur d'étoile* de ressource rare.
- **Les cartes.** 4 cartes à forger avec des cœurs d'étoile : *Morsure astrale*, *Faux des étoiles*, *Comète vorace* et *Festin des étoiles*.
- **L'histoire.** 5 quêtes aux niveaux 90, 95 et 100, avec Elio, Astrée, Corvin, Séléné et Ysolde. Le titre final est « Gardien des Étoiles ».
- **Les récompenses.** Les cosmétiques Habit des étoiles, Cape de la voûte céleste et Ailes d'astre, un haut fait « Le Ciel », et la monture **Pégase des étoiles** (vitesse 1,85).

## Nouvelle disposition de la carte (v100)

- Le **Désert d'Ambre** est maintenant **à gauche** de la carte, à l'ouest des Terres de Braise. On y va par la *Passe des Sables*, au bout d'un chemin qui part du village du Feu.
- Les **Îles Célestes** sont maintenant **en haut**, sur toute la largeur. On y monte depuis le désert (le chemin remonte vers le nord), puis par le *Pont des Étoiles*. L'Observatoire flotte au-dessus des Lagons d'Azur.
- **Le décalage.** L'« ancien monde » (les trois terres, le Carrefour, la Faille et les Cimes) est décalé de (640, 640) (`shared/clans/decalage.js`). Son relief, son décor et ses sanctuaires sont calculés dans leurs coordonnées d'origine, donc **rien n'y change**. Seul s'ajoute le nouveau chemin vers le désert.
- **Les maisons déjà posées sont déplacées automatiquement**, une seule fois :
  - côté profils : `p.geoV` dans `completer` ;
  - côté registre des maisons : les entrées `[clan, x, y]` sans 4e élément sont lues décalées.
- La carte fait maintenant 4 640 × 3 520.
- 10 illustrations des Îles Célestes sont arrivées (les monstres de la Méduse stellaire au Chevalier de l'aube).

## Grande carte, pont du ciel, duels, bestiaire et runes (v101)

- **Grande carte du monde** (touche **C**, menu « Plus », ou clic sur la mini-carte). Elle s'ouvre en plein écran. On zoome avec la molette, en pinçant ou avec les boutons ＋ et －, et on se déplace en glissant. Le bouton 📍 recentre sur soi, le bouton 🌍 montre tout le monde. On y voit les régions, les portails, les sanctuaires, sa maison, le boss mondial, les filons, les autres joueurs et, de près, les habitants. Un clic sur un lieu y met la flèche du guide. Échap ferme la carte.
- **Pont des Étoiles.** Il monte maintenant tout droit depuis le portail des Lagons d'Azur, en haut de la carte, au lieu de passer par le désert. Les îles sont centrées au-dessus de l'Azur, et l'Observatoire est au nord-est.
- **Duel perdu.** On est d'abord renvoyé devant sa maison, sur son territoire, puis étourdi 10 secondes.
- **Bestiaire.** Chaque fiche se remplit en 3 étapes : découvert, étudié, maîtrisé ★★★.
  - Il faut 1, 10 et 25 victoires pour un monstre normal, 1, 5 et 12 pour un rare ou une élite, 1, 3 et 6 pour un boss, 1, 2 et 3 pour un titan.
  - Les PV et les intentions d'un monstre se révèlent quand sa fiche est « étudiée ».
  - Maîtriser toutes les fiches d'une région (titan compris) donne une récompense et un titre, par exemple « Dompteur des braises » ou « Chasseur d'étoiles ».

## Runes retirées, familiers, cartes de fusion, Faille sur toute la largeur (v102)

- **Les runes sont retirées**, jugées trop compliquées.
- **4 nouveaux familiers**, un par région. Comme les autres, on les obtient sur le boss de la région ou on les fabrique avec sa ressource rare.
  - Éclat du Néant (Terres Brisées) : les ennemis sont affaiblis 1 tour et brûlent (1).
  - Renardeau d'orage (Cimes) : il étourdit l'ennemi le plus costaud, qui perd sa première action.
  - Scarabéon (Désert) : il pose 1 marque sur chaque ennemi.
  - Chouette céleste (Îles) : 4 de bouclier et régénération 2.
- **12 cartes de fusion.** Chaque élément (Feu, Eau, Plante) se mêle à chaque région des chapitres 2 à 5, avec la mécanique de la région. Elles sont épiques, jouables par tous les clans, et se forgent à l'atelier avec la ressource rare de la région.
  - Néant : Flamme du Néant, Marée du Néant, Ronces du Néant (affaibli).
  - Cimes : Vapeur d'orage (étourdit), Blizzard (zone + trempé), Pin de givre.
  - Désert : Mirage ardent, Oasis, Cactus géant (marque).
  - Îles : Comète de feu, Pluie d'étoiles (vol de vie), Sève des étoiles.
- **La Faille sur toute la largeur.** Comme les îles en haut, les Terres Brisées occupent tout le bas de la carte. Le désert et les Cimes s'arrêtent à la Faille, avec un peu moins de neige et de sable. Le centre du désert et sa porte ont été remontés.

## Dégâts annoncés plus justes, aperçu en duel et en arène (v103)

- **Intentions des monstres** (`prevoirTour` dans `shared/clans/combat.js`). Les dégâts annoncés sont calculés dans l'ordre où les monstres agissent :
  - un trempé posé par un monstre augmente l'attaque des suivants, et la sienne ;
  - la force qu'un monstre gagne juste avant de frapper compte ;
  - l'invocation encaisse les coups à la place du joueur, jusqu'à tomber ;
  - un monstre qui va mourir de ses brûlures affiche « 🔥 va succomber » ;
  - les explosions de marques sont annoncées (💥).
  Une attaque renforcée s'affiche en rouge avec ↑. Le total « Au prochain tour : −X PV » suit le même calcul, et un test vérifie qu'il correspond aux vrais dégâts.
- **Duels et arène.** Comme face aux monstres, survoler une carte (ou appuyer dessus sur téléphone) affiche sur l'adversaire ce qu'elle lui fera : dégâts, ☠ si c'est mortel, bouclier retiré, dégâts à l'invocation, statuts posés (🔥 💧 🥀 🎯). Sur toi s'affichent le bouclier gagné et le soin. Le serveur fait le calcul en jouant la carte sur une copie du duel.

## Cartes de fusion illustrées (v104)

- Les 12 cartes de fusion (élément × région) ont maintenant leur illustration.

## Combats plus stylés (v105)

- **Le héros** prend son élan avant chaque attaque.
- **Impacts.** Des étincelles qui filent avec une traînée. Sur les gros coups (15 dégâts ou plus), des rayons de lumière, une onde de choc et un coup de zoom sur la scène.
- **Coup de grâce.** Un petit arrêt sur image, un flash blanc, des rayons et une onde de choc. Quand c'est un boss ou une élite, « K.O. ! » ou « Élite vaincue ! » s'affiche en grand.
- **Chiffres de dégâts.** Ils prennent la couleur de l'élément de la carte. Les coups doubles (visée) claquent en « CRITIQUE ! ».
- **Combo.** À partir de 3 coups enchaînés, un compteur « ×N COMBO » s'affiche.
- **Monstres.** Leurs attaques partent vers leur cible en traînée rouge. Les très gros coups reçus font aussi zoomer la scène.
- **PV bas.** Sous 30 % de PV, les bords de l'écran pulsent en rouge.
- **Duels et arène.** Étincelles, rayons et coup de zoom sur les gros coups.
- Ces animations sont coupées si le système demande moins d'animations (`prefers-reduced-motion`).

## Prêt pour CrazyGames (v106)

- **Filtre à grossièretés** (`shared/clans/filtre.js`), en français et en anglais. Il repère aussi les mots déguisés (`f.u.c.k`, `c0nn4rd`, `fuuuuck`, lettres espacées). Dans le chat, le mot est remplacé par des étoiles. Un pseudo grossier est refusé, à la création comme au changement de pseudo. Les mots courts (« cul », « pd »…) ne sont filtrés qu'en mot entier, pour ne pas toucher « calculer » ou « pédestre ».
- **SDK CrazyGames v3** (`client/src/clans/crazygames.js`). Il n'est chargé que sur CrazyGames (ou avec `?crazygames=1` pour tester). Ailleurs, rien ne change.
  - `loadingStart` / `loadingStop` pendant la connexion ;
  - `gameplayStart` à l'arrivée dans le monde, `gameplayStop` au retour à l'écran de création ;
  - réglage **disableChat** : le chat des joueurs disparaît, les messages du jeu restent ;
  - réglage **muteAudio** : le son est coupé et le bouton 🔊 du jeu ne peut pas le remettre ;
  - la langue du joueur est lue (servira pour l'anglais).
  - Si le SDK ne répond pas, le jeu démarre quand même (4 s maximum).
- **Téléphone** : `-webkit-user-select`, pas de menu de loupe ni de surbrillance au toucher. Les champs de texte restent sélectionnables.
- **Build CrazyGames** : `npm run build:crazygames` crée `client/dist-crazygames/`. Les chemins y sont relatifs et le jeu se connecte au serveur Render. C'est ce dossier, zippé, qu'on envoie sur le portail développeur.

## Le jeu en anglais — étape 1 : interface, cartes et classes (v107)

- **Langue.** Sur CrazyGames, le jeu suit la langue du joueur donnée par le SDK : français pour les francophones, anglais pour tous les autres. Ailleurs, il reste en français. Le bouton **🌐 English / Français** du menu ☰ change la langue et s'en souvient. Pour tester : `?lang=en`.
- **Comment ça marche** (`client/src/clans/i18n.js`). Le code reste écrit en français ; la traduction se fait à l'affichage. Le dictionnaire `client/src/clans/i18n/en.json` (environ 1 700 textes) associe chaque texte français à sa traduction.
  - Les parties variables s'écrivent `{0}`, `{1}`… Elles sont reprises telles quelles, ou traduites si on les connaît (« Clan du Feu » → « Fire Clan »).
  - Sont traduits : les textes de la page, les infobulles, les textes dessinés sur la carte et les boîtes de confirmation.
  - Les descriptions de cartes sont traduites phrase par phrase avant d'être mises en forme. Les mots-clés (Burn, Soaked…) gardent leur infobulle.
  - Les messages des joueurs dans le chat ne sont jamais traduits.
  - En anglais, les nombres s'écrivent 1,000 et les touches affichées sont WASD.
- **Ajouter un texte** : il suffit de l'ajouter à `en.json`. Avec `?lang=en&i18nDebug=1`, `__i18n.manquants` liste dans la console les textes affichés qui ne sont pas encore traduits.
- **Déjà traduit** : toute l'interface, les messages du serveur, les cartes (noms et effets), les classes et talents, les statuts, les ressources, les lieux, les quêtes du jour.
- **À venir** : monstres, reliques, apparences, montures, familiers et hauts faits (v108), puis dialogues et quêtes des habitants (v109).

## Plus de quêtes, des lieux à visiter, de l'XP et une maison plus grande (v108)

- **35 nouvelles quêtes, 5 par zone**, plus longues et plus dures. Chaque zone a son fil d'histoire : la légende du Premier Forgeron (Braise), le naufrage du Grand Nautile (Azur), les graines de l'Arbre-Mère (Sylve), le Premier Peuple (Faille), le Roi pris dans la glace (Cimes), le Sphinx et le Soleil (Désert), l'Archange déchu (Îles). Elles sont données par les habitants déjà présents : un habitant propose sa quête suivante quand la précédente est rendue (`pnj` dans `quetesPnj.js`).
- **Nouveaux types de quêtes :**
  - **aller voir** un lieu (`lieux`) : validé quand on s'en approche, position vérifiée par le serveur (`pnjLieu`) ;
  - **ramasser** des objets posés par terre (`objets`) : ils brillent sur la carte, seul le joueur qui a la quête les voit, on les ramasse avec E (`pnjObjet`) ;
  - **apporter quelque chose à un lieu** (`lieux` + `donner`) ;
  - **combats avec un palier minimum** (`f.palierMin`), et combats dans le Cauchemar.
- **17 lieux à visiter** (`shared/clans/reperes.js`, dessin dans `reperesArt.js`) : 3 par territoire de départ, 2 par zone de chapitre. Statues, cratère, autel de la flamme, épave, phare, Arbre-Mère, pierres levées, monolithe, ruines, cairn, sphinx, obélisque, cadran d'étoiles. Chacun a sa petite place pavée et un socle qu'on ne traverse pas. Ils apparaissent sur la grande carte, et ceux d'une quête en cours y sont entourés d'or. Leurs emplacements ont été choisis par calcul : sol praticable, accessible à pied, loin des villages, portails, sanctuaires et autres lieux.
- **Les quêtes rapportent de l'XP.** Elle est calculée à partir des quêtes rendues, donc les anciennes quêtes déjà faites comptent aussi. Les quêtes de village ne rapportent de l'XP que dans son propre village. Le calibrage : finir toutes les quêtes d'une zone mène au niveau de la zone suivante, ou un en dessous (30, 50, 70, 90, puis 100). Un test le vérifie en simulant un joueur qui enchaîne les quêtes sans farmer. Les niveaux requis par les histoires des chapitres ont été rabaissés pour que tout s'enchaîne : Faille 30-44, Cimes 50-64, Désert 70-84, Îles 90-97.
- **Journal et dialogues :** titre de la quête, objectifs détaillés (lieux ✓, objets ✓, ressources), XP gagnée, et boutons « 📍 Montre-moi le chemin », « 📍 Y aller » et « 📍 Le retrouver ».
- **La maison grandit avec les chapitres** : niveaux 6 à 13, +10 PV par niveau. Chaque histoire de chapitre terminée ouvre 2 niveaux, payés avec les matériaux de ce chapitre (fragments et éclats du vide, plumes et cristaux de foudre, sable doré et larmes d'ambre, poussière et cœurs d'étoile). Le niveau suivant verrouillé est affiché dans la parcelle. Les PV de duel ne changent pas.

## Le jeu en anglais — étapes 2 et 3 : tout le reste (v109)

- **Traduits** (environ 850 textes de plus, 2 560 en tout) :
  - les monstres, boss, titans et malédictions du Cauchemar ;
  - les reliques, familiers, montures, apparences et décorations ;
  - les hauts faits et leurs titres, les salles mystère ;
  - **tous les habitants** : rôles et répliques ;
  - **toutes les quêtes** : textes, remerciements, titres et objets, y compris les 35 de la v108.
- Les prénoms des habitants restent tels quels, sauf ceux qui sont des mots : Écume → Foam, Mousse → Moss, Brindille → Twig, Ronce → Bramble, Tison → Cinder.
- Les bulles au-dessus des habitants sont traduites avant d'être coupées en lignes. En anglais, les guillemets « » deviennent “ ”.
- Les répliques qui annonçaient d'anciens niveaux (Odra, Imhet, Ysolde) donnent maintenant les niveaux de la v108.
- Un test vérifie que chaque quête, habitant, lieu et monstre a sa traduction : un texte ajouté sans traduction le fera échouer.
- Le jeu est entièrement jouable en anglais : il est prêt à être soumis sur CrazyGames.

## CrazyGames : inviter un ami (v110)

Le « salon » CrazyGames d'un joueur, c'est son **groupe d'expédition** (3 joueurs au plus). Tout est dans `client/src/clans/ui-invitation.js`, et hors de CrazyGames rien ne s'affiche.

- **Salon :** seul, un joueur est joignable. En groupe, il l'est tant qu'il reste de la place et que le groupe n'est pas parti.
  - Le jeu le déclare au SDK avec `updateRoom` (`roomId`, `isJoinable`, `inviteParams.ami`).
  - Le bouton d'invitation de CrazyGames est affiché par CrazyGames d’après ce salon (les anciens `showInviteButton` / `hideInviteButton` sont dépréciés et ne sont plus utilisés). `leftRoom` est appelé au retour à l'écran de création.
- **Lien :** il porte l'identifiant public du chef du groupe, tiré de son jeton par hachage. Le jeton lui-même ne sort jamais.
- **Arriver par un lien** (`getInviteParam('ami')`, ou `addJoinRoomListener` si le jeu est déjà ouvert) : une fois dans le monde, le joueur entre **directement** dans le groupe de son ami, sans invitation à accepter. La flèche le guide vers lui. Si l'ami est absent, en expédition ou si son groupe est complet, un message l'explique.
- **Dans le jeu :** bouton « 🔗 Inviter un ami (lien) » dans le panneau de groupe (fenêtre d'expédition), qui copie le lien.
- **Pseudo CrazyGames :** il est proposé comme nom de héros à la création, pour que les amis se reconnaissent.
- **Serveur :** messages `lienAmi`, `groupeLien` et `groupeCreer`. La vue du groupe contient `pubChef` et `taille`.
- **Fiche CrazyGames :** multijoueur coché, Lobby Size Min 1 / Max 3, private lobbies non coché.
- **Happytime** (`cg.fete()`) : appelé seulement à la fin d'une histoire de chapitre et à la victoire de l'Épreuve d'ascension, pour rester un moment rare comme le demande CrazyGames.

## CrazyGames : groupe gardé et confidentialité (v111)

- **Le groupe reste ensemble après une expédition** (exigence CrazyGames pour le multijoueur entre amis : rejouer avec le même groupe sans repasser par leur interface). À la fin d'une expédition de groupe, le groupe revient « en préparation » avec les mêmes membres, prêt à repartir depuis un portail. S'il ne reste qu'un joueur, le groupe se dissout comme avant.
- **Confidentialité et conditions** (`client/src/clans/ui-confidentialite.js`) : le jeu garde un pseudo, une progression et un identifiant anonyme sur son serveur, donc CrazyGames demande de le dire aux nouveaux joueurs. Une mention discrète sous le bouton « Entrer dans le monde » ouvre la page, sans fenêtre bloquante. On la retrouve aussi dans le menu ☰ (🔒 Confidentialité). La page dit ce qui est gardé, ce qui ne l'est pas, comment supprimer son personnage, et les règles du jeu. Elle est en français et en anglais.

## Nouveau style (v112)

CrazyGames a refusé le jeu pour sa qualité générale (premières minutes trop chargées, styles visuels qui ne vont pas ensemble). D'abord testé comme réglage, le nouveau style est maintenant **le style par défaut**. L'ancien reste disponible.

- **Changer de style :** menu ☰ → « ↩ Ancien style » (ou « ✨ Nouveau style »), ou l'adresse `?style=ancien` / `?style=nouveau`. Le choix est gardé sur l'appareil (`localStorage.clansStyle = 'ancien'` ; rien = nouveau style). Les tests de bout en bout d'origine jouent dans l'ancien style ; une étape vérifie le nouvel accueil. Code : `client/src/clans/style2.js` et `style2.css` (toutes les règles commencent par `html.style2`).
- **Accueil :** l'illustration des trois clans en plein écran et un grand bouton **Jouer**. Ensuite, un seul écran : les trois clans en grandes cartes illustrées (une phrase chacun), la classe déjà choisie selon l'illustration (Feu → Combattant, Eau → Mage, Plante → Tireur, modifiable), le nom déjà rempli (pseudo CrazyGames, dernier nom utilisé ou nom tiré au sort), puis **Jouer**. Images : `client/public/clans/accueil/`.
- **Premiers pas :** l'interface se découvre au fil du guide. Au départ, seul le menu ☰ est en haut ; le Deck apparaît à l'objectif 3, la Parcelle à l'objectif 5, puis les Quêtes, le Passe, les messages et la liste des joueurs en ligne à la fin des premiers pas (ou au niveau 3). Chaque bouton qui apparaît clignote quelques secondes. Le guide devient une carte « 🎯 Objectif » courte. Le tutoriel du premier combat passe de 6 bulles à 3. Le cadeau du jour n'interrompt plus les premiers pas.
- **Monde :** zoom plus grand (personnages ~40 % plus gros), sol adouci (la partie visible est floutée à sa taille réelle puis posée lissée par-dessus le sol net, couleurs plus vives), lumière chaude en haut et bords assombris, ombres rondes, étiquettes en pastilles arrondies (police Fredoka).
- **Interface :** boutons en pastilles translucides, fenêtres plus arrondies, boutons dorés en relief, police Fredoka.
- **Quêtes « ramasse » corrigées :** quand deux objets étaient proches, la touche E ramassait le dernier de la liste au lieu du plus proche (on ramassait le burin devant le marteau, puis il n'y avait plus rien devant le burin). C'est maintenant toujours le plus proche. On peut aussi cliquer sur un objet : le héros y va et le ramasse.
- **Moins d'XP par quête :** les quêtes donnaient trop d'XP. Elles en donnent maintenant 40 % de moins (`COEF_XP_QUETES = 0.6` dans `shared/clans/quetesPnj.js`, appliqué partout via `xpQuete`). Les quêtes d'une zone apportent environ 60 % de l'XP pour atteindre la zone suivante, les expéditions le reste. Comme l'XP des quêtes est recalculée à partir des quêtes finies, les joueurs existants perdent quelques niveaux d'un coup ; un joueur qui repasse sous le niveau d'une zone devra refaire des combats pour y retourner. Le test de calibrage vérifie qu'aucune zone ne bloque et que la part des quêtes reste entre 50 et 70 %.

## Panneau admin des joueurs (v113)

Page **`/clans/admin-joueurs.html`** (lien aussi depuis `/clans/admin.html`). Code : `server/src/clansAdmin.js`.

- **Accès :** clé `ADMIN_CLE` à définir sur le serveur (Render → Environment). À défaut, c'est `JOURNAL_CLE` qui sert. Sans aucune des deux, le panneau est fermé. La clé est envoyée dans l'en-tête `x-admin-cle` et gardée seulement le temps de l'onglet.
- **Liste :** tous les joueurs gardés (en base : `SCAN` + `MGET`), les connectés d'abord (point vert), recherche par nom ou début du code.
- **Fiche :** clan, classe, niveau, XP détaillée (victoires, boss, quêtes) et toutes les ressources.
- **Niveau :** « Fixer le niveau » (+1, +5, +10, ou 30 / 50 / 70 / 90 / 100). Le niveau vient de l'XP ; le panneau règle le nombre de victoires pour l'atteindre. On ne peut pas descendre sous le niveau que donnent déjà les quêtes et les boss (le panneau le signale).
- **Ressources :** « Ajouter » (un nombre négatif retire) ou « Fixer la valeur », avec des raccourcis (+1 000 essence, +100 éclats, +200 matériaux de son clan…). Un message facultatif accompagne le cadeau.
- **Joueur connecté :** modifié en mémoire dans la salle, il voit le changement tout de suite, avec un message dans le chat (« 🎁 L'équipe du jeu : … »), et c'est sauvegardé aussitôt. Pendant les 20 s de reconnexion après une coupure, il compte encore comme connecté. **Joueur absent :** modifié directement dans sa sauvegarde.
- Chaque modification est écrite dans les journaux du serveur (`🛠️ admin · …`).

## Combat au nouveau style (v114)

- **Le héros en portrait illustré** (`dessinerHeros` dans `ui-combat.js`, utilisé aussi pour les duels et l'arène) : dans le nouveau style, le petit personnage en pixel art est remplacé par un portrait encadré comme ceux des monstres. C'est l'illustration de son clan (`/clans/accueil/<clan>.webp`), bordée de la couleur du clan, avec l'icône de sa classe en médaillon. Le sprite reste dessiné, mais caché : l'ancien style n'a pas changé.
- **Décor adouci :** l'image de fond du combat est lissée et floutée (effet de profondeur), plus vive, avec une lumière chaude et des bords assombris. Elle va mieux avec les illustrations des cartes et des monstres.
- Sur téléphone (écran en hauteur), le portrait est un peu plus petit.
- **Panneau admin :** après une reconnexion, l'ancienne session d'un joueur reste en attente 20 s. Le panneau modifie maintenant toujours la session active (avant, il pouvait modifier l'ancienne, et le joueur ne voyait rien).

## Un portrait par clan et par classe (v115)

- 12 portraits illustrés (`client/public/clans/heros/<clan>_<classe>.webp`, 560×840), générés sur Anifusion dans le style de la couverture (illustration de la couverture en référence).
- **En combat, en duel et en arène** (nouveau style), le héros apparaît avec le portrait de sa combinaison (par exemple `plante_escrimeur`). Si l'image manque, on retombe sur l'illustration du clan (`clans/accueil/<clan>.webp`).
- **À l'accueil**, la carte du clan choisi montre le héros de la classe choisie, et change quand on change de classe.
- Les chemins d'images passent par `import.meta.env.BASE_URL` (la version CrazyGames est servie depuis un sous-dossier).

## Cartes d'élément réservées à leur clan, portraits des classes avancées (v116)

- **Règle :** une carte d'élément (Feu, Eau, Plante) ne peut être jouée que par son clan. Les cartes neutres et les cartes de zone (Terres Brisées, Cimes, Désert, Îles) restent à tous. Fonctions `pourClan(id, clan)` et `jouable(id, p)` dans `shared/clans/profil.js`.
  - Les tirages ne donnent plus les éléments des autres clans.
  - « + Deck » refuse (« Cette carte est réservée au Clan de l'Eau. »), la forge des reliques aussi, et la liste des reliques ne montre que celles de son élément.
  - Le Grimoire ne compte plus les cartes des autres éléments.
  - Les profils existants : les cartes des autres éléments deviennent des éclats (selon la rareté et le niveau), quittent les decks (qui sont complétés), et le joueur reçoit un message une fois (`avisClasse.elem`).
- **Portraits des classes avancées :** 24 portraits (`clans/heros/<clan>_<branche>.webp`), chacun généré à partir du portrait de la classe de base, pour garder le même héros en version évoluée. En combat, en duel et en arène, l'ordre est : classe avancée, puis classe de base, puis illustration du clan. Une future 3e classe se range de la même façon (`<clan>_<id>.webp`, en tête de liste).

## Préparation CrazyGames (v117)

- **Échap n'est plus nécessaire :** sur CrazyGames, Échap sert à quitter le plein écran. Partout où Échap fermait ou annulait (fenêtres, menu ☰, grande carte, choix de cible en combat, pose de la maison), Retour arrière (⌫) marche aussi (hors des champs de texte). Les textes affichent « ⌫ » sur CrazyGames et « Échap » ailleurs (`client/src/clans/touches.js`). Les boutons ✕ et le clic à côté d'une fenêtre restent disponibles.
- **Petit écran (800×450, la taille testée par CrazyGames) :** guide, barre du haut et boutons plus compacts, aide clavier masquée.
- **Deck :** les filtres ne montrent plus que l'élément de son clan (avec les cartes de classe et neutres).
- **Nouvelles vidéos** (nouveau style, sans son, 19 s, la couverture en première image) : 1920×1080 et 1080×1620. Elles montrent l'accueil, le choix du clan, le monde, la carte d'expédition et un combat.

## Carte : rendu d'origine et zoom réglable (v118)

- Le zoom plus grand, le sol adouci et la lumière du nouveau style ont été retirés de la carte : elle retrouve son rendu d'origine. Le reste du nouveau style (accueil, interface, combat, portraits) ne change pas.
- **Zoom réglable :** molette sur la carte, touches + et −, ou boutons ＋ / － à gauche de la mini-carte (à droite en bas sur petit écran). De 2 crans en arrière à 3 crans en avant du zoom de base, gardé sur l'appareil (`localStorage.clansZoom`).

## Ouverture des tirages, ressources, succès du bestiaire (v119)

- **Ouverture des tirages façon booster** (`client/src/clans/ui-ouverture.js`, `ouverture.css`) : après un tirage, un paquet aux couleurs du clan apparaît au centre de l'écran. On clique : il tremble (avec un halo de la couleur de la meilleure carte) et explose en lumière. Les cartes se posent face cachée, chacune avec l'aura de sa rareté (bleue pour rare, violette pour épique, dorée avec des rayons pour légendaire). Un clic retourne une carte ; « Tout retourner » les retourne de la moins rare à la plus rare. Une légendaire fait trembler les cartes, pleuvoir des étincelles et déclenche le « happytime » de CrazyGames. « Continuer » ramène à l'autel avec le récapitulatif. Les animations sont coupées si le système demande moins de mouvement.
- **Ressources dans la barre :** toujours visibles : essence, éclats et le matériau de son clan. Les autres vont dans le sac 🎒 (avec leur nombre), qui ouvre la liste complète au clic.
- **Marchand :** sous chaque prix, ce que tu as (en rouge s'il en manque), et la liste de toutes tes ressources sur plusieurs lignes au lieu d'une ligne coupée.
- **Succès du Grimoire « maîtriser toutes les fiches »** : renommé « maîtriser tous les monstres ★★★, titan compris », avec l'explication : une fiche est maîtrisée après 25 victoires sur un monstre normal, 12 sur un rare ou une élite, 6 sur un boss et 3 sur le titan.

## Quêtes « va voir » réparées (v120)

- **Le bug :** les 14 quêtes où il faut aller voir un lieu (par exemple « La statue oubliée » ou « Ranimer la Flamme éternelle » au Feu) ne se validaient jamais. La liste des lieux à voir (`lieuxAVoir`) recopiait le repère par-dessus l'identifiant de la quête : arrivé sur place, le client envoyait au serveur le nom du lieu (`statue_forgeron`) au lieu de celui de la quête (`feu_statue`), et le serveur refusait sans rien dire.
- **La correction :** chaque lieu à voir porte maintenant `id` (la quête) et `lieu` (le repère). La grande carte surligne les repères par `lieu`. Les joueurs déjà bloqués n'ont qu'à repasser au lieu : la visite est comptée tout de suite.
- **Test ajouté :** pour chacune des 14 quêtes de lieu, ce que le client envoie est bien accepté sur place. Une simulation vérifie aussi que les quêtes de lieu et d'objet de toutes les zones peuvent être finies.

## Reliques par classe, illustrations entières, textes de cartes courts (v121)

- **Reliques :** les 16 reliques neutres des zones sont réparties entre les classes (`CLASSE_RELIQUES` dans `shared/clans/cartes.js`), une par classe et par zone, avec 2 épiques et 2 légendaires chacune :
  - Combattant : Golem de pierre, Marteau du tonnerre, Sable aveuglant, Festin des étoiles ;
  - Mage : Esprit de la faille, Chaîne d'éclairs, Œil de Râ, Faux des étoiles ;
  - Tireur : Loup spectral, Avatar de la tempête, Flèche du scarabée, Comète vorace ;
  - Escrimeur : Dragonnet, Œil de la tempête, Jugement du pharaon, Morsure astrale.
  Avec les 6 reliques de son élément, un joueur voit donc 10 reliques à forger au lieu de 22. La forge refuse les reliques d'une autre classe. Celles déjà forgées par une autre classe deviennent des éclats, comme les autres cartes d'une autre classe.
- **Illustrations :** l'image d'une carte garde toujours sa taille ; avant, un long texte la rétrécissait. Les textes longs passent en plus petit.
- **Textes courts :** « Invoque … : 30 PV, frappe 3 par tour », « Étourdit la cible », « Marque la cible 2 fois », « Vol de vie 50 % ». L'explication complète s'affiche en survolant le mot souligné.
- **Grimoire :** un Combattant Berserker du Feu doit réunir 51 cartes : 17 de classe (Combattant et Berserker), 10 neutres, 14 Feu et 10 reliques (6 Feu, 4 Combattant). Avant la règle des éléments (v116), c'était plus de 100.

## Les chefs de guerre : la Consécration (v122)

Au **niveau 50**, un joueur qui a une branche d'Ascension peut devenir **chef de guerre**. Il y a un chef par branche (`CHEFS` dans `shared/clans/cartes.js`) :

| Branche | Chef | Talent |
|---|---|---|
| Gardien | 🚩 Porte-Bannière | Rempart du clan : la moitié du bouclier inutilisé reste au tour suivant |
| Berserker | 🐗 Chef de Horde | Sang de la horde : +1 énergie par tour sous 50 % des PV |
| Archimage | 🌌 Grand Arcaniste | Résonance : la 3e carte jouée du tour rend 2 énergie |
| Invocateur | 🦁 Seigneur des Bêtes | Roi de la meute : alliés invoqués +50 % PV, frappent deux fois |
| Sniper | 🦅 Œil de l'Aigle | Premier sang : la 1re attaque du combat fait ×3 |
| Artificier | 🧨 Maître Artilleur | Obus élémentaires : une attaque sur tous applique Brûlure 2 / Trempé 1 / Affaibli 1 selon le clan |
| Duelliste | 🏆 Champion du Clan | Second souffle : la 2e attaque du tour rend 1 énergie |
| Lame d'ombre | ✋ Main Noire | Coup de grâce : +3 dégâts aux cibles affaiblies |

- **La quête :** un duel contre le **Fantôme de l'ancien chef** (`shared/clans/consecration.js`), lancé depuis la fenêtre de l'Ascension (touche U). Le fantôme a le même clan, la même classe, la même branche et le talent du chef. Son deck compte 23 cartes niveau 2 : ses sorts de chef, ceux de la branche, de la classe et de l'élément. Son IA (`coupFantome`) essaie chaque carte et la meilleure suivante sur une copie du duel avant de jouer.
- **PV fixes :** 500 pour le fantôme, 420 pour le joueur, quelle que soit sa maison. La difficulté a été calibrée par simulation : un joueur qui joue bien, avec des cartes niveau 3, gagne environ 4 fois sur 10 ; avec des cartes niveau 2, environ 2 fois sur 10. On peut retenter sans limite, sans étourdissement ni perte.
- **La victoire :** le talent du chef, ses **3 sorts** (2 épiques et 1 légendaire, un exemplaire de chacun ; les exemplaires suivants sortent à l'autel, seulement pour ce chef), le titre et une annonce à tout le serveur. Le serveur fait tourner le duel (`sur('consecration')` → `lancerDuel(…, { consec, pv, bot })` → `finConsecration`).
- **Parchemin de réorientation :** le chef suit la nouvelle branche (Porte-Bannière ↔ Chef de Horde, etc.). Les sorts de l'ancien chef deviennent des éclats et ceux du nouveau sont donnés.
- **Portraits :** `client/public/clans/heros/<clan>_<chef>.webp` (24 images). Ils passent avant le portrait de la branche ; s'il manque, on voit celui de la branche. En duel, le fantôme est assombri et bleuté.
- **Panneau admin :** on peut fixer la branche d'un joueur et lui retirer son titre de chef, pour qu'il retente la Consécration.
- **Tests :** `tests/clansconsecration.test.mjs` (données, tirages, récompense, changement de branche, fantôme, talents) et une étape E2E qui joue la Consécration de bout en bout. Avec `CLANS_TEST_FANTOME_PV`, le fantôme est fragile.

## Nouvelles cartes d'élément et nouvelles mécaniques (v123)

12 cartes, 4 par élément, chacune avec une mécanique jamais vue, dans l'esprit de son élément. Elles sortent aux tirages du clan, comme les autres cartes d'élément.

| Élément | Carte | Rareté · coût | Effet |
|---|---|---|---|
| Feu | Embrasement | rare · 1 | 4 dégâts, **double la brûlure** de la cible |
| Feu | Fournaise intérieure | rare · 0 | +2 énergie, mais **tu subis Brûlure 3** |
| Feu | Mur de flammes | épique · 1 | 7 bouclier, **Aura ardente 4** (qui t'attaque d'ici ton prochain tour prend Brûlure 4) |
| Feu | Cendres du phénix | légendaire · 2 | **Renaissance 30** : à 0 PV, tu reviens avec 30 PV (une fois), épuisée |
| Eau | Source pure | rare · 1 | 7 bouclier, **retire tes brûlure, trempé, affaibli et marques** |
| Eau | Retour des flots | rare · 1 | 3 bouclier, **reprends en main la dernière carte de ta défausse** |
| Eau | Voile de brume | épique · 1 | **Esquive 1** (la prochaine attaque reçue ne fait rien), pioche 1 |
| Eau | Marée montante | légendaire · 2 | 6 dégâts **+3 par carte dans ta main** |
| Plante | Pousse vivace | rare · 1 | 5 dégâts, **Pousse 3** : +3 dégâts à chaque fois que tu la rejoues ce combat |
| Plante | Bourgeon | rare · 1 | 5 bouclier, **Bourgeon 12** : il éclot au début de ton prochain tour et soigne 12 |
| Plante | Racines profondes | épique · 1 | Régénération 2, puis **3× ta régénération en bouclier** |
| Plante | Photosynthèse | légendaire · 1 | Pioche 2, **+3 énergie au prochain tour** |

Les mécaniques marchent contre les monstres (`combat.js`) et en duel (`duel.js`). Les nouveaux statuts (Aura ardente, Esquive, Renaissance, Bourgeon, Photosynthèse) s'affichent sous les PV avec leur explication. Tests : `tests/clanselements2.test.mjs`.

## Les Seigneurs de chapitre (v124)

Cinq boss à part, un par chapitre (`shared/clans/seigneurs.js`). On les défie au pied de leur monument, avec la touche E. Un cercle de runes violet marque ces monuments sur la carte. Un Seigneur s'ouvre quand le palier III de son territoire est vaincu, c'est-à-dire quand le Cauchemar y est débloqué. Chaque Seigneur change de phase à 66 % et à 33 % de ses PV.

| Ch. | Seigneur | Monument | Mécanique |
|---|---|---|---|
| 1 | 🔱 Triarque élémentaire | les 3 statues des clans | Feu → Eau → Plante ; ×0,5 contre son élément, ×1,5 avec celui qui le bat |
| 2 | 🪨 Briseur de mondes | Monolithe fêlé | glisse des **Fêlures** (cartes à 1 énergie qui ne font rien) dans la défausse |
| 3 | ⛈️ Titan de la Foudre | Cairn des Disparus | **charge** un éclair énorme ; chaque **Paratonnerre** vivant en absorbe 30 % |
| 4 | 🦁 Sphinx d'Ambre | Sphinx ensablé | **énigmes** tous les 3 tours (réussie : −8 % PV et Affaibli 2 ; ratée : +3 force) ; **sablier** de 15 tours |
| 5 | 🌠 Astre déchu | Cadran des Étoiles | intouchable tant qu'une **Étoile déchue** brille (elles le soignent) |

- **Première victoire :** une légendaire unique (Cœur du Triarque, Éclat du Briseur, Foudre du Titan, Sablier du Sphinx, Cœur de l'Astre), qui ne sort jamais aux tirages. S'y ajoutent un titre `sg:<id>`, une annonce au serveur et beaucoup de ressources.
- **Revanches :** rejouables à volonté, avec un butin plus modeste. Le record de tours est noté.
- **Haut fait « Les Seigneurs » :** 1, 3 puis 5 Seigneurs vaincus.
- **Moteur** (`combat.js`) : les champs `phases`, `element`, `etoiles` / `etoile`, `paratonnerre` et `sablier` des ennemis, et les intentions `fe` (fêlures), `inv` (invocation), `ch` (charge), `foudre` et `en` (énigme). Le serveur rejoue le combat (`seigneurDebut` puis `seigneurCombat`).
- **Tests :** `tests/clansseigneurs.test.mjs`.
