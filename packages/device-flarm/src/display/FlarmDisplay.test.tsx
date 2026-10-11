// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { flarmDevice } from '../logic';
import type { FlarmState } from '../logic';
import { MIRROR_FACE_WIDTH, WORDMARK, mirrorX } from '../face/geometry';
import { FlarmDisplay } from './FlarmDisplay';

afterEach(cleanup);

const pct = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

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

  it('draws its own face, with FLARM printed in the wordmark place', () => {
    const container = show();
    expect(container.querySelector('[data-device-mirror]')?.getAttribute('data-face')).toBe('own');
    const label = container.querySelector<HTMLElement>('[data-mirror-label]');
    expect(label?.textContent).toBe('FLARM');
    expect(label?.style.left).toBe(pct(mirrorX(WORDMARK.x)));
    expect(label?.style.top).toBe(pct(WORDMARK.y));
  });

  it('prints every word of the face, as on the dock', () => {
    const text = show().textContent ?? '';
    for (const word of ['RX', 'TX', 'GPS', 'Power', 'above', 'below', 'Mode']) {
      expect(text).toContain(word);
    }
  });

  it('keeps the slot at 2:1 with the face centred in it', () => {
    const container = show();
    expect(container.querySelector<HTMLElement>('.pk-mirror-bezel')?.style.aspectRatio).toBe(
      '2 / 1',
    );
    const face = container.querySelector<HTMLElement>('[data-display]');
    expect(face?.style.width).toBe(pct(MIRROR_FACE_WIDTH));
    expect(face?.style.left).toBe(pct(mirrorX(0)));
  });

  it('offers nothing to operate and renders no style element', () => {
    const container = show();
    expect(container.querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
    expect(container.querySelector('style')).toBeNull();
  });
});
