// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { UpdatePrompt } from './UpdatePrompt';

type Options = { onRegisteredSW?: (url: string, registration?: { waiting: unknown }) => void };

const register = vi.hoisted(() => ({
  waiting: false,
  update: vi.fn(),
  options: {} as Options,
}));

vi.mock('./register', async () => {
  const { useState } = await import('react');
  return {
    useRegisterSW: (options: Options) => {
      register.options = options;
      const [needRefresh, setNeedRefresh] = useState(register.waiting);
      return {
        needRefresh: [needRefresh, setNeedRefresh],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: register.update,
      };
    },
  };
});

beforeEach(() => {
  register.waiting = false;
  register.update.mockReset();
  register.update.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('UpdatePrompt', () => {
  it('shows nothing while no new version is waiting', () => {
    renderWithLanguage(<UpdatePrompt />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(register.update).not.toHaveBeenCalled();
  });

  it('offers the new version without activating it', () => {
    register.waiting = true;
    renderWithLanguage(<UpdatePrompt />);
    expect(screen.getByRole('status').textContent).toContain('A new version is ready');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Later' })).toBeTruthy();
    expect(register.update).not.toHaveBeenCalled();
  });

  it('activates the new version and reloads only on Reload', async () => {
    register.waiting = true;
    renderWithLanguage(<UpdatePrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(register.update).toHaveBeenCalledTimes(1);
    expect(register.update).toHaveBeenCalledWith(true);
  });

  it('hides on Later without activating anything', async () => {
    register.waiting = true;
    renderWithLanguage(<UpdatePrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(register.update).not.toHaveBeenCalled();
  });

  it('is shown again after the next start', async () => {
    register.waiting = true;
    const first = renderWithLanguage(<UpdatePrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    first.unmount();
    renderWithLanguage(<UpdatePrompt />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows the prompt when registration finds a worker already waiting', () => {
    renderWithLanguage(<UpdatePrompt />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => register.options.onRegisteredSW?.('sw.js', { waiting: {} }));
    expect(screen.getByRole('status')).toBeTruthy();
    expect(register.update).not.toHaveBeenCalled();
  });

  it('stays hidden when registration finds nothing waiting', () => {
    renderWithLanguage(<UpdatePrompt />);
    act(() => register.options.onRegisteredSW?.('sw.js', { waiting: null }));
    act(() => register.options.onRegisteredSW?.('sw.js', undefined));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides a prompt raised by a waiting worker on Later, and raises it again on the next load', async () => {
    const first = renderWithLanguage(<UpdatePrompt />);
    act(() => register.options.onRegisteredSW?.('sw.js', { waiting: {} }));
    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('status')).toBeNull();
    first.unmount();
    renderWithLanguage(<UpdatePrompt />);
    act(() => register.options.onRegisteredSW?.('sw.js', { waiting: {} }));
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('speaks German', () => {
    register.waiting = true;
    renderWithLanguage(<UpdatePrompt />, { language: 'de' });
    expect(screen.getByRole('button', { name: 'Neu laden' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Später' })).toBeTruthy();
  });
});
