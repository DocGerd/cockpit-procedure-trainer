// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import { act, cleanup, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerLayout } from '../shell/TrainerLayout';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useSessionState, useTrainer } from '../trainer';
import { SURPRISE_MAX_MS } from '../trainer/scenarios';
import type { Mode, Trainer } from '../trainer';
import { ChecklistPane, DeviationSummary, useCurrentTarget } from './index';
import { fixture } from './test-aircraft';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: [(await import('./test-aircraft')).fixture],
}));

const { procedures } = fixture;
const flow = 'flow';
const itemCount = procedures[flow]?.items.length ?? 0;

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderPane(language?: 'de' | 'en') {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <ChecklistPane />
    </TrainerProvider>,
    language === undefined ? {} : { language },
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

const checkOff = () =>
  act(() => {
    trainer.session.checkOff();
  });

const items = () => within(screen.getByRole('list')).getAllByRole('listitem');
const markOf = (item: HTMLElement) => within(item).getByRole('img');
const stateLabels = () => items().map((item) => markOf(item).getAttribute('aria-label'));

function finishFlowWithDeviations() {
  operate('avionics', 'on');
  operate('master', 'on');
  checkOff();
  checkOff();
  operate('pump', 'on');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('checklist items', () => {
  it('lists the procedure items with the first one current', () => {
    renderPane();
    start(flow);
    expect(items()).toHaveLength(itemCount);
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
    expect(items()[0]?.getAttribute('aria-current')).toBe('step');
    expect(items()[1]?.getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeTruthy();
    expect(screen.getByText('0 / 4')).toBeTruthy();
  });

  it('tells pending, current, done and deviated items apart without colour', () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    checkOff();
    expect(stateLabels()).toEqual(['Done', 'Deviated', 'Current', 'Pending']);
    const glyphs = items().map((item) => markOf(item).textContent);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('shows the item progress', () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    expect(screen.getByText('1 / 4')).toBeTruthy();
  });

  it('gives an action item a Verified button that passes a target already set', async () => {
    renderPane();
    start(flow);
    operate('pump', 'on');
    operate('master', 'on');
    checkOff();
    checkOff();
    expect(trainer.session.checklist()?.current).toBe(3);
    expect(screen.queryByRole('button', { name: 'Checked' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Verified' }));
    expect(trainer.session.checklist()?.done).toBe(true);
    expect(trainer.session.checklist()?.deviations.map(({ kind }) => kind)).toEqual([
      'out-of-order',
    ]);
  });

  it('gives check and confirm items a check-off button', async () => {
    renderPane();
    start(flow);
    expect(screen.queryByRole('button', { name: 'Checked' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();

    operate('master', 'on');
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Checked' }));
    expect(trainer.session.checklist()?.completed).toEqual([0, 1]);

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(trainer.session.checklist()?.completed).toEqual([0, 1, 2]);
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it('marks an emergency procedure in the pane header', () => {
    renderPane();
    start('fire');
    expect(screen.getByText('Emergency')).toBeTruthy();
    expect(screen.queryByText('Normal procedure')).toBeNull();
  });

  it('marks a normal procedure as such', () => {
    renderPane();
    start(flow);
    expect(screen.getByText('Normal procedure')).toBeTruthy();
    expect(screen.queryByText('Emergency')).toBeNull();
  });

  it('restarts at once when nothing is done yet', async () => {
    renderPane();
    start(flow);
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
  });

  it('asks before Restart discards progress and restarts from the start phase on confirm', async () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Restart the procedure?' });
    expect(dialog.textContent).toContain(`Progress lost: 1 of ${itemCount} items done.`);
    expect(stateLabels()[0]).toBe('Done');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restart' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
  });

  it('keeps the progress when the restart is cancelled', async () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stateLabels()[0]).toBe('Done');
  });

  it('asks before Restart discards a recorded deviation and counts it', async () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      `Progress lost: 0 of ${itemCount} items done, 1 deviation.`,
    );
  });

  it.each([
    ['en', 'Restart', 'Progress lost: 0 of ITEMS items done, 2 deviations.'],
    ['de', 'Neu starten', 'Verlorener Fortschritt: 0 von ITEMS Punkten erledigt, 2 Abweichungen.'],
  ] as const)('counts several deviations in %s', async (language, restart, expected) => {
    renderPane(language);
    start(flow);
    operate('avionics', 'on');
    operate('pump', 'on');
    await userEvent.click(screen.getByRole('button', { name: restart }));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      expected.replace('ITEMS', String(itemCount)),
    );
  });

  it('asks in German', async () => {
    renderPane('de');
    start(flow);
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Neu starten' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Verfahren neu starten?' });
    expect(dialog.textContent).toContain(`1 von ${itemCount} Punkten erledigt`);
    expect(within(dialog).getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
  });

  it('renders the German interface', () => {
    renderPane('de');
    start(flow);
    expect(stateLabels()[0]).toBe('Aktuell');
    expect(screen.getByText('Master on (de)')).toBeTruthy();
    expect(screen.getByText('Keine Abweichungen')).toBeTruthy();
  });
});

describe('deviations per mode', () => {
  it('shows a deviation at once in Guided, in the banner and on the item', () => {
    renderPane();
    start(flow);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    operate('avionics', 'on');
    expect(screen.getByRole('status')).toBe(status);
    expect(within(status).getByText('Avionics set to ON. Return it to OFF.')).toBeTruthy();
    expect(screen.getByText('1 deviation')).toBeTruthy();
    operate('master', 'on');
    expect(stateLabels()[0]).toBe('Deviated');
  });

  it('puts the Guided banner below the list so a deviation never pushes the current item', () => {
    renderPane();
    start(flow);
    const status = screen.getByRole('status');
    const list = screen.getByRole('list');
    expect(list.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the latest deviation in the Guided banner', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    operate('master', 'on');
    checkOff();
    const banner = screen.getByRole('status').textContent;
    expect(banner).toContain('Item 2 was checked off, but its condition was not met.');
    expect(banner).not.toContain('Avionics operated');
    expect(screen.getByText('2 deviations')).toBeTruthy();
  });

  it('names an unmet check in the Guided banner', () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    checkOff();
    expect(
      within(screen.getByRole('status')).getByText(
        'Item 2 was checked off, but its condition was not met.',
      ),
    ).toBeTruthy();
  });

  it('shows no deviation in Practice until the summary, not even a count', () => {
    renderPane();
    start(flow, 'practice');
    operate('avionics', 'on');
    operate('master', 'on');
    checkOff();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/Avionics operated/)).toBeNull();
    expect(screen.queryByText(/condition was not met/)).toBeNull();
    expect(stateLabels()).toEqual(['Done', 'Done', 'Current', 'Pending']);
    expect(screen.queryByText(/\d+ deviations?$/)).toBeNull();
    expect(screen.queryByText('No deviations')).toBeNull();

    checkOff();
    operate('pump', 'on');
    expect(screen.getByText('Avionics operated')).toBeTruthy();
    expect(screen.getAllByText('Master on')).toHaveLength(2);
    expect(screen.getByText('Avionics set to ON')).toBeTruthy();
  });
});

describe('retrying an item', () => {
  const retry = () => screen.queryByRole('button', { name: 'Retry this item' });

  it('offers a retry with a deviation of the current item and puts the cockpit back', async () => {
    renderPane();
    start(flow);
    expect(retry()).toBeNull();
    operate('avionics', 'on');
    await userEvent.click(retry() as HTMLElement);
    expect(trainer.session.state().controls.avionics).toBe('off');
    expect(trainer.session.checklist()?.current).toBe(0);
    expect(trainer.session.checklist()?.assists).toBe(1);
    expect(screen.getByText('1 deviation')).toBeTruthy();
    expect(screen.getByText('Avionics operated. Not part of item 1.')).toBeTruthy();
  });

  it('stops saying to return a control once the pilot has put it back', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    expect(screen.getByText('Avionics set to ON. Return it to OFF.')).toBeTruthy();
    operate('avionics', 'off');
    expect(screen.getByText('Avionics operated. Not part of item 1.')).toBeTruthy();
  });

  it('drops the retry once the item has moved on', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    operate('master', 'on');
    expect(retry()).toBeNull();
  });

  it('offers none in Practice, where nothing is said until the end', () => {
    renderPane();
    start(flow, 'practice');
    operate('avionics', 'on');
    expect(retry()).toBeNull();
  });

  it('speaks German', () => {
    renderPane('de');
    start(flow);
    operate('avionics', 'on');
    expect(screen.getByRole('button', { name: 'Diesen Punkt wiederholen' })).toBeTruthy();
  });
});

