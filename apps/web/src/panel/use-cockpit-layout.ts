import type { Aircraft } from '@cpt/core';
import { useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { chooseLayout, outsideViewFold } from './cockpit-layout';
import { footerHeight } from './fit';
import type {
  CockpitLayoutChoice,
  CockpitRegion,
  OutsideFold,
  OutsideStrip,
} from './cockpit-layout';

const NO_REGION: CockpitRegion = { width: 0, height: 0 };

/** The cockpit region the unfolded outside-view strip leaves, with that strip's measures. */
export type CockpitMeasure = CockpitRegion & { readonly strip?: OutsideStrip };

const TABS: CockpitLayoutChoice = { kind: 'tabs' };

const pixels = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;

/**
 * The space the cockpit section leaves for the cockpit: its width, and its height down to the foot
 * of the viewport less the page's bottom padding and the footer. Read from elements that stand the
 * same whichever cockpit layout is showing, and as if the outside-view strip were unfolded, so the
 * layout rule never feeds back into its own input.
 */
export function useCockpitRegion(
  shell: RefObject<HTMLElement | null>,
  section: RefObject<HTMLElement | null>,
  outside: RefObject<HTMLElement | null>,
): CockpitMeasure {
  const [region, setRegion] = useState<CockpitMeasure>(NO_REGION);

  useLayoutEffect(() => {
    const root = shell.current;
    const element = section.current;
    const strip = outside.current;
    if (!root || !element || !strip) return;
    const measure = () => {
      const style = getComputedStyle(strip);
      // Rounded up: a fractional strip rounded down measures short of its real height.
      const natural = Math.ceil(
        (strip.firstElementChild?.getBoundingClientRect().height ?? 0) +
          strip.offsetHeight -
          strip.clientHeight,
      );
      // How much of the room above the cockpit section the strip has given up by folding or hiding.
      const folded = natural - strip.getBoundingClientRect().height - pixels(style.marginBottom);
      const top = element.getBoundingClientRect().top + window.scrollY + folded;
      const footer = footerHeight(root);
      const body = root.querySelector('.shell-body');
      const padding = body ? pixels(getComputedStyle(body).paddingBottom) : 0;
      const next: CockpitMeasure = {
        width: Math.floor(element.clientWidth),
        height: Math.floor(window.innerHeight - top - footer - padding),
        strip: {
          natural,
          min: pixels(style.getPropertyValue('--outside-view-band-min')),
          pull: pixels(style.getPropertyValue('--outside-view-pull')),
          gap: pixels(
            strip.parentElement ? getComputedStyle(strip.parentElement).rowGap : undefined,
          ),
        },
      };
      setRegion((previous) =>
        previous.width === next.width &&
        previous.height === next.height &&
        previous.strip?.natural === natural &&
        previous.strip.min === next.strip?.min &&
        previous.strip.pull === next.strip?.pull &&
        previous.strip.gap === next.strip?.gap
          ? previous
          : next,
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
  }, [shell, section, outside]);

  return region;
}

/**
 * The layout the aircraft's cockpit gets in `region`, once the frame that surrounds the cockpit has
 * taken its padding and border, and how the outside-view strip gives up room for it, if it does.
 * Tabs while no region is known.
 */
export function useCockpitLayout(
  aircraft: Aircraft,
  region: CockpitMeasure | undefined,
  frame: RefObject<HTMLElement | null>,
): { readonly layout: CockpitLayoutChoice; readonly fold: OutsideFold | undefined } {
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

  return useMemo(() => {
    if (!region) return { layout: TABS, fold: undefined };
    const room = { width: region.width - chrome.width, height: region.height - chrome.height };
    const fold = region.strip && outsideViewFold(aircraft, room, region.strip);
    return {
      layout: chooseLayout(aircraft, { ...room, height: room.height + (fold?.gain ?? 0) }),
      fold,
    };
  }, [aircraft, region, chrome]);
}
