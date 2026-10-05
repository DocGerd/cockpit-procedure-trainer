// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ControlDefinition, ControlKind } from '@cpt/core';
import { afterEach, describe, expect, it } from 'vitest';
import { controlWidgets, defaultControlWidget } from './index';
import {
  breaker,
  continuousLever,
  guarded,
  momentary,
  notchedLever,
  rotary,
  toggle3,
  widgetProps,
} from './test-support';

afterEach(cleanup);

const samples: Record<string, ControlDefinition> = {
  toggle: toggle3,
  rocker: toggle3,
  'key-switch': rotary,
  'push-button': momentary,
  'circuit-breaker': breaker,
  'rotary-knob': rotary,
  lever: notchedLever,
  'guarded-handle': guarded,
};

describe('registry', () => {
  it('names the eight generic widgets', () => {
    expect(Object.keys(controlWidgets).sort()).toEqual(Object.keys(samples).sort());
  });

  it.each<[ControlKind, string]>([
    ['toggle', 'toggle'],
    ['rotary', 'rotary-knob'],
    ['lever', 'lever'],
    ['momentary', 'push-button'],
    ['guarded', 'guarded-handle'],
    ['breaker', 'circuit-breaker'],
  ])('falls back to %s -> %s', (kind, id) => {
    expect(defaultControlWidget(kind)).toBe(controlWidgets[id]);
  });
});

describe('hit targets', () => {
  const states = [
    ...Object.entries(samples).map(([id, control]) => [id, control, false] as const),
    ['guarded-handle', guarded, true] as const,
    ['lever', continuousLever, false] as const,
  ];

  it.each(states)('%s keeps every interactive element at the target size', (id, control, open) => {
    const Widget = controlWidgets[id];
    if (!Widget) throw new Error(id);
    const { container } = render(<Widget {...widgetProps(control, { guardOpen: open })} />);
    const interactive = container.querySelectorAll<HTMLElement>(
      'button, [role="slider"], [role="radio"], [role="switch"]',
    );
    expect(interactive.length).toBeGreaterThan(0);
    for (const element of interactive) {
      expect(element.style.minWidth).toBe('var(--size-target)');
      expect(element.style.minHeight).toBe('var(--size-target)');
    }
    expect(container.innerHTML).not.toContain('--color-');
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.minWidth).toBe('var(--size-target)');
    expect(root.style.minHeight).toBe('var(--size-target)');
  });
});

describe('animation', () => {
  const moves = (container: HTMLElement) =>
    [...container.querySelectorAll<SVGElement>('.pk-move')].map((part) =>
      part.getAttribute('style'),
    );

  it.each([
    ['toggle', toggle3, 'low', 'high'],
    ['rocker', toggle3, 'low', 'high'],
    ['key-switch', rotary, 'off', 'both'],
    ['rotary-knob', rotary, 'off', 'both'],
    ['push-button', momentary, 'released', 'held'],
    ['circuit-breaker', breaker, 'in', 'pulled'],
    ['lever', notchedLever, 'up', 'full'],
    ['lever', continuousLever, 0, 1],
  ] as const)('%s moves its part when the position changes', (id, control, from, to) => {
    const Widget = controlWidgets[id];
    if (!Widget) throw new Error(id);
    const { container, rerender } = render(
      <Widget {...widgetProps(control, { position: from })} />,
    );
    const before = moves(container);
    expect(before.length).toBeGreaterThan(0);
    rerender(<Widget {...widgetProps(control, { position: to })} />);
    expect(moves(container)).not.toEqual(before);
  });

  it('moves the guard flap and the handle of a guarded handle', () => {
    const Widget = controlWidgets['guarded-handle'];
    if (!Widget) throw new Error('guarded-handle');
    const { container, rerender } = render(<Widget {...widgetProps(guarded)} />);
    const closed = moves(container);
    rerender(<Widget {...widgetProps(guarded, { guardOpen: true })} />);
    expect(moves(container)).not.toEqual(closed);
    const open = moves(container);
    rerender(<Widget {...widgetProps(guarded, { guardOpen: true, position: 'pulled' })} />);
    expect(moves(container)).not.toEqual(open);
  });
});
