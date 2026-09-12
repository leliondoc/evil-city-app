import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.effectStarts = [];
    const start = Object.getOwnPropertyDescriptor(
      AudioBufferSourceNode.prototype,
      'start',
    ).value;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.effectStarts.push(this.buffer?.duration);
      return start.apply(this, args);
    };
  });
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:3000');
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page.locator('.loading-art').waitFor({ state: 'hidden' });
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Recruter des créatures' }).click();
  const card = page.locator('.recruit-card').first();
  const before = await page.evaluate(() => window.effectStarts.length);
  await card.click();
  await page.waitForFunction((n) => window.effectStarts.length > n, before);
  const after = await page.evaluate(() => window.effectStarts);
  assert.ok(
    after.at(-1) > 0 && after.at(-1) < 0.5,
    'Short confirmation is played at the click, while recruitment is still paused',
  );
  await card.click();
  assert.ok(
    (await card.getAttribute('class')).includes('locked'),
    'Two purchases exhaust the initial gold',
  );
  const count = await page.evaluate(() => window.effectStarts.length);
  // Locked cards still show their reason, but must not confirm a refused purchase.
  await card.click();
  assert.equal(await page.evaluate(() => window.effectStarts.length), count);
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Couper le son', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Tester le son', exact: true })
    .isDisabled()
    .then((disabled) => assert.equal(disabled, true));
  console.log(
    'PASS: successful card recruitment produces a short immediate cue during pause; unavailable recruitment is silent.',
  );
} finally {
  await browser.close();
}
