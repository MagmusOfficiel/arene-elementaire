# Arène Élémentaire — v0.5

Jeu en ligne 2D (vue du dessus) : chaque joueur reçoit **2 éléments au hasard**, qui fusionnent en un kit de sorts + un ultime, puis atterrit dans l'arène.

**Stack :** Phaser 3 (client navigateur) + Colyseus 0.15 (serveur Node autoritaire).

## Nouveautés v0.5

- **2 modes** : Mêlée (réapparition) et **Battle royale** (1 vie, zone qui rétrécit, vainqueur, manches qui s'enchaînent, mode spectateur).
- **Son** : effets synthétisés par élément (spatialisés : volume + gauche/droite selon la distance) et musique de combat (`tools/gen_music.py`). Touche **M** pour couper.
- **Cinématique d'ultime** façon shōnen (portrait + lignes de vitesse), coups critiques, écran rouge quand on est touché.
- **Réseau optimisé** : projectiles simulés côté client (un message au lancement), statuts en masque de bits, valeurs compressées → **bande passante divisée par 2,3** (11,4 → 5,0 Ko/s). Prédiction de ton déplacement (plus de latence ressentie).
- **Poids divisé par 2,5** : toutes les images en WebP (11 → 4,4 Mo).
- **Grimoire** des fusions découvertes et **classement** dans le lobby. Statistiques d'équilibrage : `/api/stats`.
- **Équilibrage** : Orage et Flamme noire affaiblis (zones plus courtes, combos Électrocuté 1,4× et Flamme noire 1,15×).
- **Mise en ligne** : voir `GUIDE_MISE_EN_LIGNE.md` (Render gratuit, sans rien installer).

## Lancer

```bash
npm install
npm run dev
```

- Client : http://localhost:5173 (ouvre plusieurs onglets pour tester le multijoueur)
- Serveur : ws://localhost:2567
- Sur le même Wi-Fi, tes potes peuvent rejoindre via `http://TON-IP-LOCALE:5173`

**Production** (un seul serveur sert le jeu et le multijoueur) :
```bash
npm run build && npm start      # → http://localhost:2567
```

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | Se déplacer |
| Clic gauche (maintenir) | Attaque de base |
| E ou clic droit | Sort 1 (offensif) |
| Shift ou Espace | Sort 2 (utilitaire) |
| R | Ultime (jauge à 100 %) |

## Contenu du prototype

- **8 éléments** : Feu, Eau, Terre, Vent, Éclair, Glace, Ombre, Métal → **28 fusions + 8 formes Pures** (5 % de chance)
- **Kit généré** : Sort = Forme (élément A) + modificateur (élément B). Le Sort 2 vient de B et finit par une nova de A.
- **Tags** : Brûlure, Mouillé, Ralenti, Poussée, **Chaîne** (l'éclair rebondit sur 2 cibles), **Givre**, **Marque** (+20 % de dégâts subis), **Perforant** (ignore bouclier et armure)
- **10 interactions** : Vaporisation, Attisé, Embourbé, Éteint, Électrocuté, Gelé, Dégel, Brisé, Flamme noire, Foudre maudite
- **Nouveaux utilitaires** : Surcharge (vitesse), Pas de l'ombre (téléportation + invisibilité), Peau d'acier (−50 % de dégâts)
- **Arène 3200×2400** avec 4 biomes (+15 % de dégâts dans le biome de ton élément), orbes (ultime + soin), mini-carte
- **Carte dédiée 4000×3000** : une ville en ruines au centre, 8 biomes (un par élément) avec leurs structures (forges, cabanes, mines, moulins, igloos, usines, cryptes, pylônes), soit 69 bâtiments qui bloquent les déplacements et les projectiles
- **Zombies (PvPvE)** : Rôdeur, Coureur et Colosse. Les tuer charge l'ultime et peut lâcher un orbe. **Une horde** déferle toutes les 75 s et traque les joueurs.
- **Portraits de fusion** affichés au tirage et dans le HUD (voir ci-dessous)
- **3 mannequins IA** pour tester seul (ils tapent aussi les zombies)
- Mode Mêlée avec réapparition : à chaque mort → **nouveau tirage**

## Portraits de personnages (images IA)

Dépose les images dans `client/public/portraits/`, nommées par fusion :

| Fichier | Fusion |
|---|---|
| `feu+vent.jpg` | Tempête de flammes (Homme Phénix) |
| `eau+feu.jpg` | Vapeur |
| `feu+terre.jpg` | Magma |
| `eau+terre.jpg` | Boue |
| `eau+vent.jpg` | Ouragan |
| `terre+vent.jpg` | Sable |
| `feu+feu.jpg` · `eau+eau.jpg` · `terre+terre.jpg` · `vent+vent.jpg` | Formes Pures |

Les 10 portraits sont déjà inclus. Les médaillons en jeu sont dans `client/public/tokens/` (découpe ronde 128×128 du visage). Si une image manque, le jeu fonctionne quand même : un cercle de couleur la remplace.

## Direction artistique (v0.4)

- **Persos** : les 36 illustrations IA sont détourées (`client/public/sprites/`) et affichées debout, animées (respiration, course, orientation, flash d'impact, chute à l'atterrissage).
- **Carte peinte** : `tools/gen_ground.py` génère le sol (8 biomes, ville pavée, chemins, ombres) en 4 tuiles JPEG.
- **Bâtiments en vue 3/4** : `tools/gen_buildings.py` dessine les 69 bâtiments (toits, façades, fenêtres, cheminées, effets lumineux).
- **Décors et effets** : `tools/gen_props.py` crée arbres, rochers, cristaux, lampadaires… et les textures de particules.
- **Tri par profondeur** : on passe derrière les maisons et les arbres.
- **Zombies illustrés** : dépose `rodeur.png`, `coureur.png`, `colosse.png` (fond transparent) dans `client/public/zombies/`.

Pour régénérer l'art après avoir modifié la carte :
```bash
node tools/export_map.mjs > /tmp/map.json
python3 tools/gen_ground.py /tmp/map.json client/public/art
python3 tools/gen_buildings.py /tmp/map.json client/public/art
python3 tools/gen_props.py client/public/art
```

## Structure

```
shared/data.js          ← TOUT l'équilibrage : éléments, fusions, ultimes, tags, interactions
server/src/ArenaRoom.js ← simulation (20 ticks/s), exécuteur de sorts générique, IA des bots
server/src/schema.js    ← état synchronisé (joueurs, projectiles, zones, orbes)
client/src/ArenaScene.js← rendu Phaser, entrées, interpolation, mini-carte
client/src/hud.js       ← interface : tirage, sorts, classement, kill feed
```

## Ajouter un élément (ex. Éclair)

1. Dans `shared/data.js` → `ELEMENTS`, ajoute `eclair` (couleur, tag, basique, offensif, utilitaire, mod).
2. Ajoute son tag dans `TAGS` (+ logique dans `hit()` côté serveur si c'est un nouvel effet).
3. Ajoute les fusions `eclair+eau`, `eclair+feu`, `eclair+terre`, `eclair+vent`, `eclair+eclair` dans `FUSIONS`.
4. (Optionnel) un biome dans `BIOMES`.

Formes d'ultime disponibles : `pluie`, `tornade`, `nova`, `zone`.
Formes de sort : `projectile`, `eventail`, `impact`, `dash`, `soin`, `bouclier`.

## Prochaines étapes (Phase 1)

- Sprites de personnages en vue du dessus (à partir des portraits) à la place des cercles
- Passifs de fusion, obstacles et terrain réactif (l'herbe brûle, l'eau gèle)
- Mode battle royale : zone qui rétrécit, 1 seule vie
- Prédiction côté client pour un déplacement plus fluide avec du lag

## v0.6 — Classes, corps à corps et ultimes
- **7 classes** (Bretteur, Brute, Assassin, Tank, Mage, Tireur, Invocateur) attribuées selon la fiche de chaque champion (`shared/champions.js`). Les classes de mêlée frappent vraiment au corps à corps (arcs de coupe, charges, sauts écrasants, tourbillons, frappes dans le dos).
- **3e sort** sur la touche **F** (technique de classe colorée par le 2e élément).
- **5 familles d'ultimes spectaculaires** : météore, rayon titanesque, domaine runique, dragon élémentaire, invocation géante — voile d'écran, rayons, cratères, flash et secousse.
- Le compte à rebours des hordes ne se fige plus.
- Poses d'attaque IA facultatives : déposez `sprites_atk/<Fusion>.webp` et ajoutez le nom dans `sprites_atk/index.json`. Le sprite change pendant l'attaque.

## v0.7 — Sensations de combat
- Attaques en 3 temps pour tous les champions : le perso arme son coup, jaillit vers la cible, puis revient, avec une image rémanente et un contour lumineux de son élément.
- Compteur de **COMBO** (coups enchaînés + dégâts totaux) et séries d'éliminations (Double, Triple, Carnage, Inarrêtable).
- Élimination : coup de zoom et flash. Impacts : traînée d'étincelles vers la cible.
- **Ultime prêt** : le perso brille et crépite, avec l'annonce « ULTIME PRÊT — R ».
- **PV bas** (< 30 %) : les bords de l'écran battent comme un cœur.

## v0.8 — 3 modes, esquive, niveaux, bots malins
- **🌍 Monde ouvert** (salle `arena`) : zombies, hordes, réapparition infinie.
- **👑 Battle royale 100** (salle `royale`, 100 places) : les places vides sont remplies par des bots, 1 vie, zone qui rétrécit sur 3 min 30.
- **🏆 Tournoi** (salle `tournoi`, 8 places) : quarts, demies et finale en duels simultanés, dans des arènes dorées. Chaque duel gagné = +1 niveau et PV remis à fond. Au bout de 75 s, celui qui a le plus de PV gagne.
- **Esquive** (Espace) : roulade de 230 px, invincible 0,32 s, recharge 2,5 s. Shift reste le sort 2.
- **Niveaux** : XP gagnée par les dégâts, éliminations, zombies et orbes. À chaque niveau, choisis 1 bonus parmi 3 avec 1/2/3 ou un clic : Puissance, Vivacité, Vitalité, Vitesse, Vampirisme, Âme ardente, Peau de pierre, Œil du tueur. Les niveaux repartent de zéro à chaque nouveau tirage.
- **Bots** : choisissent les cibles affaiblies, gardent la bonne distance selon leur classe, esquivent les projectiles, sortent des zones dangereuses, fuient vers les orbes à PV bas, restent dans la zone du royale et visent en anticipant.
- Réseau : les effets visuels ne sont envoyés qu'aux joueurs proches. Battle royale 100 : environ 24 Ko/s par joueur.
- Rendu : les personnages hors de l'écran ne sont plus animés.

## v0.9 — Jouer entre amis, sur téléphone, et le Titan
- **Salons privés** : coche « 🔒 Créer un salon privé », choisis un mode, et un code à 4 caractères s'affiche en jeu. Touche-le pour copier ou partager le lien `?salon=CODE`. Tes amis entrent le code puis « Rejoindre un ami ». Il faut le serveur en ligne (Render) : les salons n'existent pas en solo. Côté serveur : `GET /api/salon/:code`, et l'option `prive: true` à la création.
- **Téléphone et tablette** : un joystick apparaît sous le pouce gauche, avec les boutons ⚔ E ⇧ F 💨 ★ à droite. La visée est automatique sur l'ennemi le plus proche, avec une petite vibration à chaque bouton. La caméra est plus reculée, la mini-carte est en haut à droite, et un message demande de passer en paysage. On peut forcer le mode tactile sur PC avec `?tactile=1`.
- **Tutoriel** à la première partie (6 étapes, peut être passé).
- **Titan de la horde** : un boss arrive avec une horde sur trois. Il a 1400 PV, plus si plusieurs joueurs sont connectés. Il fait une onde de choc annoncée au sol, invoque des coureurs, et ne peut pas être immobilisé. L'achever rapporte 220 XP, +60 % d'ultime et 6 orbes. Une barre de vie s'affiche en haut de l'écran. Il repart sous terre au bout de 3 minutes.
- Le clic gauche attaque immédiatement, même sur un clic très court.

## v0.10 — Nouveau HUD et sorts personnalisés par champion
- **HUD** : bandeau de fusion avec pastilles d'éléments, portrait rond avec badge de niveau, barre de PV qui change de couleur (vert, jaune, rouge) avec une traînée des dégâts récents, bouclier hachuré. Sorts avec icônes et recharge circulaire, qui scintillent quand ils redeviennent prêts. Ultime dans un anneau qui se remplit. Classement numéroté et fil des éliminations avec portraits.
- **Sorts par champion** (`client/src/styles.js`) : chacun des 36 champions a sa forme de projectile (plume, bulle, kunaï, shuriken, crâne, prisme, flocon, engrenage, épée, croissant…), une double traînée aux couleurs de ses 2 éléments, des éclats propres à l'impact, et un coup au corps à corps adapté à son arme : croissant (faux, haches), griffes, onde de choc (poings, marteaux), lame qui balaie (épées), double entaille, fissure au sol pour les coups lourds. Les rayons sont décorés aux formes du champion.
- Nouvelles formes générées par `tools/gen_fx2.py`.

## v0.11 — Défis du jour, titres et événements de carte
- **Défis du jour** : 3 défis (facile +50, moyen +100, difficile +200 de gloire), les mêmes pour tout le monde le même jour, renouvelés à minuit. Ils sont affichés dans le menu avec leur progression, et une notification apparaît en jeu quand l'un est réussi.
- **Titres** (21) : débloqués par les statistiques cumulées (Chasseur de zombies, Tueur de Titans, Champion du tournoi, Maître du Feu…). Le titre choisi s'affiche en doré au-dessus de ton pseudo, visible par tous les joueurs. Sauvegarde dans le navigateur (`client/src/progress.js`).
- **Événements de carte** toutes les 55 à 85 s (Monde ouvert et Battle royale) :
  - ☄ **Pluie de météores** : des impacts annoncés tombent autour des joueurs.
  - 💎 **Orbe légendaire** : une colonne dorée visible de loin et sur la mini-carte. Elle donne l'ultime et les PV au maximum.
  - 🌑 **Éclipse** : l'Ombre fait +30 % de dégâts.
  - 🌪 **Tempête élémentaire** : un élément au hasard fait +30 % de dégâts.
  - ✨ **Ruée aux orbes** : 18 orbes supplémentaires, qui donnent deux fois plus.

  Chaque événement a sa pastille avec un compte à rebours et son ambiance à l'écran.

## v0.12 — Retours de test : sorts uniques, ultimes plus rares, carte plus grande
- **Sorts signature** (`shared/signatures.js`) : chacun des 36 champions a son attaque de base, son sort E, son sort F et le nom de son sort Shift, tous propres à lui (plus de « Estocade · Feu » partagé). Nouvelles formes de sorts :
  - **salve** : plusieurs tirs à la suite ;
  - **fissure** : une ligne d'impacts qui avance ;
  - **boomerang** : le projectile revient vers le lanceur ;
  - **grappin** : le lanceur fonce sur la cible touchée ;
  - **tentacule** : ramène la cible vers le lanceur ;
  - **nova avec recul**.
- **Ultimes plus rares** :
  - la recharge passive est passée de 1,5 à 0,45 par seconde ;
  - la recharge par dégâts passe de 0,8 à 0,32 par point ;
  - les orbes donnent +7 (au lieu de +20) ;
  - le Titan donne +30 (au lieu de +60) ;
  - Âme ardente donne +15 % (au lieu de +25 %) ;
  - plus aucune recharge pendant 12 s après un ultime.

  En test, chaque bot lance 2 à 4 ultimes en 3 minutes de combat continu.
- **Carte agrandie x1,4** (5600 × 4200) : 108 bâtiments, sol et bâtiments régénérés, 55 orbes, 24 zombies au départ.
- **Battle royale à 50 joueurs** : zone de départ plus grande (3700) qui se referme en 4 min. Réseau : environ 19,5 Ko/s par joueur.
- **Personnage chargé avant le combat** : le serveur ne fait apparaître un joueur qu'après le message `pret`, envoyé quand le jeu a fini de se charger.
- **Terrains élémentaires** (32 zones) :
  - **lave** : brûle, sauf les champions de Feu, qui y courent plus vite ;
  - **eau profonde** : ralentit, sauf les champions d'Eau. Un sort d'Éclair qui touche quelqu'un dans l'eau électrise toute la flaque ;
  - **glace** : on glisse, sauf les champions de Glace ;
  - **herbes hautes** : on y devient invisible tant qu'on n'attaque pas.

  Les bots sortent de la lave.
- **Musiques par mode** (`tools/gen_music2.py`) : Monde ouvert (calme), Battle royale (tendue, avec une musique de combat dans les 10 derniers), Tournoi (taikos et cuivres), et une musique de Titan quand le boss est là. Fondus enchaînés entre les pistes.

## v0.13 — Lumière, Nature et explications des sorts
- **2 nouveaux éléments**, soit 10 éléments et 55 fusions :
  - ☀ **Lumière** : aveugle (la cible fait -30 % de dégâts pendant 2,5 s).
  - 🌿 **Nature** : enlace (ralentit ; un 2e coup immobilise).

  Nouveaux combos : Enraciné, Incendie, Croissance, Purification, Éclipse et Prisme. 19 nouveaux champions, chacun avec sa classe, son arme, ses sorts signature, son style visuel et son ultime (Arc-en-ciel, Aube, Paladin, Séraphin, Archange, Aurore, Crépuscule, Croisé, Floraison, Lumière Pure, Mangrove, Incendie, Gaïa, Sylphe, Ronce-foudre, Taïga, Sombrebois, Ronce d'acier, Nature Pure).
- **Carte à 10 biomes** (4 colonnes × 3 rangées) : nouveaux biomes ☀ Sanctuaire (dalles de marbre, temples dorés, cristaux de lumière) et 🌿 Forêt ancienne (sous-bois, huttes, herbes hautes). La ville est plus large et les arènes du tournoi ont été déplacées.
- **Explications des sorts** (`shared/describe.js`), générées à partir des valeurs du sort : ce qu'il fait, ses dégâts, ses effets et sa recharge.
  - Survol d'une case de sort = infobulle.
  - **I** ou clic sur le portrait = fiche complète de ton champion.
  - Clic sur un champion du grimoire = sa fiche, même s'il n'est pas encore obtenu.
- Illustrations : images provisoires (recoloriées) en attendant les vraies illustrations IA des 19 champions.

## Organisation du code (v15)

- `shared/game/ArenaLogic.js` — cœur d'une salle : arrivées/départs, boucle, apparition, bots ajoutés.
  - `combat.js` (sorts, projectiles, zones, dégâts, mort), `modes.js` (Battle royale, Tournoi/Classé, Duo, événements),
    `monstres.js` (zombies, boss, Survie), `bots.js` (IA), `commun.js` (constantes partagées).
- `client/src/ArenaScene.js` — scène Phaser : chargement, boucle, entrées.
  - `scene/decor.js` (cartes, mini-carte), `scene/persos.js` (joueurs, prédiction, monstres), `scene/effets.js` (sorts et impacts).
- `server/src/journal.js` — journal des erreurs, consultable sur `/api/erreurs` (variable `JOURNAL_CLE` pour le protéger).

## Tests

- `npm test` — logique de jeu (une partie accélérée de chaque mode, invariants, saisons, cosmétiques)
  et vrai serveur (API, comptes, salons privés, reconnexion, messages invalides). ~1 min.
- `npm run test:navigateur` — dans Chrome (Playwright) : menus PC et téléphone, chaque mode en solo,
  jeu en ligne avec ~200 ms de latence simulée, reconnexion après coupure. Nécessite `npm run build` avant.
- `node tools/equilibrage.mjs 4 0.5,0.85 5` — duels de bots entre les 55 champions et recalcul des coefficients.

## Mesures et fiabilité (v18)

- **Compression et cache** : le serveur compresse JS/CSS/HTML/JSON (brotli ou gzip) et les garde en mémoire ; les fichiers de `assets/` sont mis en cache 1 an par le navigateur.
- **Anti-veille Render** : sur Render, le serveur visite `/health` toutes les 10 min pour ne pas s'endormir. Variable `GARDER_EVEILLE=0` pour le couper.
- **Mesures de confort** : `/api/mesures` résume les FPS, le ping et le temps d'attente des dernières parties (ajoute `?cle=…` si `JOURNAL_CLE` est défini).
- **Tests automatiques** : `.github/workflows/tests.yml` lance build + tests à chaque push (onglet Actions sur GitHub).

## Test des visuels des champions (v19-v20)

Réglages > Test des visuels : style des champions (normal, illustration, fait maison, pixel art, 3D rendue en 2D) et champion imposé en solo.
- Pixel art : `python3 tools/lpc_champion.py <spritesheets LPC> client/public <fusion>` (calques CC BY-SA / GPL, crédits dans `sprites_pixel/`).
- 3D rendue en 2D : `tools/rendu3d/` — `recolor.py` (texture), `rendu.py` (Blender `pip install bpy`, moteur Workbench), `assembler.py` (planches). Modèles KayKit CC0.

## v22 : équilibrage réel, maîtrise, nouveaux sorts

- `/equilibrage.html` : tableau triable des 55 champions (taux de choix, victoires et kills/mort des vrais joueurs), à partir de `/api/stats`.
- Maîtrise par champion (navigateur, sauvegardée avec le compte) : 5 niveaux, titres « Disciple · Nom » et « Maître · Nom ».
- Nouvelles formes de sorts : `soin_zone`, `tourelle` (invocation), `mur` ; ultimes `prison`, `sanctuaire`, `armee` ; tag `etourdi` (statut `stun`).

## Le Conclave des éléments (v23)

Jeu de déduction sociale à 5-10 joueurs, sur le même site et le même serveur : `/conclave/`.
- Règles et partie (logique pure, testée) : `shared/conclave/regles.js`, `shared/conclave/partie.js`.
- Salle Colyseus `conclave` : `server/src/ConclaveRoom.js` (vues privées par joueur, reconnexion 60 s, résultats en base via `stats.js`).
- Page : `client/conclave/index.html` + `client/src/conclave/` (DOM, pas de Phaser).
- Statistiques : `/api/conclave/stats` (victoires par camp, par réglage).
- Tests : `tests/conclave.test.mjs` (dont 100 parties complètes jouées par des bots) et section 6 de `tests/navigateur.py`.

## Zone Morte, phase 1 « Socle » (v25)
Troisième jeu du site, page `/zone-morte/` (bouton dans l'accueil commun). Survie à la Project Zomboid, en solo pour l'instant.
- `shared/survie/monde.js` : monde **infini** généré par morceaux de 32 × 32 m à partir d'une graine. Régions de 8 × 8 morceaux, une ville sur deux environ (centre commerçant avec supermarché, pharmacie, quincaillerie, commissariat… + quartiers de maisons), campagne entre les villes (champs, forêts, routes). Plus on s'éloigne, plus les villes sont grandes. Seules les modifications (portes, vitres) sont sauvegardées.
- `shared/survie/physique.js` : déplacement avec collisions, portes (ouvrir / fermer), fenêtres à casser puis enjamber, champ de vision par lancer de rayons, heure (1 journée = 40 min) et obscurité.
- `client/src/zone-morte/` : rendu Phaser (une texture par morceau, toits qui disparaissent quand on entre, ombre hors du champ de vision, nuit avec halo), carte des zones explorées (M), commandes tactiles, sauvegarde locale.
- Tests : `tests/zonemorte.test.mjs` + section 8 de `tests/navigateur.py`.

## Zone Morte, phase 2 « Zombies » (v26)
- `shared/survie/zombies.js` : population par morceau (beaucoup en centre-ville, peu à la campagne), seuls les 5 × 5 morceaux autour du joueur sont simulés, les autres rangés (on garde le nombre). Les zombies **entendent** (pas : 3 m en marchant, 9 m en courant, presque rien accroupi ; vitre : 22 m), **voient** (13 m le jour, 6,5 m la nuit, moitié moins si on est accroupi), **errent**, **poursuivent** en contournant les murs (chemin sur la grille), cassent les fenêtres et **enfoncent les portes** (12 coups).
- `shared/survie/survivant.js` : santé, endurance, blessures (agrippé, égratignure, lacération, morsure : plus probable encerclé ou pris de dos), saignement, bandages de fortune, infection (une morsure tue en ~1 h réelle), mort définitive.
- Combat : batte (Espace ou clic, on vise à la souris), bousculer (F ou clic droit), achever un zombie à terre, accroupi (C), se bander (B). Écran de mort et record.
- Tests : 8 nouveaux dans `tests/zonemorte.test.mjs`, section 8 de `tests/navigateur.py` étendue.
