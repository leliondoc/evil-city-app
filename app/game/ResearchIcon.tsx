import { ASSETS, type AssetKey } from './art';
import type { Research } from './strategy';

// Reuse the game's artwork in both the research menu and its global queue.
const icons: Record<Research, AssetKey> = {
  embers: 'ui-sword',
  chain: 'fx-fire',
  solvent: 'alchemist-avatar',
  'pig-riding': 'pig-rider-idle',
};
export function ResearchIcon({ research }: { research: Research }) {
  const asset = ASSETS[icons[research]];
  // A stable frame keeps the icon recognizable even for animated sprite sheets.
  const frame = research === 'chain' ? 3 : 0;
  return <span className="research-icon" aria-hidden="true" style={{
    backgroundImage: `url("${asset.src}")`,
    backgroundSize: `${asset.frames * 100}% 100%`,
    backgroundPosition: `${asset.frames > 1 ? frame / (asset.frames - 1) * 100 : 0}% center`,
    backgroundRepeat: 'no-repeat',
  }} />;
}
