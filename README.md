# Evil City

Jeu de stratégie solo en temps réel, jouable dans le navigateur. Développez votre domaine dans le quartier des Tilleuls, recrutez vos créatures et prenez la mairie et la guilde tout en protégeant le manoir.

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
```

Les anciens contrôles dédiés acceptent `PLAYWRIGHT_CHANNEL` pour choisir Chrome ou Chromium et `PLAYWRIGHT_PACKAGE` pour un environnement externe. Le contrôle du build utilise le Playwright verrouillé du projet ; `PLAYWRIGHT_BROWSERS=chromium` ou `webkit` limite son exécution à un moteur.

## Interface et commandes

Le menu utilise des particules et le dégradé commun aux cartes : `#443A50` vers `#20323B`. Le violet principal est `#74518D`. Les artworks sont archivés dans `art-source/menu/` et ne sont plus livrés au navigateur. Le titre conserve Agenda Fantasy et ses dégradés dorés ; la devise est « Le mal ne fait pas de quartier. »

Sur ordinateur : clic pour sélectionner, glisser ou ZQSD pour déplacer la carte, molette pour zoomer, Shift + clic/glisser pour composer un groupe. Les flèches déplacent la carte lorsqu’elle a le focus. Clic droit annule un placement en cours ou donne un ordre contextuel. Espace met en pause, R rappelle l’armée, H ouvre l’aide, 1 à 7 choisit l’option de l’onglet actif. Ctrl, Commande et Alt restent réservés aux raccourcis du système et du navigateur.

Sur téléphone et tablette : glisser pour explorer, pincer pour zoomer, Groupe pour sélectionner plusieurs unités et Ordre pour indiquer une cible. Le guide compact « Les Tilleuls » reste séparé du sélecteur, sous les ressources. Les détails s’ouvrent au début ; la croix ferme le volet. La navigation du bas et la roue du manoir donnent accès aux constructions, créatures, réglages et à la pause.

Le menu et le jeu partagent les réglages audio. La lecture est tentée à l’ouverture du menu puis au premier geste si le navigateur exige une interaction. Les musiques entrent progressivement, s’effacent en fin de piste et conservent leurs longues pauses. Les mobilisations humaines et héroïques utilisent leurs thèmes sans boucle. La musique sombre accompagne le premier passage au-dessus de 60 % du territoire. Les sources et réglages sont détaillés dans [ASSETS.md](ASSETS.md).

## Simulation et architecture

Vous commencez sans ouvrier : recrutez un gobelin, établissez vos récoltes et suivez les objectifs. Les sept créatures recrutables sont le gobelin, le gobelin lancier, le troll, le squelette, le minotaure, le spectre et l’alchimiste. Le bestiaire présente leurs animations ainsi que les unités humaines et le chevaucheur déverrouillable.

Les livraisons alimentent réellement les stocks ; les constructions, recherches et améliorations prennent du temps. La mairie et la guilde financent leurs renforts avec les ressources des paysans. Les paysans tués ou déplacés par la fermeture d’une route peuvent être remplacés après les délais prévus, même quand leur disparition a épuisé les stocks nécessaires au recrutement. La provocation bloque les ordres des unités concernées ; une garnison peut quitter sa tour sur un ordre individuel.

| Fichier | Responsabilité |
| --- | --- |
| `app/App.tsx` | Menu, chargement différé, récupération après erreur |
| `app/game/Game.tsx` | Interface React et commandes du joueur |
| `app/game/gameStore.ts` | Simulation et snapshots consommés par React |
| `app/game/engine.ts` | État, navigation, économie et ordres sans dépendance au DOM |
| `app/game/combat.ts`, `domain.ts`, `strategy.ts`, `shields.ts` | Combat et mécaniques spécialisées |
| `app/game/progression.ts`, `mission.ts` | Déblocages, coûts, durées et objectifs |
| `app/game/renderer.ts` | Caméra, entrées tactiles/souris, sélection sur l’alpha et animation |
| `app/game/pixiScene.ts`, `terrainRenderer.ts` | Scène WebGL, textures et terrain mis en cache |
| `app/game/audio.ts`, `music.ts`, `musicPlaylist.ts` | Effets, réglages et transitions musicales |
| `components/ui/` | Les cinq composants Base UI réellement utilisés |

Le moteur reçoit explicitement le temps de simulation. Le rendu Pixi réutilise ses objets et reconstruit le terrain après une perte du contexte WebGL. Les masques de sélection ne conservent que l’alpha ; la densité d’affichage est limitée à 2 et réévaluée lors d’un changement d’écran. Les sprites multirangs utilisent le même découpage dans le bestiaire et sur la carte.

## Limites et portabilité

« Reprendre » garde la partie tant que cette page existe. Il n’y a pas encore de sauvegarde persistante de partie, de multijoueur, d’application iOS, d’exécutable Steam, ni de prise en charge complète des manettes. Les réglages audio sont les seules préférences enregistrées localement.

Le quartier et certains trajets sont encore liés à la carte actuelle. L’ajout de cartes demandera une définition de carte indépendante du moteur. Une migration des tâches vers des unions discriminées et une séparation progressive des gros modules restent des améliorations d’architecture à traiter avec leurs propres tests.

Les tests WebKit automatisés ne remplacent pas une validation sur iPhone/iPad, WKWebView, interruptions audio réelles, Steam Deck et matériel peu puissant. Les licences des assets doivent également couvrir chaque distribution : notamment Agenda Fantasy Demo et les MP3 fournis par l’utilisateur.

Voir [l’audit du 12 septembre 2026](docs/audit-2026-09-12.md), [l’analyse iOS et Steam](docs/audit-portability.md) et [la provenance des ressources](ASSETS.md).
