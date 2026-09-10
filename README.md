# Evil City

Prototype 0.4 de gestion, de conquête et de défense en 2D, en vue du dessus.

[Jouer dans le navigateur](https://leliondoc.github.io/evil-city-app/)

Application autonome React et Vite, publiée automatiquement avec GitHub Pages à chaque modification de la branche `main`. Le jeu fonctionne entièrement dans le navigateur et ne demande ni compte ni service serveur.

## Jouer

Construisez une cantine, revendiquez la friche centrale et bâtissez une forge. Recrutez quatre trolls, prenez la guilde, l’auberge et la mairie. Pour gagner, contrôlez la mairie et la guilde et éliminez les ennemis encore dans les rues. La destruction du manoir entraîne la défaite.

La garde se mobilise à **5 parcelles sur 9 (56 %)** ou à **3 minutes**, avec **25 secondes de préavis**. Elle reprend les propriétés et leur production avant de s’attaquer au manoir. La guilde envoie ses héros contre le manoir à **6 parcelles sur 9 (67 %)** ou à **6 minutes**, avec **35 secondes de préavis**. Le bandeau supérieur affiche les déclencheurs, le départ des prochains renforts, les ennemis présents et la santé du manoir. Cliquer sur une faction sélectionne son bâtiment.

Les humains peuvent financer un niveau toutes les **2 minutes**, jusqu’au niveau 6, en dépensant **25 or, 20 bois et 15 vivres** livrés par leurs paysans : les garnisons frappent plus fort et les nouvelles vagues sont plus solides, plus nombreuses et plus fréquentes. Une mobilisation continue même si votre territoire diminue. Capturer la mairie ou la guilde coupe ses renforts ; les ennemis déjà sortis restent actifs. Si les gardes reprennent le bâtiment, la mobilisation recommence avec un préavis.

Les combattants interceptent les ennemis proches. Sélectionnez un ennemi pour l’intercepter avec l’armée, ou une propriété pour y rassembler vos combattants. « Défendre le manoir » et le repli donnent priorité au déplacement. Les bâtiments se réparent lentement hors de danger. Les maisons conquises produisent un tribut et peuvent être transformées. Une crypte débloque les squelettes ; une forge et une crypte permettent de recruter le minotaure.

Trois routes humaines relient une bergerie, un gisement d’or et un camp de bûcherons à leur bâtiment de livraison. Chaque paysan récolte pendant 6 secondes, transporte 10 ressources et les ajoute aux stocks seulement à son retour. Les vagues de gardes coûtent 8 or et 4 vivres par unité ; celles des héros, 16 or et 8 vivres par unité. Une vague sans ressources attend son ravitaillement.

Sélectionnez un paysan pour l’attaquer, ou un site pour le saboter avec l’armée. Éliminer un paysan fait perdre sa livraison et retarde son remplacement d’au moins 40 secondes (8 or + 5 vivres). Saboter un site rapporte 15 ressources et l’arrête pendant au moins 90 secondes ; le réparer coûte 10 or + 10 bois. Capturer le bâtiment de livraison coupe la route tant que vous le contrôlez. Le panneau « Ravitaillement humain » donne accès aux sites, aux paysans et aux stocks.

La guilde réunit quatre classes humaines : chevalier, lancier, archère et moine. L’archère lance des projectiles bloqués par les bâtiments ; le moine soigne ses alliés et n’endommage pas le manoir. Chaque classe a ses animations de repos, déplacement et attaque ou soin. Le chaman reste dans le catalogue des créatures.

Les gobelins construisent et récupèrent du bois. Les créatures ont des besoins alimentaires et des coûts de logement. Le retour au manoir soigne les blessés. Les bâtiments peuvent atteindre trois niveaux.

Glisser : déplacer la carte. Molette : zoom. Clic : sélectionner. Clic droit : déplacer une créature. Espace : pause. 1 à 4 : option de l’onglet actif. R : repli. H : aide. Le bestiaire présente les animations de repos, marche et attaque.

## Graphismes

Tiny Swords, par Pixel Frog : pack gratuit et pack Enemy acheté par l’utilisateur. Les illustrations générées de la première version ont été retirées du jeu. Les sprites originaux sont animés à 10 images par seconde, avec filtrage des pixels désactivé. La pause et la vitesse de simulation s’appliquent aux animations de la carte. Le bestiaire possède sa propre lecture et respecte la préférence de réduction des animations.

Le décor utilise les collines, falaises, arbres, buissons, rochers, moutons et nuages du pack. Les fiches, commandes, icônes de ressources et le petit ruban du titre utilisent ses éléments d’interface, assemblés par morceaux pour préserver les coins.

Voir ASSETS.md pour la provenance et les réglages.

## Limites

- Quartier fictif de neuf parcelles, sans import de carte réelle.
- Quatre créatures recrutables : gobelin, troll, squelette et minotaure. Le catalogue animé présente les 22 créatures du pack Enemy et les 4 héros humains. Les 18 autres créatures ne sont pas encore recrutables ni dotées de comportements en jeu.
- Combat continu avec défenseurs fixes. Les dégâts ne sont pas encore synchronisés sur l’image précise de chaque frappe.
- Les gobelins utilisent leur cycle de repos pendant le chantier ; le pack ne fournit pas de cycle de construction pour ce personnage.
- Mobilisation adverse par paliers de temps et d’expansion, financée par une économie humaine simplifiée. Pas de sous-sol ni de relief influant sur le déplacement.
- Une première guilde et quatre classes humaines. Aucun sorcier humain supplémentaire n’est intégré.
- Partie solo en mémoire, sans sauvegarde persistante, son ou multijoueur.

## Développement et validation

Node.js 24 et npm. Installation : `npm install`. La version jouable est vérifiée directement sur GitHub Pages après publication. Production : `npm run build`. Types : `npx tsc --noEmit`. Tests : `node --test tests/*.test.mjs`.

- `app/game/engine.ts` : simulation indépendante du rendu.
- `app/game/renderer.ts` : terrain, caméra, profondeur, animation et sélection sur l’alpha de la frame affichée.
- `app/game/art.ts` et `assets.json` : correspondance des sprites et séquences.
- `app/game/Sprite.tsx` : aperçu animé dans les panneaux et le bestiaire.
- `app/game/Game.tsx` : interface et commandes.
- `public/tiny-swords/` : ressources graphiques intégrées au jeu.

Deux parcours testés gagnent avec l’économie normale : une conquête rapide en environ **203 secondes**, et une approche défensive en environ **290 secondes** après une patrouille repoussée. Sans intervention, le manoir tombe vers **300 secondes**. Les 27 tests couvrent les livraisons, pénuries, sabotages, réparations, soins, projectiles, catalogue et aussi les seuils, préavis, renforts, reconquêtes, interceptions, états de fin et l’invariance de la simulation accélérée. L’équilibrage reste celui d’un premier quartier de prototype.
