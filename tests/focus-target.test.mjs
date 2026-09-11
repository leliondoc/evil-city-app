import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import {
  commandUnit,
  commandUnits,
  intercept,
  tick,
  CREATURES,
} from '../app/game/engine.ts';

function encounter(kind = 'troll') {
  const s = establishedGame();
  s.resources.food = 1000;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.economy.workerReadyAt = Infinity;
  s.workers = [];
  const u = s.units[0];
  s.units = [u];
  Object.assign(u, {
    kind,
    hp: CREATURES[kind].hp,
    x: 10.5,
    y: 20.5,
    task: 'idle',
    path: [],
    target: null,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  });
  const enemy = (role, x) => ({
    id: s.nextId++,
    kind: 'hero',
    role,
    x,
    y: 20.5,
    hp: 1000,
    maxHp: 1000,
    damage: 0,
    level: 1,
    target: 6,
    path: [],
    facing: 1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  });
  const guard = enemy('warrior', 11.2);
  const monk = enemy('monk', 14.5);
  s.enemies = [guard, monk];
  return { s, u, guard, monk };
}

const focus = (s, u, target) =>
  commandUnit(s, u.id, { type: 'enemy', id: target.id }, target);

test('A troll leaves a nearer opponent to pursue and attack the designated monk', () => {
  const { s, u, guard, monk } = encounter();
  tick(s, 0.1);
  assert.equal(
    u.target,
    guard.id,
    'The troll initially chooses the nearby opponent',
  );
  assert.equal(
    u.focusTarget,
    undefined,
    'Automatic interception does not lock targets',
  );
  guard.hp = guard.maxHp;
  assert.equal(focus(s, u, monk), '');
  const start = { x: u.x, y: u.y };
  tick(s, 0.1);
  assert.equal(
    guard.hp,
    guard.maxHp,
    'An enemy in melee range cannot interrupt a focus order',
  );
  assert.equal(
    monk.hp,
    monk.maxHp,
    'The designated target is still out of range',
  );
  assert.ok(
    Math.hypot(u.x - start.x, u.y - start.y) > 0,
    'The troll advances instead of continuing its old fight',
  );
  monk.x += 0.5;
  tick(s, 4);
  assert.ok(
    monk.hp < monk.maxHp,
    'The troll follows and eventually strikes the moving target',
  );
  assert.equal(guard.hp, guard.maxHp);
  assert.equal(u.focusTarget, monk.id);
});

test('Melee and ranged fighters hit and face their focus target even when another enemy is closer', () => {
  for (const kind of ['troll', 'skeleton', 'minotaur', 'alchemist', 'goblin']) {
    const { s, u, guard, monk } = encounter(kind);
    if (kind === 'goblin') s.strategy.research.push('embers');
    monk.x = kind === 'alchemist' ? 7.2 : 8.8;
    assert.equal(focus(s, u, monk), '');
    tick(s, 0.1);
    assert.ok(monk.hp < monk.maxHp, `${kind} damages the designated enemy`);
    assert.equal(guard.hp, guard.maxHp, `${kind} ignores the closer enemy`);
    assert.equal(u.facing, -1, `${kind} faces its target after combat spacing`);
  }
});

test('Retargeting and movement replace focus immediately; rejected orders leave it intact', () => {
  const { s, u, guard, monk } = encounter();
  assert.equal(focus(s, u, monk), '');
  assert.notEqual(commandUnit(s, u.id, { type: 'enemy', id: 99999 }, monk), '');
  assert.equal(u.focusTarget, monk.id);
  assert.equal(focus(s, u, guard), '');
  assert.equal(u.focusTarget, guard.id);
  tick(s, 0.1);
  assert.ok(guard.hp < guard.maxHp);
  assert.equal(commandUnit(s, u.id, null, { x: 10.5, y: 24.5 }), '');
  assert.equal(u.focusTarget, undefined);
  guard.hp = guard.maxHp;
  const hp = guard.hp;
  tick(s, 0.1);
  assert.equal(guard.hp, hp, 'An explicit move interrupts combat');
  assert.equal(u.task, 'move');
});

test('Dead or removed focus targets release the lock and restore opportunistic combat', () => {
  for (const removed of [false, true]) {
    const { s, u, guard, monk } = encounter();
    assert.equal(focus(s, u, monk), '');
    if (removed) s.enemies = s.enemies.filter((e) => e.id !== monk.id);
    else monk.hp = 0;
    tick(s, 0.1);
    assert.equal(u.focusTarget, undefined);
    assert.ok(guard.hp < guard.maxHp);
    tick(s, 0.1);
    assert.equal(u.target, guard.id);
  }
});

test('Group and army interception orders apply focus to their intended fighters', () => {
  const { s, u, guard, monk } = encounter();
  const other = { ...structuredClone(u), id: s.nextId++, x: 8.5 };
  const untouched = { ...structuredClone(u), id: s.nextId++, x: 6.5 };
  s.units.push(other, untouched);
  assert.equal(
    commandUnits(s, [u.id, other.id], { type: 'enemy', id: monk.id }, monk),
    '',
  );
  assert.equal(u.focusTarget, monk.id);
  assert.equal(other.focusTarget, monk.id);
  assert.equal(untouched.focusTarget, undefined);
  assert.equal(intercept(s, guard.id), '');
  assert.ok(s.units.every((unit) => unit.focusTarget === guard.id));
});
