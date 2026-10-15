// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../i18n';
import type { Language } from '../i18n';
import { readSetting, writeSetting } from '../storage';
import { AudioProvider, SoundControl } from './index';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

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
    expect(opener('Sound')).toHaveProperty('ariaHasPopup', 'dialog');
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
    fireEvent.change(slider, { target: { value: '30' } });
    expect(readSetting('volume')).toBe('30');
    expect((slider as HTMLInputElement).value).toBe('30');

    await userEvent.click(screen.getByRole('switch'));
    expect((slider as HTMLInputElement).disabled).toBe(true);
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
    await userEvent.click(opener('Ton'));
    expect(screen.getByRole('switch', { name: 'Ton an' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Lautstärke' })).toBeTruthy();
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch', { name: 'Ton aus' })).toBeTruthy();
  });
});
