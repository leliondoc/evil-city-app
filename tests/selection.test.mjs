import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recruit,
  tick,
  commandUnits,
  entrance,
  attack,
  raidSupply,
  intercept,
} from '../app/game/engine.ts';
import {
  dragIntent,
  unitSelection,
  selectedUnitIds,
  unitsInRectangle,
  extendUnitSelection,
  selectedFightersCanAttack,
} from '../app/game/selection.ts';

test('Rectangle selection works in all four directions and excludes fallen units', () => {
  const s = createGame();
  Object.assign(s.units[0], { x: 4, y: 5 });
  Object.assign(s.units[1], { x: 6, y: 7 });
  Object.assign(s.units[2], { x: 5, y: 6, hp: 0 });
  for (const [a, b] of [
    [
      { x: 3, y: 3 },
      { x: 7, y: 7 },
    ],
    [
      { x: 7, y: 7 },
      { x: 3, y: 3 },
    ],
    [
      { x: 3, y: 7 },
      { x: 7, y: 3 },
    ],
    [
      { x: 7, y: 3 },
      { x: 3, y: 7 },
    ],
  ]) {
    assert.deepEqual(unitsInRectangle(s.units, a, b), [
      s.units[0].id,
      s.units[1].id,
    ]);
  }
  assert.deepEqual(
    unitsInRectangle(s.units, { x: 0, y: 0 }, { x: 1, y: 1 }),
    [],
  );
});

test('Shift adds rectangle members once, toggles clicked members and collapses empty groups', () => {
  assert.deepEqual(unitSelection([]), { type: 'none' });
  assert.deepEqual(unitSelection([1, 1]), { type: 'unit', id: 1 });
  const group = extendUnitSelection({ type: 'unit', id: 1 }, [1, 2, 3, 2]);
  assert.deepEqual(selectedUnitIds(group), [1, 2, 3]);
  assert.deepEqual(
    selectedUnitIds(extendUnitSelection(group, [2], true)),
    [1, 3],
  );
  assert.deepEqual(extendUnitSelection({ type: 'unit', id: 1 }, [1], true), {
    type: 'none',
  });
  assert.deepEqual(extendUnitSelection(group, []), group);
});

function party() {
  const s = createGame();
  s.lots[4].owned = true;
  s.lots[4].kind = 'forge';
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  recruit(s, 'troll');
  recruit(s, 'troll');
  tick(s, 7);
  return s;
}

test('Only accepted attack orders produce target feedback, including repeated paused orders', () => {
  const s = party();
  const fighter = s.units.find((u) => u.kind === 'troll');
  const target = { type: 'lot', id: 1 };
  const point = entrance(s.lots[1]);
  assert.notEqual(commandUnits(s, [s.units[0].id], target, point), '');
  assert.equal(s.attackOrder, undefined);
  assert.equal(commandUnits(s, [fighter.id], null, point), '');
  assert.equal(s.attackOrder, undefined);
  assert.equal(commandUnits(s, [fighter.id], target, point), '');
  assert.deepEqual(s.attackOrder.target, target);
  const previous = s.attackOrder;
  assert.equal(attack(s, 1), '');
  assert.ok(s.attackOrder.sequence > previous.sequence);
  assert.deepEqual(s.attackOrder.target, target);
  assert.notEqual(attack(s, 6), '');
  assert.deepEqual(
    s.attackOrder.target,
    target,
    'A rejected friendly target never gets a marker',
  );
});

