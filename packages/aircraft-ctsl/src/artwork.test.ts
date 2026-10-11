// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readdirSync, readFileSync } from 'node:fs';
import { validateAircraft } from '@cpt/core';
import type { Appearance, ControlDefinition, IndicatorDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { gaugeArtwork as gauges, images } from './artwork';
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

  it('flags the pin with a red tag drawn only with the pin', () => {
    const artwork = rescue();
    if (artwork?.moving.type !== 'positions') throw new Error('the rescue handle has positions');
    const stowed = read(artwork.moving.images.stowed ?? '');
    expect(stowed).toMatch(/<rect\b[^>]*data-pin=""[^>]*fill="url\(#fr\)"/);
    expect(read(artwork.guardOpen?.stowed ?? '')).not.toContain('url(#fr)');
  });

  it('draws the parachute label as a striped plate, with no amber outline that reads as focus', () => {
    const face = read(rescue()?.face ?? '');
    expect(face).toContain('fill="url(#hz)"');
    expect(face).not.toContain('stroke="#f0a830"');
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

  // D-MPGO's lamp stands at the plate's middle, not its top right corner (intake §3.9.4).
  it('sits right of the tachometer, level with its top half, above the engine gauges', () => {
    const { rect } = views.panel.indicators.chargeLamp;
    const { tachometer, voltmeter } = views.panel.indicators;
    const lens = { x: rect.x + rect.w / 2, y: rect.y + (58 / 90) * rect.h };
    expect(lens.x).toBeGreaterThan(tachometer.rect.x + tachometer.rect.w);
    expect(lens.y).toBeGreaterThan(tachometer.rect.y);
    expect(lens.y).toBeLessThan(tachometer.rect.y + tachometer.rect.h / 2);
    expect(rect.y + rect.h).toBeLessThanOrEqual(voltmeter.rect.y);
  });
});

describe('CTSL gauges', () => {
  const gaugeArtwork = indicatorArtwork.filter(({ artwork }) => artwork.moving.type === 'needle');

  it('keeps every round gauge on drawn artwork and its full name', () => {
    expect(gaugeArtwork.map(({ id }) => id).sort()).toEqual(Object.keys(gauges).sort());
    for (const { indicator } of gaugeArtwork) {
      expect(indicator.name.en.length).toBeGreaterThan(0);
      expect(indicator.name.de.length).toBeGreaterThan(0);
    }
  });

  it('gives every gauge its own module and test file', () => {
    const files: string[] = readdirSync(new URL('./artwork/gauges/', import.meta.url));
    const helpers = ['shared.ts', 'test-support.ts'];
    const modules = files.filter((file) => !file.endsWith('.test.ts') && !helpers.includes(file));
    const tests = files.filter((file) => file.endsWith('.test.ts'));
    const kebab = Object.keys(gauges)
      .map((id) => id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))
      .sort();
    expect(modules.map((file) => file.replace(/\.ts$/, '')).sort()).toEqual(kebab);
    expect(tests.map((file) => file.replace(/\.test\.ts$/, '')).sort()).toEqual(kebab);
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
    ['brake', 'Off', 'On'],
    ['choke', 'Off', 'On'],
    ['throttle', 'Full', 'Idle'],
    ['trim', 'Down', 'Up'],
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

  it.each(['brake', 'choke'] as const)('pulls %s aft, down, to On', (id) => {
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

  it('paints the trim strip as a muted marking, not a lit slab', () => {
    const paint = /<path\b[^>]*fill="url\(#gn\)"[^>]*fill-opacity="([\d.]+)"/.exec(faceOf('trim'));
    expect(paint, 'the strip carries its green as paint over the plate').not.toBeNull();
    expect(Number(paint?.[1])).toBeLessThan(0.7);
  });

  it('paints the trim strip as a lacquered plate with a soft glare', () => {
    const face = faceOf('trim');
    expect(face).toContain('data-paint=""');
    expect(face).toContain('fill="url(#gg)"');
  });

  it('moulds the throttle grip as a lit knob, not a flat fill', () => {
    const grip = read(movingOf('throttle').image);
    for (const layer of ['bd', 'cs', 'hl', 'tx']) expect(grip, layer).toContain(`url(#${layer})`);
  });

  it.each(['brake', 'choke'] as const)('ribs and shades the %s grip', (id) => {
    const grip = read(movingOf(id).image);
    expect(grip).toContain('clip-path="url(#cp)"');
    expect(grip).toContain('fill="url(#cs)"');
    const ribs = grip.match(/stroke-opacity="\.\d+" stroke-width="1\.[4-7]"/g) ?? [];
    expect(ribs.length).toBeGreaterThan(6);
  });

  it.each(['throttle', 'choke', 'brake'] as const)(
    'casts the %s grip shadow like the carb-heat grip',
    (id) => {
      for (const grip of [read(movingOf(id).image), read(images.handleCarb)]) {
        expect(grip).toContain('fill="url(#oc)"');
        expect(grip).toContain('fill="url(#sk)"');
      }
    },
  );

  it('keeps the brake grip clear of the top of its slot', () => {
    const grip = read(movingOf('brake').image);
    const top = Number(/<clipPath id="cp"><path d="M[\d.]+ ([\d.]+)H/.exec(grip)?.[1]);
    expect(top).toBeGreaterThanOrEqual(59);
  });

  it('draws the rescue pocket as a screwed plate like its neighbours', () => {
    const backdrop = readFileSync(new URL('./assets/view-console.svg', import.meta.url), 'utf8');
    expect(backdrop).not.toContain('<rect x="446" y="490" width="308" height="300"');
    expect(backdrop).toContain('<g transform="translate(432 0)">');
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

  // D-MPGO prints "Push off" under the header too; the trainer leaves it out by owner decision,
  // as it reads as if a pushed-in breaker were off (#729, intake §3.9.5).
  it("heads the breaker block in the panel's own wording, beside the outlet breaker", () => {
    const { x, y, w } = views.panel.controls.outletBreaker.rect;
    const header = [
      ...backdrop('panel').matchAll(
        /<text x="([\d.]+)" y="([\d.]+)"(?![^>]*data-decor)[^>]*>([^<]*)</g,
      ),
    ]
      .filter(([, textX, textY]) => Number(textX) > x + w && Number(textY) >= y)
      .map(([, , , content]) => content);
    expect(header.join(' ')).toBe('Circuit Breakers');
  });

  // Corrected from the photos (intake §3.2a): each unit draws its whole face, the cradle included.
  it.each(Object.entries(deviceSlots))(
    'draws no recess, frame, screw or shadow in or around the %s slot',
    (_id, { rect }) => {
      const margin = 16;
      const svg = backdrop('panel');
      const fullHeight = 0.95 * views.panel.size.height;
      const point = ([, x, y]: string[]) => [Number(x), Number(y)];
      const origins = [
        ...[...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"[^>]*height="([\d.]+)"/g)]
          .filter(([, , , h]) => Number(h) < fullHeight)
          .map(point),
        ...[...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map(point),
        ...[...svg.matchAll(/<path d="M([\d.]+)[ ,]([\d.]+)/g)].map(point),
      ];
      const near = origins.filter(
        ([x = 0, y = 0]) =>
          x > rect.x - margin &&
          x < rect.x + rect.w + margin &&
          y > rect.y - margin &&
          y < rect.y + rect.h + margin,
      );
      expect(near).toEqual([]);
    },
  );

  it('leaves the GPS cradle and its rail to the device', () => {
    const svg = backdrop('panel');
    const { rect } = deviceSlots.gps;
    const fullHeight = 0.95 * views.panel.size.height;
    const boxes = [
      ...[...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
        .map(([, x, y, w, h]) => ({ x: Number(x), y: Number(y), w: Number(w), h: Number(h) }))
        .filter(({ h }) => h < fullHeight),
      ...[...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(
        ([, cx, cy, r]) => ({
          x: Number(cx) - Number(r),
          y: Number(cy) - Number(r),
          w: 2 * Number(r),
          h: 2 * Number(r),
        }),
      ),
    ];
    const overlapping = boxes.filter(
      (box) =>
        box.x < rect.x + rect.w &&
        box.x + box.w > rect.x &&
        box.y < rect.y + rect.h &&
        box.y + box.h > rect.y,
    );
    expect(overlapping).toEqual([]);
  });

  describe('the three upper plates (intake §3.9.1)', () => {
    const svg = backdrop('panel');
    const plates = [
      ...svg.matchAll(/<(?:rect|path) data-plate="(\w+)"[^>]*fill="url\(#(\w+)\)"/g),
    ].map(([, plate, fill]) => ({ plate, fill }));

    it('draws a left, a centre and a right plate', () => {
      expect(plates.map(({ plate }) => plate).sort()).toEqual(['centre', 'left', 'right']);
    });

    it("paints the centre plate in the outer plates' colour (#716)", () => {
      expect(new Set(plates.map(({ fill }) => fill)).size).toBe(1);
      expect(svg).toMatch(new RegExp(`<linearGradient id="${plates[0]?.fill}"`));
    });
  });

  it('prints no caption under a device slot', () => {
    const svg = backdrop('panel');
    for (const { rect } of Object.values(deviceSlots)) {
      const inside = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)</g)].filter(
        ([, tx, ty]) =>
          Number(tx) >= rect.x &&
          Number(tx) <= rect.x + rect.w &&
          Number(ty) >= rect.y &&
          Number(ty) <= rect.y + rect.h,
      );
      expect(inside.map(([, , , word]) => word)).toEqual([]);
    }
  });

  it.each(['panel', 'centre', 'console'] as const)('keeps the %s lettering in place', (id) => {
    const expected = {
      panel: [
        'D-MPGO@476.49,165.06/54',
        'TAKEOFF@711,142/37',
        'CHECKLIST@711,178/37',
        'KUNSTFLUG UND TRUDELN VERBOTEN@651,617/15',
        'TAKEOFF@1366,56/37',
        'CHECKLIST@1366,92/37',
        'Nav@1688,507.99/13',
        'Autopilot@1884,507.99/13',
        'HS34@1982,507.99/13',
        'EFIS@2080,507.99/13',
        'EMS@2178,507.99/13',
        'Instrument@1786,599.54/13',
        'Light@1786,615.22/13',
        'Circuit Breakers@1955,645/37',
      ],
      centre: [
        'AVIONICS OFF TO START AND STOP@570,272/29',
        '12 V@120,378/29',
        'Flaps@700,550/29',
        'Ignition@223,886/29',
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
        'Ballistic@574,368/28',
        'rescue@574,400/28',
        'parachute@574,432/28',
        'Rudder Trim@886,422/28',
        'L@792,462/28',
        'R@980,462/28',
      ],
    }[id];
    expect(lettering(backdrop(id))).toEqual(expected);
  });
});
