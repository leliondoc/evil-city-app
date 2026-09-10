import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  territory,
  humanLevel,
  recruit,
  attack,
  claim,
  build,
  upgrade,
  retreat,
  defend,
  intercept,
  entrance,
  rates,
  capacity,
} from '../app/game/engine.ts';

function advance(s, seconds) {
  for (let i = 0; i < seconds * 10; i++) tick(s, 0.1);
}
function until(s, condition, limit = 300) {
  for (let i = 0; i < limit * 10 && !condition() && !s.lost; i++) tick(s, 0.1);
  assert.ok(
    condition(),
    `Condition not reached at ${Math.round(s.elapsed)}s: ${s.journal[0]}`,
  );
}
function fifthParcel(s) {
  s.lots[4].owned = true;
  s.lots[8].owned = true;
}
function armyFixture(s, count = 4) {
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
  for (let i = 0; i < count; i++) assert.equal(recruit(s, 'troll'), '');
  advance(s, 7);
}

test('Expansion triggers a visible warning, then a moving guard patrol; falling below the threshold does not reset it', () => {
  const s = createGame();
  s.lots[4].owned = true;
  advance(s, 1);
  assert.equal(s.mobilization.guard.active, false);
  s.lots[8].owned = true;
  advance(s, 0.1);
  assert.equal(territory(s), 5 / 9);
  assert.equal(s.mobilization.guard.active, true);
  assert.match(s.mobilization.guard.reason, /56 %/);
  assert.equal(s.enemies.length, 0);
  const deadline = s.mobilization.guard.nextRaidAt;
  s.lots[8].owned = false;
  advance(s, 24);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.mobilization.guard.nextRaidAt, deadline);
  advance(s, 2);
  assert.equal(s.enemies.length, 2);
  const first = s.enemies[0],
    start = { x: first.x, y: first.y };
  advance(s, 1);
  assert.ok(Math.hypot(first.x - start.x, first.y - start.y) > 0.5);
  assert.notEqual(first.target, 6, 'Guards target outer properties first');
});

test('Time mobilizes humans even with no expansion; future raids grow stronger', () => {
  const early = createGame();
  advance(early, 179);
  assert.equal(early.mobilization.guard.active, false);
  advance(early, 2);
  assert.equal(early.mobilization.guard.active, true);
  until(early, () => early.enemies.length > 0);
  const later = createGame();
  later.elapsed = 480;
  later.economy.level = 5; // A developed, funded human settlement.
  later.economy.nextUpgradeAt = 600;
  later.economy.stocks = { gold: 100, wood: 100, food: 100 };
  advance(later, 0.1);
  until(later, () => later.enemies.length > 0);
  assert.ok(later.enemies[0].maxHp > early.enemies[0].maxHp);
  assert.ok(later.enemies[0].damage > early.enemies[0].damage);
  assert.ok(later.enemies.length > early.enemies.length);
  assert.equal(humanLevel(later), 5);
});

test('The guild has its own territory/time trigger and sends heroes against the manor', () => {
  const s = createGame();
  fifthParcel(s);
  advance(s, 0.1);
  assert.equal(s.mobilization.hero.active, false);
  s.lots[5].owned = true;
  advance(s, 0.1);
  assert.equal(s.mobilization.hero.active, true);
  advance(s, 34);
  assert.equal(s.enemies.filter((e) => e.kind === 'hero').length, 0);
  advance(s, 2);
  assert.ok(s.enemies.some((e) => e.kind === 'hero' && e.target === 6));
  const timed = createGame();
  timed.lots[2].owned = true; // No guard pressure: isolate the guild timer.
  timed.elapsed = 359;
  advance(timed, 0.5);
  assert.equal(timed.mobilization.hero.active, false);
  advance(timed, 1);
  assert.equal(timed.mobilization.hero.active, true);
});

test('Capturing a source cancels queued reinforcements but never deletes enemies already in the streets', () => {
  const s = createGame();
  fifthParcel(s);
  advance(s, 27);
  const ids = s.enemies.map((e) => e.id);
  s.lots[2].owned = true;
  advance(s, 0.1);
  assert.equal(s.mobilization.guard.active, false);
  assert.equal(s.mobilization.guard.nextRaidAt, null);
  assert.deepEqual(
    s.enemies.map((e) => e.id),
    ids,
  );
  assert.equal(
    s.mobilization.hero.active,
    true,
    'Taking a sixth parcel can awaken the guild',
  );
  s.lots[0].owned = true;
  advance(s, 0.1);
  assert.equal(s.mobilization.hero.nextRaidAt, null);
  assert.equal(s.won, false, 'Existing patrols still have to be defeated');
  s.lots[2].owned = false;
  advance(s, 0.1);
  assert.ok(
    s.mobilization.guard.nextRaidAt > s.elapsed,
    'Recaptured source gives a fresh warning',
  );
});

