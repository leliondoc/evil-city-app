// Test the distributed game under a nested URL, with every external request blocked.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { extname, resolve, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { chromium, webkit } from 'playwright';

const root = resolve(process.env.GAME_DIST || 'dist');
await readFile(join(root, 'index.html'));
const prefix = '/portable/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (!path.startsWith(prefix)) throw new Error('Outside the packaged game');
    const file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + sep)) throw new Error('Outside dist');
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': content.length,
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = origin + prefix;
const screenshots = await mkdtemp(join(tmpdir(), 'evil-city-build-'));

async function closeDetails(page) {
  const close = page.getByRole('button', {
    name: 'Fermer les détails',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
}

try {
  for (const name of (
    process.env.PLAYWRIGHT_BROWSERS || 'chromium,webkit'
  ).split(',')) {
    const browserType = { chromium, webkit }[name];
    assert.ok(browserType, `Unknown browser: ${name}`);
    const browser = await browserType.launch({
      headless: true,
      ...(name === 'chromium' && process.env.PLAYWRIGHT_CHANNEL
        ? { channel: process.env.PLAYWRIGHT_CHANNEL }
        : {}),
    });
    try {
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
      ]) {
        const context = await browser.newContext({
          viewport,
          hasTouch: viewport.width < 1000,
          isMobile: viewport.width < 1000,
          reducedMotion: 'reduce',
        });
        const external = [],
          failures = [],
          errors = [];
        await context.route('**/*', (route) => {
          if (new URL(route.request().url()).origin !== origin) {
            external.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        });
        await context.addInitScript(() => {
          localStorage.setItem(
            'evil-city-audio-v1',
            JSON.stringify({ muted: true, volume: 0.35, musicVolume: 0.2 }),
          );
        });
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => {
          if (response.status() >= 400)
            failures.push(`${response.status()} ${response.url()}`);
        });
        await page.goto(url);
        await page.getByRole('button', { name: 'Jouer', exact: true }).click();
        await page.locator('.world-canvas[data-ready=true]').waitFor();
        await closeDetails(page);
        await page
          .getByRole('button', { name: 'Mettre en pause', exact: true })
          .click();
        assert.equal(await page.locator('.world-canvas').isVisible(), true);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.equal(await page.locator('.loading-art').count(), 0);

        // Browser/OS shortcuts must never recruit or spend resources.
        if (viewport.width < 1000)
          await page
            .getByRole('navigation', { name: 'Navigation du jeu' })
            .getByRole('button', { name: 'Recruter', exact: true })
            .click();
        else
          await page
            .getByRole('tab', { name: 'Recruter des créatures', exact: true })
            .click();
        const resources = await page
          .locator('.resource strong')
          .allTextContents();
        for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
          await page.evaluate((modifier) => {
            document.body.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: '1',
                code: 'Digit1',
                bubbles: true,
                [modifier]: true,
              }),
            );
          }, modifier);
          assert.deepEqual(
            await page.locator('.resource strong').allTextContents(),
            resources,
          );
          assert.equal(await page.locator('.recruit-progress').count(), 0);
        }
        await page.evaluate(() =>
          document.body.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: '1',
              code: 'Digit1',
              bubbles: true,
            }),
          ),
        );
        await page.locator('.recruit-progress').first().waitFor();
        assert.notDeepEqual(
          await page.locator('.resource strong').allTextContents(),
          resources,
        );
        if (viewport.width < 1000)
          await page
            .getByRole('button', { name: 'Retour à la carte', exact: true })
            .click();

        await page.screenshot({
          path: join(screenshots, `${name}-${viewport.width}.png`),
        });
        await page
          .getByRole('button', { name: 'Ouvrir les paramètres', exact: true })
          .click();
        await page
          .getByRole('button', {
            name: 'Menu principal · Garder la partie',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', { name: 'Reprendre', exact: true })
          .click();
        await page.locator('.world-canvas[data-ready=true]').waitFor();
        assert.deepEqual(
          external,
          [],
          'The packaged game needs no external service',
        );
        assert.deepEqual(
          failures,
          [],
          'Every asset resolves under the installation prefix',
        );
        assert.deepEqual(errors, [], 'No runtime errors');
        await context.close();
        console.log(
          `${name} ${viewport.width}x${viewport.height}: packaged assets, responsive UI, keyboard, recruitment, menu/resume OK`,
        );
      }

      // Suspense only handles waiting: an import error must offer a usable recovery.
      // WebKit can cache failed modulepreloads even across reloads (bug 270357).
      for (const failure of ['network', 'http']) {
        const context = await browser.newContext();
        await context.addInitScript(() =>
          localStorage.setItem(
            'evil-city-audio-v1',
            JSON.stringify({ muted: true, volume: 0.35, musicVolume: 0.2 }),
          ),
        );
        const page = await context.newPage();
        const recoveryErrors = [];
        page.on('pageerror', (error) => recoveryErrors.push(error.message));
        await page.route('**/assets/Game-*.js', (route) =>
          failure === 'network'
            ? route.abort()
            : route.fulfill({
                status: 503,
                headers: { 'Cache-Control': 'no-store' },
                contentType: 'text/plain',
                body: 'Temporarily unavailable',
              }),
        );
        await page.goto(url);
        await page.getByRole('button', { name: 'Jouer', exact: true }).click();
        await page
          .getByRole('alert')
          .filter({ hasText: 'Le quartier n’a pas pu s’ouvrir' })
          .waitFor();
        await page.unroute('**/assets/Game-*.js');
        await Promise.all([
          page.waitForEvent('load'),
          page
            .getByRole('button', { name: 'Recharger le jeu', exact: true })
            .click(),
        ]);
        await page.getByRole('button', { name: 'Jouer', exact: true }).click();
        await page
          .locator('.world-canvas[data-ready=true]')
          .waitFor()
          .catch(async (error) => {
            console.error({
              recoveryErrors,
              body: await page.locator('body').innerText(),
            });
            throw error;
          });
        await context.close();
        console.log(
          `${name}: failed ${failure} game import and reload recovery OK`,
        );
      }
    } finally {
      await browser.close();
    }
  }
  // Keep this server responsive while the audio UI check runs in its own process.
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/check-audio-settings.mjs'],
      {
        env: {
          ...process.env,
          GAME_URL: url,
          PLAYWRIGHT_CHANNEL:
            process.env.PLAYWRIGHT_CHANNEL || 'chromium-headless-shell',
        },
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`Packaged audio settings check failed (${signal || code})`),
        );
    });
  });
  console.log(`Screenshots: ${screenshots}`);
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
