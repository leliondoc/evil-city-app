import type { CombatProfile } from './combat';

export function CombatDetails({ profile }: { profile: CombatProfile }) {
  return (
    <div className="combat-details" aria-label="Forces et faiblesses">
      <p className="reason">
        <strong>Atouts : </strong>
        {profile.strength}
      </p>
      <p className="reason">
        <strong>Vulnérable : </strong>
        {profile.weakness}
      </p>
      <p className="reason">{profile.effect}</p>
    </div>
  );
}
