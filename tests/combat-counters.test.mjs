import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  commandUnits,
  CREATURES,
  HEROES,
  ENEMIES,
  entrance,
  armyDamage,
} from '../app/game/engine.ts';
import { hitEnemy, advanceStrategy } from '../app/game/strategy.ts';
import { monkDamage } from '../app/game/domain.ts';

function arena(kinds = ['skeleton'], role = 'lancer', level = 1) {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.economy.workerReadyAt = Infinity;
  for (const site of s.sites) site.recruitAt = Infinity;
  s.workers = [];
  s.units = kinds.map((kind, i) => ({
    id: s.nextId++,
    kind,
    hp: CREATURES[kind].hp,
    x: 14 - i * 0.8,
    y: 20.5,
    task: 'idle',
    target: null,
    path: [],
    facing: 1,
    fighting: false,
    idleTime: 0,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  }));
  const def = role === 'guard' ? ENEMIES.guard : HEROES[role];
  const hp = Math.round(def.hp * (1 + (level - 1) * 0.15));
  const enemy = {
    id: s.nextId++,
    kind: role === 'guard' ? 'guard' : 'hero',
    role: role === 'guard' ? 'warrior' : role,
    level,
    x: 15.7,
    y: 20.5,
    hp,
    maxHp: hp,
    damage: def.damage * (1 + (level - 1) * 0.12),
    path: [],
    target: 6,
    facing: -1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  };
  s.enemies = [enemy];
  return { s, enemy, unit: s.units[0] };
}

test('The knight has more health than the lancer at every human level', () => {
  assert.equal(HEROES.warrior.hp, 180);
  assert.equal(HEROES.lancer.hp, 110);
  for (let level = 1; level <= 6; level++) {
    assert.ok(
      arena([], 'warrior', level).enemy.hp >
        arena([], 'lancer', level).enemy.hp,
    );
  }
});

test('Mounted bonuses require completed research and stack with guard specialization only by target', () => {
  for (const [role, mounted, expected] of [
    ['guard', false, 14.85],
    ['guard', true, 14.85],
    ['archer', false, 11],
    ['archer', true, 16.5],
    ['monk', false, 11],
    ['monk', true, 16.5],
    ['lancer', true, 11],
  ]) {
    const { s, unit, enemy } = arena(['spear-goblin'], role);
    if (mounted) s.strategy.research.push('pig-riding');
    else s.strategy.pendingResearch.push({ key: 'pig-riding', elapsed: 179 });
    const hp = enemy.hp;
    hitEnemy(s, unit, enemy, armyDamage(s, unit), 1);
    assert.ok(
      Math.abs(hp - enemy.hp - expected) < 1e-8,
      `${role}, mounted=${mounted}`,
    );
  }
});

test('Human specializations apply both to opportunistic attacks and retaliation', () => {
  for (const pursuit of [false, true]) {
    for (const [role, kind, mounted, expected] of [
      ['lancer', 'spear-goblin', true, 15],
      ['lancer', 'spear-goblin', false, 10],
      ['lancer', 'troll', false, 14],
      ['lancer', 'minotaur', false, 14],
      ['lancer', 'skeleton', false, 10],
      ['warrior', 'skeleton', false, 16.2],
      ['warrior', 'spear-goblin', false, 16.2],
      ['warrior', 'spear-goblin', true, 12],
      ['warrior', 'troll', false, 12],
      ['guard', 'skeleton', false, 6],
    ]) {
      const { s, unit, enemy } = arena([kind], role);
      if (mounted) s.strategy.research.push('pig-riding');
      // Explicit movement keeps the unit from initiating an attack of its own.
      Object.assign(unit, { task: 'move', path: [{ x: unit.x, y: unit.y }] });
      if (pursuit) enemy.pursuitTarget = unit.id;
      const hp = unit.hp;
      tick(s, 0.1);
      assert.ok(
        Math.abs(hp - unit.hp - expected * 0.1) < 1e-8,
        `${role}/${kind}/${mounted}/${pursuit}`,
      );
    }
  }
});

test('Archer bonus is carried by the travelling arrow, not applied instantly', () => {
  const { s, unit, enemy } = arena(['alchemist'], 'archer');
  unit.x = 12;
  const hp = unit.hp;
  tick(s, 0.1);
  assert.equal(unit.hp, hp);
  assert.ok(Math.abs(s.projectiles[0].damage - 9.36) < 1e-8);
  tick(s, 0.4);
  assert.ok(Math.abs(hp - unit.hp - 9.36) < 1e-8);
  assert.ok(enemy.hp > 0);
});

