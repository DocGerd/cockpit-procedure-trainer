// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import type { CockpitLayoutChoice } from '../panel/cockpit-layout';
import { PanelArea } from '../panel/PanelArea';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { useDock } from './dock-state';

const state = vi.hoisted(() => ({
  withDock: true,
  floor: undefined as object | undefined,
  api: undefined as { open(installId: string): void } | undefined,
}));

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-fixtures');
  const cell = (x: number, y: number, w: number, h: number) => ({
    rect: { x, y, w, h },
    minWidth: 100,
  });
  const dockCell = cell(0, 200, 400, 100);
  return {
    get aircraftRegistry() {
      return [
        {
          ...fixtures.aircraft,
          cockpit: {
            size: { width: 400, height: 300 },
            views: { main: cell(0, 0, 400, 100), side: cell(0, 100, 400, 100) },
            ...(state.withDock && { dock: dockCell }),
          },
        } as unknown as Aircraft,
      ];
    },
  };
});

vi.mock('../device-registry', async () => {
  const fixtures = await import('./test-fixtures');
  return {
    deviceRegistry: fixtures.devices,
    deviceScreens: fixtures.deviceScreens,
    deviceEntries: fixtures.deviceEntries,
  };
});

vi.mock('./dock-floor', () => ({ deviceFloor: () => state.floor }));

// Stands in for the slot mirrors: one button per installed device that docks it.
vi.mock('./DeviceLayer', () => ({
  DeviceLayer({ rects }: { rects: { devices: Record<string, unknown> } }) {
    const dock = useDock();
    state.api = dock;
    return Object.keys(rects.devices).map((installId) => (
      <button key={installId} type="button" onClick={() => dock?.open(installId)}>
        {`Slot ${installId}`}
      </button>
    ));
  },
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const render = (layout?: CockpitLayoutChoice) =>
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <PanelArea {...(layout && { layout })} />
    </TrainerProvider>,
    { language: 'en' },
  );

const undocked = {
  kind: 'combined',
  scale: 1,
  width: 400,
  height: 300,
  cells: [
    { viewId: 'main', left: 0, top: 0, width: 400, height: 100, fitWidth: 400 },
    { viewId: 'side', left: 0, top: 100, width: 400, height: 100, fitWidth: 400 },
  ],
} as const satisfies CockpitLayoutChoice;

const combined: CockpitLayoutChoice = {
  ...undocked,
  dock: { left: 0, top: 200, width: 400, height: 100 },
};

const dock = () => screen.queryByRole('region', { name: 'Device dock' });
const slot = (installId: string) => screen.getByRole('button', { name: `Slot ${installId}` });

beforeEach(() => {
  localStorage.clear();
  state.withDock = true;
  state.floor = undefined;
});

afterEach(cleanup);

describe('the device dock in the tabs layout', () => {
  it('starts empty, with a hint, below the tab panel', () => {
    render();
    const region = dock();
    expect(region?.getAttribute('data-dock')).toBe('empty');
    expect(region?.textContent).toBe('Select a device on the panel to operate it here.');
    const panel = screen.getByRole('tabpanel');
    expect(panel.compareDocumentPosition(region as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(panel.contains(region)).toBe(false);
  });

  it('keeps its hint out of the panel', () => {
    render();
    const surface = document.querySelector('[data-panel-surface]');
    expect(surface?.contains(screen.getByText(/to operate it here/))).toBe(false);
  });

  it('shows the operable screen of the device a slot activates, and no modal', async () => {
    render();
    await userEvent.click(slot('radio'));
    const region = within(dock() as HTMLElement);
    expect(dock()?.getAttribute('data-dock')).toBe('held');
    expect(dock()?.querySelector('[data-dock-device]')?.getAttribute('data-dock-device')).toBe(
      'radio',
    );
    await userEvent.click(region.getByRole('button', { name: 'Page B' }));
    expect(trainer.session.state().controls['radio.page']).toBe('b');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('tabpanel')).toBeTruthy();
  });

  it('holds one device at a time: another slot swaps it', async () => {
    render();
    await userEvent.click(slot('radio'));
    await userEvent.click(slot('spare'));
    const docked = dock()?.querySelectorAll('[data-dock-device]');
    expect([...(docked ?? [])].map((element) => element.getAttribute('data-dock-device'))).toEqual([
      'spare',
    ]);
    expect(within(dock() as HTMLElement).queryByRole('button', { name: 'Page B' })).toBeNull();
  });

  it('empties with the close button and shows the hint again', async () => {
    render();
    await userEvent.click(slot('radio'));
    await userEvent.click(screen.getByRole('button', { name: 'Close device' }));
    expect(dock()?.getAttribute('data-dock')).toBe('empty');
    expect(dock()?.querySelector('[data-dock-device]')).toBeNull();
  });

  it.each([
    ['en', 'Close', 'Close device'],
    ['de', 'Schließen', 'Gerät schließen'],
  ] as const)('prints a text label on the close button in %s', async (language, label, name) => {
    renderWithLanguage(
      <TrainerProvider>
        <PanelArea />
      </TrainerProvider>,
      { language },
    );
    await userEvent.click(slot('radio'));
    const close = screen.getByRole('button', { name });
    expect(close.textContent).toBe(label);
    expect(close.getAttribute('aria-label')?.toLowerCase()).toContain(label.toLowerCase());
  });

  it('gives focus back to the slot that opened it when it empties', async () => {
    render();
    await userEvent.click(slot('radio'));
    expect(document.activeElement).toBe(slot('radio'));
    await userEvent.click(screen.getByRole('button', { name: 'Close device' }));
    expect(document.activeElement).toBe(slot('radio'));
  });

  it('keeps the device across tab switches', async () => {
    render();
    await userEvent.click(slot('radio'));
    await userEvent.click(screen.getByRole('tab', { name: 'Side' }));
    expect(dock()?.getAttribute('data-dock')).toBe('held');
  });

  it('sizes the device box from its floor', async () => {
    state.floor = { width: 520, height: 150 };
    render();
    await userEvent.click(slot('radio'));
    const box = dock()?.querySelector<HTMLElement>('[data-dock-device]');
    expect(box?.style.getPropertyValue('--dock-floor-width')).toBe('520');
    expect(box?.style.getPropertyValue('--dock-floor-height')).toBe('150');
  });

  it('is absent for an aircraft that declares no dock', () => {
    state.withDock = false;
    render();
    expect(dock()).toBeNull();
  });

  it('ignores an install the aircraft does not have', () => {
    render();
    act(() => state.api?.open('nope'));
    expect(dock()?.getAttribute('data-dock')).toBe('empty');
  });
});

describe('the device dock in the combined layout', () => {
  it('sits in its cell of the arrangement', () => {
    render(combined);
    const region = dock();
    expect(region?.hasAttribute('data-placed')).toBe(true);
    expect(region?.style.left).toBe('0px');
    expect(region?.style.top).toBe('200px');
    expect(region?.style.width).toBe('400px');
    expect(region?.style.height).toBe('100px');
    expect(region?.closest('[data-cockpit="combined"]')).not.toBeNull();
  });

  it('docks the device of a slot in any view', async () => {
    render(combined);
    await userEvent.click(slot('radio'));
    expect(dock()?.querySelector('[data-dock-device]')?.getAttribute('data-dock-device')).toBe(
      'radio',
    );
  });

  it('is absent when the arrangement places none', () => {
    render({ ...undocked });
    expect(dock()).toBeNull();
  });
});
