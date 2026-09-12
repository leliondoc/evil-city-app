// Exercise settings through the real menu/game UI, including refused browser storage.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
const key = 'evil-city-audio-v1';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});

async function expectMenuSettings(page, expected) {
  assert.equal(
    await page.locator('.start-setting-toggle').getAttribute('aria-pressed'),
    String(!expected.muted),
  );
  assert.equal(
    await page.locator('#menu-effects').inputValue(),
    String(expected.volume),
  );
  assert.equal(
    await page.locator('#menu-music').inputValue(),
    String(expected.musicVolume),
  );
}

async function expectGameSettings(page, expected) {
  assert.equal(
    await page.locator('.audio-heading button').getAttribute('aria-pressed'),
    String(!expected.muted),
  );
  assert.equal(
    await page.locator('#effects-volume').inputValue(),
    String(expected.volume),
  );
  assert.equal(
    await page.locator('#music-volume').inputValue(),
    String(expected.musicVolume),
  );
}

try {
  for (const scenario of [
    { width: 1280, height: 800, failure: 'denied' },
    { width: 390, height: 844, failure: 'denied' },
    { width: 1280, height: 800, failure: 'write-only' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: scenario.width, height: scenario.height },
      hasTouch: scenario.width < 800,
      isMobile: scenario.width < 800,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key, failure }) => {
        const getItem = Object.getOwnPropertyDescriptor(
          Storage.prototype,
          'getItem',
        ).value;
        const setItem = Object.getOwnPropertyDescriptor(
          Storage.prototype,
          'setItem',
        ).value;
        setItem.call(
          localStorage,
          key,
          JSON.stringify({ muted: false, volume: 0.35, musicVolume: 0.2 }),
        );
        Storage.prototype.getItem = function (name) {
          if (name === key && failure === 'denied')
            throw new DOMException('Storage unavailable', 'SecurityError');
          return getItem.call(this, name);
        };
        Storage.prototype.setItem = function (name, value) {
          if (name === key)
            throw new DOMException(
              'Storage unavailable',
              failure === 'denied' ? 'SecurityError' : 'QuotaExceededError',
            );
          return setItem.call(this, name, value);
        };
        window.restoreAudioSettingsStorage = () => {
          Storage.prototype.getItem = getItem;
          Storage.prototype.setItem = setItem;
        };
      },
      { key, failure: scenario.failure },
    );
    const press = (locator) =>
      scenario.width < 800 ? locator.tap() : locator.click();

    await page.goto(base);
    await press(
      page.getByRole('button', { name: 'Couper le son', exact: true }),
    );
    await press(page.getByRole('button', { name: 'Réglages', exact: true }));
    await page.locator('#menu-music').fill('40');
    await page.locator('#menu-effects').fill('65');
    await expectMenuSettings(page, {
      muted: true,
      volume: 65,
      musicVolume: 40,
    });
    await press(page.getByRole('button', { name: 'Fermer', exact: true }));
    await press(page.getByRole('button', { name: 'Jouer', exact: true }));
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    if (scenario.width < 800)
      await press(
        page.getByRole('button', { name: 'Fermer les détails', exact: true }),
      );
    await press(
      page.getByRole('button', { name: 'Ouvrir les paramètres', exact: true }),
    );
    await expectGameSettings(page, {
      muted: true,
      volume: 65,
      musicVolume: 40,
    });

    await page.locator('#music-volume').fill('55');
    await page.locator('#effects-volume').fill('25');
    await press(
      page.getByRole('button', {
        name: 'Menu principal · Garder la partie',
        exact: true,
      }),
    );
    await press(page.getByRole('button', { name: 'Réglages', exact: true }));
    await expectMenuSettings(page, {
      muted: true,
      volume: 25,
      musicVolume: 55,
    });

    // Recovery must allow normal persistence again, with no reload of the game.
    await page.evaluate(() => window.restoreAudioSettingsStorage());
    await page.locator('#menu-music').fill('60');
    await page.locator('#menu-effects').fill('30');
    assert.deepEqual(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key),
      { muted: true, volume: 0.3, musicVolume: 0.6 },
    );
    await press(page.getByRole('button', { name: 'Fermer', exact: true }));
    await press(page.getByRole('button', { name: 'Reprendre', exact: true }));
    await press(
      page.getByRole('button', { name: 'Ouvrir les paramètres', exact: true }),
    );
    await expectGameSettings(page, {
      muted: true,
      volume: 30,
      musicVolume: 60,
    });

    // A readable external update must still be seen on the next menu mount.
    await page.evaluate(
      (key) =>
        localStorage.setItem(
          key,
          JSON.stringify({ muted: false, volume: 0.1, musicVolume: 0.25 }),
        ),
      key,
    );
    await press(
      page.getByRole('button', {
        name: 'Menu principal · Garder la partie',
        exact: true,
      }),
    );
    await press(page.getByRole('button', { name: 'Réglages', exact: true }));
    await expectMenuSettings(page, {
      muted: false,
      volume: 10,
      musicVolume: 25,
    });
    assert.deepEqual(errors, []);
    console.log(
      `${scenario.width}×${scenario.height}, ${scenario.failure}: mute/volumes survive both directions, storage recovers and external changes are read`,
    );
    await page.close();
  }

  for (const scenario of [
    { raw: '{broken', expected: { muted: false, volume: 35, musicVolume: 20 } },
    {
      raw: JSON.stringify({ muted: true, volume: '0.7' }),
      expected: { muted: false, volume: 35, musicVolume: 20 },
    },
    {
      raw: JSON.stringify({ muted: true, volume: 0.65 }),
      expected: { muted: true, volume: 65, musicVolume: 20 },
    },
    {
      raw: JSON.stringify({ muted: true, volume: 3, musicVolume: -1 }),
      expected: { muted: true, volume: 100, musicVolume: 0 },
    },
  ]) {
    const page = await browser.newPage();
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key,
      raw: scenario.raw,
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await expectMenuSettings(page, scenario.expected);
    await page.close();
  }
  console.log(
    'Malformed, mistyped, legacy and out-of-range settings retain safe validation',
  );
} finally {
  await browser.close();
}
