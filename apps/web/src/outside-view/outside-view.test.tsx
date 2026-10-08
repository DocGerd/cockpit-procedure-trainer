// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { phaseOrder, sharedPhases } from '@cpt/core';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { OutsideView } from './OutsideView';
import { PhaseControl } from './PhaseControl';
import { fixture } from './test-aircraft';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./test-aircraft')).fixture],
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderStrip(language?: 'de' | 'en') {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <header>
        <PhaseControl />
      </header>
      <section aria-label="Outside view">
        <OutsideView />
      </section>
    </TrainerProvider>,
    language === undefined ? {} : { language },
  );
}

const phaseSelect = () => within(screen.getByRole('banner')).getByRole('combobox');
const image = () => within(screen.getByRole('region')).getByRole('img');
const master = () => trainer.session.state().controls['master'];

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('outside view', () => {
  it('shows the current phase image with its localized name', () => {
    renderStrip();
    expect(image().getAttribute('src')).toBe('ground.svg');
    expect(image().getAttribute('alt')).toBe('Parking');
  });

  it('follows the phase when the session changes it', () => {
    renderStrip();
    act(() => trainer.session.jumpToPhase('cruise'));
    expect(image().getAttribute('src')).toBe('cruise-running.svg');
    expect(image().getAttribute('alt')).toBe('Cruise');
  });

  it('swaps to the running image exactly while the engine runs', () => {
    renderStrip();
    expect(image().getAttribute('src')).toBe('ground.svg');
    act(() => {
      trainer.session.set('master', 'on');
    });
    expect(image().getAttribute('src')).toBe('ground-running.svg');
    act(() => {
      trainer.session.set('master', 'off');
    });
    expect(image().getAttribute('src')).toBe('ground.svg');
  });

  it('keeps the image of a phase that has no running image', () => {
    renderStrip();
    act(() => trainer.session.jumpToPhase('taxiIn'));
    act(() => {
      trainer.session.set('master', 'on');
    });
    expect(image().getAttribute('src')).toBe('landed.svg');
  });

  it('follows a procedure into its end phase', () => {
    renderStrip();
    act(() => trainer.startProcedure('startUp'));
    expect(image().getAttribute('src')).toBe('ground.svg');
    act(() => {
      trainer.session.set('master', 'on');
    });
    expect(trainer.session.phase()).toBe('taxiIn');
    expect(image().getAttribute('src')).toBe('landed.svg');
    expect(phaseSelect()).toHaveProperty('value', 'taxiIn');
  });

  it('localizes the name', () => {
    renderStrip('de');
    expect(image().getAttribute('alt')).toBe('Parkposition');
  });

  it('shows the labelled placeholder when the image is broken', () => {
    renderStrip();
    fireEvent.error(image());
    expect(image().tagName).toBe('DIV');
    expect(image().getAttribute('aria-label')).toBe('Parking');
  });

  it('tries the next phase image after a broken one', () => {
    renderStrip();
    fireEvent.error(image());
    act(() => trainer.session.jumpToPhase('cruise'));
    expect(image().tagName).toBe('IMG');
    expect(image().getAttribute('src')).toBe('cruise-running.svg');
  });
});

