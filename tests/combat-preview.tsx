/// <reference types="vite/client" />
// Local fixture for the side-facing combat sprites; excluded from production.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import '../app/globals.css';
import {
  createGame,
  recruit,
  tick,
  commandUnit,
  type Enemy,
} from '../app/game/engine';
const s = createGame();
s.resources = { gold: 10000, wood: 10000, food: 10000, mana: 10000 };
s.lots[7].kind = 'crypt';
s.lots[4].kind = 'forge';
s.lots[4].owned = true;
for (const kind of ['troll', 'minotaur', 'skeleton'] as const) recruit(s, kind);
tick(s, 15.1);
s.units = s.units.filter((u) => u.kind !== 'goblin');
s.enemies = [];
s.workers = [];
s.units.forEach((u, i) => {
  Object.assign(u, {
    x: 6 + i * 10,
    y: 20.2,
    hp: 1000,
    path: [],
    task: 'idle',
  });
  const enemy: Enemy = {
    id: s.nextId++,
    kind: 'hero',
    role: 'warrior',
    x: u.x,
    y: 21.6,
    hp: 1000,
    maxHp: 1000,
    damage: 1,
    level: 1,
    target: 6,
    path: [],
    facing: 1,
    fighting: false,
    healTarget: null,
    attackCooldown: 0,
  };
  s.enemies.push(enemy);
  commandUnit(s, u.id, { type: 'enemy', id: enemy.id }, enemy);
});
tick(s, 3);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={s} />
  </React.StrictMode>,
);
