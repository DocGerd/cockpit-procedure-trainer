// @vitest-environment jsdom
import { createSession, STEP_MS } from '@cpt/core';
import type { Aircraft, Session } from '@cpt/core';
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
const demo = aircraftRegistry.find((aircraft) => aircraft.id === 'demo');
if (!demo) throw new Error('The registry has no demo aircraft');
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

const cockpit = (
  aircraft: Aircraft = ctsl,
): { session: Session; engine: AudioEngine; connect(): () => void } => {
  const session = createSession(aircraft, { devices: deviceRegistry });
  const engine = createAudioEngine(document, build);
  cleanups.push(() => engine.dispose());
  const connect = () => {
    const disconnect = connectCockpitAudio(session, aircraft, deviceRegistry, engine);
    cleanups.push(disconnect);
    return disconnect;
  };
  return { session, engine, connect };
};

async function liveCockpit(aircraft?: Aircraft) {
  const parts = cockpit(aircraft);
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

  it('through the real session, a device key clicks, the aera 500 touchscreen stays silent and a rotary plays a detent per position stepped, either way', async () => {
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
    expect(session.set('flapSelector', '0').applied).toBe(true);
    expect(clickTimes().slice(4)).toEqual([0, CLICK_SPACING_S, 2 * CLICK_SPACING_S]);
  });

  it('plays one detent for a turn into a spring-back position and none for the spring return', async () => {
    const { session } = await liveCockpit();
    const moves = [
      ['fuelValve', 'open'],
      ['ignition', 'off'],
      ['ignition', 'both'],
    ] as const;
    for (const [id, position] of moves) {
      expect(session.set(id, position).applied, `${id} to ${position}`).toBe(true);
    }
    const before = clickTimes().length;

    expect(session.press('ignition', 'start').applied).toBe(true);
    expect(clickTimes()).toHaveLength(before + 1);
    session.release('ignition');
    expect(session.state().controls['ignition']).toBe('both');
    expect(clickTimes()).toHaveLength(before + 1);
  });

  it('clicks in the demo aircraft too: a toggle and a device key click, the continuous radio volume stays silent', async () => {
    const { session } = await liveCockpit(demo);
    expect(session.set('battery', 'on').applied).toBe(true);
    expect(session.press('radio.swap').applied).toBe(true);
    expect(session.set('radio.volume', 0.8).applied).toBe(true);
    expect(clickTimes()).toHaveLength(2);
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

  it('drops a click while the browser holds the context interrupted, until a gesture resumes it', async () => {
    const { session } = await liveCockpit();
    contexts[0]?.setState('interrupted');
    session.set('battery', 'in');
    expect(clickTimes()).toEqual([]);

    gesture();
    await settle();
    session.set('generator', 'in');
    expect(clickTimes()).toEqual([0]);
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
    const { session, connect } = cockpit();
    const listen = session.onControlChange.bind(session);
    const unsubscribes: (() => void)[] = [];
    vi.spyOn(session, 'onControlChange').mockImplementation((listener) => {
      const unsubscribe = vi.fn(listen(listener));
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    });
    const disconnect = connect();
    gesture();
    await settle();

    disconnect();
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
    session.set('battery', 'in');
    expect(clickTimes()).toEqual([]);
    connect();
    session.set('generator', 'in');
    expect(clickTimes()).toEqual([0]);
  });

  const fail = (message: string) => (): never => {
    throw new Error(message);
  };

  it.each([
    {
      site: 'a context node',
      breakAt: (context: FakeAudioContext) =>
        vi.spyOn(context, 'createOscillator').mockImplementation(fail('node failed')),
    },
    {
      site: 'engine.out',
      breakAt: (_context: FakeAudioContext, engine: AudioEngine) =>
        vi.spyOn(engine, 'out').mockImplementation(fail('out failed')),
    },
    {
      site: 'engine.live',
      breakAt: (_context: FakeAudioContext, engine: AudioEngine) =>
        vi.spyOn(engine, 'live').mockImplementation(fail('live failed')),
    },
  ])(
    'contains a throw from $site: logs once, naming the control, stays silent and leaves the session working',
    async ({ breakAt }) => {
      const { session, engine, connect, disconnect } = await liveCockpit();
      const context = contexts[0];
      if (!context) throw new Error('no context');
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const broken = breakAt(context, engine);

      expect(session.set('battery', 'in').applied).toBe(true);
      expect(session.set('generator', 'in').applied).toBe(true);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('battery'), expect.any(Error));

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
    },
  );
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
