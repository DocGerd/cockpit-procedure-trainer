// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider } from '../trainer';
import { useActiveView } from './active-view';
import type { ActiveView } from './active-view';
import type { CockpitLayoutChoice } from './cockpit-layout';
import { PanelArea } from './PanelArea';
import type { PanelRects } from './rects';

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-aircraft');
  return { aircraftRegistry: [fixtures.fixture] };
});

const layers = vi.hoisted(() => ({
  overlay: [] as { viewId: string; rects: PanelRects }[],
  devices: [] as { viewId: string; rects: PanelRects }[],
  active: undefined as ActiveView | undefined,
}));

vi.mock('../modes/PanelOverlay', () => ({
  PanelOverlay(props: { viewId: string; rects: PanelRects }) {
    layers.overlay.push(props);
    layers.active = useActiveView();
    return <div data-testid="overlay" />;
  },
}));

vi.mock('../devices/DeviceLayer', () => ({
  DeviceLayer(props: { viewId: string; rects: PanelRects }) {
    layers.devices.push(props);
    return <div data-testid="devices" />;
  },
}));

// The console sits left of the main panel, so the arrangement order differs from the view order.
const combined: CockpitLayoutChoice = {
  kind: 'combined',
  scale: 1,
  width: 1000,
  height: 400,
  cells: [
    { viewId: 'console', left: 0, top: 0, width: 400, height: 400, fitWidth: 400 },
    { viewId: 'main', left: 400, top: 0, width: 600, height: 300, fitWidth: 600 },
  ],
};

const renderCockpit = (layout: CockpitLayoutChoice = combined) =>
  renderWithLanguage(
    <TrainerProvider>
      <PanelArea layout={layout} />
    </TrainerProvider>,
    { language: 'en' },
  );

const cell = (name: string) => screen.getByRole('region', { name });
const placement = (id: string) => document.querySelector<HTMLElement>(`[data-placement="${id}"]`);

beforeEach(() => {
  localStorage.clear();
  layers.overlay = [];
  layers.devices = [];
  layers.active = undefined;
});

afterEach(cleanup);

describe('the combined layout', () => {
  it('shows every view once, named, in arrangement order, and no tabs', () => {
    renderCockpit();
    const cells = [...document.querySelectorAll<HTMLElement>('[data-view]')];
    expect(cells.map((element) => element.dataset.view)).toEqual(['console', 'main']);
    expect(cells.map((element) => element.getAttribute('aria-label'))).toEqual([
      'Centre console',
      'Main panel',
    ]);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(placement('master')).not.toBeNull();
    expect(placement('beacon')).not.toBeNull();
    expect(document.querySelectorAll('[data-placement="master"]')).toHaveLength(1);
  });

  it('places each cell at its rect and contain-fits the view in it', () => {
    renderCockpit();
    expect(within(cell('Main panel')).getByRole('img', { name: 'Main panel' })).toBeDefined();
    const style = cell('Main panel').style;
    expect([style.left, style.top, style.width, style.height]).toEqual([
      '400px',
      '0px',
      '600px',
      '300px',
    ]);
    const stage = cell('Main panel').querySelector<HTMLElement>('.panel-stage');
    expect(stage?.dataset.fit).toBe('cell');
    expect(stage?.style.getPropertyValue('--cell-height')).toBe('300');
  });

  it('gives each cell its own device layer and overlay', () => {
    renderCockpit();
    expect(layers.overlay.map((props) => props.viewId).sort()).toEqual(['console', 'main']);
    expect(layers.devices.map((props) => props.viewId).sort()).toEqual(['console', 'main']);
    for (const name of ['Main panel', 'Centre console']) {
      expect(within(cell(name)).getAllByTestId('overlay')).toHaveLength(1);
      expect(within(cell(name)).getAllByTestId('devices')).toHaveLength(1);
    }
  });

  it('makes every view visible and leaves setView with nothing to switch', () => {
    renderCockpit();
    expect(layers.active?.combined).toBe(true);
    expect(layers.active?.visible('main')).toBe(true);
    expect(layers.active?.visible('console')).toBe(true);
    act(() => layers.active?.setView('console'));
    expect(placement('master')).not.toBeNull();
    expect(placement('beacon')).not.toBeNull();
  });

  it('reaches each cell with Tab, as a region', async () => {
    renderCockpit();
    const cells = screen.getAllByRole('region');
    const reached: string[] = [];
    const focusable = document.querySelectorAll('[tabindex], button, input').length;
    for (let step = 0; step <= focusable; step += 1) {
      await userEvent.tab();
      const region = cells.find((candidate) => candidate === document.activeElement);
      if (region) reached.push(region.getAttribute('aria-label') ?? '');
    }
    // One full Tab cycle, wherever it starts: both cells, in arrangement order.
    expect(reached.join(' > ')).toContain('Main panel > Centre console');
  });

  it('zooms one cell and leaves the others, and resets them all', async () => {
    renderCockpit();
    expect(screen.queryByRole('button', { name: 'Reset zoom' })).toBeNull();
    act(() => cell('Main panel').focus());
    await userEvent.keyboard('+');
    expect(cell('Main panel').querySelector('.panel-zoom')?.hasAttribute('data-zoomed')).toBe(true);
    expect(cell('Centre console').querySelector('.panel-zoom')?.hasAttribute('data-zoomed')).toBe(
      false,
    );

    act(() => cell('Centre console').focus());
    await userEvent.keyboard('+');
    expect(document.querySelectorAll('.panel-zoom[data-zoomed]')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(document.querySelectorAll('.panel-zoom[data-zoomed]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Reset zoom' })).toBeNull();
  });

  it('leaves the keys of a control to that control', () => {
    renderCockpit();
    const control = placement('master')?.querySelector<HTMLElement>('[tabindex="0"]');
    if (!control) throw new Error('no focusable control');
    act(() => control.focus());
    fireEvent.keyDown(control, { key: '+' });
    expect(document.querySelectorAll('.panel-zoom[data-zoomed]')).toHaveLength(0);
  });

  it('keeps every control operable', async () => {
    renderCockpit();
    const master = within(within(cell('Main panel')).getByRole('radiogroup', { name: 'Master' }));
    await userEvent.click(master.getByRole('radio', { name: 'on' }));
    expect(master.getByRole('radio', { name: 'on' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('the tabs layout', () => {
  it('marks the tabpanel with the shown view', async () => {
    renderCockpit({ kind: 'tabs' });
    expect(screen.getByRole('tabpanel').dataset.view).toBe('main');
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    expect(screen.getByRole('tabpanel').dataset.view).toBe('console');
    expect(layers.active?.combined).toBe(false);
    expect(layers.active?.visible('main')).toBe(false);
    expect(layers.active?.visible('console')).toBe(true);
  });
});
