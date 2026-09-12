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
const output = await mkdtemp(join(tmpdir(), 'evil-city-mission-'));
console.log(`Screenshots: ${output}`);
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
  await page.goto('http://127.0.0.1:3000/');
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

  await page.goto('http://127.0.0.1:3000/tests/mission-preview.html');
  await page.locator('.world-canvas[data-ready=true]').waitFor();
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
  await page
    .getByRole('button', { name: 'Envoyer l’armée', exact: true })
    .click();
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
  const before = await page
    .locator('.resource')
    .first()
    .locator('strong')
    .innerText();
  await page
    .getByRole('button', { name: 'Préparer la forge', exact: true })
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
    });
    mobile.on('pageerror', (error) => errors.push(error.message));
    await mobile.goto('http://127.0.0.1:3000/tests/mission-preview.html');
    await mobile.locator('.world-canvas[data-ready=true]').waitFor();
    await mobile
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .tap();
    await mobile
      .getByRole('navigation', { name: 'Navigation du jeu' })
      .getByRole('button', { name: 'Détails', exact: true })
      .tap();
    await mobile
      .getByRole('button', { name: 'Voir la cible', exact: true })
      .tap();
    const attack = mobile.getByRole('button', {
      name: 'Envoyer l’armée',
      exact: true,
    });
    await attack.scrollIntoViewIfNeeded();
    await mobile.screenshot({
      path: join(output, `capture-${viewport.width}.png`),
    });
    await attack.tap();
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
