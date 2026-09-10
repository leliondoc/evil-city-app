import type { Point, Selection, Unit } from './engine';

export function dragIntent(shiftKey: boolean): 'select' | 'pan' {
  return shiftKey ? 'select' : 'pan';
}

export function selectedUnitIds(selection: Selection): number[] {
  return selection.type === 'unit'
    ? [selection.id]
    : selection.type === 'units'
      ? selection.ids
      : [];
}
export function unitSelection(ids: number[]): Selection {
  const unique = [...new Set(ids)];
  return unique.length === 0
    ? { type: 'none' }
    : unique.length === 1
      ? { type: 'unit', id: unique[0] }
      : { type: 'units', ids: unique };
}
/** Unit centers, just above their feet, keep the rectangle tied to visible bodies. */
export function unitsInRectangle(units: Unit[], a: Point, b: Point): number[] {
  const left = Math.min(a.x, b.x),
    right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y),
    bottom = Math.max(a.y, b.y);
  return units
    .filter(
      (u) =>
        u.hp > 0 &&
        u.x >= left &&
        u.x <= right &&
        u.y - 0.8 >= top &&
        u.y - 0.8 <= bottom,
    )
    .map((u) => u.id);
}
export function extendUnitSelection(
  previous: Selection,
  ids: number[],
  toggle = false,
): Selection {
  const selected = new Set(selectedUnitIds(previous));
  for (const id of ids) {
    if (toggle && selected.has(id)) selected.delete(id);
    else selected.add(id);
  }
  return unitSelection([...selected]);
}
