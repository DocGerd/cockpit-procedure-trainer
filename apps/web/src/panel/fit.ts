import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { ImageSize } from './rects';

/** The element's distance from the top of the page, kept current as the content above it changes. */
export function usePageTop(ref: RefObject<HTMLElement | null>): number {
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      setTop(Math.round(element.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [ref]);

  return top;
}

/** Inputs of the stage's contain-fit in `panel.css`. */
export const fitStyle = (size: ImageSize, top: number) =>
  ({
    aspectRatio: `${size.width} / ${size.height}`,
    '--panel-ratio': size.width / size.height,
    '--panel-top': top,
  }) as CSSProperties;
