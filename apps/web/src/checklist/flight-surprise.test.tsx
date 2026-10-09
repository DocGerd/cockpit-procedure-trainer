// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { ChecklistPane } from './index';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const fire = fixture.procedures['fire'];
  if (!fire) throw new Error('The fixture has no fire procedure');
  const parked: Aircraft = {
    ...fixture,
    procedures: { ...fixture.procedures, fire: { ...fire, startPhase: 'parking' } },
  };
  return { aircraftRegistry: [parked] };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });
const selector = () => screen.getByRole('combobox', { name: 'Show checklist' });
const runButton = () => screen.queryByRole('button', { name: 'Run this checklist' });

function startFlight() {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );
  // The first phase, leg and failure, and the failure after the leg's first item.
  vi.spyOn(Math, 'random').mockReturnValue(0);
  act(() => {
    trainer.setMode('practice');
    trainer.startFlight({ surprise: { phase: 'parking' } });
  });
  vi.mocked(Math.random).mockRestore();
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('a surprise failure in a full flight', () => {
  it('offers no checklist run until the failure has come', async () => {
    startFlight();
    expect(screen.getByText('Full flight, leg 1 of 2')).toBeTruthy();
    await userEvent.selectOptions(selector(), 'fire');
    expect(runButton()).toBeNull();
    expect(screen.queryByText(/Surprise failure:/)).toBeNull();
    operate('master', 'on');
    expect([...trainer.session.failures()]).toEqual(['fire']);
    expect(runButton()).toBeTruthy();
  });

  it('runs the chosen checklist as the last leg and sums up the flight with it', async () => {
    startFlight();
    operate('master', 'on');
    act(() => trainer.session.advance(5 * STEP_MS));
    await userEvent.selectOptions(selector(), 'fire');
    await userEvent.click(runButton() as HTMLElement);
    expect(screen.getByText('Full flight, leg 2 of 2')).toBeTruthy();
    operate('pump', 'on');
    operate('pump', 'off');
    expect(screen.getByText('Time to recognise')).toBeTruthy();
    expect(screen.getByText('Right checklist for the failure: Fire.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
    const table = within(screen.getByRole('region', { name: 'The whole flight' }));
    const names = table.getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(names).toEqual(['Flow (interrupted)', 'Fire', 'Total']);
    await userEvent.click(screen.getByRole('button', { name: 'Repeat this procedure' }));
    expect(trainer.procedureId).toBe('fire');
    expect(trainer.flight?.legs).toEqual(['flow', 'fire']);
  });

  it('holds the flight at a leg done before the failure was answered', () => {
    startFlight();
    operate('master', 'on');
    act(() => trainer.session.checkOff());
    operate('pump', 'on');
    act(() => trainer.session.checkOff());
    act(() => trainer.session.checkOff());
    expect(trainer.session.checklist()?.done).toBe(true);
    expect(screen.getByText(/Surprise failure: a failure appears without warning/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'The whole flight' })).toBeNull();
  });
});
