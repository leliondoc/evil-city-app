import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readUnlockedChapter,
  completeChapter,
  readUIScale,
  saveUIScale,
} from '../app/game/preferences.ts';

test('Chapter progress is monotonic and malformed preferences use defaults', () => {
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    assert.equal(readUnlockedChapter(), 1);
    assert.equal(readUIScale(), 1);
    assert.equal(completeChapter('refuge'), 2);
    assert.equal(completeChapter('faubourg'), 3);
    assert.equal(completeChapter('refuge'), 3);
    saveUIScale(1.3);
    assert.equal(readUIScale(), 1.3);
    for (const value of ['NaN', '99', '0', 'null', '{}', 'Infinity', '-1']) {
      values.set('evil-city-campaign-v1', value);
      values.set('evil-city-ui-scale-v1', value);
      assert.equal(readUnlockedChapter(), 1);
      assert.equal(readUIScale(), 1);
    }
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('Unavailable browser storage never blocks playing or adjusting the interface', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error('Denied');
    },
    setItem() {
      throw new Error('Denied');
    },
  };
  try {
    assert.equal(readUnlockedChapter(), 1);
    assert.equal(readUIScale(), 1);
    assert.equal(completeChapter('faubourg'), 3);
    assert.doesNotThrow(() => saveUIScale(0.8));
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
