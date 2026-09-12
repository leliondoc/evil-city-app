import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { establishedGame } from './established-fixture.mjs';
import { commandUnit, commandUnits, moveUnit } from '../app/game/engine.ts';

test('Invalid path and visibility coordinates terminate without blocking the simulation', () => {
  // A subprocess bounds a regression to a synchronous infinite pathfinding loop.
  const engineUrl = new URL('../app/game/engine.ts', import.meta.url).href;
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types', '--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      import { findPath, clearShot } from ${JSON.stringify(engineUrl)};
      const valid = { x: 6, y: 29.5 };
      for (const value of [NaN, Infinity, -Infinity]) {
        for (const invalid of [{ x: value, y: 21 }, { x: 6, y: value }]) {
          assert.deepEqual(findPath(valid, invalid), []);
          assert.deepEqual(findPath(invalid, valid), []);
          assert.equal(clearShot(valid, invalid), false);
          assert.equal(clearShot(invalid, valid), false);
        }
      }
      for (const value of [Number.MAX_VALUE, -Number.MAX_VALUE, 1e100]) {
        assert.equal(clearShot(valid, { x: value, y: 21 }), false);
        assert.equal(clearShot({ x: value, y: 21 }, valid), false);
      }
    `,
  ], { encoding: 'utf8', timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('Malformed movement commands preserve previous tasks and paths, including group orders', () => {
  const s = establishedGame();
  const ids = s.units.map((u) => u.id);
  const first = s.units[0];
  first.manualRest = true;
  first.task = 'rest';
  first.target = 3;
  first.path = [{ x: 6, y: 19.5 }];
  const before = structuredClone(s.units);
  for (const value of [NaN, Infinity, -Infinity]) {
    for (const point of [{ x: value, y: 21 }, { x: 6, y: value }]) {
      assert.match(commandUnit(s, first.id, null, point), /invalide/);
      assert.match(commandUnits(s, ids, null, point), /invalide/);
      moveUnit(s, first.id, point);
      assert.deepEqual(s.units, before);
    }
  }
});

test('A dead unit awaiting cleanup cannot receive a new movement task', () => {
  const s = establishedGame();
  const u = s.units[0];
  u.hp = 0;
  const before = structuredClone(u);
  moveUnit(s, u.id, { x: 11, y: 21 });
  assert.deepEqual(u, before);
});
