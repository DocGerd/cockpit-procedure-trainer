import type { Session } from '@cpt/core';
import { useSyncExternalStore } from 'react';
import { useTrainer } from '../trainer';

export type ExploreState = { readonly operate: boolean; readonly selected: string | undefined };

export type ExploreStore = {
  get(): ExploreState;
  subscribe(listener: () => void): () => void;
  setOperate(operate: boolean): void;
  select(controlId: string | undefined): void;
};

function createExploreStore(): ExploreStore {
  let state: ExploreState = { operate: false, selected: undefined };
  const listeners = new Set<() => void>();
  const update = (next: Partial<ExploreState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOperate(operate) {
      if (operate !== state.operate)
        update(operate ? { operate, selected: undefined } : { operate });
    },
    select(selected) {
      if (selected !== state.selected) update({ selected });
    },
  };
}

// The header's operate toggle and the panel share this state without a common provider.
const stores = new WeakMap<Session, ExploreStore>();

export function useExploreStore(): ExploreStore {
  const { session } = useTrainer();
  let store = stores.get(session);
  if (!store) {
    store = createExploreStore();
    stores.set(session, store);
  }
  return store;
}

export function useExploreState(): ExploreState {
  const store = useExploreStore();
  return useSyncExternalStore(store.subscribe, store.get);
}
