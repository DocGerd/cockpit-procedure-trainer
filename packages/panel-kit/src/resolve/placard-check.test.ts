import type { ArtworkAppearance, ControlDefinition, Placement } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { checkPlacards } from './placard-check';
import type { PlacardSubject } from './placard-check';

const text = { de: 'x', en: 'x' };
const toggle = (extra: Partial<ControlDefinition> = {}): ControlDefinition =>
  ({
    name: text,
    description: text,
    kind: 'toggle',
    positions: ['off', 'on'],
    initial: 'off',
    ...extra,
  }) as ControlDefinition;

const artwork = (lettering?: readonly string[]): ArtworkAppearance => ({
  artwork: {
    face: 'face.svg',
    moving: { type: 'positions', images: { off: 'off.svg', on: 'on.svg' } },
    ...(lettering ? { lettering } : {}),
  },
});

const at: Placement = { rect: { x: 0, y: 0, w: 10, h: 10 } };

const subject = (
  controls: Record<string, ControlDefinition>,
  placements: Record<string, Placement> = Object.fromEntries(
    Object.keys(controls).map((id) => [id, at]),
  ),
): PlacardSubject => ({ controls, views: { panel: { controls: placements } } });

describe('checkPlacards', () => {
  it('accepts a generic control with a placard', () => {
    expect(checkPlacards(subject({ bat: toggle({ placard: 'BAT' }) }))).toEqual([]);
  });

  it('reports a generic control without a placard', () => {
    expect(checkPlacards(subject({ bat: toggle() }))).toEqual([
      { view: 'panel', id: 'bat', message: 'prints no label: declare a placard' },
    ]);
  });

  it('reports a generic control whose placard is blank', () => {
    const findings = checkPlacards(subject({ bat: toggle({ placard: ' ' }) }));
    expect(findings.map(({ id }) => id)).toEqual(['bat']);
  });

  it('reports a placard that only names a position', () => {
    expect(checkPlacards(subject({ bat: toggle({ placard: 'On' }) }))).toEqual([
      {
        view: 'panel',
        id: 'bat',
        message: 'names no function: its placard shows only position legends',
      },
    ]);
  });

  it('reports artwork lettering that only names positions', () => {
    const control = toggle({ appearance: artwork(['ON', 'OFF']) });
    expect(checkPlacards(subject({ beacon: control })).map(({ message }) => message)).toEqual([
      'names no function: lettered on its artwork shows only position legends',
    ]);
  });

  it('reports a blank printed entry as no label, so the widget placard is still required', () => {
    const blank: Placement = { ...at, printed: [' '] };
    expect(checkPlacards(subject({ elt: toggle() }, { elt: blank }))).toEqual([
      { view: 'panel', id: 'elt', message: 'prints no label: declare a placard' },
    ]);
    expect(checkPlacards(subject({ elt: toggle({ placard: 'ELT' }) }, { elt: blank }))).toEqual([]);
  });

  it('reports view lettering that only names positions', () => {
    const printed: Placement = { ...at, printed: ['OPEN', 'CLOSED'] };
    expect(checkPlacards(subject({ elt: toggle() }, { elt: printed }))).toHaveLength(1);
  });

  it('accepts artwork that declares its lettering', () => {
    const control = toggle({ appearance: artwork(['BEACON']) });
    expect(checkPlacards(subject({ beacon: control }))).toEqual([]);
  });

  it('reports artwork that declares no lettering', () => {
    expect(checkPlacards(subject({ beacon: toggle({ appearance: artwork() }) }))).toEqual([
      {
        view: 'panel',
        id: 'beacon',
        message: 'prints no label: declare the lettering its artwork or view prints',
      },
    ]);
  });

  it('accepts a control whose view prints its label', () => {
    const printed: Placement = { ...at, printed: ['ELT'] };
    expect(checkPlacards(subject({ elt: toggle() }, { elt: printed }))).toEqual([]);
  });

  it('ignores a control no view places', () => {
    expect(checkPlacards(subject({ bat: toggle() }, {}))).toEqual([]);
  });
});
