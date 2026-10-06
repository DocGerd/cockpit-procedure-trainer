// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gtx327Device } from '../logic';
import type { Gtx327State } from '../logic';
import { Gtx327Screen } from './Gtx327Screen';

afterEach(cleanup);

const base = gtx327Device.initial as Gtx327State;
const altitudeState: Gtx327State = {
  ...base,
  mode: 'alt',
  squawk: '7000',
  altitude: 4500,
  reporting: true,
};

const show = (state: Gtx327State = altitudeState, on = true) => {
  const send = vi.fn();
  const view = render(<Gtx327Screen on={on} state={state} send={send} />);
  const display = () => view.container.querySelector('[data-display]')?.textContent ?? '';
  return { send, display, view };
};

const KEY_NAMES = ['0', '1', '2', '3', '4', '5', '6', '7'];
const BUTTON_COUNT = 6 + KEY_NAMES.length + 2 + 4;

describe('Gtx327Screen display', () => {
  it('shows the mode, the code and the altitude in ALT', () => {
    const { display } = show();
    expect(display()).toContain('ALT');
    expect(display()).toContain('7000');
    expect(display()).toContain('4500 FT');
  });

  it('shows the digits typed so far, padded', () => {
    expect(show({ ...altitudeState, entry: '12' }).display()).toContain('12__');
  });

  it('shows the test pattern in TST', () => {
    const { display } = show({ ...base, mode: 'tst' });
    expect(display()).toContain('TST');
    expect(display()).toContain('8888');
  });

  it('shows the count-up timer on its page', () => {
    const { display } = show({ ...altitudeState, page: 'countUp', timerMs: 3_725_000 });
    expect(display()).toContain('1:02:05');
    expect(display()).not.toContain('FT');
  });

  it('shows no altitude without a reading', () => {
    expect(show({ ...altitudeState, mode: 'on', altitude: null }).display()).not.toContain('FT');
  });

  it('shows the ident flag while the reply runs', () => {
    expect(show({ ...altitudeState, ident: true }).display()).toContain('IDENT');
    cleanup();
    expect(show().display()).not.toContain('IDENT');
  });

  it('is blank in OFF and while the unit is unpowered', () => {
    expect(show({ ...altitudeState, mode: 'off' }).display()).toBe('');
    cleanup();
    expect(show(altitudeState, false).display()).toBe('');
  });

  it('marks the current mode on its button', () => {
    show();
    expect(screen.getByRole('button', { name: 'ALT' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'ON' }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Gtx327Screen controls', () => {
  it('gives every operable element an accessible name', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(BUTTON_COUNT);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(screen.getByRole('button', { name: button.textContent ?? '' })).toBe(button);
    }
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(altitudeState, false);
    expect(screen.getAllByRole('button')).toHaveLength(BUTTON_COUNT);
  });

  it.each(['off', 'sby', 'tst', 'gnd', 'on', 'alt'])('sets the mode %s', async (mode) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name: mode.toUpperCase() }));
    expect(send.mock.calls).toEqual([['mode', 'set', mode]]);
  });

  it.each([
    ...KEY_NAMES.map((digit) => [digit, `key${digit}`]),
    ['CLR', 'clr'],
    ['CRSR', 'crsr'],
    ['VFR', 'vfr'],
    ['IDENT', 'ident'],
    ['FUNC', 'func'],
    ['START/STOP', 'startStop'],
  ])('the %s button presses and releases %s', async (name, control) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name }));
    expect(send.mock.calls).toEqual([
      [control, 'press'],
      [control, 'release'],
    ]);
  });

  it('holds a key from pointer down to pointer up', () => {
    const { send } = show();
    const ident = screen.getByRole('button', { name: 'IDENT' });
    fireEvent.pointerDown(ident, { button: 0 });
    expect(send.mock.calls).toEqual([['ident', 'press']]);
    fireEvent.pointerUp(ident);
    expect(send.mock.calls).toEqual([
      ['ident', 'press'],
      ['ident', 'release'],
    ]);
  });
});

describe('Gtx327Screen natural size', () => {
  it('gives every button the touch-target minimum', () => {
    const buttons = [...show().view.container.querySelectorAll<HTMLElement>('button')];
    expect(buttons).toHaveLength(BUTTON_COUNT);
    for (const button of buttons) {
      expect(button.style.minHeight).toBe('var(--size-target)');
      expect(button.style.minWidth).toBe('var(--size-target)');
    }
  });

  it('sets no text below the legibility floor', () => {
    const { container } = show().view;
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
  });
});
