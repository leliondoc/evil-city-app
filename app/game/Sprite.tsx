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

const imageCache = new Map<AssetKey, Promise<HTMLImageElement>>();
function loadImage(key: AssetKey) {
  let image = imageCache.get(key);
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
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
    let frame = 0,
      disposed = false;
    let visible = false;
    let repaint: (() => void) | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      clearTimeout(frame);
      if (visible && !document.hidden) repaint?.();
    });
    observer.observe(canvas);
    const visibility = () => {
      clearTimeout(frame);
      if (visible && !document.hidden) repaint?.();
    };
    document.addEventListener('visibilitychange', visibility);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const start = performance.now();
    Promise.all(
      [...new Set([...sequence, ...(ground ? [ground] : []), ...(flankingTowers ? ['tower-blue' as const] : [])])].map(
        async (key) => { images.set(key, await loadImage(key)); },
      ),
    )
      .then(() => {
        if (disposed) return;
        const draw = () => {
          if (disposed || !visible || document.hidden) return;
          const sample = animationFrame(
              sequence,
              reduced ? 0 : (performance.now() - start) / 1000,
            ),
            im = images.get(sample.key)!,
            source = spriteFrame(sample.key, sample.frame);
          ctx.clearRect(0, 0, 256, 256);
          ctx.imageSmoothingEnabled = false;
          if (ground) {
            const terrain = images.get(ground)!;
            for (let y = 0; y < 256; y += 64)
              for (let x = 0; x < 256; x += 64)
                ctx.drawImage(terrain, 64, 64, 64, 64, x, y, 64, 64);
          }
          // Creature strips include generous margins for weapons and effects.
          const scale =
            creature || figure
              ? 256 / (source.height * 0.85)
              : Math.min(236 / source.width, 236 / source.height);
          ctx.drawImage(
            im,
            source.x,
            source.y,
            source.width,
            source.height,
            128 - (source.width * scale) / 2,
            128 - (source.height * scale) / 2,
            source.width * scale,
            source.height * scale,
          );
          if (flankingTowers) {
            const tower = images.get('tower-blue')!;
            for (const side of [-1, 1])
              ctx.drawImage(tower, 128 + side * 82 - 24, 128 + source.height * scale / 2 - 100, 48, 96);
          }
          if (!reduced && sequence.some((key) => ASSETS[key].frames > 1))
            frame = window.setTimeout(draw, 100);
        };
        repaint = draw;
        draw();
      })
      .catch(() => {
        /* The map reports shared asset loading failures. */
      });
    return () => {
      disposed = true;
      clearTimeout(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
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
