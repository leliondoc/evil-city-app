import { upgrade } from '../app/game/engine.ts';
import { advanceBuildingUpgrades } from '../app/game/progression.ts';
// Tier/bonus fixtures skip waiting; timed upgrades have dedicated simulation tests.
export function upgradeAndFinish(s, id) {
  const error = upgrade(s, id);
  if (!error) advanceBuildingUpgrades(s, s.lots[id].upgrading.duration);
  return error;
}
