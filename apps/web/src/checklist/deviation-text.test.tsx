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
      positions: ['off', 'on', 'start'],
      initial: 'off',
      springBack: { start: 'on' },
    },
  },
  procedures: {
    flow: {
      title: { de: 'Ablauf', en: 'Flow' },
      type: 'normal',
      startPhase: 'ground',
      items: [{ type: 'confirm', text: { de: 'Bestätigen', en: 'Confirm' } }],
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
});
