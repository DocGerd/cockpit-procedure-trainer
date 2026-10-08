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
  it('shows the page, that it is acquiring satellites, and the backlight level', () => {
    const container = show();
    expect(text(container, 'page')).toBe('ACTIVE ROUTE');
    expect(text(container, 'position')).toBe('ACQUIRING');
    expect(text(container, 'backlight')).toBe('LIGHT 3/3');
  });

  it('shows the fix on a page without the map', () => {
    expect(text(show(true, { fix: true }), 'position')).toBe('3D FIX');
  });

  it('draws the map with ground speed and track once it has a fix', () => {
    const container = show(true, { page: 'map', fix: true, groundSpeedKt: 54.2, trackDeg: 90 });
    expect(text(container, 'speed')).toBe('GS 54KT');
    expect(text(container, 'track')).toBe('TRK 090°');
    expect(container.querySelector('[data-field="map"] [data-north]')).not.toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('draws no map while acquiring', () => {
    expect(show(true, { page: 'map' }).querySelector('[data-field="map"]')).toBeNull();
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
    for (const container of [show(true, { on: false }), show(false, { page: 'map', fix: true })]) {
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
