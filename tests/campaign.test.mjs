import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  CREATURES,
  BUILD_OPTIONS,
  buildMenuReason,
  PRESSURE,
  tick,
  recruit,
  build,
  upgrade,
  upgradeReason,
  commandUnits,
  army,
  attack,
  entrance,
  holdUnits,
  recruitReason,
} from '../app/game/engine.ts';
import {
  CAMPAIGN_MAPS,
  RALLY_POINT,
  advanceCampaign,
  campaignObjectives,
} from '../app/game/campaign.ts';
import { mission } from '../app/game/mission.ts';
import { research } from '../app/game/strategy.ts';

const until = (s, condition, seconds = 180) => {
  for (let i = 0; i < seconds * 10 && !condition() && !s.lost && !s.won; i++)
    tick(s, 0.1);
  assert.ok(
    condition(),
    `At ${s.elapsed.toFixed(1)}s, objective ${mission(s).current?.id}; ${s.notice}`,
  );
};

test('Three teaching settlements precede the original district and its optional guide', () => {
  const maps = Object.values(CAMPAIGN_MAPS).map((map) => createGame(map.id));
  assert.deepEqual(
    maps.map((s) => mission(s).objectives.length),
    [3, 4, 5, 11],
  );
  assert.equal(
    new Set(maps.map((s) => s.lots.map((l) => l.kind).join(','))).size,
    4,
  );
  assert.deepEqual(
    maps.map((s) => s.lots[6].level),
    [1, 1, 2, 1],
  );
  assert.equal(
    maps[0].lots.some((l) => l.kind === 'guild' || l.kind === 'hall'),
    false,
  );
  assert.equal(maps[1].lots.find((l) => l.kind === 'hall').id, 5);
  assert.equal(
    maps[1].lots.some((l) => l.kind === 'guild'),
    false,
  );
  assert.equal(maps[0].strategy.towers.length, 0);
  assert.equal(maps[2].strategy.towers.length, 1);
});

test('The refuge can be completed from its real starting resources by recruiting, building and moving two soldiers', () => {
  const s = createGame('refuge');
  assert.deepEqual(s.campaign.creatures, ['goblin']);
  assert.deepEqual(s.campaign.buildings, []);
  const resources = { ...s.resources };
  assert.ok(recruit(s, 'spear-goblin'));
  assert.ok(build(s, 7, 'canteen'));
  assert.ok(upgrade(s, 6));
  assert.ok(research(s, 'pig-riding'));
  assert.deepEqual(s.resources, resources);
  assert.equal(recruit(s, 'goblin'), '');
  until(s, () => mission(s).current?.id === 'canteen');
  assert.equal(build(s, mission(s).hint.action.lotId, 'canteen'), '');
  until(s, () => mission(s).current?.id === 'rally');
  assert.ok(s.campaign.creatures.includes('spear-goblin'));
  assert.ok(!s.campaign.creatures.includes('skeleton'));
  assert.equal(recruit(s, 'spear-goblin'), '');
  assert.equal(recruit(s, 'spear-goblin'), '');
  until(s, () => army(s).length === 2);
  assert.equal(s.won, false, 'Recruiting alone must not validate movement');
  assert.equal(mission(s).hint.action.type, 'rally');
  assert.equal(
    commandUnits(
      s,
      army(s).map((u) => u.id),
      null,
      RALLY_POINT,
    ),
    '',
  );
  until(s, () => s.won);
  assert.equal(s.campaign.completed.length, 3);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.workers.length, 0);
  assert.ok(s.elapsed < 180, 'First lesson remains short');
});

test('The faubourg teaches a real conquest, timed manor upgrade, crypt, skeleton and its relocated town hall', () => {
  const s = createGame('faubourg');
  const target = mission(s).hint.action.lotId;
  assert.equal(target, 8);
  assert.equal(attack(s, target), '');
  until(s, () => mission(s).current?.id === 'manor2');
  assert.equal(upgrade(s, 6), '');
  assert.equal(s.campaign.buildings.includes('crypt'), false);
  until(s, () => mission(s).current?.id === 'crypt-army');
  assert.equal(build(s, mission(s).hint.action.lotId, 'crypt'), '');
  until(s, () => s.campaign.creatures.includes('skeleton'));
  assert.equal(recruit(s, 'skeleton'), '');
  until(s, () => mission(s).current?.id === 'victory');
  assert.equal(mission(s).hint.action.lotId, 5);
  assert.ok(upgradeReason(s, 6));
  assert.equal(attack(s, 5), '');
  until(s, () => s.won);
  assert.ok(campaignObjectives(s).every((o) => o.done));
  assert.equal(s.mobilization.guard.waves, 0);
});

