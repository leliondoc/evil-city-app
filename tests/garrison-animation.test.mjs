import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  entrance,
  garrisonPosition,
  tick,
} from '../app/game/engine.ts';

test('House, tavern, guild and municipal defenders enter combat where their previews stood', () => {
  for (const id of [5, 1, 0, 2]) {
    const s = createGame(),
      lot = s.lots[id];
    s.units.push({
      id: s.nextId++,
      kind: 'troll',
      ...entrance(lot),
      hp: 300,
      task: 'attack',
      target: id,
      path: [],
      facing: 1,
      fighting: false,
      idleTime: 0,
      nextMealAt: Infinity,
      nextRestAt: Infinity,
    });
    tick(s, 0.001);
    const defenders = s.enemies.filter((e) => e.garrisonLotId === id);
    assert.equal(defenders.length, id === 0 || id === 2 ? 4 : id === 1 ? 2 : 1);
    defenders.forEach((e, i) => {
      const visible = garrisonPosition(lot, i);
      assert.ok(
        Math.hypot(e.x - visible.x, e.y - visible.y) < 0.02,
        'No instant jump on activation',
      );
      if (id === 2) assert.equal(e.municipal, true);
    });
  }
});
