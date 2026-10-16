// @vitest-environment jsdom
import { FakeAudioContext } from '@cpt/panel-kit';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerProvider } from '../trainer';
import { AudioProvider, useAudio, useCockpitAudio } from './index';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('AudioContext', function FakeBrowserContext() {
    return new FakeAudioContext().asAudioContext();
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renders = vi.fn();

function Listener() {
  renders();
  useCockpitAudio();
  return null;
}

function Slider() {
  const { sound, volume, setSound, setVolume } = useAudio();
  return (
    <>
      <button type="button" onClick={() => setVolume(volume - 1)}>
        quieter
      </button>
      <button type="button" onClick={() => setSound(sound === 'on' ? 'off' : 'on')}>
        toggle
      </button>
    </>
  );
}

describe('useCockpitAudio', () => {
  it('does not re-render its consumer when the volume or the sound switch changes', async () => {
    renders.mockClear();
    render(
      <TrainerProvider>
        <AudioProvider>
          <Listener />
          <Slider />
        </AudioProvider>
      </TrainerProvider>,
    );
    const settled = renders.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'quieter' }));
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(renders).toHaveBeenCalledTimes(settled);
  });
});
