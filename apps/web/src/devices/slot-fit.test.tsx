import type { Aircraft } from '@cpt/core';
import { DeviceDisplayFrame } from '@cpt/panel-kit';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceEntries, deviceRegistry } from '../device-registry';

const read = (path: string): string => readFileSync(resolve(import.meta.dirname, path), 'utf8');
const tokens = read('../styles/tokens.css');
const deviceCss = read('../../../../packages/panel-kit/src/device-screen/device-screen.css');

const token = (name: string): number =>
  Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(tokens)?.[1]);
const MIN_TEXT_PX = token('text-2xs');
const labelSize = /\.pk-mirror-label \{[^}]*font-size: var\(--text-(\w+)\)/.exec(deviceCss)?.[1];

/** The mirror's natural size, from the token width and aspect ratio on its bezel. */
function mirrorSize(markup: string): { width: number; height: number } {
  const style = /class="pk-mirror-bezel" style="([^"]*)"/.exec(markup)?.[1] ?? '';
  const width = /width:calc\(var\(--([\w-]+)\) \* (\d+) \+ var\(--([\w-]+)\)\)/.exec(style) ?? [];
  const ratio = /aspect-ratio:(\d+) \/ (\d+)/.exec(style) ?? [];
  const w = token(width[1] ?? '') * Number(width[2]) + token(width[3] ?? '');
  return { width: w, height: (w * Number(ratio[2])) / Number(ratio[1]) };
}

// A slot mirror is read-only and the dock holds the full-size unit, so its lettering floor is
// half the panel's: recognising the unit by its layout and proportions outranks reading its small
// print (ADR-0002).
const SLOT_FLOOR = 0.5;

// Secondary lettering prints as small as the real unit prints it: half the lettering minimum, the
// floor `SECONDARY_MIN_PX` sets for panel captions in the e2e legibility checks.
const SECONDARY_MIN_PX = MIN_TEXT_PX / 2;

/** The smallest inline type size of each lettering tier, the slot label counting as primary. */
function smallestTextPx(markup: string): { primary: number; secondary: number } {
  const primary = [token(`text-${labelSize}`)];
  const secondary: number[] = [];
  for (const [tag = ''] of markup.matchAll(/<[a-z][^>]*>/g)) {
    const tier = /\sdata-lettering="secondary"/.test(tag) ? secondary : primary;
    for (const [, name = ''] of tag.matchAll(/font-size:var\(--text-(\w+)\)/g)) {
      tier.push(token(`text-${name}`));
    }
  }
  return { primary: Math.min(...primary), secondary: Math.min(...secondary) };
}

/** Why this markup does not fit, or is illegible, in a slot of the given size. */
function markupProblems(
  where: string,
  markup: string,
  slotW: number,
  slotH: number,
  floor = 1,
): string[] {
  const natural = mirrorSize(markup);
  const smallestNatural = smallestTextPx(markup);
  const measures = [natural.width, natural.height, smallestNatural.primary, slotW, slotH];
  if (!measures.every((measure) => Number.isFinite(measure) && measure > 0)) {
    return [`${where}: unmeasurable mirror or slot`];
  }
  const problems: string[] = [];
  if (Math.abs(natural.width / natural.height - slotW / slotH) >= 0.005) {
    problems.push(
      `${where}: mirror aspect ${(natural.width / natural.height).toFixed(2)} differs from slot ${(slotW / slotH).toFixed(2)}`,
    );
  }
  const scale = Math.min(slotW / natural.width, slotH / natural.height);
  const smallest = smallestNatural.primary * scale;
  const minPx = MIN_TEXT_PX * floor;
  if (smallest < minPx) {
    problems.push(`${where}: smallest text ${smallest.toFixed(2)} px < ${minPx} px`);
  }
  const secondary = smallestNatural.secondary * scale;
  const secondaryMinPx = SECONDARY_MIN_PX * floor;
  if (secondary < secondaryMinPx) {
    problems.push(
      `${where}: smallest secondary text ${secondary.toFixed(2)} px < ${secondaryMinPx} px`,
    );
  }
  return problems;
}

