# Illustrations du menu Evil City

Les deux décors ont été retouchés avec **l’outil imagegen intégré**, en mode édition, le 12 septembre 2026. L’utilisateur a choisi de retirer tous les personnages sur PC et mobile, ce qui remplace les demandes de retouches de leurs yeux, peau et accessoires.

- Paysage : [evil-city-nightfall.png](../public/menu/evil-city-nightfall.png), 1672 × 941.
- Portrait : [evil-city-nightfall-portrait.png](../public/menu/evil-city-nightfall-portrait.png), 948 × 1659.
- Sources finales : [landscape.png](../art-source/menu/landscape.png) et [portrait.png](../art-source/menu/portrait.png).
- Export : `python scripts/compose-menu-art.py` copie les deux sources à l’identique, sans dépendance externe, traitement d’image ni ajout de personnage.
- Ancienne source archivée : `art-source/menu/lancer-generated.png`. Elle n’est pas exportée ni affichée.

Les rues sont désormais vides. Les personnages, équipements, fumées du spectre et objets de bois incohérents ont été supprimés ; les zones découvertes sont reconstruites avec des pavés et des murs de pierre. Le village, les bannières, les lanternes et le château restent présents. Le fond conserve son fini net et ses couleurs nocturnes. Aucun voile, filtre ou réduction d’opacité ne couvre les images dans l’interface.

La typographie et les commandes restent en React. Le titre utilise « Evil » et « City », avec la police Agenda Fantasy et ses dégradés d’origine ; l’interligne est augmenté pour éviter le chevauchement des ornements. La phrase est « Le mal ne fait pas de quartier. ». Le cadre ornemental de « Jouer » est conservé ; seul le contour de sélection extérieur est retiré. Au clavier, le cadre existant s’éclaircit pour signaler le focus.

## Sorties retenues

- Paysage : `exec-71e676d2-e9bf-4a47-b2a6-7aa313721635.png`.
- Portrait : `exec-0084912d-a9c8-49aa-949e-e0f8183bd06f.png`.
- Le paysage validé sert de référence de continuité pour l’édition portrait.
- Mode intégré uniquement, sans CLI/API de génération.

## Consigne exacte — paysage

Use case: precise-object-edit.
Asset type: Evil City desktop game menu background, wide landscape illustration.
Input image 1 is the EDIT TARGET, the existing approved village artwork. Keep its composition, camera, framing, linework, saturated crisp cel-shaded illustration style, blue nocturnal palette and warm window/lantern lights.
Primary request: REMOVE EVERY CHARACTER completely: the large green troll and wooden club on the left, the hooded purple specter and all of its character-shaped smoke/glow, the small goblin and handheld torch at lower left, the yellow archer and all her equipment at right, and the monk at lower right. There must be no people, monsters, humanoids, character silhouettes, leftover limbs, clothes, weapons, floating equipment, or character shadows anywhere.
Reconstruct the areas they covered into the same coherent empty cobblestone village street and simple stone boundary walls continuing the perspective of the existing center street. Keep the street open and spacious. Remove the unrecognizable broken wooden object/planks at the very bottom left and the stray broken upright plank at the bottom right; finish those small areas with plausible cobblestones and stones. Correct the incoherent timber fence behind the former archer into a simple, properly joined stone boundary wall. Do not invent decorative objects to fill the empty areas.
Preserve the existing surrounding half-timber houses, purple skull banners, attached wall torches and hanging lantern, distant gateway, forest, mountains, moon, sky and stars. Preserve the castle with ONE visible open main entrance reached by the path, narrow upper windows, and clear logical architecture. Keep trees distinct from chimneys. No new door above the castle entrance. No fire floating on stone. Buildings and mounted lanterns remain.
Output a single full-bleed wide landscape image of the same scene. No text, logo, frame, vignette, haze, foggy veil, soft overlay, desaturation, or global relighting. Make the local replacements seamless and keep the rest of the artwork unchanged.

## Consigne exacte — portrait

Use case: precise-object-edit.
Asset type: Evil City mobile game menu background, tall portrait illustration.
Input image 1 is the EDIT TARGET: keep its tall portrait framing, long village street, sky, moon and castle composition. Input image 2 is a SUPPORTING REFERENCE showing the approved empty desktop village, for matching the character removal and clean stone walls; do not turn the portrait into a landscape image.
Primary request: REMOVE EVERY CHARACTER from image 1 completely: the large green troll and club on the left, purple hooded specter with all its smoke/glow, goblin and handheld torch in lower left, yellow archer with bow/arrows on the right, and monk at lower right. No characters, monsters, people, silhouettes, equipment, leftover clothes or limbs, purple character smoke, or their cast shadows anywhere.
Reconstruct the occluded areas with a continuous open cobbled street, coherent stone boundary walls and the existing half-timber village behind them, matching the same perspective. The street stays empty. Remove the unrecognizable broken wooden object/planks at the very bottom left, replacing with plausible stones and cobbles. Any incoherent timber fence behind the former archer becomes a simple properly joined stone boundary wall. Do not add decorative filler or other objects.
Preserve the surrounding houses, purple skull banners, wall-mounted torches, right hanging lantern, distant village gateway, trees, mountains, moon, sky and stars. Trees and chimneys must remain separate recognizable objects. Preserve one castle with ONE open main entrance connected logically to the path. Remove any extra small glowing doorway in the rock below that main entrance; use plain stone there. Upper castle openings are narrow windows, never a second door. No floating flame or fire on stone.
Keep exactly the sharp saturated cel-shaded drawing style, clean black linework and nocturnal blue/orange palette of the edit target and supporting reference. No global recoloring, veil, mist, fog, dimming, vignette, frame, text or watermark. Output a single full-bleed TALL PORTRAIT background of the same scene without any characters.
