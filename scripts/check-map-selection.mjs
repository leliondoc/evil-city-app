import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const engine = process.env.CAMPAIGN_BROWSER || 'chromium';
const browser = await { chromium, webkit }[engine].launch({ headless: true });
const output = await mkdtemp(join(tmpdir(), `evil-city-map-${engine}-`));
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    if (
      process.env.CAMPAIGN_WIDTH &&
      viewport.width !== Number(process.env.CAMPAIGN_WIDTH)
    )
      continue;
    const context = await browser.newContext({
      viewport,
      hasTouch: viewport.width !== 1440,
      isMobile: viewport.width !== 1440,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const press = (locator) =>
      viewport.width === 1440 ? locator.click() : locator.tap();
    await page.goto(base);
    assert.equal(
      await page.locator('.campaign-atlas').count(),
      0,
      'The map appears after the title menu',
    );
    await press(page.getByRole('button', { name: 'Jouer', exact: true }));
    assert.equal(
      await page.locator('.world-canvas').count(),
      0,
      'Choosing a map does not start the simulation',
    );
    assert.equal(await page.locator('.atlas-node').count(), 3);
    assert.equal(
      await page.locator('.atlas-node:disabled').count(),
      0,
      'Every chapter is accessible on a fresh profile',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    for (const node of await page.locator('.atlas-node').all()) {
      assert.equal(
        await node.evaluate((el) => {
          const r = el.getBoundingClientRect(),
            map = el.parentElement.getBoundingClientRect();
          return (
            r.width >= 44 &&
            r.height >= 44 &&
            r.left >= map.left &&
            r.right <= map.right &&
            r.top >= map.top &&
            r.bottom <= map.bottom
          );
        }),
        true,
        'Each destination fits inside the illustrated map',
      );
    }
    await press(page.getByRole('button', { name: /^Les Tilleuls/ }));
    assert.equal(
      await page.locator('.campaign-brief h2').innerText(),
      'Les Tilleuls',
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.querySelectorAll('.atlas-landmark img')].map((img) =>
          img.decode(),
        ),
      );
    });
    await page.screenshot({
      path: join(output, `map-${viewport.width}.png`),
      fullPage: true,
    });
    await press(
      page.getByRole('button', {
        name: 'Entrer dans le quartier',
        exact: true,
      }),
    );
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page
      .locator('.current-objective[data-objective=manor3]')
      .waitFor({ state: 'attached' });
    const returnToMenu = async () => {
      await press(
        page.getByRole('button', {
          name: 'Ouvrir les paramètres',
          exact: true,
        }),
      );
      await press(
        page.getByRole('button', {
          name: 'Menu principal · Garder la partie',
          exact: true,
        }),
      );
    };
    await returnToMenu();
    await press(
      page.getByRole('button', { name: 'Carte des quartiers', exact: true }),
    );
    await press(
      page.getByRole('button', { name: 'Retour au menu', exact: true }),
    );
    await press(page.getByRole('button', { name: 'Reprendre', exact: true }));
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    assert.equal(
      await page.locator('.current-objective[data-objective=manor3]').count(),
      1,
      'Backing out of the map keeps the current game',
    );
    await returnToMenu();
    await press(
      page.getByRole('button', { name: 'Carte des quartiers', exact: true }),
    );
    await press(page.getByRole('button', { name: /^Le Faubourg/ }));
    await press(
      page.getByRole('button', {
        name: 'Entrer dans le quartier',
        exact: true,
      }),
    );
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page
      .locator('.current-objective[data-objective=capture]')
      .waitFor({ state: 'attached' });
    assert.equal(
      await page.locator('.world-canvas').count(),
      1,
      'Replacing a game disposes its old renderer',
    );
    assert.deepEqual(errors, []);
    console.log(
      `${engine} ${viewport.width}×${viewport.height}: direct Tilleuls, all maps active, map layout, resume and new chapter OK`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Screenshots: ${output}`);
