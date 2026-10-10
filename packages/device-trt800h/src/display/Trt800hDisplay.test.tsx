// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { trt800hDevice } from '../logic';
import type { Trt800hState } from '../logic';
import { Trt800hDisplay } from './Trt800hDisplay';

afterEach(cleanup);

const state: Trt800hState = {
  ...(trt800hDevice.initial as Trt800hState),
  on: true,
  mode: 'acs',
  squawk: '1200',
  standby: '4321',
  flightLevel: 30,
};
const show = (on = true, patch: Partial<Trt800hState> = {}) =>
  render(<Trt800hDisplay on={on} state={{ ...state, ...patch }} />).container;
const text = (container: HTMLElement, field: string) =>
  container.querySelector(`[data-field="${field}"]`)?.textContent;

describe('Trt800hDisplay', () => {
  it('shows the mode, the codes and the flight level', () => {
    const container = show();
    expect(text(container, 'mode')).toBe('ACS');
    expect(text(container, 'code')).toBe('1200');
    expect(text(container, 'level')).toBe('FL 030');
    expect(text(container, 'standby')).toBe('4321');
  });

  it('shows STBY, the ident and VFR', () => {
    const container = show(true, { mode: 'stby', identMs: 1, vfrShown: true });
    expect(text(container, 'status')).toBe('STBY');
    expect(text(container, 'ident')).toBe('IDT');
    expect(text(container, 'standby')).toBe('VFR');
  });

  it('blanks everything while the unit is switched off or dark', () => {
    for (const container of [show(true, { on: false }), show(false)]) {
      for (const field of ['mode', 'code', 'level', 'status', 'standby', 'ident']) {
        expect(text(container, field)).toBe('');
      }
    }
  });

  it('prints ATC on the bezel and draws the knob', () => {
    const container = show();
    expect(container.querySelector('[data-mirror-label]')?.textContent).toBe('ATC');
    expect(container.querySelector('[data-knob]')).not.toBeNull();
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
