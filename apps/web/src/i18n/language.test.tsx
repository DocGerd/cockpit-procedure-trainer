// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shell } from '../shell/Shell';
import { messages as shellMessages } from '../shell/messages';
import { ThemeProvider } from '../theme';
import { TrainerProvider } from '../trainer';
import { testAircraft } from '../trainer/test-aircraft';
import { defineMessages } from './define-messages';
import { LanguageProvider, LanguageSwitch, useLanguage, useLocalize, useMessages } from './index';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

const [first] = testAircraft;
if (!first) throw new Error('test aircraft missing');

const sample = defineMessages({ en: { hello: 'Hello' }, de: { hello: 'Hallo' } });

function Probe() {
  const { language } = useLanguage();
  const text = useMessages(sample);
  const localize = useLocalize();
  return (
    <p>
      {language}|{text.hello}|{localize(first.name)}
    </p>
  );
}

function renderApp() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <TrainerProvider>
          <Shell />
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

const switchGroup = () => screen.getByRole('group', { name: /^(Language|Sprache)$/ });
const choose = (name: string) =>
  userEvent.click(within(switchGroup()).getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.lang = '';
});

describe('default language', () => {
  it.each([
    ['de', 'de'],
    ['de-AT', 'de'],
    ['en-GB', 'en'],
    ['fr-FR', 'en'],
  ])('follows navigator.language %s', (navigatorLanguage, expected) => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(navigatorLanguage);
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText(new RegExp(`^${expected}\\|`))).toBeTruthy();
  });

  it('prefers a stored choice over the navigator language', () => {
    localStorage.setItem('cpt.language', 'en');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText(/^en\|/)).toBeTruthy();
  });

  it('ignores a stored value that is not a language', () => {
    localStorage.setItem('cpt.language', 'klingon');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText(/^en\|/)).toBeTruthy();
  });

  it('falls back to the navigator language when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
    renderApp();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      shellMessages.de.pickerTitle,
    );
    return choose('English').then(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        shellMessages.en.pickerTitle,
      );
    });
  });
});

describe('hooks', () => {
  it('useMessages and useLocalize follow the language', async () => {
    render(
      <LanguageProvider>
        <Probe />
        <LanguageSwitch />
      </LanguageProvider>,
    );
    expect(screen.getByText(`en|Hello|${first.name.en}`)).toBeTruthy();
    await choose('Deutsch');
    expect(screen.getByText(`de|Hallo|${first.name.de}`)).toBeTruthy();
  });

  it('throws without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('LanguageProvider');
  });
});

describe('language switch', () => {
  it('changes a shell string and an aircraft name in one render', async () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      shellMessages.en.pickerTitle,
    );
    expect(screen.getByText(first.name.en)).toBeTruthy();

    await choose('Deutsch');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      shellMessages.de.pickerTitle,
    );
    expect(screen.getByText(first.name.de)).toBeTruthy();
    expect(screen.queryByText(first.name.en)).toBeNull();
    expect(document.documentElement.lang).toBe('de');
  });

  it('marks the active language', async () => {
    renderApp();
    const pressed = (name: string) =>
      within(switchGroup()).getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed('English')).toBe('true');
    expect(pressed('Deutsch')).toBe('false');
    await choose('Deutsch');
    expect(pressed('English')).toBe('false');
    expect(pressed('Deutsch')).toBe('true');
  });

  it('translates the trainer header and the procedure titles', async () => {
    renderApp();
    await choose('Deutsch');
    const procedure = Object.values(first.procedures)[0];
    if (!procedure) throw new Error('test aircraft has no procedure');
    expect(screen.getByText(procedure.title.de)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: shellMessages.de.startProcedure }));
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText(first.name.de)).toBeTruthy();
    expect(within(banner).getByText(procedure.title.de)).toBeTruthy();
  });

  it('remembers the choice across a remount', async () => {
    const view = renderApp();
    await choose('Deutsch');
    view.unmount();
    renderApp();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      shellMessages.de.pickerTitle,
    );
    expect(localStorage.getItem('cpt.language')).toBe('de');
  });
});
