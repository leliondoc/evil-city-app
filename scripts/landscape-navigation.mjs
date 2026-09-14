// Follow the same rotation prompt as a player on a portrait touch device.
export async function requireLandscape(page) {
  const prompt = page.getByRole('heading', {
    name: 'Tournez votre appareil',
    exact: true,
  });
  if (!(await prompt.isVisible())) return;
  // Headless Chromium cannot resize its OS window while fullscreen.
  // Exit before emulating a physical device rotation when auto-lock was refused.
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  });
  const { width, height } = page.viewportSize();
  await page.setViewportSize({
    width: Math.max(width, height),
    height: Math.min(width, height),
  });
  await prompt.waitFor({ state: 'hidden' });
}
