// Run against the dev server with PLAYWRIGHT_PACKAGE pointing to Playwright if needed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
const output = await mkdtemp(join(tmpdir(), 'evil-city-start-menu-'));
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
const errors = [];
try {
  for (const viewport of [
    { width: 1600, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
      hasTouch: viewport.width < 900,
      isMobile: viewport.width < 900,
    });
    const page = await context.newPage();
    const artworkRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/menu/evil-city-nightfall'))
        artworkRequests.push(request.url());
    });
    await page.addInitScript(() => {
      window.menuAudio = [];
      window.Audio = new Proxy(window.Audio, {
        construct(target, args) {
          const element = Reflect.construct(target, args);
          window.menuAudio.push(element);
          return element;
        },
      });
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('.start-scenery').evaluate(async (img) => {
      await img.decode();
    });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      artworkRequests.length,
      1,
      'Only the matching portrait or landscape is downloaded',
    );
    assert.ok(
      artworkRequests[0].includes('.webp'),
      'Menu art uses the compressed export',
    );
    assert.equal(
      await page.getByText('Un quartier tranquille. Pour l’instant.').count(),
      0,
    );
    await page.waitForFunction(() =>
      window.menuAudio.some(
        (el) => el.getAttribute('src') && el.readyState >= 3,
      ),
    );
    const beforeGesture = await page.evaluate(() => {
      const element = window.menuAudio.find((el) => el.getAttribute('src'));
      window.preloadedMenuAudio = element;
      element.addEventListener(
        'playing',
        () => {
          window.menuPlayingAt = performance.now();
        },
        { once: true },
      );
      return {
        preload: element.preload,
        paused: element.paused,
        time: element.currentTime,
      };
    });
    assert.deepEqual(
      beforeGesture,
      { preload: 'auto', paused: true, time: 0 },
      'The menu is buffered before interaction without bypassing autoplay',
    );
    await page.evaluate(() => {
      window.menuGestureAt = performance.now();
    });
    if (viewport.width < 900)
      await page.locator('.start-menu').tap({ position: { x: 5, y: 5 } });
    else await page.locator('.start-menu').click({ position: { x: 5, y: 5 } });
    await page.waitForFunction(
      () =>
        window.menuPlayingAt > 0 &&
        window.preloadedMenuAudio.currentTime > 0.03,
    );
    const playback = await page.evaluate(() => ({
      active: window.menuAudio.filter((el) => el.getAttribute('src')).length,
      delay: window.menuPlayingAt - window.menuGestureAt,
    }));
    assert.equal(
      playback.active,
      1,
      'The preloaded element is reused, without another music stream',
    );
    assert.ok(
      playback.delay < 1500,
      `Buffered music starts on the first gesture (${Math.round(playback.delay)} ms)`,
    );
    console.log(
      `${viewport.width}×${viewport.height}: buffered music started in ${Math.round(playback.delay)} ms`,
    );
    assert.equal(
      await page.locator('.world-canvas').count(),
      0,
      'The simulation is not mounted before playing',
    );
    assert.ok(
      await page
        .getByRole('button', { name: 'Jouer', exact: true })
        .isVisible(),
    );
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: innerWidth,
      play: document
        .querySelector('.start-play')
        .getBoundingClientRect()
        .toJSON(),
      links: document
        .querySelector('.start-links')
        .getBoundingClientRect()
        .toJSON(),
      height: innerHeight,
    }));
    assert.ok(layout.scrollWidth <= layout.width, 'No horizontal overflow');
    assert.ok(
      layout.play.x >= 0 && layout.play.right <= layout.width,
      'Play fits the viewport',
    );
    assert.ok(
      layout.links.bottom <= layout.height,
      'Secondary actions stay on screen',
    );
    await page.screenshot({
      path: join(output, `menu-${viewport.width}x${viewport.height}.png`),
    });

    await page.getByRole('button', { name: 'Bestiaire', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Au combat', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Chercher dans le bestiaire' })
      .fill('gobelin');
    assert.ok((await page.locator('.bestiary-creature').count()) > 0);
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page
        .getByRole('button', { name: 'Bestiaire', exact: true })
        .evaluate((button) => button === document.activeElement),
      true,
      'Dialog restores focus',
    );

    await page
      .getByRole('button', { name: 'Comment jouer', exact: true })
      .click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await page.getByRole('slider', { name: 'Musique' }).fill('40');
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('evil-city-audio-v1')),
    );
    assert.equal(saved.musicVolume, 0.4);
    await page.reload();
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    assert.equal(
      await page.getByRole('slider', { name: 'Musique' }).inputValue(),
      '40',
    );
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();

    if (viewport.width === 1600 || viewport.width === 390) {
      // Use a real key gesture on desktop and a touch gesture on mobile.
      const play = page.getByRole('button', { name: 'Jouer', exact: true });
      if (viewport.width === 1600) {
        await play.focus();
        await page.keyboard.press('Enter');
      } else await play.tap();
      await page
        .locator('.world-canvas[data-ready=true]')
        .waitFor({ timeout: 30000 });
      if (viewport.width === 1600) {
        await page
          .getByRole('button', {
            name: 'Retour au menu principal',
            exact: true,
          })
          .click();
      } else {
        await page
          .getByRole('button', { name: 'Fermer les détails', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
          .click();
        await page
          .getByRole('button', {
            name: 'Menu principal · Garder la partie',
            exact: true,
          })
          .click();
      }
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .waitFor();
      assert.equal(await page.locator('.game-shell').isVisible(), false);
      const frozen = await page.locator('.game-shell').textContent();
      // Global game hotkeys must not open hidden dialogs or mutate the paused session.
      await page.keyboard.press('h');
      await page.keyboard.press('1');
      await page.waitForTimeout(1400);
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(
        await page.locator('.game-shell').textContent(),
        frozen,
        'Returning to the menu freezes the session',
      );
      await page.getByRole('button', { name: 'Réglages', exact: true }).click();
      await page.getByRole('slider', { name: 'Musique' }).fill('15');
      await page.getByRole('button', { name: 'Fermer', exact: true }).click();
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .click();
      await page.locator('.world-canvas[data-ready=true]').waitFor();
      assert.ok(await page.locator('.game-shell').isVisible());
      await page.waitForTimeout(1200);
      assert.notEqual(
        await page.locator('.game-shell').textContent(),
        frozen,
        'The existing simulation resumes',
      );
      await page.screenshot({
        path: join(output, `game-resumed-${viewport.width}.png`),
      });
      await page
        .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
        .click();
      assert.equal(
        await page.locator('#music-volume').inputValue(),
        '15',
        'Menu settings reach the retained game',
      );
      await page
        .getByRole('button', {
          name: 'Menu principal · Garder la partie',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .waitFor();
    }
    await context.close();
    console.log(`Passed ${viewport.width}×${viewport.height}`);
  }
  const mutedContext = await browser.newContext();
  const mutedPage = await mutedContext.newPage();
  const mutedRequests = [];
  await mutedPage.addInitScript(() =>
    localStorage.setItem(
      'evil-city-audio-v1',
      JSON.stringify({ muted: true, volume: 0.35, musicVolume: 0.2 }),
    ),
  );
  mutedPage.on('request', (request) => {
    if (request.url().includes('/audio/')) mutedRequests.push(request.url());
  });
  await mutedPage.goto(base);
  await mutedPage.locator('.start-scenery').evaluate((img) => img.decode());
  assert.equal(
    mutedRequests.length,
    0,
    'A saved mute does not preload unwanted audio',
  );
  const enabledMusic = mutedPage.waitForResponse((response) =>
    response.url().includes('/audio/menu-music.mp3'),
  );
  await mutedPage
    .getByRole('button', { name: 'Activer le son', exact: true })
    .click();
  await enabledMusic;
  await mutedContext.close();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
