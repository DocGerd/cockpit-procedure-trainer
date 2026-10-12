import { handAngle } from '@cpt/core';
import type { JsonObject } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { cockpit } from '../../cockpit';
import { controls } from '../../controls';
import { indicators } from '../../indicators';
import { views } from '../../views';
import { ALTIMETER_KNOB_CENTRE, altimeter, altimeterHands, altimeterKnobFace } from './altimeter';
import { readFace } from './test-support';

// Intake §3.10.2 measures in R, the case radius: the bezel's outer edge, 95 of the 200-unit face.
const R = 95;
const centre = { x: 100, y: 100 };
const clockwise = (x: number, y: number) =>
  ((Math.atan2(x - centre.x, centre.y - y) * 180) / Math.PI + 360) % 360;
const radius = (x: number, y: number) => Math.hypot(x - centre.x, y - centre.y) / R;

const face = readFace(altimeter.artwork.face);
const texts = [...face.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map(
  ([, x, y, content]) => ({ x: Number(x), y: Number(y), content }),
);
const moving = altimeter.artwork.moving;
const needles = moving.type === 'needles' ? moving.needles : [];

describe('CTSL altimeter gauge', () => {
  it('turns three hands from the one reading: hundreds, thousands and ten-thousands of feet', () => {
    expect(moving.type).toBe('needles');
    expect(needles.map(({ image, valuePerTurn }) => [image, valuePerTurn])).toEqual([
      [altimeterHands.tenThousands, 100_000],
      [altimeterHands.thousands, 10_000],
      [altimeterHands.hundreds, 1000],
    ]);
    for (const hand of needles) expect(hand.pivot).toEqual(centre);
  });

  it('shows the photographed 330 ft with the long hand just past the 3 tick', () => {
    const [ten, thousands, hundreds] = needles.map((hand) => handAngle(hand, 330));
    expect(hundreds).toBeCloseTo(118.8);
    expect(thousands).toBeCloseTo(11.88);
    expect(ten).toBeCloseTo(1.188);
  });

  it('prints 0 to 9 clockwise from 12 o clock, the 2 and the 3 pushed apart around the window', () => {
    const numerals = texts.filter(({ content }) => /^\d$/.test(content ?? ''));
    expect(numerals.map(({ content }) => content)).toEqual(
      Array.from({ length: 10 }, (_, n) => String(n)),
    );
    const expected = [0, 36, 65, 115, 144, 180, 216, 252, 288, 324];
    numerals.forEach(({ x, y }, n) => {
      const off = Math.abs(((clockwise(x, y) - (expected[n] ?? 0) + 540) % 360) - 180);
      expect(off, `numeral ${n}`).toBeLessThan(1);
      expect(radius(x, y), `numeral ${n}`).toBeGreaterThan(0.57);
      expect(radius(x, y), `numeral ${n}`).toBeLessThan(0.7);
    });
  });

  it('draws 50 ticks, one per 20 ft, the long ones on every 36°', () => {
    const ticks = [
      ...face.matchAll(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#ECEAE3" stroke-width="([\d.]+)"\/>/g,
      ),
    ]
      .map(([, x1, y1, x2, y2, width]) => ({
        inner: radius(Number(x1), Number(y1)),
        outer: radius(Number(x2), Number(y2)),
        angle: clockwise(Number(x2), Number(y2)),
        width: Number(width),
      }))
      .filter(({ inner, outer }) => inner > 0.7 && Math.abs(outer - 0.85) < 0.01);
    expect(ticks).toHaveLength(50);
    ticks.forEach(({ angle, inner }, n) => {
      expect(angle).toBeCloseTo((n * 7.2) % 360, 0);
      expect(inner).toBeCloseTo(n % 5 === 0 ? 0.73 : 0.77, 2);
    });
  });

  it('prints the unit legend about the 0 and ALT left of centre, with no coloured marking', () => {
    expect(texts.map(({ content }) => content)).toEqual(
      expect.arrayContaining(['100', 'FEET', 'ALT']),
    );
    const colours = [...face.matchAll(/(?:fill|stroke|stop-color)="#([0-9A-Fa-f]{6})"/g)].map(
      ([, hex]) => [0, 2, 4].map((at) => parseInt(hex?.slice(at, at + 2) ?? '0', 16)),
    );
    for (const channels of colours) {
      expect(Math.max(...channels) - Math.min(...channels)).toBeLessThan(24);
    }
  });

  it('prints the setting in the window at 3 o clock, under the hands', () => {
    const window = altimeter.artwork.windows?.setting;
    expect(window).toBeDefined();
    if (!window) return;
    expect(clockwise(window.at.x, window.at.y)).toBeCloseTo(90);
    expect(radius(window.at.x, window.at.y)).toBeGreaterThan(0.5);
    expect(radius(window.at.x, window.at.y)).toBeLessThan(0.7);
    expect(indicators.altimeter.windows).toHaveProperty('setting');
  });

  it('shows three of the four screws: the lug hides the lower left one', () => {
    const screws = [
      ...face.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="7" fill="url\(#screw\)"/g),
    ];
    expect(screws.map(([, x, y]) => [Number(x), Number(y)])).toEqual([
      [13, 13],
      [187, 13],
      [187, 187],
    ]);
  });

  it.each([
    ['ten-thousands', altimeterHands.tenThousands, 0.86],
    ['thousands', altimeterHands.thousands, 0.38],
    ['hundreds', altimeterHands.hundreds, 0.77],
  ])('draws the %s hand pointing up to its intake length', (_name, image, length) => {
    const ys = [...readFace(image).matchAll(/[ML ]([\d.]+) ([\d.]+)/g)].map(([, , y]) => Number(y));
    expect((centre.y - Math.min(...ys)) / R).toBeCloseTo(length, 2);
  });
});

