// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PanelArea } from '../panel/PanelArea';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { ModeControl } from './ModeControl';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const locked = {
    ...fixture,
    controls: {
      ...fixture.controls,
      starter: {
        ...fixture.controls.starter,
        interlock: { control: 'master', at: 'off', holds: 'off' },
      },
    },
  } as unknown as Aircraft;
  return { aircraftRegistry: [locked] };
});

vi.mock('../device-registry', async (importOriginal) => {
  const { radio, radioEntry, RadioScreen } = await import('./test-aircraft');
  return {
    ...(await importOriginal<object>()),
    deviceRegistry: [radio],
    deviceScreens: { 'modes-radio': RadioScreen },
    deviceEntries: { 'modes-radio': radioEntry },
  };
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const renderTrainer = (language: 'de' | 'en' = 'en') =>
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ModeControl />
      <PanelArea layout={{ kind: 'tabs' }} />
    </TrainerProvider>,
    { language },
  );

const pressStarter = () => {
  const starter = screen.getByRole('button', { name: /Starter/ });
  fireEvent.pointerDown(starter, { button: 0 });
  fireEvent.pointerUp(starter);
};
const radio = (control: string, position: string) =>
  within(screen.getByRole('radiogroup', { name: new RegExp(control) })).getByRole('radio', {
    name: new RegExp(position),
  });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the interlock notice', () => {
  it.each([
    ['en', 'Starter locked by Master. Move Master first.'],
    ['de', 'Starter (de) gesperrt durch Master (de). Zuerst Master (de) betätigen.'],
  ] as const)('names the holding control when a move is refused, in %s', (language, notice) => {
    renderTrainer(language);
    act(() => {
      trainer.setMode('practice');
      trainer.startProcedure('start');
    });
    pressStarter();
    expect(trainer.session.state().controls.starter).toBe('off');
    expect(screen.getByRole('status').textContent).toBe(notice);
    expect(trainer.session.checklist()?.deviations ?? []).toEqual([]);
  });

  it('goes once a move goes through', async () => {
    renderTrainer();
    pressStarter();
    expect(screen.getByRole('status')).toBeTruthy();
    await userEvent.click(radio('Master', 'on'));
    expect(screen.queryByRole('status')).toBeNull();
    pressStarter();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('goes after a while', () => {
    vi.useFakeTimers();
    renderTrainer();
    pressStarter();
    expect(screen.getByRole('status')).toBeTruthy();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
