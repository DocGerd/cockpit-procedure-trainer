// @vitest-environment jsdom
import type { Appearance, ControlDefinition } from '@cpt/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { controlWidgets, defaultControlWidget } from '../controls';
import { defaultIndicatorWidget, indicatorWidgets } from '../indicators';
import type { ControlWidgetProps } from '../types';
import {
  resolveControl,
  resolveControlWidget,
  resolveIndicator,
  resolveIndicatorWidget,
} from './index';

afterEach(cleanup);

const text = { de: 'x', en: 'x' };

const toggle = (appearance?: Appearance): ControlDefinition => ({
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
  name: text,
  description: text,
  ...(appearance ? { appearance } : {}),
});

const artwork: Appearance = {
  artwork: {
    face: 'face.png',
    moving: { type: 'positions', images: { off: 'off.png', on: 'on.png' } },
  },
};

const noop = () => {};
const props = (control: ControlDefinition): ControlWidgetProps => ({
  control,
  position: 'off',
  guardOpen: false,
  label: 'Master',
  positionLabels: {},
  onSet: noop,
  onPress: noop,
  onRelease: noop,
  onOpenGuard: noop,
  onCloseGuard: noop,
});

describe('resolveControlWidget', () => {
  it('uses the default widget of the kind without an appearance', () => {
    expect(resolveControlWidget(toggle())).toBe(defaultControlWidget('toggle'));
  });

  it('uses the declared widget and its options', () => {
    const control = toggle({ widget: 'rocker', options: { cap: 'red' } });
    expect(resolveControl(control)).toEqual({
      widget: controlWidgets.rocker,
      options: { cap: 'red' },
    });
  });

  it('falls back to the default for an unknown id and drops its options', () => {
    const control = toggle({ widget: 'fancy', options: { cap: 'red' } });
    expect(resolveControl(control)).toEqual({
      widget: defaultControlWidget('toggle'),
      options: undefined,
    });
  });

  it('does not treat inherited object keys as widget ids', () => {
    expect(resolveControlWidget(toggle({ widget: 'toString' }))).toBe(
      defaultControlWidget('toggle'),
    );
  });

  it('wraps artwork with the generic widget as fallback, with a stable identity', () => {
    const control = toggle(artwork);
    const Widget = resolveControlWidget(control);
    expect(Widget).not.toBe(defaultControlWidget('toggle'));
    expect(resolveControlWidget(control)).toBe(Widget);

    const { container } = render(<Widget {...props(control)} />);
    const face = container.querySelector('img[src="face.png"]');
    expect(face).not.toBeNull();
    fireEvent.error(face as Element);
    expect(screen.getByRole('radiogroup', { name: 'Master' })).toBeDefined();
  });
});

describe('resolveIndicatorWidget', () => {
  const indicator = (appearance: Appearance) => ({ appearance });

  it('uses the declared widget and its options', () => {
    expect(
      resolveIndicator(indicator({ widget: 'annunciator', options: { lamp: 'red' } }), 0),
    ).toEqual({ widget: indicatorWidgets.annunciator, options: { lamp: 'red' } });
  });

  it('falls back to the default for the value with an unknown id', () => {
    const unknown = indicator({ widget: 'fancy', options: { min: 5 } });
    expect(resolveIndicator(unknown, true)).toEqual({
      widget: defaultIndicatorWidget(true),
      options: undefined,
    });
    expect(resolveIndicatorWidget(unknown, 'ok')).toBe(defaultIndicatorWidget('ok'));
    expect(resolveIndicatorWidget(indicator({ widget: 'constructor' }), 3)).toBe(
      defaultIndicatorWidget(3),
    );
  });

  it('wraps artwork with the generic widget for the value as fallback', () => {
    const declared = indicator({
      artwork: {
        face: 'dial.png',
        moving: {
          type: 'needle',
          image: 'needle.png',
          pivot: { x: 1, y: 1 },
          angleRange: { min: 0, max: 90 },
          valueRange: { min: 0, max: 10 },
        },
      },
    });
    const Widget = resolveIndicatorWidget(declared, 4);
    expect(Widget).not.toBe(defaultIndicatorWidget(4));
    expect(resolveIndicatorWidget(declared, 5)).toBe(Widget);

    const { container } = render(<Widget value={4} label="Oil" />);
    fireEvent.error(container.querySelector('img[src="dial.png"]') as Element);
    expect(container.querySelector('[data-widget="round-gauge"]')).not.toBeNull();
  });
});

describe('artwork indicator options', () => {
  const artwork = {
    face: 'dial.png',
    moving: {
      type: 'needle',
      image: 'needle.png',
      pivot: { x: 1, y: 1 },
      angleRange: { min: 0, max: 90 },
      valueRange: { min: 0, max: 10 },
    },
  } as const;
  const options = { min: 0, max: 10, units: 'bar', arcs: [{ from: 0, to: 5, colour: 'green' }] };

  it('hands the declared options to the widget', () => {
    expect(resolveIndicator({ appearance: { artwork, options } }, 4).options).toEqual(options);
    expect(resolveIndicator({ appearance: { artwork } }, 4).options).toBeUndefined();
  });

  it('draws the fallback gauge with the resolved arcs and units', () => {
    const resolved = resolveIndicator({ appearance: { artwork, options } }, 4);
    const Widget = resolved.widget;
    const { container } = render(
      <Widget value={4} label="Oil" {...(resolved.options ? { options: resolved.options } : {})} />,
    );
    fireEvent.error(container.querySelector('img[src="dial.png"]') as Element);
    const gauge = container.querySelector('[data-widget="round-gauge"]');
    expect(gauge?.querySelectorAll('[data-arc]')).toHaveLength(1);
    expect(gauge?.textContent).toContain('bar');
  });
});
