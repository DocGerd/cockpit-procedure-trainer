import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useGuidedKey } from './guided-install';

/**
 * Marks the keys of a docked Screen that the Guided step targets with `data-target`: the keys
 * for the step's position when the Screen names them, else every key of the control. The unit
 * gets `data-key-ring` while any key is marked, so its own ring only shows as the fallback.
 * `changed` re-marks after the Screen redrew.
 */
export function useKeyRing(
  unit: RefObject<HTMLElement | null>,
  installId: string,
  changed: unknown,
) {
  const guided = useGuidedKey();
  const control = guided?.install === installId ? guided.control : undefined;
  const position = guided?.install === installId ? guided.position : undefined;

  useEffect(() => {
    const root = unit.current;
    if (!root || control === undefined) return undefined;
    const own = [...root.querySelectorAll<HTMLElement>('[data-control]')].filter(
      (key) => key.dataset.control === control,
    );
    const exact = own.filter((key) => key.dataset.position === position);
    const keys = exact.length > 0 ? exact : own;
    for (const key of keys) key.dataset.target = 'true';
    if (keys.length > 0) root.dataset.keyRing = 'true';
    return () => {
      for (const key of keys) delete key.dataset.target;
      delete root.dataset.keyRing;
    };
  }, [unit, control, position, changed]);
}
