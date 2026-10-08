// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
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
        controls: {
          ...fixture.controls,
          lampTest: {
            kind: 'momentary',
            positions: ['released', 'pressed'],
            initial: 'released',
            name: { de: 'Lampentest', en: 'Lamp test' },
            description: { de: 'Lampentest', en: 'Lamp test' },
          },
        },
        procedures: {
          press: {
            title: { de: 'Drücken', en: 'Press' },
            type: 'normal',
            startPhase: 'ground',
            items: [
              {
                type: 'action',
                control: 'lampTest',
                position: 'pressed',
                text: { de: 'Lampentest', en: 'Lamp test' },
              },
            ],
          },
          reading: {
            title: { de: 'Ablesen', en: 'Reading' },
            type: 'normal',
            startPhase: 'ground',
            items: [
              {
                type: 'check',
                target: { indicator: 'fuel' },
                condition: () => true,
                response: { reading: () => 4000, tolerance: 100, unit: { de: 'U/min', en: 'rpm' } },
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

function start(mode: Mode, procedure = 'reading') {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure(procedure);
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

  it('shows the reading label and unit', () => {
    start('practice');
    const field = screen.getByRole('spinbutton', { name: 'Reading' }).closest('label');
    expect(field?.textContent).toBe('Readingrpm');
  });

  it('starts a restarted run with an empty reading', async () => {
    start('practice');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Reading' }), '3000');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restart' }),
    );
    expect(screen.getByRole('spinbutton', { name: 'Reading' })).toHaveProperty('value', '');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(trainer.session.checklist()?.deviations).toEqual([]);
  });

  it('asks for no reading in Guided', () => {
    start('guided');
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});

describe('a spring-back press', () => {
  it('offers no Verified tick, in either mode', () => {
    start('practice', 'press');
    expect(screen.queryByRole('button', { name: 'Verified' })).toBeNull();
    cleanup();
    start('guided', 'press');
    expect(screen.queryByRole('button', { name: 'Verified' })).toBeNull();
    expect(screen.getByText('Highlighted on the panel. Operate it to continue.')).toBeTruthy();
  });
});
