import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const output = await mkdtemp(join(tmpdir(), 'evil-factions-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [width, height, touch] of [
    [2560, 1440, false],
    [1280, 800, false],
    [320, 568, true],
    [844, 390, true],
    [768, 1024, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/tests/domain-preview.html');
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const menu = page.locator('.district-menu');
    if (!touch) {
      assert.equal(await menu.locator('.district-group').count(), 2);
      const map = await page.locator('.world-wrap').boundingBox();
      const rail = await menu.boundingBox();
      assert.ok(rail.x < map.x + 40);
    } else {
      assert.equal(await menu.locator('.district-group').count(), 1);
      await menu.getByRole('button', { name: 'Humains', exact: true }).click();
      assert.equal(
        await menu.locator('[data-camp="human"] .district-shortcut').count(),
        3,
      );
      await menu
        .getByRole('button', { name: 'Mon domaine', exact: true })
        .click();
    }
    assert.equal(
      await menu.locator('[data-camp="evil"] .district-shortcut').count(),
      4,
    );
    await menu.getByRole('button', { name: /Vos gobelins\./ }).click();
    const popup = page.locator('.district-popover');
    await popup.waitFor({ state: 'visible' });
    assert.equal(await popup.getAttribute('data-camp'), 'evil');
    assert.match(await popup.innerText(), /3 \/ 6/);
    await page.waitForTimeout(200);
    const b = await popup.boundingBox();
    assert.ok(
      b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= width + 1 &&
        b.y + b.height <= height + 1,
      JSON.stringify(b),
    );
    await page.screenshot({ path: join(output, `${width}-goblins.png`) });
    await popup
      .getByRole('button', { name: 'Sélectionner les gobelins', exact: true })
      .click();
    await popup.waitFor({ state: 'hidden' });
    assert.match(await page.locator('.selection-name').innerText(), /3/);
    if (touch)
      await page
        .getByRole('navigation', { name: 'Navigation du jeu' })
        .getByRole('button', { name: 'Carte', exact: true })
        .click();
    await menu.getByRole('button', { name: /Votre horde\./ }).click();
    await popup
      .getByRole('button', {
        name: 'Sélectionner les combattants',
        exact: true,
      })
      .click();
    assert.match(
      await page.locator('.selection-name').innerText(),
      /Squelette/,
    );
    if (touch)
      await page
        .getByRole('navigation', { name: 'Navigation du jeu' })
        .getByRole('button', { name: 'Carte', exact: true })
        .click();
    await menu.getByRole('button', { name: /Vos gobelins\./ }).click();
    await popup.getByRole('button', { name: /^Or/ }).click();
    assert.match(await page.locator('.selection-name').innerText(), /or/i);
    assert.deepEqual(errors, []);
    console.log(
      `${width}x${height}: faction groups, selection and resource actions OK`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Screenshots: ${output}`);
