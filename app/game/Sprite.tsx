'use client';
import { useEffect, useRef } from 'react';
import {
  ASSETS,
  animationFrame,
  animationSequence,
  type AssetKey,
  type Animation,
} from './art';
import type { CreatureKind } from './engine';

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
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext('2d')!;
    const sequence =
      providedSequence ??
      (creature ? animationSequence(creature, action, mounted) : [asset!]);
    const images = new Map<AssetKey, HTMLImageElement>();
    let frame = 0,
      disposed = false;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const start = performance.now();
    Promise.all(
      [...new Set([...sequence, ...(ground ? [ground] : [])])].map(
        (key) =>
          new Promise<void>((resolve, reject) => {
            const im = new Image();
            im.onload = () => {
              images.set(key, im);
              resolve();
            };
            im.onerror = reject;
            im.src = ASSETS[key].src;
          }),
      ),
    )
      .then(() => {
        if (disposed) return;
        const draw = () => {
          if (disposed) return;
          const sample = animationFrame(
              sequence,
              reduced ? 0 : (performance.now() - start) / 1000,
            ),
            a = ASSETS[sample.key],
            im = images.get(sample.key)!;
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
              ? 256 / (a.height * 0.85)
              : Math.min(236 / a.frameWidth, 236 / a.height);
          ctx.drawImage(
            im,
            sample.frame * a.frameWidth,
            0,
            a.frameWidth,
            a.height,
            128 - (a.frameWidth * scale) / 2,
            128 - (a.height * scale) / 2,
            a.frameWidth * scale,
            a.height * scale,
          );
          if (!reduced && sequence.some((key) => ASSETS[key].frames > 1))
            frame = requestAnimationFrame(draw);
        };
        draw();
      })
      .catch(() => {
        /* The map reports shared asset loading failures. */
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [asset, creature, action, providedSequence, figure, mounted, ground]);
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
