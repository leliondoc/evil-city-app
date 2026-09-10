import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick,
  recruit,
  commandUnit,
  entrance,
  assign,
  population,
  CREATURES,
  army,
  foodBalance,
} from '../app/game/engine.ts';
import {
  haunt,
  isHaunted,
  leaveCorpse,
  sendBribe,
  raiseSkeleton,
  REMAINS_CAP,
  thought,
} from '../app/game/domain.ts';

function prepared() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.lots[7].kind = 'crypt';
  s.lots[4].kind = 'canteen';
  s.lots[4].owned = true;
  return s;
}
function until(s, predicate, seconds = 90) {
  for (let i = 0; i < seconds * 10 && !predicate(); i++) tick(s, 0.1);
  assert.ok(predicate(), `Expected event within ${seconds}s`);
}
function ghostAt(s, id) {
  assert.equal(recruit(s, 'specter'), '');
  tick(s, 6.1);
  const u = s.units.find((u) => u.kind === 'specter');
  Object.assign(u, entrance(s.lots[id]), { path: [], task: 'idle' });
  return u;
}
test('Deaths leave one collectible body for a monk and only a temporary animation for undead', () => {
  const s = prepared();
  const u = ghostAt(s, 1);
  haunt(s, 1, u.id);
  until(s, () => isHaunted(s, s.lots[1]), 5);
  const monk = s.enemies.find((e) => e.role === 'monk');
  monk.hp = 0;
  u.hp = 0;
  tick(s, 0.1);
  assert.equal(s.domain.corpses.length, 1);
  assert.equal(s.domain.corpses[0].side, 'human');
  assert.equal(s.domain.corpses[0].at, s.elapsed);
  assert.equal(s.domain.deaths.length, 1);
  tick(s, 0.1);
  assert.equal(s.domain.corpses.length, 1);
  assert.equal(s.domain.deaths.length, 1);
  tick(s, 1.4);
  assert.equal(s.domain.deaths.length, 0);
});
test('A specter suspends actual deliveries without deleting workers or cargo; the curse expires', () => {
  const s = prepared();
  const u = ghostAt(s, 1);
  s.lots[0].owned = true; // No guild to send an exorcist.
  const worker = s.workers.find((w) => w.site === 0);
  worker.cargo = 10;
  worker.phase = 'return';
  Object.assign(worker, entrance(s.lots[1]), { path: [] });
  assert.equal(
    commandUnit(s, u.id, { type: 'lot', id: 1 }, entrance(s.lots[1])),
    '',
  );
  until(s, () => isHaunted(s, s.lots[1]), 5);
  worker.cargo = 10;
  worker.phase = 'return';
  worker.path = [];
  const delivered = s.economy.delivered.food;
  tick(s, 10);
  assert.equal(s.economy.delivered.food, delivered);
  assert.ok(s.workers.includes(worker));
  assert.equal(worker.cargo, 10);
  assert.equal(army(s).includes(u), false);
  until(s, () => !isHaunted(s, s.lots[1]), 25);
  tick(s, 0.2);
  assert.ok(s.economy.delivered.food > delivered);
});
function streetDuel() {
  const s = prepared();
  const u = ghostAt(s, 1);
  assert.equal(haunt(s, 1, u.id), '');
  until(s, () => isHaunted(s, s.lots[1]), 5);
  const monk = s.enemies.find((e) => e.role === 'monk');
  assert.ok(monk);
  until(s, () => u.task === 'duel', 25);
  assert.equal(isHaunted(s, s.lots[1]), false);
  assert.equal(u.hp, CREATURES.specter.hp);
  assert.equal(monk.hp, monk.maxHp);
  assert.ok(u.path.length, 'The specter walks out through the gate');
  until(s, () => u.fighting && monk.fighting, 8);
  assert.ok(u.y >= s.lots[1].y + 8);
  assert.ok(monk.y >= s.lots[1].y + 8);
  assert.equal(u.facing, -monk.facing);
  assert.ok(u.hauntReadyAt > s.elapsed);
  assert.ok(haunt(s, 5, u.id));
  return { s, u, monk };
}
test('The monk finds the specter, ends the haunt and fights a reciprocal duel in the street', () => {
  const { s, u, monk } = streetDuel();
  const ghostHp = u.hp,
    monkHp = monk.hp;
  tick(s, 1);
  assert.ok(u.hp < ghostHp);
  assert.ok(monk.hp < monkHp);
  until(s, () => !s.units.includes(u), 10);
  assert.ok(s.enemies.includes(monk));
  tick(s, 0.1);
  assert.equal(monk.exorcising, undefined);
  assert.equal(
    s.domain.corpses.some((c) => c.side === 'evil'),
    false,
  );
});
test('A specter can defeat an injured exorcist and leaves its duel when the monk dies', () => {
  const { s, u, monk } = streetDuel();
  monk.hp = 10;
  until(s, () => !s.enemies.includes(monk), 3);
  assert.ok(u.hp > 0);
  tick(s, 0.1);
  assert.equal(u.task, 'idle');
  assert.equal(u.target, null);
  assert.equal(isHaunted(s, s.lots[1]), false);
});
test('A move order lets the specter flee but the injured monk keeps pursuing', () => {
  const { s, u, monk } = streetDuel();
  const start = { x: monk.x, y: monk.y };
  assert.equal(commandUnit(s, u.id, null, entrance(s.lots[6])), '');
  tick(s, 1);
  assert.equal(u.task, 'move');
  assert.equal(u.fighting, false);
  assert.equal(monk.exorcising, u.id);
  assert.ok(Math.hypot(monk.x - start.x, monk.y - start.y) > 0);
  tick(s, 20);
  assert.equal(monk.pursuitTarget, u.id);
  assert.ok(u.hp > 0);
  assert.notEqual(u.task, 'duel');
});
test('Recalling or killing a haunting ghost restores the building; duplicate missions cost nothing', () => {
  for (const kill of [false, true]) {
    const s = prepared();
    s.lots[0].owned = true;
    const u = ghostAt(s, 1);
    assert.equal(haunt(s, 1, u.id), '');
    assert.ok(haunt(s, 1, u.id));
    until(s, () => isHaunted(s, s.lots[1]), 5);
    if (kill) u.hp = 0;
    else commandUnit(s, u.id, null, entrance(s.lots[6]));
    tick(s, 0.1);
    assert.equal(isHaunted(s, s.lots[1]), false);
  }
});
test('Bribe payment has no effect before arrival; delivery delays the next wave exactly once', () => {
  const s = prepared();
  s.mobilization.guard = {
    active: true,
    nextRaidAt: 100,
    waves: 0,
    reason: 'test',
    starved: false,
  };
  assert.equal(sendBribe(s), '');
  assert.equal(s.resources.gold, 900);
  assert.equal(s.mobilization.guard.nextRaidAt, 100);
  assert.ok(sendBribe(s));
  assert.equal(s.resources.gold, 900);
  until(s, () => !s.domain.bribe, 90);
  assert.match(s.domain.lastBribe, /livrée/);
  assert.equal(s.mobilization.guard.nextRaidAt, 145);
  tick(s, 1);
  assert.equal(s.mobilization.guard.nextRaidAt, 145);
});
test('A killed or recalled courier loses the paid bourse without postponing guards', () => {
  for (const kill of [false, true]) {
    const s = prepared();
    assert.equal(sendBribe(s), '');
    const courier = s.units.find((u) => u.id === s.domain.bribe.courierId);
    if (kill) courier.hp = 0;
    else commandUnit(s, courier.id, null, entrance(s.lots[6]));
    tick(s, 0.1);
    assert.equal(s.domain.bribe, null);
    assert.equal(s.domain.bribedUntil, 0);
    assert.match(s.domain.lastBribe, /perdue/);
    assert.ok(s.resources.gold < 901);
  }
});
test('Bodies must be physically delivered; rituals spend two remains, reserve capacity and finish at the crypt', () => {
  const s = prepared();
  s.workers = [];
  leaveCorpse(s, entrance(s.lots[6]), 'human');
  leaveCorpse(s, entrance(s.lots[6]), 'evil');
  assert.equal(s.domain.remains, 0);
  until(s, () => s.domain.remains === 2, 80);
  assert.equal(s.domain.corpses.length, 0);
  const before = population(s),
    mana = s.resources.mana;
  assert.equal(raiseSkeleton(s), '');
  assert.equal(population(s), before + 1);
  assert.equal(s.domain.remains, 0);
  assert.equal(s.resources.mana, mana - 12);
  assert.ok(raiseSkeleton(s));
  tick(s, 12.1);
  const skeleton = s.units.find((u) => u.kind === 'skeleton');
  assert.ok(skeleton);
  assert.ok(
    Math.hypot(
      skeleton.x - entrance(s.lots[7]).x,
      skeleton.y - entrance(s.lots[7]).y,
    ) < 2,
  );
});
test('A body falls back to the ground when its carrier receives a different order', () => {
  const s = prepared();
  s.workers = [];
  leaveCorpse(s, entrance(s.lots[6]), 'human');
  until(s, () => s.units.some((u) => u.task === 'deliver'), 10);
  const courier = s.units.find((u) => u.task === 'deliver');
  s.domain.autoCollect = false;
  commandUnit(s, courier.id, null, entrance(s.lots[6]));
  tick(s, 0.1);
  assert.equal(s.domain.corpses[0].carrier, undefined);
  assert.equal(s.domain.remains, 0);
});
test('Humans recover their own dead and take them home; the crypt cannot duplicate them', () => {
  const s = prepared();
  s.domain.autoCollect = false;
  const w = s.workers[0];
  w.cargo = 0;
  leaveCorpse(s, w, 'human');
  until(s, () => s.domain.recoveredByHumans === 1, 70);
  assert.equal(s.domain.remains, 0);
  assert.equal(s.domain.corpses.length, 0);
  tick(s, 1);
  assert.equal(s.domain.recoveredByHumans, 1);
});
test('Corpse storage is capped and undead deaths never generate recyclable bodies', () => {
  const s = prepared();
  s.workers = [];
  s.domain.remains = REMAINS_CAP;
  leaveCorpse(s, entrance(s.lots[6]), 'human');
  tick(s, 2);
  assert.ok(s.units.every((u) => u.task !== 'collect'));
  assert.equal(s.domain.remains, REMAINS_CAP);
  assert.equal(recruit(s, 'skeleton'), '');
  const ghost = ghostAt(s, 6);
  for (const u of s.units.filter(
    (u) => u.kind === 'skeleton' || u.id === ghost.id,
  ))
    u.hp = 0;
  const before = s.domain.corpses.length;
  tick(s, 0.1);
  assert.equal(s.domain.corpses.length, before);
});
test('Meals and sleep use their buildings and yield immediately to explicit movement', () => {
  const s = prepared();
  s.resources.food = 500; // Leave storage space while checking the meal's consumption.
  const u = s.units[0];
  Object.assign(u, entrance(s.lots[4]), {
    task: 'idle',
    path: [],
    nextMealAt: 0,
  });
  tick(s, 0.1);
  assert.equal(u.task, 'eat');
  assert.equal(thought(s, u), 'Repas');
  const expectedFood =
    s.resources.food + (-foodBalance(s).consumption / 60) * 4;
  tick(s, 4);
  assert.ok(Math.abs(s.resources.food - expectedFood) < 0.001);
  assert.ok(u.nextMealAt > s.elapsed);
  Object.assign(u, entrance(s.lots[3]), {
    task: 'idle',
    path: [],
    nextRestAt: 0,
    hp: 20,
  });
  tick(s, 0.1);
  assert.equal(u.task, 'rest');
  tick(s, 2);
  assert.ok(u.hp > 20);
  commandUnit(s, u.id, null, { x: 10.5, y: 20.5 });
  tick(s, 0.1);
  assert.equal(u.task, 'move');
});
test('Construction and combat orders are never replaced by a meal or nap', () => {
  const s = prepared();
  const u = s.units[0];
  assign(u, entrance(s.lots[7]), 'build', 7);
  u.nextMealAt = 0;
  u.nextRestAt = 0;
  tick(s, 1);
  assert.equal(u.task, 'build');
  assert.equal(recruit(s, 'skeleton'), '');
  tick(s, 6.1);
  const skeleton = s.units.find((u) => u.kind === 'skeleton');
  skeleton.nextRestAt = 0;
  assign(skeleton, entrance(s.lots[1]), 'attack', 1);
  tick(s, 0.1);
  assert.equal(skeleton.task, 'attack');
});
test('Suspicion triggers an announced mobilization, and finished games reject dark actions', () => {
  const s = createGame();
  s.domain.suspicion = 61;
  tick(s, 0.1);
  assert.equal(s.mobilization.guard.active, true);
  assert.match(s.mobilization.guard.reason, /méfaits/);
  for (const result of ['won', 'lost']) {
    const state = prepared();
    state[result] = true;
    const before = structuredClone(state);
    assert.ok(haunt(state, 1));
    assert.ok(sendBribe(state));
    assert.ok(raiseSkeleton(state));
    tick(state, 100);
    assert.deepEqual(state, before);
  }
});

