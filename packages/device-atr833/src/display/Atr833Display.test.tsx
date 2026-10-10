// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { atr833Device } from '../logic';
import type { Atr833State } from '../logic';
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

  it('shows dual watch, the saved mark and the chosen item', () => {
    const container = show(true, { dualWatch: true, saved: true, item: 'sql' });
    expect(container.textContent).toContain('DW');
    expect(text(container, 'standby')).toBe('>119.000');
    expect(text(container, 'line3')).toBe('SQL 5');
  });

  it('blanks everything while the install is dark or the unit is switched off', () => {
    const dark = show(false);
    const off = show(true, { on: false });
    for (const container of [dark, off]) {
      for (const field of ['active', 'standby', 'line3']) expect(text(container, field)).toBe('');
    }
  });

  it('prints COM on the bezel', () => {
    expect(show().querySelector('[data-mirror-label]')?.textContent).toBe('COM');
  });

  it('draws the two knobs as plain discs', () => {
    const container = show();
    expect(container.querySelectorAll('[data-knob]')).toHaveLength(2);
  });

  it('is a square mirror, 272 units wide', () => {
    expect(ATR833_MIRROR.aspectRatio).toBe('1 / 1');
    const bezel = show().querySelector<HTMLElement>('.pk-mirror-bezel');
    expect(bezel?.style.aspectRatio).toBe('1 / 1');
  });

  it('offers nothing to operate and renders no style or script element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style, script')).toBeNull();
  });

  it('sets its text only in the large type scale', () => {
    const sizes = [...show().querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '');
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xl|3xl)\)$/);
  });
});
