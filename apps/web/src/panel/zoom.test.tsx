// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea, usePanelZoom } from './index';
import type { PanelRects } from './index';
import { MAX_SCALE } from './zoom';
import { other } from './test-aircraft';

vi.mock('../aircraft-registry', async () => {
  const fixtures = await import('./test-aircraft');
  return { aircraftRegistry: [fixtures.fixture, fixtures.other, fixtures.vector] };
});

const calls = vi.hoisted(() => ({
  input: [] as string[],
  rects: undefined as PanelRects | undefined,
  zoom: undefined as { scale: number; offset: { x: number; y: number } } | undefined,
}));

vi.mock('../modes/panel-input', () => ({
  usePanelInput: (id: string) => ({
    onSet: (position: string) => calls.input.push(`set ${id} ${position}`),
    onPress: () => calls.input.push(`press ${id}`),
    onRelease: () => calls.input.push(`release ${id}`),
    onOpenGuard: () => calls.input.push(`open ${id}`),
    onCloseGuard: () => calls.input.push(`close ${id}`),
  }),
}));

const box = (rect: { left: number; top: number; width: number; height: number }) => ({
  left: `${rect.left}%`,
  top: `${rect.top}%`,
  width: `${rect.width}%`,
  height: `${rect.height}%`,
});

vi.mock('../modes/PanelOverlay', () => ({
  PanelOverlay({ rects }: { rects: PanelRects }) {
    calls.rects = rects;
    calls.zoom = usePanelZoom();
    const target = rects.controls.master;
    return (
      <div
        data-testid="overlay"
        className="panel-placement"
        style={target ? box(target) : undefined}
      />
    );
  },
}));

vi.mock('../devices/DeviceLayer', () => ({
  DeviceLayer({ rects }: { rects: PanelRects }) {
    const target = rects.controls.master;
    return (
      <div
        data-testid="devices"
        className="panel-placement"
        style={target ? box(target) : undefined}
      />
    );
  },
}));

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const VIEWPORT = { width: 400, height: 200 };

beforeEach(() => {
  localStorage.clear();
  calls.input = [];
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.classList.contains('panel-stage')
      ? new DOMRect(0, 0, VIEWPORT.width, VIEWPORT.height)
      : real.call(this);
  });
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <PanelArea />
    </TrainerProvider>,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const stage = () => document.querySelector<HTMLElement>('.panel-stage') as HTMLElement;
const zoomLayer = () => document.querySelector<HTMLElement>('.panel-zoom') as HTMLElement;
const placement = (id: string) => document.querySelector<HTMLElement>(`[data-placement="${id}"]`);
const background = () => screen.getByRole('img', { name: /panel|console/i });
const scale = () => Number(zoomLayer().style.getPropertyValue('--panel-scale'));
const offset = () => ({
  x: Number(zoomLayer().style.getPropertyValue('--panel-x')),
  y: Number(zoomLayer().style.getPropertyValue('--panel-y')),
});

type At = { id: number; x: number; y: number };

const touch = (element: Element, { id, x, y }: At) => ({
  element,
  init: { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0 },
});
const down = (element: Element, at: At) => {
  const { init } = touch(element, at);
  fireEvent.pointerDown(element, init);
};
const move = (element: Element, at: At) => {
  const { init } = touch(element, at);
  fireEvent.pointerMove(element, init);
};
const up = (element: Element, at: At) => {
  const { init } = touch(element, at);
  fireEvent.pointerUp(element, init);
};

/** Two fingers on bare panel, spread to `gap` apart around x 200, then lifted. */
function spread(gap: number, onto: Element = background()) {
  down(onto, { id: 1, x: 150, y: 100 });
  down(onto, { id: 2, x: 250, y: 100 });
  move(onto, { id: 1, x: 200 - gap / 2, y: 100 });
  move(onto, { id: 2, x: 200 + gap / 2, y: 100 });
  up(onto, { id: 1, x: 200 - gap / 2, y: 100 });
  up(onto, { id: 2, x: 200 + gap / 2, y: 100 });
}

