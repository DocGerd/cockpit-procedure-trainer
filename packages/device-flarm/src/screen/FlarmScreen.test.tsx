// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flarmDevice } from '../logic';
import type { FlarmState } from '../logic';
import { FlarmScreen } from './FlarmScreen';

afterEach(cleanup);

const base = flarmDevice.initial as FlarmState;
const operational: FlarmState = {
  ...base,
  powered: true,
  stage: 'ready',
  fix: true,
  operational: true,
  clockMs: 500,
};

const show = (state: FlarmState = operational, on = true) => {
  const send = vi.fn();
  const view = render(<FlarmScreen on={on} state={state} send={send} />);
  const led = (id: string) =>
    view.container.querySelector(`[data-led="${id}"]`)?.getAttribute('data-lit');
  return { send, led, view };
};

describe('FlarmScreen display', () => {
  it('lights Power, GPS and TX once operational and leaves RX dark', () => {
    const { led } = show();
    expect(['power', 'gps', 'tx', 'rx'].map(led)).toEqual(['true', 'true', 'true', 'false']);
  });

  it('draws all 16 LEDs', () => {
    const { view } = show();
    expect(view.container.querySelectorAll('[data-led]')).toHaveLength(16);
  });

  it('lights the ring LED the self-test is on', () => {
    const { view } = show({ ...base, powered: true, stage: 'selfTest', stageMs: 350 });
    const lit = [...view.container.querySelectorAll('[data-led][data-lit="true"]')];
    expect(lit.map((element) => element.getAttribute('data-led'))).toEqual(['ring-3']);
  });

  it('lights nothing while the unit is off', () => {
    const { view } = show(operational, false);
    expect(view.container.querySelectorAll('[data-led][data-lit="true"]')).toHaveLength(0);
  });

  it('prints the status words and the above and below words', () => {
    const { view } = show();
    const words = view.container.querySelector('[data-display]')?.textContent ?? '';
    for (const word of ['RX', 'TX', 'GPS', 'Power', 'above', 'below']) {
      expect(words).toContain(word);
    }
  });
});

describe('FlarmScreen controls', () => {
  it('has one button named Mode that carries its control id', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: 'Mode' }).getAttribute('data-control')).toBe('mode');
  });

  it('keeps the key operable while the display is dark', () => {
    show(operational, false);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('presses and releases on a click', async () => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name: 'Mode' }));
    expect(send.mock.calls).toEqual([
      ['mode', 'press'],
      ['mode', 'release'],
    ]);
  });

  it('presses on pointer down and releases only on pointer up', () => {
    const { send } = show();
    const key = screen.getByRole('button', { name: 'Mode' });
    fireEvent.pointerDown(key, { button: 0 });
    expect(send.mock.calls).toEqual([['mode', 'press']]);
    fireEvent.pointerUp(key);
    expect(send.mock.calls).toEqual([
      ['mode', 'press'],
      ['mode', 'release'],
    ]);
  });
});

describe('FlarmScreen face', () => {
  it('is the face itself at its natural size: a token width at nine to five', () => {
    const face = show().view.container.firstElementChild as HTMLElement | null;
    expect(face?.hasAttribute('data-display')).toBe(true);
    expect(face?.style.width).toBe('calc(var(--space-12) * 7 + var(--space-1))');
    expect(face?.style.aspectRatio).toBe('9 / 5');
  });

  it('prints FLARM and every face word in the primary tier', () => {
    const { container } = show().view;
    expect(container.textContent).toContain('FLARM');
    expect(container.querySelector('[data-lettering]')).toBeNull();
  });

  it('sizes the Mode key to the printed frame around its cap', () => {
    show();
    const key = screen.getByRole('button', { name: 'Mode' });
    expect(key.style.width).toBe('19%');
    expect(key.style.height).toBe('37%');
  });
});

describe('FlarmScreen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    expect(show().view.container.querySelector('style')).toBeNull();
  });

  it('gives the key the touch-target minimum', () => {
    show();
    const key = screen.getByRole('button', { name: 'Mode' });
    expect(key.style.minHeight).toBe('var(--size-target)');
    expect(key.style.minWidth).toBe('var(--size-target)');
  });

  it('sets no text outside the type scale', () => {
    const { container } = show().view;
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
  });
});