test('A haunted source cannot launch a funded patrol until its curse ends', () => {
  const s = prepared();
  s.lots[0].owned = true;
  const u = ghostAt(s, 2);
  assert.equal(haunt(s, 2, u.id), '');
  until(s, () => isHaunted(s, s.lots[2]), 5);
  s.mobilization.guard = {
    active: true,
    nextRaidAt: s.elapsed,
    waves: 0,
    reason: 'test',
    starved: false,
  };
  s.economy.stocks = { gold: 1000, wood: 1000, food: 1000 };
  tick(s, 10);
  assert.equal(s.mobilization.guard.waves, 0);
  commandUnit(s, u.id, null, entrance(s.lots[6]));
  tick(s, 0.1);
  assert.equal(s.mobilization.guard.waves, 1);
});

test('Loss of a crypt drops its cargo and prevents further rituals; an already reserved summon reaches the manor', () => {
  const s = prepared();
  s.workers = [];
  s.domain.remains = 2;
  assert.equal(raiseSkeleton(s), '');
  leaveCorpse(s, entrance(s.lots[6]), 'human');
  until(s, () => s.units.some((u) => u.task === 'deliver'), 10);
  s.lots[7].owned = false;
  s.lots[7].kind = 'house';
  tick(s, 0.2);
  assert.ok(raiseSkeleton(s));
  assert.equal(s.domain.corpses[0].carrier, undefined);
  tick(s, 12);
  const u = s.units.find((u) => u.kind === 'skeleton');
  assert.ok(u);
  assert.ok(
    Math.hypot(u.x - entrance(s.lots[6]).x, u.y - entrance(s.lots[6]).y) < 2,
  );
});