describe('deviation summary', () => {
  it('replaces the list when the checklist is done', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Flow complete' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Restart' })).toBeNull();
  });

  it('shows the time taken, the deviation count and the assists used', () => {
    renderPane();
    start(flow);
    act(() => trainer.session.advance(65_000));
    operate('avionics', 'on');
    act(() => trainer.session.retryItem());
    operate('master', 'on');
    checkOff();
    checkOff();
    operate('pump', 'on');
    expect(screen.getByText('Time').nextElementSibling?.textContent).toBe('1:05');
    expect(screen.getByText('Deviations').nextElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Assists').nextElementSibling?.textContent).toBe('1');
    expect(screen.queryByText('Items completed')).toBeNull();
  });

  it('counts the deviations by kind', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    const kinds = within(screen.getAllByRole('list')[0] as HTMLElement)
      .getAllByRole('listitem')
      .map((kind) => kind.textContent);
    expect(kinds).toEqual(['Unexpected control1', 'Condition not met1']);
  });

  it('groups deviations of every kind', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    operate('pump', 'on');
    operate('master', 'on');
    operate('pump', 'off');
    checkOff();
    checkOff();
    checkOff();
    const kinds = within(screen.getAllByRole('list')[0] as HTMLElement)
      .getAllByRole('listitem')
      .map((kind) => kind.textContent);
    expect(kinds).toEqual([
      'Unexpected control2',
      'Out of order1',
      'Wrong position1',
      'Condition not met1',
    ]);
    expect(screen.getByText('Deviations').nextElementSibling?.textContent).toBe('5');
  });

  it('lists each deviation with the item it happened during', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    const rows = within(screen.getByRole('region', { name: 'What differed from the checklist' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent);
    expect(rows).toEqual([
      'During item 1Avionics operatedExpectedMaster onActualAvionics set to ONGo to item 1',
      'Item 2Fuel flowing checked off, condition not metExpectedFuel flowingActualChecked off with the condition not metGo to item 2',
    ]);
  });

  it('scrolls to the item of a deviation and focuses it', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    await userEvent.click(screen.getByRole('button', { name: 'Go to item 2' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    const row = scrollIntoView.mock.contexts[0] as HTMLElement;
    expect(row.textContent).toContain('Fuel flowing');
    expect(document.activeElement).toBe(row);
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('lists every item below the deviations, marking the deviated ones', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    const review = within(screen.getByRole('region', { name: 'The items' }));
    const rows = review.getAllByRole('listitem');
    expect(rows).toHaveLength(itemCount);
    expect(rows.map((row) => within(row).getByRole('img').getAttribute('aria-label'))).toEqual([
      'Deviated',
      'Deviated',
      'Done',
      'Done',
    ]);
  });

  it('makes Repeat the primary action when something deviated, Next otherwise', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    expect(screen.getByRole('button', { name: 'Repeat this procedure' }).className).toContain(
      'button-primary',
    );
    expect(screen.getByRole('button', { name: 'Next: Follow-up' }).className).toContain(
      'button-secondary',
    );
  });

  it('keeps Next the primary action when nothing deviated', () => {
    function Clean() {
      const checklist = useSessionState((snapshot) => snapshot.checklist());
      if (!checklist) return null;
      return <DeviationSummary checklist={{ ...checklist, done: true, deviations: [] }} />;
    }
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <Clean />
      </TrainerProvider>,
    );
    start(flow);
    expect(screen.getByRole('button', { name: 'Next: Follow-up' }).className).toContain(
      'button-primary',
    );
    expect(screen.getByRole('button', { name: 'Repeat this procedure' }).className).toContain(
      'button-secondary',
    );
  });

  it('says so when nothing deviated', () => {
    renderPane();
    start('followUp');
    operate('avionics', 'on');
    expect(screen.getByText('Everything went as the checklist says.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'What differed from the checklist' })).toBeNull();
    expect(screen.getByText('Deviations').nextElementSibling?.textContent).toBe('0');
  });

  it('starts the next procedure of the same type', async () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    await userEvent.click(screen.getByRole('button', { name: 'Next: Follow-up' }));
    expect(trainer.procedureId).toBe('followUp');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(stateLabels()).toEqual(['Current']);
  });

  it('offers no next procedure after the last one of its type', () => {
    renderPane();
    start('followUp');
    operate('avionics', 'on');
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
  });

  it('repeats the procedure from the start', async () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    await userEvent.click(screen.getByRole('button', { name: 'Repeat this procedure' }));
    expect(trainer.procedureId).toBe(flow);
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
  });

  it('goes back to the selection', async () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    await userEvent.click(screen.getByRole('button', { name: 'Back to selection' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(trainer.screen).toBe('picker');
    expect(trainer.procedureId).toBeUndefined();
  });

  it('moves focus to the summary heading when it replaces the list', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    operate('master', 'on');
    checkOff();
    checkOff();
    operate('pump', 'on');
    const heading = screen.getByRole('heading', { name: 'Flow complete' });
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(heading);
  });

  it('names a control missing from the aircraft by its id', () => {
    function Forged() {
      const checklist = useSessionState((snapshot) => snapshot.checklist());
      if (!checklist) return null;
      const deviations = [
        { kind: 'unexpected-control' as const, itemIndex: 0, controlId: 'gps.power' },
      ];
      return <DeviationSummary checklist={{ ...checklist, done: true, deviations }} />;
    }
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <Forged />
      </TrainerProvider>,
    );
    start(flow);
    expect(screen.getAllByText('gps.power operated')).toHaveLength(2);
  });

  it('renders the German summary', () => {
    renderPane('de');
    start(flow);
    finishFlowWithDeviations();
    expect(screen.getByRole('heading', { name: 'Flow (de) abgeschlossen' })).toBeTruthy();
    expect(screen.getByText('Bei Punkt 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zurück zur Auswahl' })).toBeTruthy();
  });
});

