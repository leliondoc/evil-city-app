import type { ComponentProps } from 'react';
import { Button as BaseButton } from '@/components/ui/button';
import { ASSETS } from './art';

/** Nine-slice layout from the pack's separated tiles; corners never stretch. */
export function PanelSkin({
  kind = 'paper',
}: {
  kind?: 'paper' | 'wood' | 'banner' | 'button';
}) {
  const large = kind === 'wood' || kind === 'banner';
  const parts = large
    ? [
        [0, 128],
        [192, 64],
        [320, 128],
      ]
    : [
        [0, 64],
        [128, 64],
        [256, 64],
      ];
  const key = `ui-${kind}` as const;
  return (
    <span className={`pack-skin pack-${kind}`} aria-hidden="true">
      {parts.flatMap(([y, height], row) =>
        parts.map(([x, width], col) => (
          <svg
            key={`${row}-${col}`}
            viewBox={`${x} ${y} ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <image
              href={ASSETS[key].src}
              width={ASSETS[key].width}
              height={ASSETS[key].height}
            />
          </svg>
        )),
      )}
    </span>
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
