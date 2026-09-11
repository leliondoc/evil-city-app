import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = await mkdtemp(join(tmpdir(), 'evil-camera-selection-'));
try {
  for (const [width, height] of [[1440, 900], [1920, 1080], [900, 700]]) {
    // New context for each first visit: no cookies, storage or cached assets.
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const open = async () => {
      await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
      await page.locator('.world-canvas[data-ready=true]').waitFor();
      await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
      await page.evaluate(() => new Promise(requestAnimationFrame));
    };
    const snapshot = () => page.evaluate(() => {
      const r = window.manorRenderer;
      return { zoom: r.zoom, scale: r.scale, origin: r.origin, viewport: r.viewport };
    });
    await open();
    const initial = await snapshot();
    assert.equal(initial.zoom, 1.15);
    await page.screenshot({ path: join(output, `initial-${width}.png`) });
    // Simulate an arbitrary previous camera position before using the real button.
    await page.evaluate(() => { window.manorRenderer.pan(-240, 130); window.manorRenderer.zoomBy(1.8); });
    const manor = page.getByRole('button', { name: 'Voir le manoir, niveau 1', exact: true });
    await manor.click();
    const title = page.locator('.selection-name');
    assert.equal(await title.innerText(), 'Manoir du mal');
    const font = await title.evaluate(el => ({ font: getComputedStyle(el).font, color: getComputedStyle(el).color }));
    const checkFocus = async () => {
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const result = await page.evaluate(() => {
        const r = window.manorRenderer;
        const hit = r.hits.find(h => h.key === 'hq-purple' && h.selection.type === 'lot');
        const b = r.visibleBounds(hit);
        const point = { x: r.origin.x + (b.x + b.width / 2) * r.scale, y: r.origin.y + (b.y + b.height / 2) * r.scale };
        return { dx: point.x - r.viewport.x - r.viewport.width / 2, dy: point.y - r.viewport.y - r.viewport.height / 2, hit: r.hit(point) };
      });
      assert.ok(Math.abs(result.dx) <= 1 && Math.abs(result.dy) <= 1, JSON.stringify(result));
      assert.deepEqual(result.hit, { type: 'lot', id: 6 });
    };
    await checkFocus();
    await manor.click();
    await checkFocus();
    await page.screenshot({ path: join(output, `manor-${width}.png`) });
    assert.doesNotMatch(await page.locator('.selection-panel').innerText(), /Actuellement|Bâtiments améliorables/);
    // Same title styling for the tower selection reached by the renderer callback.
    await page.evaluate(() => window.manorRenderer.onSelect({ type: 'tower', id: 0 }));
    const tower = page.getByRole('region', { name: 'Détails de la tour' });
    assert.equal(await tower.locator('.eyebrow').count(), 0);
    assert.equal(await tower.locator('.selection-name').innerText(), 'Tour du pont');
    assert.deepEqual(await tower.locator('.selection-name').evaluate(el => ({ font: getComputedStyle(el).font, color: getComputedStyle(el).color })), font);
    await page.screenshot({ path: join(output, `tower-${width}.png`) });
    await page.getByRole('button', { name: 'Recentrer le quartier', exact: true }).click();
    assert.deepEqual(await snapshot(), initial);
    await open();
    assert.deepEqual(await snapshot(), initial);
    assert.deepEqual(errors, []);
    console.log(`${width}x${height}: fresh/reload/reset framing, repeated manor focus, tower title OK`);
    await page.close();
  }
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
