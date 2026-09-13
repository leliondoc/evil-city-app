# Evil City

Jeu de stratégie solo en temps réel, jouable dans le navigateur. Une campagne de trois quartiers introduit progressivement la construction, le commandement et la conquête : Le Refuge (3 objectifs), Le Faubourg (4), puis Les Tilleuls (5).

## Lancer le projet

Node.js 24 recommandé ; minimum 22.13. Les versions des dépendances sont verrouillées dans `package-lock.json`.

```sh
npm ci
npm run dev
```

Ouvrir `http://127.0.0.1:3000/`. Le serveur de développement reste limité à la machine locale. Les scènes préparées sous `/tests/*-preview.html` servent aux contrôles de développement et ne sont pas distribuées.

## Contrôles avant publication

```sh
npm test
npm run lint
npm run check:unused
npm run build
npx playwright install chromium webkit
npm run test:browser
```

- `npm test` vérifie la simulation, les ordres, l’économie, les combats, les ressources, la progression et les règles audio, sans navigateur.
- `npm run lint` lance Oxlint avec vérification des types. TypeScript reste strict ; variables et paramètres inutilisés sont également interdits.
- `npm run check:unused` vérifie les fichiers, exports et dépendances avec Knip. Les scripts et fixtures sont des points d’entrée explicites. Les trois exceptions de résolution correspondent aux modules virtuels Vite employés par le test de cycle de vie Pixi.
- `npm run build` produit `dist/`, avec des chemins relatifs et une cible explicite Safari 16.4, Chrome/Edge 111, Firefox 128.
- `npm run test:browser` sert uniquement `dist/` sous `/portable/`, sur un port local libre. Il bloque les requêtes externes et contrôle Chromium et WebKit : menu, démarrage, carte, recrutement, raccourcis, reprise et récupération après un module manquant, sur ordinateur, téléphone et tablette. Ses captures sont écrites dans un répertoire temporaire.

GitHub Actions exécute ces contrôles avant de publier `dist/` sur GitHub Pages. Sur Linux, installer les dépendances système des navigateurs avec `npx playwright install --with-deps chromium webkit`. `npm audit` vérifie séparément les avis de sécurité disponibles à la date de lancement.

Pour un contrôle navigateur de développement, garder le serveur local ouvert puis lancer le script concerné :

```sh
node scripts/check-mobile.mjs
node scripts/check-pixi.mjs
node scripts/check-pixi-lifecycle.mjs
node scripts/check-mission.mjs
node scripts/check-menu-music.mjs
node scripts/check-map-selection.mjs
node scripts/check-campaign.mjs
node --experimental-strip-types scripts/check-campaign-balance.mjs
```

Les anciens contrôles dédiés acceptent `PLAYWRIGHT_CHANNEL` pour choisir Chrome ou Chromium et `PLAYWRIGHT_PACKAGE` pour un environnement externe. Le contrôle du build utilise le Playwright verrouillé du projet ; `PLAYWRIGHT_BROWSERS=chromium` ou `webkit` limite son exécution à un moteur. Le contrôle de campagne accepte `CAMPAIGN_BROWSER=webkit` et `CAMPAIGN_WIDTH` pour isoler un format. Il vérifie cinq formats, le parcours tactile, la transition entre chapitres, le guide et le réglage de taille ; ses captures sont temporaires.

## Interface et commandes

Le menu utilise des particules et le dégradé commun aux cartes : `#443A50` vers `#20323B`. Le violet principal est `#74518D`. Les artworks sont archivés dans `art-source/menu/` et ne sont plus livrés au navigateur. Le titre conserve Agenda Fantasy et ses dégradés dorés ; la devise est « Le mal ne fait pas de quartier. »

Sur ordinateur : clic pour sélectionner, glisser ou ZQSD pour déplacer la carte, molette pour zoomer, Shift + clic/glisser pour composer un groupe. Les flèches déplacent la carte lorsqu’elle a le focus. Clic droit annule un placement en cours ou donne un ordre contextuel. Espace met en pause, R rappelle l’armée, H ouvre l’aide, 1 à 7 choisit l’option de l’onglet actif. Ctrl, Commande et Alt restent réservés aux raccourcis du système et du navigateur.

Sur téléphone et tablette : toucher une unité puis une rue libre la déplace ; toucher un ennemi donne un ordre d’attaque aux combattants sélectionnés. Glisser explore la carte et pincer zoome, sans modifier les ordres. Groupe compose une sélection, Ordre permet une commande contextuelle et Désélectionner libère la sélection. Le guide compact reste sous les ressources ; son contenu déplié défile sur les écrans courts. Les détails sont fermés au démarrage et possèdent une croix sur tous les écrans. La navigation du bas et la roue du manoir donnent accès aux constructions, créatures, réglages et à la pause.

Les combattants conservent la priorité d’un ordre pendant toute son exécution, puis 30 secondes après sa fin. Un nouvel ordre relance cette priorité. Tenir maintient la position sans limite, avec riposte à portée ; un nouvel ordre la libère. Les repas et le repos reprennent automatiquement après le délai. La taille de l’interface est réglable de 80 à 130 % ; sur tactile, la taille du texte change tout en conservant des commandes d’au moins 44 pixels.

