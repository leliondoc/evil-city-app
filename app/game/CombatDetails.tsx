import type { CombatProfile } from './combat';
import { PackIcon, PanelSkin } from './PackUI';

export function CombatDetails({ profile }: { profile: CombatProfile }) {
  return (
    <div className="combat-details" aria-label="Forces et faiblesses">
      <dl className="combat-matchups">
        <div><dt className="combat-strength-label"><PanelSkin kind="sword" /><span>Atouts</span></dt><dd>{profile.strength}</dd></div>
        <div><dt className="combat-weakness-label"><PanelSkin kind="button" asset="ui-button-red" /><span>Faiblesses</span></dt><dd>{profile.weakness}</dd></div>
      </dl>
      <p className="combat-advice"><PackIcon asset="ui-info" /><span>{profile.effect}</span></p>
    </div>
  );
}
