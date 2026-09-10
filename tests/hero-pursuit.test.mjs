import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick,
  entrance,
  commandUnit,
  HEROES,
  PRESSURE,
  GUILD_RECOVERY_SECONDS,
} from '../app/game/engine.ts';
import { hitEnemy } from '../app/game/strategy.ts';
import { leaveCorpse } from '../app/game/domain.ts';

function assault() {
  const s = createGame();
  s.resources.food = 1000;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  const u = s.units[0];
  s.units = [u];
  Object.assign(u, entrance(s.lots[0]), {
    kind: 'troll',
    hp: 1000,
    task: 'attack',
    target: 0,
    path: [],
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  });
  return { s, u, guild: s.lots[0] };
}

function defeatedGarrison() {
  const setup = assault();
  const { s, u, guild } = setup;
  s.workers = [];
  s.economy.workerReadyAt = Infinity;
  tick(s, 0.1);
  const oldIds = s.enemies.map((e) => e.id);
  for (const e of s.enemies) e.hp = 0;
  s.units = [];
  tick(s, 0.1);
  return { s, u, guild, oldIds };
}

test('Guild recovery waits for the last defender and restores four defenders after 60 simulation seconds', () => {
  const { s, guild } = assault();
  s.workers = [];
  tick(s, 0.1);
  s.units = [];
  for (const e of s.enemies.slice(1)) e.hp = 0;
  tick(s, 0.1);
  assert.equal(guild.garrisonReturnsAt, undefined);
  s.enemies[0].hp = 0;
  tick(s, 0.1);
  const deadline = guild.garrisonReturnsAt;
  assert.equal(deadline, s.elapsed + GUILD_RECOVERY_SECONDS);
  tick(s, 0);
  assert.equal(
    guild.garrisonReturnsAt,
    deadline,
    'Pausing does not advance recovery',
  );
  tick(s, GUILD_RECOVERY_SECONDS - 0.2);
  assert.equal(guild.garrisonReleased, true);
  tick(s, 0.3);
  assert.equal(
    guild.garrisonReleased,
    false,
    'The visible four-person garrison is restored',
  );
  assert.equal(guild.garrisonReturnsAt, undefined);
  assert.equal(
    s.enemies.length,
    0,
    'Restored defenders stay at the guild until attacked',
  );
});

test('A restored guild deploys four fresh heroes once and can recover again after another defeat', () => {
  const { s, u, guild, oldIds } = defeatedGarrison();
  tick(s, GUILD_RECOVERY_SECONDS + 0.1);
  Object.assign(u, entrance(guild), {
    task: 'attack',
    target: guild.id,
    path: [],
    fighting: false,
  });
  s.units = [u];
  tick(s, 0.1);
  assert.equal(s.enemies.length, 4);
  assert.ok(
    s.enemies.every(
      (e) => e.garrisonLotId === guild.id && !oldIds.includes(e.id),
    ),
  );
  assert.ok(s.enemies.every((e) => e.pursuitTarget === u.id));
  const ids = s.enemies.map((e) => e.id);
  tick(s, 0.5);
  assert.deepEqual(
    s.enemies.map((e) => e.id),
    ids,
  );
  s.units = [];
  for (const e of s.enemies) e.hp = 0;
  tick(s, 0.1);
  assert.equal(guild.garrisonReturnsAt, s.elapsed + GUILD_RECOVERY_SECONDS);
});

test('Conquering or destroying the guild cancels its pending return and offensive raids', () => {
  for (const destroyed of [false, true]) {
    const { s, guild } = defeatedGarrison();
    if (destroyed) guild.hp = 0;
    else guild.owned = true;
    s.economy.stocks = { gold: 1000, food: 1000, wood: 1000 };
    tick(s, GUILD_RECOVERY_SECONDS + 1);
    assert.equal(guild.garrisonReturnsAt, undefined);
    assert.equal(s.enemies.length, 0);
    assert.equal(s.mobilization.hero.active, false);
  }
});

test('Haunting blocks the return until it ends without creating duplicate defenders', () => {
  const { s, u, guild } = defeatedGarrison();
  Object.assign(u, { kind: 'specter', task: 'haunt', target: guild.id, path: [] });
  s.units = [u];
  guild.hauntedBy = u.id;
  guild.hauntedUntil = s.elapsed + GUILD_RECOVERY_SECONDS + 5;
  tick(s, GUILD_RECOVERY_SECONDS + 1);
  assert.equal(guild.garrisonReleased, true);
  assert.ok(guild.garrisonReturnsAt < s.elapsed);
  tick(s, 5);
  assert.equal(guild.garrisonReleased, false);
  tick(s, 5);
  assert.equal(guild.garrisonReturnsAt, undefined);
});

