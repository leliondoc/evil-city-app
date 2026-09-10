import manifest from './assets.json' with { type: 'json' };
import type {
  BuildingKind,
  CreatureKind,
  Enemy,
  HumanWorker,
  ResourceSite,
} from './engine';

export const ASSETS = Object.fromEntries(
  Object.entries(manifest).map(([key, asset]) => [
    key,
    {
      ...asset,
      src: (import.meta.env?.BASE_URL ?? '/') + asset.src.replace(/^\//, ''),
    },
  ]),
) as typeof manifest;
export type AssetKey = keyof typeof ASSETS;
export type Animation = 'idle' | 'walk' | 'attack';
export const FRAME_SECONDS = 0.1;
/** Original sheets may contain several rows, such as the shared death animation. */
export function spriteFrame(key: AssetKey, frame: number) {
  const a = ASSETS[key];
  const height = 'frameHeight' in a ? a.frameHeight : a.height;
  const columns = a.width / a.frameWidth;
  return {
    x: (frame % columns) * a.frameWidth,
    y: Math.floor(frame / columns) * height,
    width: a.frameWidth,
    height,
  };
}
export function buildingArt(kind: BuildingKind, owned = true): AssetKey {
  if (kind === 'guild' && !owned) return 'guild-yellow';
  if (kind === 'den') return 'den';
  if (kind === 'empty') return 'wood';
  const name = kind === 'hall' ? 'hq' : kind === 'guild' ? 'crypt' : kind;
  return `${name}-${owned ? 'purple' : 'blue'}` as AssetKey;
}
/** Door axis in the original sprite. House 2 has its entrance on the left. */
export function buildingDoorX(key: AssetKey) {
  return key.startsWith('tavern-') || /^house-(blue|purple)-2$/.test(key)
    ? 30
    : ASSETS[key].frameWidth / 2;
}
export function enemyAnimationSequence(
  enemy: Pick<Enemy, 'kind' | 'role'>,
  action: Animation,
): AssetKey[] {
  return [
    enemy.kind === 'guard'
      ? (`guard-${action}` as AssetKey)
      : (`hero-${enemy.role}-${action}` as AssetKey),
  ];
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
export const portrait = (kind: Exclude<CreatureKind, 'specter'>) =>
  ASSETS[`${kind}-avatar`].src;

export function workerArt(worker: HumanWorker, site: ResourceSite): AssetKey {
  const action =
    worker.phase === 'harvest'
      ? 'work'
      : worker.phase === 'return'
        ? 'carry'
        : worker.path.length && worker.moving !== false
          ? 'walk'
          : 'idle';
  return `pawn-${site.kind}-${action}` as AssetKey;
}
