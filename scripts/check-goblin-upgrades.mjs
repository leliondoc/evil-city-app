import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
  headless: true,
});
const output = await mkdtemp(join(tmpdir(), 'evil-goblin-upgrades-'));
console.log(`Screenshots: ${output}`);
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/tests/pack-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
  const frame = () =>
    page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  await frame();
  const hitPoint = async (type, id) =>
    page.evaluate(
      ({ type, id }) => {
        const r = window.packRenderer,
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
              if (document.elementFromPoint(client.x, client.y) !== c) continue;
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
    const p = await hitPoint(type, id);
    await page.mouse.click(p.x, p.y);
    await frame();
  };
  await clickSelection('lot', 3);
  assert.equal(
    await page.locator('.selection-name').innerText(),
    'Grotte gobeline',
  );
  const rally = await page.evaluate(() => {
    const r = window.packRenderer,
      b = r.canvas.getBoundingClientRect();
    return {
      x: b.left + r.origin.x + 15.5 * 32 * r.scale,
      y: b.top + r.origin.y + 21 * 32 * r.scale,
    };
  });
  await page.mouse.click(rally.x, rally.y, { button: 'right' });
  await frame();
  assert.ok(await page.evaluate(() => window.packState.lots[3].rallyPoint));
  await page.screenshot({ path: join(output, 'cave-rally.png') });
  await page
    .getByRole('button', {
      name: 'Gobelin lancier : sélectionner toutes les unités (1)',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await frame();
  assert.ok(
    await page.evaluate(() =>
      window.packState.strategy.research.includes('pig-riding'),
    ),
  );
  assert.ok(
    await page
      .getByRole('button', { name: 'Recherche acquise', exact: true })
      .isDisabled(),
  );
  await page.screenshot({ path: join(output, 'pig-rider.png') });
  await page
    .getByRole('button', { name: 'Grotte gobeline', exact: true })
    .click();
  const placement = await hitPoint('lot', 5);
  await page.mouse.move(placement.x, placement.y);
  await frame();
  assert.equal(
    await page.locator('.world-canvas').getAttribute('data-cursor'),
    'hammer',
  );
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.world-canvas');
    return (
      canvas.dataset.cursor === 'hammer' &&
      getComputedStyle(canvas).cursor.includes('ui-hammer')
    );
  });
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Ouvrir le bestiaire', exact: true })
    .click();
  assert.equal(await page.locator('.bestiary-creature').count(), 15);
  assert.equal(
    await page
      .getByRole('region', { name: 'Votre horde', exact: true })
      .locator('article')
      .count(),
    7,
  );
  assert.equal(
    await page
      .getByRole('region', { name: 'Les humains', exact: true })
      .locator('article')
      .count(),
    8,
  );
  await page
    .getByRole('textbox', { name: 'Chercher dans le bestiaire', exact: true })
    .fill('lancier');
  assert.equal(await page.locator('.bestiary-creature').count(), 2);
  await page
    .getByRole('button', { name: 'Voir le chevaucheur de porc', exact: true })
    .click();
  await page.getByRole('tab', { name: 'En marche', exact: true }).click();
  await page.screenshot({ path: join(output, 'bestiary-factions.png') });
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: /^Vivres :/ }).click();
  await page.evaluate(() => {
    const r = window.packRenderer,
      site = window.packState.sites.find((site) => site.kind === 'food'),
      view = r.viewport;
    r.pan(
      view.x + view.width * 0.55 - (r.origin.x + site.x * 32 * r.scale),
      view.y + view.height * 0.45 - (r.origin.y + (site.y + 1) * 32 * r.scale),
    );
  });
  await frame();
  assert.equal(
    await page.evaluate(
      () =>
        window.packRenderer.hits.filter(
          (hit) =>
            hit.selection.type === 'resource' &&
            ['pig-idle', 'sheep', 'sheep-hit'].includes(hit.key),
        ).length,
    ),
    2,
  );
  await page.screenshot({ path: join(output, 'pig-pasture.png') });
  assert.deepEqual(errors, []);
  console.log(
    'Cave, rally, mounted research, hammer cursor, 15 bestiary actors and pasture: OK; no browser errors.',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/tests/pack-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  assert.equal(await page.locator('.recruit-option').count(), 7);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  assert.equal(overflow, false);
  await page.screenshot({ path: join(output, 'recruit-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('Mobile recruitment: seven cards, no page overflow.');
} finally {
  await browser.close();
}
