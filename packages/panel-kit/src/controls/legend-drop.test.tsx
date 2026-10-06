// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, Lever, Rocker, RotaryKnob } from './index';
import { breaker, continuousLever, rotary, toggle2, widgetProps } from './test-support';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SIZES = [48, 80, 128, 208] as const;

function placeAt(px: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: px,
    height: px,
    right: px,
    bottom: px,
    toJSON: () => ({}),
  });
}

const legends = (container: HTMLElement) => [
  ...container.querySelectorAll<SVGElement>('.pk-legend'),
];

const renderedPx = (legend: SVGElement, px: number, viewBox: number) =>
  Number(legend.style.getPropertyValue('--pk-font')) * (px / viewBox);

describe('legend drop rule', () => {
  it.each([
    [48, 0],
    [80, 2],
    [128, 2],
    [208, 2],
  ])('a short rocker legend set at %i px shows %i legends', (px, count) => {
    placeAt(px);
    const { container } = render(<Rocker {...widgetProps(toggle2)} />);
    expect(legends(container)).toHaveLength(count);
  });

  it.each(SIZES)('never renders a shown legend under 11 px at %i px', (px) => {
    placeAt(px);
    for (const Widget of [Rocker, RotaryKnob]) {
      const { container } = render(
        <Widget {...widgetProps(Widget === Rocker ? toggle2 : rotary)} />,
      );
      for (const legend of legends(container)) {
        expect(renderedPx(legend, px, Widget === Rocker ? 100 : 120)).toBeGreaterThanOrEqual(
          11 - 1e-9,
        );
      }
      cleanup();
    }
  });

  it('drops a legend set that cannot fit instead of shrinking it', () => {
    placeAt(128);
    const { container } = render(<RotaryKnob {...widgetProps(rotary)} />);
    expect(legends(container)).toHaveLength(0);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('keeps the accessible names when every legend is dropped', () => {
    placeAt(48);
    render(<Rocker {...widgetProps(toggle2)} />);
    expect(screen.getByRole('radiogroup', { name: 'The control' })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'label off',
      'label on',
    ]);
  });

  it('shows the position id as an upper-case placard, not the localised label', () => {
    const { container } = render(<Rocker {...widgetProps(toggle2)} />);
    expect(legends(container).map((legend) => legend.textContent)).toEqual(['OFF', 'ON']);
  });

  it('shows every legend while the size is unknown', () => {
    const { container } = render(<RotaryKnob {...widgetProps(rotary)} />);
    expect(legends(container)).toHaveLength(5);
  });
});

describe('rotary legends stay clear of the knob and inside the box', () => {
  it('anchors side legends away from the dial and keeps them in the viewBox', () => {
    const { container } = render(<RotaryKnob {...widgetProps(rotary)} />);
    for (const legend of legends(container)) {
      const x = Number(legend.getAttribute('x'));
      const anchor = legend.getAttribute('data-anchor');
      const chars = (legend.textContent ?? '').length;
      const width = chars * 0.68 * Number(legend.style.getPropertyValue('--pk-font'));
      const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
      const right = left + width;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(120);
      const dial = Math.abs(x - 60);
      if (anchor !== 'middle') expect(dial).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('circuit breaker', () => {
  it('prints its placard above the knob, not its name', () => {
    placeAt(208);
    const { container } = render(
      <CircuitBreaker {...widgetProps(breaker, { label: 'Master switch' })} placard="Master" />,
    );
    expect(container.querySelector('[data-placard]')?.textContent).toBe('MASTER');
    expect(legends(container)).toEqual([]);
  });

  it('shows the pulled stem as a banded shaft, not a colour change', () => {
    const { container, rerender } = render(<CircuitBreaker {...widgetProps(breaker)} />);
    const stem = () => container.querySelector('.pk-stem')?.getAttribute('data-on');
    expect(stem()).toBe('false');
    rerender(<CircuitBreaker {...widgetProps(breaker, { position: 'pulled' })} />);
    expect(stem()).toBe('true');
    expect(container.querySelectorAll('.pk-stem rect').length).toBeGreaterThan(1);
  });
});

describe('continuous lever', () => {
  it('prints its placard upright above the slot, not along the stroke', () => {
    placeAt(208);
    const { container } = render(
      <Lever {...widgetProps(continuousLever, { label: 'Throttle lever' })} placard="Throttle" />,
    );
    const title = container.querySelector('[data-placard]');
    expect(title?.textContent).toBe('THROTTLE');
    expect(title?.hasAttribute('transform')).toBe(false);
    expect(legends(container)).toEqual([]);
  });

  it('exposes its value as text', () => {
    const { rerender } = render(<Lever {...widgetProps(continuousLever, { position: 0.25 })} />);
    const slider = () => screen.getByRole('slider', { name: 'The control' });
    expect(slider().getAttribute('aria-valuetext')).toBe('25%');
    rerender(<Lever {...widgetProps(continuousLever, { position: 1 })} />);
    expect(slider().getAttribute('aria-valuetext')).toBe('100%');
  });
});
