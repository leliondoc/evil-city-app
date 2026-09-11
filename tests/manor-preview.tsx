import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import { createGame, recruit, tick, type State } from '../app/game/engine';
import { Renderer } from '../app/game/renderer';
import '../app/globals.css';

declare global {
  interface Window {
    manorState: State;
    manorRenderer: Renderer;
  }
}
// Funded tier-one domain for UI checks; real harvest progression is tested separately.
const s = createGame();
s.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
s.economy.stocks = { gold: 0, food: 0, wood: 0 };
s.economy.workerReadyAt = Infinity;
s.lots[7].kind = 'canteen';
s.lots[5].owned = true;
recruit(s, 'goblin');
recruit(s, 'spear-goblin');
tick(s, 6.1);
const original = Reflect.get(Renderer.prototype, 'zoomBy') as Renderer['zoomBy'];
Renderer.prototype.zoomBy = function (...args) {
  window.manorRenderer = this;
  return original.apply(this, args);
};
window.manorState = s;
createRoot(document.getElementById('root')!).render(<Game initialState={s} />);
