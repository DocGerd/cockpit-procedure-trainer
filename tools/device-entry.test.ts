import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagesDir = resolve(import.meta.dirname, '../packages');
const tokens = readFileSync(
  resolve(import.meta.dirname, '../apps/web/src/styles/tokens.css'),
  'utf8',
);
const deviceDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('device-'))
  .map((entry) => entry.name)
  .sort();

const token = (name: string): number =>
  Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(tokens)?.[1]);
const TARGET_PX = token('size-target');
const textSizes = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

const FRAME_CHROME_PX = 2 * (token('space-2') + token('space-1'));
const MIN_TEXT_PX = token('text-2xs');

// The operable Screen's natural size with the unit powered, in its widest state, measured in
// Chromium. Re-measure when a Screen's layout changes.
const NATURAL_SCREEN: Readonly<Record<string, readonly [number, number]>> = {
  com: [456, 204],
  sl40: [352, 136],
  transponder: [584, 160],
  gtx327: [400, 132],
  gpsmap496: [220, 160],
};

// Radio-sized units use the slot of the same size; demo radios (#352) take the same units.
const SLOT_OF: Readonly<Record<string, string>> = {
  com: 'com',
  sl40: 'com',
  transponder: 'xpdr',
  gtx327: 'xpdr',
  gpsmap496: 'gps',
};

// The tools project resolves no React types; components are opaque here.
type Component = (props: never) => unknown;
type Entry = {
  Screen: Component;
  Display: Component;
  readout(state: unknown, language: 'de' | 'en', on: boolean): string;
  floor: { width: number; height: number };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEntry = (value: unknown): value is Entry =>
  isRecord(value) &&
  typeof value.Screen === 'function' &&
  typeof value.Display === 'function' &&
  typeof value.readout === 'function' &&
  isRecord(value.floor);

const isDevice = (value: unknown): value is { id: string; initial: unknown } =>
  isRecord(value) && 'id' in value && 'controls' in value && 'initial' in value;

async function load(dir: string) {
  const exports: Record<string, unknown> = await import(resolve(packagesDir, dir, 'src/index.ts'));
  const entries = Object.values(exports).filter(isEntry);
  const devices = Object.values(exports).filter(isDevice);
  // Render with the device's own React, so the components and the renderer share one instance.
  const requireFrom = createRequire(resolve(packagesDir, dir, 'package.json'));
  const react = requireFrom('react') as { createElement(type: unknown, props: object): unknown };
  const server = requireFrom('react-dom/server') as { renderToStaticMarkup(node: unknown): string };
  const html = (component: Component, props: object): string =>
    server.renderToStaticMarkup(react.createElement(component, props));
  return { entries, devices, html };
}

const tagsOf = (markup: string, names: string): string[] =>
  [...markup.matchAll(new RegExp(`<(?:${names})\\b[^>]*>`, 'g'))].map(([tag]) => tag);

const fontSizes = (markup: string): string[] =>
  [...markup.matchAll(/font-size:([^;"]+)/g)].map(([, size = '']) => size);

const send = () => undefined;

const deviceCss = readFileSync(
  resolve(packagesDir, 'panel-kit/src/device-screen/device-screen.css'),
  'utf8',
);
const labelSize = /\.pk-mirror-label \{[^}]*font-size: var\(--text-(\w+)\)/.exec(deviceCss)?.[1];

const pxOfText = (name: string): number => token(`text-${name}`);

/** The mirror's natural size, from the token width and aspect ratio on its bezel. */
function mirrorSize(markup: string): { width: number; height: number } {
  const style = /class="pk-mirror-bezel" style="([^"]*)"/.exec(markup)?.[1] ?? '';
  const width = /width:calc\(var\(--([\w-]+)\) \* (\d+) \+ var\(--([\w-]+)\)\)/.exec(style) ?? [];
  const ratio = /aspect-ratio:(\d+) \/ (\d+)/.exec(style) ?? [];
  const w = token(width[1] ?? '') * Number(width[2]) + token(width[3] ?? '');
  return { width: w, height: (w * Number(ratio[2])) / Number(ratio[1]) };
}

describe('device screen entries', () => {
  it('finds the device packages and the touch-target token', () => {
    expect(deviceDirs.length).toBeGreaterThan(0);
    expect(TARGET_PX).toBeGreaterThan(0);
  });

  describe.each(deviceDirs)('%s', (dir) => {
    it('exports one entry with a Screen, a Display, a readout and a floor', async () => {
      const { entries, devices } = await load(dir);
      expect(devices.map((device) => device.id)).toEqual([dir.replace(/^device-/, '')]);
      expect(entries).toHaveLength(1);
    });

    it('declares the measured natural size of the powered Screen plus the frame as its floor', async () => {
      const [entry] = (await load(dir)).entries;
      const [width = 0, height = 0] = NATURAL_SCREEN[dir.replace(/^device-/, '')] ?? [];
      expect(entry?.floor).toEqual({
        width: width + FRAME_CHROME_PX,
        height: height + FRAME_CHROME_PX,
      });
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(TARGET_PX);
    });

    it('reads out the display in both languages, powered and off', async () => {
      const { entries, devices } = await load(dir);
      const state = devices[0]?.initial;
      const readout = entries[0]?.readout;
      if (!readout) throw new Error(`${dir} has no readout`);
      const shown = (['en', 'de'] as const).map((language) => readout(state, language, true));
      const off = (['en', 'de'] as const).map((language) => readout(state, language, false));
      for (const text of [...shown, ...off]) expect(text.trim()).not.toBe('');
      expect(shown[0]).not.toBe(shown[1]);
      expect(off[0]).not.toBe(off[1]);
    });

    it('gives every key and slider of the operable Screen a full touch target', async () => {
      const { entries, devices, html } = await load(dir);
      const Screen = entries[0]?.Screen;
      if (!Screen) throw new Error(`${dir} has no Screen`);
      const markup = html(Screen, { on: true, state: devices[0]?.initial, send });
      const keys = tagsOf(markup, 'button|input|select');
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key, key).toContain('min-height:var(--size-target)');
        if (key.startsWith('<button')) expect(key, key).toContain('min-width:var(--size-target)');
      }
    });

    it('sets the Screen text only in the type scale', async () => {
      const { entries, devices, html } = await load(dir);
      const Screen = entries[0]?.Screen;
      if (!Screen) throw new Error(`${dir} has no Screen`);
      const sizes = fontSizes(html(Screen, { on: true, state: devices[0]?.initial, send }));
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) {
        expect(size).toMatch(new RegExp(`^(var\\(--text-(${textSizes.join('|')})\\)|inherit)$`));
      }
    });

    it.each([true, false])(
      'draws a read-only Display with large lettering and a printed unit name (on: %s)',
      async (on) => {
        const { entries, devices, html } = await load(dir);
        const Display = entries[0]?.Display;
        if (!Display) throw new Error(`${dir} has no Display`);
        const markup = html(Display, { on, state: devices[0]?.initial });
        expect(tagsOf(markup, 'button|input|select|textarea|a')).toEqual([]);
        expect(markup).not.toMatch(/tabindex|<style|<script/);
        const label = /data-mirror-label[^>]*>([^<]*)</.exec(markup)?.[1] ?? '';
        expect(label).toMatch(/^[A-Z0-9]+$/);
        const sizes = fontSizes(markup);
        expect(sizes.length).toBeGreaterThan(0);
        for (const size of sizes) {
          expect(size).toMatch(new RegExp(`^(var\\(--text-(${textSizes.join('|')})\\)|inherit)$`));
        }
      },
    );
  });
});

