import type { BuildingKind, State } from './engine.ts';

const DEFENSES: Partial<Record<BuildingKind, { base: number; perLevel: number }>> = {
  hall: { base: 900, perLevel: 180 },
  guild: { base: 550, perLevel: 130 },
  tavern: { base: 180, perLevel: 52 },
  house: { base: 85, perLevel: 29 },
};

export function humanBuildingTier(level: number) {
  return level >= 5 ? 3 : level >= 3 ? 2 : 1;
}

export function humanBuildingHealth(kind: BuildingKind, level: number) {
  const defense = DEFENSES[kind];
  return defense ? defense.base + defense.perLevel * (Math.max(1, Math.min(6, level)) - 1) : 85;
}

/** Fortifications follow the funded city level, never restore a besieged building. */
export function advanceHumanBuildings(s: State) {
  for (const lot of s.lots) {
    if (lot.owned || lot.hp <= 0 || lot.construction || !DEFENSES[lot.kind] || lot.level >= s.economy.level) continue;
    if ((lot.hauntedUntil ?? 0) > s.elapsed || s.units.some((unit) => unit.hp > 0 && unit.task === 'attack' && unit.target === lot.id)) continue;
    const healthRatio = lot.hp / lot.maxHp;
    lot.level = s.economy.level;
    lot.maxHp = humanBuildingHealth(lot.kind, lot.level);
    lot.hp = Math.min(lot.maxHp, Math.ceil(healthRatio * lot.maxHp));
  }
}

export function humanBuildingDescription(kind: BuildingKind, level: number) {
  const tier = humanBuildingTier(level);
  const role = kind === 'hall'
    ? 'Centre de commandement : mobilise la garde. Les minotaures sont efficaces pour le siège.'
    : kind === 'guild'
      ? 'Quartier général des héros : quatre défenseurs sortent au premier assaut. Sa conquête coupe leurs expéditions.'
      : kind === 'tavern'
        ? 'Relais de ravitaillement : ses installations militaires se renforcent avec la ville.'
        : 'Habitation du quartier : ses défenses deviennent un poste militaire à haut niveau.';
  return `${role} Fortifications ${tier === 1 ? 'initiales' : tier === 2 ? 'renforcées' : 'avancées'} · niveau humain ${level}. Couper les livraisons retarde leur amélioration.`;
}
