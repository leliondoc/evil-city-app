import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { tick, claim, CLAIM_COST, entrance } from '../app/game/engine.ts';
import { advanceStrategy, RACKET } from '../app/game/strategy.ts';
function setup() {
  const s = establishedGame();
  const t = s.strategy.towers[0], u = s.units[0];
  s.units = [u];
  Object.assign(u, { x: t.x, y: t.y, task: 'tower', target: t.id, path: [], nextMealAt: Infinity, nextRestAt: Infinity });
  Object.assign(t, { owned: true, occupant: u.id });
  s.workers = [];
  s.economy.workerReadyAt = Infinity;
  s.economy.nextUpgradeAt = Infinity;
  s.economy.stocks = { gold: 100, wood: 100, food: 100 };
  return { s, t, u };
}
function advance(s, seconds) { for (let i = 0; i < Math.ceil(seconds * 10); i++) tick(s, 0.1); }
test('Patrol warns at the theft threshold, pays once and physically evicts the tower', () => {
  const { s, t, u } = setup();
  t.racketStolen = RACKET.retaliation - 1;
  tick(s, 0.1);
  assert.equal(t.racketRaidAt, undefined);
  t.racketStolen++;
  tick(s, 0.1);
  assert.equal(t.racketRaidAt, s.elapsed + RACKET.warning);
  advance(s, 19);
  assert.equal(s.enemies.length, 0);
  advance(s, 1.1);
  assert.equal(s.enemies.filter(e => e.racketTower === t.id).length, 2);
  assert.equal(s.economy.stocks.gold, 84);
  assert.equal(s.economy.stocks.food, 92);
  assert.ok(s.enemies.every(e => Math.hypot(e.x - entrance(s.lots[2]).x, e.y - entrance(s.lots[2]).y) < 1));
  const manorHP = s.lots[6].hp;
  for (let i = 0; i < 1800 && t.owned; i++) tick(s, 0.1);
  assert.equal(t.owned, false, 'Guards reach, kill the garrison and reclaim the tower');
  assert.ok(!s.units.some(unit => unit.id === u.id));
  assert.equal(s.lots[6].hp, manorHP);
  for (let i = 0; i < 1000 && s.enemies.some(e => e.racketTower === t.id); i++) tick(s, 0.1);
  assert.equal(s.enemies.filter(e => e.racketTower === t.id).length, 0, 'Patrol returns home');
});
test('No instant or free patrol: scarce funds, a bribe and captured town hall delay or cancel it', () => {
  for (const reason of ['funds', 'bribe', 'captured']) {
    const { s, t } = setup();
    t.racketStolen = 80;
    if (reason === 'funds') s.economy.stocks = { gold: 0, wood: 0, food: 0 };
    if (reason === 'bribe') s.domain.bribedUntil = 100;
    if (reason === 'captured') s.lots[2].owned = true;
    advance(s, 25);
    assert.equal(s.enemies.filter(e => e.racketTower === t.id).length, 0, reason);
  }
});
test('Racket stores up to 120 per resource without inventing cargo or taxing the same load twice', () => {
  const { s, t } = setup();
  t.loot.food = 118;
  const w = { id: s.nextId++, x: t.x, y: t.y, hp: 35, cargo: 10, site: 0, taxed: false };
  s.workers = [w];
  advanceStrategy(s, 0.1);
  assert.equal(t.loot.food, 120);
  assert.equal(w.cargo, 8);
  assert.equal(t.racketStolen, 2);
  advanceStrategy(s, 0.1);
  assert.equal(w.cargo, 8);
});
test('Wasteland purchase debits the new price and refuses the former price', () => {
  const { s } = setup();
  s.resources = { gold: 40, mana: 18, wood: 0, food: 0 };
  assert.ok(claim(s, 4));
  assert.equal(s.resources.gold, 40);
  s.resources.gold = CLAIM_COST.gold;
  s.resources.mana = CLAIM_COST.mana;
  assert.equal(claim(s, 4), '');
  assert.equal(s.resources.gold, 0);
  assert.equal(s.resources.mana, 0);
  assert.equal(s.lots[4].owned, true);
});
