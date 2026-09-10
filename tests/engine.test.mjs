import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
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
} from '../app/game/engine.ts';

function advance(s, seconds) {
  for (let i = 0; i < seconds * 10; i++) tick(s, 0.1);
}
function until(s, condition, limit = 300) {
  for (let i = 0; i < limit * 10 && !condition(); i++) tick(s, 0.1);
  assert.ok(condition(), 'Condition reached within simulation budget');
}

test('Playable opening reaches victory with earned resources and normal recruits', () => {
  const s = createGame();
  assert.equal(build(s, 7, 'canteen'), '');
  assert.equal(claim(s, 4), '');
  assert.equal(build(s, 4, 'forge'), '');
  until(s, () => s.lots[7].kind === 'canteen' && s.lots[4].kind === 'forge');
  assert.ok(s.units.every((u) => u.kind === 'goblin'));
  for (let i = 0; i < 3; i++) {
    until(s, () => s.resources.gold >= 60 && s.resources.food >= 20);
    assert.equal(recruit(s, 'troll'), '');
  }
  until(s, () => s.units.filter((u) => u.kind === 'troll').length === 3);
  assert.equal(attack(s, 1), '');
  until(s, () => s.lots[1].owned);
  assert.equal(attack(s, 2), '');
  until(s, () => s.won);
  assert.ok(s.lots[2].owned);
  assert.ok(s.units.some((u) => u.kind === 'troll'));
  assert.ok(
    Object.values(s.resources).every((v) => v >= 0 && Number.isFinite(v)),
  );
  console.log(
    `Normal opening: victory at ${Math.round(s.elapsed)} seconds with ${s.units.length} creatures.`,
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
  s.resources = { gold: 9999, wood: 9999, food: 9999, mana: 9999 };
  for (let i = 0; i < 9; i++) assert.equal(recruit(s, 'goblin'), '');
  assert.equal(population(s), capacity(s));
  const before = s.resources.gold;
  assert.ok(recruit(s, 'goblin'));
  assert.equal(s.resources.gold, before);
  advance(s, 7);
  assert.equal(s.units.length, 12);
});

test('Retreat stops attacks and injured creatures heal at the manor', () => {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources.gold = 500;
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

test('A defeated assault is recoverable; resources stay finite over long simulation', () => {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.lots[1].owned = true;
  assert.equal(recruit(s, 'troll'), '');
  advance(s, 7);
  assert.equal(attack(s, 2), '');
  until(s, () => !s.units.some((u) => u.kind === 'troll'));
  assert.equal(s.won, false);
  advance(s, 900);
  assert.ok(
    Object.values(s.resources).every((v) => v >= 0 && Number.isFinite(v)),
  );
  assert.ok(s.units.length >= 3);
  assert.ok(s.resources.gold > 60);
});

test('Upgrades change production and cannot exceed level three', () => {
  const s = createGame();
  s.resources.gold = 999;
  s.resources.wood = 999;
  const before = rates(s).gold;
  assert.equal(upgrade(s, 6), '');
  assert.ok(rates(s).gold > before);
  assert.equal(upgrade(s, 6), '');
  assert.ok(upgrade(s, 6));
  assert.equal(s.lots[6].level, 3);
});

test('Skeleton and minotaur progression is reachable from a developed domain', () => {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.equal(claim(s, 4), '');
  assert.equal(build(s, 4, 'forge'), '');
  assert.equal(build(s, 7, 'crypt'), '');
  until(s, () => s.lots[4].kind === 'forge' && s.lots[7].kind === 'crypt');
  assert.equal(recruit(s, 'skeleton'), '');
  assert.equal(recruit(s, 'minotaur'), '');
  advance(s, 16);
  assert.ok(s.units.some((u) => u.kind === 'skeleton'));
  assert.ok(s.units.some((u) => u.kind === 'minotaur'));
  assert.equal(population(s), 7);
});