test('Lessons stay completed and unlocked cards persist after casualties or building loss', () => {
  const s = createGame('faubourg');
  Object.assign(s.lots[8], { owned: true });
  s.lots[6].level = 2;
  advanceCampaign(s);
  Object.assign(s.lots[8], { kind: 'crypt' });
  advanceCampaign(s);
  s.units.push({ ...s.units[2], id: s.nextId++, kind: 'skeleton' });
  advanceCampaign(s);
  s.units = [];
  s.lots[8].owned = false;
  advanceCampaign(s);
  assert.equal(mission(s).current.id, 'victory');
  assert.ok(s.campaign.creatures.includes('skeleton'));
  assert.match(recruitReason(s, 'skeleton'), /crypte/);
  const before = structuredClone(s);
  mission(s);
  assert.deepEqual(s, before, 'Reading guidance has no side effects');
});

test('The Remparts lesson reveals specialists in stages and cannot finish just by buying advanced buildings', () => {
  const s = createGame('remparts');
  assert.ok(recruit(s, 'specter'));
  assert.ok(!s.campaign.buildings.includes('forge'));
  s.lots[6].level = 3;
  advanceCampaign(s);
  assert.ok(s.campaign.creatures.includes('specter'));
  assert.ok(s.campaign.buildings.includes('forge'));
  Object.assign(s.lots[8], { owned: true, kind: 'forge' });
  advanceCampaign(s);
  assert.ok(s.campaign.creatures.includes('troll'));
  assert.ok(s.campaign.creatures.includes('alchemist'));
  assert.ok(!s.campaign.creatures.includes('minotaur'));
  assert.equal(recruit(s, 'troll'), '');
  until(s, () => s.campaign.creatures.includes('minotaur'));
  assert.equal(s.won, false);
  s.lots[0].owned = s.lots[2].owned = true;
  s.enemies = [];
  s.projectiles = [];
  tick(s, 0.1);
  assert.equal(s.won, true);
});

test('Les Tilleuls preserves the original starting state, unlock rules and pressure', () => {
  const s = createGame('tilleuls');
  const original = createGame();
  const { campaign, ...simulation } = s;
  assert.equal(campaign.mapId, 'tilleuls');
  assert.deepEqual(simulation, original);
  assert.deepEqual(s.resources, { gold: 35, wood: 0, food: 24, mana: 0 });
  assert.equal(s.units.length, 0);
  assert.equal(s.lots[6].level, 1);
  assert.equal(s.lots[4].owned, false);
  assert.equal(s.lots[4].kind, 'empty');
  assert.equal(s.lots[7].kind, 'empty');
  assert.equal(
    CAMPAIGN_MAPS.tilleuls.ground,
    undefined,
    'Keep the original terrain patches',
  );
  assert.equal(PRESSURE.guard.time, 540);
  assert.equal(PRESSURE.hero.time, 480);
  assert.equal(PRESSURE.firstUpgradeAt, 360);
  for (const state of [s, original]) {
    state.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
    state.lots[6].level = 3;
    Object.assign(state.lots[5], { owned: true, kind: 'forge' });
    Object.assign(state.lots[4], { owned: true, kind: 'crypt' });
    Object.assign(state.lots[7], { owned: true, kind: 'canteen' });
  }
  advanceCampaign(s);
  for (const kind of Object.keys(CREATURES))
    assert.equal(recruitReason(s, kind), recruitReason(original, kind));
  for (const kind of BUILD_OPTIONS)
    assert.equal(buildMenuReason(s, kind), buildMenuReason(original, kind));
  assert.equal(
    recruitReason(s, 'minotaur'),
    '',
    'No tutorial requirement to recruit a troll first',
  );
});

