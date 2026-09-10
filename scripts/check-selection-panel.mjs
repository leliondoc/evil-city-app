import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const [width, height] of [
    [1280, 800],
    [2560, 1440],
    [900, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3000/tests/domain-preview.html');
    await page.locator('.loading-art').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const mission = page.locator('.mission-sidebar'),
      selection = page.locator('.sidebar');
    const left = await mission.boundingBox(),
      map = await page.locator('.world-wrap').boundingBox(),
      right = await selection.boundingBox();
    assert.ok(
      left.x + left.width <= map.x + 1 && map.x + map.width <= right.x + 1,
    );
    assert.equal(await selection.locator('.mission-card').count(), 0);
    await mission.evaluate((el) => (el.scrollTop = 70));
    const missionScroll = await mission.evaluate((el) => el.scrollTop);
    await selection.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.getByRole('button', { name: /^Or : .*Voir la source/ }).click();
    await page.waitForTimeout(100);
    assert.match(await page.locator('.selection-name').innerText(), /or/i);
    const name = await page.locator('.selection-name').boundingBox();
    assert.ok(
      name.y >= right.y && name.y + name.height <= right.y + right.height,
    );
    assert.ok((await selection.evaluate((el) => el.scrollTop)) < 50);
    assert.equal(await mission.evaluate((el) => el.scrollTop), missionScroll);
    await selection.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.locator('.army-face').first().click();
    await page.waitForTimeout(100);
    assert.match(await page.locator('.selection-name').innerText(), /3 unités/);
    assert.equal(await selection.evaluate((el) => el.scrollTop), 0);
    assert.equal(await mission.evaluate((el) => el.scrollTop), missionScroll);
    console.log(
      `${width}x${height}: independent mission/selection, selected names immediately visible, scroll resets OK`,
    );
  }
} finally {
  await browser.close();
}
