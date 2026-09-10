import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  recruit,
  commandUnit,
  entrance,
  resourceApproach,
  RESOURCE_GAIN_LIFETIME,
  findPath,
} from '../app/game/engine.ts';
import { BRIDGES, isDryGround } from '../app/game/scenery.ts';
import { ISLAND_PATHS } from '../app/game/islandRoutes.ts';

function fighters() {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  for (let i = 0; i < 3; i++) assert.equal(recruit(s, 'troll'), '');
  tick(s, 7);
  return s;
}

test('Every island route stays on land or a bridge, with dry bridge landings', () => {
  for (const b of BRIDGES) {
    const horizontal = b.right - b.left > b.bottom - b.top;
    const center = { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
    assert.ok(
      ISLAND_PATHS.some((path) =>
        path.slice(1).some((end, i) => {
          const start = path[i];
          return horizontal
            ? start.y * 32 === center.y &&
                end.y * 32 === center.y &&
                Math.min(start.x, end.x) * 32 <= b.left &&
                Math.max(start.x, end.x) * 32 >= b.right
            : start.x * 32 === center.x &&
                end.x * 32 === center.x &&
                Math.min(start.y, end.y) * 32 <= b.top &&
                Math.max(start.y, end.y) * 32 >= b.bottom;
        }),
      ),
      'Bridge is centered on its connecting path',
    );
    assert.ok(!isDryGround(center.x, center.y), 'Bridge crosses water');
    for (const p of horizontal
      ? [
          { x: b.left, y: center.y },
          { x: b.right, y: center.y },
        ]
      : [
          { x: center.x, y: b.top },
          { x: center.x, y: b.bottom },
        ])
      assert.ok(isDryGround(p.x, p.y), 'Bridge reaches dry ground');
  }
  const s = createGame();
  for (const site of s.sites.filter((site) => site.kind !== 'food')) {
    let previous = entrance(s.lots[site.home]);
    const path = findPath(previous, resourceApproach(site));
    assert.deepEqual(path.at(-1), resourceApproach(site));
    for (const next of path) {
      for (let step = 0; step <= 10; step++) {
        const x = (previous.x + ((next.x - previous.x) * step) / 10) * 32;
        const y = (previous.y + ((next.y - previous.y) * step) / 10) * 32;
        assert.ok(
          isDryGround(x, y) ||
            BRIDGES.some(
              (b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom,
            ),
          'Worker never walks on water',
        );
      }
      previous = next;
    }
  }
});

test('Contextual orders affect only the selected fighter and reject a goblin attack', () => {
  const s = fighters();
  const [unit, other] = s.units.filter((u) => u.kind === 'troll');
  const before = structuredClone(other);
  assert.equal(
    commandUnit(s, unit.id, { type: 'lot', id: 0 }, entrance(s.lots[0])),
    '',
  );
  assert.equal(unit.task, 'attack');
  assert.equal(unit.target, 0);
  assert.deepEqual(other, before);
  const resource = s.sites.find((site) => site.kind === 'wood');
  assert.equal(
    commandUnit(s, unit.id, { type: 'resource', id: resource.id }, resource),
    '',
  );
  assert.equal(unit.task, 'sabotage');
  assert.deepEqual(unit.path.at(-1), resourceApproach(resource));
  const goblin = s.units.find((u) => u.kind === 'goblin');
  const goblinBefore = structuredClone(goblin);
  assert.match(
    commandUnit(s, goblin.id, { type: 'lot', id: 0 }, entrance(s.lots[0])),
    /gobelins construisent/,
  );
  assert.deepEqual(goblin, goblinBefore);
  assert.equal(commandUnit(s, unit.id, null, { x: 10.5, y: 20.5 }), '');
  assert.equal(unit.task, 'move');
  assert.equal(unit.target, null);
});

test('A marching group forms a spaced file and every member reaches the destination', () => {
  const s = fighters();
  s.units = s.units.filter((u) => u.kind === 'troll');
  for (const unit of s.units) {
    Object.assign(unit, { x: 2.5, y: 20.5, path: [], task: 'idle' });
    commandUnit(s, unit.id, null, { x: 9.5, y: 20.5 });
  }
  tick(s, 2);
  const positions = s.units.map((u) => u.x).sort((a, b) => a - b);
  for (let i = 1; i < positions.length; i++)
    assert.ok(positions[i] - positions[i - 1] >= 1.14);
  tick(s, 10);
  for (const unit of s.units) {
    assert.equal(unit.path.length, 0);
    assert.equal(unit.task, 'idle');
    assert.deepEqual({ x: unit.x, y: unit.y }, { x: 9.5, y: 20.5 });
  }
});

test('Harvest feedback reports actual deliveries once and expires without duplicating income', () => {
  const s = createGame();
  const initialWood = s.resources.wood;
  tick(s, 4.6);
  assert.equal(
    s.resourceGains.filter((g) => g.kind === 'wood' && g.amount === 1).length,
    3,
  );
  assert.ok(Math.abs(s.resources.wood - initialWood - 3 * 0.22 * 4.6) < 1e-8);
  const seen = new Set();
  const reported = { gold: 0, wood: 0, food: 0 };
  for (let i = 0; i < 1500; i++) {
    tick(s, 0.1);
    for (const gain of s.resourceGains) {
      if (gain.amount === 10 && !seen.has(gain.id)) {
        seen.add(gain.id);
        reported[gain.kind] += gain.amount;
        assert.ok(
          s.workers.some((w) => Math.hypot(w.x - gain.x, w.y - gain.y) < 4),
        );
      }
      assert.ok(s.elapsed - gain.at < RESOURCE_GAIN_LIFETIME);
    }
  }
  assert.deepEqual(reported, s.economy.delivered);
  assert.ok(Object.values(reported).every((amount) => amount >= 20));
});
