// @vitest-environment jsdom
import { FakeAudioContext } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOLUME, readSetting, writeSetting } from '../storage';
import { AudioProvider, useAudio } from './index';

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
});

const gesture = () => document.dispatchEvent(new Event('pointerdown', { bubbles: true }));

function Consumer() {
  const { engine, sound, volume, setSound, setVolume } = useAudio();
  return (
    <>
      <output data-testid="engine">{engine ? 'engine' : 'none'}</output>
      <output data-testid="sound">{sound}</output>
      <output data-testid="volume">{volume}</output>
      <button type="button" onClick={() => setSound(sound === 'on' ? 'off' : 'on')}>
        toggle
      </button>
      <button type="button" onClick={() => setVolume(40.4)}>
        quieter
      </button>
      <button type="button" onClick={() => setVolume(Number.NaN)}>
        nonsense
      </button>
    </>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

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

  it('switches sound on from a click, builds the context there and stores the choice', async () => {
    writeSetting('sound', 'off');
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(text('sound')).toBe('on');
    expect(readSetting('sound')).toBe('on');
    expect(contexts).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(text('sound')).toBe('off');
    expect(readSetting('sound')).toBe('off');
  });

  it('stores a whole-number volume and ignores a value that is not a number', async () => {
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'quieter' }));
    expect(text('volume')).toBe('40');
    expect(readSetting('volume')).toBe('40');
    await userEvent.click(screen.getByRole('button', { name: 'nonsense' }));
    expect(text('volume')).toBe('40');
    expect(readSetting('volume')).toBe('40');
  });

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

  it('works without the Web Audio API', async () => {
    vi.stubGlobal('AudioContext', undefined);
    render(
      <AudioProvider>
        <Consumer />
      </AudioProvider>,
    );
    await act(async () => gesture());
    expect(text('engine')).toBe('engine');
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
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    await userEvent.click(screen.getByRole('button', { name: 'quieter' }));
    expect(text('sound')).toBe('on');
    expect(text('volume')).toBe(String(DEFAULT_VOLUME));
    expect(readSetting('sound')).toBe('off');
    expect(readSetting('volume')).toBe('10');
  });
});
