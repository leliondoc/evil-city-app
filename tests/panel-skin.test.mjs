import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintHealthBar, paintPanel } from '../app/game/panelSkin.ts';

function recorder() {
  const calls = [];
  return {
    calls,
    clearRect() {},
    getTransform() {
      return { a: 1, d: 1, e: 0, f: 0 };
    },
    drawImage(...args) {
      calls.push(args);
    },
  };
}

test('Slate notice repeats only the slate row and preserves horizontal texture scale', () => {
  for (const width of [292, 560, 800]) {
    const ctx = recorder();
    paintPanel(ctx, {}, 'notice-ribbon', width, 64);
    assert.ok(ctx.calls.length > 3);
    for (const [, , sy, sw, sh, dx, , dw, dh] of ctx.calls) {
      assert.ok(sy >= 512 && sy + sh <= 576);
      assert.equal(dw, sw);
      assert.equal(dh, sh);
      assert.ok(dx >= 0 && dx + dw <= width);
    }
  }
});

test('Multiline notices keep the same tail size and pixel proportions', () => {
  for (const height of [64, 100, 180]) {
    const ctx = recorder();
    paintPanel(ctx, {}, 'notice-ribbon', 292, height);
    for (const [, , , sw, sh, , , dw, dh] of ctx.calls) {
      assert.equal(sw, dw);
      assert.equal(sh, dh);
    }
    assert.equal(ctx.calls[0][8], 64);
  }
});

test('Panel joints align to physical pixels at fractional sizes and display scales', () => {
  for (const kind of ['button', 'notice-ribbon', 'ribbon']) {
    for (const scale of [1, 1.25, 1.5, 2]) {
      const ctx = recorder();
      ctx.getTransform = () => ({ a: scale, d: scale, e: 0, f: 0 });
      paintPanel(ctx, {}, kind, 277.33, 76.8);
      for (const [, , , , , x, y, width, height] of ctx.calls) {
        for (const edge of [x, y, x + width, y + height])
          assert.ok(Math.abs(edge * scale - Math.round(edge * scale)) < 1e-8);
      }
    }
  }
});

test('Pack health fill tracks empty, half and full HP without crossing the frame', () => {
  for (const large of [false, true]) {
    const base = {},
      fill = {};
    const height = large ? 51 : 19,
      width = 213;
    const inset = large ? 12 : 7;
    for (const ratio of [-1, 0, 0.5, 1, 2]) {
      const ctx = recorder();
      paintHealthBar(ctx, base, fill, width, height, ratio, large);
      const fillCalls = ctx.calls.filter((call) => call[0] === fill);
      const expected = (width - inset * 2) * Math.max(0, Math.min(1, ratio));
      assert.equal(
        fillCalls.reduce((sum, call) => sum + call[7], 0),
        expected,
      );
      for (const [, , , sw, , dx, dy, dw, dh] of fillCalls) {
        assert.ok(sw > 0 && sw <= 64);
        assert.ok(dx >= inset && dx + dw <= width - inset);
        assert.ok(dy >= 0 && dy + dh <= height);
      }
    }
  }
});
