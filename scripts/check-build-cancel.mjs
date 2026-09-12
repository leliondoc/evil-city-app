import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
const output = await mkdtemp(join(tmpdir(), 'evil-city-build-cancel-'));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:3000'}/tests/pack-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
  await page.evaluate(() => Object.assign(window.packState.lots[5], { kind: 'empty', construction: null }));
  const pointFor = async (valid) => page.evaluate(valid => {
    const r = window.packRenderer, canvas = r.canvas, box = canvas.getBoundingClientRect();
    for (let y = 25; y < box.height - 25; y += 8)
      for (let x = 25; x < box.width - 25; x += 8) {
        if (document.elementFromPoint(box.left + x, box.top + y) !== canvas) continue;
        const hit = r.hit({ x, y });
        if (valid ? hit?.type === 'lot' && hit.id === 5 : hit?.type !== 'lot')
          return { x: box.left + x, y: box.top + y };
      }
    throw Error('No visible placement point');
  }, valid);
  const snapshot = () => page.evaluate(() => ({
    selection: window.packRenderer.selection,
    resources: window.packState.resources,
    units: window.packState.units.map(({ id, task, target, path }) => ({ id, task, target, path })),
    lots: window.packState.lots.map(({ id, kind, construction, upgrading }) => ({ id, kind, construction, upgrading })),
  }));
  const buildButton = page.getByRole('button', { name: 'Grotte gobeline', exact: true });
  const cancelPlacement = async (valid) => {
    await buildButton.click();
    const point = await pointFor(valid);
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(cursor => document.querySelector('.world-canvas').dataset.cursor === cursor, valid ? 'hammer' : 'forbidden');
    const before = await snapshot();
    await page.mouse.click(point.x, point.y, { button: 'right' });
    await page.waitForFunction(() => window.packRenderer.buildKind === null &&
      !['hammer', 'forbidden'].includes(document.querySelector('.world-canvas').dataset.cursor));
    assert.equal(await buildButton.getAttribute('aria-pressed'), 'false');
    assert.deepEqual(await snapshot(), before, 'Cancel must preserve selection, resources, construction and unit orders');
    assert.doesNotMatch(await page.locator('body').innerText(), /Sélectionnez une créature pour donner un ordre/);
    return point;
  };
  await cancelPlacement(false);
  await page.getByRole('button', { name: 'Gobelin lancier : sélectionner toutes les unités (1)', exact: true }).click();
  await cancelPlacement(false);
  const validPoint = await cancelPlacement(true);
  await page.mouse.click(validPoint.x, validPoint.y);
  assert.equal(await page.evaluate(() => window.packState.lots[5].kind), 'empty', 'A click after cancel must not start a stale build');

  // The next placement remains usable after cancellation.
  await buildButton.click();
  const point = await pointFor(true);
  // A nearby worker must not intercept a placement tap/click on its parcel.
  await page.evaluate((point) => {
    const renderer = window.packRenderer;
    const box = renderer.canvas.getBoundingClientRect();
    const world = renderer.toWorld({ x: point.x - box.left, y: point.y - box.top });
    const worker = window.packState.units.find((unit) => unit.kind === 'goblin');
    Object.assign(worker, { x: world.x, y: world.y + 20 / 32, path: [] });
  }, point);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.packState.lots[5].construction !== null);
  await page.screenshot({ path: join(output, 'placement-after-cancel.png') });
  assert.deepEqual(errors, []);
  console.log(`Right-click cancellation verified on forbidden and valid ground, with and without selected units. Selection/resources/orders preserved; subsequent construction works. Screenshots: ${output}`);
} finally {
  await browser.close();
}
