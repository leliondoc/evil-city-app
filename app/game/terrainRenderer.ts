import { STREET_STARTS, STREET_WIDTH } from './streets.ts';
import type { State } from './engine';
import type { AssetKey } from './art';
import type { DrawLayer } from './pixiScene';
import { BRIDGES, HIGHLANDS } from './scenery';
import { ISLAND_PATHS } from './islandRoutes';
import {
  groundTiles,
  patchTiles,
  onGround,
  onPatch,
  type GroundPatch,
  type GroundTile,
} from './terrainLayout';
const CELL = 32,
  SIZE = CELL * 32;
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function grassPatch(
  draw: DrawLayer,
  key: AssetKey,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      const sx = tx === 0 ? 0 : tx === w - 1 ? 128 : 64,
        sy = ty === 0 ? 0 : ty === h - 1 ? 128 : 64;
      draw.image(key, sx, sy, 64, 64, x + tx * 64, y + ty * 64, 64, 64);
    }
}
function terrainSurface(draw: DrawLayer, tiles: GroundTile[], raised = false) {
  const cells = new Set(tiles.map((t) => `${t.x},${t.y}`));
  for (const tile of tiles) {
    // Quarter tiles connect adjoining patches without rectangular inner borders.
    for (const qy of [0, 1])
      for (const qx of [0, 1]) {
        const horizontal = cells.has(`${tile.x + (qx ? 64 : -64)},${tile.y}`);
        const vertical = cells.has(`${tile.x},${tile.y + (qy ? 64 : -64)}`);
        const sx =
          (raised ? 320 : 0) + (horizontal ? 64 + qx * 32 : qx ? 160 : 0);
        const sy = vertical ? 64 + qy * 32 : qy ? 160 : 0;
        draw.image(
          tile.key,
          sx,
          sy,
          32,
          32,
          tile.x + qx * 32,
          tile.y + qy * 32,
          32,
          32,
        );
      }
  }
}
function terrace(draw: DrawLayer, p: GroundPatch, lower: GroundPatch[]) {
  const tiles = patchTiles(p);
  for (const tile of tiles) draw.whole('terrain-shadow', tile.x - 64, tile.y);
  terrainSurface(draw, tiles, true);
  const cliffs = tiles.filter((tile) => !onPatch(p, tile.x + 32, tile.y + 96));
  const cliffCells = new Set(cliffs.map((t) => `${t.x},${t.y}`));
  for (const tile of cliffs) {
    const left = cliffCells.has(`${tile.x - 64},${tile.y}`);
    const right = cliffCells.has(`${tile.x + 64},${tile.y}`);
    const sx = !left && !right ? 512 : !left ? 320 : !right ? 448 : 384;
    const land =
      onGround(tile.x + 32, tile.y + 128) ||
      lower.some((p) => onPatch(p, tile.x + 32, tile.y + 128));
    draw.image(
      p.key,
      sx,
      land ? 256 : 320,
      64,
      64,
      tile.x,
      tile.y + 64,
      64,
      64,
    );
  }
  for (const stair of p.stairs ?? [])
    draw.image(
      p.key,
      stair.side === 'left' ? 0 : 128,
      256,
      128,
      128,
      p.x + stair.tx * 64 - (stair.side === 'left' ? 64 : 0),
      p.y + stair.ty * 64,
      128,
      128,
    );
}
export function drawTerrain(draw: DrawLayer, state: State): GroundTile[] {
  const ground = groundTiles();
  const coast = new Map(ground.map((t) => [`${t.x},${t.y}`, t]));
  for (const p of HIGHLANDS)
    for (const tile of patchTiles(p)) {
      coast.set(`${tile.x},${tile.y}`, tile);
      if (!onPatch(p, tile.x + 32, tile.y + 96))
        coast.set(`${tile.x},${tile.y + 64}`, { ...tile, y: tile.y + 64 });
    }
  const shore = [...coast.values()].filter((t) =>
    [
      [-64, 0],
      [64, 0],
      [0, -64],
      [0, 64],
    ].some(([dx, dy]) => !coast.has(`${t.x + dx},${t.y + dy}`)),
  );
  terrainSurface(draw, ground);
  HIGHLANDS.forEach((p, i) => terrace(draw, p, HIGHLANDS.slice(0, i)));
  // Only streets and entrances are paved; gardens retain their own vegetation.
  let color = '#b9a67b';
  for (const edge of STREET_STARTS) {
    draw.rect(edge * CELL, 0, STREET_WIDTH * CELL, SIZE, color);
    draw.rect(0, edge * CELL, SIZE, STREET_WIDTH * CELL, color);
  }
  for (let y = 0; y < SIZE; y += 16)
    for (let x = 0; x < SIZE; x += 32) {
      if (Math.floor(x / CELL) % 10 < 2 || Math.floor(y / CELL) % 10 < 2) {
        color = noise(x, y) > 0.55 ? '#d2bd90' : '#b5a27c';
        draw.rect(x + (y % 32 ? 8 : 0), y, 28, 13, color);
      }
    }
  for (const lot of state.lots) {
    const key: AssetKey =
      lot.id === 6 || lot.id === 3
        ? 'terrain-5'
        : lot.id === 0
          ? 'terrain-2'
          : lot.id === 8
            ? 'terrain-3'
            : 'terrain-1';
    grassPatch(draw, key, lot.x * CELL, lot.y * CELL, 4, 4);
    if (lot.id === 0 && !lot.owned) {
      terrace(
        draw,
        {
          key: 'terrain-2',
          x: (lot.x + 1) * CELL,
          y: (lot.y + 1) * CELL - 40,
          w: 3,
          h: 3,
        },
        [],
      );
    }
  }
  // The same routes guide both the peasants and the visible dirt tracks.
  for (const path of ISLAND_PATHS)
    draw.line(
      path.map((p) => ({ x: p.x * CELL, y: p.y * CELL })),
      '#b9a67b',
      40,
      undefined,
      true,
    );
  // Each bridge overlaps dry ground at both ends.
  for (const { left, right, top, bottom } of BRIDGES) {
    const vertical = bottom - top > right - left;
    color = '#354957';
    draw.rect(left - 4, top + 4, right - left + 8, bottom - top + 4, color);
    if (vertical) {
      for (let y = top; y < bottom; y += 16) {
        color = y % 32 ? '#a87e4e' : '#c1975c';
        draw.rect(left, y, right - left, 14, color);
      }
    } else {
      for (let x = left; x < right; x += 16) {
        color = x % 32 ? '#a87e4e' : '#c1975c';
        draw.rect(x, top, 14, bottom - top, color);
      }
    }
    color = '#684c3b';
    if (vertical) {
      draw.rect(left, top, 6, bottom - top, color);
      draw.rect(right - 6, top, 6, bottom - top, color);
    } else {
      draw.rect(left, top, right - left, 6, color);
      draw.rect(left, bottom - 6, right - left, 6, color);
    }
  }
  return shore;
}
