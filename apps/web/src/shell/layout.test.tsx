// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { testAircraft } from '../trainer/test-aircraft';
import { DESKTOP_MIN_WIDTH } from './layout';
import { Shell } from './Shell';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

const [alpha] = testAircraft;
const procedureId = 'powerUp';
const itemCount = 2;

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderShell() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <TrainerProvider>
          <Probe />
          <Shell />
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

function setWidth(width: number) {
  vi.stubGlobal('innerWidth', width);
}

async function startProcedure() {
  await userEvent.click(screen.getByRole('button', { name: 'Start procedure' }));
}

const checklistToggle = () =>
  within(screen.getByRole('banner')).getByRole('button', { name: /^Checklist/ });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('the cockpit layout', () => {
  const layoutOf = () => document.querySelector('.shell')?.getAttribute('data-cockpit-layout');

  // jsdom lays nothing out: give the cockpit section a width and the window a height.
  function stubRegion(width: number, height: number) {
    vi.stubGlobal('innerHeight', height);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  }

  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['desktop', DESKTOP_MIN_WIDTH],
    ['tablet', DESKTOP_MIN_WIDTH - 1],
  ])('is tabs until the region holds every view at its floor, on a %s shell', async (_, width) => {
    setWidth(width);
    renderShell();
    await startProcedure();
    expect(layoutOf()).toBe('tabs');
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it.each([
    ['desktop', DESKTOP_MIN_WIDTH],
    ['tablet', DESKTOP_MIN_WIDTH - 1],
  ])('is combined once the region reaches the floors, on a %s shell', async (_, width) => {
    setWidth(width);
    stubRegion(400, 500);
    renderShell();
    await startProcedure();
    expect(layoutOf()).toBe('combined');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('region', { name: 'Main' })).toBeTruthy();
  });

  it('falls back to tabs when the region shrinks below a floor', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    stubRegion(400, 500);
    renderShell();
    await startProcedure();
    expect(layoutOf()).toBe('combined');
    stubRegion(399, 500);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(layoutOf()).toBe('tabs');
  });

  it('keeps the checklist beside the cockpit in both', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    stubRegion(400, 500);
    renderShell();
    await startProcedure();
    expect(screen.getByRole('complementary', { name: 'Checklist' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Outside view' })).toBeTruthy();
  });
});

