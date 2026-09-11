import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  const selections = await page.evaluate(async () => {
    const { CREATURES, HEROES, ENEMIES } = await import('/app/game/engine.ts');
    const s = window.manorState;
    const base = s.units[0];
    s.units = Object.keys(CREATURES).map((kind, i) => ({
      ...base,
      kind,
      id: s.nextId++,
      hp: CREATURES[kind].hp,
      x: 5 + i,
      y: 30.5,
      task: 'idle',
      path: [],
      target: null,
    }));
    s.enemies = ['guard', 'warrior', 'lancer', 'archer', 'monk'].map(
      (role, i) => {
        const def = role === 'guard' ? ENEMIES.guard : HEROES[role];
        return {
          id: s.nextId++,
          kind: role === 'guard' ? 'guard' : 'hero',
          role: role === 'guard' ? 'warrior' : role,
          hp: def.hp * 0.2,
          maxHp: def.hp,
          damage: def.damage,
          level: 1,
          x: 5 + i,
          y: 10.5,
          path: [],
          target: 6,
          facing: 1,
          fighting: false,
          healTarget: null,
          attackCooldown: 0,
        };
      },
    );
    for (const site of s.sites) s.lots[site.home].owned = false;
    s.workers = s.sites.map((site) => ({
      id: s.nextId++,
      site: site.id,
      x: site.x,
      y: site.y,
      hp: 35,
      maxHp: 35,
      path: [],
      phase: 'harvest',
      cargo: 0,
      progress: 0,
      facing: 1,
    }));
    return [
      ...s.units.map((u) => ({ type: 'unit', id: u.id })),
      ...s.enemies.map((e) => ({ type: 'enemy', id: e.id })),
      ...s.workers.map((w) => ({ type: 'worker', id: w.id })),
      ...[0, 1, 2, 3].map((id) => ({ type: 'guildHero', id })),
    ];
  });
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await page.waitForTimeout(150);
  await page
    .getByRole('button', { name: 'Mettre en pause', exact: true })
    .click();
  for (const selection of selections) {
    await page.evaluate(
      (selection) => window.manorRenderer.onSelect(selection),
      selection,
    );
    const panel = page.locator('.selection-panel');
    const portrait = panel.locator('.selection-art .selection-portrait');
    await portrait.waitFor({ timeout: 3000 }).catch(() => {
      throw Error(`Missing portrait ${JSON.stringify(selection)}`);
    });
    assert.equal(await panel.locator('.eyebrow').count(), 0);
    assert.equal(await panel.locator('.selection-art canvas').count(), 0);
    assert.equal(
      await portrait.evaluate((im) => im.complete && im.naturalWidth > 0),
      true,
    );
  }
  for (const width of [900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() =>
      window.manorRenderer.onSelect({ type: 'lot', id: 2 }),
    );
    const stats = page.locator('.selection-stats');
    assert.equal(
      await stats.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(
      await stats
        .locator('span')
        .first()
        .evaluate((el) => getComputedStyle(el).whiteSpace),
      'nowrap',
    );
  }
  await page.evaluate(
    (selection) => window.manorRenderer.onSelect(selection),
    selections.find((s) => s.type === 'enemy'),
  );
  assert.match(await page.locator('.combat-status').innerText(), /Bouclier/);
  const shieldModels = await page.evaluate(() =>
    window.manorRenderer.hits
      .filter((h) => h.key.endsWith('-shield'))
      .map((h) => h.key),
  );
  assert.ok(shieldModels.includes('guard-shield'));
  assert.ok(shieldModels.includes('hero-warrior-shield'));
  await page.screenshot({ path: join(tmpdir(), 'evil-selection-guard.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.mobile-nav')
    .getByRole('button', { name: 'Détails', exact: true })
    .click();
  await page.locator('.selection-portrait').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(tmpdir(), 'evil-selection-mobile.png') });
  assert.deepEqual(errors, []);
  console.log(
    `${selections.length} unit/hero selections: fixed portraits, no eyebrows; shield animations and responsive stats OK`,
  );
} finally {
  await browser.close();
}
