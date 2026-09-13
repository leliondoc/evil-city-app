import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recruit,
  recruitReason,
  tick,
  goblinWorkforce,
  GOBLIN_CAP,
  population,
  capacity,
} from '../app/game/engine.ts';
function funded() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  return s;
}
test('Workers and queued workers use only their separate cap, even when the army is over capacity', () => {
  const s = funded();
  s.lots[7].kind = 'crypt';
  assert.equal(population(s), 0);
  for (let i = 0; i < capacity(s); i++) assert.equal(recruit(s, 'skeleton'), '');
  assert.equal(population(s), capacity(s));
  assert.match(recruitReason(s, 'skeleton'), /Plus de place/);
  // Losing housing must not prevent replacing the workers who can rebuild it.
  s.lots[3].owned = false;
  assert.ok(population(s) > capacity(s));
  const armyPopulation = population(s);
  for (let i = 0; i < 3; i++) assert.equal(recruit(s, 'goblin'), '');
  assert.equal(population(s), armyPopulation);
  assert.match(recruitReason(s, 'goblin'), /Limite de 6 gobelins/);
  tick(s, 7);
  assert.equal(goblinWorkforce(s).total, 6);
  assert.equal(population(s), armyPopulation);
});
test('A full worker cap leaves all army slots available, including for goblin spearmen', () => {
  const s = funded();
  for (let i = 0; i < 3; i++) assert.equal(recruit(s, 'goblin'), '');
  assert.equal(population(s), 0);
  for (let i = 0; i < capacity(s); i++) assert.equal(recruit(s, 'spear-goblin'), '');
  assert.equal(population(s), capacity(s));
  assert.match(recruitReason(s, 'spear-goblin'), /Plus de place/);
});
test('Goblin limit includes queued recruits and rejects spam without spending resources', () => {
  const s = funded();
  assert.equal(GOBLIN_CAP, 6);
  assert.equal(goblinWorkforce(s).total, 3);
  for (let i = 0; i < 3; i++) assert.equal(recruit(s, 'goblin'), '');
  const funds = { ...s.resources };
  for (let i = 0; i < 20; i++)
    assert.match(recruit(s, 'goblin'), /Limite de 6 gobelins/);
  assert.deepEqual(s.resources, funds);
  assert.equal(s.recruits.length, 3);
  tick(s, 7);
  assert.equal(goblinWorkforce(s).total, 6);
  assert.equal(goblinWorkforce(s).queued, 0);
  assert.match(recruitReason(s, 'goblin'), /Limite de 6 gobelins/);
});
test('A goblin death releases one slot; more housing never raises the goblin limit', () => {
  const s = funded();
  for (let i = 0; i < 3; i++) recruit(s, 'goblin');
  tick(s, 7);
  s.lots[3].level = 3;
  s.lots[7].kind = 'den';
  assert.match(recruitReason(s, 'goblin'), /Limite de 6 gobelins/);
  s.units[0].hp = 0;
  tick(s, 0.1);
  assert.equal(recruit(s, 'goblin'), '');
  assert.match(recruit(s, 'goblin'), /Limite de 6 gobelins/);
  s.lots[7].kind = 'crypt';
  assert.equal(
    recruit(s, 'skeleton'),
    '',
    'Other creatures retain their own recruitment rules',
  );
});
