import type { AssetKey } from './art';
import type { Lot } from './engine';
import { ISLAND_BRIDGES, inIslandClearing } from './islandRoutes.ts';
import { HIGHLANDS, onPatch, onGround, onCliff } from './terrainLayout.ts';
export { GROUND_PATCHES, HIGHLANDS } from './terrainLayout.ts';
export type Decoration = { key: AssetKey; x: number; y: number; scale: number };
export const BRIDGES = ISLAND_BRIDGES;
export const BRIDGE = BRIDGES[0];

export function isDryGround(x: number, y: number) {
  const surfaceAt = (px: number, py: number) => {
    for (const p of [...HIGHLANDS].reverse()) {
      if (onPatch(p, px, py)) return p;
      if (onCliff(p, px, py)) return null;
    }
    return onGround(px, py) ? 'ground' : null;
  };
  const surface = surfaceAt(x, y);
  // Keep roots and bridge landings clear of the visible shoreline / cliff lip.
  return (
    surface !== null &&
    [-24, 0, 24].every((dx) =>
      [-24, 0, 24].every((dy) => surfaceAt(x + dx, y + dy) === surface),
    )
  );
}
export function isStreet(x: number, y: number) {
  return (
    x >= 0 &&
    y >= 0 &&
    x < 1024 &&
    y < 1024 &&
    (Math.floor(x / 32) % 10 < 2 || Math.floor(y / 32) % 10 < 2)
  );
}
export function sceneryFits(d: Decoration) {
  if (
    HIGHLANDS.some((p) =>
      p.stairs?.some(
        (stair) =>
          d.x >= p.x + stair.tx * 64 - 28 &&
          d.x <= p.x + (stair.tx + 1) * 64 + 28 &&
          d.y >= p.y + stair.ty * 64 - 24 &&
          d.y <= p.y + (stair.ty + 2) * 64 + 32,
      ),
    )
  )
    return false;
  const water = d.key.startsWith('water-rock-');
  const halfWidth = water ? 24 : 20;
  const halfHeight = water ? 24 : 12;
  for (const dx of [-halfWidth, 0, halfWidth])
    for (const dy of [-halfHeight, 0, halfHeight]) {
      const x = d.x + dx,
        y = d.y + dy;
      if (water) {
        if (
          onGround(x, y) ||
          HIGHLANDS.some((p) => onPatch(p, x, y) || onCliff(p, x, y))
        )
          return false;
        if (
          BRIDGES.some(
            (bridge) =>
              x >= bridge.left - 8 &&
              x <= bridge.right + 8 &&
              y >= bridge.top - 8 &&
              y <= bridge.bottom + 8,
          )
        )
          return false;
      } else if (!isDryGround(x, y) || isStreet(x, y)) return false;
    }
  return true;
}
export function makeScenery(lots: Lot[]): Decoration[] {
  const decorations: Decoration[] = [];
  for (const lot of lots) {
    const n = lot.id;
    decorations.push(
      {
        x: (lot.x + 1.2) * 32,
        y: (lot.y + 3) * 32,
        key: `tree-${(n % 4) + 1}` as AssetKey,
        scale: n === 0 ? 0.45 : 0.58,
      },
      {
        x: (lot.x + 1.1) * 32,
        y: (lot.y + 6) * 32,
        key: `rock-${(n % 4) + 1}` as AssetKey,
        scale: 0.75,
      },
    );
    // Only the food supply remains inside its delivery building's garden.
    if (n !== 1)
      decorations.push({
        x: (lot.x + 7) * 32,
        y: (lot.y + 2) * 32,
        key: `bush-${(n % 4) + 1}` as AssetKey,
        scale: 0.65,
      });
  }
  // Small groves frame clearings; species and spacing belong to each grove.
  const groves = [
    [172, -82, 1],
    [320, -70, 2],
    [828, -70, 1],
    [-254, -94, 2],
    [1232, -30, 2],
    [1128, 80, 2],
    [1160, 390, 2],
    [1290, 490, 2],
    [1190, 720, 3],
    [1300, 880, 1],
    [1150, 1000, 3],
    [-330, 310, 4],
    [-350, 510, 4],
    [-354, 652, 3],
    [-295, 1020, 2],
    [250, 1120, 1],
    [850, 1160, 2],
  ];
  const offsets = [
    [-48, -28],
    [12, -38],
    [48, 4],
    [-20, 22],
    [18, 58],
  ];
  for (const [index, [cx, cy, species]] of groves.entries()) {
    for (const [i, [dx, dy]] of offsets.entries())
      decorations.push({
        x: cx + dx + (index % 2 ? 8 : -6),
        y: cy + dy,
        key: `tree-${species}` as AssetKey,
        scale: 0.57 + ((i + index) % 3) * 0.07,
      });
    decorations.push(
      {
        x: cx + 56,
        y: cy + 54,
        key: `bush-${species}` as AssetKey,
        scale: 0.7,
      },
      { x: cx - 52, y: cy + 48, key: 'rock-3', scale: 0.8 },
    );
  }
  for (const [i, [x, y]] of [
    [-464, 60],
    [-96, 400],
    [-96, 550],
    [-96, 740],
    [-464, 880],
    [-30, 1200],
  ].entries())
    decorations.push({
      x,
      y,
      key: `water-rock-${(i % 4) + 1}` as AssetKey,
      scale: 0.85,
    });
  decorations.push(
    { x: 1260, y: 880, key: 'rock-3', scale: 1.4 },
    { x: -265, y: -48, key: 'rock-4', scale: 1.2 },
  );
  return decorations.filter(
    (d) => sceneryFits(d) && !inIslandClearing(d.x, d.y),
  );
}
