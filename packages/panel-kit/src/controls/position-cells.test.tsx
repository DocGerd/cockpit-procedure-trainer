// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RotaryKnob, Toggle } from './index';
import { rotary, toggle2, widgetProps } from './test-support';

const SPACING = 30;
const TARGET = 44;

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const siblings = [...(this.parentElement?.children ?? [])];
    const index = this.getAttribute('role') === 'radio' ? siblings.indexOf(this) : -1;
    const left = index < 0 ? 0 : index * SPACING;
    const size = index < 0 ? 0 : TARGET;
    return {
      x: left,
      y: 0,
      left,
      top: 0,
      width: size,
      height: size,
      right: left + size,
      bottom: size,
      toJSON: () => ({}),
    } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([
  ['toggle', Toggle, toggle2],
  ['rotary knob', RotaryKnob, rotary],
])('the %s position targets', (_, Widget, control) => {
  it('are clipped where they overlap so that no point answers to two positions', () => {
    render(<Widget {...widgetProps(control)} />);
    const radios = screen.getAllByRole('radio');
    const clips = radios.map((radio) => radio.style.clipPath);
    expect(radios.length).toBeGreaterThan(1);
    expect(clips.every((clip) => clip.startsWith('polygon('))).toBe(true);
  });
});
