// @vitest-environment jsdom
import { createSession } from '@cpt/core';
import type { Aircraft, ChecklistState, Deviation } from '@cpt/core';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { aircraft as deviceAircraft, devices } from '../devices/test-fixtures';
import { LanguageProvider } from '../i18n';
import { useDeviationText } from './deviation-text';

const aircraft: Aircraft = {
  ...deviceAircraft,
  controls: {
    ...deviceAircraft.controls,
    lampBreaker: {
      kind: 'breaker',
      name: { de: 'Lampensicherung', en: 'Lamp breaker' },
      description: { de: 'Sicherung', en: 'Breaker' },
      positions: ['in', 'pulled'],
      initial: 'in',
    },
    starter: {
      kind: 'momentary',
      name: { de: 'Anlasser', en: 'Starter' },
      description: { de: 'Anlasser', en: 'Starter' },
      positions: ['released', 'held'],
      initial: 'released',
    },
    key: {
      kind: 'rotary',
      name: { de: 'Zündschalter', en: 'Key' },
      description: { de: 'Zündschalter', en: 'Key' },
      positions: ['out', 'off', 'on', 'start'],
      initial: 'off',
      springBack: { start: 'on' },
      legends: {
        out: {
          state: { de: 'Schlüssel abgezogen', en: 'key out' },
          restore: { de: 'Schlüssel wieder abziehen', en: 'Take the key out again' },
        },
      },
    },
    rescue: {
      kind: 'guarded',
      name: { de: 'Rettungsgerät', en: 'Rescue system' },
      description: { de: 'Griff', en: 'Handle' },
      positions: ['stowed', 'pulled'],
      initial: 'stowed',
      guard: { name: { de: 'Sicherungsstift', en: 'Safety pin' } },
    },
    pinned: {
      kind: 'guarded',
      name: { de: 'Griff', en: 'Handle' },
      description: { de: 'Griff', en: 'Handle' },
      positions: ['stowed', 'pulled'],
      initial: 'stowed',
      guard: {
        name: { de: 'Stift', en: 'Pin' },
        legends: {
          open: { state: { de: 'gezogen', en: 'removed' }, act: { de: 'ziehen', en: 'Remove' } },
          closed: { state: { de: 'gesteckt', en: 'in' }, act: { de: 'stecken', en: 'Fit' } },
        },
      },
    },
  },
  procedures: {
    flow: {
      title: { de: 'Ablauf', en: 'Flow' },
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'confirm', text: { de: 'Bestätigen', en: 'Confirm' } },
        {
          type: 'guard',
          control: 'rescue',
          position: 'open',
          text: { de: 'Stift ziehen', en: 'Pin out' },
        },
        {
          type: 'guard',
          control: 'pinned',
          position: 'open',
          text: { de: 'Stift ziehen', en: 'Pin out' },
        },
      ],
    },
  },
};

function checklistState(): ChecklistState<unknown> {
  const session = createSession(aircraft, { devices });
  session.startProcedure('flow');
  const checklist = session.checklist();
  if (!checklist) throw new Error('the procedure did not start');
  return checklist;
}

const unexpected = (controlId: string): Deviation => ({
  kind: 'unexpected-control',
  itemIndex: 0,
  controlId,
});

const stray = (controlId: string, position: string | number, from: string | number): Deviation => ({
  ...unexpected(controlId),
  position,
  from,
});

function describeIn(language: 'de' | 'en') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider initial={language}>{children}</LanguageProvider>
  );
  return renderHook(() => useDeviationText(checklistState()), { wrapper }).result.current;
}

