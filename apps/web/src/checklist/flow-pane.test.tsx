// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { ChecklistPane } from './index';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const text = (en: string) => ({ de: `${en} (de)`, en });
  const scan = {
    title: text('Scan'),
    type: 'normal',
    startPhase: 'ground',
    items: [
      { type: 'action', flow: true, control: 'master', position: 'on', text: text('Master') },
      { type: 'action', flow: true, control: 'pump', position: 'on', text: text('Pump') },
      { type: 'action', control: 'master', position: 'on', text: text('Master') },
      { type: 'action', control: 'pump', position: 'on', text: text('Pump') },
    ],
  };
  return { aircraftRegistry: [{ ...fixture, procedures: { scan } } as unknown as Aircraft] };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

afterEach(() => {
  cleanup();
});

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });

it('marks no flow row for a deviation made during the flow', () => {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
  act(() => {
    trainer.setMode('guided');
    trainer.startProcedure('scan');
  });
  operate('avionics', 'on');
  operate('pump', 'on');
  operate('master', 'on');
  expect(trainer.session.checklist()?.deviations).toEqual([
    expect.objectContaining({ controlId: 'avionics', duringFlow: true }),
  ]);
  const labels = within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('img').getAttribute('aria-label'));
  expect(labels).toEqual(['Done', 'Done', 'Current', 'Pending']);
});

it('says how to undo a stray move in the flow and debriefs it as the flow', () => {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
  act(() => {
    trainer.setMode('guided');
    trainer.startProcedure('scan');
  });
  operate('avionics', 'on');
  expect(
    screen.getByText('Avionics set to ON. Not part of the flow. Return it to OFF.'),
  ).toBeTruthy();
  operate('pump', 'on');
  operate('master', 'on');
  act(() => {
    trainer.session.checkOff();
    trainer.session.checkOff();
  });
  expect(screen.getByText('During the flow')).toBeTruthy();
  expect(screen.getByText('The flow items, in any order')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Go to the flow' })).toBeTruthy();
  const review = screen.getByRole('region', { name: 'The items' });
  const marks = within(review)
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('img').getAttribute('aria-label'));
  expect(marks).toEqual(['Done', 'Done', 'Done', 'Done']);
});
