// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { comDevice } from '../logic';
import type { ComState } from '../logic';
import { ComScreen } from './ComScreen';

afterEach(cleanup);

const state: ComState = {
  ...(comDevice.initial as ComState),
  active: 118000,
  standby: 120350,
  volume: 0.7,
};

const show = (on = true) => {
  const send = vi.fn();
  render(<ComScreen on={on} state={state} send={send} />);
  return send;
};

describe('ComScreen display', () => {
  it('shows the active and standby frequencies', () => {
    show();
    expect(screen.getByText('118.000')).toBeTruthy();
    expect(screen.getByText('120.350')).toBeTruthy();
  });

  it('shows no frequency while the unit is off', () => {
    show(false);
    expect(screen.queryByText('118.000')).toBeNull();
    expect(screen.queryByText('120.350')).toBeNull();
  });

  it('follows the state it is given', () => {
    const send = vi.fn();
    const { rerender } = render(<ComScreen on state={state} send={send} />);
    rerender(<ComScreen on state={{ ...state, active: 125500, standby: 118025 }} send={send} />);
    expect(screen.getByText('125.500')).toBeTruthy();
    expect(screen.getByText('118.025')).toBeTruthy();
  });

  it('puts the volume on the slider', () => {
    show();
    expect((screen.getByRole('slider', { name: 'VOL' }) as HTMLInputElement).value).toBe('0.7');
  });
});

describe('ComScreen controls', () => {
  it('gives every operable element an accessible name', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    for (const button of buttons) expect(button.tagName).toBe('BUTTON');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'STBY MHz −',
      'STBY MHz +',
      'STBY kHz −',
      'STBY kHz +',
      'SWAP',
    ]);
    expect(screen.getByRole('slider', { name: 'VOL' })).toBeTruthy();
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(false);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it.each([
    ['STBY MHz +', 'coarse', 'up'],
    ['STBY MHz −', 'coarse', 'down'],
    ['STBY kHz +', 'fine', 'up'],
    ['STBY kHz −', 'fine', 'down'],
  ])('%s presses and releases the %s knob %s', async (name, control, position) => {
    const send = show();
    await userEvent.click(screen.getByRole('button', { name }));
    expect(send.mock.calls).toEqual([
      [control, 'press', position],
      [control, 'release'],
    ]);
  });

  it('presses and releases swap', async () => {
    const send = show();
    await userEvent.click(screen.getByRole('button', { name: 'SWAP' }));
    expect(send.mock.calls).toEqual([
      ['swap', 'press'],
      ['swap', 'release'],
    ]);
  });

  it('sets the volume from the slider', () => {
    const send = show();
    fireEvent.change(screen.getByRole('slider', { name: 'VOL' }), { target: { value: '0.2' } });
    expect(send).toHaveBeenCalledWith('volume', 'set', 0.2);
  });
});

describe('ComScreen styling', () => {
  const css = () => {
    const { container } = render(<ComScreen on state={state} send={vi.fn()} />);
    return container.querySelector('style')?.textContent ?? '';
  };

  it('styles the volume slider in both engines', () => {
    const text = css();
    expect(text).toMatch(/input\[type="range"\] \{[^}]*accent-color: var\(--panel-/);
    expect(text).toContain('::-webkit-slider-thumb {');
    expect(text).toContain('::-moz-range-thumb {');
    expect(text).toContain('::-webkit-slider-runnable-track {');
    expect(text).toContain('::-moz-range-track {');
  });

  it('takes every colour from a panel token and uses no brand or status token', () => {
    const text = css();
    expect(text).not.toMatch(/--color-/);
    const colours = [
      ...text.matchAll(/(?:^|[\s;{])(?:color|background|accent-color):\s*([^;}]+)/g),
    ];
    expect(colours.length).toBeGreaterThan(0);
    for (const [, value = ''] of colours) {
      expect(value).toMatch(/var\(--panel-|transparent/);
    }
  });
});

describe('ComScreen natural size', () => {
  const natural = () => render(<ComScreen on state={state} send={vi.fn()} />).container;

  it('gives every button and the slider the touch-target minimum', () => {
    const container = natural();
    const controls = [...container.querySelectorAll<HTMLElement>('button, input')];
    expect(controls).toHaveLength(6);
    for (const control of controls) {
      expect(control.style.minHeight).toBe('var(--size-target)');
    }
    for (const button of container.querySelectorAll<HTMLElement>('button')) {
      expect(button.style.minWidth).toBe('var(--size-target)');
    }
  });

  it('sets no text below the legibility floor', () => {
    const container = natural();
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
    expect(container.querySelector<HTMLElement>('.cpt-device-com')?.style.fontSize).toMatch(
      /^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/,
    );
  });
});
