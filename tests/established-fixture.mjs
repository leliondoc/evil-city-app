import {
  createGame,
  CREATURES,
  entrance,
  findPath,
  resourceApproach,
} from '../app/game/engine.ts';

/** A populated domain for subsystem tests; the real empty opening is tested separately. */
export function establishedGame() {
  const s = createGame();
  s.resources = { gold: 0, wood: 0, food: 0, mana: 0 };
  const home = entrance(s.lots[6]);
  for (let i = 0; i < 3; i++) {
    const id = s.nextId++;
    s.units.push({
      id,
      kind: 'goblin',
      x: home.x - 0.7 + (id % 3) * 0.6,
      y: home.y + 0.15 * (id % 2),
      hp: CREATURES.goblin.hp,
      task: 'idle',
      path: [],
      target: null,
      idleTime: id * 0.5,
      facing: 1,
      fighting: false,
      nextRestAt: 90 + (id % 15),
      nextMealAt: 65 + (id % 15),
    });
  }
  for (const site of s.sites) {
    const point = entrance(s.lots[site.home]);
    s.workers.push({
      id: s.nextId++,
      ...point,
      site: site.id,
      hp: 35,
      maxHp: 35,
      path: findPath(point, resourceApproach(site)),
      facing: 1,
      phase: 'outbound',
      cargo: 0,
      progress: 0,
    });
  }
  return s;
}
