import type { CreatureKind } from './engine';
import { portrait } from './art';

export function CreaturePortrait({
  kind,
  label = '',
}: {
  kind: CreatureKind;
  label?: string;
}) {
  return <img src={portrait(kind)} alt={label} />;
}
