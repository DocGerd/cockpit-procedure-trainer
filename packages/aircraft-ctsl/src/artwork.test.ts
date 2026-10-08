// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readdirSync, readFileSync } from 'node:fs';
import { validateAircraft } from '@cpt/core';
import type { Appearance, ControlDefinition, IndicatorDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { images } from './artwork';
import { ctslAircraft } from './index';
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

const urlsOf = ({ face, moving, glass, guardOpen }: Artwork): string[] => [
  face,
  ...(moving.type === 'positions' ? Object.values(moving.images) : [moving.image]),
  ...(glass === undefined ? [] : [glass]),
  ...Object.values(guardOpen ?? {}),
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

  it('keeps every moving and glass image the size of its face, with explicit pixel dimensions', () => {
    for (const { id, artwork } of [...controlArtwork, ...indicatorArtwork]) {
      const face = sizeOf(artwork.face);
      expect(face.width, id).toBeDefined();
      expect([face.width, face.height], id).toEqual(face.box);
      for (const url of urlsOf(artwork).slice(1)) {
        expect(sizeOf(url), `${id}: ${fileOf(url)}`).toEqual(face);
      }
    }
  });

  it('passes the validator glass size check with sizes read from the files', () => {
    const imageSize = (url: string) => {
      if (!shipped.includes(fileOf(url))) return undefined;
      const { width, height } = sizeOf(url);
      return { width: Number(width), height: Number(height) };
    };
    const findings = validateAircraft(ctslAircraft, { imageSize });
    expect(findings.filter(({ code }) => code === 'artwork-glass-size')).toEqual([]);
  });
});

describe('CTSL rescue handle safety pin', () => {
  const rescue = () => controlArtwork.find(({ id }) => id === 'rescueHandle')?.artwork;
  const pinMarks = (url: string) => read(url).match(/data-pin=""/g)?.length ?? 0;

  it('draws the pin in the stowed image and in no other', () => {
    const artwork = rescue();
    if (artwork?.moving.type !== 'positions') throw new Error('the rescue handle has positions');
    expect(pinMarks(artwork.moving.images.stowed ?? '')).toBeGreaterThan(0);
    expect(pinMarks(artwork.moving.images.pulled ?? '')).toBe(0);
  });

  it('swaps in a stowed image without the pin while the guard is open', () => {
    const artwork = rescue();
    const open = artwork?.guardOpen?.stowed;
    if (artwork?.moving.type !== 'positions' || open === undefined) {
      throw new Error('the rescue handle has an open-guard image for stowed');
    }
    expect(Object.keys(artwork.guardOpen ?? {})).toEqual(['stowed']);
    expect(pinMarks(open)).toBe(0);
    expect(open).not.toBe(artwork.moving.images.stowed);
  });
});

