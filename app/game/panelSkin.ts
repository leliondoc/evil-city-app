export type PanelKind =
  | 'paper'
  | 'notice'
  | 'ribbon'
  | 'wood'
  | 'banner'
  | 'button';
type Slice = readonly [start: number, size: number];
const regular: Slice[] = [
  [0, 64],
  [128, 64],
  [256, 64],
];
const large: Slice[] = [
  [32, 96],
  [192, 64],
  [320, 96],
];

/** Repeat texture pixels at a fixed scale. Never stretch the grain or corners. */
export function paintPanel(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  kind: PanelKind,
  width: number,
  height: number,
) {
  if (kind === 'ribbon') {
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    const scale = height / 128;
    const edge = 96 * scale;
    ctx.drawImage(image, 32, 0, 96, 128, 0, 0, edge, height);
    for (let x = edge; x < width - edge; x += 64 * scale) {
      const w = Math.min(64 * scale, width - edge - x);
      ctx.drawImage(image, 192, 0, w / scale, 128, x, 0, w, height);
    }
    ctx.drawImage(image, 320, 0, 96, 128, width - edge, 0, edge, height);
    return;
  }
  const cols =
    kind === 'wood' || kind === 'banner' || kind === 'notice' ? large : regular;
  const rows: Slice[] =
    kind === 'wood' || kind === 'banner' || kind === 'notice'
      ? [
          [32, 96],
          [192, 64],
          [320, 112],
        ]
      : regular;
  const scale = kind === 'button' ? 0.25 : kind === 'notice' ? 0.375 : 0.5;
  const xs = [0, cols[0][1] * scale, width - cols[2][1] * scale, width];
  const ys = [0, rows[0][1] * scale, height - rows[2][1] * scale, height];
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const [sx, sw] = cols[col],
        [sy, sh] = rows[row];
      const tileWidth = sw * scale,
        tileHeight = sh * scale;
      for (let y = ys[row]; y < ys[row + 1]; y += tileHeight)
        for (let x = xs[col]; x < xs[col + 1]; x += tileWidth) {
          const w = Math.min(tileWidth, xs[col + 1] - x);
          const h = Math.min(tileHeight, ys[row + 1] - y);
          ctx.drawImage(image, sx, sy, w / scale, h / scale, x, y, w, h);
        }
    }
}
