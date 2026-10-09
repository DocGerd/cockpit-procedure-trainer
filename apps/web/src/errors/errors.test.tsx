// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { testAircraft } from '../trainer/test-aircraft';
import { ImageWithFallback } from './ImageWithFallback';
import { StartupNotice } from './StartupNotice';
import { TrainerErrorBoundary } from './TrainerErrorBoundary';

const [first, second] = testAircraft;

const throwingStep = (message: string): Aircraft => ({
  ...first,
  systems: {
    initial: {},
    step() {
      throw new Error(message);
    },
  },
});

const registry = vi.hoisted(() => ({ list: [] as Aircraft[] }));

vi.mock('../aircraft-registry', () => ({
  get aircraftRegistry() {
    return registry.list;
  },
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

let broken = false;
function Child() {
  useTrainer();
  const [clicks, setClicks] = useState(0);
  if (broken) throw new Error('child exploded');
  return (
    <button type="button" onClick={() => setClicks(clicks + 1)}>
      clicks {clicks}
    </button>
  );
}

function renderBoundary(language?: 'de' | 'en') {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <TrainerErrorBoundary>
        <Child />
      </TrainerErrorBoundary>
    </TrainerProvider>,
    language === undefined ? {} : { language },
  );
}

// The trainer screen is a lazy chunk: transform it once so Start does not wait on it.
beforeAll(async () => {
  await import('../shell/TrainerLayout');
});

beforeEach(() => {
  localStorage.clear();
  registry.list = [...testAircraft];
  broken = false;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('error boundary', () => {
  it('renders its children while nothing throws', () => {
    renderBoundary();
    expect(screen.getByRole('button', { name: /^clicks/ })).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('shows a readable message and a reset, without a stack trace', () => {
    broken = true;
    renderBoundary();
    const dialog = screen.getByRole('alertdialog', { name: 'Something went wrong' });
    expect(within(dialog).getByText(/unexpected error/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeTruthy();
    expect(dialog.textContent).not.toContain('child exploded');
    expect(screen.queryByRole('button', { name: /^clicks/ })).toBeNull();
  });

  it('shows the version footer on the error screen', () => {
    broken = true;
    renderBoundary();
    expect(screen.getByRole('contentinfo').textContent).toContain('Version');
    expect(screen.getByRole('alertdialog').getAttribute('aria-modal')).toBeNull();
  });

  it('names the exact build in the error dialog', () => {
    vi.stubEnv('VITE_APP_RELEASE', '0.7.0');
    vi.stubEnv('VITE_BUILD_SHA', 'abcdef0123456');
    broken = true;
    renderBoundary();
    expect(screen.getByRole('alertdialog').textContent).toContain('Version v0.7.0 · abcdef0');
  });

  it('puts keyboard focus on the reset button', () => {
    broken = true;
    renderBoundary();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset' }));
  });

  it('resets the session and renders the trainer again', async () => {
    renderBoundary();
    const before = trainer.session;
    broken = true;
    act(() => trainer.selectAircraft(second.id));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    const afterError = trainer.session;
    broken = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^clicks/ })).toBeTruthy();
    expect(trainer.session).not.toBe(afterError);
    expect(trainer.session).not.toBe(before);
  });

  it('shows the dialog again when the error persists after a reset', async () => {
    broken = true;
    renderBoundary();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('speaks German when the language is German', () => {
    broken = true;
    renderBoundary('de');
    expect(screen.getByRole('alertdialog', { name: 'Etwas ist schiefgelaufen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeTruthy();
  });
});

describe('a failed session', () => {
  const fail = () => act(() => trainer.session.advance(100));

  it('shows a readable message with the reason and a reset', () => {
    registry.list = [throwingStep('pump seized')];
    renderBoundary();
    expect(screen.queryByRole('alert')).toBeNull();
    fail();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('The simulation stopped')).toBeTruthy();
    expect(within(alert).getByText('pump seized')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^clicks/ })).toBeTruthy();
  });

  it('is cleared by the reset, which starts a fresh session', async () => {
    registry.list = [throwingStep('pump seized')];
    renderBoundary();
    fail();
    const failed = trainer.session;
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(trainer.session).not.toBe(failed);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('speaks German when the language is German', () => {
    registry.list = [throwingStep('pump seized')];
    renderBoundary('de');
    fail();
    expect(
      within(screen.getByRole('alert')).getByText('Die Simulation wurde angehalten'),
    ).toBeTruthy();
  });

  it('remounts the children on reset so local state does not survive', async () => {
    registry.list = [throwingStep('pump seized')];
    renderBoundary();
    await userEvent.click(screen.getByRole('button', { name: 'clicks 0' }));
    expect(screen.getByRole('button', { name: 'clicks 1' })).toBeTruthy();
    fail();
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: 'clicks 0' })).toBeTruthy();
  });

  it('does not show the message for a running session', () => {
    renderBoundary();
    act(() => trainer.session.advance(100));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('image with fallback', () => {
  it('renders the image while it loads', () => {
    render(<ImageWithFallback src="views/main.svg" label="Main view" className="backdrop" />);
    const image = screen.getByRole('img', { name: 'Main view' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe('views/main.svg');
    expect(image.className).toBe('backdrop');
  });

  it('shows a labelled placeholder when the image fails to load', () => {
    const onError = vi.fn();
    render(
      <ImageWithFallback
        src="views/missing.svg"
        label="Main view"
        className="backdrop"
        style={{ width: 'var(--space-12)' }}
        onError={onError}
      />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Main view' }));
    const placeholder = screen.getByRole('img', { name: 'Main view' });
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder.textContent).toBe('Main view');
    expect(placeholder.className).toContain('backdrop');
    expect(placeholder.style.width).toBe('var(--space-12)');
    expect(document.querySelector('img')).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('tries again when the source changes', () => {
    const { rerender } = render(<ImageWithFallback src="a.svg" label="View" />);
    fireEvent.error(screen.getByRole('img', { name: 'View' }));
    expect(document.querySelector('img')).toBeNull();
    rerender(<ImageWithFallback src="b.svg" label="View" />);
    expect(document.querySelector('img')?.getAttribute('src')).toBe('b.svg');
  });
});

describe('start-up notice', () => {
  it('says what the app is and is not, in English', () => {
    renderWithLanguage(<StartupNotice />);
    const note = screen.getByRole('note', { name: 'Training aid only' });
    expect(note.textContent).toContain("The aircraft's handbook is authoritative");
    expect(note.textContent).toContain('Do not use this app in flight');
  });

  it('says it in German', () => {
    renderWithLanguage(<StartupNotice />, { language: 'de' });
    const note = screen.getByRole('note', { name: 'Nur zur Ausbildung' });
    expect(note.textContent).toContain('Maßgeblich ist das Handbuch');
    expect(note.textContent).toContain('nicht im Flug');
  });

  it('is part of the picker', () => {
    render(<App />);
    const picker = screen.getByRole('main');
    expect(within(picker).getByRole('note', { name: 'Training aid only' })).toBeTruthy();
  });
});

describe('without localStorage', () => {
  const blocked = () => {
    throw new Error('storage blocked');
  };

  it('picks an aircraft and switches language and theme when every storage method throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'key').mockImplementation(blocked);
    render(<App />);
    await exercise();
  });

  it('works when reaching localStorage itself throws', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    render(<App />);
    await exercise();
  });

  async function exercise() {
    expect(screen.getByRole('heading', { name: /Choose aircraft/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
    expect(screen.getByRole('heading', { name: /Flugzeug und Verfahren/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    await userEvent.click(screen.getByRole('button', { name: /dark theme/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    const choice = () =>
      within(screen.getByRole('region', { name: 'Aircraft' })).getByRole('button', {
        name: new RegExp(second.name.en),
      });
    await userEvent.click(choice());
    expect(choice().getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Start procedure' }));
    expect(await screen.findByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
  }
});
