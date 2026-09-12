import {
  assign,
  clearShot,
  type State,
  type Enemy,
  type Unit,
} from './engine.ts';

const SHIELD = {
  threshold: 0.3,
  duration: 10,
  reduction: 0.4,
  cooldown: 30,
  radius: 4,
} as const;
const GUARD_SHIELD = {
  ...SHIELD,
  threshold: 0.2,
  duration: 6,
  reduction: 0.25,
} as const;
export const shieldSettings = (enemy: Pick<Enemy, 'kind'>) =>
  enemy.kind === 'guard' ? GUARD_SHIELD : SHIELD;
export const shieldActive = (
  enemy: Pick<Enemy, 'hp' | 'shieldUntil'>,
  elapsed: number,
) => enemy.hp > 0 && (enemy.shieldUntil ?? 0) > elapsed;
export const shieldMultiplier = (enemy: Enemy, elapsed: number) =>
  shieldActive(enemy, elapsed) ? 1 - shieldSettings(enemy).reduction : 1;
function provoker(s: State, u: Unit) {
  return (u.provokedUntil ?? 0) > s.elapsed
    ? s.enemies.find((e) => e.id === u.provokedBy && shieldActive(e, s.elapsed))
    : undefined;
}
export function provocationReason(s: State, u: Unit) {
  return provoker(s, u)
    ? `Provoqué : cible imposée pendant encore ${Math.ceil(u.provokedUntil! - s.elapsed)} s.`
    : '';
}
export function advanceShields(s: State) {
  for (const e of s.enemies) {
    if (
      e.hp <= 0 ||
      (e.kind !== 'guard' && e.role !== 'warrior') ||
      shieldActive(e, s.elapsed) ||
      (e.shieldReadyAt ?? 0) > s.elapsed
    )
      continue;
    const allies =
      e.kind === 'hero'
        ? s.enemies.filter(
            (a) =>
              a.id !== e.id &&
              a.hp > 0 &&
              a.hp <= a.maxHp * SHIELD.threshold &&
              Math.hypot(a.x - e.x, a.y - e.y) <= SHIELD.radius &&
              clearShot(e, a),
          )
        : [];
    const attackers = s.units.filter(
      (u) =>
        u.hp > 0 &&
        u.kind !== 'specter' &&
        Math.hypot(u.x - e.x, u.y - e.y) <= SHIELD.radius &&
        clearShot(u, e) &&
        !provoker(s, u) &&
        allies.some(
          (a) =>
            u.focusTarget === a.id ||
            (u.task === 'defend' && u.target === a.id) ||
            (u.fighting && a.aggressors?.includes(u.id)),
        ),
    );
    const settings = shieldSettings(e);
    if (e.hp > e.maxHp * settings.threshold && !attackers.length) continue;
    e.shieldUntil = s.elapsed + settings.duration;
    e.shieldReadyAt = s.elapsed + settings.cooldown;
    e.path = [];
    e.moving = e.fighting = false;
    e.healTarget = null;
    for (const u of attackers) {
      u.provokedBy = e.id;
      u.provokedUntil = e.shieldUntil;
      assign(u, e, 'defend', e.id);
      u.focusTarget = e.id;
    }
  }
  for (const u of s.units) {
    const e = provoker(s, u);
    if (e) {
      if (u.task !== 'defend' || u.target !== e.id)
        assign(u, e, 'defend', e.id);
      u.focusTarget = e.id;
    } else {
      delete u.provokedBy;
      delete u.provokedUntil;
    }
  }
}
