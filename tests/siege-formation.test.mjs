import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { commandUnits, findPath, entrance, tick, atSiegePosition } from '../app/game/engine.ts';

test('Siege attackers enter through the gate then occupy distinct sides of a building', () => {
  const s = establishedGame();
  const lot = s.lots[3];
  lot.owned = false;
  lot.kind = 'house';
  lot.hp = lot.maxHp = 100000;
  s.enemies = [];
  s.units = Array.from({ length: 9 }, () => ({ ...structuredClone(s.units[0]), id: s.nextId++, kind: 'troll', hp: 120, ...entrance(s.lots[6]), nextMealAt: Infinity, nextRestAt: Infinity }));
  assert.equal(commandUnits(s, s.units.map(u => u.id), { type: 'lot', id: lot.id }, entrance(lot)), '');
  assert.equal(new Set(s.units.map(u => JSON.stringify(u.siegePosition))).size, 9);
  for (const u of s.units) {
    assert.deepEqual(u.path.at(-1), entrance(lot));
    const route = findPath(entrance(lot), u.siegePosition);
    assert.ok(route.length);
    for (const p of route) {
      assert.ok(p.x >= lot.x && p.x < lot.x + 8 && p.y >= lot.y && p.y < lot.y + 8);
      assert.ok(!(p.x >= lot.x + 1 && p.x < lot.x + 7 && p.y >= lot.y + 1 && p.y < lot.y + 6), 'Never traverse building walls');
    }
  }
  // Keep the test focused on movement rather than wave timing or defenders.
  for (let i = 0; i < 600; i++) {
    s.enemies = [];
    tick(s, 0.1);
  }
  assert.ok(s.units.every(u => atSiegePosition(u, lot)), 'Every attacker reaches its siege station');
  assert.ok(lot.hp < lot.maxHp, 'The surrounding units deal siege damage');
});

test('Stationary overlapping allies separate without crossing a fence', () => {
  const s = establishedGame();
  const lot = s.lots[6];
  s.units = s.units.map(u => ({ ...u, ...entrance(lot), kind: 'troll', nextMealAt: Infinity, nextRestAt: Infinity }));
  tick(s, 2);
  for (const u of s.units) {
    for (const v of s.units.filter(v => v.id !== u.id)) assert.ok(Math.hypot(u.x - v.x, u.y - v.y) >= 0.9);
    assert.ok(u.x >= lot.x && u.x < lot.x + 8 && u.y >= lot.y && u.y < lot.y + 8);
  }
});
