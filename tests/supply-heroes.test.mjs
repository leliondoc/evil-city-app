import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick,
  recruit,
  raidSupply,
  retreat,
  humanLevel,
  UPGRADE_SUPPLIES,
  HEROES,
  heroParty,
  entrance,
  resourceApproach,
} from '../app/game/engine.ts';
import { ASSETS, enemyAnimationSequence, workerArt } from '../app/game/art.ts';
import catalog from '../app/game/bestiary.json' with { type: 'json' };

function hero(s, role, x = 10.5, y = 10.5) {
  const def = HEROES[role];
  const e = {
    id: s.nextId++,
    kind: 'hero',
    role,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    level: 1,
    path: [],
    target: 6,
    facing: 1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  };
  s.enemies.push(e);
  return e;
}
function fighters(s) {
  s.lots[7].kind = 'forge';
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.equal(recruit(s, 'troll'), '');
  tick(s, 7);
  return s.units.find((u) => u.kind === 'troll');
}
test('Human stocks increase only after workers harvest and physically deliver cargo', () => {
  const s = createGame();
  s.economy.workerReadyAt = Infinity; // Isolate deliveries from recruitment spending.
  const initial = { ...s.economy.stocks };
  tick(s, 1);
  assert.deepEqual(s.economy.stocks, initial);
  assert.ok(s.workers.some((w) => w.path.length));
  tick(s, 64);
  for (const kind of ['gold', 'wood', 'food']) {
    assert.ok(s.economy.delivered[kind] >= 10, kind);
    assert.equal(
      s.economy.stocks[kind] - initial[kind],
      s.economy.delivered[kind],
    );
  }
});
test('Upgrades wait for every required resource, spend stocks once, and stop at level six', () => {
  const s = createGame();
  s.workers = [];
  for (const site of s.sites) site.recruitAt = 10000;
  s.economy.stocks = { gold: 25, wood: 19, food: 15 };
  s.elapsed = s.economy.nextUpgradeAt + 1;
  tick(s, 1);
  assert.equal(humanLevel(s), 1);
  s.economy.stocks.wood = 20;
  tick(s, 0.1);
  assert.equal(humanLevel(s), 2);
  assert.deepEqual(s.economy.stocks, { gold: 0, wood: 0, food: 0 });
  s.economy.level = 6;
  s.economy.nextUpgradeAt = 0;
  s.economy.stocks = { ...UPGRADE_SUPPLIES };
  tick(s, 1);
  assert.equal(humanLevel(s), 6);
  assert.deepEqual(s.economy.stocks, UPGRADE_SUPPLIES);
});
test('A scheduled raid waits for supplies and debits them when it departs', () => {
  const s = createGame();
  s.lots[4].owned = s.lots[8].owned = true;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.workers = [];
  for (const site of s.sites) site.recruitAt = 10000;
  tick(s, 27);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.mobilization.guard.starved, true);
  s.economy.stocks = { gold: 16, wood: 0, food: 8 };
  tick(s, 0.1);
  assert.equal(s.enemies.length, 2);
  assert.equal(s.mobilization.guard.starved, false);
  assert.equal(s.economy.stocks.gold, 0);
  assert.equal(s.economy.stocks.food, 0);
});
test('Sabotage cuts a supply route; repair needs time and money; captured delivery buildings halt it', () => {
  const s = createGame(),
    u = fighters(s),
    site = s.sites[2];
  Object.assign(u, resourceApproach(site), { path: [] });
  assert.equal(raidSupply(s, { type: 'resource', id: site.id }), '');
  tick(s, 20);
  assert.equal(site.hp, 0);
  assert.ok(site.repairAt > s.elapsed);
  assert.equal(
    s.workers.some((w) => w.site === site.id),
    false,
  );
  const delivered = s.economy.delivered.wood;
  retreat(s);
  s.elapsed = site.repairAt + 1;
  s.economy.stocks = { gold: 0, food: 0, wood: 0 };
  tick(s, 0.1);
  assert.equal(site.hp, 0);
  assert.equal(s.economy.delivered.wood, delivered);
  s.economy.stocks = { gold: 18, food: 5, wood: 10 };
  tick(s, 0.1);
  assert.equal(site.hp, site.maxHp);
  assert.ok(s.workers.some((w) => w.site === site.id));
  s.lots[site.home].owned = true;
  tick(s, 50);
  assert.equal(s.economy.delivered.wood, delivered);
});
test('Killing a loaded peasant loses its delivery, awards cargo and delays replacement', () => {
  const s = createGame(),
    u = fighters(s),
    w = s.workers[0];
  const site = s.sites[w.site];
  Object.assign(w, {
    x: site.x,
    y: site.y,
    phase: 'harvest',
    cargo: 10,
    progress: 0,
    hp: 0.01,
    path: [],
  });
  Object.assign(u, { x: w.x, y: w.y, path: [] });
  const before = s.resources.food,
    deliveries = s.economy.delivered.food;
  assert.equal(raidSupply(s, { type: 'worker', id: w.id }), '');
  tick(s, 0.1);
  assert.equal(
    s.workers.some((p) => p.id === w.id),
    false,
  );
  assert.ok(s.resources.food > before + 9);
  assert.equal(s.economy.delivered.food, deliveries);
  assert.ok(site.recruitAt >= s.elapsed + 39);
});
test('Archers fire travelling projectiles and buildings block their line of fire', () => {
  const s = createGame();
  s.units = [s.units[0]];
  Object.assign(s.units[0], { x: 14.5, y: 10.5, path: [], idleTime: 0 });
  const archer = hero(s, 'archer');
  const hp = s.units[0].hp;
  tick(s, 0.1);
  assert.ok(s.projectiles.length);
  assert.equal(s.units[0].hp, hp);
  tick(s, 0.4);
  assert.ok(s.units[0].hp < hp);
  const blocked = createGame();
  blocked.units = [blocked.units[0]];
  // Opposite sides of the first building footprint.
  Object.assign(blocked.units[0], { x: 4.5, y: 8.5, path: [] });
  hero(blocked, 'archer', 2.5, 5.5);
  tick(blocked, 0.1);
  assert.equal(blocked.projectiles.length, 0);
  assert.equal(archer.fighting, true);
});
test('Monks retaliate before healing and deal double damage to skeletons and specters', () => {
  const losses = {};
  for (const kind of ['troll', 'skeleton', 'specter']) {
    const s = createGame();
    const u = s.units[0];
    s.units = [u];
    const monk = hero(s, 'monk', 12, 10.5);
    const ally = hero(s, 'warrior', 12, 11.5);
    ally.hp = 50;
    ally.damage = 0; // Measure the monk's damage independently of its wounded ally.
    Object.assign(u, {
      kind,
      x: 10.5,
      y: 10.5,
      hp: 50,
      task: kind === 'specter' ? 'duel' : 'defend',
      target: monk.id,
      path: [],
    });
    if (kind === 'specter') {
      monk.exorcising = u.id;
      monk.exorcismStreet = { x: u.x, y: u.y };
    }
    tick(s, 0.1);
    assert.equal(monk.fighting, true);
    assert.equal(monk.healTarget, null);
    assert.equal(ally.hp, 50);
    assert.ok(monk.hp < monk.maxHp);
    losses[kind] = 50 - u.hp;
  }
  assert.ok(Math.abs(losses.troll - 0.6) < 0.0001);
  assert.ok(Math.abs(losses.skeleton - losses.troll * 2) < 0.0001);
  assert.ok(Math.abs(losses.specter - losses.troll * 2) < 0.0001);
});
test('Monks heal wounded living allies without exceeding maximum HP and cannot damage the manor', () => {
  const s = createGame();
  s.units = [];
  const knight = hero(s, 'warrior');
  knight.hp -= 2;
  const monk = hero(s, 'monk', 10.8, 10.5);
  tick(s, 0.1);
  assert.ok(knight.hp > knight.maxHp - 2);
  assert.equal(monk.healTarget, knight.id);
  tick(s, 1);
  assert.ok(knight.hp <= knight.maxHp);
  s.enemies = [monk];
  Object.assign(monk, entrance(s.lots[6]));
  const hp = s.lots[6].hp;
  tick(s, 3);
  assert.equal(s.lots[6].hp, hp);
});
test('The expedition preview matches the funded raid at every human level', () => {
  for (let level = 1; level <= 6; level++) {
    const s = createGame();
    s.economy.level = level;
    s.economy.nextUpgradeAt = 1000;
    s.economy.stocks = { gold: 1000, wood: 1000, food: 1000 };
    for (const id of [4, 5, 8]) s.lots[id].owned = true;
    const preview = heroParty(level);
    tick(s, 36);
    assert.deepEqual(
      s.enemies.filter((e) => e.kind === 'hero').map((e) => e.role),
      preview,
    );
    assert.ok(
      preview.every((role) => HEROES[role]),
      `Only human heroes at level ${level}`,
    );
  }
});
test('The guild fields four human roles with complete animations; monsters stay in their own catalogue', () => {
  const s = createGame();
  s.economy.level = 4;
  s.economy.nextUpgradeAt = 1000;
  s.economy.stocks = { gold: 1000, wood: 1000, food: 1000 };
  for (const id of [4, 5, 8]) s.lots[id].owned = true;
  tick(s, 36);
  assert.deepEqual(
    s.enemies
      .filter((e) => e.kind === 'hero')
      .map((e) => e.role)
      .sort(),
    Object.keys(HEROES).sort(),
  );
  assert.equal(catalog.length, 26);
  assert.equal(catalog.filter((e) => e.group === 'humans').length, 4);
  assert.equal(
    catalog.find((e) => e.original === 'Hex Shaman').group,
    'creatures',
  );
  for (const entry of catalog)
    for (const action of ['idle', 'walk', 'attack'])
      for (const key of entry.actions[action])
        assert.ok(ASSETS[key]?.frames > 0, key);
  for (const e of s.enemies)
    for (const action of ['idle', 'walk', 'attack'])
      assert.ok(ASSETS[enemyAnimationSequence(e, action)[0]]);
  for (const w of s.workers) assert.ok(ASSETS[workerArt(w, s.sites[w.site])]);
});