test('Troll beats an equal-level knight; a lancer remains dangerous to the troll', () => {
  for (const role of ['warrior', 'lancer']) {
    const { s, unit, enemy } = arena(['troll'], role);
    commandUnits(s, [unit.id], { type: 'enemy', id: enemy.id }, enemy);
    for (let i = 0; i < 200 && unit.hp > 0 && enemy.hp > 0; i++) tick(s, 0.1);
    if (role === 'warrior')
      assert.ok(
        enemy.hp <= 0 && unit.hp > 0,
        `Troll ${unit.hp}, knight ${enemy.hp}`,
      );
    else
      assert.ok(
        unit.hp <= 0 && enemy.hp > 0,
        `Troll ${unit.hp}, lancer ${enemy.hp}`,
      );
  }
});

test('An isolated lancer cannot hold off seven attacking skeletons, even at level six', () => {
  for (const level of [1, 6]) {
    const { s, enemy } = arena(Array(7).fill('skeleton'), 'lancer', level);
    commandUnits(
      s,
      s.units.map((u) => u.id),
      { type: 'enemy', id: enemy.id },
      enemy,
    );
    let elapsed = 0;
    for (; elapsed < 25 && enemy.hp > 0; elapsed += 0.1) tick(s, 0.1);
    assert.ok(
      enemy.hp <= 0,
      `Level ${level}: lancer still has ${enemy.hp} HP after ${elapsed}s`,
    );
    assert.ok(
      s.units.filter((u) => u.hp > 0).length >= 5,
      `Level ${level}: army took excessive losses`,
    );
  }
});

test('Minotaur sweep is limited to two nearby guards and does not hit heroes or distant guards', () => {
  const { s, unit, enemy } = arena(['minotaur'], 'guard');
  const others = [0.2, 0.4, 0.6, 5].map((offset) => ({
    ...structuredClone(enemy),
    id: s.nextId++,
    x: enemy.x + offset,
  }));
  const hero = {
    ...structuredClone(enemy),
    id: s.nextId++,
    kind: 'hero',
    role: 'warrior',
    y: enemy.y + 0.2,
  };
  s.enemies.push(...others, hero);
  hitEnemy(s, unit, enemy, armyDamage(s, unit), 0.1);
  assert.ok(Math.abs(55 - enemy.hp - 3.8) < 1e-8);
  for (const guard of others.slice(0, 2))
    assert.ok(Math.abs(55 - guard.hp - 1.52) < 1e-8);
  for (const other of [...others.slice(2), hero]) assert.equal(other.hp, 55);
});

test('Minotaur siege bonus applies to buildings, not to all targets', () => {
  const { s, unit } = arena(['minotaur']);
  s.enemies = [];
  const lot = s.lots.find((l) => !l.owned && l.kind === 'house');
  Object.assign(unit, entrance(lot), {
    task: 'attack',
    target: lot.id,
    path: [],
  });
  const hp = lot.hp;
  tick(s, 0.1);
  assert.ok(Math.abs(hp - lot.hp - 6.65) < 1e-8);
});

test('Solvent changes fire only, expires, and amplifies both burning and weapon fire', () => {
  for (const [role, fire] of [
    ['warrior', 2.5],
    ['lancer', 2.5],
    ['archer', 2],
    ['guard', 2],
  ]) {
    const { s, enemy } = arena(['alchemist'], role);
    s.strategy.research = ['solvent', 'embers'];
    const hp = enemy.hp;
    hitEnemy(s, s.units[0], enemy, 3, 1);
    assert.equal(hp - enemy.hp, 3);
    const goblin = { ...s.units[0], kind: 'goblin' };
    hitEnemy(s, goblin, enemy, 4, 1);
    assert.equal(hp - enemy.hp, 7 + 3 * fire);
    advanceStrategy(s, 1);
    assert.equal(hp - enemy.hp, 7 + 5 * fire);
    s.elapsed = 8;
    const before = enemy.hp;
    hitEnemy(s, goblin, enemy, 4, 1);
    assert.equal(before - enemy.hp, 7);
  }
});

test('Monk keeps exactly double damage against undead', () => {
  const { enemy } = arena([], 'monk');
  assert.equal(monkDamage(enemy, { kind: 'skeleton' }), 12);
  assert.equal(monkDamage(enemy, { kind: 'specter' }), 12);
  assert.equal(monkDamage(enemy, { kind: 'troll' }), 6);
});
