// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '../i18n';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerLayout } from '../shell/TrainerLayout';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./test-aircraft')).fixture],
}));

let trainer: Trainer;
let setLanguage: (language: 'de' | 'en') => void;
function Probe() {
  trainer = useTrainer();
  setLanguage = useLanguage().setLanguage;
  return null;
}

function renderLayout(language: 'de' | 'en' = 'en') {
  return renderWithLanguage(
    <ThemeProvider>
      <TrainerProvider>
        <Probe />
        <TrainerLayout />
      </TrainerProvider>
    </ThemeProvider>,
    { language },
  );
}

function start(id: string, mode: Mode = 'guided') {
  act(() => {
    trainer.setMode(mode);
    trainer.startProcedure(id);
  });
}

const operate = (id: string, position: string) =>
  act(() => {
    trainer.session.set(id, position);
  });

const announcer = () => document.querySelector<HTMLElement>('.checklist-announcer');
const currentItem = () => document.querySelector<HTMLElement>('[aria-current="step"]');

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('innerWidth', 1400);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('checklist focus', () => {
  it('starts a procedure with focus on its current item', () => {
    renderLayout();
    start('flow');
    expect(document.activeElement).toBe(currentItem());
    expect(currentItem()?.textContent).toContain('Master on');
  });

  it('moves focus to the next check-off button after Check off', async () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    operate('pump', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }));
  });

  it('moves focus to the current item when it has no button', async () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(document.activeElement).toBe(currentItem());
    expect(currentItem()?.textContent).toContain('Pump on');
  });

  it('leaves focus that is still on the page where it is', () => {
    renderLayout();
    start('flow');
    const restart = screen.getByRole('button', { name: 'Restart' });
    act(() => restart.focus());
    operate('master', 'on');
    expect(document.activeElement).toBe(restart);
  });

  it('never drops focus to the page body through a whole procedure', async () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(document.activeElement).not.toBe(document.body);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(document.activeElement).not.toBe(document.body);
    operate('pump', 'on');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Flow complete' }));
  });
});

describe('checklist announcements', () => {
  it('is a polite live region outside the pane', () => {
    renderLayout();
    start('flow');
    const region = announcer();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('role')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Checklist' }).contains(region)).toBe(false);
  });

  it('says nothing on start and announces each advance with its number', async () => {
    renderLayout();
    start('flow');
    expect(announcer()?.textContent).toBe('');
    operate('master', 'on');
    expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(announcer()?.textContent).toBe('Item 3 of 4: Walk-around done');
  });

  it('announces the completion', async () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    operate('pump', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(announcer()?.textContent).toBe('Procedure complete: Flow');
  });

  it('announces no deviation in Practice, only the advance', () => {
    renderLayout();
    start('flow', 'practice');
    operate('avionics', 'on');
    expect(announcer()?.textContent).toBe('');
    operate('master', 'on');
    expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
  });

  describe('on a tablet with the checklist closed', () => {
    beforeEach(() => {
      vi.stubGlobal('innerWidth', 1000);
    });

    it('announces a Guided deviation, and says nothing more when the item advances', () => {
      renderLayout();
      start('flow');
      operate('pump', 'on');
      expect(announcer()?.textContent).toBe('Deviation: Pump operated. Not part of item 1.');
      operate('master', 'on');
      expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
    });

    it('counts deviations on the toggle, in either language', () => {
      renderLayout();
      start('flow');
      operate('pump', 'on');
      operate('avionics', 'on');
      const toggle = screen.getByRole('button', { name: /^Checklist/ });
      expect(toggle.getAttribute('aria-label')).toBe('Checklist 0 / 4, 2 deviations');
      expect(toggle.querySelector('.shell-deviation-badge')?.textContent).toBe('2');
      act(() => setLanguage('de'));
      expect(screen.getByRole('button', { name: /^Checkliste/ }).getAttribute('aria-label')).toBe(
        'Checkliste 0 / 4, 2 Abweichungen',
      );
    });

    it('announces a deviation together with the advance it came with', () => {
      renderLayout();
      start('flow');
      operate('master', 'on');
      act(() => trainer.session.checkOff());
      expect(announcer()?.textContent).toBe(
        'Item 3 of 4: Walk-around done. Deviation: Item 2 was checked off, but its condition was not met.',
      );
    });

    it('announces no deviation in Practice', () => {
      renderLayout();
      start('flow', 'practice');
      operate('pump', 'on');
      expect(announcer()?.textContent).toBe('');
    });

    it('leaves the deviation to the banner while the drawer is open', async () => {
      renderLayout();
      start('flow');
      await userEvent.click(screen.getByRole('button', { name: /^Checklist/ }));
      operate('pump', 'on');
      expect(announcer()?.textContent).toBe('');
    });

    it('does not announce a deviation that was recorded while the drawer was open', async () => {
      renderLayout();
      start('flow');
      await userEvent.click(screen.getByRole('button', { name: /^Checklist/ }));
      operate('pump', 'on');
      await userEvent.click(screen.getByRole('button', { name: /^Checklist/ }));
      expect(announcer()?.textContent).toBe('');
    });

    it('speaks German', () => {
      renderLayout('de');
      start('flow');
      operate('pump', 'on');
      expect(announcer()?.textContent).toBe(
        'Abweichung: Pump (de) bedient. Nicht Teil von Punkt 1.',
      );
    });
  });

  it('leaves the deviation to the banner on desktop', () => {
    renderLayout();
    start('flow');
    operate('pump', 'on');
    expect(announcer()?.textContent).toBe('');
  });

  it('speaks German', () => {
    renderLayout('de');
    start('flow');
    operate('master', 'on');
    expect(announcer()?.textContent).toBe('Punkt 2 von 4: Fuel flowing (de)');
  });

  it('starts the next procedure silent', async () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    operate('pump', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next: Follow-up' }));
    expect(announcer()?.textContent).toBe('');
  });

  it('announces a step only when it changes, not again on a language switch', () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
    act(() => setLanguage('de'));
    expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
    operate('avionics', 'on');
    expect(announcer()?.textContent).toBe('Item 2 of 4: Fuel flowing');
  });

  it('falls silent in Free explore', () => {
    renderLayout();
    start('flow');
    operate('master', 'on');
    act(() => trainer.setMode('explore'));
    expect(announcer()?.textContent).toBe('');
  });
});

describe('summary heading focus ring', () => {
  it('keeps room around the heading when it is scrolled into view', () => {
    const css = readFileSync(
      fileURLToPath(import.meta.url).replace(/a11y\.test\.tsx$/, 'checklist.css'),
      'utf8',
    );
    expect(css).toMatch(/\.checklist-title\s*\{[^}]*scroll-margin:\s*var\(--space-/);
  });

  it('is the heading that takes focus', () => {
    renderLayout();
    start('followUp');
    operate('avionics', 'on');
    const heading = within(screen.getByRole('complementary', { name: 'Checklist' })).getByRole(
      'heading',
      { level: 1 },
    );
    expect(heading.classList.contains('checklist-title')).toBe(true);
    expect(document.activeElement).toBe(heading);
  });
});
