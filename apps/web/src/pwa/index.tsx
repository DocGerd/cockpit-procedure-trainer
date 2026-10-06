import { lazy, Suspense } from 'react';

const UpdatePrompt = lazy(() =>
  import('./UpdatePrompt').then((module) => ({ default: module.UpdatePrompt })),
);

// The plugin's virtual module exists only in the built app, so it loads on demand and only here.
export function PwaUpdatePrompt() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  return (
    <Suspense fallback={null}>
      <UpdatePrompt />
    </Suspense>
  );
}
