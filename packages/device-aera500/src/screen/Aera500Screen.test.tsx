// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAGES, aera500Device } from '../logic';
import type { Aera500State } from '../logic';
import { Aera500Screen } from './Aera500Screen';

afterEach(cleanup);

const base = aera500Device.initial as Aera500State;
const lit: Aera500State = { ...base, on: true, powered: true };
const fixed: Aera500State = {
  ...lit,
  page: 'map',
  fix: true,
  groundSpeedKt: 61.4,
  trackDeg: 270,
  altitudeFt: 2400,
};

const show = (state: Aera500State = lit, on = true) => {
  const send = vi.fn();
  const view = render(<Aera500Screen on={on} state={state} send={send} />);
  const window = () => view.container.querySelector('[data-display]');
  const text = (field: string) =>
    window()?.querySelector(`[data-field="${field}"]`)?.textContent ?? undefined;
  const names = () => screen.getAllByRole('button').map((button) => button.textContent);
  return { send, view, window, text, names };
};

describe('Aera500Screen glass', () => {
  it('puts the display window first, so the glass lies over it and not over the keys', () => {
    const { view, window } = show();
    expect(view.container.firstElementChild?.firstElementChild).toBe(window());
  });

  it('asks for the database acceptance at the start-up page', () => {
    const { window } = show();
    expect(window()?.querySelector('[data-page="startup"]')).not.toBeNull();
    expect(window()?.textContent).toContain('DATABASES');
  });

  it('shows signal bars on Home that grow with the receiver status', () => {
    const lit = (patch: Partial<Aera500State>) =>
      show({ ...fixed, page: 'home', ...patch })
        .view.container.querySelector('[data-field="bars"]')
        ?.getAttribute('data-lit');
    expect(lit({ fix: false, acquiringMs: 0 })).toBe('0');
    cleanup();
    expect(lit({ fix: false, acquiringMs: 20_000 })).toBe('2');
    cleanup();
    expect(lit({ fix: true })).toBe('4');
  });

  it('draws the map with all four data fields, GS live and the rest dashed', () => {
    const { text, window } = show(fixed);
    expect(text('speed')).toBe('GS 61KT');
    expect(text('bearing')).toBe('BRG ---');
    expect(text('ete')).toBe('ETE NEXT ---');
    expect(text('dist')).toBe('DIST NEXT ---');
    expect(text('range')).toBe('5NM');
    expect(window()?.querySelector('[data-field="map"] [data-north]')).not.toBeNull();
    expect(window()?.querySelector('[data-field="unknown"]')).toBeNull();
  });

  it('shows a question mark over the aircraft and no GS without a fix', () => {
    const { text } = show({ ...lit, page: 'map' });
    expect(text('unknown')).toBe('?');
    expect(text('speed')).toBe('GS ---KT');
  });

  it('follows the range step', () => {
    expect(show({ ...fixed, rangeIndex: 6 }).text('range')).toBe('50NM');
  });

  it('turns the north marker around the aircraft opposite to the track', () => {
    const north = (trackDeg: number) => {
      const { view } = show({ ...fixed, trackDeg });
      const at = view.container.querySelector('[data-north]')?.getAttribute('transform') ?? '';
      cleanup();
      const [x = Number.NaN, y = Number.NaN] = (/translate\(([^)]+)\)/.exec(at)?.[1] ?? '')
        .split(' ')
        .map(Number);
      return { x, y };
    };
    const ownship = { x: 100, y: 58 };
    expect(north(360).y).toBeLessThan(ownship.y);
    expect(north(90).x).toBeLessThan(ownship.x);
    expect(north(270).x).toBeGreaterThan(ownship.x);
  });

  it('reads the GPS altitude on the Position page', () => {
    expect(show({ ...fixed, page: 'position' }).text('altitude')).toBe('ALT 2400FT');
    cleanup();
    expect(show({ ...lit, page: 'position' }).text('altitude')).toBe('ALT ---FT');
  });

  it('prints the receiver status on the GPS Status page', () => {
    expect(show({ ...lit, page: 'gpsStatus' }).text('status')).toBe('Searching the Sky');
    cleanup();
    expect(show({ ...lit, page: 'gpsStatus', acquiringMs: 20_000 }).text('status')).toBe(
      'Acquiring Satellites',
    );
    cleanup();
    expect(show({ ...lit, page: 'gpsStatus', fix: true }).text('status')).toBe('3D GPS Location');
  });

  it('shows the backlight level in its overlay in place of the page', () => {
    const { text, window } = show({ ...fixed, overlay: true, backlight: 7 });
    expect(text('backlight')).toBe('7/10');
    expect(window()?.querySelector('[data-field="map"]')).toBeNull();
  });

  it.each(PAGES)('names the %s page', (page) => {
    expect(
      show({ ...lit, page })
        .window()
        ?.querySelector(`[data-page="${page}"]`),
    ).not.toBeNull();
  });

  it('is blank while the unit is switched off or unpowered', () => {
    expect(show({ ...fixed, on: false }).window()?.textContent).toBe('');
    cleanup();
    const dark = show(fixed, false);
    expect(dark.window()?.textContent).toBe('');
    expect(dark.window()?.querySelector('[data-field="map"]')).toBeNull();
  });
});