describe('CTSL altimeter setting knob', () => {
  const placement = views.panel.controls.altimeterSetting;
  const altimeterRect = views.panel.indicators.altimeter.rect;
  const caseCentre = {
    x: altimeterRect.x + altimeterRect.w / 2,
    y: altimeterRect.y + altimeterRect.h / 2,
  };
  const caseRadius = (R / 200) * altimeterRect.w;
  const knob = {
    x: placement.rect.x + ALTIMETER_KNOB_CENTRE.x * (placement.rect.w / 100),
    y: placement.rect.y + ALTIMETER_KNOB_CENTRE.y * (placement.rect.h / 100),
  };

  it('sits outside the case at its lower left, about 7:15', () => {
    const dx = knob.x - caseCentre.x;
    const dy = knob.y - caseCentre.y;
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    expect(angle).toBeGreaterThan(212);
    expect(angle).toBeLessThan(222);
    expect(Math.hypot(dx, dy) / caseRadius).toBeGreaterThan(1.24);
    expect(Math.hypot(dx, dy) / caseRadius).toBeLessThan(1.34);
  });

  it('is a touch target of at least 44 px at the panel floor', () => {
    const scale = cockpit.views.panel.minWidth / views.panel.size.width;
    expect(Math.min(placement.rect.w, placement.rect.h) * scale).toBeGreaterThanOrEqual(44);
  });

  it.each(['airspeed', 'verticalSpeed'] as const)('stays clear of the %s', (id) => {
    const other = views.panel.indicators[id].rect;
    const { x, y, w, h } = placement.rect;
    const apart =
      x >= other.x + other.w || other.x >= x + w || y >= other.y + other.h || other.y >= y + h;
    expect(apart).toBe(true);
  });

  it('prints the hPa legend as its label', () => {
    expect(controls.altimeterSetting.appearance.artwork.face).toBe(altimeterKnobFace);
    expect(controls.altimeterSetting.appearance.artwork.lettering).toEqual(['hPa']);
    expect(readFace(altimeterKnobFace)).toMatch(/>hPa<\/text>/);
  });

  it('is the one control that steps on while held', () => {
    const repeating = Object.entries(controls)
      .filter(([, { appearance }]) => {
        const options: JsonObject | undefined = appearance.options;
        return options?.['holdRepeat'] === true;
      })
      .map(([id]) => id);
    expect(repeating).toEqual(['altimeterSetting']);
  });

  it('steps 1 hPa a detent over 950 to 1050 hPa, clockwise raising the setting', () => {
    const { positions } = controls.altimeterSetting;
    expect(positions[0]).toBe('950');
    expect(positions.at(-1)).toBe('1050');
    expect(positions).toHaveLength(101);
  });
});
