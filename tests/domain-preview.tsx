/// <reference types="vite/client" />
// Manual browser fixture: uses the real interface and renderer, without adding cheats to the game.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import '../app/globals.css';
import { createGame, entrance, recruit, tick } from '../app/game/engine';
import { haunt, leaveCorpse } from '../app/game/domain';

const state = createGame();
state.resources = { gold: 500, wood: 250, food: 200, mana: 200 };
state.lots[7].kind = 'crypt';
state.lots[4].kind = 'canteen';
state.lots[4].owned = true;
recruit(state, 'specter');
recruit(state, 'skeleton');
tick(state, 6.1);
state.domain.remains = 3;
const ghost = state.units.find((u) => u.kind === 'specter')!;
Object.assign(ghost, entrance(state.lots[1]), { path: [] });
haunt(state, 1, ghost.id);
tick(state, 3.2);
leaveCorpse(state, { x: 10.5, y: 20.5 }, 'human');
const goblin = state.units[0];
Object.assign(goblin, entrance(state.lots[4]), {
  task: 'idle',
  path: [],
  nextMealAt: 0,
});
const skeleton = state.units.find((u) => u.kind === 'skeleton')!;
Object.assign(skeleton, entrance(state.lots[7]), {
  task: 'idle',
  path: [],
  hp: 30,
});
tick(state, 0.1);
if (new URLSearchParams(location.search).has('duel')) {
  for (let step = 0; step < 300 && !ghost.fighting; step++) tick(state, 0.1);
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={state} />
  </React.StrictMode>,
);
