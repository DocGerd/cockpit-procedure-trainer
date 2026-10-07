import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Size } from '../panel/zoom';

const UNMEASURED: Size = { width: 0, height: 0 };

/** The rendered size of the element behind the returned ref, zero until measured. */
export function useSlotSize<T extends HTMLElement>(): [RefObject<T | null>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>(UNMEASURED);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = element;
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
