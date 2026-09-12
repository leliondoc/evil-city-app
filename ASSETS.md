# Graphismes et animations d’Evil City

Auteur : Pixel Frog. [Source officielle](https://pixelfrog-assets.itch.io/tiny-swords).

Les libellés de la carte et les gains de ressources utilisent **Pixel Operator Regular**, de Jayvee Enaguas (HarvettFox96), sous CC0 : [source et licence](https://fontlibrary.org/en/font/pixel-operator). La police originale est intégrée dans `public/fonts/`, chargée avant le premier rendu, et affichée à 16 px avec une ombre décalée de 1 px. Les coordonnées des libellés sont alignées sur les pixels de l’écran et leur taille reste stable au zoom.

## Provenance et licence

Le dossier Tiny Swords (Free Pack) a été fourni par l’utilisateur dans Downloads le 10 septembre 2026. Tiny Swords (Enemy Pack).zip a été acheté et fourni par l’utilisateur le même jour.

Les archives complètes et les fichiers Aseprite restent hors du site distribué. Les PNG des packs sont copiés sans modification de leur dessin.

Les cartes de construction et de recrutement de la barre du bas conservent le même fond sombre sur ordinateur, tablette et mobile. Les fiches de sélection conservent leur fond sombre. Les messages centraux emploient le ruban jaune de `SmallRibbons.png` ; le titre de carte conserve le ruban bleu de `BigRibbons.png`. Le centre des rubans est répété sans étirer sa texture. Les quatre coins de `Cursor_04.png` encadrent les parcelles et les sprites sélectionnés. Les PV utilisent les cadres et remplissages rouges séparés `SmallBar_*` sur la carte et `BigBar_*` dans les fiches, avec un remplissage proportionnel aux PV restants.

Le logo `public/evil-city-logo.png` provient de `eclogo.png`, fourni par l’utilisateur. Son fond a été retiré avec l’outil imagegen intégré, avec cette consigne : « Retirer uniquement le fond blanc, fournir un PNG à transparence réelle, conserver le dessin, les couleurs et les proportions du logo, nettoyer les contours sans halo blanc et garder une petite marge transparente. » Il est affiché à 40 px sur ordinateur et 30 px sur petit écran.

Direction typographique retenue pour le futur logo : **Agenda Fantasy**, parmi les deux références fournies (Fantasy Magist et Agenda Fantasy), pour ses lettres anguleuses adaptées à l’ambiance d’Evil City. Elle est également utilisée pour « Les Tilleuls », centré dans le ruban bleu. La version Demo de 177Studio est intégrée dans `public/fonts/AgendaFantasy-Demo.otf` ; [source de l’auteur](https://www.dafont.com/agenda-fantasy.font), licence conservée dans `public/fonts/AgendaFantasy-License.txt`. Cette version est réservée à l’usage personnel ; un usage commercial nécessite la licence correspondante de [177Studio](https://177studio.com/product/agenda-fantasy-font/).

La licence indiquée sur la page officielle autorise l’usage personnel et commercial ainsi que la modification. Elle interdit la redistribution, la revente et le reconditionnement des ressources comme pack, y compris après modification. Ces ressources sont réservées à leur intégration dans le jeu ; ne pas les redistribuer séparément. Le crédit, facultatif selon l’auteur, figure dans le guide.

## Illustration du menu principal

Les fonds `public/menu/evil-city-nightfall.webp` (paysage) et `public/menu/evil-city-nightfall-portrait.webp` (téléphone) ont été créés puis retouchés avec l’outil **imagegen intégré**, le 12 septembre 2026. À la demande de l’utilisateur, tous les personnages et leurs équipements ont été retirés des deux formats. La rue pavée, le village, les lanternes, les bannières et le château sous la lune constituent désormais le décor. Les formes de bois incohérentes du premier plan et la clôture derrière l’ancienne archère ont été retirées ou remplacées par une maçonnerie cohérente. L’entrée principale du château reste ouverte.

Les sources approuvées sont conservées dans `art-source/menu/`. `scripts/compose-menu-art.py` exporte les sources PNG en WebP, qualité 90 et méthode 6 avec Pillow, sans redimensionnement ni ajout de personnage. Les anciens PNG publics sont retirés. Les façades, supports des torches et arches ont été nettoyés, puis l’éclairage a été assombri avec de la brume et des éclairs discrets selon la nouvelle direction artistique. L’ancienne source du lancier reste disponible dans `art-source/menu/lancer-generated.png` pour archivage ; elle ne fait pas partie du menu. Le titre, les boutons et les particules sont rendus séparément dans l’interface, sans filtre CSS global supplémentaire : l’atmosphère est intégrée à l’illustration. Les sprites en jeu et les animations du bestiaire restent les ressources originales. Les consignes exactes sont conservées dans [docs/start-menu-art.md](docs/start-menu-art.md).

## Créatures jouables

| Rôle        | Personnage original | Séquences                            |
| ----------- | ------------------- | ------------------------------------ |
| Bâtisseur   | Torch Goblin        | Idle, Run ; Attack au bestiaire      |
| Combattant  | Troll               | Idle, Walk, Windup, Attack, Recovery |
| Mort-vivant | Skull               | Idle, Run, Attack                    |
| Colosse     | Minotaur            | Idle, Walk, Attack                   |
| Saboteur    | Thief (incarne le spectre) | Idle, Run, Attack |

Le spectre utilise les trois sprites PNG du voleur (Thief) déjà présents dans le pack, sans retouche. Les entrées `specter-idle`, `specter-walk` et `specter-attack` du manifeste pointent vers ces mêmes fichiers. Son portrait utilise l’illustration originale `Thief/Thief_Avatar.png`, copiée sans retouche dans `specter-avatar.png`, pour les cartes de recrutement, de sélection et de groupe. Les feux follets de hantise utilisent `Hex Shaman/Hex Shaman_Projectile.png` du même pack, copié sans retouche dans `haunt-wisp.png` (trois frames de 128 × 128).

Les morts utilisent la planche originale `Factions/Knights/Troops/Dead/Dead.png` de Tiny Swords (Update 010), copiée sans retouche dans `unit-death.png` par `scripts/import-death-pack.py`. Ses 14 frames de 128 × 128 sont lues sur deux rangées. Les dépouilles récupérables restent sur la frame posée au sol avant la disparition ; les morts-vivants jouent le cycle complet et ne laissent aucun reste. Le transport utilise aussi ce sprite. Les textes d’activité sont dessinés par le moteur Canvas.

Les dimensions sont décrites dans `app/game/assets.json`. Les tags des sources Aseprite ont été vérifiés. Les images sont lues dans leur ordre d’origine à 100 ms par frame. Le maintien de 5 secondes sur la dernière frame Wind-up du fichier Aseprite du troll est ramené à 100 ms pour le cycle de combat du prototype ; les cinq images de préparation sont conservées.

Les arbres, les buissons et la fumée de la tanière utilisent également les animations originales. La mairie utilise le château bleu, le manoir le château violet, la forge la Troll House (`Extra/Dead Tree/Dead Tree.png`) et la crypte le monastère violet. Les rues pavées sont une géométrie de terrain simple dessinée par le moteur.

Les reliefs suivent le [guide des terrains de Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide) : surface herbeuse continue, puis une seule rangée de falaise avec un pied adapté à la terre ou à l’eau. La rangée de pelouse isolée n’est pas intercalée dans les falaises. Les ombres originales sont répétées sur la grille de 64 pixels, décalées d’une case vers le bas, sans étirement.

La composition des abords utilise des silhouettes de tuiles découpées : anses, presqu’îles et terrasses superposées. Les escaliers, l’écume animée et les bosquets utilisent les images originales. Les formes du terrain servent également à exclure les décors de l’eau, des falaises et des escaliers ; les ponts et les trajets de ravitaillement gardent leurs accès.

Les particules `Dust_01`, `Dust_02`, `Explosion_01`, `Explosion_02` et `Fire_01` du dossier `Particle FX` sont copiées sans retouche par `scripts/import-particle-fx.ps1`. Elles accompagnent le travail des bâtisseurs, les impacts réels, les fins de chantier, les changements de propriétaire et la destruction du manoir. Quelques flammes signalent les bâtiments sous 40 % de résistance. Ces effets restent visuels, suivent la pause et la vitesse de simulation et sont masqués avec la réduction des animations ; seul l’impact final termine sa lecture après la défaite.

Les 22 créatures originales du pack Enemy ont leurs séquences de repos, marche et attaque dans le catalogue. `scripts/import-enemy-pack.py` copie ces seules séquences et construit le manifeste ; les autres créatures que les sept recrutables ne possèdent pas encore de comportements jouables.

Le bouton du bestiaire utilise le portrait original `Enemy Pack/Imp/Imp_Avatar.png`, copié sans retouche dans `public/tiny-swords/imp-avatar.png` et affiché en grand dans le menu circulaire.

Les fiches d’unités utilisent les portraits fixes du pack. `scripts/import-human-portraits.ps1` copie les Human Avatars 02 (garde bleu), 11/13/15/14 (chevalier, lancier, archère et moine jaunes) et 05 (paysans bleus). Les trois métiers partagent ce portrait de paysan ; le chevaucheur conserve le portrait du gobelin lancier. Les deux animations `Warrior_Guard.png` des unités bleues et jaunes du Free Pack sont utilisées pour leur posture défensive, sans retouche (six images de 192 × 192).

Les fortifications humaines emploient cinq PNG originaux supplémentaires : le château bleu de Tiny Swords Update 010, les casernes bleues et jaunes, le pas de tir bleu et le château jaune du Free Pack. `scripts/import-human-building-models.ps1` copie ces seuls modèles depuis les archives fournies. La mairie avancée combine le château et deux tours bleues déjà présentes ; aucun PNG n’est retouché.

`scripts/import-free-pack.py` copie les quatre classes humaines jaunes (Warrior, Lancer, Archer, Monk), les flèches et soins, le monastère de la guilde, les paysans bleus avec outils et cargaisons, les décors variés et les éléments UI utilisés. Les paysans utilisent les cycles Axe/Wood, Pickaxe/Gold et Knife/Meat.

Les textures UI sont des planches de morceaux séparés. `PackUI.tsx` répète les morceaux des panneaux et boutons dans un canvas à échelle fixe, sans étirer le grain du bois ou le parchemin ; le ruban utilise trois morceaux SVG. Les coins restent à taille fixe. Le gisement d’or emploie Gold Stone 5 et Gold Stone 4, qui représentent des rochers plutôt que les petites pépites de Gold Stone 1. Le pack fourni ne contient pas de bâtiment de mine. Aucun PNG n’est redessiné.


L’alchimiste emploie les séquences Idle, Walk et Attack du Hex Shaman original, ainsi que `Hex Shaman_Avatar.png`, sans retouche. `scripts/import-alchemist.ps1` copie ces quatre ressources vers les entrées `alchemist-*`. Les tours emploient les tours bleues et violettes déjà importées. Les combos utilisent Fire_01 et le rituel humain l’animation de soins du moine, tous issus du pack.

Les jardins conservent les couleurs originales du pack, sans modification de palette. Les notices du haut utilisent le parchemin enroulé `ui-banner.png` et la pause le ruban bleu `ui-ribbons.png`, avec leurs bordures et ornements originaux. Les rampes de terrain emploient leurs deux moitiés (128 × 128 pixels) et les surfaces de sol contiguës partagent une même palette. L’aperçu de construction réutilise le sprite final avec une opacité réduite.

La réaction des moutons humains utilise les six images originales de `Resources/Sheep/HappySheep_Bouncing.png` (Tiny Swords Update 010), copiées sans retouche par `scripts/import-sheep-pack.py` vers `sheep-hit.png`. Elle accompagne la récolte de viande des bergers ainsi que les dégâts de sabotage, puis revient au cycle normal. Elle suit le temps de simulation et respecte la réduction des animations.

## Musiques et effet fournis le 12 septembre 2026

Les fichiers suivants ont été fournis par l’utilisateur et copiés sans réencodage dans `public/audio/`, avec les noms demandés. Aucune attribution à AlkaKrab ou TomMusic n’est déduite pour ces fichiers.

| Fichier fourni | Fichier intégré | Déclenchement |
| --- | --- | --- |
| `Action 1.mp3` | `menu-music.mp3` | Menu principal, préchargé dès l’accueil si le son est activé ; en boucle après la première interaction autorisant le son. Arrêt en entrant dans la partie. |
| `Action 2.mp3` | `human-theme.mp3` | Départ effectif d’une attaque de gardes de la mairie, y compris les patrouilles contre le racket. Sans boucle. |
| `Action 5.mp3` | `guild-theme.mp3` | Départ des héros de la guilde, y compris ses défenseurs. Sans boucle. |
| `Ambience 1.mp3` | `ambiance-music.mp3` | Interlude après deux morceaux ordinaires, avec une pause de 2 à 4 minutes avant et après. Une seule lecture. |
| `Dark 1.mp3` | `dark-theme.mp3` | Premier passage strictement au-dessus de 60 % des parcelles, une fois par partie. Attend la fin d’un thème d’attaque en cours. |
| `Fx 2.mp3` | `building-upgrade.mp3` | Fin effective de l’amélioration d’un bâtiment joueur. Son global du canal Effets, calibré avec les bruitages existants. |

Une seule piste musicale joue à la fois. Un renfort ne redémarre pas le thème déjà en cours. Après un thème, la piste d’ambiance interrompue retrouve sa position, ou le silence musical reprend son décompte. Les événements survenus pendant que le son est coupé ne sont pas rejoués à la réactivation. La pause, le retour au menu, l’onglet masqué et les volumes restent respectés. `scripts/check-theme-audio.mjs` vérifie la lecture réelle et ces transitions dans le navigateur ; `scripts/check-music.mjs` couvre la playlist et les interludes.

## Musique AlkaKrab

Source : [Spooky / Classical Game Music Pack — AlkaKrab](https://alkakrab.itch.io/spooky-classical-game-music-pack), archive fournie par l’utilisateur. Les huit MP3 originaux sont importés sans modification par `scripts/import-spooky-music.ps1 -Archive "C:/chemin/Spooky Game Music Pack.zip"`. Ils passent dans un ordre mélangé, sans répétition avant un tour complet ni entre la fin d’un tour et le début du suivant. Chaque morceau est suivi d’une pause aléatoire de 2 à 4 minutes réelles ; les bruitages continuent normalement. Une seule piste est chargée à la fois, avec un volume indépendant des effets (20 % par défaut) et une entrée progressive. La lecture et le décompte des pauses musicales sont suspendus lorsque l’onglet est masqué ou la musique coupée. Le bouton Pause et la touche Espace suspendent également la musique et le délai avant le prochain morceau ; la reprise conserve leur position. Les menus permettent de régler le volume, mais ne relancent pas une musique mise en pause manuellement. Le bouton général coupe les deux canaux.

Les MP3 restent inchangés. Deux gains Web Audio séparent le volume choisi de l’enveloppe de lecture : entrée de 2,5 s, sortie sur les 6 dernières secondes, et sortie de 1,2 s avant un changement de thème. Une reprise très proche de la fin réduit le fondu d’entrée pour laisser place à la sortie. Les automations suivent la durée et la position réelles du média et se recalculent après un chargement ou une interruption ; les clics et réglages n’annulent pas le fondu. Une seule piste joue à la fois. Les transitions différées sont suspendues avec la lecture et annulées à la fermeture. La boucle du menu garde son fonctionnement natif, avec un fondu à l’entrée ; les thèmes de jeu restent sans boucle.

L’auteur confirme sur la page du pack l’usage gratuit dans des jeux commerciaux et non commerciaux. L’utilisateur a fourni le pack et demandé son intégration dans le jeu publié. La licence originale accompagne les huit pistes dans `public/audio/alkakrab/license.pdf`. Les morceaux restent la propriété d’AlkaKrab et ne sont pas placés sous une éventuelle licence du code ; leur redistribution comme banque musicale, revente ou mise en ligne sur les plateformes de streaming n’est pas autorisée. La licence demande un accord distinct pour un usage dans un jeu open source. AlkaKrab est crédité dans les paramètres et l’aide.

`scripts/check-music.mjs` vérifie la lecture des huit fichiers, la rotation de playlist, la suspension en arrière-plan, le réglage indépendant et sa persistance. Il nécessite l’import local du pack.

## Effets sonores TomMusic

Source : [Free Fantasy 200 SFX Pack — TomMusic](https://tommusic.itch.io/free-fantasy-200-sfx-pack).
L’archive fournie par l’utilisateur a servi à importer 40 fichiers WAV originaux (4,81 Mo) : récoltes, pas sur terre/pierre/bois et armure, attaques et impacts d’épée/flèche, boucliers, sorts, feu, portes, coffre et gravats. La sélection exacte est dans `scripts/import-tommusic.ps1`, et les associations et niveaux sont dans `app/game/audioCatalog.ts`.

La page de l’auteur autorise l’utilisation dans des projets commerciaux ou personnels et interdit la revente ou redistribution du pack seul. TomMusic est crédité dans l’aide du jeu. Seuls les 40 effets utilisés par Evil City sont inclus dans les ressources du jeu ; ils conservent les conditions de TomMusic et ne constituent pas une banque de sons réutilisable sous la licence du code.

Le gain de chaque fichier est calibré au décodage sur le signal actif, avec amplification limitée et plafond de crête à 0,72 ; les fichiers originaux restent inchangés. Un compresseur protège le bus des effets. Les catégories conservent leurs volumes relatifs : pas très discrets, travail en retrait, combat plus présent. Au plus huit voix jouent simultanément, dont deux pas ; les événements importants peuvent remplacer une voix secondaire. Le hors-champ est silencieux et la pause coupe les effets. Les impacts suivent les pertes de PV en combat physique ; faim et brûlures ne génèrent pas de coups d’épée. Recrutement ouvrier, combattant et mort-vivant, soins, activation du bouclier, recherche, capture et destruction ont des signaux distincts. `scripts/check-sound-mix.mjs` contrôle les fichiers décodés, les crêtes et les priorités en situation de saturation.

Importer à nouveau les originaux : `powershell -NoProfile -File scripts/import-tommusic.ps1 -Archive "C:/chemin/Free Fantasy SFX Pack By TomMusic.zip"`. Les fichiers arrivent dans `public/audio/tommusic/`. Ils sont suivis par Git et copiés par Vite dans le jeu compilé, y compris lors du déploiement GitHub Pages. `scripts/check-audio.mjs` vérifie leur chargement et leur lecture sur ordinateur, téléphone et tablette ; `GAME_URL` permet de viser la version publiée.

## Grotte, lanciers et porcs

La grotte gobeline utilise `Extra/Cave/Cave_Idle.png`. La forge des trolls conserve ses règles de progression et emploie la **Troll House**, nommée `Extra/Dead Tree/Dead Tree.png` dans l’archive Enemy Pack (384 × 320). Les portes des deux bâtiments sont alignées sur leur accès.

Le gobelin lancier utilise `Spear Goblin_Idle`, `Spear Goblin_Run`, `Spear Goblin_Attack Fast` et son avatar. Après la recherche « Chevaucheurs de porcs », les mêmes unités utilisent les séquences originales de `Extra/Pig Rider Spear Goblin`. Les porcs de récolte utilisent `Extra/Pig/Pig_Idle.png`, au sud des moutons humains dans le pâturage. Tous ces PNG sont copiés sans retouche ; le manifeste règle les ancres et les images à 10 fps.

Le curseur de construction réutilise le marteau `UI Elements/UI Elements/Icons/Icon_01.png`. Le trait de ralliement part du centre visuel du bâtiment. Son repère utilise la seconde rangée bleue de `SmallRibbons.png`, avec ses trois morceaux joints une seule fois, sans déplier ni allonger son centre. Aucun cercle de portée n’est dessiné autour de la tour.

Le bestiaire est construit depuis les unités de la simulation : sept créatures recrutables, les gardes, les quatre classes de héros et les trois métiers humains. Les sprites de réserve restent archivés mais ne sont plus présentés comme unités jouables. Les aperçus utilisent les sols d’origine de leur faction.

Le recrutement accepté émet immédiatement une courte confirmation (`Spell Impact 2`) au clic sur la carte ou au raccourci, distincte de l’arrivée de l’unité. Un refus reste silencieux. Ce retour d’interface reste disponible pendant la pause et respecte le volume des effets et la coupure générale.
