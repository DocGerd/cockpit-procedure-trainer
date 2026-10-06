import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { ImageSize } from './rects';

/** What the stage's contain-fit takes from the viewport: the stage's page offset and the footer's height. */
export interface PageFit {
  top: number;
  footer: number;
}

const NO_FIT: PageFit = { top: 0, footer: 0 };

/** The element's distance from the top of the page and the footer's height, kept current as the page changes. */
export function usePageFit(ref: RefObject<HTMLElement | null>): PageFit {
  const [fit, setFit] = useState(NO_FIT);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const footer = document.querySelector('footer');
    const measure = () => {
      const next = {
        top: Math.round(element.getBoundingClientRect().top + window.scrollY),
        footer: Math.ceil(footer?.getBoundingClientRect().height ?? 0),
      };
      setFit((previous) =>
        previous.top === next.top && previous.footer === next.footer ? previous : next,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    if (footer) observer?.observe(footer);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [ref]);

  return fit;
}

/** Inputs of the stage's contain-fit in `panel.css`. */
export const fitStyle = (size: ImageSize, { top, footer }: PageFit) =>
  ({
    aspectRatio: `${size.width} / ${size.height}`,
    '--panel-ratio': size.width / size.height,
    '--panel-top': top,
    '--panel-footer': footer,
  }) as CSSProperties;

/** Inputs of the stage's contain-fit inside a cockpit cell, in `panel.css`. */
export const cellFitStyle = (size: ImageSize, cellHeight: number) =>
  ({
    aspectRatio: `${size.width} / ${size.height}`,
    '--panel-ratio': size.width / size.height,
    '--cell-height': cellHeight,
  }) as CSSProperties;