describe('trainer layout on desktop', () => {
  beforeEach(() => setWidth(DESKTOP_MIN_WIDTH));

  it('has the header, outside view, panel and checklist regions', async () => {
    renderShell();
    await startProcedure();
    expect(screen.getByRole('banner')).toBeTruthy();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('region', { name: 'Outside view' })).toBeTruthy();
    expect(within(main).getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Checklist' })).toBeTruthy();
    expect(document.querySelector('[data-layout]')?.getAttribute('data-layout')).toBe('desktop');
  });

  it('marks the trainer header and the picker header apart, in either layout', async () => {
    renderShell();
    expect(screen.getByRole('banner').dataset.variant).toBe('picker');
    await startProcedure();
    expect(screen.getByRole('banner').dataset.variant).toBe('trainer');
    expect(document.querySelector('.shell')?.getAttribute('data-screen')).toBe('trainer');
    setWidth(DESKTOP_MIN_WIDTH - 1);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(document.querySelector('[data-layout]')?.getAttribute('data-layout')).toBe('tablet');
    expect(screen.getByRole('banner').dataset.variant).toBe('trainer');
  });

  it('shows the pane without a header toggle', async () => {
    renderShell();
    await startProcedure();
    expect(
      within(screen.getByRole('banner')).queryByRole('button', { name: /^Checklist/ }),
    ).toBeNull();
  });

  it('names the aircraft and the procedure in the header', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    renderShell();
    await startProcedure();
    const header = screen.getByRole('banner');
    const title = alpha.procedures[procedureId]?.title.en ?? '';
    expect(within(header).getByRole('button', { name: new RegExp(title) })).toBeTruthy();
    expect(within(header).getByRole('button', { name: `Aircraft ${alpha.name.en}` })).toBeTruthy();
  });

  describe.each([
    ['a tablet', DESKTOP_MIN_WIDTH - 1],
    ['a desktop', DESKTOP_MIN_WIDTH],
    ['a wide desktop', 1920],
  ])('header chips on %s', (_name, width) => {
    beforeEach(() => setWidth(width));

    const chip = (name: RegExp | string) =>
      within(screen.getByRole('banner')).getByRole('button', { name });
    const picker = () => screen.queryByRole('heading', { name: 'Choose aircraft and procedure' });
    const doItem = () => act(() => trainer.session.set('master', 'on'));

    it('act in one step: no popover between the chip and its action', async () => {
      renderShell();
      await startProcedure();
      const aircraftChip = chip(/^Aircraft/);
      expect(aircraftChip.hasAttribute('aria-haspopup')).toBe(false);
      expect(aircraftChip.hasAttribute('aria-expanded')).toBe(false);
      expect(aircraftChip.getAttribute('title')).toBe(`Change aircraft: ${alpha.name.en}`);
      const title = alpha.procedures[procedureId]?.title.en ?? '';
      expect(chip(/^Procedure/).getAttribute('title')).toBe(`Change procedure: ${title}`);
      await userEvent.click(aircraftChip);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(picker()).toBeTruthy();
    });

    it('opens the picker from the procedure chip at once when nothing is done', async () => {
      renderShell();
      await startProcedure();
      await userEvent.click(chip(/^Procedure/));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(picker()).toBeTruthy();
      expect(trainer.procedureId).toBeUndefined();
    });

    it.each([
      ['Aircraft', 'Change aircraft'],
      ['Procedure', 'Change procedure'],
    ])(
      'asks before the %s chip discards progress, naming what is lost',
      async (eyebrow, action) => {
        renderShell();
        await startProcedure();
        doItem();
        await userEvent.click(chip(new RegExp(`^${eyebrow}`)));
        const dialog = screen.getByRole('alertdialog', { name: `${action}?` });
        expect(dialog.textContent).toContain(`Progress lost: 1 of ${itemCount} items done.`);
        expect(picker()).toBeNull();
        expect(within(dialog).getByRole('button', { name: action })).toBeTruthy();

        await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(picker()).toBeNull();
        expect(trainer.procedureId).toBe(procedureId);

        await userEvent.click(chip(new RegExp(`^${eyebrow}`)));
        await userEvent.click(
          within(screen.getByRole('alertdialog')).getByRole('button', { name: action }),
        );
        expect(picker()).toBeTruthy();
        expect(trainer.procedureId).toBeUndefined();
      },
    );

    it('asks when only a deviation is recorded and counts it', async () => {
      renderShell();
      await startProcedure();
      act(() => trainer.session.set('pump', 'on'));
      await userEvent.click(chip(/^Aircraft/));
      expect(screen.getByRole('alertdialog').textContent).toContain(
        `0 of ${itemCount} items done, 1 deviation.`,
      );
    });

    it('does not ask once the run is finished', async () => {
      renderShell();
      await startProcedure();
      doItem();
      act(() => trainer.session.set('pump', 'on'));
      await userEvent.click(chip(/^Aircraft/));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(picker()).toBeTruthy();
    });

    it('asks in German', async () => {
      renderShell();
      await userEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
      await userEvent.click(screen.getByRole('button', { name: 'Verfahren starten' }));
      doItem();
      await userEvent.click(chip(/^Flugzeug/));
      const dialog = screen.getByRole('alertdialog', { name: 'Flugzeug wechseln?' });
      expect(dialog.textContent).toContain(`1 von ${itemCount} Punkten erledigt`);
      expect(within(dialog).getByRole('button', { name: 'Flugzeug wechseln' })).toBeTruthy();
      expect(within(dialog).getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
    });
  });

  it('names the progress a phase jump ends in its confirm dialog', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    renderShell();
    await startProcedure();
    act(() => trainer.session.set('master', 'on'));
    await userEvent.selectOptions(screen.getByLabelText('Start in phase'), 'cruise');
    const dialog = screen.getByRole('alertdialog', { name: 'Jump to phase “Cruise”?' });
    expect(dialog.textContent).toContain(`Progress lost: 1 of ${itemCount} items done.`);
  });

  it('lets one Escape close only the confirm dialog, not the checklist drawer behind it, on a tablet', async () => {
    setWidth(DESKTOP_MIN_WIDTH - 1);
    renderShell();
    await startProcedure();
    act(() => trainer.session.set('master', 'on'));
    await userEvent.click(checklistToggle());
    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: /^Aircraft/ }),
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Checklist' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
  });

  it('shows a read-only checklist and no procedure in Free explore', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the cockpit' }));
    expect(screen.getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    expect(within(aside).getByRole('combobox', { name: 'Show checklist' })).toBeTruthy();
    expect(within(aside).getByRole('heading', { name: 'Alpha power up' })).toBeTruthy();
    expect(within(aside).queryByRole('img')).toBeNull();
    expect(
      within(screen.getByRole('banner')).queryByRole('button', { name: /^Procedure/ }),
    ).toBeNull();
  });

  it('ends the procedure but keeps its checklist readable when switching to Free explore mid-procedure', async () => {
    renderShell();
    await startProcedure();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('button', { name: /^Procedure/ })).toBeTruthy();
    act(() => trainer.setMode('explore'));
    expect(trainer.session.procedureId()).toBeUndefined();
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    expect(within(aside).getByRole('heading', { name: 'Alpha power up' })).toBeTruthy();
    expect(within(aside).queryByRole('img')).toBeNull();
    expect(within(header).queryByRole('button', { name: /^Procedure/ })).toBeNull();
  });

  it('ticks nothing in the Free explore checklist when the panel is operated', async () => {
    renderShell();
    await startProcedure();
    act(() => trainer.setMode('explore'));
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    const before = aside.innerHTML;
    act(() => trainer.session.set('master', 'on'));
    expect(aside.innerHTML).toBe(before);
    expect(trainer.session.checklist()).toBeUndefined();
  });

  it('lets a Guided user read the emergency checklist without leaving the running one', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: /^Bravo/ }));
    await userEvent.click(screen.getByRole('button', { name: /Bravo power up/ }));
    await startProcedure();
    const aside = screen.getByRole('complementary', { name: 'Checklist' });
    await userEvent.selectOptions(within(aside).getByRole('combobox'), 'fire');
    expect(within(aside).getByRole('heading', { name: 'Bravo engine fire' })).toBeTruthy();
    expect(trainer.procedureId).toBe('powerUp');
    await userEvent.click(
      within(aside).getByRole('button', { name: 'Back to running checklist: Bravo power up' }),
    );
    expect(within(aside).getByRole('heading', { name: 'Bravo power up' })).toBeTruthy();
    expect(within(aside).getAllByRole('img')).not.toHaveLength(0);
  });

  it.each(['guided', 'practice'] as const)(
    'brings the running checklist back when switching from Free explore to %s',
    async (mode) => {
      renderShell();
      await startProcedure();
      act(() => trainer.setMode('explore'));
      expect(screen.queryAllByRole('img', { name: /^(Done|Current|Pending)$/ })).toHaveLength(0);
      act(() => trainer.setMode(mode));
      expect(
        within(screen.getByRole('complementary', { name: 'Checklist' })).getAllByRole('img'),
      ).not.toHaveLength(0);
      expect(
        within(screen.getByRole('banner')).getByRole('button', { name: /^Procedure/ }),
      ).toBeTruthy();
    },
  );

  it('returns to the picker when switching from Free explore without a procedure', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the cockpit' }));
    act(() => trainer.setMode('practice'));
    expect(screen.getByRole('heading', { name: 'Choose aircraft and procedure' })).toBeTruthy();
    expect((screen.getByRole('radio', { name: /^Practice/ }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('keeps the checklist behind its header toggle on a tablet in every mode', async () => {
    setWidth(DESKTOP_MIN_WIDTH - 1);
    renderShell();
    await startProcedure();
    act(() => trainer.setMode('explore'));
    expect(checklistToggle().textContent).not.toContain('/');
    await userEvent.click(checklistToggle());
    expect(
      within(screen.getByRole('complementary', { name: 'Checklist' })).getByRole('heading', {
        name: 'Alpha power up',
      }),
    ).toBeTruthy();
    act(() => trainer.setMode('guided'));
    expect(checklistToggle().textContent).toContain(`0 / ${itemCount}`);
  });

  it('leaves the tablet drawer as the user left it when the mode changes', async () => {
    setWidth(DESKTOP_MIN_WIDTH - 1);
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    act(() => trainer.setMode('explore'));
    act(() => trainer.setMode('guided'));
    expect(checklistToggle().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Checklist' })).toBeTruthy();
  });

  it('drops the procedure from the header after a phase jump, also after a reset, and keeps the checklist as a read-only reference', async () => {
    renderShell();
    await startProcedure();
    const header = screen.getByRole('banner');
    act(() => trainer.jumpToPhase('cruise'));
    expect(within(header).queryByRole('button', { name: /^Procedure/ })).toBeNull();
    expect(
      within(screen.getByRole('complementary', { name: 'Checklist' })).queryByRole('img'),
    ).toBeNull();
    act(() => trainer.resetSession());
    expect(within(header).queryByRole('button', { name: /^Procedure/ })).toBeNull();
    expect(
      within(screen.getByRole('complementary', { name: 'Checklist' })).queryByRole('img'),
    ).toBeNull();
  });

  it('shows the UAT badge in a UAT build only', async () => {
    vi.stubEnv('VITE_DEPLOY_ENV', 'uat');
    renderShell();
    await startProcedure();
    expect(within(screen.getByRole('banner')).getByText('UAT')).toBeTruthy();
    cleanup();
    vi.stubEnv('VITE_DEPLOY_ENV', 'prod');
    renderShell();
    await startProcedure();
    expect(within(screen.getByRole('banner')).queryByText('UAT')).toBeNull();
  });
});

describe('trainer layout on a tablet', () => {
  beforeEach(() => setWidth(DESKTOP_MIN_WIDTH - 1));

  it('collapses the checklist to a header toggle showing progress', async () => {
    renderShell();
    await startProcedure();
    expect(document.querySelector('[data-layout]')?.getAttribute('data-layout')).toBe('tablet');
    const toggle = checklistToggle();
    expect(toggle.textContent).toContain(`0 / ${itemCount}`);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
  });

  it('updates the progress as items complete', async () => {
    renderShell();
    await startProcedure();
    act(() => {
      trainer.session.set('master', 'on');
    });
    expect(checklistToggle().textContent).toContain(`1 / ${itemCount}`);
  });

  it('expands the pane over the panel and closes it with the same toggle', async () => {
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    expect(checklistToggle().getAttribute('aria-expanded')).toBe('true');
    const pane = screen.getByRole('complementary', { name: 'Checklist' });
    expect(checklistToggle().getAttribute('aria-controls')).toBe(pane.id);
    expect(pane.dataset.overlay).toBe('true');
    await userEvent.click(checklistToggle());
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
  });

  it('shows a deviation on the closed toggle in Guided, with a count and an accessible name', async () => {
    renderShell();
    await startProcedure();
    expect(checklistToggle().getAttribute('aria-label')).toBeNull();
    expect(document.querySelector('.shell-deviation-badge')).toBeNull();
    act(() => {
      trainer.session.set('pump', 'on');
    });
    expect(checklistToggle().getAttribute('aria-label')).toBe(
      `Checklist 0 / ${itemCount}, 1 deviation`,
    );
    expect(checklistToggle().querySelector('.shell-deviation-badge')?.textContent).toBe('1');
  });

  it('shows no deviation on the toggle in Practice', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('radio', { name: /Practice/ }));
    await startProcedure();
    act(() => {
      trainer.session.set('pump', 'on');
    });
    expect(checklistToggle().getAttribute('aria-label')).toBeNull();
    expect(checklistToggle().querySelector('.shell-deviation-badge')).toBeNull();
    expect(checklistToggle().textContent).toContain(`0 / ${itemCount}`);
  });

  it('opens the pane with the summary when the procedure completes', async () => {
    renderShell();
    await startProcedure();
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
    });
    const pane = screen.getByRole('complementary', { name: 'Checklist' });
    expect(within(pane).getByRole('heading', { name: /complete$/ })).toBeTruthy();
    expect(checklistToggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the pane on a tap outside it and on Escape', async () => {
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    await userEvent.click(screen.getByTestId('checklist-scrim'));
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    await userEvent.click(checklistToggle());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
  });

  it('switches to the desktop layout when the window grows', async () => {
    renderShell();
    await startProcedure();
    act(() => {
      setWidth(DESKTOP_MIN_WIDTH);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByRole('complementary', { name: 'Checklist' }).dataset.overlay).toBe('false');
  });
});

describe('the tablet drawer from the keyboard', () => {
  beforeEach(() => setWidth(DESKTOP_MIN_WIDTH - 1));

  const pane = () => screen.getByRole('complementary', { name: 'Checklist' });

  it('puts focus on the checklist toggle after the procedure starts', async () => {
    renderShell();
    await startProcedure();
    expect(document.activeElement).toBe(checklistToggle());
  });

  it('moves focus into the drawer when it opens', async () => {
    renderShell();
    await startProcedure();
    await userEvent.keyboard('{Enter}');
    expect(pane().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(within(pane()).getByRole('combobox'));
  });

  it('returns focus to the toggle on Escape and on a tap outside', async () => {
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(checklistToggle());
    await userEvent.click(checklistToggle());
    await userEvent.click(screen.getByTestId('checklist-scrim'));
    expect(document.activeElement).toBe(checklistToggle());
  });

  it('leaves focus that moved outside the drawer where it is when the drawer closes', async () => {
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    const tab = screen.getAllByRole('tab')[0] as HTMLElement;
    act(() => tab.focus());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    expect(document.activeElement).toBe(tab);
  });

  it('keeps Tab between the drawer and its toggle, not the panel behind it', async () => {
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    const buttons = within(pane()).getAllByRole('button');
    act(() => buttons.at(-1)?.focus());
    await userEvent.tab();
    expect(document.activeElement).toBe(checklistToggle());
    act(() => within(pane()).getByRole('combobox').focus());
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(checklistToggle());
  });

  it('leaves the summary heading focused when the drawer opens on completion', async () => {
    renderShell();
    await startProcedure();
    act(() => {
      trainer.session.set('master', 'on');
      trainer.session.set('pump', 'on');
    });
    expect(document.activeElement).toBe(within(pane()).getByRole('heading', { name: /complete$/ }));
  });
});
