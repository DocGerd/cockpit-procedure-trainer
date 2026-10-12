// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readdirSync, readFileSync } from 'node:fs';
import { validateAircraft } from '@cpt/core';
import type { Appearance, ControlDefinition, IndicatorDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { gaugeArtwork as gauges, images } from './artwork';
import { needle } from './artwork/gauges/shared';
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
  ...(moving.type === 'positions'
    ? Object.values(moving.images)
    : moving.type === 'needles'
      ? moving.needles.map(({ image }) => image)
      : [moving.image]),
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
    const face = read(generatorLamp().face);
    const [, shiftX = 0, shiftY = 0] = (
      /<g transform="translate\(([\d.]+) ([\d.]+)\)"/.exec(face) ?? []
    ).map(Number);
    const [, cx = 0, cy = 0] = (
      /<circle\b[^>]*data-bezel=""[^>]*\bcx="([\d.]+)" cy="([\d.]+)"/.exec(face) ?? []
    ).map(Number);
    const { width, height } = sizeOf(generatorLamp().face);
    const lens = {
      x: rect.x + ((shiftX + cx) / Number(width)) * rect.w,
      y: rect.y + ((shiftY + cy) / Number(height)) * rect.h,
    };
    expect(cx, 'the face draws its bezel').toBeGreaterThan(0);
    expect(lens.x).toBeGreaterThan(tachometer.rect.x + tachometer.rect.w);
    expect(lens.y).toBeGreaterThan(tachometer.rect.y);
    expect(lens.y).toBeLessThan(tachometer.rect.y + tachometer.rect.h / 2);
    expect(rect.y + rect.h).toBeLessThanOrEqual(voltmeter.rect.y);
  });
});