describe('full flight summary', () => {
  const startFlight = () =>
    act(() => {
      trainer.setMode('guided');
      trainer.startFlight();
    });
  const continueFlight = () =>
    userEvent.click(screen.getByRole('button', { name: 'Next: Follow-up' }));

  it('names the leg and continues the flight from the cockpit as it stands', async () => {
    renderPane();
    startFlight();
    finishFlowWithDeviations();
    expect(screen.getByText(/· Full flight, leg 1 of 2$/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'The whole flight' })).toBeNull();
    await continueFlight();
    expect(trainer.procedureId).toBe('followUp');
    expect(trainer.session.state().controls.avionics).toBe('on');
    expect(trainer.flight?.results).toMatchObject([{ id: flow, deviations: 2 }]);
  });

  it('shows the leg in the header while a leg runs, and nothing outside a flight', async () => {
    renderPane();
    act(() => trainer.startProcedure(flow));
    expect(screen.queryByText(/Full flight, leg/)).toBeNull();
    startFlight();
    expect(screen.getByText('Full flight, leg 1 of 2')).toBeTruthy();
    finishFlowWithDeviations();
    await continueFlight();
    expect(screen.getByText('Full flight, leg 2 of 2')).toBeTruthy();
  });

  it('repeats a leg from the cockpit it began with', async () => {
    renderPane();
    startFlight();
    finishFlowWithDeviations();
    await continueFlight();
    operate('master', 'off');
    checkOff();
    await userEvent.click(screen.getByRole('button', { name: 'Repeat this procedure' }));
    expect(trainer.procedureId).toBe('followUp');
    expect(trainer.session.state().controls.master).toBe('on');
    expect(trainer.flight?.results).toHaveLength(1);
  });

  it('sums up every leg and the whole flight after the last leg', async () => {
    renderPane();
    startFlight();
    act(() => trainer.session.advance(65_000));
    finishFlowWithDeviations();
    await continueFlight();
    act(() => trainer.session.advance(5_000));
    checkOff();
    expect(screen.getByText(/· Full flight, leg 2 of 2$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
    const table = within(screen.getByRole('region', { name: 'The whole flight' }));
    const rows = table
      .getAllByRole('row')
      .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Procedure', 'Deviations', 'Assists', 'Time'],
      ['Flow', '2', '0', '1:05'],
      ['Follow-up', '0', '0', '0:05'],
      ['Total', '2', '0', '1:10'],
    ]);
  });

  describe('back to selection', () => {
    const back = () => screen.getByRole('button', { name: 'Back to selection' });

    it('asks before ending the flight ahead of its last leg, naming the legs flown', async () => {
      renderPane();
      startFlight();
      finishFlowWithDeviations();
      await userEvent.click(back());
      const dialog = within(screen.getByRole('alertdialog'));
      expect(dialog.getByText('Back to selection?')).toBeTruthy();
      expect(dialog.getByText(/The full flight ends after 1 of 2 legs\./)).toBeTruthy();
      expect(trainer.flight).toBeDefined();
      await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.procedureId).toBe(flow);
      await userEvent.click(back());
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Back to selection' }),
      );
      expect(trainer.screen).toBe('picker');
      expect(trainer.flight).toBeUndefined();
    });

    it('asks in German', async () => {
      renderPane('de');
      startFlight();
      finishFlowWithDeviations();
      await userEvent.click(screen.getByRole('button', { name: 'Zurück zur Auswahl' }));
      const dialog = within(screen.getByRole('alertdialog'));
      expect(dialog.getByText('Zurück zur Auswahl?')).toBeTruthy();
      expect(dialog.getByText(/Der ganze Flug endet nach 1 von 2 Abschnitten\./)).toBeTruthy();
      expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
    });

    it('acts at once after the last leg', async () => {
      renderPane();
      startFlight();
      finishFlowWithDeviations();
      await continueFlight();
      checkOff();
      await userEvent.click(back());
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(trainer.screen).toBe('picker');
    });
  });

  it('renders the German flight summary', async () => {
    renderPane('de');
    startFlight();
    finishFlowWithDeviations();
    expect(screen.getByText(/· Ganzer Flug, Abschnitt 1 von 2$/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Weiter: Follow-up (de)' }));
    checkOff();
    expect(screen.getByRole('region', { name: 'Der ganze Flug' })).toBeTruthy();
  });
});

