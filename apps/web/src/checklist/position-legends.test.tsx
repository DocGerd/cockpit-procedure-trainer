// @vitest-environment jsdom
import { createSession } from '@cpt/core';
import type { Aircraft, ControlDefinition, Deviation, Text } from '@cpt/core';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceRegistry } from '../device-registry';
import { LanguageProvider } from '../i18n';
import type { Language } from '../i18n';
import { useDeviationText } from './deviation-text';

const LEGEND_WIDGETS = new Set([
  'toggle',
  'rocker',
  'key-switch',
  'rotary-knob',
  'lever',
  'guarded-handle',
]);
const DEFAULT_WIDGET: Record<ControlDefinition['kind'], string> = {
  toggle: 'toggle',
  rotary: 'rotary-knob',
  lever: 'lever',
  momentary: 'push-button',
  guarded: 'guarded-handle',
  breaker: 'circuit-breaker',
};

const isText = (value: unknown): value is Text => typeof value === 'object' && value !== null;

function printedLegends(aircraft: Aircraft, id: string, control: ControlDefinition) {
  const appearance = control.appearance;
  const named = control.positions === 'continuous' ? [] : control.positions;
  const lines = [
    ...(appearance && 'artwork' in appearance ? (appearance.artwork.lettering ?? []) : []),
    ...Object.values(aircraft.views).flatMap((view) => view.controls?.[id]?.printed ?? []),
  ];
  const widget =
    appearance === undefined
      ? DEFAULT_WIDGET[control.kind]
      : 'widget' in appearance
        ? appearance.widget
        : undefined;
  if (widget !== undefined && LEGEND_WIDGETS.has(widget)) {
    lines.push(...named.map((position) => position.toUpperCase()));
  }
  return new Set(lines.map((line) => line.trim()));
}

const usedControls = (aircraft: Aircraft) =>
  new Set(
    Object.values(aircraft.procedures).flatMap((procedure) =>
      procedure.items.flatMap((item) =>
        'control' in item && Object.hasOwn(aircraft.controls, item.control) ? [item.control] : [],
      ),
    ),
  );

function cueText(aircraft: Aircraft, language: Language) {
  const session = createSession(aircraft, { devices: deviceRegistry });
  const procedure = Object.keys(aircraft.procedures)[0];
  if (procedure === undefined) throw new Error(`${aircraft.id} has no procedure`);
  session.startProcedure(procedure);
  const checklist = session.checklist();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider initial={language}>{children}</LanguageProvider>
  );
  return renderHook(() => useDeviationText(checklist), { wrapper }).result.current;
}

const cases = aircraftRegistry.flatMap((aircraft) =>
  [...usedControls(aircraft)].flatMap((id) => {
    const control = aircraft.controls[id];
    if (!control || control.kind === 'breaker' || control.positions === 'continuous') return [];
    return control.positions.map((position) => [aircraft.id, id, position, aircraft] as const);
  }),
);

describe('position wording in the deviation cues', () => {
  it('covers positions of both aircraft', () => {
    expect(new Set(cases.map(([aircraftId]) => aircraftId))).toEqual(
      new Set(aircraftRegistry.map(({ id }) => id)),
    );
  });

  it.each(cases)(
    '%s %s at %s reads as the panel prints it or as an explicit phrase',
    (_aircraftId, id, position, aircraft) => {
      const control = aircraft.controls[id] as ControlDefinition;
      const legend: unknown = (control as { legends?: Record<string, unknown> }).legends?.[
        position
      ];
      const deviation: Deviation = {
        kind: 'wrong-position',
        itemIndex: 0,
        controlId: id,
        position,
      };
      for (const language of ['en', 'de'] as const) {
        const title = cueText(aircraft, language).title(deviation);
        const name = control.name[language];
        const wording =
          language === 'en'
            ? title.replace(`${name} left at `, '')
            : title.replace(`${name} auf `, '').replace(/ gelassen$/, '');
        if (isText(legend)) {
          expect(wording).toBe(legend[language]);
        } else {
          expect([...printedLegends(aircraft, id, control)]).toContain(wording);
        }
      }
    },
  );
});
