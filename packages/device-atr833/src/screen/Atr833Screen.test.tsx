// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { atr833Device } from '../logic';
import type { Atr833State } from '../logic';
import { Atr833Screen } from './Atr833Screen';

afterEach(cleanup);

const base: Atr833State = { ...(atr833Device.initial as Atr833State), on: true, powered: true };

const show = (patch: Partial<Atr833State> = {}, on = true) => {
  const send = vi.fn();
  const view = render(<Atr833Screen on={on} state={{ ...base, ...patch }} send={send} />);
  const field = (name: string) =>
    view.container.querySelector(`[data-field="${name}"]`)?.textContent ?? '';
  return { send, field, view };
};

const KEYS = [
  ['I/O', 'power', undefined],
  ['SET', 'set', undefined],
  ['MEM', 'mem', undefined],
  ['DW', 'dw', undefined],
  ['SWAP', 'swap', undefined],
  ['CURSOR', 'cursor', undefined],
  ['VOL/SEL +', 'volSel', 'up'],
  ['VOL/SEL −', 'volSel', 'down'],
  ['FREQ +', 'freq', 'up'],
  ['FREQ −', 'freq', 'down'],
] as const;

describe('Atr833Screen display', () => {
  it('shows the frequencies and line 3', () => {
    const { field } = show();
    expect(field('active')).toBe('118.000');
    expect(field('standby')).toBe('119.000');
    expect(field('line3')).toBe('VOL 10');
  });

  it('labels the lines ACT and SBY and prints the line-3 value apart from its label', () => {
    const { view } = show();
    const labels = [...view.container.querySelectorAll('[data-line-label]')];
    expect(labels.map((label) => label.textContent)).toEqual(['ACT', 'SBY', 'VOL']);
    expect(view.container.querySelector('[data-line-value]')?.textContent).toBe('10');
  });

  it('underlines the field the cursor is on', () => {
    const { view } = show({ cursor: 'tenths' });
    const marked = view.container.querySelectorAll('[data-cursor="true"]');
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toBe('0');
  });

  it('reads DW for the standby label and marks a saved frequency', () => {
    const { view, field } = show({ dualWatch: true, saved: true });
    expect(view.container.textContent).toContain('DW');
    expect(field('standby')).toBe('>119.000');
  });

  it('shows a list entry in place of the standby frequency', () => {
    const memory = [...base.memory];
    memory[0] = 123450;
    const { field, view } = show({ memory, list: { kind: 'mem', index: 0 } });
    expect(field('standby')).toBe('123.450');
    expect(field('line3')).toBe('MEM 01');
    expect(view.container.textContent).not.toContain('SBY');
  });

  it('is blank while the install is dark or the unit is switched off', () => {
    const dark = show({}, false);
    const off = show({ on: false });
    for (const { field } of [dark, off]) {
      expect(field('active')).toBe('');
      expect(field('standby')).toBe('');
      expect(field('line3')).toBe('');
    }
  });

  it('prints every glyph in the window in the OLED colour, never white', () => {
    const { view } = show({ cursor: 'channel' });
    const window = view.container.querySelector<HTMLElement>('[data-display]');
    expect(window?.classList.contains('pk-glass')).toBe(true);
    expect(window?.style.color).toBe('var(--panel-oled)');
    const coloured = [...(window?.querySelectorAll<HTMLElement>('*') ?? [])]
      .map((element) => element.style.color)
      .filter((colour) => colour !== '');
    expect(coloured.length).toBeGreaterThan(0);
    for (const colour of coloured) expect(colour).toBe('var(--panel-oled)');
  });
});

describe('Atr833Screen face', () => {
  it('prints the legends above the keys and COM down the left', () => {
    const { view } = show();
    expect(screen.getByRole('button', { name: 'SWAP' }).textContent).toBe('▲▼');
    expect(screen.getByRole('button', { name: 'CURSOR' }).textContent).toBe('►');
    expect(screen.getByRole('button', { name: 'I/O' }).textContent).toBe('I/O');
    expect(view.container.querySelector('[data-face-label]')?.textContent).toBe('COM');
    expect(view.container.querySelector('[data-arc-legend]')?.textContent).toBe('VOL/SEL');
  });

  it('draws the disc, caps, knobs and screws as one hidden art layer without text', () => {
    const { view } = show();
    const art = view.container.querySelector('svg');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    expect(art?.querySelectorAll('[data-cap]')).toHaveLength(6);
    expect(art?.querySelectorAll('[data-knob]')).toHaveLength(2);
    expect(art?.querySelectorAll('[data-screw]')).toHaveLength(2);
    expect(art?.querySelector('text, filter, style')).toBeNull();
  });

  it('puts the knob helpers in a column right of the disc', () => {
    const { view } = show();
    const column = view.container.querySelector<HTMLElement>('[data-helper-column]');
    expect(column?.style.right).toBe('0px');
    expect(column?.querySelectorAll('[data-knob-helpers]')).toHaveLength(2);
    const face = view.container.querySelector<HTMLElement>('[data-atr833-face]');
    expect(face?.contains(column ?? null)).toBe(false);
  });
});

describe('Atr833Screen controls', () => {
  it('gives every key a native button with an accessible name, in the right order', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(
      buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toEqual(KEYS.map(([name]) => name));
    for (const button of buttons) expect(button.tagName).toBe('BUTTON');
  });

  it('keeps the keys operable while the display is blank', () => {
    show({}, false);
    expect(screen.getAllByRole('button')).toHaveLength(KEYS.length);
  });

  it.each(KEYS)('the %s key presses and releases %s', async (name, control, position) => {
    const { send } = show();
    await userEvent.click(screen.getByRole('button', { name }));
    const press = position === undefined ? [control, 'press'] : [control, 'press', position];
    expect(send.mock.calls).toEqual([press, [control, 'release']]);
  });

  it('tags the keys with the control and position they operate', () => {
    const { view } = show();
    for (const [name, control, position] of KEYS) {
      const button = screen.getByRole('button', { name });
      expect(button.dataset.control).toBe(control);
      expect(button.dataset.position).toBe(position);
    }
    expect(view.container.querySelectorAll('button')).toHaveLength(KEYS.length);
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

describe('Atr833Screen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    expect(show().view.container.querySelector('style')).toBeNull();
  });

  it('gives every button the touch-target minimum', () => {
    const buttons = [...show().view.container.querySelectorAll<HTMLElement>('button')];
    expect(buttons).toHaveLength(KEYS.length);
    for (const button of buttons) {
      expect(button.style.minHeight).toBe('var(--size-target)');
      expect(button.style.minWidth).toBe('var(--size-target)');
    }
  });

  it('sizes itself from tokens: the disc plus the helper column', () => {
    const root = show().view.container.firstElementChild as HTMLElement;
    expect(root.style.width).toMatch(/^calc\(.*var\(--space-12\).*\)$/);
    expect(root.style.height).toBe('calc(var(--space-12) * 5 + var(--space-10))');
  });

  it('sets no text below the legibility floor', () => {
    const { container } = show().view;
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
  });
});
