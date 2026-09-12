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
      const canvas = document.querySelector('.world-canvas');
      const r = canvas.getBoundingClientRect(),
        scale = Math.max(0.1, Math.min(r.width / 1120, r.height / 1174));
      const center = {
        x: Math.round(r.x + (r.width - 1024 * scale) / 2) + 512 * scale,
        y: Math.round(r.y + (r.height - 1024 * scale) / 2) + 512 * scale,
      };
      // The floating selection card may cover the parcel center on narrow screens.
      // Pick an exposed part of the same central parcel through the real canvas.
      for (const [dx, dy] of [
        [0, 0],
        [64, 0],
        [-64, 0],
        [0, 64],
        [0, -64],
      ]) {
        const point = { x: center.x + dx * scale, y: center.y + dy * scale };
        if (document.elementFromPoint(point.x, point.y) === canvas)
          return point;
      }
      throw Error('The central parcel has no visible canvas target');
    });
    await page.mouse.click(point.x, point.y);
    assert.match(await page.locator('.selection-name').innerText(), /Cantine/);
    for (const name of [
      'Recruter des créatures',
      'Construire des bâtiments',
      'Recruter des créatures',
    ]) {
      await page.getByRole('tab', { name, exact: true }).click();
      const frame = await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() =>
              resolve(
                [...document.querySelectorAll('.creation-tab')].map((el) => ({
                  selected: el.getAttribute('aria-selected') === 'true',
                  outline: getComputedStyle(el).outlineStyle,
                  width: getComputedStyle(el).outlineWidth,
                  color: getComputedStyle(el).outlineColor,
                })),
              ),
            );
          }),
      );
      assert.equal(frame.filter((tab) => tab.selected).length, 1);
      const selected = frame.find((tab) => tab.selected);
      assert.equal(
        selected.outline,
        'solid',
        'Selection is visible on the first frame after a click',
      );
      // Desktop UI zoom rounds the computed outline width to device pixels.
      assert.ok(parseFloat(selected.width) >= 2);
      assert.equal(selected.color, 'rgb(255, 228, 161)');
      await page
        .getByRole('button', { name: 'Recentrer le quartier', exact: true })
        .click();
      assert.equal(
        await page
          .getByRole('tab', { name, exact: true })
          .evaluate((el) => getComputedStyle(el).outlineWidth),
        selected.width,
        'The selected tab keeps its frame when focus leaves it',
      );
    }
    console.log(
      `${width}x${height}: live backdrop, transparent gaps, pan/recenter and exact map selection OK`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
