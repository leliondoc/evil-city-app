import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tick, upgrade, entrance, RESOURCE_CAP } from '../app/game/engine.ts';
import { strategyUnit } from '../app/game/strategy.ts';

test('Without workers only essence grows; buildings never fill material stocks', () => {
  const s = createGame();
  s.units = [];
  s.lots[4].kind = 'canteen';
  s.lots[4].owned = true;
  s.resources = { gold: 999.9, wood: 999.9, food: 999.9, mana: 999.9 };
  tick(s, 10);
  assert.deepEqual(s.resources, {
    gold: 999.9,
    wood: 999.9,
    food: 999.9,
    mana: RESOURCE_CAP,
  });
  assert.equal(s.resourceGains.length, 0);
  assert.equal(upgrade(s, 6), '');
  assert.equal(upgrade(s, 3), '');
  const materials = { ...s.resources };
  tick(s, 10);
  assert.deepEqual(s.resources, materials);
});
test('Tower loot fills only remaining storage and cannot be credited twice', () => {
  const s = createGame(),
    u = s.units[0];
  Object.assign(u, entrance(s.lots[6]), {
    task: 'deliver-loot',
    path: [],
    loot: { gold: 40, wood: 30 },
  });
  s.resources.gold = RESOURCE_CAP - 3;
  s.resources.wood = RESOURCE_CAP;
  strategyUnit(s, u, 0.1);
  assert.equal(s.resources.gold, RESOURCE_CAP);
  assert.equal(s.resources.wood, RESOURCE_CAP);
  assert.equal(u.loot, undefined);
  s.resources.gold -= 10;
  strategyUnit(s, u, 0.1);
  assert.equal(s.resources.gold, RESOURCE_CAP - 10);
});
test('Combat loot cannot overflow gold storage and food consumption still applies at a full stock', () => {
  const s = createGame();
  s.resources = {
    gold: RESOURCE_CAP - 1,
    wood: 0,
    food: RESOURCE_CAP,
    mana: 0,
  };
  s.enemies = [
    {
      id: s.nextId++,
      x: 16,
      y: 20.5,
      kind: 'guard',
      role: 'warrior',
      hp: 0,
      maxHp: 100,
      damage: 1,
      level: 1,
      path: [],
      target: 6,
      fighting: false,
      facing: 1,
      healTarget: null,
      attackCooldown: 0,
    },
  ];
  tick(s, 0.1);
  assert.equal(s.resources.gold, RESOURCE_CAP);
  assert.ok(s.resources.food < RESOURCE_CAP);
  assert.equal(s.defeatedEnemies, 1);
});
