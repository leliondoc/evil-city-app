import {
  BUILDINGS,
  CREATURES,
  unitIsMounted,
  playerFoodPoint,
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
  sheepReactionFrame,
  type AssetKey,
  type Animation,
} from './art';

import { makeScenery, factionPennantPosition, type Decoration } from './scenery';
import { PixiScene } from './pixiScene';
import { drawTerrain } from './terrainRenderer';
import { mission } from './mission';
import type { GroundTile } from './terrainLayout';
import { isHaunted, thought } from './domain';
import { ParticleFeedback } from './particles';
import { hasResearch, towerOccupant } from './strategy';
import {
  selectedUnitIds,
  unitSelection,
  unitsInRectangle,
  extendUnitSelection,
  dragIntent,
  selectedFightersCanAttack,
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
  private scene = new PixiScene();
  private draw = this.scene.actors;
  private pixels = new Map<AssetKey, Uint8ClampedArray>();
  private bounds = new Map<
    AssetKey,
    { x: number; y: number; width: number; height: number }
  >();
  private markerBounds = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  private ownership = '';
  private pointer: Point | null = null;
  private decorations: Decoration[] = [];
  private shore: GroundTile[] = [];
  private hits: Hit[] = [];
  private motions = new Map<number, Motion>();
  private particles = new ParticleFeedback();
  private endedAt: number | null = null;
  private attackFeedback: {
    order: NonNullable<State['attackOrder']>;
    since: number;
  } | null = null;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private width = 0;
  private height = 0;
  private viewport = { x: 0, y: 0, width: 0, height: 0 };
  private scale = 1;
  private uiScale = 1;
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
  public interactionMode: 'inspect' | 'select' | 'command' = 'inspect';
  private touches = new Map<number, Point>();
  private pinch: { distance: number; zoom: number; world: Point } | null = null;
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
    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('contextmenu', this.contextMenu);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    void this.load();
  }
  private async load() {
    try {
      // StrictMode disposes its first view synchronously. Avoid letting that
      // abandoned view create/lose the next view's WebGL context.
      await Promise.resolve();
      if (this.disposed) return;
      if (!(await this.scene.init(this.canvas, this.width, this.height)))
        return;
      this.resize();
      await document.fonts.load('16px "Pixel Operator"');
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
                  'ui-small-ribbons',
                  'ui-gold',
                  'ui-wood-icon',
                  'ui-food',
                  'ui-back',
                  'ui-sword',
                  'ui-shield',
                  'ui-info',
                  'ui-cursor-hand',
                ].includes(k)),
          )
          .map(
            (key) =>
              new Promise<void>((resolve, reject) => {
                const im = new Image();
                im.onload = () => {
                  if (this.disposed) {
                    resolve();
                    return;
                  }
                  try {
                    this.scene.textures.add(key, im);
                    // Read sprite alpha once for precise picking; map drawing uses WebGL.
                    const c = document.createElement('canvas');
                    c.width = im.width;
                    c.height = im.height;
                    const ctx = c.getContext('2d', {
                      willReadFrequently: true,
                    })!;
                    ctx.drawImage(im, 0, 0);
                    this.pixels.set(
                      key,
                      ctx.getImageData(0, 0, c.width, c.height).data,
                    );
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
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
      if (!this.disposed) {
        this.destroy();
        this.onReady(
          'Le rendu du jeu n’a pas pu démarrer. Vérifiez que WebGL est disponible, puis rechargez la page.',
        );
      }
    }
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.uiScale =
      Number(
        getComputedStyle(this.canvas).getPropertyValue('--game-ui-scale'),
      ) || 1;
    this.width = r.width;
    this.height = r.height;
    // The desktop canvas extends under the HUD; frame the town in its clear center.
    const view = this.canvas.parentElement?.getBoundingClientRect() ?? r;
    this.viewport = {
      x: view.left - r.left,
      y: view.top - r.top,
      width: view.width,
      height: view.height,
    };
    this.scene.resize(r.width, r.height);
    this.recalculate();
  }
  private recalculate() {
    const view = this.viewport;
    this.scale =
      Math.max(
        0.1,
        Math.min(view.width / (SIZE + 96), view.height / (SIZE + 150)),
      ) * this.zoom;
    this.origin = {
      x: Math.round(view.x + (view.width - SIZE * this.scale) / 2 + this.panX),
      y: Math.round(
        view.y + (view.height - SIZE * this.scale) / 2 + this.panY + 14,
      ),
    };
  }
  public zoomBy(factor: number) {
    this.zoom = Math.max(0.75, Math.min(3.6, this.zoom * factor));
    this.recalculate();
  }
  public audioPosition(point: Point) {
    const x = this.origin.x + point.x * CELL * this.scale;
    const y = this.origin.y + point.y * CELL * this.scale;
    if (x < 0 || y < 0 || x > this.width || y > this.height) return null;
    const pan = (x / this.width - 0.5) * 2;
    const distance = Math.hypot(pan, (y / this.height - 0.5) * 2);
    return { pan: pan * 0.65, gain: Math.max(0.25, 1 - distance * 0.45) };
  }
  public resetView() {
    this.pointerCancel();
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.recalculate();
  }
  public focusLot(id: number) {
    const lot = this.getState().lots[id];
    if (!lot) return;
    this.pointerCancel();
    const view = this.viewport;
    this.panX +=
      view.x +
      view.width / 2 -
      (this.origin.x + (lot.x + 4) * CELL * this.scale);
    this.panY +=
      view.y +
      view.height * 0.38 -
      (this.origin.y + (lot.y + 4) * CELL * this.scale);
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
    if (e.pointerType === 'touch') {
      e.preventDefault();
      this.touches.set(e.pointerId, this.point(e));
      this.canvas.setPointerCapture(e.pointerId);
      if (this.touches.size === 2) {
        const [a, b] = [...this.touches.values()];
        this.down = null;
        this.dragging = false;
        this.pinch = {
          distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
          zoom: this.zoom,
          world: this.toWorld({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
        };
        return;
      }
      if (this.pinch) return;
    }
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
        this.interactionMode === 'select'
          ? 'select'
          : e.button === 1 || e.altKey || e.pointerType === 'touch'
            ? 'pan'
            : dragIntent(e.shiftKey),
      additive: e.shiftKey || this.interactionMode === 'select',
      end: p,
    };
    this.dragging = false;
    this.canvas.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    const p = this.point(e);
    this.pointer = p;
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, p);
    if (this.pinch) {
      if (this.touches.size === 2) {
        const [a, b] = [...this.touches.values()];
        const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.zoom = Math.max(
          0.75,
          Math.min(
            3.6,
            (this.pinch.zoom * Math.hypot(b.x - a.x, b.y - a.y)) /
              this.pinch.distance,
          ),
        );
        this.recalculate();
        this.panX +=
          midpoint.x - (this.origin.x + this.pinch.world.x * CELL * this.scale);
        this.panY +=
          midpoint.y - (this.origin.y + this.pinch.world.y * CELL * this.scale);
        this.recalculate();
      }
      return;
    }
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
    this.touches.delete(e.pointerId);
    if (this.pinch) {
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId);
      if (!this.touches.size) this.pinch = null;
      return;
    }
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
      let hit = this.hit(p);
      if (
        e.pointerType === 'touch' &&
        hit?.type !== 'unit' &&
        hit?.type !== 'enemy'
      ) {
        // Small characters remain tappable when the whole district fits on a phone.
        const state = this.getState();
        const nearby = [
          ...state.units
            .filter((u) => u.hp > 0)
            .map((u) => ({ actor: u, type: 'unit' as const })),
          ...state.enemies
            .filter((u) => u.hp > 0)
            .map((u) => ({ actor: u, type: 'enemy' as const })),
        ]
          .map(({ actor, type }) => ({
            id: actor.id,
            type,
            distance: Math.hypot(
              p.x - (this.origin.x + actor.x * CELL * this.scale),
              p.y - (this.origin.y + (actor.y * CELL - 20) * this.scale),
            ),
          }))
          .filter((u) => u.distance <= 16)
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearby) hit = { type: nearby.type, id: nearby.id };
      }
      if (
        this.interactionMode === 'command' ||
        (this.interactionMode === 'inspect' &&
          !this.down.additive &&
          !this.buildKind &&
          selectedFightersCanAttack(this.getState(), this.selection, hit))
      ) {
        this.onCommand(this.toWorld(p), hit);
      } else if (this.down.additive && hit?.type === 'unit')
        this.onSelect(extendUnitSelection(this.selection, [hit.id], true));
      else if (
        this.down.additive &&
        (!hit || this.interactionMode === 'select')
      ) {
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
    for (const id of this.touches.keys())
      if (this.canvas.hasPointerCapture(id))
        this.canvas.releasePointerCapture(id);
    this.touches.clear();
    this.pinch = null;
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
            : this.buildKind !== null
              ? 'hammer'
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
  private pointerLeave = () => {
    this.pointer = null;
    this.hover = null;
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.down) return;
    this.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
  };

  private makeTerrain() {
    const state = this.getState();
    this.ownership = state.lots.map((l) => Number(l.owned)).join('');
    this.scene.setTerrain(
      (layer) => {
        this.shore = drawTerrain(layer, state);
      },
      SIZE,
      MARGIN,
    );
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
    rotation = 0,
  ): Hit {
    const a = ASSETS[key],
      source = spriteFrame(key, frame),
      w = a.frameWidth * scale,
      h = source.height * scale,
      left = Math.round(x - w / 2),
      top = Math.round(y - h * a.anchor);
    const node = this.draw.image(
      key,
      source.x,
      source.y,
      source.width,
      source.height,
      left,
      top,
      w,
      h,
      alpha,
      flip,
    );
    if (rotation) {
      node.position.set(x, y);
      node.pivot.set(source.width / 2, source.height * a.anchor);
      node.rotation = rotation;
    }
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
      top: ground - bounds.height * scale,
      scale,
    };
  }
  private approach(lot: Lot, doorX: number, ground: number) {
    const center = (lot.x + 4) * CELL;
    if (lot.id === 0 && !lot.owned) {
      this.draw.image(
        'terrain-2',
        128,
        256,
        128,
        128,
        center - 64,
        (lot.y + 5) * CELL - 40,
        128,
        128,
      );
      return;
    }
    const bend = (lot.y + 6.3) * CELL;
    this.draw.line(
      [
        { x: doorX, y: ground - 24 },
        { x: doorX, y: bend },
        { x: center, y: bend },
        { x: center, y: (lot.y + 8) * CELL },
      ],
      '#c0aa7c',
      40,
    );
  }
  private selectionCorners(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha = 1,
  ) {
    const corner = Math.min(
      width / 2,
      height / 2,
      Math.max(12, (10 * this.uiScale) / this.scale),
    );
    for (const [right, bottom] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      this.draw.image(
        'ui-selection-corners',
        right * 96,
        bottom * 96,
        32,
        32,
        x + (right ? width - corner : 0),
        y + (bottom ? height - corner : 0),
        corner,
        corner,
        alpha,
      );
    }
  }
  private visibleBounds(hit: Hit) {
    const source = spriteFrame(hit.key, hit.frame);
    const cacheKey = `${hit.key}:${hit.frame}`;
    let bounds = this.markerBounds.get(cacheKey);
    if (!bounds) {
      const pixels = this.pixels.get(hit.key)!;
      let left = source.width,
        top = source.height,
        right = -1,
        bottom = -1;
      for (let y = 0; y < source.height; y++)
        for (let x = 0; x < source.width; x++) {
          if (
            pixels[
              ((source.y + y) * ASSETS[hit.key].width + source.x + x) * 4 + 3
            ] > 40
          ) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      if (right < left) return;
      bounds = {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      };
      this.markerBounds.set(cacheKey, bounds);
    }
    const scale = hit.w / source.width;
    const left = hit.flip ? source.width - bounds.x - bounds.width : bounds.x;
    return {
      x: hit.x + left * scale,
      y: hit.y + bounds.y * scale,
      width: bounds.width * scale,
      height: bounds.height * scale,
    };
  }
  private selectionHit(hit: Hit) {
    const bounds = this.visibleBounds(hit);
    if (!bounds) return;
    const padding = (4 * this.uiScale) / this.scale;
    this.selectionCorners(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
    );
  }
  private bar(x: number, y: number, ratio: number, width = 60) {
    this.draw.rect(x - width / 2 - 2, y - 2, width + 4, 10, '#293333');
    this.draw.rect(
      x - width / 2,
      y,
      width * Math.max(0, Math.min(1, ratio)),
      6,
      ratio < 0.3 ? '#ed9472' : '#bed27c',
    );
  }
  private fence(l: Lot, front: boolean) {
    const x = l.x * CELL,
      y = l.y * CELL;
    if (!front) {
      for (let i = 0; i < 4; i++)
        this.draw.image(
          'fence',
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
        this.draw.image('fence', 0, 64, 64, 64, x, y + i * 64, 64, 64);
    } else {
      const site = this.getState().sites.find(
        (site) => site.home === l.id && site.x >= l.x && site.x < l.x + 8,
      );
      for (let i = 1; i < 3; i++) {
        // Leave the supply yard accessible instead of drawing a fence over its worker and resource.
        if (site && site.y - l.y >= i * 2 && site.y - l.y < (i + 1) * 2)
          continue;
        this.draw.image('fence', 192, 64, 64, 64, x + 192, y + i * 64, 64, 64);
      }
      // Retain the two gateposts and leave a centered 40 px opening between them.
      for (const offset of [0, 148]) {
        this.draw.image(
          'fence',
          offset,
          128,
          108,
          64,
          x + offset,
          y + 192,
          108,
          64,
        );
      }
    }
  }
  private label(x: number, y: number, text: string, color = '#eee4ce') {
    const size = (18 * this.uiScale) / this.scale;
    x =
      (Math.round(this.origin.x + x * this.scale) - this.origin.x) / this.scale;
    y =
      (Math.round(this.origin.y + y * this.scale) - this.origin.y) / this.scale;
    this.draw.text(text, x, y, size, color, {
      stroke: 2.5 / this.scale,
      resolution: Math.min(window.devicePixelRatio || 1, 2) * this.scale,
    });
  }
  private factionPennant(x: number, y: number, owned: boolean) {
    // One continuous piece of cloth, with the emblem centered inside its border.
    this.draw.rect(x - 2, y - 51, 4, 51, '#403b36');
    this.draw.rect(x - 1, y - 49, 1, 47, '#97856b');
    const cloth = [
      { x: x + 1, y: y - 47 },
      { x: x + 29, y: y - 47 },
      { x: x + 29, y: y - (owned ? 14 : 22) },
      { x: x + 15, y: y - (owned ? 22 : 12) },
      { x: x + 1, y: y - (owned ? 14 : 22) },
    ];
    this.draw.polygon(cloth, owned ? '#74518d' : '#497c9c', '#302e3b', 1.5);
    this.draw.line(
      [
        { x: x + 3, y: y - 44 },
        { x: x + 27, y: y - 44 },
      ],
      owned ? '#b997cf' : '#a0c8db',
      1,
    );
    if (owned) {
      // Crop only the skull, leaving the decorative stake out of the emblem.
      this.draw.image('skull-spike', 18, 24, 30, 40, x + 7.5, y - 42, 15, 20);
    } else {
      this.draw.whole('ui-shield', x + 5, y - 42, 20, 20);
    }
  }
  private render = () => {
    if (this.disposed) return;
    this.updateCursor();
    const s = this.getState(),
      t = this.reducedMotion ? 0 : s.elapsed;
    const guidance =
      this.buildKind || this.interactionMode === 'command'
        ? undefined
        : mission(s).hint.marker;
    if (this.ownership !== s.lots.map((l) => Number(l.owned)).join(''))
      this.makeTerrain();
    this.scene.begin(this.origin, this.scale, this.width, this.height);
    for (const tile of this.shore) {
      const frame = Math.floor(t * 10 + noise(tile.x, tile.y) * 16) % 16;
      this.scene.shore.image(
        'foam',
        frame * 192,
        0,
        192,
        192,
        tile.x - 64,
        tile.y - 64,
        192,
        192,
      );
    }
    this.hits = [];
    if (s.elapsed === 0) this.motions.clear();
    const alive = new Set([...s.units, ...s.enemies].map((u) => u.id));
    for (const id of this.motions.keys())
      if (!alive.has(id)) this.motions.delete(id);
    const drawables: { depth: number; draw: () => void }[] = [];
    const buildingBars = new Map<number, Point>();
    const combatBars: {
      x: number;
      y: number;
      ratio: number;
      enemy: boolean;
      name?: string;
    }[] = [];
    for (const tower of s.strategy.towers) {
      drawables.push({
        depth: tower.artY * CELL,
        draw: () => {
          const hit = this.sprite(
            tower.owned ? 'tower-purple' : 'tower-blue',
            tower.artX * CELL,
            tower.artY * CELL,
            0.5,
          );
          hit.selection = { type: 'tower', id: tower.id };
          this.hits.push(hit);
          const occupant = towerOccupant(s, tower);
          const barY = hit.y - 8 / this.scale;
          const activityY = barY - 2 - (12 * this.uiScale) / this.scale;
          if (
            (this.selection.type === 'tower' &&
              this.selection.id === tower.id) ||
            tower.progress > 0 ||
            tower.reclaim > 0
          ) {
            this.label(
              tower.artX * CELL,
              activityY - (occupant ? (22 * this.uiScale) / this.scale : 0),
              tower.name,
            );
            if (tower.progress || tower.reclaim)
              this.bar(
                tower.artX * CELL,
                barY,
                (tower.progress || tower.reclaim) / 8,
                60,
              );
          }
          if (tower.lureUntil > s.elapsed)
            this.sprite(
              'haunt-wisp',
              tower.artX * CELL,
              tower.artY * CELL - 70,
              0.65,
              Math.floor(t * 10) % ASSETS['haunt-wisp'].frames,
            );
          if (occupant)
            this.label(
              tower.artX * CELL,
              activityY,
              occupant.kind === 'goblin'
                ? 'Racket'
                : occupant.kind === 'skeleton'
                  ? 'Guet'
                  : 'Leurre',
              '#ffe2b0',
            );
        },
      });
    }
    for (const l of s.lots) {
      const kind = l.construction?.kind || l.kind,
        x = (l.x + 4) * CELL,
        y = (l.y + 6.2) * CELL - (l.id === 0 && !l.owned ? 28 : 0),
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
      if (placement)
        buildingBars.set(l.id, { x, y: placement.top - 10 - 8 / this.scale });
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
            this.draw.outline(
              (l.x + 2) * CELL,
              (l.y + 2) * CELL,
              4 * CELL,
              3.5 * CELL,
              l.owned ? '#71538c' : '#657a66',
              3,
              [10, 10],
            );
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
            if (
              !this.reducedMotion &&
              !l.construction &&
              l.hp > 0 &&
              l.hp < l.maxHp * 0.4
            )
              for (const side of [-1, 1])
                this.sprite(
                  'fx-fire',
                  x + side * 38,
                  y - 35,
                  1,
                  Math.floor(t * 10 + l.id + side * 2 + 8) %
                    ASSETS['fx-fire'].frames,
                );
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
      const pennant = factionPennantPosition(l);
      if (kind !== 'empty')
        drawables.push({
          depth: pennant.y,
          draw: () =>
            this.factionPennant(
              pennant.x,
              pennant.y,
              l.owned,
            ),
        });
      if (
        !l.owned &&
        l.kind !== 'empty' &&
        !(l.kind === 'guild' && l.garrisonReleased)
      )
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
              if (selected)
                this.draw.ellipse(
                  heroX,
                  gy,
                  28,
                  12,
                  '#ff5b5b',
                  2.5 / this.scale,
                );
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
                combatBars.push({
                  x: heroX,
                  y: gy - 74,
                  ratio: 1,
                  enemy: true,
                  name: HEROES[role].short,
                });
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
          const active = site.hp > 0;
          const reaction = this.reducedMotion
            ? null
            : sheepReactionFrame(site, s.elapsed);
          const key =
            reaction !== null
              ? 'sheep-hit'
              : (SUPPLIES[site.kind].art as AssetKey);
          const hit = this.sprite(
            key,
            site.x * CELL,
            site.y * CELL,
            site.kind === 'wood' ? 0.65 : site.kind === 'gold' ? 0.75 : 0.8,
            reaction ?? (active ? Math.floor(t * 10) % ASSETS[key].frames : 0),
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
    for (const site of s.sites.filter((site) => site.kind === 'food')) {
      const pig = playerFoodPoint(site);
      drawables.push({
        depth: pig.y * CELL,
        draw: () => {
          const hit = this.sprite(
            'pig-idle',
            pig.x * CELL,
            pig.y * CELL,
            0.8,
            this.reducedMotion
              ? 0
              : Math.floor(t * 10) % ASSETS['pig-idle'].frames,
            site.hp > 0 ? 1 : 0.4,
          );
          hit.selection = { type: 'resource', id: site.id };
          this.hits.push(hit);
        },
      });
    }
    for (const worker of s.workers)
      drawables.push({
        depth: worker.y * CELL + 1,
        draw: () => {
          const key = workerArt(worker, s.sites[worker.site]);
          if (
            this.selection.type === 'worker' &&
            this.selection.id === worker.id
          )
            this.draw.ellipse(
              worker.x * CELL,
              worker.y * CELL,
              25,
              12,
              '#ff5b5b',
              2.5 / this.scale,
            );
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
          if (worker.recovery?.returning)
            this.sprite(
              'unit-death',
              worker.x * CELL + 20,
              worker.y * CELL - 8,
              0.5,
              10,
            );
          if (
            (this.selection.type === 'worker' &&
              this.selection.id === worker.id) ||
            worker.hp < worker.maxHp
          )
            combatBars.push({
              x: worker.x * CELL,
              y: worker.y * CELL - 52,
              ratio: worker.hp / worker.maxHp,
              enemy: false,
              name:
                this.selection.type === 'worker' &&
                this.selection.id === worker.id
                  ? SUPPLIES[s.sites[worker.site].kind].worker
                  : undefined,
            });
        },
      });
    for (const u of s.units)
      drawables.push({
        depth: u.y * CELL + 1,
        draw: () => {
          if (u.kind === 'goblin' && !u.path.length && !u.fighting) {
            const lot = u.target === null ? undefined : s.lots[u.target];
            const insideHome =
              (u.task === 'eat' || u.task === 'rest') &&
              lot?.owned &&
              !lot.construction &&
              lot.kind === (u.task === 'eat' ? 'canteen' : 'den') &&
              Math.hypot(u.x - entrance(lot).x, u.y - entrance(lot).y) < 1;
            const insideTower =
              u.task === 'tower' &&
              s.strategy.towers.some(
                (tower) => tower.owned && towerOccupant(s, tower)?.id === u.id,
              );
            // Hide the whole actor indoors, including selection, health and cargo.
            // A new order or finished activity immediately makes it visible again.
            if (insideHome || insideTower) return;
          }
          const x = u.x * CELL,
            y = u.y * CELL,
            def = CREATURES[u.kind],
            selected = selectedUnitIds(this.selection).includes(u.id);
          const harvesting =
            u.task === 'forage' &&
            u.gathering?.phase === 'harvest' &&
            !u.path.length;
          const action: Animation =
            u.fighting || harvesting
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
              animationSequence(u.kind, action, unitIsMounted(s, u)),
              t - motion.since,
            ),
            scale =
              u.kind === 'troll' ? 0.52 : u.kind === 'minotaur' ? 0.62 : 0.72;
          if (selected)
            this.draw.ellipse(x, y, 25, 12, '#fff1af', 2 / this.scale);
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
          const barY =
            y -
            (u.kind === 'spear-goblin'
              ? 96
              : u.kind === 'troll' || u.kind === 'minotaur'
                ? 84
                : 58);
          if (
            bubble &&
            u.task !== 'duel' &&
            (selected ||
              (this.hover?.type === 'unit' && this.hover.id === u.id) ||
              ['Faim', 'Bourse', 'Maléfice', 'Hantise'].includes(bubble))
          )
            this.label(
              x,
              selected
                ? Math.min(y - 102, barY - (38 * this.uiScale) / this.scale)
                : y - 102,
              bubble,
              '#d3efdd',
            );
          if (u.task === 'bribe') this.sprite('ui-gold', x + 22, y - 22, 0.5);
          if (u.task === 'deliver-loot')
            this.sprite('ui-gold', x + 22, y - 22, 0.5);
          if (
            u.fighting &&
            hasResearch(s, 'embers') &&
            !['alchemist', 'specter'].includes(u.kind) &&
            !this.reducedMotion
          )
            this.sprite(
              'fx-fire',
              x + u.facing * 20,
              y - 28,
              0.6,
              Math.floor(t * 10) % ASSETS['fx-fire'].frames,
            );
          if (u.task === 'deliver') {
            this.sprite('unit-death', x + 20, y - 8, 0.55, 10);
          }
          if ((u.gathering?.cargo ?? 0) > 0)
            this.sprite(
              u.gathering!.kind === 'wood'
                ? 'wood'
                : u.gathering!.kind === 'gold'
                  ? 'ui-gold'
                  : 'ui-food',
              x + 20,
              y - 4,
              0.45,
            );
          if (
            u.task === 'build' &&
            u.target !== null &&
            atEntrance(u, s.lots[u.target]) &&
            s.lots[u.target].construction &&
            !this.reducedMotion
          ) {
            const frame = Math.floor(t * 10 + u.id * 3) % 16;
            if (frame < ASSETS['fx-dust-small'].frames)
              this.sprite(
                'fx-dust-small',
                x + u.facing * 20,
                y - 18,
                0.65,
                frame,
              );
          }
          if (selected || u.hp < def.hp || (action === 'attack' && !harvesting))
            combatBars.push({
              x,
              y: barY,
              ratio: u.hp / def.hp,
              enemy: false,
              name: selected ? def.name : undefined,
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
          if (selected)
            this.draw.ellipse(
              x,
              y,
              e.kind === 'hero' ? 28 : 21,
              11,
              selected ? '#ff5b5b' : e.kind === 'hero' ? '#ffc85c' : '#ed886f',
              (selected ? 2.5 : 2) / this.scale,
            );
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
          if (
            selected ||
            e.hp < e.maxHp ||
            e.fighting ||
            (this.hover?.type === 'enemy' && this.hover.id === e.id)
          )
            combatBars.push({
              x,
              y: y - (e.kind === 'hero' ? 74 : 56),
              ratio: e.hp / e.maxHp,
              enemy: true,
              name: selected
                ? `${e.kind === 'hero' ? HEROES[e.role].short : ENEMIES[e.kind].name} · ${e.level}`
                : undefined,
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
          if ((e.burningUntil ?? 0) > s.elapsed && !this.reducedMotion)
            this.sprite(
              'fx-fire',
              x,
              y - 18,
              0.65,
              Math.floor(t * 10) % ASSETS['fx-fire'].frames,
            );
          if ((e.solventUntil ?? 0) > s.elapsed)
            this.label(
              x,
              y - 86 - (selected ? (28 * this.uiScale) / this.scale : 0),
              'Vulnérable au feu',
              '#e6d2a6',
            );
          if ((e.comboAt ?? -10) + 0.8 > s.elapsed)
            this.label(
              x,
              y - 105 - (selected ? (28 * this.uiScale) / this.scale : 0),
              'COMBO ×2',
              '#ffb875',
            );
          if ((e.resurrectionProgress ?? 0) > 0) {
            this.sprite(
              'hero-heal',
              x,
              y,
              0.7,
              Math.floor(t * 10) % ASSETS['hero-heal'].frames,
            );
            this.label(
              x,
              y - 95 - (selected ? (28 * this.uiScale) / this.scale : 0),
              `Résurrection · ${Math.ceil(10 - e.resurrectionProgress!)} s`,
            );
          }
        },
      });
    }
    for (const p of s.projectiles)
      drawables.push({
        depth: p.y * CELL + 1,
        draw: () => {
          this.sprite(
            'hero-arrow',
            p.x * CELL,
            p.y * CELL - 20,
            0.7,
            0,
            1,
            false,
            p.angle,
          );
        },
      });
    // Remains lie on the ground, underneath living actors and scenery.
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
    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();
    for (const r of s.domain.resurrections)
      if (!this.reducedMotion)
        this.sprite(
          'hero-heal',
          r.x * CELL,
          r.y * CELL,
          0.85,
          Math.floor((s.elapsed - r.at) * 10) % ASSETS['hero-heal'].frames,
        );
    if (s.won || s.lost) this.endedAt ??= performance.now();
    else this.endedAt = null;
    // Let the final impact finish after defeat, when simulation time stops.
    const particleTime =
      s.elapsed +
      (this.endedAt === null
        ? 0
        : Math.min(1.1, (performance.now() - this.endedAt) / 1000));
    for (const particle of this.particles.update(
      s,
      this.reducedMotion,
      particleTime,
    )) {
      const frame = Math.min(
        ASSETS[particle.key].frames - 1,
        Math.floor((particleTime - particle.at) / FRAME_SECONDS),
      );
      this.sprite(
        particle.key,
        particle.x * CELL,
        particle.y * CELL,
        particle.scale,
        frame,
      );
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
        e.y * CELL -
          95 -
          (this.selection.type === 'enemy' && this.selection.id === e.id
            ? (28 * this.uiScale) / this.scale
            : 0),
        e.fighting ? 'Duel' : 'Chasse au spectre',
        '#fff0bb',
      );
    for (const w of s.workers.filter((w) => w.recovery))
      this.label(
        w.x * CELL,
        w.y * CELL -
          72 -
          (this.selection.type === 'worker' && this.selection.id === w.id
            ? (28 * this.uiScale) / this.scale
            : 0),
        w.recovery?.returning ? 'Sépulture' : 'Secours',
        '#d2e4f5',
      );
    // Site labels stay in front of scenery, like parcel labels.
    for (const site of s.sites) {
      let labelY = site.y * CELL + 36;
      if (site.kind === 'food') {
        // The pig stands below the sheep: keep the name below both animals.
        for (const hit of this.hits) {
          if (hit.selection.type !== 'resource' || hit.selection.id !== site.id)
            continue;
          const bounds = this.visibleBounds(hit);
          if (!bounds) continue;
          labelY = Math.max(
            labelY,
            bounds.y + bounds.height + (20 * this.uiScale) / this.scale,
          );
        }
      }
      this.label(
        site.x * CELL,
        labelY,
        `${supplyActive(s, site) ? '' : '× '}${SUPPLIES[site.kind].label}`,
        supplyActive(s, site) ? '#ffe0a3' : '#c5c5b5',
      );
    }
    for (const l of s.lots) {
      const x = (l.x + 4) * CELL;
      const bar = buildingBars.get(l.id);
      // Anchor names to the visible roof, above both health and construction bars.
      const stackedBar =
        l.construction && l.hp < l.maxHp ? 14 + 3 / this.scale : 0;
      const labelY = bar
        ? bar.y - stackedBar - 2 - (12 * this.uiScale) / this.scale
        : (l.y + 8) * CELL + 16;
      if (bar) {
        if (l.hp < l.maxHp) this.bar(bar.x, bar.y, l.hp / l.maxHp, 80);
        if (l.construction)
          this.bar(bar.x, bar.y - stackedBar, l.construction.progress, 90);
      }
      const hovered = this.hover?.type === 'lot' && this.hover.id === l.id;
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
      else if (hovered && guidance?.lotId !== l.id)
        this.label(x, labelY, BUILDINGS[l.kind].name);
    }
    if (guidance && guidance.kind !== 'recruit') {
      const lot = s.lots[guidance.lotId];
      const bar = buildingBars.get(lot.id);
      const ui = this.uiScale / this.scale;
      const x = (lot.x + 4) * CELL;
      // Float above the roof and selected name; only one teaching marker is shown at a time.
      const y = (bar?.y ?? (lot.y + 3.5) * CELL) - 48 * ui;
      const icon: AssetKey =
        guidance.kind === 'attack'
          ? 'ui-sword'
          : guidance.kind === 'build'
            ? 'ui-cursor-hand'
            : 'ui-info';
      const marker = this.sprite(icon, x, y, 0.55 * ui);
      marker.selection = { type: 'lot', id: lot.id };
      this.hits.push(marker);
      this.label(x, y + 18 * ui, guidance.label, '#ffe3a1');
    }
    for (const id of selectedUnitIds(this.selection)) {
      const u = s.units.find((u) => u.id === id);
      if (u?.path.length) {
        this.draw.line(
          [
            { x: u.x * CELL, y: u.y * CELL },
            ...u.path.map((p) => ({ x: p.x * CELL, y: p.y * CELL })),
          ],
          '#ffefb5',
          2 / this.scale,
          [6, 9],
        );
      }
    }
    // Cloud silhouettes use the original pack and drift with simulation time.
    for (let i = 0; i < 3; i++) {
      const x = ((t * (7 + i * 2) + i * 640) % 2050) - 480;
      const y = [-110, 170, 980][i];
      this.sprite(`cloud-${i + 1}` as AssetKey, x, y, 0.95, 0, 0.32);
    }
    // Parcel corners stay above trees, fences, buildings and clouds.
    for (const lot of s.lots) {
      const selected =
        this.selection.type === 'lot' && this.selection.id === lot.id;
      const hovered = this.hover?.type === 'lot' && this.hover.id === lot.id;
      if (selected || hovered) {
        const inset = 24;
        this.selectionCorners(
          lot.x * CELL + inset,
          lot.y * CELL + inset,
          8 * CELL - inset * 2,
          8 * CELL - inset * 2,
          selected ? 1 : 0.45,
        );
      }
    }
    // Characters use ground circles; only resources and towers use pack corners.
    for (const hit of this.hits) {
      if (
        hit.selection.type === 'lot' ||
        hit.selection.type === 'unit' ||
        hit.selection.type === 'enemy' ||
        hit.selection.type === 'worker' ||
        hit.selection.type === 'guildHero' ||
        hit.selection.type === 'none' ||
        hit.selection.type === 'units'
      )
        continue;
      const selected =
        this.selection.type === hit.selection.type &&
        'id' in this.selection &&
        this.selection.id === hit.selection.id;
      if (selected) this.selectionHit(hit);
    }
    // Draw combat health above all sprites and effects, at a readable size when zoomed out.
    const barWidth = Math.max(48, (32 * this.uiScale) / this.scale);
    const barHeight = Math.max(6, (4 * this.uiScale) / this.scale);
    const border = Math.max(2, 1 / this.scale);
    for (const bar of combatBars) {
      this.draw.rect(
        bar.x - barWidth / 2 - border,
        bar.y - border,
        barWidth + border * 2,
        barHeight + border * 2,
        '#15212b',
      );
      this.draw.rect(
        bar.x - barWidth / 2,
        bar.y,
        barWidth * Math.max(0, Math.min(1, bar.ratio)),
        barHeight,
        bar.enemy ? '#ef7972' : '#9ed779',
      );
      if (bar.name)
        this.label(
          bar.x,
          bar.y - border - (12 * this.uiScale) / this.scale,
          bar.name,
          bar.enemy ? '#ffcf83' : '#eee4ce',
        );
    }
    // Confirm accepted attacks with the original orange Tiny Swords arrow.
    // Wall time makes the cue finish even when an order is issued while paused.
    if (s.attackOrder && this.attackFeedback?.order !== s.attackOrder)
      this.attackFeedback = { order: s.attackOrder, since: performance.now() };
    if (this.attackFeedback && !s.won && !s.lost) {
      const age = (performance.now() - this.attackFeedback.since) / 1000;
      const { target } = this.attackFeedback.order;
      const ui = this.uiScale / this.scale;
      const unitTarget = target.type === 'enemy' || target.type === 'worker';
      let anchor: Point | undefined;
      if (target.type === 'lot') {
        const lot = s.lots.find((lot) => lot.id === target.id);
        if (lot && !lot.owned && lot.hp > 0 && lot.kind !== 'empty') {
          const hit = this.hits.find(
            (hit) =>
              hit.selection.type === 'lot' && hit.selection.id === lot.id,
          );
          const bounds = hit && this.visibleBounds(hit);
          if (bounds)
            anchor = {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height * 0.3,
            };
        }
      } else if (target.type === 'resource') {
        const site = s.sites.find((site) => site.id === target.id);
        if (site && supplyActive(s, site))
          anchor = { x: site.x * CELL, y: site.y * CELL - 44 };
      } else {
        const actors = target.type === 'enemy' ? s.enemies : s.workers;
        const actor = actors.find(
          (actor) => actor.id === target.id && actor.hp > 0,
        );
        if (actor) {
          const hit = this.hits.find(
            (hit) =>
              hit.selection.type === target.type &&
              'id' in hit.selection &&
              hit.selection.id === target.id,
          );
          const bounds = hit && this.visibleBounds(hit);
          if (bounds) {
            // Aim at the visible unit, close to its health bar, regardless of sprite size.
            const barY =
              actor.y * CELL -
              (target.type === 'worker'
                ? 52
                : 'kind' in actor && actor.kind === 'hero'
                  ? 74
                  : 56);
            anchor = {
              x: actor.x * CELL,
              y: Math.min(bounds.y, barY - Math.max(2, 1 / this.scale)),
            };
          }
        }
      }
      if (anchor && age < 1.8) {
        const bounce = this.reducedMotion ? 0 : Math.sin(age * Math.PI * 4) * 3;
        const alpha = Math.min(1, (1.8 - age) / 0.3);
        if (unitTarget) {
          // The source points left. Pin its tip above the target and rotate it down.
          const arrow = this.draw.whole(
            'ui-back',
            anchor.x,
            anchor.y - (2 + Math.abs(bounce) * 0.5) * ui,
            28 * ui,
            28 * ui,
            alpha,
          );
          arrow.pivot.set(4, 32);
          arrow.rotation = -Math.PI / 2;
        } else if (target.type === 'lot') {
          // Aim down onto the building itself instead of left above its HP bar.
          const arrow = this.draw.whole(
            'ui-back',
            anchor.x,
            anchor.y - Math.abs(bounce) * (2 / 3) * ui,
            24 * ui,
            24 * ui,
            alpha,
          );
          arrow.pivot.set(6, 32);
          arrow.rotation = -Math.PI / 2;
        } else
          this.sprite(
            'ui-back',
            anchor.x + 34 * ui,
            anchor.y - (22 + bounce) * ui,
            0.85 * ui,
            0,
            alpha,
          );
      }
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
      const size = (16 * this.uiScale) / this.scale;
      const x = gain.x * CELL;
      const y = gain.y * CELL - 84 - (this.reducedMotion ? 0 : progress * 32);
      const alpha = Math.min(1, (1 - progress) * 3);
      const text = this.draw.text(
        `+${gain.amount}`,
        0,
        y,
        size,
        gain.kind === 'gold'
          ? '#ffe59b'
          : gain.kind === 'wood'
            ? '#c9f2a0'
            : '#ffd0bd',
        {
          anchor: 0,
          alpha,
          stroke: 1 / this.scale,
          resolution: Math.min(window.devicePixelRatio || 1, 2) * this.scale,
        },
      );
      const width = text.width + size + 4;
      text.x = x - width / 2;
      this.draw.whole(
        iconKey,
        x + width / 2 - size,
        y - size / 2,
        size,
        size,
        alpha,
      );
    }
    if (this.dragging && this.down?.mode === 'select') {
      const x = Math.min(this.down.x, this.down.end.x),
        y = Math.min(this.down.y, this.down.end.y);
      const width = Math.abs(this.down.end.x - this.down.x),
        height = Math.abs(this.down.end.y - this.down.y);
      this.scene.overlay.rect(x, y, width, height, '#b9e99a22');
      this.scene.overlay.outline(x, y, width, height, '#d0f3ac', 1.5);
    }
    if (this.buildKind && this.pointer) {
      const point = this.toWorld(this.pointer);
      const lot =
        this.hover?.type === 'lot' ? s.lots[this.hover.id] : undefined;
      const key = buildingArt(this.buildKind, true);
      const p = this.buildingPlacement(
        key,
        (lot ? lot.x + 4 : point.x) * CELL,
        (lot ? lot.y + 6.2 : point.y) * CELL,
        this.buildKind === 'den'
          ? 0.94
          : this.buildKind === 'crypt'
            ? 0.72
            : 0.9,
      );
      this.sprite(
        key,
        p.x,
        p.y,
        p.scale,
        0,
        lot && !buildReason(s, lot.id, this.buildKind) ? 0.6 : 0.35,
      );
    }
    this.scene.render();
    this.frame = requestAnimationFrame(this.render);
  };
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.destroy();
    this.pixels.clear();
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerleave', this.pointerLeave);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('contextmenu', this.contextMenu);
    this.canvas.removeEventListener('wheel', this.wheel);
  }
}
