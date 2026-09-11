import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const tracks = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('/alkakrab/')) tracks.push(r.url());
  });
  await page.addInitScript(() => {
    // Exercise migration of settings saved before music existed.
    localStorage.setItem(
      'evil-city-audio-v1',
      JSON.stringify({ muted: false, volume: 0.35 }),
    );
    const play = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'play',
    ).value;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.src.includes('/alkakrab/')) window.musicElement = this;
      return play.apply(this, args);
    };
  });
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:3000');
  await page.locator('.loading-art').waitFor({ state: 'hidden' });
  assert.equal(tracks.length, 0, 'Music is not fetched before interaction');
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page.waitForFunction(() => window.musicElement?.currentTime > 0.1);
  assert.equal(
    await page.getByLabel('Volume de la musique').inputValue(),
    '20',
  );
  assert.equal(new Set(tracks).size, 1, 'Only the current track is streamed');
  await page.getByLabel('Volume des effets').fill('0');
  assert.equal(
    await page.evaluate(() => window.musicElement.paused),
    false,
    'Effects volume does not mute music',
  );
  await page.getByLabel('Volume de la musique').fill('0');
  assert.equal(await page.evaluate(() => window.musicElement.paused), true);
  await page.getByLabel('Volume de la musique').fill('15');
  await page.waitForFunction(() => !window.musicElement.paused);
  await page
    .getByRole('button', { name: 'Couper le son', exact: true })
    .click();
  assert.equal(await page.evaluate(() => window.musicElement.paused), true);
  await page
    .getByRole('button', { name: 'Activer le son', exact: true })
    .click();
  await page.waitForFunction(() => !window.musicElement.paused);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.evaluate(() => window.musicElement.paused), true);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => !window.musicElement.paused);
  await page.clock.install();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  assert.equal(await page.evaluate(() => window.musicElement.paused), true);
  const pausedAt = await page.evaluate(() => window.musicElement.currentTime);
  await page.clock.fastForward(10_000);
  assert.equal(
    await page.evaluate(() => window.musicElement.currentTime),
    pausedAt,
  );
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page.getByLabel('Volume de la musique').fill('15');
  assert.equal(
    await page.evaluate(() => window.musicElement.paused),
    true,
    'Settings cannot override manual pause',
  );
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !window.musicElement.paused);
  assert.ok(
    await page.evaluate((t) => window.musicElement.currentTime >= t, pausedAt),
  );
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  const played = [await page.evaluate(() => window.musicElement.src)];
  for (let index = 2; index <= 9; index++) {
    const previous = played.at(-1);
    await page.evaluate(() =>
      window.musicElement.dispatchEvent(new Event('ended')),
    );
    assert.equal(await page.evaluate(() => window.musicElement.paused), true);
    // Ordinary clicks and volume changes must not bypass the scheduled silence.
    await page.getByLabel('Volume de la musique').fill('15');
    if (index === 2) {
      await page
        .getByRole('button', { name: 'Garder le jeu en pause', exact: true })
        .click();
      await page.clock.fastForward(240_000);
      assert.equal(
        await page.evaluate(() => window.musicElement.src),
        previous,
      );
      await page
        .getByRole('button', { name: 'Reprendre à la fermeture', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Couper le son', exact: true })
        .click();
      await page.clock.fastForward(240_000);
      assert.equal(
        await page.evaluate(() => window.musicElement.src),
        previous,
      );
      await page
        .getByRole('button', { name: 'Activer le son', exact: true })
        .click();
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.clock.fastForward(240_000);
      assert.equal(
        await page.evaluate(() => window.musicElement.src),
        previous,
      );
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await page.clock.fastForward(119_000);
    assert.equal(
      await page.evaluate(() => window.musicElement.src),
      previous,
      'No track before two minutes',
    );
    assert.equal(await page.evaluate(() => window.musicElement.paused), true);
    await page.clock.fastForward(121_000);
    await page.waitForFunction(
      (old) =>
        window.musicElement.src !== old &&
        window.musicElement.currentTime > 0.05,
      previous,
    );
    played.push(await page.evaluate(() => window.musicElement.src));
  }
  assert.equal(
    new Set(played.slice(0, 8)).size,
    8,
    'All tracks play before any repeat',
  );
  assert.notEqual(played[7], played[8], 'No repeat at the round boundary');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('evil-city-audio-v1')),
  );
  assert.deepEqual(saved, { muted: false, volume: 0, musicVolume: 0.15 });
  // A second page has no migration fixture, preserving the actual saved settings.
  const second = await page.context().newPage();
  await second.goto(page.url());
  await second.locator('.loading-art').waitFor({ state: 'hidden' });
  await second
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  assert.equal(
    await second.getByLabel('Volume de la musique').inputValue(),
    '15',
  );
  await second.setViewportSize({ width: 390, height: 844 });
  const slider = second.getByLabel('Volume de la musique');
  await slider.scrollIntoViewIfNeeded();
  const bounds = await slider.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await second.screenshot({
    path: `${process.env.TEMP}/evil-music-settings.png`,
  });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: 8 shuffled tracks, 2–4 minute breaks, no early playback on clicks, frozen breaks when muted/hidden, saved volume and mobile controls.',
  );
} finally {
  await browser.close();
}
