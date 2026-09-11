import type { BuildingKind, Lot, State } from './engine.ts';

export const BUILDING_TIER: Partial<Record<BuildingKind, number>> = {
  den: 1,
  canteen: 1,
  crypt: 2,
  forge: 3,
};
export const MANOR_TIERS = [
  { level: 1, description: 'Grotte, cantine et gobelins lanciers à pied.' },
  {
    level: 2,
    description:
      'Crypte : squelettes, spectres et alchimistes. Recherche des chevaucheurs de cochons à la grotte.',
  },
  {
    level: 3,
    description: 'Hutte des Trolls : trolls, minotaures et recherches de feu.',
  },
] as const;

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
      return `${n === 1 ? 'Débloque la crypte et les chevaucheurs de cochons' : 'Débloque la hutte des trolls et les recherches de feu'}. Essence : ${number(10.8 * n)} → ${number(10.8 * (n + 1))}/min. Bâtiments améliorables jusqu’au niveau ${n + 1}.`;
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
