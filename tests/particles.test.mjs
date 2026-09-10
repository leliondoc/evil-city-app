import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../app/game/engine.ts';
import { ParticleFeedback } from '../app/game/particles.ts';

test('Particle feedback follows real damage, respects pause and cooldown, and never changes the game', () => {
  const s = createGame(),
    fx = new ParticleFeedback();
  assert.equal(fx.update(s).length, 0);
  s.elapsed = 1;
  s.units[0].hp -= 2;
  const before = structuredClone(s);
  const hit = fx.update(s);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].key, 'fx-impact');
  assert.deepEqual(s, before);
  assert.deepEqual(fx.update(s), hit, 'Paused frames do not duplicate impacts');
  s.elapsed = 1.1;
  s.units[0].hp -= 2;
  assert.equal(
    fx.update(s).length,
    1,
    'Continuous damage does not spawn every frame',
  );
  s.elapsed = 2;
  s.units[0].hp += 2;
  assert.equal(fx.update(s).length, 0, 'Healing produces no impact');
  s.elapsed = 2.1;
  s.units[0].hp -= 1;
  assert.equal(
    fx.update(s, true).length,
    0,
    'Reduced motion suppresses particles',
  );
  assert.equal(fx.update(createGame()).length, 0, 'Restart clears old effects');
});

test('Completed construction and capture raise dust; destruction finishes after the simulation stops', () => {
  const s = createGame(),
    fx = new ParticleFeedback();
  const lot = s.lots[4];
  lot.construction = { kind: 'canteen', progress: 0.9 };
  fx.update(s);
  s.elapsed = 1;
  lot.construction = null;
  lot.kind = 'canteen';
  assert.equal(fx.update(s)[0].key, 'fx-dust-large');
  s.elapsed = 2;
  s.lots[0].owned = !s.lots[0].owned;
  assert.equal(fx.update(s)[0].key, 'fx-dust-large');
  s.elapsed = 3;
  const hq = s.lots.find((l) => l.kind === 'hq');
  hq.hp -= 1;
  fx.update(s);
  s.elapsed = 3.1;
  hq.hp = 0;
  s.lost = true;
  assert.ok(
    fx.update(s).some((p) => p.key === 'fx-explosion'),
    'Final destruction bypasses the hit cooldown',
  );
  assert.equal(
    fx.update(s, false, 4.2).length,
    0,
    'Final animation expires even after defeat',
  );
});
