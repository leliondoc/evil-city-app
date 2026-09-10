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
    await nav.getByRole('button', { name: 'Détails', exact: true }).tap();
    assert.equal(await page.locator('.sidebar').isVisible(), true);
    await page.getByRole('button', { name: 'Fermer les détails ×' }).tap();
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
    assert.deepEqual(errors, []);
    console.log(
      `Mobile ${viewport.width}x${viewport.height}: layout, panels, group selection, orders and pinch OK`,
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
