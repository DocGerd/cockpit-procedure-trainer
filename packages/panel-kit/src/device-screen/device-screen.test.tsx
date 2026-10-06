// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceScreenFrame, DeviceScreenPlaceholder } from './index';

afterEach(cleanup);

describe('DeviceScreenFrame', () => {
  it('draws its screen inside a labelled bezel', () => {
    render(
      <DeviceScreenFrame on label="Radio">
        <button type="button">Key</button>
      </DeviceScreenFrame>,
    );
    const frame = screen.getByRole('group', { name: 'Radio' });
    expect(frame.contains(screen.getByRole('button', { name: 'Key' }))).toBe(true);
    expect(frame.getAttribute('data-on')).toBe('true');
    expect(frame.querySelector('[data-screen-off]')).toBeNull();
  });

  it('darkens the screen while off, without blocking the keys', () => {
    const onClick = vi.fn();
    render(
      <DeviceScreenFrame on={false} label="Radio">
        <button type="button" onClick={onClick}>
          Key
        </button>
      </DeviceScreenFrame>,
    );
    const frame = screen.getByRole('group', { name: 'Radio' });
    expect(frame.getAttribute('data-on')).toBe('false');
    expect(frame.querySelector('[data-screen-off]')?.getAttribute('aria-hidden')).toBe('true');
    screen.getByRole('button', { name: 'Key' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('DeviceScreenFrame scaling', () => {
  type Size = { width: number; height: number };
  let box: Size = { width: 400, height: 300 };
  let content: Size = { width: 400, height: 300 };
  let callbacks: (() => void)[] = [];
  const observed: Element[] = [];

  const sizeOf = (element: HTMLElement) =>
    element.classList.contains('pk-device-screen') ? box : content;

  beforeEach(() => {
    box = { width: 400, height: 300 };
    content = { width: 400, height: 300 };
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const contentEl = () => document.querySelector<HTMLElement>('.pk-device-content');
  const scaleOf = () => Number(contentEl()?.getAttribute('data-scale'));
  const fire = () => act(() => callbacks.forEach((callback) => callback()));
  const mount = () =>
    render(
      <DeviceScreenFrame on label="Radio">
        <button type="button">Key</button>
      </DeviceScreenFrame>,
    );

  it('shrinks the screen to the limiting axis of a smaller box', () => {
    box = { width: 200, height: 270 };
    mount();
    expect(scaleOf()).toBeCloseTo(0.5);
    box = { width: 390, height: 150 };
    fire();
    expect(scaleOf()).toBeCloseTo(0.5);
  });

  it('grows the screen to a larger box', () => {
    box = { width: 800, height: 900 };
    mount();
    expect(scaleOf()).toBeCloseTo(2);
  });

  it('hands the scale to the content as a custom property', () => {
    box = { width: 200, height: 300 };
    mount();
    expect(contentEl()?.style.getPropertyValue('--pk-device-scale')).toBe('0.5');
  });

  it('follows a resize of the box and of the screen', () => {
    mount();
    expect(scaleOf()).toBe(1);
    box = { width: 100, height: 300 };
    fire();
    expect(scaleOf()).toBeCloseTo(0.25);
    content = { width: 100, height: 100 };
    fire();
    expect(scaleOf()).toBe(1);
  });

  it('observes both the box and the screen', () => {
    mount();
    expect(observed.map((element) => element.className)).toEqual([
      'pk-device-screen',
      'pk-device-content',
    ]);
  });

  it('keeps the natural size where nothing can be measured', () => {
    box = { width: 0, height: 0 };
    content = { width: 0, height: 0 };
    mount();
    expect(scaleOf()).toBe(1);
  });

  it('keeps the keys operable inside the scaled content', () => {
    box = { width: 200, height: 150 };
    const onClick = vi.fn();
    render(
      <DeviceScreenFrame on label="Radio">
        <button type="button" onClick={onClick}>
          Key
        </button>
      </DeviceScreenFrame>,
    );
    screen.getByRole('button', { name: 'Key' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('DeviceScreenPlaceholder', () => {
  it('shows its label', () => {
    render(<DeviceScreenPlaceholder label="No screen: com" />);
    expect(screen.getByRole('img', { name: 'No screen: com' }).textContent).toBe('No screen: com');
  });
});
