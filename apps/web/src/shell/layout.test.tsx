// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    <ThemeProvider>
      <TrainerProvider>
        <Probe />
        <Shell />
      </TrainerProvider>
    </ThemeProvider>,
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

  it('shows the pane without a header toggle', async () => {
    renderShell();
    await startProcedure();
    expect(
      within(screen.getByRole('banner')).queryByRole('button', { name: /^Checklist/ }),
    ).toBeNull();
  });

  it('names the aircraft and the procedure in the header, and goes back to the picker', async () => {
    renderShell();
    await startProcedure();
    const header = screen.getByRole('banner');
    const title = alpha.procedures[procedureId]?.title.en ?? '';
    expect(within(header).getByRole('button', { name: new RegExp(title) })).toBeTruthy();
    await userEvent.click(
      within(header).getByRole('button', { name: `Aircraft ${alpha.name.en}` }),
    );
    expect(screen.getByRole('heading', { name: 'Choose aircraft and procedure' })).toBeTruthy();
  });

  it('has no checklist and no procedure in Free explore', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Explore the cockpit' }));
    expect(screen.getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    expect(
      within(screen.getByRole('banner')).queryByRole('button', { name: /^Procedure/ }),
    ).toBeNull();
  });

  it('hides the checklist and the procedure when switching to Free explore mid-procedure', async () => {
    renderShell();
    await startProcedure();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('button', { name: /^Procedure/ })).toBeTruthy();
    act(() => trainer.setMode('explore'));
    expect(screen.queryByRole('complementary', { name: 'Checklist' })).toBeNull();
    expect(within(header).queryByRole('button', { name: /^Procedure/ })).toBeNull();
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
