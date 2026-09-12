import type { BuildingKind, Lot, State } from './engine.ts';

export const BUILDING_TIER: Partial<Record<BuildingKind, number>> = {
  den: 1,
  canteen: 1,
  crypt: 2,
  forge: 3,
};
export function manorLevel(s: State): number {
  return Math.max(
    0,
    ...s.lots
      .filter((l) => l.owned && l.kind === 'hq' && l.hp > 0 && !l.construction)
      .map((l) => l.level),
  );
}
export function manorRequirement(s: State, level: number): string {
  return manorLevel(s) >= level
    ? ''
    : `Améliorez le manoir au niveau ${level}.`;
}
export function canUpgradeKind(kind: BuildingKind): boolean {
  return ['hq', 'den', 'canteen', 'crypt', 'forge', 'guild'].includes(kind);
}
const number = (value: number) => Number(value.toFixed(1)).toLocaleString('fr');

/** Per-building values; the best canteen/forge determines the global army bonus. */
export function buildingLevelEffect(kind: BuildingKind, level: number): string {
  switch (kind) {
    case 'hq':
      return `${number(10.8 * level)} essence/min · palier ${level}`;
    case 'den':
      return `+${6 * level} places pour la horde`;
    case 'canteen':
      return `Consommation réduite de ${Math.min(60, 20 * level)} %`;
    case 'crypt':
      return `${24 * level} essence/min`;
    case 'forge':
      return `Dégâts de l’armée : +${15 * (level - 1)} %`;
    case 'guild':
      return `${18 * level} essence/min`;
    default:
      return '';
  }
}
export function upgradeBenefit(lot: Pick<Lot, 'kind' | 'level'>): string {
  const n = lot.level;
  if (!canUpgradeKind(lot.kind) || n >= 3) return '';
  switch (lot.kind) {
    case 'hq':
      return `${n === 1 ? 'Débloque la crypte et les chevaucheurs de cochons' : 'Débloque la hutte des trolls et les recherches de feu'}. +10,8 essence/min.`;
    case 'den':
      return `Capacité de cette grotte : ${6 * n} → ${6 * (n + 1)} places.`;
    case 'canteen':
      return `Réduction de consommation : ${20 * n} → ${20 * (n + 1)} %. Seule la meilleure cantine compte.`;
    case 'crypt':
      return `Production d’essence : ${24 * n} → ${24 * (n + 1)}/min.`;
    case 'forge':
      return `Bonus aux dégâts de l’armée : +${15 * (n - 1)} → +${15 * n} %. Seule la meilleure hutte compte.`;
    case 'guild':
      return `Production d’essence : ${18 * n} → ${18 * (n + 1)}/min.`;
    default:
      return '';
  }
}

/** Seconds of simulation time; existing services remain active until completion. */
export function upgradeDuration(lot: Pick<Lot, 'kind' | 'level'>): number {
  if (lot.kind === 'hq') return lot.level === 1 ? 60 : 90;
  return (lot.kind === 'den' || lot.kind === 'canteen' ? 30 : 45) + (lot.level - 1) * 15;
}
export function advanceBuildingUpgrades(s: State, dt: number): Lot[] {
  const completed: Lot[] = [];
  for (const lot of s.lots) {
    const job = lot.upgrading;
    if (!job) continue;
    if (!lot.owned || lot.hp <= 0 || lot.construction || lot.kind !== job.kind || lot.level !== job.targetLevel - 1) {
      lot.upgrading = undefined;
      continue;
    }
    if (s.won || s.lost || !Number.isFinite(dt) || dt <= 0) continue;
    job.remaining = Math.max(0, job.remaining - dt);
    if (job.remaining > 1e-7) continue;
    lot.level = job.targetLevel;
    lot.upgrading = undefined;
    completed.push(lot);
  }
  return completed;
}
