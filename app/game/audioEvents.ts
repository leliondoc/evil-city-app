import type { Point, State } from './engine';

export type SoundKind =
  | 'chop'
  | 'mine'
  | 'melee'
  | 'bow'
  | 'magic'
  | 'fire'
  | 'build'
  | 'deposit'
  | 'complete'
  | 'spawn';
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
    { building: boolean; kind: string; owned: boolean }
  >();
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
          cues.push({ kind: 'spawn' });
      for (const lot of s.lots) {
        const old = this.lots.get(lot.id);
        if (
          old &&
          ((old.building && !lot.construction) || old.owned !== lot.owned)
        )
          cues.push({ kind: 'complete' });
      }
      if (s.domain.resurrected > this.resurrected) cues.push({ kind: 'magic' });
    }
    for (const unit of s.units) {
      if (unit.hp <= 0) continue;
      const point = { x: unit.x, y: unit.y };
      if (unit.fighting)
        periodic(
          `unit-${unit.id}`,
          unit.kind === 'alchemist'
            ? 'fire'
            : unit.kind === 'specter'
              ? 'magic'
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
      if (enemy.fighting && enemy.role !== 'archer')
        periodic(
          `enemy-${enemy.id}`,
          enemy.role === 'monk' ? 'magic' : 'melee',
          enemy,
        );
    }
    for (const worker of s.workers) {
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
        { building: !!l.construction, kind: l.kind, owned: l.owned },
      ]),
    );
    this.resurrected = s.domain.resurrected;
    for (const id of this.next.keys())
      if (!active.has(id)) this.next.delete(id);
    return cues;
  }
}
