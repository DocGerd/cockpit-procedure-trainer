// @vitest-environment jsdom
import { FakeAudioContext } from '@cpt/panel-kit';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import type { Language } from '../i18n';
import { readSetting, writeSetting } from '../storage';
import { AudioProvider, SoundControl } from './index';

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderControl(language: Language = 'en', extra?: ReactNode) {
  return render(
    <LanguageProvider initial={language}>
      <AudioProvider>
        <SoundControl />
        {extra}
      </AudioProvider>
    </LanguageProvider>,
  );
}

const opener = (name: string) => screen.getByRole('button', { name });

describe('SoundControl', () => {
  it('opens a popover and closes it on an outside click', async () => {
    renderControl(
      'en',
      <button type="button" data-testid="outside">
        outside
      </button>,
    );
    expect(screen.queryByRole('switch')).toBeNull();
    expect(opener('Sound').getAttribute('aria-haspopup')).toBe('dialog');
    await userEvent.click(opener('Sound'));
    expect(screen.getByRole('switch')).toBeTruthy();
    expect(opener('Sound').getAttribute('aria-expanded')).toBe('true');

    fireEvent.pointerDown(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(opener('Sound').getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when the button is pressed again', async () => {
    renderControl();
    await userEvent.click(opener('Sound'));
    await userEvent.click(opener('Sound'));
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('keeps aria-checked and the stored setting in step with the switch', async () => {
    renderControl();
    await userEvent.click(opener('Sound'));
    const toggle = screen.getByRole('switch', { name: 'Sound on' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(toggle);
    expect(screen.getByRole('switch', { name: 'Sound off' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(readSetting('sound')).toBe('off');
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(readSetting('sound')).toBe('on');
  });

  it('disables the slider while sound is off and stores the volume it sets', async () => {
    renderControl();
    await userEvent.click(opener('Sound'));
    const slider = screen.getByRole('slider', { name: 'Volume' });
    expect((slider as HTMLInputElement).disabled).toBe(false);
    expect(['min', 'max', 'step'].map((attribute) => slider.getAttribute(attribute))).toEqual([
      '0',
      '100',
      '1',
    ]);
    fireEvent.change(slider, { target: { value: '30' } });
    expect(readSetting('volume')).toBe('30');
    expect((slider as HTMLInputElement).value).toBe('30');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(readSetting('volume')).toBe('0');

    await userEvent.click(screen.getByRole('switch'));
    expect((slider as HTMLInputElement).disabled).toBe(true);
  });

  it('starts the audio context in the click that turns sound on, and sets its gain', async () => {
    const contexts: FakeAudioContext[] = [];
    vi.stubGlobal('AudioContext', function FakeBrowserContext() {
      const context = new FakeAudioContext();
      contexts.push(context);
      return context.asAudioContext();
    });
    writeSetting('sound', 'off');
    renderControl();
    await userEvent.click(opener('Sound'));
    expect(contexts).toHaveLength(0);

    await userEvent.click(screen.getByRole('switch'));
    expect(contexts).toHaveLength(1);
    const masterGain = () => contexts[0]?.nodesOf('gain')[0]?.gain.value;
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });
    expect(masterGain()).toBeCloseTo(0.3 ** 2);
    await userEvent.click(screen.getByRole('switch'));
    expect(masterGain()).toBe(0);
  });

  it('starts with the stored setting', async () => {
    writeSetting('sound', 'off');
    writeSetting('volume', '70');
    renderControl();
    await userEvent.click(opener('Sound'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('70');
    expect(slider.disabled).toBe(true);
  });

  it('shows the speaker icon for the state', async () => {
    const { container } = renderControl();
    expect(container.querySelector('[data-icon="on"]')).not.toBeNull();
    await userEvent.click(opener('Sound'));
    await userEvent.click(screen.getByRole('switch'));
    expect(container.querySelector('[data-icon="off"]')).not.toBeNull();
  });

  it('speaks German', async () => {
    renderControl('de');
    expect(opener('Ton').getAttribute('title')).toBe('Ton');
    await userEvent.click(opener('Ton'));
    expect(screen.getByRole('dialog', { name: 'Ton' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Ton an' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Lautstärke' })).toBeTruthy();
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch', { name: 'Ton aus' })).toBeTruthy();
  });
});
