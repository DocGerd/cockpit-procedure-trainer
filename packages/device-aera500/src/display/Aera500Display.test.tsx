// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PAGES, aera500Device } from '../logic';
import type { Aera500State } from '../logic';
import { AERA500_MIRROR, Aera500Display } from './Aera500Display';

afterEach(cleanup);

const state: Aera500State = {
  ...(aera500Device.initial as Aera500State),
  on: true,
  powered: true,
  page: 'map',
  fix: true,
  groundSpeedKt: 61.4,
  trackDeg: 90,
};
const show = (on = true, patch: Partial<Aera500State> = {}) =>
  render(<Aera500Display on={on} state={{ ...state, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Aera500Display', () => {
  it('draws the map with ground speed, the range and the north marker', () => {
    const container = show();
    expect(text(container, 'speed')).toBe('GS 61KT');
    expect(text(container, 'range')).toBe('5NM');
    expect(container.querySelector('[data-field="map"] [data-north]')).not.toBeNull();
  });

  it('keeps the fields that carry a reading and leaves the dashed route fields to the screen', () => {
    const container = show();
    expect(text(container, 'bearing')).toBe('BRG ---');
    expect(text(container, 'ete')).toBeUndefined();
    expect(text(container, 'dist')).toBeUndefined();
  });

  it('shows the question mark without a fix', () => {
    expect(text(show(true, { fix: false, groundSpeedKt: null }), 'unknown')).toBe('?');
  });

  it('shows the other pages without icons', () => {
    expect(show(true, { page: 'startup' }).textContent).toContain('DATABASES');
    cleanup();
    expect(text(show(true, { page: 'gpsStatus' }), 'status')).toBe('3D GPS Location');
    cleanup();
    expect(text(show(true, { overlay: true, backlight: 4 }), 'backlight')).toBe('4/10');
  });

  it.each(PAGES)('draws the %s page', (page) => {
    expect(show(true, { page }).querySelector(`[data-page="${page}"]`)).not.toBeNull();
  });

  it('blanks the display while the unit is off or dark', () => {
    for (const container of [show(true, { on: false }), show(false)]) {
      expect(container.querySelector('[data-page]')).toBeNull();
      expect(container.querySelector('[data-face-dark]')?.textContent).toBe('');
    }
  });

  it('prints GPS on the bezel with the 8:5 mirror size', () => {
    const container = show();
    expect(container.querySelector('[data-mirror-label]')?.textContent).toBe('GPS');
    expect(container.querySelector<HTMLElement>('.pk-mirror-bezel')?.style.aspectRatio).toBe(
      AERA500_MIRROR.aspectRatio,
    );
  });

  it('sets its text at the slot lettering size or larger', () => {
    for (const patch of [{}, { page: 'startup' }, { page: 'home' }, { overlay: true }] as const) {
      const sizes = [...show(true, patch).querySelectorAll<HTMLElement>('*')]
        .map((element) => element.style.fontSize)
        .filter((size) => size !== '');
      cleanup();
      for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xl|3xl)\)$/);
    }
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
