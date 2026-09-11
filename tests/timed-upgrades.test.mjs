import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, upgrade, tick, buildUnlockReason, rates } from '../app/game/engine.ts';
import { advanceBuildingUpgrades, upgradeDuration } from '../app/game/progression.ts';
function funded() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  return s;
}
test('Manor upgrade charges once and retains old production and locks until the full duration', () => {
  const s = funded();
  const oldRates = rates(s);
  assert.equal(upgrade(s, 6), '');
  assert.equal(s.resources.gold, 920);
  assert.equal(s.resources.wood, 965);
  assert.match(upgrade(s, 6), /en cours/);
  assert.equal(s.resources.gold, 920);
  assert.equal(s.lots[6].level, 1);
  assert.deepEqual(rates(s), oldRates);
  assert.ok(buildUnlockReason(s, 'crypt'));
  advanceBuildingUpgrades(s, 59.9);
  assert.equal(s.lots[6].level, 1);
  advanceBuildingUpgrades(s, 0.1);
  assert.equal(s.lots[6].level, 2);
  assert.equal(s.lots[6].upgrading, undefined);
  assert.equal(upgrade(s, 6), '');
  assert.equal(s.lots[6].upgrading.duration, 90);
});
test('Every upgradeable building waits, keeps its HP, and completes once', () => {
  for (const kind of ['den', 'canteen', 'crypt', 'forge', 'guild']) {
    const s = funded();
    s.lots[6].level = 3;
    Object.assign(s.lots[7], { owned: true, kind, level: 1, hp: 70 });
    assert.equal(upgrade(s, 7), '');
    const duration = upgradeDuration(s.lots[7]);
    assert.ok(duration >= 30 && duration <= 60);
    advanceBuildingUpgrades(s, duration - 1);
    assert.equal(s.lots[7].level, 1);
    assert.equal(advanceBuildingUpgrades(s, 1).length, 1);
    assert.equal(s.lots[7].level, 2);
    assert.equal(s.lots[7].hp, 70);
    assert.equal(advanceBuildingUpgrades(s, 1).length, 0);
  }
});
test('Simulation ticks drive the countdown; invalid time and ended games do not', () => {
  const s = funded();
  upgrade(s, 6);
  tick(s, 0.25);
  assert.equal(s.lots[6].upgrading.remaining, 59.75);
  for (const dt of [0, -1, NaN, Infinity]) advanceBuildingUpgrades(s, dt);
  assert.equal(s.lots[6].upgrading.remaining, 59.75);
  s.lost = true;
  advanceBuildingUpgrades(s, 90);
  assert.equal(s.lots[6].level, 1);
});
test('Destroyed, captured and replaced buildings lose their pending upgrade', () => {
  for (const change of [{ hp: 0 }, { owned: false }, { kind: 'empty' }]) {
    const s = funded();
    upgrade(s, 6);
    Object.assign(s.lots[6], change);
    advanceBuildingUpgrades(s, 90);
    assert.equal(s.lots[6].level, 1);
    assert.equal(s.lots[6].upgrading, undefined);
  }
});
