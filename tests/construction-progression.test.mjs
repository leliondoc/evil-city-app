import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  build,
  claim,
  tick,
  buildUnlockReason,
  buildMenuReason,
  buildReason,
  BUILD_OPTIONS,
  CREATURES,
  recruit,
  recruitReason,
} from '../app/game/engine.ts';

test('Construction menu and placement report the same exact resource shortfall, including fractional income', () => {
  const s = createGame();
  s.resources = { gold: 54.2, wood: 20.9, food: 100, mana: 100 };
  assert.equal(buildMenuReason(s, 'canteen'), 'Il manque : 26 or, 5 bois.');
  assert.equal(buildReason(s, 7, 'canteen'), buildMenuReason(s, 'canteen'));
  const before = structuredClone(s.resources);
  assert.equal(build(s, 7, 'canteen'), buildMenuReason(s, 'canteen'));
  assert.deepEqual(s.resources, before);
  s.resources.gold = 80;
  assert.equal(buildMenuReason(s, 'canteen'), 'Il manque : 5 bois.');
  s.resources.wood = 25;
  assert.equal(buildMenuReason(s, 'canteen'), '');
  s.resources.mana = 0;
  assert.match(buildMenuReason(s, 'crypt'), /Terminez cantine des hordes/);
  assert.match(buildMenuReason(s, 'crypt'), /50 or, 10 bois, 15 essence/);
});

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
  assert.match(recruitReason(s, 'troll'), /hutte/);
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
