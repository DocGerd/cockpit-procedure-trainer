import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTrainer } from '../trainer';

export type DockApi = {
  /** Whether this cockpit shows a dock; slots mirror their device only where it does. */
  readonly available: boolean;
  /** The install the dock holds, if any. */
  readonly installId: string | undefined;
  /** Dock the install's device, replacing the one held; `close` gives focus back to the opener. */
  open(installId: string): void;
  close(): void;
};

const DockContext = createContext<DockApi | undefined>(undefined);

/** The dock of the enclosing cockpit; undefined outside one, where a device layer stays operable. */
export function useDock(): DockApi | undefined {
  return useContext(DockContext);
}

export function DockProvider({ available, children }: { available: boolean; children: ReactNode }) {
  const { aircraft } = useTrainer();
  const [held, setHeld] = useState<{ aircraftId: string; installId: string }>();
  const opener = useRef<HTMLElement | null>(null);

  const installId =
    held?.aircraftId === aircraft.id && Object.hasOwn(aircraft.devices ?? {}, held.installId)
      ? held.installId
      : undefined;

  const open = useCallback(
    (id: string) => {
      if (!Object.hasOwn(aircraft.devices ?? {}, id)) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== document.body) opener.current = focused;
      setHeld({ aircraftId: aircraft.id, installId: id });
    },
    [aircraft],
  );

  const close = useCallback(() => {
    setHeld(undefined);
    const slot = opener.current;
    opener.current = null;
    if (slot?.isConnected) slot.focus();
  }, []);

  const api = useMemo<DockApi>(
    () => ({ available, installId, open, close }),
    [available, installId, open, close],
  );

  return <DockContext.Provider value={api}>{children}</DockContext.Provider>;
}
