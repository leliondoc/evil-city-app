# Audit de portabilité iOS et Steam

Audit du 12 septembre 2026, à partir du commit `a7229fa`. Lecture du code, des scripts de vérification et des notices de ressources ; comparaison avec les documentations officielles consultées à cette date. Ce volet ne crée aucun projet natif, n'installe aucun SDK et ne valide aucun appareil physique. Les corrections et vérifications réalisées en parallèle sont consignées dans le rapport principal de l'audit.

## Décision technique

Le cœur du jeu peut être conservé pour un port : simulation TypeScript locale, interface React, rendu PixiJS WebGL, ressources embarquables et absence de serveur obligatoire. Il n'y a pas de motif démontré pour réécrire le moteur en Swift, Unity ou une autre technologie.

La base de compatibilité recommandée est **iOS/iPadOS 16.4 et versions ultérieures**, avec Safari/WKWebView 16.4 au minimum. Sur ordinateur : Chrome/Edge 111+, Firefox 128+, Safari 16.4+. Ce sont des cibles de développement ; elles ne constituent pas une liste d'appareils effectivement testés.

| Niveau | Situation observée au début de l'audit |
| --- | --- |
| Jeu web portable | Architecture favorable ; chemins relatifs, commandes tactiles et suspension d'onglet déjà présentes. Les contrôles mobiles existants emploient Chromium. |
| Application iOS installable | Aucun projet Xcode, configuration Capacitor, adaptateur de cycle de vie natif ou sauvegarde persistante de partie. |
| Jeu Steam installable | Aucun exécutable, lanceur natif, dépôt SteamPipe ni configuration d'entrée Steam. |
| Soumission aux boutiques | Non préparée : binaires, matériel, comptes, métadonnées et dossier de droits restent nécessaires. Aucun statut App Store ou Steam Deck Verified n'est établi. |

### Pourquoi 16.4, même si Capacitor accepte iOS 15

