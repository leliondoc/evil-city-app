/** Tile coordinates shared by resource placement, paths and scenery. */
export const ISLAND_SITES = {
  wood: { x: -8.25, y: 12.25 },
  gold: { x: -5.5, y: 31.5 },
};
export const ISLAND_PATHS = [
  [
    { x: 0.5, y: 20.5 },
    { x: -7.5, y: 20.5 },
    { x: -7.5, y: 12.5 },
  ],
  [
    { x: -7.5, y: 20.5 },
    { x: -7.5, y: 31.5 },
    { x: -6.5, y: 31.5 },
  ],
];
export const ISLAND_BRIDGES = [
  { left: -176, right: 16, top: 640, bottom: 704 },
  { left: -256, right: -192, top: 736, bottom: 864 },
];
export function isIslandPathCell(x: number, y: number) {
  if (x >= 0) return false;
  return ISLAND_PATHS.some((path) =>
    path.slice(1).some((b, i) => {
      const a = path[i];
      const ax = Math.floor(a.x),
        ay = Math.floor(a.y);
      const bx = Math.floor(b.x),
        by = Math.floor(b.y);
      return ax === bx
        ? x === ax && y >= Math.min(ay, by) && y <= Math.max(ay, by)
        : y === ay && x >= Math.min(ax, bx) && x <= Math.max(ax, bx);
    }),
  );
}
export function isIslandGroundCell(x: number, y: number) {
  return (
    (x >= -14 && x < -4 && y >= 6 && y < 24) ||
    (x >= -12 && x < -2 && y >= 26 && y < 36) ||
    isIslandPathCell(x, y)
  );
}
export function inIslandClearing(x: number, y: number) {
  if (
    Object.values(ISLAND_SITES).some(
      (site) => Math.hypot(x - site.x * 32, y - site.y * 32) < 88,
    )
  )
    return true;
  return ISLAND_PATHS.some((path) =>
    path.slice(1).some((b, i) => {
      const a = path[i];
      return (
        x >= Math.min(a.x, b.x) * 32 - 42 &&
        x <= Math.max(a.x, b.x) * 32 + 42 &&
        y >= Math.min(a.y, b.y) * 32 - 42 &&
        y <= Math.max(a.y, b.y) * 32 + 42
      );
    }),
  );
}
