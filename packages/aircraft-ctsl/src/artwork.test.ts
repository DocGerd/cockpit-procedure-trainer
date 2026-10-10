// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readdirSync, readFileSync } from 'node:fs';
import { validateAircraft } from '@cpt/core';
import type { Appearance, ControlDefinition, IndicatorDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { gaugeArtwork as gauges, images } from './artwork';
import { ctslAircraft } from './index';
import { controls } from './controls';
import { indicators } from './indicators';
import { views } from './views';

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

  it('flags the pin with a red tag drawn only with the pin', () => {
    const artwork = rescue();
    if (artwork?.moving.type !== 'positions') throw new Error('the rescue handle has positions');
    const stowed = read(artwork.moving.images.stowed ?? '');
    expect(stowed).toMatch(/<rect\b[^>]*data-pin=""[^>]*fill="url\(#fr\)"/);
    expect(read(artwork.guardOpen?.stowed ?? '')).not.toContain('url(#fr)');
  });

  it('prints only the parachute label on the face, not RESCUE or PULL HARD', () => {
    const artwork = rescue();
    const inked = [
      ...read(artwork?.face ?? '').matchAll(/<text\b(?![^>]*data-decor)[^>]*>([^<]*)<\/text>/g),
    ];
    expect(inked.map(([, text]) => text)).toEqual(['Parachute']);
  });

  // The console is a top view with forward up; the open guard takes the top of the placement.
  const OPEN_GUARD_SHARE = 0.4;
  const gripY = (url: string) =>
    Number(/<rect\b[^>]*data-grip=""[^>]*\by="([\d.]+)"/.exec(read(url))?.[1] ?? Number.NaN);

  it('slides the grip forward, up the top view, when pulled (§9 q26)', () => {
    const artwork = rescue();
    if (artwork?.moving.type !== 'positions') throw new Error('the rescue handle has positions');
    const { stowed = '', pulled = '' } = artwork.moving.images;
    expect(gripY(pulled)).toBeLessThan(gripY(stowed));
    expect(gripY(artwork.guardOpen?.stowed ?? '')).toBe(gripY(stowed));
  });

  it('keeps the stowed grip where the open handle takes a tap, the pin where the guard does', () => {
    const artwork = rescue();
    if (artwork?.moving.type !== 'positions') throw new Error('the rescue handle has positions');
    const stowed = artwork.moving.images.stowed ?? '';
    const height = Number(sizeOf(stowed).height);
    expect(gripY(stowed)).toBeGreaterThanOrEqual(height * OPEN_GUARD_SHARE);
    const pinYs = [...read(stowed).matchAll(/<[^>]*data-pin=""[^>]*>/g)].flatMap(([tag]) =>
      [...tag.matchAll(/\b(?:cy|y)="([\d.]+)"/g)].map(([, y]) => Number(y)),
    );
    expect(pinYs.length).toBeGreaterThan(0);
    pinYs.forEach((y) => expect(y).toBeLessThan(height * OPEN_GUARD_SHARE));
  });
});