test('The ritual respects full population and rejects without spending either resource', () => {
  const s = prepared();
  s.domain.remains = 4;
  while (population(s) < 12)
    s.recruits.push({ kind: 'skeleton', remaining: 30 });
  const before = structuredClone(s);
  assert.match(raiseSkeleton(s), /place/);
  assert.deepEqual(s, before);
});

test('New mechanics remain equivalent across normal steps and accelerated simulation', () => {
  const a = prepared();
  ghostAt(a, 1);
  haunt(a, 1);
  sendBribe(a);
  leaveCorpse(a, entrance(a.lots[6]), 'human');
  a.units[0].nextMealAt = 0;
  const b = structuredClone(a);
  tick(a, 45);
  for (let i = 0; i < 450; i++) tick(b, 0.1);
  assert.equal(a.domain.remains, b.domain.remains);
  assert.equal(a.domain.lastBribe, b.domain.lastBribe);
  assert.equal(a.domain.recoveredByHumans, b.domain.recoveredByHumans);
  assert.deepEqual(
    a.units.map((u) => [u.id, u.task]),
    b.units.map((u) => [u.id, u.task]),
  );
  for (const key of ['gold', 'wood', 'food', 'mana'])
    assert.ok(Math.abs(a.resources[key] - b.resources[key]) < 0.001);
});
