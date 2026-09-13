import { type Lot, type State } from './engine';
import { upgradeBenefit } from './progression';
import { upgradePreview } from './upgradePreview';

export function UpgradeBenefit({ lot, state }: { lot: Lot; state: State }) {
  const info = upgradePreview(state, lot);
  if (!info) return <p className="reason">{upgradeBenefit(lot)}</p>;
  return <div className="upgrade-benefit">
    {lot.kind === 'hq' && <p className="reason">{upgradeBenefit(lot)}</p>}
    <span className="upgrade-benefit-label">{info.label}</span>
    <div className="upgrade-benefit-values"><span><small>Actuellement</small>{info.from}</span><span aria-label="devient">→</span><strong><small>Après amélioration</small>{info.to}</strong></div>
    {info.note && <small>{info.note}</small>}
  </div>;
}
