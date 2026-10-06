import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type Size = { width: number; height: number };

/** The largest uniform scale that puts `content` inside `box`; undefined while either is unmeasured. */
export function containScale(box: Size, content: Size): number | undefined {
  if (box.width <= 0 || box.height <= 0 || content.width <= 0 || content.height <= 0) {
    return undefined;
  }
  return Math.min(box.width / content.width, box.height / content.height);
}

/** The scale that fits the content element, at its natural size, into the box element. */
export function useContainScale(): [
  RefObject<HTMLDivElement | null>,
  RefObject<HTMLDivElement | null>,
  number,
] {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (box === null || content === null) return;
    const next =
      containScale(
        { width: box.clientWidth, height: box.clientHeight },
        { width: content.offsetWidth, height: content.offsetHeight },
      ) ?? 1;
    setScale((previous) => (previous === next ? previous : next));
  }, []);

  // Every commit: a screen that changes its own size must be seen before the observer reports it.
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    if (boxRef.current !== null) observer.observe(boxRef.current);
    if (contentRef.current !== null) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return [boxRef, contentRef, scale];
}
