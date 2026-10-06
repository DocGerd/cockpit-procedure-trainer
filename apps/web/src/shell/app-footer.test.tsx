// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import { AppFooter } from './AppFooter';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const renderFooter = () =>
  render(
    <LanguageProvider>
      <AppFooter />
    </LanguageProvider>,
  );

describe('AppFooter', () => {
  it('shows the build copyright and the released version in production', () => {
    vi.stubEnv('VITE_APP_RELEASE', '0.7.0');
    vi.stubEnv('VITE_COPYRIGHT', '© 2026 Patrick Kuhn');
    vi.stubEnv('VITE_BUILD_SHA', 'abcdef0123456');
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('© 2026 Patrick Kuhn');
    expect(footer.textContent).toContain('Version v0.7.0');
    expect(footer.textContent).not.toContain('abcdef0');
  });

  it('adds the short commit on UAT', () => {
    vi.stubEnv('VITE_APP_RELEASE', '0.7.0');
    vi.stubEnv('VITE_DEPLOY_ENV', 'uat');
    vi.stubEnv('VITE_BUILD_SHA', 'abcdef0123456');
    renderFooter();
    expect(screen.getByRole('contentinfo').textContent).toContain('Version v0.7.0 · abcdef0');
  });
});
