import { ASSETS, type AssetKey } from './art';

export function SelectionPortrait({
  asset,
  label,
}: {
  asset: AssetKey;
  label: string;
}) {
  return (
    <img className="selection-portrait" src={ASSETS[asset].src} alt={label} />
  );
}
