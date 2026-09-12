import { territory, type State } from './engine.ts';

export type MusicTheme = 'human' | 'guild' | 'dark';

/** Detect departures, including racket patrols and defenders of the guild. */
export class MusicEvents {
  private state: State | null = null;
  private time = -1;
  private enemies = new Set<number>();
  private darkPlayed = false;
  private darkDue = false;

  update(state: State): MusicTheme | null {
    const fresh = this.state !== state || state.elapsed < this.time;
    if (fresh) {
      this.darkPlayed = territory(state) > 0.6;
      this.darkDue = false;
    } else if (!this.darkPlayed && territory(state) > 0.6) {
      this.darkPlayed = true;
      this.darkDue = true;
    }
    const living = state.enemies.filter((enemy) => enemy.hp > 0);
    const arrivals = fresh
      ? []
      : living.filter((enemy) => !this.enemies.has(enemy.id));
    this.state = state;
    this.time = state.elapsed;
    this.enemies = new Set(living.map((enemy) => enemy.id));
    if (arrivals.some((enemy) => enemy.kind === 'hero')) return 'guild';
    if (arrivals.some((enemy) => enemy.kind === 'guard')) return 'human';
    if (this.darkDue) {
      this.darkDue = false;
      return 'dark';
    }
    return null;
  }
}
