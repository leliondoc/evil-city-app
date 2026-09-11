import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [width, height] of [
    [1280, 800],
    [2560, 1440],
    [900, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3000/tests/domain-preview.html');
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const canvas = await page.locator('.world-canvas').boundingBox();
    assert.deepEqual(canvas, { x: 0, y: 0, width, height });
    for (const selector of ['.bottom-bar', '.mission-sidebar'])
      assert.equal(
        await page
          .locator(selector)
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgba(0, 0, 0, 0)',
      );
    // Empty HUD space must let the pointer reach the live canvas underneath.
    const gap = { x: width - 10, y: height - 8 };
    assert.equal(
      await page.evaluate(
        (p) => document.elementFromPoint(p.x, p.y)?.className,
        gap,
      ),
      'world-canvas',
    );
    await page.locator('.army-face').first().click();
    assert.match(await page.locator('.selection-name').innerText(), /3 unités/);
    await page.mouse.click(gap.x, gap.y);
    assert.equal(
      await page.locator('.selection-name').innerText(),
      'Aucune sélection',
    );
    const center = await page.locator('.world-wrap').boundingBox();
    const a = {
      x: center.x + center.width * 0.6,
      y: center.y + center.height * 0.7,
    };
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 35, a.y + 20, { steps: 6 });
    await page.mouse.up();
    await page
      .getByRole('button', { name: 'Recentrer le quartier', exact: true })
      .click();
    const point = await page.evaluate(() => {
      const r = document.querySelector('.world-canvas').getBoundingClientRect(),
        scale = Math.max(0.1, Math.min(r.width / 1120, r.height / 1174));
      return {
        x: Math.round(r.x + (r.width - 1024 * scale) / 2) + 512 * scale,
        y: Math.round(r.y + (r.height - 1024 * scale) / 2) + 512 * scale,
      };
    });
    await page.mouse.click(point.x, point.y);
    assert.match(await page.locator('.selection-name').innerText(), /Cantine/);
    console.log(
      `${width}x${height}: live backdrop, transparent gaps, pan/recenter and exact map selection OK`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