describe('CTSL compass', () => {
  const compassArtwork = () => {
    const artwork = indicatorArtwork.find((gauge) => gauge.id === 'compass')?.artwork;
    if (artwork?.moving.type !== 'needle') throw new Error('the compass card turns as a needle');
    return { ...artwork, moving: artwork.moving };
  };
  const placedOnCard = (point: string) =>
    Number(
      new RegExp(String.raw`rotate\((\d+) 100 100\)">${point}</text>`).exec(
        read(compassArtwork().moving.image),
      )?.[1],
    );

  it('turns the full card clockwise under the lubber line, so it slides right as the heading increases', () => {
    const { moving } = compassArtwork();
    expect(moving.valueRange).toEqual({ min: 0, max: 360 });
    expect(moving.angleRange).toEqual({ min: 0, max: 360 });
    expect(moving.pivot).toEqual({ x: 100, y: 100 });
  });

  it('turns the card so heading 090 shows E at the top', () => {
    const { moving } = compassArtwork();
    const cardTurn = (headingDeg: number) =>
      (headingDeg / moving.valueRange.max) * moving.angleRange.max;
    const atTop = (point: string, headingDeg: number) =>
      (((placedOnCard(point) + cardTurn(headingDeg)) % 360) + 360) % 360 === 0;
    expect(atTop('N', 360)).toBe(true);
    expect(atTop('E', 90)).toBe(true);
    expect(atTop('S', 180)).toBe(true);
    expect(atTop('W', 270)).toBe(true);
  });

  it('prints a reversed card: the numbers increase to the left of the lubber line', () => {
    expect(placedOnCard('3')).toBe(330);
    expect(placedOnCard('E')).toBe(270);
    expect(placedOnCard('33')).toBe(30);
  });

  it('shows the card only through a window at the top of an opaque housing', () => {
    const { glass } = compassArtwork();
    if (glass === undefined) throw new Error('the compass housing is drawn as its glass');
    const window = /<path\b[^>]*data-window=""[^>]*\bd="M([\d.]+) ([\d.]+)/.exec(read(glass));
    expect(window, 'a path marked data-window in the housing').not.toBeNull();
    expect(Number(window?.[2])).toBeLessThan(100);
  });

  it('is no larger than the vertical speed indicator', () => {
    const compass = views.panel.indicators.compass.rect;
    const vsi = views.panel.indicators.verticalSpeed.rect;
    expect(compass.w).toBeLessThanOrEqual(vsi.w);
    expect(compass.h).toBeLessThanOrEqual(vsi.h);
  });

  it('sits at the top left of the right field, above the leftmost engine gauge', () => {
    const { rect } = views.panel.indicators.compass;
    const tachometer = views.panel.indicators.tachometer.rect;
    expect(rect.y + rect.h).toBeLessThan(tachometer.y);
    expect(rect.x + rect.w / 2).toBeGreaterThan(tachometer.x);
    expect(rect.x + rect.w / 2).toBeLessThan(tachometer.x + tachometer.w);
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

describe('CTSL warning lamps', () => {
  const chargeLamp = () => {
    const artwork = indicatorArtwork.find((lamp) => lamp.id === 'chargeLamp')?.artwork;
    if (artwork?.moving.type !== 'positions')
      throw new Error('the charge lamp draws one lens per state');
    return { ...artwork, moving: artwork.moving };
  };
  const bezelRadius = (svg: string) =>
    Number(/<circle\b[^>]*data-bezel=""[^>]*\br="([\d.]+)"/.exec(svg)?.[1]);

  it('draws the charge lamp lens unlit and lit', () => {
    expect(Object.keys(chargeLamp().moving.images).sort()).toEqual(['false', 'true']);
  });

  it('draws the charge lamp round, with no rectangular part', () => {
    const { face, moving } = chargeLamp();
    for (const url of [face, ...Object.values(moving.images)]) {
      expect(read(url), fileOf(url)).not.toMatch(/<rect\b/);
    }
    expect(bezelRadius(read(face))).toBeGreaterThan(0);
  });

  it('prints a legend on the charge lamp that the second lamp does not carry', () => {
    const { face, lettering } = chargeLamp();
    expect(lettering).toEqual(['CHARGE']);
    expect(read(face)).toContain('>CHARGE</text>');
    const panel = readFileSync(
      new URL(`./assets/${fileOf(views.panel.image)}`, import.meta.url),
      'utf8',
    );
    expect(panel).not.toContain('>CHARGE</text>');
  });

  it('draws both warning lamps round at the same size', () => {
    const { face } = chargeLamp();
    const faceWidth = Number(sizeOf(face).width);
    const { rect } = views.panel.indicators.chargeLamp;
    const panel = readFileSync(
      new URL(`./assets/${fileOf(views.panel.image)}`, import.meta.url),
      'utf8',
    );
    const second = bezelRadius(panel);
    expect(second).toBeGreaterThan(0);
    expect((bezelRadius(read(face)) * rect.w) / faceWidth).toBeCloseTo(second, 0);
  });
});

describe('CTSL gauges', () => {
  const gaugeArtwork = indicatorArtwork.filter(
    ({ id, artwork }) => id !== 'compass' && artwork.moving.type === 'needle',
  );

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

  describe('rocker switches', () => {
    // The lit paddle (the rect filled with gradient #b) marks the selected side, which is how a pilot
    // reads the panel (#464); the dark half is the empty side. Moving it off the active legend inverts the switch.
    const legendY = (face: string, legend: 'ON' | 'OFF') =>
      Number(
        new RegExp(String.raw`<text\b[^>]* y="([\d.]+)"[^>]*>${legend}</text>`).exec(face)?.[1],
      );
    const paddleCentreY = (image: string) => {
      const paddles = [...image.matchAll(/<rect\b[^>]*>/g)].filter(([rect]) =>
        rect.includes('fill="url(#b)"'),
      );
      expect(paddles, 'one paddle rect filled with the paddle gradient').toHaveLength(1);
      const rect = paddles[0]?.[0] ?? '';
      const y = Number(/\by="([\d.]+)"/.exec(rect)?.[1]);
      return y + Number(/\bheight="([\d.]+)"/.exec(rect)?.[1]) / 2;
    };
    const rockers = controlArtwork.filter(
      ({ artwork }) =>
        artwork.moving.type === 'positions' &&
        Object.keys(artwork.moving.images).sort().join() === 'off,on',
    );

    it('covers the five light rockers and the avionics master', () => {
      expect(rockers.map(({ id }) => id).sort()).toEqual(
        [
          'avionicsMaster',
          'beacon',
          'cockpitLight',
          'intercom',
          'landingLight',
          'positionLights',
        ].sort(),
      );
    });

    it.each(['on', 'off'] as const)(
      'draws the paddle beside the legend of the %s position',
      (state) => {
        for (const { id, artwork } of rockers) {
          if (artwork.moving.type !== 'positions') continue;
          const image = artwork.moving.images[state];
          if (image === undefined) throw new Error(`${id} has no ${state} image`);
          const face = read(artwork.face);
          const [on, off] = [legendY(face, 'ON'), legendY(face, 'OFF')];
          expect(on, `${id}: ON legend`).toBeLessThan(off);
          const centre = paddleCentreY(read(image));
          const nearest = Math.abs(centre - on) < Math.abs(centre - off) ? 'on' : 'off';
          expect(nearest, `${id}: ${fileOf(image)}`).toBe(state);
        }
      },
    );
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

describe('CTSL console levers (intake §3.4)', () => {
  // The console is drawn as the left seat sees its flank: forward, toward the centre column and the
  // nose, is to the left, and a lever pulled toward the pilot moves right.
  const travelOf = (id: 'brake' | 'throttle' | 'choke') => {
    const { moving } = controlArtwork.find((entry) => entry.id === id)?.artwork ?? {};
    if (moving?.type !== 'travel') throw new Error(`${id} slides along a travel path`);
    return moving.path;
  };
  const xOf = (svg: string, legend: string) =>
    Number(new RegExp(String.raw`<text x="([\d.]+)"[^>]*>${legend}</text>`).exec(svg)?.[1]);

  it.each(['brake', 'throttle', 'choke'] as const)('slides %s horizontally', (id) => {
    const path = travelOf(id);
    const [first, last] = [path[0], path[path.length - 1]];
    expect(first?.y).toBe(last?.y);
    expect(first?.x).not.toBe(last?.x);
  });

  it('pushes the throttle forward, to the left, for full power', () => {
    const path = travelOf('throttle');
    expect(path[path.length - 1]?.x).toBeLessThan(path[0]?.x ?? 0);
    const face = read(controlArtwork.find(({ id }) => id === 'throttle')?.artwork.face ?? '');
    expect(xOf(face, 'FULL')).toBeLessThan(xOf(face, 'IDLE'));
  });

  it.each(['brake', 'choke'] as const)('pulls %s aft, to the right, to ON', (id) => {
    const path = travelOf(id);
    expect(path[1]?.x).toBeGreaterThan(path[0]?.x ?? 0);
    const face = read(controlArtwork.find((entry) => entry.id === id)?.artwork.face ?? '');
    expect(xOf(face, 'ON')).toBeGreaterThan(xOf(face, 'OFF'));
  });

  describe('trim wheel', () => {
    const artwork = controlArtwork.find(({ id }) => id === 'trim')?.artwork;
    const images = artwork?.moving.type === 'positions' ? artwork.moving.images : {};
    const pointerX = (position: string) =>
      Number(
        /<path\b[^>]*data-pointer=""[^>]*\bd="M([\d.]+)/.exec(read(images[position] ?? ''))?.[1],
      );
    const wheel = (position: string) =>
      /<path\b[^>]*data-wheel=""[^>]*\bd="([^"]+)"/.exec(read(images[position] ?? ''))?.[1];

    it('turns a wheel and moves a separate indicator for each position', () => {
      expect(Object.keys(images).sort()).toEqual(['neutral', 'nose-down', 'nose-up']);
      const turned = ['nose-down', 'neutral', 'nose-up'].map(wheel);
      expect(turned.every((ribs) => ribs !== undefined)).toBe(true);
      expect(new Set(turned).size).toBe(3);
    });

    it('shows nose down forward, to the left, on the indicator', () => {
      expect(pointerX('nose-down')).toBeLessThan(pointerX('neutral'));
      expect(pointerX('neutral')).toBeLessThan(pointerX('nose-up'));
      const face = read(artwork?.face ?? '');
      expect(xOf(face, 'DOWN')).toBeLessThan(xOf(face, 'UP'));
    });
  });
});

describe('CTSL view backdrops', () => {
  const backdrop = (id: 'panel' | 'centre' | 'console' | 'bulkhead'): string =>
    readFileSync(new URL(`./assets/${fileOf(views[id].image)}`, import.meta.url), 'utf8');
  const count = (svg: string, pattern: RegExp) => [...svg.matchAll(pattern)].length;
  const lettering = (svg: string) =>
    [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(
      ([, attributes = '', text]) =>
        `${text}@${/\bx="([\d.]+)"/.exec(attributes)?.[1]},${/\by="([\d.]+)"/.exec(attributes)?.[1]}/${/font-size="([\d.]+)"/.exec(attributes)?.[1]}`,
    );

  it.each(['panel', 'centre', 'console', 'bulkhead'] as const)(
    'uses at most one filter on %s',
    (id) => {
      const svg = backdrop(id);
      expect(count(svg, /<feTurbulence\b/g)).toBeLessThanOrEqual(1);
      expect(count(svg, /filter=["']url\(/g)).toBeLessThanOrEqual(1);
    },
  );

  it.each(['panel', 'centre', 'console', 'bulkhead'] as const)(
    'paints %s with a stipple texture',
    (id) => {
      const svg = backdrop(id);
      expect(count(svg, /<feTurbulence\b/g)).toBe(1);
      expect(svg).toMatch(/<pattern\b[^>]*>(?:(?!<\/pattern>).)*filter="url\(/s);
    },
  );

  it("heads the breaker block in the panel's own wording", () => {
    const { x, y } = views.panel.controls.comBreaker.rect;
    const header = [...backdrop('panel').matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)</g)]
      .filter(([, textX, textY]) => Number(textX) > x && Number(textY) <= y)
      .map(([, , , content]) => content);
    expect(header.join(' ')).toBe('Circuit Breakers - Push off');
  });

  it.each(['panel', 'centre', 'console', 'bulkhead'] as const)(
    'keeps the %s lettering in place',
    (id) => {
      const expected = {
        panel: [
          'TAKE@90,92/30',
          'OFF@90,130/30',
          'LIMITS@90,292/30',
          'COM RADIO@450,449/40',
          'TRANSPONDER@450,609/40',
          'GPS@1368,204/40',
          'Circuit Breakers -@1736,72/30',
          'Push off@1736,106/30',
        ],
        centre: [
          'AVIONICS OFF TO START AND STOP@570,272/29',
          '12 V@120,378/29',
          'INTERCOM@590,384/29',
          'AUDIO@945,384/29',
          'FLAPS@700,550/29',
          'HEADSET@1080,490/29',
          'IGNITION@223,886/29',
          'BAT@930,658/29',
          'GEN@1090,658/29',
          'OPEN@150,434/29',
          'FUEL@150,494/29',
          'VALVE@150,528/29',
          'CLOSED@150,598/29',
        ],
        console: [],
        bulkhead: [],
      }[id];
      expect(lettering(backdrop(id))).toEqual(expected);
    },
  );
});