describe('deviation text for device controls', () => {
  it('names an aircraft control by its name', () => {
    expect(describeIn('en').title(unexpected('bus'))).toBe('Bus operated');
  });

  it('names a device control by its name, not its id', () => {
    const text = describeIn('en');
    expect(text.title(unexpected('radio.page'))).toBe('Page operated');
    expect(text.banner(unexpected('radio.page'))).toContain('Page operated');
  });

  it('localises the device control name', () => {
    expect(describeIn('de').title(unexpected('radio.page'))).toContain('Page (de)');
  });

  it('does not mistake an inherited property for a control', () => {
    expect(describeIn('en').title(unexpected('constructor'))).toBe('constructor operated');
  });

  it('falls back to the id for a control nothing defines', () => {
    expect(describeIn('en').title(unexpected('radio.nothing'))).toBe('radio.nothing operated');
  });
});

describe('deviation text for each kind', () => {
  const outOfOrder: Deviation = {
    kind: 'out-of-order',
    itemIndex: 0,
    controlId: 'bus',
    laterItem: 3,
  };
  const wrongPosition: Deviation = {
    kind: 'wrong-position',
    itemIndex: 0,
    controlId: 'bus',
    position: 'off',
  };

  it('names the later item of a control operated out of order', () => {
    const text = describeIn('en');
    expect(text.where(outOfOrder)).toBe('During item 1');
    expect(text.title(outOfOrder)).toBe('Bus operated before item 4');
    expect(text.expected(outOfOrder)).toBe('Confirm');
    expect(text.actual(outOfOrder)).toBe('Bus operated before item 4');
    expect(text.banner(outOfOrder)).toBe('Bus operated early. It belongs to item 4, not item 1.');
  });

  it('refers a deviation made during the flow to the flow, not to an item', () => {
    const text = describeIn('en');
    const during = { ...unexpected('bus'), duringFlow: true } as const;
    expect(text.where(during)).toBe('During the flow');
    expect(text.expected(during)).toBe('The flow items, in any order');
    expect(text.banner(during)).toBe('Bus operated. Not part of the flow.');
    const early = { ...outOfOrder, duringFlow: true } as const;
    expect(text.banner(early)).toBe('Bus operated early. It belongs to item 4, not to the flow.');
    expect(describeIn('de').where(during)).toBe('Während des Flows');
  });

  it('says how to undo a stray move during the flow, and what was pressed', () => {
    const text = describeIn('en');
    const moved = { ...stray('bus', 'on', 'off'), duringFlow: true } as const;
    expect(text.banner(moved)).toBe('Bus set to ON. Not part of the flow. Return it to OFF.');
    expect(text.banner(moved, true)).toBe('Bus operated. Not part of the flow.');
    const early = { ...outOfOrder, position: 'on', from: 'off', duringFlow: true } as const;
    expect(text.banner(early)).toBe(
      'Bus set to ON early. It belongs to item 4, not to the flow. Return it to OFF.',
    );
    const press = { ...stray('starter', 'held', 'released'), duringFlow: true } as const;
    expect(text.banner(press)).toBe('Starter pressed. Not part of the flow.');
    expect(text.banner({ ...press, kind: 'out-of-order', laterItem: 3 })).toBe(
      'Starter pressed early. It belongs to item 4, not to the flow.',
    );
    expect(describeIn('de').banner(moved)).toBe(
      'Bus (de) auf ON gestellt. Nicht Teil des Flows. Zurück auf OFF stellen.',
    );
  });

  it('drops the return cue once the control is back', () => {
    const text = describeIn('en');
    expect(text.banner(stray('bus', 'on', 'off'), true)).toBe('Bus operated. Not part of item 1.');
    const early: Deviation = { ...outOfOrder, position: 'on', from: 'off' };
    expect(text.banner(early, true)).toBe('Bus operated early. It belongs to item 4, not item 1.');
  });

  it('names where an out-of-order move left the control and how to undo it', () => {
    const moved: Deviation = { ...outOfOrder, position: 'on', from: 'off' };
    const text = describeIn('en');
    expect(text.actual(moved)).toBe('Bus set to ON, which belongs to item 4');
    expect(text.banner(moved)).toBe(
      'Bus set to ON early. It belongs to item 4, not item 1. Return it to OFF.',
    );
  });

  it('names a stray spring-back press as a press, with nothing to return', () => {
    const text = describeIn('en');
    const press = stray('starter', 'held', 'released');
    expect(text.banner(press)).toBe('Starter pressed. Not part of item 1.');
    expect(text.actual(press)).toBe('Starter pressed');
    const early: Deviation = {
      ...outOfOrder,
      controlId: 'starter',
      position: 'held',
      from: 'released',
    };
    expect(text.banner(early)).toBe('Starter pressed early. It belongs to item 4, not item 1.');
    expect(text.actual(early)).toBe('Starter pressed, which belongs to item 4');
    expect(text.banner(stray('key', 'start', 'on'))).toBe('Key pressed. Not part of item 1.');
    expect(text.banner(stray('key', 'on', 'off'))).toBe('Key set to ON. Return it to OFF.');
    expect(describeIn('de').banner(press)).toBe('Anlasser gedrückt. Nicht Teil von Punkt 1.');
  });

  it('names a control left in the wrong position as the panel prints the position', () => {
    const text = describeIn('en');
    expect(text.where(wrongPosition)).toBe('Item 1');
    expect(text.title(wrongPosition)).toBe('Bus left at OFF');
    expect(text.banner(wrongPosition)).toBe('Bus left at OFF during item 1.');
    expect(text.actual(wrongPosition)).toBe('Bus left at OFF');
    expect(describeIn('de').title(wrongPosition)).toBe('Bus (de) auf OFF gelassen');
  });

  it('keeps a stray control position without a name out of the text', () => {
    const text = describeIn('en');
    const unnamed: Deviation = { ...wrongPosition };
    delete (unnamed as { position?: unknown }).position;
    expect(text.title(unnamed)).toBe('Bus left in a wrong position');
    expect(text.banner(unnamed)).toBe('Bus left in a wrong position during item 1.');
  });

  it('says what the checklist asked for and what was done, per kind', () => {
    const text = describeIn('en');
    expect(text.expected(unexpected('bus'))).toBe('Confirm');
    expect(text.actual(stray('bus', 'on', 'off'))).toBe('Bus set to ON');
    expect(text.actual(unexpected('bus'))).toBe('Bus operated');
    expect(text.expected({ kind: 'unmet-check', itemIndex: 0 })).toBe('Confirm');
    expect(text.actual({ kind: 'unmet-check', itemIndex: 0, response: 3900 })).toBe(
      'Reading given: 3900',
    );
    expect(text.actual({ kind: 'unmet-check', itemIndex: 0 })).toBe(
      'Checked off with the condition not met',
    );
    expect(describeIn('de').actual({ kind: 'unmet-check', itemIndex: 0, response: 3900 })).toBe(
      'Angegebener Wert: 3900',
    );
  });

  it('names the position a stray control was set to and the one to return it to', () => {
    const moved = stray('bus', 'on', 'off');
    expect(describeIn('en').banner(moved)).toBe('Bus set to ON. Return it to OFF.');
    expect(describeIn('de').banner(moved)).toBe(
      'Bus (de) auf ON gestellt. Zurück auf OFF stellen.',
    );
  });

  it('gives a continuous position as a percentage', () => {
    expect(describeIn('en').banner(stray('bus', 0.5, 0))).toBe(
      'Bus set to 50 %. Return it to 0 %.',
    );
  });

  it('falls back to the bare wording when the move carries no positions', () => {
    expect(describeIn('en').banner(unexpected('bus'))).toBe('Bus operated. Not part of item 1.');
  });

  it('names a breaker position in the UI language', () => {
    const pulled: Deviation = {
      kind: 'wrong-position',
      itemIndex: 0,
      controlId: 'lampBreaker',
      position: 'pulled',
    };
    expect(describeIn('de').title(pulled)).toBe('Lampensicherung auf Gezogen gelassen');
    expect(describeIn('en').banner(pulled)).toBe('Lamp breaker left at Pulled during item 1.');
    expect(describeIn('en').banner(stray('lampBreaker', 'pulled', 'in'))).toBe(
      'Lamp breaker set to Pulled. Return it to In.',
    );
  });

  it('names a position the panel prints nothing for in its own sentence forms', () => {
    const en = describeIn('en');
    const de = describeIn('de');
    expect(en.banner(stray('key', 'out', 'off'))).toBe('Key: key out. Return it to OFF.');
    expect(de.banner(stray('key', 'out', 'off'))).toBe(
      'Zündschalter: Schlüssel abgezogen. Zurück auf OFF stellen.',
    );
    expect(en.banner(stray('key', 'off', 'out'))).toBe('Key set to OFF. Take the key out again.');
    expect(de.banner(stray('key', 'off', 'out'))).toBe(
      'Zündschalter auf OFF gestellt. Schlüssel wieder abziehen.',
    );
    expect(en.actual(stray('key', 'out', 'off'))).toBe('Key: key out');
    const early: Deviation = {
      kind: 'out-of-order',
      itemIndex: 0,
      controlId: 'key',
      laterItem: 3,
      position: 'out',
      from: 'off',
    };
    expect(en.banner(early)).toBe(
      'Key early: key out. It belongs to item 4, not item 1. Return it to OFF.',
    );
    expect(de.banner({ ...early, duringFlow: true })).toBe(
      'Zündschalter zu früh: Schlüssel abgezogen. Das gehört zu Punkt 4, nicht zum Flow. Zurück auf OFF stellen.',
    );
    expect(en.actual(early)).toBe('Key: key out, which belongs to item 4');
    const left: Deviation = {
      kind: 'wrong-position',
      itemIndex: 0,
      controlId: 'key',
      position: 'out',
    };
    expect(en.title(left)).toBe('Key left in a wrong position: key out');
    expect(en.banner(left)).toBe('Key left in a wrong position during item 1: key out.');
    expect(de.title(left)).toBe('Zündschalter in falscher Stellung gelassen: Schlüssel abgezogen');
  });

  it('names a guard left wrong by the guard, open or closed', () => {
    const en = describeIn('en');
    const de = describeIn('de');
    const left: Deviation = {
      kind: 'wrong-position',
      itemIndex: 1,
      controlId: 'rescue',
      position: 'closed',
    };
    expect(en.title(left)).toBe('Safety pin left in a wrong position: closed');
    expect(en.expected(left)).toBe('Safety pin: open');
    expect(en.actual(left)).toBe('Safety pin left in a wrong position: closed');
    expect(en.banner(left)).toBe('Safety pin left in a wrong position during item 2: closed.');
    expect(de.title(left)).toBe('Sicherungsstift in falscher Stellung gelassen: geschlossen');
    expect(de.expected(left)).toBe('Sicherungsstift: offen');
    expect(en.title({ ...unexpected('rescue'), itemIndex: 1 })).toContain('Rescue system');
  });

  it("names a guard's position in the guard's own words when it declares them", () => {
    const left: Deviation = {
      kind: 'wrong-position',
      itemIndex: 2,
      controlId: 'pinned',
      position: 'closed',
    };
    expect(describeIn('en').title(left)).toBe('Pin left in a wrong position: in');
    expect(describeIn('en').expected(left)).toBe('Pin: removed');
    expect(describeIn('de').title(left)).toBe('Stift in falscher Stellung gelassen: gesteckt');
  });

  it('names a late memory item by its item in both languages', () => {
    const late: Deviation = { kind: 'late-memory-item', itemIndex: 0 };
    expect(describeIn('en').where(late)).toBe('Item 1');
    expect(describeIn('en').banner(late)).toBe('Item 1 is a memory item and was done late.');
    expect(describeIn('de').title(late)).toBe('Bestätigen: Memory Item verspätet erledigt');
    expect(describeIn('de').expected(late)).toBe('Bestätigen, sofort und auswendig');
  });
});
