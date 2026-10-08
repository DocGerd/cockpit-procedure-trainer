// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { transponderDevice } from '../logic';
import type { TransponderState } from '../logic';
import { TransponderDisplay } from './TransponderDisplay';

afterEach(cleanup);

const state: TransponderState = {
  ...(transponderDevice.initial as TransponderState),
  mode: 'alt',
  squawk: '1200',
  altitude: 3499.6,
  ident: false,
};
const show = (on = true, patch: Partial<TransponderState> = {}) =>
  render(<TransponderDisplay on={on} state={{ ...state, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('TransponderDisplay', () => {
  it('shows the mode, the code and the altitude', () => {
    const container = show();
    expect(text(container, 'mode')).toBe('ALT');
    expect(text(container, 'code')).toBe('1200');
    expect(text(container, 'altitude')).toBe('3500 FT');
    expect(text(container, 'ident')).toBeUndefined();
  });

  it('shows the ident while it is active', () => {
    expect(text(show(true, { ident: true }), 'ident')).toBe('IDENT');
  });

  it('shows no code in the off mode and no altitude without one', () => {
    const container = show(true, { mode: 'off', altitude: null });
    expect(text(container, 'mode')).toBe('OFF');
    expect(text(container, 'code')).toBe('');
    expect(text(container, 'altitude')).toBe('');
  });

  it('blanks everything while the unit is dark', () => {
    const container = show(false, { ident: true });
    for (const field of ['mode', 'code', 'altitude']) expect(text(container, field)).toBe('');
    expect(text(container, 'ident')).toBeUndefined();
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
