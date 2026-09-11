// Verify the game's included effects locally or against GAME_URL after deployment.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
const url = process.env.GAME_URL || 'http://127.0.0.1:3000';
try {
  for (const [width, height, touch] of [
    [1280, 800, false],
    [320, 568, true],
    [768, 1024, true],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const errors = [],
      requests = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (r.url().includes('/audio/tommusic/')) requests.push(r.url());
    });
    await page.addInitScript(() => {
      window.audioStarts = [];
      // Keep the descriptor's method so the spy can forward the original receiver.
      const original = Object.getOwnPropertyDescriptor(
        AudioBufferSourceNode.prototype,
        'start',
      ).value;
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.audioStarts.push({
          duration: this.buffer?.duration,
          state: this.context.state,
        });
        return original.apply(this, args);
      };
    });
    await page.goto(url);
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    assert.equal(
      requests.length,
      0,
      'No audio download before the first interaction',
    );
    await page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .click();
    const preview = page.getByRole('button', {
      name: 'Tester le son',
      exact: true,
    });
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Tester le son'),
        )?.disabled,
    );
    assert.equal(new Set(requests).size, 40);
    await preview.click();
    const starts = await page.evaluate(() => window.audioStarts);
    assert.ok(
      starts.length > 0 &&
        starts.every((s) => s.duration > 0 && s.state === 'running'),
    );
    await page.getByLabel('Volume des effets', { exact: false }).fill('25');
    await page
      .getByRole('button', { name: 'Couper le son', exact: true })
      .click();
    assert.equal(await preview.isDisabled(), true);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('evil-city-audio-v1')),
    );
    assert.deepEqual(saved, { muted: true, volume: 0.25, musicVolume: 0.2 });
    await page.reload();
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .click();
    assert.equal(
      await page
        .getByRole('button', { name: 'Activer le son', exact: true })
        .isVisible(),
      true,
    );
    assert.equal(await page.locator('#effects-volume').inputValue(), '25');
    await page
      .getByRole('button', { name: 'Activer le son', exact: true })
      .click();
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent.includes('Tester le son'),
        )?.disabled,
    );
    await preview.click();
    assert.ok((await page.evaluate(() => window.audioStarts.length)) > 0);
    const panel = await page.locator('.audio-settings').boundingBox();
    assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1);
    assert.deepEqual(errors, []);
    console.log(
      `${width}x${height}: gesture loading, decoded WAV playback, volume, mute, persistence and settings OK`,
    );
    await page.close();
  }
  const page = await browser.newPage();
  await page.route('**/audio/tommusic/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto(url);
  await page.locator('.loading-art').waitFor({ state: 'hidden' });
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page
    .getByText(
      'Les effets sonores ne sont pas disponibles. Le jeu reste jouable sans son.',
      { exact: true },
    )
    .waitFor();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  console.log('Missing local sound files: clear status and game still usable');
  await page.close();
} finally {
  await browser.close();
}
