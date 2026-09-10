# Evil City

Prototype 0.4 de gestion, de conquête et de défense en 2D, en vue du dessus.

[Jouer dans le navigateur](https://leliondoc.github.io/evil-city-app/)

Application autonome React et Vite, publiée automatiquement avec GitHub Pages à chaque modification de la branche `main`. Le jeu fonctionne entièrement dans le navigateur et ne demande ni compte ni service serveur.

## Jouer

Vous commencez avec zéro or, bois, vivres et essence. Le manoir et les gobelins alimentent progressivement les réserves. La progression est Tanière → Cantine → Crypte → Forge : la tanière initiale débloque la cantine, puis chaque bâtiment terminé permet le suivant. Construisez une cantine, revendiquez la friche centrale et bâtissez une crypte pour recruter les premiers squelettes. Conquérez une maison pour y installer la forge (180 or, 75 bois), puis recrutez des trolls (90 or, 30 vivres). Améliorer le manoir accélère les revenus. Pour gagner, contrôlez la mairie et la guilde et éliminez les ennemis encore dans les rues. La destruction du manoir entraîne la défaite.

La garde se mobilise à **5 parcelles sur 9 (56 %)** ou à **7 minutes**, avec **25 secondes de préavis**. Elle reprend les propriétés et leur production avant de s’attaquer au manoir. La guilde envoie ses héros contre le manoir à **6 parcelles sur 9 (67 %)** ou à **6 minutes**, avec **35 secondes de préavis**. Le menu du quartier à droite affiche les déclencheurs, le départ des prochains renforts, les ennemis présents et la santé du manoir. Cliquer sur une faction sélectionne son bâtiment.

Les humains peuvent financer leur premier niveau à **6 minutes**, puis un niveau toutes les **2 minutes**, jusqu’au niveau 6, en dépensant **25 or, 20 bois et 15 vivres** livrés par leurs paysans : les garnisons frappent plus fort et les nouvelles vagues sont plus solides, plus nombreuses et plus fréquentes. Une mobilisation continue même si votre territoire diminue. Capturer la mairie ou la guilde coupe ses renforts ; les ennemis déjà sortis restent actifs. Si les gardes reprennent le bâtiment, la mobilisation recommence avec un préavis.

Les combattants interceptent les ennemis proches. Sélectionnez un ennemi pour l’intercepter avec l’armée, ou une propriété pour y rassembler vos combattants. « Défendre le manoir » et le repli donnent priorité au déplacement. Les bâtiments se réparent lentement hors de danger. Les maisons conquises produisent un tribut et peuvent être transformées. Une crypte débloque les squelettes ; une forge et une crypte permettent de recruter le minotaure.

Trois routes humaines relient une bergerie, un gisement d’or et un camp de bûcherons à leur bâtiment de livraison. Chaque paysan récolte pendant 6 secondes, transporte 10 ressources et les ajoute aux stocks seulement à son retour. Les vagues de gardes coûtent 8 or et 4 vivres par unité ; celles des héros, 16 or et 8 vivres par unité. Une vague sans ressources attend son ravitaillement.

Sélectionnez un paysan pour l’attaquer, ou un site pour le saboter avec l’armée. Éliminer un paysan fait perdre sa livraison et retarde son remplacement d’au moins 40 secondes (8 or + 5 vivres). Saboter un site rapporte 15 ressources et l’arrête pendant au moins 90 secondes ; le réparer coûte 10 or + 10 bois. Capturer le bâtiment de livraison coupe la route tant que vous le contrôlez. Le panneau « Ravitaillement humain » donne accès aux sites, aux paysans et aux stocks.

La guilde réunit quatre classes humaines : chevalier, lancier, archère et moine. Au premier coup reçu par la guilde, ses quatre défenseurs quittent leurs postes et poursuivent les assaillants à mort, sans limite de distance ni rappel à la capture du bâtiment. Cette garnison ne sort qu’une fois et remplace les anciens dégâts automatiques du bâtiment. Un héros attaqué garde également la mémoire de ses agresseurs et passe au suivant lorsque sa cible meurt. L’archère lance des projectiles bloqués par les bâtiments ; le moine soigne ses alliés et n’endommage pas le manoir. Chaque classe a ses animations de repos, déplacement et attaque ou soin. Le chaman reste dans le catalogue des créatures.

Les gobelins construisent et récupèrent du bois. Les créatures ont des besoins alimentaires et des coûts de logement. Le retour au manoir soigne les blessés. Les bâtiments peuvent atteindre trois niveaux.

Glisser : déplacer la carte. Shift + glisser gauche : sélection par rectangle. Molette : zoom. Clic : sélectionner. Clic droit : déplacer, attaquer ou hanter selon la créature. Espace : pause. 1 à 5 : option de l’onglet actif. R : repli. H : aide. Le bestiaire présente les animations de repos, marche et attaque.

## Hantises, dépouilles et vie du domaine

- **Spectre** : la crypte permet son recrutement (60 or, 30 essence, 1 place). Un clic droit sur un bâtiment humain l’y envoie ; après 3 s à l’entrée, les livraisons et départs de renforts s’arrêtent pendant 30 s. La hantise ajoute 18 de suspicion et le spectre doit attendre 60 s à compter de son déclenchement avant d’en préparer une autre. Le rappel, la mort du spectre ou la conquête du bâtiment met fin au maléfice. La guilde envoie un moine, s’il n’y en a pas déjà un. À son arrivée devant le portail, il interrompt la hantise et provoque le spectre dans la rue : chacun rejoint le duel à pied puis attaque avec son animation du pack. Le moine riposte avant de soigner : 6 dégâts/s contre les vivants, doublés contre les squelettes et spectres (+10 % par niveau supplémentaire). Dans le duel, il inflige donc 12 dégâts/s au niveau 1 et le spectre riposte à 12 dégâts/s ; le combat finit à la mort d’un adversaire, ou sur un ordre de fuite. Dès que le spectre le frappe, le moine le poursuit sans limite de distance, jusqu’à la mort de son adversaire ou à la sienne. L’exorcisme relance les 60 s de récupération. Le spectre ne combat que son exorciste, ne conquiert pas et ne mange pas.
- **Dépouilles** : les gobelins disponibles récupèrent automatiquement les corps hors du danger et les transportent à la crypte. Les chantiers restent prioritaires sur les gobelins encore libres ; la collecte peut être désactivée dans la crypte. Les paysans sans cargaison récupèrent les morts humains proches et les ramènent chez eux. Un corps au sol disparaît après 100 s ; un transport interrompu le laisse au sol pour 60 s. Réserve maximale : 6. Deux dépouilles et 12 essence lancent un rituel de 12 s pour un squelette, avec une place réservée et 45 s entre les rituels. Les squelettes et spectres ne fournissent aucune dépouille. Si la crypte du rituel est perdue, le squelette arrive au manoir.
- **Pot-de-vin** : sélectionnez la mairie humaine et envoyez une bourse de 100 or avec un gobelin libre. Seule la livraison retarde la prochaine patrouille de 45 s et réduit la suspicion de 15 ; les gardes déjà dehors et la guilde restent actifs. Le courrier dispose de 120 s. Sa mort, son rappel ou la conquête de la mairie fait perdre la bourse. Une expédition toutes les 120 s au maximum.
- **Vie quotidienne** : au calme, les créatures vivantes rejoignent la cantine pour manger et la tanière pour se reposer. Les morts-vivants se reconstituent à la crypte. Les pauses durent 4 s ; le repos soigne de 4 PV/s. La consommation alimentaire reste celle du bilan de vivres, sans deuxième prélèvement au repas. Les bulles indiquent faim, repas, sommeil, régénération et missions. Les ordres explicites et les combats interrompent les pauses ; un chantier ou un assaut n’est pas abandonné pour manger.

La suspicion monte avec les hantises (+18), les sabotages de sites (+10), les conquêtes par combat (+8) et les morts (+2). Elle baisse lentement au calme. À 60, elle déclenche la garde avec le préavis habituel, même avant le seuil de territoire ou de temps.

## Graphismes

Tiny Swords, par Pixel Frog : pack gratuit et pack Enemy acheté par l’utilisateur. Les illustrations générées de la première version ont été retirées du jeu. Les sprites originaux sont animés à 10 images par seconde, avec filtrage des pixels désactivé. La pause et la vitesse de simulation s’appliquent aux animations de la carte. Le bestiaire possède sa propre lecture et respecte la préférence de réduction des animations.

Le décor utilise les collines, falaises, arbres, buissons, rochers, moutons et nuages du pack. Les fiches, commandes, icônes de ressources et le petit ruban du titre utilisent ses éléments d’interface, assemblés par morceaux pour préserver les coins.

Voir ASSETS.md pour la provenance et les réglages.

## Limites

- Quartier fictif de neuf parcelles, sans import de carte réelle.
- Six créatures recrutables : gobelin, troll, squelette, minotaure, spectre (sprite du voleur) et alchimiste (Hex Shaman). Le catalogue animé présente les 22 créatures du pack Enemy et les 4 héros humains. Les 16 autres créatures du pack ne sont pas encore recrutables ni dotées de comportements en jeu.
- Combat continu avec défenseurs fixes. Les dégâts ne sont pas encore synchronisés sur l’image précise de chaque frappe.
- Les gobelins utilisent leur cycle de repos pendant le chantier ; le pack ne fournit pas de cycle de construction pour ce personnage.
- Mobilisation adverse par paliers de temps et d’expansion, financée par une économie humaine simplifiée. Pas de sous-sol ni de relief influant sur le déplacement.
- Une première guilde et quatre classes humaines. Aucun sorcier humain supplémentaire n’est intégré.
- Partie solo en mémoire, sans sauvegarde persistante, son ou multijoueur.

## Développement et validation

### Téléphones et tablettes

L’interface tactile affiche la carte sur toute la largeur, en portrait comme en paysage. La barre du bas ouvre les volets Détails, Bâtir et Recruter ; Carte les referme. Les quatre ressources restent visibles. Glisser un doigt déplace la carte, pincer à deux doigts zoome autour du geste. Groupe active la sélection par rectangle et les ajouts/retraits au toucher. Après sélection, Ordre permet de toucher une destination ou une cible, puis revient à Explorer quand l’ordre est accepté. Les boutons de zoom restent disponibles. Les zones de sécurité autour des encoches sont prises en compte. Les contrôles souris et Shift restent disponibles sur ordinateur.

La vérification navigateur `node scripts/check-mobile.mjs` utilise Playwright et Chrome : installer Playwright pour le développement, ou indiquer son package existant avec `PLAYWRIGHT_PACKAGE`. Elle vérifie 390 × 844, 320 × 568, 844 × 390 et le bureau 1280 × 800, et écrit ses captures dans un dossier temporaire. Lancer le serveur local avant ce contrôle.

Node.js 24 et npm. Installation : `npm install`. La version jouable est vérifiée directement sur GitHub Pages après publication. Production : `npm run build`. Types : `npx tsc --noEmit`. Tests : `node --test tests/*.test.mjs`.

Vérification visuelle locale des nouvelles mécaniques : lancer `npm run dev`, puis ouvrir `/tests/domain-preview.html`. Cette partie préparée utilise l’interface réelle avec une crypte, des dépouilles, un spectre et un moine ; elle n’est pas incluse dans le site de production. Les scénarios automatisés correspondants se trouvent dans `tests/domain.test.mjs`.

- `app/game/engine.ts` : simulation indépendante du rendu.
- `app/game/renderer.ts` : terrain, caméra, profondeur, animation et sélection sur l’alpha de la frame affichée.
- `app/game/art.ts` et `assets.json` : correspondance des sprites et séquences.
- `app/game/Sprite.tsx` : aperçu animé dans les panneaux et le bestiaire.
- `app/game/Game.tsx` : interface et commandes.
- `public/tiny-swords/` : ressources graphiques intégrées au jeu.

Les 100 tests couvrent la progression depuis zéro ressource jusqu’à la forge et la défense du premier raid, ainsi qu’une victoire après mobilisation humaine. Ils vérifient les livraisons, pénuries, sabotages, réparations, soins, projectiles, animations, déplacements, sélections, conquêtes et états de fin. Les nouveaux scénarios couvrent les hantises et exorcismes, livraisons et pertes de bourses, concurrence autour des dépouilles, rituels, repas, repos et invariance de la simulation accélérée. L’équilibrage reste celui d’un premier quartier de prototype.

Sélection : un clic sélectionne une unité ; glisser avec le bouton gauche déplace la carte. Shift + glisser gauche trace immédiatement un rectangle pour sélectionner un groupe ou compléter la sélection. Shift + clic ajoute ou retire une unité. Le clic droit commande les unités sélectionnées. Les gobelins d’un groupe mixte ne participent aux attaques qu’après la recherche Armes enflammées.

## Résurrection, combos et tours de quartier

Les paysans ramènent physiquement les dépouilles humaines. Un moine rejoint le bâtiment de dépôt, puis canalise 10 secondes : 25 or et 15 vivres des stocks humains rendent au combattant 60 % de ses PV. Chaque combattant ne revient qu’une fois. Les dépouilles déposées attendent au maximum 120 secondes (six places). Une menace proche, des dégâts ou une hantise interrompent le rituel ; conquérir le dépôt le supprime. La guilde peut envoyer un moine de secours pour 15 or et 10 vivres, avec 90 secondes entre deux envois. Les paysans enterrés ne sont pas ressuscités.

L’alchimiste, représenté exclusivement par le Hex Shaman original du pack Enemy, se recrute à la crypte pour 100 or, 35 essence et 15 vivres. Trois recherches permanentes composent les combos :

- Forge : **Armes enflammées**, 120 or, 50 bois, 20 essence. Arme aussi les gobelins (4 dégâts/s physiques), ajoute 3 dégâts/s de feu aux frappes et une brûlure de 3 secondes (2 dégâts/s).
- Crypte : **Solvant alchimique**, 90 or, 35 essence. Les attaques de l’alchimiste marquent leur cible 8 secondes : seuls les dégâts de feu sont doublés.
- Forge : **Braises contagieuses**, 150 or, 40 bois, 60 essence, après les armes enflammées. La mort d’un ennemi embrasé propage une brûlure de 4 secondes aux voisins visibles à moins de 2,8 cases. Le solvant amplifie également cette brûlure.

Le premier niveau conserve uniquement la Tour du pont, à l’ouest, sélectionnable sur la carte ou dans « Tours du quartier ». Tenir sa porte sans ennemi proche pendant 8 secondes la capture. Son rôle dépend de la créature affectée :

- **Gobelin — racket** : prélève 30 % d’une cargaison humaine proche, une fois par trajet, avec un stockage de 30 par ressource. Un autre gobelin libre doit rapporter le butin au manoir ; sa mort ou un nouvel ordre perd sa cargaison. Le racket augmente la suspicion.
- **Squelette — guet** : combat à la porte et appelle les défenseurs disponibles dans un rayon de 8 cases lorsqu’un ennemi approche.
- **Spectre — fausse alerte** : pour 15 essence, détourne pendant 12 secondes les patrouilles proches qui ne combattent pas déjà ; les moines restent concentrés. Récupération de 60 secondes.

Une tour sans garnison peut être reprise en 8 secondes par les humains proches, ce qui perd son butin. Les effets exigent que l’occupant soit réellement arrivé. Un ordre de groupe affecte une seule créature à la tour.

Les jardins utilisent les couleurs d’origine des terrains du pack, sans recoloration brun rouge. Les textes de carte ont un contour sombre, le bâtiment choisi apparaît en transparence sous le pointeur et les notifications utilisent le parchemin Tiny Swords en haut au centre, adapté au mobile.

La scène locale `/tests/strategy-preview.html` permet d’examiner les sprites, recherches, tours et notifications. Les 10 tests de `tests/strategy.test.mjs` vérifient dépenses, combos, captures, transports, interruptions et résurrection complète dans la simulation.

Les combattants proches se placent face à face sur un axe horizontal adapté aux sprites. Ils passent par le portail avant de s’écarter dans la rue et restent limités par les murs et leur vitesse de déplacement. La scène locale /tests/combat-preview.html présente les trois gabarits de mêlée contre un chevalier.

Les gobelins sont limités à 6, vivants et recrutements en attente inclus. Une mort libère une place ; les tanières ne relèvent pas cette limite. Le bandeau supérieur affiche le compteur sur 6 et indique ceux au bois et ceux aux chantiers ; son infobulle détaille les autres missions et les recrutements en attente. Un clic sélectionne tous les gobelins. La production de bois utilise exactement ce même décompte. Les quatre stocks du joueur sont plafonnés à 1 000 chacun : production, pillage, conquêtes et livraisons de tours respectent cette limite. Le surplus est perdu, les gains flottants de bois correspondent uniquement au revenu accepté et la production reprend après une dépense. Le plafond est affiché près de chaque stock, y compris sur mobile.

Chaque carte de recrutement affiche une barre de progression pendant la production, avec le temps avant la prochaine unité et le nombre en préparation. Elle suit la pause et la vitesse de simulation, respecte les durées de 6 secondes, 15 secondes pour le minotaure et 12 secondes pour le rituel de la crypte, puis disparaît quand il ne reste aucune unité de ce type en préparation.
