# Graphismes et animations d’Evil City

Auteur : Pixel Frog. [Source officielle](https://pixelfrog-assets.itch.io/tiny-swords).

## Provenance et licence

Tiny Swords (Free Pack).zip a été téléchargé depuis la page officielle le 10 septembre 2026. Tiny Swords (Enemy Pack).zip a été acheté et fourni par l’utilisateur le même jour.

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

Les autres ennemis du pack restent disponibles dans l’archive locale pour les prochaines étapes. Ils ne possèdent pas encore de comportements jouables.
