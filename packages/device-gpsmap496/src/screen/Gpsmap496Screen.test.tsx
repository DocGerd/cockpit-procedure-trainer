// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gpsmap496Device } from '../logic';
import type { Gpsmap496State } from '../logic';
import { Gpsmap496Screen } from './Gpsmap496Screen';

afterEach(cleanup);

const base = gpsmap496Device.initial as Gpsmap496State;
const lit: Gpsmap496State = { ...base, on: true };

const show = (state: Gpsmap496State = lit, on = true) => {
  const send = vi.fn();
  const view = render(<Gpsmap496Screen on={on} state={state} send={send} />);
  const display = () => view.container.querySelector('[data-display]')?.textContent ?? '';
  return { send, display, view };
};

const BUTTONS = ['POWER', 'LIGHT', 'PAGE', 'QUIT'];

describe('Gpsmap496Screen display', () => {
  it('shows the page name and that there is no position', () => {
    const { display } = show();
    expect(display()).toContain('MAP');
    expect(display()).toContain('NO POSITION');
  });

  it.each([
    ['map', 'MAP'],
    ['terrain', 'TERRAIN'],
    ['route', 'ACTIVE ROUTE'],
    ['info', 'INFORMATION'],
  ] as const)('names the %s page', (page, name) => {
    expect(show({ ...lit, page }).display()).toContain(name);
  });

  it('shows the backlight level', () => {
    expect(show({ ...lit, backlight: 2 }).display()).toContain('LIGHT 3/3');
  });

  it('is blank while the unit is switched off or unpowered', () => {
    expect(show({ ...lit, on: false }).display()).toBe('');
    cleanup();
    expect(show(lit, false).display()).toBe('');
  });
});

describe('Gpsmap496Screen controls', () => {
  it('gives every operable element an accessible name', () => {
    show();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(BUTTONS);
    for (const button of buttons) expect(button.tagName).toBe('BUTTON');
  });

  it('keeps the buttons operable while the display is blank', () => {
    show(base, false);
    expect(screen.getAllByRole('button')).toHaveLength(BUTTONS.length);
  });

  it.each([
    ['POWER', 'power'],
    ['LIGHT', 'backlight'],
    ['PAGE', 'page'],
    ['QUIT', 'quit'],
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
    const page = screen.getByRole('button', { name: 'PAGE' });
    fireEvent.pointerDown(page, { button: 0 });
    expect(send.mock.calls).toEqual([['page', 'press']]);
    fireEvent.pointerUp(page);
    expect(send.mock.calls).toEqual([
      ['page', 'press'],
      ['page', 'release'],
    ]);
  });
});

describe('Gpsmap496Screen natural size', () => {
  it('gives every button the touch-target minimum', () => {
    const buttons = [...show().view.container.querySelectorAll<HTMLElement>('button')];
    expect(buttons).toHaveLength(BUTTONS.length);
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
