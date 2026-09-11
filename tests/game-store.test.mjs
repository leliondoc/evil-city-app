import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, recruit, tick } from '../app/game/engine.ts';
import { createGameStore } from '../app/game/gameStore.ts';

test('React snapshots remain stable and isolated while the simulation recruits and advances', () => {
  const store = createGameStore();
  const opening = store.getSnapshot();
  assert.equal(opening, store.getSnapshot());
  assert.notEqual(opening, store.getState());
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications++;
  });
  assert.equal(recruit(store.getState(), 'goblin'), '');
  tick(store.getState(), 6.1);
  assert.equal(opening.units.length, 0);
  assert.equal(opening.resources.gold, 35);
  assert.equal(notifications, 0);
  store.publish();
  assert.equal(notifications, 1);
  const recruited = store.getSnapshot();
  assert.notEqual(recruited, opening);
  assert.equal(recruited.units.length, 1);
  assert.equal(recruited, store.getSnapshot());
  const hp = recruited.units[0].hp;
  store.getState().units[0].hp = 1;
  assert.equal(recruited.units[0].hp, hp);
  unsubscribe();
  store.publish();
  assert.equal(notifications, 1);
  assert.equal(store.getSnapshot().units[0].hp, 1);
});

test('Restart replaces both the live simulation and snapshot and keeps subscribers connected', () => {
  const initial = createGame();
  const store = createGameStore(initial);
  const live = store.getState();
  assert.equal(live, initial);
  recruit(live, 'goblin');
  tick(live, 6.1);
  store.publish();
  const previous = store.getSnapshot();
  let observed;
  store.subscribe(() => {
    observed = store.getSnapshot();
  });
  store.reset();
  assert.notEqual(store.getState(), live);
  assert.equal(observed, store.getSnapshot());
  assert.equal(observed.units.length, 0);
  assert.equal(observed.resources.gold, 35);
  assert.equal(previous.units.length, 1);
  recruit(store.getState(), 'goblin');
  store.publish();
  assert.equal(observed.recruits.length, 1);
});
