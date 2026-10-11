import type { Aircraft } from '@cpt/core';
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

const smallestTextPx = (markup: string): number =>
  Math.min(
    token(`text-${labelSize}`),
    ...[...markup.matchAll(/font-size:var\(--text-(\w+)\)/g)].map(([, name = '']) =>
      token(`text-${name}`),
    ),
  );

/** Why this markup does not fit, or is illegible, in a slot of the given size. */
function markupProblems(where: string, markup: string, slotW: number, slotH: number): string[] {
  const natural = mirrorSize(markup);
  const smallestNatural = smallestTextPx(markup);
  const measures = [natural.width, natural.height, smallestNatural, slotW, slotH];
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
  const smallest = smallestNatural * scale;
  if (smallest < MIN_TEXT_PX) {
    problems.push(`${where}: smallest text ${smallest.toFixed(2)} px < ${MIN_TEXT_PX} px`);
  }
  return problems;
}

/** The install's state switched on and laid over with the first phase seed that names it. */
function litState(aircraft: Aircraft, installId: string, initial: unknown): unknown {
  const seed = Object.values(aircraft.phases).find((phase) => phase.entry.deviceStates?.[installId])
    ?.entry.deviceStates?.[installId];
  return { ...(initial as object), on: true, powered: true, ...seed };
}

/** The mirror's markup in each install of the aircraft, dark as the device starts and lit. */
function mirrorMarkups(aircraft: Aircraft) {
  return Object.entries(aircraft.devices ?? {}).flatMap(([installId, install]) => {
    const device = deviceRegistry.find(({ id }) => id === install.device);
    const entry = Object.hasOwn(deviceEntries, install.device)
      ? deviceEntries[install.device]
      : undefined;
    if (!device || !entry) return [];
    const render = (state: unknown) =>
      renderToStaticMarkup(createElement(entry.Display, { on: true, state }));
    return [
      {
        where: `${aircraft.id}/${installId}`,
        dark: render(device.initial),
        lit: render(litState(aircraft, installId, device.initial)),
      },
    ];
  });
}

/** Why a device's mirror does not fit, or is illegible, in the slot of each install of the aircraft. */
function slotFitProblems(aircraft: Aircraft): string[] {
  const cockpit = aircraft.cockpit;
  if (!cockpit) return [];
  return Object.entries(aircraft.devices ?? {}).flatMap(([installId, install]) => {
    const where = `${aircraft.id}/${installId}`;
    const device = deviceRegistry.find(({ id }) => id === install.device);
    const entry = Object.hasOwn(deviceEntries, install.device)
      ? deviceEntries[install.device]
      : undefined;
    const viewWidth = aircraft.views[install.view]?.size?.width;
    const minWidth = cockpit.views[install.view]?.minWidth;
    if (!device || !entry || !viewWidth || !minWidth) return [`${where}: no device or view size`];

    const unit = minWidth / viewWidth;
    const slotW = install.placement.rect.w * unit;
    const slotH = install.placement.rect.h * unit;
    const lit = litState(aircraft, installId, device.initial);
    return [
      ['', device.initial],
      [' (lit)', lit],
    ].flatMap(([suffix, state]) =>
      markupProblems(
        `${where}${String(suffix)}`,
        renderToStaticMarkup(createElement(entry.Display, { on: true, state })),
        slotW,
        slotH,
      ),
    );
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
      expect(slotFitProblems(withSize(w / 2, h / 2)).join('\n')).toContain('smallest text');
    });
  });
});
