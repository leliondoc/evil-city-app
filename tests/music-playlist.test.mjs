import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MusicPlaylist,
  musicBreakDuration,
} from '../app/game/musicPlaylist.ts';

test('Music plays all eight tracks per round without repeating across rounds', () => {
  const playlist = new MusicPlaylist();
  let previous = 0;
  for (let round = 0; round < 100; round++) {
    const tracks = Array.from({ length: 8 }, () => playlist.next());
    assert.notEqual(tracks[0], previous);
    assert.deepEqual([...tracks].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    previous = tracks[7];
  }
});

test('Musical breaks stay between two and four minutes', () => {
  const durations = Array.from({ length: 100 }, () => musicBreakDuration());
  assert.ok(
    durations.every((duration) => duration >= 120_000 && duration <= 240_000),
  );
  assert.ok(new Set(durations).size > 1);
});
