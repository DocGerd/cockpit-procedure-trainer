// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { LAMP_COLOURS } from '../indicators/options';
import {
  finish,
  Grain,
  lampGlow,
  LIGHT,
  LinearGradient,
  Materials,
  paint,
  RadialGradient,
  useMaterialId,
} from './index';
import type { Stop } from './index';

afterEach(cleanup);

const draw = (defs: ReactNode) =>
  render(
    <svg>
      <defs>{defs}</defs>
    </svg>,
  ).container;

const stopsOf = (container: HTMLElement, id: string) =>
  [...(container.querySelector(`[id="${id}"]`)?.querySelectorAll('stop') ?? [])].map((stop) => ({
    offset: stop.getAttribute('offset'),
    colour: stop.style.stopColor,
    opacity: stop.getAttribute('stop-opacity'),
  }));

describe('gradients', () => {
  it('take every stop colour from a panel token', () => {
    const container = draw(
      <>
        <LinearGradient id="a" {...LIGHT} stops={finish.bezel} />
        <RadialGradient id="b" centre={[0.4, 0.3]} radius={0.7} stops={lampGlow('amber')} />
      </>,
    );
    const stops = [...stopsOf(container, 'a'), ...stopsOf(container, 'b')];
    expect(stops.length).toBe(7);
    for (const { colour } of stops) expect(colour).toMatch(/^var\(--panel-[a-z-]+\)$/);
  });

  it('carry an opacity only where the stop names one', () => {
    const container = draw(<LinearGradient id="g" {...LIGHT} stops={finish.glare} />);
    expect(stopsOf(container, 'g')).toEqual([
      { offset: '0', colour: 'var(--panel-glare)', opacity: '0.28' },
      { offset: '0.55', colour: 'var(--panel-glare)', opacity: '0.07' },
      { offset: '1', colour: 'var(--panel-glare)', opacity: '0' },
    ]);
    const bezel = draw(<LinearGradient id="m" {...LIGHT} stops={finish.bezel} />);
    expect(stopsOf(bezel, 'm').every(({ opacity }) => opacity === null)).toBe(true);
  });

  it('place a radial gradient in user units only when asked', () => {
    const container = draw(
      <>
        <RadialGradient id="box" centre={[0.4, 0.3]} radius={0.7} stops={finish.cap} />
        <RadialGradient id="user" userSpace centre={[51, 52]} radius={49} stops={finish.recess} />
      </>,
    );
    expect(container.querySelector('#box')?.getAttribute('gradientUnits')).toBeNull();
    const user = container.querySelector('#user');
    expect(user?.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
    expect([user?.getAttribute('cx'), user?.getAttribute('cy'), user?.getAttribute('r')]).toEqual([
      '51',
      '52',
      '49',
    ]);
  });
});

describe('the brief', () => {
  const lightest = (stops: readonly Stop[]) => stops[0]?.[1];

  it('lights metal and plastic from the upper left and shades them down-right', () => {
    expect(LIGHT.from[0]).toBeLessThan(LIGHT.to[0]);
    expect(LIGHT.from[1]).toBeLessThan(LIGHT.to[1]);
    expect(lightest(finish.bezel)).toBe('metal-light');
    expect(finish.bezel.at(-1)?.[1]).toBe('metal-shade');
    expect(lightest(finish.plastic)).toBe('plastic-light');
    expect(finish.plastic.at(-1)?.[1]).toBe('plastic-shade');
    expect(lightest(finish.screw)).toBe('screw-light');
  });

  it('draws a bezel ring with at least four stops: lit, base, deep, shade', () => {
    expect(finish.bezel.map(([, token]) => token)).toEqual([
      'metal-light',
      'bezel',
      'bezel-dark',
      'metal-shade',
    ]);
  });

  it('keeps glare and shadow translucent, fading to nothing', () => {
    for (const stops of [finish.glare, finish.specular, finish.recess]) {
      for (const [, , opacity] of stops) expect(opacity).toBeLessThanOrEqual(0.75);
    }
    expect(finish.glare.at(-1)?.[2]).toBe(0);
    expect(finish.recess[0]?.[2]).toBe(0);
  });

  it.each(LAMP_COLOURS)('glows a lit %s lamp from its glow core into its lamp colour', (colour) => {
    expect(lampGlow(colour)).toEqual([
      [0, `lamp-glow-${colour}`],
      [0.45, `lamp-${colour}`],
      [1, `lamp-${colour}`, 0],
    ]);
  });
});

describe('Grain', () => {
  it('is a user-space pattern tile of token dots at low opacity', () => {
    const container = draw(<Grain id="grain" tile={4} />);
    const pattern = container.querySelector('pattern#grain');
    expect(pattern?.getAttribute('patternUnits')).toBe('userSpaceOnUse');
    expect([pattern?.getAttribute('width'), pattern?.getAttribute('height')]).toEqual(['4', '4']);
    const dots = [...(pattern?.querySelectorAll('circle') ?? [])];
    expect(dots.length).toBeGreaterThan(2);
    for (const dot of dots) {
      expect(dot.style.fill).toMatch(/^var\(--panel-(glare|shadow)\)$/);
      expect(Number(dot.getAttribute('opacity'))).toBeGreaterThanOrEqual(0.04);
      expect(Number(dot.getAttribute('opacity'))).toBeLessThanOrEqual(0.08);
    }
  });

  it('takes no filter', () => {
    expect(draw(<Grain id="grain" tile={4} />).querySelector('filter')).toBeNull();
  });
});

describe('Materials', () => {
  function Probe() {
    const id = useMaterialId('probe');
    return (
      <svg>
        <Materials id={id} recess={{ centre: [51.6, 52.4], radius: 49 }} />
        <circle style={{ fill: paint(id, 'bezel') }} />
      </svg>
    );
  }

  it('defines the shared metal and glass for one instance', () => {
    const container = render(<Probe />).container;
    const ids = [...container.querySelectorAll('[id]')].map((node) => node.id);
    const suffixes = ids.map((id) => id.slice(id.lastIndexOf('-') + 1)).sort();
    expect(suffixes).toEqual(['bezel', 'cap', 'glare', 'lip', 'recess']);
    expect(container.querySelector('filter')).toBeNull();
  });

  it('reverses the lip against the bezel', () => {
    const container = render(<Probe />).container;
    const bezel = container.querySelector('[id$="-bezel"]');
    const lip = container.querySelector('[id$="-lip"]');
    expect(lip?.getAttribute('x1')).toBe(bezel?.getAttribute('x2'));
    expect(lip?.getAttribute('y1')).toBe(bezel?.getAttribute('y2'));
  });

  it('gives every instance its own ids, usable in a url()', () => {
    const first = render(<Probe />).container;
    const second = render(<Probe />).container;
    const ids = (container: HTMLElement) =>
      [...container.querySelectorAll('[id]')].map((node) => node.id);
    expect(ids(first).filter((id) => ids(second).includes(id))).toEqual([]);
    for (const id of ids(first)) expect(id).toMatch(/^pk-probe-[a-zA-Z0-9_-]+$/);
    const fill = first.querySelector('circle')?.style.fill ?? '';
    const target = /^url\("?#([^"]+)"?\)$/.exec(fill)?.[1];
    expect(target && first.querySelector(`[id="${target}"]`)?.tagName).toBe('linearGradient');
  });
});
