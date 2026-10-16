// @vitest-environment jsdom
import { FakeAudioContext } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOLUME, readSetting, writeSetting } from '../storage';
import { AudioProvider, useAudio, useAudioEngine } from './index';

const contexts: FakeAudioContext[] = [];

beforeEach(() => {
  window.localStorage.clear();
  contexts.length = 0;
  vi.stubGlobal('AudioContext', function FakeBrowserContext() {
    const context = new FakeAudioContext();
    contexts.push(context);
    return context.asAudioContext();
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const gesture = () => document.dispatchEvent(new Event('pointerdown', { bubbles: true }));

function Consumer({ nextVolume = 40.4 }: { nextVolume?: number }) {
  const engine = useAudioEngine();
  const { sound, volume, setSound, setVolume } = useAudio();
  return (
    <>
      <output data-testid="engine">{engine ? 'engine' : 'none'}</output>
      <output data-testid="sound">{sound}</output>
      <output data-testid="volume">{volume}</output>
      <button type="button" onClick={() => setSound(sound === 'on' ? 'off' : 'on')}>
        toggle
      </button>
      <button type="button" onClick={() => setVolume(nextVolume)}>
        volume
      </button>
    </>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));

// The engine builds its master gain first, and the fake keeps the last value set or scheduled.
const masterGain = (context: FakeAudioContext | undefined) =>
  context?.nodesOf('gain')[0]?.gain.value;

describe('AudioProvider', () => {
  it('keeps the unlock listeners installed on a fresh engine under StrictMode', async () => {
    render(
      <StrictMode>
        <AudioProvider>
          <Consumer />
        </AudioProvider>
      </StrictMode>,
    );
    expect(text('engine')).toBe('engine');
    await act(async () => gesture());
    expect(contexts).toHaveLength(1);
  });

  it('constructs no context while sound is off, even after a gesture', async () => {
    writeSetting('sound', 'off');
    render(
      <StrictMode>
        <AudioProvider>
          <Consumer />
        </AudioProvider>
      </StrictMode>,
    );
    await act(async () => gesture());
    expect(contexts).toHaveLength(0);
    expect(text('sound')).toBe('off');
  });

  it('reads the stored volume and falls back to the default for garbage', () => {
    writeSetting('volume', '35');
    const first = render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    expect(text('volume')).toBe('35');
    first.unmount();
    writeSetting('volume', 'loud');
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    expect(text('volume')).toBe(String(DEFAULT_VOLUME));
  });

  it('works on the defaults when storage throws', async () => {
    writeSetting('sound', 'off');
    writeSetting('volume', '10');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    expect(text('sound')).toBe('on');
    expect(text('volume')).toBe(String(DEFAULT_VOLUME));
    await click('toggle');
    await click('volume');
    expect(text('sound')).toBe('off');
    expect(text('volume')).toBe('40');
    expect(masterGain(contexts[0])).toBe(0);
  });

  it('switches sound on from a click, builds the context there and stores the choice', async () => {
    writeSetting('sound', 'off');
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await click('toggle');
    expect(text('sound')).toBe('on');
    expect(readSetting('sound')).toBe('on');
    expect(contexts).toHaveLength(1);
    await click('toggle');
    expect(text('sound')).toBe('off');
    expect(readSetting('sound')).toBe('off');
  });

  it('sends the switch and the volume to the fresh engine under StrictMode', async () => {
    writeSetting('volume', '35');
    render(
      <StrictMode>
        <AudioProvider>
          <Consumer />
        </AudioProvider>
      </StrictMode>,
    );
    await act(async () => gesture());
    expect(masterGain(contexts[0])).toBeCloseTo(0.35 ** 2);
    await click('toggle');
    expect(masterGain(contexts[0])).toBe(0);
    await click('volume');
    expect(masterGain(contexts[0])).toBe(0);
    await click('toggle');
    expect(masterGain(contexts[0])).toBeCloseTo(0.4 ** 2);
    expect(contexts).toHaveLength(1);
  });

  it('hands the choices made since mount to the engine an effect re-run builds', async () => {
    const tree = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <AudioProvider>
          <Consumer />
        </AudioProvider>
      </Activity>
    );
    const { rerender } = render(tree('visible'));
    await click('volume');
    await click('toggle');
    rerender(tree('hidden'));
    rerender(tree('visible'));
    await act(async () => gesture());
    expect(contexts).toHaveLength(1);
    await click('toggle');
    expect(contexts).toHaveLength(2);
    expect(masterGain(contexts[1])).toBeCloseTo(0.4 ** 2);
  });

  it.each([
    [40.4, '40'],
    [-5, '0'],
    [250, '100'],
  ])('stores the volume %s as %s', async (next, stored) => {
    render(
      <AudioProvider>
        <Consumer nextVolume={next} />
      </AudioProvider>,
    );
    await click('volume');
    expect(text('volume')).toBe(stored);
    expect(readSetting('volume')).toBe(stored);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'ignores the volume %s',
    async (next) => {
      render(
        <AudioProvider>
          <Consumer nextVolume={next} />
        </AudioProvider>,
      );
      await click('volume');
      expect(text('volume')).toBe(String(DEFAULT_VOLUME));
      expect(readSetting('volume')).toBeUndefined();
    },
  );

  it('disposes the engine on unmount, so a later gesture builds nothing', async () => {
    const { unmount } = render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    unmount();
    await act(async () => gesture());
    expect(contexts).toHaveLength(0);
  });

  it('works and stores the settings without the Web Audio API', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const warn = vi.spyOn(console, 'warn');
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await act(async () => gesture());
    await click('toggle');
    await click('volume');
    expect(text('engine')).toBe('engine');
    expect(readSetting('sound')).toBe('off');
    expect(readSetting('volume')).toBe('40');
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps the switch working when the browser refuses a context, and says why once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('AudioContext', function RefusedContext() {
      throw new DOMException('Refused', 'NotSupportedError');
    });
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await act(async () => gesture());
    await click('toggle');
    await click('toggle');
    expect(text('sound')).toBe('on');
    expect(readSetting('sound')).toBe('on');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('useAudio outside AudioProvider', () => {
  it('returns the silent default', async () => {
    writeSetting('sound', 'off');
    writeSetting('volume', '10');
    render(<Consumer />);
    expect(text('engine')).toBe('none');
    expect(text('sound')).toBe('on');
    expect(text('volume')).toBe(String(DEFAULT_VOLUME));
    await click('toggle');
    await click('volume');
    expect(text('sound')).toBe('on');
    expect(text('volume')).toBe(String(DEFAULT_VOLUME));
    expect(readSetting('sound')).toBe('off');
    expect(readSetting('volume')).toBe('10');
  });
});
