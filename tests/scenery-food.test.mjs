import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  build,
  tick,
  foodBalance,
  rates,
  upgrade,
  findPath,
  entrance,
} from '../app/game/engine.ts';
import {
  BRIDGE,
  isDryGround,
  isStreet,
  makeScenery,
  sceneryFits,
} from '../app/game/scenery.ts';

test('The bridge reaches dry land at both ends across an actual channel', () => {
  for (const y of [
    BRIDGE.top,
    (BRIDGE.top + BRIDGE.bottom) / 2,
    BRIDGE.bottom,
  ]) {
    assert.ok(isDryGround(BRIDGE.left, y));
    assert.ok(isDryGround(BRIDGE.right, y));
  }
  assert.equal(isDryGround(-96, (BRIDGE.top + BRIDGE.bottom) / 2), false);
  assert.equal(BRIDGE.top, 20 * 32);
  assert.equal(BRIDGE.bottom, 22 * 32);
});
test('Scenery rejects roots in water, foam on grass, cliff faces and streets', () => {
  const tree = { key: 'tree-1', x: 500, y: -120, scale: 0.65 };
  assert.equal(sceneryFits(tree), false); // The former northern tree row.
  assert.equal(sceneryFits({ ...tree, x: -265, y: 80 }), false); // Cliff face.
  assert.equal(sceneryFits({ ...tree, x: 336, y: 400 }), false); // Street.
  assert.equal(sceneryFits({ ...tree, x: 400, y: -24 }), true);
  assert.equal(
    sceneryFits({ key: 'water-rock-1', x: -330, y: 400, scale: 0.85 }),
    false,
  );
  assert.equal(
    sceneryFits({ key: 'water-rock-1', x: -96, y: 400, scale: 0.85 }),
    true,
  );
  const scenery = makeScenery(createGame().lots);
  assert.ok(scenery.filter((d) => d.key.startsWith('tree-')).length >= 30);
  assert.ok(scenery.filter((d) => d.key.startsWith('water-rock-')).length >= 4);
});
test('Each supply site occupies its delivery building’s garden and remains reachable', () => {
  const s = createGame();
  for (const site of s.sites) {
    const home = s.lots[site.home];
    assert.ok(site.x > home.x && site.x < home.x + 8);
    assert.ok(site.y > home.y && site.y < home.y + 8);
    assert.equal(isStreet(site.x * 32, site.y * 32), false);
    const path = findPath(entrance(home), site);
    assert.ok(path.length);
    assert.ok(
      Math.hypot(path.at(-1).x - site.x, path.at(-1).y - site.y) <= 0.75,
    );
  }
});
test('A canteen can be built with zero food, feeds the player and scales with upgrades', () => {
  const s = createGame();
  s.resources.food = 0;
  const humanFood = s.economy.stocks.food;
  assert.deepEqual(foodBalance(s), { production: 0, consumption: 9, net: -9 });
  assert.equal(build(s, 7, 'canteen'), '');
  tick(s, 1);
  assert.equal(foodBalance(s).production, 0);
  for (let i = 0; i < 600 && s.lots[7].construction; i++) tick(s, 0.1);
  assert.equal(s.lots[7].kind, 'canteen');
  assert.deepEqual(foodBalance(s), { production: 45, consumption: 9, net: 36 });
  assert.equal(rates(s).food, 0.6);
  const before = s.resources.food;
  tick(s, 30);
  assert.ok(Math.abs(s.resources.food - before - 18) < 0.001);
  assert.ok(s.economy.stocks.food >= humanFood); // Independent human deliveries.
  assert.equal(upgrade(s, 7), '');
  assert.deepEqual(foodBalance(s), { production: 90, consumption: 9, net: 81 });
  s.lots[7].owned = false;
  assert.equal(foodBalance(s).production, 0);
});
