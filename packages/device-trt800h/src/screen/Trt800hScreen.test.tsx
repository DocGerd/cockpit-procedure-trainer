// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trt800hDevice } from '../logic';
import type { Trt800hState } from '../logic';
import { Trt800hScreen } from './Trt800hScreen';

afterEach(cleanup);

const base = trt800hDevice.initial as Trt800hState;
const active: Trt800hState = {
  ...base,
  on: true,
  mode: 'acs',
  squawk: '1200',
  standby: '4321',
  flightLevel: 30,
  reporting: true,
};

const show = (state: Trt800hState = active, on = true) => {
  const send = vi.fn();
  const view = render(<Trt800hScreen on={on} state={state} send={send} />);
  const field = (name: string) =>
    view.container.querySelector(`[data-field="${name}"]`)?.textContent;
  const display = () => view.container.querySelector('[data-display]')?.textContent ?? '';
  return { send, field, display, view };
};

describe('Trt800hScreen display', () => {
  it('shows the mode, the active code, the flight level and the standby code', () => {
    const { field } = show();
    expect(field('mode')).toBe('ACS');
    expect(field('code')).toBe('1200');
    expect(field('level')).toBe('FL 030');
    expect(field('standby')).toBe('4321');
    expect(field('status')).toBe('');
    expect(field('ident')).toBe('');
  });

  it('shows STBY at the bottom left in standby and no mode on top', () => {
    const { field } = show({ ...active, mode: 'stby' });
    expect(field('mode')).toBe('');
    expect(field('status')).toBe('STBY');
  });

  it('shows A-S, IDT during an ident, and FLerr for an invalid level', () => {
    const { field } = show({ ...active, mode: 'as', identMs: 1000, flightLevel: null });
    expect(field('mode')).toBe('A-S');
    expect(field('ident')).toBe('IDT');
    expect(field('level')).toBe('FLerr');
  });

  it('shows VFR, or S after a store, in place of the standby code', () => {
    expect(show({ ...active, vfrShown: true }).field('standby')).toBe('VFR');
    cleanup();
    expect(show({ ...active, vfrShown: true, storedMs: 10 }).field('standby')).toBe('S');
  });

  it('marks the digit under the cursor', () => {
    const { view } = show({ ...active, cursor: 2 });
    const marked = [...view.container.querySelectorAll('[data-cursor="true"]')];
    expect(marked.map((digit) => digit.textContent)).toEqual(['2']);
    expect(view.container.querySelectorAll('[data-cursor]')).toHaveLength(4);
  });

  it('is blank while the unit is switched off or dark', () => {
    expect(show(base).display().trim()).toBe('');
    cleanup();
    expect(show(active, false).display().trim()).toBe('');
  });
});

describe('Trt800hScreen controls', () => {
  const NAMES = ['I/O', 'VFR', 'ID', 'MODE', 'CHANGE', 'CURSOR', 'CODE −', 'CODE +'];

  it('gives every operable element an accessible name and a printed label', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.tagName)).toEqual(Array(NAMES.length).fill('BUTTON'));
    for (const name of NAMES) expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CHANGE' }).textContent).toBe('▲▼');
    expect(screen.getByRole('button', { name: 'CURSOR' }).textContent).toBe('►');
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(base, false);
    expect(screen.getAllByRole('button')).toHaveLength(NAMES.length);
  });

  it.each([
    ['I/O', 'power'],
    ['VFR', 'vfr'],
    ['ID', 'ident'],
    ['MODE', 'mode'],
    ['CHANGE', 'swap'],
    ['CURSOR', 'cursor'],
  ])('the %s button presses and releases %s', async (name, control) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name }));
    expect(send.mock.calls).toEqual([
      [control, 'press'],
      [control, 'release'],
    ]);
  });

  it.each([
    ['CODE −', 'down'],
    ['CODE +', 'up'],
  ])('the %s button presses the knob to %s and releases it', async (name, position) => {
    const { send } = show();
    const key = screen.getByRole('button', { name });
    expect(key.dataset.control).toBe('knob');
    expect(key.dataset.position).toBe(position);
    await userEvent.click(key);
    expect(send.mock.calls).toEqual([
      ['knob', 'press', position],
      ['knob', 'release'],
    ]);
  });

  it('holds a key from pointer down to pointer up', () => {
    const { send } = show();
    const power = screen.getByRole('button', { name: 'I/O' });
    fireEvent.pointerDown(power, { button: 0 });
    expect(send.mock.calls).toEqual([['power', 'press']]);
    fireEvent.pointerUp(power);
    expect(send.mock.calls).toEqual([
      ['power', 'press'],
      ['power', 'release'],
    ]);
  });
});

describe('Trt800hScreen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    expect(show().view.container.querySelector('style')).toBeNull();
  });

  it('gives every button the touch-target minimum', () => {
    const buttons = [...show().view.container.querySelectorAll<HTMLElement>('button')];
    expect(buttons).toHaveLength(8);
    for (const button of buttons) {
      expect(button.style.minHeight).toBe('var(--size-target)');
      expect(button.style.minWidth).toBe('var(--size-target)');
    }
  });
});
