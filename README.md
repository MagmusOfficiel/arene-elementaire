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

## Zone Morte, phase 3 « Survie » (v27)
- `shared/survie/objets.js` : 25 objets (nourriture, boissons, soins, 7 armes, lampe, piles, sac, planches, clous), butin par meuble (frigo, placard, évier, armoire, commode, bibliothèque, lit) et par rayon de magasin (supermarché, pharmacie, quincaillerie, station-service, commissariat, boutique), toujours le même pour une graine ; inventaire au poids.
- `shared/survie/survivant.js` : faim, soif, fatigue (humeurs comme dans Project Zomboid), mort de soif ou de faim, armes qui s'usent et cassent, lampe torche (faisceau qui ne traverse pas les murs, mais les zombies te voient de plus loin), sac à dos, sommeil (le temps passe 30 fois plus vite, un zombie tout près te réveille).
- Client : fouille (E, 1,2 s, un peu de bruit), panneau inventaire (I ou Tab) avec le meuble à côté, poser des objets par terre (cachettes), boire au robinet et remplir les bouteilles à l'évier, dormir dans un lit, L pour la lampe.
- Tests : 7 nouveaux dans `tests/zonemorte.test.mjs`, fouille et repas dans `tests/navigateur.py`.

## Zone Morte, phase 4 « Base » (v28)
- `shared/survie/construction.js` : barricades (R : marteau + planche + 2 clous, jusqu'à 3 planches par porte ou fenêtre, bruyant), démontage (X : un meuble vide donne 2 ou 3 planches avec marteau, pied-de-biche ou hache ; une barricade rend sa planche), cuisine (plat de pâtes, soupe, steak grillé sur la cuisinière ou un feu), feu de camp (dehors, 2 planches + allumettes, 4 h, éclaire la nuit).
- Les zombies arrachent les planches une à une (8 coups chacune) ; une porte barricadée ne s'ouvre plus ; 2 planches cachent la vue.
- Viande crue : intoxication possible (8 h, la santé baisse). Nouveaux objets : pâtes, légumes, steak, clous en vrac, allumettes, plats cuisinés.
- Les meubles servent de rangement (« Poser ici »). Objectifs de départ affichés (manger, outils, barricade, dormir, 3 jours).
- Tests : 6 nouveaux dans `tests/zonemorte.test.mjs`, barricade dans `tests/navigateur.py`.

## Zone Morte, phase 5 « Profondeur » (v29)
- `shared/survie/competences.js` : 7 compétences qui montent en faisant (Combat, Tir, Charpenterie, Discrétion, Course, Fouille, Premiers soins ; niveaux 1 à 5) et 6 métiers de départ (Sans emploi, Policier, Charpentier, Infirmier, Coureur, Cuisinier).
- `shared/survie/tir.js` : pistolet et fusil à pompe (cône, 3 plombs), munitions, rechargement (R), précision selon la distance et la compétence, la balle s'arrête aux murs, détonation entendue à 35-45 m.
- `shared/survie/evenements.js` : calendrier tiré de la graine. Électricité coupée entre le jour 4 et le jour 6 (cuisinières hors service, frigos qui pourrissent un jour après), eau coupée un ou deux jours plus tard ; hélicoptère le jour 2 ou 3 qui attire les morts ; nuits de horde (de plus en plus fréquentes).
- Compte et classement : la partie est sauvegardée compressée sur le compte (reprise sur un autre appareil), fin de partie = XP de compte + score envoyé à `/api/zonemorte/score`, classement mondial `/api/zonemorte/classement` affiché dans le menu.
- Tests : 5 nouveaux dans `tests/zonemorte.test.mjs`, 1 dans `tests/serveur.test.mjs`, métier et fin de partie dans `tests/navigateur.py`.

## Zone Morte en coop (v30)
- `server/src/ZoneMorteRoom.js` : salle privée `zonemorte` (2 à 4 joueurs, code à 4 lettres, trouvée par `/api/salon/:code`). Le serveur fait vivre le monde partagé : zombies (horde multi-joueurs : chacun poursuit le survivant visible le plus proche), portes et vitres, barricades, contenu des meubles, objets posés, feux, heure (le temps ne file en dormant que si tout le monde dort), hélicoptère et hordes. Photos des zombies proches 10 fois par seconde, messages courts pour le reste, petit chat.
- Chaque joueur garde son survivant (santé, sac, besoins, compétences) dans son navigateur ; les coups et tirs sont calculés par le serveur, qui renvoie les touches.
- Client : mode réseau « miroir » dans `client/src/zone-morte/main.js` (variable `net`), autres survivants dessinés avec leur nom, sur la carte aussi ; mort = on repart avec un nouveau survivant dans le même monde.
- Tests : `tests/serveur.test.mjs` (salle coop), `tests/zonemorte.test.mjs` (horde multi-joueurs), section 9 de `tests/navigateur.py`.

## Les Ombres de Baker Street, chapitre 1 (v31)
Quatrième jeu du site, page `/enquete/` : enquête en 2D dans le Londres de 1891, où tes choix font de toi un détective… ou un criminel.
- `shared/enquete/moteur.js` : moteur pur (heure, argent, indices, déductions, jauges Justice/Corruption et Yard/Pègre, lieux et horaires, dialogues à conditions et effets, ruelles dangereuses la nuit, blessures et mort, dormir et reprise au dernier matin, délai, accusation, rapport, titres), plus une vérification automatique d'un chapitre.
- `shared/enquete/chapitre1.js` : « L'Horloger de Clerkenwell » — 8 lieux, 12 personnages, 16 indices, 5 déductions, 8 fins (Justice rendue, Double jeu, L'erreur, Trop tard, Faute de preuves, Le marché, La recrue, Mort).
- `client/enquete/` + `client/src/enquete/` : écran titre, carte de Londres (fiacre ou à pied), lieux à fouiller, dialogues avec portraits, carnet (indices, déductions, personnes, journal), rencontres nocturnes, accusation avec preuves, rapport final ; illustrations lues dans `client/public/enquete/img/` (portrait_<id>.jpg, decor_<lieu>.jpg, carte.jpg, titre.jpg), silhouettes à la place tant qu'elles manquent.
- Sauvegarde dans le navigateur et sur le compte commun ; XP de compte à la fin du chapitre.
- Tests : `tests/enquete.test.mjs` (14 tests, chaque fin jouée automatiquement), section 10 de `tests/navigateur.py`.

