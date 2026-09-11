import type { Point, State } from './engine';
import { ISLAND_BRIDGES } from './islandRoutes.ts';

export type SoundKind =
  | 'recruit'
  | 'chop'
  | 'mine'
  | 'melee'
  | 'bow'
  | 'magic'
  | 'fire'
  | 'build'
  | 'deposit'
  | 'complete'
  | 'spawn'
  | 'spawn-soldier'
  | 'spawn-undead'
  | 'impact'
  | 'shield'
  | 'arrow-hit'
  | 'heal'
  | 'heavy'
  | 'capture'
  | 'ritual'
  | 'destroy'
  | 'death'
  | 'step-dirt'
  | 'step-stone'
  | 'step-wood'
  | 'step-armor';
export type SoundCue = { kind: SoundKind; point?: Point };

/** Observe the simulation without changing gameplay or replaying old events. */
export class SoundEvents {
  private state: State | null = null;
  private time = -1;
  private gains = new Set<number>();
  private projectiles = new Set<number>();
  private units = new Set<number>();
  private lots = new Map<
    number,
    {
      building: boolean;
      planned?: string;
      kind: string;
      owned: boolean;
      hp: number;
      level: number;
      haunted: boolean;
    }
  >();
  private health = new Map<string, number>();
  private shields = new Map<number, number>();
  private arrows = new Map<
    number,
    { point: Point; target: { type: 'lot' | 'unit'; id: number }; hp: number }
  >();
  private research = 0;
  private next = new Map<string, number>();
  private resurrected = 0;

