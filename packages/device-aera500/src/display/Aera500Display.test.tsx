// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FACE, LABEL_AT, MAP_FIELDS } from '../face/geometry';
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
  trackDeg: 10,
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

  it('shows the same four map fields as the dock', () => {
    const container = show();
    expect(text(container, 'bearing')).toBe('BRG ---');
    expect(text(container, 'ete')).toBe('ETE NEXT ---');
    expect(text(container, 'dist')).toBe('DIST NEXT ---');
  });

  it.each(Object.entries(MAP_FIELDS))(
    'centres the %s label on its photographed row',
    (field, spec) => {
      const at = show().querySelector<HTMLElement>(`[data-field="${field}"]`);
      const percent = (value: number) => `${Number((value * 100).toFixed(4))}%`;
      expect(at?.style.top).toBe(percent((spec.row[0] + spec.row[1]) / 2));
      expect(at?.style.transform).toBe('translateY(calc(var(--text-xs) / -2))');
    },
  );

  it('stacks the outlined map labels over the glass and its edge shade, the chart under it', () => {
    const container = show();
    const glass = container.querySelector('.pk-glass');
    const map = glass?.querySelector<SVGElement>('[data-field="map"]');
    expect(map?.style.zIndex).toBe('');
    for (const field of [...Object.keys(MAP_FIELDS), 'range']) {
      const label = glass?.querySelector<HTMLElement>(`[data-field="${field}"]`);
      expect(Number(label?.style.zIndex)).toBeGreaterThan(0);
      expect(label?.style.textShadow).toContain('var(--panel-shadow)');
      expect(label?.style.color).toBe('');
    }
  });

  it('draws the Map soft keys, Menu among them, as art', () => {
    const keys = [...show().querySelectorAll('[data-key]')].map((key) => key.textContent);
    expect(keys).toEqual(['Out', 'In', 'Menu', 'Home']);
  });

  it('shows the question mark without a fix', () => {
    expect(text(show(true, { fix: false, groundSpeedKt: null }), 'unknown')).toBe('?');
  });

  it('shows the other pages and their keys without operating them', () => {
    expect(show(true, { page: 'startup' }).textContent).toContain('DATABASES');
    cleanup();
    expect(text(show(true, { page: 'gpsStatus' }), 'status')).toBe('3D GPS Location');
    cleanup();
    expect(text(show(true, { overlay: true, backlight: 4 }), 'backlight')).toBe('4/10');
  });

  it.each(PAGES)('draws the %s page', (page) => {
    expect(show(true, { page }).querySelector(`[data-page="${page}"]`)).not.toBeNull();
  });

  it('darkens the window but keeps the face while the unit is off or dark', () => {
    for (const render of [() => show(true, { on: false }), () => show(false)]) {
      const container = render();
      expect(container.querySelector('[data-page]')).toBeNull();
      expect(container.querySelector('[data-face-dark]')?.textContent).toBe('');
      expect(container.querySelector('[data-face-art]')).not.toBeNull();
      cleanup();
    }
  });

  it('prints GPS in the body band of its own face, in the 8:5 mirror size', () => {
    const container = show();
    expect(container.querySelector('.pk-mirror')?.getAttribute('data-face')).toBe('own');
    const label = container.querySelector<HTMLElement>('[data-mirror-label]');
    expect(label?.textContent).toBe('GPS');
    expect(label?.style.left).toBe('50%');
    expect(Number.parseFloat(label?.style.top ?? '')).toBeCloseTo((LABEL_AT.y / FACE.height) * 100);
    expect(container.querySelector<HTMLElement>('.pk-mirror-bezel')?.style.aspectRatio).toBe(
      AERA500_MIRROR.aspectRatio,
    );
  });

  it('sets all its own lettering as secondary, at the secondary slot size or larger', () => {
    const patches = [{}, { page: 'startup' }, { page: 'home' }, { overlay: true }] as const;
    for (const patch of patches) {
      const sized = [...show(true, patch).querySelectorAll<HTMLElement>('[style*="font-size"]')];
      cleanup();
      expect(sized.length).toBeGreaterThan(0);
      for (const element of sized) {
        expect(element.dataset.lettering, element.outerHTML).toBe('secondary');
        expect(element.style.fontSize).toMatch(/^var\(--text-(xs|sm|md|lg|xl|2xl|3xl)\)$/);
      }
    }
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
