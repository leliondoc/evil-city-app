import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.spritePaints = new Map();
    const clear = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'clearRect').value;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.classList.contains('sprite-preview')) window.spritePaints.set(this.canvas, (window.spritePaints.get(this.canvas) || 0) + 1);
      return clear.apply(this, args);
    };
  });
  const requested = new Set();
  page.on('request', request => requested.add(request.url()));
  await page.goto('http://127.0.0.1:3000');
  await page.getByRole('button', { name: 'Bestiaire', exact: true }).click();
  await page.getByRole('region', { name: 'La Cour des Monstres', exact: true }).waitFor();
  assert.equal(await page.locator('.bestiary-creature').count(), 16);
  assert.equal(await page.locator('.start-animation-tabs, .animation-tabs').count(), 0);
  await page.waitForFunction(() => [...window.spritePaints.keys()].some(canvas => canvas.closest('.bestiary-creature')));
  assert.ok(![...requested].some(url => url.endsWith('/hero-monk-attack.png')), 'Offscreen combat sheets are not loaded at opening');
  await page.evaluate(() => window.spritePaints.clear());
  await page.waitForTimeout(650);
  const menuPaints = await page.evaluate(() => [...window.spritePaints].filter(([canvas]) => canvas.closest('.bestiary-creature')).map(([, n]) => n));
  assert.ok(menuPaints.length > 0 && menuPaints.length < 16);
  assert.ok(menuPaints.every(n => n <= 8), 'One shared clock caps combat previews at ten frames per second');
  await page.getByRole('img', { name: 'Moine de l’Aube', exact: true }).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...window.spritePaints].some(([canvas, count]) => canvas.getAttribute('aria-label') === 'Moine de l’Aube' && count > 0));
  assert.ok([...requested].some(url => url.endsWith('/hero-monk-attack.png')), 'Scrolling loads the original combat sheet');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.evaluate(() => window.spritePaints.clear());
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => [...window.spritePaints.keys()].filter(canvas => canvas.closest('.bestiary-creature')).length), 0, 'Closing releases all bestiary animation callbacks');
  console.log('Menu: combat previews only, deferred offscreen loading, bounded redraws and clean shutdown OK');
  await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.evaluate(() => {
    window.mapPaints = 0;
    const scene = window.manorRenderer.scene, render = scene.render.bind(scene);
    scene.render = () => { window.mapPaints++; render(); };
  });
  for (const label of ['Ouvrir le bestiaire', 'Comment jouer']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => { window.spritePaints.clear(); return window.mapPaints; });
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate(() => window.mapPaints), before, 'Map is not rendered behind modal');
    if (label === 'Ouvrir le bestiaire') {
      const counts = await page.evaluate(() => [...window.spritePaints].filter(([canvas]) => canvas.closest('.bestiary-creature')).map(([, n]) => n));
      assert.ok(counts.length > 0 && counts.length < 16, 'Only visible bestiary sprites animate');
      assert.ok(counts.every(n => n <= 8), 'Sprite rendering is capped at sheet frame rate');
      await page.locator('.combat-matchups').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: process.env.TEMP + '/evil-bestiary-polish.png' });
      const last = page.locator('.bestiary-creature').last();
      await last.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.spritePaints.clear());
      await page.waitForTimeout(250);
      assert.ok(await last.locator('.sprite-preview').evaluate(el => (window.spritePaints.get(el) || 0) > 0), 'Scrolled-in sprites resume');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => window.mapPaints) > before, 'Map resumes after closing');
  }
  console.log('PASS: bestiary and guide suspend map rendering; visible sprites run at 10 fps and resume on scroll.');
} finally { await browser.close(); }
