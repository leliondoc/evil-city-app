import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
  await page.evaluate(() => {
    window.cameraMoves = [];
    const r = window.manorRenderer, original = r.pan.bind(r);
    r.pan = (x, y) => { window.cameraMoves.push({ x, y }); original(x, y); };
  });
  await page.locator('.world-canvas').focus();
  await page.keyboard.down('d');
  await page.waitForTimeout(240);
  await page.keyboard.up('d');
  const moves = await page.evaluate(() => window.cameraMoves);
  assert.ok(moves.length >= 6, 'Held key moves each animation frame without OS repeat');
  assert.ok(moves.every(p => p.x < 0 && Math.abs(p.x) <= 30.1 && p.y === 0));
  const count = moves.length;
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.cameraMoves.length), count, 'Key release stops movement');
  await page.keyboard.down('q');
  await page.waitForTimeout(50);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const blurred = await page.evaluate(() => window.cameraMoves.length);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.cameraMoves.length), blurred, 'Blur clears held keys');
  await page.keyboard.up('q');
  const ids = await page.evaluate(() => {
    const s = window.manorState;
    const first = s.units[0];
    Object.assign(first, { x: 8, y: 25, path: [], task: 'idle', target: null });
    const second = { ...structuredClone(first), id: s.nextId++, x: 28, y: 28 };
    s.units.push(second);
    window.manorRenderer.focusLot(6);
    return [first.id, second.id];
  });
  await page.waitForTimeout(100);
  const point = await page.evaluate((id) => {
    const r = window.manorRenderer, c = r.canvas, b = c.getBoundingClientRect();
    for (const h of r.hits.filter(h => h.selection.type === 'unit' && h.selection.id === id))
      for (let y = h.y; y < h.y + h.h; y += 2)
        for (let x = h.x; x < h.x + h.w; x += 2) {
          const p = { x: r.origin.x + x * r.scale, y: r.origin.y + y * r.scale };
          const client = { x: b.left + p.x, y: b.top + p.y };
          if (document.elementFromPoint(client.x, client.y) !== c) continue;
          const hit = r.hit(p);
          if (hit?.type === 'unit' && hit.id === id) return client;
        }
    throw Error('Unit not visible');
  }, ids[0]);
  await page.mouse.dblclick(point.x, point.y, { delay: 80 });
  await page.waitForTimeout(80);
  assert.deepEqual(await page.evaluate(() => window.manorRenderer.selection), { type: 'units', ids });
  await page.waitForTimeout(400);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(400);
  await page.mouse.click(point.x, point.y);
  assert.deepEqual(await page.evaluate(() => window.manorRenderer.selection), { type: 'unit', id: ids[0] });
  await page.evaluate(() => {
    const s = window.manorState;
    s.lots[6].level = 3;
    Object.assign(s.lots[7], { kind: 'forge', owned: true, level: 1 });
  });
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
  await page.evaluate(() => window.manorRenderer.onSelect({ type: 'lot', id: 7 }));
  const benefit = page.locator('.upgrade-benefit');
  await benefit.waitFor();
  assert.match(await benefit.innerText(), /Dégâts de l’armée/);
  assert.equal(await benefit.evaluate(el => el.scrollWidth > el.clientWidth), false);
  const blocked = page.locator('.ability-status[data-blocked=true]').first();
  await blocked.scrollIntoViewIfNeeded();
  assert.equal(await blocked.evaluate(el => getComputedStyle(el).borderLeftWidth), '0px');
  assert.equal(await blocked.locator('.pack-icon').count(), 1);
  await benefit.scrollIntoViewIfNeeded();
  await page.screenshot({ path: process.env.TEMP + '/evil-benefit-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Voir les détails de la sélection', exact: true }).click();
  await benefit.scrollIntoViewIfNeeded();
  assert.equal(await benefit.evaluate(el => el.scrollWidth > el.clientWidth), false);
  await page.screenshot({ path: process.env.TEMP + '/evil-benefit-mobile.png' });
  console.log('PASS: rapid double-click selects all matching units including distant allies; slow clicks retain single selection.');
} finally { await browser.close(); }
