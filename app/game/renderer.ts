import {
  BUILDINGS,
  CREATURES,
  ENEMIES,
  SUPPLIES,
  supplyActive,
  entrance,
  type State,
  type Point,
  type Selection,
  type Lot,
} from './engine';
import {
  ASSETS,
  animationFrame,
  animationSequence,
  enemyAnimationSequence,
  buildingArt,
  workerArt,
  type AssetKey,
  type Animation,
} from './art';

const CELL = 32,
  SIZE = 32 * CELL,
  MARGIN = 512;
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
type Hit = {
  selection: Selection;
  key: AssetKey;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  flip: boolean;
};
type Decoration = { x: number; y: number; key: AssetKey; scale: number };
type Motion = { action: Animation; since: number };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private images = new Map<AssetKey, HTMLImageElement>();
  private pixels = new Map<AssetKey, Uint8ClampedArray>();
  private bounds = new Map<
    AssetKey,
    { x: number; y: number; width: number; height: number }
  >();
  private terrain: HTMLCanvasElement;
  private decorations: Decoration[] = [];
  private hits: Hit[] = [];
  private motions = new Map<number, Motion>();
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private width = 0;
  private height = 0;
  private scale = 1;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private origin = { x: 0, y: 0 };
  private down: { x: number; y: number; panX: number; panY: number } | null =
    null;
  private dragging = false;
  private hover: Selection | null = null;
  private reducedMotion = false;
  public selection: Selection = { type: 'lot', id: 7 };
  public buildMode = false;
  public ready = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private getState: () => State,
    private onSelect: (s: Selection) => void,
    private onMove: (p: Point) => void,
    private onReady: (error?: string) => void,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.terrain = document.createElement('canvas');
    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('contextmenu', this.contextMenu);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    void this.load();
  }
  private async load() {
    try {
      await Promise.all(
        (Object.keys(ASSETS) as AssetKey[])
          .filter(
            (k) =>
              !k.endsWith('avatar') &&
              k !== 'wood-panel' &&
              !k.startsWith('bestiary-') &&
              !k.startsWith('ui-'),
          )
          .map(
            (key) =>
              new Promise<void>((resolve, reject) => {
                const im = new Image();
                im.onload = () => {
                  this.images.set(key, im);
                  const c = document.createElement('canvas');
                  c.width = im.width;
                  c.height = im.height;
                  const ctx = c.getContext('2d', { willReadFrequently: true })!;
                  ctx.drawImage(im, 0, 0);
                  this.pixels.set(
                    key,
                    ctx.getImageData(0, 0, c.width, c.height).data,
                  );
                  resolve();
                };
                im.onerror = () => reject(new Error(key));
                im.src = ASSETS[key].src;
              }),
          ),
      );
      if (this.disposed) return;
      this.makeTerrain();
      this.makeDecorations();
      this.ready = true;
      this.onReady();
      this.render();
    } catch {
      if (!this.disposed)
        this.onReady(
          'Les décors n’ont pas pu être chargés. Rechargez la page pour réessayer.',
        );
    }
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width;
    this.height = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.recalculate();
  }
  private recalculate() {
    this.scale =
      Math.max(
        0.1,
        Math.min(this.width / (SIZE + 96), this.height / (SIZE + 150)),
      ) * this.zoom;
    this.origin = {
      x: Math.round((this.width - SIZE * this.scale) / 2 + this.panX),
      y: Math.round((this.height - SIZE * this.scale) / 2 + this.panY + 14),
    };
  }
  public zoomBy(factor: number) {
    this.zoom = Math.max(0.75, Math.min(3.6, this.zoom * factor));
    this.recalculate();
  }
  public resetView() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.recalculate();
  }
  public pan(dx: number, dy: number) {
    this.panX = Math.max(-this.width, Math.min(this.width, this.panX + dx));
    this.panY = Math.max(-this.height, Math.min(this.height, this.panY + dy));
    this.recalculate();
  }
  private point(e: PointerEvent | MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  private toWorld(p: Point) {
    return {
      x: (p.x - this.origin.x) / this.scale / CELL,
      y: (p.y - this.origin.y) / this.scale / CELL,
    };
  }
  private hit(p: Point): Selection | null {
    const x = (p.x - this.origin.x) / this.scale,
      y = (p.y - this.origin.y) / this.scale;
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x < h.x || x >= h.x + h.w || y < h.y || y >= h.y + h.h) continue;
      const a = ASSETS[h.key];
      let ix = Math.floor(((x - h.x) / h.w) * a.frameWidth);
      if (h.flip) ix = a.frameWidth - 1 - ix;
      const iy = Math.floor(((y - h.y) / h.h) * a.height);
      if (
        this.pixels.get(h.key)![
          (iy * a.width + h.frame * a.frameWidth + ix) * 4 + 3
        ] > 55
      )
        return h.selection;
    }
    const w = this.toWorld(p),
      lot = this.getState().lots.find(
        (l) => w.x >= l.x && w.x < l.x + 8 && w.y >= l.y && w.y < l.y + 8,
      );
    return lot ? { type: 'lot', id: lot.id } : null;
  }
  private pointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const p = this.point(e);
    this.canvas.focus({ preventScroll: true });
    this.down = { ...p, panX: this.panX, panY: this.panY };
    this.dragging = false;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    const p = this.point(e);
    if (this.down) {
      const dx = p.x - this.down.x,
        dy = p.y - this.down.y;
      if (Math.hypot(dx, dy) > 5) this.dragging = true;
      if (this.dragging) {
        this.panX = this.down.panX + dx;
        this.panY = this.down.panY + dy;
        this.recalculate();
      }
    } else {
      this.hover = this.hit(p);
      this.canvas.style.cursor = this.hover ? 'pointer' : 'grab';
    }
  };
  private pointerUp = (e: PointerEvent) => {
    if (!this.down) return;
    const p = this.point(e);
    if (!this.dragging) {
      const hit = this.hit(p);
      if (hit) this.onSelect(hit);
      else if (this.selection.type === 'unit') this.onMove(this.toWorld(p));
    }
    this.down = null;
    this.dragging = false;
    if (this.canvas.hasPointerCapture(e.pointerId))
      this.canvas.releasePointerCapture(e.pointerId);
  };
  private pointerCancel = () => {
    this.down = null;
    this.dragging = false;
  };
  private contextMenu = (e: MouseEvent) => {
    e.preventDefault();
    this.onMove(this.toWorld(this.point(e)));
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
  };

  private grassPatch(
    ctx: CanvasRenderingContext2D,
    key: AssetKey,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const im = this.images.get(key)!;
    for (let ty = 0; ty < h; ty++)
      for (let tx = 0; tx < w; tx++) {
        const sx = tx === 0 ? 0 : tx === w - 1 ? 128 : 64,
          sy = ty === 0 ? 0 : ty === h - 1 ? 128 : 64;
        ctx.drawImage(im, sx, sy, 64, 64, x + tx * 64, y + ty * 64, 64, 64);
      }
  }
  private plateau(
    ctx: CanvasRenderingContext2D,
    key: AssetKey,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const im = this.images.get(key)!;
    ctx.drawImage(
      this.images.get('terrain-shadow')!,
      0,
      0,
      192,
      192,
      x - 20,
      y + 15,
      w * 64 + 40,
      h * 64 + 96,
    );
    for (let ty = 0; ty < h; ty++)
      for (let tx = 0; tx < w; tx++) {
        const sx = 320 + (tx === 0 ? 0 : tx === w - 1 ? 128 : 64);
        const sy = ty === 0 ? 0 : ty === h - 1 ? 128 : 64;
        ctx.drawImage(im, sx, sy, 64, 64, x + tx * 64, y + ty * 64, 64, 64);
      }
    for (let tx = 0; tx < w; tx++) {
      const sx = 320 + (tx === 0 ? 0 : tx === w - 1 ? 128 : 64);
      for (let row = 0; row < 2; row++)
        ctx.drawImage(
          im,
          sx,
          192 + row * 64,
          64,
          64,
          x + tx * 64,
          y + h * 64 + row * 64,
          64,
          64,
        );
    }
  }
  private makeTerrain() {
    const c = this.terrain;
    c.width = SIZE + MARGIN * 2;
    c.height = SIZE + MARGIN * 2;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(MARGIN, MARGIN);
    const water = this.images.get('water')!;
    for (let y = -MARGIN; y < SIZE + MARGIN; y += 64)
      for (let x = -MARGIN; x < SIZE + MARGIN; x += 64)
        ctx.drawImage(water, x, y, 64, 64);
    // A river around the western bank, woodland islands and an eastern ridge.
    this.grassPatch(ctx, 'terrain-4', -64, -64, 18, 18);
    this.grassPatch(ctx, 'terrain-4', -192, -128, 7, 7);
    this.grassPatch(ctx, 'terrain-4', 896, 320, 7, 12);
    this.grassPatch(ctx, 'terrain-5', -448, 192, 5, 6);
    this.grassPatch(ctx, 'terrain-2', -384, 768, 5, 6);
    this.plateau(ctx, 'terrain-5', 1024, -192, 7, 5);
    this.plateau(ctx, 'terrain-4', -352, -160, 4, 3);
    // Only streets and entrances are paved; gardens retain their own vegetation.
    ctx.fillStyle = '#b9a67b';
    for (const edge of [0, 10, 20, 30]) {
      ctx.fillRect(edge * CELL, 0, 2 * CELL, SIZE);
      ctx.fillRect(0, edge * CELL, SIZE, 2 * CELL);
    }
    for (let y = 0; y < SIZE; y += 16)
      for (let x = 0; x < SIZE; x += 32) {
        if (Math.floor(x / CELL) % 10 < 2 || Math.floor(y / CELL) % 10 < 2) {
          ctx.fillStyle = noise(x, y) > 0.55 ? '#d2bd90' : '#b5a27c';
          ctx.fillRect(x + (y % 32 ? 8 : 0), y, 28, 13);
        }
      }
    for (const lot of this.getState().lots) {
      const key: AssetKey =
        lot.id === 6 || lot.id === 3
          ? 'terrain-5'
          : lot.id === 0
            ? 'terrain-2'
            : lot.id === 8
              ? 'terrain-3'
              : 'terrain-1';
      this.grassPatch(ctx, key, lot.x * CELL, lot.y * CELL, 4, 4);
      ctx.fillStyle = '#c0aa7c';
      ctx.fillRect(
        (lot.x + 3.7) * CELL,
        (lot.y + 4) * CELL,
        1.6 * CELL,
        4 * CELL,
      );
      if (lot.id === 0) {
        this.plateau(
          ctx,
          'terrain-2',
          (lot.x + 1) * CELL,
          (lot.y + 1) * CELL - 40,
          3,
          2,
        );
        const im = this.images.get('terrain-2')!;
        ctx.drawImage(
          im,
          256,
          192,
          64,
          192,
          (lot.x + 3.5) * CELL,
          (lot.y + 4) * CELL,
          64,
          96,
        );
      }
    }
    // A small wooden footbridge joins the western grove to the town bank.
    ctx.fillStyle = '#354957';
    ctx.fillRect(-166, 636, 226, 86);
    for (let x = -160; x < 64; x += 16) {
      ctx.fillStyle = x % 32 ? '#a87e4e' : '#c1975c';
      ctx.fillRect(x, 632, 14, 76);
    }
    ctx.fillStyle = '#684c3b';
    ctx.fillRect(-176, 638, 250, 6);
    ctx.fillRect(-176, 700, 250, 6);
    // A kitchen garden inside an already blocked building plot.
    for (let row = 0; row < 4; row++) {
      ctx.fillStyle = '#94754e';
      ctx.fillRect(890, 795 + row * 18, 60, 11);
      for (let col = 0; col < 5; col++) {
        ctx.fillStyle = '#d6ce79';
        ctx.fillRect(892 + col * 12, 794 + row * 18, 5, 5);
      }
    }
  }
  private makeDecorations() {
    this.decorations = [];
    for (const lot of this.getState().lots) {
      const n = lot.id;
      this.decorations.push(
        {
          x: (lot.x + 1.2) * CELL,
          y: (lot.y + 3) * CELL,
          key: `tree-${(n % 4) + 1}` as AssetKey,
          scale: n === 0 ? 0.45 : 0.58,
        },
        {
          x: (lot.x + 7) * CELL,
          y: (lot.y + 2) * CELL,
          key: `bush-${(n % 4) + 1}` as AssetKey,
          scale: 0.65,
        },
        {
          x: (lot.x + 1.1) * CELL,
          y: (lot.y + 6) * CELL,
          key: `rock-${(n % 4) + 1}` as AssetKey,
          scale: 0.75,
        },
      );
      if ([1, 5, 8].includes(n))
        this.decorations.push({
          x: (lot.x + 6.5) * CELL,
          y: (lot.y + 5.5) * CELL,
          key: 'bush-2',
          scale: 0.5,
        });
    }
    for (let i = 0; i < 25; i++) {
      const top = i < 12;
      const x = top ? -100 + i * 103 : 1035 + noise(i, 4) * 210;
      const y = top ? -50 - noise(i, 6) * 100 : 370 + (i - 12) * 62;
      this.decorations.push({
        x,
        y,
        key: `tree-${(i % 4) + 1}` as AssetKey,
        scale: 0.65 + noise(i, 8) * 0.2,
      });
    }
    for (let i = 0; i < 11; i++)
      this.decorations.push({
        x: -380 + (i % 3) * 74,
        y: 240 + Math.floor(i / 3) * 72,
        key: `tree-${(i % 4) + 1}` as AssetKey,
        scale: 0.65,
      });
    for (let i = 0; i < 9; i++)
      this.decorations.push({
        x: -460 + noise(i, 3) * 330,
        y: 70 + i * 117,
        key: `water-rock-${(i % 4) + 1}` as AssetKey,
        scale: 1,
      });
    this.decorations.push(
      { x: -275, y: 930, key: 'sheep', scale: 0.75 },
      { x: -190, y: 970, key: 'sheep', scale: 0.65 },
      { x: 1170, y: 45, key: 'gold-rock', scale: 1 },
      { x: 1280, y: 70, key: 'gold-rock', scale: 0.8 },
      { x: 1260, y: 880, key: 'rock-3', scale: 1.4 },
      { x: -265, y: 80, key: 'rock-4', scale: 1.2 },
    );
  }
  private sprite(
    key: AssetKey,
    x: number,
    y: number,
    scale: number,
    frame = 0,
    alpha = 1,
    flip = false,
  ): Hit {
    const a = ASSETS[key],
      im = this.images.get(key)!,
      w = a.frameWidth * scale,
      h = a.height * scale,
      left = Math.round(x - w / 2),
      top = Math.round(y - h * a.anchor);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flip) {
      ctx.translate(left + w, top);
      ctx.scale(-1, 1);
      ctx.drawImage(
        im,
        frame * a.frameWidth,
        0,
        a.frameWidth,
        a.height,
        0,
        0,
        w,
        h,
      );
    } else
      ctx.drawImage(
        im,
        frame * a.frameWidth,
        0,
        a.frameWidth,
        a.height,
        left,
        top,
        w,
        h,
      );
    ctx.restore();
    return {
      selection: { type: 'lot', id: 0 },
      key,
      frame,
      x: left,
      y: top,
      w,
      h,
      flip,
    };
  }
  private buildingSprite(
    key: AssetKey,
    x: number,
    ground: number,
    preferredScale: number,
    frame: number,
    alpha: number,
  ) {
    const a = ASSETS[key];
    let bounds = this.bounds.get(key);
    if (!bounds) {
      const pixels = this.pixels.get(key)!;
      let left = a.frameWidth,
        right = 0,
        top = a.height,
        bottom = 0;
      for (let y = 0; y < a.height; y++)
        for (let x = 0; x < a.frameWidth; x++) {
          if (pixels[(y * a.width + x) * 4 + 3] > 40) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      bounds = {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      };
      this.bounds.set(key, bounds);
    }
    // Fit the visible drawing within the plot, not the transparent sprite frame.
    const scale = Math.min(
      preferredScale,
      192 / bounds.width,
      184 / bounds.height,
    );
    return this.sprite(
      key,
      x + (a.frameWidth / 2 - bounds.x - bounds.width / 2) * scale,
      ground + (a.height * a.anchor - bounds.y - bounds.height) * scale,
      scale,
      frame,
      alpha,
    );
  }
  private bar(x: number, y: number, ratio: number, width = 60) {
    const ctx = this.ctx;
    ctx.fillStyle = '#293333';
    ctx.fillRect(x - width / 2 - 2, y - 2, width + 4, 10);
    ctx.fillStyle = ratio < 0.3 ? '#ed9472' : '#bed27c';
    ctx.fillRect(x - width / 2, y, width * Math.max(0, Math.min(1, ratio)), 6);
  }
  private fence(l: Lot, front: boolean) {
    const im = this.images.get('fence')!,
      ctx = this.ctx,
      x = l.x * CELL,
      y = l.y * CELL;
    if (!front) {
      for (let i = 0; i < 4; i++)
        ctx.drawImage(
          im,
          i === 0 ? 0 : i === 3 ? 192 : 64,
          0,
          64,
          64,
          x + i * 64,
          y,
          64,
          64,
        );
      for (let i = 1; i < 3; i++)
        ctx.drawImage(im, 0, 64, 64, 64, x, y + i * 64, 64, 64);
    } else {
      for (let i = 1; i < 3; i++)
        ctx.drawImage(im, 192, 64, 64, 64, x + 192, y + i * 64, 64, 64);
      for (let i = 0; i < 4; i++) {
        if (i === 2) continue;
        ctx.drawImage(
          im,
          i === 0 ? 0 : i === 3 ? 192 : 64,
          128,
          64,
          64,
          x + i * 64,
          y + 192,
          64,
          64,
        );
      }
    }
  }
  private label(x: number, y: number, text: string, color = '#fff0c6') {
    const ctx = this.ctx;
    ctx.save();
    const size = 14 / this.scale;
    ctx.font = `600 ${size}px "Trebuchet MS",sans-serif`;
    const w = ctx.measureText(text).width + 16 / this.scale,
      h = 25 / this.scale;
    ctx.fillStyle = '#293a3aef';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  private render = () => {
    if (this.disposed) return;
    const ctx = this.ctx,
      s = this.getState(),
      t = this.reducedMotion ? 0 : s.elapsed,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#648b73';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.translate(this.origin.x, this.origin.y);
    ctx.scale(this.scale, this.scale);
    const grass = this.images.get('water')!,
      left = Math.floor(-this.origin.x / this.scale / 64) * 64,
      top = Math.floor(-this.origin.y / this.scale / 64) * 64;
    for (let y = top; y < (this.height - this.origin.y) / this.scale; y += 64)
      for (let x = left; x < (this.width - this.origin.x) / this.scale; x += 64)
        ctx.drawImage(grass, 0, 0, 64, 64, x, y, 64, 64);
    ctx.drawImage(this.terrain, -MARGIN, -MARGIN);
    this.hits = [];
    if (s.elapsed === 0) this.motions.clear();
    const alive = new Set([...s.units, ...s.enemies].map((u) => u.id));
    for (const id of this.motions.keys())
      if (!alive.has(id)) this.motions.delete(id);
    const drawables: { depth: number; draw: () => void }[] = [];
    for (const l of s.lots) {
      const selected =
          this.selection.type === 'lot' && this.selection.id === l.id,
        hover = this.hover?.type === 'lot' && this.hover.id === l.id;
      if (selected || hover) {
        ctx.fillStyle = selected ? '#ffdc7125' : '#fff4bd14';
        ctx.fillRect(
          l.x * CELL + 6,
          l.y * CELL + 6,
          8 * CELL - 12,
          8 * CELL - 12,
        );
        ctx.strokeStyle = this.buildMode
          ? '#ffe08a'
          : selected
            ? '#ffeeb5'
            : '#ffebac88';
        ctx.lineWidth = (selected ? 3 : 1.5) / this.scale;
        ctx.strokeRect(
          l.x * CELL + 6,
          l.y * CELL + 6,
          8 * CELL - 12,
          8 * CELL - 12,
        );
      }
      if (l.kind !== 'guild' && l.kind !== 'hall') this.fence(l, false);
      const kind = l.construction?.kind || l.kind,
        x = (l.x + 4) * CELL,
        y = (l.y + 6.2) * CELL - (l.id === 0 ? 28 : 0);
      drawables.push({
        depth: y,
        draw: () => {
          if (kind === 'empty') {
            ctx.save();
            ctx.strokeStyle = l.owned ? '#71538c' : '#657a66';
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 3;
            ctx.strokeRect(
              (l.x + 2) * CELL,
              (l.y + 2) * CELL,
              4 * CELL,
              3.5 * CELL,
            );
            ctx.restore();
            this.sprite('wood', x - 25, y, 0.9);
            this.sprite('rock', x + 30, y - 10, 0.8);
          } else {
            const key =
                kind === 'house'
                  ? (`house-${l.owned ? 'purple' : 'blue'}-${(l.id % 2) + 2}` as AssetKey)
                  : buildingArt(kind, l.owned),
              a = ASSETS[key],
              frame = Math.floor(t * 10) % a.frames;
            const scale =
              kind === 'hq' || kind === 'hall'
                ? 0.78
                : kind === 'den'
                  ? 0.94
                  : kind === 'crypt' || kind === 'guild'
                    ? 0.72
                    : 0.9;
            const hit = this.buildingSprite(
              key,
              x,
              y,
              scale,
              frame,
              l.construction ? 0.55 : 1,
            );
            hit.selection = { type: 'lot', id: l.id };
            this.hits.push(hit);
            if (l.construction)
              this.bar(x, y - 35, l.construction.progress, 90);
            if (l.level > 1) this.label(x, y - 40, '★'.repeat(l.level - 1));
          }
        },
      });
      if (kind === 'crypt')
        drawables.push({
          depth: y + 30,
          draw: () => {
            this.sprite('skull-spike', x - 70, y + 25, 0.7);
            this.sprite('bones', x + 55, y + 25, 0.7);
          },
        });
      const gate = entrance(l),
        gx = gate.x * CELL,
        gy = gate.y * CELL;
      if (!l.owned && l.kind !== 'empty')
        for (
          let i = 0;
          i < (l.kind === 'hall' || l.kind === 'guild' ? 2 : 1);
          i++
        )
          drawables.push({
            depth: gy,
            draw: () => {
              const fighting = s.units.some(
                  (u) =>
                    u.target === l.id && u.task === 'attack' && !u.path.length,
                ),
                key = fighting ? 'guard-attack' : 'guard-idle';
              this.sprite(
                key,
                gx + 22 + i * 32,
                gy,
                0.65,
                Math.floor(t * 10 + i) % ASSETS[key].frames,
                1,
                true,
              );
            },
          });
      drawables.push({
        depth: (l.y + 7.8) * CELL,
        draw: () => {
          if (l.kind !== 'guild' && l.kind !== 'hall') this.fence(l, true);
        },
      });
    }
    for (const d of this.decorations)
      drawables.push({
        depth: d.y,
        draw: () =>
          this.sprite(
            d.key,
            d.x,
            d.y,
            d.scale,
            ((Math.floor(t * 10 + d.x / 32) % ASSETS[d.key].frames) +
              ASSETS[d.key].frames) %
              ASSETS[d.key].frames,
          ),
      });
    for (const site of s.sites)
      drawables.push({
        depth: site.y * CELL,
        draw: () => {
          const selected =
            this.selection.type === 'resource' && this.selection.id === site.id;
          const active = supplyActive(s, site);
          const key = SUPPLIES[site.kind].art as AssetKey;
          const hit = this.sprite(
            key,
            site.x * CELL,
            site.y * CELL,
            site.kind === 'wood' ? 0.8 : site.kind === 'gold' ? 1.4 : 0.9,
            active ? Math.floor(t * 10) % ASSETS[key].frames : 0,
            active ? 1 : 0.4,
          );
          hit.selection = { type: 'resource', id: site.id };
          this.hits.push(hit);
          if (site.kind === 'gold') {
            for (const [dx, dy, scale] of [
              [-34, 12, 0.9],
              [32, 18, 0.7],
            ]) {
              const rock = this.sprite(
                'gold-deposit-small',
                site.x * CELL + dx,
                site.y * CELL + dy,
                scale,
                0,
                active ? 1 : 0.4,
              );
              rock.selection = { type: 'resource', id: site.id };
              this.hits.push(rock);
            }
          }
          if (selected || site.hp < site.maxHp)
            this.bar(
              site.x * CELL,
              site.y * CELL - 60,
              site.hp / site.maxHp,
              60,
            );
        },
      });
    for (const worker of s.workers)
      drawables.push({
        depth: worker.y * CELL + 1,
        draw: () => {
          const key = workerArt(worker, s.sites[worker.site]);
          const hit = this.sprite(
            key,
            worker.x * CELL,
            worker.y * CELL,
            0.72,
            Math.floor(t * 10) % ASSETS[key].frames,
            1,
            worker.facing < 0,
          );
          hit.selection = { type: 'worker', id: worker.id };
          this.hits.push(hit);
          if (
            (this.selection.type === 'worker' &&
              this.selection.id === worker.id) ||
            worker.hp < worker.maxHp
          )
            this.bar(
              worker.x * CELL,
              worker.y * CELL - 52,
              worker.hp / worker.maxHp,
              40,
            );
        },
      });
    for (const u of s.units)
      drawables.push({
        depth: u.y * CELL + 1,
        draw: () => {
          const x = u.x * CELL,
            y = u.y * CELL,
            def = CREATURES[u.kind],
            selected =
              this.selection.type === 'unit' && this.selection.id === u.id;
          const action: Animation = u.fighting
            ? 'attack'
            : u.path.length
              ? 'walk'
              : u.task === 'attack'
                ? 'attack'
                : 'idle';
          let motion = this.motions.get(u.id);
          if (!motion || motion.action !== action || motion.since > t) {
            motion = { action, since: t };
            this.motions.set(u.id, motion);
          }
          const sample = animationFrame(
              animationSequence(u.kind, action),
              t - motion.since,
            ),
            scale =
              u.kind === 'troll' ? 0.52 : u.kind === 'minotaur' ? 0.62 : 0.72;
          if (selected) {
            ctx.strokeStyle = '#fff1af';
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.ellipse(x, y, 25, 12, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          const hit = this.sprite(
            sample.key,
            x,
            y,
            scale,
            sample.frame,
            1,
            u.facing < 0,
          );
          hit.selection = { type: 'unit', id: u.id };
          this.hits.push(hit);
          if (u.task === 'forage') this.sprite('wood', x + 20, y - 4, 0.45);
          if (u.task === 'build' && !u.path.length) {
            ctx.fillStyle = '#ffe49c';
            for (let i = 0; i < 3; i++)
              ctx.fillRect(
                x + 18 + i * 6,
                y - 30 - ((t * 25 + i * 8) % 22),
                4,
                4,
              );
          }
          if (selected || u.hp < def.hp)
            this.bar(
              x,
              y - (u.kind === 'troll' || u.kind === 'minotaur' ? 84 : 58),
              u.hp / def.hp,
              48,
            );
        },
      });
    for (const e of s.enemies) {
      drawables.push({
        depth: e.y * CELL + 1,
        draw: () => {
          const x = e.x * CELL,
            y = e.y * CELL;
          const selected =
            this.selection.type === 'enemy' && this.selection.id === e.id;
          const sequence = enemyAnimationSequence(
            e,
            e.fighting || e.healTarget !== null
              ? 'attack'
              : e.path.length
                ? 'walk'
                : 'idle',
          );
          let motion = this.motions.get(e.id);
          const action: Animation =
            e.fighting || e.healTarget !== null
              ? 'attack'
              : e.path.length
                ? 'walk'
                : 'idle';
          if (!motion || motion.action !== action || motion.since > t) {
            motion = { action, since: t };
            this.motions.set(e.id, motion);
          }
          ctx.strokeStyle = selected
            ? '#fff1af'
            : e.kind === 'hero'
              ? '#ffc85c'
              : '#ed886f';
          ctx.lineWidth = (selected ? 3 : 2) / this.scale;
          ctx.beginPath();
          ctx.ellipse(x, y, e.kind === 'hero' ? 28 : 21, 11, 0, 0, Math.PI * 2);
          ctx.stroke();
          const sample = animationFrame(sequence, t - motion.since);
          const hit = this.sprite(
            sample.key,
            x,
            y,
            e.role === 'lancer' ? 0.58 : e.kind === 'hero' ? 0.78 : 0.65,
            sample.frame,
            1,
            e.facing < 0,
          );
          hit.selection = { type: 'enemy', id: e.id };
          this.hits.push(hit);
          this.bar(x, y - (e.kind === 'hero' ? 74 : 56), e.hp / e.maxHp, 44);
          if (e.healTarget !== null) {
            const ally = s.enemies.find((ally) => ally.id === e.healTarget);
            if (ally)
              this.sprite(
                'hero-heal',
                ally.x * CELL,
                ally.y * CELL,
                0.8,
                Math.floor(t * 10) % ASSETS['hero-heal'].frames,
                0.8,
              );
          }
          if (e.kind === 'hero' || selected)
            this.label(
              x,
              y + 32,
              `${e.kind === 'hero' ? '★ Héros' : ENEMIES[e.kind].name} · ${e.level}`,
              '#ffcf83',
            );
        },
      });
    }
    for (const p of s.projectiles)
      drawables.push({
        depth: p.y * CELL + 1,
        draw: () => {
          ctx.save();
          ctx.translate(p.x * CELL, p.y * CELL - 20);
          ctx.rotate(p.angle);
          this.sprite('hero-arrow', 0, 0, 0.7);
          ctx.restore();
        },
      });
    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();
    // Site labels stay in front of scenery, like parcel labels.
    for (const site of s.sites)
      this.label(
        site.x * CELL + (site.kind === 'gold' ? 80 : 0),
        site.y * CELL + 36,
        `${supplyActive(s, site) ? '' : '× '}${SUPPLIES[site.kind].label}`,
        supplyActive(s, site) ? '#ffe0a3' : '#c5c5b5',
      );
    for (const l of s.lots) {
      const x = (l.x + 4.4) * CELL,
        y = (l.y + 8) * CELL;
      if (l.owned) {
        ctx.fillStyle = '#b492df';
        ctx.fillRect(l.x * CELL + 14, l.y * CELL + 18, 16, 16);
        ctx.strokeStyle = '#443858';
        ctx.lineWidth = 2;
        ctx.strokeRect(l.x * CELL + 14, l.y * CELL + 18, 16, 16);
      }
      if (l.hp < l.maxHp) this.bar(x, y - 10, l.hp / l.maxHp, 80);
      if (this.selection.type === 'lot' && this.selection.id === l.id)
        this.label(
          x,
          y + 16,
          l.construction
            ? `Chantier · ${Math.floor(l.construction.progress * 100)} %`
            : BUILDINGS[l.kind].name,
        );
      else if (l.kind === 'hall' && !l.owned)
        this.label(x, y + 16, 'La mairie');
      else if (l.kind === 'guild')
        this.label(
          x,
          y + 16,
          l.owned ? 'Guilde neutralisée' : '★ Guilde des héros',
          '#ffcf83',
        );
    }
    if (this.selection.type === 'unit') {
      const u = s.units.find((u) => u.id === this.selection.id);
      if (u?.path.length) {
        ctx.strokeStyle = '#ffefb5';
        ctx.lineWidth = 2 / this.scale;
        ctx.setLineDash([6, 9]);
        ctx.beginPath();
        ctx.moveTo(u.x * CELL, u.y * CELL);
        for (const p of u.path) ctx.lineTo(p.x * CELL, p.y * CELL);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Cloud silhouettes use the original pack and drift with simulation time.
    for (let i = 0; i < 3; i++) {
      const x = ((t * (7 + i * 2) + i * 640) % 2050) - 480;
      const y = [-110, 170, 980][i];
      this.sprite(`cloud-${i + 1}` as AssetKey, x, y, 0.95, 0, 0.32);
    }
    this.frame = requestAnimationFrame(this.render);
  };
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('contextmenu', this.contextMenu);
    this.canvas.removeEventListener('wheel', this.wheel);
  }
}
