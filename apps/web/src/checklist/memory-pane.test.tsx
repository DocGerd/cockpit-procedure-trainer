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
  const drill = {
    title: text('Drill'),
    type: 'emergency',
    failure: 'fire',
    startPhase: 'airborne',
    items: [
      { type: 'action', memory: true, control: 'pump', position: 'off', text: text('Pump off') },
      { type: 'confirm', memory: true, text: text('Mayday call') },
      { type: 'action', control: 'master', position: 'off', text: text('Master off') },
    ],
  };
  return { aircraftRegistry: [{ ...fixture, procedures: { drill } } as unknown as Aircraft] };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

afterEach(() => {
  cleanup();
});

function start(mode: Mode, language: 'de' | 'en' = 'en') {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
      <ChecklistAnnouncer />
    </TrainerProvider>,
    { language },
  );
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure('drill');
  });
}

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });

const checkOff = () =>
  act(() => {
    trainer.session.checkOff();
  });

it('withholds a memory item in Practice until it is done', () => {
  start('practice');
  expect(screen.queryByText('Pump off')).toBeNull();
  expect(screen.queryByText('Mayday call')).toBeNull();
  expect(screen.getByText('Master off')).toBeTruthy();
  operate('pump', 'off');
  expect(screen.getByText('Pump off')).toBeTruthy();
  expect(screen.queryByText('Mayday call')).toBeNull();
  expect(document.querySelector('.checklist-announcer')?.textContent).toBe('Item 2 of 3');
});

it('reveals a memory item with Show me in Practice', () => {
  start('practice');
  act(() => {
    screen.getByRole('button', { name: 'Show me' }).click();
  });
  expect(screen.getByText('Pump off')).toBeTruthy();
});

it.each([
  ['en', 'Memory items'],
  ['de', 'Memory Items'],
] as const)('groups the memory items under a mark in Guided (%s)', (language, label) => {
  start('guided', language);
  const group = screen.getByRole('list', { name: label });
  const rows = within(group).getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(within(group).getByText(language === 'en' ? 'Pump off' : 'Pump off (de)')).toBeTruthy();
});

it('debriefs a memory item done late as its own deviation', () => {
  start('guided');
  operate('avionics', 'on');
  operate('pump', 'off');
  checkOff();
  operate('master', 'off');
  expect(trainer.session.checklist()?.done).toBe(true);
  const kinds = screen.getAllByRole('listitem').map((item) => item.textContent);
  expect(kinds).toContain('Unexpected control1');
  expect(kinds).toContain('Memory item late1');
  expect(screen.getByText('Pump off: memory item done late')).toBeTruthy();
  expect(screen.getByText('Pump off, at once from memory')).toBeTruthy();
  expect(screen.getByText('Done only after another action')).toBeTruthy();
});
