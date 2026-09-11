import { upgradeAndFinish } from './upgrade-fixture.mjs';
import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick,
  build,
  claim,
  recruit,
  attack,
  retreat,
  findPath,
  population,
  capacity,
  CREATURES,
  rates,
  upgrade,
  entrance,
  intercept,
  defend,
  army,
  recruitReason,
  buildReason,
  claimReason,
  upgradeReason,
} from '../app/game/engine.ts';

function advance(s, seconds) {
  for (let i = 0; i < seconds * 10; i++) tick(s, 0.1);
}
function until(s, condition, limit = 300) {
  for (let i = 0; i < limit * 10 && !condition(); i++) tick(s, 0.1);
  assert.ok(condition(), 'Condition reached within simulation budget');
}

test('Starting at zero reaches every construction tier, funds trolls and repels the first raid', () => {
  const s = createGame();
  let assault = null;
  // Delivery routes expose workers: react to raids instead of waiting through attacks.
  const until = (state, condition, limit = 300) => {
    for (let i = 0; i < limit * 10 && !condition() && !state.lost; i++) {
      if (assault === null && army(state).length && state.enemies.length) {
        const home = entrance(state.lots[6]);
        const threat = [...state.enemies].sort(
          (a, b) =>
            Math.hypot(a.x - home.x, a.y - home.y) -
            Math.hypot(b.x - home.x, b.y - home.y),
        )[0];
        if (
          !army(state).some(
            (u) => u.task === 'defend' && u.target === threat.id,
          )
        )
          intercept(state, threat.id);
      } else if (
        assault !== null &&
        !state.lots[assault].owned &&
        !army(state).some((u) => u.task === 'attack' && u.target === assault)
      )
        attack(state, assault);
      tick(state, 0.1);
    }
    assert.ok(condition(), 'Opening progresses while defending the domain');
  };
  assert.deepEqual(s.resources, { gold: 0, wood: 0, food: 0, mana: 0 });
  const construct = (id, kind) => {
    until(s, () => !buildReason(s, id, kind));
    assert.equal(build(s, id, kind), '');
    until(s, () => s.lots[id].kind === kind);
  };
  construct(7, 'canteen');
  for (let i = 0; i < 3; i++) {
    until(s, () => !recruitReason(s, 'goblin'));
    recruit(s, 'goblin');
  }
  until(s, () => !claimReason(s, 4));
  assert.equal(claim(s, 4), '');
  until(s, () => !upgradeReason(s, 6));
  assert.equal(upgradeAndFinish(s, 6), '');
  construct(4, 'crypt');
  for (let i = 0; i < 3; i++) {
    until(s, () => !recruitReason(s, 'skeleton'));
    assert.equal(recruit(s, 'skeleton'), '');
  }
  until(s, () => army(s).length === 3);
  assert.equal(attack(s, 8), '');
  assault = 8;
  until(s, () => s.lots[8].owned);
  assault = null;
  assert.equal(defend(s, 4), '');
  until(s, () => !upgradeReason(s, 6));
  assert.equal(upgradeAndFinish(s, 6), '');
  construct(8, 'forge');
  until(s, () => !recruitReason(s, 'troll'));
  assert.equal(recruit(s, 'troll'), '');
  until(s, () => s.defeatedEnemies >= 2 && s.recruits.length === 0);
  assert.ok(s.units.some((u) => u.kind === 'troll'));
  assert.equal(s.lost, false);
  assert.ok(s.lots[6].hp > 0);
  assert.ok(
    Object.values(s.resources).every((v) => v >= 0 && Number.isFinite(v)),
  );
  console.log(
    `Zero-resource opening: forge and troll ready, raid repelled at ${Math.round(s.elapsed)}s.`,
  );
});

