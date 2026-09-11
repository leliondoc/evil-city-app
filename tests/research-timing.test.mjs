import { test } from 'node:test';
import assert from 'node:assert/strict';
import { establishedGame } from './established-fixture.mjs';
import { tick, unitSpeed } from '../app/game/engine.ts';
import { RESEARCH, research, researchReason, hasResearch, advanceResearch } from '../app/game/strategy.ts';

function setup() {
  const s = establishedGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  s.skeletonsAwakened = 1;
  for (const [id, kind] of [[3, 'den'], [4, 'forge'], [7, 'crypt']])
    Object.assign(s.lots[id], { owned: true, kind, construction: null, hp: 100 });
  s.enemies = [];
  return s;
}

test('Every research takes its full duration, charges once and unlocks only at completion', () => {
  for (const key of Object.keys(RESEARCH)) {
    const s = setup();
    if (key === 'chain') s.strategy.research.push('embers');
    const initial = { ...s.resources };
    assert.equal(research(s, key), '');
    for (const [resource, amount] of Object.entries(RESEARCH[key].cost))
      assert.equal(s.resources[resource], initial[resource] - amount);
    const paid = { ...s.resources };
    assert.match(research(s, key), /en cours/);
    assert.deepEqual(s.resources, paid);
    advanceResearch(s, RESEARCH[key].duration - 1);
    assert.equal(hasResearch(s, key), false);
    advanceResearch(s, 1);
    assert.equal(hasResearch(s, key), true);
    assert.equal(s.strategy.pendingResearch.length, 0);
    assert.match(research(s, key), /acquise/);
    advanceResearch(s, 1000);
    assert.equal(s.strategy.research.filter((r) => r === key).length, 1);
    assert.deepEqual(s.resources, paid);
  }
});

test('Effects and dependent research stay locked while work is in progress', () => {
  const s = setup();
  const speed = unitSpeed(s, { kind: 'spear-goblin' });
  research(s, 'pig-riding');
  research(s, 'embers');
  advanceResearch(s, 179);
  assert.equal(unitSpeed(s, { kind: 'spear-goblin' }), speed);
  assert.match(researchReason(s, 'chain'), /armes enflammées/);
  advanceResearch(s, 1);
  assert.equal(unitSpeed(s, { kind: 'spear-goblin' }), speed * 1.5);
  advanceResearch(s, 60);
  assert.equal(researchReason(s, 'chain'), '');
});

test('Research suspends without its room, resumes without payment, and stops at game end', () => {
  const s = setup();
  research(s, 'solvent');
  advanceResearch(s, 20);
  s.lots[7].owned = false;
  advanceResearch(s, 1000);
  assert.equal(s.strategy.pendingResearch[0].elapsed, 20);
  s.lots[7].owned = true;
  advanceResearch(s, 99);
  assert.equal(hasResearch(s, 'solvent'), false);
  s.lost = true;
  advanceResearch(s, 10);
  assert.equal(hasResearch(s, 'solvent'), false);
  s.lost = false;
  advanceResearch(s, 1);
  assert.equal(hasResearch(s, 'solvent'), true);
});

test('Research advances with simulation ticks and preserves progress in snapshots', () => {
  const s = setup();
  research(s, 'solvent');
  tick(s, 3);
  assert.ok(Math.abs(s.strategy.pendingResearch[0].elapsed - 3) < 1e-8);
  const copy = structuredClone(s);
  advanceResearch(copy, 117);
  assert.equal(hasResearch(copy, 'solvent'), true);
  assert.equal(hasResearch(s, 'solvent'), false);
  const legacy = setup();
  delete legacy.strategy.pendingResearch;
  advanceResearch(legacy, 1);
  assert.equal(research(legacy, 'solvent'), '');
});
