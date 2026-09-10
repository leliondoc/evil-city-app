import type { CreatureKind } from './engine';
import { portrait } from './art';
import { Sprite } from './Sprite';

export function CreaturePortrait({
  kind,
  label = '',
}: {
  kind: CreatureKind;
  label?: string;
}) {
  return kind === 'specter' ? (
    <Sprite creature="specter" className="creature-portrait" label={label} />
  ) : (
    <img src={portrait(kind)} alt={label} />
  );
}