Tailwind 4 dépend de fonctionnalités disponibles à partir de Safari 16.4, Chrome 111 et Firefox 128. Vite 8 cible par défaut Safari 16.4, Chrome/Edge 111 et Firefox 114 ; sa transformation de syntaxe n'ajoute pas les API manquantes. Le fichier de compatibilité du **tag exact Base UI 1.7.0** inclut également Safari/iOS 16.4. Abaisser seulement `build.target` ne rendrait donc pas l'ensemble compatible avec iOS 15. [Tailwind](https://tailwindcss.com/docs/compatibility), [Vite](https://vite.dev/guide/build), [Base UI 1.7.0](https://raw.githubusercontent.com/mui/base-ui/v1.7.0/.browserslistrc).

`structuredClone` dans `gameStore.ts`, les unités `dvh`, `ResizeObserver`, les événements Pointer et le Web Audio sont cohérents avec cette cible. WebKit a ajouté `structuredClone` dans Safari 15.4 ; cet appel n'exige donc pas de remplacement pour une cible 16.4. [WebKit 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/).

## Constats et priorités

Les priorités ci-dessous concernent la préparation d'un port. Une fonctionnalité absente du prototype n'est pas présentée comme une régression du jeu publié.

| Priorité | Preuve dans le dépôt initial | Conséquence et action |
| --- | --- | --- |
| Avant port mobile | `App.tsx` initialise `hasGame` à `false` ; `gameStore.ts` conserve l'état uniquement en mémoire. Seuls les réglages audio vont dans `localStorage`. | « Reprendre » survit au retour au menu tant que la page existe, mais pas au rechargement ni à la destruction du processus par l'OS. Concevoir une sauvegarde versionnée avant de promettre la reprise d'une application installée. |
| Corrigé dans l'audit | `vite.config.ts` utilisait la cible implicite de Vite. | La cible est maintenant explicite : `chrome111`, `edge111`, `firefox128`, `safari16.4`. Une mise à jour du compilateur ne redéfinit plus silencieusement ce périmètre. |
| Corrigé dans l’audit | `scripts/check-mobile.mjs` importe `chromium` et lance Chrome ; `isMobile` et `hasTouch` simulent un format et des entrées. | Le contrôle du build inclut désormais Chromium et WebKit sur trois formats, avec des échecs réseau/HTTP et leur récupération. Les résultats Chromium restent utiles, mais ne démontrent pas le comportement Safari ni celui d'un iPhone. |
| Corrigé dans l’audit | Le terrain est mis en cache par `generateTexture` dans `pixiScene.ts`. Aucun rétablissement applicatif du terrain après perte du contexte n'était prévu. | Le terrain calculé est reconstruit après restauration. Le test de perte/restauration retrouve ses pixels visibles ; les masques CPU passent de 132,1 à 33,0 MiB. |
| Avant port iOS | La suspension repose sur `document.hidden`/`visibilitychange`. Aucun pont vers le cycle de vie natif. | Conserver cette logique web et brancher ensuite les événements Capacitor d'activité, de pause et de reprise sur une même politique de suspension. |
| Avant sortie commerciale | `public/fonts/AgendaFantasy-License.txt` réserve la démo à un usage personnel. Six MP3 fournis par l'utilisateur n'ont pas d'auteur/licence identifiés dans `ASSETS.md`. | Rassembler les droits correspondants ; obtenir la licence d'intégration appropriée de la police ou choisir son remplacement. Aucun achat ni changement visuel effectué dans cet audit. |
| Avant objectif Steam Deck | Aucun `getGamepads`, manifeste Steam Input ou mapping de manette. Les commandes clavier utilisent surtout ZQSD, H, R, Espace, chiffres et flèches. | Définir un schéma d'actions et rendre menus, sélection, carte et commandes accessibles aux contrôles du Deck. Une distribution PC à la souris et un objectif Deck Verified sont deux périmètres distincts. |

La relecture ciblée des cycles React et audio a aussi confirmé trois problèmes : les raccourcis métier interceptaient Ctrl/Cmd/Alt avant de vérifier les modificateurs ; une erreur de chargement du module React différé vidait la racine faute de frontière d'erreur ; un stockage navigateur refusé faisait perdre la sourdine entre menu et partie. Les deux premiers constats sont corrigés et couverts dans le contrôle du build : filtrage des modificateurs et frontière d’erreur avec rechargement. Le préchargement JS Vite est désactivé pour éviter le [cache d’échecs WebKit 270357](https://bugs.webkit.org/show_bug.cgi?id=270357) ; les tests couvrent les pannes réseau et HTTP 503. Le troisième est corrigé dans `audio.ts` : les réglages validés disposent désormais d'un repli mémoire pour la session. Une écriture refusée ne laisse plus l'ancienne valeur persistée écraser le choix courant ; les lectures normales et les changements externes restent pris en compte.

`scripts/check-audio-settings.mjs` a été exécuté avec succès dans Chrome : refus de lecture/écriture sur PC et téléphone simulé, quota empêchant seulement l'écriture, conservation des volumes et de la sourdine dans les deux sens, rétablissement du stockage, relecture d'une valeur externe, JSON corrompu, types invalides, ancien format et valeurs hors bornes. Le lint des fichiers modifiés passe. Ce contrôle accepte `GAME_URL` pour viser aussi le build compilé. Le cache reste limité à la durée de la page ; il ne constitue pas une sauvegarde de partie.

### Sauvegarde et reprise à construire

`tests/storage.test.mjs` vérifie les **stocks de ressources**, pas la persistance d'une partie. Les objets de simulation sont déjà indépendants de React/Pixi ; c'est une bonne base pour un format de sauvegarde, mais `structuredClone` seul n'est pas une sérialisation durable.

Prévoir un format avec version, validation à la lecture, migrations explicites, identifiant de carte, état de progression et écriture atomique. Tester fichier tronqué, ancienne version, espace indisponible, reprise après fermeture forcée, partie gagnée/perdue et mise à jour de l'application. Garder les ressources de rendu et les objets audio hors de la sauvegarde. Sauvegarder périodiquement et lors des étapes significatives : la dernière notification de fermeture ne suffit pas.

Pour le web, un adaptateur IndexedDB peut fournir une écriture transactionnelle avec gestion des erreurs et export/import de secours. Pour iOS, réserver Capacitor Preferences aux petits réglages ; utiliser un stockage de fichiers natif ou une base adaptée pour les parties. Capacitor prévient que le stockage local web peut être purgé et que Preferences n'est pas une base de données. WebKit distingue stockage « best effort » et persistant ; aucune conservation illimitée ne doit être supposée. [Preferences](https://capacitorjs.com/docs/apis/preferences), [politique de stockage WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

Pour Steam, des fichiers de sauvegarde identifiables facilitent ensuite Steam Auto-Cloud. Le mécanisme synchronise des groupes de fichiers configurés ; il ne transforme pas automatiquement l'état JavaScript en sauvegarde. Définir les chemins par utilisateur et la politique de conflit avant de l'activer. [Steam Cloud](https://partner.steamgames.com/doc/features/cloud).

### Audio et cycle de vie

Le code utilise déjà une piste musicale à la fois, des gains séparés, une reprise du contexte et une suspension lorsqu'un onglet est masqué. La simulation limite le pas écoulé et ne rattrape pas plusieurs minutes de jeu au retour d'arrière-plan. Les raccourcis maintenus sont effacés au changement de visibilité ou à la perte de focus.

La lecture automatique reste soumise au navigateur. Le menu tente une reprise et conserve les gestionnaires de geste ; il faut tester la lecture après un vrai toucher, le verrouillage de l'écran, une interruption système, les changements de sortie audio et les allers-retours jeu/menu sur iPhone. L'audit ajoute un gestionnaire `click` côté jeu, en complément de `pointerdown` et du clavier, pour préserver le déblocage lors de l'activation tactile. Ne pas déplacer cet appel dans une tâche asynchrone après le geste. Aucun adaptateur natif n'est ajouté à cette occasion. [Politique de lecture WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/).

Pour le conteneur iOS, Capacitor expose `appStateChange`, `pause` et `resume`, reliés aux notifications natives d'activité. Le retour au premier plan doit rétablir le rendu et la possibilité de jouer le son tout en préservant une pause manuelle. Ne pas utiliser le mode audio d'arrière-plan uniquement pour maintenir la simulation en vie. [API App](https://capacitorjs.com/docs/apis/app).

### Graphismes, mémoire et interface

L'absence de dépendance WebGPU est favorable : le jeu utilise explicitement `WebGLRenderer`. Le DPR est plafonné à 2, les événements Pixi inutilisés sont désactivés et le terrain statique est mis en cache. Cela ne démontre cependant pas le budget mémoire d'un appareil iOS.

Mesure statique initiale : **149 entrées** passent le filtre de chargement du renderer, soit **132,06 MiB équivalent RGBA** par somme `largeur × hauteur × 4`. Ce n'est pas une mesure de mémoire GPU réelle : les alias, allocations du pilote, buffers, décodages et copies temporaires peuvent modifier le total. Les planches `minotaur-idle` et `troll-idle` atteignent respectivement 5120 et 4608 pixels de large. Vérifier `MAX_TEXTURE_SIZE` et la consommation réelle sur le plus petit appareil pris en charge avant de figer le catalogue ou d'ajouter une carte plus grande.

Le chargement initial utilise `Promise.all` pour les images et pour les effets audio. Une copie alpha compacte et un nettoyage complet des ressources améliorent la situation ; si le profilage révèle un pic trop important, limiter les chargements simultanés et charger les unités par besoin. Ne pas lancer un réencodage global des sprites pour traiter un problème de mémoire décodée.

Le CSS prévoit `viewport-fit=cover`, `safe-area-inset-*`, `100dvh`, défilement des volets et cibles tactiles de 44 px. Les gestes sont portés par les Pointer Events et le canvas utilise `touch-action: none`. Vérifier néanmoins les bords d'écran, le geste Accueil, les barres Safari, la rotation et le multitâche iPad réels. L'état compact est choisi par largeur **ou** pointeur grossier ; vérifier aussi une tablette avec souris/clavier et le Steam Deck, où le mode d'entrée peut changer en cours de session.

Les petits textes et l'information affichée au survol nécessitent une revue à 1280 × 800 pour le Deck. Des dialogues Base UI accessibles ne rendent pas automatiquement la carte jouable à la manette ou avec VoiceOver. Les fonctionnalités d'accessibilité déclarées en boutique devront correspondre aux parcours effectivement essayés.

## Packaging proposé

### iOS : Capacitor avec les ressources locales

Utiliser le même `dist` Vite comme `webDir`, avec un identifiant d'application stable et une cible de déploiement iOS 16.4 minimum. Embarquer le jeu dans l'application et charger les ressources locales ; éviter un conteneur qui dépend exclusivement du site GitHub Pages. Capacitor 8 emploie WKWebView et annonce Xcode 26+ ; son minimum runtime iOS 15+ ne réduit pas celui fixé par le code web. [Configuration](https://capacitorjs.com/docs/config), [runtime iOS](https://capacitorjs.com/docs/ios).

Le dépôt initial ne contient aucun projet natif. Sa création, la configuration de la signature, les icônes, la politique d'orientation, les liens sortants, les adaptateurs de stockage/cycle de vie et les essais TestFlight constituent une phase de port distincte. Un Mac avec un Xcode accepté à la date de soumission et un compte de distribution Apple sont nécessaires pour ce parcours.

Apple évalue la valeur de l'application, son autonomie et sa qualité, pas simplement la présence d'un conteneur. Le jeu doit être essayé comme application complète ; il n'est pas possible de déduire un accord App Review de son fonctionnement web. Compléter notamment les informations de confidentialité, la classification d'âge et les fiches de boutique. Vérifier les SDK exigés à la date de livraison : le SDK utilisé pour compiler et la version minimale d'iOS prise en charge sont deux réglages différents. [App Review, section 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), [soumission Apple](https://developer.apple.com/app-store/submitting/).

### Steam : exécutable desktop avec un conteneur entretenu

Electron est une piste adaptée pour conserver React/Pixi et disposer d'un Chromium connu sur les ordinateurs ciblés. C'est une recommandation d'architecture, pas un port déjà fabriqué ni une comparaison exhaustive de tous les conteneurs. Commencer par un exécutable Windows testé depuis Steam ; décider ensuite d'un binaire Linux natif ou d'une validation Proton, et d'un éventuel binaire macOS. [Packaging Electron](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging).

Servir uniquement le build embarqué via un protocole local dédié et limité à ses fichiers. Préserver l'isolation du contexte, le sandbox du renderer et `webSecurity` ; exposer un petit pont validé pour sauvegardes et éventuelles API Steam. Prévoir une CSP compatible avec Pixi et les styles réels, limiter les navigations/fenêtres et n'ouvrir dans le navigateur système que les liens autorisés. Le `base: './'` actuel aide les chemins de ressources, mais ne justifie pas de désactiver les protections de sécurité pour ouvrir `dist/index.html` en `file://`. [Sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security).

Le projet n'a pas encore d'exécutable, de configuration SteamPipe ni de métadonnées de publication. Steamworks demande un compte partenaire et un dossier de produit ; la procédure publique indique un droit Steam Direct de 100 USD par produit, en plus des étapes de vérification. Aucun de ces actes n'est réalisé par cet audit. Les succès, le Cloud et Steam Input doivent être choisis et testés comme fonctions, sans disperser des appels de SDK dans la simulation. [Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding), [publication](https://partner.steamgames.com/doc/store/releasing).

Pour viser **Steam Deck Verified**, Valve demande notamment une configuration de contrôle par défaut donnant accès à tout le contenu, des indications adaptées aux commandes utilisées, une interface lisible et un fonctionnement à 1280 × 800 ou 1280 × 720. La documentation actuelle précise 30 fps à 800p pour le Deck ; elle recommande 12 px de hauteur de caractères et fixe un minimum de 9 px. La page tactile du jeu seule ne démontre aucun de ces résultats. [Critères Valve](https://partner.steamgames.com/doc/steamhardware/compat).

## Ressources, poids et droits

Le dossier `public` initial représente **66 251 139 octets**, soit environ 63,18 MiB. Les 14 MP3 représentent 50,89 MiB, les WAV 4,64 MiB et le PDF de licence 3,69 MiB. C'est le poids embarqué potentiel, pas le téléchargement de la première page : les musiques sont chargées séparément. Les artworks inactifs ont été déplacés vers `art-source/menu/exports/` pendant l’audit ; ils ne sont plus copiés au build. Les licences et preuves originales sont conservées.

| Ressource | État du dossier de droits |
| --- | --- |
| Tiny Swords / Enemy Pack | `ASSETS.md` indique achat/fourniture par l'utilisateur. L'auteur permet l'intégration commerciale et les modifications, tout en interdisant la redistribution comme pack. Conserver la preuve d'achat et les conditions des archives utilisées. [Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords). |
| TomMusic | L'auteur autorise les projets commerciaux ; les crédits sont déjà présents. Les fichiers ne deviennent pas des ressources librement redistribuables avec une licence du code. [TomMusic](https://tommusic.itch.io/free-fantasy-200-sfx-pack). |
| AlkaKrab | L'auteur confirme l'usage en jeu commercial. `ASSETS.md` mentionne aussi une licence PDF et un accord particulier pour un jeu open source : vérifier ce document contractuel et le mode de diffusion du dépôt avant livraison. Le mot « copyright free » sur une fiche ne remplace pas la licence conservée. [AlkaKrab](https://alkakrab.itch.io/spooky-classical-game-music-pack). |
| Agenda Fantasy | Démo personnelle seulement dans le dépôt. La page générale actuelle du vendeur réserve l'intégration dans une application/un jeu à l'offre Extended pour un titre ; les anciens résumés de la fiche produit diffèrent. Vérifier une licence couvrant précisément le jeu et sa distribution web/iOS/Steam. [177Studio, licences](https://177studio.com/license/). |
| Six sons/musiques fournis le 12 septembre et logo fourni | Provenance de fourniture documentée, mais aucun contrat ni auteur identifié pour les MP3 dans le dépôt. Obtenir les preuves d'utilisation/distribution avant sortie commerciale. Ce constat ne prétend pas que l'utilisateur ne possède pas ces droits. |

Si une ressource créée ou modifiée avec une IA est consommée par les joueurs dans la version Steam livrée, renseigner le questionnaire de contenu d'après les ressources réellement retenues. La documentation actuelle distingue le contenu livré des simples outils d'aide au développement ; la présence de code assisté ne suffit pas à déduire le contenu du formulaire. [Questionnaire Steam](https://partner.steamgames.com/doc/gettingstarted/contentsurvey).

## Vérification avant un véritable port

| Environnement | Parcours à valider | Ce que cela établit |
| --- | --- | --- |
| Build web sous un préfixe URL | Menu, lancement/reprise, images, polices et musique avec cache vide ; aucune dépendance externe nécessaire au jeu. | Les chemins du paquet fonctionnent hors de la racine du site. |
| Build servi localement sans accès Internet | Démarrage à froid, sons de recrutement/attaque, changement de musique et retour au menu. | Les ressources sont effectivement embarquables. Ce n'est pas un test PWA hors connexion : aucun service worker n'est présent. |
| WebKit Playwright | Menu, modales, gestes, pause/reprise, redimensionnement, erreurs console/réseau et restauration WebGL. | Couverture d'un autre moteur ; pas une certification Safari/iOS. |
| iPhone/iPad réels dans Safari puis WKWebView | Rotation, bords système, interruption audio, verrouillage, 20 à 30 minutes de combat, pression mémoire, fermeture forcée et reprise sauvegardée. | Compatibilité de l'OS, du GPU et de l'audio effectivement ciblés. |
| Exécutable Steam Windows | Installation propre, lancement depuis Steam, sortie, sauvegarde, absence d'Internet, plusieurs écrans/DPI, volumes et mise à jour. | Fonctionnement du paquet desktop choisi. |
| Steam Deck réel | Contrôles complets, 800p, textes, consommation, veille/reprise, Cloud si activé, Linux/Proton selon la livraison. | Préparation à demander l'examen Valve ; le badge final dépend de cet examen. |

Playwright explique que son WebKit provient de sa propre version du moteur et ne pilote pas le Safari de marque ; les codecs et comportements dépendant de l'OS varient également selon l'hôte. Un essai WebKit sur Windows ou Linux est utile, sans remplacer un essai iOS. [Navigateurs Playwright](https://playwright.dev/docs/browsers).

Ordre recommandé après cet audit : fixer les cibles et les contrôles du build, terminer la résistance aux interruptions, définir la sauvegarde et les droits, puis fabriquer un petit paquet iOS et un paquet Steam avec le même jeu. Mesurer ces deux paquets avant d'étendre les fonctionnalités de plateforme.
