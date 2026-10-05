// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import { act, cleanup, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerLayout } from '../shell/TrainerLayout';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Mode, Trainer } from '../trainer';
import { ChecklistPane, useCurrentTarget } from './index';
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

  it('gives check and confirm items a check-off button and action items none', async () => {
    renderPane();
    start(flow);
    expect(screen.queryByRole('button', { name: 'Check off' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();

    operate('master', 'on');
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Check off' }));
    expect(trainer.session.checklist()?.completed).toEqual([0, 1]);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(trainer.session.checklist()?.completed).toEqual([0, 1, 2]);
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
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

  it('restarts the procedure from its start phase', async () => {
    renderPane();
    start(flow);
    operate('master', 'on');
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(stateLabels()).toEqual(['Current', 'Pending', 'Pending', 'Pending']);
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
    expect(screen.queryByRole('status')).toBeNull();
    operate('avionics', 'on');
    expect(
      within(screen.getByRole('status')).getByText('Avionics operated. Not part of item 1.'),
    ).toBeTruthy();
    expect(screen.getByText('1 deviation')).toBeTruthy();
    operate('master', 'on');
    expect(stateLabels()[0]).toBe('Deviated');
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
    expect(screen.getByText('The current item was Master on.')).toBeTruthy();
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

  it('shows items completed and the deviation count', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    expect(screen.getByText('Items completed').nextElementSibling?.textContent).toBe('4 / 4');
    expect(screen.getByText('Deviations').nextElementSibling?.textContent).toBe('2');
  });

  it('lists each deviation with the item it happened during', () => {
    renderPane();
    start(flow);
    finishFlowWithDeviations();
    const rows = within(screen.getByRole('region', { name: 'What differed from the checklist' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent);
    expect(rows).toEqual([
      'During item 1Avionics operatedThe current item was Master on.',
      'Item 2Fuel flowing checked off, condition not metThe item was checked off while its condition was not met.',
    ]);
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
    expect(trainer.screen).toBe('picker');
    expect(trainer.procedureId).toBeUndefined();
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

describe('visibility', () => {
  it('renders nothing without a running procedure', () => {
    const view = renderPane();
    expect(view.container.innerHTML).toBe('');
  });

  it('renders nothing in Free explore, even with a procedure in the session', () => {
    const view = renderPane();
    act(() => trainer.setMode('explore'));
    act(() => trainer.startProcedure(flow));
    expect(trainer.session.checklist()).toBeDefined();
    expect(view.container.innerHTML).toBe('');
  });

  it('is absent from the layout without a procedure, with no tablet toggle either', () => {
    renderWithLanguage(
      <ThemeProvider>
        <TrainerProvider>
          <TrainerLayout />
        </TrainerProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Checklist/ })).toBeNull();
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
