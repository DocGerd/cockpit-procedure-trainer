// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// @ts-expect-error the device package declares no node types
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCK_DIAMETER } from '../face/AtcFace';
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

// The panel's own scale: the :root block of tokens.css, in px.
const rootTokens = (() => {
  const { dirname } = import.meta as ImportMeta & { dirname: string };
  const css = readFileSync(`${dirname}/../../../../apps/web/src/styles/tokens.css`, 'utf8');
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  return new Map(
    [...root.matchAll(/--([\w-]+):\s*([\d.]+)px;/g)].map(([, name = '', px = '']) => [
      name,
      Number(px),
    ]),
  );
})();

/** Evaluates a CSS length (px, var(), calc() with + - * /, and % of `base`) in px. */
const cssPx = (length: string, base = 0): number => {
  const tokens = length
    .replace(/var\(--([\w-]+)\)/g, (_, name: string) => {
      const px = rootTokens.get(name);
      if (px === undefined) throw new Error(`tokens.css :root has no px --${name}`);
      return String(px);
    })
    .replace(/([\d.]+)%/g, (_, value: string) => String((Number(value) / 100) * base))
    .replace(/([\d.]+)px/g, '$1')
    .replace(/calc\(/g, '(')
    .match(/[\d.]+|[-+*/()]/g);
  if (tokens === null) throw new Error(`not a length: ${length}`);
  let at = 0;
  const factor = (): number => {
    const token = tokens[at++];
    if (token === '(') {
      const value = sum();
      at++;
      return value;
    }
    if (token === '-') return -factor();
    return Number(token);
  };
  const product = (): number => {
    let value = factor();
    while (tokens[at] === '*' || tokens[at] === '/')
      value = tokens[at++] === '*' ? value * factor() : value / factor();
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (tokens[at] === '+' || tokens[at] === '-')
      value = tokens[at++] === '+' ? value + product() : value - product();
    return value;
  };
  return sum();
};

const D = cssPx(DOCK_DIAMETER);

type Box = { name: string; left: number; right: number; top: number; bottom: number };

/** A key's hit box from its rendered style in the square dock face; .pk-face-key centres it on `left`. */
const hitBox = (button: HTMLElement): Box => {
  const { style } = button;
  const width = Math.max(cssPx(style.width, D), cssPx(style.minWidth));
  const height = Math.max(cssPx(style.height, D), cssPx(style.minHeight));
  const centre = cssPx(style.left, D);
  const top = cssPx(style.top, D);
  return {
    name: button.textContent ?? '',
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
    expect(face?.style.width).toBe(DOCK_DIAMETER);
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
    expect(lefts(TOP_KEYS)).toEqual([...lefts(TOP_KEYS)].sort((a, b) => a - b));
    expect(lefts(BOTTOM_KEYS)).toEqual([...lefts(BOTTOM_KEYS)].sort((a, b) => a - b));
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
    show();
    const boxes = KEYS.map((key) =>
      hitBox(screen.getByRole('button', { name: key.name ?? key.legend })),
    );
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

  it('aligns the display lines as the photographed unit does', () => {
    const { view } = show();
    const width = WINDOW.right - WINDOW.left;
    const fraction = (value: string) => Number.parseFloat(value) / 100;
    const at = (name: string) => {
      const style = view.container.querySelector<HTMLElement>(`[data-field="${name}"]`)?.style;
      if (style === undefined) throw new Error(`no ${name} field`);
      return {
        y: WINDOW.top + fraction(style.top) * (WINDOW.bottom - WINDOW.top),
        left: style.left === '' ? null : WINDOW.left + fraction(style.left) * width,
        right: style.right === '' ? null : WINDOW.right - fraction(style.right) * width,
      };
    };
    const near = (value: number | null, target: number, field: string) =>
      expect(Math.abs((value ?? Number.NaN) - target), field).toBeLessThanOrEqual(0.01);

    const [mode, code, ident, level, status, standby] = [
      'mode',
      'code',
      'ident',
      'level',
      'status',
      'standby',
    ].map(at);
    for (const [line, y] of [
      [[mode, code], 0.33],
      [[ident, level], 0.475],
      [[status, standby], 0.565],
    ] as const)
      for (const field of line) near(field?.y ?? null, y, `line at ${y}`);

    for (const [name, field] of Object.entries({ mode, ident, status })) {
      near(field?.left ?? null, 0.18, name);
      expect(field?.right, name).toBeNull();
    }
    near(code?.right ?? null, 0.69, 'code');
    near(standby?.right ?? null, 0.69, 'standby');
    near(level?.right ?? null, 0.64, 'level');
    for (const [name, field] of Object.entries({ code, level, standby })) {
      expect(field?.left, name).toBeNull();
      expect(field?.right, name).toBeLessThanOrEqual(0.7);
    }
  });

  it('prints ATC upright down the left of the display', () => {
    const { view } = show();
    const label = view.container.querySelector<HTMLElement>('[data-face-label]');
    expect(label?.textContent).toBe('ATC');
    expect(label?.style.writingMode).toBe('vertical-lr');
    expect(label?.style.textOrientation).toBe('upright');
  });
});
