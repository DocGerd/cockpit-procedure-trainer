// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import { act, cleanup, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerLayout } from '../shell/TrainerLayout';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useSessionState, useTrainer } from '../trainer';
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
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    operate('avionics', 'on');
    expect(screen.getByRole('status')).toBe(status);
    expect(within(status).getByText('Avionics operated. Not part of item 1.')).toBeTruthy();
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
    expect(screen.getByText('gps.power operated')).toBeTruthy();
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
    expect(screen.queryByRole('button', { name: /^(Check off|Confirm|Restart)$/ })).toBeNull();
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
      const rect = this === aside ? { top: 0, bottom: 100 } : { top: 200, bottom: 240 };
      return { ...rect, left: 0, right: 0, width: 0, height: 0, x: 0, y: rect.top } as DOMRect;
    });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Show checklist' }),
      'followUp',
    );
    expect(aside.scrollTop).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Back to running checklist: Flow' }));
    expect(aside.scrollTop).toBe(140);
    vi.restoreAllMocks();
  });
});

describe('scrolling the running checklist', () => {
  const rectOf = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top }) as DOMRect;

  afterEach(() => vi.restoreAllMocks());

  it('keeps the current item inside the list, which scrolls apart from header and footer', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this === list) return rectOf(0, 100);
      return this.getAttribute('aria-current') === 'step' ? rectOf(200, 240) : rectOf(0, 0);
    });
    operate('avionics', 'on');
    expect(list.scrollTop).toBe(140);
  });

  it('scrolls back up to a current item above the list', () => {
    renderPane();
    start(flow);
    const list = screen.getByRole('list');
    list.scrollTop = 300;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this === list) return rectOf(100, 200);
      return this.getAttribute('aria-current') === 'step' ? rectOf(60, 100) : rectOf(0, 0);
    });
    operate('avionics', 'on');
    expect(list.scrollTop).toBe(260);
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
    expect(screen.getByRole('status').textContent).toContain('Avionics operated');
  });

  it('shows no deviation notice in Practice while another checklist is read', async () => {
    renderPane();
    start(flow, 'practice');
    await view('followUp');
    operate('avionics', 'on');
    expect(screen.queryByText('Deviation')).toBeNull();
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
    act(() => trainer.jumpToPhase('airborne'));
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
