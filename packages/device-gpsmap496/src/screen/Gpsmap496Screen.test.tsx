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
const fixed: Gpsmap496State = { ...lit, fix: true, groundSpeedKt: 107.6, trackDeg: 180 };

const show = (state: Gpsmap496State = lit, on = true) => {
  const send = vi.fn();
  const view = render(<Gpsmap496Screen on={on} state={state} send={send} />);
  const display = () => view.container.querySelector('[data-display]')?.textContent ?? '';
  return { send, display, view };
};

const BUTTONS = ['POWER', 'LIGHT', 'PAGE', 'QUIT'];

describe('Gpsmap496Screen display', () => {
  it('shows the page name and that it is acquiring satellites', () => {
    const { display, view } = show();
    expect(display()).toContain('MAP');
    expect(display()).toContain('ACQUIRING');
    expect(view.container.querySelector('[data-field="map"]')).toBeNull();
  });

  it('draws the map with ground speed and track once it has a fix', () => {
    const { display, view } = show(fixed);
    expect(display()).toContain('GS 108KT');
    expect(display()).toContain('TRK 180°');
    expect(display()).not.toContain('ACQUIRING');
    expect(view.container.querySelector('[data-field="map"]')).not.toBeNull();
  });

  it('turns the north marker with the track', () => {
    const north = (trackDeg: number) => {
      const { view } = show({ ...fixed, trackDeg });
      const at = view.container.querySelector('[data-north]')?.getAttribute('transform');
      cleanup();
      return at;
    };
    expect(north(360)).not.toBe(north(180));
    expect(north(90)).not.toBe(north(270));
  });

  it('prints dashes for a reading it does not have', () => {
    const { display, view } = show({ ...fixed, groundSpeedKt: null, trackDeg: null });
    expect(display()).toContain('GS ---KT');
    expect(display()).toContain('TRK ---°');
    expect(view.container.querySelector('[data-north]')).toBeNull();
  });

  it('shows the fix on the other pages', () => {
    expect(show({ ...fixed, page: 'terrain' }).display()).toContain('3D FIX');
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

  it('dims and brightens the display with the backlight level', () => {
    const colours = [0, 1, 2].map((backlight) => {
      const { view } = show({ ...lit, backlight });
      const colour = view.container.querySelector<HTMLElement>('[data-display]')?.style.color;
      cleanup();
      return colour;
    });
    expect(new Set(colours).size).toBe(3);
  });

  it('is blank while the unit is switched off or unpowered', () => {
    expect(show({ ...lit, on: false }).display()).toBe('');
    cleanup();
    const dark = show(fixed, false);
    expect(dark.display()).toBe('');
    expect(dark.view.container.querySelector('[data-field="map"]')).toBeNull();
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

describe('Gpsmap496Screen styling', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    for (const state of [lit, fixed]) {
      expect(show(state).view.container.querySelector('style')).toBeNull();
      cleanup();
    }
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

  it.each([
    ['acquiring', lit],
    ['with a fix', fixed],
  ])('sets no text below the legibility floor (%s)', (_name, state) => {
    const { container } = show(state).view;
    const sizes = [...container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
  });
});