describe('pinch zoom', () => {
  it('starts at the fitted size', () => {
    expect(scale()).toBe(1);
    expect(offset()).toEqual({ x: 0, y: 0 });
    expect(calls.zoom?.scale).toBe(1);
  });

  it('raises the scale when two fingers move apart and lowers it when they close', () => {
    const bg = background();
    down(bg, { id: 1, x: 150, y: 100 });
    down(bg, { id: 2, x: 250, y: 100 });
    move(bg, { id: 2, x: 350, y: 100 });
    expect(scale()).toBe(2);
    expect(calls.zoom?.scale).toBe(2);
    move(bg, { id: 2, x: 200, y: 100 });
    expect(scale()).toBe(1);
    move(bg, { id: 2, x: 300, y: 100 });
    expect(scale()).toBe(1.5);
    expect(calls.zoom?.offset).toEqual(offset());
  });

  it('never goes below the fitted size or above the maximum', () => {
    const bg = background();
    down(bg, { id: 1, x: 150, y: 100 });
    down(bg, { id: 2, x: 250, y: 100 });
    move(bg, { id: 2, x: 5000, y: 100 });
    expect(scale()).toBe(MAX_SCALE);
    move(bg, { id: 2, x: 150, y: 100 });
    expect(scale()).toBe(1);
    expect(offset()).toEqual({ x: 0, y: 0 });
  });

  it('keeps the panel covering its viewport', () => {
    spread(400);
    const { x, y } = offset();
    expect(x).toBeLessThanOrEqual(0);
    expect(x).toBeGreaterThanOrEqual(VIEWPORT.width * (1 - scale()));
    expect(y).toBeLessThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(VIEWPORT.height * (1 - scale()));
  });

  it('keeps the zoom after the fingers lift', () => {
    spread(200);
    expect(scale()).toBe(2);
  });

  it('is not driven by a mouse', () => {
    const bg = background();
    fireEvent.pointerDown(bg, { pointerId: 1, pointerType: 'mouse', clientX: 150, clientY: 100 });
    fireEvent.pointerDown(bg, { pointerId: 2, pointerType: 'mouse', clientX: 250, clientY: 100 });
    fireEvent.pointerMove(bg, { pointerId: 2, pointerType: 'mouse', clientX: 350, clientY: 100 });
    expect(scale()).toBe(1);
  });
});

describe('pan', () => {
  it('does nothing at the fitted size', () => {
    const bg = background();
    down(bg, { id: 1, x: 100, y: 100 });
    move(bg, { id: 1, x: 40, y: 60 });
    up(bg, { id: 1, x: 40, y: 60 });
    expect(offset()).toEqual({ x: 0, y: 0 });
  });

  it('moves the panel with one finger on bare panel when zoomed', () => {
    spread(200);
    const before = offset();
    const bg = background();
    down(bg, { id: 3, x: 100, y: 100 });
    move(bg, { id: 3, x: 80, y: 90 });
    expect(offset()).toEqual({ x: before.x - 20, y: before.y - 10 });
    up(bg, { id: 3, x: 80, y: 90 });
  });

  it('stops at the panel edge', () => {
    spread(200);
    const bg = background();
    down(bg, { id: 3, x: 100, y: 100 });
    move(bg, { id: 3, x: 9000, y: 9000 });
    expect(offset()).toEqual({ x: 0, y: 0 });
    move(bg, { id: 3, x: -9000, y: -9000 });
    expect(offset()).toEqual({ x: -400, y: -200 });
  });

  it('pans from an indicator, which cannot be operated', () => {
    spread(200);
    const before = offset();
    const lamp = within(placement('lowVolts') as HTMLElement).getByRole('img');
    down(lamp, { id: 3, x: 100, y: 100 });
    move(lamp, { id: 3, x: 90, y: 100 });
    expect(offset().x).toBe(before.x - 10);
  });

  it('carries on with the remaining finger after a pinch', () => {
    const bg = background();
    down(bg, { id: 1, x: 150, y: 100 });
    down(bg, { id: 2, x: 250, y: 100 });
    move(bg, { id: 2, x: 350, y: 100 });
    up(bg, { id: 1, x: 150, y: 100 });
    const before = offset();
    move(bg, { id: 2, x: 340, y: 100 });
    expect(offset().x).toBe(before.x - 10);
  });
});

