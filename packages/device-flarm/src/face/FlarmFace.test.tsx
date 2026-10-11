// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RING_LEDS, SELF_TEST_STEP_MS, flarmDevice } from '../logic';
import type { FlarmState } from '../logic';
import { FlarmFace } from './FlarmFace';
import {
  ABOVE,
  BELOW,
  LED_DIAMETER,
  MODE_FRAME,
  RING,
  RING_BEARINGS,
  SIDE_LED_X,
  STATUS_LEDS,
  STATUS_LED_X,
  ringLed,
  toViewX,
  toViewY,
} from './geometry';

afterEach(cleanup);

const operational: FlarmState = {
  ...(flarmDevice.initial as FlarmState),
  powered: true,
  stage: 'ready',
  fix: true,
  operational: true,
  clockMs: 500,
};

const send = () => undefined;
const pct = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;
const show = (mode: 'dock' | 'mirror', on = true, state: FlarmState = operational) =>
  render(
    mode === 'dock' ? (
      <FlarmFace mode="dock" on={on} state={state} send={send} />
    ) : (
      <FlarmFace mode="mirror" on={on} state={state} />
    ),
  ).container;

const centre = (container: HTMLElement, id: string) => {
  const led = container.querySelector(`[data-led="${id}"]`);
  return {
    x: Number(led?.getAttribute('cx')) / toViewX(1),
    y: Number(led?.getAttribute('cy')) / toViewY(1),
    diameter: (2 * Number(led?.getAttribute('r'))) / toViewY(1),
  };
};

describe.each(['dock', 'mirror'] as const)('the %s face', (mode) => {
  it('draws the 16 LEDs at their places on the face, all the same size', () => {
    const container = show(mode);
    expect(container.querySelectorAll('[data-led]')).toHaveLength(16);
    for (const { id, y } of STATUS_LEDS) {
      expect(centre(container, id)).toEqual({
        x: expect.closeTo(STATUS_LED_X, 6),
        y: expect.closeTo(y, 6),
        diameter: expect.closeTo(LED_DIAMETER, 6),
      });
    }
    expect(centre(container, 'above')).toMatchObject({
      x: expect.closeTo(SIDE_LED_X, 6),
      y: expect.closeTo(ABOVE.ledY, 6),
    });
    expect(centre(container, 'below')).toMatchObject({
      x: expect.closeTo(SIDE_LED_X, 6),
      y: expect.closeTo(BELOW.ledY, 6),
    });
  });

  it('rings the aircraft with ten LEDs clockwise from just right of the nose, none at the nose or tail', () => {
    const container = show(mode);
    RING_BEARINGS.forEach((bearing, index) => {
      const { x, y } = ringLed(bearing);
      expect(centre(container, `ring-${index}`)).toMatchObject({
        x: expect.closeTo(x, 6),
        y: expect.closeTo(y, 6),
      });
    });
    expect(RING_BEARINGS.map((bearing) => bearing % 180)).not.toContain(0);
    const first = centre(container, 'ring-0');
    const last = centre(container, 'ring-9');
    expect(first.x).toBeGreaterThan(RING.x);
    expect(last.x).toBeLessThan(RING.x);
    expect(first.y).toBeCloseTo(last.y, 6);
    expect(first.y).toBeLessThan(RING.y);
  });

  it('draws one spoke per ring LED and an aircraft outline, in the art layer only', () => {
    const container = show(mode);
    const art = container.querySelector('svg');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    expect(art?.querySelectorAll('[data-spoke]')).toHaveLength(RING_BEARINGS.length);
    expect(art?.querySelector('[data-aircraft]')).not.toBeNull();
    expect(art?.querySelector('text, style, filter')).toBeNull();
  });

  it('paints in panel colour tokens only', () => {
    const container = show(mode);
    const colours = [...container.querySelectorAll<SVGElement | HTMLElement>('*')].flatMap(
      (element) =>
        [element.style.fill, element.style.stroke, element.style.color, element.style.background]
          .filter((value) => value !== undefined && value !== '' && value !== 'none')
          .filter((value) => value !== 'transparent'),
    );
    expect(colours.length).toBeGreaterThan(0);
    for (const colour of colours) expect(colour).toMatch(/^var\(--panel-[\w-]+\)$/);
  });

  it('lights a status LED and its glow in the lit LED colour and leaves the others milky', () => {
    const container = show(mode);
    const fill = (selector: string) => container.querySelector<SVGElement>(selector)?.style.fill;
    expect(fill('[data-led="power"]')).toBe('var(--panel-led-lit)');
    expect(fill('[data-glow="power"]')).toBe('var(--panel-led-lit)');
    expect(fill('[data-led="rx"]')).toBe('var(--panel-cap-light)');
    expect(container.querySelector('[data-glow="rx"]')).toBeNull();
    expect(fill('[data-led="ring-0"]')).toBe('var(--panel-cap-light)');
  });

  it('lights every ring LED and the above and below LEDs, with their glow, in the red lamp colour', () => {
    const red = [
      ...Array.from({ length: RING_LEDS }, (_, index) => `ring-${index}`),
      'above',
      'below',
    ];
    red.forEach((id, step) => {
      const selfTest: FlarmState = {
        ...operational,
        stage: 'selfTest',
        stageMs: step * SELF_TEST_STEP_MS,
      };
      const container = show(mode, true, selfTest);
      const fill = (selector: string) => container.querySelector<SVGElement>(selector)?.style.fill;
      expect(container.querySelector(`[data-led="${id}"]`)?.getAttribute('data-lit')).toBe('true');
      expect(fill(`[data-led="${id}"]`)).toBe('var(--panel-lamp-red)');
      expect(fill(`[data-glow="${id}"]`)).toBe('var(--panel-lamp-red)');
      cleanup();
    });
  });

  it('prints the status, side and key words', () => {
    const words = show(mode).textContent ?? '';
    for (const word of ['RX', 'TX', 'GPS', 'Power', 'above', 'below', 'Mode']) {
      expect(words).toContain(word);
    }
  });

  it('keeps the face drawn while the unit is off, every LED dark', () => {
    const container = show(mode, false);
    expect(container.querySelectorAll('[data-led]')).toHaveLength(16);
    expect(container.querySelectorAll('[data-led][data-lit="true"]')).toHaveLength(0);
    expect(container.querySelector('[data-aircraft]')).not.toBeNull();
  });
});

describe('the face in the dock and in the mirror', () => {
  it('prints the unit word FLARM in the dock; in the mirror the frame prints it', () => {
    expect(show('dock').textContent).toContain('FLARM');
    expect(show('mirror').textContent).not.toContain('FLARM');
  });

  it('marks every mirror word as secondary lettering, no smaller than the extra-small step', () => {
    const tags = [...show('mirror').querySelectorAll<HTMLElement>('[style*="font-size"]')];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag.getAttribute('data-lettering')).toBe('secondary');
      expect(tag.style.fontSize).toMatch(/^var\(--text-(xs|sm|md|lg|xl|2xl|3xl)\)$/);
    }
  });

  it('prints the dock words in the primary tier', () => {
    expect(show('dock').querySelector('[data-lettering]')).toBeNull();
  });

  it('has the Mode key in the dock only, as a box over the printed frame', () => {
    const key = show('dock').querySelector<HTMLElement>('button');
    expect(key?.textContent).toBe('Mode');
    expect(key?.style).toMatchObject({
      left: pct(MODE_FRAME.left),
      top: pct(MODE_FRAME.top),
      minWidth: 'var(--size-target)',
      minHeight: 'var(--size-target)',
    });
    expect(show('mirror').querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
  });
});
