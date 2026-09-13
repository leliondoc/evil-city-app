import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, build, upgrade, cancelWork, cancelWorkRefund, CREATURES } from '../app/game/engine.ts';

function setup() {
  const s = createGame(); s.resources = { gold: 400, wood: 400, mana: 400, food: 400 };
  s.units.push({ id: s.nextId++, kind: 'goblin', x: 6, y: 30, hp: CREATURES.goblin.hp, task: 'idle', target: null, path: [], facing: 1, fighting: false, idleTime: 0 });
  return s;
}
test('Cancel construction refunds only unspent work, frees builders and cannot refund twice', () => {
  const s = setup(), lot = s.lots[7];
  lot.ruins = { quiet: 10, progress: 0.2, paid: true };
  assert.equal(build(s, 7, 'canteen'), '');
  lot.construction.progress = 0.5;
  assert.equal(s.units[0].task, 'build');
  const before = { ...s.resources }, refund = cancelWorkRefund(s, lot);
  assert.equal(cancelWork(s, 7), '');
  assert.equal(lot.kind, 'empty'); assert.equal(lot.construction, null);
  assert.equal(lot.ruins.quiet, 0); assert.equal(lot.ruins.progress, 0.2);
  assert.equal(s.units[0].task, 'idle'); assert.equal(s.units[0].target, null);
  for (const [key, amount] of Object.entries(refund)) assert.equal(s.resources[key], before[key] + amount);
  const after = { ...s.resources }; assert.notEqual(cancelWork(s, 7), ''); assert.deepEqual(s.resources, after);
});
test('Cancel improvement preserves the building and level and respects storage capacity', () => {
  const s = setup(), lot = s.lots[6];
  assert.equal(upgrade(s, 6), '');
  lot.upgrading.remaining = lot.upgrading.duration / 2;
  s.resources.gold = 990;
  assert.equal(cancelWorkRefund(s, lot).gold, 10);
  assert.equal(cancelWork(s, 6), '');
  assert.equal(s.resources.gold, 1000); assert.equal(s.resources.wood, 382);
  assert.equal(lot.kind, 'hq'); assert.equal(lot.level, 1); assert.equal(lot.hp, 500);
  assert.equal(lot.upgrading, undefined);
});
