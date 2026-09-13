import {
  announce,
  entrance,
  findPath,
  humanLevel,
  navigationTarget,
  walk,
  type State,
  type Point,
  type Unit,
} from './engine.ts';
import { physicalDamage } from './combat.ts';
import { streetCenter } from './streets.ts';

const CANNON = {
  gold: 60,
  wood: 45,
  build: 10,
  warning: 2,
  reload: 12,
  damage: 24,
  hp: 160,
};
export interface CannonState {
  workerId: number;
  progress: number;
  direction: Point;
  readyAt: number;
  fireAt?: number;
  firedAt?: number;
  shot?: Point & { end: Point; hit: number[] };
}
export interface Knockback {
  end: Point;
  resume?: Point;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function street(p: Point) {
  return (
    p.x >= 0.5 &&
    p.x <= 31.5 &&
    p.y >= 0.5 &&
    p.y <= 31.5 &&
    (streetCenter(Math.floor(p.x)) !== undefined ||
      streetCenter(Math.floor(p.y)) !== undefined)
  );
}
function cannonEnd(from: Point, direction: Point): Point {
  const end = { ...from };
  for (let i = 0; i < 128; i++) {
    const next = {
      x: end.x + direction.x * 0.25,
      y: end.y + direction.y * 0.25,
    };
    if (!street(next)) break;
    Object.assign(end, next);
  }
  return end;
}
export function releaseCannonWorker(s: State, id: number) {
  const w = s.workers.find((w) => w.id === id);
  if (!w || w.cannonId === undefined) return;
  w.cannonId = undefined;
  w.phase = 'return';
  w.path = findPath(w, entrance(s.lots[s.sites[w.site].home]));
}
export function advanceCannons(s: State, dt: number) {
  const hall = s.lots.find((l) => l.kind === 'hall' && !l.owned && l.hp > 0);
  if (
    hall &&
    humanLevel(s) >= 3 &&
    s.lots.filter((l) => l.ruins).length >= 2 &&
    !s.enemies.some((e) => e.cannon && e.hp > 0) &&
    s.elapsed >= (s.cannonReadyAt ?? 0) &&
    s.economy.stocks.gold >= CANNON.gold &&
    s.economy.stocks.wood >= CANNON.wood
  ) {
    const point = navigationTarget({ x: entrance(hall).x, y: hall.y + 8.5 });
    const w = s.workers
      .filter(
        (w) =>
          w.hp > 0 &&
          !w.recovery &&
          w.rebuilding === undefined && w.repairing === undefined &&
          w.cannonId === undefined &&
          w.cargo === 0,
      )
      .sort((a, b) => distance(a, point) - distance(b, point))[0];
    if (w && !s.units.some((u) => u.hp > 0 && distance(u, point) < 4)) {
      const id = s.nextId++;
      s.economy.stocks.gold -= CANNON.gold;
      s.economy.stocks.wood -= CANNON.wood;
      w.cannonId = id;
      w.path = findPath(w, point);
      s.enemies.push({
        id,
        ...point,
        kind: 'guard',
        role: 'warrior',
        hp: CANNON.hp,
        maxHp: CANNON.hp,
        damage: CANNON.damage,
        level: humanLevel(s),
        path: [],
        target: hall.id,
        facing: -1,
        fighting: false,
        healTarget: null,
        attackCooldown: 0,
        cannon: {
          workerId: w.id,
          progress: 0,
          direction: { x: -1, y: 0 },
          readyAt: 0,
        },
      });
      announce(
        s,
        'Un paysan installe un canon devant la mairie ! Détruisez le chantier ou son bâtisseur.',
      );
    }
  }
  for (const e of s.enemies) {
    const c = e.cannon;
    if (!c) continue;
    e.path = [];
    e.fighting = false;
    e.moving = false;
    if (e.hp <= 0 || !hall) {
      releaseCannonWorker(s, c.workerId);
      if (e.hp > 0) e.hp = 0;
      s.cannonReadyAt = s.elapsed + 90;
      continue;
    }
    if (c.progress < 1) {
      const w = s.workers.find((w) => w.id === c.workerId && w.hp > 0);
      if (!w) {
        e.hp = 0;
        s.cannonReadyAt = s.elapsed + 90;
        continue;
      }
      walk(s, w, 1.8 * dt);
      if (
        !w.path.length &&
        distance(w, e) < 0.8 &&
        !s.units.some((u) => u.hp > 0 && distance(u, e) < 3)
      )
        c.progress = Math.min(1, c.progress + dt / CANNON.build);
      if (c.progress >= 1) {
        releaseCannonWorker(s, c.workerId);
        c.readyAt = s.elapsed + 2;
        announce(s, 'Le canon humain est prêt. Évitez sa ligne de tir !');
      }
      continue;
    }
    if (c.shot) {
      const shot = c.shot,
        remaining = distance(shot, shot.end),
        travel = Math.min(remaining, 30 * dt);
      for (const u of s.units) {
        if (u.hp <= 0 || c.shot.hit.includes(u.id) || !street(u)) continue;
        const dx = u.x - shot.x,
          dy = u.y - shot.y;
        const along = dx * c.direction.x + dy * c.direction.y;
        const across = Math.abs(dx * c.direction.y - dy * c.direction.x);
        if (along < -0.5 || along > travel + 0.5 || across > 0.85) continue;
        shot.hit.push(u.id);
        u.hp = Math.max(0, u.hp - physicalDamage(CANNON.damage, u));
        u.knockback = {
          end: cannonEnd(u, c.direction),
          resume: u.path.at(-1)
            ? { ...u.path.at(-1)! }
            : u.task === 'attack' && u.target !== null
              ? entrance(s.lots[u.target])
              : undefined,
        };
        u.fighting = false;
      }
      shot.x += c.direction.x * travel;
      shot.y += c.direction.y * travel;
      if (travel >= remaining) c.shot = undefined;
    }
    if (c.fireAt !== undefined) {
      if (s.elapsed >= c.fireAt) {
        c.shot = { x: e.x, y: e.y, end: cannonEnd(e, c.direction), hit: [] };
        c.firedAt = s.elapsed;
        c.fireAt = undefined;
        c.readyAt = s.elapsed + CANNON.reload;
      }
      continue;
    }
    if (s.elapsed < c.readyAt || c.shot) continue;
    for (const direction of [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ]) {
      const end = cannonEnd(e, direction),
        length = distance(e, end);
      if (
        s.units.some((u) => {
          const dx = u.x - e.x,
            dy = u.y - e.y,
            along = dx * direction.x + dy * direction.y;
          return (
            u.hp > 0 &&
            street(u) &&
            along > 1 &&
            along <= length &&
            Math.abs(dx * direction.y - dy * direction.x) <= 0.85
          );
        })
      ) {
        c.direction = direction;
        e.facing = direction.x < 0 ? -1 : 1;
        c.fireAt = s.elapsed + CANNON.warning;
        break;
      }
    }
  }
}
export function advanceKnockback(u: Unit, dt: number) {
  const push = u.knockback;
  if (!push) return false;
  const remaining = distance(u, push.end),
    travel = Math.min(remaining, 24 * dt);
  if (remaining > 0) {
    u.x += ((push.end.x - u.x) * travel) / remaining;
    u.y += ((push.end.y - u.y) * travel) / remaining;
  }
  u.fighting = false;
  if (u.manualUntil !== undefined && Number.isFinite(u.manualUntil))
    u.manualUntil += dt;
  if (travel >= remaining) {
    u.knockback = undefined;
    if (push.resume) u.path = findPath(u, push.resume);
    else u.path = [];
  }
  return true;
}