describe('CTSL warning lamp', () => {
  const generatorLamp = () => {
    const artwork = indicatorArtwork.find((lamp) => lamp.id === 'chargeLamp')?.artwork;
    if (artwork?.moving.type !== 'positions')
      throw new Error('the generator lamp draws one lens per state');
    return { ...artwork, moving: artwork.moving };
  };
  const bezelCentreY = (svg: string) =>
    Number(/<circle\b[^>]*data-bezel=""[^>]*\bcy="([\d.]+)"/.exec(svg)?.[1]);
  const panel = () =>
    readFileSync(new URL(`./assets/${fileOf(views.panel.image)}`, import.meta.url), 'utf8');

  it('draws the generator lamp lens unlit and lit', () => {
    expect(Object.keys(generatorLamp().moving.images).sort()).toEqual(['false', 'true']);
  });

  it('draws the generator lamp round, with no rectangular part', () => {
    const { face, moving } = generatorLamp();
    for (const url of [face, ...Object.values(moving.images)]) {
      expect(read(url), fileOf(url)).not.toMatch(/<rect\b/);
    }
    expect(bezelCentreY(read(face))).toBeGreaterThan(0);
  });

  it('prints the legend Generator above the lens', () => {
    const { face, lettering } = generatorLamp();
    expect(lettering).toEqual(['Generator']);
    const legendY = Number(
      /<text\b[^>]* y="([\d.]+)"[^>]*>Generator<\/text>/.exec(read(face))?.[1],
    );
    const shift = Number(/translate\([\d.]+ ([\d.]+)\)/.exec(read(face))?.[1]);
    expect(legendY).toBeLessThan(bezelCentreY(read(face)) + shift);
  });

  it('is the only warning lamp on the panel: no second lamp is drawn in the backdrop', () => {
    expect(panel()).not.toContain('data-bezel');
    expect(panel()).not.toContain('>CHARGE</text>');
  });

  it('sits at the top right of the upper-right field, right of the engine gauges', () => {
    const { rect } = views.panel.indicators.chargeLamp;
    for (const [id, { rect: gauge }] of Object.entries(views.panel.indicators)) {
      if (id === 'chargeLamp' || gauge.x < 1640) continue;
      expect(rect.x, id).toBeGreaterThanOrEqual(gauge.x + gauge.w);
    }
    expect(rect.y).toBeLessThan(views.panel.indicators.tachometer.rect.y + 20);
  });
});