describe('mirror lettering at the panel floor', () => {
  it('finds the bezel label size', () => {
    expect(labelSize).toBeDefined();
  });

  it.each(deviceDirs)('%s fills its slot and keeps its smallest text legible', async (dir) => {
    const id = dir.replace(/^device-/, '');
    const { entries, devices, html } = await load(dir);
    const Display = entries[0]?.Display;
    if (!Display) throw new Error(`${dir} has no Display`);
    const markup = html(Display, { on: true, state: devices[0]?.initial });
    const ctsl: {
      deviceSlots: Record<string, { rect: { w: number; h: number } }>;
      views: { panel: { size: { width: number } } };
    } = await import(resolve(packagesDir, 'aircraft-ctsl/src/views.ts'));
    const slot = ctsl.deviceSlots[SLOT_OF[id] ?? ''];
    if (!slot) throw new Error(`no slot for ${id}`);
    // The panel's narrowest width, as its cockpit declares it; slots scale with it.
    const cockpit: { cockpit: { views: { panel: { minWidth: number } } } } = await import(
      resolve(packagesDir, 'aircraft-ctsl/src/cockpit.ts')
    );
    const unit = cockpit.cockpit.views.panel.minWidth / ctsl.views.panel.size.width;
    const [slotW, slotH] = [slot.rect.w * unit, slot.rect.h * unit];
    const natural = mirrorSize(markup);
    expect(natural.width / natural.height).toBeCloseTo(slotW / slotH, 2);
    const scale = Math.min(slotW / natural.width, slotH / natural.height);
    const smallest = Math.min(
      pxOfText(labelSize ?? ''),
      ...fontSizes(markup).flatMap((size) => {
        const name = /--text-(\w+)/.exec(size)?.[1];
        return name === undefined ? [] : [pxOfText(name)];
      }),
    );
    expect(smallest * scale).toBeGreaterThanOrEqual(MIN_TEXT_PX);
  });
});

describe('the app registry', () => {
  it('carries the entry of every device package under its device id', async () => {
    const app: {
      deviceEntries: Record<string, Entry>;
      deviceRegistry: { id: string }[];
      deviceScreens: Record<string, unknown>;
    } = await import(resolve(import.meta.dirname, '../apps/web/src/device-registry.ts'));
    const ids = deviceDirs.map((dir) => dir.replace(/^device-/, '')).sort();
    expect(Object.keys(app.deviceEntries).sort()).toEqual(ids);
    expect(app.deviceRegistry.map((device) => device.id).sort()).toEqual(ids);
    for (const [id, entry] of Object.entries(app.deviceEntries)) {
      expect(isEntry(entry), id).toBe(true);
      expect(app.deviceScreens[id]).toBe(entry.Screen);
    }
  });
});