test('Invalid orders never debit resources or change ownership', () => {
  const s = createGame(),
    before = structuredClone(s.resources);
  assert.ok(build(s, 0, 'forge'));
  assert.ok(recruit(s, 'minotaur'));
  assert.ok(attack(s, 2));
  assert.ok(claim(s, 0));
  assert.deepEqual(s.resources, before);
  assert.equal(s.lots[0].owned, false);
  s.resources.gold = 80;
  s.resources.wood = 25;
  assert.equal(build(s, 7, 'canteen'), '');
  const after = structuredClone(s.resources);
  assert.ok(build(s, 7, 'forge'));
  assert.deepEqual(s.resources, after);
});

test('Pathfinding connects every parcel entrance without crossing building footprints', () => {
  const s = createGame();
  for (const from of s.lots)
    for (const to of s.lots) {
      const path = findPath(entrance(from), entrance(to));
      assert.ok(path.length > 0);
      for (const p of path) {
        assert.ok(p.x >= 0 && p.x < 32 && p.y >= 0 && p.y < 32);
        const blocked = s.lots.some(
          (l) =>
            p.x >= l.x + 1 && p.x < l.x + 7 && p.y >= l.y + 1 && p.y < l.y + 6,
        );
        assert.equal(blocked, false);
      }
      assert.deepEqual(path.at(-1), entrance(to));
    }
});

test('Queued recruitment reserves beds and cannot overfill the domain', () => {
  const s = createGame();
  s.lots[7].kind = 'crypt';
  s.resources = { gold: 9999, wood: 9999, food: 9999, mana: 9999 };
  for (let i = 0; i < 9; i++) assert.equal(recruit(s, 'skeleton'), '');
  assert.equal(population(s), capacity(s));
  const before = s.resources.gold;
  assert.ok(recruit(s, 'skeleton'));
  assert.equal(s.resources.gold, before);
  advance(s, 7);
  assert.equal(s.units.length, 12);
});

test('Retreat stops attacks and injured creatures heal at the manor', () => {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources.gold = 500;
  s.resources.food = 60;
  assert.equal(recruit(s, 'troll'), '');
  advance(s, 7);
  assert.equal(attack(s, 1), '');
  until(s, () => s.lots[1].hp < 140);
  retreat(s);
  const hp = s.lots[1].hp;
  advance(s, 80);
  assert.equal(s.lots[1].hp, hp);
  assert.equal(s.units.find((u) => u.kind === 'troll').hp, CREATURES.troll.hp);
});

test('A defeated assault leaves time to recover, but indefinite waiting loses the manor', () => {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.lots[1].owned = true;
  s.resources.gold = CREATURES.troll.cost.gold;
  s.resources.food = 60;
  assert.equal(recruit(s, 'troll'), '');
  advance(s, 7);
  assert.equal(attack(s, 2), '');
  until(s, () => !s.units.some((u) => u.kind === 'troll'));
  assert.equal(s.won, false);
  advance(s, 90);
  assert.ok(
    Object.values(s.resources).every((v) => v >= 0 && Number.isFinite(v)),
  );
  assert.ok(s.units.length >= 3);
  assert.ok(s.resources.gold > 60);
  advance(s, 900);
  assert.equal(s.lost, true);
  assert.equal(s.lots[6].hp, 0);
});

test('Upgrades change production and cannot exceed level three', () => {
  const s = createGame();
  s.resources.gold = 999;
  s.resources.wood = 999;
  const before = rates(s).mana;
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.ok(rates(s).mana > before);
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.ok(upgrade(s, 6));
  assert.equal(s.lots[6].level, 3);
});

test('Skeleton and minotaur progression is reachable from a developed domain', () => {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.lots[5].owned = true;
  s.lots[5].kind = 'canteen';
  assert.equal(claim(s, 4), '');
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.equal(build(s, 4, 'crypt'), '');
  until(s, () => s.lots[4].kind === 'crypt');
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.equal(build(s, 7, 'forge'), '');
  until(s, () => s.lots[7].kind === 'forge');
  assert.equal(recruit(s, 'skeleton'), '');
  assert.equal(recruit(s, 'minotaur'), '');
  advance(s, 16);
  assert.ok(s.units.some((u) => u.kind === 'skeleton'));
  assert.ok(s.units.some((u) => u.kind === 'minotaur'));
  assert.equal(population(s), 7);
});
