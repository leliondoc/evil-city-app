import type { AssetKey } from './art';

export type GroundPatch = {
  key: AssetKey;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Each # is a 64 px tile; dots cut coves and terraces into the outline. */
  rows?: string[];
  stairs?: { tx: number; ty: number; side: 'left' | 'right' }[];
};
export type GroundTile = { x: number; y: number; key: AssetKey };
export const GROUND_PATCHES: GroundPatch[] = [
  { key: 'terrain-4', x: -64, y: -64, w: 18, h: 18 },
  { key: 'terrain-4', x: -192, y: -128, w: 7, h: 7 },
  {
    key: 'terrain-4',
    x: 64,
    y: -192,
    w: 6,
    h: 3,
    rows: ['.###..', '#####.', '######'],
  },
  {
    key: 'terrain-4',
    x: 704,
    y: -192,
    w: 5,
    h: 3,
    rows: ['..##.', '.####', '#####'],
  },
  {
    key: 'terrain-4',
    x: 960,
    y: -256,
    w: 9,
    h: 9,
    rows: [
      '...####..',
      '..######.',
      '.########',
      '.########',
      '#########',
      '########.',
      '#######..',
      '######...',
      '####.....',
    ],
  },
  {
    key: 'terrain-4',
    x: 1024,
    y: 256,
    w: 7,
    h: 13,
    rows: [
      '###....',
      '####...',
      '######.',
      '#######',
      '#######',
      '######.',
      '#####..',
      '######.',
      '#######',
      '#######',
      '######.',
      '#####..',
      '###....',
    ],
  },
  {
    key: 'terrain-4',
    x: -448,
    y: -256,
    w: 6,
    h: 7,
    rows: [
      '..###.',
      '.#####',
      '######',
      '######',
      '.#####',
      '..####',
      '..###.',
    ],
  },
  // The eastern shore and the southern neck preserve both bridge landings.
  {
    key: 'terrain-4',
    x: -448,
    y: 192,
    w: 5,
    h: 9,
    rows: [
      '..##.',
      '.####',
      '#####',
      '#####',
      '####.',
      '####.',
      '#####',
      '#####',
      '.####',
    ],
  },
  {
    key: 'terrain-4',
    x: -384,
    y: 832,
    w: 5,
    h: 5,
    rows: ['.###.', '.####', '#####', '#####', '.###.'],
  },
  {
    key: 'terrain-4',
    x: 64,
    y: 1024,
    w: 6,
    h: 3,
    rows: ['######', '.#####', '..###.'],
  },
  {
    key: 'terrain-4',
    x: 704,
    y: 1024,
    w: 5,
    h: 4,
    rows: ['#####', '#####', '.####', '..##.'],
  },
  { key: 'terrain-2', x: 320, y: 1280, w: 2, h: 1 },
];
// Lower terraces are drawn first; the last patch forms the eastern summit.
export const HIGHLANDS: GroundPatch[] = [
  {
    key: 'terrain-3',
    x: 1024,
    y: -192,
    w: 7,
    h: 6,
    rows: ['..####.', '..#####', '.######', '#######', '######.', '####...'],
    stairs: [{ tx: 4, ty: 4, side: 'left' }],
  },
  {
    key: 'terrain-2',
    x: -384,
    y: -192,
    w: 5,
    h: 4,
    rows: ['.###.', '#####', '#####', '.###.'],
    stairs: [{ tx: 1, ty: 3, side: 'right' }],
  },
  {
    key: 'terrain-4',
    x: 1216,
    y: -128,
    w: 3,
    h: 2,
    rows: ['###', '###'],
    stairs: [{ tx: 1, ty: 1, side: 'right' }],
  },
];
export function patchHasTile(p: GroundPatch, tx: number, ty: number) {
  return (
    tx >= 0 &&
    ty >= 0 &&
    tx < p.w &&
    ty < p.h &&
    (!p.rows || p.rows[ty]?.[tx] === '#')
  );
}
export function patchTiles(p: GroundPatch): GroundTile[] {
  const tiles: GroundTile[] = [];
  for (let ty = 0; ty < p.h; ty++)
    for (let tx = 0; tx < p.w; tx++)
      if (patchHasTile(p, tx, ty))
        tiles.push({ x: p.x + tx * 64, y: p.y + ty * 64, key: p.key });
  return tiles;
}
export function groundTiles(): GroundTile[] {
  const tiles = new Map<string, GroundTile>();
  for (const p of GROUND_PATCHES)
    for (const tile of patchTiles(p)) tiles.set(`${tile.x},${tile.y}`, tile);
  return [...tiles.values()];
}
export function onPatch(p: GroundPatch, x: number, y: number) {
  return patchHasTile(
    p,
    Math.floor((x - p.x) / 64),
    Math.floor((y - p.y) / 64),
  );
}
export function onGround(x: number, y: number) {
  return GROUND_PATCHES.some((p) => onPatch(p, x, y));
}
export function onCliff(p: GroundPatch, x: number, y: number) {
  return !onPatch(p, x, y) && onPatch(p, x, y - 64);
}
