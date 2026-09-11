/// <reference types="vite/client" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import '../app/globals.css';
import { createGame, recruit, tick } from '../app/game/engine';

// Local browser fixture: exercise the real capture and construction UI without waiting for harvests.
export const state = createGame();
state.lots[6].level = 3;
state.resources = { gold: 600, wood: 400, food: 400, mana: 200 };
state.lots[7].kind = 'canteen';
Object.assign(state.lots[4], { kind: 'crypt', owned: true });
recruit(state, 'goblin');
recruit(state, 'goblin');
recruit(state, 'skeleton');
recruit(state, 'skeleton');
tick(state, 6.1);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={state} />
  </React.StrictMode>,
);
