import type { Aircraft, ControlPosition, Session, SessionControlResult } from '@cpt/core';
import { useSyncExternalStore } from 'react';
import { useTrainer } from '../trainer';

/** A refused pilot move; a new object on every refusal, so a repeat restarts its time. */
export type LockNotice = {
  readonly controlId: string;
  /** The position the pilot tried to reach, when the move named one. */
  readonly to?: ControlPosition | undefined;
  readonly serial: number;
};

export type LockNoticeStore = {
  get(): LockNotice | undefined;
  subscribe(listener: () => void): () => void;
  /** Shows a notice for a refused move and drops it once a later move goes through. */
  report(controlId: string, result: SessionControlResult, to?: ControlPosition): void;
  clear(): void;
};

function createLockNoticeStore(): LockNoticeStore {
  let notice: LockNotice | undefined;
  let serial = 0;
  const listeners = new Set<() => void>();
  const update = (next: LockNotice | undefined) => {
    if (next === notice) return;
    notice = next;
    for (const listener of listeners) listener();
  };
  return {
    get: () => notice,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    report(controlId, result, to) {
      if (!result.applied && result.reason === 'locked')
        update({ controlId, to, serial: ++serial });
      else if (result.applied) update(undefined);
    },
    clear: () => update(undefined),
  };
}

// The panel's inputs and the header's notice share this state without a common provider.
const stores = new WeakMap<Session, LockNoticeStore>();

export function lockNoticeStore(session: Session): LockNoticeStore {
  let store = stores.get(session);
  if (!store) {
    store = createLockNoticeStore();
    stores.set(session, store);
  }
  return store;
}

export function useLockNoticeStore(): LockNoticeStore {
  return lockNoticeStore(useTrainer().session);
}

export function useLockNotice(): LockNotice | undefined {
  const store = useLockNoticeStore();
  return useSyncExternalStore(store.subscribe, store.get);
}

/** The control whose position holds `controlId` where it is, if an interlock does. */
export function lockHolder(
  aircraft: Pick<Aircraft, 'controls'>,
  positions: Readonly<Record<string, ControlPosition>>,
  controlId: string,
): string | undefined {
  const lock = aircraft.controls[controlId]?.interlock?.find(
    (entry) =>
      positions[entry.control] === entry.at &&
      entry.holds.some((held) => held === positions[controlId]),
  );
  return lock && aircraft.controls[lock.control] ? lock.control : undefined;
}

/** Why a refused move was refused: another control holds it, or its target is reached only from other positions. */
export type LockCause =
  | { readonly kind: 'holder'; readonly control: string }
  | { readonly kind: 'source'; readonly to: string; readonly from: readonly string[] };

export function lockCause(
  aircraft: Pick<Aircraft, 'controls'>,
  positions: Readonly<Record<string, ControlPosition>>,
  notice: Pick<LockNotice, 'controlId' | 'to'>,
): LockCause | undefined {
  const holder = lockHolder(aircraft, positions, notice.controlId);
  if (holder !== undefined) return { kind: 'holder', control: holder };
  const definition = aircraft.controls[notice.controlId];
  const { to } = notice;
  if (definition?.kind !== 'rotary' || typeof to !== 'string') return undefined;
  const from = definition.onlyFrom?.[to];
  return from && !from.some((source) => source === positions[notice.controlId])
    ? { kind: 'source', to, from }
    : undefined;
}
