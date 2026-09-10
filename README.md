# Evil City

Prototype 0.3 de gestion, de conquête et de défense en 2D, en vue du dessus.

[Jouer dans le navigateur](https://leliondoc.github.io/evil-city-app/)

Application autonome React et Vite, publiée automatiquement avec GitHub Pages à chaque modification de la branche `main`. Le jeu fonctionne entièrement dans le navigateur et ne demande ni compte ni service serveur.

## Jouer

Construisez une cantine, revendiquez la friche centrale et bâtissez une forge. Recrutez quatre trolls, prenez la guilde, l’auberge et la mairie. Pour gagner, contrôlez la mairie et la guilde et éliminez les ennemis encore dans les rues. La destruction du manoir entraîne la défaite.

La garde se mobilise à **5 parcelles sur 9 (56 %)** ou à **3 minutes**, avec **25 secondes de préavis**. Elle reprend les propriétés et leur production avant de s’attaquer au manoir. La guilde envoie ses héros contre le manoir à **6 parcelles sur 9 (67 %)** ou à **6 minutes**, avec **35 secondes de préavis**. Le bandeau supérieur affiche les déclencheurs, le départ des prochains renforts, les ennemis présents et la santé du manoir. Cliquer sur une faction sélectionne son bâtiment.

Les humains gagnent un niveau toutes les **2 minutes**, jusqu’au niveau 6 : les garnisons frappent plus fort et les nouvelles vagues sont plus solides, plus nombreuses et plus fréquentes. Une mobilisation continue même si votre territoire diminue. Capturer la mairie ou la guilde coupe ses renforts ; les ennemis déjà sortis restent actifs. Si les gardes reprennent le bâtiment, la mobilisation recommence avec un préavis.

Les combattants interceptent les ennemis proches. Sélectionnez un ennemi pour l’intercepter avec l’armée, ou une propriété pour y rassembler vos combattants. « Défendre le manoir » et le repli donnent priorité au déplacement. Les bâtiments se réparent lentement hors de danger. Les maisons conquises produisent un tribut et peuvent être transformées. Une crypte débloque les squelettes ; une forge et une crypte permettent de recruter le minotaure.

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
- Mobilisation adverse par paliers de temps et d’expansion ; pas encore d’économie humaine simulée ni de sous-sol.
- Une première guilde et un type de héros. Les unités humaines mobiles partagent provisoirement le soldat bleu déjà intégré ; la marche utilise encore son animation de repos.
- Partie solo en mémoire, sans sauvegarde persistante, son ou multijoueur.

## Développement et validation

Node.js 24 et npm. Installation : `npm install`. Aperçu : `npm run dev`. Production : `npm run build`. Types : `npx tsc --noEmit`. Tests : `node --test tests/*.test.mjs`.

- `app/game/engine.ts` : simulation indépendante du rendu.
- `app/game/renderer.ts` : terrain, caméra, profondeur, animation et sélection sur l’alpha de la frame affichée.
- `app/game/art.ts` et `assets.json` : correspondance des sprites et séquences.
- `app/game/Sprite.tsx` : aperçu animé dans les panneaux et le bestiaire.
- `app/game/Game.tsx` : interface et commandes.
- `public/tiny-swords/` : ressources graphiques intégrées au jeu.

Deux parcours testés gagnent avec l’économie normale : une conquête rapide en environ **203 secondes**, et une approche défensive en environ **290 secondes** après une patrouille repoussée. Sans intervention, le manoir tombe vers **300 secondes**. Les 19 tests couvrent aussi les seuils, préavis, renforts, reconquêtes, interceptions, états de fin et l’invariance de la simulation accélérée. L’équilibrage reste celui d’un premier quartier de prototype.
