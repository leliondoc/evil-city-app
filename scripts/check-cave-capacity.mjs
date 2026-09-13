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
        Object.assign(window.manorState.lots[7], {
          kind: 'den',
          level: 1,
          owned: true,
          construction: null,
        });
      });
      await clickSelection('lot', 7);
      await page.waitForFunction(() =>
        document.querySelector('.goblin-counter')?.textContent.includes('/8'),
      );
      const opening = page.getByRole('button', {
        name: 'Démolir ce bâtiment…',
        exact: true,
      });
      await opening.click();
      const panel = page.locator('.demolish-building');
      assert.match(await panel.innerText(), /Bâtisseurs maximum : 8 → 6/);
      const confirm = page.getByRole('button', {
        name: 'Confirmer la démolition',
        exact: true,
      });
      await confirm.scrollIntoViewIfNeeded();
      const button = await confirm.boundingBox(),
        scroll = await page.locator('.selection-scroll').boundingBox();
      assert.ok(button.height >= 44);
      assert.ok(
        button.x >= scroll.x &&
          button.x + button.width <= scroll.x + scroll.width + 1,
      );
      const unobstructed = await confirm.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return e.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      });
      assert.ok(unobstructed);
      await page.screenshot({
        path: join(
          tmpdir(),
          'evil-demolition-' + engine.name() + '-' + viewport.width + '.png',
        ),
      });
      await page
        .getByRole('button', { name: 'Conserver', exact: true })
        .click();
      assert.equal(
        await page.evaluate(() => window.manorState.lots[7].kind),
        'den',
      );
      await opening.click();
      await confirm.click();
      assert.equal(
        await page.evaluate(() => window.manorState.lots[7].kind),
        'empty',
      );
      await page.waitForFunction(() =>
        document.querySelector('.goblin-counter')?.textContent.includes('/6'),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        engine.name(),
        viewport,
        'capacity, cancellation, demolition and touch access OK',
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
