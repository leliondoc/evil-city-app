import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.spritePaints = new Map();
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.classList.contains('sprite-preview')) window.spritePaints.set(this.canvas, (window.spritePaints.get(this.canvas) || 0) + 1);
      return clear.apply(this, args);
    };
  });
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