/** The install's state switched on and laid over with the first phase seed that names it. */
function litState(aircraft: Aircraft, installId: string, initial: unknown): unknown {
  const seed = Object.values(aircraft.phases).find((phase) => phase.entry.deviceStates?.[installId])
    ?.entry.deviceStates?.[installId];
  return { ...(initial as object), on: true, powered: true, ...seed };
}

type Install = NonNullable<Aircraft['devices']>[string];
type MirrorRenders = { readonly dark: string; readonly lit: string };

/** The install's mirror rendered dark, as the device starts, and lit; undefined for an unregistered device. */
function mirrorRenders(
  aircraft: Aircraft,
  installId: string,
  install: Install,
): MirrorRenders | undefined {
  const device = deviceRegistry.find(({ id }) => id === install.device);
  const entry = Object.hasOwn(deviceEntries, install.device)
    ? deviceEntries[install.device]
    : undefined;
  if (!device || !entry) return undefined;
  const render = (state: unknown) =>
    renderToStaticMarkup(createElement(entry.Display, { on: true, state }));
  return {
    dark: render(device.initial),
    lit: render(litState(aircraft, installId, device.initial)),
  };
}

function mirrorMarkups(aircraft: Aircraft): (MirrorRenders & { readonly where: string })[] {
  return Object.entries(aircraft.devices ?? {}).flatMap(([installId, install]) => {
    const renders = mirrorRenders(aircraft, installId, install);
    return renders ? [{ where: `${aircraft.id}/${installId}`, ...renders }] : [];
  });
}

/** Why a device's mirror does not fit, or is illegible, in the slot of each install of the aircraft. */
function slotFitProblems(aircraft: Aircraft): string[] {
  const cockpit = aircraft.cockpit;
  if (!cockpit) return [];
  return Object.entries(aircraft.devices ?? {}).flatMap(([installId, install]) => {
    const where = `${aircraft.id}/${installId}`;
    const renders = mirrorRenders(aircraft, installId, install);
    const viewWidth = aircraft.views[install.view]?.size?.width;
    const minWidth = cockpit.views[install.view]?.minWidth;
    if (!renders || !viewWidth || !minWidth) return [`${where}: no device or view size`];

    const unit = minWidth / viewWidth;
    const slotW = install.placement.rect.w * unit;
    const slotH = install.placement.rect.h * unit;
    return [
      ...markupProblems(where, renders.dark, slotW, slotH, SLOT_FLOOR),
      ...markupProblems(`${where} (lit)`, renders.lit, slotW, slotH, SLOT_FLOOR),
    ];
  });
}

