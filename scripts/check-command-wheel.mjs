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
const output = await mkdtemp(join(tmpdir(), 'evil-command-wheel-'));
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [width, height] of [
    [1440, 1000],
    [1280, 800],
    [900, 700],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(
      `${process.env.GAME_URL || 'http://127.0.0.1:3000'}/tests/manor-preview.html`,
    );
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    const wheel = page.getByRole('navigation', {
      name: 'Commandes du domaine',
    });
    await wheel
      .getByRole('button', { name: 'Mettre en pause', exact: true })
      .click();
    const nav = await wheel.boundingBox();
    const cards = await page.locator('.build-tabs').boundingBox();
    const army = await page.locator('.army-overview').boundingBox();
    assert.ok(nav.x + nav.width <= width && nav.y + nav.height <= height + 1);
    assert.ok(army.x + army.width < cards.x && cards.x + cards.width < nav.x);
    const tabs = await page
      .getByRole('tablist', { name: 'Construction et recrutement' })
      .boundingBox();
    assert.ok(
      Math.abs(tabs.x + tabs.width / 2 - cards.x - cards.width / 2) < 2,
    );
    for (const button of await wheel.getByRole('button').all()) {
      assert.ok(
        await button.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
        'Every wheel button receives pointer events',
      );
    }
    await wheel
      .getByRole('button', { name: 'Voir le manoir, niveau 1', exact: true })
      .click();
    assert.equal(
      await page.locator('.selection-name').innerText(),
      'Manoir du mal',
    );
    await page
      .locator('.selection-panel')
      .getByRole('button', { name: 'Passer au niveau 2', exact: true })
      .click();
    assert.ok(
      await wheel
        .getByRole('button', { name: 'Voir le manoir, niveau 2', exact: true })
        .isVisible(),
    );
    assert.equal(
      await wheel.locator('.command-wheel-tiers [data-unlocked=true]').count(),
      2,
    );
    const resources = await page.evaluate(() => ({
      ...window.manorState.resources,
    }));
    await wheel
      .getByRole('button', { name: 'Voir les objectifs', exact: true })
      .click();
    assert.deepEqual(
      await page.evaluate(() => window.manorState.resources),
      resources,
    );
    assert.ok(
      await page.locator('.objectives-disclosure').evaluate((el) => el.open),
    );
    for (const label of [
      'Ouvrir le bestiaire',
      'Comment jouer',
      'Ouvrir les paramètres',
    ]) {
      await wheel.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('dialog').waitFor();
      if (label === 'Ouvrir le bestiaire')
        assert.equal(await page.locator('.bestiary-creature').count(), 15);
      await page.getByRole('button', { name: 'Fermer', exact: true }).click();
      assert.ok(
        await wheel
          .getByRole('button', { name: 'Reprendre', exact: true })
          .isVisible(),
      );
    }
    await page
      .getByRole('tab', { name: 'Recruter des créatures', exact: true })
      .click();
    const row = page.locator('[role=tabpanel] .card-row');
    assert.equal(await row.locator('.recruit-option').count(), 7);
    const next = page.getByRole('button', {
      name: 'Voir les cartes à droite',
      exact: true,
    });
    await page.mouse.move(width / 2, 200);
    await page.screenshot({ path: join(output, `portraits-${width}.png`) });
    const first = await row.locator('.recruit-option').first().boundingBox();
    assert.ok(first.height > first.width, 'Recruitment cards use portrait proportions');
    if (await next.count()) {
    const controls = await page.locator('.creation-scroll-controls').boundingBox();
    const currentTabs = await page.getByRole('tablist', {
      name: 'Construction et recrutement',
    }).boundingBox();
    assert.ok(controls.y + controls.height <= currentTabs.y,
      'Scroll arrows stay above the tabs');
    await row.hover();
    await page.mouse.wheel(0, 150);
    await page.waitForTimeout(300);
    assert.ok(await row.evaluate(el => el.scrollLeft > 0), 'Ordinary mouse wheel scrolls the cards');
    for (let i = 0; i < 8 && (await next.isEnabled()); i++) {
      await next.click();
      // Let smooth scrolling finish before testing the next arrow state.
      await page.waitForTimeout(600);
    }
    }
    const right = await row.boundingBox(),
      last = await row.locator('.recruit-option').last().boundingBox();
    assert.ok(
      last.x >= right.x - 1 && last.x + last.width <= right.x + right.width + 1,
    );
    assert.ok(right.x + right.width < nav.x);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole('tab', { name: 'Construire des bâtiments', exact: true })
      .click();
    await wheel
      .getByRole('button', { name: 'Voir le manoir, niveau 2', exact: true })
      .click();
    await page.mouse.move(width / 2, 200);
    await page.screenshot({ path: join(output, `wheel-${width}.png`) });
    console.log(
      `${width}×${height}: actions, live level, centered tabs and card scrolling OK`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await page.locator('.command-wheel').count(), 0);
  assert.ok(
    await page
      .getByRole('button', { name: 'Reprendre', exact: true })
      .isVisible(),
  );
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
