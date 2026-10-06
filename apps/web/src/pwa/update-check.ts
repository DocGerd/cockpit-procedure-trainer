export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
export const MIN_CHECK_GAP_MS = 60 * 1000;

type Updatable = { update: () => Promise<unknown> };

let stopCurrent: (() => void) | undefined;

export function watchForUpdates(registration: Updatable): () => void {
  stopCurrent?.();

  let inFlight = false;
  let lastStart = -Infinity;

  const check = () => {
    if (!navigator.onLine || inFlight || Date.now() - lastStart < MIN_CHECK_GAP_MS) return;
    inFlight = true;
    lastStart = Date.now();
    registration
      .update()
      .catch((error: unknown) => console.warn('Service worker update check failed', error))
      .finally(() => {
        inFlight = false;
      });
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') check();
  };

  const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const stop = () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (stopCurrent === stop) stopCurrent = undefined;
  };
  stopCurrent = stop;
  return stop;
}
