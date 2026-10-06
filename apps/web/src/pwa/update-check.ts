export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

type Updatable = { update: () => Promise<unknown> };

let stopCurrent: (() => void) | undefined;

export function watchForUpdates(registration: Updatable): () => void {
  stopCurrent?.();

  const check = () => {
    if (!navigator.onLine) return;
    registration.update().catch(() => undefined);
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