test('Attack feedback identifies enemy units and peasants for individual and army orders', () => {
  const s = party();
  const fighter = s.units.find((u) => u.kind === 'troll');
  const enemy = { id: s.nextId++, hp: 100, kind: 'guard', x: 10.5, y: 10.5 };
  s.enemies.push(enemy);
  assert.equal(
    commandUnits(s, [fighter.id], { type: 'enemy', id: enemy.id }, enemy),
    '',
  );
  assert.deepEqual(s.attackOrder.target, { type: 'enemy', id: enemy.id });
  const target = { type: 'worker', id: s.workers[0].id };
  assert.equal(raidSupply(s, target), '');
  assert.deepEqual(s.attackOrder.target, target);
});
test('Group movement sends only the selected living units to the requested street', () => {
  const s = party();
  const untouched = structuredClone(s.units[2]);
  const ids = [s.units[0].id, s.units[3].id, s.units[0].id, 999999];
  assert.equal(commandUnits(s, ids, null, { x: 10.5, y: 20.5 }), '');
  for (const u of [s.units[0], s.units[3]]) {
    assert.equal(u.task, 'move');
    assert.deepEqual(u.path.at(-1), { x: 10.5, y: 20.5 });
  }
  assert.deepEqual(s.units[2], untouched);
});
test('Mixed group attacks keep goblins and unselected fighters at their existing task', () => {
  const s = party();
  const goblin = s.units[0];
  const [fighter, other] = s.units.filter((u) => u.kind === 'troll');
  const before = structuredClone([goblin, other]);
  assert.equal(
    commandUnits(
      s,
      [goblin.id, fighter.id],
      { type: 'lot', id: 0 },
      entrance(s.lots[0]),
    ),
    '',
  );
  assert.equal(fighter.task, 'attack');
  assert.equal(fighter.target, 0);
  assert.deepEqual([goblin, other], before);
});
test('Invalid group attacks and orders after defeat change neither units nor resources', () => {
  const s = party();
  const before = structuredClone({ units: s.units, resources: s.resources });
  assert.ok(
    commandUnits(
      s,
      s.units.map((u) => u.id),
      { type: 'lot', id: 6 },
      entrance(s.lots[6]),
    ) === '',
  ); // Friendly buildings are move targets.
  const current = structuredClone(s.units);
  assert.ok(
    commandUnits(
      s,
      s.units.map((u) => u.id),
      { type: 'lot', id: 2 },
      entrance(s.lots[2]),
    ),
  );
  assert.deepEqual(s.units, current);
  assert.deepEqual(s.resources, before.resources);
  s.lost = true;
  assert.ok(
    commandUnits(
      s,
      s.units.map((u) => u.id),
      null,
      { x: 10.5, y: 20.5 },
    ),
  );
  assert.deepEqual(s.units, current);
});

test('Left drags pan the map; Shift enables the selection rectangle without a hold delay', () => {
  assert.equal(dragIntent(false), 'pan');
  assert.equal(dragIntent(true), 'select');
});

test('Hostile clicks command individual fighters and mixed groups while other selections remain inspectable', () => {
  const s = party();
  s.lots[2].kind = 'empty';
  const fighter = s.units.find((u) => u.kind === 'troll');
  const goblin = s.units.find((u) => u.kind === 'goblin');
  const enemy = { id: s.nextId++, hp: 100, kind: 'guard', x: 10.5, y: 10.5 };
  s.enemies.push(enemy);
  for (const selection of [
    unitSelection([fighter.id]),
    unitSelection([fighter.id, goblin.id]),
  ]) {
    assert.equal(
      selectedFightersCanAttack(s, selection, { type: 'enemy', id: enemy.id }),
      true,
    );
    assert.equal(
      selectedFightersCanAttack(s, selection, { type: 'lot', id: 1 }),
      true,
    );
    for (const target of [
      null,
      { type: 'unit', id: goblin.id },
      { type: 'lot', id: 6 },
      { type: 'lot', id: 2 },
      { type: 'resource', id: s.sites[0].id },
    ])
      assert.equal(selectedFightersCanAttack(s, selection, target), false);
  }
  const target = { type: 'enemy', id: enemy.id };
  assert.equal(selectedFightersCanAttack(s, { type: 'none' }, target), false);
  assert.equal(
    selectedFightersCanAttack(s, unitSelection([goblin.id]), target),
    false,
  );
  s.strategy.research.push('embers');
  assert.equal(
    selectedFightersCanAttack(s, unitSelection([goblin.id]), target),
    true,
  );
  fighter.hp = 0;
  assert.equal(
    selectedFightersCanAttack(s, unitSelection([fighter.id]), target),
    false,
  );
  enemy.hp = 0;
  assert.equal(
    selectedFightersCanAttack(s, unitSelection([goblin.id]), target),
    false,
  );
  s.won = true;
  assert.equal(
    selectedFightersCanAttack(s, unitSelection([goblin.id]), {
      type: 'lot',
      id: 1,
    }),
    false,
  );
});

test('Interception shows attack feedback and rejected interceptions preserve the previous marker', () => {
  const s = party();
  const enemy = { id: s.nextId++, hp: 100, kind: 'guard', x: 10.5, y: 10.5 };
  s.enemies.push(enemy);
  assert.equal(intercept(s, enemy.id), '');
  assert.deepEqual(s.attackOrder.target, { type: 'enemy', id: enemy.id });
  const previous = s.attackOrder;
  assert.equal(intercept(s, enemy.id), '');
  assert.ok(s.attackOrder.sequence > previous.sequence);
  const accepted = s.attackOrder;
  enemy.hp = 0;
  assert.notEqual(intercept(s, enemy.id), '');
  assert.equal(s.attackOrder, accepted);
});
