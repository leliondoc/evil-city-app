import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import {
  tick,
  gather,
  findPath,
  entrance,
  resourceApproach,
} from '../app/game/engine.ts';
import { sheepReactionFrame } from '../app/game/art.ts';
import { makeScenery } from '../app/game/scenery.ts';
import { HIGHLANDS, onCliff } from '../app/game/terrainLayout.ts';

function fixture() {
  const s = establishedGame();
  s.economy.workerReadyAt = Infinity;
  s.enemies = [];
  return [s, s.sites.find((site) => site.kind === 'food')];
}

test('Northeast pasture has a clear round trip through the ramp for both camps', () => {
  const [s, site] = fixture();
  const target = resourceApproach(site);
  assert.deepEqual(target, { x: 35.5, y: 3.5 });
  assert.equal(site.x - target.x, 1, 'Harvesters stand beside the sheep');
  for (const home of [s.lots[site.home], s.lots[6]]) {
    const outward = findPath(entrance(home), target);
    const inward = findPath(target, entrance(home));
    assert.deepEqual(outward.at(-1), target);
    assert.ok(inward.length > 0);
    assert.ok(
      Math.hypot(
        inward.at(-1).x - entrance(home).x,
        inward.at(-1).y - entrance(home).y,
      ) < 0.75,
    );
    assert.ok(
      outward.some((p) => p.x === 34.5 && p.y === 6.5),
      'Use the pasture ramp',
    );
    for (const p of [...outward, ...inward]) {
      if (!HIGHLANDS.some((h) => onCliff(h, p.x * 32, p.y * 32))) continue;
      assert.ok(
        p.x >= 32 && p.x < 36 && p.y >= 4 && p.y < 8,
        'Only cross cliffs inside the new ramp',
      );
    }
  }
  assert.ok(
    makeScenery(s.lots).every(
      (d) => Math.hypot(d.x - site.x * 32, d.y - site.y * 32) >= 88,
    ),
  );
});

test('Sheep reacts to a shepherd harvesting, then settles when harvesting stops', () => {
  const [s, site] = fixture();
  s.units = [];
  const worker = s.workers.find((w) => w.site === site.id);
  Object.assign(worker, { x: site.x, y: site.y, path: [], phase: 'harvest' });
  tick(s, 0.1);
  const hit = site.hitAt;
  assert.equal(hit, s.elapsed);
  assert.equal(sheepReactionFrame(site, s.elapsed), 0);
  tick(s, 0.2);
  assert.equal(
    site.hitAt,
    hit,
    'Continuous work must not restart frame zero every tick',
  );
  assert.ok(sheepReactionFrame(site, s.elapsed) > 0);
  s.workers = [];
  tick(s, 1);
  assert.equal(site.hitAt, hit);
  assert.equal(sheepReactionFrame(site, s.elapsed), null);
});

test('Goblin meat gathering triggers the same sheep reaction without changing its health', () => {
  const [s, site] = fixture();
  s.workers = [];
  s.units = [s.units[0]];
  const u = s.units[0];
  Object.assign(u, {
    ...resourceApproach(site),
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  });
  assert.equal(gather(s, u.id, site.id), '');
  u.path = [];
  tick(s, 0.1);
  assert.equal(u.gathering.phase, 'harvest');
  assert.equal(site.hitAt, s.elapsed);
  assert.equal(site.hp, site.maxHp);
});

test('Actual sabotage damage triggers the sheep reaction and animation ends after six frames', () => {
  const [s, site] = fixture();
  s.workers = [];
  const u = s.units[0];
  s.units = [u];
  Object.assign(u, {
    kind: 'troll',
    x: site.x,
    y: site.y,
    path: [],
    task: 'sabotage',
    target: site.id,
    nextMealAt: Infinity,
    nextRestAt: Infinity,
  });
  tick(s, 0.1);
  assert.ok(site.hp < site.maxHp);
  assert.equal(site.hitAt, s.elapsed);
  assert.equal(sheepReactionFrame(site, site.hitAt + 0.55), 5);
  assert.equal(sheepReactionFrame(site, site.hitAt + 0.61), null);
  assert.equal(sheepReactionFrame(site, site.hitAt - 1), null);
  assert.equal(sheepReactionFrame({ ...site, kind: 'wood' }, site.hitAt), null);
});
