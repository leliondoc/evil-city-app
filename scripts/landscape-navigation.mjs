// Follow the same rotation prompt as a player on a portrait touch device.
export async function requireLandscape(page) {
  const prompt = page.getByRole('heading', {
    name: 'Tournez votre appareil',
    exact: true,
  });
  if (!(await prompt.isVisible())) return;
  const { width, height } = page.viewportSize();
  await page.setViewportSize({
    width: Math.max(width, height),
    height: Math.min(width, height),
  });
  await prompt.waitFor({ state: 'hidden' });
}
