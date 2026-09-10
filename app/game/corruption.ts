/** Palette used only by the player's garden tiles; original pixel geometry and alpha remain intact. */
export function corruptGrassPixels(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const light = pixels[i] * 0.25 + pixels[i + 1] * 0.6 + pixels[i + 2] * 0.15;
    // Preserve the source shades; yellow-green blades become rusty red accents.
    const rust = Math.max(0, pixels[i + 1] - pixels[i + 2] - 4);
    pixels[i] = Math.min(145, Math.max(24, light * 0.85 - 10 + rust * 1.2));
    pixels[i + 1] = Math.max(20, light * 0.45 - 8);
    pixels[i + 2] = Math.max(19, light * 0.34 - 4);
  }
}
