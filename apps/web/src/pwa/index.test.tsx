// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PwaUpdatePrompt } from '.';

vi.mock('./register', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const withServiceWorker = () =>
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

const settled = () => act(() => vi.dynamicImportSettled());

describe('PwaUpdatePrompt', () => {
  it('stays out of the way in development', async () => {
    vi.stubEnv('PROD', false);
    withServiceWorker();
    renderWithLanguage(<PwaUpdatePrompt />);
    await settled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays out of the way where service workers do not exist', async () => {
    vi.stubEnv('PROD', true);
    renderWithLanguage(<PwaUpdatePrompt />);
    await settled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the prompt in a built app that can register a worker', async () => {
    vi.stubEnv('PROD', true);
    withServiceWorker();
    renderWithLanguage(<PwaUpdatePrompt />);
    expect(await screen.findByRole('status')).toBeTruthy();
  });
});