describe('surprise failure', () => {
  const note = /Surprise failure: a failure appears without warning/;
  const surprise = () => act(() => trainer.startSurprise('cruise'));
  const past = (ms: number) => act(() => trainer.session.advance(ms));
  const runButton = () => screen.queryByRole('button', { name: 'Run this checklist' });

  it('opens with no checklist shown until the pilot picks one', async () => {
    renderPane();
    act(() => trainer.startProcedure('followUp'));
    surprise();
    const selector = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Show checklist' });
    expect(selector.value).toBe('');
    expect(within(selector).getByRole('option', { name: 'Choose a checklist' })).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText('Read-only view. Nothing here is checked off.')).toBeNull();
    expect(screen.getByText(note)).toBeTruthy();
    await userEvent.selectOptions(selector, 'followUp');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(screen.getByText(note)).toBeTruthy();
  });

  it('names no failure while it is pending and offers to run any checklist', async () => {
    renderPane();
    surprise();
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Fire' })).toBeNull();
    expect(screen.queryByText('Failure injected')).toBeNull();
    expect(runButton()).toBeNull();
    const selector = screen.getByRole('combobox', { name: 'Show checklist' });
    await userEvent.selectOptions(selector, 'fire');
    expect(runButton()).toBeTruthy();
    expect(screen.getByText('Emergency')).toBeTruthy();
    expect(screen.queryByText('Failure injected')).toBeNull();
    await userEvent.selectOptions(selector, 'followUp');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(runButton()).toBeTruthy();
  });

  it('runs a normal checklist picked in the viewer and reports it as the wrong one', async () => {
    renderPane();
    surprise();
    past(SURPRISE_MAX_MS);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Show checklist' }),
      'followUp',
    );
    const run = runButton();
    if (!run) throw new Error('no run button');
    await userEvent.click(run);
    expect(trainer.procedureId).toBe('followUp');
    expect(trainer.session.scenario()).toMatchObject({ chosen: 'followUp', matched: false });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Show checklist' }), 'fire');
    expect(runButton()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Back to/ }));
    operate('avionics', 'on');
    const verdict = screen.getByText('Not the checklist for the failure: Fire.');
    expect(verdict.getAttribute('data-matched')).toBe('false');
  });

  it('runs the chosen checklist, then reports the time to recognise and a match', async () => {
    renderPane();
    surprise();
    past(SURPRISE_MAX_MS);
    past(2000);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Show checklist' }), 'fire');
    const run = runButton();
    if (!run) throw new Error('no run button');
    await userEvent.click(run);
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeTruthy();
    expect(screen.queryByText(note)).toBeNull();
    operate('pump', 'off');
    expect(screen.getByText('Time to recognise').nextElementSibling?.textContent).toBe('0:02');
    expect(screen.getByText('Right checklist for the failure: Fire.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'New surprise failure' }));
    expect(trainer.procedureId).toBeUndefined();
    expect(trainer.session.scenario()).toMatchObject({ phase: 'cruise', failure: 'fire' });
  });

  it('says when the chosen checklist is not the one for the failure', () => {
    renderPane();
    surprise();
    past(SURPRISE_MAX_MS);
    act(() => trainer.takeChecklist('followUp'));
    operate('avionics', 'on');
    expect(screen.getByText('Not the checklist for the failure: Fire.')).toBeTruthy();
  });

  it('says when the checklist was chosen before the failure appeared', () => {
    renderPane();
    surprise();
    act(() => trainer.takeChecklist('fire'));
    operate('pump', 'off');
    expect(screen.getByText('Time to recognise').nextElementSibling?.textContent).toBe('Early');
    expect(screen.getByText(/chosen before the failure appeared/)).toBeTruthy();
  });

  it('leaves the summary of an ordinary run alone', () => {
    renderPane();
    start('followUp');
    operate('avionics', 'on');
    expect(screen.queryByText('Time to recognise')).toBeNull();
    expect(screen.getByRole('button', { name: 'Repeat this procedure' })).toBeTruthy();
  });
});

