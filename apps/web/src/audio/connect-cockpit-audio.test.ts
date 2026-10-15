// @vitest-environment jsdom
import { createSession, STEP_MS } from '@cpt/core';
import type { Session } from '@cpt/core';
import { CLICK_SPACING_S, createAudioEngine, FakeAudioContext } from '@cpt/panel-kit';
import type { AudioEngine } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceRegistry } from '../device-registry';
import { TrainerErrorBoundary } from '../errors/TrainerErrorBoundary';
import { LanguageProvider } from '../i18n';
import { Shell } from '../shell/Shell';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { AudioProvider } from './AudioProvider';
import { connectCockpitAudio } from './connect-cockpit-audio';

// The screen test runs on the test aircraft; the driver tests take the CTSL from the real registry.
vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

const { aircraftRegistry } =
  await vi.importActual<typeof import('../aircraft-registry')>('../aircraft-registry');
const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!ctsl) throw new Error('The registry has no CTSL');
const touch = deviceRegistry.find((device) => device.id === 'aera500')?.controls['touch'];
if (touch?.kind !== 'rotary') throw new Error('The aera 500 has no touchscreen');

const contexts: FakeAudioContext[] = [];
const cleanups: (() => void)[] = [];

beforeEach(() => {
  localStorage.clear();
  contexts.length = 0;
});

