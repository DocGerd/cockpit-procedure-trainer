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

  it('enters Free explore from its button', async () => {
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the cockpit' }));
    expect(trainer.screen).toBe('trainer');
    expect(trainer.mode).toBe('explore');
    expect(trainer.procedureId).toBeUndefined();
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
