// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { sl40Device } from '../logic';
import type { Sl40State } from '../logic';
import { Sl40Display } from './Sl40Display';

afterEach(cleanup);

const state: Sl40State = {
  ...(sl40Device.initial as Sl40State),
  active: 118000,
  standby: 121500,
  monitoring: false,
};
const show = (on = true) => render(<Sl40Display on={on} state={state} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Sl40Display', () => {
  it('shows both frequencies and the volume', () => {
    const container = show();
    expect(text(container, 'active')).toBe('118.000');
    expect(text(container, 'standby')).toBe('121.500');
    expect(text(container, 'volume')).toBe('50%');
  });

  it('marks the standby legend while the standby frequency is monitored', () => {
    const container = render(<Sl40Display on state={{ ...state, monitoring: true }} />).container;
    expect(text(container, 'standbyLegend')).toBe('STBY MON');
    expect(text(show(), 'standbyLegend')).toBe('STBY');
    expect(
      text(
        render(<Sl40Display on={false} state={{ ...state, monitoring: true }} />).container,
        'standbyLegend',
      ),
    ).toBe('STBY');
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
