// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sl40Device } from '../logic';
import type { Sl40State } from '../logic';
import { Sl40Screen } from './Sl40Screen';

afterEach(cleanup);

const state: Sl40State = {
  ...(sl40Device.initial as Sl40State),
  active: 118000,
  standby: 120350,
  volume: 0.7,
};

const show = (on = true) => {
  const send = vi.fn();
  render(<Sl40Screen on={on} state={state} send={send} />);
  return send;
};

describe('Sl40Screen display', () => {
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
    const { rerender } = render(<Sl40Screen on state={state} send={send} />);
    rerender(<Sl40Screen on state={{ ...state, active: 125500, standby: 118025 }} send={send} />);
    expect(screen.getByText('125.500')).toBeTruthy();
    expect(screen.getByText('118.025')).toBeTruthy();
  });

  it('flags monitoring while the unit is on', () => {
    const send = vi.fn();
    render(<Sl40Screen on state={{ ...state, monitoring: true }} send={send} />);
    expect(screen.getByText('MONITOR')).toBeTruthy();
  });

  it('shows no monitor flag when not monitoring', () => {
    show();
    expect(screen.queryByText('MONITOR')).toBeNull();
  });

  it('puts the volume on the slider', () => {
    show();
    expect((screen.getByRole('slider', { name: 'VOL' }) as HTMLInputElement).value).toBe('0.7');
  });
});

describe('Sl40Screen controls', () => {
  it('gives every operable element an accessible name', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    for (const button of buttons) expect(button.tagName).toBe('BUTTON');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'STBY MHz −',
      'STBY MHz +',
      'STBY kHz −',
      'STBY kHz +',
      'SWAP',
      'MON',
    ]);
    expect(screen.getByRole('slider', { name: 'VOL' })).toBeTruthy();
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(false);
    expect(screen.getAllByRole('button')).toHaveLength(6);
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

  it('holds monitor from pointer down to pointer up', () => {
    const send = show();
    const mon = screen.getByRole('button', { name: 'MON' });
    fireEvent.pointerDown(mon, { button: 0 });
    expect(send.mock.calls).toEqual([['monitor', 'press']]);
    fireEvent.pointerUp(mon);
    expect(send.mock.calls).toEqual([
      ['monitor', 'press'],
      ['monitor', 'release'],
    ]);
  });

  it('keeps monitor held while the pointer drifts off the button, until it is lifted', () => {
    const capture = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: capture,
    });
    try {
      const send = show();
      const mon = screen.getByRole('button', { name: 'MON' });
      fireEvent.pointerDown(mon, { button: 0, pointerId: 3 });
      expect(capture).toHaveBeenCalledWith(3);
      fireEvent.pointerLeave(mon, { pointerId: 3 });
      expect(send.mock.calls).toEqual([['monitor', 'press']]);
      fireEvent.pointerUp(mon, { pointerId: 3 });
      fireEvent.lostPointerCapture(mon, { pointerId: 3 });
      expect(send.mock.calls).toEqual([
        ['monitor', 'press'],
        ['monitor', 'release'],
      ]);
    } finally {
      delete (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture;
    }
  });

  it('releases monitor when the pointer is cancelled or the button loses focus', () => {
    const send = show();
    const mon = screen.getByRole('button', { name: 'MON' });
    fireEvent.pointerDown(mon, { button: 0 });
    fireEvent.pointerCancel(mon);
    fireEvent.pointerDown(mon, { button: 0 });
    fireEvent.blur(mon);
    expect(send.mock.calls.map(([, action]) => action)).toEqual([
      'press',
      'release',
      'press',
      'release',
    ]);
  });

  it.each(['Enter', ' '])('holds monitor from %j key down to key up', (key) => {
    const send = show();
    const mon = screen.getByRole('button', { name: 'MON' });
    fireEvent.keyDown(mon, { key });
    fireEvent.keyDown(mon, { key, repeat: true });
    expect(send.mock.calls).toEqual([['monitor', 'press']]);
    fireEvent.keyUp(mon, { key });
    expect(send.mock.calls).toEqual([
      ['monitor', 'press'],
      ['monitor', 'release'],
    ]);
  });

  it('presses and releases monitor on a click with no pointer or key', () => {
    const send = show();
    fireEvent.click(screen.getByRole('button', { name: 'MON' }));
    expect(send.mock.calls).toEqual([
      ['monitor', 'press'],
      ['monitor', 'release'],
    ]);
  });

  it('shows MONITOR while held and clears it after release', () => {
    let current = { ...state };
    const send = vi.fn();
    const { rerender } = render(<Sl40Screen on state={current} send={send} />);
    const mon = screen.getByRole('button', { name: 'MON' });
    fireEvent.pointerDown(mon, { button: 0 });
    current = { ...current, monitoring: true };
    rerender(<Sl40Screen on state={current} send={send} />);
    expect(screen.getByText('MONITOR')).toBeTruthy();
    fireEvent.pointerUp(mon);
    current = { ...current, monitoring: false };
    rerender(<Sl40Screen on state={current} send={send} />);
    expect(screen.queryByText('MONITOR')).toBeNull();
  });

  it('sets the volume from the slider', () => {
    const send = show();
    fireEvent.change(screen.getByRole('slider', { name: 'VOL' }), { target: { value: '0.2' } });
    expect(send).toHaveBeenCalledWith('volume', 'set', 0.2);
  });
});

describe('Sl40Screen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    const { container } = render(<Sl40Screen on state={state} send={vi.fn()} />);
    expect(container.querySelector('style')).toBeNull();
  });
});

describe('Sl40Screen natural size', () => {
  const natural = () => render(<Sl40Screen on state={state} send={vi.fn()} />).container;

  it('gives every button and the slider the touch-target minimum', () => {
    const container = natural();
    const controls = [...container.querySelectorAll<HTMLElement>('button, input')];
    expect(controls).toHaveLength(7);
    for (const control of controls) {
      expect(control.style.minHeight).toBe('var(--size-target)');
    }
    for (const button of container.querySelectorAll<HTMLElement>('button')) {
      expect(button.style.minWidth).toBe('var(--size-target)');
    }
  });

  it('puts no gap between targets and draws the space inside each button', () => {
    const container = natural();
    for (const button of container.querySelectorAll<HTMLElement>('button')) {
      expect(button.parentElement?.style.gap).toBe('0px');
      expect(button.style.boxShadow).toMatch(/^inset /);
    }
  });

  it('sets no text below the legibility floor', () => {
    const container = natural();
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
    expect(container.querySelector<HTMLElement>('.cpt-device-sl40')?.style.fontSize).toMatch(
      /^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/,
    );
  });
});
