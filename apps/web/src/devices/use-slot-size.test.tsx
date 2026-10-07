// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSlotSize } from './use-slot-size';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Probe() {
  const [ref, size] = useSlotSize<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="slot">
      {`${size.width}x${size.height}`}
    </div>
  );
}

describe('useSlotSize', () => {
  it('stays unmeasured where there is no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Probe />);
    expect(screen.getByTestId('slot').textContent).toBe('0x0');
  });

  it('reports the element size and follows its changes', () => {
    const observers: (() => void)[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const size = { width: 120, height: 60 };
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => size.width);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => size.height);
    render(<Probe />);
    expect(screen.getByTestId('slot').textContent).toBe('120x60');
    size.width = 200;
    act(() => observers.forEach((callback) => callback()));
    expect(screen.getByTestId('slot').textContent).toBe('200x60');
  });
});
