import { establishedGame as createGame } from './established-fixture.mjs';
/// <reference types="vite/client" />
// Local visual fixture; excluded from the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import '../app/globals.css';
import { recruit, tick, entrance, announce } from '../app/game/engine';
import { research, towerOrder } from '../app/game/strategy';
const state = createGame();
state.resources = { gold: 1000, wood: 500, food: 500, mana: 500 };
state.lots[7].kind = 'crypt';
state.lots[7].owned = true;
state.lots[4].kind = 'forge';
state.lots[4].owned = true;
for (const kind of ['specter', 'alchemist', 'skeleton'] as const)
  recruit(state, kind);
tick(state, 6.1);
for (const key of ['embers', 'solvent', 'chain'] as const) research(state, key);
const tower = state.strategy.towers[0];
tower.owned = true;
const ghost = state.units.find((u) => u.kind === 'specter')!;
Object.assign(ghost, { x: tower.x, y: tower.y, path: [] });
towerOrder(state, 0, ghost.id);
const alchemist = state.units.find((u) => u.kind === 'alchemist')!;
Object.assign(alchemist, entrance(state.lots[7]), { path: [], task: 'idle' });
announce(
  state,
  'Résurrection ! Un humain revient avec 60 % de sa vie. Il ne pourra plus être ressuscité.',
);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={state} />
  </React.StrictMode>,
);