  update(s: State): SoundCue[] {
    const fresh = this.state !== s || s.elapsed < this.time;
    if (!fresh && s.elapsed === this.time) return [];
    if (fresh) this.next.clear();
    const cues: SoundCue[] = [];
    const active = new Set<string>();
    const periodic = (
      id: string,
      kind: SoundKind,
      point: Point,
      interval = 1,
    ) => {
      active.add(id);
      if (!fresh && s.elapsed >= (this.next.get(id) ?? 0)) {
        cues.push({ kind, point });
        this.next.set(id, s.elapsed + interval);
      }
    };
    if (!fresh) {
      for (const gain of s.resourceGains)
        if (!this.gains.has(gain.id))
          cues.push({ kind: 'deposit', point: gain });
      for (const projectile of s.projectiles)
        if (!this.projectiles.has(projectile.id))
          cues.push({ kind: 'bow', point: projectile });
      for (const unit of s.units)
        if (!this.units.has(unit.id) && unit.hp > 0)
          cues.push({
            kind:
              unit.kind === 'goblin'
                ? 'spawn'
                : ['skeleton', 'specter'].includes(unit.kind)
                  ? 'spawn-undead'
                  : 'spawn-soldier',
            point: unit,
          });
      for (const death of s.domain.deaths)
        if (death.at > this.time) cues.push({ kind: 'death', point: death });
      if (s.strategy.research.length > this.research)
        cues.push({ kind: 'ritual' });
      for (const lot of s.lots) {
        const old = this.lots.get(lot.id);
        const point = { x: lot.x + 4, y: lot.y + 5.5 };
        if (!old) continue;
        if (old.hp > 0 && lot.hp <= 0) cues.push({ kind: 'destroy', point });
        else if (old.owned !== lot.owned) cues.push({ kind: 'capture', point });
        else if (
          (old.building && !lot.construction && old.planned === lot.kind) ||
          (lot.owned && lot.level > old.level)
        )
          cues.push({ kind: 'complete', point });
        else if (lot.hp > 0 && lot.hp < old.hp)
          periodic(`building-hit-${lot.id}`, 'heavy', point, 1.1);
        if (!old.haunted && (lot.hauntedUntil ?? 0) > s.elapsed)
          cues.push({ kind: 'ritual', point });
      }
      if (s.domain.resurrected > this.resurrected)
        cues.push({ kind: 'ritual' });
      for (const [id, arrow] of this.arrows) {
        if (s.projectiles.some((p) => p.id === id)) continue;
        const target =
          arrow.target.type === 'unit'
            ? s.units.find((u) => u.id === arrow.target.id)
            : s.lots.find((l) => l.id === arrow.target.id);
        if (target && target.hp < arrow.hp)
          cues.push({ kind: 'arrow-hit', point: arrow.point });
      }
    }
    const footsteps = (
      id: string,
      point: Point,
      moving: boolean | undefined,
      armor = false,
    ) => {
      if (!moving) return;
      const bridge = ISLAND_BRIDGES.some(
        (b) =>
          point.x * 32 >= b.left &&
          point.x * 32 <= b.right &&
          point.y * 32 >= b.top &&
          point.y * 32 <= b.bottom,
      );
      const inLot = s.lots.some(
        (l) =>
          point.x > l.x &&
          point.x < l.x + 8 &&
          point.y > l.y &&
          point.y < l.y + 8,
      );
      const street =
        point.x >= 0 &&
        point.x <= 32 &&
        point.y >= 0 &&
        point.y <= 32 &&
        !inLot;
      periodic(
        `step-${id}`,
        bridge
          ? 'step-wood'
          : street
            ? armor
              ? 'step-armor'
              : 'step-stone'
            : 'step-dirt',
        point,
        0.8,
      );
    };
    const health = new Map<string, number>();
    for (const [prefix, actors] of [
      ['unit', s.units],
      ['enemy', s.enemies],
      ['worker', s.workers],
    ] as const) {
      for (const actor of actors) {
        const id = `${prefix}-${actor.id}`;
        const previous = this.health.get(id);
        if (previous !== undefined && actor.hp > 0 && actor.hp < previous) {
          const blocking =
            'shieldUntil' in actor && (actor.shieldUntil ?? 0) > s.elapsed;
          const physicalAttackers =
            prefix === 'unit'
              ? s.enemies.filter(
                  (e) =>
                    e.kind === 'guard' ||
                    ['warrior', 'lancer'].includes(e.role),
                )
              : s.units.filter(
                  (u) => !['specter', 'alchemist'].includes(u.kind),
                );
          const physicalHit = physicalAttackers.some(
            (a) =>
              a.hp > 0 &&
              a.fighting &&
              Math.hypot(a.x - actor.x, a.y - actor.y) < 3,
          );
          // Hunger, burning and magical damage must not produce a sword impact.
          if (blocking || physicalHit)
            periodic(`hit-${id}`, blocking ? 'shield' : 'impact', actor, 0.85);
        }
        health.set(id, actor.hp);
      }
    }
    for (const unit of s.units) {
      if (unit.hp <= 0) continue;
      if (unit.kind !== 'specter')
        footsteps(`unit-${unit.id}`, unit, unit.moving);
      const point = { x: unit.x, y: unit.y };
      if (unit.fighting)
        periodic(
          `unit-${unit.id}`,
          unit.kind === 'alchemist'
            ? 'fire'
            : unit.kind === 'specter'
              ? 'magic'
              : ['troll', 'minotaur'].includes(unit.kind)
                ? 'heavy'
                : 'melee',
          point,
        );
      else if (
        unit.task === 'forage' &&
        unit.gathering?.phase === 'harvest' &&
        !unit.path.length
      ) {
        if (unit.gathering.kind !== 'food')
          periodic(
            `unit-${unit.id}`,
            unit.gathering.kind === 'wood' ? 'chop' : 'mine',
            point,
            1.2,
          );
      } else if (unit.task === 'build' && !unit.path.length)
        periodic(`unit-${unit.id}`, 'build', point, 1.4);
    }
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      footsteps(
        `enemy-${enemy.id}`,
        enemy,
        enemy.moving,
        enemy.kind === 'guard' || enemy.role === 'warrior',
      );
      if (
        !fresh &&
        (enemy.shieldUntil ?? 0) > s.elapsed &&
        (enemy.shieldUntil ?? 0) > (this.shields.get(enemy.id) ?? 0)
      )
        cues.push({ kind: 'shield', point: enemy });
      if (enemy.healTarget !== null)
        periodic(`heal-${enemy.id}`, 'heal', enemy, 2);
      if (enemy.fighting && enemy.role !== 'archer')
        periodic(
          `enemy-${enemy.id}`,
          enemy.role === 'monk' ? 'magic' : 'melee',
          enemy,
        );
    }
    for (const worker of s.workers) {
      if (worker.hp > 0)
        footsteps(`worker-${worker.id}`, worker, worker.moving);
      if (worker.hp <= 0 || worker.phase !== 'harvest' || worker.recovery)
        continue;
      const site = s.sites[worker.site];
      if (
        site &&
        site.kind !== 'food' &&
        !s.lots[site.home].owned &&
        site.hp > 0 &&
        (s.lots[site.home].hauntedUntil ?? 0) <= s.elapsed
      )
        periodic(
          `worker-${worker.id}`,
          site.kind === 'wood' ? 'chop' : 'mine',
          worker,
          1.2,
        );
    }
    this.state = s;
    this.time = s.elapsed;
    this.gains = new Set(s.resourceGains.map((g) => g.id));
    this.projectiles = new Set(s.projectiles.map((p) => p.id));
    this.units = new Set(s.units.map((u) => u.id));
    this.lots = new Map(
      s.lots.map((l) => [
        l.id,
        {
          building: !!l.construction,
          planned: l.construction?.kind,
          kind: l.kind,
          owned: l.owned,
          hp: l.hp,
          level: l.level,
          haunted: (l.hauntedUntil ?? 0) > s.elapsed,
        },
      ]),
    );
    this.resurrected = s.domain.resurrected;
    this.health = health;
    this.shields = new Map(s.enemies.map((e) => [e.id, e.shieldUntil ?? 0]));
    this.research = s.strategy.research.length;
    this.arrows = new Map(
      s.projectiles
        .filter((p) => p.target)
        .map((p) => {
          const target =
            p.target.type === 'unit'
              ? s.units.find((u) => u.id === p.target.id)
              : s.lots.find((l) => l.id === p.target.id);
          return [
            p.id,
            {
              point: { x: p.x, y: p.y },
              target: p.target,
              hp: target?.hp ?? 0,
            },
          ];
        }),
    );
    for (const id of this.next.keys())
      if (!active.has(id)) this.next.delete(id);
    return cues;
  }
}
