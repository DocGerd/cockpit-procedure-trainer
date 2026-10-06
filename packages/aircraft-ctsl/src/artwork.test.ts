// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readdirSync, readFileSync } from 'node:fs';
import type { Appearance, ControlDefinition, IndicatorDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { images } from './artwork';
import { controls } from './controls';
import { indicators } from './indicators';
import { deviceSlots, views } from './views';

type Artwork = Extract<Appearance, { artwork: unknown }>['artwork'];

const folder = new URL('./assets/artwork/', import.meta.url);
const shipped: string[] = readdirSync(folder)
  .filter((file: string) => file.endsWith('.svg'))
  .sort();
const licences: string = readFileSync(new URL('../LICENSES.md', import.meta.url), 'utf8');

const fileOf = (url: string) => url.slice(url.lastIndexOf('/') + 1);
const read = (url: string): string =>
  readFileSync(new URL(`./assets/artwork/${fileOf(url)}`, import.meta.url), 'utf8');
const sizeOf = (url: string) => {
  const svg = read(url);
  const width = /<svg[^>]* width="(\d+)"/.exec(svg)?.[1];
  const height = /<svg[^>]* height="(\d+)"/.exec(svg)?.[1];
  const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  return { width, height, box: box ? [box[1], box[2]] : undefined };
};

const artworkOf = (appearance: Appearance | undefined): Artwork | undefined =>
  appearance && 'artwork' in appearance ? appearance.artwork : undefined;

const controlArtwork = Object.entries(controls as Record<string, ControlDefinition>).flatMap(
  ([id, control]) => {
    const artwork = artworkOf(control.appearance);
    return artwork ? [{ id, control, artwork }] : [];
  },
);
const indicatorArtwork = Object.entries(
  indicators as Record<string, IndicatorDefinition<unknown>>,
).flatMap(([id, indicator]) => {
  const artwork = artworkOf(indicator.appearance);
  return artwork ? [{ id, indicator, artwork }] : [];
});

const urlsOf = ({ face, moving }: Artwork): string[] => [
  face,
  ...(moving.type === 'positions' ? Object.values(moving.images) : [moving.image]),
];
const used = new Set(
  [...controlArtwork, ...indicatorArtwork].flatMap(({ artwork }) => urlsOf(artwork).map(fileOf)),
);

describe('CTSL artwork files', () => {
  it('ships every file the artwork map names', () => {
    const named = Object.values(images).map(fileOf);
    expect(named.filter((file) => !shipped.includes(file))).toEqual([]);
  });

  it('declares every shipped file on a control or an indicator', () => {
    expect(shipped.filter((file) => !used.has(file))).toEqual([]);
  });

  it('carries a licence entry for every shipped file', () => {
    expect(shipped.filter((file) => !licences.includes(`\`src/assets/artwork/${file}\``))).toEqual(
      [],
    );
  });

  it('keeps a moving image the size of its face, with explicit pixel dimensions', () => {
    for (const { id, artwork } of [...controlArtwork, ...indicatorArtwork]) {
      const face = sizeOf(artwork.face);
      expect(face.width, id).toBeDefined();
      expect([face.width, face.height], id).toEqual(face.box);
      for (const url of urlsOf(artwork).slice(1)) {
        expect(sizeOf(url), `${id}: ${fileOf(url)}`).toEqual(face);
      }
    }
  });
});

describe('CTSL compass', () => {
  it('turns a full card under the lubber line, so the heading reads at the top', () => {
    const moving = indicatorArtwork.find((gauge) => gauge.id === 'compass')?.artwork.moving;
    expect(moving?.type).toBe('needle');
    if (moving?.type !== 'needle') return;
    expect(moving.valueRange).toEqual({ min: 0, max: 360 });
    expect(moving.angleRange).toEqual({ min: 0, max: -360 });
    expect(moving.pivot).toEqual({ x: 100, y: 100 });
  });

  it('turns the card so heading 090 shows E at the top', () => {
    const moving = indicatorArtwork.find((gauge) => gauge.id === 'compass')?.artwork.moving;
    if (moving?.type !== 'needle') throw new Error('the compass card turns as a needle');
    const svg = read(moving.image);
    const placed = (point: string) =>
      Number(new RegExp(String.raw`rotate\((\d+) 100 100\)">${point}</text>`).exec(svg)?.[1]);
    const cardTurn = (headingDeg: number) =>
      (headingDeg / moving.valueRange.max) * moving.angleRange.max;
    const atTop = (point: string, headingDeg: number) =>
      (((placed(point) + cardTurn(headingDeg)) % 360) + 360) % 360 === 0;
    expect(atTop('N', 360)).toBe(true);
    expect(atTop('E', 90)).toBe(true);
    expect(atTop('S', 180)).toBe(true);
    expect(atTop('W', 270)).toBe(true);
  });

  it('letters the card with the cardinal points', () => {
    const card = indicatorArtwork.find((gauge) => gauge.id === 'compass')?.artwork.moving;
    const svg = card?.type === 'needle' ? read(card.image) : '';
    for (const point of ['N', 'E', 'S', 'W']) expect(svg).toContain(`>${point}</text>`);
  });

  it('sits clear of every other placement on the panel', () => {
    const { rect } = views.panel.indicators.compass;
    const others = [
      ...Object.entries(views.panel.indicators),
      ...Object.entries(views.panel.controls),
      ['gps', deviceSlots.gps] as const,
    ].filter(([id]) => id !== 'compass');
    const clashes = others.filter(
      ([, other]) =>
        rect.x < other.rect.x + other.rect.w &&
        rect.x + rect.w > other.rect.x &&
        rect.y < other.rect.y + other.rect.h &&
        rect.y + rect.h > other.rect.y,
    );
    expect(clashes.map(([id]) => id)).toEqual([]);
  });

  it('stays between the plate seam and the GPS bay frame drawn on the panel backdrop', () => {
    const backdrop = readFileSync(
      new URL(`./assets/${fileOf(views.panel.image)}`, import.meta.url),
      'utf8',
    );
    const rects = [...backdrop.matchAll(/<rect\b([^>]*)\/>/g)].map(([, attributes = '']) => ({
      rx: /\brx="([\d.]+)"/.exec(attributes)?.[1],
      x: Number(/\bx="([\d.]+)"/.exec(attributes)?.[1]),
      width: Number(/\bwidth="([\d.]+)"/.exec(attributes)?.[1]),
    }));
    const plates = rects.filter(({ rx }) => rx === '14');
    const bays = rects.filter(({ rx }) => rx === '16');
    expect(plates, 'the left and right instrument plates').toHaveLength(2);
    expect(bays, 'the GPS bay frame').toHaveLength(1);
    const seam = Math.max(...plates.map(({ x }) => x));
    const bayLeft = bays[0]?.x ?? 0;
    const { rect } = views.panel.indicators.compass;
    expect(rect.x).toBeGreaterThan(seam);
    expect(rect.x + rect.w).toBeLessThan(bayLeft);
  });
});

describe('CTSL gauges', () => {
  const gaugeArtwork = indicatorArtwork.filter(({ id }) => id !== 'compass');

  const scales: Record<string, { min: number; max: number }> = {
    airspeed: { min: 40, max: 300 },
    tachometer: { min: 0, max: 7000 },
    oilPressure: { min: 0, max: 10 },
    oilTemperature: { min: 40, max: 150 },
    cht: { min: 40, max: 150 },
    verticalSpeed: { min: -5, max: 5 },
    altimeter: { min: 0, max: 5000 },
  };
  const sweeps: Record<string, { min: number; max: number }> = {
    verticalSpeed: { min: -225, max: 45 },
  };
  const standardSweep = { min: -135, max: 135 };

  it.each(Object.entries(scales))('draws %s as a needle over its intake scale', (id, scale) => {
    const entry = gaugeArtwork.find((gauge) => gauge.id === id);
    expect(entry, id).toBeDefined();
    const moving = entry?.artwork.moving;
    expect(moving?.type).toBe('needle');
    if (moving?.type !== 'needle') return;
    expect(moving.valueRange).toEqual(scale);
    expect(moving.angleRange).toEqual(sweeps[id] ?? standardSweep);
    expect(moving.pivot).toEqual({ x: 100, y: 100 });
  });

  it('letters each face only where the needle never sweeps', () => {
    const textTag =
      /<text x="([\d.]+)" y="([\d.]+)" font-size="(\d+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g;
    for (const { id, artwork } of gaugeArtwork) {
      const { moving } = artwork;
      if (moving.type !== 'needle') continue;
      let lettering = 0;
      for (const [, x, y, size, anchor, content] of read(artwork.face).matchAll(textTag)) {
        const [cx, cy, fontSize] = [Number(x) - 100, Number(y) - 100, Number(size)];
        if (/^\d+$/.test(content ?? '') && Math.abs(Math.hypot(cx, cy) - 46) < 3) continue;
        lettering += 1;
        const width = (content?.length ?? 0) * 0.72 * fontSize;
        const left = anchor === 'start' ? cx : cx - width / 2;
        for (const dx of [left, left + width]) {
          for (const dy of [cy - fontSize / 2, cy + fontSize / 2]) {
            const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
            const swept = [-360, 0, 360].some(
              (turn) =>
                angle + turn >= moving.angleRange.min - 3 &&
                angle + turn <= moving.angleRange.max + 3,
            );
            expect(swept, `${id}: "${content}" at ${dx.toFixed(0)},${dy.toFixed(0)}`).toBe(false);
          }
        }
      }
      expect(lettering, id).toBeGreaterThan(0);
    }
  });

  it('keeps every round gauge on drawn artwork and its full name', () => {
    expect(gaugeArtwork.map(({ id }) => id).sort()).toEqual(Object.keys(scales).sort());
    for (const { indicator } of gaugeArtwork) {
      expect(indicator.name.en.length).toBeGreaterThan(0);
      expect(indicator.name.de.length).toBeGreaterThan(0);
    }
  });
});

describe('CTSL control artwork', () => {
  it('draws a moving image for every position of a positions control', () => {
    for (const { id, control, artwork } of controlArtwork) {
      if (artwork.moving.type !== 'positions') continue;
      expect(Object.keys(artwork.moving.images).sort(), id).toEqual([...control.positions].sort());
    }
  });

  it('draws the controls the plan names', () => {
    const ids = controlArtwork.map(({ id }) => id);
    for (const id of [
      'ignition',
      'battery',
      'generator',
      'fuelValve',
      'flapSelector',
      'rescueHandle',
      'brake',
      'throttle',
      'choke',
      'trim',
    ]) {
      expect(ids, id).toContain(id);
    }
  });
});
