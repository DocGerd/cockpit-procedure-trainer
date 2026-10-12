import { expect } from 'vitest';
import { indicators } from '../../indicators';
import type { CtslTrainerState } from '../../systems';
import { DIAL, dialAngle } from './temperature-dial';
import { readFace } from './test-support';

type Polar = { angle: number; radius: number };
type Tag = { name: string; attributes: Record<string, string>; text: string };

const attributesOf = (source: string): Record<string, string> =>
  Object.fromEntries(
    [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
  );

const tagsOf = (svg: string, name: string): Tag[] =>
  [...svg.matchAll(new RegExp(`<${name}\\b([^>]*?)(?:/>|>([^<]*)</${name}>)`, 'g'))].map(
    ([, source = '', text = '']) => ({ name, attributes: attributesOf(source), text }),
  );

const polar = (x: number, y: number): Polar => ({
  angle: (Math.atan2(x - 100, 100 - y) * 180) / Math.PI,
  radius: Math.hypot(x - 100, y - 100),
});

const num = (tag: Tag, key: string): number => Number(tag.attributes[key]);

const tagWhere = (tags: Tag[], what: string, match: (tag: Tag) => boolean): Tag => {
  const found = tags.find(match);
  if (!found) throw new Error(`no ${what}`);
  return found;
};

const needleOf = (id: DialSpec['id']) => {
  const appearance = indicators[id].appearance;
  if (!('artwork' in appearance) || appearance.artwork.moving.type !== 'needle') {
    throw new Error(`${id} has no needle`);
  }
  return appearance.artwork.moving;
};

const numerals = [
  { value: 40, angle: -130, radius: 49 },
  { value: 60, angle: -76, radius: 58 },
  { value: 80, angle: -22, radius: 65 },
  { value: 100, angle: 32, radius: 53 },
  { value: 120, angle: 86, radius: 45 },
  { value: 150, angle: 139, radius: 41 },
];

const heavyBars = [
  { value: 125, angle: 94, inner: 65, outer: 82 },
  { value: 130, angle: 103, inner: 58, outer: 83 },
  { value: 135, angle: 111, inner: 65, outer: 82 },
  { value: 140, angle: 119, inner: 58, outer: 83 },
  { value: 145, angle: 127, inner: 65, outer: 82 },
  { value: 150, angle: 135, inner: 58, outer: 83 },
];

export type DialSpec = {
  id: 'cht' | 'oilTemperature';
  words: { text: string; y: number }[];
  arcs: { colour: string; from: number; to: number; inner: number }[];
  tintedTicks: number[];
};

const INK = '#e6e6de';

const withinDegrees = (actual: number, expected: number, tolerance: number, what: string) =>
  expect(
    Math.abs(actual - expected),
    `${what}: ${actual.toFixed(1)} against ${expected}`,
  ).toBeLessThanOrEqual(tolerance);

export function expectDialScale(id: DialSpec['id']) {
  expect(dialAngle(DIAL.min)).toBe(-130);
  expect(dialAngle(120)).toBeCloseTo(86, 9);
  expect(dialAngle(121)).toBeCloseTo(87.65, 9);
  expect(dialAngle(150)).toBeCloseTo(135.5, 9);
  for (const { value, angle } of numerals.slice(0, 5)) {
    withinDegrees(dialAngle(value), angle, 0.5, `${value} °C`);
  }
  for (const { value, angle } of heavyBars) {
    withinDegrees(dialAngle(value), angle, 1, `${value} °C bar`);
  }
  expect(dialAngle(DIAL.rest), 'the needle rests at about 8:20, clear of the 40').toBeGreaterThan(
    -115,
  );
  expect(dialAngle(DIAL.rest)).toBeLessThan(-105);
  const { stops, angleRange, valueRange } = needleOf(id);
  expect(valueRange, 'the needle reads plain degrees Celsius').toEqual({ min: 40, max: 150 });
  expect(angleRange).toEqual({ min: dialAngle(DIAL.rest), max: dialAngle(150) });
  expect(stops?.map(({ value }) => value)).toEqual([DIAL.rest, 120, 150]);
  for (const { value, angle } of stops ?? []) expect(angle).toBeCloseTo(dialAngle(value), 9);
}

export function expectNeedleReadsTemperature(id: DialSpec['id']) {
  const state = (celsius: number) =>
    ({ systems: { chtC: celsius, oilTempC: celsius } }) as unknown as CtslTrainerState;
  for (const celsius of [46, 90, 120, 130, 150]) {
    expect(indicators[id].select(state(celsius))).toBe(celsius);
  }
  const options = indicators[id].appearance.options;
  expect(options?.['min']).toBe(40);
  expect(options?.['max']).toBe(150);
  expect(options?.['ticks']).toEqual([40, 60, 80, 100, 120, 150]);
}

export function expectDialFace(spec: DialSpec) {
  const appearance = indicators[spec.id].appearance;
  if (!('artwork' in appearance)) throw new Error(`${spec.id} is not artwork`);
  const { artwork } = appearance;
  expect(artwork.glass, 'no glare is drawn over the dial').toBeUndefined();
  const svg = readFace(artwork.face);
  expect(svg).not.toMatch(/Flight|Design|<image/i);

  const texts = tagsOf(svg, 'text');
  const numeralTexts = texts.filter(({ text }) => /^\d+$/.test(text));
  expect(numeralTexts.map(({ text }) => Number(text))).toEqual(numerals.map(({ value }) => value));
  numeralTexts.forEach((tag, index) => {
    const expected = numerals[index];
    if (!expected) throw new Error('numeral table');
    const { angle, radius } = polar(num(tag, 'x'), num(tag, 'y'));
    withinDegrees(angle, expected.angle, 1.5, `${tag.text} angle`);
    withinDegrees(radius, expected.radius, 3, `${tag.text} radius`);
  });
  expect(texts.map(({ text }) => text).filter((text) => !/^\d+$/.test(text))).toEqual(
    spec.words.map(({ text }) => text),
  );
  for (const tag of texts) {
    expect(tag.attributes['data-lettering'], `"${tag.text}" is secondary lettering`).toBe(
      'secondary',
    );
    if (!/^\d+$/.test(tag.text)) expect(num(tag, 'x'), `"${tag.text}" is centred`).toBe(100);
  }
  for (const { text, y } of spec.words) {
    const tag = tagWhere(texts, `word ${text}`, (candidate) => candidate.text === text);
    expect(num(tag, 'y'), text).toBeCloseTo(y, 1);
  }

  const ticks = tagsOf(svg, 'line').filter((tag) => tag.attributes['data-tick'] !== undefined);
  expect(ticks.map((tag) => num(tag, 'data-tick'))).toEqual(
    Array.from({ length: 23 }, (_, index) => 40 + 5 * index),
  );
  for (const tick of ticks) {
    const celsius = num(tick, 'data-tick');
    const outer = polar(num(tick, 'x2'), num(tick, 'y2'));
    withinDegrees(outer.angle, dialAngle(celsius), 0.5, `tick ${celsius}`);
    if (celsius <= 120) withinDegrees(outer.radius, 84, 1.5, `tick ${celsius} outer end`);
    const tinted = spec.tintedTicks.includes(celsius);
    expect(
      tick.attributes['stroke'] === INK,
      `tick ${celsius} ${tinted ? 'takes its arc tint' : 'is white'}`,
    ).toBe(!tinted);
  }
  const widthOf = (celsius: number) =>
    num(
      tagWhere(ticks, `tick ${celsius}`, (tick) => num(tick, 'data-tick') === celsius),
      'stroke-width',
    );
  for (const { value, inner, outer } of heavyBars) {
    const tick = tagWhere(
      ticks,
      `tick ${value}`,
      (candidate) => num(candidate, 'data-tick') === value,
    );
    withinDegrees(polar(num(tick, 'x1'), num(tick, 'y1')).radius, inner, 1.5, `bar ${value} inner`);
    withinDegrees(polar(num(tick, 'x2'), num(tick, 'y2')).radius, outer, 1.5, `bar ${value} outer`);
    expect(widthOf(value), `bar ${value} is heavy`).toBeGreaterThanOrEqual(2 * widthOf(115));
  }

  const drawn = tagsOf(svg, 'path').filter((tag) => tag.attributes['data-arc'] !== undefined);
  expect(
    drawn.map((tag) => [tag.attributes['data-arc'], num(tag, 'data-from'), num(tag, 'data-to')]),
  ).toEqual(spec.arcs.map(({ colour, from, to }) => [colour, from, to]));
  drawn.forEach((tag, index) => {
    const arc = spec.arcs[index];
    if (!arc) throw new Error('arc table');
    const [start, end] = [...(tag.attributes['d'] ?? '').matchAll(/[ML]\s*([\d.]+)[ ,]([\d.]+)/g)]
      .slice(0, 2)
      .map(([, x, y]) => polar(Number(x), Number(y)));
    if (!start || !end) throw new Error(`${arc.colour} arc path has no M/L points`);
    withinDegrees(start.angle, dialAngle(arc.from), 0.6, `${arc.colour} start`);
    withinDegrees(end.angle, dialAngle(arc.to), 0.6, `${arc.colour} end`);
    withinDegrees(start.radius, 85, 1, `${arc.colour} outer radius`);
    withinDegrees(end.radius, arc.inner, 1, `${arc.colour} inner radius`);
  });

  const screws = tagsOf(svg, 'circle').filter((tag) => tag.attributes['data-screw'] !== undefined);
  expect(screws).toHaveLength(4);
  for (const screw of screws) {
    const [x, y, r] = [num(screw, 'cx'), num(screw, 'cy'), num(screw, 'r')];
    expect(x - r).toBeGreaterThanOrEqual(0);
    expect(x + r).toBeLessThanOrEqual(200);
    expect(y - r).toBeGreaterThanOrEqual(0);
    expect(y + r).toBeLessThanOrEqual(200);
    expect(Math.hypot(x - 100, y - 100) - r, 'each head clears the ring').toBeGreaterThanOrEqual(
      100,
    );
  }
  expect(tagsOf(svg, 'circle').some((tag) => tag.attributes['data-ring'] !== undefined)).toBe(true);
}

export function expectPointerShape(id: DialSpec['id']) {
  const svg = readFace(needleOf(id).image);
  expect(svg).toMatch(/viewBox="0 0 200 200" width="200" height="200"/);
  const blade = tagsOf(svg, 'path').find((tag) => tag.attributes['data-pointer'] !== undefined);
  if (!blade) throw new Error('no pointer path with data-pointer');
  const points = [...(blade.attributes['d'] ?? '').matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(
    ([, x, y]) => polar(Number(x), Number(y)),
  );
  expect(points.length, 'a blade with a square inner end and a point').toBe(5);
  const radii = points.map(({ radius }) => radius);
  expect(Math.min(...radii)).toBeGreaterThanOrEqual(14.5);
  expect(Math.min(...radii)).toBeLessThanOrEqual(17);
  expect(Math.max(...radii)).toBeGreaterThanOrEqual(67);
  expect(Math.max(...radii)).toBeLessThanOrEqual(71);
  const [first, second] = [...radii].sort((a, b) => a - b);
  expect(Math.abs((first ?? 0) - (second ?? 99)), 'a square-cut inner end').toBeLessThan(0.6);
  expect(
    points.every(({ angle }) => Math.abs(angle) < 30),
    'a pointer, no tail',
  ).toBe(true);
}
