// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import { ThemeProvider } from '../theme';
import { TrainerProvider } from '../trainer';
import { Shell } from './Shell';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

// The trainer screen is a lazy chunk: transform it once so Start does not wait on it.
beforeAll(async () => {
  await import('./TrainerLayout');
});

afterEach(cleanup);

function renderShell() {
  render(
    <LanguageProvider>
      <ThemeProvider>
        <TrainerProvider>
          <Shell />
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
  const actions = document.querySelector<HTMLElement>('.picker-actions');
  if (!actions) throw new Error('The picker has no actions');
  return { actions, start: within(actions).getByRole('button', { name: 'Start procedure' }) };
}

it('keeps the trainer header and footer in place while the trainer screen loads', async () => {
  const { start } = renderShell();
  await userEvent.click(start);
  expect(document.querySelector('.shell')?.getAttribute('data-screen')).toBe('trainer');
  expect(screen.getByRole('banner').dataset.variant).toBe('trainer');
  expect(screen.getByRole('contentinfo')).toBeTruthy();
  expect(await screen.findByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
});

it('opens a loaded trainer at once, without a loading frame', async () => {
  const { actions, start } = renderShell();
  fireEvent.pointerOver(actions);
  fireEvent.focusIn(actions);
  await import('./TrainerLayout');
  await Promise.resolve();
  fireEvent.click(start);
  expect(screen.getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
});
