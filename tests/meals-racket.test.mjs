import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { entrance, armyDamage } from '../app/game/engine.ts';
import { advanceSpecialUnit } from '../app/game/domain.ts';
import { physicalDamage } from '../app/game/combat.ts';
import { advanceStrategy, strategyUnit, RACKET } from '../app/game/strategy.ts';

test('Meals debit once, last by kitchen level, and confer an expiring physical bonus', () => {
  for (const level of [1, 2, 3]) {
    const s = establishedGame(), u = s.units[0], kitchen = s.lots[4];
    Object.assign(kitchen, { kind: 'canteen', owned: true, construction: null, level });
    Object.assign(u, entrance(kitchen), { task: 'eat', target: kitchen.id, path: [], activityProgress: 0 });
    s.resources.food = 1;
    advanceSpecialUnit(s, u, 4);
    assert.equal(s.resources.food, 0);
    assert.equal(u.wellFedUntil, s.elapsed + 70 + (level - 1) * 30);
    assert.equal(physicalDamage(100, u, s.elapsed), 95);
    assert.equal(physicalDamage(100, u, u.wellFedUntil), 100);
    const damage = armyDamage(s, { ...u, kind: 'troll' });
    s.resources.food = 100;
    assert.equal(armyDamage(s, { ...u, kind: 'troll' }), damage);
  }
});
test('Insufficient food does not confer a free meal or allow negative stocks', () => {
  const s = establishedGame(), u = s.units[0], kitchen = s.lots[4];
  Object.assign(kitchen, { kind: 'canteen', owned: true, construction: null });
  Object.assign(u, entrance(kitchen), { task: 'eat', target: kitchen.id, path: [] });
  s.resources.food = 0.5;
  advanceSpecialUnit(s, u, 4);
  assert.equal(s.resources.food, 0.5);
  assert.equal(u.wellFedUntil, undefined);
});
test('A full tower sends its own goblin with all loot, credits on arrival and returns him', () => {
  for (const lost of [false, true]) {
    const s = establishedGame(), t = s.strategy.towers[0], u = s.units[0];
    s.enemies = []; s.workers = []; s.resources.gold = 0; s.resources.wood = 0;
    Object.assign(t, { owned: true, occupant: u.id, loot: { gold: RACKET.capacity, wood: 20 } });
    Object.assign(u, { x: t.x, y: t.y, task: 'tower', target: t.id, path: [] });
    advanceStrategy(s, 0.1);
    assert.equal(u.task, 'deliver-loot'); assert.equal(s.resources.gold, 0);
    assert.deepEqual(t.loot, {});
    advanceStrategy(s, 0.1);
    assert.equal(t.occupant, u.id);
    if (lost) t.owned = false;
    Object.assign(u, entrance(s.lots[6]), { path: [] });
    strategyUnit(s, u, 0.1);
    assert.equal(s.resources.gold, RACKET.capacity); assert.equal(s.resources.wood, 20);
    assert.equal(u.task, lost ? 'idle' : 'tower');
    assert.equal(u.loot, undefined);
  }
});