describe('controls under touch', () => {
  const master = () =>
    within(placement('master') as HTMLElement).getByRole('radio', { name: 'on' });

  it('a one-finger drag that starts on a control operates it and does not pan', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    spread(200);
    const before = offset();
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 3, x: 50, y: 100 });
    expect(calls.input).toEqual(['press starter']);
    move(starter, { id: 3, x: 0, y: 40 });
    move(starter, { id: 3, x: -300, y: 0 });
    expect(offset()).toEqual(before);
    up(starter, { id: 3, x: -300, y: 0 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
    expect(offset()).toEqual(before);
  });

  it('a second finger cancels a press in progress before it zooms', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    expect(calls.input).toEqual(['press starter']);

    const bg = background();
    down(bg, { id: 2, x: 250, y: 100 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
    expect(scale()).toBe(1);

    move(bg, { id: 2, x: 350, y: 100 });
    expect(scale()).toBeGreaterThan(1);
    up(starter, { id: 1, x: 50, y: 100 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
  });

  it('a second finger landing on a control zooms instead of operating it', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const bg = background();
    down(bg, { id: 1, x: 150, y: 100 });
    down(screen.getByRole('button', { name: 'Starter' }), { id: 2, x: 250, y: 100 });
    expect(calls.input).toEqual([]);
    move(bg, { id: 2, x: 350, y: 100 });
    expect(scale()).toBe(2);
  });

  it('an Explore tap still reaches the control under the finger at another scale', () => {
    spread(300);
    expect(scale()).toBeGreaterThan(1);
    const target = master();
    down(target, { id: 3, x: 120, y: 90 });
    up(target, { id: 3, x: 120, y: 90 });
    fireEvent.click(target);
    expect(calls.input).toEqual(['set master on']);
    expect(trainer.session.state().controls.master).toBe('off');
  });

  it('a drag that starts on a control and ends elsewhere does not pan at scale 1 either', () => {
    const target = master();
    down(target, { id: 3, x: 120, y: 90 });
    move(target, { id: 3, x: 20, y: 10 });
    expect(offset()).toEqual({ x: 0, y: 0 });
  });
});

describe('what the zoom carries', () => {
  it('moves placements, overlay and device layer together', () => {
    spread(300);
    expect(scale()).toBeGreaterThan(1);
    const layer = zoomLayer();
    expect(layer.dataset.zoomed).toBeDefined();
    for (const element of [
      placement('master'),
      placement('lowVolts'),
      screen.getByTestId('overlay'),
      screen.getByTestId('devices'),
      background(),
    ]) {
      expect(element?.parentElement).toBe(layer);
    }
    expect(stage().parentElement?.contains(layer)).toBe(true);
    expect(layer.parentElement).toBe(stage());
  });

  it('keeps overlay and devices on the percent boxes of their placements while zoomed', () => {
    const style = (element: HTMLElement | null) => ({
      left: element?.style.left,
      top: element?.style.top,
      width: element?.style.width,
      height: element?.style.height,
    });
    const before = style(placement('master'));
    spread(300);
    expect(scale()).toBeGreaterThan(1);
    expect(style(placement('master'))).toEqual(before);
    expect(style(screen.getByTestId('overlay'))).toEqual(before);
    expect(style(screen.getByTestId('devices'))).toEqual(before);
    expect(calls.rects?.controls.master).toBeDefined();
  });

  it('draws the transform from the zoom state, and not at all at the fitted size', () => {
    expect(zoomLayer().dataset.zoomed).toBeUndefined();
    spread(200);
    expect(zoomLayer().dataset.zoomed).toBeDefined();
    expect(zoomLayer().style.getPropertyValue('--panel-scale')).toBe('2');
  });
});

describe('reset', () => {
  const reset = () => screen.queryByRole('button', { name: 'Reset zoom' });

  it('is offered only while zoomed, outside the panel, and restores the fitted size', async () => {
    expect(reset()).toBeNull();
    spread(200);
    const button = reset() as HTMLElement;
    expect(button).not.toBeNull();
    expect(document.querySelector('[data-panel-surface]')?.contains(button)).toBe(false);
    expect(screen.getByRole('tablist').contains(button)).toBe(false);

    await userEvent.click(button);
    expect(scale()).toBe(1);
    expect(offset()).toEqual({ x: 0, y: 0 });
    expect(reset()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Main panel' }));
  });

  it('starts over on another view', async () => {
    spread(200);
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    expect(scale()).toBe(1);
    expect(offset()).toEqual({ x: 0, y: 0 });
    expect(reset()).toBeNull();
  });

  it('starts over on another aircraft', () => {
    spread(200);
    act(() => trainer.selectAircraft(other.id));
    expect(scale()).toBe(1);
    expect(reset()).toBeNull();
  });
});

describe('page and text gestures', () => {
  it('suppresses the context menu on the panel', () => {
    expect(fireEvent.contextMenu(background())).toBe(false);
    expect(fireEvent.contextMenu(placement('master') as HTMLElement)).toBe(false);
  });
});
