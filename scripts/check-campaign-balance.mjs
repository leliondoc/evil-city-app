import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  recruit,
  recruitReason,
  build,
  buildReason,
} from '../app/game/engine.ts';

// Selecting Les Tilleuls must preserve the same simulation as the original initializer.
const classic = createGame();
const selected = createGame('tilleuls');
const simulation = (state) => {
  const copy = { ...state };
  delete copy.campaign;
  return copy;
};
assert.deepEqual(simulation(selected), classic);
for (let step = 0; step < 8000 && !classic.lost && !classic.won; step++) {
  for (const state of [classic, selected]) {
    if (step % 10 === 0) {
      if (
        state.units.filter((u) => u.kind === 'goblin').length +
          state.recruits.filter((u) => u.kind === 'goblin').length <
          2 &&
        !recruitReason(state, 'goblin')
      )
        recruit(state, 'goblin');
      if (!buildReason(state, 7, 'canteen')) build(state, 7, 'canteen');
      if (
        state.units.filter((u) => u.kind === 'spear-goblin').length +
          state.recruits.filter((u) => u.kind === 'spear-goblin').length <
          4 &&
        !recruitReason(state, 'spear-goblin')
      )
        recruit(state, 'spear-goblin');
    }
    tick(state, 0.1);
  }
  if (step % 100 === 0) assert.deepEqual(simulation(selected), classic);
}
assert.deepEqual(simulation(selected), classic);
assert.ok(
  selected.mobilization.hero.waves > 0 && selected.mobilization.guard.waves > 0,
  'Both original sources of pressure remain active',
);
console.log(
  JSON.stringify({
    sameSimulation: true,
    seconds: Math.round(selected.elapsed),
    humanLevel: selected.economy.level,
    guardWaves: selected.mobilization.guard.waves,
    heroWaves: selected.mobilization.hero.waves,
  }),
);
