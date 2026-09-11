import {
  Container,
  Graphics,
  ImageSource,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TilingSprite,
  WebGLRenderer,
  type TextStyleOptions,
} from 'pixi.js';
import type { AssetKey } from './art';
import type { Point } from './engine';

/** Sources belong to one game view, so restarting never invalidates another view. */
export class GameTextures {
  private sources = new Map<AssetKey, ImageSource>();

  add(key: AssetKey, image: HTMLImageElement | HTMLCanvasElement) {
    this.sources.set(
      key,
      new ImageSource({ resource: image, scaleMode: 'nearest' }),
    );
  }

  get(key: AssetKey) {
    const source = this.sources.get(key);
    if (!source) throw new Error(`Missing game texture: ${key}`);
    return source;
  }

  destroy() {
    for (const source of this.sources.values()) source.destroy();
    this.sources.clear();
  }
}

type SpriteSlot = { node: Sprite; texture: Texture };
type ShapeSlot = { node: Graphics; signature: string };
type TextSlot = { node: Text; signature: string };

/** Retained Pixi objects, reused in painter order without rebuilding the scene every frame. */
export class DrawLayer {
  readonly container = new Container({ eventMode: 'none' });
  private sprites: SpriteSlot[] = [];
  private shapes: ShapeSlot[] = [];
  private texts: TextSlot[] = [];
  private spriteIndex = 0;
  private shapeIndex = 0;
  private textIndex = 0;
  private order = 0;

  constructor(private textures: GameTextures) {}

  begin() {
    this.spriteIndex = this.shapeIndex = this.textIndex = this.order = 0;
  }

  private place<T extends Container>(node: T): T {
    node.visible = true;
    if (node.parent !== this.container)
      this.container.addChildAt(node, this.order);
    else if (this.container.children[this.order] !== node)
      this.container.setChildIndex(node, this.order);
    this.order++;
    return node;
  }

  end() {
    for (let i = this.order; i < this.container.children.length; i++)
      this.container.children[i].visible = false;
  }

  image(
    key: AssetKey,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha = 1,
    flip = false,
  ) {
    const source = this.textures.get(key);
    let slot = this.sprites[this.spriteIndex++];
    if (!slot) {
      const texture = new Texture({
        source,
        frame: new Rectangle(sx, sy, sw, sh),
        dynamic: true,
      });
      slot = { node: new Sprite(texture), texture };
      this.sprites.push(slot);
    }
    const { node, texture } = slot;
    const frame = texture.frame;
    if (
      texture.source !== source ||
      frame.x !== sx ||
      frame.y !== sy ||
      frame.width !== sw ||
      frame.height !== sh
    ) {
      if (texture.source !== source) texture.source = source;
      frame.x = sx;
      frame.y = sy;
      frame.width = sw;
      frame.height = sh;
      texture.update();
    }
    node.position.set(flip ? x + width : x, y);
    node.pivot.set(0, 0);
    node.rotation = 0;
    node.scale.set(((flip ? -1 : 1) * width) / sw, height / sh);
    node.alpha = alpha;
    return this.place(node);
  }

  whole(
    key: AssetKey,
    x: number,
    y: number,
    width?: number,
    height?: number,
    alpha = 1,
  ) {
    const source = this.textures.get(key);
    return this.image(
      key,
      0,
      0,
      source.width,
      source.height,
      x,
      y,
      width ?? source.width,
      height ?? source.height,
      alpha,
    );
  }

  private shape(signature: string, draw: (g: Graphics) => void, x = 0, y = 0) {
    let slot = this.shapes[this.shapeIndex++];
    if (!slot) {
      slot = { node: new Graphics(), signature: '' };
      this.shapes.push(slot);
    }
    if (slot.signature !== signature) {
      slot.node.clear();
      draw(slot.node);
      slot.signature = signature;
    }
    slot.node.position.set(x, y);
    return this.place(slot.node);
  }

  rect(x: number, y: number, width: number, height: number, color: string) {
    return this.shape(
      `r:${width}:${height}:${color}`,
      (g) => g.rect(0, 0, width, height).fill(color),
      x,
      y,
    );
  }