describe('phase control', () => {
  it('lists the shared phases in flight order by localized name and marks the current one', () => {
    renderStrip('de');
    const options = within(phaseSelect()).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('value'))).toEqual(phaseOrder);
    expect(options.map((option) => option.textContent)).toEqual(
      sharedPhases.map(({ name }) => name.de),
    );
    expect(options[1]?.textContent).toBe('Rollen zum Rollhalt');
    expect(phaseSelect()).toHaveProperty('value', 'parking');
  });

  it('keeps the flight order whatever order the aircraft declares its phases in', () => {
    const { phases } = fixture;
    const reversed = Object.fromEntries(Object.entries(phases).reverse());
    try {
      (fixture as { phases: typeof phases }).phases = reversed;
      renderStrip();
      const options = within(phaseSelect()).getAllByRole('option');
      expect(options.map((option) => option.getAttribute('value'))).toEqual(phaseOrder);
      expect(phaseSelect()).toHaveProperty('value', 'parking');
    } finally {
      (fixture as { phases: typeof phases }).phases = phases;
    }
  });

  it('jumps to a phase no procedure starts in', async () => {
    renderStrip();
    await userEvent.selectOptions(phaseSelect(), 'taxiOut');
    expect(trainer.session.phase()).toBe('taxiOut');
    expect(image().getAttribute('src')).toBe('ground.svg');
    expect(image().getAttribute('alt')).toBe('Taxi out');
  });

  it('is named by a localized label that reads as the starting cockpit state', () => {
    renderStrip('de');
    expect(within(screen.getByRole('banner')).getByLabelText('Start in Flugphase')).toBe(
      phaseSelect(),
    );
  });

  it('is named Start in phase in English', () => {
    renderStrip();
    expect(within(screen.getByRole('banner')).getByLabelText('Start in phase')).toBe(phaseSelect());
  });

  it('jumps straight to the phase and loads its entry snapshot', async () => {
    renderStrip();
    expect(master()).toBe('off');
    await userEvent.selectOptions(phaseSelect(), 'cruise');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.session.phase()).toBe('cruise');
    expect(master()).toBe('on');
    expect(phaseSelect()).toHaveProperty('value', 'cruise');
  });

  describe('with a procedure running', () => {
    async function selectCruise(language?: 'de' | 'en') {
      renderStrip(language);
      act(() => trainer.startProcedure('cycle'));
      act(() => trainer.session.set('master', 'on'));
      await userEvent.selectOptions(phaseSelect(), 'cruise');
    }

    it('jumps at once while nothing is done', async () => {
      renderStrip();
      act(() => trainer.startProcedure('cycle'));
      await userEvent.selectOptions(phaseSelect(), 'cruise');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.procedureId).toBeUndefined();
      expect(trainer.session.phase()).toBe('cruise');
    });

    it('jumps at once once the procedure is finished', async () => {
      renderStrip();
      act(() => trainer.startProcedure('startUp'));
      act(() => trainer.session.set('master', 'on'));
      await userEvent.selectOptions(phaseSelect(), 'cruise');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.session.phase()).toBe('cruise');
    });

    it('asks before jumping and changes nothing yet', async () => {
      await selectCruise();
      const dialog = screen.getByRole('alertdialog');
      expect(dialog.textContent).toContain('Cruise');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
      expect(description?.textContent).toContain('Cruise');
      expect(description?.textContent).toContain('Progress lost: 1 of 2 items done.');
      const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
      expect(title?.textContent).toBe('Jump to phase “Cruise”?');
      expect(trainer.session.phase()).toBe('parking');
      expect(trainer.procedureId).toBe('cycle');
      expect(phaseSelect()).toHaveProperty('value', 'parking');
    });

    it('keeps the procedure when cancelled', async () => {
      await selectCruise();
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.procedureId).toBe('cycle');
      expect(trainer.session.phase()).toBe('parking');
    });

    it('keeps the procedure on Escape', async () => {
      await selectCruise();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.procedureId).toBe('cycle');
    });

    it('ends the procedure and loads the phase when confirmed', async () => {
      await selectCruise();
      await userEvent.click(screen.getByRole('button', { name: 'Jump to phase' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.procedureId).toBeUndefined();
      expect(trainer.session.phase()).toBe('cruise');
      expect(master()).toBe('on');
    });

    it('moves focus into the dialog and back to the control', async () => {
      await selectCruise();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(document.activeElement).toBe(phaseSelect());
    });

    it('keeps Tab inside the dialog', async () => {
      await selectCruise();
      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Jump to phase' }));
      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Jump to phase' }));
    });

    it('is localized', async () => {
      await selectCruise('de');
      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Zur Phase springen' })).toBeTruthy();
      expect(
        screen.getByRole('alertdialog', { name: 'Zur Phase „Reiseflug“ springen?' }),
      ).toBeTruthy();
    });

    it('drops the question when the procedure ends meanwhile', async () => {
      await selectCruise();
      act(() => trainer.session.jumpToPhase('parking'));
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });
});
