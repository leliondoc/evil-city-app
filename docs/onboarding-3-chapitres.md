# Une campagne qui apprend par la pratique

Les retours du joueur décrivent trois difficultés liées : trop d’informations avant la première action, des ordres difficiles à donner, et des automatismes qui reprennent trop vite la main. La profondeur tactique devient utile quand le joueur peut placer son armée et décider du moment de l’assaut.

## Progression mise en place

| Quartier | Objectifs | Découvertes | Pression |
| --- | --- | --- | --- |
| 1. Le Refuge | Recruter un bâtisseur ; construire une cantine ; recruter et déplacer deux lanciers au drapeau | Gobelin seul au départ, puis cantine/grotte et lanciers | Domaine abandonné, aucun ennemi ni raid |
| 2. Le Faubourg | Conquérir une maison ; manoir 2 ; crypte et premier squelette ; mairie | Squelette sans consommation de vivres, transformation d’une maison conquise | Bâtiments qui défendent leur entrée, fortifications réduites, aucun raid chronométré |
| 3. Les Tilleuls | Manoir 3 ; terrain et hutte des trolls ; premier troll ; guilde ; mairie et rues sécurisées | Spectre au manoir 3 ; troll et alchimiste à la hutte ; minotaure après le premier troll ; recherches et tours | Garde, guilde, livraisons et renforts du jeu complet |

Les implantations diffèrent : le refuge ne contient aucun bâtiment humain ; le faubourg possède une mairie à l’est et aucune guilde ; les Tilleuls disposent d’une guilde au nord-ouest et d’une mairie au nord-est. Les trois scènes réutilisent la grille de rues et les chemins vers les ressources, avec des sols distincts. Il ne s’agit pas encore d’un générateur de terrains libres.

Chaque chapitre fournit ses propres ressources et troupes pour éviter de refaire l’ouverture ou d’arriver sans moyens depuis une victoire coûteuse. Le chapitre suivant devient accessible après la victoire. Les déblocages sont conservés sur l’appareil, tandis que la partie elle-même reste en mémoire dans l’onglet.

## Réponse aux retours

| Retour | Solution |
| --- | --- |
| Onze objectifs et trop de fenêtres | Un objectif courant ; listes courtes de 3, 4 et 5 objectifs ; détails fermés au lancement |
| Toutes les cartes immédiatement visibles | Découvertes progressives dans les menus, portraits de population et raccourcis ; restrictions également vérifiées par le moteur |
| Trop de statistiques avant de comprendre une unité | Forces et faiblesses dans un volet replié ; recherches, hantises et rituels présentés dans le dernier chapitre |
| Pourquoi vivre avec les humains sans hostilité ? | Contexte explicite dans le choix du chapitre et le guide : refuge isolé, bourg défendu localement, puis enclave surveillée avec réactions humaines |
| Panneau « aucune sélection » encombrant | Aucun panneau vide, détails refermables sur ordinateur comme sur tactile |
| Déplacement tactile qui désélectionne | Toucher une unité puis une rue donne un déplacement ; toucher un ennemi ordonne l’attaque ; bouton explicite de désélection |
| Armée impossible à regrouper | Commandes Armée, déplacement/attaque et Tenir ; exercice réel de rassemblement dès le premier chapitre |
| Soldats qui repartent manger/dormir | Priorité de l’ordre jusqu’à sa fin, puis délai de 30 secondes avant les besoins automatiques ; nouvel ordre = nouveau délai ; Tenir reste actif jusqu’au prochain ordre |
| Taille de l’interface | Réglage conservé de 80 à 130 % ; texte adaptable et cibles tactiles d’au moins 44 pixels |
| Guide mobile coupé par le parchemin | Fond et marges adaptés au guide court, hauteur minimale et défilement pour le guide développé en paysage |

Le délai commence après l’arrivée ou la fin du combat : un trajet de plus de 30 secondes reste donc prioritaire. Les soldats en position ripostent à portée. Une sélection seule ne remplace pas un ordre. Les ouvriers conservent leurs récoltes automatiques ; un ordre explicite de maintien peut les immobiliser.

Pour les actions avancées, Company of Heroes sur mobile offre une roue par appui long sur l’escouade ([documentation de Feral](https://www.feralinteractive.com/en/faqs/companyofheroes/1.0.2/ios/)). Evil City utilise le toucher contextuel pour les déplacements fréquents et conserve ses boutons pour les ordres supplémentaires.

## Vérifications

- Tests de simulation des trois scénarios, des restrictions, des objectifs, des pertes et des délais d’automatisation.
- Parcours complets du Refuge et du Faubourg avec leurs ressources initiales et les vrais temps de construction.
- Parcours automatisé des Tilleuls via les commandes ordinaires, sans modifier stocks ou points de vie ; victoire obtenue en environ 219 secondes de simulation. Cette exécution valide la faisabilité, pas la durée d’une première partie humaine.
- Contrôles navigateur en 1440×900, 390×844, 768×1024, 844×390 et 1024×768 : démarrage, guide, construction, rassemblement, victoire, chapitre suivant, déplacement tactile direct et taille du texte. Glissement et pincement contrôlés avec de vrais événements tactiles Chromium.
- Contrôle du build sous Chromium et WebKit, avec ressources locales, reprise et récupération après une erreur de chargement.

Ces essais simulent les formats et les entrées. Une partie sur iPad/iPhone physique reste utile pour juger le confort, la performance et le rythme réel d’apprentissage.
