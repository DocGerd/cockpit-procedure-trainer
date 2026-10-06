// @vitest-environment jsdom
import { STEP_MS } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { useActiveView } from './active-view';
import { PanelArea } from './PanelArea';
import { placementExtent, viewPlacements } from './rects';
import type { PanelRects } from './rects';
import { IMAGE, fixture } from './test-aircraft';

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-aircraft');
  return { aircraftRegistry: [fixtures.fixture, fixtures.other, fixtures.vector] };
});

const layers = vi.hoisted(() => ({
  overlay: [] as { viewId: string; rects: PanelRects }[],
  mounts: 0,
  devices: [] as { viewId: string; rects: PanelRects }[],
  setView: undefined as ((viewId: string) => void) | undefined,
}));

vi.mock('../modes/PanelOverlay', () => ({
  PanelOverlay(props: { viewId: string; rects: PanelRects }) {
    layers.overlay.push(props);
    layers.setView = useActiveView().setView;
    useEffect(() => {
      layers.mounts += 1;
    }, []);
    return <div data-testid="overlay" />;
  },
}));

vi.mock('../devices/DeviceLayer', () => ({
  DeviceLayer(props: { viewId: string; rects: PanelRects }) {
    layers.devices.push(props);
    return <div data-testid="devices" />;
  },
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

function renderPanel(language: 'de' | 'en' = 'en', onRender?: () => void) {
  const panel = onRender ? (
    <Profiler id="panel" onRender={onRender}>
      <PanelArea />
    </Profiler>
  ) : (
    <PanelArea />
  );
  return renderWithLanguage(
    <TrainerProvider>
      <Probe />
      {panel}
    </TrainerProvider>,
    { language },
  );
}

const placement = (id: string) => document.querySelector<HTMLElement>(`[data-placement="${id}"]`);
const box = (element: HTMLElement | null) => {
  const style = element?.style;
  return { left: style?.left, top: style?.top, width: style?.width, height: style?.height };
};

function loadBackground(name: string) {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(IMAGE.width);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(IMAGE.height);
  fireEvent.load(screen.getByRole('img', { name }));
}

beforeEach(() => {
  localStorage.clear();
  layers.overlay = [];
  layers.mounts = 0;
  layers.devices = [];
  layers.setView = undefined;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('view tabs', () => {
  it('renders one tab per view with its localized name', () => {
    renderPanel('de');
    const tabs = within(screen.getByRole('tablist', { name: 'Panelansicht' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Main panel (de)', 'Centre console (de)']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it("switches to the other view's background and placements", async () => {
    renderPanel();
    expect(placement('master')).not.toBeNull();
    expect(placement('beacon')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));

    expect(screen.getByRole('tab', { name: 'Centre console' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('img', { name: 'Centre console' }).getAttribute('src')).toBe(
      'console.png',
    );
    expect(placement('beacon')).not.toBeNull();
    expect(placement('rpm')).not.toBeNull();
    expect(placement('master')).toBeNull();
    expect(placement('lowVolts')).toBeNull();
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderPanel();
    screen.getByRole('tab', { name: 'Main panel' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Centre console' }));
    expect(placement('beacon')).not.toBeNull();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Main panel' }));
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Centre console' }));
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Main panel' }));
  });

  it('keeps the panel surface marker off the tabs', () => {
    renderPanel();
    const surface = document.querySelector('[data-panel-surface]');
    expect(surface?.contains(placement('master'))).toBe(true);
    expect(surface?.contains(screen.getByRole('tablist'))).toBe(false);
  });

  it('lets the active view be switched from inside the panel', () => {
    renderPanel();
    act(() => layers.setView?.('console'));
    expect(screen.getByRole('tab', { name: 'Centre console' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(layers.overlay.at(-1)?.viewId).toBe('console');
  });

  it('keeps the overlay mounted across view switches', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Main panel' }));
    expect(layers.overlay.at(-1)?.viewId).toBe('main');
    expect(layers.mounts).toBe(1);
  });

  it('starts on the first view of a newly selected aircraft', () => {
    renderPanel();
    act(() => layers.setView?.('console'));
    act(() => trainer.selectAircraft('panel-other'));
    expect(screen.getByRole('tab', { name: 'Deck' }).getAttribute('aria-selected')).toBe('true');
    expect(placement('light')).not.toBeNull();
  });
});

describe('placements', () => {
  it('map image coordinates to percentages of the loaded background', () => {
    renderPanel();
    loadBackground('Main panel');
    expect(box(placement('master'))).toEqual({
      left: '10%',
      top: '10%',
      width: '10%',
      height: '20%',
    });
    expect(box(placement('lowVolts'))).toEqual({
      left: '70%',
      top: '10%',
      width: '10%',
      height: '10%',
    });
  });

  it('keep the background aspect ratio so they scale with the panel', () => {
    renderPanel();
    loadBackground('Main panel');
    const stage = placement('master')?.closest<HTMLElement>('.panel-stage');
    expect(stage?.style.aspectRatio).toBe(`${IMAGE.width} / ${IMAGE.height}`);
    expect(stage?.style.getPropertyValue('--panel-ratio')).toBe(String(IMAGE.width / IMAGE.height));
  });

  it('give the stage its page offset, so it fits the viewport below it', () => {
    renderPanel();
    const stage = placement('master')?.closest<HTMLElement>('.panel-stage') as HTMLElement;
    expect(stage.style.getPropertyValue('--panel-top')).toBe('0');

    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 300, 800, 400));
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(stage.style.getPropertyValue('--panel-top')).toBe('300');
  });

  it("leave room for the footer's height when they fit the viewport", () => {
    const footer = document.body.appendChild(document.createElement('footer'));
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 743, 1024, 24.5));
    try {
      renderPanel();
      const stage = placement('master')?.closest<HTMLElement>('.panel-stage') as HTMLElement;
      expect(stage.style.getPropertyValue('--panel-footer')).toBe('25');
    } finally {
      footer.remove();
    }
  });

  it('ignore 3D position and orientation', () => {
    renderPanel();
    loadBackground('Main panel');
    expect(box(placement('pump'))).toEqual({
      left: '30%',
      top: '20%',
      width: '20%',
      height: '30%',
    });
    expect(within(placement('pump') as HTMLElement).getByRole('radiogroup')).toBeDefined();
  });

  it('pass the same percent boxes to the overlay and the device layer', () => {
    renderPanel();
    loadBackground('Main panel');
    const overlay = layers.overlay.at(-1);
    expect(overlay?.viewId).toBe('main');
    expect(overlay?.rects.controls.master).toEqual({ left: 10, top: 10, width: 10, height: 20 });
    expect(overlay?.rects.indicators.lowVolts).toEqual({
      left: 70,
      top: 10,
      width: 10,
      height: 10,
    });
    expect(layers.devices.at(-1)).toEqual(overlay);
  });

  it('keep the placement extent when the background reports no size', () => {
    renderPanel();
    fireEvent.load(screen.getByRole('img', { name: 'Main panel' }));
    expect(layers.overlay.at(-1)?.rects.indicators.lowVolts?.left).toBe(87.5);
  });
});

describe('SVG backgrounds', () => {
  const answer = (text: string, ok = true) =>
    vi.fn(() => Promise.resolve({ ok, text: () => Promise.resolve(text) }));
  const viewBox = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 25 2000 1000"/>';
  // The light switch spans 100..200 by 50..150, so its extent is 200 by 150.
  const byExtent = {
    left: '50%',
    top: `${(50 / 150) * 100}%`,
    width: '50%',
    height: `${(100 / 150) * 100}%`,
  };

  async function showVector(fetch: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('fetch', fetch);
    renderPanel();
    act(() => trainer.selectAircraft('panel-vector'));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('assets/vector-panel.svg?v=1'));
  }

  it('place by the viewBox, its origin included, not by the natural size the browser reports', async () => {
    await showVector(answer(viewBox));
    await waitFor(() => expect(placement('light')?.style.left).toBe('2.5%'));
    loadBackground('Vector panel');
    expect(box(placement('light'))).toEqual({
      left: '2.5%',
      top: '2.5%',
      width: '5%',
      height: '10%',
    });
  });

  it.each([
    ['cannot be fetched', vi.fn(() => Promise.reject(new Error('offline')))],
    ['answers with an error', answer(viewBox, false)],
    ['has no viewBox', answer('<svg xmlns="http://www.w3.org/2000/svg"/>')],
  ])('use the placement extent, not the natural size, when the SVG %s', async (_, fetch) => {
    await showVector(fetch);
    await act(async () => {});
    loadBackground('Vector panel');
    expect(box(placement('light'))).toEqual(byExtent);
  });

  it('do not fetch a raster background', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    renderPanel();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('missing background', () => {
  it('shows the placeholder labelled with the view name and keeps controls usable', async () => {
    renderPanel();
    fireEvent.error(screen.getByRole('img', { name: 'Main panel' }));

    const placeholder = screen.getByRole('img', { name: 'Main panel' });
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder.textContent).toBe('Main panel');

    // Without the image size the placements span their own extent: 800 by 300 here.
    expect(box(placement('lowVolts'))).toEqual({
      left: '87.5%',
      top: `${(50 / 300) * 100}%`,
      width: '12.5%',
      height: `${(50 / 300) * 100}%`,
    });

    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Master' })).getByRole('radio', {
        name: 'on',
      }),
    );
    expect(trainer.session.state().controls.master).toBe('on');
  });
});

describe('widgets', () => {
  it('give a control without appearance and one with an unknown widget the generic toggle', () => {
    renderPanel();
    expect(within(placement('master') as HTMLElement).getByRole('radiogroup')).toBeDefined();
    expect(within(placement('pump') as HTMLElement).getByRole('radiogroup')).toBeDefined();
  });

  it('draw a control with artwork from its layers', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const beacon = placement('beacon') as HTMLElement;
    const face = beacon.querySelector('img[src="beacon-face.png"]');
    expect(face).not.toBeNull();
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(10);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(10);
    fireEvent.load(face as Element);
    expect(beacon.querySelector('image[href="beacon-off.png"]')).not.toBeNull();
    expect(within(beacon).queryByRole('radiogroup')).toBeNull();
  });

  it('operate the session and follow its state', async () => {
    renderPanel();
    expect(screen.getByRole('img', { name: 'Low volts: Lit' }).getAttribute('data-lit')).toBe(
      'true',
    );

    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Master' })).getByRole('radio', {
        name: 'on',
      }),
    );

    expect(trainer.session.state().controls.master).toBe('on');
    expect(screen.getByRole('img', { name: 'Low volts: Off' }).getAttribute('data-lit')).toBe(
      'false',
    );

    await userEvent.click(screen.getByRole('switch', { name: 'Bus breaker' }));
    expect(trainer.session.state().controls.cb).toBe('pulled');
  });

  it('open a guard through the session', async () => {
    renderPanel();
    const guard = screen.getByRole('button', { name: 'Fuel cutoff' });
    expect(guard.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(guard);
    expect(trainer.session.guards().cutoff).toBe('open');
    expect(guard.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Escape}');
    expect(trainer.session.guards().cutoff).toBe('closed');
  });

  it('press and release a momentary control through the session', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    fireEvent.pointerDown(starter, { button: 0 });
    expect(trainer.session.state().controls.starter).toBe('start');
    fireEvent.pointerUp(starter);
    expect(trainer.session.state().controls.starter).toBe('off');
  });

  it('press a spring-loaded detent with its position and spring back on release', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const start = within(screen.getByRole('radiogroup', { name: 'Key' })).getByRole('radio', {
      name: 'start',
    });
    fireEvent.pointerDown(start, { button: 0 });
    expect(trainer.session.state().controls.key).toBe('start');
    fireEvent.pointerUp(start);
    expect(trainer.session.state().controls.key).toBe('on');
  });

  it("keep an indicator's own state labels", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    expect(screen.getByRole('img', { name: 'Door: OPEN' })).toBeDefined();
  });

  it('follow a change made elsewhere', () => {
    renderPanel();
    act(() => {
      trainer.session.set('master', 'on');
    });
    const master = screen.getByRole('radiogroup', { name: 'Master' });
    expect(within(master).getByRole('radio', { name: 'on' }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('localize names, lamp states and breaker positions', () => {
    renderPanel('de');
    expect(screen.getByRole('radiogroup', { name: 'Master (de)' })).toBeDefined();
    expect(screen.getByRole('img', { name: 'Low volts (de): Leuchtet' })).toBeDefined();
    const breaker = screen.getByRole('switch', { name: 'Bus breaker (de)' });
    expect(breaker.getAttribute('aria-describedby')).not.toBeNull();
    const state = document.getElementById(breaker.getAttribute('aria-describedby') ?? '');
    expect(state?.textContent).toBe('Gedrückt');
  });

  it('do not re-render the panel on a session tick that changes nothing they show', () => {
    const onRender = vi.fn();
    renderPanel('en', onRender);
    onRender.mockClear();
    act(() => trainer.session.advance(STEP_MS));
    expect(onRender).not.toHaveBeenCalled();
  });
});

describe('viewPlacements', () => {
  it('collects the rects of a view, including the devices installed in it', () => {
    const withDevices = {
      ...fixture,
      devices: {
        com1: {
          device: 'com',
          view: 'main',
          placement: { rect: { x: 0, y: 400, w: 200, h: 100 } },
          powered: () => true,
          inputs: {},
        },
        xpdr: {
          device: 'xpdr',
          view: 'console',
          placement: { rect: { x: 0, y: 0, w: 1, h: 1 } },
          powered: () => true,
          inputs: {},
        },
      },
    } satisfies Aircraft;

    const main = viewPlacements(withDevices, 'main');
    expect(Object.keys(main.controls)).toEqual(['master', 'pump', 'cb', 'cutoff']);
    expect(Object.keys(main.indicators)).toEqual(['lowVolts']);
    expect(main.devices).toEqual({ com1: { x: 0, y: 400, w: 200, h: 100 } });
    expect(placementExtent(main)).toEqual({ width: 800, height: 500 });
  });
});
