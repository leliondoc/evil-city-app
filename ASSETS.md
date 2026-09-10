# Graphismes et animations d’Evil City

Auteur : Pixel Frog. [Source officielle](https://pixelfrog-assets.itch.io/tiny-swords).

## Provenance et licence

Le dossier Tiny Swords (Free Pack) a été fourni par l’utilisateur dans Downloads le 10 septembre 2026. Tiny Swords (Enemy Pack).zip a été acheté et fourni par l’utilisateur le même jour.

Les archives complètes et les fichiers Aseprite restent hors du site distribué. Les PNG intégrés sont copiés sans modification de leur dessin. Aucune image générée n’est utilisée dans cette version.

La licence indiquée sur la page officielle autorise l’usage personnel et commercial ainsi que la modification. Elle interdit la redistribution, la revente et le reconditionnement des ressources comme pack, y compris après modification. Ces ressources sont réservées à leur intégration dans le jeu ; ne pas les redistribuer séparément. Le crédit, facultatif selon l’auteur, figure dans le guide.

## Créatures jouables

| Rôle        | Personnage original | Séquences                            |
| ----------- | ------------------- | ------------------------------------ |
| Bâtisseur   | Torch Goblin        | Idle, Run ; Attack au bestiaire      |
| Combattant  | Troll               | Idle, Walk, Windup, Attack, Recovery |
| Mort-vivant | Skull               | Idle, Run, Attack                    |
| Colosse     | Minotaur            | Idle, Walk, Attack                   |

Les dimensions sont décrites dans `app/game/assets.json`. Les tags des sources Aseprite ont été vérifiés. Les images sont lues dans leur ordre d’origine à 100 ms par frame. Le maintien de 5 secondes sur la dernière frame Wind-up du fichier Aseprite du troll est ramené à 100 ms pour le cycle de combat du prototype ; les cinq images de préparation sont conservées.

Les arbres, les buissons et la fumée de la tanière utilisent également les animations originales. La mairie utilise le château bleu, le manoir le château violet, la forge la caserne violette et la crypte le monastère violet. Les rues pavées sont une géométrie de terrain simple dessinée par le moteur.

Les 22 créatures originales du pack Enemy ont leurs séquences de repos, marche et attaque dans le catalogue. `scripts/import-enemy-pack.py` copie ces seules séquences et construit le manifeste ; les autres créatures que les quatre recrutables ne possèdent pas encore de comportements jouables.

`scripts/import-free-pack.py` copie les quatre classes humaines jaunes (Warrior, Lancer, Archer, Monk), les flèches et soins, le monastère de la guilde, les paysans bleus avec outils et cargaisons, les décors variés et les éléments UI utilisés. Les paysans utilisent les cycles Axe/Wood, Pickaxe/Gold et Knife/Meat.

Les textures UI sont des planches de morceaux séparés. `PackUI.tsx` répète les morceaux des panneaux et boutons dans un canvas à échelle fixe, sans étirer le grain du bois ou le parchemin ; le ruban utilise trois morceaux SVG. Les coins restent à taille fixe. Le gisement d’or emploie Gold Stone 5 et Gold Stone 4, qui représentent des rochers plutôt que les petites pépites de Gold Stone 1. Le pack fourni ne contient pas de bâtiment de mine. Aucun PNG n’est redessiné.
