import { upgradeAndFinish } from './upgrade-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  recruit,
  build,
  claim,
  attack,
  tick,
} from '../app/game/engine.ts';
import { mission } from '../app/game/mission.ts';
import { drawTerrain } from '../app/game/terrainRenderer.ts';

function advanceUntil(s, condition, seconds = 90) {
  for (let i = 0; i < seconds * 10 && !condition(); i++) tick(s, 0.1);
  assert.ok(
    condition(),
    `Timed out at ${s.elapsed}: ${mission(s).current?.id}`,
  );
}

function readyForConquest() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.equal(mission(s).current.id, 'goblin');
  assert.equal(
    mission(s).objectives.find((o) => o.id === 'capture').done,
    false,
  );
  assert.equal(recruit(s, 'goblin'), '');
  assert.ok(mission(s).hint.reason); // Do not recruit twice from the opening prompt.
  assert.equal(mission(s).hint.marker, undefined);
  assert.equal(recruit(s, 'goblin'), '');
  advanceUntil(s, () => s.recruited > 0);
  assert.equal(mission(s).current.id, 'canteen');
  assert.equal(build(s, mission(s).hint.action.lotId, 'canteen'), '');
  assert.ok(mission(s).hint.progress !== undefined);
  assert.equal(mission(s).hint.marker, undefined);
  advanceUntil(s, () => mission(s).current.id === 'army');
  assert.equal(mission(s).hint.action.kind, 'spear-goblin');
  assert.equal(s.lots[6].level, 1);
  assert.equal(recruit(s, 'spear-goblin'), '');
  assert.equal(recruit(s, 'spear-goblin'), '');
  assert.ok(mission(s).hint.reason);
  advanceUntil(s, () => mission(s).current.id === 'capture');
  return s;
}

test('The opening guides a real conquest before building the forge, then keeps completed steps after losses', () => {
  const s = readyForConquest();
  const target = mission(s).hint.action.lotId;
  assert.equal(s.lots[target].kind, 'house');
  assert.equal(mission(s).hint.marker.lotId, target);
  assert.equal(attack(s, target), '');
  assert.equal(mission(s).hint.status, 'Armée en route');
  assert.equal(mission(s).hint.progress, 0);
  advanceUntil(s, () => s.lots[target].hp < s.lots[target].maxHp);
  assert.ok(mission(s).hint.progress > 0);
  advanceUntil(s, () => s.lots[target].owned);
  assert.equal(mission(s).current.id, 'manor2');
  assert.deepEqual(mission(s).hint.action, { type: 'inspect', lotId: 6 });
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.equal(mission(s).current.id, 'claim');
  assert.equal(claim(s, mission(s).hint.action.lotId), '');
  assert.equal(mission(s).current.id, 'crypt');
  assert.equal(build(s, mission(s).hint.action.lotId, 'crypt'), '');
  advanceUntil(s, () => mission(s).current.id === 'manor3');
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.equal(mission(s).current.id, 'forge');
  assert.deepEqual(mission(s).hint.action, {
    type: 'inspect',
    lotId: target,
    buildKind: 'forge',
  });
  // Merely reading guidance never spends anything or starts a construction.
  assert.equal(s.lots[target].construction, null);
  const clone = structuredClone(s);
  mission(s);
  assert.deepEqual(s, clone);
  s.units = s.units.filter((u) => u.kind === 'goblin');
  assert.equal(mission(s).current.id, 'forge');
  assert.equal(build(s, target, 'forge'), '');
  assert.equal(mission(s).hint.progress, 0);
  advanceUntil(s, () => mission(s).current.id === 'guild');
  s.lost = true;
  assert.equal(mission(s).current, undefined);
  assert.equal(mission(s).hint.marker, undefined);
  s.lost = false;
  s.won = true;
  assert.equal(mission(s).current, undefined);
  assert.ok(mission(s).objectives.every((o) => o.done));
});

test('Guidance follows an alternative assault and removes stale capture progress on retreat', () => {
  const s = readyForConquest();
  assert.equal(attack(s, 8), '');
  assert.equal(mission(s).hint.marker.lotId, 8);
  s.units.forEach((u) => {
    u.task = 'idle';
    u.target = null;
    u.path = [];
  });
  assert.equal(mission(s).hint.progress, undefined);
  assert.equal(mission(s).hint.button, 'Voir la cible');
  // Recapturing a starting property does not falsely complete the first conquest.
  s.lots[3].kind = 'house';
  assert.equal(mission(s).current.id, 'capture');
});

test('Captured gardens use the manor grass, including the guild, and restore their human terrain on loss', () => {
  const s = createGame();
  const grassAt = (id) => {
    const images = [];
    drawTerrain(
      {
        image: (...args) => images.push(args),
        whole() {},
        line() {},
        rect() {},
      },
      s,
    );
    const lot = s.lots[id];
    return images.findLast(
      (args) =>
        args[5] === lot.x * 32 &&
        args[6] === lot.y * 32 &&
        args[7] === 64 &&
        args[8] === 64,
    )[0];
  };
  const manor = grassAt(6);
  for (const id of [0, 1, 2, 5, 8]) {
    const original = grassAt(id);
    assert.notEqual(original, manor);
    s.lots[id].owned = true;
    assert.equal(grassAt(id), manor);
    s.lots[id].owned = false;
    assert.equal(grassAt(id), original);
  }
});
