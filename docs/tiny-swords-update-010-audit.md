# Tiny Swords — Update 010 : inventaire utile à Evil City

Archive examinée : `~/Downloads/Tiny Swords.zip`, dossier `Tiny Swords (Update 010)`.
197 PNG, plus leurs sources Aseprite. Inspection des 18 décorations, des bâtiments,
ressources, terrains et interfaces ; lecture des familles de troupes et des tags
Aseprite du gobelin. Aucun fichier de licence présent dans cette archive : son nom
interne ne permet pas à lui seul de confirmer l’appellation « Old Version CC0 ».

## Intégré dans cette modification

Le gobelin bâtisseur utilise maintenant **Torch/Purple/Torch_Purple.png** :
7 poses de repos, 6 de course, 6 d’attaque latérale. Extraction des rangées d’origine,
sans recoloration. Le portrait reprend sa pose de repos ; le bestiaire réutilise
les mêmes animations. Les attaques haut/bas restent disponibles dans l’archive
pour une future gestion de l’orientation verticale. Aucun changement de statistiques.
Import reproductible : `scripts/import-classic-goblin.py`.

Les petits décors de cour sont également intégrés : champignons, plantes, buisson,
citrouilles, os et panneau à crâne. Deux ou trois objets par bâtiment, selon son
type et la parcelle. Originaux copiés sans recoloration ; clôtures intactes.
Import : `scripts/import-classic-decor.py`.

## Éléments les plus utiles

| Priorité | Source dans l’archive | Usage possible | État / précaution |
|---|---|---|---|
| Haute | `Deco/01.png` à `03.png` | Trois tailles de champignons dans les cours, autour des cryptes et cantines | Petits décors originaux, plus discrets que les grands arbres |
| Haute | `Deco/07.png` à `11.png` | Trois buissons et deux plantes pour les bordures d’herbe | Décors naturels, pas de collection officiellement nommée « corrompue » |
| Haute | `Deco/12.png`, `13.png` | Citrouilles et végétation rampante des cours du mal | Très adaptées à l’ambiance, sans recoloration nécessaire |
| Haute | `Deco/14.png`, `15.png` | Ossements près des cryptes | Décor visuel seulement, à distinguer des dépouilles récupérables |
| Haute | `Factions/*/Buildings/*/*Destroyed.png` | Ruines lisibles après destruction | Maison, tour, château humains ; maison et tour gobelines. Adaptation nécessaire aux gabarits et états existants |
| Haute | `Factions/*/Buildings/*/*Construction.png`, `*InConstruction.png` | Montrer de vrais chantiers plutôt qu’un bâtiment transparent | Château, maison et tour humains ; tour gobeline |
| Moyenne | `Deco/16.png`, `17.png`, `18.png` | Panneaux à crâne / pièce et épouvantail | Racket, cantine ou ferme. Limiter leur nombre pour ne pas les confondre avec des commandes |
| Moyenne | `Resources/Gold Mine/GoldMine_Active.png`, `Inactive.png`, `Destroyed.png` | Distinguer production, arrêt et sabotage d’une mine | Requiert de conserver l’accès du travailleur et la lisibilité de la ressource |
| Moyenne | `Resources/Resources/{G,M,W}_Spawn.png` | Apparition animée du butin : or, viande, bois | À réserver aux gains sur la carte ; les étincelles des cartes restent supprimées |
| Moyenne | `Factions/Goblins/Troops/Barrel/*` | Gobelin caché dans un tonneau | Nouvelle unité ou action d’infiltration : nécessite une décision de gameplay |
| Moyenne | `Factions/Goblins/Troops/TNT/*`, `TNT/Dynamite/Dynamite.png` | Artificier / démolition de siège | Nouveau rôle, pas un remplacement automatique du bâtisseur |
| Moyenne | `Factions/Knights/Troops/Pawn/*` | Travail du paysan et port de ressources | Comparer au système de travailleurs actuel avant de remplacer les animations |
| Faible | `Deco/04.png` à `06.png` | Trois tailles de rochers | Utiles pour varier les abords ; risque de surcharge dans les cours |
| Faible | `Terrain/Bridge/Bridge_All.png` | Ponts et terminaisons modulaires | Le jeu possède déjà des ponts ; préserver les routes et collisions |
| Faible | `Terrain/Ground/*`, `Terrain/Water/*` | Terrain plat, falaises, ombres, écume et rochers aquatiques | Le terrain actuel couvre ces besoins ; éviter de mélanger les palettes sans raison |
| Faible | `UI/Buttons/*`, `UI/Banners/*`, `UI/Ribbons/*` | Boutons normaux, enfoncés, désactivés et survolés ; panneaux extensibles | Plusieurs équivalents déjà utilisés ; intéressant pour compléter un état manquant |
| Faible | `UI/Icons/*`, `UI/Pointers/*` | Réglages, son, verrou, niveaux 1–3, +/−, sélection | Système d’interface existant à conserver cohérent |

## Déjà présents, confirmés par comparaison exacte des fichiers

- `Resources/Sheep/HappySheep_Bouncing.png` → `sheep-hit`.
- `Terrain/Water/Water.png` → `water`.
- `Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Purple.png` → `imp-sanctum`.
- `Factions/Knights/Buildings/Castle/Castle_Blue.png` → `human-fortress-blue`.
- `Factions/Knights/Troops/Dead/Dead.png` → `unit-death`.

Une absence de correspondance exacte ne signifie pas qu’aucun équivalent n’existe :
certains sprites du jeu sont extraits d’une planche ou viennent du Free Pack récent.

## Autres familles examinées

- Gobelins Torch, Barrel et TNT en bleu, rouge, violet et jaune.
- Humains Archer, Warrior et Pawn dans ces quatre couleurs ; arcs et flèches séparés.
- Maison gobeline, tour en bois et variantes ; maisons, tours et châteaux humains.
- Moutons au repos et en réaction ; arbre animé ; or, bois, viande avec/sans ombre.
- Feu et explosion ; déjà couverts par les effets du jeu.

## Conclusion sur les arbres « corrompus »

Dans cet Update 010, `Resources/Trees/Tree.png` est l’arbre naturel animé. Les
citrouilles, os et panneaux de `Deco` sont les éléments originaux les plus adaptés
aux cours du mal. `Extra/Dead Tree/Dead Tree.png` appartient à **l’autre archive,
Enemy Pack**, et représente déjà la Hutte des Trolls du jeu. Ce n’est pas un arbre
décoratif à répéter en miniature. Les clôtures n’ont pas à changer pour intégrer
les petits décors ci-dessus.