describe('visibility', () => {
  it('shows a read-only reference without a running procedure', () => {
    renderPane();
    expect(trainer.session.checklist()).toBeUndefined();
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
    expect(items()).toHaveLength(itemCount);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows the same static reference in Free explore, even with a procedure in the session', () => {
    renderPane();
    act(() => trainer.setMode('explore'));
    act(() => trainer.startProcedure(flow));
    expect(trainer.session.checklist()).toBeDefined();
    expect(items()).toHaveLength(itemCount);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Checked|Done|Restart)$/ })).toBeNull();
    expect(items().every((item) => item.getAttribute('aria-current') === null)).toBe(true);
  });

  it('is present in the layout without a procedure, behind a tablet toggle', () => {
    renderWithLanguage(
      <ThemeProvider>
        <TrainerProvider>
          <TrainerLayout />
        </TrainerProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: /^Checklist/ })).toBeTruthy();
  });

  it('is mounted in the layout aside while a procedure runs', () => {
    vi.stubGlobal('innerWidth', 1400);
    renderWithLanguage(
      <ThemeProvider>
        <TrainerProvider>
          <Probe />
          <TrainerLayout />
        </TrainerProvider>
      </ThemeProvider>,
    );
    start(flow);
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    expect(within(aside).getByRole('heading', { name: 'Flow' })).toBeTruthy();
  });

  it('scrolls the current step into view when the running checklist returns', async () => {
    vi.stubGlobal('innerWidth', 1400);
    renderWithLanguage(
      <ThemeProvider>
        <TrainerProvider>
          <Probe />
          <TrainerLayout />
        </TrainerProvider>
      </ThemeProvider>,
    );
    start(flow);
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const rect = this.tagName === 'OL' ? { top: 0, bottom: 100 } : { top: 200, bottom: 240 };
      return { ...rect, left: 0, right: 0, width: 0, height: 0, x: 0, y: rect.top } as DOMRect;
    });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Show checklist' }),
      'followUp',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back to running checklist: Flow' }));
    expect(within(aside).getByRole('list').scrollTop).toBe(200);
    vi.restoreAllMocks();
  });
});

