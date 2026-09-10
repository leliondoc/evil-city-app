# Evil City

Prototype 0.2 de gestion et de conquête en 2D, en vue du dessus.

[Jouer dans le navigateur](https://leliondoc.github.io/evil-city-app/)

Application autonome React et Vite, publiée automatiquement avec GitHub Pages à chaque modification de la branche `main`. Le jeu fonctionne entièrement dans le navigateur et ne demande ni compte ni service serveur.

## Jouer

Construisez une cantine, revendiquez la friche centrale et bâtissez une forge. Recrutez trois trolls, prenez l’auberge puis la mairie. Les maisons conquises produisent un tribut et peuvent être transformées. Une crypte débloque les squelettes ; une forge et une crypte permettent de recruter le minotaure.

Les gobelins construisent et récupèrent du bois. Les créatures ont des besoins alimentaires et des coûts de logement. Le retour au manoir soigne les blessés. Les bâtiments peuvent atteindre trois niveaux.

Glisser : déplacer la carte. Molette : zoom. Clic : sélectionner. Clic droit : déplacer une créature. Espace : pause. 1 à 4 : option de l’onglet actif. R : repli. H : aide. Le bestiaire présente les animations de repos, marche et attaque.

## Graphismes

Tiny Swords, par Pixel Frog : pack gratuit et pack Enemy acheté par l’utilisateur. Les illustrations générées de la première version ont été retirées du jeu. Les sprites originaux sont animés à 10 images par seconde, avec filtrage des pixels désactivé. La pause et la vitesse de simulation s’appliquent aux animations de la carte. Le bestiaire possède sa propre lecture et respecte la préférence de réduction des animations.

Voir ASSETS.md pour la provenance et les réglages.

## Limites

- Quartier fictif de neuf parcelles, sans import de carte réelle.
- Quatre créatures recrutables : gobelin, troll, squelette et minotaure. Les autres ennemis du pack ne sont pas encore jouables.
- Combat continu avec défenseurs fixes. Les dégâts ne sont pas encore synchronisés sur l’image précise de chaque frappe.
- Les gobelins utilisent leur cycle de repos pendant le chantier ; le pack ne fournit pas de cycle de construction pour ce personnage.
- Pas de faction adverse avec économie autonome, de raids ni de sous-sol.
- Partie solo en mémoire, sans sauvegarde persistante, son ou multijoueur.

## Développement et validation

Node.js 24 et npm. Installation : `npm install`. Aperçu : `npm run dev`. Production : `npm run build`. Types : `npx tsc --noEmit`. Tests : `node --test tests/*.test.mjs`.

- `app/game/engine.ts` : simulation indépendante du rendu.
- `app/game/renderer.ts` : terrain, caméra, profondeur, animation et sélection sur l’alpha de la frame affichée.
- `app/game/art.ts` et `assets.json` : correspondance des sprites et séquences.
- `app/game/Sprite.tsx` : aperçu animé dans les panneaux et le bestiaire.
- `app/game/Game.tsx` : interface et commandes.
- `public/tiny-swords/` : ressources graphiques intégrées au jeu.

Le parcours de référence atteint la mairie en environ 144 secondes de simulation avec les ressources normales. Dix tests couvrent la progression, les ordres invalides, les chemins, les logements, les soins, les améliorations, les dimensions des images et les transitions de l’attaque du troll. Pas de vérification interactive dans le navigateur lors de cette refonte.
