import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  recruit,
  recruitReason,
  gather,
  build,
  buildReason,
  HUMAN_WORKER_CAP,
  HUMAN_WORKER_SECONDS,
} from '../app/game/engine.ts';

function until(s, predicate, limit = 360) {
  for (let i = 0; i < limit * 10 && !predicate(); i++) tick(s, 0.1);
  assert.ok(predicate(), 'Opening is not blocked');
}

test('The opening funds two manual workers and reaches six within 90 seconds through real deliveries', () => {
  const s = createGame();
  assert.equal(recruit(s, 'goblin'), '');
  assert.equal(recruit(s, 'goblin'), '');
  assert.equal(s.units.length, 0);
  assert.equal(s.recruits.length, 2);
  assert.deepEqual(s.resources, { gold: 5, wood: 0, food: 16, mana: 0 });
  for (let step = 0; step < 900 && s.units.length < 6; step++) {
    tick(s, 0.1);
    if (s.units.length + s.recruits.length < 6 && !recruitReason(s, 'goblin'))
      assert.equal(recruit(s, 'goblin'), '');
  }
  assert.equal(s.units.length, 6);
  assert.equal(s.lost, false);
  assert.equal(s.recruits.length, 0);
  assert.match(recruitReason(s, 'goblin'), /Limite/);
});

for (const kind of ['gold', 'wood', 'food']) {
  const limit = kind === 'food' ? 55 : 40; // The northeast pasture is farther from the manor.
  test(`An opening worker delivers ${kind} within ${limit} seconds without credit during harvesting`, () => {
    const s = createGame();
    recruit(s, 'goblin');
    until(s, () => s.units.length === 1, 7);
    const u = s.units[0];
    const before = s.resources[kind];
    assert.equal(
      gather(s, u.id, s.sites.find((site) => site.kind === kind).id),
      '',
    );
    until(s, () => u.gathering.cargo > 0, 25);
    assert.ok(s.resources[kind] <= before);
    until(s, () => u.gathering.cargo === 0, kind === 'food' ? 25 : 15);
    assert.ok(s.elapsed < limit, `${kind} delivered at ${s.elapsed}`);
    assert.ok(s.resources[kind] > before + 25);
    assert.ok(
      s.resourceGains.some((gain) => gain.kind === kind && gain.amount === 30),
    );
  });
}
test('Both camps start without workers; the first goblin is affordable and always manually recruited', () => {
  const s = createGame();
  assert.equal(s.units.length, 0);
  assert.equal(s.workers.length, 0);
  assert.equal(s.recruits.length, 0);
  assert.deepEqual(s.resources, { gold: 35, wood: 0, food: 24, mana: 0 });
  tick(s, 5);
  assert.equal(s.units.length, 0);
  assert.equal(s.resources.wood, 0);
  assert.equal(recruit(s, 'goblin'), '');
  tick(s, 5);
  assert.equal(s.units.length, 0);
  tick(s, 1.1);
  assert.equal(s.units.length, 1);
  tick(s, 30);
  assert.equal(s.units.length, 1);
});
test('The humans recruit gradually, pay from their stocks, and never exceed six or two per site', () => {
  const s = createGame();
  s.economy.nextUpgradeAt = Infinity;
  tick(s, HUMAN_WORKER_SECONDS - 0.1);
  assert.equal(s.workers.length, 0);
  const before = { ...s.economy.stocks };
  tick(s, 0.2);
  assert.equal(s.workers.length, 1);
  assert.equal(s.economy.stocks.gold, before.gold - 8);
  assert.equal(s.economy.stocks.food, before.food - 5);
  tick(s, 19);
  assert.equal(s.workers.length, 1);
  until(s, () => s.workers.length === HUMAN_WORKER_CAP);
  for (const site of s.sites)
    assert.equal(s.workers.filter((w) => w.site === site.id).length, 2);
  tick(s, 60);
  assert.equal(s.workers.length, 6);
});
test('Human recruitment waits for resources and respects the replacement delay after a casualty', () => {
  const s = createGame();
  s.economy.stocks = { gold: 0, food: 0, wood: 0 };
  tick(s, 30);
  assert.equal(s.workers.length, 0);
  s.economy.stocks = { gold: 100, food: 100, wood: 100 };
  tick(s, 0.1);
  assert.equal(s.workers.length, 1);
  const site = s.workers[0].site;
  s.workers[0].hp = 0;
  tick(s, 0.1);
  tick(s, 39);
  assert.equal(s.workers.filter((w) => w.site === site).length, 0);
  until(s, () => s.workers.some((w) => w.site === site));
  assert.ok(s.workers.length <= 6);
});
test('One manually recruited goblin can fund and finish the first canteen with the actual starting resources', () => {
  const s = createGame();
  assert.equal(recruit(s, 'goblin'), '');
  until(s, () => !buildReason(s, 7, 'canteen'));
  assert.equal(build(s, 7, 'canteen'), '');
  until(s, () => s.lots[7].kind === 'canteen');
  assert.equal(s.lost, false);
  assert.equal(s.units.length, 1);
  assert.ok(s.resources.food >= 0);
});
