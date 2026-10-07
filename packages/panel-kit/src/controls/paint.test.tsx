// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ControlDefinition, ControlPosition } from '@cpt/core';
import { afterEach, describe, expect, it } from 'vitest';
import { normalisedMarkup, paintProblems } from '../materials/paint-check';
import { controlWidgets } from './index';
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

const states: [string, ControlPosition, ControlDefinition, boolean][] = [
  ['toggle', 'middle', toggle3, false],
  ['rocker', 'high', toggle3, false],
  ['key-switch', 'both', rotary, false],
  ['push-button', 'released', momentary, false],
  ['push-button', 'held', momentary, false],
  ['circuit-breaker', 'in', breaker, false],
  ['circuit-breaker', 'pulled', breaker, false],
  ['rotary-knob', 'left', rotary, false],
  ['lever', 'full', notchedLever, false],
  ['lever', 0.4, continuousLever, false],
  ['guarded-handle', 'stowed', guarded, false],
  ['guarded-handle', 'pulled', guarded, true],
];

function draw(id: string, control: ControlDefinition, position: ControlPosition, open: boolean) {
  const Widget = controlWidgets[id];
  if (!Widget) throw new Error(id);
  return render(
    <Widget {...widgetProps(control, { position, guardOpen: open })} placard="Placard" />,
  ).container;
}

describe('materials', () => {
  it.each(states)('%s at %s takes every paint from panel tokens and no filter', (...state) => {
    const [id, position, control, open] = state;
    expect(paintProblems(draw(id, control, position, open))).toEqual([]);
  });

  it.each(states)('%s at %s is shaded with the shared materials', (...state) => {
    const [id, position, control, open] = state;
    const shaded = [...draw(id, control, position, open).querySelectorAll<SVGElement>('svg *')]
      .map((node) => node.style.fill)
      .filter((fill) => fill.startsWith('url('));
    expect(shaded.length).toBeGreaterThan(2);
  });

  it.each(states)('%s at %s renders the same output for the same props', (...state) => {
    const [id, position, control, open] = state;
    const first = normalisedMarkup(draw(id, control, position, open));
    cleanup();
    expect(normalisedMarkup(draw(id, control, position, open))).toBe(first);
  });

  it('rejects a straight line painted with a gradient in box units', () => {
    const { container } = render(
      <svg>
        <defs>
          <linearGradient id="g">
            <stop style={{ stopColor: 'var(--panel-glare)' }} />
          </linearGradient>
          <linearGradient id="u" gradientUnits="userSpaceOnUse">
            <stop style={{ stopColor: 'var(--panel-glare)' }} />
          </linearGradient>
        </defs>
        <line x1={0} x2={10} y1={1} y2={1} style={{ stroke: 'url(#g)' }} />
        <line x1={0} x2={10} y1={1} y2={1} style={{ stroke: 'url(#u)' }} />
        <line x1={0} x2={10} y1={1} y2={4} style={{ stroke: 'url(#g)' }} />
      </svg>,
    );
    expect(paintProblems(container)).toEqual(['straight line paints the box-unit url(#g)']);
  });

  it('gives each mount its own material ids', () => {
    const ids = (container: HTMLElement) =>
      [...container.querySelectorAll('[id]')].map((node) => node.id);
    const first = ids(draw('toggle', toggle3, 'low', false));
    const second = ids(draw('toggle', toggle3, 'low', false));
    expect(first.length).toBeGreaterThan(0);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });
});
