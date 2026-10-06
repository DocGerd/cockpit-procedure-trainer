// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { PanelArea } from '../panel';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { aircraft, deviceScreens, devices, screenInput } from './test-fixtures';

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-fixtures');
  return { aircraftRegistry: [fixtures.aircraft] };
});

vi.mock('../device-registry', async () => {
  const fixtures = await import('./test-fixtures');
  return { deviceRegistry: fixtures.devices, deviceScreens: fixtures.deviceScreens };
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
