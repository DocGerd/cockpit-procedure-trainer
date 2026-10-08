// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ChecklistPane } from './index';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  return {
    aircraftRegistry: [
      {
        ...fixture,
        procedures: {
          reading: {
            title: { de: 'Ablesen', en: 'Reading' },
            type: 'normal',
            startPhase: 'ground',
            items: [
              {
                type: 'check',
                target: { indicator: 'fuel' },
                condition: () => true,
                response: { reading: () => 4000, tolerance: 100 },
                text: { de: 'Drehzahl prüfen', en: 'Rpm check' },
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

function start(mode: Mode) {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure('reading');
  });
}

afterEach(() => {
  cleanup();
});

describe('a check that takes a reading', () => {
  it('asks for the reading in Practice and records one outside tolerance', async () => {
    start('practice');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Reading' }), '3000');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(trainer.session.checklist()?.deviations).toEqual([
      { kind: 'unmet-check', itemIndex: 0, response: 3000 },
    ]);
  });

  it('accepts a reading within tolerance', async () => {
    start('practice');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Reading' }), '4050');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(trainer.session.checklist()?.current).toBe(1);
    expect(trainer.session.checklist()?.deviations).toEqual([]);
  });

  it('lets the pilot check it off without a reading', async () => {
    start('practice');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(trainer.session.checklist()?.deviations).toEqual([]);
  });

  it('asks for no reading in Guided', () => {
    start('guided');
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});
