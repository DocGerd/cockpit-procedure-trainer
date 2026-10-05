// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, ThemeSwitch } from './index';

const labels = {
  light: 'Light',
  dark: 'Dark',
  switchToLight: 'Switch to light theme',
  switchToDark: 'Switch to dark theme',
};

type Listener = (event: { matches: boolean }) => void;

function mockSystemTheme(initial: 'light' | 'dark') {
  let dark = initial === 'dark';
  const listeners = new Set<Listener>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return query === '(prefers-color-scheme: dark)' && dark;
      },
      media: query,
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    })),
  );
  return {
    change(next: 'light' | 'dark') {
      dark = next === 'dark';
      act(() => {
        for (const listener of listeners) listener({ matches: dark });
      });
    },
  };
}

const theme = () => document.documentElement.dataset.theme;

function renderSwitch() {
  return render(
    <ThemeProvider>
      <ThemeSwitch labels={labels} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('theme', () => {
  it('follows a dark system setting', () => {
    mockSystemTheme('dark');
    renderSwitch();
    expect(theme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' }).textContent).toBe('Light');
  });

  it('follows a light system setting', () => {
    mockSystemTheme('light');
    renderSwitch();
    expect(theme()).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' }).textContent).toBe('Dark');
  });

  it('follows the system setting when it changes', () => {
    const system = mockSystemTheme('light');
    renderSwitch();
    system.change('dark');
    expect(theme()).toBe('dark');
  });

  it('is light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderSwitch();
    expect(theme()).toBe('light');
  });

  it('lets the switch override the system setting', async () => {
    const system = mockSystemTheme('light');
    renderSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(theme()).toBe('dark');
    system.change('light');
    expect(theme()).toBe('dark');
  });

  it('keeps the chosen theme across a remount', async () => {
    mockSystemTheme('light');
    const first = renderSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    first.unmount();
    delete document.documentElement.dataset.theme;
    renderSwitch();
    expect(theme()).toBe('dark');
  });

  it('still switches when localStorage throws', async () => {
    mockSystemTheme('light');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(theme()).toBe('dark');
  });
});
