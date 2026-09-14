import { capacity, rates, type Lot, type State } from './engine.ts';
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
    note: `Cette grotte : ${6 * n} → ${6 * (n + 1)} places. Les 6 places de base et celles de toutes vos grottes s’additionnent. La limite de bâtisseurs ne change pas avec les niveaux : seules les grottes supplémentaires terminées l’augmentent (jusqu’à 10).`,
  };
  if (lot.kind === 'canteen') return {
    label: 'Durée du bonus Bien nourri',
    from: `${70 + (n - 1) * 30} s`, to: `${70 + n * 30} s`,
    note: 'Chaque repas coûte 1 vivre et réduit les dégâts physiques reçus de 5 %. La durée dépend de la cantine visitée ; les bonus ne se cumulent pas.',
  };
  if (lot.kind === 'forge') {
    const bonus = (s: State) => (Math.max(1, ...s.lots.filter(l => l.owned && l.kind === 'forge').map(l => l.level)) - 1) * 15;
    const from = bonus(state), to = bonus(after);
    return {
      label: 'Bonus des huttes aux dégâts de l’armée',
      from: `+${from} %`, to: `+${to} %`,
      note: `Cette hutte : ${15 * (n - 1)} → ${15 * n} %. Seul le bâtiment de plus haut niveau compte ; les bonus ne s’additionnent pas. ${from === to ? 'Aucun gain global : un autre bâtiment fournit déjà ce bonus.' : ''}`.trim(),
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
