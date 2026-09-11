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
const output = await mkdtemp(join(tmpdir(), 'evil-manor-'));
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    `${process.env.GAME_URL || 'http://127.0.0.1:3000'}/tests/manor-preview.html`,
  );
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
  const selectLot = async (id) => {
    await page.evaluate((id) => window.manorRenderer.focusLot(id), id);
    await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    const point = await page.evaluate((id) => {
      const r = window.manorRenderer,
        c = r.canvas,
        b = c.getBoundingClientRect();
      for (const h of r.hits.filter(
        (h) => h.selection.type === 'lot' && h.selection.id === id,
      )) {
        for (let y = h.y + 4; y < h.y + h.h - 4; y += 4)
          for (let x = h.x + 4; x < h.x + h.w - 4; x += 4) {
            const p = {
              x: r.origin.x + x * r.scale,
              y: r.origin.y + y * r.scale,
            };
            const client = { x: b.left + p.x, y: b.top + p.y };
            if (document.elementFromPoint(client.x, client.y) !== c) continue;
            const hit = r.hit(p);
            if (hit?.type === 'lot' && hit.id === id) return client;
          }
      }
      throw Error(`No visible lot ${id}`);
    }, id);
    await page.keyboard.down('Shift');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Shift');
  };
  const finishUpgrade = async (id) => {
    assert.equal(await page.evaluate((id) => window.manorState.lots[id].level, id), id === 6 && await page.evaluate(() => window.manorState.lots[6].upgrading.targetLevel) === 3 ? 2 : 1);
    const remaining = await page.evaluate((id) => window.manorState.lots[id].upgrading.remaining, id);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate((id) => window.manorState.lots[id].upgrading.remaining, id), remaining, 'Pause freezes upgrades');
    await page.evaluate(async (id) => {
      const { tick } = await import('/app/game/engine.ts');
      const s = window.manorState;
      for (let i = 0; i < 1000 && s.lots[id].upgrading; i++) tick(s, 0.1);
    }, id);
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
    await page.waitForTimeout(180);
    await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
  };
  const panel = page.locator('.selection-panel');
  const crypt = page.getByRole('button', { name: /^Crypte des murmures/ });
  const forge = page.getByRole('button', { name: /^Hutte des Trolls/ });
  assert.equal(await crypt.getAttribute('aria-disabled'), 'true');
  assert.match(await crypt.innerText(), /manoir au niveau 2/);
  assert.match(await forge.innerText(), /manoir au niveau 3/);
  await selectLot(3);
  assert.match(await panel.locator('.upgrade-benefit-values').innerText(), /6[\s\S]*12 places/);
  assert.ok(
    await panel
      .getByRole('button', { name: /Niveau 2 · \d+ s/ })
      .isDisabled(),
  );
  assert.ok(
    await panel
      .getByRole('button', { name: 'Rechercher', exact: true })
      .isDisabled(),
  );
  await selectLot(6);
  assert.match(
    await panel.innerText(),
    /Débloque la crypte et les chevaucheurs/,
  );
  const before = await page.evaluate(() => ({
    ...window.manorState.resources,
  }));
  await panel
    .getByRole('button', { name: /Niveau 2 · \d+ s/ })
    .click();
  assert.equal(await page.evaluate(() => window.manorState.lots[6].level), 1);
  assert.match(await panel.innerText(), /60 s restantes/);
  await page.screenshot({ path: join(output, 'manor-upgrading.png') });
  const charged = await page.evaluate(() => ({ ...window.manorState.resources }));
  await finishUpgrade(6);
  assert.equal(await page.evaluate(() => window.manorState.lots[6].level), 2);
  assert.equal(await panel.locator('.manor-tier[data-state="acquired"]').count(), 2);
  assert.equal(await panel.locator('.manor-tier[data-state="next"]').count(), 1);
  const after = charged;
  assert.equal(before.gold - after.gold, 80);
  assert.equal(before.wood - after.wood, 35);
  assert.equal(await crypt.getAttribute('aria-disabled'), 'false');
  assert.equal(await forge.getAttribute('aria-disabled'), 'true');
  assert.match(await panel.innerText(), /Débloque la hutte des trolls/);
  await page.screenshot({ path: join(output, 'manor-tier-two.png') });
  await selectLot(3);
  assert.ok(
    await panel
      .getByRole('button', { name: 'Rechercher', exact: true })
      .isEnabled(),
  );
  await panel
    .getByRole('button', { name: /Niveau 2 · \d+ s/ })
    .click();
  await finishUpgrade(3);
  assert.match(await panel.locator('.upgrade-benefit-values').innerText(), /12[\s\S]*18 places/);
  assert.ok(
    await panel
      .getByRole('button', { name: /Niveau 3 · \d+ s/ })
      .isDisabled(),
  );
  await selectLot(6);
  await panel
    .getByRole('button', { name: /Niveau 3 · \d+ s/ })
    .click();
  await finishUpgrade(6);
  assert.match(await forge.innerText(), /Terminez crypte/);
  // Build the required crypt using the actual construction UI and simulation.
  await crypt.click();
  await selectLot(5);
  assert.equal(await page.evaluate(() => window.manorState.lots[5].construction?.kind), 'crypt');
  await page.evaluate(async () => {
    const { tick } = await import('/app/game/engine.ts');
    for (let i = 0; i < 600 && window.manorState.lots[5].construction; i++)
      tick(window.manorState, 0.1);
  });
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Hutte des Trolls"]')
        ?.getAttribute('aria-disabled') === 'false',
  );
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await selectLot(6);
  assert.equal(await panel.locator('.manor-tier[data-state="acquired"]').count(), 3);
  assert.equal(await panel.locator('.manor-tier[aria-current="step"] .manor-tier-number').getAttribute('aria-label'), 'Niveau 3');
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', {
      name: 'Voir les détails de la sélection',
      exact: true,
    })
    .click();
  const tiers = panel.locator('.manor-progression');
  await tiers.scrollIntoViewIfNeeded();
  const bounds = await tiers.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
  assert.equal(
    await tiers.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    false,
  );
  await page.screenshot({ path: join(output, 'manor-mobile.png') });
  assert.deepEqual(errors, []);
  console.log(
    `Manor tiers, costs, building/research locks and mobile panels verified. Screenshots: ${output}`,
  );
} finally {
  await browser.close();
}
