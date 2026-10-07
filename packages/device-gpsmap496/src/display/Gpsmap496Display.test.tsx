// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { gpsmap496Device } from '../logic';
import type { Gpsmap496State } from '../logic';
import { Gpsmap496Display } from './Gpsmap496Display';

afterEach(cleanup);

const state: Gpsmap496State = {
  ...(gpsmap496Device.initial as Gpsmap496State),
  on: true,
  page: 'route',
  backlight: 2,
};
const show = (on = true, patch: Partial<Gpsmap496State> = {}) =>
  render(<Gpsmap496Display on={on} state={{ ...state, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Gpsmap496Display', () => {
  it('shows the page, that there is no position, and the backlight level', () => {
    const container = show();
    expect(text(container, 'page')).toBe('ACTIVE ROUTE');
    expect(text(container, 'position')).toBe('NO POSITION');
    expect(text(container, 'backlight')).toBe('LIGHT 3/3');
  });

  it('dims the display with the backlight level', () => {
    const colours = [0, 1, 2].map((backlight) => {
      const colour = show(true, { backlight }).querySelector<HTMLElement>('[data-backlight]')?.style
        .color;
      cleanup();
      return colour;
    });
    expect(new Set(colours).size).toBe(3);
  });

  it('blanks the display while the receiver is off or the unit is dark', () => {
    for (const container of [show(true, { on: false }), show(false)]) {
      expect(text(container, 'page')).toBeUndefined();
      expect(container.querySelector('[data-backlight]')?.textContent).toBe('');
    }
  });

  it('prints GPS on the bezel', () => {
    expect(show().querySelector('[data-mirror-label]')?.textContent).toBe('GPS');
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
