// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import type { Language } from '../i18n';
import { LanguageProvider } from '../i18n';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { testAircraft } from '../trainer/test-aircraft';
import { Shell } from './Shell';

const real = vi.hoisted(() => ({ use: false }));

vi.mock('../aircraft-registry', async () => {
  const actual =
    await vi.importActual<typeof import('../aircraft-registry')>('../aircraft-registry');
  const { testAircraft: fixtures } = await import('../trainer/test-aircraft');
  return {
    get aircraftRegistry() {
      return real.use ? actual.aircraftRegistry : fixtures;
    },
  };
});

const [first, second] = testAircraft;

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderPicker(language?: Language) {
  return render(
    <LanguageProvider initial={language}>
      <ThemeProvider>
        <TrainerProvider>
          <Probe />
          <Shell />
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

const aircraftSection = () => screen.getByRole('region', { name: 'Aircraft' });
const procedureSection = () => screen.getByRole('region', { name: 'Procedure' });
const procedureButtons = () =>
  within(procedureSection())
    .getAllByRole('button')
    .filter((button) => button.hasAttribute('aria-pressed'));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  real.use = false;
});

describe('aircraft and procedure picker', () => {
  it('lists exactly the registry aircraft', () => {
    renderPicker();
    const buttons = within(aircraftSection()).getAllByRole('button');
    expect(buttons).toHaveLength(aircraftRegistry.length);
    aircraftRegistry.forEach((aircraft, index) => {
      expect(buttons[index]?.textContent).toContain(aircraft.name.en);
    });
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('lists the chosen aircraft procedures, grouped by type', async () => {
    renderPicker();
    expect(procedureButtons().map((button) => button.textContent)).toEqual(
      Object.values(first.procedures).map((procedure) =>
        expect.stringContaining(procedure.title.en),
      ),
    );
    await userEvent.click(
      within(aircraftSection()).getByRole('button', { name: new RegExp(second.name.en) }),
    );
    expect(trainer.aircraft).toBe(second);
    const titles = procedureButtons().map((button) => button.textContent);
    expect(titles).toEqual([
      expect.stringContaining('Bravo power up'),
      expect.stringContaining('Bravo engine fire'),
    ]);
    const emergency = within(procedureSection()).getByRole('group', { name: 'Emergency' });
    expect(within(emergency).getByRole('button', { name: /Bravo engine fire/ })).toBeTruthy();
    const normal = within(procedureSection()).getByRole('group', { name: 'Normal' });
    expect(within(normal).queryByRole('button', { name: /Bravo engine fire/ })).toBeNull();
  });

  it('offers Guided and Practice as modes and Free explore as a separate button', () => {
    renderPicker();
    const modes = within(screen.getByRole('group', { name: 'Mode' })).getAllByRole('radio');
    expect(modes.map((radio) => radio.getAttribute('value'))).toEqual(['guided', 'practice']);
    expect(screen.getByRole('radio', { name: /Guided/ })).toHaveProperty('checked', true);
    expect(screen.queryByRole('radio', { name: /explore/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Explore the cockpit' })).toBeTruthy();
  });

  it('starts the chosen procedure in the chosen mode', async () => {
    renderPicker();
    await userEvent.click(
      within(aircraftSection()).getByRole('button', { name: new RegExp(second.name.en) }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Bravo engine fire/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Practice/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start procedure' }));
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBe('fire');
    expect(screen.getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
  });

  it('describes what Start and Explore do, each with a one-line helper', () => {
    renderPicker();
    const start = screen.getByRole('button', { name: 'Start procedure' });
    const explore = screen.getByRole('button', { name: 'Explore the cockpit' });
    expect(start.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(start.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Run the selected procedure in the chosen mode.',
    );
    expect(
      document.getElementById(explore.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Look around the panel and read what each control does. No procedure runs.');
  });

  it('describes Start and Explore in German', () => {
    renderPicker('de');
    const explore = screen.getByRole('button', { name: 'Cockpit erkunden' });
    expect(
      document.getElementById(explore.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe(
      'Die Tafel ansehen und nachlesen, was jedes Bedienelement tut. Es läuft kein Verfahren.',
    );
    const start = screen.getByRole('button', { name: 'Verfahren starten' });
    expect(document.getElementById(start.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Das gewählte Verfahren im gewählten Modus durchlaufen.',
    );
  });

  it('enters Free explore from its button', async () => {
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the cockpit' }));
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
  });
});

describe('run history in the picker', () => {
  const daysAgo = (days: number) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - days);
    return date.getTime();
  };
  const run = (deviations: number, at: number, mode = 'guided') => ({ mode, deviations, at });
  const seed = (history: unknown) => localStorage.setItem('cpt.history', JSON.stringify(history));
  const rowFor = (title: string) =>
    procedureButtons().find((button) => button.textContent?.includes(title));

  it('shows the last run beside a procedure that has one', () => {
    const last = run(2, daysAgo(3));
    seed({ [first.id]: { powerUp: { last, best: last } } });
    renderPicker();
    expect(rowFor(first.procedures['powerUp']?.title.en ?? '')?.textContent).toContain(
      'Last run: 2 deviations, 3 days ago',
    );
  });

  it('adds the best run only when it beats the last one', () => {
    localStorage.setItem('cpt.aircraft', second.id);
    seed({
      [second.id]: {
        powerUp: { last: run(1, daysAgo(1)), best: run(0, daysAgo(9)) },
        fire: { last: run(1, daysAgo(0)), best: run(1, daysAgo(0)) },
      },
    });
    renderPicker();
    const rows = procedureButtons().map((button) => button.textContent ?? '');
    expect(rows.find((text) => text.includes('power up'))).toContain(
      'Last run: 1 deviation, yesterday',
    );
    expect(rows.find((text) => text.includes('power up'))).toContain('Best: 0 deviations');
    expect(rows.join()).not.toContain('Best: 1');
  });

  it('shows nothing for a procedure without a run, or for another aircraft', () => {
    const last = run(1, daysAgo(2));
    seed({ [second.id]: { powerUp: { last, best: last } } });
    renderPicker();
    expect(screen.queryByText(/Last run/)).toBeNull();
  });

  it('follows the chosen aircraft', async () => {
    const last = run(4, daysAgo(2));
    seed({ [second.id]: { powerUp: { last, best: last } } });
    renderPicker();
    await userEvent.click(
      within(aircraftSection()).getByRole('button', { name: new RegExp(second.name.en) }),
    );
    expect(screen.getByText(/Last run: 4 deviations, 2 days ago/)).toBeTruthy();
  });

  it('reads the stored date in German', () => {
    const last = run(2, daysAgo(3));
    seed({ [first.id]: { powerUp: { last, best: last } } });
    renderPicker('de');
    expect(screen.getByText(/Letzter Durchlauf: 2 Abweichungen, vor 3 Tagen/)).toBeTruthy();
  });

  it('renders the list without history when the stored value is corrupt', () => {
    localStorage.setItem('cpt.history', '{nope');
    renderPicker();
    expect(procedureButtons()).toHaveLength(Object.keys(first.procedures).length);
    expect(screen.queryByText(/Last run/)).toBeNull();
  });

  it('renders the list without history when a stored date is out of range', () => {
    seed({ [first.id]: { powerUp: { last: run(1, 1e308), best: run(1, 1e308) } } });
    renderPicker();
    expect(procedureButtons()).toHaveLength(Object.keys(first.procedures).length);
    expect(screen.queryByText(/Last run/)).toBeNull();
  });

  it('renders the list without history when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderPicker();
    expect(procedureButtons()).toHaveLength(Object.keys(first.procedures).length);
    expect(screen.queryByText(/Last run/)).toBeNull();
  });
});

describe('drills in the picker', () => {
  const run = (deviations: number, at: number) => ({ mode: 'practice', deviations, at });
  const seed = (history: unknown) => localStorage.setItem('cpt.history', JSON.stringify(history));
  const drills = () => screen.queryByRole('region', { name: 'Drills' });

  it('offers nothing for an aircraft without history or emergency procedures', () => {
    renderPicker();
    expect(drills()).toBeNull();
  });

  it('suggests what to practise next from the history and starts it in the chosen mode', async () => {
    localStorage.setItem('cpt.aircraft', second.id);
    seed({ [second.id]: { powerUp: { last: run(0, 100), best: run(0, 100) } } });
    renderPicker();
    const region = drills();
    if (!region) throw new Error('no drills');
    const next = within(region).getByRole('button', {
      name: `Practise next: ${second.procedures['fire']?.title.en}`,
    });
    expect(within(region).getByText('Not practised yet.')).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: /Practice/ }));
    await userEvent.click(next);
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBe('fire');
  });

  it('starts a random emergency procedure', async () => {
    localStorage.setItem('cpt.aircraft', second.id);
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Random emergency' }));
    expect(trainer.procedureId).toBe('fire');
    expect(trainer.mode).toBe('guided');
  });

  it.each([
    [{ deviations: 2, other: 0 }, 'Its last run had deviations.'],
    [{ deviations: 0, other: 0 }, 'Practised longest ago.'],
  ])('gives the reason for the suggestion (%o)', ({ deviations, other }, reason) => {
    localStorage.setItem('cpt.aircraft', second.id);
    seed({
      [second.id]: {
        powerUp: { last: run(other, 300), best: run(other, 300) },
        fire: { last: run(deviations, 100), best: run(deviations, 100) },
      },
    });
    renderPicker();
    const region = drills();
    if (!region) throw new Error('no drills');
    expect(within(region).getByText(reason)).toBeTruthy();
  });

  it('starts the surprise in the phase picked in the select', async () => {
    real.use = true;
    localStorage.setItem('cpt.aircraft', 'ctsl');
    renderPicker();
    const phase = screen.getByRole('combobox', { name: 'Phase' });
    const options = within(phase)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));
    expect(options).toEqual(['departure', 'cruise']);
    await userEvent.selectOptions(phase, 'cruise');
    await userEvent.click(screen.getByRole('button', { name: 'Surprise failure' }));
    expect(trainer.session.scenario()?.phase).toBe('cruise');
    expect(trainer.session.phase()).toBe('cruise');
  });

  it('starts a surprise failure in Practice in the chosen phase, naming no procedure', async () => {
    localStorage.setItem('cpt.aircraft', second.id);
    renderPicker();
    expect(screen.getByRole('combobox', { name: 'Phase' })).toHaveProperty('value', 'ground');
    await userEvent.click(screen.getByRole('button', { name: 'Surprise failure' }));
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('practice');
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.session.scenario()).toMatchObject({ phase: 'ground', failure: 'fire' });
  });
});

describe('picker card text in German', () => {
  it('shows every registry aircraft with its own German name and handbook revision', () => {
    real.use = true;
    expect(aircraftRegistry.length).toBeGreaterThan(0);
    renderPicker('de');
    const cards = within(screen.getByRole('region', { name: 'Flugzeug' })).getAllByRole('button');
    expect(cards).toHaveLength(aircraftRegistry.length);
    aircraftRegistry.forEach((aircraft, index) => {
      const card = cards[index]?.textContent ?? '';
      const fields = {
        name: aircraft.name,
        handbookRevision: aircraft.handbookRevision,
      };
      for (const [field, value] of Object.entries(fields)) {
        expect(value.de.trim(), `${aircraft.id} ${field} de`).not.toBe('');
        expect(card, `${aircraft.id} ${field}`).toContain(value.de);
        if (field === 'handbookRevision') {
          expect(value.de, `${aircraft.id} ${field} de equals en`).not.toBe(value.en);
        }
        if (value.en !== value.de) {
          expect(card, `${aircraft.id} ${field} en leaks`).not.toContain(value.en);
        }
      }
    });
  });
});

describe('picker compact layout', () => {
  const css = readFileSync(
    fileURLToPath(import.meta.url).replace(/picker\.test\.tsx$/, 'shell.css'),
    'utf8',
  );

  it('applies from 1440 x 900 and from the portrait tablet height, so the picker needs no page scroll', () => {
    const compact = [...css.matchAll(/@media \(max-height: (\d+)px\)\s*\{\s*\.picker\s*\{/g)];
    expect(compact).toHaveLength(1);
    expect(Number(compact[0]?.[1])).toBeGreaterThanOrEqual(1024);
  });
});
