// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KEYS, LABEL } from '../face/geometry';
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
const field = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-field="${name}"]`);
const text = (container: HTMLElement, name: string) => field(container, name)?.textContent;

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

  it('blanks everything while the unit is switched off or dark, and still draws the face', () => {
    for (const container of [show(true, { on: false }), show(false)]) {
      for (const name of ['mode', 'code', 'level', 'status', 'standby', 'ident']) {
        expect(text(container, name)).toBe('');
      }
      expect(container.querySelector('[data-face-unit] svg')).not.toBeNull();
    }
  });

  it('draws its own face: no bezel chrome, with ATC upright down the left of the display', () => {
    const container = show();
    expect(container.querySelector('[data-device-mirror]')?.getAttribute('data-face')).toBe('own');
    const label = container.querySelector<HTMLElement>('[data-mirror-label]');
    expect(label?.textContent).toBe('ATC');
    expect(label?.hasAttribute('data-vertical')).toBe(true);
    expect(label?.style.left).toBe(`${Number((LABEL.x * 100).toFixed(4))}%`);
    expect(container.querySelector('[data-face-label]')).toBeNull();
  });

  it('prints the key legends as secondary lettering and the main values as primary', () => {
    const container = show(true, { identMs: 1 });
    const legends = [...container.querySelectorAll<HTMLElement>('[data-face-legend]')];
    expect(legends.map((legend) => legend.textContent)).toEqual(KEYS.map((key) => key.legend));
    for (const legend of legends) expect(legend.dataset.lettering).toBe('secondary');
    for (const name of ['level', 'ident']) {
      expect(field(container, name)?.dataset.lettering, name).toBe('secondary');
    }
    for (const name of ['mode', 'code', 'status', 'standby']) {
      expect(field(container, name)?.dataset.lettering, name).toBeUndefined();
      expect(field(container, name)?.style.fontSize, name).toBe('var(--text-2xl)');
    }
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
