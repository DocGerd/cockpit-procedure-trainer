// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceDisplayFrame, GPS_MIRROR, RADIO_MIRROR } from './index';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mount = (on = true) =>
  render(
    <DeviceDisplayFrame on={on} size={RADIO_MIRROR} label="COM">
      <span>118.000</span>
    </DeviceDisplayFrame>,
  ).container;

describe('DeviceDisplayFrame', () => {
  it('prints the unit name on the bezel and holds the display on the screen', () => {
    const container = mount();
    const bezel = container.querySelector('.pk-mirror-bezel');
    expect(bezel?.querySelector('[data-mirror-label]')?.textContent).toBe('COM');
    expect(container.querySelector('.pk-mirror-screen')?.textContent).toBe('118.000');
    expect(container.querySelector('[data-device-mirror]')?.getAttribute('data-on')).toBe('true');
  });

  it('draws the bezel at the natural size of the slot it is made for', () => {
    const bezel = mount().querySelector<HTMLElement>('.pk-mirror-bezel');
    expect(bezel?.style.width).toBe(RADIO_MIRROR.width);
    expect(bezel?.style.aspectRatio).toBe('520 / 150');
    cleanup();
    const gps = render(
      <DeviceDisplayFrame on size={GPS_MIRROR} label="GPS">
        <span />
      </DeviceDisplayFrame>,
    ).container.querySelector<HTMLElement>('.pk-mirror-bezel');
    expect(gps?.style.aspectRatio).toBe('400 / 300');
  });

  it('darkens the screen while off', () => {
    expect(mount(true).querySelector('[data-screen-off]')).toBeNull();
    cleanup();
    const off = mount(false);
    expect(off.querySelector('[data-screen-off]')?.getAttribute('aria-hidden')).toBe('true');
    expect(off.querySelector('[data-device-mirror]')?.getAttribute('data-on')).toBe('false');
  });

  it('offers nothing to operate', () => {
    expect(mount().querySelectorAll('button, input, [tabindex]')).toHaveLength(0);
  });
});

describe('DeviceDisplayFrame scaling', () => {
  type Size = { width: number; height: number };
  let box: Size = { width: 0, height: 0 };
  let content: Size = { width: 0, height: 0 };
  let callbacks: (() => void)[] = [];
  const observed: Element[] = [];

  const sizeOf = (element: HTMLElement) =>
    element.classList.contains('pk-mirror') ? box : content;

  beforeEach(() => {
    box = { width: 260, height: 100 };
    content = { width: 520, height: 200 };
    callbacks = [];
    observed.length = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe = (element: Element) => observed.push(element);
        disconnect = vi.fn();
      },
    );
    for (const [property, axis] of [
      ['clientWidth', 'width'],
      ['clientHeight', 'height'],
      ['offsetWidth', 'width'],
      ['offsetHeight', 'height'],
    ] as const) {
      vi.spyOn(HTMLElement.prototype, property, 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return sizeOf(this)[axis];
      });
    }
  });

  const contentEl = () => document.querySelector<HTMLElement>('.pk-mirror-content');

  it('scales the bezel together with the display to fit the slot', () => {
    mount();
    expect(contentEl()?.getAttribute('data-scale')).toBe('0.5');
    expect(contentEl()?.style.getPropertyValue('--pk-device-scale')).toBe('0.5');
    expect(contentEl()?.querySelector('.pk-mirror-bezel')).not.toBeNull();
  });

  it('follows a resize of the slot', () => {
    mount();
    const fire = () => act(() => callbacks.forEach((callback) => callback()));
    box = { width: 130, height: 100 };
    fire();
    expect(contentEl()?.getAttribute('data-scale')).toBe('0.25');
    box = { width: 1040, height: 400 };
    fire();
    expect(contentEl()?.getAttribute('data-scale')).toBe('2');
    expect(observed.map((element) => element.className)).toEqual([
      'pk-mirror',
      'pk-mirror-content',
    ]);
  });
});
