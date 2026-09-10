import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ASSETS,
  animationFrame,
  animationSequence,
  buildingArt,
  spriteFrame,
} from '../app/game/art.ts';
import { BUILDINGS, RECRUIT_OPTIONS } from '../app/game/engine.ts';

test('Every animation strip has complete frames and matches its PNG dimensions', () => {
  for (const a of Object.values(ASSETS)) {
    const bytes = fs.readFileSync(
      new URL('../public' + a.src, import.meta.url),
    );
    assert.equal(bytes.readUInt32BE(16), a.width);
    assert.equal(bytes.readUInt32BE(20), a.height);
    assert.equal(
      a.frames * a.frameWidth * (a.frameHeight ?? a.height),
      a.width * a.height,
    );
    assert.ok(a.anchor > 0 && a.anchor <= 1);
  }
  for (const kind of Object.keys(BUILDINGS))
    for (const owned of [true, false])
      assert.ok(ASSETS[buildingArt(kind, owned)]);
  for (const kind of RECRUIT_OPTIONS)
    for (const action of ['idle', 'walk', 'attack'])
      for (const key of animationSequence(kind, action)) assert.ok(ASSETS[key]);
  for (const action of ['idle', 'walk', 'attack'])
    assert.deepEqual(
      ASSETS[`specter-${action}`],
      ASSETS[`bestiary-thief-${action}`],
    );
});

test('The original death sheet reads both rows in order and never samples outside the PNG', () => {
  const a = ASSETS['unit-death'];
  assert.equal(a.frames, 14);
  assert.deepEqual(spriteFrame('unit-death', 7), {
    x: 0,
    y: 128,
    width: 128,
    height: 128,
  });
  for (let frame = 0; frame < a.frames; frame++) {
    const r = spriteFrame('unit-death', frame);
    assert.ok(
      r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.width <= a.width &&
        r.y + r.height <= a.height,
    );
  }
});

test('Troll attack plays windup, strike and recovery, then loops without a blank frame', () => {
  const sequence = animationSequence('troll', 'attack');
  assert.deepEqual(animationFrame(sequence, 0), {
    key: 'troll-windup',
    frame: 0,
  });
  assert.deepEqual(animationFrame(sequence, 0.501), {
    key: 'troll-attack',
    frame: 0,
  });
  assert.deepEqual(animationFrame(sequence, 1.101), {
    key: 'troll-recovery',
    frame: 0,
  });
  assert.deepEqual(animationFrame(sequence, 2.101), {
    key: 'troll-windup',
    frame: 0,
  });
  for (let i = 0; i < 1000; i++) {
    const f = animationFrame(sequence, i * 0.017);
    assert.ok(f.frame >= 0 && f.frame < ASSETS[f.key].frames);
  }
});
