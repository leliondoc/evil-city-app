import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tick, entrance, CREATURES, UPGRADE_SUPPLIES } from '../app/game/engine.ts';
import { advanceHumanBuildings, humanBuildingHealth } from '../app/game/humanBuildings.ts';
import { buildingArt, buildingHasTowers, ASSETS } from '../app/game/art.ts';

function town(level = 1) {
  const s = createGame();
  s.workers = [];
  s.economy.workerReadyAt = Infinity;
  s.economy.stocks = { gold: 0, wood: 0, food: 0 };
  s.economy.level = level;
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  advanceHumanBuildings(s);
  return s;
}

test('Advanced human buildings withstand siege while the first houses remain approachable', () => {
  const s = town();
  assert.equal(s.lots.find(l => l.kind === 'hall').hp, 900);
  assert.equal(s.lots.find(l => l.kind === 'guild').hp, 550);
  assert.equal(s.lots.find(l => l.kind === 'house' && !l.owned).hp, 85);
  for (const kind of ['hall', 'guild', 'tavern', 'house']) {
    for (let level = 2; level <= 6; level++)
      assert.ok(humanBuildingHealth(kind, level) > humanBuildingHealth(kind, level - 1));
  }
  assert.equal(humanBuildingHealth('hall', 6), 1800);
  assert.equal(humanBuildingHealth('guild', 6), 1200);
});

test('City upgrades require actual supplies and also reinforce the buildings once', () => {
  const s = town();
  s.elapsed = s.economy.nextUpgradeAt;
  const hall = s.lots.find(l => l.kind === 'hall');
  tick(s, 0.1);
  assert.equal(hall.level, 1);
  s.economy.stocks = { ...UPGRADE_SUPPLIES };
  tick(s, 0.1);
  assert.equal(hall.level, 2);
  assert.equal(hall.hp, 1080);
  assert.deepEqual(s.economy.stocks, { gold: 0, wood: 0, food: 0 });
  tick(s, 0.1);
  assert.equal(hall.maxHp, 1080);
});

test('Fortifications preserve damage ratio and cannot restore a besieged or haunted building', () => {
  const s = town();
  const hall = s.lots.find(l => l.kind === 'hall');
  hall.hp /= 2;
  s.economy.level = 3;
  s.units.push({ id: 500, kind: 'troll', hp: 100, task: 'attack', target: hall.id });
  advanceHumanBuildings(s);
  assert.equal(hall.hp, 450);
  assert.equal(hall.level, 1);
  s.units = [];
  hall.hauntedUntil = 10;
  advanceHumanBuildings(s);
  assert.equal(hall.level, 1);
  hall.hauntedUntil = 0;
  advanceHumanBuildings(s);
  assert.equal(hall.level, 3);
  assert.equal(hall.hp / hall.maxHp, 0.5);
  hall.owned = true;
  s.economy.level = 6;
  advanceHumanBuildings(s);
  assert.equal(hall.level, 3);
});

test('Human development changes the models and adds towers to the advanced town hall', () => {
  for (const kind of ['hall', 'guild', 'tavern', 'house']) {
    const early = buildingArt(kind, false, 1, 5);
    const reinforced = buildingArt(kind, false, 3, 5);
    const advanced = buildingArt(kind, false, 5, 5);
    for (const model of [early, reinforced, advanced]) assert.ok(ASSETS[model]);
    assert.notEqual(early, reinforced);
    if (kind !== 'hall') assert.notEqual(reinforced, advanced);
  }
  assert.equal(buildingHasTowers('hall', false, 5), true);
  assert.equal(buildingHasTowers('hall', false, 3), false);
  assert.equal(buildingHasTowers('hall', true, 6), false);
});

test('A fortified town hall still falls to a dedicated siege force and becomes a level-one captured property', () => {
  const s = town(6);
  const hall = s.lots.find(l => l.kind === 'hall');
  s.units = Array.from({ length: 2 }, () => ({
    id: s.nextId++, kind: 'minotaur', hp: CREATURES.minotaur.hp,
    ...entrance(hall), task: 'attack', target: hall.id, path: [], facing: 1,
    fighting: false, idleTime: 0, nextMealAt: Infinity, nextRestAt: Infinity,
  }));
  for (let i = 0; i < 300 && !hall.owned; i++) tick(s, 0.1);
  assert.equal(hall.owned, true);
  assert.equal(hall.level, 1);
  assert.ok(s.elapsed >= 10 && s.elapsed < 30, `Siege lasted ${s.elapsed}s`);
  assert.equal(s.units.filter(u => u.hp > 0).length, 2);
});

test('A human recapture restores the current city fortifications rather than an obsolete level-one building', () => {
  const s = town(6);
  const lot = s.lots[5];
  lot.owned = true;
  lot.kind = 'forge';
  lot.level = 3;
  lot.hp = 1;
  s.enemies = [{
    id: s.nextId++, kind: 'guard', role: 'warrior', level: 6,
    ...entrance(lot), hp: 100, maxHp: 100, damage: 1000,
    path: [], target: lot.id, facing: 1, fighting: false, healTarget: null,
    attackCooldown: 0,
  }];
  tick(s, 0.1);
  assert.equal(lot.owned, false);
  assert.equal(lot.kind, 'house');
  assert.equal(lot.level, 6);
  assert.equal(lot.maxHp, 230);
});
