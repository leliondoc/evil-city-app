import { useEffect, useRef, type ComponentProps } from 'react';
import { paintPanel, type PanelKind } from './panelSkin';
import { Button as BaseButton } from '@/components/ui/button';
import { ASSETS } from './art';

/** Paint separated pack tiles at a fixed pixel scale, including on resize. */
export function PanelSkin({ kind = 'paper' }: { kind?: PanelKind }) {
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintPanel(ctx, image, kind, width, height);
    };
    image.onload = draw;
    image.src = ASSETS[`ui-${kind}`].src;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      disposed = true;
      observer.disconnect();
      image.onload = null;
    };
  }, [kind]);
  return (
    <canvas ref={ref} className={`pack-skin pack-${kind}`} aria-hidden="true" />
  );
}
export function GameButton({
  children,
  className,
  ...props
}: ComponentProps<typeof BaseButton>) {
  const skin =
    typeof className === 'string' && className.includes('primary-btn');
  return (
    <BaseButton
      {...props}
      className={
        typeof className === 'string'
          ? `${className}${skin ? ' pack-action' : ''}`
          : className
      }
    >
      {skin && <PanelSkin kind="button" />}
      {children}
    </BaseButton>
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
  return (
    <span className="ribbon-skin" aria-hidden="true">
      {[
        [0, 128],
        [192, 64],
        [320, 128],
      ].map(([x, width]) => (
        <svg key={x} viewBox={`${x} 0 ${width} 128`} preserveAspectRatio="none">
          <image href={ASSETS['ui-ribbons'].src} width="448" height="640" />
        </svg>
      ))}
    </span>
  );
}
