// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseThenLeave } from '../controls/test-support';
import { FaceKey, KnobHelpers } from './index';

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture;
});

const tap = (target: HTMLElement) => releaseThenLeave(target, 'touch');

const face = (children: ReactNode) =>
  render(<div style={{ position: 'relative', width: 280, height: 280 }}>{children}</div>);

describe('FaceKey', () => {
  const key = (send = vi.fn(), extra: Partial<Parameters<typeof FaceKey>[0]> = {}) => {
    face(
      <FaceKey
        legend="SET"
        control="set"
        cap={{ x: 0.48, y: 0.18 }}
        capSize={0.1}
        legendGap={0.09}
        send={send}
        {...extra}
      />,
    );
    return send;
  };

  it('is one button named by its printed legend, carrying its control', () => {
    key();
    const button = screen.getByRole('button', { name: 'SET' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button.getAttribute('data-control')).toBe('set');
    expect(button.hasAttribute('data-position')).toBe(false);
    expect(button.textContent).toBe('SET');
  });

  it('takes an accessible name where the legend is a glyph, and marks the position it stands for', () => {
    key(vi.fn(), { legend: '▲▼', name: 'SWAP', control: 'swap', position: 'pressed' });
    const button = screen.getByRole('button', { name: 'SWAP' });
    expect(button.textContent).toBe('▲▼');
    expect(button.getAttribute('data-position')).toBe('pressed');
  });

  it('holds at least a touch target, centred on the cap', () => {
    key();
    const { style } = screen.getByRole('button', { name: 'SET' });
    expect(style.minWidth).toBe('var(--size-target)');
    expect(style.minHeight).toBe('var(--size-target)');
    expect(style.left).toBe('48%');
    expect(style.width).toBe('10%');
  });

  it('spans from the top of the legend to the bottom of the cap', () => {
    key(vi.fn(), { aspect: 2 });
    const { style } = screen.getByRole('button', { name: 'SET' });
    // Legend centre at 0.18 - 0.09; the cap reaches 0.1 * 2 / 2 of the height below its centre.
    expect(style.top).toBe('calc(9% - var(--leading-xs) / 2)');
    expect(style.height).toBe('calc(19% + var(--leading-xs) / 2)');
  });

  it('prints its legend in the size it is given', () => {
    key(vi.fn(), { legendSize: 'sm' });
    const { style } = screen.getByRole('button', { name: 'SET' });
    expect(style.fontSize).toBe('var(--text-sm)');
    expect(style.top).toBe('calc(9% - var(--leading-sm) / 2)');
  });

  it('marks the cap it presses, without a second target', () => {
    key();
    const cap = document.querySelector<HTMLElement>('[data-face-key-cap]');
    expect(cap?.getAttribute('aria-hidden')).toBe('true');
    expect(cap?.style.left).toBe('48%');
    expect(cap?.style.top).toBe('18%');
    expect(cap?.style.width).toBe('10%');
  });

  it('presses on pointer down and releases on pointer up', () => {
    const send = key(vi.fn(), { position: 'pressed' });
    const button = screen.getByRole('button', { name: 'SET' });
    fireEvent.pointerDown(button, { button: 0 });
    expect(send).toHaveBeenLastCalledWith('set', 'press', 'pressed');
    fireEvent.pointerUp(button, { button: 0 });
    expect(send).toHaveBeenLastCalledWith('set', 'release');
  });

  it('presses once for a touch tap, whose click comes after the pointer leaves', () => {
    const send = key();
    tap(screen.getByRole('button', { name: 'SET' }));
    expect(send.mock.calls).toEqual([
      ['set', 'press'],
      ['set', 'release'],
    ]);
  });

  it('presses without a position for a key that stands for its control', () => {
    const send = key();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'SET' }), { button: 0 });
    expect(send).toHaveBeenCalledWith('set', 'press');
  });
});

describe('KnobHelpers', () => {
  const helpers = (send = vi.fn()) => {
    face(<KnobHelpers word="FREQ" control="freq" send={send} />);
    return send;
  };

  it('stacks plus over minus, named by the knob word', () => {
    helpers();
    const [plus, minus] = screen.getAllByRole('button');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(plus?.getAttribute('aria-label')).toBe('FREQ +');
    expect(minus?.getAttribute('aria-label')).toBe('FREQ −');
    expect(plus?.textContent).toBe('+');
    expect(minus?.textContent).toBe('−');
  });

  it('marks each helper with the knob control and the position it turns to', () => {
    helpers();
    const plus = screen.getByRole('button', { name: 'FREQ +' });
    const minus = screen.getByRole('button', { name: 'FREQ −' });
    expect([plus, minus].map((button) => button.getAttribute('data-control'))).toEqual([
      'freq',
      'freq',
    ]);
    expect(plus.getAttribute('data-position')).toBe('up');
    expect(minus.getAttribute('data-position')).toBe('down');
  });

  it('turns to other positions where the knob names them so', () => {
    face(<KnobHelpers word="CODE" control="code" up="right" down="left" send={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'CODE +' }).getAttribute('data-position')).toBe(
      'right',
    );
    expect(screen.getByRole('button', { name: 'CODE −' }).getAttribute('data-position')).toBe(
      'left',
    );
  });

  it('gives each helper a whole touch target', () => {
    helpers();
    for (const button of screen.getAllByRole('button')) {
      expect(button.style.minWidth).toBe('var(--size-target)');
      expect(button.style.minHeight).toBe('var(--size-target)');
    }
  });

  it('prints the knob word once, outside the accessible names', () => {
    helpers();
    const word = document.querySelector('[data-knob-word]');
    expect(word?.textContent).toBe('FREQ');
    expect(word?.getAttribute('aria-hidden')).toBe('true');
  });

  it('turns the knob one step for a touch tap', () => {
    const send = helpers();
    tap(screen.getByRole('button', { name: 'FREQ +' }));
    expect(send.mock.calls).toEqual([
      ['freq', 'press', 'up'],
      ['freq', 'release'],
    ]);
  });

  it('turns the knob while held and lets it spring back on release', () => {
    const send = helpers();
    const plus = screen.getByRole('button', { name: 'FREQ +' });
    fireEvent.pointerDown(plus, { button: 0 });
    expect(send).toHaveBeenLastCalledWith('freq', 'press', 'up');
    fireEvent.pointerUp(plus, { button: 0 });
    expect(send).toHaveBeenLastCalledWith('freq', 'release');
    const minus = screen.getByRole('button', { name: 'FREQ −' });
    fireEvent.pointerDown(minus, { button: 0 });
    expect(send).toHaveBeenLastCalledWith('freq', 'press', 'down');
  });
});
