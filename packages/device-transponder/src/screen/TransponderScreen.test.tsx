// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { transponderDevice } from '../logic';
import type { TransponderState } from '../logic';
import { TransponderScreen } from './TransponderScreen';

afterEach(cleanup);

const base = transponderDevice.initial as TransponderState;
const altitudeState: TransponderState = { ...base, mode: 'alt', squawk: '7000', altitude: 4500 };

const show = (state: TransponderState = altitudeState, on = true) => {
  const send = vi.fn();
  const view = render(<TransponderScreen on={on} state={state} send={send} />);
  const display = () => view.container.querySelector('[data-display]')?.textContent ?? '';
  return { send, display, view };
};

describe('TransponderScreen display', () => {
  it('shows the code, the mode and the altitude in ALT', () => {
    const { display } = show();
    expect(display()).toContain('7000');
    expect(display()).toContain('ALT');
    expect(display()).toContain('4500 FT');
  });

  it('shows no altitude outside ALT', () => {
    const { display } = show({ ...base, mode: 'on', altitude: null });
    expect(display()).toContain('ON');
    expect(display()).not.toContain('FT');
  });

  it('shows only the mode in OFF', () => {
    const { display } = show({ ...base, mode: 'off', squawk: '1234' });
    expect(display()).toContain('OFF');
    expect(display()).not.toContain('1234');
  });

  it('shows the reply flag while an ident reply runs', () => {
    expect(show({ ...altitudeState, ident: true }).display()).toContain('IDENT');
    cleanup();
    expect(show(altitudeState).display()).not.toContain('IDENT');
  });

  it('shows nothing while the unit is off', () => {
    const { display } = show(altitudeState, false);
    expect(display()).toBe('');
  });

  it('marks the current mode on its button', () => {
    show();
    expect(screen.getByRole('button', { name: 'ALT' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'ON' }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('TransponderScreen controls', () => {
  it('gives every operable element an accessible name', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4 + 8 + 1);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(screen.getByRole('button', { name: button.textContent ?? '' })).toBe(button);
    }
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(altitudeState, false);
    expect(screen.getAllByRole('button')).toHaveLength(13);
  });

  it.each(['off', 'stby', 'on', 'alt'])('sets the mode %s', async (mode) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name: mode.toUpperCase() }));
    expect(send.mock.calls).toEqual([['mode', 'set', mode]]);
  });

  it.each([
    ['SQ1 +', 'code1', '0'],
    ['SQ1 −', 'code1', '6'],
    ['SQ2 +', 'code2', '1'],
    ['SQ2 −', 'code2', '7'],
    ['SQ4 +', 'code4', '1'],
    ['SQ4 −', 'code4', '7'],
  ])('%s sets %s to %s and wraps inside 0 to 7', async (name, control, digit) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name }));
    expect(send.mock.calls).toEqual([[control, 'set', digit]]);
  });

  it('steps from the digit shown, not from a fixed one', async () => {
    const { send } = show({ ...altitudeState, squawk: '1234' });
    await userEvent.click(screen.getByRole('button', { name: 'SQ3 +' }));
    await userEvent.click(screen.getByRole('button', { name: 'SQ3 −' }));
    expect(send.mock.calls).toEqual([
      ['code3', 'set', '4'],
      ['code3', 'set', '2'],
    ]);
  });

  it('presses and releases ident', async () => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name: 'IDENT' }));
    expect(send.mock.calls).toEqual([
      ['ident', 'press'],
      ['ident', 'release'],
    ]);
  });
});

describe('TransponderScreen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    const { view } = show();
    expect(view.container.querySelector('style')).toBeNull();
  });
});

describe('TransponderScreen natural size', () => {
  it('gives every button the touch-target minimum', () => {
    const buttons = [...show().view.container.querySelectorAll<HTMLElement>('button')];
    expect(buttons).toHaveLength(13);
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
    expect(container.querySelector<HTMLElement>('.cpt-device-transponder')?.style.fontSize).toMatch(
      /^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/,
    );
  });

  it('keeps the mode buttons and IDENT in one row so the screen stays short', () => {
    show();
    const row = screen.getByRole('button', { name: 'IDENT' }).parentElement;
    expect(row?.querySelector('button[aria-pressed]')).not.toBeNull();
  });
});
