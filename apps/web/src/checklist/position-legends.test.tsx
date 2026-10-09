// @vitest-environment jsdom
import { createSession, deviceControls, springsBack } from '@cpt/core';
import type { Aircraft, ControlDefinition, Deviation } from '@cpt/core';
import { cleanup, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceEntries, deviceRegistry } from '../device-registry';
import { format, LanguageProvider } from '../i18n';
import type { Language } from '../i18n';
import { useDeviationText } from './deviation-text';
import { messages } from './messages';

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

// What the device screen prints on the key that selects each position, keyed by position.
function printedKeys(deviceId: string, controlId: string): ReadonlyMap<string, string> {
  const device = deviceRegistry.find(({ id }) => id === deviceId);
  const entry = deviceEntries[deviceId];
  if (!device || !entry) throw new Error(`${deviceId} has no screen`);
  const { container } = render(<entry.Screen on state={device.initial} send={() => {}} />);
  const keys = new Map(
    [...container.querySelectorAll(`[data-control="${controlId}"][data-position]`)].map(
      (key) => [key.getAttribute('data-position') ?? '', key.textContent?.trim() ?? ''] as const,
    ),
  );
  cleanup();
  return keys;
}

type Case = readonly [
  aircraftId: string,
  id: string,
  position: string,
  aircraft: Aircraft,
  control: ControlDefinition,
  printed: () => ReadonlySet<string>,
];

const named = (control: ControlDefinition) =>
  control.kind === 'breaker' || control.positions === 'continuous' ? [] : control.positions;

// Every control, not only those a procedure names: a stray move on any of them cues its positions.
const cases: readonly Case[] = aircraftRegistry.flatMap((aircraft) =>
  Object.entries(aircraft.controls).flatMap(([id, control]) =>
    named(control).map((position): Case => [
      aircraft.id,
      id,
      position,
      aircraft,
      control,
      () => printedLegends(aircraft, id, control),
    ]),
  ),
);

// A device position reads as the device screen prints its key, never as a guess from its id. A
// position no key selects, such as a digit the display shows, reads as its declared legend.
const deviceCases: readonly Case[] = aircraftRegistry.flatMap((aircraft) =>
  Object.entries(aircraft.devices ?? {}).flatMap(([installId, install]) =>
    Object.entries(
      deviceControls({ ...aircraft, devices: { [installId]: install } }, deviceRegistry),
    ).flatMap(([id, control]) =>
      named(control).map((position): Case => [
        aircraft.id,
        id,
        position,
        aircraft,
        control,
        () => {
          const key = printedKeys(install.device, id.slice(installId.length + 1)).get(position);
          const legend = control.legends?.[position];
          const declared = typeof legend === 'string' ? legend : undefined;
          return new Set([key ?? declared].filter((line) => line !== undefined));
        },
      ]),
    ),
  ),
);

function expectCuedWording([, id, position, aircraft, control, printed]: Case) {
  const legend = control.legends?.[position];
  const positions = named(control);
  const deviation: Deviation = { kind: 'wrong-position', itemIndex: 0, controlId: id, position };
  const lines = typeof legend === 'object' ? [] : [...printed()];
  for (const language of ['en', 'de'] as const) {
    const cue = cueText(aircraft, language);
    const title = cue.title(deviation);
    const name = control.name[language];
    if (typeof legend === 'object') {
      expect(title).toBe(
        format(messages[language].wrongPositionPhraseTitle, {
          control: name,
          position: legend.state[language],
        }),
      );
      const other = positions.find((candidate) => candidate !== position) ?? position;
      const back = cue.banner({
        kind: 'unexpected-control',
        itemIndex: 0,
        controlId: id,
        position: other,
        from: position,
      });
      if (!springsBack(control, other)) {
        expect(back.endsWith(` ${legend.restore[language]}.`)).toBe(true);
      }
    } else {
      const wording =
        language === 'en'
          ? title.replace(`${name} left at `, '')
          : title.replace(`${name} auf `, '').replace(/ gelassen$/, '');
      expect(lines).toContain(wording);
    }
  }
}

describe('position wording in the deviation cues', () => {
  it('covers positions of both aircraft', () => {
    expect(new Set(cases.map(([aircraftId]) => aircraftId))).toEqual(
      new Set(aircraftRegistry.map(({ id }) => id)),
    );
  });

  it('covers every device install of every aircraft', () => {
    const installs = aircraftRegistry.flatMap((aircraft) =>
      Object.keys(aircraft.devices ?? {}).map((installId) => `${aircraft.id} ${installId}`),
    );
    expect(installs.length).toBeGreaterThan(0);
    expect(
      new Set(deviceCases.map(([aircraftId, id]) => `${aircraftId} ${id.split('.')[0]}`)),
    ).toEqual(new Set(installs));
  });

  it.each(cases)('%s %s at %s reads as the panel prints it or as an explicit phrase', (...test) =>
    expectCuedWording(test),
  );

  it.each(deviceCases)(
    '%s %s at %s reads as the device prints its key or as a declared legend',
    (...test) => expectCuedWording(test),
  );
});