// D-MPGO's block: seven columns 0.36 A apart, two rows 0.22 A apart, the 12V Outlet alone under
// the second column (intake §3.9.4). Each touch box keeps the touch target at the floor but sits
// offset round its knob, so neighbouring knobs stand at the aircraft's pitch.
describe("CTSL breaker block as D-MPGO's (intake §3.9.4)", () => {
  const TOUCH_TARGET_PX = 44;
  const floor = ctslAircraft.cockpit?.views.panel?.minWidth ?? 0;
  const floorScale = floor / views.panel.size.width;
  const unitA = views.panel.indicators.airspeed.rect.w;
  const { tachometer } = views.panel.indicators;
  const placed = views.panel.controls;
  type BreakerId =
    | 'comBreaker'
    | 'xpdrBreaker'
    | 'landingBreaker'
    | 'strobeBreaker'
    | 'positionBreaker'
    | 'intercomBreaker'
    | 'gpsBreaker'
    | 'outletBreaker';
  const breakers: readonly BreakerId[] = [
    'comBreaker',
    'xpdrBreaker',
    'landingBreaker',
    'strobeBreaker',
    'positionBreaker',
    'intercomBreaker',
    'gpsBreaker',
    'outletBreaker',
  ];
  const knobIn = (svg: string) => {
    const match =
      /<g data-knob="([\d.]+)" transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">/.exec(
        svg,
      );
    if (!match) throw new Error('the breaker art marks no knob');
    const [, radius = 0, x = 0, y = 0, scale = 0] = match.map(Number);
    return { x, y, r: radius * scale };
  };
  const knob = (id: BreakerId) => {
    const { rect } = placed[id];
    const artwork = artworkOf(controls[id].appearance);
    if (!artwork) throw new Error(`${id} has no artwork`);
    const { width } = sizeOf(artwork.face);
    const scale = rect.w / Number(width);
    const own = knobIn(read(artwork.face));
    return { x: rect.x + own.x * scale, y: rect.y + own.y * scale, r: own.r * scale };
  };
  const rightPlate = (() => {
    const svg = readFileSync(new URL('./assets/view-panel.svg', import.meta.url), 'utf8');
    const d = /<path data-plate="right" d="([^"]+)"/.exec(svg)?.[1] ?? '';
    const xs = [...d.matchAll(/[ML]([\d.]+)[ ,]/g)].map(([, x]) => Number(x));
    return { x: Math.min(...xs), w: Math.max(...xs) - Math.min(...xs) };
  })();

  it.each(breakers)('keeps %s at least the touch target at the floor', (id) => {
    const { w, h } = placed[id].rect;
    expect(Math.min(w, h) * floorScale).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
  });

  it('keeps every touch box clear of its neighbours', () => {
    const boxes = breakers.map((id) => ({ id, ...placed[id].rect }));
    boxes.forEach((a, index) =>
      boxes.slice(index + 1).forEach((b) => {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} and ${b.id}`).toBe(true);
      }),
    );
  });

  it.each(breakers)(
    'draws the %s knob inside its touch box, its disc where its collar is',
    (id) => {
      const { x, y, w, h } = placed[id].rect;
      const { x: kx, y: ky, r } = knob(id);
      expect(kx - r).toBeGreaterThanOrEqual(x);
      expect(kx + r).toBeLessThanOrEqual(x + w);
      expect(ky - r).toBeGreaterThanOrEqual(y);
      expect(ky + r).toBeLessThanOrEqual(y + h);
      const artwork = artworkOf(controls[id].appearance);
      if (artwork?.moving.type !== 'positions') throw new Error(`${id} has no positions`);
      const face = knobIn(read(artwork.face));
      for (const image of Object.values(artwork.moving.images)) {
        const disc = knobIn(read(image));
        expect({ x: disc.x, y: disc.y }, fileOf(image)).toEqual({ x: face.x, y: face.y });
      }
    },
  );

  it('sets the knobs in two straight rows 0.22 A apart and seven columns 0.36 A apart', () => {
    const top = ['comBreaker', 'xpdrBreaker'] as const;
    const bottom = [
      'landingBreaker',
      'strobeBreaker',
      'positionBreaker',
      'intercomBreaker',
      'gpsBreaker',
    ] as const;
    const topY = knob('comBreaker').y;
    const bottomY = knob('landingBreaker').y;
    top.forEach((id) => expect(knob(id).y, id).toBeCloseTo(topY, 5));
    bottom.forEach((id) => expect(knob(id).y, id).toBeCloseTo(bottomY, 5));
    expect((bottomY - topY) / unitA).toBeGreaterThanOrEqual(0.19);
    expect((bottomY - topY) / unitA).toBeLessThanOrEqual(0.25);

    const column1 = knob('landingBreaker').x;
    const pitch = (knob('gpsBreaker').x - column1) / 6;
    expect(pitch / unitA).toBeGreaterThanOrEqual(0.33);
    expect(pitch / unitA).toBeLessThanOrEqual(0.4);
    const columns: Record<BreakerId, number> = {
      comBreaker: 1,
      xpdrBreaker: 3,
      landingBreaker: 1,
      strobeBreaker: 4,
      positionBreaker: 5,
      intercomBreaker: 6,
      gpsBreaker: 7,
      outletBreaker: 2,
    };
    breakers.forEach((id) =>
      expect(Math.abs(knob(id).x - (column1 + (columns[id] - 1) * pitch)), id).toBeLessThan(1),
    );
    const outletDrop = (knob('outletBreaker').y - bottomY) / unitA;
    expect(outletDrop).toBeGreaterThanOrEqual(0.25);
    expect(outletDrop).toBeLessThanOrEqual(0.37);
  });

  it('draws each knob about a quarter of the tachometer across', () => {
    breakers.forEach((id) => {
      const ratio = (2 * knob(id).r) / tachometer.rect.w;
      expect(ratio, id).toBeGreaterThanOrEqual(0.22);
      expect(ratio, id).toBeLessThanOrEqual(0.3);
    });
  });

  it('spans about three quarters of the right plate, starting just inside its inner edge', () => {
    const { x: left, r } = knob('landingBreaker');
    const span = knob('gpsBreaker').x + r - (left - r);
    expect(span / rightPlate.w).toBeGreaterThanOrEqual(0.65);
    expect(span / rightPlate.w).toBeLessThanOrEqual(0.8);
    expect((left - r - rightPlate.x) / rightPlate.w).toBeLessThanOrEqual(0.1);
  });
});

describe('CTSL gauges', () => {
  const gaugeArtwork = indicatorArtwork.filter(({ artwork }) =>
    ['needle', 'needles'].includes(artwork.moving.type),
  );
  const fixedFaces = ['slipIndicator', 'hourMeter'];

  it('keeps every round gauge on drawn artwork and its full name', () => {
    expect(gaugeArtwork.map(({ id }) => id).sort()).toEqual(
      Object.keys(gauges)
        .filter((id) => !fixedFaces.includes(id))
        .sort(),
    );
    for (const { indicator } of gaugeArtwork) {
      expect(indicator.name.en.length).toBeGreaterThan(0);
      expect(indicator.name.de.length).toBeGreaterThan(0);
    }
  });

  it('gives a gauge the needle and glass it names and no glass when it names none', () => {
    const parts = { image: 'needle.svg', glass: 'glass.svg' };
    const { artwork } = needle('face.svg', { min: 0, max: 1 }, {}, undefined, parts);
    expect(artwork.glass).toBe('glass.svg');
    expect(artwork.moving.type === 'needle' && artwork.moving.image).toBe('needle.svg');
    expect(
      needle('face.svg', { min: 0, max: 1 }, {}, undefined, { image: 'needle.svg' }).artwork,
    ).not.toHaveProperty('glass');
  });

  it('gives every gauge its own module and test file', () => {
    const files: string[] = readdirSync(new URL('./artwork/gauges/', import.meta.url));
    const helpers = ['shared.ts', 'test-support.ts', 'cht-test-support.ts', 'temperature-dial.ts'];
    const modules = files.filter((file) => !file.endsWith('.test.ts') && !helpers.includes(file));
    const tests = files.filter((file) => file.endsWith('.test.ts'));
    const kebab = Object.keys(gauges)
      .map((id) => id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))
      .sort();
    expect(modules.map((file) => file.replace(/\.ts$/, '')).sort()).toEqual(kebab);
    expect(tests.map((file) => file.replace(/\.test\.ts$/, '')).sort()).toEqual(kebab);
  });
});

describe('CTSL slip indicator and hour meter', () => {
  type Id = 'slipIndicator' | 'hourMeter' | 'airspeed' | 'verticalSpeed';
  const rect = (id: Id) => views.panel.indicators[id].rect;
  const centre = (id: Id) => ({ x: rect(id).x + rect(id).w / 2, y: rect(id).y + rect(id).h / 2 });
  const artworkOfIndicator = (id: string) =>
    indicatorArtwork.find((entry) => entry.id === id)?.artwork;
  const panel = () =>
    readFileSync(new URL(`./assets/${fileOf(views.panel.image)}`, import.meta.url), 'utf8');
  const capture = (pattern: RegExp, text: string, what: string): number => {
    const found = pattern.exec(text)?.[1];
    if (found === undefined) throw new Error(`no ${what} in the artwork`);
    return Number(found);
  };

  it('draws the two as indicators with their own face, not in the panel backdrop', () => {
    expect(artworkOfIndicator('slipIndicator')?.moving.type).toBe('positions');
    expect(artworkOfIndicator('hourMeter')?.moving.type).toBe('positions');
    expect(panel()).not.toContain('#C04A3A');
  });

  // Intake §3.9.2: the slip indicator is the VSI's size, 0.71 of the airspeed indicator, in the
  // left plate's lower row under the airspeed indicator.
  it('sizes the slip indicator like the VSI, 0.71 of the airspeed indicator', () => {
    expect(rect('slipIndicator').w).toBe(rect('verticalSpeed').w);
    expect(rect('slipIndicator').h).toBe(rect('verticalSpeed').h);
    expect(rect('slipIndicator').w / rect('airspeed').w).toBeCloseTo(0.71, 2);
    expect(centre('slipIndicator').y).toBeCloseTo(centre('verticalSpeed').y, 0);
    expect(centre('slipIndicator').y).toBeGreaterThan(rect('airspeed').y + rect('airspeed').h);
    expect(Math.abs(centre('slipIndicator').x - centre('airspeed').x)).toBeLessThan(
      0.02 * rect('airspeed').w,
    );
  });

  // Intake §3.10.10: face 0.45 A by 0.28 A, a screw beyond each end; the box holds the screws.
  it('gives the hour meter its 0.45 A by 0.28 A face right of the engine gauges', () => {
    const { w, h } = rect('hourMeter');
    const face = artworkOfIndicator('hourMeter')?.face ?? '';
    const faceWidth = capture(
      /<rect x="[\d.]+" y="0" width="([\d.]+)"[^>]*data-face/,
      read(face),
      'data-face rect',
    );
    const box = sizeOf(face);
    const scale = w / Number(box.width);
    expect((faceWidth * scale) / rect('airspeed').w).toBeCloseTo(0.45, 2);
    expect(Number(box.height) * scale).toBeCloseTo(h, 0);
    expect(h / rect('airspeed').w).toBeCloseTo(0.28, 2);
    const { oilPressure, voltmeter } = views.panel.indicators;
    expect(rect('hourMeter').x).toBeGreaterThan(oilPressure.rect.x + oilPressure.rect.w);
    const voltmeterAxis = voltmeter.rect.x + voltmeter.rect.w / 2;
    expect((centre('hourMeter').x - voltmeterAxis) / rect('airspeed').w).toBeCloseTo(0.6, 2);
    const voltmeterY = voltmeter.rect.y + voltmeter.rect.h / 2;
    const rowPitch = oilPressure.rect.y + oilPressure.rect.h / 2 - voltmeterY;
    const expectedY = voltmeterY + rowPitch * 0.6;
    expect(Math.abs(centre('hourMeter').y - expectedY)).toBeLessThan(0.05 * rowPitch);
  });

  it('draws the slip ball centred in the tube, on a face with one legend and two lines', () => {
    const face = read(artworkOfIndicator('slipIndicator')?.face ?? '');
    expect(face.match(/<text\b/g)).toHaveLength(1);
    expect(face).toContain('>SLIP INDICATOR</text>');
    expect(face.match(/<line\b[^>]*data-reference/g)).toHaveLength(2);
    const artwork = artworkOfIndicator('slipIndicator');
    if (artwork?.moving.type !== 'positions') throw new Error('the ball has positions');
    const ball = read(artwork.moving.images.true ?? '');
    const R = 98;
    const within = (actual: number, expected: number) =>
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.03 * R);
    expect(capture(/<circle cx="([\d.]+)"[^>]*data-ball/, ball, 'ball cx')).toBe(100);
    within(capture(/<circle[^>]*cy="([\d.]+)"[^>]*data-ball/, ball, 'ball cy'), 100 + 0.06 * R);
    within(capture(/<circle[^>]*r="([\d.]+)"[^>]*data-ball/, ball, 'ball r'), 0.13 * R);
    const lineXs = [...face.matchAll(/<line\b[^>]*x1="([\d.]+)"[^>]*data-reference/g)].map(
      ([, x]) => Number(x),
    );
    expect(lineXs).toHaveLength(2);
    within(lineXs[0] ?? Number.NaN, 100 - 0.14 * R);
    within(lineXs[1] ?? Number.NaN, 100 + 0.14 * R);
  });

  it('has a stopped and a running image for the hour meter glyph', () => {
    const artwork = artworkOfIndicator('hourMeter');
    if (artwork?.moving.type !== 'positions') throw new Error('the hour meter has positions');
    expect(Object.keys(artwork.moving.images).sort()).toEqual(['false', 'true']);
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
        'D-MPGO@417.49,165.06/54',
        'TAKEOFF@652,142/37',
        'CHECKLIST@652,178/37',
        'KUNSTFLUG UND TRUDELN VERBOTEN@592,617/15',
        'TAKEOFF@1148,88/37',
        'CHECKLIST@1148,124/37',
        'Nav@1467,507/12',
        'Autopilot@1605,507/12',
        'HS34@1674,507/12',
        'EFIS@1743,507/12',
        'EMS@1812,507/12',
        'Instrument@1536,603/12',
        'Light@1536,615/12',
        'Circuit Breakers@1640,652/35',
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
