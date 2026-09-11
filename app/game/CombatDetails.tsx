import type { CombatProfile } from './combat';
import { PackIcon } from './PackUI';

export function CombatDetails({ profile }: { profile: CombatProfile }) {
  return (
    <div className="combat-details" aria-label="Forces et faiblesses">
      <dl className="combat-matchups">
        <div><PackIcon asset="ui-sword" /><dt>Atouts</dt><dd>{profile.strength}</dd></div>
        <div><PackIcon asset="ui-shield" /><dt>Faiblesses</dt><dd>{profile.weakness}</dd></div>
      </dl>
      <p className="combat-advice"><PackIcon asset="ui-info" /><span>{profile.effect}</span></p>
    </div>
  );
}
