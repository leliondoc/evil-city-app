import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, assign, tick } from '../app/game/engine.ts';
import { advanceCannons, advanceKnockback } from '../app/game/cannons.ts';
import { enemyAnimationSequence, ASSETS } from '../app/game/art.ts';

function setup() {
  const s = createGame();
  s.economy.level = 3;
  s.economy.stocks = { gold: 200, wood: 200, food: 200 };
  s.lots[5].ruins = s.lots[8].ruins = { quiet: 0, progress: 0, paid: false };
  s.workers = [
    {
      id: s.nextId++,
      x: 26.5,
      y: 11,
      hp: 35,
      maxHp: 35,
      site: 0,
      path: [],
      facing: 1,
      phase: 'harvest',
      cargo: 0,
      progress: 0,
    },
  ];
  return s;
}
function deploy(s) {
  advanceCannons(s, 0.1);
  const e = s.enemies.find((e) => e.cannon);
  assert.ok(e);
  Object.assign(s.workers[0], { x: e.x, y: e.y, path: [] });
  for (let i = 0; i < 101; i++) advanceCannons(s, 0.1);
  assert.equal(e.cannon.progress, 1);
  return e;
}
function unit(s, x, y) {
  const u = {
    id: s.nextId++,
    kind: 'troll',
    x,
    y,
    hp: 500,
    task: 'attack',
    target: 2,
    path: [],
    facing: 1,
    fighting: false,
    idleTime: 0,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
    manualUntil: Infinity,
  };
  s.units.push(u);
  return u;
}
test('Cannon requires level, two ruins, funds, a worker and an intact human town hall', () => {
  for (const alter of [
    (s) => (s.economy.level = 2),
    (s) => delete s.lots[5].ruins,
    (s) => (s.economy.stocks.gold = 0),
    (s) => (s.workers = []),
    (s) => (s.lots[2].owned = true),
  ]) {
    const s = setup();
    alter(s);
    advanceCannons(s, 0.1);
    assert.equal(s.enemies.length, 0);
  }
  const s = setup(),
    e = deploy(s);
  assert.equal(s.economy.stocks.gold, 140);
  assert.equal(s.economy.stocks.wood, 155);
  assert.equal(s.workers[0].cannonId, undefined);
  advanceCannons(s, 1);
  assert.equal(s.enemies.length, 1);
  for (const key of enemyAnimationSequence(e, 'attack')) assert.ok(ASSETS[key]);
  assert.ok(ASSETS['cannon-ball']);
});
test('Killing the builder interrupts construction; destruction releases the worker', () => {
  const s = setup();
  advanceCannons(s, 0.1);
  s.workers[0].hp = 0;
  advanceCannons(s, 1);
  assert.equal(s.enemies[0].hp, 0);
  assert.ok(s.cannonReadyAt > s.elapsed);
  const other = setup();
  advanceCannons(other, 0.1);
  other.enemies[0].hp = 0;
  tick(other, 0.1);
  assert.equal(other.workers[0].cannonId, undefined);
});
test('A telegraphed shot damages its line once, misses dodging units and pushes to the street end', () => {
  const s = setup(),
    e = deploy(s),
    u = unit(s, 15, e.y),
    dodge = unit(s, 18, e.y),
    behind = unit(s, 28, e.y);
  s.elapsed = 3;
  advanceCannons(s, 0.1);
  assert.equal(e.cannon.fireAt, 5);
  assert.equal(u.hp, 500);
  dodge.y = 12.5;
  s.elapsed = 5;
  advanceCannons(s, 0.1);
  for (let i = 0; i < 12; i++) {
    s.elapsed += 0.1;
    advanceCannons(s, 0.1);
  }
  assert.ok(u.hp < 500);
  assert.equal(dodge.hp, 500);
  assert.equal(behind.hp, 500);
  const hp = u.hp;
  assert.ok(u.knockback.end.x >= 0.5 && u.knockback.end.x < 1);
  for (let i = 0; i < 20; i++) advanceKnockback(u, 0.1);
  assert.equal(u.knockback, undefined);
  assert.equal(u.task, 'attack');
  assert.equal(u.target, 2);
  assert.ok(u.path.length);
  assert.equal(u.manualUntil, Infinity);
  advanceCannons(s, 1);
  assert.equal(u.hp, hp);
  assert.equal(e.cannon.fireAt, undefined);
});
test('A shot stops at the first building instead of pushing through it', () => {
  const s = setup(),
    e = deploy(s);
  Object.assign(e, { x: 11, y: 5 });
  const u = unit(s, 11, 8),
    wall = unit(s, 15, 5);
  s.elapsed = 3;
  advanceCannons(s, 0.1);
  assert.deepEqual(e.cannon.direction, { x: 0, y: 1 });
  s.elapsed = 5;
  advanceCannons(s, 0.1);
  advanceCannons(s, 0.2);
  assert.equal(wall.hp, 500);
  assert.ok(u.knockback.end.y <= 31.5);
});
test('A new move order during recoil is used when the slide ends', () => {
  const s = setup(),
    u = unit(s, 10, 11);
  u.knockback = { end: { x: 1, y: 11 }, resume: { x: 20, y: 11 } };
  assign(u, { x: 11, y: 21 }, 'move', null);
  for (let i = 0; i < 10; i++) advanceKnockback(u, 0.1);
  assert.equal(u.task, 'move');
  assert.equal(u.path.at(-1).y, 21);
});