test('The classic district can be won without completing the tutorial checklist', () => {
  const s = createGame('tilleuls');
  s.lots[0].owned = s.lots[2].owned = true;
  tick(s, 0.1);
  assert.equal(s.won, true);
  assert.equal(s.lots[6].level, 1);
  assert.equal(s.units.length, 0);
});

test('Soldiers wait after arrival, retaliate in range and accept a new attack; Hold remains indefinite', () => {
  const s = createGame('faubourg');
  const ids = army(s).map((u) => u.id);
  assert.equal(commandUnits(s, ids, null, { x: 10.5, y: 30.5 }), '');
  until(s, () => army(s).every((u) => u.task === 'idle' && !u.path.length));
  const positions = army(s).map((u) => ({ id: u.id, x: u.x, y: u.y }));
  tick(s, 20);
  assert.deepEqual(
    army(s).map((u) => ({ id: u.id, x: u.x, y: u.y })),
    positions,
  );
  assert.ok(army(s).every((u) => u.holdPosition));
  const u = army(s)[0];
  s.enemies.push({
    id: s.nextId++,
    kind: 'guard',
    x: u.x + 1,
    y: u.y,
    hp: 100,
    maxHp: 100,
    level: 1,
    damage: 0,
    path: [],
    target: 6,
    facing: 1,
    fighting: false,
  });
  tick(s, 0.1);
  assert.ok(s.enemies[0].hp < 100);
  assert.ok(army(s).every((u) => u.task === 'idle'));
  s.enemies = [];
  assert.equal(attack(s, 8), '');
  assert.ok(army(s).every((u) => !u.holdPosition && u.task === 'attack'));
  assert.equal(holdUnits(s, ids), '');
  assert.ok(army(s).every((u) => u.holdPosition && !u.path.length));
  const held = army(s).map((u) => ({ x: u.x, y: u.y }));
  tick(s, 200);
  assert.deepEqual(
    army(s).map((u) => ({ x: u.x, y: u.y })),
    held,
  );
  for (const u of army(s)) u.hp -= 10;
  assert.equal(
    commandUnits(s, ids, { type: 'lot', id: 3 }, entrance(s.lots[3])),
    '',
  );
  assert.ok(army(s).every((u) => !u.holdPosition && u.manualRest));
});

test('Automatic needs resume 30 seconds after arrival, and a new order restarts the grace period', () => {
  const s = createGame('faubourg');
  const unit = army(s)[0];
  Object.assign(unit, { x: -7.5, y: 31.5, path: [] });
  unit.nextMealAt = unit.nextRestAt = 0;
  assert.equal(commandUnits(s, [unit.id], null, { x: 36.5, y: 3.5 }), '');
  tick(s, 31);
  assert.equal(
    unit.manualUntil,
    Infinity,
    'A long walk is never interrupted by the grace timer',
  );
  until(s, () => unit.task === 'idle' && Number.isFinite(unit.manualUntil));
  tick(s, 29);
  assert.equal(unit.task, 'idle');
  assert.equal(commandUnits(s, [unit.id], null, { x: 21, y: 21 }), '');
  assert.equal(unit.manualUntil, Infinity);
  until(s, () => unit.task === 'idle' && Number.isFinite(unit.manualUntil));
  tick(s, 29);
  assert.equal(unit.task, 'idle');
  tick(s, 1.2);
  assert.equal(unit.manualUntil, undefined);
  assert.equal(unit.holdPosition, undefined);
  assert.equal(unit.task, 'eat');
});

test('Slow learners never trigger timed raids in either introductory map', () => {
  for (const id of ['refuge', 'faubourg']) {
    const s = createGame(id);
    tick(s, 650);
    assert.equal(s.won, false);
    assert.equal(s.lost, false);
    assert.equal(s.enemies.length, 0);
    assert.equal(s.economy.level, 1);
  }
});

test('Taking victory targets out of order never grants victory after they are lost again', () => {
  const s = createGame('tilleuls');
  s.lots[0].owned = s.lots[2].owned = true;
  advanceCampaign(s);
  assert.equal(s.won, false);
  s.lots[0].owned = false;
  s.lots[6].level = 3;
  Object.assign(s.lots[8], { owned: true, kind: 'forge' });
  tick(s, 0.1);
  assert.equal(s.won, false);
  assert.equal(
    mission(s).objectives.find((o) => o.id === 'victory').done,
    false,
  );
});
