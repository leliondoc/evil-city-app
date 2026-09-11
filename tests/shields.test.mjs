import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  commandUnit,
  moveUnit,
  retreat,
  HEROES,
  ENEMIES,
  CREATURES,
} from '../app/game/engine.ts';
import {
  advanceShields,
  shieldActive,
  provocationReason,
} from '../app/game/shields.ts';
import { hitEnemy } from '../app/game/strategy.ts';
import { restReason } from '../app/game/domain.ts';
import { enemyAnimationSequence } from '../app/game/art.ts';

function arena(role = 'guard') {
  const s = createGame();
  s.resources.food = 1000;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.economy.workerReadyAt = Infinity;
  s.workers = [];
  const def = role === 'guard' ? ENEMIES.guard : HEROES[role];
  const e = {
    id: s.nextId++,
    kind: role === 'guard' ? 'guard' : 'hero',
    role: role === 'guard' ? 'warrior' : role,
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    level: 1,
    x: 15.7,
    y: 20.5,
    target: 6,
    path: [],
    fighting: false,
    facing: -1,
    healTarget: null,
    attackCooldown: 0,
  };
  const u = {
    id: s.nextId++,
    kind: 'skeleton',
    hp: CREATURES.skeleton.hp,
    x: 14,
    y: 20.5,
    path: [],
    task: 'defend',
    target: e.id,
    focusTarget: e.id,
    fighting: false,
    facing: 1,
    idleTime: 0,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  };
  s.enemies = [e];
  s.units = [u];
  return { s, e, u };
}
test('Guard shield triggers at 20%, stops attacking and uses the original guard animation', () => {
  const { s, e, u } = arena();
  e.hp = e.maxHp * 0.21;
  advanceShields(s);
  assert.equal(shieldActive(e, s.elapsed), false);
  e.hp = e.maxHp * 0.2;
  advanceShields(s);
  assert.equal(e.shieldUntil, 6);
  assert.deepEqual(enemyAnimationSequence(e, 'attack', s.elapsed), [
    'guard-shield',
  ]);
  const hp = e.hp,
    playerHp = u.hp;
  hitEnemy(s, u, e, 5, 1);
  assert.ok(Math.abs(hp - e.hp - 3.75) < 1e-8);
  tick(s, 0.1);
  assert.equal(u.hp, playerHp);
  assert.equal(e.fighting, false);
});
test('Guard shield expires after six seconds and cannot immediately reactivate', () => {
  const { s, e } = arena();
  e.hp *= 0.2;
  advanceShields(s);
  s.elapsed = 6;
  advanceShields(s);
  assert.equal(shieldActive(e, s.elapsed), false);
  assert.deepEqual(enemyAnimationSequence(e, 'idle', s.elapsed), [
    'guard-idle',
  ]);
  s.elapsed = 29.9;
  advanceShields(s);
  assert.equal(e.shieldUntil, 6);
  s.elapsed = 30;
  advanceShields(s);
  assert.equal(e.shieldUntil, 36);
});
function rescue() {
  const { s, e, u } = arena('warrior');
  const monk = {
    ...e,
    id: s.nextId++,
    role: 'monk',
    hp: 20,
    maxHp: 85,
    x: 15,
    damage: 0,
  };
  s.enemies.push(monk);
  u.target = u.focusTarget = monk.id;
  advanceShields(s);
  return { s, e, u, monk };
}
test('Knight rescues a wounded monk and locks only his nearby attackers onto himself', () => {
  const { s, e, u, monk } = rescue();
  assert.equal(e.hp, e.maxHp);
  assert.equal(u.focusTarget, e.id);
  assert.equal(u.provokedUntil, 10);
  assert.deepEqual(enemyAnimationSequence(e, 'idle', 0), [
    'hero-warrior-shield',
  ]);
  assert.match(
    commandUnit(s, u.id, { type: 'enemy', id: monk.id }, monk),
    /Provoqué/,
  );
  assert.match(restReason(s, u.id), /Provoqué/);
  moveUnit(s, u.id, { x: 6, y: 30 });
  retreat(s);
  assert.equal(u.task, 'defend');
  assert.equal(u.target, e.id);
  tick(s, 0.1);
  assert.equal(u.focusTarget, e.id);
  s.elapsed = 10;
  advanceShields(s);
  assert.equal(provocationReason(s, u), '');
  assert.equal(commandUnit(s, u.id, { type: 'enemy', id: monk.id }, monk), '');
  assert.equal(u.focusTarget, monk.id);
});
test('Killing the protector immediately releases commands, without waiting for the timer', () => {
  const { s, e, u } = rescue();
  hitEnemy(s, u, e, 10000, 1);
  assert.equal(e.hp, 0);
  assert.equal(provocationReason(s, u), '');
  moveUnit(s, u.id, { x: 6, y: 30 });
  assert.equal(u.task, 'move');
});
test('Ordinary guards and distant knights do not taunt for another wounded soldier', () => {
  for (const role of ['guard', 'warrior']) {
    const { s, e, u } = arena(role);
    const ally = {
      ...e,
      id: s.nextId++,
      role: 'monk',
      kind: 'hero',
      hp: 10,
      maxHp: 85,
      x: role === 'guard' ? 15 : 3,
    };
    s.enemies.push(ally);
    u.target = u.focusTarget = ally.id;
    advanceShields(s);
    assert.equal(shieldActive(e, 0), false);
    assert.equal(u.provokedBy, undefined);
  }
});
test('Shield also reduces fire damage and cannot refresh itself within a tick', () => {
  const { s, e, u } = arena();
  e.hp = e.maxHp * 0.2;
  advanceShields(s);
  s.strategy.research.push('embers');
  const hp = e.hp;
  hitEnemy(s, u, e, 5, 1);
  assert.ok(Math.abs(hp - e.hp - 6) < 1e-8);
  s.elapsed = 5;
  advanceShields(s);
  assert.equal(e.shieldUntil, 6);
});