Le menu et le jeu partagent les réglages audio. La lecture est tentée à l’ouverture du menu puis au premier geste si le navigateur exige une interaction. Les musiques entrent progressivement, s’effacent en fin de piste et conservent leurs longues pauses. Les mobilisations humaines et héroïques utilisent leurs thèmes sans boucle. La musique sombre accompagne le premier passage au-dessus de 60 % du territoire. Les sources et réglages sont détaillés dans [ASSETS.md](ASSETS.md).

## Simulation et architecture

Le Refuge commence sans ouvrier et sans attaque humaine. Il apprend à recruter un gobelin, bâtir une cantine, puis réunir deux lanciers au drapeau. Le Faubourg fournit un camp établi et enseigne la conquête, le manoir niveau 2 et les squelettes, sans raids chronométrés. Les Tilleuls ajoutent les recherches, les spécialistes, les trolls et les réactions humaines. Chaque quartier a sa disposition de bâtiments, son armée de départ, ses ressources et sa victoire. Les cartes de création se révèlent au fil des étapes ; les mêmes restrictions s’appliquent aux commandes du moteur et aux raccourcis. Les objectifs déjà validés restent acquis après une perte, tandis que la victoire exige toujours le contrôle effectif de ses cibles. Voir [les choix de conception](docs/onboarding-3-chapitres.md).

Les livraisons alimentent réellement les stocks ; les constructions, recherches et améliorations prennent du temps. La mairie et la guilde financent leurs renforts avec les ressources des paysans. Les paysans tués ou déplacés par la fermeture d’une route peuvent être remplacés après les délais prévus, même quand leur disparition a épuisé les stocks nécessaires au recrutement. La provocation bloque les ordres des unités concernées ; une garnison peut quitter sa tour sur un ordre individuel.

| Fichier | Responsabilité |
| --- | --- |
| `app/App.tsx` | Menu, chargement différé, récupération après erreur |
| `app/game/Game.tsx` | Interface React et commandes du joueur |
| `app/game/gameStore.ts` | Simulation et snapshots consommés par React |
| `app/game/engine.ts` | État, navigation, économie et ordres sans dépendance au DOM |
| `app/game/combat.ts`, `domain.ts`, `strategy.ts`, `shields.ts` | Combat et mécaniques spécialisées |
| `app/game/progression.ts`, `mission.ts` | Déblocages, coûts, durées et objectifs |
| `app/game/campaign.ts`, `preferences.ts` | Trois scénarios, découvertes progressives, progression et taille de l’interface |
| `app/game/renderer.ts` | Caméra, entrées tactiles/souris, sélection sur l’alpha et animation |
| `app/game/pixiScene.ts`, `terrainRenderer.ts` | Scène WebGL, textures et terrain mis en cache |
| `app/game/audio.ts`, `music.ts`, `musicPlaylist.ts` | Effets, réglages et transitions musicales |
| `components/ui/` | Les cinq composants Base UI réellement utilisés |

Le moteur reçoit explicitement le temps de simulation. Le rendu Pixi réutilise ses objets et reconstruit le terrain après une perte du contexte WebGL. Les masques de sélection ne conservent que l’alpha ; la densité d’affichage est limitée à 2 et réévaluée lors d’un changement d’écran. Les sprites multirangs utilisent le même découpage dans le bestiaire et sur la carte.

## Limites et portabilité

« Reprendre » garde la partie tant que cette page existe. Les trois quartiers sont accessibles dès la première visite depuis la carte qui suit « Jouer ». Le Refuge est conseillé pour débuter ; Les Tilleuls peuvent être lancés directement. La progression, la taille de l’interface et les réglages audio sont enregistrés localement quand le navigateur le permet. Chaque chapitre repart de son camp prédéfini, sans transfert de troupes ni de stocks. Il n’y a pas encore de sauvegarde persistante de partie, de multijoueur, d’application iOS, d’exécutable Steam, ni de prise en charge complète des manettes.

Les trois quartiers partagent la grille de rues et les accès aux ressources ; leurs implantations et scénarios sont définis séparément. Des géographies arbitraires nécessiteraient encore de généraliser la navigation et les ponts. Le moteur sans paramètre conserve le scénario libre historique pour les fixtures de régression ; le jeu démarre avec le quartier choisi sur la carte. Une migration des tâches vers des unions discriminées et une séparation progressive des gros modules restent des améliorations d’architecture à traiter avec leurs propres tests.

Les tests WebKit automatisés ne remplacent pas une validation sur iPhone/iPad, WKWebView, interruptions audio réelles, Steam Deck et matériel peu puissant. Les licences des assets doivent également couvrir chaque distribution : notamment Agenda Fantasy Demo et les MP3 fournis par l’utilisateur.

Voir [l’audit du 12 septembre 2026](docs/audit-2026-09-12.md), [l’analyse iOS et Steam](docs/audit-portability.md) et [la provenance des ressources](ASSETS.md).
