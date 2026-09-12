import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const [width, height] of [
    [1280, 800],
    [2560, 1440],
    [801, 650],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3000/');
    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const geometry = () =>
      page.evaluate(() => {
        const rect = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        const canvas = document.querySelector('.world-canvas');
        return {
          map: rect('.world-wrap'),
          footer: rect('.bottom-bar'),
          canvas: [canvas.width, canvas.height],
        };
      });
    const initial = await geometry();
    const stable = async () => {
      await page.waitForTimeout(100);
      assert.deepEqual(await geometry(), initial);
    };
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole('tab', { name: 'Recruter des créatures', exact: true })
        .click();
      await stable();
      if (i === 0) {
        await page
          .getByRole('button', { name: 'Recruter Gobelin', exact: true })
          .click();
        await stable();
        const progress = await page.locator('.recruit-progress').boundingBox();
        const panel = await page.getByRole('tabpanel').boundingBox();
        assert.ok(
          progress.y + progress.height <= panel.y + panel.height,
          'Production remains fully visible',
        );
      }
      await page
        .getByRole('tab', { name: 'Construire des bâtiments', exact: true })
        .click();
      await stable();
    }
    if (width === 1280) {
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .click();
      await page.waitForTimeout(7000);
      await page
        .getByRole('button', { name: 'Mettre en pause', exact: true })
        .click();
      await page
        .getByRole('tab', { name: 'Recruter des créatures', exact: true })
        .click();
      assert.equal(await page.locator('.recruit-progress').count(), 0);
      await stable();
    }
    console.log(
      `${width}x${height}: map, canvas and footer remain identical across tabs and production`,
    );
  }
} finally {
  await browser.close();
}