test('Guild identity survives resurrection data and a living defender cancels replacement', () => {
  const { s, guild } = assault();
  tick(s, 0.1);
  const defender = s.enemies[0];
  leaveCorpse(s, defender, 'human');
  assert.equal(s.domain.corpses.at(-1).human.garrisonLotId, guild.id);
  guild.garrisonReturnsAt = s.elapsed + 10;
  tick(s, 0.1);
  assert.equal(guild.garrisonReturnsAt, undefined);
  assert.equal(guild.garrisonReleased, true);
});

test('The four visible guild defenders deploy once on actual damage, even without reinforcement funds', () => {
  const { s, u, guild } = assault();
  u.task = 'move';
  tick(s, 0.1);
  assert.equal(
    s.enemies.length,
    0,
    'Walking past the guild does not summon defenders',
  );
  u.task = 'attack';
  tick(s, 0.1);
  assert.equal(guild.garrisonReleased, true);
  assert.ok(guild.hp < guild.maxHp);
  assert.deepEqual(
    s.enemies.map((e) => e.role),
    Object.keys(HEROES),
  );
  assert.ok(s.enemies.every((e) => e.pursuitTarget === u.id));
  assert.equal(s.mobilization.hero.active, true);
  const ids = s.enemies.map((e) => e.id);
  tick(s, 1);
  assert.deepEqual(
    s.enemies.map((e) => e.id),
    ids,
    'No repeated free garrison',
  );
});

test('Guild defenders follow a fleeing assailant beyond sight and keep pursuing after the guild is captured', () => {
  const { s, u, guild } = assault();
  tick(s, 0.1);
  const heroes = [...s.enemies];
  const starts = heroes.map((e) => ({ x: e.x, y: e.y }));
  assert.equal(commandUnit(s, u.id, null, entrance(s.lots[6])), '');
  tick(s, 15);
  assert.ok(heroes.every((e) => e.pursuitTarget === u.id));
  assert.ok(
    heroes.every(
      (e, i) => Math.hypot(e.x - starts[i].x, e.y - starts[i].y) > 3,
    ),
  );
  assert.ok(heroes.some((e) => Math.hypot(e.x - u.x, e.y - u.y) > 5.5));
  guild.owned = true;
  tick(s, 3);
  assert.ok(heroes.every((e) => e.pursuitTarget === u.id));
  assert.equal(
    u.task,
    'move',
    'The pursuit never overrides the player retreat order',
  );
  u.hp = 0;
  tick(s, 0.1);
  assert.ok(heroes.every((e) => e.pursuitTarget === undefined));
  assert.ok(
    heroes
      .filter((e) => e.role !== 'monk')
      .every((e) => e.path.length || e.fighting),
  );
});

test('An attacked hero remembers the first living aggressor and can track a new one after its death', () => {
  const s = createGame();
  const [first, second] = s.units;
  Object.assign(first, {
    kind: 'skeleton',
    x: 20.5,
    y: 10.5,
    task: 'move',
    path: [],
    hp: 100,
  });
  Object.assign(second, { x: 11.5, y: 10.5, task: 'move', path: [] });
  const e = {
    id: s.nextId++,
    kind: 'hero',
    role: 'monk',
    x: 10.5,
    y: 10.5,
    hp: 85,
    maxHp: 85,
    damage: 0,
    level: 1,
    path: [],
    target: 6,
    facing: 1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  };
  s.enemies = [e];
  hitEnemy(s, first, e, 5, 0.1);
  hitEnemy(s, second, e, 5, 0.1);
  tick(s, 1);
  assert.equal(
    e.pursuitTarget,
    first.id,
    'A nearer decoy does not cancel the pursuit',
  );
  assert.ok(e.x > 10.5);
  first.hp = 0;
  tick(s, 0.1);
  assert.equal(e.pursuitTarget, second.id);
  second.hp = 0;
  tick(s, 0.1);
  assert.equal(e.pursuitTarget, undefined);
});

test('The guild launches an offensive expedition at eight minutes without player expansion', () => {
  const s = createGame();
  s.elapsed = 480;
  s.economy.nextUpgradeAt = 10000;
  s.economy.stocks = { gold: 100, wood: 100, food: 100 };
  tick(s, 0.1);
  assert.equal(PRESSURE.hero.time, 480);
  assert.equal(s.mobilization.hero.active, true);
  tick(s, PRESSURE.hero.warning + 1);
  assert.ok(
    s.enemies.some((e) => e.kind === 'hero' && e.target === 6 && e.path.length),
  );
});