describe('Aera500Screen keys', () => {
  it('names the POWER button and the acceptance icon at the start-up page', () => {
    expect(show().names()).toEqual(['POWER', 'Press To Accept']);
  });

  it.each([
    ['home', ['Map', 'Nearest', 'Active FPL', 'Direct To', 'Position', 'Tools']],
    ['map', ['Home', 'Out', 'In']],
    ['nearest', ['Back', 'Home']],
    ['tools', ['Back', 'Home', 'GPS Status']],
    ['gpsStatus', ['Back', 'Home']],
  ] as const)('shows the icons of the %s page', (page, icons) => {
    expect(show({ ...lit, page }).names()).toEqual(['POWER', ...icons]);
  });

  it('shows the backlight icons over the page while the overlay is open', () => {
    expect(show({ ...lit, page: 'home', overlay: true }).names()).toEqual(['POWER', '−', '+']);
  });

  it('keeps the keys while the display is dark', () => {
    expect(show(base, false).names()).toEqual(['POWER', 'Press To Accept']);
  });

  it('gives every key a data-control, and each icon its position', () => {
    show({ ...lit, page: 'home' });
    for (const button of screen.getAllByRole('button')) {
      const control = button.getAttribute('data-control');
      expect(control === 'power' || control === 'touch').toBe(true);
      expect(button.hasAttribute('data-position')).toBe(control === 'touch');
    }
    expect(screen.getByRole('button', { name: 'Active FPL' }).dataset.position).toBe('activeFpl');
    expect(screen.getByRole('button', { name: 'Tools' }).tagName).toBe('BUTTON');
  });

  it('presses and releases the touchscreen at the icon', async () => {
    const { send } = show({ ...lit, page: 'home' });
    await userEvent.click(screen.getByRole('button', { name: 'Direct To' }));
    expect(send.mock.calls).toEqual([
      ['touch', 'press', 'directTo'],
      ['touch', 'release'],
    ]);
  });

  it('holds POWER from pointer down to pointer up', () => {
    const { send } = show();
    const power = screen.getByRole('button', { name: 'POWER' });
    fireEvent.pointerDown(power, { button: 0 });
    expect(send.mock.calls).toEqual([['power', 'press']]);
    fireEvent.pointerUp(power);
    expect(send.mock.calls).toEqual([
      ['power', 'press'],
      ['power', 'release'],
    ]);
  });
});

describe('Aera500Screen styling and size', () => {
  it('renders no style element, which a strict content security policy would block', () => {
    for (const state of [lit, fixed, { ...fixed, overlay: true }]) {
      expect(show(state).view.container.querySelector('style')).toBeNull();
      cleanup();
    }
  });

  it('gives every key the touch-target minimum', () => {
    const { view } = show({ ...lit, page: 'home' });
    const keys = [...view.container.querySelectorAll<HTMLElement>('button')];
    expect(keys).toHaveLength(7);
    for (const key of keys) {
      expect(key.style.minHeight).toBe('var(--size-target)');
      expect(key.style.minWidth).toBe('var(--size-target)');
    }
  });

  it.each(PAGES)('sets no text outside the type scale on the %s page', (page) => {
    const { view } = show({ ...fixed, page });
    const sizes = [...view.container.querySelectorAll<HTMLElement>('*')]
      .map((element) => element.style.fontSize)
      .filter((size) => size !== '' && size !== 'inherit');
    for (const size of sizes) expect(size).toMatch(/^var\(--text-(2xs|xs|sm|md|lg|xl|2xl|3xl)\)$/);
  });
});
