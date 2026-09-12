import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PACKAGE || 'playwright',
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/tests/pixi-lifecycle.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style></head><body></body></html>',
    }),
  );
  await page.goto('http://127.0.0.1:3000/tests/pixi-lifecycle.html');
  await page.evaluate(async () => {
    const { Renderer } = await import('/app/game/renderer.ts');
    const { establishedGame } = await import('/tests/established-fixture.mjs');
    const state = establishedGame();
    const canvas = document.body.appendChild(document.createElement('canvas'));
    let renderer;
    await new Promise((resolve, reject) => {
      renderer = new Renderer(
        canvas,
        () => state,
        () => {},
        () => {},
        (error) => (error ? reject(new Error(error)) : resolve()),
      );
    });
    window.pixiLifecycle = { renderer, canvas, state };
  });
  const frame = () =>
    page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  const terrainPixels = () =>
    page.evaluate(() => {
      const { scene } = pixiLifecycle.renderer;
      const { pixels } = scene.renderer.extract.pixels({
        target: scene.terrainTexture,
      });
      let opaque = 0;
      // The terrain texture must contain the whole map, including the paved streets.
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) opaque++;
      return opaque;
    });
  await frame();
  const before = await terrainPixels();
  assert.ok(before > 1_000_000, 'Initial terrain is populated');
  const masks = await page.evaluate(async () => {
    const { ASSETS } = await import('/app/game/art.ts');
    const masks = [...pixiLifecycle.renderer.alphaMasks];
    return {
      count: masks.length,
      bytes: masks.reduce((total, [, mask]) => total + mask.byteLength, 0),
      originalBytes: masks.reduce(
        (total, [key]) => total + ASSETS[key].width * ASSETS[key].height * 4,
        0,
      ),
    };
  });
  assert.ok(masks.count > 100, 'The real map assets all have picking masks');
  assert.equal(
    masks.bytes * 4,
    masks.originalBytes,
    'Picking masks retain only alpha, saving 75% of CPU memory',
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await frame();
  assert.equal(
    await page.evaluate(() => pixiLifecycle.canvas.width),
    2048,
    'Changing display density without CSS resize refreshes the canvas backing buffer',
  );
  await page.evaluate(async () => {
    const { renderer, canvas } = pixiLifecycle;
    const extension =
      renderer.scene.renderer.gl.getExtension('WEBGL_lose_context');
    if (!extension)
      throw new Error('The browser must support simulated WebGL context loss');
    const lost = new Promise((resolve) =>
      canvas.addEventListener('webglcontextlost', resolve, { once: true }),
    );
    extension.loseContext();
    await lost;
    pixiLifecycle.extension = extension;
    renderer.setSuspended(true);
  });
  await page.evaluate(async () => {
    const restored = new Promise((resolve) =>
      pixiLifecycle.canvas.addEventListener('webglcontextrestored', resolve, {
        once: true,
      }),
    );
    pixiLifecycle.extension.restoreContext();
    await restored;
    pixiLifecycle.renderer.setSuspended(false);
  });
  await frame();
  assert.equal(
    await terrainPixels(),
    before,
    'Restoring WebGL regenerates every cached terrain pixel',
  );
  // Releasing capture outside pointerup (for example a WebView losing focus)
  // must cancel the drag instead of leaving the camera attached to the pointer.
  await page.mouse.move(200, 200);
  await page.mouse.down();
  await page.mouse.move(240, 240);
  await page.evaluate(() => {
    const { renderer, canvas } = pixiLifecycle;
    if (!renderer.down || !canvas.hasPointerCapture(renderer.down.pointerId))
      throw new Error('Expected an active map drag');
    canvas.releasePointerCapture(renderer.down.pointerId);
  });
  await page.mouse.move(280, 280);
  assert.equal(
    await page.evaluate(() => pixiLifecycle.renderer.down),
    null,
    'Unexpected capture loss cancels the map gesture',
  );
  await page.mouse.up();
  // Separate game views own their GPU resources even when images are browser-cached.
  await page.evaluate(async () => {
    const { Renderer } = await import('/app/game/renderer.ts');
    const canvas = document.body.appendChild(document.createElement('canvas'));
    canvas.style.cssText = 'position:fixed;inset:0';
    await new Promise((resolve, reject) => {
      pixiLifecycle.sibling = new Renderer(
        canvas,
        () => pixiLifecycle.state,
        () => {},
        () => {},
        (error) => (error ? reject(new Error(error)) : resolve()),
      );
    });
  });
  await frame();
  await page.evaluate(() => {
    pixiLifecycle.renderer.destroy();
    pixiLifecycle.renderer.destroy();
  });
  await frame();
  const siblingPixels = await page.evaluate(() => {
    const { scene } = pixiLifecycle.sibling;
    const { pixels } = scene.renderer.extract.pixels({
      target: scene.terrainTexture,
    });
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) opaque++;
    pixiLifecycle.sibling.destroy();
    return opaque;
  });
  assert.equal(
    siblingPixels,
    before,
    'Destroying another view preserves shared image resources',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => {
    // This routed harness does not pass through Vite's HTML transform.
    const { default: refresh } = await import('/@react-refresh');
    refresh.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const {
      default: { createElement },
    } = await import('/node_modules/.vite/deps/react.js');
    const {
      default: { createRoot },
    } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { Sprite } = await import('/app/game/Sprite.tsx');
    const { ASSETS } = await import('/app/game/art.ts');
    const samples = [];
    const originalDraw = Reflect.get(
      CanvasRenderingContext2D.prototype,
      'drawImage',
    );
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (args[0]?.src?.endsWith(ASSETS['unit-death'].src))
        samples.push(args.slice(1, 5));
      return originalDraw.apply(this, args);
    };
    const host = document.body.appendChild(document.createElement('div'));
    host.style.cssText = 'position:fixed;inset:0';
    const root = createRoot(host);
    root.render(
      createElement(Sprite, { asset: 'unit-death', label: 'Death animation' }),
    );
    pixiLifecycle.preview = { root, samples, originalDraw };
  });
  await page.waitForFunction(() =>
    pixiLifecycle.preview.samples.some(([, y]) => y === 128),
  );
  const previewSamples = await page.evaluate(() => {
    const { root, samples, originalDraw } = pixiLifecycle.preview;
    root.unmount();
    CanvasRenderingContext2D.prototype.drawImage = originalDraw;
    return samples;
  });
  assert.ok(
    previewSamples.every(
      ([x, y, width, height]) =>
        x >= 0 &&
        x < 896 &&
        [0, 128].includes(y) &&
        width === 128 &&
        height === 128,
    ),
    'Preview animations sample complete frames across both sprite-sheet rows',
  );
  assert.deepEqual(errors, []);
  console.log(
    `Pixi lifecycle: terrain restoration, lost capture, independent disposal and multi-row previews OK; opacity masks ${(masks.bytes / 1048576).toFixed(1)} MiB instead of ${(masks.originalBytes / 1048576).toFixed(1)} MiB.`,
  );
} finally {
  await browser.close();
}
