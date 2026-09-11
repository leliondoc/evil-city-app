import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = await mkdtemp(join(tmpdir(), 'evil-human-buildings-'));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const level of [1, 3, 6]) {
    await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
    await page.evaluate(async level => {
      const { advanceHumanBuildings } = await import('/app/game/humanBuildings.ts');
      window.manorState.economy.level = level;
      window.manorState.lots[5].owned = false;
      advanceHumanBuildings(window.manorState);
    }, level);
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
    const selectLot = async id => {
      await page.evaluate(id => window.manorRenderer.focusLot(id), id);
      await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
      const p = await page.evaluate(id => {
        const r = window.manorRenderer, c = r.canvas, b = c.getBoundingClientRect();
        for (const h of r.hits.filter(h => h.selection.type === 'lot' && h.selection.id === id)) {
          for (let y = h.y + 4; y < h.y + h.h - 4; y += 4)
            for (let x = h.x + 4; x < h.x + h.w - 4; x += 4) {
              const p = { x: r.origin.x + x * r.scale, y: r.origin.y + y * r.scale };
              const client = { x: b.left + p.x, y: b.top + p.y };
              if (document.elementFromPoint(client.x, client.y) !== c) continue;
              const hit = r.hit(p);
              if (hit?.type === 'lot' && hit.id === id) return client;
            }
        }
        throw Error(`Building ${id} has no selectable pixels`);
      }, id);
      await page.keyboard.down('Shift');
      await page.mouse.click(p.x, p.y);
      await page.keyboard.up('Shift');
    };
    for (const id of [0, 1, 5, 2]) {
      await selectLot(id);
      const panel = page.locator('.selection-panel');
      assert.match(await panel.innerText(), new RegExp(`niveau ${level}`));
      assert.equal(await panel.getByRole('button', { name: 'Envoyer l’armée', exact: true }).count(), 0);
      const models = await page.evaluate(id => window.manorRenderer.hits.filter(h => h.selection.type === 'lot' && h.selection.id === id).map(h => h.key), id);
      if (id === 2 && level === 6) assert.equal(models.filter(key => key === 'tower-blue').length, 2);
      if (id === 0 && level === 6) assert.ok(models.includes('human-citadel-yellow'));
      if (id === 1 && level === 3) assert.ok(models.includes('human-archery-blue'));
      if (id === 5 && level === 6) assert.ok(models.includes('human-barracks-blue'));
      await page.mouse.move(600, 100);
      await page.screenshot({ path: join(output, `level-${level}-lot-${id}.png`) });
    }
    console.log(`Human level ${level}: health, models and map selection OK`);
  }
  await page.getByRole('button', { name: 'Voir le manoir, niveau 1', exact: true }).click();
  const upgrade = page.getByRole('button', { name: 'Passer au niveau 2', exact: true });
  assert.equal(await upgrade.locator('.pack-skin').count(), 0);
  assert.equal(await upgrade.evaluate(el => getComputedStyle(el).borderTopWidth), '2px');
  await upgrade.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-nav').getByRole('button', { name: 'Détails', exact: true }).click();
  await page.screenshot({ path: join(output, 'mobile-buttons.png') });
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
