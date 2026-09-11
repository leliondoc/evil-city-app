// Local integration check of real decoded buffers, voice arbitration and calibration.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/__sound-mix', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button>Start audio</button>',
    }),
  );
  await page.goto('http://127.0.0.1:3000/__sound-mix');
  await page.evaluate(async () => {
    const { GameAudio } = await import('/app/game/audio.ts');
    window.mix = new GameAudio(
      { muted: false, volume: 0.35, musicVolume: 0 },
      (point) => (point.x > 100 ? null : { pan: 0, gain: 1 }),
      (status) => {
        window.mixStatus = status;
      },
    );
    document.querySelector('button').onclick = () => window.mix.unlock();
  });
  await page.getByRole('button').click();
  await page.waitForFunction(() => window.mixStatus === 'ready');
  const results = await page.evaluate(() => {
    const audio = window.mix;
    const before = audio.active.size;
    audio.play({ kind: 'heavy', point: { x: 999, y: 0 } });
    const offscreen = audio.active.size === before;
    for (const kind of [
      'step-dirt',
      'step-stone',
      'step-wood',
      'step-armor',
      'chop',
      'mine',
      'build',
      'deposit',
      'melee',
      'impact',
      'bow',
      'heavy',
      'fire',
    ])
      audio.play({ kind });
    const full = audio.active.size;
    audio.play({ kind: 'complete' });
    const voices = [...audio.active.values()];
    const containsCompletion = voices.some((v) => v.kind === 'complete');
    const footsteps = voices.filter((v) => v.priority === 0).length;
    const peaks = [...audio.buffers.entries()].map(([name, buffer]) => {
      let peak = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++)
        for (const sample of buffer.getChannelData(c))
          peak = Math.max(peak, Math.abs(sample));
      return peak * audio.calibration.get(name);
    });
    audio.setPaused(true);
    const stopped = audio.active.size === 0;
    audio.dispose();
    return { offscreen, full, containsCompletion, footsteps, stopped, peaks };
  });
  assert.equal(results.offscreen, true);
  assert.equal(results.full, 8);
  assert.equal(
    results.containsCompletion,
    true,
    'Completion remains audible when the mix is busy',
  );
  assert.ok(results.footsteps <= 2);
  assert.equal(results.stopped, true);
  assert.equal(results.peaks.length, 40);
  assert.ok(results.peaks.every((p) => p > 0 && p <= 0.720001));
  console.log(
    'PASS: 40 decoded effects calibrated below peak ceiling; offscreen suppression; 8-voice limit; footsteps capped; completion priority and pause.',
  );
} finally {
  await browser.close();
}
