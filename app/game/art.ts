import manifest from './assets.json' with { type: 'json' };
import { humanBuildingTier } from './humanBuildings.ts';
import { shieldActive } from './shields.ts';
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
export function sheepReactionFrame(
  site: ResourceSite,
  time: number,
): number | null {
  if (site.kind !== 'food' || site.hitAt === undefined) return null;
  const age = time - site.hitAt;
  return age >= 0 && age < ASSETS['sheep-hit'].frames * FRAME_SECONDS
    ? Math.floor(age / FRAME_SECONDS)
    : null;
}
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
export function buildingArt(kind: BuildingKind, owned = true, level = 1, id = 0): AssetKey {
  if (!owned) {
    const tier = humanBuildingTier(level);
    if (kind === 'hall' && tier >= 2) return 'human-fortress-blue';
    if (kind === 'guild' && tier >= 2) return tier === 3 ? 'human-citadel-yellow' : 'human-barracks-yellow';
    // Civilian buildings keep their economic identity at every city level.
    if (kind === 'tavern') return 'tavern-blue';
    if (kind === 'house') return (['house-blue', 'house-blue-2', 'house-blue-3'] as const)[id % 3];
  }
  if (kind === 'guild' && !owned) return 'guild-yellow';
  if (kind === 'den') return 'cave';
  if (kind === 'forge' && owned) return 'troll-house';
  if (kind === 'empty') return 'wood';
  const name = kind === 'hall' ? 'hq' : kind === 'guild' ? 'crypt' : kind;
  return `${name}-${owned ? 'purple' : 'blue'}` as AssetKey;
}
export function buildingHasTowers(kind: BuildingKind, owned: boolean, level: number) {
  return !owned && kind === 'hall' && humanBuildingTier(level) === 3;
}
/** Door axis in the original sprite. House 2 has its entrance on the left. */
export function buildingDoorX(key: AssetKey) {
  if (key === 'troll-house') return 154;
  return key.startsWith('tavern-') || /^house-(blue|purple)-2$/.test(key)
    ? 30
    : ASSETS[key].frameWidth / 2;
}
export function enemyAnimationSequence(
  enemy: Pick<Enemy, 'kind' | 'role'> & Partial<Pick<Enemy, 'hp' | 'shieldUntil'>>,
  action: Animation,
  elapsed = 0,
): AssetKey[] {
  if (shieldActive({ hp: enemy.hp ?? 1, shieldUntil: enemy.shieldUntil }, elapsed))
    return [enemy.kind === 'guard' ? 'guard-shield' : 'hero-warrior-shield'];
  return [
    enemy.kind === 'guard'
      ? (`guard-${action}` as AssetKey)
      : (`hero-${enemy.role}-${action}` as AssetKey),
  ];
}
export function animationSequence(
  kind: CreatureKind,
  action: Animation,
  mounted = false,
): AssetKey[] {
  if (kind === 'spear-goblin' && mounted)
    return [`pig-rider-${action}` as AssetKey];
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
export function enemyPortrait(enemy: Pick<Enemy, 'kind' | 'role'>): AssetKey {
  return enemy.kind === 'guard' ? 'guard-avatar' : `hero-${enemy.role || 'warrior'}-avatar`;
}

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
