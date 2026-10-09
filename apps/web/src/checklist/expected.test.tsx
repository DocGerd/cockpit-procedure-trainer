// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerLayout } from '../shell/TrainerLayout';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  return {
    aircraftRegistry: [
      {
        ...fixture,
        procedures: {
          ...fixture.procedures,
          flaps: {
            title: { de: 'Klappen', en: 'Flaps' },
            type: 'normal',
            startPhase: 'parking',
            items: [
              { type: 'confirm', text: { de: 'Bereit', en: 'Ready' } },
              {
                type: 'check',
                target: { indicator: 'fuel' },
                condition: () => true,
                text: { de: 'Klappenanzeige', en: 'Flap readout' },
                expected: { de: '15°', en: '15°' },
              },
              { type: 'confirm', text: { de: 'Fertig', en: 'Done' } },
            ],
          },
        },
      },
    ],
  };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function start(mode: Mode, language: 'de' | 'en' = 'en') {
  renderWithLanguage(
    <ThemeProvider>
      <TrainerProvider>
        <Probe />
        <TrainerLayout />
      </TrainerProvider>
    </ThemeProvider>,
    { language },
  );
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure('flaps');
  });
}

const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Done' }));

const itemTexts = () =>
  [...document.querySelectorAll('.checklist-item-text')].map((node) => node.textContent);
const announcer = () => document.querySelector<HTMLElement>('.checklist-announcer');

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('innerWidth', 1400);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a check with an expected value', () => {
  it('names only what to read in Practice until it is ticked', async () => {
    start('practice');
    await confirm();
    expect(itemTexts()[1]).toBe('Flap readout');
    await userEvent.click(screen.getByRole('button', { name: 'Checked' }));
    expect(itemTexts()[1]).toBe('Flap readout: 15°');
  });

  it('gives the expected value away after Show me', async () => {
    start('practice');
    await confirm();
    await userEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(itemTexts()[1]).toBe('Flap readout: 15°');
  });

  it('shows the expected value in Guided', () => {
    start('guided');
    expect(itemTexts()[1]).toBe('Flap readout: 15°');
  });

  it('sets the expected value behind a dot leader', () => {
    start('guided');
    const row = document.querySelectorAll('.checklist-item-text')[1];
    expect(row?.querySelector('.leader')).not.toBeNull();
    expect(row?.querySelector('.checklist-expected')?.textContent).toBe('15°');
  });

  it('speaks German', () => {
    start('guided', 'de');
    expect(itemTexts()[1]).toBe('Klappenanzeige: 15°');
  });

  it('shows the expected value in the summary', async () => {
    start('practice');
    await confirm();
    await userEvent.click(screen.getByRole('button', { name: 'Checked' }));
    await confirm();
    expect(itemTexts()).toContain('Flap readout: 15°');
  });

  it('shows the expected value in the read-only view of a procedure', () => {
    start('explore');
    act(() => trainer.viewProcedure('flaps'));
    expect(itemTexts()[1]).toBe('Flap readout: 15°');
  });

  it('announces only the challenge in Practice', async () => {
    start('practice');
    await confirm();
    expect(announcer()?.textContent).toBe('Item 2 of 3: Flap readout');
  });

  it('announces the expected value in Guided', async () => {
    start('guided');
    await confirm();
    expect(announcer()?.textContent).toBe('Item 2 of 3: Flap readout: 15°');
  });
});
