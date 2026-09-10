import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  build,
  claim,
  tick,
  buildUnlockReason,
  BUILD_OPTIONS,
  CREATURES,
  recruit,
  recruitReason,
} from '../app/game/engine.ts';

test('Completed buildings unlock the next tier; money alone cannot bypass progression', () => {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.deepEqual(BUILD_OPTIONS, ['den', 'canteen', 'crypt', 'forge']);
  assert.equal(buildUnlockReason(s, 'canteen'), ''); // Starting den is already complete.
  assert.ok(buildUnlockReason(s, 'crypt'));
  assert.ok(buildUnlockReason(s, 'forge'));
  const before = structuredClone(s.resources);
  assert.ok(build(s, 7, 'forge'));
  assert.deepEqual(s.resources, before);
  assert.equal(build(s, 7, 'canteen'), '');
  assert.ok(buildUnlockReason(s, 'crypt'));
  for (let i = 0; i < 600 && s.lots[7].construction; i++) tick(s, 0.1);
  assert.equal(s.lots[7].kind, 'canteen');
  assert.equal(buildUnlockReason(s, 'crypt'), '');
  assert.ok(buildUnlockReason(s, 'forge'));
  assert.equal(claim(s, 4), '');
  assert.equal(build(s, 4, 'crypt'), '');
  assert.ok(buildUnlockReason(s, 'forge'));
  for (let i = 0; i < 600 && s.lots[4].construction; i++) tick(s, 0.1);
  assert.equal(s.lots[4].kind, 'crypt');
  assert.equal(buildUnlockReason(s, 'forge'), '');
  assert.equal(recruitReason(s, 'skeleton'), '');
  assert.match(recruitReason(s, 'troll'), /forge/);
});

test('Troll recruitment applies its increased price and never debits an unaffordable order', () => {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources = { gold: 60, wood: 0, food: 20, mana: 0 };
  const before = structuredClone(s.resources);
  assert.ok(recruit(s, 'troll'));
  assert.deepEqual(s.resources, before);
  s.resources.gold = CREATURES.troll.cost.gold;
  s.resources.food = CREATURES.troll.cost.food;
  assert.equal(recruit(s, 'troll'), '');
  assert.equal(s.resources.gold, 0);
  assert.equal(s.resources.food, 0);
});
