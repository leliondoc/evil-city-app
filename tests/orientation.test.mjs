import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestLandscape } from '../app/game/orientation.ts';

test('Touch launch requests fullscreen before landscape; denial and unsupported devices are safe', async () => {
  const keys = ['navigator', 'matchMedia', 'screen', 'document'];
  const original = keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  const set = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, value });
  try {
    const calls = [];
    set('navigator', { maxTouchPoints: 1 });
    set('matchMedia', () => ({ matches: false }));
    set('document', { documentElement: { requestFullscreen: async () => calls.push('fullscreen') } });
    set('screen', { orientation: { lock: async mode => calls.push(mode) } });
    assert.equal(await requestLandscape(), true);
    assert.deepEqual(calls, ['fullscreen', 'landscape']);
    calls.length = 0;
    document.documentElement.requestFullscreen = async () => { throw new Error('Denied'); };
    assert.equal(await requestLandscape(), true, 'Standalone orientation lock can work without fullscreen');
    assert.deepEqual(calls, ['landscape']);
    screen.orientation.lock = async () => { throw new Error('Unsupported'); };
    assert.equal(await requestLandscape(), false);
    set('screen', { orientation: {} });
    assert.equal(await requestLandscape(), false);
    set('navigator', { maxTouchPoints: 0 });
    assert.equal(await requestLandscape(), false);
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
