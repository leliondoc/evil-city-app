import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.musicElements = new Set();
    window.effects = [];
    const play = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'play',
    ).value;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.src.includes('/audio/') && this.src.endsWith('.mp3')) {
        window.musicElements.add(this);
        window.currentMusic = this;
      }
      return play.apply(this, args);
    };
    const start = Object.getOwnPropertyDescriptor(
      AudioBufferSourceNode.prototype,
      'start',
    ).value;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.effects.push(this.buffer?.duration);
      return start.apply(this, args);
    };
  });
  const music = () =>
    page.evaluate(() => ({
      src: window.currentMusic.src,
      time: window.currentMusic.currentTime,
      paused: window.currentMusic.paused,
      loop: window.currentMusic.loop,
      playing: [...window.musicElements].filter((element) => !element.paused)
        .length,
    }));
  const waitTrack = (name) =>
    page.waitForFunction(
      (name) =>
        window.currentMusic?.src.includes(name) &&
        window.currentMusic.currentTime > 0.05 &&
        !window.currentMusic.paused,
      name,
    );
  const finishTrack = () =>
    page.evaluate(() => window.currentMusic.dispatchEvent(new Event('ended')));
  await page.goto(base);
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await waitTrack('menu-music.mp3');
  assert.equal((await music()).loop, true);
  await page.evaluate(() => {
    window.menuMusic = window.currentMusic;
  });
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  assert.equal(
    await page.evaluate(
      () => window.menuMusic.paused && !window.menuMusic.getAttribute('src'),
    ),
    true,
  );

  // The fixture exposes only the simulation; the real game still consumes its
  // events, chooses music and plays the actual MP3s through Web Audio.
  await page.goto(`${base}/tests/pack-preview.html`);
  await page.locator('.world-canvas[data-ready=true]').waitFor();
  const hold = () =>
    page
      .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
      .click();
  const release = () =>
    page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await hold();
  await waitTrack('/alkakrab/');
  const ambient = (await music()).src;
  await page.evaluate(() => {
    window.currentMusic.currentTime = 3;
  });
  const raid = async (kind) => {
    const before = await page.evaluate((kind) => {
      const state = window.packState;
      state.economy.stocks = { gold: 1000, food: 1000, wood: 1000 };
      state.economy.nextUpgradeAt = Infinity;
      Object.assign(state.mobilization[kind], {
        active: true,
        nextRaidAt: state.elapsed,
      });
      return state.mobilization[kind].waves;
    }, kind);
    await release();
    await page.waitForFunction(
      ({ kind, before }) => window.packState.mobilization[kind].waves > before,
      { kind, before },
    );
    await hold();
  };
  await raid('guard');
  await waitTrack('human-theme.mp3');
  assert.equal((await music()).loop, false);
  assert.equal((await music()).playing, 1);
  await page.evaluate(() => {
    window.currentMusic.currentTime = 8;
  });
  await raid('guard');
  assert.ok(
    (await music()).time >= 8,
    'Reinforcements do not restart the same theme',
  );
  await raid('hero');
  await waitTrack('guild-theme.mp3');
  assert.equal((await music()).loop, false);
  assert.equal((await music()).playing, 1);

  await page.evaluate(() => {
    window.packState.lots
      .filter((lot) => !['hall', 'guild'].includes(lot.kind))
      .slice(0, 6)
      .forEach((lot) => {
        lot.owned = true;
      });
  });
  await release();
  await page.waitForFunction(
    () => window.packState.lots.filter((lot) => lot.owned).length >= 6,
  );
  await hold();
  assert.ok(
    (await music()).src.endsWith('guild-theme.mp3'),
    'The milestone waits for combat music',
  );
  await finishTrack();
  await waitTrack('dark-theme.mp3');
  assert.equal((await music()).loop, false);
  await finishTrack();
  await waitTrack('/alkakrab/');
  assert.equal((await music()).src, ambient);
  assert.ok(
    (await music()).time >= 3,
    'The interrupted ambient track resumes in place',
  );

  await page
    .getByRole('button', { name: 'Couper le son', exact: true })
    .click();
  await raid('hero');
  assert.equal((await music()).src, ambient);
  await page
    .getByRole('button', { name: 'Activer le son', exact: true })
    .click();
  await waitTrack('/alkakrab/');
  assert.equal(
    (await music()).src,
    ambient,
    'Muted attacks are consumed without later replay',
  );

  // Interrupt an existing musical break, then restore its remaining silence.
  await finishTrack();
  assert.equal((await music()).paused, true);
  await raid('guard');
  await waitTrack('human-theme.mp3');
  await finishTrack();
  assert.equal((await music()).paused, true);
  assert.equal((await music()).src, ambient);

  const upgradeDuration = await page.evaluate(async () => {
    const response = await fetch('/audio/building-upgrade.mp3');
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(await response.arrayBuffer());
    await context.close();
    const { upgrade } = await import('/app/game/engine.ts');
    const state = window.packState;
    state.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
    const error = upgrade(state, 7);
    if (error) throw Error(error);
    state.lots[7].upgrading.remaining = 0.05;
    window.effects = [];
    return decoded.duration;
  });
  await release();
  await page.waitForFunction(
    (duration) =>
      window.effects.some((actual) => Math.abs(actual - duration) < 0.001),
    upgradeDuration,
  );
  await hold();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: menu MP3, distinct guard/guild themes, no loops or overlap/restarts, queued 60% milestone, ambient resume/break preservation, muted event consumption and real upgrade MP3 playback.',
  );
} finally {
  await browser.close();
}
