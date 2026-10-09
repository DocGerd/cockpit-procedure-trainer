// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

// Transforms the trainer chunk once, so a test waits only on its gates.
beforeAll(async () => {
  await import('./TrainerLayout');
});

type Gate = { open(): void; fail(): void };

// Each import of the trainer chunk waits on its own gate, so a test decides when and how it settles.
let gates: Gate[];
let loadTrainerChunk: Mock<(importOriginal: () => Promise<object>) => Promise<object>>;

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  gates = [];
  loadTrainerChunk = vi.fn(async (importOriginal: () => Promise<object>) => {
    await new Promise<void>((open, fail) => {
      gates.push({ open, fail: () => fail(new Error('chunk failed')) });
    });
    return importOriginal();
  });
  vi.doMock('./TrainerLayout', (importOriginal) => loadTrainerChunk(importOriginal));
  // Holds back the idle prefetch, so only the test's own actions start a load.
  window.requestIdleCallback = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.doUnmock('./TrainerLayout');
  vi.unstubAllGlobals();
  delete (window as Partial<Window>).requestIdleCallback;
  vi.restoreAllMocks();
});

async function renderShell() {
  const [
    { Shell },
    { LanguageProvider },
    { ThemeProvider },
    { TrainerProvider },
    { TrainerErrorBoundary },
  ] = await Promise.all([
    import('./Shell'),
    import('../i18n'),
    import('../theme'),
    import('../trainer'),
    import('../errors/TrainerErrorBoundary'),
  ]);
  render(
    <LanguageProvider>
      <ThemeProvider>
        <TrainerProvider>
          <TrainerErrorBoundary>
            <Shell />
          </TrainerErrorBoundary>
        </TrainerProvider>
      </ThemeProvider>
    </LanguageProvider>,
  );
  const actions = document.querySelector<HTMLElement>('.picker-actions');
  if (!actions) throw new Error('The picker has no actions');
  return { actions, start: within(actions).getByRole('button', { name: 'Start procedure' }) };
}

// An awaited act lets React pick up a trainer that suspended on the chunk.
const click = (target: HTMLElement) =>
  act(async () => {
    fireEvent.click(target);
  });

const cockpitPanel = () => screen.findByRole('region', { name: 'Cockpit panel' });

it('keeps the trainer header and footer in place while the trainer screen loads', async () => {
  const { start } = await renderShell();
  await click(start);
  const shell = document.querySelector('.shell');
  expect(shell?.getAttribute('data-screen')).toBe('trainer');
  expect(shell?.hasAttribute('data-cockpit-layout')).toBe(false);
  expect(document.querySelector('.shell-body')?.childElementCount).toBe(0);
  expect(screen.getByRole('banner').dataset.variant).toBe('trainer');
  expect(screen.getByRole('contentinfo')).toBeTruthy();
  await vi.waitFor(() => expect(gates).toHaveLength(1));
  await act(async () => gates[0]?.open());
  expect(await cockpitPanel()).toBeTruthy();
});

it.each([
  ['pointerover', (target: HTMLElement) => fireEvent.pointerOver(target)],
  ['focusin', (target: HTMLElement) => fireEvent.focusIn(target)],
])('starts loading the trainer on %s of the picker actions', async (_, intent) => {
  const { actions } = await renderShell();
  expect(loadTrainerChunk).not.toHaveBeenCalled();
  intent(actions);
  await vi.waitFor(() => expect(loadTrainerChunk).toHaveBeenCalledTimes(1));
});

it('opens a loaded trainer at once, without a loading frame', async () => {
  const { actions, start } = await renderShell();
  fireEvent.pointerOver(actions);
  await vi.waitFor(() => expect(gates).toHaveLength(1));
  await act(async () => {
    gates[0]?.open();
    await loadTrainerChunk.mock.results[0]?.value;
  });
  fireEvent.click(start);
  expect(screen.getByRole('region', { name: 'Cockpit panel' })).toBeTruthy();
});

it('retries a failed trainer load and reloads the page when Reset is pressed', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const reload = vi.fn();
  vi.stubGlobal('location', { ...window.location, reload });
  const { start } = await renderShell();
  await click(start);
  await vi.waitFor(() => expect(gates).toHaveLength(1));
  await act(async () => gates[0]?.fail());
  const reset = await screen.findByRole('button', { name: 'Reset' });
  await click(reset);
  expect(reload).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(gates).toHaveLength(2));
  await act(async () => gates[1]?.open());
  expect(await cockpitPanel()).toBeTruthy();
});

it('retries a failed prefetch when the picker actions are used again', async () => {
  const { actions, start } = await renderShell();
  fireEvent.focusIn(actions);
  await vi.waitFor(() => expect(gates).toHaveLength(1));
  await act(async () => gates[0]?.fail());
  fireEvent.pointerOver(actions);
  await vi.waitFor(() => expect(gates).toHaveLength(2));
  await click(start);
  await act(async () => gates[1]?.open());
  expect(await cockpitPanel()).toBeTruthy();
});
