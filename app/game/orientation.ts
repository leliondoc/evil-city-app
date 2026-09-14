/** Call directly from a play/resume gesture so mobile fullscreen is permitted. */
export async function requestLandscape(): Promise<boolean> {
  if (!(navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches)) return false;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
  if (!orientation?.lock) return false;
  try {
    if (!matchMedia('(orientation: landscape)').matches && !document.fullscreenElement && document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
  } catch {
    // Installed apps may permit orientation locking without fullscreen.
  }
  try {
    await orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}
