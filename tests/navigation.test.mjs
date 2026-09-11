import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findPath,
  entrance,
  tick,
  recruit,
  attack,
  retreat,
  intercept,
  build,
  resourceApproach,
} from '../app/game/engine.ts';

function parcelAt(s, p) {
  return s.lots.find(
    (l) => p.x >= l.x && p.x < l.x + 8 && p.y >= l.y && p.y < l.y + 8,
  );
}
function onStreetOrGate(s, p, permitted = s.lots.map((l) => l.id)) {
  const lot = parcelAt(s, p);
  if (!lot) return;
  assert.ok(
    permitted.includes(lot.id),
    `Shortcut through parcel ${lot.id} at ${p.x}, ${p.y}`,
  );
  assert.ok(
    p.y >= lot.y + 7 && Math.abs(p.x - (lot.x + 4)) < 0.85,
    `Outside the front gate at ${p.x}, ${p.y}`,
  );
}
function fighter(s) {
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.equal(recruit(s, 'troll'), '');
  tick(s, 7);
  const unit = s.units.find((u) => u.kind === 'troll');
  s.units = [unit];
  return unit;
}

test('All 81 entrance routes use the streets and the centered front gates only', () => {
  const s = createGame();
  for (const from of s.lots)
    for (const to of s.lots) {
      const path = findPath(entrance(from), entrance(to));
      assert.ok(path.length);
      assert.deepEqual(path.at(-1), entrance(to));
      let previous = entrance(from);
      for (const next of path) {
        // Check the actual segments, not just their endpoints.
        for (let i = 0; i <= 20; i++)
          onStreetOrGate(
            s,
            {
              x: previous.x + ((next.x - previous.x) * i) / 20,
              y: previous.y + ((next.y - previous.y) * i) / 20,
            },
            [from.id, to.id],
          );
        previous = next;
      }
    }
});

test('Clicking inside a building sends a unit to its entrance', () => {
  const s = createGame();
  for (const lot of s.lots) {
    const path = findPath(entrance(s.lots[6]), { x: lot.x + 4, y: lot.y + 4 });
    assert.deepEqual(path.at(-1), entrance(lot));
    for (const p of path) onStreetOrGate(s, p, [6, lot.id]);
  }
});

test('An assault, a new target mid-route and retreat never cut through buildings or gardens', () => {
  const s = createGame(),
    u = fighter(s);
  assert.equal(attack(s, 0), '');
  for (let i = 0; i < 31; i++) {
    tick(s, 0.1);
    onStreetOrGate(s, u, [4, 0]);
  }
  assert.equal(attack(s, 1), '');
  const hp = s.lots[1].hp;
  for (let i = 0; i < 600 && s.lots[1].hp === hp; i++) {
    tick(s, 0.1);
    onStreetOrGate(s, u, [4, 1]);
  }
  assert.ok(s.lots[1].hp < hp, 'The army reaches the gate and attacks');
  retreat(s);
  for (let i = 0; i < 600 && u.task === 'move'; i++) {
    tick(s, 0.1);
    onStreetOrGate(s, u, [1, 6]);
  }
  assert.equal(u.task, 'idle');
  assert.deepEqual({ x: u.x, y: u.y }, entrance(s.lots[6]));
});

test('Moving enemies and interceptors retain safe corners while pursuing each other', () => {
  const s = createGame(),
    u = fighter(s);
  s.lots[8].owned = true;
  tick(s, 26);
  assert.ok(s.enemies.length);
  assert.equal(intercept(s, s.enemies[0].id), '');
  let fought = false;
  for (let i = 0; i < 600 && !fought; i++) {
    tick(s, 0.1);
    for (const actor of [u, ...s.enemies]) onStreetOrGate(s, actor);
    fought = u.fighting;
  }
  assert.ok(fought, 'Pursuit makes progress and reaches the patrol');
});

test('Supply access remains open without routing through the delivery building', () => {
  const s = createGame();
  for (const site of s.sites) {
    const path = findPath(entrance(s.lots[6]), resourceApproach(site));
    assert.ok(path.length);
    for (const p of path) {
      const lot = parcelAt(s, p);
      if (!lot) continue;
      assert.ok(lot.id === 6 || lot.id === site.home);
      assert.ok(p.y >= lot.y + 7 || p.x >= lot.x + 7);
    }
  }
  tick(s, 150); // Island routes now include the bridges and a return across town.
  for (const amount of Object.values(s.economy.delivered))
    assert.ok(amount >= 20);
});

test('An empty path does not allow attacks or construction from across the map', () => {
  const s = createGame(),
    u = fighter(s);
  assert.equal(attack(s, 0), '');
  Object.assign(u, { x: 0.5, y: 0.5, path: [] });
  const hp = s.lots[0].hp;
  tick(s, 1);
  assert.equal(s.lots[0].hp, hp);
  const construction = createGame();
  construction.resources.gold = 80;
  construction.resources.wood = 25;
  assert.equal(build(construction, 7, 'canteen'), '');
  for (const worker of construction.units)
    Object.assign(worker, { x: 0.5, y: 0.5, path: [] });
  tick(construction, 1);
  assert.equal(construction.lots[7].construction.progress, 0);
});

function duelPositions(from, to) {
  const s = createGame(),
    u = fighter(s);
  Object.assign(u, from, { hp: 1000, task: 'defend', path: [] });
  const enemy = {
    ...to,
    id: s.nextId++,
    kind: 'hero',
    role: 'warrior',
    hp: 1000,
    maxHp: 1000,
    damage: 1,
    level: 1,
    target: 6,
    path: [],
    fighting: false,
    facing: -1,
    healTarget: null,
    attackCooldown: 0,
  };
  s.enemies = [enemy];
  s.workers = [];
  u.target = enemy.id;
  return { s, u, enemy };
}
for (const [name, from, to] of [
  ['horizontal road', { x: 16, y: 20.1 }, { x: 16, y: 21.6 }],
  ['narrow vertical road', { x: 10.5, y: 15 }, { x: 10.5, y: 16.5 }],
  ['building gate', { x: 16, y: 19.5 }, { x: 16, y: 20.8 }],
  ['overlapping spawn', { x: 16, y: 20.5 }, { x: 16, y: 20.5 }],
]) {
  test(`Melee fighters form a face-to-face lane on a ${name}, without crossing fences`, () => {
    const { s, u, enemy } = duelPositions(from, to);
    for (let i = 0; i < 40; i++) {
      const previous = [u, enemy].map((a) => ({ x: a.x, y: a.y }));
      tick(s, 0.1);
      for (const [j, actor] of [u, enemy].entries()) {
        onStreetOrGate(s, actor);
        assert.ok(
          Math.hypot(actor.x - previous[j].x, actor.y - previous[j].y) <= 0.4,
          'No teleport to a combat position',
        );
      }
    }
    assert.ok(
      Math.abs(u.y - enemy.y) < 0.3,
      `Vertical overlap: ${u.y}, ${enemy.y}`,
    );
    assert.ok(Math.abs(u.x - enemy.x) >= 1.5, 'Separate horizontal positions');
    assert.equal(u.facing, -enemy.facing);
    assert.equal(u.facing, Math.sign(enemy.x - u.x));
    assert.ok(u.hp < 1000 && enemy.hp < 1000, 'Both fighters still retaliate');
    retreat(s);
    for (let i = 0; i < 900 && u.task === 'move'; i++) tick(s, 0.1);
    assert.equal(u.task, 'idle', 'A retreat still releases the fighter');
  });
}
