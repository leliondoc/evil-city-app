# Artwork du menu Evil City

Les deux décors ont été retouchés avec **l’outil imagegen intégré**, en mode édition, le 12 septembre 2026.

## Fichiers livrés

- Paysage : [evil-city-nightfall.webp](../public/menu/evil-city-nightfall.webp), 1672 × 941, **228 028 octets**.
- Portrait : [evil-city-nightfall-portrait.webp](../public/menu/evil-city-nightfall-portrait.webp), 948 × 1660, **219 228 octets**.
- Sources PNG finales : [landscape.png](../art-source/menu/landscape.png) et [portrait.png](../art-source/menu/portrait.png).
- Export : `python scripts/compose-menu-art.py`, avec Pillow. WebP qualité 90, méthode 6, dimensions conservées, sans recomposition.
- Les PNG publics précédents pesaient respectivement 2 324 103 et 2 300 004 octets. Les exports finaux représentent **90,2 % et 90,5 % de moins** ; seuls les WebP sont distribués.
- Le HTML précharge uniquement le format correspondant au rapport de l’écran. Le `picture` réutilise exactement cette URL, avec décodage asynchrone et priorité haute. Les tests navigateur vérifient une seule requête d’artwork au chargement.
- L’ancienne source `art-source/menu/lancer-generated.png` est archivée et n’est pas affichée.

## Direction artistique finale

Le village reste entièrement vide. Les façades ont été reconstruites avec des fenêtres, des portes, de la maçonnerie et des poutres compréhensibles. Les points lumineux isolés et les supports de torches incohérents ont été nettoyés. Le château conserve une entrée principale ouverte et un passage en retrait ; l’ouverture orange parasite dans la colline du portrait a été retirée.

La nouvelle demande assombrit l’ambiance : brume basse dans les rues, autour des arbres et de la colline, ciel d’orage et éclairs discrets. Les pavés et leurs reflets sont moins éclairés. Les fenêtres et lanternes gardent une lumière chaude. Cette atmosphère est peinte dans les images, sans ajouter de filtre CSS global sur le menu.

La typographie et les commandes restent en React. Le titre utilise « Evil » et « City », la police Agenda Fantasy et ses dégradés d’origine. La devise reste « Le mal ne fait pas de quartier. ». La phrase de pied de page « Un quartier tranquille. Pour l’instant. » est retirée. Le cadre ornemental de « Jouer » reste inchangé.

## Sorties retenues et provenance

- Nettoyage paysage : `exec-e1a64fc8-d63f-4d10-838a-886740e1df0a.png`.
- Nettoyage portrait : `exec-dd95eaa3-752e-4c00-a501-8cb96b9986f0.png`, puis retrait de l’ouverture parasite : `exec-cf74169e-65cb-47fd-b848-0dad382271aa.png`.
- **Atmosphère finale paysage** : `exec-67eaad78-49ea-44bf-84b0-923eba68740d.png`.
- **Atmosphère finale portrait** : `exec-07be0795-1d13-4483-8377-91ad66c23f4a.png`.
- Les deux dernières éditions utilisent chaque décor nettoyé comme cible et conservent son cadrage.
- Mode intégré uniquement, sans CLI/API de génération. La conversion WebP locale est autorisée par la demande d’optimisation.

## Consigne exacte finale — paysage

Use case: lighting-weather. Image 1 is the EDIT TARGET, the existing Evil City empty medieval village menu artwork with recently repaired architecture.
Change the atmosphere to distinctly darker, ominous, haunted NIGHT BEFORE A STORM. The current bright cobbles and cheerful cyan sky dominate too much.
Darken the ambient illumination to deep midnight indigo, muted blue-violet and charcoal. Reduce the brightness and visual contrast of individual foreground paving stones and their large orange reflections, so the road recedes into shadow instead of dominating the picture. Keep the same paving geometry.
Add natural low drifting blue-gray FOG in several depth layers: across sections of the foreground cobbles, flowing through the middle street, between houses and garden walls, among the trees, and around the lower castle hillside. Wisps partially obscure the ground and distant details. This is spatial atmospheric fog in the scene, not a flat gray overlay over the entire illustration. Keep nearby architecture edges, lamps and banners readable.
Replace much of the cheerful bright sky with brooding layered storm clouds; partially shroud the moon and reduce the busy stars. Add ONE OR TWO slender distant branching LIGHTNING bolts high in the sky or behind the distant mountains, cool pale lavender-white, restrained scale, integrated into the clouds. No giant dominant bolt or overall white flash. The moon still gives a dim cool rim to the castle.
Keep small warm amber/orange windows and real attached torches/lanterns as inviting but uneasy points of light against the dark. Light should diffuse gently through nearby fog. Keep enough local color and crisp ink outlines to retain the existing hand-painted cartoon fantasy game art style; do not turn it into photorealism.
Preserve the exact composition, camera, empty village, road, clean structural timber, stone walls, roofs, skull banners, mountains, castle silhouette, and single OPEN main castle gateway. No people, creatures, faces in fog, equipment, new buildings, text, logo, interface or frame. Do not reintroduce malformed architectural details or a second castle doorway. Change weather and lighting only.
Maintain exactly the wide landscape framing and proportions. Return one complete LANDSCAPE background.

## Consigne exacte finale — portrait

Use case: lighting-weather. Image 1 is the EDIT TARGET, the existing Evil City empty medieval village menu artwork with recently repaired architecture.
Change the atmosphere to distinctly darker, ominous, haunted NIGHT BEFORE A STORM. The current bright cobbles and cheerful cyan sky dominate too much.
Darken the ambient illumination to deep midnight indigo, muted blue-violet and charcoal. Reduce the brightness and visual contrast of individual foreground paving stones and their large orange reflections, so the road recedes into shadow instead of dominating the picture. Keep the same paving geometry.
Add natural low drifting blue-gray FOG in several depth layers: across sections of the foreground cobbles, flowing through the middle street, between houses and garden walls, among the trees, and around the lower castle hillside. Wisps partially obscure the ground and distant details. This is spatial atmospheric fog in the scene, not a flat gray overlay over the entire illustration. Keep nearby architecture edges, lamps and banners readable.
Replace much of the cheerful bright sky with brooding layered storm clouds; partially shroud the moon and reduce the busy stars. Add ONE OR TWO slender distant branching LIGHTNING bolts high in the sky or behind the distant mountains, cool pale lavender-white, restrained scale, integrated into the clouds. No giant dominant bolt or overall white flash. The moon still gives a dim cool rim to the castle.
Keep small warm amber/orange windows and real attached torches/lanterns as inviting but uneasy points of light against the dark. Light should diffuse gently through nearby fog. Keep enough local color and crisp ink outlines to retain the existing hand-painted cartoon fantasy game art style; do not turn it into photorealism.
Preserve the exact composition, camera, empty village, road, clean structural timber, stone walls, roofs, skull banners, mountains, castle silhouette, and single OPEN main castle gateway. No people, creatures, faces in fog, equipment, new buildings, text, logo, interface or frame. Do not reintroduce malformed architectural details or a second castle doorway. Change weather and lighting only.
Maintain exactly the tall portrait framing, with the long street and castle at upper right. Return one complete TALL PORTRAIT background.
