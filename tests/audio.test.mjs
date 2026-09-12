import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { SoundEvents } from '../app/game/audioEvents.ts';
import {
  recruit,
  tick,
  resourceGain,
  upgrade,
  createGame,
} from '../app/game/engine.ts';
import {
  effectCalibration,
  SOUND_DEFS,
  soundClipPath,
} from '../app/game/audioCatalog.ts';
import { existsSync } from 'node:fs';

test('All configured effects exist and calibration limits peaks and silent amplification', () => {
  for (const clip of new Set(Object.values(SOUND_DEFS).flatMap((d) => d.clips)))
    assert.ok(
      existsSync(new URL(`../public/${soundClipPath(clip)}`, import.meta.url)),
      clip,
    );
  assert.equal(effectCalibration([new Float32Array(100)]), 1);
  assert.ok(effectCalibration([new Float32Array([0.02])]) <= 2.5);
  const hot = new Float32Array([1, -1, 0.02]);
  assert.ok(effectCalibration([hot]) <= 0.72);
  const quiet = effectCalibration([new Float32Array([0.04, -0.04])]);
  const loud = effectCalibration([new Float32Array([0.2, -0.2])]);
  assert.ok(Math.abs(quiet * 0.04 - loud * 0.2) < 0.00001);
});

test('Footsteps follow movement and ground; ghosts and stationary units remain silent', () => {
  const s = establishedGame(),
    audio = new SoundEvents(),
    unit = s.units[0];
  s.workers = [];
  audio.update(s);
  Object.assign(unit, { moving: true, x: -2, y: 20.5 });
  s.elapsed++;
  assert.ok(audio.update(s).some((c) => c.kind === 'step-wood'));
  Object.assign(unit, { x: 0.5, y: 0.5 });
  s.elapsed++;
  assert.ok(audio.update(s).some((c) => c.kind === 'step-stone'));
  Object.assign(unit, { x: -8, y: 12 });
  s.elapsed++;
  assert.ok(audio.update(s).some((c) => c.kind === 'step-dirt'));
  unit.moving = false;
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
  unit.moving = true;
  unit.kind = 'specter';
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
});

test('Shield activation, received hits and monk healing have distinct paced cues', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  s.workers = [];
  s.enemies = [
    {
      id: 500,
      kind: 'guard',
      role: 'warrior',
      x: 10,
      y: 10,
      hp: 20,
      maxHp: 55,
      healTarget: null,
    },
  ];
  audio.update(s);
  s.elapsed++;
  s.enemies[0].shieldUntil = 7;
  assert.equal(audio.update(s).filter((c) => c.kind === 'shield').length, 1);
  s.elapsed++;
  s.enemies[0].hp--;
  assert.equal(audio.update(s).filter((c) => c.kind === 'shield').length, 1);
  s.elapsed++;
  s.enemies[0].healTarget = 501;
  assert.ok(audio.update(s).some((c) => c.kind === 'heal'));
  s.elapsed += 0.1;
  assert.ok(!audio.update(s).some((c) => c.kind === 'heal'));
});

test('Arrow impact requires an arriving arrow and damaged target; expired arrows stay silent', () => {
  const s = establishedGame(),
    audio = new SoundEvents(),
    unit = s.units[0];
  s.workers = [];
  s.projectiles.push({
    id: 999,
    target: { type: 'unit', id: unit.id },
    x: unit.x,
    y: unit.y,
  });
  audio.update(s);
  s.elapsed++;
  s.projectiles = [];
  assert.ok(!audio.update(s).some((c) => c.kind === 'arrow-hit'));
  s.elapsed++;
  s.projectiles.push({
    id: 1000,
    target: { type: 'unit', id: unit.id },
    x: unit.x,
    y: unit.y,
  });
  audio.update(s);
  s.elapsed++;
  s.projectiles = [];
  unit.hp -= 5;
  assert.equal(audio.update(s).filter((c) => c.kind === 'arrow-hit').length, 1);
});

test('New soldiers and undead do not use the worker recruitment sound', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  audio.update(s);
  s.units.push(
    { ...s.units[0], id: 900, kind: 'skeleton' },
    { ...s.units[0], id: 901, kind: 'spear-goblin' },
  );
  s.elapsed++;
  const cues = audio.update(s);
  assert.equal(cues.filter((c) => c.kind === 'spawn-undead').length, 1);
  assert.equal(cues.filter((c) => c.kind === 'spawn-soldier').length, 1);
  assert.ok(!cues.some((c) => c.kind === 'spawn'));
});

test('Health loss outside a physical fight does not invent sword impacts', () => {
  const s = establishedGame(),
    audio = new SoundEvents();
  s.workers = [];
  audio.update(s);
  s.elapsed++;
  s.units[0].hp--;
  assert.deepEqual(audio.update(s), []);
});

test('Cancelled construction is silent; capture, destruction and death are emitted once', () => {
  const s = establishedGame(),
    audio = new SoundEvents(),
    lot = s.lots[7];
  s.workers = [];
  lot.construction = { kind: 'den', progress: 0 };
  audio.update(s);
  s.elapsed++;
  lot.construction = null;
  assert.deepEqual(audio.update(s), []);
  s.elapsed++;
  lot.owned = !lot.owned;
  assert.equal(audio.update(s).filter((c) => c.kind === 'capture').length, 1);
  s.elapsed++;
  lot.hp = 0;
  s.domain.deaths.push({ x: 10, y: 10, at: s.elapsed });
  const cues = audio.update(s);
  assert.equal(cues.filter((c) => c.kind === 'destroy').length, 1);
  assert.equal(cues.filter((c) => c.kind === 'death').length, 1);
  s.elapsed++;
  assert.deepEqual(audio.update(s), []);
});

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

test('The supplied upgrade effect follows the completed player upgrade, never the purchase or human upgrades', () => {
  const state = createGame();
  state.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
  const events = new SoundEvents();
  events.update(state);
  assert.equal(upgrade(state, 6), '');
  tick(state, 0.1);
  assert.equal(
    events.update(state).filter((cue) => cue.kind === 'upgrade').length,
    0,
  );
  tick(state, state.lots[6].upgrading.remaining + 0.1);
  const completed = events.update(state);
  assert.equal(state.lots[6].level, 2);
  assert.deepEqual(
    completed.filter((cue) => cue.kind === 'upgrade'),
    [{ kind: 'upgrade' }],
  );
  assert.equal(completed.filter((cue) => cue.kind === 'complete').length, 0);
  state.lots[2].level++;
  tick(state, 0.1);
  assert.equal(
    events.update(state).filter((cue) => cue.kind === 'upgrade').length,
    0,
  );
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

test('Actual living and undead unit deaths emit one death cue each, without replay', () => {
  for (const kind of ['goblin', 'skeleton', 'specter', 'spear-goblin']) {
    const s = establishedGame();
    s.units[0].kind = kind;
    const events = new SoundEvents();
    events.update(s);
    s.units[0].hp = 0;
    tick(s, 0.1);
    assert.equal(
      events.update(s).filter((cue) => cue.kind === 'death').length,
      1,
      kind,
    );
    tick(s, 0.1);
    assert.equal(
      events.update(s).filter((cue) => cue.kind === 'death').length,
      0,
    );
  }
});
