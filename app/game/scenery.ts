import type { AssetKey } from './art';
import type { Lot } from './engine';
import { ISLAND_BRIDGES, inIslandClearing } from './islandRoutes.ts';

export type GroundPatch = {
  key: AssetKey;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type Decoration = { key: AssetKey; x: number; y: number; scale: number };
export const GROUND_PATCHES: GroundPatch[] = [
  { key: 'terrain-4', x: -64, y: -64, w: 18, h: 18 },
  { key: 'terrain-4', x: -192, y: -128, w: 7, h: 7 },
  { key: 'terrain-4', x: 896, y: 320, w: 7, h: 12 },
  // This island reaches the western end of the bridge at y = 656.
  { key: 'terrain-5', x: -448, y: 192, w: 5, h: 9 },
  { key: 'terrain-2', x: -384, y: 832, w: 5, h: 5 },
];
export const HIGHLANDS: GroundPatch[] = [
  { key: 'terrain-5', x: 1024, y: -192, w: 7, h: 5 },
  { key: 'terrain-4', x: -352, y: -160, w: 4, h: 3 },
];
export const BRIDGES = ISLAND_BRIDGES;
export const BRIDGE = BRIDGES[0];

function inside(
  p: GroundPatch,
  x: number,
  y: number,
  inset = 0,
  extraHeight = 0,
) {
  return (
    x >= p.x + inset &&
    x <= p.x + p.w * 64 - inset &&
    y >= p.y + inset &&
    y <= p.y + p.h * 64 + extraHeight - inset
  );
}
export function isDryGround(x: number, y: number) {
  if (HIGHLANDS.some((p) => inside(p, x, y, 24))) return true;
  // The cliff face cannot support the roots of a tree.
  if (HIGHLANDS.some((p) => inside(p, x, y, 0, 128))) return false;
  return GROUND_PATCHES.some((p) => inside(p, x, y, 24));
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
  const water = d.key.startsWith('water-rock-');
  const halfWidth = water ? 24 : 20;
  const halfHeight = water ? 24 : 12;
  for (const dx of [-halfWidth, 0, halfWidth])
    for (const dy of [-halfHeight, 0, halfHeight]) {
      const x = d.x + dx,
        y = d.y + dy;
      if (water) {
        if (
          [...GROUND_PATCHES, ...HIGHLANDS].some((p) =>
            inside(p, x, y, 0, HIGHLANDS.includes(p) ? 128 : 0),
          )
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
  for (let i = 0; i < 12; i++) {
    decorations.push({
      x: 72 + i * 80,
      y: -24,
      key: `tree-${(i % 4) + 1}` as AssetKey,
      scale: 0.6 + (i % 3) * 0.07,
    });
    decorations.push({
      x: 1140 + (i % 2) * 110 + (i % 3) * 6,
      y: 400 + Math.floor(i / 2) * 120,
      key: `tree-${(i % 4) + 1}` as AssetKey,
      scale: 0.65,
    });
  }
  for (let i = 0; i < 11; i++)
    decorations.push({
      x: -380 + (i % 3) * 74,
      y: 280 + Math.floor(i / 3) * 88,
      key: `tree-${(i % 4) + 1}` as AssetKey,
      scale: 0.65,
    });
  for (let i = 0; i < 4; i++)
    decorations.push({
      x: 1084 + i * 110,
      y: -110,
      key: `tree-${i + 1}` as AssetKey,
      scale: 0.65,
    });
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
