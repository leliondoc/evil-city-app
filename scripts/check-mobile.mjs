// Run with Playwright installed, or PLAYWRIGHT_PACKAGE pointing to its bundled package.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const output = await mkdtemp(join(tmpdir(), 'evil-city-mobile-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1180, height: 820 },
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (viewport.width === 320 || viewport.width === 768) {
      await page.goto('http://127.0.0.1:3000/');
      await page.locator('.loading-art').waitFor({ state: 'hidden' });
      await page
        .getByRole('button', { name: 'Mettre en pause', exact: true })
        .tap();
      assert.match(await page.locator('.goblin-counter').innerText(), /0\/6/);
      await page
        .getByRole('navigation', { name: 'Navigation du jeu' })
        .getByRole('button', { name: 'Détails', exact: true })
        .tap();
      await page
        .getByRole('button', {
          name: 'Recruter mon premier gobelin',
          exact: true,
        })
        .tap();
      assert.ok(
        await page
          .getByRole('button', {
            name: 'Premier gobelin en préparation…',
            exact: true,
          })
          .isDisabled(),
      );
      await page
        .getByRole('button', { name: 'Fermer les détails', exact: true })
        .tap();
      await page.getByRole('button', { name: 'Reprendre', exact: true }).tap();
      await page.waitForFunction(
        () =>
          document.querySelector('.goblin-counter').textContent.includes('1/6'),
        null,
        { timeout: 12000 },
      );
    }
    await page.goto('http://127.0.0.1:3000/tests/domain-preview.html');
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    assert.equal(
      await page.locator('main').getAttribute('data-compact'),
      'true',
    );
    assert.equal(await page.locator('.sidebar').isVisible(), false);
    assert.equal(await page.locator('.bottom-bar').isVisible(), false);
    assert.equal(await page.locator('.resource.mana').isVisible(), true);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const canvas = await page.locator('canvas.world-canvas').boundingBox();
    assert.ok(canvas.width >= viewport.width * 0.95);
    assert.ok(canvas.height >= viewport.height * 0.5);
    const nav = page.getByRole('navigation', { name: 'Navigation du jeu' });
    for (const button of await nav.getByRole('button').all()) {
      const box = await button.boundingBox();
      assert.ok(
        box.width >= 44 && box.height >= 44,
        'Navigation targets fit a finger',
      );
      assert.equal(
        await button.locator('.pack-button').count(),
        2,
        'Original pack button skins',
      );
    }
    await nav.getByRole('button', { name: 'Détails', exact: true }).tap();
    assert.equal(await page.locator('.sidebar').isVisible(), true);
    await page.getByRole('button', { name: 'Fermer les détails' }).tap();
    await nav.getByRole('button', { name: 'Recruter', exact: true }).tap();
    assert.equal(
      await page
        .getByRole('button', { name: 'Recruter Spectre', exact: true })
        .isVisible(),
      true,
    );
    await page.screenshot({
      path: join(output, `${viewport.width}-recruit.png`),
    });
    await nav.getByRole('button', { name: 'Carte', exact: true }).tap();
    await page.getByRole('button', { name: 'Groupe', exact: true }).tap();
    const cdp = await context.newCDPSession(page);
    const start = { x: canvas.x + 2, y: canvas.y + 2, id: 1 };
    const end = {
      x: canvas.x + canvas.width - 2,
      y: canvas.y + canvas.height - 110,
      id: 1,
    };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [end],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    const order = page.getByRole('button', { name: 'Ordre', exact: true });
    assert.equal(
      await order.isEnabled(),
      true,
      'A touch rectangle selects the army',
    );
    await order.tap();
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll('.touch-toolbar button')[2]
          .getAttribute('aria-pressed') === 'true',
      null,
      { timeout: 3000 },
    );
    await page.touchscreen.tap(
      canvas.x + canvas.width / 2,
      canvas.y + canvas.height / 2,
    );
    try {
      await page.waitForFunction(
        () =>
          document
            .querySelector('.touch-toolbar button')
            .getAttribute('aria-pressed') === 'true',
        null,
        { timeout: 3000 },
      );
    } catch (error) {
      await page.screenshot({
        path: join(output, `${viewport.width}-order-error.png`),
      });
      console.log(
        output,
        await page.locator('.touch-toolbar').innerText(),
        await page.locator('.toast-message').allTextContents(),
        await page.locator('.touch-selection').innerText(),
      );
      throw error;
    }
    const selected = await page.locator('.touch-selection').textContent();
    const center = {
      x: canvas.x + canvas.width / 2,
      y: canvas.y + canvas.height / 2,
    };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...center, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: center.x + 25, y: center.y + 20, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    assert.equal(
      await page.locator('.touch-selection').textContent(),
      selected,
      'Dragging the map preserves the selection',
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: center.x - 30, y: center.y, id: 1 },
        { x: center.x + 30, y: center.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: center.x - 70, y: center.y, id: 1 },
        { x: center.x + 70, y: center.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    assert.equal(
      await page.locator('.touch-selection').textContent(),
      selected,
      'Pinching does not select or issue an order',
    );
    await page.screenshot({ path: join(output, `${viewport.width}-map.png`) });
    await nav.getByRole('button', { name: 'Détails', exact: true }).tap();
    assert.equal(
      await page.locator('.sidebar').isVisible(),
      true,
      'The panel opens after a two-finger gesture',
    );
    await nav.getByRole('button', { name: 'Recruter', exact: true }).tap();
    await page
      .getByRole('button', { name: 'Recruter Gobelin', exact: true })
      .tap();
    assert.ok(
      await page.getByRole('progressbar').count(),
      'Recruitment progress is visible',
    );
    await page.waitForFunction(async () => {
      const { state } = await import('/tests/domain-preview.tsx');
      return state.units.filter((u) => u.kind === 'goblin').length === 4;
    });
    await nav.getByRole('button', { name: 'Carte', exact: true }).tap();
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .tap();
    await page.evaluate(async () => {
      const { state } = await import('/tests/domain-preview.tsx');
      state.lots[4].kind = 'empty';
      // Reserve a clear parcel for a real touch placement, not a scripted build order.
    });
    await page
      .getByRole('button', { name: 'Recentrer le quartier', exact: true })
      .tap();
    await nav.getByRole('button', { name: 'Bâtir', exact: true }).tap();
    await page.getByRole('button', { name: /^Tanière gobeline/ }).tap();
    assert.equal(await page.locator('.bottom-bar').isVisible(), false);
    assert.match(await page.locator('.touch-hint').innerText(), /parcelle/);
    const placement = await page.evaluate(async () => {
      const { state } = await import('/tests/domain-preview.tsx');
      const rect = document
        .querySelector('.world-canvas')
        .getBoundingClientRect();
      const scale = Math.max(
        0.1,
        Math.min(rect.width / 1120, rect.height / 1174),
      );
      const lot = state.lots[4];
      return {
        x:
          rect.x +
          Math.round((rect.width - 1024 * scale) / 2) +
          (lot.x + 4) * 32 * scale,
        y:
          rect.y +
          Math.round((rect.height - 1024 * scale) / 2 + 14) +
          (lot.y + 4) * 32 * scale,
      };
    });
    await page.touchscreen.tap(placement.x, placement.y);
    assert.equal(
      await page.evaluate(
        async () =>
          (await import('/tests/domain-preview.tsx')).state.lots[4].construction
            ?.kind,
      ),
      'den',
    );
    for (const label of ['Or', 'Bois', 'Vivres']) {
      await page.evaluate(async () => {
        const { state } = await import('/tests/domain-preview.tsx');
        const free = state.units.findLast((u) => u.kind === 'goblin');
        Object.assign(free, {
          task: 'idle',
          target: null,
          path: [],
          gathering: undefined,
        });
      });
      await page
        .getByRole('button', {
          name: new RegExp(`^${label} : .*Voir la source`),
        })
        .tap();
      const gather = page.getByRole('button', {
        name: 'Envoyer un gobelin récolter',
      });
      await gather.scrollIntoViewIfNeeded();
      assert.ok(
        await gather.isVisible(),
        `${label}: gathering action reachable by touch`,
      );
      await gather.tap();
      const kind = { Or: 'gold', Bois: 'wood', Vivres: 'food' }[label];
      assert.ok(
        await page.evaluate(async (kind) => {
          const { state } = await import('/tests/domain-preview.tsx');
          return state.units.some(
            (u) =>
              u.task === 'forage' &&
              u.gathering?.kind === kind &&
              u.gathering.automatic === false,
          );
        }, kind),
        `${label}: tap actually assigns a gathering route`,
      );
    }
    await nav.getByRole('button', { name: 'Carte', exact: true }).tap();
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    });
    await nav.getByRole('button', { name: 'Détails', exact: true }).tap();
    assert.ok(
      await page.locator('.sidebar').isVisible(),
      'Details remain reachable after rotation',
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: join(output, `${viewport.width}-rotated-details.png`),
    });
    await page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .tap();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '×2', exact: true }).tap();
    assert.equal(
      await dialog
        .getByRole('button', { name: '×2', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).tap();
    await dialog.waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log(
      `Touch ${viewport.width}x${viewport.height}: layout, pack UI, gestures, recruitment, construction, gathering and rotation OK`,
    );
    await context.close();
  }
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktop.newPage();
  await page.goto('http://127.0.0.1:3000/');
  await page.locator('.loading-art').waitFor({ state: 'hidden' });
  assert.equal(
    await page.locator('main').getAttribute('data-compact'),
    'false',
  );
  assert.equal(await page.locator('.sidebar').isVisible(), true);
  assert.equal(await page.locator('.bottom-bar').isVisible(), true);
  assert.equal(await page.locator('.mobile-nav').count(), 0);
  console.log('Desktop 1280x800: original sidebar and recruitment bar OK');
  await desktop.close();
} finally {
  await browser.close();
}
console.log(`Screenshots: ${output}`);
