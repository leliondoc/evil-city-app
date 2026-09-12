import type { SoundKind } from './audioEvents';

type SoundDefinition = {
  clips: string[];
  gain: number;
  cooldown: number;
  priority: number;
};
// Prioritize significant events over work and footsteps, never just turn everything up.
export const SOUND_DEFS: Record<SoundKind, SoundDefinition> = {
  recruit: { clips: ['recruit-soft'], gain: 0.22, cooldown: 0.12, priority: 3 },
  chop: {
    clips: ['chop-1', 'chop-2', 'chop-3'],
    gain: 0.24,
    cooldown: 0.45,
    priority: 1,
  },
  mine: {
    clips: ['mine-1', 'mine-2', 'mine-3', 'mine-4'],
    gain: 0.22,
    cooldown: 0.45,
    priority: 1,
  },
  melee: {
    clips: ['sword-1', 'sword-2', 'sword-3'],
    gain: 0.38,
    cooldown: 0.22,
    priority: 2,
  },
  impact: {
    clips: ['hit-1', 'hit-2'],
    gain: 0.36,
    cooldown: 0.22,
    priority: 2,
  },
  shield: {
    clips: ['block-1', 'block-2'],
    gain: 0.4,
    cooldown: 0.3,
    priority: 2,
  },
  bow: { clips: ['bow', 'bow-2'], gain: 0.3, cooldown: 0.22, priority: 2 },
  'arrow-hit': {
    clips: ['arrow-hit-1', 'arrow-hit-2'],
    gain: 0.32,
    cooldown: 0.25,
    priority: 2,
  },
  magic: { clips: ['magic', 'magic-2'], gain: 0.3, cooldown: 0.4, priority: 2 },
  fire: { clips: ['fire', 'fire-2'], gain: 0.25, cooldown: 0.7, priority: 2 },
  heal: { clips: ['heal'], gain: 0.22, cooldown: 1.6, priority: 2 },
  heavy: { clips: ['heavy-hit'], gain: 0.42, cooldown: 0.7, priority: 2 },
  build: { clips: ['chop-4'], gain: 0.23, cooldown: 0.6, priority: 1 },
  deposit: { clips: ['deposit'], gain: 0.18, cooldown: 0.6, priority: 1 },
  complete: { clips: ['rubble'], gain: 0.28, cooldown: 0.9, priority: 3 },
  upgrade: {
    clips: ['building-upgrade.mp3'],
    gain: 0.3,
    cooldown: 0.9,
    priority: 3,
  },
  capture: { clips: ['capture'], gain: 0.3, cooldown: 1, priority: 3 },
  spawn: { clips: ['complete'], gain: 0.22, cooldown: 0.7, priority: 3 },
  'spawn-soldier': { clips: ['equip'], gain: 0.3, cooldown: 0.7, priority: 3 },
  'spawn-undead': { clips: ['ritual'], gain: 0.25, cooldown: 0.8, priority: 3 },
  ritual: { clips: ['ritual'], gain: 0.25, cooldown: 1, priority: 3 },
  destroy: { clips: ['rubble'], gain: 0.4, cooldown: 1, priority: 3 },
  death: { clips: ['fall'], gain: 0.48, cooldown: 0.18, priority: 3 },
  'step-dirt': {
    clips: ['dirt-1', 'dirt-2'],
    gain: 0.095,
    cooldown: 0.28,
    priority: 0,
  },
  'step-stone': {
    clips: ['stone-1', 'stone-2'],
    gain: 0.095,
    cooldown: 0.28,
    priority: 0,
  },
  'step-wood': {
    clips: ['wood-1', 'wood-2'],
    gain: 0.105,
    cooldown: 0.28,
    priority: 0,
  },
  'step-armor': {
    clips: ['armor-1', 'armor-2'],
    gain: 0.1,
    cooldown: 0.32,
    priority: 0,
  },
};

export function soundClipPath(clip: string): string {
  return clip.endsWith('.mp3') ? `audio/${clip}` : `audio/tommusic/${clip}.wav`;
}

/** Match active signal levels without boosting silence or allowing high peaks. */
export function effectCalibration(channels: readonly Float32Array[]): number {
  let peak = 0,
    squares = 0,
    samples = 0;
  for (const channel of channels)
    for (const sample of channel) {
      const magnitude = Math.abs(sample);
      peak = Math.max(peak, magnitude);
      if (magnitude > 0.01) {
        squares += sample * sample;
        samples++;
      }
    }
  if (!samples || !peak) return 1;
  return Math.min(2.5, 0.72 / peak, 0.1 / Math.sqrt(squares / samples));
}
