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
    stubRegion(400, 400);
    renderShell();
    await startProcedure();
    expect(layoutOf()).toBe('combined');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('region', { name: 'Main' })).toBeTruthy();
  });

  it('falls back to tabs when the region shrinks below a floor', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    stubRegion(400, 400);
    renderShell();
    await startProcedure();
    expect(layoutOf()).toBe('combined');
    stubRegion(399, 400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(layoutOf()).toBe('tabs');
  });

  it('keeps the checklist beside the cockpit in both', async () => {
    setWidth(DESKTOP_MIN_WIDTH);
    stubRegion(400, 400);
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

  describe('keeping the current item in view', () => {
    const scrollIntoView = vi.fn();
    let scrollTop = 0;

    function stubLayout(item: { top: number; bottom: number }) {
      const rectOf = ({ top, bottom }: { top: number; bottom: number }) =>
        ({ top, bottom, height: bottom - top }) as DOMRect;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        if (this.hasAttribute('aria-current')) return rectOf(item);
        if (this.tagName === 'ASIDE') return rectOf({ top: 100, bottom: 300 });
        return rectOf({ top: 0, bottom: 0 });
      });
      const aside = screen.getByRole('complementary', { name: 'Checklist' });
      Object.defineProperty(aside, 'scrollTop', {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value;
        },
      });
    }

    beforeEach(() => {
      scrollTop = 0;
      scrollIntoView.mockClear();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });

    it('scrolls the pane, and only the pane, down to an item below its edge', async () => {
      renderShell();
      await startProcedure();
      stubLayout({ top: 500, bottom: 560 });
      act(() => {
        trainer.session.set('master', 'on');
      });
      expect(scrollTop).toBe(260);
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('scrolls the pane up to an item above its edge', async () => {
      renderShell();
      await startProcedure();
      scrollTop = 400;
      stubLayout({ top: 40, bottom: 90 });
      act(() => {
        trainer.session.set('master', 'on');
      });
      expect(scrollTop).toBe(340);
    });

    it('leaves the pane alone when the item is already in view', async () => {
      renderShell();
      await startProcedure();
      scrollTop = 25;
      stubLayout({ top: 150, bottom: 200 });
      act(() => {
        trainer.session.set('master', 'on');
      });
      expect(scrollTop).toBe(25);
    });
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
  ])('header chip details on %s', (_name, width) => {
    beforeEach(() => setWidth(width));

    const chip = (name: RegExp | string) =>
      within(screen.getByRole('banner')).getByRole('button', { name });

    it('opens a dialog with the full aircraft name and procedure title on tap', async () => {
      renderShell();
      await startProcedure();
      const title = alpha.procedures[procedureId]?.title.en ?? '';
      const aircraftChip = chip(/^Aircraft/);
      expect(aircraftChip.getAttribute('aria-expanded')).toBe('false');
      expect(aircraftChip.getAttribute('aria-haspopup')).toBe('dialog');
      expect(aircraftChip.hasAttribute('title')).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();

      await userEvent.click(aircraftChip);
      expect(aircraftChip.getAttribute('aria-expanded')).toBe('true');
      const dialog = screen.getByRole('dialog', { name: 'Aircraft' });
      expect(aircraftChip.getAttribute('aria-controls')).toBe(dialog.id);
      expect(within(dialog).getByText(alpha.name.en)).toBeTruthy();

      await userEvent.click(chip(/^Procedure/));
      expect(aircraftChip.getAttribute('aria-expanded')).toBe('false');
      const procedureDialog = screen.getByRole('dialog', { name: 'Procedure' });
      expect(within(procedureDialog).getByText(title)).toBeTruthy();
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });

    it('closes on a second tap on the chip', async () => {
      renderShell();
      await startProcedure();
      const aircraftChip = chip(/^Aircraft/);
      await userEvent.click(aircraftChip);
      await userEvent.click(aircraftChip);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes on Escape and returns focus to the chip', async () => {
      renderShell();
      await startProcedure();
      const aircraftChip = chip(/^Aircraft/);
      await userEvent.click(aircraftChip);
      expect(document.activeElement).toBe(screen.getByRole('dialog'));
      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change aircraft' }));
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(aircraftChip);
    });

    it('closes when focus leaves it', async () => {
      renderShell();
      await startProcedure();
      await userEvent.click(chip(/^Aircraft/));
      await userEvent.tab();
      expect(screen.getByRole('dialog')).toBeTruthy();
      await userEvent.tab();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes on a tap outside', async () => {
      renderShell();
      await startProcedure();
      await userEvent.click(chip(/^Aircraft/));
      await userEvent.click(document.body);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('goes back to the picker from the aircraft dialog, not from the chip itself', async () => {
      renderShell();
      await startProcedure();
      await userEvent.click(chip(/^Aircraft/));
      expect(screen.queryByRole('heading', { name: 'Choose aircraft and procedure' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Change aircraft' }));
      expect(screen.getByRole('heading', { name: 'Choose aircraft and procedure' })).toBeTruthy();
    });

    it('goes back to the picker from the procedure dialog', async () => {
      renderShell();
      await startProcedure();
      await userEvent.click(chip(/^Procedure/));
      await userEvent.click(screen.getByRole('button', { name: 'Change procedure' }));
      expect(screen.getByRole('heading', { name: 'Choose aircraft and procedure' })).toBeTruthy();
    });
  });

  it('lets one Escape close only a header dialog, not the checklist drawer behind it, on a tablet', async () => {
    setWidth(DESKTOP_MIN_WIDTH - 1);
    renderShell();
    await startProcedure();
    await userEvent.click(checklistToggle());
    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: /^Aircraft/ }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
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
