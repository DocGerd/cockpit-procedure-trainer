// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { comDevice } from '../logic';
import type { ComState } from '../logic';
import { ComDisplay } from './ComDisplay';

afterEach(cleanup);

const state: ComState = { ...(comDevice.initial as ComState), active: 118000, standby: 121500 };
const show = (on = true) => render(<ComDisplay on={on} state={state} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('ComDisplay', () => {
  it('shows both frequencies and the volume', () => {
    const container = show();
    expect(text(container, 'active')).toBe('118.000');
    expect(text(container, 'standby')).toBe('121.500');
    expect(text(container, 'volume')).toBe('50%');
  });

  it('blanks the readings while the unit is off', () => {
    const container = show(false);
    for (const field of ['active', 'standby', 'volume']) expect(text(container, field)).toBe('');
  });

  it('prints COM on the bezel', () => {
    expect(show().querySelector('[data-mirror-label]')?.textContent).toBe('COM');
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
