import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch(
    engine === chromium
      ? { channel: 'chrome', headless: true }
      : { headless: true },
  );
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
      { width: 1180, height: 820 },
    ]) {
      const page = await browser.newPage({
        viewport,
        hasTouch: viewport.width < 1400,
      });
      page.setDefaultTimeout(15000);
      await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
      await page.locator('.world-canvas[data-ready=true]').waitFor();
      const frame = () =>
        page.evaluate(async () => {
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        });
      await frame();
      const hitPoint = async (type, id) =>
        page.evaluate(
          ({ type, id }) => {
            const r = window.manorRenderer,
              c = r.canvas,
              b = c.getBoundingClientRect();
            const candidates = r.hits.filter(
              (h) => h.selection.type === type && h.selection.id === id,
            );
            for (const h of candidates)
              for (let y = h.y + 3; y < h.y + h.h - 3; y += 3)
                for (let x = h.x + 3; x < h.x + h.w - 3; x += 3) {
                  const local = {
                      x: r.origin.x + x * r.scale,
                      y: r.origin.y + y * r.scale,
                    },
                    client = { x: b.left + local.x, y: b.top + local.y };
                  if (document.elementFromPoint(client.x, client.y) !== c)
                    continue;
                  if (
                    [
                      [0, 0],
                      [-2, 0],
                      [2, 0],
                      [0, -2],
                      [0, 2],
                    ].every(([dx, dy]) => {
                      const s = r.hit({ x: local.x + dx, y: local.y + dy });
                      return s?.type === type && s.id === id;
                    })
                  )
                    return client;
                }
            throw Error(`No visible hit point ${type} ${id}`);
          },
          { type, id },
        );
      const clickSelection = async (type, id) => {
        if (type === 'lot') {
          await page.evaluate((id) => window.manorRenderer.focusLot(id), id);
          await frame();
        }
        const p = await hitPoint(type, id);
        await page.mouse.click(p.x, p.y);
        await frame();
      };

      await page.evaluate(() => {
        window.manorState.lots[3].kind = 'hall';
        window.manorState.lots[3].owned = false;
      });
      await clickSelection('lot', 3);
      const bubble = page.getByRole('region', {
        name: 'Capacités de la sélection',
      });
      await bubble.waitFor({ state: 'visible' });
      const box = await bubble.boundingBox();
      assert.ok(box.width <= 262 && box.height <= 362);
      const anchor = await page.evaluate(() =>
        window.manorRenderer.abilityAnchor({ type: 'lot', id: 3 }),
      );
      if (anchor.right + 12 + box.width <= viewport.width - 12)
        assert.ok(
          box.x >= anchor.right + 10,
          'Bubble opens right of visible building',
        );
      assert.ok(
        box.x >= 0 && box.y >= 48 && box.x + box.width <= viewport.width,
      );
      assert.equal(await bubble.locator('.ability-card').count(), 1);
      await bubble
        .getByRole('button', { name: 'Pot-de-vin', exact: true })
        .click();
      assert.equal(
        await bubble
          .getByRole('heading', { name: 'Pot-de-vin', exact: true })
          .count(),
        1,
      );
      await page.screenshot({
        path: join(
          tmpdir(),
          'evil-ability-' + engine.name() + '-' + viewport.width + '.png',
        ),
      });
      await bubble
        .getByRole('button', { name: 'Fermer les capacités' })
        .click();
      assert.equal(await bubble.count(), 0);
      await page.evaluate(() => {
        window.manorState.lots[3].kind = 'den';
        window.manorState.lots[3].owned = true;
      });
      if (viewport.width < 1400)
        await page
          .getByRole('navigation', { name: 'Navigation du jeu' })
          .getByRole('button', { name: 'Recruter', exact: true })
          .click();
      else await page.getByRole('tab', { name: /Recruter/ }).click();
      const recruit = page
        .getByRole('button', { name: /^Recruter Gobelin[. ]/ })
        .first();
      await recruit.click();
      assert.ok(
        (await page.locator('.creation-spark').count()) > 0,
        'Accepted recruitment emits interface particles',
      );
      await page.waitForFunction(
        () => !document.querySelector('.creation-spark'),
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await recruit.click();
      assert.equal(
        await page.locator('.creation-spark').count(),
        0,
        'Reduced motion suppresses particles',
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const option = recruit.locator('..');
      const progress = option.locator('.recruit-progress');
      await progress.waitFor();
      await recruit.evaluate(
        async (e) =>
          await Promise.all(
            e.getAnimations({ subtree: true }).map((a) => a.finished),
          ),
      );
      const costs = await option.locator('.card-cost').boundingBox(),
        bar = await progress.boundingBox();
      assert.ok(
        costs.y + costs.height <= bar.y + 1,
        'Costs remain above the production progress',
      );
      assert.equal(
        await progress.evaluate((e) => getComputedStyle(e).backgroundColor),
        'rgba(0, 0, 0, 0)',
      );
      await page.screenshot({
        path: join(
          tmpdir(),
          'evil-recruit-feedback-' +
            engine.name() +
            '-' +
            viewport.width +
            '.png',
        ),
      });
      console.log(
        engine.name(),
        viewport,
        'compact abilities, switching, closing and readable production costs OK',
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
