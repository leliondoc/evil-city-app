import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  build,
  tick,
  foodBalance,
  rates,
  upgrade,
  findPath,
  entrance,
  resourceApproach,
} from '../app/game/engine.ts';
import {
  BRIDGE,
  isDryGround,
  isStreet,
  makeScenery,
  sceneryFits,
} from '../app/game/scenery.ts';
import {
  GROUND_PATCHES,
  HIGHLANDS,
  patchTiles,
  groundTiles,
  onPatch,
  onGround,
} from '../app/game/terrainLayout.ts';

test('Coastal terraces remain connected and every stair joins an upper surface to dry lower ground', () => {
  const ground = groundTiles();
  const cells = new Map(ground.map((tile) => [`${tile.x},${tile.y}`, tile]));
  for (const tile of ground)
    for (const [dx, dy] of [
      [64, 0],
      [0, 64],
    ]) {
      const neighbour = cells.get(`${tile.x + dx},${tile.y + dy}`);
      if (neighbour)
        assert.equal(
          tile.key,
          neighbour.key,
          'Continuous ground shares its grass palette',
        );
    }
  for (const p of [...GROUND_PATCHES, ...HIGHLANDS]) {
    if (p.rows) {
      assert.equal(p.rows.length, p.h);
      assert.ok(p.rows.every((row) => row.length === p.w));
    }
    const tiles = patchTiles(p);
    const remaining = new Set(tiles.map((tile) => `${tile.x},${tile.y}`));
    const queue = [tiles[0]];
    remaining.delete(`${tiles[0].x},${tiles[0].y}`);
    for (const tile of queue)
      for (const [dx, dy] of [
        [-64, 0],
        [64, 0],
        [0, -64],
        [0, 64],
      ]) {
        const next = { ...tile, x: tile.x + dx, y: tile.y + dy };
        if (remaining.delete(`${next.x},${next.y}`)) queue.push(next);
      }
    assert.equal(remaining.size, 0, 'No accidentally detached terrain cells');
  }
  for (const [index, p] of HIGHLANDS.entries())
    for (const stair of p.stairs ?? []) {
      const x = p.x + stair.tx * 64 + 32;
      const y = p.y + stair.ty * 64 + 32;
      assert.ok(onPatch(p, x, y), 'Stairs start on the terrace');
      assert.ok(!onPatch(p, x, y + 64), 'Stairs span its front cliff');
      assert.ok(
        onGround(x, y + 128) ||
          HIGHLANDS.slice(0, index).some((lower) => onPatch(lower, x, y + 128)),
        'Stairs end on lower land',
      );
      const landingX = x + (stair.side === 'left' ? -64 : 64);
      assert.ok(
        onGround(landingX, y + 128) ||
          HIGHLANDS.slice(0, index).some((lower) =>
            onPatch(lower, landingX, y + 128),
          ),
        'The full diagonal ramp has a dry lower landing',
      );
      assert.equal(
        sceneryFits({ key: 'tree-1', x, y, scale: 0.6 }),
        false,
        'Keep the passage clear',
      );
    }
});

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
  assert.equal(BRIDGE.top, 19.5 * 32);
  assert.equal(BRIDGE.bottom, 21.5 * 32);
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
test('Wood and gold occupy dry islands and all supply sites remain reachable', () => {
  const s = createGame();
  for (const site of s.sites) {
    const home = s.lots[site.home];
    if (site.kind === 'food') {
      assert.ok(
        site.x > 32 && site.y < 6,
        'Sheep live in the northeast pasture',
      );
      assert.ok(onPatch(HIGHLANDS[0], site.x * 32, site.y * 32));
      assert.ok(isDryGround(site.x * 32, site.y * 32));
    } else {
      assert.ok(site.x < 0);
      assert.ok(isDryGround(site.x * 32, site.y * 32));
    }
    assert.equal(isStreet(site.x * 32, site.y * 32), false);
    const destination = resourceApproach(site);
    const path = findPath(entrance(home), destination);
    assert.ok(path.length);
    assert.ok(
      Math.hypot(
        path.at(-1).x - destination.x,
        path.at(-1).y - destination.y,
      ) <= 0.75,
    );
  }
});
test('The lumberjack reaches the side of the trunk, faces it and completes repeated deliveries', () => {
  const s = createGame();
  const site = s.sites.find((site) => site.kind === 'wood');
  const destination = resourceApproach(site);
  let arrivals = 0;
  let previousPhase = 'outbound';
  for (const mobilization of Object.values(s.mobilization)) {
    mobilization.active = true;
    mobilization.nextRaidAt = 10000;
  }
  for (let i = 0; i < 4400; i++) {
    tick(s, 0.05);
    const worker = s.workers.find((worker) => worker.site === site.id);
    if (worker.phase === 'harvest') {
      if (previousPhase !== 'harvest') arrivals++;
      assert.equal(worker.x, destination.x);
      assert.equal(worker.y, destination.y);
      assert.equal(worker.path.length, 0);
      assert.equal(worker.facing, -1);
      assert.ok(worker.x > site.x && worker.y > site.y);
      assert.equal(isStreet(worker.x * 32, worker.y * 32), false);
    }
    previousPhase = worker.phase;
  }
  assert.ok(arrivals >= 3);
  assert.ok(s.economy.delivered.wood >= 20);
  // Entire visible crown (including sway) has a margin before the eastern road.
  assert.ok(site.x * 32 + 32 < 30 * 32);
});
test('A canteen consumes harvested food more efficiently without generating any stock', () => {
  const s = createGame();
  s.resources = { gold: 300, wood: 125, food: 0, mana: 0 };
  assert.equal(foodBalance(s).consumption, 9);
  assert.equal(build(s, 7, 'canteen'), '');
  for (let i = 0; i < 600 && s.lots[7].construction; i++) tick(s, 0.1);
  assert.equal(s.lots[7].kind, 'canteen');
  assert.equal(s.resources.food, 0);
  assert.equal(foodBalance(s).consumption, 8);
  assert.equal(rates(s).food, -8 / 60);
  assert.equal(upgrade(s, 6), '');
  assert.equal(upgrade(s, 7), '');
  assert.equal(foodBalance(s).consumption, 6);
  s.lots[7].owned = false;
  assert.equal(foodBalance(s).consumption, 9);
});
