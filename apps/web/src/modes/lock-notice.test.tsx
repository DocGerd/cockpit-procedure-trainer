// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PanelArea } from '../panel/PanelArea';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { lockCause, lockHolder } from './lock-notice';
import { ModeControl } from './ModeControl';

vi.mock('../aircraft-registry', async () => {
  const { fixture } = await import('./test-aircraft');
  const locked = {
    ...fixture,
    controls: {
      ...fixture.controls,
      starter: {
        ...fixture.controls.starter,
        interlock: [{ control: 'master', at: 'off', holds: ['off'] }],
      },
      key: {
        kind: 'rotary',
        positions: ['out', 'off', 'on'],
        initial: 'out',
        onlyFrom: { out: ['off'] },
        name: { de: 'Zündschloss', en: 'Ignition' },
        legends: {
          out: {
            state: { de: 'Schlüssel abgezogen', en: 'key out' },
            restore: { de: 'Schlüssel wieder abziehen', en: 'Take the key out again' },
          },
        },
        description: { de: 'Zündschlüssel', en: 'Ignition key' },
      },
    },
    views: {
      ...fixture.views,
      main: {
        ...fixture.views['main'],
        controls: {
          ...fixture.views['main']?.controls,
          key: { rect: { x: 600, y: 350, w: 100, h: 100 } },
        },
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

const lockRing = () => document.querySelector<HTMLElement>('[data-outline="lock"]');
const boxOf = (element: HTMLElement | null) => {
  const style = element?.style;
  return { left: style?.left, top: style?.top, width: style?.width, height: style?.height };
};
const placementBox = (id: string) =>
  boxOf(document.querySelector<HTMLElement>(`[data-placement="${id}"]`));

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

describe('the lock ring', () => {
  it.each(['guided', 'practice', 'explore'] as const)(
    'rings the holding control on the panel when a move is refused, in %s',
    (mode) => {
      renderTrainer();
      act(() => trainer.setMode(mode));
      if (mode === 'explore')
        fireEvent.click(screen.getByRole('checkbox', { name: /Operate controls/ }));
      pressStarter();
      expect(lockRing()).not.toBeNull();
      expect(boxOf(lockRing())).toEqual(placementBox('master'));
    },
  );

  it('draws nothing before a refusal', () => {
    renderTrainer();
    expect(lockRing()).toBeNull();
  });

  it('goes with the notice once a move goes through', async () => {
    renderTrainer();
    pressStarter();
    expect(lockRing()).not.toBeNull();
    await userEvent.click(radio('Master', 'on'));
    expect(lockRing()).toBeNull();
  });

  it('goes with the notice after a while', () => {
    vi.useFakeTimers();
    renderTrainer();
    pressStarter();
    expect(lockRing()).not.toBeNull();
    act(() => vi.advanceTimersByTime(6000));
    expect(lockRing()).toBeNull();
  });

  it('pulses again on a repeat refusal', () => {
    renderTrainer();
    pressStarter();
    const first = lockRing();
    pressStarter();
    expect(lockRing()).not.toBe(first);
    expect(lockRing()?.dataset.pulse).toBe('once');
  });
});

describe('the key-out notice', () => {
  const keyTo = (position: string) => userEvent.click(radio('Ignition|Zündschloss', position));

  it.each([
    ['en', 'Ignition reaches key out only from OFF.'],
    ['de', 'Zündschloss: Schlüssel abgezogen nur von OFF aus erreichbar.'],
  ] as const)(
    'says where the target is reached from when onlyFrom refuses, in %s',
    async (language, notice) => {
      renderTrainer(language);
      await keyTo('on');
      await keyTo('out');
      expect(trainer.session.state().controls.key).toBe('on');
      expect(screen.getByRole('status').textContent).toBe(notice);
    },
  );

  it('rings the refused control itself', async () => {
    renderTrainer();
    await keyTo('on');
    expect(lockRing()).toBeNull();
    await keyTo('out');
    expect(boxOf(lockRing())).toEqual(placementBox('key'));
  });

  it('goes once a move goes through', async () => {
    renderTrainer();
    await keyTo('on');
    await keyTo('out');
    await keyTo('off');
    expect(screen.queryByRole('status')).toBeNull();
    expect(lockRing()).toBeNull();
  });

  it('stays silent for a move that is allowed', async () => {
    renderTrainer();
    await keyTo('on');
    await keyTo('off');
    await keyTo('out');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('lockHolder', () => {
  const name = { de: 'n', en: 'n' };
  const toggle = (positions: readonly string[]) => ({
    name,
    description: name,
    kind: 'toggle',
    positions,
    initial: positions[0],
  });
  const aircraft = {
    controls: {
      valve: toggle(['open', 'closed']),
      key: {
        ...toggle(['out', 'off', 'on']),
        interlock: [{ control: 'valve', at: 'closed', holds: ['off', 'out'] }],
      },
    },
  } as unknown as Pick<Aircraft, 'controls'>;

  it('names the control whose lock holds the current position', () => {
    expect(lockHolder(aircraft, { valve: 'closed', key: 'off' }, 'key')).toBe('valve');
  });

  it('names nothing when no lock holds the current position', () => {
    expect(lockHolder(aircraft, { valve: 'closed', key: 'on' }, 'key')).toBeUndefined();
    expect(lockHolder(aircraft, { valve: 'open', key: 'off' }, 'key')).toBeUndefined();
  });
});

describe('lockCause', () => {
  const name = { de: 'n', en: 'n' };
  const key = {
    name,
    description: name,
    kind: 'rotary',
    positions: ['out', 'off', 'on'],
    initial: 'out',
    onlyFrom: { out: ['off'] },
  };
  const aircraft = {
    controls: {
      valve: {
        name,
        description: name,
        kind: 'toggle',
        positions: ['open', 'closed'],
        initial: 'open',
      },
      key: { ...key, interlock: [{ control: 'valve', at: 'closed', holds: ['on'] }] },
      plain: { ...key, onlyFrom: undefined },
    },
  } as unknown as Pick<Aircraft, 'controls'>;

  it('prefers the holding control over the source list', () => {
    expect(
      lockCause(aircraft, { valve: 'closed', key: 'on' }, { controlId: 'key', to: 'out' }),
    ).toEqual({
      kind: 'holder',
      control: 'valve',
    });
  });

  it('lists the positions the target is reached from', () => {
    expect(
      lockCause(aircraft, { valve: 'open', key: 'on' }, { controlId: 'key', to: 'out' }),
    ).toEqual({
      kind: 'source',
      to: 'out',
      from: ['off'],
    });
  });

  it('names nothing without a target or a source restriction', () => {
    const positions = { valve: 'open', key: 'on', plain: 'on' };
    expect(lockCause(aircraft, positions, { controlId: 'key' })).toBeUndefined();
    expect(lockCause(aircraft, positions, { controlId: 'key', to: 'off' })).toBeUndefined();
    expect(lockCause(aircraft, positions, { controlId: 'plain', to: 'out' })).toBeUndefined();
  });

  it('names nothing when the control already sits at a source', () => {
    expect(
      lockCause(aircraft, { valve: 'open', key: 'off' }, { controlId: 'key', to: 'out' }),
    ).toBeUndefined();
  });
});
