import { capacity, foodBalance, rates, type Lot, type State } from './engine.ts';
import { canUpgradeKind } from './progression.ts';

const number = (n: number) => Number(n.toFixed(1)).toLocaleString('fr');

/** Preview only this improvement, with every other building left at its current level. */
export function upgradePreview(state: State, lot: Lot) {
  if (!lot.owned || !canUpgradeKind(lot.kind) || lot.level >= 3) return null;
  const after = { ...state, lots: state.lots.map(l => l.id === lot.id ? { ...l, level: l.level + 1 } : l) };
  const n = lot.level;
  if (lot.kind === 'den') return {
    label: 'Population maximale de l’armée',
    from: `${capacity(state)} places`, to: `${capacity(after)} places`,
    note: `Cette grotte : ${6 * n} → ${6 * (n + 1)} places. Les 6 places de base et celles de toutes vos grottes s’additionnent. Les bâtisseurs ont leur propre limite.`,
  };
  if (lot.kind === 'canteen' || lot.kind === 'forge') {
    const kitchen = lot.kind === 'canteen';
    const bonus = (s: State) => {
      const best = Math.max(kitchen ? 0 : 1, ...s.lots.filter(l => l.owned && l.kind === lot.kind && (!kitchen || !l.construction)).map(l => l.level));
      return kitchen ? Math.min(60, best * 20) : (best - 1) * 15;
    };
    const from = bonus(state), to = bonus(after);
    return {
      label: kitchen ? 'Réduction de la consommation totale' : 'Bonus des huttes aux dégâts de l’armée',
      from: `${kitchen ? '−' : '+'}${from} %`, to: `${kitchen ? '−' : '+'}${to} %`,
      note: `${kitchen ? 'Cette cantine' : 'Cette hutte'} : ${kitchen ? 20 * n : 15 * (n - 1)} → ${kitchen ? 20 * (n + 1) : 15 * n} %. Seul le bâtiment de plus haut niveau compte ; les bonus ne s’additionnent pas. ${from === to ? 'Aucun gain global : un autre bâtiment fournit déjà ce bonus.' : ''}${kitchen ? ` Avec vos créatures actuelles : ${foodBalance(state).consumption} → ${foodBalance(after).consumption} vivres/min.` : ''}`.trim(),
    };
  }
  const perLevel = lot.kind === 'hq' ? 10.8 : lot.kind === 'crypt' ? 24 : lot.kind === 'guild' ? 18 : 0;
  if (!perLevel) return null;
  return {
    label: 'Production totale d’essence du domaine',
    from: `${number(rates(state).mana * 60)}/min`, to: `${number(rates(after).mana * 60)}/min`,
    note: `Ce bâtiment : ${number(perLevel * n)} → ${number(perLevel * (n + 1))} essence/min. Les productions de vos bâtiments s’additionnent.`,
  };
}