test('Guards reclaim property, cancel its workers and remove its housing/income', () => {
  const s = createGame();
  fifthParcel(s);
  advance(s, 27);
  const before = capacity(s),
    income = rates(s).gold;
  const e = s.enemies[0],
    lot = s.lots[3];
  Object.assign(e, entrance(lot), { target: lot.id, path: [] });
  lot.hp = 0.01;
  advance(s, 0.1);
  assert.equal(lot.owned, false);
  assert.equal(lot.kind, 'house');
  assert.ok(capacity(s) < before);
  assert.ok(rates(s).gold < income);
  const site = s.lots[8];
  for (const u of s.units) {
    u.x = 0;
    u.y = 0;
    u.path = [];
  }
  site.construction = { kind: 'crypt', progress: 0.1 };
  const worker = s.units[0];
  worker.task = 'build';
  worker.target = site.id;
  worker.path = [];
  worker.x = 0;
  worker.y = 0;
  Object.assign(e, entrance(site), { target: site.id, path: [] });
  site.hp = 0.01;
  advance(s, 0.1);
  assert.equal(site.owned, false);
  assert.equal(site.construction, null);
  assert.notEqual(worker.task, 'build');
});

test('Defenders intercept nearby patrols, win combat and obey a retreat order', () => {
  const s = createGame();
  armyFixture(s);
  s.lots[8].owned = true;
  until(s, () => s.enemies.length > 0);
  assert.equal(defend(s, 4), '');
  until(s, () => s.units.some((u) => u.task === 'defend'));
  assert.ok(s.enemies.length > 0);
  retreat(s);
  assert.ok(
    s.units.filter((u) => u.kind === 'troll').every((u) => u.task === 'move'),
  );
  assert.equal(intercept(s, s.enemies[0].id), '');
  until(s, () => s.defeatedEnemies >= 2);
  assert.ok(s.units.some((u) => u.kind === 'troll' && u.hp > 0));
});

test('The normal economy supports a victory after repelling a raid', () => {
  const s = createGame();
  assert.equal(build(s, 7, 'canteen'), '');
  assert.equal(claim(s, 4), '');
  assert.equal(build(s, 4, 'forge'), '');
  until(s, () => s.lots[4].kind === 'forge' && s.lots[7].kind === 'canteen');
  for (let i = 0; i < 5; i++) {
    until(s, () => s.resources.gold >= 60 && s.resources.food >= 20);
    assert.equal(recruit(s, 'troll'), '');
  }
  until(s, () => s.units.filter((u) => u.kind === 'troll').length === 5);
  assert.equal(defend(s, 4), '');
  until(s, () => s.defeatedEnemies >= 2);
  retreat(s);
  until(s, () =>
    s.units.filter((u) => u.kind === 'troll').every((u) => u.hp >= 99),
  );
  for (const id of [0, 1, 2]) {
    assert.equal(attack(s, id), '');
    until(s, () => s.lots[id].owned);
  }
  if (s.enemies.length) {
    assert.equal(intercept(s, s.enemies[0].id), '');
    until(s, () => s.won);
  }
  assert.equal(s.won, true);
  assert.ok(s.defeatedEnemies >= 2);
  console.log(
    `Defensive victory at ${Math.round(s.elapsed)}s with ${s.defeatedEnemies} enemies defeated.`,
  );
});

test('Ignoring human progress destroys the manor and freezes all state and orders', () => {
  const s = createGame();
  advance(s, 900);
  assert.equal(s.lost, true);
  assert.equal(s.won, false);
  assert.equal(s.lots[6].hp, 0);
  const snapshot = structuredClone(s);
  advance(s, 10);
  assert.ok(recruit(s, 'goblin'));
  assert.ok(build(s, 7, 'canteen'));
  assert.ok(claim(s, 4));
  assert.ok(upgrade(s, 6));
  assert.ok(attack(s, 0));
  assert.ok(defend(s));
  retreat(s);
  assert.deepEqual(s, snapshot);
  assert.ok(
    Object.values(s.resources).every((n) => Number.isFinite(n) && n >= 0),
  );
});

test('Large simulation steps preserve the same raid, combat and defeat outcome', () => {
  const a = createGame(),
    b = createGame();
  tick(a, 400);
  advance(b, 400);
  assert.equal(a.lost, b.lost);
  assert.ok(Math.abs(a.elapsed - b.elapsed) < 0.01);
  assert.equal(a.enemies.length, b.enemies.length);
  assert.deepEqual(a.resources, b.resources);
});