describe('the mirror in each installed slot', () => {
  it('finds the bezel label size and the minimum text size', () => {
    expect(labelSize).toBeDefined();
    expect(MIN_TEXT_PX).toBeGreaterThan(0);
  });

  it('fills its slot and keeps its smallest text legible in every registered aircraft', () => {
    const withDock = aircraftRegistry.filter((aircraft) => aircraft.cockpit);
    expect(withDock.length).toBeGreaterThan(0);
    expect(withDock.flatMap(slotFitProblems)).toEqual([]);
  });

  it('measures every CTSL mirror lit as well as dark', () => {
    const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
    if (!ctsl) throw new Error('The registry has no CTSL');
    const markups = mirrorMarkups(ctsl);
    expect(markups.map(({ where }) => where).sort()).toEqual(
      ['ctsl/com', 'ctsl/flarm', 'ctsl/gps', 'ctsl/xpdr'].sort(),
    );
    for (const { where, dark, lit } of markups) expect(lit, where).not.toBe(dark);
  });

  it('reports a mirror or slot it cannot measure instead of passing it', () => {
    expect(markupProblems('x', '<div></div>', 100, 100).join('\n')).toContain('unmeasurable');
    expect(markupProblems('x', '<div></div>', Number.NaN, 100).join('\n')).toContain(
      'unmeasurable',
    );
  });

  describe('the lettering tiers of a test-local mirror', () => {
    const MIRROR = 'width:calc(var(--space-12) * 5 + var(--space-8));aspect-ratio:1 / 1';
    const natural = token('space-12') * 5 + token('space-8');
    const span = (size: string, secondary: boolean) =>
      `<span${secondary ? ' data-lettering="secondary"' : ''} style="font-size:var(--text-${size})">x</span>`;
    const markup = (...spans: string[]) =>
      `<div class="pk-mirror-bezel" style="${MIRROR}">${spans.join('')}</div>`;
    /** The slot side at which `size` px of natural type renders at `px`. */
    const slotFor = (px: number, size: number) => (natural * px) / size;
    const label = token(`text-${labelSize}`);

    // The smallest size renders between half the minimum and the minimum.
    const between = slotFor(MIN_TEXT_PX * 0.6, token('text-2xs'));

    it('holds a secondary caption to half the minimum only', () => {
      const side = between;
      expect(markupProblems('x', markup(span('2xs', true)), side, side)).toEqual([]);
      expect(markupProblems('x', markup(span('2xs', false)), side, side).join('\n')).toContain(
        'smallest text',
      );
    });

    it('reports a secondary caption below half the minimum', () => {
      const side = slotFor(SECONDARY_MIN_PX * 0.95, token('text-2xs'));
      expect(side).toBeGreaterThan(slotFor(MIN_TEXT_PX, label));
      expect(markupProblems('x', markup(span('2xs', true)), side, side)).toEqual([
        expect.stringContaining('smallest secondary text'),
      ]);
    });

    it('reports a primary value below the full minimum beside a legible secondary caption', () => {
      const side = slotFor(MIN_TEXT_PX * 0.95, token('text-md'));
      const problems = markupProblems(
        'x',
        markup(span('md', false), span('2xs', true)),
        side,
        side,
      );
      expect(problems).toEqual([expect.stringContaining('smallest text')]);
    });

    it('measures an own-face mirror by the same bezel and label hooks', () => {
      const own = renderToStaticMarkup(
        <DeviceDisplayFrame
          on
          size={{ width: 'calc(var(--space-12) * 5 + var(--space-8))', aspectRatio: '1 / 1' }}
          label="COM"
          face="own"
          labelAt={{ left: 0.055, top: 0.5, vertical: true }}
        >
          <span data-lettering="secondary" style={{ fontSize: 'var(--text-2xs)' }}>
            MEM
          </span>
        </DeviceDisplayFrame>,
      );
      expect(mirrorSize(own)).toEqual({ width: natural, height: natural });
      expect(markupProblems('x', own, between, between)).toEqual([]);
      const tooSmall = slotFor(SECONDARY_MIN_PX * 0.95, token('text-2xs'));
      expect(markupProblems('x', own, tooSmall, tooSmall)).toEqual([
        expect.stringContaining('smallest secondary text'),
      ]);
    });

    it('reads the tier from the tag that carries it, in either attribute order', () => {
      const side = between;
      const reordered =
        '<span style="font-size:var(--text-2xs)" data-lettering="secondary">x</span>';
      expect(markupProblems('x', markup(reordered), side, side)).toEqual([]);
    });
  });

  describe('a test-local aircraft with a mismatched slot', () => {
    const base = aircraftRegistry.find((aircraft) => aircraft.cockpit && aircraft.devices);
    if (!base?.devices) throw new Error('no aircraft installs a device');
    const [installId, install] = Object.entries(base.devices)[0] ?? [];
    if (!installId || !install) throw new Error('no install');
    const { w, h } = install.placement.rect;
    const withSize = (width: number, height: number): Aircraft => ({
      ...base,
      devices: {
        [installId]: {
          ...install,
          placement: {
            ...install.placement,
            rect: { ...install.placement.rect, w: width, h: height },
          },
        },
      },
    });

    it('accepts the real slot', () => {
      expect(slotFitProblems(withSize(w, h))).toEqual([]);
    });

    it('reports a slot of the wrong aspect', () => {
      expect(slotFitProblems(withSize(w, h * 2)).join('\n')).toContain('aspect');
    });

    it('reports a slot too small for the lettering', () => {
      expect(slotFitProblems(withSize(w / 4, h / 4)).join('\n')).toContain('smallest text');
    });
  });
});
