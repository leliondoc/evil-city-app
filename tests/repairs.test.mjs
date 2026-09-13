import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, entrance, CREATURES, tick } from '../app/game/engine.ts';
import { advanceRepairs } from '../app/game/repairs.ts';
import { workerArt } from '../app/game/art.ts';

function setup() {
  const s = createGame(); s.units = []; s.enemies = []; s.workers = [];
  s.economy.workerReadyAt = Infinity;
  return s;
}
const goblin = (s, point) => ({ id: s.nextId++, kind: 'goblin', ...point, hp: CREATURES.goblin.hp, task: 'idle', target: null, path: [], facing: 1, fighting: false, idleTime: 0 });

test('Buildings no longer regenerate without a worker, even after a quiet interval', () => {
  const s = setup(), lot = s.lots[6]; lot.hp = 100;
  tick(s, 10); assert.equal(lot.hp, 100);
});
test('A goblin must reach the building; repairs end at max HP and respect manual orders', () => {
  const s = setup(), lot = s.lots[6]; lot.hp = lot.maxHp - 8;
  const u = goblin(s, entrance(lot)); s.units.push(u); u.manualUntil = 50;
  advanceRepairs(s, 6); assert.equal(u.task, 'idle');
  delete u.manualUntil; advanceRepairs(s, 1); assert.equal(u.task, 'repair');
  advanceRepairs(s, 1); assert.equal(lot.hp, lot.maxHp - 4);
  advanceRepairs(s, 1); advanceRepairs(s, 1);
  assert.equal(lot.hp, lot.maxHp); assert.equal(u.task, 'idle');
});
test('A travelling repair goblin does not heal remotely; danger interrupts repairs', () => {
  const s = setup(), lot = s.lots[6]; lot.hp = 100;
  const u = goblin(s, {x: 6, y: 3}); s.units.push(u);
  advanceRepairs(s, 6); advanceRepairs(s, 0.1); assert.equal(lot.hp, 100);
  s.enemies.push({ ...entrance(lot), hp: 100 });
  advanceRepairs(s, 1); assert.equal(u.task, 'idle'); assert.equal(lot.hp, 100);
});
test('Humans use a hammer at the gate, abandon repairs when monsters return, and never repair ruins', () => {
  const s = setup(), lot = s.lots[1]; lot.hp = 50;
  const w = { id: 500, site: 0, ...entrance(lot), hp: 60, maxHp: 60, path: [], facing: 1, phase: 'harvest', cargo: 0, progress: 0 };
  s.workers.push(w); advanceRepairs(s, 6); assert.equal(w.repairing, lot.id);
  advanceRepairs(s, 1); assert.equal(lot.hp, 54); assert.equal(workerArt(w, s.sites[0]), 'pawn-hammer-work');
  s.units.push(goblin(s, entrance(lot))); advanceRepairs(s, 1);
  assert.equal(w.repairing, undefined); assert.equal(lot.hp, 54);
  s.units = []; lot.kind = 'empty'; lot.ruins = {quiet: 0, progress: 0, paid: false};
  advanceRepairs(s, 10); assert.equal(w.repairing, undefined); assert.equal(lot.hp, 54);
});
