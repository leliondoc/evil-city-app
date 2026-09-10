import type { State } from './engine';

export type ParticleKind = 'fx-impact' | 'fx-dust-large' | 'fx-explosion';
export type Particle = {
  key: ParticleKind;
  x: number;
  y: number;
  at: number;
  scale: number;
};
type Sample = { hp: number; owned?: boolean; building?: boolean };

/** Presentation-only feedback, driven by simulation time and actual state changes. */
export class ParticleFeedback {
  private previous = new Map<string, Sample>();
  private cooldown = new Map<string, number>();
  private time = -1;
  private active: Particle[] = [];

  update(
    s: State,
    reducedMotion = false,
    now = s.elapsed,
  ): readonly Particle[] {
    if (s.elapsed < this.time || s.elapsed === 0) {
      this.previous.clear();
      this.cooldown.clear();
      this.active = [];
      this.time = -1;
    }
    if (reducedMotion) this.active = [];
    this.active = this.active.filter(
      (p) => now - p.at < (p.key === 'fx-impact' ? 0.8 : 1),
    );
    if (s.elapsed === this.time) return this.active;
    const next = new Map<string, Sample>();
    const emit = (
      id: string,
      key: ParticleKind,
      x: number,
      y: number,
      scale: number,
    ) => {
      if (
        reducedMotion ||
        (key === 'fx-impact' && (this.cooldown.get(id) ?? -1) > s.elapsed)
      )
        return;
      this.active.push({ key, x, y, scale, at: now });
      this.cooldown.set(id, s.elapsed + 0.65);
    };
    for (const [prefix, units] of [
      ['unit', s.units],
      ['enemy', s.enemies],
      ['worker', s.workers],
    ] as const)
      for (const unit of units) {
        const id = `${prefix}-${unit.id}`;
        const old = this.previous.get(id);
        if (old && unit.hp > 0 && unit.hp < old.hp)
          emit(id, 'fx-impact', unit.x, unit.y - 0.65, 0.42);
        next.set(id, { hp: unit.hp });
      }
    for (const lot of s.lots) {
      const id = `lot-${lot.id}`;
      const old = this.previous.get(id);
      if (old) {
        if (lot.hp <= 0 && old.hp > 0)
          emit(id, 'fx-explosion', lot.x + 4, lot.y + 4.5, 0.9);
        else if (old.owned !== lot.owned || (old.building && !lot.construction))
          emit(id, 'fx-dust-large', lot.x + 4, lot.y + 5.5, 1.6);
        else if (lot.hp < old.hp)
          emit(id, 'fx-impact', lot.x + 4, lot.y + 6.5, 0.6);
      }
      next.set(id, {
        hp: lot.hp,
        owned: lot.owned,
        building: !!lot.construction,
      });
    }
    this.previous = next;
    for (const id of this.cooldown.keys())
      if (!next.has(id)) this.cooldown.delete(id);
    this.active = this.active.slice(-32);
    this.time = s.elapsed;
    return this.active;
  }
}
