// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHART, FACE_SIZE_CSS, KEYS, OWNSHIP, placeIn } from '../face/geometry';
import { PAGES, aera500Device } from '../logic';
import type { Aera500State, TouchIcon } from '../logic';
import { Aera500Screen } from './Aera500Screen';

afterEach(cleanup);

const base = aera500Device.initial as Aera500State;
const lit: Aera500State = { ...base, on: true, powered: true };
const fixed: Aera500State = {
  ...lit,
  page: 'map',
  fix: true,
  groundSpeedKt: 61.4,
  trackDeg: 20,
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
  it('draws its own face at the natural size, with the glass on the display window', () => {
    const { view, window } = show();
    const face = view.container.firstElementChild as HTMLElement;
    expect(face.style.width).toBe(FACE_SIZE_CSS.width);
    expect(face.style.height).toBe(FACE_SIZE_CSS.height);
    expect(window()?.classList.contains('pk-glass')).toBe(true);
    expect(window()?.querySelector('button')).toBeNull();
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

  it('turns the north marker on the range arc opposite to the track', () => {
    const north = (trackDeg: number) => {
      const { view } = show({ ...fixed, trackDeg });
      const at = view.container.querySelector('[data-north]')?.getAttribute('transform') ?? '';
      cleanup();
      const [x = Number.NaN, y = Number.NaN] = (/translate\(([^)]+)\)/.exec(at)?.[1] ?? '')
        .split(' ')
        .map(Number);
      return { x, y };
    };
    const chartX = OWNSHIP.x - CHART.x;
    const chartY = OWNSHIP.y - CHART.y;
    expect(north(360).y).toBeLessThan(chartY);
    expect(north(360).x).toBeCloseTo(chartX);
    expect(north(30).x).toBeLessThan(chartX);
    expect(north(330).x).toBeGreaterThan(chartX);
    expect(
      show({ ...fixed, trackDeg: 180 }).view.container.querySelector('[data-north]'),
    ).toBeNull();
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

  it('keeps the keys while the display is dark, their names unprinted on the dark glass', () => {
    const { names, view } = show(base, false);
    expect(names()).toEqual(['POWER', 'Press To Accept']);
    const label = (name: string) =>
      screen.getByRole('button', { name }).querySelector<HTMLElement>('[data-key-label]');
    expect(label('Press To Accept')?.style.opacity).toBe('0');
    expect(label('POWER')?.style.opacity).toBe('');
    expect(view.container.querySelector('[data-display] [data-face-dark]')).not.toBeNull();
  });

  it('draws Menu on the map soft-key column but offers no Menu key', () => {
    const { window } = show(fixed);
    expect(window()?.querySelector('[data-key="menu"]')?.textContent).toBe('Menu');
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it.each([
    ['startup', ['accept']],
    ['home', ['map', 'nearest', 'activeFpl', 'directTo', 'position', 'tools']],
    ['map', ['home', 'zoomOut', 'zoomIn']],
    ['tools', ['back', 'home', 'gpsStatus']],
  ] as const)('places each %s key over its drawn key', (page, icons) => {
    const { view } = show({ ...lit, page });
    for (const icon of icons as readonly TouchIcon[]) {
      const key = view.container.querySelector<HTMLElement>(`[data-position="${icon}"]`);
      expect(key?.style.left, icon).toBe(placeIn(KEYS[icon].hit).left);
      expect(key?.style.top, icon).toBe(placeIn(KEYS[icon].hit).top);
      expect(key?.style.width, icon).toBe(placeIn(KEYS[icon].hit).width);
      expect(key?.style.height, icon).toBe(placeIn(KEYS[icon].hit).height);
    }
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
