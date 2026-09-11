import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintHealthBar, paintPanel } from '../app/game/panelSkin.ts';

function recorder() {
  const calls = [];
  return {
    calls,
    clearRect() {},
    drawImage(...args) {
      calls.push(args);
    },
  };
}

test('Yellow notice repeats only the yellow row and preserves horizontal texture scale', () => {
  for (const width of [292, 560, 800]) {
    const ctx = recorder();
    paintPanel(ctx, {}, 'yellow-ribbon', width, 64);
    assert.ok(ctx.calls.length > 3);
    for (const [, , sy, sw, sh, dx, , dw, dh] of ctx.calls) {
      assert.ok(sy >= 256 && sy + sh <= 320);
      assert.equal(dw, sw);
      assert.equal(dh, sh);
      assert.ok(dx >= 0 && dx + dw <= width);
    }
  }
});

test('Multiline yellow notices keep the same tail size and pixel proportions', () => {
  for (const height of [64, 100, 180]) {
    const ctx = recorder();
    paintPanel(ctx, {}, 'yellow-ribbon', 292, height);
    for (const [, , , sw, sh, , , dw, dh] of ctx.calls) {
      assert.equal(sw, dw);
      assert.equal(sh, dh);
    }
    assert.equal(ctx.calls[0][8], 64);
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
