// Exercise real menu playback across remounts, reloads and browser autoplay rules.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';

async function inspectAudio(page) {
  await page.addInitScript(() => {
    window.musicGraphs = [];
    const connect = Object.getOwnPropertyDescriptor(
      AudioNode.prototype,
      'connect',
    ).value;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (this instanceof MediaElementAudioSourceNode)
        window.musicGraphs.push({
          audio: this.mediaElement,
          context: this.context,
          nodes: [this],
          gains: [],
        });
      for (const graph of window.musicGraphs) {
        if (graph.nodes.includes(this) && !graph.nodes.includes(destination)) {
          graph.nodes.push(destination);
          if (destination instanceof GainNode) graph.gains.push(destination);
        }
      }
      return connect.call(this, destination, ...args);
    };
  });
}

async function audible(page, menu) {
  await page.waitForFunction(
    (menu) =>
      window.musicGraphs.some(
        ({ audio, context, gains }) =>
          audio.getAttribute('src') &&
          audio.src.endsWith('/menu-music.mp3') === menu &&
          !audio.paused &&
          context.state === 'running' &&
          audio.currentTime > 0.1 &&
          gains.reduce((gain, node) => gain * node.gain.value, 1) > 0.025,
      ),
    menu,
    { timeout: 8000 },
  );
  assert.equal(
    await page.evaluate(
      () => window.musicGraphs.filter(({ audio }) => !audio.paused).length,
    ),
    1,
    'Only one music stream plays at a time',
  );
}

for (const scenario of [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 1280, height: 800, touch: false, autoplay: true },
]) {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    args: scenario.autoplay
      ? ['--autoplay-policy=no-user-gesture-required']
      : [],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
      hasTouch: scenario.touch,
      isMobile: scenario.touch,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await inspectAudio(page);
    const press = (locator) =>
      scenario.touch ? locator.tap() : locator.click();
    const gesture = () => press(page.locator('.start-tagline'));
    await page.goto(base);
    await page.locator('.start-menu').waitFor();
    if (!scenario.autoplay) await gesture();
    await audible(page, true);

    await press(page.getByRole('button', { name: 'Jouer', exact: true }));
    await page.locator('.world-canvas[data-ready=true]').waitFor();
    if (scenario.touch)
      await press(
        page.getByRole('button', { name: 'Fermer les détails', exact: true }),
      );
    await press(
      page.getByRole('button', { name: 'Ouvrir les paramètres', exact: true }),
    );
    await audible(page, false);
    await press(page.getByRole('button', { name: 'Fermer', exact: true }));

    for (let round = 0; round < 2; round++) {
      await press(
        page.getByRole('button', {
          name: 'Ouvrir les paramètres',
          exact: true,
        }),
      );
      await press(
        page.getByRole('button', {
          name: 'Menu principal · Garder la partie',
          exact: true,
        }),
      );
      await page
        .getByRole('button', { name: 'Reprendre', exact: true })
        .waitFor();
      // No extra click, tap or key is allowed to conceal a missing automatic start.
      await audible(page, true);
      await press(page.getByRole('button', { name: 'Reprendre', exact: true }));
      await audible(page, false);
    }

    // A manually paused game must not leave the menu music paused too.
    await press(
      page.getByRole('button', { name: 'Mettre en pause', exact: true }),
    );
    await press(
      page.getByRole('button', { name: 'Ouvrir les paramètres', exact: true }),
    );
    await press(
      page.getByRole('button', {
        name: 'Menu principal · Garder la partie',
        exact: true,
      }),
    );
    await audible(page, true);

    // AudioContext interruptions must pause the media and restart its fade on resume.
    await page.evaluate(async () => {
      window.menuGraph = window.musicGraphs.find(({ audio }) =>
        audio.getAttribute('src')?.endsWith('/menu-music.mp3'),
      );
      await window.menuGraph.context.suspend();
    });
    await page.waitForFunction(() => window.menuGraph.audio.paused);
    await page.evaluate(() => window.menuGraph.context.resume());
    await audible(page, true);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(
      await page.evaluate(() => window.menuGraph.audio.paused),
      true,
    );
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await audible(page, true);

    await page.reload();
    await page.locator('.start-menu').waitFor();
    // A browser that permits autoplay must restart without an extra interaction.
    // Strict browsers still start on the first actual touch/click after reloading.
    if (!scenario.autoplay) await gesture();
    await audible(page, true);
    await press(
      page.getByRole('button', { name: 'Couper le son', exact: true }),
    );
    await page.reload();
    await page.locator('.start-menu').waitFor();
    assert.equal(
      await page.evaluate(() => window.musicGraphs.length),
      0,
      'Saved mute prevents automatic playback and audio context creation',
    );
    await press(
      page.getByRole('button', { name: 'Activer le son', exact: true }),
    );
    await audible(page, true);
    assert.deepEqual(errors, [], 'No browser errors');
    console.log(
      `PASS ${scenario.width}×${scenario.height}, autoplay ${scenario.autoplay ? 'allowed' : 'default'}: return, resume, pause, reload, mute and single-stream playback.`,
    );
  } finally {
    await browser.close();
  }
}
