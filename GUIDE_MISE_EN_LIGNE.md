# Mettre Arène Élémentaire en ligne (gratuit, sans rien installer)

## Option express — Netlify en glisser-déposer (2 minutes, mode solo)

1. Va sur **https://app.netlify.com/drop** (crée un compte gratuit si demandé).
2. Décompresse `arene-netlify.zip` : tu obtiens un dossier `arene-netlify`.
3. **Glisse ce dossier** dans la zone de dépôt de la page Netlify.
4. Ton lien apparaît (ex. `https://joyeux-phenix-12345.netlify.app`) : le jeu est jouable tout de suite,
   **en solo** contre les mannequins et les zombies (Mêlée et Battle royale). Tout tourne dans le navigateur.

> Netlify n'héberge que des fichiers : il ne peut pas faire tourner le serveur multijoueur (connexions WebSocket permanentes).
> Pour jouer **à plusieurs**, il faut en plus le serveur sur Render (ci-dessous), puis relier les deux :
> dans le dossier `arene-netlify`, ouvre `config.js` avec le Bloc-notes et mets
> `window.ARENE_SERVEUR = 'wss://TON-LIEN-RENDER.onrender.com';` puis redépose le dossier sur Netlify.
> (Ou plus simple : utilise directement le lien Render, qui sert aussi la page du jeu.)

---

## Option complète — multijoueur sur Render

Objectif : obtenir un lien du type `https://arene-elementaire.onrender.com` à ouvrir dans le navigateur et à partager à tes potes.
Durée : environ 15 minutes. Il te faut seulement une adresse e-mail.

## Étape 1 — Mettre le projet sur GitHub

1. Crée un compte sur **https://github.com** (gratuit).
2. En haut à droite : **+** → **New repository**.
   - Nom : `arene-elementaire`
   - Visibilité : **Public** (ou Private, ça marche aussi)
   - Clique **Create repository**.
3. Sur la page du dépôt vide, clique **uploading an existing file**.
4. Décompresse `arene-elements.zip` sur ton ordinateur, ouvre le dossier `arene-elements`,
   sélectionne **tout son contenu** (dossiers `client`, `server`, `shared`, `tools` + fichiers `package.json`, `Dockerfile`, `render.yaml`…)
   et glisse-le dans la page GitHub.
5. Clique **Commit changes**.

> GitHub limite l'envoi par glisser-déposer à 100 fichiers à la fois : si besoin, envoie d'abord `client`, puis le reste.

## Étape 2 — Déployer sur Render

1. Crée un compte sur **https://render.com** avec « Sign in with GitHub ».
2. Tableau de bord → **New +** → **Blueprint**.
3. Choisis ton dépôt `arene-elementaire` → Render lit `render.yaml` tout seul → **Apply**.
4. Attends la fin de la construction (5 à 8 minutes la première fois). Le statut passe à **Live**.
5. Ton lien apparaît en haut : `https://arene-elementaire-xxxx.onrender.com`. C'est tout !

## Étape 3 — Garder les classements (base gratuite Upstash, 5 minutes)

Sans base, Render efface les classements (Classé, Survie, meilleurs joueurs) à chaque redémarrage.

1. Va sur https://upstash.com → crée un compte gratuit → **Create Database** (type Redis, région Europe, offre Free).
2. Dans la base créée, section **REST API**, copie `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
3. Sur Render → ton service → **Environment** → ajoute ces deux variables avec leurs valeurs → **Save**. Render redémarre tout seul.
4. Vérifie : `https://<ton-serveur>.onrender.com/api/version` doit afficher `"sauvegarde":"base"`.

## Bon à savoir

- **Offre gratuite** : le serveur s'endort après 15 minutes sans joueur. Le premier qui ouvre le lien attend ~1 minute qu'il se réveille, ensuite tout est fluide. L'offre payante (~7 $/mois) supprime cette mise en veille.
- **Statistiques d'équilibrage** : `https://ton-lien/api/stats` (taux kills/morts, victoires, dégâts par fusion).
  Sur l'offre gratuite, elles sont remises à zéro à chaque redémarrage.
- **Classement** : `https://ton-lien/api/classement`.
- **Mettre à jour le jeu** : renvoie les fichiers modifiés sur GitHub (glisser-déposer) → Render redéploie automatiquement.

## Alternatives

- **Railway** (https://railway.app) : « Deploy from GitHub repo », détecte le `Dockerfile` tout seul.
- **Fly.io** : plus technique (ligne de commande), mais pas de mise en veille.


## Salons privés (v0.9)
Les salons privés passent par le serveur multijoueur. Si ton jeu est sur Netlify, mets l'adresse de ton serveur Render dans `config.js` (dans le dossier déposé sur Netlify) :
`window.ARENE_SERVEUR = 'wss://ton-serveur.onrender.com';`
Ensuite, le lien d'invitation (`https://ton-site.netlify.app/?salon=ABCD`) fonctionne directement.
