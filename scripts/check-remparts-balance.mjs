// A deterministic, ordinary-order playthrough of the final teaching map.
import assert from 'node:assert/strict';
import {
  createGame,
  tick,
  recruit,
  upgrade,
  build,
  attack,
  army,
  recruitReason,
  buildReason,
} from '../app/game/engine.ts';
import { mission } from '../app/game/mission.ts';
const s = createGame('remparts');
const stages = [];
let last;
for (let step = 0; step < 9000 && !s.won && !s.lost; step++) {
  if (step % 10 === 0) {
    const current = mission(s).current?.id;
    if (current !== last) {
      stages.push({
        step: current,
        seconds: Math.round(s.elapsed),
        units: s.units.length,
      });
      last = current;
    }
    if (current === 'manor3') upgrade(s, 6);
    if (s.lots[3].level < 2 && s.resources.gold > 100) upgrade(s, 3);
    const forgeLot = s.lots.find(
      (l) =>
        l.owned &&
        ['house', 'tavern', 'empty'].includes(l.kind) &&
        !buildReason(s, l.id, 'forge'),
    );
    if (current === 'forge' && forgeLot) build(s, forgeLot.id, 'forge');
    for (const kind of ['troll', 'imp', 'skeleton']) {
      const count =
        s.units.filter((u) => u.kind === kind).length +
        s.recruits.filter((r) => r.kind === kind).length;
      const goal = kind === 'troll' ? 3 : kind === 'imp' ? 1 : 5;
      if (
        count < goal &&
        !recruitReason(s, kind) &&
        (current === 'troll' || current === 'guild' || current === 'victory')
      )
        recruit(s, kind);
    }
    let target;
    if (
      current === 'forge' &&
      !forgeLot &&
      !s.lots.some((l) => l.construction?.kind === 'forge')
    )
      target = s.lots[5].owned ? undefined : 5;
    if (current === 'guild' && army(s).length >= 8) target = 0;
    if (current === 'victory' && army(s).length >= 6)
      target = s.lots[2].owned ? undefined : 2;
    if (
      target !== undefined &&
      !army(s).some((u) => u.task === 'attack' && u.target === target)
    )
      attack(s, target);
  }
  tick(s, 0.1);
}
console.log(
  JSON.stringify(
    { won: s.won, lost: s.lost, elapsed: Math.round(s.elapsed), stages },
    null,
    2,
  ),
);
assert.ok(
  s.won,
  'The final map can be won without altering stocks, health or time rules',
);
