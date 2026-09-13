import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import { createGame, entrance, CREATURES, tick } from '../app/game/engine';
import '../app/globals.css';

const s = createGame('tilleuls');
s.resources = { gold: 1000, food: 1000, wood: 1000, mana: 1000 };
s.lots[6].level = 3;
s.lots[3].kind = 'sanctum';
const lot = s.lots[7];
lot.ruins = { quiet: 30, progress: 0.25, paid: true, workerId: 500 };
s.workers = [{ id: 500, ...entrance(lot), site: 0, hp: 35, maxHp: 35, cargo: 0, progress: 0, phase: 'outbound', path: [], facing: -1, rebuilding: lot.id }];
s.economy.workerReadyAt = s.economy.nextUpgradeAt = Infinity;
s.units = [{ id: 501, kind: 'imp', ...entrance(s.lots[3]), hp: CREATURES.imp.hp, task: 'idle', target: null, path: [], facing: 1, fighting: false, idleTime: 0, holdPosition: entrance(s.lots[3]) }];
s.nextId = 502;
tick(s, 0.1);
createRoot(document.getElementById('root')!).render(<Game initialState={s} />);
