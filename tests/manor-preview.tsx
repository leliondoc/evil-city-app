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
if (!new URLSearchParams(location.search).has('fresh')) {
s.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
s.economy.stocks = { gold: 0, food: 0, wood: 0 };
s.economy.workerReadyAt = Infinity;
s.lots[7].kind = 'canteen';
s.lots[5].owned = true;
recruit(s, 'goblin');
recruit(s, 'spear-goblin');
tick(s, 6.1);
}
if (new URLSearchParams(location.search).has('tracking')) {
  s.lots[6].level = 3;
  Object.assign(s.lots[7], { kind: 'forge', owned: true, construction: null });
  s.strategy.pendingResearch = [{ key: 'embers', elapsed: 80 }, { key: 'chain', elapsed: 90 }, { key: 'solvent', elapsed: 60 }];
  s.recruits.push({ kind: 'goblin', remaining: 90, duration: 120, source: 6 });
}
const original = Reflect.get(Renderer.prototype, 'resize') as () => void;
Reflect.set(Renderer.prototype, 'resize', function (this: Renderer) {
  window.manorRenderer = this;
  return original.call(this);
});
window.manorState = s;
createRoot(document.getElementById('root')!).render(<Game initialState={s} />);
