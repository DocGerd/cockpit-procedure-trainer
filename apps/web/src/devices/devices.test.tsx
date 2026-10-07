// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PanelArea } from '../panel/PanelArea';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { aircraft, deviceScreens, devices, screenInput } from './test-fixtures';

const state = vi.hoisted(() => ({ withDock: false }));

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-fixtures');
  const withDock = {
    ...fixtures.aircraft,
    cockpit: {
      size: { width: 400, height: 300 },
      views: {},
      dock: { rect: { x: 0, y: 200, w: 400, h: 100 }, minWidth: 100 },
    },
  } as unknown as typeof fixtures.aircraft;
  return {
    get aircraftRegistry() {
      return [state.withDock ? withDock : fixtures.aircraft];
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

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderPanel(language: 'de' | 'en' = 'en') {
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <PanelArea />
    </TrainerProvider>,
    { language },
  );
}

const placement = (id: string) => document.querySelector<HTMLElement>(`[data-placement="${id}"]`);
const frame = (installId: string) => {
  const found = placement(installId)?.querySelector<HTMLElement>('[data-device-frame]');
  if (!found) throw new Error(`no screen frame at ${installId}`);
  return found;
};
const controls = () => trainer.session.state().controls;
const powerBus = () => act(() => void trainer.session.set('bus', 'on'));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('device layer', () => {
  it('has the fixture wired to the real contract', () => {
    expect(devices.map((device) => device.id)).toEqual(['fixture-radio', 'fixture-unscreened']);
    expect(Object.keys(deviceScreens)).toEqual(['fixture-radio']);
    expect(Object.keys(aircraft.devices ?? {})).toEqual(['radio', 'spare', 'far']);
  });

  it('draws the screen at its placement as a percent box of the panel', () => {
    renderPanel();
    const radio = placement('radio');
    expect(radio?.getAttribute('data-kind')).toBe('device');
    expect(radio?.style.left).toBe('20%');
    expect(radio?.style.top).toBe('0%');
    expect(radio?.style.width).toBe('20%');
    expect(radio?.style.height).toBe('100%');
    expect(radio?.contains(screen.getByRole('button', { name: 'Page B' }))).toBe(true);
  });

  it('shows only the devices installed in the active view', async () => {
    renderPanel();
    expect(placement('far')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Side' }));
    expect(placement('far')).not.toBeNull();
    expect(placement('radio')).toBeNull();
  });

  it('routes a set from the screen to the install-scoped control', async () => {
    renderPanel();
    expect(controls()['radio.page']).toBe('a');
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    expect(controls()['radio.page']).toBe('b');
    expect(controls()['far.page']).toBe('a');
  });

  it('routes press and release from the screen', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Key down' }));
    expect(controls()['radio.key']).toBe('down');
    await userEvent.click(screen.getByRole('button', { name: 'Key up' }));
    expect(controls()['radio.key']).toBe('up');
  });

  it('routes a press with a position to the install-scoped control', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Knob right' }));
    expect(controls()['radio.knob']).toBe('right');
    await userEvent.click(screen.getByRole('button', { name: 'Knob release' }));
    expect(controls()['radio.knob']).toBe('rest');
  });

  it('throws in development when a screen sets a control without a position', () => {
    renderPanel();
    expect(() => screenInput.send?.('page', 'set')).toThrow(/radio\.page.*without a position/);
    expect(controls()['radio.page']).toBe('a');
  });

  it('logs instead of throwing in production when a screen sets without a position', () => {
    vi.stubEnv('DEV', false);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPanel();
    expect(() => screenInput.send?.('page', 'set')).not.toThrow();
    expect(log).toHaveBeenCalledOnce();
    expect(controls()['radio.page']).toBe('a');
  });

  it('draws the screen from the device state in the session', () => {
    renderPanel();
    powerBus();
    expect(within(frame('radio')).getByText('a')).toBeTruthy();
    act(() => void trainer.session.set('radio.page', 'b'));
    expect(within(frame('radio')).getByText('b')).toBeTruthy();
  });

  it('keeps the screen dark while its bus is unpowered and lights it when powered', () => {
    renderPanel();
    expect(frame('radio').getAttribute('data-on')).toBe('false');
    expect(frame('radio').querySelector('[data-screen-off]')).not.toBeNull();
    expect(frame('radio').querySelector('[data-readout]')?.textContent).toBe('');

    powerBus();
    expect(frame('radio').getAttribute('data-on')).toBe('true');
    expect(frame('radio').querySelector('[data-screen-off]')).toBeNull();
    expect(frame('radio').querySelector('[data-readout]')?.textContent).toBe('a');

    act(() => void trainer.session.set('bus', 'off'));
    expect(frame('radio').getAttribute('data-on')).toBe('false');
  });

  it('keeps input working on an unpowered screen', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    expect(controls()['radio.page']).toBe('b');
  });

  it('shows a labelled placeholder for a device without a registered screen', () => {
    renderPanel();
    const spare = placement('spare');
    expect(spare?.querySelector('[data-device-frame]')).toBeNull();
    expect(
      within(spare as HTMLElement).getByRole('img', { name: 'No screen for fixture-unscreened' }),
    ).toBeTruthy();
  });

  it('localizes the placeholder label', () => {
    renderPanel('de');
    expect(
      screen.getByRole('img', { name: 'Kein Bildschirm für fixture-unscreened' }),
    ).toBeTruthy();
  });

  it('keeps the device state across a view switch', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Page B' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Side' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Main' }));
    expect(controls()['radio.page']).toBe('b');
    powerBus();
    expect(within(frame('radio')).getByText('b')).toBeTruthy();
  });
});

