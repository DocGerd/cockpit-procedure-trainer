// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ControlDefinition } from '@cpt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControlWidget } from '../types';
import { controlWidgets } from './index';
import { PLACARD_BAND, placardBand } from './Stage';
import {
  breaker,
  continuousLever,
  guarded,
  momentary,
  notchedLever,
  rotary,
  toggle2,
  widgetProps,
} from './test-support';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const samples: [string, ControlDefinition][] = [
  ['toggle', toggle2],
  ['rocker', toggle2],
  ['key-switch', rotary],
  ['rotary-knob', rotary],
  ['push-button', momentary],
  ['lever', notchedLever],
  ['lever', continuousLever],
  ['guarded-handle', guarded],
  ['circuit-breaker', breaker],
];

const widget = (id: string): ControlWidget => {
  const found = controlWidgets[id];
  if (!found) throw new Error(`no widget ${id}`);
  return found;
};

const Toggle = widget('toggle');

const placards = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-placard]')].map((element) => element.textContent);

function placeAt(px: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: px,
    height: px,
    right: px,
    bottom: px,
    toJSON: () => ({}),
  });
}

describe('printed placard', () => {
  it.each(samples)('%s prints the placard it is given, in capitals', (id, control) => {
    const Widget = widget(id);
    const { container } = render(<Widget {...widgetProps(control)} placard="Fuel" />);
    expect(placards(container)).toEqual(['FUEL']);
  });

  it.each(samples)('%s prints no placard when given none', (id, control) => {
    const Widget = widget(id);
    const { container } = render(<Widget {...widgetProps(control)} />);
    expect(placards(container)).toEqual([]);
  });

  it.each(samples.filter(([id]) => id !== 'circuit-breaker'))(
    '%s prints the placard above the control, outside its moving parts',
    (id, control) => {
      const Widget = widget(id);
      const { container } = render(<Widget {...widgetProps(control)} placard="Fuel" />);
      const text = container.querySelector('[data-placard]');
      expect(Number(text?.getAttribute('y'))).toBeLessThan(0);
      expect(text?.closest('.pk-move')).toBeNull();
      const [, top] = (container.querySelector('svg')?.getAttribute('viewBox') ?? '').split(' ');
      expect(Number(top)).toBeLessThan(0);
    },
  );

  it.each(samples)('%s keeps a shown placard at least 11 px tall', (id, control) => {
    placeAt(96);
    const Widget = widget(id);
    const { container } = render(<Widget {...widgetProps(control)} placard="Avionics" />);
    const text = container.querySelector<SVGElement>('[data-placard]');
    if (!text) throw new Error('no placard');
    const [, , width = 1, height = 1] = (
      container.querySelector('svg')?.getAttribute('viewBox') ?? ''
    )
      .split(' ')
      .map(Number);
    const scale = Math.min(96 / width, 96 / height);
    expect(Number(text.style.getPropertyValue('--pk-font')) * scale).toBeGreaterThanOrEqual(
      11 - 1e-9,
    );
  });

  it('keeps the hit targets clear of the placard band', () => {
    const { container } = render(<Toggle {...widgetProps(toggle2)} placard="Bat" />);
    const body = container.querySelector<HTMLElement>('.pk-body');
    expect(body?.contains(container.querySelector('[role="radiogroup"]'))).toBe(true);
    expect(Number.parseFloat(body?.style.top ?? '0')).toBeGreaterThan(0);
  });
});

describe('placard band', () => {
  it('keeps the design band before the widget is measured', () => {
    expect(placardBand(undefined, 11, 120, 100)).toBe(PLACARD_BAND);
  });

  it.each([
    [{ width: 57, height: 102 }, 120, 100],
    [{ width: 200, height: 60 }, 120, 120],
    [{ width: 300, height: 300 }, 100, 100],
  ])('fits the minimum text size in %o for a %i by %i widget', (room, width, height) => {
    const band = placardBand(room, 11, width, height);
    const scale = Math.min(room.width / width, room.height / (height + band));
    expect(band - 4).toBeGreaterThanOrEqual(11 / scale - 1e-9);
    expect(band).toBeGreaterThanOrEqual(PLACARD_BAND);
  });

  it('shows the placard of a narrow toggle', () => {
    placeAt(57);
    const { container } = render(<Toggle {...widgetProps(toggle2)} placard="Bat" />);
    expect(placards(container)).toEqual(['BAT']);
  });
});
