import { Suspense, use, useEffect, useState } from 'react';
import { useTrainer } from '../trainer';
import { AppFooter } from './AppFooter';
import { Header } from './Header';
import { useLayout } from './layout';
import { Picker } from './Picker';
// The trainer's stylesheets load here, ahead of shell.css, so the lazy chunk cannot reorder the cascade.
import '../checklist/checklist.css';
import '../devices/slot-mirror.css';
import '../devices/dock.css';
import '../panel/panel.css';
import './shell.css';

let trainerLoad: Promise<typeof import('./TrainerLayout')> | undefined;

// A promise marked as fulfilled lets use() render a prefetched trainer at once, without a fallback frame.
function loadTrainer() {
  if (!trainerLoad) {
    const load = import('./TrainerLayout');
    load.then(
      (module) => {
        Object.assign(load, { status: 'fulfilled', value: module });
      },
      (reason: unknown) => {
        Object.assign(load, { status: 'rejected', reason });
      },
    );
    trainerLoad = load;
  }
  return trainerLoad;
}

// A failed load is retried on the next prefetch, or when the error dialog's Reset remounts the trainer.
// Browsers may cache a failed module fetch and a deploy may have replaced the chunk, so Reset also reloads.
function retryFailedTrainerLoad(reload: boolean) {
  if ((trainerLoad as { status?: string } | undefined)?.status !== 'rejected') return;
  trainerLoad = undefined;
  if (reload) location.reload();
}

function LoadedTrainer() {
  const { TrainerLayout } = use(loadTrainer());
  return <TrainerLayout />;
}

function TrainerFrame() {
  return (
    <div className="shell" data-layout={useLayout()} data-screen="trainer">
      <Header variant="trainer" />
      <div className="shell-body" />
      <AppFooter />
    </div>
  );
}

function usePrefetchTrainer(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prefetch = () => {
      retryFailedTrainerLoad(false);
      void loadTrainer();
    };
    const idle = window.setTimeout(() => {
      if (window.requestIdleCallback) window.requestIdleCallback(prefetch);
      else prefetch();
    });
    const onIntent = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.picker-actions')) prefetch();
    };
    document.addEventListener('pointerover', onIntent);
    document.addEventListener('focusin', onIntent);
    return () => {
      window.clearTimeout(idle);
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
    };
  }, [active]);
}

export function Shell() {
  const onPicker = useTrainer().screen === 'picker';
  useState(() => retryFailedTrainerLoad(!onPicker));
  usePrefetchTrainer(onPicker);
  return onPicker ? (
    <Picker />
  ) : (
    <Suspense fallback={<TrainerFrame />}>
      <LoadedTrainer />
    </Suspense>
  );
}