describe('device controls in Free explore', () => {
  const enterExplore = () => act(() => trainer.setMode('explore'));

  it('selects the device control instead of operating it while operating is off', async () => {
    renderPanel();
    enterExplore();
    const set = vi.spyOn(trainer.session, 'set');
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    expect(set).not.toHaveBeenCalled();
    expect(controls()['radio.page']).toBe('a');
    const details = screen.getByRole('dialog', { name: 'Page' });
    expect(within(details).getByText('Rotary')).toBeTruthy();
    expect(within(details).getByText('Main')).toBeTruthy();
    expect(
      within(within(details).getByRole('list', { name: 'Positions' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['a · current', 'b']);
  });

  it("outlines the selected device control's install", async () => {
    renderPanel();
    enterExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Knob right' }));
    expect(screen.getByRole('dialog', { name: 'Knob' })).toBeTruthy();
    const outline = document.querySelector<HTMLElement>('[data-outline="selected"]');
    expect(outline?.style.left).toBe(placement('radio')?.style.left);
    expect(outline?.style.width).toBe(placement('radio')?.style.width);
  });

  it('localizes the device control details', async () => {
    renderPanel('de');
    enterExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    expect(screen.getByRole('dialog', { name: 'Page (de)' })).toBeTruthy();
  });

  it('operates the device control with operating on', async () => {
    renderPanel();
    enterExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Operate controls/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Page B' }));
    expect(controls()['radio.page']).toBe('b');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('slot mirrors', () => {
  const dock = () => screen.getByRole('region', { name: 'Device dock' });
  const slotButtons = (installId: string) =>
    within(placement(installId) as HTMLElement).queryAllByRole('button');

  beforeEach(() => {
    state.withDock = true;
  });

  afterEach(() => {
    state.withDock = false;
  });

  it('mirrors each screened device with no operable keys in the slot', () => {
    renderPanel();
    expect(placement('radio')?.querySelector('[data-slot-mirror]')).not.toBeNull();
    expect(placement('radio')?.querySelector('[data-device-frame]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Page B' })).toBeNull();
  });

  it('puts exactly one named button in the slot, the unit name then the readout', async () => {
    renderPanel();
    expect(slotButtons('radio').map((button) => button.getAttribute('aria-label'))).toEqual([
      'fixture-radio: Off',
    ]);
    powerBus();
    expect(slotButtons('radio').map((button) => button.getAttribute('aria-label'))).toEqual([
      'fixture-radio: Page a',
    ]);
  });

  it('localizes the readout in the accessible name', () => {
    renderPanel('de');
    powerBus();
    expect(screen.getByRole('button', { name: 'fixture-radio: Seite a' })).toBeTruthy();
  });

  it('updates with the device state', () => {
    renderPanel();
    powerBus();
    expect(within(placement('radio') as HTMLElement).getByText('a')).toBeTruthy();
    act(() => void trainer.session.set('radio.page', 'b'));
    expect(within(placement('radio') as HTMLElement).getByText('b')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'fixture-radio: Page b' })).toBeTruthy();
  });

  it('asks the dock for the slot device on activation and leaves the device untouched', async () => {
    renderPanel();
    expect(dock().getAttribute('data-dock')).toBe('empty');
    await userEvent.click(screen.getByRole('button', { name: 'fixture-radio: Off' }));
    expect(dock().getAttribute('data-dock')).toBe('held');
    expect(within(dock()).getByRole('button', { name: 'Page B' })).toBeTruthy();
    expect(controls()['radio.page']).toBe('a');
  });

  it('docks the device of the activated slot, swapping the one held', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Side' }));
    await userEvent.click(screen.getByRole('button', { name: 'fixture-radio: Off' }));
    expect(dock().querySelector('[data-dock-device]')?.getAttribute('data-dock-device')).toBe(
      'far',
    );
  });

  it('keeps the placeholder for a device without a screen', () => {
    renderPanel();
    expect(placement('spare')?.querySelector('[data-slot-mirror]')).toBeNull();
    expect(screen.getByRole('img', { name: 'No screen for fixture-unscreened' })).toBeTruthy();
  });
});
