import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { ImageSize } from './rects';

/**
 * What the stage's contain-fit takes from the viewport: the stage's page offset, the footer's
 * height and the height of the dock that sits below the tab panel.
 */
export interface PageFit {
  top: number;
  footer: number;
  dock: number;
}

const NO_FIT: PageFit = { top: 0, footer: 0, dock: 0 };

/** The height of the footer within `root`, or 0 when it has none. */
export const footerHeight = (root: ParentNode | null | undefined) =>
  root?.querySelector('footer')?.getBoundingClientRect().height ?? 0;

/** The in-flow dock and the space above it, or 0 when `root` has none (a placed dock is out of flow). */
const dockHeight = (root: ParentNode | null | undefined) => {
  const dock = root?.querySelector('.dock:not([data-placed])');
  if (!dock) return 0;
  const { top, bottom } = dock.getBoundingClientRect();
  const above = dock.previousElementSibling?.getBoundingClientRect().bottom ?? top;
  return bottom - above;
};

/** The element's distance from the top of the page and the footer's height, kept current as the page changes. */
export function usePageFit(ref: RefObject<HTMLElement | null>): PageFit {
  const [fit, setFit] = useState(NO_FIT);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shell = element.closest('.shell');
    const measure = () => {
      const next = {
        top: Math.round(element.getBoundingClientRect().top + window.scrollY),
        footer: Math.ceil(footerHeight(shell)),
        dock: Math.ceil(dockHeight(shell)),
      };
      setFit((previous) =>
        previous.top === next.top && previous.footer === next.footer && previous.dock === next.dock
          ? previous
          : next,
      );
      const footer = shell?.querySelector('footer') ?? undefined;
      if (footer !== watched) {
        if (watched) observer?.unobserve(watched);
        if (footer) observer?.observe(footer);
        watched = footer;
      }
    };
    let watched: Element | undefined;
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [ref]);

  return fit;
}

/** Inputs of the stage's contain-fit in `panel.css`. */
export const fitStyle = (size: ImageSize, { top, footer, dock }: PageFit) =>
  ({
    aspectRatio: `${size.width} / ${size.height}`,
    '--panel-ratio': size.width / size.height,
    '--panel-top': top,
    '--panel-footer': footer,
    '--panel-dock': dock,
  }) as CSSProperties;

/** Inputs of the stage's contain-fit inside a cockpit cell, in `panel.css`. */
export const cellFitStyle = (size: ImageSize, cellHeight: number) =>
  ({
    aspectRatio: `${size.width} / ${size.height}`,
    '--panel-ratio': size.width / size.height,
    '--cell-height': cellHeight,
  }) as CSSProperties;
