import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import {
  CREATURES,
  recruit,
  recruitmentSource,
  entrance,
  setRallyPoint,
  commandUnit,
  build,
  tick,
} from '../app/game/engine.ts';
import { restUnit, advanceSpecialUnit } from '../app/game/domain.ts';
import { towerInfluence, TOWER_RANGE } from '../app/game/strategy.ts';
function setup() {
  const s = establishedGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.enemies = [];
  s.workers = [];
  s.domain.autoCollect = false;
  for (const [id, kind] of [
    [3, 'den'],
    [4, 'forge'],
    [7, 'crypt'],
  ])
    Object.assign(s.lots[id], { kind, owned: true, level: 10 });
  return s;
}
function unit(s, kind = 'troll') {
  const u = {
    ...s.units[0],
    id: s.nextId++,
    kind,
    hp: Math.max(1, CREATURES[kind].hp - 50),
    task: 'idle',
    path: [],
    target: null,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  };
  s.units.push(u);
  return u;
}
test('Recruitment remembers the matching production building for every creature', () => {
  const s = setup();
  for (const [kind, id] of [
    ['goblin', 3],
    ['troll', 4],
    ['minotaur', 4],
    ['skeleton', 7],
    ['specter', 7],
    ['alchemist', 7],
  ]) {
    s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
    assert.equal(recruit(s, kind), '');
    assert.equal(s.recruits.at(-1).source, id);
  }
  const before = s.nextId;
  tick(s, 16);
  for (const u of s.units.filter((u) => u.id >= before)) {
    const source = recruitmentSource(s, u.kind),
      door = entrance(source);
    // Large tick may move idle goblins; examine combat/undead spawns at their doors.
    if (u.kind !== 'goblin')
      assert.ok(
        Math.hypot(u.x - door.x, u.y - door.y) < 2,
        `${u.kind} spawned at ${source.kind}`,
      );
  }
});
test('A selected production building is retained and its current rally applies only to new recruits', () => {
  const s = setup();
  Object.assign(s.lots[8], { kind: 'forge', owned: true });
  const existing = unit(s);
  assert.equal(recruit(s, 'troll', 8), '');
  assert.equal(s.recruits[0].source, 8);
  assert.equal(setRallyPoint(s, 8, { x: 20.5, y: 30.5 }), '');
  const rally = { ...s.lots[8].rallyPoint };
  tick(s, 6.1);
  const born = s.units.find((u) => u.kind === 'troll' && u.id !== existing.id);
  assert.equal(born.task, 'move');
  assert.deepEqual(born.path.at(-1), rally);
  assert.notEqual(existing.task, 'move');
  assert.equal(setRallyPoint(s, 8, null), '');
  assert.equal(s.lots[8].rallyPoint, undefined);
});
test('An unreachable rally or enemy building cannot replace a valid rally', () => {
  const s = setup();
  assert.equal(setRallyPoint(s, 4, { x: 20.5, y: 20.5 }), '');
  const before = { ...s.lots[4].rallyPoint };
  assert.ok(setRallyPoint(s, 4, { x: NaN, y: 0 }));
  assert.deepEqual(s.lots[4].rallyPoint, before);
  assert.ok(setRallyPoint(s, 4, { x: 47, y: 36 }));
  assert.deepEqual(s.lots[4].rallyPoint, before);
  assert.ok(setRallyPoint(s, 1, { x: 20.5, y: 20.5 }));
});
test('Manual rest overrides combat, heals beyond four seconds and completes at full HP', () => {
  const s = setup(),
    u = unit(s);
  u.task = 'defend';
  u.target = 123;
  u.focusTarget = 123;
  assert.equal(restUnit(s, u.id), '');
  assert.equal(u.focusTarget, undefined);
  assert.equal(u.task, 'rest');
  Object.assign(u, entrance(s.lots[u.target]), { path: [] });
  const hp = u.hp;
  for (let i = 0; i < 6; i++) advanceSpecialUnit(s, u, 1);
  assert.equal(u.hp, hp + 24);
  assert.equal(u.manualRest, true);
  assert.equal(u.task, 'rest');
  for (let i = 0; i < 20; i++) advanceSpecialUnit(s, u, 1);
  assert.equal(u.hp, CREATURES.troll.hp);
  assert.equal(u.task, 'idle');
  assert.equal(u.manualRest, undefined);
});
test('A new movement order cancels manual rest, and undead use the crypt', () => {
  const s = setup(),
    u = unit(s, 'skeleton');
  assert.equal(
    commandUnit(s, u.id, { type: 'lot', id: 7 }, entrance(s.lots[7])),
    '',
  );
  assert.equal(u.task, 'restore');
  assert.equal(u.target, 7);
  assert.equal(u.manualRest, true);
  commandUnit(s, u.id, null, { x: 20.5, y: 20.5 });
  assert.equal(u.task, 'move');
  assert.equal(u.manualRest, undefined);
  assert.ok(restUnit(s, u.id, 3));
});
test('A goblin sent to bed is not automatically reassigned to a construction site', () => {
  const s = setup(),
    u = s.units[0];
  u.hp = 10;
  assert.equal(restUnit(s, u.id), '');
  Object.assign(s.lots[5], { owned: true, kind: 'empty' });
  assert.equal(build(s, 5, 'canteen'), '');
  tick(s, 0.1);
  assert.equal(u.task, 'rest');
  assert.equal(u.manualRest, true);
});
test('Manual rest can retreat from danger but never heals while threatened', () => {
  const s = setup(),
    u = unit(s);
  assert.equal(restUnit(s, u.id), '');
  Object.assign(u, entrance(s.lots[3]), { path: [] });
  s.enemies = [
    { id: 999, kind: 'guard', hp: 100, x: u.x + 1, y: u.y, role: 'warrior' },
  ];
  const hp = u.hp;
  advanceSpecialUnit(s, u, 2);
  assert.equal(u.hp, hp);
  assert.equal(u.task, 'rest');
  s.lots[3].owned = false;
  advanceSpecialUnit(s, u, 1);
  assert.equal(u.manualRest, undefined);
  assert.equal(u.task, 'idle');
});
test('Tower overlays expose the real gameplay radii of the stationed creature', () => {
  const s = setup(),
    t = s.strategy.towers[0];
  assert.deepEqual(
    towerInfluence(s, t).map((r) => r.radius),
    [TOWER_RANGE.threat],
  );
  for (const [kind, radii] of [
    ['goblin', [3.5]],
    ['skeleton', [3, 8]],
    ['specter', [14]],
  ]) {
    const u = unit(s, kind);
    Object.assign(u, { x: t.x, y: t.y, task: 'tower', target: t.id });
    t.owned = true;
    t.occupant = u.id;
    assert.deepEqual(
      towerInfluence(s, t).map((r) => r.radius),
      radii,
    );
  }
});
