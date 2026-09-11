/** Shuffle a complete round, including a guard against repeats between rounds. */
export class MusicPlaylist {
  private remaining: number[] = [];
  private previous = 0;

  next(): number {
    if (!this.remaining.length) {
      this.remaining = Array.from({ length: 8 }, (_, index) => index + 1);
      for (let i = this.remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.remaining[i], this.remaining[j]] = [
          this.remaining[j],
          this.remaining[i],
        ];
      }
      if (this.remaining[0] === this.previous)
        [this.remaining[0], this.remaining[1]] = [
          this.remaining[1],
          this.remaining[0],
        ];
    }
    this.previous = this.remaining.shift()!;
    return this.previous;
  }
}

export function musicBreakDuration(): number {
  return 120_000 + Math.floor(Math.random() * 120_001);
}