## Les Ombres de Baker Street, chapitre 2 (v33)

« La Chambre forte de la City » (`shared/enquete/chapitre2.js`). La banque Crale est vidée sans effraction, le veilleur Tobias Reed est tué, et le Yard veut pendre Hannah Bright.

- **Héritage du chapitre 1** : à la fin d'un chapitre, `M.heritage(ch, e)` résume la fin, le titre, les jauges, l'argent et les drapeaux. `M.nouvelEtat(ch2, nom, heritage)` les reprend (drapeaux préfixés `prec_`, fin en `prec_fin_<fin>`), puis `ch.heriter()` en tire les conséquences : Arthur libre ou en cellule, Lusk en prison ou dans sa boutique, le Doyen ami (mission : faire tomber Hannah) ou ennemi (ses tueurs rôdent la nuit), Vane qui se souvient de ce que tu as fait.
- 17 indices, 7 déductions, 9 lieux (nouveau : l'hôtel Crale à Mayfair), 15 personnages (nouveaux : Edmund Crale, Martha Reed).
- 10 fins : justice, double jeu, erreur, complice, faute de preuves, trop tard, **bras droit du Doyen**, **le nouveau Doyen** (prendre la pègre avec Gros Bill), **maître chanteur**, mort.
- Écran titre : « Chapitre 2 » repart de la dernière fin du chapitre 1 sauvegardée (sinon « Justice rendue »). Le rapport du chapitre 1 propose « Chapitre suivant ».
- Rencontres conditionnelles (`cond` sur une rencontre) ; option d'accusation propre à chaque chapitre (`ch.option`).
- Tests : `tests/enquete2.test.mjs` (héritage + chaque fin jouée).

## Les Ombres de Baker Street : plans vus de dessus et tableau Cluedo (v34)

Le chapitre 1 se joue maintenant comme un Cluedo :

- **Plans vus de dessus** (`shared/enquete/plans1.js`, rendu dans `client/src/enquete/plan.js`). Chaque lieu a plusieurs pièces décrites en ASCII (`#` mur, `+` porte, une lettre par pièce). On dirige son détective avec ZQSD, WASD, les flèches ou un clic (chemin le plus court), et E ou Espace examine le meuble ou parle au personnage le plus proche. La nuit, seule la lumière autour du détective éclaire le plan.
- **Indices cachés** : plus aucun cadre. Les meubles reliés à une zone donnent l'indice ; les autres sont des leurres (3 minutes perdues). Certains indices restent invisibles tant qu'on ne sait pas quoi chercher (`avant`), par exemple la serrure de l'atelier avant d'avoir vu le verrou.
- **Tableau du détective** (onglet « Tableau » du carnet, `ch.questions`) : Qui ? Avec quoi ? Comment ? Pourquoi ? On barre les hypothèses. Pour accuser, il faut répondre aux quatre ; une réponse ne compte que si elle est juste ET appuyée par un indice ou une déduction de sa liste `preuves`. Il en faut 3 sur 4 (`M.accuserTableau`). Le rapport de fin détaille le raisonnement.
- `M.verifierChapitre` contrôle aussi chaque plan : rangées de même longueur, meubles sur le sol, chaque zone reliée à un meuble, tout accessible depuis l'entrée.
- Le chapitre 2 garde pour l'instant l'ancienne vue (décor peint + zones) ; ses plans arrivent ensuite.

## Les Ombres de Baker Street : enquêteur seulement, chapitres débloqués, plans redessinés (v35)

Remplace les sections v33 et v34 sur l'héritage et les voies criminelles :

- **On est seulement enquêteur.** Plus de pots-de-vin, de Chandelle à rejoindre, de jauges ni de titres. Chaque chapitre a 5 fins : `resolu` (le vrai coupable, avec au moins 3 réponses du tableau justes ET prouvées), `relache` (bon suspect, raisonnement insuffisant), `erreur` (mauvais suspect), `delai` et `mort` (on reprend au matin).
- **1 chapitre = 1 enquête.** Aucun choix ne passe d'un chapitre à l'autre. Résoudre un chapitre le marque dans la sauvegarde (`ombresBS` = `{ v: 2, resolus: [...], partie }`) et débloque le suivant sur l'écran titre.
- **Chapitre 2** réécrit en enquête indépendante, avec ses plans (`shared/enquete/plans2.js`, dont l'hôtel Crale de Mayfair) et son tableau Qui / Avec quoi / Comment la chambre forte a été ouverte / Pourquoi.
- **Plans dessinés en code** (`client/src/enquete/plan.js`) : parquet, damier, dalles, planches, marbre, tapis persans ; murs en relief (papier peint, briques, boiseries) ; une quarantaine de meubles dessinés ; feu animé et fumée ; lumière des lampes, du feu et des fenêtres, obscurité selon l'heure, lanterne du détective la nuit ; poussière, brume, vignettage ; personnages animés avec leur tenue (haut-de-forme de Vane, melon de Gribble, plume de Margot…) qui se tournent vers toi ; caméra qui suit le détective ; nom de la pièce à l'entrée ; portrait au-dessus du personnage dont on s'approche.

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
