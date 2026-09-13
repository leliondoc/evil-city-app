'use client';
import { useEffect, useRef } from 'react';
import {
  ASSETS,
  animationFrame,
  animationSequence,
  spriteFrame,
  type AssetKey,
  type Animation,
} from './art';
import type { CreatureKind } from './engine';

// One clock for visible animated previews; no timer survives the last subscriber.
const painters = new Set<(now: number) => void>();
let clock: ReturnType<typeof setInterval> | undefined;
function animate(paint: (now: number) => void) {
  painters.add(paint);
  clock ??= setInterval(() => {
    const now = performance.now();
    for (const draw of painters) draw(now);
  }, 100);
  return () => {
    painters.delete(paint);
    if (!painters.size) { clearInterval(clock); clock = undefined; }
  };
}

const imageCache = new Map<AssetKey, Promise<HTMLImageElement>>();
function loadImage(key: AssetKey) {
  let image = imageCache.get(key);
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { void im.decode().then(() => resolve(im), reject); };
      im.onerror = () => { imageCache.delete(key); reject(new Error(`Missing sprite ${key}`)); };
      im.src = ASSETS[key].src;
    });
    imageCache.set(key, image);
  }
  return image;
}

/** Preview the same unmodified sprite strips used on the map. */
export function Sprite({
  asset,
  creature,
  action = 'idle',
  className = '',
  label = '',
  sequence: providedSequence,
  figure = false,
  mounted = false,
  ground,
  flankingTowers = false,
}: {
  asset?: AssetKey;
  creature?: CreatureKind;
  action?: Animation;
  className?: string;
  label?: string;
  sequence?: AssetKey[];
  figure?: boolean;
  mounted?: boolean;
  ground?: AssetKey;
  flankingTowers?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sequenceKey = (providedSequence ?? (creature ? animationSequence(creature, action, mounted) : [asset!])).join(',');
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !sequenceKey) return;
    const sequence = sequenceKey.split(',') as AssetKey[];
    const images = new Map<AssetKey, HTMLImageElement>();
    let disposed = false, visible = false, loading = false;
    let stop: (() => void) | undefined;
    let paint: ((now: number) => void) | undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animated = !reduced && sequence.some(key => ASSETS[key].frames > 1);
    const sync = () => {
      stop?.(); stop = undefined;
      if (disposed || !visible || document.hidden) return;
      if (paint) {
        paint(performance.now());
        if (animated) stop = animate(paint);
        return;
      }
      if (loading) return;
      loading = true;
      // Large sheets are decoded only when their preview enters the viewport.
      Promise.all(
        [...new Set([...sequence, ...(ground ? [ground] : []), ...(flankingTowers ? ['tower-blue' as const] : [])])]
          .map(async key => { images.set(key, await loadImage(key)); }),
      ).then(() => {
        if (disposed) return;
        const start = performance.now();
        let lastFrame = '';
        paint = (now) => {
          if (disposed || !visible || document.hidden) return;
          const sample = animationFrame(sequence, reduced ? 0 : (now - start) / 1000);
          const frameId = sample.key + ':' + sample.frame;
          if (lastFrame === frameId) return;
          lastFrame = frameId;
          const im = images.get(sample.key)!, source = spriteFrame(sample.key, sample.frame);
          ctx.clearRect(0, 0, 256, 256);
          ctx.imageSmoothingEnabled = false;
          if (ground) {
            const terrain = images.get(ground)!;
            for (let y = 0; y < 256; y += 64)
              for (let x = 0; x < 256; x += 64)
                ctx.drawImage(terrain, 64, 64, 64, 64, x, y, 64, 64);
          }
          const scale = creature || figure
            ? 256 / (source.height * 0.85)
            : Math.min(236 / source.width, 236 / source.height);
          ctx.drawImage(im, source.x, source.y, source.width, source.height,
            128 - source.width * scale / 2, 128 - source.height * scale / 2,
            source.width * scale, source.height * scale);
          if (flankingTowers) {
            const tower = images.get('tower-blue')!;
            for (const side of [-1, 1])
              ctx.drawImage(tower, 128 + side * 82 - 24, 128 + source.height * scale / 2 - 100, 48, 96);
          }
        };
        sync();
      }).catch(() => { /* Shared failures remain visible in the map's asset status. */ });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    return () => {
      disposed = true;
      stop?.();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [sequenceKey, creature, figure, ground, flankingTowers]);
  return (
    <canvas
      ref={ref}
      width={256}
      height={256}
      className={`sprite-preview ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
