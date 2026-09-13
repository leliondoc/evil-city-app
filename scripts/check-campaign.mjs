import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const engine = process.env.CAMPAIGN_BROWSER || 'chromium';
const output = await mkdtemp(join(tmpdir(), `evil-city-campaign-${engine}-`));
const browser = await { chromium, webkit }[engine].launch({
  headless: true,
  ...(engine === 'chromium' && process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {}),
});
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    if (
      process.env.CAMPAIGN_WIDTH &&
      viewport.width !== Number(process.env.CAMPAIGN_WIDTH)
    )
      continue;
    const touch = viewport.width !== 1440;
    const context = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: 'reduce',
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        'evil-city-audio-v1',
        JSON.stringify({ muted: true, volume: 0.35, musicVolume: 0.2 }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.goto(base);
    await page.screenshot({ path: `${output}/menu-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Jouer', exact: true }).click();
    assert.equal(await page.locator('.atlas-node:disabled').count(), 0);
    await page.getByRole('button', { name: 'Entrer dans le quartier', exact: true }).click();
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    assert.equal(await page.locator('.selection-column').isVisible(), false);
    assert.equal(await page.locator('.army-face').count(), 1);
    await page.screenshot({ path: `${output}/opening-${viewport.width}.png` });

    await page.goto(`${base}/tests/campaign-preview.html`);
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    await page.waitForFunction(() => !!window.campaignRenderer);
    const expand = async () => {
      if (
        touch &&
        (await page
          .getByRole('button', {
            name: 'Ouvrir le guide et les objectifs',
            exact: true,
          })
          .count())
      )
        await page
          .getByRole('button', {
            name: 'Ouvrir le guide et les objectifs',
            exact: true,
          })
          .click();
    };
    await expand();
    if (touch) {
      await page.screenshot({ path: `${output}/guide-${viewport.width}.png` });
      assert.equal(
        await page.locator('.mission-card').evaluate((el) => {
          const box = el.getBoundingClientRect();
          return (
            box.top >= 0 &&
            box.bottom < innerHeight - 50 &&
            (el.scrollHeight <= el.clientHeight ||
              getComputedStyle(el).overflowY === 'auto')
          );
        }),
        true,
        'The guide stays inside the viewport and long contents can scroll',
      );
    }
    await page
      .getByRole('button', {
        name: 'Recruter mon premier gobelin',
        exact: true,
      })
      .click();
    await page.evaluate(() => window.campaignTick(7));
    await page.locator('[data-objective=canteen]').waitFor();
    await expand();
    await page
      .getByRole('button', { name: 'Préparer la cantine', exact: true })
      .click();
    const build = page.getByRole('button', { name: /Construire ici/ });
    await build.click();
    await page
      .getByRole('button', { name: 'Fermer les détails', exact: true })
      .click();
    await page.evaluate(() => window.campaignTick(50));
    await page.locator('[data-objective=rally]').waitFor();
    await expand();
    await page
      .getByRole('button', { name: 'Recruter un lancier', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Recruter un lancier', exact: true })
      .click();
    await page.evaluate(() => window.campaignTick(7));
    await page
      .getByRole('button', { name: 'Déplacer mes lanciers', exact: true })
      .click();
    await page.locator('.game-shell[data-commanding=true]').waitFor();
    await page.screenshot({ path: `${output}/rally-${viewport.width}.png` });
    const target = await page.evaluate(() => {
      const r = window.campaignRenderer;
      const origin = Reflect.get(r, 'origin'),
        scale = Reflect.get(r, 'scale');
      return { x: origin.x + 16 * 32 * scale, y: origin.y + 30.5 * 32 * scale };
    });
    assert.equal(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.className,
        target,
      ),
      'world-canvas',
      'Rally destination remains accessible beneath the HUD',
    );
    if (touch) await page.touchscreen.tap(target.x, target.y);
    else await page.mouse.click(target.x, target.y);
    await page.waitForFunction(() =>
      window
        .campaignState()
        .units.filter((u) => u.kind === 'spear-goblin')
        .every((u) => !!u.holdPosition),
    );
    await page.evaluate(() => window.campaignTick(50));
    await page
      .getByRole('button', { name: 'Continuer · Le Faubourg', exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('evil-city-campaign-v1')),
      '2',
    );
    await page
      .getByRole('button', { name: 'Continuer · Le Faubourg', exact: true })
      .click();
    await page.locator('[data-objective=capture]').waitFor();
    assert.equal(
      await page.evaluate(() => window.campaignState().campaign.mapId),
      'faubourg',
    );
    assert.equal(await page.locator('.selection-column').isVisible(), false);
    assert.equal(await page.locator('.army-face').count(), 2);
    await page.screenshot({ path: `${output}/faubourg-${viewport.width}.png` });
    if (touch) {
      await page
        .getByRole('button', { name: 'Mettre en pause', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Sélectionner l’armée', exact: true })
        .click();
      const before = await page.evaluate(() =>
        Reflect.get(window.campaignRenderer, 'selection'),
      );
      assert.equal(before.type, 'units');
      assert.equal(
        await page.locator('.selection-column').isVisible(),
        false,
        'Selecting troops keeps the map accessible',
      );
      const street = await page.evaluate(() => {
        const r = window.campaignRenderer,
          scale = Reflect.get(r, 'scale'),
          origin = Reflect.get(r, 'origin');
        for (const [wx, wy] of [
          [21, 21],
          [31, 11],
          [11, 11],
          [21, 31],
        ]) {
          const p = {
            x: origin.x + wx * 32 * scale,
            y: origin.y + wy * 32 * scale,
          };
          if (
            document.elementFromPoint(p.x, p.y)?.className === 'world-canvas' &&
            !Reflect.get(r, 'hit').call(r, p)
          )
            return p;
        }
        throw Error('No unobscured street');
      });
      await page.touchscreen.tap(street.x, street.y);
      await page.waitForFunction(() =>
        window
          .campaignState()
          .units.filter((u) => u.kind === 'spear-goblin')
          .every((u) => u.task === 'move'),
      );
      assert.deepEqual(
        await page.evaluate(() =>
          Reflect.get(window.campaignRenderer, 'selection'),
        ),
        before,
      );
      const paths = await page.evaluate(() =>
        window.campaignState().units.map((u) => u.path),
      );
      if (engine === 'chromium') {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: street.x, y: street.y, id: 1 }],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: street.x - 25, y: street.y - 20, id: 1 }],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [
            { x: street.x - 15, y: street.y, id: 1 },
            { x: street.x + 15, y: street.y, id: 2 },
          ],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: street.x - 30, y: street.y, id: 1 },
            { x: street.x + 30, y: street.y, id: 2 },
          ],
        });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
        await cdp.detach();
      }
      assert.deepEqual(
        await page.evaluate(() =>
          window.campaignState().units.map((u) => u.path),
        ),
        paths,
        'Pan and pinch never issue a movement order',
      );
      assert.deepEqual(
        await page.evaluate(() =>
          Reflect.get(window.campaignRenderer, 'selection'),
        ),
        before,
      );
      await page
        .getByRole('button', { name: 'Désélectionner', exact: true })
        .click();
      assert.equal(
        await page.evaluate(
          () => Reflect.get(window.campaignRenderer, 'selection').type,
        ),
        'none',
      );
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .click();
    }
    await page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .click();
    await page.locator('#ui-scale').fill('130');
    await page.screenshot({ path: `${output}/settings-${viewport.width}.png` });
    await page
      .getByRole('button', { name: 'Retour au quartier', exact: false })
      .click();
    await expand();
    await page.screenshot({
      path: `${output}/large-guide-${viewport.width}.png`,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      `${viewport.width}×${viewport.height}: campaign start, construction, movement, victory, transition and scaling OK`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Screenshots: ${output}`);
