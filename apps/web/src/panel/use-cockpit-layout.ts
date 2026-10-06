import type { Aircraft } from '@cpt/core';
import { useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { chooseLayout } from './cockpit-layout';
import { footerHeight } from './fit';
import type { CockpitLayoutChoice, CockpitRegion } from './cockpit-layout';

const NO_REGION: CockpitRegion = { width: 0, height: 0 };

const pixels = (value: string) => Number.parseFloat(value) || 0;

/**
 * The space the cockpit section leaves for the cockpit: its width, and its height down to the foot
 * of the viewport less the page's bottom padding and the footer. Read from elements that stand the
 * same whichever cockpit layout is showing, so the layout rule never feeds back into its own input.
 */
export function useCockpitRegion(
  shell: RefObject<HTMLElement | null>,
  section: RefObject<HTMLElement | null>,
): CockpitRegion {
  const [region, setRegion] = useState(NO_REGION);

  useLayoutEffect(() => {
    const root = shell.current;
    const element = section.current;
    if (!root || !element) return;
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const footer = footerHeight(root);
      const body = root.querySelector('.shell-body');
      const padding = body ? pixels(getComputedStyle(body).paddingBottom) : 0;
      const next = {
        width: Math.floor(element.clientWidth),
        height: Math.floor(window.innerHeight - top - footer - padding),
      };
      setRegion((previous) =>
        previous.width === next.width && previous.height === next.height ? previous : next,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    // Whatever stacks above the cockpit moves its top as it resizes.
    for (const sibling of element.parentElement?.children ?? []) observer?.observe(sibling);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [shell, section]);

  return region;
}

/**
 * The layout the aircraft's cockpit gets in `region`, once the frame that surrounds the cockpit has
 * taken its padding and border. Tabs while no region is known.
 */
export function useCockpitLayout(
  aircraft: Aircraft,
  region: CockpitRegion | undefined,
  frame: RefObject<HTMLElement | null>,
): CockpitLayoutChoice {
  const [chrome, setChrome] = useState(NO_REGION);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const style = getComputedStyle(element);
    setChrome({
      width:
        pixels(style.paddingLeft) +
        pixels(style.paddingRight) +
        pixels(style.borderLeftWidth) +
        pixels(style.borderRightWidth),
      height:
        pixels(style.paddingTop) +
        pixels(style.paddingBottom) +
        pixels(style.borderTopWidth) +
        pixels(style.borderBottomWidth),
    });
  }, [frame]);

  return useMemo(
    () =>
      region
        ? chooseLayout(aircraft, {
            width: region.width - chrome.width,
            height: region.height - chrome.height,
          })
        : { kind: 'tabs' },
    [aircraft, region, chrome],
  );
}