afterEach(() => {
  cleanup();
  for (const done of cleanups.splice(0).reverse()) done();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const build = (): AudioContext => {
  const context = new FakeAudioContext();
  contexts.push(context);
  return context.asAudioContext();
};

const gesture = () => document.dispatchEvent(new Event('pointerdown'));

const settle = () => vi.waitFor(() => expect(contexts.at(-1)?.state).toBe('running'));

/** Each click builds one oscillator, so their start times are the clicks scheduled. */
const clickTimes = (context = contexts.at(-1)) =>
  context?.nodesOf('oscillator').map((node) => node.startedAt) ?? [];

const cockpit = (): { session: Session; engine: AudioEngine; connect(): () => void } => {
  const session = createSession(ctsl, { devices: deviceRegistry });
  const engine = createAudioEngine(document, build);
  cleanups.push(() => engine.dispose());
  const connect = () => {
    const disconnect = connectCockpitAudio(session, ctsl, deviceRegistry, engine);
    cleanups.push(disconnect);
    return disconnect;
  };
  return { session, engine, connect };
};

async function liveCockpit() {
  const parts = cockpit();
  const disconnect = parts.connect();
  gesture();
  await settle();
  return { ...parts, disconnect };
}

describe('connectCockpitAudio', () => {
  it('clicks a pilot change at the context time', async () => {
    const { session } = await liveCockpit();
    const context = contexts[0];
    if (!context) throw new Error('no context');
    context.currentTime = 2;
    expect(session.set('battery', 'in').applied).toBe(true);
    expect(clickTimes()).toEqual([2]);
  });

  it('through the real session, a device key clicks, the aera 500 touchscreen stays silent and a rotary plays a detent per position stepped', async () => {
    const { session } = await liveCockpit();
    const icon = touch.positions[1];
    if (icon === undefined) throw new Error('The aera 500 touchscreen has no icon');

    session.press('gps.power');
    expect(clickTimes()).toHaveLength(1);
    session.release('gps.power');
    expect(clickTimes(), 'a key release springs back silently').toHaveLength(1);

    expect(session.press('gps.touch', icon).applied).toBe(true);
    session.release('gps.touch');
    expect(clickTimes()).toHaveLength(1);

    expect(session.set('flapSelector', '35').applied).toBe(true);
    expect(clickTimes().slice(1)).toEqual([0, CLICK_SPACING_S, 2 * CLICK_SPACING_S]);
  });

  it('plays nothing for the changes of a phase load', async () => {
    const { session } = await liveCockpit();
    session.jumpToPhase('cruise');
    expect(session.state().controls['battery']).toBe('in');
    expect(clickTimes()).toEqual([]);
  });

  it('drops the clicks while the engine is not live, rather than queueing them', async () => {
    const { session, engine, connect } = cockpit();
    connect();
    session.set('battery', 'in');
    expect(contexts).toHaveLength(0);

    gesture();
    await settle();
    engine.setEnabled(false);
    session.set('generator', 'in');
    engine.setEnabled(true);
    await settle();
    expect(clickTimes()).toEqual([]);
  });

  it('schedules the click of the gesture that creates the context on the starting context', async () => {
    const { session, connect } = cockpit();
    connect();
    const battery = document.createElement('button');
    battery.addEventListener('pointerdown', () => session.set('battery', 'in'));
    document.body.append(battery);
    cleanups.push(() => battery.remove());

    battery.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.state).toBe('suspended');
    expect(clickTimes()).toEqual([0]);
    await settle();
  });

  it('plays on the new context once the browser closed the old one', async () => {
    const { session } = await liveCockpit();
    contexts[0]?.setState('closed');
    gesture();
    await settle();
    session.set('battery', 'in');
    expect(contexts).toHaveLength(2);
    expect(clickTimes(contexts[0])).toEqual([]);
    expect(clickTimes(contexts[1])).toEqual([0]);
  });

  it('stops on disconnect, and a connection made again clicks once per change', async () => {
    const { session, connect, disconnect } = await liveCockpit();
    disconnect();
    session.set('battery', 'in');
    expect(clickTimes()).toEqual([]);
    connect();
    session.set('generator', 'in');
    expect(clickTimes()).toEqual([0]);
  });

  it('contains a throwing node: logs once, stays silent and leaves the session working', async () => {
    const { session, connect, disconnect } = await liveCockpit();
    const context = contexts[0];
    if (!context) throw new Error('no context');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = vi.spyOn(context, 'createOscillator').mockImplementation(() => {
      throw new Error('node failed');
    });

    expect(session.set('battery', 'in').applied).toBe(true);
    expect(session.set('generator', 'in').applied).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);

    broken.mockRestore();
    expect(() => session.advance(STEP_MS)).not.toThrow();
    expect(session.press('gps.power').applied).toBe(true);
    expect(session.state().controls['gps.power']).toBe('pressed');
    expect(clickTimes(), 'silent until the next connection').toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);

    disconnect();
    connect();
    session.release('gps.power');
    session.set('battery', 'pulled');
    expect(clickTimes()).toEqual([0]);
  });
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

let explode: () => void;
function Bomb() {
  const [broken, setBroken] = useState(false);
  explode = () => setBroken(true);
  if (broken) throw new Error('render failed');
  return null;
}

// The trainer screen is a lazy chunk: transform it once so Start does not wait on it.
beforeAll(async () => {
  await import('../shell/TrainerLayout');
});

describe('useCockpitAudio', () => {
  const renderApp = () =>
    render(
      createElement(
        LanguageProvider,
        null,
        createElement(
          ThemeProvider,
          null,
          createElement(
            AudioProvider,
            null,
            createElement(
              TrainerProvider,
              null,
              createElement(Probe),
              createElement(TrainerErrorBoundary, null, createElement(Bomb), createElement(Shell)),
            ),
          ),
        ),
      ),
    );

  const flip = (id: 'master' | 'pump') =>
    act(() => {
      const at = trainer.session.state().controls[id];
      trainer.session.set(id, at === 'on' ? 'off' : 'on');
    });

  const startProcedure = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start procedure' }));
    await screen.findByRole('region', { name: 'Cockpit panel' });
  };

  beforeEach(() => {
    vi.stubGlobal('AudioContext', function FakeBrowserContext() {
      return build();
    });
  });

  it('clicks on the trainer screen only: the picker and the error screen are silent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderApp();
    await act(async () => gesture());
    await settle();

    flip('master');
    expect(clickTimes(), 'picker').toEqual([]);

    await startProcedure();
    flip('pump');
    expect(clickTimes(), 'trainer').toHaveLength(1);

    act(() => trainer.backToPicker());
    await screen.findByRole('button', { name: 'Start procedure' });
    flip('pump');
    expect(clickTimes(), 'picker again').toHaveLength(1);

    await startProcedure();
    flip('master');
    expect(clickTimes(), 'trainer again').toHaveLength(2);

    act(() => explode());
    screen.getByRole('alertdialog');
    flip('master');
    expect(clickTimes(), 'error screen').toHaveLength(2);
  });
});
