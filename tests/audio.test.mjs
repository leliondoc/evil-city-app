import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { SoundEvents } from '../app/game/audioEvents.ts';
import { recruit, tick, resourceGain } from '../app/game/engine.ts';

test('Audio ignores pre-existing events and emits each new delivery only once', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  resourceGain(s, { x: 6, y: 29 }, 'gold', 30);
  assert.deepEqual(audio.update(s), []);
  s.elapsed += 0.1;
  resourceGain(s, { x: 6, y: 29 }, 'wood', 30);
  assert.equal(audio.update(s).filter((c) => c.kind === 'deposit').length, 1);
  assert.deepEqual(audio.update(s), []);
  s.elapsed += 0.1;
  assert.equal(audio.update(s).filter((c) => c.kind === 'deposit').length, 0);
});

test('Harvest sounds require active work, stop during transport, and are paced', () => {
  const s = establishedGame(),
    audio = new SoundEvents(),
    u = s.units[0];
  s.workers = [];
  Object.assign(u, {
    task: 'forage',
    path: [],
    gathering: { kind: 'wood', phase: 'harvest' },
  });
  audio.update(s);
  s.elapsed += 0.1;
  assert.equal(audio.update(s).filter((c) => c.kind === 'chop').length, 1);
  s.elapsed += 0.1;
  assert.deepEqual(audio.update(s), []);
  s.elapsed += 2;
  u.gathering.phase = 'return';
  assert.deepEqual(audio.update(s), []);
  u.gathering.phase = 'harvest';
  u.hp = 0;
  s.elapsed += 2;
  assert.deepEqual(audio.update(s), []);
});

test('A building sounds on completion, not when the construction starts', () => {
  const s = establishedGame(),
    audio = new SoundEvents(),
    lot = s.lots[7];
  s.workers = [];
  audio.update(s);
  lot.construction = { kind: 'den', progress: 0 };
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
  lot.construction = null;
  lot.kind = 'den';
  s.elapsed++;
  assert.equal(audio.update(s).filter((c) => c.kind === 'complete').length, 1);
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
});

test('Recruitment confirmation follows actual production and resets between games', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  s.resources.gold = 100;
  s.resources.food = 100;
  audio.update(s);
  assert.equal(recruit(s, 'goblin'), '');
  tick(s, 0.1);
  assert.equal(
    audio.update(s).some((c) => c.kind === 'spawn'),
    false,
  );
  tick(s, 6);
  assert.equal(audio.update(s).filter((c) => c.kind === 'spawn').length, 1);
  assert.deepEqual(audio.update(establishedGame()), []);
});

test('New arrows sound once and a paused simulation produces no repeats', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  s.workers = [];
  audio.update(s);
  s.projectiles.push({ id: 999, x: 16, y: 20 });
  s.elapsed++;
  assert.equal(audio.update(s).filter((c) => c.kind === 'bow').length, 1);
  for (let i = 0; i < 10; i++) assert.deepEqual(audio.update(s), []);
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
});
