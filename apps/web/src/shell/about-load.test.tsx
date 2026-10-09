// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component } from 'react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import { AppFooter } from './AppFooter';

const chunk = vi.hoisted(() => ({ fails: true }));

vi.mock('./About', async (importOriginal) => {
  if (chunk.fails) throw new Error('chunk fetch failed');
  return importOriginal();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

class Outer extends Component<{ children: ReactNode; onCatch(): void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onCatch();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

it('keeps a failed About load from the outer boundary and retries it on the next tap', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const outerCaught = vi.fn();
  render(
    <Outer onCatch={outerCaught}>
      <LanguageProvider>
        <AppFooter />
      </LanguageProvider>
    </Outer>,
  );
  const version = within(screen.getByRole('contentinfo')).getByRole('button');

  await userEvent.click(version);
  await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(outerCaught).not.toHaveBeenCalled();
  expect(screen.getByRole('contentinfo')).toBe(version.closest('footer'));

  chunk.fails = false;
  await userEvent.click(version);
  expect(
    await screen.findByRole('dialog', { name: 'About Procedure Trainer' }, { timeout: 5000 }),
  ).toBeTruthy();
  expect(outerCaught).not.toHaveBeenCalled();
});