describe('the current item and the deviation sheet', () => {
  it('gives the current item one primary action with Show me beside it', () => {
    renderPane();
    start(flow, 'practice');
    operate('master', 'on');
    expect(screen.getByRole('button', { name: 'Checked' }).className).toContain('button-primary');
    expect(screen.getByRole('button', { name: 'Show me' }).className).toContain('button-secondary');
  });

  it('sticks the deviation banner to the end of the list without making it an item', () => {
    renderPane();
    start(flow);
    operate('avionics', 'on');
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Deviation');
    expect(status.closest('.checklist-items')).not.toBeNull();
    expect(status.closest('.checklist-sheet')?.getAttribute('role')).toBe('none');
    expect(items()).toHaveLength(itemCount);
  });
});

describe('scrolling the running checklist', () => {
  const rectOf = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top }) as DOMRect;

  afterEach(() => vi.restoreAllMocks());

  /** The list, the current row, the row before it and the sheet; everything else has no size. */
  function layout(
    list: HTMLElement,
    box: DOMRect,
    current: DOMRect,
    previous = rectOf(0, 0),
    sheet = rectOf(box.bottom, box.bottom),
  ) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this === list) return box;
      if (this.classList.contains('checklist-sheet')) return sheet;
      if (this.getAttribute('aria-current') === 'step') return current;
      if (this.nextElementSibling?.getAttribute('aria-current') === 'step') return previous;
      return rectOf(0, 0);
    });
  }

  it('brings a current item below the list up under one row of what is done', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    layout(list, rectOf(0, 200), rectOf(300, 340), rectOf(260, 300));
    operate('master', 'on');
    expect(list.scrollTop).toBe(260);
  });

  it('moves the current item up once it passes the top third of the list', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    layout(list, rectOf(100, 400), rectOf(250, 290), rectOf(210, 250));
    operate('master', 'on');
    expect(list.scrollTop).toBe(110);
  });

  it('scrolls back up to a current item above the list', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 300;
    layout(list, rectOf(100, 200), rectOf(60, 100));
    operate('master', 'on');
    expect(list.scrollTop).toBe(260);
  });

  it('leaves the list alone when the current item is in its top third', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 25;
    layout(list, rectOf(100, 400), rectOf(120, 160));
    operate('master', 'on');
    expect(list.scrollTop).toBe(25);
  });

  it('leaves the current item where it is when a deviation appears', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 25;
    layout(list, rectOf(0, 400), rectOf(200, 240), rectOf(0, 0), rectOf(300, 400));
    operate('avionics', 'on');
    expect(screen.getByRole('status').textContent).not.toBe('');
    expect(list.scrollTop).toBe(25);
  });

  it('lifts the current item just clear of a deviation sheet that would cover it', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 25;
    layout(list, rectOf(0, 400), rectOf(200, 320), rectOf(0, 0), rectOf(300, 400));
    operate('avionics', 'on');
    expect(screen.getByRole('status').textContent).not.toBe('');
    expect(list.scrollTop).toBe(45);
  });

  it('never lifts the current item above the top of the list for the sheet', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 25;
    layout(list, rectOf(0, 400), rectOf(10, 320), rectOf(0, 0), rectOf(300, 400));
    operate('avionics', 'on');
    expect(list.scrollTop).toBe(35);
  });
});

