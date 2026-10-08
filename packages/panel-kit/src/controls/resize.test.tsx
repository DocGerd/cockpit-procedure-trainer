// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rocker } from './index';
import { placeTitle } from './legibility';
import { toggle2, widgetProps } from './test-support';

let width = 128;
let callbacks: (() => void)[] = [];
const observed = vi.fn();
const disconnected = vi.fn();

beforeEach(() => {
  width = 128;
  callbacks = [];
  observed.mockClear();
  disconnected.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe = observed;
      disconnect = disconnected;
    },
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        width,
        height: width,
        right: width,
        bottom: width,
        toJSON: () => ({}),
      }) as DOMRect,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const legendCount = (container: HTMLElement) => container.querySelectorAll('.pk-legend').length;
const fire = () => act(() => callbacks.forEach((callback) => callback()));

describe('resizing', () => {
  it('observes the widget and its position targets and stops observing on unmount', () => {
    const { unmount } = render(<Rocker {...widgetProps(toggle2)} />);
    expect(observed).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnected).toHaveBeenCalledTimes(2);
  });

  it('re-measures when the observer fires and drops legends that no longer fit', () => {
    const { container } = render(<Rocker {...widgetProps(toggle2)} />);
    expect(legendCount(container)).toBe(2);
    width = 48;
    fire();
    expect(legendCount(container)).toBe(0);
    width = 208;
    fire();
    expect(legendCount(container)).toBe(2);
  });

  it('measures on mount without waiting for the observer', () => {
    width = 48;
    const { container } = render(<Rocker {...widgetProps(toggle2)} />);
    expect(legendCount(container)).toBe(0);
  });

  it('re-measures when a parent resizes it through a re-render', () => {
    const { container, rerender } = render(<Rocker {...widgetProps(toggle2)} />);
    width = 48;
    rerender(<Rocker {...widgetProps(toggle2)} />);
    expect(legendCount(container)).toBe(0);
  });
});

describe('placeTitle squeeze', () => {
  const at = (px: number) => ({ scale: px / 100, minPx: 11 });

  it('squeezes to the room when growing to the minimum size overruns it slightly', () => {
    const placed = placeTitle(at(90), 'ABCDE', 40);
    expect(placed.show).toBe(true);
    expect(placed.length).toBe(40);
  });

  it('leaves text that fits at natural length', () => {
    expect(placeTitle(at(208), 'AB', 40).length).toBeUndefined();
  });

  it('drops text that would need more than the squeeze allows', () => {
    expect(placeTitle(at(90), 'ABCDEFGH', 40).show).toBe(false);
  });
});
