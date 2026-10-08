import { useEffect } from 'react';
import { useDock } from '../devices/dock-state';
import { useSessionState } from '../trainer';
import { useGuidedInstall } from './guided-install';

/** Opens the device a cued step targets in the dock, once per step. */
export function GuidedDock() {
  const dock = useDock();
  const install = useGuidedInstall();
  const item = useSessionState((session) => session.checklist()?.current);
  const open = dock?.open;
  const available = dock?.available === true;

  useEffect(() => {
    if (available && install !== undefined) open?.(install);
  }, [available, install, item, open]);

  return null;
}
