import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
const output = await mkdtemp(join(tmpdir(), 'evil-combat-counters-'));
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/tests/pack-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  assert.equal(
    await page.locator('.world-canvas').getAttribute('data-renderer'),
    'pixi-webgl',
  );
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Gobelin lancier : sélectionner toutes les unités (1)',
      exact: true,
    })
    .click();
  const details = page.locator('.selection-panel .combat-details');
  assert.match(await details.innerText(), /Chevaliers de l’Aube/);
  assert.match(await details.innerText(), /\+35 %/);
  assert.doesNotMatch(await details.innerText(), /Vitesse \+50 %/);
  // Complete the upgrade in the test fixture, then publish through the real game loop.
  await page.evaluate(() =>
    window.packState.strategy.research.push('pig-riding'),
  );
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector('.selection-panel .combat-details')
      ?.textContent.includes('Vitesse +50 %'),
  );
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  assert.match(await details.innerText(), /Lanciers de l’Aube/);
  assert.match(
    await page.locator('.selection-panel').innerText(),
    /Monté sur cochon/,
  );
  await page.screenshot({ path: join(output, 'mounted-selection.png') });
  const clickMap = async (type, id) => {
    const point = await page.evaluate(
      ({ type, id }) => {
        const r = window.packRenderer,
          c = r.canvas,
          b = c.getBoundingClientRect();
        for (const h of r.hits.filter(
          (h) => h.selection.type === type && h.selection.id === id,
        )) {
          for (let y = h.y + 3; y < h.y + h.h - 3; y += 3) {
            for (let x = h.x + 3; x < h.x + h.w - 3; x += 3) {
              const local = {
                x: r.origin.x + x * r.scale,
                y: r.origin.y + y * r.scale,
              };
              const client = { x: b.left + local.x, y: b.top + local.y };
              if (document.elementFromPoint(client.x, client.y) !== c) continue;
              const hit = r.hit(local);
              if (hit?.type === type && hit.id === id) return client;
            }
          }
        }
        throw Error(`No visible hit point ${type}/${id}`);
      },
      { type, id },
    );
    // Shift inspects hostile buildings instead of issuing an attack with the selected soldier.
    await page.keyboard.down('Shift');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Shift');
  };
  const guildId = await page.evaluate(
    () => window.packState.lots.find((lot) => lot.kind === 'guild').id,
  );
  await clickMap('lot', guildId);
  await page
    .getByRole('button', {
      name: 'Voir la fiche : Chevalier de l’Aube',
      exact: true,
    })
    .click();
  assert.match(await page.locator('.selection-panel').innerText(), /180 PV/);
  assert.match(await details.innerText(), /Trolls/);
  await page.screenshot({ path: join(output, 'knight-selection.png') });
  await page.getByRole('button', { name: 'Revenir à la guilde' }).click();
  await page
    .getByRole('button', {
      name: 'Voir la fiche : Lancier de l’Aube',
      exact: true,
    })
    .click();
  assert.match(await page.locator('.selection-panel').innerText(), /110 PV/);
  assert.match(await details.innerText(), /\+40 %/);
  await page.screenshot({ path: join(output, 'lancer-selection.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', {
      name: 'Voir les détails de la sélection',
      exact: true,
    })
    .click();
  await details.scrollIntoViewIfNeeded();
  const box = await details.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 391);
  assert.equal(
    await details.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    false,
  );
  await page.screenshot({ path: join(output, 'mobile-lancer.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('button', { name: 'Ouvrir le bestiaire', exact: true })
    .click();
  assert.equal(await page.locator('.bestiary-creature').count(), 16);
  assert.equal(
    await page.locator('.bestiary-creature .combat-details').count(),
    13,
  );
  const spear = page
    .locator('.bestiary-creature')
    .filter({
      has: page.locator('strong').filter({ hasText: /^Chevaucheur de cochon$/ }),
    });
  assert.match(
    await spear.locator('.combat-details').innerText(),
    /Vitesse \+50 %/,
  );
  await page.screenshot({ path: join(output, 'bestiary-counters.png') });
  assert.deepEqual(errors, []);
  console.log(
    `Combat selection, live mount upgrade, guild health, mobile layout and bestiary verified. Screenshots: ${output}`,
  );
} finally {
  await browser.close();
}
