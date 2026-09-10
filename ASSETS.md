# Graphismes et animations d’Evil City

Auteur : Pixel Frog. [Source officielle](https://pixelfrog-assets.itch.io/tiny-swords).

Les libellés de la carte et les gains de ressources utilisent **Pixel Operator Regular**, de Jayvee Enaguas (HarvettFox96), sous CC0 : [source et licence](https://fontlibrary.org/en/font/pixel-operator). La police originale est intégrée dans `public/fonts/`, chargée avant le premier rendu, et affichée à 16 px avec une ombre décalée de 1 px. Les coordonnées des libellés sont alignées sur les pixels de l’écran et leur taille reste stable au zoom.

## Provenance et licence

Le dossier Tiny Swords (Free Pack) a été fourni par l’utilisateur dans Downloads le 10 septembre 2026. Tiny Swords (Enemy Pack).zip a été acheté et fourni par l’utilisateur le même jour.

Les archives complètes et les fichiers Aseprite restent hors du site distribué. Les PNG des packs sont copiés sans modification de leur dessin.

Le logo `public/evil-city-logo.png` provient de `eclogo.png`, fourni par l’utilisateur. Son fond a été retiré avec l’outil imagegen intégré, avec cette consigne : « Retirer uniquement le fond blanc, fournir un PNG à transparence réelle, conserver le dessin, les couleurs et les proportions du logo, nettoyer les contours sans halo blanc et garder une petite marge transparente. » Il est affiché à 40 px sur ordinateur et 30 px sur petit écran.

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

Les 22 créatures originales du pack Enemy ont leurs séquences de repos, marche et attaque dans le catalogue. `scripts/import-enemy-pack.py` copie ces seules séquences et construit le manifeste ; les autres créatures que les cinq recrutables ne possèdent pas encore de comportements jouables.

`scripts/import-free-pack.py` copie les quatre classes humaines jaunes (Warrior, Lancer, Archer, Monk), les flèches et soins, le monastère de la guilde, les paysans bleus avec outils et cargaisons, les décors variés et les éléments UI utilisés. Les paysans utilisent les cycles Axe/Wood, Pickaxe/Gold et Knife/Meat.

Les textures UI sont des planches de morceaux séparés. `PackUI.tsx` répète les morceaux des panneaux et boutons dans un canvas à échelle fixe, sans étirer le grain du bois ou le parchemin ; le ruban utilise trois morceaux SVG. Les coins restent à taille fixe. Le gisement d’or emploie Gold Stone 5 et Gold Stone 4, qui représentent des rochers plutôt que les petites pépites de Gold Stone 1. Le pack fourni ne contient pas de bâtiment de mine. Aucun PNG n’est redessiné.
