// Measure the real Web Audio gain while streaming the original MP3 files.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:3000');
  await page.evaluate(async () => {
    window.graphs = [];
    const connect = Object.getOwnPropertyDescriptor(
      AudioNode.prototype,
      'connect',
    ).value;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (this instanceof MediaElementAudioSourceNode)
        window.graphs.push({
          audio: this.mediaElement,
          context: this.context,
          nodes: [this],
          gains: [],
        });
      for (const graph of window.graphs) {
        if (graph.nodes.includes(this) && !graph.nodes.includes(destination)) {
          graph.nodes.push(destination);
          if (destination instanceof GainNode) graph.gains.push(destination);
        }
      }
      return connect.call(this, destination, ...args);
    };
    const { GameMusic } = await import('/app/game/music.ts');
    window.testContext = new AudioContext();
    await window.testContext.resume();
    window.testMusic = new GameMusic('/');
    window.testMusic.configure(false, 0.5);
    window.testMusic.unlock(window.testContext);
  });
  const sample = () =>
    page.evaluate(() => {
      const graph = window.graphs[0];
      return {
        src: graph.audio.src,
        time: graph.audio.currentTime,
        remaining: graph.audio.duration - graph.audio.currentTime,
        paused: graph.audio.paused,
        gain: graph.gains.reduce((gain, node) => gain * node.gain.value, 1),
        sources: window.graphs.length,
      };
    });
  const track = (name) =>
    page.waitForFunction((name) => {
      const audio = window.graphs[0]?.audio;
      return (
        audio?.src.includes(name) &&
        !audio.paused &&
        !audio.seeking &&
        audio.readyState >= 3 &&
        Number.isFinite(audio.duration) &&
        audio.currentTime > 0.02
      );
    }, name);
  const delay = (ms) => page.waitForTimeout(ms);
  await track('/alkakrab/');
  const beginning = await sample();
  assert.ok(beginning.gain < 0.12, 'Music begins close to silence');
  await delay(700);
  const early = await sample();
  assert.ok(early.gain > beginning.gain && early.gain < 0.25);
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) {
      window.testMusic.configure(false, 0.5);
      window.testMusic.unlock(window.testContext);
    }
  });
  const clicked = await sample();
  assert.ok(
    Math.abs(clicked.gain - early.gain) < 0.04,
    'Ordinary interactions do not bypass or restart the intro',
  );
  await delay(1900);
  assert.ok((await sample()).gain > 0.48);

  await page.evaluate(() => window.testMusic.playTheme('human'));
  assert.equal(
    (await sample()).src,
    beginning.src,
    'Keep playing the outgoing track during its fade',
  );
  await delay(450);
  const outgoing = await sample();
  assert.ok(outgoing.gain > 0.15 && outgoing.gain < 0.4);
  await page.evaluate(() => {
    window.testMusic.playTheme('guild');
    window.testMusic.playTheme('guild');
  });
  await track('guild-theme.mp3');
  const incoming = await sample();
  assert.ok(incoming.gain < 0.12, 'The hero theme fades in from silence');
  assert.equal(incoming.sources, 1, 'Only one music source is used');
  await delay(2700);
  const established = await sample();
  await page.evaluate(() => window.testMusic.playTheme('guild'));
  assert.ok(
    (await sample()).time >= established.time,
    'Reinforcements do not restart the theme',
  );
  assert.ok((await sample()).gain > 0.48);

  await page.evaluate(() => window.testMusic.playTheme('human'));
  await delay(300);
  await page.evaluate(() => window.testMusic.setPaused(true));
  await page.waitForFunction(
    () =>
      window.graphs[0].gains.reduce(
        (gain, node) => gain * node.gain.value,
        1,
      ) === 0,
  );
  const paused = await sample();
  await delay(1300);
  assert.deepEqual(
    await sample(),
    paused,
    'Pause freezes a transition and its playback position',
  );
  assert.equal(paused.paused, true);
  assert.equal(paused.gain, 0);
  await page.evaluate(() => window.testMusic.setPaused(false));
  await track('human-theme.mp3');
  assert.ok(
    (await sample()).gain < 0.12,
    'The accepted attack enters gently after resuming',
  );
  await page.evaluate(() => window.testMusic.configure(false, 0.25));
  await delay(2700);
  assert.ok(Math.abs((await sample()).gain - 0.25) < 0.01);

  // Seek ahead, then let the genuine final seconds play and emit a real ended event.
  async function outro() {
    await page.evaluate(() => {
      const audio = window.graphs[0].audio;
      audio.currentTime = audio.duration - 9;
    });
    const levels = [];
    for (const seconds of [5.5, 3, 0.6]) {
      await page.waitForFunction((seconds) => {
        const audio = window.graphs[0].audio;
        const remaining = audio.duration - audio.currentTime;
        return remaining > 0 && remaining <= seconds;
      }, seconds);
      levels.push((await sample()).gain);
      // A saved volume applied again must not erase the scheduled ending fade.
      await page.evaluate(() => {
        window.testMusic.configure(false, 0.25);
        window.testMusic.unlock(window.testContext);
      });
    }
    assert.ok(levels[0] > levels[1] && levels[1] > levels[2]);
    assert.ok(levels[0] > 0.18 && levels[1] < 0.15 && levels[2] < 0.04);
    return levels;
  }
  const themeOutro = await outro();
  await track('/alkakrab/');
  const resumed = await sample();
  assert.equal(resumed.src, beginning.src);
  assert.ok(
    resumed.time >= outgoing.time,
    'The ambient track resumes after the part heard during the fade',
  );
  assert.ok(resumed.gain < 0.12, 'Returning to ambience also fades in');
  const ordinaryOutro = await outro();
  await page.waitForFunction(() => window.graphs[0].audio.ended);
  assert.equal((await sample()).paused, true);
  assert.equal((await sample()).gain, 0);
  await page.evaluate(() => {
    window.testMusic.configure(false, 0.5);
    window.testMusic.unlock(window.testContext);
  });
  assert.equal(
    (await sample()).paused,
    true,
    'The natural fade does not shorten the musical break',
  );

  await page.evaluate(() => window.testMusic.playTheme('guild'));
  await track('guild-theme.mp3');
  await page.evaluate(() => {
    window.testMusic.playTheme('human');
    window.testMusic.dispose();
  });
  await delay(1400);
  assert.equal(
    await page.evaluate(() => window.graphs[0].audio.getAttribute('src')),
    null,
  );
  assert.equal(
    (await sample()).paused,
    true,
    'Disposal cancels any delayed track change',
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ themeOutro, ordinaryOutro }));
  console.log(
    'PASS: measured intros, outgoing and incoming attack fades, natural endings, repeat suppression, pause, volume independence, ambient resume, silence and disposal with real MP3 playback.',
  );
} finally {
  await browser.close();
}
