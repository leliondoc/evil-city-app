import type { Lot } from './engine';
import { upgradeBenefit } from './progression';

export function UpgradeBenefit({ lot }: { lot: Lot }) {
  const n = lot.level;
  const info = lot.kind === 'den'
    ? { label: 'Capacité de la horde', from: `${6 * n}`, to: `${6 * (n + 1)} places` }
    : lot.kind === 'canteen'
      ? { label: 'Économie de vivres', from: `${20 * n} %`, to: `${20 * (n + 1)} %`, note: 'Seule la meilleure cantine compte.' }
      : lot.kind === 'forge'
        ? { label: 'Dégâts de l’armée', from: `+${15 * (n - 1)} %`, to: `+${15 * n} %`, note: 'Seule la meilleure hutte compte.' }
        : lot.kind === 'crypt' || lot.kind === 'guild'
          ? { label: 'Production d’essence', from: `${(lot.kind === 'crypt' ? 24 : 18) * n}`, to: `${(lot.kind === 'crypt' ? 24 : 18) * (n + 1)}/min` }
          : null;
  if (!info) return <p className="reason">{upgradeBenefit(lot)}</p>;
  return <div className="upgrade-benefit">
    <span className="upgrade-benefit-label">{info.label}</span>
    <div className="upgrade-benefit-values"><span>{info.from}</span><span aria-label="devient">→</span><strong>{info.to}</strong></div>
    {info.note && <small>{info.note}</small>}
  </div>;
}
