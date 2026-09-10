import { establishedGame as createGame } from './established-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick,
  gather,
  commandUnit,
  moveUnit,
  entrance,
  rates,
} from '../app/game/engine.ts';

function fixture() {
  const s = createGame();
  s.units = [s.units[0]];
  s.workers = [];
  s.units[0].nextMealAt = Infinity;
  s.units[0].nextRestAt = Infinity;
  return s;
}
function until(s, predicate, seconds = 100) {
  for (let i = 0; i < seconds * 10 && !predicate(); i++) tick(s, 0.1);
  assert.ok(predicate(), 'Physical trip completes');
}
test('Wood is cut at the resource and credited once only after walking back to the manor', () => {
  const s = fixture(),
    u = s.units[0];
  tick(s, 1);
  assert.equal(s.resources.wood, 0);
  assert.equal(rates(s).wood, 0);
  assert.equal(u.gathering.phase, 'outbound');
  assert.equal(u.gathering.cargo, 0);
  until(s, () => u.gathering.phase === 'harvest');
  assert.ok(u.x < 0, 'Uses the actual western forest');
  assert.equal(s.resources.wood, 0);
  until(s, () => u.gathering.cargo === 10);
  assert.equal(s.resources.wood, 0);
  until(s, () => s.resources.wood > 0);
  assert.equal(s.resources.wood, 10);
  assert.ok(
    Math.hypot(u.x - entrance(s.lots[6]).x, u.y - entrance(s.lots[6]).y) < 1,
  );
  assert.equal(u.gathering.cargo, 0);
  assert.equal(s.resourceGains.filter((g) => g.kind === 'wood').length, 1);
  tick(s, 1);
  assert.equal(s.resources.wood, 10);
});
test('A goblin resource order mines gold without sabotaging it or crediting it before delivery', () => {
  const s = fixture(),
    u = s.units[0],
    site = s.sites.find((v) => v.kind === 'gold');
  for (const l of s.lots) if (l.owned && l.kind !== 'hq') l.kind = 'empty';
  s.lots[6].level = 0; // Isolate mined gold from passive tribute.
  assert.equal(
    commandUnit(s, u.id, { type: 'resource', id: site.id }, site),
    '',
  );
  until(s, () => u.gathering.cargo === 10);
  assert.equal(s.resources.gold, 0);
  assert.equal(site.hp, site.maxHp);
  until(s, () => s.resources.gold > 0);
  assert.equal(s.resources.gold, 10);
});
test('Interrupted cargo is retained, cannot change resource, and deposits after recall even if the site is destroyed', () => {
  const s = fixture(),
    u = s.units[0];
  until(s, () => u.gathering?.cargo === 10);
  const gold = s.sites.find((v) => v.kind === 'gold');
  assert.match(gather(s, u.id, gold.id), /chargement/);
  s.sites[u.gathering.site].hp = 0;
  moveUnit(s, u.id, entrance(s.lots[6]));
  assert.equal(u.gathering.cargo, 10);
  assert.equal(s.resources.wood, 0);
  until(s, () => s.resources.wood > 0);
  assert.equal(s.resources.wood, 10);
});
test('A dead carrier never delivers; storage caps accept only the remaining room', () => {
  const s = fixture(),
    u = s.units[0];
  until(s, () => u.gathering?.cargo === 10);
  const dead = structuredClone(s);
  dead.units[0].hp = 0;
  tick(dead, 60);
  assert.equal(dead.resources.wood, 0);
  s.resources.wood = 997;
  until(s, () => s.resources.wood === 1000);
  assert.equal(s.resourceGains.find((g) => g.kind === 'wood').amount, 3);
  assert.equal(u.gathering.cargo, 0);
});
