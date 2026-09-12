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
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('.start-scenery').evaluate(async (img) => {
      await img.decode();
    });
    await page.evaluate(() => document.fonts.ready);
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
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
