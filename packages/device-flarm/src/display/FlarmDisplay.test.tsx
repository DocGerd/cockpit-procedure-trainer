// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { flarmDevice } from '../logic';
import type { FlarmState } from '../logic';
import { FlarmDisplay } from './FlarmDisplay';

afterEach(cleanup);

const operational: FlarmState = {
  ...(flarmDevice.initial as FlarmState),
  powered: true,
  stage: 'ready',
  fix: true,
  operational: true,
  clockMs: 500,
};

const show = (on = true, patch: Partial<FlarmState> = {}) =>
  render(<FlarmDisplay on={on} state={{ ...operational, ...patch }} />).container;
const lit = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-led][data-lit="true"]')].map((element) =>
    element.getAttribute('data-led'),
  );

describe('FlarmDisplay', () => {
  it('lights the status LEDs of an operational unit', () => {
    expect(lit(show()).sort()).toEqual(['gps', 'power', 'tx']);
  });

  it('shows the confirmation run on the ring', () => {
    const container = show(true, { confirm: { direction: 'in', elapsedMs: 0 } });
    expect(lit(container)).toContain('ring-0');
    expect(lit(container)).toContain('ring-9');
  });

  it('lights nothing while the unit is dark', () => {
    expect(lit(show(false))).toEqual([]);
  });

  it('prints FLARM on the bezel and the status words inline', () => {
    const container = show();
    expect(container.querySelector('[data-mirror-label]')?.textContent).toBe('FLARM');
    expect(container.textContent).toContain('Power');
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
