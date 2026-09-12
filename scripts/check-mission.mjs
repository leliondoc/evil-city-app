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
const output = await mkdtemp(join(tmpdir(), 'evil-city-mission-'));
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
console.log(`Screenshots: ${output}`);
const frame = (page) => page.evaluate(async () => {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
});
async function lotPoint(page, id) {
  await page.evaluate((id) => window.missionRenderer.focusLot(id), id);
  await frame(page);
  return page.evaluate((id) => {
    const r = window.missionRenderer;
    const canvas = r.canvas;
    const box = canvas.getBoundingClientRect();
    for (const hit of r.hits.filter((h) => h.selection.type === 'lot' && h.selection.id === id)) {
      for (let y = hit.y + 3; y < hit.y + hit.h - 3; y += 3)
        for (let x = hit.x + 3; x < hit.x + hit.w - 3; x += 3) {
          const local = { x: r.origin.x + x * r.scale, y: r.origin.y + y * r.scale };
          const point = { x: box.left + local.x, y: box.top + local.y };
          if (document.elementFromPoint(point.x, point.y) !== canvas) continue;
          const selected = r.hit(local);
          if (selected?.type === 'lot' && selected.id === id) return point;
        }
    }
    throw Error(`No visible map target for lot ${id}`);
  }, id);
}
async function orderSelectedTarget(page, touch = false) {
  const selection = await page.evaluate(() => window.missionRenderer.selection);
  assert.equal(selection.type, 'lot');
  const army = page.getByRole('button', { name: 'Sélectionner l’armée', exact: true });
  if (touch) {
    await page.getByRole('button', { name: 'Fermer les détails', exact: true }).tap();
    await army.tap();
    await page.getByRole('button', { name: 'Ordre', exact: true }).tap();
  } else await army.click();
  const point = await lotPoint(page, selection.id);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.waitForFunction((id) => {
    const state = window.missionState;
    const fighters = state.units.filter((u) => u.kind === 'skeleton');
    return fighters.length === 2 && fighters.every((u) => u.task === 'attack' && u.target === id);
  }, selection.id);
  assert.equal(await page.evaluate(() => window.missionState.units.some((u) => u.kind === 'goblin' && u.task === 'attack')), false);
  if (touch) await page.getByRole('button', { name: 'Ouvrir le guide et les objectifs', exact: true }).tap();
  const inspect = page.getByRole('button', { name: 'Voir l’assaut', exact: true });
  if (touch) await inspect.tap();
  else await inspect.click();
  return selection.id;
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/`);
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  assert.equal(
    await page.locator('.objectives-disclosure').getAttribute('open'),
    null,
  );
  assert.equal(await page.locator('.quest-list').isVisible(), false);
  assert.equal(await page.locator('.canvas-help-keys').isVisible(), false);
  await page.screenshot({ path: join(output, 'opening-desktop.png') });
  await page.locator('.objectives-disclosure summary').click();
  assert.match(
    await page.locator('.quest-list').innerText(),
    /Conquérir une propriété avec l’armée/,
  );
  await page.locator('.objectives-disclosure summary').click();
  await page
    .getByRole('button', { name: 'Recruter mon premier gobelin', exact: true })
    .click();
  assert.ok(
    await page
      .getByRole('button', {
        name: 'Premier gobelin en préparation…',
        exact: true,
      })
      .isDisabled(),
  );
  console.log(
    'Opening: one current objective, optional details, guarded recruitment OK',
  );

  await page.goto(`${base}/tests/mission-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  assert.equal(
    await page.locator('.current-objective').getAttribute('data-objective'),
    'capture',
  );
  await page.screenshot({ path: join(output, 'capture-desktop.png') });
  await page
    .getByRole('button', { name: 'Voir la cible', exact: true })
    .click();
  assert.match(await page.locator('.selection-name').innerText(), /Maison/);
  const capturedId = await orderSelectedTarget(page);
  assert.match(
    await page.locator('.capture-status').innerText(),
    /Armée en route/,
  );
  assert.match(
    await page.locator('.objective-progress').innerText(),
    /Armée en route/,
  );
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await page.locator('.speed-btn').click();
  await page.locator('.speed-btn').click();
  await page
    .locator('.current-objective[data-objective=forge]')
    .waitFor({ timeout: 30000 });
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  assert.equal(await page.evaluate((id) => window.missionState.lots[id].owned, capturedId), true);
  const before = await page
    .locator('.resource')
    .first()
    .locator('strong')
    .innerText();
  await page
    .getByRole('button', { name: 'Préparer la hutte des trolls', exact: true })
    .click();
  assert.equal(
    await page.locator('.resource').first().locator('strong').innerText(),
    before,
  );
  assert.ok(
    await page
      .getByRole('button', { name: 'Construire ici', exact: true })
      .isEnabled(),
  );
  await page.screenshot({ path: join(output, 'forge-desktop.png') });
  await page
    .getByRole('button', { name: 'Construire ici', exact: true })
    .click();
  assert.match(
    await page.locator('.objective-progress').innerText(),
    /Construction/,
  );
  assert.ok(
    await page
      .getByRole('button', { name: 'Voir le chantier', exact: true })
      .isVisible(),
  );
  console.log(
    'Conquest: locate, order, real capture, prepare without spending, build OK',
  );
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Recommencer la partie', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Recommencer la partie', exact: true })
    .click();
  await page.locator('.current-objective[data-objective=goblin]').waitFor();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Recruter mon premier gobelin', exact: true })
    .click();
  assert.ok(
    await page
      .getByRole('button', {
        name: 'Premier gobelin en préparation…',
        exact: true,
      })
      .isDisabled(),
  );
  console.log(
    'Restart: fresh opening and subsequent commands update the interface OK',
  );
  assert.deepEqual(errors, []);
  await page.close();

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    const mobile = await browser.newPage({
      viewport,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    mobile.setDefaultTimeout(15000);
    mobile.on('pageerror', (error) => errors.push(error.message));
    await mobile.goto(`${base}/tests/mission-preview.html`);
    await mobile.locator('.world-canvas[data-ready=true]').waitFor();
    await mobile.getByRole('button', { name: 'Fermer les détails', exact: true }).tap();
    await mobile
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .tap();
    await mobile.getByRole('button', { name: 'Ouvrir le guide et les objectifs', exact: true }).tap();
    await mobile
      .getByRole('button', { name: 'Voir la cible', exact: true })
      .tap();
    assert.equal(await mobile.locator('.mobile-mission').getAttribute('data-expanded'), 'false');
    assert.equal(await mobile.locator('.sidebar .mission-card').count(), 0, 'Objectives remain separate from the selector');
    await mobile.screenshot({
      path: join(output, `capture-${viewport.width}.png`),
    });
    await orderSelectedTarget(mobile, true);
    assert.match(
      await mobile.locator('.capture-status').innerText(),
      /Armée en route/,
    );
    assert.ok(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await mobile
      .getByRole('button', { name: 'Fermer les détails', exact: true })
      .tap();
    assert.equal(await mobile.locator('.sidebar').isVisible(), false);
    console.log(
      `${viewport.width}x${viewport.height}: objective and conquest usable by touch, no horizontal overflow`,
    );
    await mobile.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
