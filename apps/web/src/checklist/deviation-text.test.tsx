// @vitest-environment jsdom
import type { ChecklistState, Deviation } from '@cpt/core';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import { TrainerProvider } from '../trainer';
import { useDeviationText } from './deviation-text';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('../devices/test-fixtures')).aircraft],
}));

vi.mock('../device-registry', async () => ({
  deviceRegistry: (await import('../devices/test-fixtures')).devices,
  deviceScreens: {},
}));

const checklist: ChecklistState<unknown> = {
  procedure: { title: { de: 'x', en: 'x' }, type: 'normal', startPhase: 'ground', items: [] },
  current: 0,
  completed: [],
  deviations: [],
  done: false,
};

const unexpected = (controlId: string): Deviation => ({
  kind: 'unexpected-control',
  itemIndex: 0,
  controlId,
});

function describeIn(language: 'de' | 'en') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider initial={language}>
      <TrainerProvider>{children}</TrainerProvider>
    </LanguageProvider>
  );
  return renderHook(() => useDeviationText(checklist), { wrapper }).result.current;
}

afterEach(() => localStorage.clear());

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
