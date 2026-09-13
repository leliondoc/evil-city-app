import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  demolish,
  demolishReason,
  capacity,
  build,
  CREATURES,
} from '../app/game/engine.ts';

test('Demolition removes the cave capacity but preserves troops, ownership and resources', () => {
  const s = createGame(),
    lot = s.lots[3];
  lot.level = 2;
  const before = capacity(s),
    resources = { ...s.resources };
  s.units.push({
    id: 999,
    kind: 'goblin',
    hp: CREATURES.goblin.hp,
    task: 'rest',
    target: lot.id,
    path: [],
    x: 6,
    y: 30,
  });
  assert.equal(demolish(s, lot.id), '');
  assert.equal(capacity(s), before - 12);
  assert.equal(lot.kind, 'empty');
  assert.equal(lot.owned, true);
  assert.deepEqual(s.resources, resources);
  assert.equal(s.units.length, 1);
  assert.equal(s.units[0].task, 'idle');
  assert.equal(s.units[0].target, null);
  assert.ok(demolish(s, lot.id));
  s.resources = { gold: 1000, wood: 1000, mana: 1000, food: 1000 };
  assert.equal(build(s, lot.id, 'den'), '');
});
test('Demolition protects the manor, enemy buildings, active work and recruitment', () => {
  const s = createGame(),
    lot = s.lots[3];
  assert.ok(demolishReason(s, 6));
  assert.ok(demolishReason(s, 1));
  lot.upgrading = { kind: 'den', targetLevel: 2, duration: 60, remaining: 30 };
  assert.ok(demolish(s, lot.id));
  delete lot.upgrading;
  s.recruits.push({
    kind: 'spear-goblin',
    source: lot.id,
    remaining: 3,
    duration: 6,
  });
  assert.ok(demolish(s, lot.id));
  assert.equal(s.recruits.length, 1);
  s.recruits = [];
  s.lost = true;
  assert.ok(demolish(s, lot.id));
});
