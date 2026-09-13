import { CAMPAIGN_MAPS, type CampaignMapId } from './campaign.ts';

export function readUnlockedChapter(): number {
  try {
    const value = Number(localStorage.getItem('evil-city-campaign-v1'));
    return Number.isInteger(value) &&
      value >= 1 &&
      value <= Object.keys(CAMPAIGN_MAPS).length
      ? value
      : 1;
  } catch {
    return 1;
  }
}
export function completeChapter(id: CampaignMapId) {
  const unlocked = Math.max(
    readUnlockedChapter(),
    Math.min(Object.keys(CAMPAIGN_MAPS).length, CAMPAIGN_MAPS[id].chapter + 1),
  );
  try {
    localStorage.setItem('evil-city-campaign-v1', String(unlocked));
  } catch {
    /* Keep session progress. */
  }
  return unlocked;
}
export function readUIScale(): number {
  try {
    const value = Number(localStorage.getItem('evil-city-ui-scale-v1'));
    return Number.isFinite(value) && value >= 0.8 && value <= 1.3 ? value : 1;
  } catch {
    return 1;
  }
}
export function saveUIScale(value: number) {
  try {
    localStorage.setItem('evil-city-ui-scale-v1', String(value));
  } catch {
    /* Keep the current setting. */
  }
}
