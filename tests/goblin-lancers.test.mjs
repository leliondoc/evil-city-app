import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  recruit,
  recruitReason,
  tick,
  moveUnit,
  unitSpeed,
  unitIsMounted,
  CREATURES,
  entrance,
  setRallyPoint,
  gather,
  playerFoodPoint,
  resourceApproach,
  findPath,
} from '../app/game/engine.ts';
import {
  research,
  researchReason,
  RESEARCH,
  hasResearch,
} from '../app/game/strategy.ts';
import { animationSequence, ASSETS, buildingArt } from '../app/game/art.ts';
import {
  BESTIARY_CREATURES,
  BESTIARY_HUMANS,
} from '../app/game/bestiaryCatalog.ts';

function prepared() {
  const s = createGame();
  s.resources = { gold: 900, wood: 900, food: 900, mana: 900 };
  Object.assign(s.lots[4], { owned: true, kind: 'crypt', construction: null });
  s.economy.workerReadyAt = Infinity;
  return s;
}
function unlock(s) {
  assert.equal(recruit(s, 'skeleton'), '');
  tick(s, 6.1);
  assert.ok(s.skeletonsAwakened);
}

test('Lanciers and their research unlock only after a skeleton has actually spawned, and stay unlocked after its death', () => {
  const s = prepared();
  assert.match(recruitReason(s, 'spear-goblin'), /premier squelette/);
  assert.match(researchReason(s, 'pig-riding'), /premier squelette/);
  assert.equal(recruit(s, 'skeleton'), '');
  assert.match(recruitReason(s, 'spear-goblin'), /premier squelette/);
  tick(s, 6.1);
  assert.equal(recruitReason(s, 'spear-goblin'), '');
  s.units = [];
  assert.equal(recruitReason(s, 'spear-goblin'), '');
  s.lots[3].kind = 'house';
  assert.match(recruitReason(s, 'spear-goblin'), /grotte/);
});

test('Both goblins recruit at the cave, and a lancier follows that cave’s rally point', () => {
  const s = prepared();
  unlock(s);
  assert.equal(setRallyPoint(s, 3, { x: 18, y: 21 }), '');
  assert.equal(recruit(s, 'spear-goblin', 6), '');
  assert.equal(s.recruits[0].source, 3);
  assert.equal(recruit(s, 'goblin'), '');
  assert.equal(s.recruits[1].source, 3);
  tick(s, 6.1);
  const spear = s.units.find((u) => u.kind === 'spear-goblin');
  assert.ok(
    Math.hypot(
      spear.x - entrance(s.lots[3]).x,
      spear.y - entrance(s.lots[3]).y,
    ) < 2,
  );
  assert.equal(spear.task, 'move');
  assert.deepEqual(spear.path.at(-1), s.lots[3].rallyPoint);
});

test('Pig riding pays once and upgrades current and future lanciers without changing workers or attack bonuses', () => {
  const s = prepared();
  unlock(s);
  assert.equal(recruit(s, 'spear-goblin'), '');
  tick(s, 6.1);
  const spear = s.units.find((u) => u.kind === 'spear-goblin');
  const before = { ...s.resources };
  assert.equal(research(s, 'pig-riding'), '');
  for (const [key, value] of Object.entries(RESEARCH['pig-riding'].cost))
    assert.equal(s.resources[key], before[key] - value);
  assert.equal(unitSpeed(s, spear), 3);
  assert.equal(unitSpeed(s, { kind: 'goblin' }), CREATURES.goblin.speed);
  assert.ok(unitIsMounted(s, spear));
  const paid = { ...s.resources };
  assert.match(research(s, 'pig-riding'), /acquise/);
  assert.deepEqual(s.resources, paid);
  assert.equal(recruit(s, 'spear-goblin'), '');
  tick(s, 6.1);
  assert.equal(s.units.filter((u) => unitIsMounted(s, u)).length, 2);
  assert.ok(hasResearch(s, 'pig-riding'));
  for (const action of ['idle', 'walk', 'attack']) {
    const sequence = animationSequence('spear-goblin', action, true);
    assert.deepEqual(sequence, [`pig-rider-${action}`]);
    assert.ok(ASSETS[sequence[0]].frames > 1);
  }
});

test('The mounted speed bonus applies to actual movement orders', () => {
  const s = prepared();
  unlock(s);
  recruit(s, 'spear-goblin');
  tick(s, 6.1);
  const u = s.units.find((u) => u.kind === 'spear-goblin');
  s.units = [u];
  Object.assign(u, {
    x: 12,
    y: 21,
    path: [],
    task: 'idle',
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  });
  moveUnit(s, u.id, { x: 18, y: 21 });
  const mounted = structuredClone(s);
  research(mounted, 'pig-riding');
  tick(s, 1);
  tick(mounted, 1);
  assert.ok(
    Math.abs((mounted.units[0].x - 12) / (s.units[0].x - 12) - 1.5) < 0.02,
  );
});

test('Player food harvesting reaches the pigs without triggering the human sheep animation', () => {
  const s = prepared();
  recruit(s, 'goblin');
  tick(s, 6.1);
  const u = s.units.find((u) => u.kind === 'goblin');
  const site = s.sites.find((site) => site.kind === 'food');
  const pig = playerFoodPoint(site);
  const approach = { x: pig.x - 1, y: pig.y };
  Object.assign(u, { ...approach, path: [], task: 'idle' });
  assert.notDeepEqual(approach, resourceApproach(site));
  assert.ok(findPath(entrance(s.lots[6]), approach).length);
  site.hitAt = undefined;
  assert.equal(gather(s, u.id, site.id), '');
  tick(s, 4.1);
  assert.equal(u.gathering.cargo, 30);
  assert.equal(u.gathering.phase, 'return');
  assert.equal(site.hitAt, undefined);
});

test('The catalog contains all playable creatures and every human role; production art uses the cave and Troll House', () => {
  assert.equal(BESTIARY_CREATURES.length, 7);
  assert.equal(BESTIARY_HUMANS.length, 8);
  assert.ok(BESTIARY_CREATURES.some((e) => e.id === 'alchemist'));
  assert.ok(!BESTIARY_CREATURES.some((e) => e.id === 'imp'));
  for (const e of BESTIARY_HUMANS)
    for (const sequence of Object.values(e.actions))
      for (const key of sequence) assert.ok(ASSETS[key], key);
  assert.equal(buildingArt('den'), 'cave');
  assert.equal(buildingArt('forge'), 'troll-house');
});
