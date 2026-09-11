export type PanelKind =
  | 'paper'
  | 'notice'
  | 'ribbon'
  | 'yellow-ribbon'
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
  if (kind === 'yellow-ribbon') {
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    // The tails keep their size even when a message wraps onto several lines.
    const scale = Math.min(1, height / 64, width / 128);
    const tail = 32 * scale;
    const tailY = (height - 64 * scale) / 2;
    ctx.drawImage(image, 0, 256, 32, 64, 0, tailY, tail, 64 * scale);
    ctx.drawImage(
      image,
      288,
      256,
      32,
      64,
      width - tail,
      tailY,
      tail,
      64 * scale,
    );
    const cols: Slice[] = [
      [32, 32],
      [128, 64],
      [256, 32],
    ];
    const rows: Slice[] = [
      [256, 16],
      [280, 16],
      [304, 16],
    ];
    const xs = [tail, tail * 2, width - tail * 2, width - tail];
    const ys = [0, 16 * scale, height - 16 * scale, height];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const [sx, sw] = cols[col],
          [sy, sh] = rows[row];
        for (let y = ys[row]; y < ys[row + 1]; y += sh * scale)
          for (let x = xs[col]; x < xs[col + 1]; x += sw * scale) {
            const w = Math.min(sw * scale, xs[col + 1] - x);
            const h = Math.min(sh * scale, ys[row + 1] - y);
            ctx.drawImage(image, sx, sy, w / scale, h / scale, x, y, w, h);
          }
      }
    return;
  }
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
          // The wood grain is not seamless left-to-right. Mirror alternating
          // center tiles so their edge pixels meet, including the last partial tile.
          const mirrorWood =
            kind === 'wood' &&
            col === 1 &&
            Math.floor((x - xs[col]) / tileWidth) % 2 === 1;
          if (mirrorWood) {
            ctx.save();
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(
              image,
              sx + sw - w / scale,
              sy,
              w / scale,
              h / scale,
              0,
              0,
              w,
              h,
            );
            ctx.restore();
          } else {
            ctx.drawImage(image, sx, sy, w / scale, h / scale, x, y, w, h);
          }
        }
    }
}

/** The bar frame and red fill are separate original pack sheets. */
export function paintHealthBar(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  fill: CanvasImageSource,
  width: number,
  height: number,
  ratio: number,
  large = false,
) {
  const sourceY = large ? 9 : 22;
  const sourceHeight = large ? 51 : 19;
  const edgePixels = large ? 24 : 15;
  const scale = Math.min(height / sourceHeight, width / (edgePixels * 2));
  const edge = edgePixels * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    base,
    64 - edgePixels,
    sourceY,
    edgePixels,
    sourceHeight,
    0,
    0,
    edge,
    height,
  );
  for (let x = edge; x < width - edge; x += 64 * scale) {
    const w = Math.min(64 * scale, width - edge - x);
    ctx.drawImage(base, 128, sourceY, w / scale, sourceHeight, x, 0, w, height);
  }
  ctx.drawImage(
    base,
    256,
    sourceY,
    edgePixels,
    sourceHeight,
    width - edge,
    0,
    edge,
    height,
  );
  const inset = (large ? 12 : 7) * scale;
  const fillWidth =
    Math.max(0, width - inset * 2) * Math.max(0, Math.min(1, ratio));
  for (let x = 0; x < fillWidth; x += 64 * scale) {
    const w = Math.min(64 * scale, fillWidth - x);
    ctx.drawImage(
      fill,
      0,
      large ? 20 : 30,
      w / scale,
      large ? 24 : 3,
      inset + x,
      (large ? 11 : 8) * scale,
      w,
      (large ? 24 : 3) * scale,
    );
  }
}
