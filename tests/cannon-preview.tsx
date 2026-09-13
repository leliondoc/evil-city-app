import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import { createGame, type Unit } from '../app/game/engine';
import '../app/globals.css';
const s = createGame('tilleuls');
s.economy.nextUpgradeAt = s.economy.workerReadyAt = Infinity;
s.enemies = [
  {
    id: s.nextId++,
    x: 26,
    y: 11,
    kind: 'guard',
    role: 'warrior',
    hp: 160,
    maxHp: 160,
    damage: 24,
    level: 3,
    path: [],
    target: 2,
    facing: -1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
    cannon: {
      workerId: -1,
      progress: 1,
      direction: { x: -1, y: 0 },
      readyAt: 0,
    },
  },
];
s.units = [12, 15, 18].map(
  (x) =>
    ({
      id: s.nextId++,
      x,
      y: 11,
      kind: 'troll',
      hp: 500,
      task: 'idle',
      target: null,
      path: [],
      facing: 1,
      fighting: false,
      idleTime: 0,
      nextMealAt: Infinity,
      nextRestAt: Infinity,
      holdPosition: { x, y: 11 },
      manualUntil: Infinity,
    }) as Unit,
);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={s} />
  </React.StrictMode>,
);
