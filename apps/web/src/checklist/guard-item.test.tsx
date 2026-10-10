// @vitest-environment jsdom
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { usesOf } from '../modes/ControlDetails';
import { TrainerProvider, useTrainer } from '../trainer';
import { pinned } from './guard-test-aircraft';
import type { Trainer } from '../trainer';
import { ChecklistPane, useCurrentTarget } from './index';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./guard-test-aircraft')).pinned],
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <TrainerProvider>
    <Probe />
    {children}
  </TrainerProvider>
);

const start = (procedure = 'pin') =>
  act(() => {
    trainer.setMode('guided');
    trainer.startProcedure(procedure);
  });

const renderPane = () =>
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('a guard item', () => {
  it('rings its guarded control and completes when the pilot moves the guard', () => {
    const { result } = renderHook(() => useCurrentTarget(), { wrapper });
    start();
    expect(result.current).toEqual({ control: 'rescue' });
    act(() => {
      trainer.session.openGuard('rescue');
    });
    expect(trainer.session.checklist()?.done).toBe(true);
    expect(trainer.session.checklist()?.deviations).toEqual([]);
  });

  it('offers Verified, which records the guard left elsewhere as a wrong position', async () => {
    renderPane();
    start();
    expect(screen.queryByRole('button', { name: 'Checked' })).toBeNull();
    expect(
      screen.getByText(/Remove the safety pin, or verify it if it is already set/),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Verified' }));
    expect(trainer.session.checklist()?.deviations).toEqual([
      expect.objectContaining({ kind: 'wrong-position', controlId: 'rescue', position: 'closed' }),
    ]);
  });

  it('asks to open the guard when the guard declares no words of its own', () => {
    renderPane();
    start('cover');
    expect(screen.getByText(/Open its guard, or verify it if it is already set/)).toBeTruthy();
  });

  it('counts as a use of its control in the control details', () => {
    expect(usesOf(pinned, 'rescue')).toEqual([
      { key: 'pin/0', title: pinned.procedures.pin?.title, number: 1 },
    ]);
  });
});
