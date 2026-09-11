import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import { createGame, recruit, tick, type State } from '../app/game/engine';
import { Renderer } from '../app/game/renderer';
import '../app/globals.css';
declare global {
  interface Window {
    packRenderer: Renderer;
    packState: State;
  }
}
const s = createGame();
s.resources = { gold: 900, food: 900, wood: 900, mana: 900 };
s.economy.workerReadyAt = Infinity;
Object.assign(s.lots[5], { owned: true, kind: 'house', construction: null });
Object.assign(s.lots[4], { owned: true, kind: 'crypt', construction: null });
Object.assign(s.lots[7], { owned: true, kind: 'forge', construction: null });
recruit(s, 'skeleton');
tick(s, 6.1);
recruit(s, 'spear-goblin');
recruit(s, 'goblin');
tick(s, 6.1);
s.resources = { gold: 900, food: 900, wood: 900, mana: 900 };
Object.assign(
  s.units.find((u) => u.kind === 'spear-goblin')!,
  {
    x: 11,
    y: 21,
    path: [],
    task: 'idle',
    nextRestAt: Infinity,
    nextMealAt: Infinity,
  },
);
const original = Reflect.get(
  Renderer.prototype,
  'zoomBy',
) as Renderer['zoomBy'];
Renderer.prototype.zoomBy = function (...args) {
  window.packRenderer = this;
  return original.apply(this, args);
};
window.packState = s;
createRoot(document.getElementById('root')!).render(<Game initialState={s} />);
