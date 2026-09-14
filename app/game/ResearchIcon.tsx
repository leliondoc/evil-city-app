import { ASSETS, type AssetKey } from './art';
import type { Research } from './strategy';

// Bounds of the visible artwork, excluding transparent sprite-sheet margins.
// Reuse one crop in the research menu and the global queue; no asset is altered.
const icons: Record<Research, { asset: AssetKey; frame: number; bounds: [number, number, number, number] }> = {
  embers: { asset: 'ui-sword', frame: 0, bounds: [3, 5, 60, 61] },
  chain: { asset: 'fx-fire', frame: 3, bounds: [22, 44, 43, 59] },
  solvent: { asset: 'alchemist-avatar', frame: 0, bounds: [39, 55, 204, 213] },
  'pig-riding': { asset: 'pig-rider-idle', frame: 0, bounds: [83, 21, 169, 166] },
};
export function ResearchIcon({ research }: { research: Research }) {
  const { asset: key, frame, bounds: [left, top, right, bottom] } = icons[research];
  const asset = ASSETS[key];
  const size = Math.max(right - left, bottom - top) * 1.08;
  const x = frame * asset.frameWidth + (left + right - size) / 2;
  const y = (top + bottom - size) / 2;
  return <svg className="research-icon" aria-hidden="true" focusable="false" viewBox={`${x} ${y} ${size} ${size}`}>
    <image href={asset.src} width={asset.width} height={asset.height} />
  </svg>;
}
