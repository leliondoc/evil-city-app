import { enemyFaction, territory, type State } from './engine.ts';

export type MusicTheme = 'human' | 'guild' | 'dark' | 'victory';

/** Detect departures, including racket patrols and defenders of the guild. */
export class MusicEvents {
  private state: State | null = null;
  private time = -1;
  private enemies = new Set<number>();
  private darkPlayed = false;
  private darkDue = false;
  private battleTheme: 'human' | 'guild' | null = null;
  private battleAt = 0;

  update(state: State): MusicTheme | 'stop' | null {
    const fresh = this.state !== state || state.elapsed < this.time;
    if (fresh) {
      this.darkPlayed = territory(state) > 0.6;
      this.darkDue = false;
      this.battleTheme = null;
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
    const arrivalTheme = arrivals.some((e) => enemyFaction(state, e) === 'hero')
      ? 'guild'
      : arrivals.length
        ? 'human'
        : null;
    if (arrivalTheme) {
      this.battleTheme = arrivalTheme;
      this.battleAt = state.elapsed;
      return arrivalTheme;
    }
    if (this.battleTheme) {
      const combatants = living.filter(
        (e) =>
          (enemyFaction(state, e) === 'hero' ? 'guild' : 'human') ===
          this.battleTheme,
      );
      const active = combatants.some(
        (e) =>
          e.fighting ||
          e.healTarget != null ||
          e.path?.length ||
          (e.pursuitTarget !== undefined &&
            state.units.some((u) => u.id === e.pursuitTarget && u.hp > 0)) ||
          e.cannon?.fireAt !== undefined ||
          e.cannon?.shot,
      );
      if (active) this.battleAt = state.elapsed;
      if (
        state.won ||
        state.lost ||
        !combatants.length ||
        state.elapsed - this.battleAt >= 3
      ) {
        this.battleTheme = null;
        return 'stop';
      }
    }
    if (this.darkDue) {
      this.darkDue = false;
      return 'dark';
    }
    return null;
  }
}
