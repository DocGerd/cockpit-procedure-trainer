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

  it('falls back to the id for a control nothing defines', () => {
    expect(describeIn('en').title(unexpected('radio.nothing'))).toBe('radio.nothing operated');
  });
});
