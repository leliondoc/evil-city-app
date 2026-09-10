import {
  BUILDINGS,
  CREATURES,
  ENEMIES,
  GUILD_ROLES,
  HEROES,
  SUPPLIES,
  RESOURCE_GAIN_LIFETIME,
  supplyActive,
  entrance,
  atEntrance,
  buildReason,
  type BuildingKind,
  type State,
  type Point,
  type Selection,
  type Lot,
} from './engine';
import {
  ASSETS,
  spriteFrame,
  FRAME_SECONDS,
  animationFrame,
  animationSequence,
  enemyAnimationSequence,
  buildingArt,
  buildingDoorX,
  workerArt,
  type AssetKey,
  type Animation,
} from './art';

import {
  BRIDGES,
  GROUND_PATCHES,
  HIGHLANDS,
  makeScenery,
  type Decoration,
} from './scenery';
import { ISLAND_PATHS } from './islandRoutes';
import { isHaunted, thought } from './domain';
import {
  selectedUnitIds,
  unitSelection,
  unitsInRectangle,
  extendUnitSelection,
  dragIntent,
} from './selection';

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
  private down: {
    x: number;
    y: number;
    panX: number;
    panY: number;
    pointerId: number;
    mode: 'select' | 'pan';
    additive: boolean;
    end: Point;
  } | null = null;
  private dragging = false;
  private hover: Selection | null = null;
  private reducedMotion = false;
  public selection: Selection = { type: 'lot', id: 7 };
  public buildKind: BuildingKind | null = null;
  public ready = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private getState: () => State,
    private onSelect: (s: Selection) => void,
    private onCommand: (p: Point, target: Selection | null) => void,
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
              (!k.startsWith('ui-') ||
                [
                  'ui-selection-corners',
                  'ui-gold',
                  'ui-wood-icon',
                  'ui-food',
                ].includes(k)),
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
    this.pointerCancel();
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.recalculate();
  }
  public pan(dx: number, dy: number) {
    if (this.down?.mode === 'select') this.pointerCancel();
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
      const source = spriteFrame(h.key, h.frame);
      let ix = Math.floor(((x - h.x) / h.w) * a.frameWidth);
      if (h.flip) ix = a.frameWidth - 1 - ix;
      const iy = Math.floor(((y - h.y) / h.h) * source.height);
      if (
        this.pixels.get(h.key)![
          ((source.y + iy) * a.width + source.x + ix) * 4 + 3
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
    if (this.down || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault();
    const p = this.point(e);
    this.canvas.focus({ preventScroll: true });
    this.down = {
      ...p,
      panX: this.panX,
      panY: this.panY,
      pointerId: e.pointerId,
      mode:
        e.button === 1 || e.altKey || e.pointerType === 'touch'
          ? 'pan'
          : dragIntent(e.shiftKey),
      additive: e.shiftKey,
      end: p,
    };
    this.dragging = false;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    const p = this.point(e);
    if (this.down) {
      if (e.pointerId !== this.down.pointerId) return;
      this.down.end = p;
      const dx = p.x - this.down.x,
        dy = p.y - this.down.y;
      if (Math.hypot(dx, dy) > 5) {
        this.dragging = true;
      }
      if (this.dragging && this.down.mode === 'pan') {
        this.panX = this.down.panX + dx;
        this.panY = this.down.panY + dy;
        this.recalculate();
      }
    } else {
      this.hover = this.hit(p);
    }
    this.updateCursor();
  };
  private pointerUp = (e: PointerEvent) => {
    if (!this.down || e.pointerId !== this.down.pointerId) return;
    this.pointerMove(e);
    const p = this.point(e);
    if (this.dragging && this.down.mode === 'select') {
      const ids = unitsInRectangle(
        this.getState().units,
        this.toWorld(this.down),
        this.toWorld(p),
      );
      this.onSelect(
        this.down.additive
          ? extendUnitSelection(this.selection, ids)
          : unitSelection(ids),
      );
    } else if (!this.dragging && e.button === 0) {
      const hit = this.hit(p);
      if (this.down.additive && hit?.type === 'unit')
        this.onSelect(extendUnitSelection(this.selection, [hit.id], true));
      else if (this.down.additive && !hit) {
        /* Preserve selection on Shift + empty click. */
      } else if (hit) this.onSelect(hit);
      else this.onSelect({ type: 'none' });
    }
    this.down = null;
    this.dragging = false;
    this.hover = this.hit(p);
    this.updateCursor();
    if (this.canvas.hasPointerCapture(e.pointerId))
      this.canvas.releasePointerCapture(e.pointerId);
  };
  private pointerCancel = () => {
    if (this.down && this.canvas.hasPointerCapture(this.down.pointerId))
      this.canvas.releasePointerCapture(this.down.pointerId);
    this.down = null;
    this.dragging = false;
    this.updateCursor();
  };
  public cancelGesture() {
    this.pointerCancel();
  }
  private updateCursor() {
    const forbidden =
      this.buildKind !== null &&
      (this.hover?.type !== 'lot' ||
        !!buildReason(this.getState(), this.hover.id, this.buildKind));
    const cursor =
      this.dragging && this.down?.mode === 'pan'
        ? 'hand'
        : this.dragging
          ? 'arrow'
          : forbidden
            ? 'forbidden'
            : this.hover
              ? 'hand'
              : 'arrow';
    if (this.canvas.dataset.cursor !== cursor)
      this.canvas.dataset.cursor = cursor;
  }
  private contextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (this.down) this.pointerCancel();
    const point = this.point(e);
    this.onCommand(this.toWorld(point), this.hit(point));
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.down) return;
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
    for (const p of GROUND_PATCHES)
      this.grassPatch(ctx, p.key, p.x, p.y, p.w, p.h);
    for (const p of HIGHLANDS) this.plateau(ctx, p.key, p.x, p.y, p.w, p.h);
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
      if (lot.id === 0) {
        this.plateau(
          ctx,
          'terrain-2',
          (lot.x + 1) * CELL,
          (lot.y + 1) * CELL - 40,
          3,
          2,
        );
      }
    }
    // The same routes guide both the peasants and the visible dirt tracks.
    ctx.strokeStyle = '#b9a67b';
    ctx.lineWidth = 40;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const path of ISLAND_PATHS) {
      ctx.beginPath();
      path.forEach((p, i) =>
        i
          ? ctx.lineTo(p.x * CELL, p.y * CELL)
          : ctx.moveTo(p.x * CELL, p.y * CELL),
      );
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // Each bridge overlaps dry ground at both ends.
    for (const { left, right, top, bottom } of BRIDGES) {
      const vertical = bottom - top > right - left;
      ctx.fillStyle = '#354957';
      ctx.fillRect(left - 4, top + 4, right - left + 8, bottom - top + 4);
      if (vertical) {
        for (let y = top; y < bottom; y += 16) {
          ctx.fillStyle = y % 32 ? '#a87e4e' : '#c1975c';
          ctx.fillRect(left, y, right - left, 14);
        }
      } else {
        for (let x = left; x < right; x += 16) {
          ctx.fillStyle = x % 32 ? '#a87e4e' : '#c1975c';
          ctx.fillRect(x, top, 14, bottom - top);
        }
      }
      ctx.fillStyle = '#684c3b';
      if (vertical) {
        ctx.fillRect(left, top, 6, bottom - top);
        ctx.fillRect(right - 6, top, 6, bottom - top);
      } else {
        ctx.fillRect(left, top, right - left, 6);
        ctx.fillRect(left, bottom - 6, right - left, 6);
      }
    }
  }
  private makeDecorations() {
    this.decorations = makeScenery(this.getState().lots);
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
      source = spriteFrame(key, frame),
      im = this.images.get(key)!,
      w = a.frameWidth * scale,
      h = source.height * scale,
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
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        w,
        h,
      );
    } else
      ctx.drawImage(
        im,
        source.x,
        source.y,
        source.width,
        source.height,
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
  private buildingPlacement(
    key: AssetKey,
    x: number,
    ground: number,
    preferredScale: number,
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
    return {
      x: x + (a.frameWidth / 2 - bounds.x - bounds.width / 2) * scale,
      y: ground + (a.height * a.anchor - bounds.y - bounds.height) * scale,
      scale,
    };
  }
  private approach(lot: Lot, doorX: number, ground: number) {
    const ctx = this.ctx;
    const center = (lot.x + 4) * CELL;
    const bend = (lot.y + 6.3) * CELL;
    ctx.save();
    ctx.strokeStyle = '#c0aa7c';
    ctx.lineWidth = 40;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(doorX, ground - 24);
    ctx.lineTo(doorX, bend);
    ctx.lineTo(center, bend);
    ctx.lineTo(center, (lot.y + 8) * CELL);
    ctx.stroke();
    if (lot.id === 0) {
      ctx.drawImage(
        this.images.get('terrain-2')!,
        256,
        192,
        64,
        192,
        center - 32,
        (lot.y + 4) * CELL,
        64,
        96,
      );
    }
    ctx.restore();
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
      const site = this.getState().sites.find((site) => site.home === l.id);
      for (let i = 1; i < 3; i++) {
        // Leave the supply yard accessible instead of drawing a fence over its worker and resource.
        if (site && site.y - l.y >= i * 2 && site.y - l.y < (i + 1) * 2)
          continue;
        ctx.drawImage(im, 192, 64, 64, 64, x + 192, y + i * 64, 64, 64);
      }
      // Retain the two gateposts and leave a centered 40 px opening between them.
      for (const offset of [0, 148]) {
        ctx.drawImage(im, offset, 128, 108, 64, x + offset, y + 192, 108, 64);
      }
    }
  }
  private label(x: number, y: number, text: string, color = '#eee4ce') {
    const ctx = this.ctx;
    ctx.save();
    const size = 11 / this.scale;
    ctx.font = `500 ${size}px "Trebuchet MS",sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#203235cc';
    ctx.lineWidth = 2.5 / this.scale;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  private render = () => {
    this.updateCursor();
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
    const combatBars: {
      x: number;
      y: number;
      ratio: number;
      enemy: boolean;
    }[] = [];
    for (const l of s.lots) {
      const selected =
          this.selection.type === 'lot' && this.selection.id === l.id,
        hover = this.hover?.type === 'lot' && this.hover.id === l.id;
      if (selected || hover) {
        const corner = Math.min(20, 10 / this.scale);
        const inset = 24;
        const marker = this.images.get('ui-selection-corners')!;
        ctx.save();
        ctx.globalAlpha = selected ? 0.9 : 0.45;
        for (const [right, bottom] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ]) {
          ctx.drawImage(
            marker,
            right * 96,
            bottom * 96,
            32,
            32,
            l.x * CELL + (right ? 8 * CELL - inset - corner : inset),
            l.y * CELL + (bottom ? 8 * CELL - inset - corner : inset),
            corner,
            corner,
          );
        }
        ctx.restore();
      }
      const kind = l.construction?.kind || l.kind,
        x = (l.x + 4) * CELL,
        y = (l.y + 6.2) * CELL - (l.id === 0 ? 28 : 0),
        key =
          kind === 'house'
            ? (`house-${l.owned ? 'purple' : 'blue'}-${(l.id % 2) + 2}` as AssetKey)
            : buildingArt(kind, l.owned),
        preferredScale =
          kind === 'hq' || kind === 'hall'
            ? 0.78
            : kind === 'den'
              ? 0.94
              : kind === 'crypt' || kind === 'guild'
                ? 0.72
                : 0.9,
        placement =
          kind === 'empty'
            ? null
            : this.buildingPlacement(key, x, y, preferredScale);
      const doorX = placement
        ? Math.round(
            placement.x - (ASSETS[key].frameWidth * placement.scale) / 2,
          ) +
          buildingDoorX(key) * placement.scale
        : x;
      this.approach(l, doorX, y);
      if (l.kind !== 'guild' && l.kind !== 'hall') this.fence(l, false);
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
          } else if (placement) {
            const a = ASSETS[key],
              frame = Math.floor(t * 10) % a.frames;
            const hit = this.sprite(
              key,
              placement.x,
              placement.y,
              placement.scale,
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
        // Put the feet on the street in front of the gate, clear of walls and fencing.
        gy = (l.y + 8.25) * CELL;
      if (!l.owned && l.kind !== 'empty')
        for (
          let i = 0;
          i <
          (l.kind === 'guild' ? GUILD_ROLES.length : l.kind === 'hall' ? 2 : 1);
          i++
        )
          drawables.push({
            depth: gy,
            draw: () => {
              const fighting = s.units.some(
                  (u) =>
                    u.target === l.id &&
                    u.task === 'attack' &&
                    atEntrance(u, l),
                ),
                role = l.kind === 'guild' ? GUILD_ROLES[i] : undefined,
                key = role
                  ? enemyAnimationSequence(
                      { kind: 'hero', role },
                      fighting && role !== 'monk' ? 'attack' : 'idle',
                    )[0]
                  : fighting
                    ? 'guard-attack'
                    : 'guard-idle',
                heroX = gx - 72 + i * 48,
                guardX = l.kind === 'hall' ? gx - 22 + i * 44 : gx,
                selected =
                  role &&
                  this.selection.type === 'guildHero' &&
                  this.selection.id === i;
              const hit = this.sprite(
                key,
                role ? heroX : guardX,
                gy,
                role === 'lancer' ? 0.58 : role ? 0.78 : 0.65,
                Math.floor(t * 10 + i) % ASSETS[key].frames,
                1,
                true,
              );
              hit.selection = role
                ? { type: 'guildHero', id: i }
                : { type: 'lot', id: l.id };
              this.hits.push(hit);
              if (role && selected)
                this.label(heroX, gy + 24, HEROES[role].short);
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
            site.kind === 'wood' ? 0.65 : site.kind === 'gold' ? 0.75 : 0.8,
            active ? Math.floor(t * 10) % ASSETS[key].frames : 0,
            active ? 1 : 0.4,
          );
          hit.selection = { type: 'resource', id: site.id };
          this.hits.push(hit);
          if (site.kind === 'gold') {
            for (const [dx, dy, scale] of [[-20, 18, 0.5]]) {
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
            worker.phase !== 'harvest' && worker.moving === false
              ? 0
              : Math.floor(
                  (worker.phase === 'harvest' ? worker.progress : t) * 10,
                ) % ASSETS[key].frames,
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
            selected = selectedUnitIds(this.selection).includes(u.id);
          const action: Animation = u.fighting
            ? 'attack'
            : u.path.length && u.moving !== false
              ? 'walk'
              : u.task === 'attack' &&
                  u.target !== null &&
                  atEntrance(u, s.lots[u.target])
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
          const bubble = thought(s, u);
          if (bubble && u.task !== 'duel')
            this.label(x, y - 102, bubble, '#d3efdd');
          if (u.task === 'bribe') this.sprite('ui-gold', x + 22, y - 22, 0.5);
          if (u.task === 'deliver') {
            this.sprite('unit-death', x + 20, y - 8, 0.55, 10);
          }
          if (u.task === 'forage') this.sprite('wood', x + 20, y - 4, 0.45);
          if (
            u.task === 'build' &&
            u.target !== null &&
            atEntrance(u, s.lots[u.target])
          ) {
            ctx.fillStyle = '#ffe49c';
            for (let i = 0; i < 3; i++)
              ctx.fillRect(
                x + 18 + i * 6,
                y - 30 - ((t * 25 + i * 8) % 22),
                4,
                4,
              );
          }
          if (selected || u.hp < def.hp || action === 'attack')
            combatBars.push({
              x,
              y: y - (u.kind === 'troll' || u.kind === 'minotaur' ? 84 : 58),
              ratio: u.hp / def.hp,
              enemy: false,
            });
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
              : e.path.length && e.moving !== false
                ? 'walk'
                : 'idle',
          );
          let motion = this.motions.get(e.id);
          const action: Animation =
            e.fighting || e.healTarget !== null
              ? 'attack'
              : e.path.length && e.moving !== false
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
          combatBars.push({
            x,
            y: y - (e.kind === 'hero' ? 74 : 56),
            ratio: e.hp / e.maxHp,
            enemy: true,
          });
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
              `${e.kind === 'hero' ? HEROES[e.role].short : ENEMIES[e.kind].name} · ${e.level}`,
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
    for (const corpse of s.domain.corpses.filter((c) => !c.carrier)) {
      const x = corpse.x * CELL,
        y = corpse.y * CELL;
      const frame = this.reducedMotion
        ? 10
        : Math.min(10, Math.floor((s.elapsed - corpse.at) / FRAME_SECONDS));
      this.sprite('unit-death', x, y, 0.8, frame);
    }
    for (const death of s.domain.deaths) {
      if (this.reducedMotion) continue;
      const frame = Math.min(
        ASSETS['unit-death'].frames - 1,
        Math.floor((s.elapsed - death.at) / FRAME_SECONDS),
      );
      this.sprite('unit-death', death.x * CELL, death.y * CELL, 0.8, frame);
    }
    for (const lot of s.lots.filter((l) => isHaunted(s, l))) {
      const x = (lot.x + 4) * CELL,
        y = (lot.y + 4) * CELL;
      for (const side of [-1, 1]) {
        const sample = animationFrame(
          ['haunt-wisp'],
          t * 0.6 + (side + 1) * 0.1,
        );
        this.sprite(
          sample.key,
          x + side * 42,
          y + 12 + Math.sin(t * 2 + side) * 3,
          0.8,
          sample.frame,
        );
      }
      this.label(
        x,
        y - 92,
        `Hanté · ${Math.ceil((lot.hauntedUntil ?? 0) - s.elapsed)} s`,
        '#d9bcff',
      );
    }
    for (const e of s.enemies.filter((e) => e.exorcising !== undefined))
      this.label(
        e.x * CELL,
        e.y * CELL - 95,
        e.fighting ? 'Duel' : 'Chasse au spectre',
        '#fff0bb',
      );
    for (const w of s.workers.filter((w) => w.recovery))
      this.label(
        w.x * CELL,
        w.y * CELL - 72,
        w.recovery?.returning ? 'Sépulture' : 'Secours',
        '#d2e4f5',
      );
    // Site labels stay in front of scenery, like parcel labels.
    for (const site of s.sites)
      this.label(
        site.x * CELL,
        site.y * CELL + 36,
        `${supplyActive(s, site) ? '' : '× '}${SUPPLIES[site.kind].label}`,
        supplyActive(s, site) ? '#ffe0a3' : '#c5c5b5',
      );
    for (const l of s.lots) {
      const x = (l.x + 4.4) * CELL,
        y = (l.y + 8) * CELL,
        labelY = y + (!l.owned && l.kind !== 'empty' ? 32 : 16);
      if (l.hp < l.maxHp) this.bar(x, y - 10, l.hp / l.maxHp, 80);
      if (this.selection.type === 'lot' && this.selection.id === l.id)
        this.label(
          x,
          labelY,
          l.construction
            ? `Chantier · ${Math.floor(l.construction.progress * 100)} %`
            : BUILDINGS[l.kind].name,
        );
      else if (l.kind === 'hall' && !l.owned)
        this.label(x, labelY, 'La mairie');
      else if (l.kind === 'guild')
        this.label(
          x,
          labelY,
          l.owned ? 'Guilde neutralisée' : '★ Guilde des héros',
          '#ffcf83',
        );
    }
    for (const id of selectedUnitIds(this.selection)) {
      const u = s.units.find((u) => u.id === id);
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
    // Draw combat health above all sprites and effects, at a readable size when zoomed out.
    const barWidth = Math.max(48, 32 / this.scale);
    const barHeight = Math.max(6, 4 / this.scale);
    const border = Math.max(2, 1 / this.scale);
    for (const bar of combatBars) {
      ctx.fillStyle = '#15212b';
      ctx.fillRect(
        bar.x - barWidth / 2 - border,
        bar.y - border,
        barWidth + border * 2,
        barHeight + border * 2,
      );
      ctx.fillStyle = bar.enemy ? '#ef7972' : '#9ed779';
      ctx.fillRect(
        bar.x - barWidth / 2,
        bar.y,
        barWidth * Math.max(0, Math.min(1, bar.ratio)),
        barHeight,
      );
    }
    // Resource deliveries float above their contributor and the combat overlays.
    for (const gain of s.resourceGains) {
      const progress = Math.max(
        0,
        Math.min(1, (s.elapsed - gain.at) / RESOURCE_GAIN_LIFETIME),
      );
      const iconKey =
        gain.kind === 'gold'
          ? 'ui-gold'
          : gain.kind === 'wood'
            ? 'ui-wood-icon'
            : 'ui-food';
      const size = Math.max(18, 13 / this.scale);
      const x = gain.x * CELL;
      const y = gain.y * CELL - 84 - (this.reducedMotion ? 0 : progress * 32);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
      ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const text = `+${gain.amount}`;
      const width = ctx.measureText(text).width + size + 4;
      ctx.strokeStyle = '#15212b';
      ctx.lineWidth = Math.max(3, 2 / this.scale);
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x - width / 2, y);
      ctx.fillStyle =
        gain.kind === 'gold'
          ? '#ffe59b'
          : gain.kind === 'wood'
            ? '#c9f2a0'
            : '#ffd0bd';
      ctx.fillText(text, x - width / 2, y);
      ctx.drawImage(
        this.images.get(iconKey)!,
        x + width / 2 - size,
        y - size / 2,
        size,
        size,
      );
      ctx.restore();
    }
    if (this.dragging && this.down?.mode === 'select') {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const x = Math.min(this.down.x, this.down.end.x),
        y = Math.min(this.down.y, this.down.end.y);
      const width = Math.abs(this.down.end.x - this.down.x),
        height = Math.abs(this.down.end.y - this.down.y);
      ctx.fillStyle = '#b9e99a22';
      ctx.strokeStyle = '#d0f3ac';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
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
