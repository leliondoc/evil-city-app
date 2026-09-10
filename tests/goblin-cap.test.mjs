import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recruit,
  recruitReason,
  tick,
  goblinWorkforce,
  GOBLIN_CAP,
} from '../app/game/engine.ts';
function funded() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  return s;
}
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
