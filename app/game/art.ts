import manifest from './assets.json' with { type: 'json' };
import type { BuildingKind, CreatureKind } from './engine';

export const ASSETS = Object.fromEntries(
  Object.entries(manifest).map(([key, asset]) => [key, {
    ...asset, src: (import.meta.env?.BASE_URL ?? '/') + asset.src.replace(/^\//, ''),
  }]),
) as typeof manifest;
export type AssetKey = keyof typeof ASSETS;
export type Animation = 'idle' | 'walk' | 'attack';
export const FRAME_SECONDS = 0.1;
export function buildingArt(kind: BuildingKind, owned = true): AssetKey {
  if (kind === 'den') return 'den';
  if (kind === 'empty') return 'wood';
  const name = kind === 'hall' ? 'hq' : kind;
  return `${name}-${owned ? 'purple' : 'blue'}` as AssetKey;
}
export function animationSequence(
  kind: CreatureKind,
  action: Animation,
): AssetKey[] {
  if (kind === 'troll' && action === 'attack')
    return ['troll-windup', 'troll-attack', 'troll-recovery'];
  return [`${kind}-${action}` as AssetKey];
}
export function animationFrame(sequence: AssetKey[], seconds: number) {
  const total = sequence.reduce((n, key) => n + ASSETS[key].frames, 0);
  let frame = Math.floor(Math.max(0, seconds) / FRAME_SECONDS) % total;
  for (const key of sequence) {
    if (frame < ASSETS[key].frames) return { key, frame };
    frame -= ASSETS[key].frames;
  }
  return { key: sequence[0], frame: 0 };
}
export const portrait = (kind: CreatureKind) => ASSETS[`${kind}-avatar`].src;
