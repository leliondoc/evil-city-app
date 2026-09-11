# Graphismes et animations d’Evil City

Auteur : Pixel Frog. [Source officielle](https://pixelfrog-assets.itch.io/tiny-swords).

Les libellés de la carte et les gains de ressources utilisent **Pixel Operator Regular**, de Jayvee Enaguas (HarvettFox96), sous CC0 : [source et licence](https://fontlibrary.org/en/font/pixel-operator). La police originale est intégrée dans `public/fonts/`, chargée avant le premier rendu, et affichée à 16 px avec une ombre décalée de 1 px. Les coordonnées des libellés sont alignées sur les pixels de l’écran et leur taille reste stable au zoom.

## Provenance et licence

Le dossier Tiny Swords (Free Pack) a été fourni par l’utilisateur dans Downloads le 10 septembre 2026. Tiny Swords (Enemy Pack).zip a été acheté et fourni par l’utilisateur le même jour.

Les archives complètes et les fichiers Aseprite restent hors du site distribué. Les PNG des packs sont copiés sans modification de leur dessin.

Les cartes de construction et de recrutement de la barre du bas conservent leur fond sombre sur ordinateur et leur parchemin sur mobile. Les fiches de sélection conservent leur fond sombre. Les messages centraux emploient le ruban jaune de `SmallRibbons.png` ; le titre de carte conserve le ruban bleu de `BigRibbons.png`. Le centre des rubans est répété sans étirer sa texture. Les quatre coins de `Cursor_04.png` encadrent les parcelles et les sprites sélectionnés. Les PV utilisent les cadres et remplissages rouges séparés `SmallBar_*` sur la carte et `BigBar_*` dans les fiches, avec un remplissage proportionnel aux PV restants.

Le logo `public/evil-city-logo.png` provient de `eclogo.png`, fourni par l’utilisateur. Son fond a été retiré avec l’outil imagegen intégré, avec cette consigne : « Retirer uniquement le fond blanc, fournir un PNG à transparence réelle, conserver le dessin, les couleurs et les proportions du logo, nettoyer les contours sans halo blanc et garder une petite marge transparente. » Il est affiché à 40 px sur ordinateur et 30 px sur petit écran.

Direction typographique retenue pour le futur logo : **Agenda Fantasy**, parmi les deux références fournies (Fantasy Magist et Agenda Fantasy), pour ses lettres anguleuses adaptées à l’ambiance d’Evil City. Elle est également utilisée pour « Les Tilleuls », centré dans le ruban bleu. La version Demo de 177Studio est intégrée dans `public/fonts/AgendaFantasy-Demo.otf` ; [source de l’auteur](https://www.dafont.com/agenda-fantasy.font), licence conservée dans `public/fonts/AgendaFantasy-License.txt`. Cette version est réservée à l’usage personnel ; un usage commercial nécessite la licence correspondante de [177Studio](https://177studio.com/product/agenda-fantasy-font/).

La licence indiquée sur la page officielle autorise l’usage personnel et commercial ainsi que la modification. Elle interdit la redistribution, la revente et le reconditionnement des ressources comme pack, y compris après modification. Ces ressources sont réservées à leur intégration dans le jeu ; ne pas les redistribuer séparément. Le crédit, facultatif selon l’auteur, figure dans le guide.

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

Les arbres, les buissons et la fumée de la tanière utilisent également les animations originales. La mairie utilise le château bleu, le manoir le château violet, la forge la caserne violette et la crypte le monastère violet. Les rues pavées sont une géométrie de terrain simple dessinée par le moteur.

Les reliefs suivent le [guide des terrains de Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide) : surface herbeuse continue, puis une seule rangée de falaise avec un pied adapté à la terre ou à l’eau. La rangée de pelouse isolée n’est pas intercalée dans les falaises. Les ombres originales sont répétées sur la grille de 64 pixels, décalées d’une case vers le bas, sans étirement.

La composition des abords utilise des silhouettes de tuiles découpées : anses, presqu’îles et terrasses superposées. Les escaliers, l’écume animée et les bosquets utilisent les images originales. Les formes du terrain servent également à exclure les décors de l’eau, des falaises et des escaliers ; les ponts et les trajets de ravitaillement gardent leurs accès.

Les particules `Dust_01`, `Dust_02`, `Explosion_01`, `Explosion_02` et `Fire_01` du dossier `Particle FX` sont copiées sans retouche par `scripts/import-particle-fx.ps1`. Elles accompagnent le travail des bâtisseurs, les impacts réels, les fins de chantier, les changements de propriétaire et la destruction du manoir. Quelques flammes signalent les bâtiments sous 40 % de résistance. Ces effets restent visuels, suivent la pause et la vitesse de simulation et sont masqués avec la réduction des animations ; seul l’impact final termine sa lecture après la défaite.

Les 22 créatures originales du pack Enemy ont leurs séquences de repos, marche et attaque dans le catalogue. `scripts/import-enemy-pack.py` copie ces seules séquences et construit le manifeste ; les autres créatures que les six recrutables ne possèdent pas encore de comportements jouables.

`scripts/import-free-pack.py` copie les quatre classes humaines jaunes (Warrior, Lancer, Archer, Monk), les flèches et soins, le monastère de la guilde, les paysans bleus avec outils et cargaisons, les décors variés et les éléments UI utilisés. Les paysans utilisent les cycles Axe/Wood, Pickaxe/Gold et Knife/Meat.

Les textures UI sont des planches de morceaux séparés. `PackUI.tsx` répète les morceaux des panneaux et boutons dans un canvas à échelle fixe, sans étirer le grain du bois ou le parchemin ; le ruban utilise trois morceaux SVG. Les coins restent à taille fixe. Le gisement d’or emploie Gold Stone 5 et Gold Stone 4, qui représentent des rochers plutôt que les petites pépites de Gold Stone 1. Le pack fourni ne contient pas de bâtiment de mine. Aucun PNG n’est redessiné.


L’alchimiste emploie les séquences Idle, Walk et Attack du Hex Shaman original, ainsi que `Hex Shaman_Avatar.png`, sans retouche. `scripts/import-alchemist.ps1` copie ces quatre ressources vers les entrées `alchemist-*`. Les tours emploient les tours bleues et violettes déjà importées. Les combos utilisent Fire_01 et le rituel humain l’animation de soins du moine, tous issus du pack.

Les jardins conservent les couleurs originales du pack, sans modification de palette. Les notices du haut utilisent le parchemin enroulé `ui-banner.png` et la pause le ruban bleu `ui-ribbons.png`, avec leurs bordures et ornements originaux. Les rampes de terrain emploient leurs deux moitiés (128 × 128 pixels) et les surfaces de sol contiguës partagent une même palette. L’aperçu de construction réutilise le sprite final avec une opacité réduite.

La réaction des moutons utilise les six images originales de `Resources/Sheep/HappySheep_Bouncing.png` (Tiny Swords Update 010), copiées sans retouche par `scripts/import-sheep-pack.py` vers `sheep-hit.png`. Elle accompagne la récolte de viande des bergers et gobelins ainsi que les dégâts de sabotage, puis revient au cycle normal. Elle suit le temps de simulation et respecte la réduction des animations.

## Effets sonores TomMusic

Source : [Free Fantasy 200 SFX Pack — TomMusic](https://tommusic.itch.io/free-fantasy-200-sfx-pack).
L’archive fournie par l’utilisateur a servi à importer 11 fichiers WAV originaux (1,37 Mo) : deux coupes de bois, deux extractions, deux attaques d’épée, un arc, deux sorts, une fermeture de coffre et une ouverture de porte. La sélection exacte est dans `scripts/import-tommusic.ps1`.

La page de l’auteur autorise l’utilisation dans des projets commerciaux ou personnels et interdit la revente ou redistribution du pack seul. TomMusic est crédité dans l’aide du jeu. Seuls les 11 effets utilisés par Evil City sont inclus dans les ressources du jeu ; ils conservent les conditions de TomMusic et ne constituent pas une banque de sons réutilisable sous la licence du code.

Importer à nouveau les originaux : `powershell -NoProfile -File scripts/import-tommusic.ps1 -Archive "C:/chemin/Free Fantasy SFX Pack By TomMusic.zip"`. Les fichiers arrivent dans `public/audio/tommusic/`. Ils sont suivis par Git et copiés par Vite dans le jeu compilé, y compris lors du déploiement GitHub Pages. `scripts/check-audio.mjs` vérifie leur chargement et leur lecture sur ordinateur, téléphone et tablette ; `GAME_URL` permet de viser la version publiée.
