import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const output = await mkdtemp(join(tmpdir(), 'evil-display-'));
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [width, height, scale] of [
    [1280, 800, 1],
    [1920, 1080, 1.2],
    [2560, 1440, 1.6],
    [2560, 1080, 1.2],
    [3840, 2160, 2],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3000/tests/domain-preview.html');
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const metrics = await page.evaluate(() => {
      const style = (el) => getComputedStyle(document.querySelector(el));
      const box = (el) => {
        const r = document.querySelector(el).getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        };
      };
      return {
        scale: Number(style('html').getPropertyValue('--game-ui-scale')),
        sidebar: box('.sidebar'),
        map: box('.world-canvas'),
        header: box('.topbar'),
        footer: box('.bottom-bar'),
        questFont:
          Number.parseFloat(style('.mission-card .quest').fontSize) *
          Number(style('.mission-sidebar').zoom),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(metrics.scale, scale);
    assert.equal(metrics.overflow, false);
    assert.ok(
      Math.abs(metrics.header.height - 76 * scale) < 2,
      JSON.stringify(metrics),
    );
    assert.ok(
      // Separate mission and selection columns still leave most of the screen for play.
      metrics.map.width > width * 0.6 && metrics.map.height > height * 0.6,
      JSON.stringify(metrics),
    );
    assert.ok(Math.abs(metrics.questFont - 13 * scale) < 0.1);
    // Map hit testing remains in native pixels after the surrounding panels grow.
    const point = await page.evaluate(() => {
      const r = document.querySelector('.world-wrap').getBoundingClientRect(),
        scale = Math.max(0.1, Math.min(r.width / 1120, r.height / 1174));
      return {
        x: r.x + Math.round((r.width - 1024 * scale) / 2) + 16 * 32 * scale,
        y:
          r.y +
          Math.round((r.height - 1024 * scale) / 2 + 14) +
          16 * 32 * scale,
      };
    });
    await page.mouse.click(point.x, point.y);
    assert.match(await page.locator('.selection-name').innerText(), /Cantine/);
    const mapFont = await page.evaluate(async () => {
      const { PixiScene } = await import('/app/game/pixiScene.ts');
      const render = PixiScene.prototype.render;
      let size = 0;
      PixiScene.prototype.render = function () {
        const label = this.actors.container.children.find(
          (node) => node.visible && node.text === 'Cantine des hordes',
        );
        if (label) size = label.style.fontSize * this.world.scale.x;
        return render.call(this);
      };
      try {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      } finally {
        PixiScene.prototype.render = render;
      }
      return size;
    });
    assert.ok(
      Math.abs(mapFont - 18 * scale) < 0.1,
      `Map text scales with the interface: ${mapFont}`,
    );
    await page.screenshot({ path: join(output, `${width}x${height}.png`) });
    await page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    // Wait for the existing opening animation before measuring the physical center.
    await page.waitForTimeout(180);
    const d = await dialog.boundingBox();
    assert.ok(Math.abs(d.x + d.width / 2 - width / 2) < 3, JSON.stringify(d));
    assert.ok(d.y >= 0 && d.y + d.height <= height + 1, JSON.stringify(d));
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.locator('.district-shortcut').first().click();
    const popup = page.locator('.district-popover');
    await popup.waitFor({ state: 'visible' });
    await page.waitForTimeout(180);
    const b = await popup.boundingBox();
    assert.ok(
      b.x >= 0 &&
        b.x + b.width <= width + 1 &&
        b.y >= 0 &&
        b.y + b.height <= height + 1,
      JSON.stringify(b),
    );
    await page
      .getByRole('button', { name: 'Fermer les détails du quartier' })
      .click();
    console.log(
      `${width}x${height}: scale ${scale}, quest text ${metrics.questFont.toFixed(1)}px, map selection, dialogs and popovers OK`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement).getPropertyValue(
        '--game-ui-scale',
      ) === '1.000',
  );
  assert.match(await page.locator('.selection-name').innerText(), /Cantine/);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
console.log(`Screenshots: ${output}`);
