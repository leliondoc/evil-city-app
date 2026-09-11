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
const output = await mkdtemp(join(tmpdir(), 'evil-pixi-'));
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A local-only harness loads the real renderer without adding debug globals to the game.
  await page.route('**/tests/pixi-harness.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style></head><body></body></html>',
    }),
  );
  await page.goto('http://127.0.0.1:3000/tests/pixi-harness.html');
  await page.evaluate(async () => {
    const { Renderer } = await import('/app/game/renderer.ts');
    const { establishedGame } = await import('/tests/established-fixture.mjs');
    const { recruit, tick, commandUnits } = await import('/app/game/engine.ts');
    const font = new FontFace(
      'Pixel Operator',
      'url(/fonts/PixelOperator-Regular.ttf)',
    );
    document.fonts.add(await font.load());
    const state = establishedGame();
    state.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
    Object.assign(state.lots[4], { kind: 'forge', owned: true });
    recruit(state, 'troll');
    recruit(state, 'troll');
    tick(state, 7);
    state.attackOrder = undefined;
    state.enemies = [
      {
        id: state.nextId++,
        kind: 'guard',
        x: 16,
        y: 20.2,
        hp: 60,
        maxHp: 100,
        path: [],
        facing: 1,
        fighting: false,
      },
    ];
    const fighters = state.units.filter((u) => u.kind === 'troll');
    fighters.forEach((u, i) =>
      Object.assign(u, {
        x: 10 + i * 2,
        y: 20.2,
        hp: 50,
        path: [],
        task: 'idle',
        fighting: false,
      }),
    );
    state.lots[1].hp *= 0.5;
    const canvas = document.body.appendChild(document.createElement('canvas'));
    const commands = [];
    let renderer;
    const select = (selection) => {
      renderer.selection = selection;
    };
    const command = (point, target) =>
      commands.push(
        commandUnits(
          state,
          renderer.selection.type === 'unit'
            ? [renderer.selection.id]
            : renderer.selection.ids || [],
          target,
          point,
        ),
      );
    // Exercise React StrictMode's create/dispose/create sequence on the same canvas.
    new Renderer(
      canvas,
      () => state,
      () => {},
      () => {},
      () => {},
    ).destroy();
    await new Promise((resolve, reject) => {
      renderer = new Renderer(
        canvas,
        () => state,
        select,
        command,
        (error) => (error ? reject(new Error(error)) : resolve()),
      );
    });
    window.pixiTest = { state, renderer, canvas, select, commands, fighters };
    select({ type: 'unit', id: fighters[0].id });
  });
  const frame = () =>
    page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  await frame();
  assert.deepEqual(
    await page.evaluate(() => ({
      backend: pixiTest.canvas.dataset.renderer,
      twoD: !!pixiTest.canvas.getContext('2d'),
      width: pixiTest.canvas.width,
    })),
    { backend: 'pixi-webgl', twoD: false, width: 2880 },
  );
  // Read the rendered GPU pixels, not just the drawing instructions.
  const colors = await page.evaluate(() => {
    const { scene } = pixiTest.renderer;
    const { pixels } = scene.renderer.extract.pixels({ target: scene.stage });
    const expected = ['fff1af', '9ed779', 'ef7972', 'bed27c', '293333'];
    return Object.fromEntries(
      expected.map((color) => {
        const rgb = [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (rgb.every((v, j) => pixels[i + j] === v)) count++;
        return [color, count];
      }),
    );
  });
  for (const [color, count] of Object.entries(colors))
    assert.ok(count > 5, `Original map color #${color} is visible: ${count}`);
  await page.screenshot({ path: join(output, 'health-and-selection.png') });
  async function clickTarget(target) {
    const point = await page.evaluate((target) => {
      const r = pixiTest.renderer;
      const bounds = r.hits.find(
        (h) => h.selection.type === target.type && h.selection.id === target.id,
      );
      if (!bounds)
        throw new Error(`Missing hit bounds: ${JSON.stringify(target)}`);
      for (let y = bounds.y; y < bounds.y + bounds.h; y += 2)
        for (let x = bounds.x; x < bounds.x + bounds.w; x += 2) {
          const p = {
            x: r.origin.x + x * r.scale,
            y: r.origin.y + y * r.scale,
          };
          const hit = r.hit(p);
          if (hit?.type === target.type && hit.id === target.id) return p;
        }
      throw new Error('No visible clickable pixel');
    }, target);
    await page.mouse.click(point.x, point.y);
    await frame();
  }
  const enemy = await page.evaluate(() => ({
    type: 'enemy',
    id: pixiTest.state.enemies[0].id,
  }));
  await clickTarget(enemy);
  assert.deepEqual(
    await page.evaluate(() => pixiTest.state.attackOrder.target),
    enemy,
  );
  assert.equal(await page.evaluate(() => pixiTest.commands.at(-1)), '');
  assert.equal(
    await page.evaluate(() => {
      const { scene } = pixiTest.renderer;
      return scene.actors.container.children.some(
        (n) => n.visible && n.texture?.source === scene.textures.get('ui-back'),
      );
    }),
    true,
    'Accepted individual attacks display the orange arrow',
  );
  await page.screenshot({ path: join(output, 'individual-attack.png') });
  await page.evaluate(() =>
    pixiTest.select({
      type: 'units',
      ids: [pixiTest.state.units[0].id, pixiTest.fighters[0].id],
    }),
  );
  await clickTarget({ type: 'lot', id: 1 });
  assert.deepEqual(
    await page.evaluate(() => pixiTest.state.attackOrder.target),
    { type: 'lot', id: 1 },
  );
  assert.equal(
    await page.evaluate(() => pixiTest.fighters[1].task),
    'idle',
    'Unselected fighters keep their orders',
  );
  const count = await page.evaluate(() => pixiTest.commands.length);
  await page.keyboard.down('Shift');
  await clickTarget(enemy);
  await page.keyboard.up('Shift');
  assert.deepEqual(
    await page.evaluate(() => pixiTest.renderer.selection),
    enemy,
    'Shift allows inspecting enemies while fighters are selected',
  );
  assert.equal(await page.evaluate(() => pixiTest.commands.length), count);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.evaluate(() => {
    pixiTest.renderer.zoomBy(1.5);
    pixiTest.renderer.pan(30, 20);
    pixiTest.state.lots[1].owned = true;
  });
  await frame();
  assert.equal(await page.evaluate(() => pixiTest.canvas.width), 1800);
  await page.evaluate(() => {
    pixiTest.renderer.destroy();
    pixiTest.renderer.destroy();
  });
  await frame();
  assert.deepEqual(errors, []);
  console.log(
    `Pixi WebGL, original HP bars/circle, individual/group clicks, arrow, Shift inspection, DPR/resize, terrain refresh and disposal OK. Screenshots: ${output}`,
  );
} finally {
  await browser.close();
}
