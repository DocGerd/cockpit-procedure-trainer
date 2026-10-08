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
    expect(text.detail(outOfOrder)).toBe('The current item was Confirm.');
    expect(text.banner(outOfOrder)).toBe('Bus operated early. It belongs to item 4, not item 1.');
  });

  it('names a control left in the wrong position without its raw position id', () => {
    const text = describeIn('en');
    expect(text.where(wrongPosition)).toBe('Item 1');
    expect(text.title(wrongPosition)).toBe('Bus left in a wrong position');
    expect(text.detail(wrongPosition)).toBe('The item was Confirm.');
    expect(text.banner(wrongPosition)).toBe('Bus left in a wrong position during item 1.');
    expect(describeIn('de').title(wrongPosition)).toBe('Bus (de) in falscher Stellung gelassen');
  });

  it('gives the reading of an unmet check when there was one', () => {
    const text = describeIn('de');
    expect(text.detail({ kind: 'unmet-check', itemIndex: 0, response: 3900 })).toBe(
      'Der angegebene Wert war 3900.',
    );
    expect(text.detail({ kind: 'unmet-check', itemIndex: 0 })).toBe(
      'Der Punkt wurde abgehakt, obwohl seine Bedingung nicht erfüllt war.',
    );
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
  });
});
