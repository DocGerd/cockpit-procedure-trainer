// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOTTOM_KEYS, KEY_CAP, KEYS, KNOB, TOP_KEYS, WINDOW } from '../face/geometry';
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
  const NAMES = ['I/O', 'VFR', 'ID', 'MODE', 'CHANGE', 'CURSOR', 'CODE +', 'CODE −'];

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
  ])('the %s helper presses the knob to %s and releases it', async (name, position) => {
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

// The dock face's diameter and the type it uses, in px: tokens.css.
const D = 48 * 6 - 4;
const TARGET = 44;
const LEGEND_LEADING = 22;

type Box = { name: string; left: number; right: number; top: number; bottom: number };

/** A key's hit box as FaceKey lays it out: centred on the cap, from the legend top to the cap bottom. */
const hitBox = (key: (typeof KEYS)[number]): Box => {
  const width = Math.max(KEY_CAP * D, TARGET);
  const top = key.legendAt.y * D - LEGEND_LEADING / 2;
  const height = Math.max(
    (key.cap.y - key.legendAt.y + KEY_CAP / 2) * D + LEGEND_LEADING / 2,
    TARGET,
  );
  const centre = key.cap.x * D;
  return {
    name: key.legend,
    left: centre - width / 2,
    right: centre + width / 2,
    top,
    bottom: top + height,
  };
};

describe('Trt800hScreen face', () => {
  it('draws the face at the dock diameter, with the art behind and no style element', () => {
    const { view } = show();
    const face = view.container.querySelector<HTMLElement>('[data-face-unit]');
    expect(face?.style.width).toBe('calc(var(--space-12) * 6 - var(--space-1))');
    expect(face?.style.aspectRatio).toBe('1 / 1');
    const art = face?.querySelector('svg');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    expect(art?.querySelector('text, style, filter')).toBeNull();
    expect(view.container.querySelector('style')).toBeNull();
  });

  it('prints the six legends in their rows: I/O, VFR, ID above the display, the rest below', () => {
    show();
    const legends = (keys: readonly (typeof KEYS)[number][]) =>
      keys.map((key) => screen.getByRole('button', { name: key.name ?? key.legend }).textContent);
    expect(legends(TOP_KEYS)).toEqual(['I/O', 'VFR', 'ID']);
    expect(legends(BOTTOM_KEYS)).toEqual(['MODE', '▲▼', '►']);
    for (const key of TOP_KEYS) expect(key.cap.y + KEY_CAP / 2).toBeLessThan(WINDOW.top);
    for (const key of BOTTOM_KEYS) expect(key.legendAt.y).toBeGreaterThan(WINDOW.bottom);
    const lefts = (keys: readonly (typeof KEYS)[number][]) => keys.map((key) => key.cap.x);
    expect(lefts(TOP_KEYS)).toEqual([...lefts(TOP_KEYS)].sort());
    expect(lefts(BOTTOM_KEYS)).toEqual([...lefts(BOTTOM_KEYS)].sort());
  });

  it('places each key on its cap and gives it the touch-target minimum', () => {
    show();
    for (const key of KEYS) {
      const button = screen.getByRole('button', { name: key.name ?? key.legend });
      expect(button.className, key.legend).toBe('pk-face-key');
      expect(button.dataset.control).toBe(key.control);
      expect(button.style.left).toBe(`${Number((key.cap.x * 100).toFixed(4))}%`);
      expect(button.style.minWidth).toBe('var(--size-target)');
      expect(button.style.minHeight).toBe('var(--size-target)');
    }
  });

  it('keeps the key hit boxes inside the unit box and clear of each other', () => {
    const boxes = KEYS.map(hitBox);
    for (const box of boxes) {
      expect(box.left, box.name).toBeGreaterThanOrEqual(0);
      expect(box.right, box.name).toBeLessThanOrEqual(D);
      expect(box.top, box.name).toBeGreaterThanOrEqual(0);
      expect(box.bottom, box.name).toBeLessThanOrEqual(D);
    }
    for (const [index, a] of boxes.entries()) {
      for (const b of boxes.slice(index + 1)) {
        const apart =
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `${a.name} and ${b.name}`).toBe(true);
      }
    }
  });

  it('puts the CODE helpers outside the unit box, beside the knob', () => {
    const { view } = show();
    const face = view.container.querySelector('[data-face-unit]');
    const helpers = view.container.querySelector('[data-knob-helpers="knob"]');
    expect(helpers).not.toBeNull();
    expect(face?.contains(helpers ?? null)).toBe(false);
    expect(face?.compareDocumentPosition(helpers as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(KNOB.centre.x + KNOB.diameter / 2).toBeLessThanOrEqual(1);
    for (const name of ['CODE +', 'CODE −']) {
      expect(face?.contains(screen.getByRole('button', { name }))).toBe(false);
    }
  });

  it('lights every display line in the OLED colour, never white', () => {
    const { view } = show({ ...active, identMs: 1, cursor: 1 });
    const window = view.container.querySelector<HTMLElement>('[data-display]');
    expect(window?.classList.contains('pk-glass')).toBe(true);
    const lines = [...(window?.querySelectorAll<HTMLElement>('[data-field]') ?? [])];
    expect(lines).toHaveLength(6);
    for (const line of lines)
      expect(line.style.color, line.dataset.field).toBe('var(--panel-oled)');
    expect(window?.innerHTML).not.toMatch(/--panel-legend|--panel-needle|--panel-lamp-white/);
  });

  it('prints ATC upright down the left of the display', () => {
    const { view } = show();
    const label = view.container.querySelector<HTMLElement>('[data-face-label]');
    expect(label?.textContent).toBe('ATC');
    expect(label?.style.writingMode).toBe('vertical-lr');
    expect(label?.style.textOrientation).toBe('upright');
  });
});