describe('viewing a checklist', () => {
  const selector = () => screen.getByRole('combobox', { name: 'Show checklist' });
  const view = (id: string) => userEvent.selectOptions(selector(), id);

  it('offers every procedure of the aircraft, grouped, in the selector', () => {
    renderPane();
    start(flow);
    const groups = within(selector())
      .getAllByRole('group')
      .map((group) => [
        group.getAttribute('label'),
        within(group)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ]);
    expect(groups).toEqual([
      ['Normal', ['Flow · running', 'Follow-up']],
      ['Emergency', ['Fire']],
    ]);
  });

  it('labels the selector and the back button in German', async () => {
    renderPane('de');
    start(flow);
    expect(screen.getByRole('combobox', { name: 'Checkliste anzeigen' })).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'fire');
    expect(
      screen.getByRole('button', { name: 'Zurück zur laufenden Checkliste: Flow (de)' }),
    ).toBeTruthy();
  });

  it('shows another checklist read-only in Guided without disturbing the running one', async () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    const before = trainer.session.checklist();
    await view('followUp');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(items()).toHaveLength(1);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(trainer.procedureId).toBe(flow);
    expect(trainer.session.checklist()).toBe(before);

    operate('avionics', 'on');
    operate('pump', 'on');
    expect(trainer.procedureId).toBe(flow);
    expect(trainer.session.checklist()?.deviations.length).toBeGreaterThan(0);
    expect(items()).toHaveLength(1);
  });

  it('returns to the running checklist with progress intact, from the button or the selector', async () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    await view('followUp');
    await userEvent.click(screen.getByRole('button', { name: 'Back to running checklist: Flow' }));
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
    expect(stateLabels()).toEqual(['Done', 'Current', 'Pending', 'Pending']);

    await view('followUp');
    await view(flow);
    expect(stateLabels()).toEqual(['Done', 'Current', 'Pending', 'Pending']);
  });

  it('keeps the running deviation notice in view in Guided while another checklist is read', async () => {
    renderPane();
    start(flow);
    await view('followUp');
    expect(screen.queryByText('Deviation')).toBeNull();
    operate('avionics', 'on');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      'Avionics set to ON. Return it to OFF.',
    );
  });

  it('shows no deviation notice in Practice while another checklist is read', async () => {
    renderPane();
    start(flow, 'practice');
    await view('followUp');
    operate('avionics', 'on');
    expect(screen.queryByText('Deviation')).toBeNull();
  });

  it('brings the summary forward when the running checklist completes while another is read', async () => {
    renderPane();
    start(flow);
    await view('followUp');
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    finishFlowWithDeviations();
    expect(screen.getByRole('heading', { name: 'Flow complete' })).toBeTruthy();
    expect(trainer.viewedProcedureId).toBe(flow);
  });

  it('brings the summary forward for a pane that mounts only once the run is done', async () => {
    function AfterDone() {
      const done = useSessionState((snapshot) => snapshot.checklist()?.done ?? false);
      return done ? <ChecklistPane /> : null;
    }
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <AfterDone />
      </TrainerProvider>,
    );
    start(flow);
    act(() => trainer.viewProcedure('followUp'));
    finishFlowWithDeviations();
    expect(screen.getByRole('heading', { name: 'Flow complete' })).toBeTruthy();
  });

  it('brings the summary forward in Practice too', async () => {
    renderPane();
    start(flow, 'practice');
    await view('followUp');
    finishFlowWithDeviations();
    expect(screen.getByRole('heading', { name: 'Flow complete' })).toBeTruthy();
  });

  it('lets the pilot read another checklist after the summary has been shown', async () => {
    renderPane();
    start(flow);
    await view('followUp');
    finishFlowWithDeviations();
    await view('fire');
    expect(screen.getByRole('heading', { name: 'Fire' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Flow complete' })).toBeNull();
  });

  it('works the same in Practice', async () => {
    renderPane();
    start(flow, 'practice');
    await view('fire');
    expect(screen.getByText('Emergency')).toBeTruthy();
    expect(trainer.procedureId).toBe(flow);
    await userEvent.click(screen.getByRole('button', { name: 'Back to running checklist: Flow' }));
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
  });

  it('forgets the view when the running procedure restarts or the mode changes', async () => {
    renderPane();
    start(flow);
    await view('followUp');
    act(() => trainer.startProcedure(flow));
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
    await view('followUp');
    act(() => trainer.setMode('explore'));
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
  });

  it('starts Free explore on the last procedure and lets the user read any other', async () => {
    renderPane();
    start('followUp');
    act(() => trainer.setMode('explore'));
    expect(screen.getByRole('heading', { name: 'Follow-up' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Back to running/ })).toBeNull();
    await view('fire');
    expect(screen.getByRole('heading', { name: 'Fire' })).toBeTruthy();
    expect(trainer.session.procedureId()).toBeUndefined();
  });

  it('ticks nothing when controls are operated in Free explore', async () => {
    renderPane();
    act(() => trainer.setMode('explore'));
    await view(flow);
    const before = screen.getByRole('list').innerHTML;
    operate('master', 'on');
    operate('pump', 'on');
    expect(trainer.session.checklist()).toBeUndefined();
    expect(trainer.session.failures().size).toBe(0);
    expect(screen.getByRole('list').innerHTML).toBe(before);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/deviation/i)).toBeNull();
  });

  it('shows the read-only view after a phase jump ends the procedure', () => {
    renderPane();
    start(flow);
    act(() => trainer.jumpToPhase('cruise'));
    expect(trainer.procedureId).toBeUndefined();
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('useCurrentTarget', () => {
  function renderTarget() {
    let renders = 0;
    const view = renderHook(
      () => {
        renders += 1;
        return { target: useCurrentTarget(), trainer: useTrainer() };
      },
      { wrapper: TrainerProvider },
    );
    return { view, renders: () => renders };
  }

  it('follows the current item: control, indicator, then nothing for a confirm', () => {
    const { view } = renderTarget();
    expect(view.result.current.target).toBeUndefined();
    act(() => view.result.current.trainer.startProcedure(flow));
    expect(view.result.current.target).toEqual({ control: 'master' });
    act(() => {
      view.result.current.trainer.session.set('master', 'on');
    });
    expect(view.result.current.target).toEqual({ indicator: 'fuel' });
    act(() => view.result.current.trainer.session.checkOff());
    expect(view.result.current.target).toBeUndefined();
  });

  it('is undefined once the checklist is done', () => {
    const { view } = renderTarget();
    act(() => view.result.current.trainer.startProcedure('followUp'));
    act(() => {
      view.result.current.trainer.session.set('avionics', 'on');
    });
    expect(view.result.current.trainer.session.checklist()?.done).toBe(true);
    expect(view.result.current.target).toBeUndefined();
  });

  it('does not re-render on a tick', () => {
    const { view, renders } = renderTarget();
    act(() => view.result.current.trainer.startProcedure(flow));
    const before = renders();
    act(() => view.result.current.trainer.session.advance(STEP_MS));
    expect(renders()).toBe(before);
  });
});
