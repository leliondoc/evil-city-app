import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  entrance,
  assign,
  commandUnits,
  tick,
} from '../app/game/engine.ts';
import {
  research,
  hitEnemy,
  advanceStrategy,
  strategyUnit,
  towerOrder,
  collectLoot,
  falseAlarm,
  divertEnemy,
  releaseTower,
} from '../app/game/strategy.ts';
import { leaveCorpse, advanceDomain, resurrect } from '../app/game/domain.ts';
function prepared() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.lots[7].kind = 'crypt';
  s.lots[7].owned = true;
  s.lots[4].kind = 'forge';
  s.lots[4].owned = true;
  s.enemies = [];
  s.elapsed = 1;
  return s;
}
function enemy(s, point, role = 'warrior') {
  return {
    ...point,
    id: s.nextId++,
    kind: 'hero',
    role,
    level: 1,
    hp: 100,
    maxHp: 100,
    damage: 6,
    path: [],
    target: 6,
    facing: 1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  };
}
function unit(s, kind, point) {
  const u = {
    ...s.units[0],
    ...point,
    id: s.nextId++,
    kind,
    hp: 100,
    path: [],
    task: 'idle',
    target: null,
  };
  s.units.push(u);
  return u;
}
function station(s, kind = 'goblin') {
  const t = s.strategy.towers[0];
  t.owned = true;
  const u = unit(s, kind, t);
  towerOrder(s, t.id, u.id);
  u.path = [];
  return { t, u };
}
test('Research pays once, requires rooms and embers before chain, and reports shortages', () => {
  const s = prepared();
  assert.ok(research(s, 'chain'));
  assert.equal(research(s, 'embers'), '');
  assert.equal(s.resources.gold, 880);
  assert.equal(s.resources.mana, 980);
  assert.ok(research(s, 'embers'));
  assert.equal(s.resources.gold, 880);
  s.resources.mana = 0;
  assert.match(research(s, 'chain'), /60/);
  s.resources.mana = 100;
  s.lots[7].owned = false;
  assert.ok(research(s, 'solvent'));
});
test('Alchemist solvent doubles only fire; burning deaths propagate once to nearby enemies', () => {
  const s = prepared();
  s.strategy.research = ['embers', 'solvent', 'chain'];
  const point = entrance(s.lots[6]),
    e = enemy(s, point),
    nearby = enemy(s, { x: point.x + 1, y: point.y }),
    far = enemy(s, { x: point.x + 5, y: point.y });
  s.enemies = [e, nearby, far];
  hitEnemy(s, unit(s, 'alchemist', point), e, 3, 1);
  assert.equal(e.hp, 97);
  assert.equal(e.burningUntil, undefined);
  hitEnemy(s, unit(s, 'goblin', point), e, 4, 1);
  assert.equal(e.hp, 87);
  assert.equal(s.strategy.comboHits, 1);
  advanceStrategy(s, 1);
  assert.equal(e.hp, 83);
  e.hp = 0;
  advanceStrategy(s, 0);
  assert.equal(nearby.burningUntil, s.elapsed + 4);
  assert.equal(far.burningUntil, undefined);
  const expiry = nearby.burningUntil;
  s.elapsed++;
  advanceStrategy(s, 0);
  assert.equal(nearby.burningUntil, expiry);
});
test('All towers can be reached and captured by walking; a group assigns one garrison', () => {
  for (const tIndex of [0, 1, 2]) {
    const s = prepared(),
      u = s.units[0],
      t = s.strategy.towers[tIndex];
    assert.equal(
      commandUnits(
        s,
        s.units.map((u) => u.id),
        { type: 'tower', id: t.id },
        t,
      ),
      '',
    );
    assert.equal(s.units.filter((u) => u.task === 'tower').length, 1);
    for (let i = 0; i < 1500 && !t.owned; i++) strategyUnit(s, u, 0.1);
    assert.equal(t.owned, true);
    assert.ok(Math.hypot(u.x - t.x, u.y - t.y) < 1);
  }
});
test('A contested capture restarts; an abandoned tower is recaptured and loses stored loot', () => {
  const s = prepared(),
    { t, u } = station(s);
  t.owned = false;
  strategyUnit(s, u, 5);
  assert.equal(t.progress, 5);
  s.enemies = [enemy(s, t)];
  strategyUnit(s, u, 1);
  assert.equal(t.progress, 0);
  s.enemies = [];
  strategyUnit(s, u, 8);
  assert.equal(t.owned, true);
  t.loot = { gold: 12 };
  releaseTower(s, t.id);
  s.enemies = [enemy(s, t)];
  advanceStrategy(s, 8);
  assert.equal(t.owned, false);
  assert.deepEqual(t.loot, {});
});
test('Racket subtracts a cargo share once, then a separate courier must bring it home', () => {
  const s = prepared(),
    { t } = station(s),
    w = s.workers[0];
  Object.assign(w, { x: t.x, y: t.y, cargo: 10 });
  s.resources[s.sites[w.site].kind] = 500; // Leave room for the delivered cargo.
  const kind = s.sites[w.site].kind,
    before = s.resources[kind];
  advanceStrategy(s, 0.1);
  assert.equal(w.cargo, 7);
  assert.equal(t.loot[kind], 3);
  assert.equal(s.resources[kind], before);
  advanceStrategy(s, 0.1);
  assert.equal(w.cargo, 7);
  assert.equal(collectLoot(s, t.id), '');
  const courier = s.units.find((u) => u.task === 'collect-loot');
  for (let i = 0; i < 1000 && courier.task === 'collect-loot'; i++)
    strategyUnit(s, courier, 0.1);
  assert.equal(courier.task, 'deliver-loot');
  assert.equal(s.resources[kind], before);
  assert.deepEqual(t.loot, {});
  for (let i = 0; i < 1000 && courier.task === 'deliver-loot'; i++)
    strategyUnit(s, courier, 0.1);
  assert.equal(s.resources[kind], before + 3);
  strategyUnit(s, courier, 1);
  assert.equal(s.resources[kind], before + 3);
});
test('A new order loses carried loot; false alarms need a present specter and ignore monks', () => {
  const s = prepared(),
    { t, u } = station(s, 'specter');
  const courier = s.units[0];
  courier.task = 'deliver-loot';
  courier.loot = { gold: 10 };
  assign(courier, entrance(s.lots[6]), 'move', null);
  assert.equal(courier.loot, undefined);
  assert.equal(falseAlarm(s, t.id), '');
  assert.equal(s.resources.mana, 985);
  assert.ok(falseAlarm(s, t.id));
  assert.equal(divertEnemy(s, enemy(s, { x: t.x + 2, y: t.y }), 0.1), true);
  assert.equal(divertEnemy(s, enemy(s, t, 'monk'), 0.1), false);
  u.hp = 0;
  advanceStrategy(s, 0.1);
  assert.equal(t.lureUntil, 0);
  assert.ok(falseAlarm(s, t.id));
});
test('Skeleton lookout rallies nearby idle defenders without recalling busy units', () => {
  const s = prepared(),
    { t, u } = station(s, 'skeleton'),
    defender = unit(s, 'troll', t),
    busy = unit(s, 'troll', t);
  busy.task = 'attack';
  s.enemies = [enemy(s, t)];
  advanceStrategy(s, 0.1);
  assert.equal(defender.task, 'defend');
  assert.equal(busy.task, 'attack');
  assert.equal(u.task, 'tower');
});
function resurrectionSetup() {
  const s = prepared();
  s.units = [];
  const w = s.workers[0],
    home = s.lots[s.sites[w.site].home],
    point = entrance(home);
  Object.assign(w, point, { path: [], cargo: 0 });
  leaveCorpse(s, enemy(s, point), 'human');
  advanceDomain(s, 0.1);
  advanceDomain(s, 0.1);
  assert.equal(s.domain.souls.length, 1);
  assert.equal(s.domain.corpses.length, 0);
  const monk = enemy(s, point, 'monk');
  s.enemies = [monk];
  s.economy.stocks.gold = 100;
  s.economy.stocks.food = 100;
  return { s, monk, home };
}
test('A physically recovered human can be resurrected once at 60% HP for human resources', () => {
  const { s, monk } = resurrectionSetup();
  resurrect(s, monk, 9);
  assert.equal(s.domain.resurrected, 0);
  resurrect(s, monk, 1);
  assert.equal(s.domain.resurrected, 1);
  const revived = s.enemies.find((e) => e.revived);
  assert.equal(revived.hp, 60);
  assert.equal(s.economy.stocks.gold, 75);
  assert.equal(s.economy.stocks.food, 85);
  assert.equal(s.domain.souls.length, 0);
  leaveCorpse(s, revived, 'human');
  assert.equal(s.domain.corpses[0].human, undefined);
  resurrect(s, monk, 20);
  assert.equal(s.domain.resurrected, 1);
});
test('Resurrection requires funds, resets when hit, and is cancelled by capture or expiration', () => {
  const { s, monk, home } = resurrectionSetup();
  s.economy.stocks.gold = 0;
  resurrect(s, monk, 10);
  assert.equal(s.domain.resurrected, 0);
  s.economy.stocks.gold = 100;
  resurrect(s, monk, 5);
  monk.hp--;
  resurrect(s, monk, 1);
  assert.equal(monk.resurrectionProgress, 0);
  resurrect(s, monk, 5);
  home.owned = true;
  advanceDomain(s, 0.1);
  resurrect(s, monk, 10);
  assert.equal(s.domain.resurrected, 0);
  const other = resurrectionSetup();
  other.s.elapsed += 121;
  advanceDomain(other.s, 0.1);
  assert.equal(other.s.domain.souls.length, 0);
});
test('Real simulation sends a monk to a delivered body and completes the ritual', () => {
  const { s } = resurrectionSetup();
  s.enemies = [];
  s.domain.nextRescuerAt = 0;
  for (let i = 0; i < 1200 && !s.domain.resurrected; i++) tick(s, 0.1);
  assert.equal(s.domain.resurrected, 1);
  assert.ok(s.enemies.some((e) => e.revived));
});