  polygon(points: Point[], fill: string, stroke: string, width: number) {
    return this.shape(
      JSON.stringify(['polygon', points, fill, stroke, width]),
      (g) =>
        g
          .poly(points)
          .fill(fill)
          .stroke({ color: stroke, width, join: 'round' }),
    );
  }

  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
    width: number,
    alpha = 1,
  ) {
    return this.shape(
      `e:${rx}:${ry}:${color}:${width}:${alpha}`,
      (g) => g.ellipse(0, 0, rx, ry).stroke({ color, width, alpha }),
      x,
      y,
    );
  }

  outline(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    width: number,
    dash?: number[],
  ) {
    return this.line(
      [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
        { x, y },
      ],
      color,
      width,
      dash,
    );
  }

  line(
    points: Point[],
    color: string,
    width: number,
    dash?: number[],
    rounded = false,
  ) {
    const signature = JSON.stringify([points, color, width, dash, rounded]);
    return this.shape(signature, (g) => {
      if (!points.length) return;
      g.moveTo(points[0].x, points[0].y);
      let dashIndex = 0,
        remaining = dash?.[0] ?? 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        if (!dash?.length) {
          g.lineTo(b.x, b.y);
          continue;
        }
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        let travelled = 0;
        while (travelled < length) {
          const step = Math.min(remaining, length - travelled);
          travelled += step;
          const x = a.x + ((b.x - a.x) * travelled) / length;
          const y = a.y + ((b.y - a.y) * travelled) / length;
          if (dashIndex % 2 === 0) g.lineTo(x, y);
          else g.moveTo(x, y);
          remaining -= step;
          if (remaining < 1e-8) {
            dashIndex = (dashIndex + 1) % dash.length;
            remaining = dash[dashIndex];
          }
        }
      }
      g.stroke({
        color,
        width,
        cap: rounded ? 'round' : 'butt',
        join: rounded ? 'round' : 'miter',
      });
    });
  }

  text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    options: {
      anchor?: number;
      alpha?: number;
      stroke?: number;
      resolution?: number;
    } = {},
  ) {
    let slot = this.texts[this.textIndex++];
    if (!slot) {
      slot = {
        node: new Text({ text: '', textureStyle: { scaleMode: 'nearest' } }),
        signature: '',
      };
      this.texts.push(slot);
    }
    const signature = `${size}:${color}:${options.stroke ?? 0}`;
    if (slot.signature !== signature) {
      const style: TextStyleOptions = {
        fontFamily: ['Pixel Operator', 'monospace'],
        fontSize: size,
        fontWeight: '400',
        fill: color,
        padding: 3,
      };
      if (options.stroke)
        style.stroke = {
          color: '#172224',
          width: options.stroke,
          join: 'round',
        };
      slot.node.style = style;
      slot.signature = signature;
    }
    slot.node.text = value;
    slot.node.resolution = options.resolution ?? 2;
    slot.node.position.set(x, y);
    slot.node.anchor.set(options.anchor ?? 0.5, 0.5);
    slot.node.alpha = options.alpha ?? 1;
    return this.place(slot.node);
  }

  destroy() {
    this.container.destroy({ children: true });
    for (const slot of this.sprites) slot.texture.destroy(false);
    this.sprites.length = this.shapes.length = this.texts.length = 0;
  }
}

/** The visible canvas has only a WebGL context; all world drawing goes through Pixi. */
export class PixiScene {
  readonly textures = new GameTextures();
  readonly world = new Container({ eventMode: 'none' });
  readonly stage = new Container({ eventMode: 'none' });
  readonly shore = new DrawLayer(this.textures);
  readonly actors = new DrawLayer(this.textures);
  readonly overlay = new DrawLayer(this.textures);
  readonly renderer = new WebGLRenderer();
  private terrain = new Sprite();
  private terrainTexture?: Texture;
  private water?: TilingSprite;
  private initialized = false;
  private destroyed = false;

  async init(canvas: HTMLCanvasElement, width: number, height: number) {
    await this.renderer.init({
      canvas,
      width: Math.max(1, width),
      height: Math.max(1, height),
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      // Smooth vector indicators; sprite and terrain textures retain nearest sampling.
      antialias: true,
      background: '#648b73',
      autoDensity: false,
      // Native canvas handlers own game input and CSS cursors.
      eventFeatures: {
        move: false,
        globalMove: false,
        click: false,
        wheel: false,
      },
    });
    this.initialized = true;
    if (this.destroyed) {
      this.renderer.destroy(false);
      return false;
    }
    this.stage.addChild(this.world, this.overlay.container);
    this.world.addChild(
      this.shore.container,
      this.terrain,
      this.actors.container,
    );
    canvas.dataset.renderer = 'pixi-webgl';
    return true;
  }

  resize(width: number, height: number) {
    if (this.initialized && !this.destroyed)
      this.renderer.resize(
        Math.max(1, width),
        Math.max(1, height),
        Math.min(window.devicePixelRatio || 1, 2),
      );
  }

  setTerrain(draw: (layer: DrawLayer) => void, size: number, margin: number) {
    const layer = new DrawLayer(this.textures);
    layer.begin();
    try {
      draw(layer);
      layer.end();
      const texture = this.renderer.generateTexture({
        target: layer.container,
        frame: new Rectangle(
          -margin,
          -margin,
          size + margin * 2,
          size + margin * 2,
        ),
        resolution: 1,
        textureSourceOptions: { scaleMode: 'nearest' },
        clearColor: [0, 0, 0, 0],
      });
      this.terrain.texture = texture;
      this.terrain.position.set(-margin, -margin);
      this.terrainTexture?.destroy(true);
      this.terrainTexture = texture;
    } finally {
      layer.destroy();
    }
  }

  begin(origin: Point, scale: number, width: number, height: number) {
    this.world.position.set(origin.x, origin.y);
    this.world.scale.set(scale);
    if (!this.water) {
      this.water = new TilingSprite({
        texture: new Texture({ source: this.textures.get('water') }),
      });
      this.world.addChildAt(this.water, 0);
    }
    const left = Math.floor(-origin.x / scale / 64) * 64;
    const top = Math.floor(-origin.y / scale / 64) * 64;
    this.water.position.set(left, top);
    this.water.width = width / scale + 128;
    this.water.height = height / scale + 128;
    this.water.tilePosition.set(-left, -top);
    this.shore.begin();
    this.actors.begin();
    this.overlay.begin();
  }

  render() {
    this.shore.end();
    this.actors.end();
    this.overlay.end();
    this.renderer.render({ container: this.stage });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shore.destroy();
    this.actors.destroy();
    this.overlay.destroy();
    this.water?.texture.destroy(false);
    this.stage.destroy({ children: true });
    this.terrainTexture?.destroy(true);
    this.textures.destroy();
    if (this.initialized) this.renderer.destroy(false);
  }
}
