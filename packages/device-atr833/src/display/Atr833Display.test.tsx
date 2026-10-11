// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { atr833Device } from '../logic';
import type { Atr833State } from '../logic';
import { Atr833Screen } from '../screen/Atr833Screen';
import { ATR833_MIRROR, Atr833Display } from './Atr833Display';

afterEach(cleanup);

const base: Atr833State = { ...(atr833Device.initial as Atr833State), on: true, powered: true };

const show = (on = true, patch: Partial<Atr833State> = {}) =>
  render(<Atr833Display on={on} state={{ ...base, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Atr833Display', () => {
  it('shows the frequencies and line 3', () => {
    const container = show();
    expect(text(container, 'active')).toBe('118.000');
    expect(text(container, 'standby')).toBe('119.000');
    expect(text(container, 'line3')).toBe('VOL 10');
  });

  it('shows dual watch and the chosen item with a two-digit value', () => {
    const container = show(true, { dualWatch: true, item: 'sql' });
    expect(container.textContent).toContain('DW');
    expect(text(container, 'standby')).toBe('119.000');
    expect(text(container, 'line3')).toBe('SQL 05');
  });

  it('blanks the window while the install is dark or the unit is switched off, and keeps the face', () => {
    const dark = show(false);
    const off = show(true, { on: false });
    for (const container of [dark, off]) {
      for (const field of ['active', 'standby', 'line3']) expect(text(container, field)).toBe('');
      expect(container.querySelectorAll('[data-cap]')).toHaveLength(6);
      expect(container.querySelector('[data-arc-legend]')?.textContent).toBe('VOL/SEL');
    }
  });

  it('draws its own face and prints COM down the left of it', () => {
    const container = show();
    expect(container.querySelector('[data-device-mirror]')?.getAttribute('data-face')).toBe('own');
    const label = container.querySelector<HTMLElement>('[data-mirror-label]');
    expect(label?.textContent).toBe('COM');
    expect(label?.hasAttribute('data-vertical')).toBe(true);
    expect(container.querySelector('[data-face-label]')).toBeNull();
  });

  it('draws the same face as the dock: caps, knobs, screws and the key legends', () => {
    const container = show();
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-knob]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-screw]')).toHaveLength(2);
    const legends = [...container.querySelectorAll('[data-key-legend]')];
    expect(legends.map((legend) => legend.textContent)).toEqual([
      'I/O',
      'SET',
      'MEM',
      'DW',
      '▲▼',
      '►',
    ]);
  });

  it('places each key legend where the dock prints it', () => {
    const mirror = [...show().querySelectorAll<HTMLElement>('[data-key-legend]')];
    const dock = [
      ...render(
        <Atr833Screen on state={base} send={vi.fn()} />,
      ).container.querySelectorAll<HTMLElement>('.pk-face-key'),
    ];
    expect(dock.map((key) => key.textContent)).toEqual(mirror.map((legend) => legend.textContent));
    for (const [index, legend] of mirror.entries()) {
      const key = dock[index];
      expect(legend.style.left, legend.textContent ?? '').toBe(key?.style.left);
      expect(key?.style.top, legend.textContent ?? '').toMatch(
        new RegExp(`^calc\\(${legend.style.top.replace('.', '\\.')} - `),
      );
    }
  });

  it('is a square mirror', () => {
    expect(ATR833_MIRROR.aspectRatio).toBe('1 / 1');
    const bezel = show().querySelector<HTMLElement>('.pk-mirror-bezel');
    expect(bezel?.style.aspectRatio).toBe('1 / 1');
  });

  it('prints nothing at the lower-right frequency knob (intake section 9 question 36)', () => {
    expect(show().textContent).not.toContain('FREQ');
  });

  it('offers nothing to operate and renders no style or script element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style, script')).toBeNull();
  });

  it('prints the face legends and line labels secondary and the values primary', () => {
    const container = show();
    const sized = [...container.querySelectorAll<HTMLElement>('*')].filter(
      (element) => element.style.fontSize !== '',
    );
    expect(sized.length).toBeGreaterThan(0);
    for (const element of sized) {
      const size = element.style.fontSize;
      if (element.dataset.lettering === 'secondary') {
        expect(size).toMatch(/^var\(--text-(xs|sm|md|lg|xl|2xl|3xl)\)$/);
      } else {
        expect(size).toMatch(/^var\(--text-(2xl|3xl)\)$/);
      }
    }
    for (const selector of ['[data-key-legend]', '[data-line-label]', '[data-arc-legend] > *']) {
      const tagged = [...container.querySelectorAll<HTMLElement>(selector)];
      expect(tagged.length, selector).toBeGreaterThan(0);
      for (const element of tagged) expect(element.dataset.lettering, selector).toBe('secondary');
    }
    for (const field of ['active', 'standby']) {
      const value = container.querySelector<HTMLElement>(`[data-field="${field}"]`);
      expect(value?.dataset.lettering).toBeUndefined();
      expect(value?.style.fontSize).toBe('var(--text-3xl)');
    }
  });
});
