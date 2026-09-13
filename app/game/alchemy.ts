import { armyDamage, clearShot, CREATURES, rememberAggressor, type Point, type State, type Unit } from './engine.ts';
import { shieldMultiplier } from './shields.ts';

export const ALCHEMY = { range: 5.5, interval: 1.5, radius: 1.6, splash: 0.6, maxTargets: 4, speed: 9, healRange: 4, healAmount: 25, healCooldown: 8 } as const;
type Potion = Point & { target: Point; source: number; damage: number; solvent: boolean; buildingId?: number };
type AlchemyEffect = Point & { at: number; kind: 'heal' | 'blast' };
export type AlchemyState = { potions: Potion[]; effects: AlchemyEffect[] };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const state = (s: State) => s.alchemy ??= { potions: [], effects: [] };

export function throwPotion(s: State, u: Unit, enemy: Point, buildingId?: number) {
  if ((u.potionReadyAt ?? 0) > s.elapsed) return;
  u.potionReadyAt = s.elapsed + ALCHEMY.interval;
  state(s).potions.push({ x: u.x, y: u.y, target: { x: enemy.x, y: enemy.y }, source: u.id,
    damage: armyDamage(s, u) * ALCHEMY.interval, solvent: s.strategy.research.includes('solvent'), buildingId });
}

export function healAlly(s: State, u: Unit) {
  if (u.kind !== 'alchemist' || u.task === 'move' || u.task === 'rest' || u.task === 'eat' || (u.healReadyAt ?? 0) > s.elapsed) return;
  const ally = s.units.filter(a => a.id !== u.id && a.hp > 0 && a.hp < CREATURES[a.kind].hp &&
    distance(u, a) <= ALCHEMY.healRange && clearShot(u, a))
    .sort((a, b) => a.hp / CREATURES[a.kind].hp - b.hp / CREATURES[b.kind].hp || a.id - b.id)[0];
  if (!ally) return;
  ally.hp = Math.min(CREATURES[ally.kind].hp, ally.hp + ALCHEMY.healAmount);
  u.healReadyAt = s.elapsed + ALCHEMY.healCooldown;
  state(s).effects.push({ x: ally.x, y: ally.y, at: s.elapsed, kind: 'heal' });
}

export function advanceAlchemy(s: State, dt: number) {
  if (!s.alchemy) return;
  s.alchemy.effects = s.alchemy.effects.filter(e => s.elapsed - e.at < 0.8);
  s.alchemy.potions = s.alchemy.potions.filter(p => {
    if (!clearShot(p, p.target)) return false;
    const d = distance(p, p.target);
    if (d > ALCHEMY.speed * dt) {
      p.x += (p.target.x - p.x) / d * ALCHEMY.speed * dt;
      p.y += (p.target.y - p.y) / d * ALCHEMY.speed * dt;
      return true;
    }
    const source = s.units.find(u => u.id === p.source);
    const lot = p.buildingId === undefined ? undefined : s.lots[p.buildingId];
    if (lot && !lot.owned) lot.hp = Math.max(0, lot.hp - p.damage);
    const victims = s.enemies.filter(e => e.hp > 0 && distance(e, p.target) <= ALCHEMY.radius && clearShot(p.target, e))
      .sort((a, b) => distance(a, p.target) - distance(b, p.target) || a.id - b.id).slice(0, ALCHEMY.maxTargets);
    for (const [i, enemy] of victims.entries()) {
      if (source && source.hp > 0) rememberAggressor(s, enemy, source);
      // Magical damage bypasses passive armor, but active shields still protect.
      enemy.hp = Math.max(0, enemy.hp - p.damage * (i === 0 ? 1 : ALCHEMY.splash) * shieldMultiplier(enemy, s.elapsed));
      if (p.solvent) enemy.solventUntil = s.elapsed + 8;
    }
    state(s).effects.push({ ...p.target, at: s.elapsed, kind: 'blast' });
    return false;
  });
}
