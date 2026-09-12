# Illustrations du menu Evil City

Les décors et le personnage ont été générés avec **l’outil imagegen intégré**. Le détourage local du PNG au damier opaque a ensuite été explicitement autorisé par l’utilisateur. Aucun dessin du personnage n’est recalculé par le script de composition.

- Paysage : [evil-city-nightfall.png](../public/menu/evil-city-nightfall.png), 1672 × 941.
- Portrait mobile : [evil-city-nightfall-portrait.png](../public/menu/evil-city-nightfall-portrait.png), 948 × 1659.
- Personnage partagé avec transparence réelle : [evil-city-lancer.png](../public/menu/evil-city-lancer.png).
- Sources séparées : [art-source/menu](../art-source/menu).
- Reconstruction : `python scripts/compose-menu-art.py` avec Pillow et NumPy.

Le chevalier est remplacé par le lancier jaune, à partir de son sprite et de son portrait originels. Le même PNG détouré est redimensionné proportionnellement dans les deux compositions : même casque, même pose face à gauche, même lance droite, mêmes yeux sombres simples que l’archère. Le moine reste au premier plan grâce à deux contours de masque dans les coordonnées des décors. Les pixels RGB du lancier sont préservés ; seul le damier connecté au fond et les petits interstices fermés deviennent transparents.

Les décors conservent les corrections précédentes : bannières, maçonnerie, chaînes, arc et corde de l’archère, chemins et château. Le cadrage portrait laisse le lancier visible sur téléphone. La typographie et les commandes restent en React ; aucun voile, filtre ou réduction d’opacité ne couvre l’illustration.

## Références et sorties retenues

- `public/tiny-swords/hero-lancer-idle.png` et `hero-lancer-avatar.png` : unité et casque de référence, sans transformer le cadre du portrait en équipement.
- Décors sans chevalier : `exec-8b348e44-91af-4824-8371-649762e33f36.png` (paysage) et `exec-c09c9674-29ec-45a9-84c3-763476573401.png` (portrait).
- Lancier : `exec-b331480e-ab33-4cbf-baea-ba571a4e6206.png`, puis extraction demandée à l’outil dans `exec-74904b6b-9770-4d8c-a127-51d32a2a06c6.png` ; ce dernier contenait encore un damier opaque.
- Retouche finale des yeux : `exec-5c3f1561-6435-487c-87cb-c90e7142d748.png`, conservé dans `art-source/menu/lancer-generated.png` avant détourage local.
- Date : 12 septembre 2026. Mode intégré, sans appel au CLI/API de génération.

## Consigne exacte de retrait du chevalier, appliquée aux deux décors

Use case: precise-object-edit. The supplied full illustration is the EDIT TARGET.
Remove ONLY the entire gold-armored knight on the far right, including helmet, crest, both arms and legs, sword and shield. Leave that right-side space EMPTY of characters. Reconstruct the uncovered background with the existing simple village wall, dark blue stonework, timber frame, foliage and ground cobbles consistent with the neighboring scene. Keep a clear grounded cobblestone standing area at the old knight's feet; another character will be placed there separately in the game UI. Do NOT add any replacement figure or equipment.
Preserve the monk and archer completely, including every finger and face detail; the two must stay exactly where they are. Preserve all monsters, banners, chains, architecture, sky, clouds, one castle with one open door at the stairs, and all already corrected objects. Keep the clean flat smoothly shaded digital illustration finish, sharp inked outlines and clean colors. Do not add grain, fog, mottling or a translucent veil. No crate, no new props, no text. Same framing and dimensions as the input.

## Consigne exacte de création du lancier partagé

Use case: identity-preserve. Asset type: ONE standalone character cutout for the Evil City menu, to be reused unchanged on both desktop and mobile.
Inputs: Image 1 is the authoritative original yellow LANCER animation sprite sheet (successive frames of ONE character). Image 2 is his original face portrait; the gold polygon around the portrait is a UI FRAME and MUST NOT appear as equipment. Image 3 is ONLY the smooth inked game illustration STYLE and lighting reference.
Create ONE full-body illustrated version of this exact yellow lancer, isolated on a GENUINELY TRANSPARENT background with real alpha. No background, no floor, no cast ground shadow, no frame, no checkerboard drawn into the picture. Full character and entire spear visible with a small transparent safety margin.
Identity from sprite: conical pointed GOLD helmet, long straight central nasal guard, round fair-skinned face with dark eyes and short dark brown hair, tiny narrow brown tuft at the helmet top. Gold/yellow armor and tunic, simple leather belt, brown gloves and brown/gold boots, compact sturdy stylized build. Match the helmet silhouette and nose guard accurately. No enclosed T-visored knight helmet, no giant plume, no sword, NO SHIELD, no plaque/back plate, no cape.
Pose: natural stable left-facing three-quarter guard stance, looking clearly toward IMAGE LEFT toward the monsters. Both feet flat, sturdy shoulders and body. This is a confident adult armored spearman, larger/broader than the light archer, not a tiny child. Keep the game's cartoon proportions with large helmet, compact torso and strong short legs, avoiding exaggerated human realism.
Equipment: ONE perfectly straight wooden spear shaft held securely in his glove, almost vertical along the IMAGE RIGHT side of his body, clear solid gold/ivory spearhead centered exactly on its shaft, point high above his helmet. The other glove supports the same shaft naturally around waist height. Two hands total, five natural digits per glove where visible; no floating fingers. Pole continuous and straight with no bends or disconnected sections. Boots and spear do not overlap ambiguously.
Rendering: crisp dark blue-black ink outlines, smooth clean flat-shaded cartoon rendering matching image 3, warm orange light from LEFT and subtle cool blue moonlight on the right edge. Clean bright gold, deep warm browns. Natural black eyes, no red eyes. No grain, no cloudy translucent texture, no labels or typography. One character only. Tall output, 1024x1536, transparent PNG.

## Demande de transparence faite à l’outil

Use case: background-extraction. The supplied image is the EDIT TARGET.
Extract the existing lancer from the gray checkerboard background and return a GENUINELY TRANSPARENT PNG WITH AN ALPHA CHANNEL. Every pixel outside the lancer and spear silhouette, including gaps between legs and arms, must have alpha 0. Do not render a checkerboard as part of the image, do not render white/gray/black/color background. Use actual transparent output.
Keep every visible pixel of the character, equipment, pose, helmet, face, outline, hands, boots and spear unchanged. Do not redraw or restyle him. Remove only the entire background checkerboard and its mottled texture. Crisp edge following the existing dark outline, no halo, no shadow, no crop of spear point or boot soles. Same 1024×1536 framing. Deliver a transparent RGBA PNG cutout.

## Consigne exacte finale pour les yeux

Edit target: the single yellow lancer character in image 1. Image 2 is a supporting reference ONLY for the eyes of the female archer on the right side. Make exactly one small change to the lancer: replace the large anime-style white eye area and glossy pupil with the archer's simple compact dark oval eyes, set directly into the face. Small matte almost-black oval eyes, no large sclera, no sparkly highlights, no eyelashes, no red. Keep the leftward gaze. Match the archer's understated friendly cartoon game eye language.
Preserve absolutely every other part of image 1: the complete single continuous straight spear, hands and grip, robust proportions, helmet and nasal guard and tuft, pose, face shape, clothing, boots, outlines, exact framing and scale, colors and warm/cool lighting. Do not redesign the lancer. Do not generate a background scene. Keep same complete full-body cutout composition. Actual transparent alpha background if possible. No text, no second character. The entire purpose of this edit is only the eyes.
