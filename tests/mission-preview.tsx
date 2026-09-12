/// <reference types="vite/client" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import '../app/globals.css';
import { createGame, recruit, tick, type State } from '../app/game/engine';
import { Renderer } from '../app/game/renderer';

// Expose this fixture's renderer so browser tests can find visible map targets
// while issuing their commands through the actual pointer and touch controls.
declare global {
  interface Window {
    missionRenderer: Renderer;
    missionState: State;
  }
}
const originalFocus = Reflect.get(Renderer.prototype, 'focusLot') as Renderer['focusLot'];
Renderer.prototype.focusLot = function (...args) {
  window.missionRenderer = this;
  return originalFocus.apply(this, args);
};
const originalZoom = Reflect.get(Renderer.prototype, 'zoomBy') as Renderer['zoomBy'];
Renderer.prototype.zoomBy = function (...args) {
  window.missionRenderer = this;
  return originalZoom.apply(this, args);
};

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
window.missionState = state;
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={state} />
  </React.StrictMode>,
);
