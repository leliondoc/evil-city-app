import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tick, HUMAN_WORKER_CAP } from '../app/game/engine.ts';

function populatedGame() {
  const s = createGame();
  s.economy.stocks = { gold: 1000, wood: 1000, food: 1000 };
  s.economy.nextUpgradeAt = Infinity;
  tick(s, 121);
  assert.equal(s.workers.length, HUMAN_WORKER_CAP);
  return s;
}

function kill(s, workers) {
  for (const worker of workers) worker.hp = 0;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  tick(s, 0.1);
}

test('An empty treasury cannot permanently block replacement after every peasant is killed', () => {
  const s = populatedGame();
  const fallen = new Set(s.workers.map((worker) => worker.id));
  const deliveries = { ...s.economy.delivered };
  kill(s, s.workers);
  assert.equal(s.workers.length, 0);
  tick(s, 39.9);
  assert.equal(s.workers.length, 0, 'The casualty delay still applies');
  tick(s, 0.2);
  assert.equal(s.workers.length, 1, 'The first replacement is guaranteed');
  assert.deepEqual(s.economy.stocks, { gold: 0, wood: 0, food: 0 });
  tick(s, 19);
  assert.equal(s.workers.length, 1, 'Replacements still arrive gradually');
  for (let i = 0; i < 200; i++) {
    tick(s, 1);
    assert.ok(s.workers.length <= HUMAN_WORKER_CAP);
    for (const site of s.sites)
      assert.ok(
        s.workers.filter((worker) => worker.site === site.id).length <= 2,
      );
    for (const stock of Object.values(s.economy.stocks)) assert.ok(stock >= 0);
  }
  assert.equal(s.workers.length, HUMAN_WORKER_CAP);
  assert.ok(s.workers.every((worker) => !fallen.has(worker.id)));
  for (const kind of ['gold', 'wood', 'food'])
    assert.ok(
      s.economy.delivered[kind] > deliveries[kind],
      `${kind} deliveries resume`,
    );
});

test('The food workers are replaced even when other peasants survive but cannot supply their recruitment cost', () => {
  const s = populatedGame();
  const food = s.sites.find((site) => site.kind === 'food');
  kill(
    s,
    s.workers.filter((worker) => worker.site === food.id),
  );
  assert.equal(s.workers.length, 4);
  tick(s, 39.9);
  assert.equal(s.workers.filter((worker) => worker.site === food.id).length, 0);
  tick(s, 0.2);
  assert.equal(s.workers.filter((worker) => worker.site === food.id).length, 1);
  tick(s, 80);
  assert.equal(s.workers.filter((worker) => worker.site === food.id).length, 2);
});

for (const interruption of ['capture', 'sabotage']) {
  test(`Replacements wait for a route blocked by ${interruption}, then resume without funds`, () => {
    const s = populatedGame();
    kill(s, s.workers);
    const site = s.sites[0];
    for (const other of s.sites.slice(1)) s.lots[other.home].owned = true;
    if (interruption === 'capture') s.lots[site.home].owned = true;
    else {
      site.hp = 0;
      site.repairAt = Infinity;
    }
    tick(s, 90);
    assert.equal(s.workers.length, 0, 'An inactive route cannot recruit');
    s.lots[site.home].owned = false;
    site.hp = site.maxHp;
    tick(s, 0.1);
    assert.equal(s.workers.length, 1);
    assert.equal(s.workers[0].site, site.id);
    tick(s, 45);
    assert.equal(s.workers.length, 2, 'Only the lost workers are replaced');
  });
}

test('Sabotage displaces living food workers without permanently preventing recruitment after repair', () => {
  const s = populatedGame();
  const site = s.sites.find((site) => site.kind === 'food');
  const delivered = s.economy.delivered.food;
  const displaced = new Set(s.workers.filter((w) => w.site === site.id).map((w) => w.id));
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  site.hp = 0;
  site.repairAt = site.recruitAt = s.elapsed + 90;
  tick(s, 0.1);
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 0);
  assert.equal(site.replacements, 2);
  assert.equal(s.domain.corpses.length, 0, 'Displaced workers were not killed');
  tick(s, 89.8);
  assert.equal(site.hp, 0);
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 0);
  assert.equal(s.economy.stocks.food, 0);
  tick(s, 0.2);
  assert.equal(site.hp, site.maxHp, 'Other routes fund the ordinary repair');
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 1);
  tick(s, 90);
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 2);
  assert.equal(site.replacements, 0);
  assert.ok(s.workers.every((w) => !displaced.has(w.id)));
  assert.ok(s.economy.delivered.food > delivered, 'Food deliveries actually resume');
});

test('Workers displaced by capture can return when humans reclaim a route with empty stocks', () => {
  const s = populatedGame();
  const site = s.sites.find((site) => site.kind === 'food');
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.lots[site.home].owned = true;
  tick(s, 0.1);
  assert.equal(site.replacements, 2);
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 0);
  s.lots[site.home].owned = false;
  tick(s, 60);
  assert.equal(s.workers.filter((w) => w.site === site.id).length, 2);
  assert.equal(site.replacements, 0);
});
