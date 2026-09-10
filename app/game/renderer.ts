import {
  BUILDINGS,
  CREATURES,
  STARTS,
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
  buildingArt,
  type AssetKey,
  type Animation,
} from './art';

const CELL = 32,
  SIZE = 32 * CELL,
  MARGIN = 128;
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
          .filter((k) => !k.endsWith('avatar') && k !== 'wood-panel')
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
  private makeTerrain() {
    const c = this.terrain;
    c.width = SIZE + MARGIN * 2;
    c.height = SIZE + MARGIN * 2;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(MARGIN, MARGIN);
    // Paving is street geometry; organic surfaces use the original terrain tiles.
    ctx.fillStyle = '#cab989';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 16)
      for (let x = 0; x < SIZE; x += 32) {
        ctx.fillStyle = noise(x, y) > 0.55 ? '#dec897' : '#c4ad81';
        ctx.fillRect(x + (y % 32 ? 16 : 0), y, 30, 14);
      }
    for (const y of STARTS)
      for (const x of STARTS) {
        this.grassPatch(ctx, 'grass', x * CELL, y * CELL, 4, 4);
        ctx.fillStyle = '#cab989';
        ctx.fillRect((x + 3.7) * CELL, (y + 5) * CELL, 1.6 * CELL, 3 * CELL);
      }
    for (let x = -MARGIN; x < SIZE + MARGIN; x += 64) {
      ctx.drawImage(
        this.images.get('grass-dark')!,
        64,
        64,
        64,
        64,
        x,
        -64,
        64,
        64,
      );
      ctx.drawImage(
        this.images.get('grass-dark')!,
        64,
        64,
        64,
        64,
        x,
        SIZE,
        64,
        64,
      );
    }
    for (let y = -64; y < SIZE + 64; y += 64) {
      ctx.drawImage(
        this.images.get('grass-dark')!,
        64,
        64,
        64,
        64,
        -64,
        y,
        64,
        64,
      );
      ctx.drawImage(
        this.images.get('grass-dark')!,
        64,
        64,
        64,
        64,
        SIZE,
        y,
        64,
        64,
      );
    }
  }
  private makeDecorations() {
    this.decorations = [];
    for (const y of STARTS)
      for (const x of STARTS)
        this.decorations.push(
          {
            x: (x + 1) * CELL,
            y: (y + 3) * CELL,
            key: 'tree-small',
            scale: 0.65,
          },
          { x: (x + 7) * CELL, y: (y + 2) * CELL, key: 'bush', scale: 0.5 },
        );
    for (let i = 0; i < 12; i++) {
      const p = (i * 3 - 1) * CELL;
      this.decorations.push(
        { x: p, y: -16, key: 'tree', scale: 0.85 },
        { x: -22, y: p, key: 'tree', scale: 0.8 },
        { x: SIZE + 28, y: p, key: 'tree-small', scale: 0.8 },
        { x: p, y: SIZE + 72, key: 'tree-small', scale: 0.8 },
      );
    }
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
    const grass = this.images.get('grass-dark')!,
      left = Math.floor(-this.origin.x / this.scale / 64) * 64,
      top = Math.floor(-this.origin.y / this.scale / 64) * 64;
    for (let y = top; y < (this.height - this.origin.y) / this.scale; y += 64)
      for (let x = left; x < (this.width - this.origin.x) / this.scale; x += 64)
        ctx.drawImage(grass, 64, 64, 64, 64, x, y, 64, 64);
    ctx.drawImage(this.terrain, -MARGIN, -MARGIN);
    this.hits = [];
    if (s.elapsed === 0) this.motions.clear();
    const alive = new Set(s.units.map((u) => u.id));
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
      this.fence(l, false);
      const kind = l.construction?.kind || l.kind,
        x = (l.x + 4.4) * CELL,
        y = (l.y + 5.7) * CELL;
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
            const key = buildingArt(kind, l.owned),
              a = ASSETS[key],
              frame = Math.floor(t * 10) % a.frames;
            const scale =
              kind === 'hq' || kind === 'hall'
                ? 0.78
                : kind === 'den'
                  ? 0.94
                  : kind === 'crypt'
                    ? 0.72
                    : 0.9;
            const hit = this.sprite(
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
        for (let i = 0; i < (l.kind === 'hall' ? 2 : 1); i++)
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
        draw: () => this.fence(l, true),
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
    for (const u of s.units)
      drawables.push({
        depth: u.y * CELL + 1,
        draw: () => {
          const x = u.x * CELL,
            y = u.y * CELL,
            def = CREATURES[u.kind],
            selected =
              this.selection.type === 'unit' && this.selection.id === u.id;
          const action: Animation = u.path.length
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
    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();
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
      if (!l.owned && l.hp < l.maxHp) this.bar(x, y - 10, l.hp / l.maxHp, 80);
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
