import { useEffect, useRef, type ComponentProps } from 'react';
import { paintPanel, paintHealthBar, type PanelKind } from './panelSkin';
import { Button as BaseButton } from '@/components/ui/button';
import { ASSETS, type AssetKey } from './art';

/** Paint separated pack tiles at a fixed pixel scale, including on resize. */
export function PanelSkin({
  kind = 'paper',
  asset,
  className = '',
}: {
  kind?: PanelKind;
  asset?: AssetKey;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const image = new Image();
    let disposed = false;
    const draw = () => {
      if (disposed || !image.complete || !image.naturalWidth) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(
        canvas.width / width,
        0,
        0,
        canvas.height / height,
        0,
        0,
      );
      paintPanel(ctx, image, kind, width, height);
    };
    image.onload = draw;
    image.src =
      ASSETS[
        asset ??
          (kind === 'sword' ? 'ui-swords' : kind === 'notice'
            ? 'ui-banner'
            : kind === 'notice-ribbon'
              ? 'ui-small-ribbons'
              : kind === 'ribbon'
                ? 'ui-ribbons'
                : `ui-${kind}`)
      ].src;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      disposed = true;
      observer.disconnect();
      image.onload = null;
    };
  }, [kind, asset]);
  return (
    <canvas
      ref={ref}
      className={`pack-skin pack-${kind} ${className}`}
      aria-hidden="true"
    />
  );
}
export function GameButton({
  children,
  className,
  tone = 'blue',
  ...props
}: ComponentProps<typeof BaseButton> & { tone?: 'blue' | 'red' }) {
  const primary = typeof className === 'string' && className.includes('primary-btn');
  const skin =
    typeof className === 'string' &&
    (className.includes('primary-btn') || className.includes('touch-pack'));
  return (
    <BaseButton
      {...props}
      data-tone={tone}
      className={
        typeof className === 'string'
          ? `${className}${skin ? ' pack-action' : ''}`
          : className
      }
    >
      {skin && !primary && (
        <>
          <PanelSkin
            kind="button"
            asset={tone === 'red' ? 'ui-button-red' : 'ui-button'}
            className="pack-button-rest"
          />
          <PanelSkin
            kind="button"
            asset={
              tone === 'red' ? 'ui-button-red-pressed' : 'ui-button-pressed'
            }
            className="pack-button-down"
          />
        </>
      )}
      {children}
    </BaseButton>
  );
}
export function PackIcon({
  asset,
  className = '',
}: {
  asset: AssetKey;
  className?: string;
}) {
  return (
    <img
      className={`pack-icon ${className}`}
      src={ASSETS[asset].src}
      alt=""
      aria-hidden="true"
    />
  );
}
export function ResourceIcon({ kind }: { kind: 'gold' | 'wood' | 'food' }) {
  return (
    <img
      className="pack-resource-icon"
      src={
        ASSETS[
          kind === 'wood'
            ? 'ui-wood-icon'
            : kind === 'gold'
              ? 'ui-gold'
              : 'ui-food'
        ].src
      }
      alt=""
    />
  );
}

export function RibbonSkin() {
  return <PanelSkin kind="ribbon" />;
}

export function HealthBar({
  value,
  'aria-label': label,
}: {
  value: number;
  'aria-label': string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const currentValue = useRef(value);
  const redraw = useRef<() => void>(() => {});
  useEffect(() => {
    const canvas = ref.current!;
    const base = new Image(),
      fill = new Image();
    let disposed = false;
    const draw = () => {
      if (disposed || !base.naturalWidth || !fill.naturalWidth) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintHealthBar(
        ctx,
        base,
        fill,
        width,
        height,
        currentValue.current / 100,
        true,
      );
    };
    redraw.current = draw;
    base.onload = fill.onload = draw;
    base.src = ASSETS['ui-health-big-base'].src;
    fill.src = ASSETS['ui-health-big-fill'].src;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      disposed = true;
      observer.disconnect();
      base.onload = fill.onload = null;
    };
  }, []);
  useEffect(() => {
    currentValue.current = value;
    redraw.current();
  }, [value]);
  return (
    <div className="pack-healthbar">
      <progress
        className="sr-only"
        aria-label={label}
        max={100}
        value={Math.max(0, Math.min(100, value))}
      />
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}
