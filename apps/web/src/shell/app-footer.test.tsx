// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LanguageProvider, LanguageSwitch } from '../i18n';
import { RELEASES_URL, REPOSITORY_URL } from './About';
import { AppFooter } from './AppFooter';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const renderFooter = () =>
  render(
    <LanguageProvider>
      <LanguageSwitch />
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

const changelog = readFileSync(resolve(import.meta.dirname, '../../../../CHANGELOG.md'), 'utf8');
const releaseHeadings = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map(
  (match) => match[1],
);

async function openAbout() {
  await userEvent.click(within(screen.getByRole('contentinfo')).getByRole('button'));
  return screen.findByRole('dialog');
}

describe('About', () => {
  it('opens from the version in the footer with focus on Close', async () => {
    vi.stubEnv('VITE_APP_RELEASE', '0.7.0');
    renderFooter();
    const version = within(screen.getByRole('contentinfo')).getByRole('button', {
      name: 'Version v0.7.0',
    });
    expect(version.getAttribute('aria-haspopup')).toBe('dialog');
    const about = await openAbout();
    expect(about).toBe(screen.getByRole('dialog', { name: 'About Procedure Trainer' }));
    expect(document.activeElement).toBe(within(about).getByRole('button', { name: 'Close' }));
  });

  it('names each aircraft with its handbook revision', async () => {
    renderFooter();
    const about = await openAbout();
    expect(about.textContent).toContain('CT Supralight (representative panel)');
    expect(about.textContent).toContain('revision 01 (14 Jan 2010)');
    expect(about.textContent).toContain('fictional aircraft; no handbook');
  });

  it('shows the newest three releases from the changelog and links the rest', async () => {
    renderFooter();
    const about = await openAbout();
    const shown = within(about)
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    expect(shown).toHaveLength(3);
    releaseHeadings.slice(0, 3).forEach((version, index) => {
      expect(shown[index]).toContain(`v${version}`);
    });
    expect(
      within(about).getByRole('link', { name: 'All release notes' }).getAttribute('href'),
    ).toBe(RELEASES_URL);
    expect(within(about).getByRole('link', { name: 'Source code' }).getAttribute('href')).toBe(
      REPOSITORY_URL,
    );
  });

  it('shows the licence, copyright, release and commit', async () => {
    vi.stubEnv('VITE_APP_RELEASE', '0.7.0');
    vi.stubEnv('VITE_COPYRIGHT', '© 2026 Patrick Kuhn');
    vi.stubEnv('VITE_BUILD_SHA', 'abcdef0123456');
    renderFooter();
    const about = await openAbout();
    expect(about.textContent).toContain('MIT License · © 2026 Patrick Kuhn');
    expect(about.textContent).toContain('v0.7.0 · abcdef0');
  });

  it('closes with Close or Escape and returns focus to the version', async () => {
    renderFooter();
    const version = within(screen.getByRole('contentinfo')).getByRole('button');
    await userEvent.click(within(await openAbout()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(version);
    await openAbout();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the release notes in English inside German frame text', async () => {
    renderFooter();
    await userEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
    const about = await openAbout();
    expect(about).toBe(screen.getByRole('dialog', { name: 'Über Procedure Trainer' }));
    expect(within(about).getByRole('link', { name: 'Alle Versionshinweise' })).toBeTruthy();
    for (const release of about.querySelectorAll('article')) {
      expect(release.getAttribute('lang')).toBe('en');
    }
  });
});
