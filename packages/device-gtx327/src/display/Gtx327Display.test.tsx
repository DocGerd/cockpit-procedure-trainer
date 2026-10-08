// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { gtx327Device } from '../logic';
import type { Gtx327State } from '../logic';
import { Gtx327Display } from './Gtx327Display';

afterEach(cleanup);

const state: Gtx327State = {
  ...(gtx327Device.initial as Gtx327State),
  mode: 'alt',
  squawk: '1200',
  entry: '',
  altitude: 4500,
  ident: false,
  page: 'altitude',
  timerMs: 0,
};
const show = (on = true, patch: Partial<Gtx327State> = {}) =>
  render(<Gtx327Display on={on} state={{ ...state, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Gtx327Display', () => {
  it('shows the mode, the code and the altitude', () => {
    const container = show();
    expect(text(container, 'mode')).toBe('ALT');
    expect(text(container, 'code')).toBe('1200');
    expect(text(container, 'reading')).toBe('4500 FT');
    expect(text(container, 'ident')).toBeUndefined();
  });

  it('shows the timer on the count-up page, the keyed digits and the ident', () => {
    const container = show(true, { page: 'countUp', timerMs: 5000, entry: '12', ident: true });
    expect(text(container, 'reading')).toBe('0:00:05');
    expect(text(container, 'code')).toBe('12__');
    expect(text(container, 'ident')).toBe('IDENT');
  });

  it('blanks everything in the off mode and while the unit is dark', () => {
    for (const container of [show(true, { mode: 'off' }), show(false, { ident: true })]) {
      for (const field of ['mode', 'code', 'reading']) expect(text(container, field)).toBe('');
      expect(text(container, 'ident')).toBeUndefined();
    }
  });

  it('prints XPDR on the bezel', () => {
    expect(show().querySelector('[data-mirror-label]')?.textContent).toBe('XPDR');
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
