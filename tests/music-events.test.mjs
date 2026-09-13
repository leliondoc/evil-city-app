import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MusicEvents } from '../app/game/musicEvents.ts';
import { createGame, tick } from '../app/game/engine.ts';
import { enemyAnimationSequence } from '../app/game/art.ts';

test('Municipal defenders use blue sprites and the municipal theme, independently of the guild', () => {
  const s = createGame(), events = new MusicEvents(); events.update(s);
  s.enemies.push({ id: 501, kind: 'hero', role: 'warrior', hp: 20, municipal: true, garrisonLotId: 2 });
  assert.equal(events.update(s), 'human');
  for (const role of ['warrior', 'lancer', 'archer', 'monk']) {
    assert.deepEqual(enemyAnimationSequence({ kind: 'hero', role, municipal: true }, 'attack'), [`municipal-${role}-attack`]);
    assert.deepEqual(enemyAnimationSequence({ kind: 'hero', role }, 'idle'), [`hero-${role}-idle`]);
  }
  assert.deepEqual(enemyAnimationSequence({ kind: 'hero', role: 'warrior', municipal: true, shieldUntil: 10, hp: 20 }, 'idle', 1), ['municipal-warrior-shield']);
});

test('Combat music stops when its last human dies or its living party becomes idle', () => {
  for (const kind of ['guard', 'hero']) {
    const s = createGame(), events = new MusicEvents(); events.update(s);
    s.enemies.push({ id: 600, kind, hp: 20, fighting: true });
    assert.equal(events.update(s), kind === 'hero' ? 'guild' : 'human');
    s.enemies[0].hp = 0;
    assert.equal(events.update(s), 'stop'); assert.equal(events.update(s), null);
    s.enemies.push({ id: 601, kind, hp: 20, fighting: true }); events.update(s);
    s.elapsed += 5; assert.equal(events.update(s), null);
    s.enemies[1].fighting = false; s.elapsed += 2; assert.equal(events.update(s), null);
    s.elapsed += 2; assert.equal(events.update(s), 'stop');
  }
});

test('Guard and guild departures emit one distinct cue per party, never per frame', () => {
  for (const [kind, theme] of [
    ['guard', 'human'],
    ['hero', 'guild'],
  ]) {
    const state = createGame();
    const events = new MusicEvents();
    assert.equal(events.update(state), null);
    state.economy.stocks = { gold: 1000, food: 1000, wood: 1000 };
    state.economy.level = 3;
    Object.assign(state.mobilization[kind], { active: true, nextRaidAt: 0 });
    tick(state, 0.1);
    assert.ok(state.enemies.filter((enemy) => enemy.kind === kind).length >= 2);
    assert.equal(events.update(state), theme);
    for (let i = 0; i < 5; i++) {
      tick(state, 0.1);
      assert.equal(events.update(state), null);
    }
    state.mobilization[kind].nextRaidAt = state.elapsed;
    tick(state, 0.1);
    assert.equal(
      events.update(state),
      theme,
      'A later departure is a new attack',
    );
  }
});

test('Existing enemies and a reset are silent; special patrols are detected without wave counters', () => {
  const state = createGame();
  state.enemies.push({ id: 999, kind: 'guard', hp: 10 });
  const events = new MusicEvents();
  assert.equal(events.update(state), null);
  state.enemies.push({ id: 1000, kind: 'guard', racketTower: 1, hp: 10 });
  assert.equal(events.update(state), 'human');
  state.enemies.push({ id: 1001, kind: 'hero', hp: 10 });
  assert.equal(events.update(state), 'guild');
  assert.equal(events.update(createGame()), null);
});

test('Territorial theme triggers strictly above 60%, once per game, even after recapture', () => {
  const state = createGame();
  // Ten parcels make the exact 60% boundary observable.
  state.lots.push({ ...state.lots[0], id: 9, owned: false });
  const events = new MusicEvents();
  events.update(state);
  state.lots.forEach((lot, i) => {
    lot.owned = i < 6;
  });
  assert.equal(events.update(state), null);
  state.lots[6].owned = true;
  assert.equal(events.update(state), 'dark');
  assert.equal(events.update(state), null);
  state.lots[6].owned = false;
  events.update(state);
  state.lots[6].owned = true;
  assert.equal(events.update(state), null);
});

test('An attack and territorial milestone in the same update preserve both cues', () => {
  const state = createGame();
  const events = new MusicEvents();
  events.update(state);
  state.lots.slice(0, 6).forEach((lot) => {
    lot.owned = true;
  });
  state.enemies.push({ id: 1000, kind: 'hero', hp: 10 });
  assert.equal(events.update(state), 'guild');
  assert.equal(events.update(state), 'dark');
  assert.equal(events.update(state), null);
});
