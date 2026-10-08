// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ChecklistAnnouncer } from './ChecklistAnnouncer';
import { ChecklistPane } from './index';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const text = (en: string) => ({ de: `${en} (de)`, en });
  const scan = {
    title: text('Scan'),
    type: 'normal',
    startPhase: 'ground',
    items: [
      { type: 'action', flow: true, control: 'master', position: 'on', text: text('Master flow') },
      { type: 'action', flow: true, control: 'pump', position: 'on', text: text('Pump flow') },
      { type: 'action', control: 'master', position: 'on', text: text('Master verified') },
      { type: 'action', control: 'pump', position: 'on', text: text('Pump verified') },
    ],
  };
  const preset = {
    title: text('Preset'),
    type: 'normal',
    startPhase: 'airborne',
    items: [
      { type: 'action', flow: true, control: 'master', position: 'on', text: text('Master flow') },
      {
        type: 'action',
        flow: true,
        control: 'avionics',
        position: 'on',
        text: text('Avionics flow'),
      },
      { type: 'action', control: 'master', position: 'on', text: text('Master verified') },
      { type: 'action', control: 'avionics', position: 'on', text: text('Avionics verified') },
    ],
  };
  return {
    aircraftRegistry: [{ ...fixture, procedures: { scan, preset } } as unknown as Aircraft],
  };
});

const flowTexts = ['Master flow', 'Pump flow'];
const flowHeading = 'Flow — any order, from memory';
const transition = 'Flow done. Now verify it with the checklist, item by item.';

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

afterEach(() => {
  cleanup();
});

function renderPane({ announcer = false } = {}) {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
      {announcer && <ChecklistAnnouncer />}
    </TrainerProvider>,
  );
}

function start(mode: Mode, procedure = 'scan') {
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure(procedure);
  });
}

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });

const markOf = (row: HTMLElement) => within(row).getByRole('img').getAttribute('aria-label');
const marks = (root: HTMLElement) =>
  within(root)
    .getAllByRole('listitem')
    .filter((row) => !row.classList.contains('checklist-group'))
    .map(markOf);

const flowList = (root: HTMLElement = document.body) =>
  within(root).getByRole('list', { name: flowHeading });
const flowGroup = () => flowList().closest<HTMLElement>('.checklist-group');
// The rows after the flow, which verify it.
const checklistMarks = () =>
  screen
    .getAllByRole('listitem')
    .filter((row) => !row.closest('.checklist-group'))
    .map(markOf);
const pageText = () => document.body.textContent ?? '';

it('marks no flow row for a deviation made during the flow', () => {
  renderPane();
  start('guided');
  operate('avionics', 'on');
  operate('pump', 'on');
  operate('master', 'on');
  expect(trainer.session.checklist()?.deviations).toEqual([
    expect.objectContaining({ controlId: 'avionics', duringFlow: true }),
  ]);
  expect(marks(flowList())).toEqual(['Done', 'Done']);
  expect(checklistMarks()).toEqual(['Current', 'Pending']);
});

it('says how to undo a stray move in the flow and debriefs it as the flow', () => {
  renderPane();
  start('guided');
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
  expect(marks(review)).toEqual(['Done', 'Done', 'Done', 'Done']);
});

it('groups the flow under its own label, every open row alike, apart from the checklist', () => {
  renderPane();
  start('guided');
  expect(marks(flowList())).toEqual(['To do', 'To do']);
  expect(checklistMarks()).toEqual(['Pending', 'Pending']);
  expect(within(flowList()).getByText('Master flow')).toBeTruthy();
  expect(
    within(flowGroup() ?? document.body).getByText(
      'Each ringed control belongs to the flow. Set them in any order.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/Highlighted on the panel/)).toBeNull();
  expect(screen.queryByText(transition)).toBeNull();

  operate('pump', 'on');
  expect(marks(flowList())).toEqual(['To do', 'Done']);
});

it('marks the step to verify once the flow is done, until the first checklist item is', () => {
  renderPane();
  start('guided');
  operate('pump', 'on');
  operate('master', 'on');
  expect(within(flowGroup() ?? document.body).getByText(transition)).toBeTruthy();
  expect(flowGroup()?.dataset.state).toBe('done');
  expect(checklistMarks()).toEqual(['Current', 'Pending']);
  expect(screen.getByRole('button', { name: 'Verified' })).toBeTruthy();

  act(() => {
    trainer.session.checkOff();
  });
  expect(screen.queryByText(transition)).toBeNull();
});

it('keeps every flow text out of the Practice page until the flow is done', () => {
  renderPane({ announcer: true });
  start('practice');
  for (const text of flowTexts) expect(pageText()).not.toContain(text);
  expect(marks(flowList())).toEqual(['To do', 'To do']);
  expect(screen.getByText('Set the flow from memory, in any order.')).toBeTruthy();
  expect(screen.getByText('Master verified')).toBeTruthy();

  operate('pump', 'on');
  expect(marks(flowList())).toEqual(['To do', 'Done']);
  for (const text of flowTexts) expect(pageText()).not.toContain(text);
  expect(document.querySelector('.checklist-announcer')?.textContent).toBe('Flow: 1 of 2 done');

  operate('master', 'on');
  for (const text of flowTexts) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getByText(transition)).toBeTruthy();
  expect(document.querySelector('.checklist-announcer')?.textContent).toBe(
    'Flow done. Verify it with the checklist. Item 3 of 4: Master verified',
  );
});

it('draws the withheld flow rows in Practice with upcoming items hidden', () => {
  renderPane();
  start('practice');
  act(() => trainer.setRecall(true));
  expect(marks(flowList())).toEqual(['To do', 'To do']);
  expect(screen.queryByText('Master verified')).toBeNull();
  for (const text of flowTexts) expect(pageText()).not.toContain(text);
});

it('shows the whole flow with one Show me, for the rest of the flow', () => {
  renderPane();
  start('practice');
  act(() => trainer.setRecall(true));
  act(() => screen.getByRole('button', { name: 'Show me' }).click());
  expect(trainer.assisted).toEqual([0]);
  for (const text of flowTexts) expect(screen.getByText(text)).toBeTruthy();

  operate('master', 'on');
  expect(trainer.session.checklist()?.current).toBe(1);
  for (const text of flowTexts) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Show me' })).toBeNull();
});

it('groups the flow rows in the debrief', () => {
  renderPane();
  start('guided');
  operate('master', 'on');
  operate('pump', 'on');
  act(() => {
    trainer.session.checkOff();
    trainer.session.checkOff();
  });
  const review = screen.getByRole('region', { name: 'The items' });
  expect(marks(flowList(review))).toEqual(['Done', 'Done']);
});

it('counts a flow item already in place at the start as nothing the pilot would lose', () => {
  renderPane();
  start('guided', 'preset');
  expect(trainer.session.checklist()?.completed).toEqual([0]);
  act(() => screen.getByRole('button', { name: 'Restart' }).click());
  expect(screen.queryByRole('alertdialog')).toBeNull();

  operate('avionics', 'on');
  act(() => screen.getByRole('button', { name: 'Restart' }).click());
  expect(screen.getByRole('alertdialog', { name: 'Restart the procedure?' })).toBeTruthy();
});