describe('CTSL gauges', () => {
  it('marks the airspeed dial with the photographed arcs and VNE 300 km/h', () => {
    const { options, artwork } = gauges.airspeed;
    expect(options).toMatchObject({ min: 40, max: 340, units: 'km/h' });
    expect(options?.['arcs']).toEqual([
      { from: 72, to: 115, colour: 'white' },
      { from: 94, to: 245, colour: 'green' },
      { from: 245, to: 300, colour: 'yellow' },
      { from: 299, to: 301, colour: 'red' },
    ]);
    const face = read(artwork.face);
    const labels = [...face.matchAll(/>(\d+)<\/text>/g)].map(([, value]) => Number(value));
    expect(labels).toEqual([40, 80, 120, 160, 200, 240, 280, 320]);
  });

  it('reads the vertical speed in ft/min, ±2000, ticks every 500, printed as thousands', () => {
    const { options, artwork } = gauges.verticalSpeed;
    expect(options).toMatchObject({ min: -2000, max: 2000, units: 'ft/min' });
    expect(options?.['ticks']).toEqual([-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000]);
    const face = read(artwork.face);
    const labels = [...face.matchAll(/<text\b[^>]*>([\d.]+)<\/text>/g)].map(([, value]) => value);
    expect(labels.slice(0, 9)).toEqual(['2', '1.5', '1', '.5', '0', '.5', '1', '1.5', '2']);
  });

  it('reads the voltmeter 9 to 17 V, a bus voltage the trainer assumes (intake §3.5)', () => {
    const { options, artwork } = gauges.voltmeter;
    expect(options).toMatchObject({ min: 9, max: 17, units: 'V' });
    const face = read(artwork.face);
    const labels = [...face.matchAll(/>(\d+)<\/text>/g)].map(([, value]) => Number(value));
    expect(labels).toEqual([10, 12, 14, 16]);
  });

  const gaugeArtwork = indicatorArtwork.filter(({ artwork }) => artwork.moving.type === 'needle');

  const scales: Record<string, { min: number; max: number }> = {
    airspeed: { min: 40, max: 340 },
    tachometer: { min: 0, max: 7000 },
    oilPressure: { min: 0, max: 10 },
    oilTemperature: { min: 40, max: 150 },
    cht: { min: 40, max: 150 },
    verticalSpeed: { min: -2000, max: 2000 },
    altimeter: { min: 0, max: 5000 },
    voltmeter: { min: 9, max: 17 },
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
        if (/^\d*\.?\d+$/.test(content ?? '') && Math.abs(Math.hypot(cx, cy) - 46) < 3) continue;
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
    const legendY = (face: string, legend: 'I' | 'O') =>
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
          const [on, off] = [legendY(face, 'I'), legendY(face, 'O')];
          expect(on, `${id}: I legend`).toBeLessThan(off);
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
  // The console is drawn from above, forward up: a lever pushed forward slides up its slot and one
  // pulled toward the pilot slides down.
  type Lever = 'brake' | 'throttle' | 'choke' | 'trim';
  const artworkFor = (id: Lever) => controlArtwork.find((entry) => entry.id === id)?.artwork;
  const movingOf = (id: Lever) => {
    const moving = artworkFor(id)?.moving;
    if (moving?.type !== 'travel') throw new Error(`${id} slides along a travel path`);
    return moving;
  };
  const travelOf = (id: Lever) => movingOf(id).path;
  const faceOf = (id: Lever) => read(artworkFor(id)?.face ?? '');
  const legendAt = (svg: string, legend: string) => {
    const match = new RegExp(
      String.raw`<text x="([\d.]+)" y="([\d.]+)"[^>]*>${legend}</text>`,
    ).exec(svg);
    return { x: Number(match?.[1]), y: Number(match?.[2]) };
  };

  it.each(['brake', 'throttle', 'choke', 'trim'] as const)('slides %s fore and aft', (id) => {
    const path = travelOf(id);
    const [first, last] = [path[0], path[path.length - 1]];
    expect(first?.x).toBe(last?.x);
    expect(first?.y).not.toBe(last?.y);
  });

  it.each([
    ['brake', 'OFF', 'ON'],
    ['choke', 'OFF', 'ON'],
    ['throttle', 'FULL', 'IDLE'],
    ['trim', 'DOWN', 'UP'],
  ] as const)('prints the %s legend strip beside its slot', (id, forward, aft) => {
    const path = travelOf(id);
    const face = faceOf(id);
    const ends = [legendAt(face, forward), legendAt(face, aft)];
    for (const end of ends) expect(end.x, id).toBeGreaterThan(path[0]?.x ?? Infinity);
    expect(ends[0]?.y, `${forward} forward of ${aft}`).toBeLessThan(ends[1]?.y ?? 0);
  });

  it('pushes the throttle forward, up, for full power', () => {
    const path = travelOf('throttle');
    expect(path[path.length - 1]?.y).toBeLessThan(path[0]?.y ?? 0);
  });

  it.each(['brake', 'choke'] as const)('pulls %s aft, down, to ON', (id) => {
    const path = travelOf(id);
    expect(path[1]?.y).toBeGreaterThan(path[0]?.y ?? 0);
  });

  it('rolls the trim wheel forward, up, for nose down', () => {
    const path = travelOf('trim');
    expect(path[path.length - 1]?.y).toBeGreaterThan(path[0]?.y ?? 0);
  });

  it('marks every trim position with an unworded tick beside the slot', () => {
    const ticks = [...faceOf('trim').matchAll(/<line x1="106" y1="([\d.]+)"/g)].map(([, y]) =>
      Number(y),
    );
    const trim = controls.trim;
    if (!trim) throw new Error('the CTSL has no trim control');
    const path = travelOf('trim');
    expect(path.length, 'the trim wheel travels along a path').toBeGreaterThan(1);
    const [first, last] = [path[0]?.y ?? 0, path[path.length - 1]?.y ?? 0];
    const count = trim.positions.length;
    expect(ticks, 'trim-wheel-face.svg draws one tick per trim position').toHaveLength(count);
    ticks.forEach((y, index) =>
      expect(y).toBeCloseTo(first + ((last - first) * index) / (count - 1), 1),
    );
  });

  it('gives the choke its own plain lever, apart from the brake crossbar', () => {
    expect(movingOf('choke').image).not.toBe(movingOf('brake').image);
  });

  it('prints the trim strip green', () => {
    expect(faceOf('trim')).toContain('fill="url(#gn)"');
  });

  it('draws the trim wheel rim inboard of its indicator', () => {
    const rim = /<rect x="([\d.]+)"[^>]*width="([\d.]+)"[^>]*fill="url\(#w\)"/.exec(faceOf('trim'));
    expect(rim, 'the trim face draws a wheel rim').not.toBeNull();
    const pointer = Number(
      /<path\b[^>]*data-pointer=""[^>]*\bd="M([\d.]+)/.exec(read(movingOf('trim').image))?.[1],
    );
    expect(Number(rim?.[1]) + Number(rim?.[2])).toBeLessThan(pointer);
  });
});

describe('CTSL view backdrops', () => {
  const backdrop = (id: 'panel' | 'centre' | 'console'): string =>
    readFileSync(new URL(`./assets/${fileOf(views[id].image)}`, import.meta.url), 'utf8');
  const count = (svg: string, pattern: RegExp) => [...svg.matchAll(pattern)].length;
  const lettering = (svg: string) =>
    [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(
      ([, attributes = '', text]) =>
        `${text}@${/\bx="([\d.]+)"/.exec(attributes)?.[1]},${/\by="([\d.]+)"/.exec(attributes)?.[1]}/${/font-size="([\d.]+)"/.exec(attributes)?.[1]}`,
    );

  it.each(['panel', 'centre', 'console'] as const)('uses at most one filter on %s', (id) => {
    const svg = backdrop(id);
    expect(count(svg, /<feTurbulence\b/g)).toBeLessThanOrEqual(1);
    expect(count(svg, /filter=["']url\(/g)).toBeLessThanOrEqual(1);
  });

  it.each(['panel', 'centre', 'console'] as const)('paints %s with a stipple texture', (id) => {
    const svg = backdrop(id);
    expect(count(svg, /<feTurbulence\b/g)).toBe(1);
    expect(svg).toMatch(/<pattern\b[^>]*>(?:(?!<\/pattern>).)*filter="url\(/s);
  });

  it("heads the breaker block in the panel's own wording, beside the outlet breaker", () => {
    const { x, y, w } = views.panel.controls.outletBreaker.rect;
    const header = [...backdrop('panel').matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)</g)]
      .filter(([, textX, textY]) => Number(textX) > x + w && Number(textY) >= y)
      .map(([, , , content]) => content);
    expect(header.join(' ')).toBe('Circuit Breakers Push off');
  });

  it.each(['panel', 'centre', 'console'] as const)('keeps the %s lettering in place', (id) => {
    const expected = {
      panel: [
        'TAKEOFF CHECKLIST@238,80/37',
        'KUNSTFLUG UND@238,626/37',
        'TRUDELN VERBOTEN@238,662/37',
        'Cabin Heat@979.5,85/38',
        'TAKEOFF@1449,196/37',
        'CHECKLIST@1449,238/37',
        'GPS@1049.5,306.5/40',
        'COM RADIO@765.2,589.25/40',
        'TRANSPONDER@1329.6,589.25/40',
        'Circuit Breakers@2080,608/40',
        'Push off@2080,650/40',
      ],
      centre: [
        'AVIONICS OFF TO START AND STOP@570,272/29',
        '12 V@120,378/29',
        'FLAPS@700,550/29',
        'IGNITION@223,886/29',
        'BAT@930,658/29',
        'GEN@1090,658/29',
        'Master@1010,608/29',
        'Open@150,456/29',
        'Fuel@150,508/29',
        'Valve@150,540/29',
        'Closed@150,590/29',
        'MAX 20A@205,336/29',
        'Fuel per side@590,326/29',
        '65 l, 62 l usable@590,360/29',
        '-12°@1004,432/29',
        '300@1154,432/29',
        '0°@1004,464/29',
        '184@1154,464/29',
        '15°@1004,496/29',
        '148@1154,496/29',
        '30°@1004,528/29',
        '115@1154,528/29',
        '35°@1004,560/29',
        '115@1154,560/29',
        'Instrument@458,836/29',
        'Light@458,868/29',
      ],
      console: [
        'Aileron Trim@166,430/28',
        'L@68,460/28',
        'R@264,460/28',
        'Ballistic@452,368/28',
        'rescue@452,400/28',
        'parachute@452,432/28',
        'Rudder Trim@770,422/28',
        'L@676,462/28',
        'R@864,462/28',
      ],
    }[id];
    expect(lettering(backdrop(id))).toEqual(expected);
  });
});
