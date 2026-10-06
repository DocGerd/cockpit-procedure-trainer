// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './PanelArea';
import { usePanelZoom } from './panel-zoom';
import type { PanelRects } from './rects';
import { MAX_SCALE } from './zoom';
import { GESTURE_WINDOW_MS } from './use-zoom-gestures';
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
      >
        <button type="button" data-testid="through" data-pan-through="" />
        <button type="button" data-testid="plain" />
      </div>
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

let VIEWPORT = { width: 400, height: 200 };

beforeEach(() => {
  localStorage.clear();
  calls.input = [];
  VIEWPORT = { width: 400, height: 200 };
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
  vi.useRealTimers();
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
    move(starter, { id: 3, x: 0, y: 40 });
    expect(calls.input).toEqual(['press starter']);
    move(starter, { id: 3, x: -300, y: 0 });
    expect(offset()).toEqual(before);
    up(starter, { id: 3, x: -300, y: 0 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
    expect(offset()).toEqual(before);
  });

  it('a first touch on a control waits for a second finger before it operates the control', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    vi.useFakeTimers();
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    move(starter, { id: 1, x: 53, y: 100 });
    expect(calls.input).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(GESTURE_WINDOW_MS);
    });
    expect(calls.input).toEqual(['press starter']);
    up(starter, { id: 1, x: 53, y: 100 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
  });

  it('a tap on a control operates it when the finger lifts', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    expect(calls.input).toEqual([]);
    up(starter, { id: 1, x: 50, y: 100 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
  });

  it('a second finger before the touch is confirmed leaves the control alone', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    vi.useFakeTimers();
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    const bg = background();
    down(bg, { id: 2, x: 250, y: 100 });
    move(bg, { id: 2, x: 350, y: 100 });
    expect(scale()).toBeGreaterThan(1);
    act(() => {
      vi.advanceTimersByTime(GESTURE_WINDOW_MS * 2);
    });
    up(starter, { id: 1, x: 50, y: 100 });
    up(bg, { id: 2, x: 350, y: 100 });
    expect(calls.input).toEqual([]);
  });

  it('a browser cancel of the touch before it is confirmed leaves the control alone', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    fireEvent.pointerCancel(starter, { pointerId: 1, pointerType: 'touch' });
    expect(calls.input).toEqual([]);
  });

  describe('while another touch waits to be confirmed', () => {
    const console = () => userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const space = { key: ' ' };

    it('another control acts at once, and a pinch does not drop it', async () => {
      await console();
      const starter = screen.getByRole('button', { name: 'Starter' });
      down(placement('beacon') as HTMLElement, { id: 1, x: 50, y: 100 });
      act(() => starter.focus());
      fireEvent.keyDown(starter, space);
      expect(calls.input).toEqual(['press starter']);
      fireEvent.keyUp(starter, space);
      expect(calls.input).toEqual(['press starter', 'release starter']);
      down(background(), { id: 2, x: 250, y: 100 });
      expect(calls.input).toEqual(['press starter', 'release starter']);
    });

    it('a release of a press that already went through is not dropped', async () => {
      await console();
      const starter = screen.getByRole('button', { name: 'Starter' });
      act(() => starter.focus());
      fireEvent.keyDown(starter, space);
      expect(calls.input).toEqual(['press starter']);
      down(starter, { id: 1, x: 50, y: 100 });
      fireEvent.keyUp(starter, space);
      down(background(), { id: 2, x: 250, y: 100 });
      expect(calls.input).toEqual(['press starter', 'release starter']);
    });
  });

  it.each(['mouse', 'pen'])('a %s press operates the control at once', async (pointerType) => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    fireEvent.pointerDown(starter, { pointerId: 1, pointerType, button: 0 });
    expect(calls.input).toEqual(['press starter']);
  });

  it('a second finger cancels a press in progress before it zooms', async () => {
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const starter = screen.getByRole('button', { name: 'Starter' });
    down(starter, { id: 1, x: 50, y: 100 });
    move(starter, { id: 1, x: 50, y: 140 });
    expect(calls.input).toEqual(['press starter']);

    const bg = background();
    down(bg, { id: 2, x: 250, y: 100 });
    expect(calls.input).toEqual(['press starter', 'release starter']);
    expect(scale()).toBe(1);

    move(bg, { id: 2, x: 350, y: 100 });
    expect(scale()).toBeGreaterThan(1);
    up(starter, { id: 1, x: 50, y: 140 });
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

describe('keyboard zoom', () => {
  const surface = () => screen.getByRole('tabpanel');

  it('makes the panel surface reachable with Tab after the view tabs', async () => {
    act(() => screen.getByRole('tab', { name: 'Main panel' }).focus());
    await userEvent.tab();
    expect(document.activeElement).toBe(surface());
  });

  it('zooms in and out with plus and minus and resets with 0 on the focused surface', async () => {
    act(() => surface().focus());
    await userEvent.keyboard('+');
    expect(scale()).toBeGreaterThan(1);
    const zoomedIn = scale();
    await userEvent.keyboard('-');
    expect(scale()).toBeLessThan(zoomedIn);
    await userEvent.keyboard('++');
    await userEvent.keyboard('0');
    expect(scale()).toBe(1);
    expect(offset()).toEqual({ x: 0, y: 0 });
    expect(document.activeElement).toBe(surface());
  });

  it('pans with the arrow keys while zoomed', async () => {
    act(() => surface().focus());
    await userEvent.keyboard('++');
    const before = offset();
    await userEvent.keyboard('{ArrowRight}');
    expect(offset().x).toBeLessThan(before.x);
    await userEvent.keyboard('{ArrowDown}');
    expect(offset().y).toBeLessThan(before.y);
  });

  it('keeps the page from scrolling on a key that pans, and only then', async () => {
    const arrowDown = () => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      surface().dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(arrowDown()).toBe(false);
    act(() => surface().focus());
    await userEvent.keyboard('++');
    expect(arrowDown()).toBe(true);
  });

  it('leaves the keys of a control on the panel to that control', () => {
    const control = placement('master')?.querySelector<HTMLElement>('[tabindex="0"]');
    if (!control) throw new Error('no focusable control');
    act(() => control.focus());
    fireEvent.keyDown(control, { key: '+' });
    fireEvent.keyDown(control, { key: 'ArrowRight' });
    expect(scale()).toBe(1);
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
  it('suppresses the context menu after a touch, so a long press opens nothing', () => {
    down(background(), { id: 1, x: 100, y: 100 });
    expect(fireEvent.contextMenu(background())).toBe(false);
    expect(fireEvent.contextMenu(placement('master') as HTMLElement)).toBe(false);
  });

  it('leaves the mouse context menu alone', () => {
    fireEvent.pointerDown(background(), { pointerId: 1, pointerType: 'mouse', button: 2 });
    expect(fireEvent.contextMenu(background())).toBe(true);
  });

  it('leaves the keyboard context menu alone', () => {
    expect(fireEvent.contextMenu(background())).toBe(true);
  });
});

describe('panning through an element', () => {
  it('lets a drag that starts on a data-pan-through element pan, but not on another button', () => {
    spread(200);
    const before = offset();
    const through = screen.getByTestId('through');
    down(through, { id: 3, x: 100, y: 100 });
    move(through, { id: 3, x: 90, y: 100 });
    expect(offset().x).toBe(before.x - 10);
    up(through, { id: 3, x: 90, y: 100 });

    const plain = screen.getByTestId('plain');
    down(plain, { id: 4, x: 100, y: 100 });
    move(plain, { id: 4, x: 50, y: 100 });
    expect(offset().x).toBe(before.x - 10);
  });
});

describe('focus', () => {
  const focusByKeyboard = (element: HTMLElement) => {
    fireEvent.keyDown(document.body, { key: 'Tab' });
    act(() => element.focus());
  };
  const placeAt = (element: Element, rect: DOMRect) =>
    Object.defineProperty(element, 'getBoundingClientRect', { value: () => rect });

  const master = () =>
    within(placement('master') as HTMLElement).getByRole('radio', { name: 'on' });

  it('pans a control focused out of view into view and never scrolls the stage', () => {
    spread(200);
    const before = offset();
    placeAt(master(), new DOMRect(-50, 20, 40, 40));
    focusByKeyboard(master());
    expect(offset()).toEqual({ x: before.x + 50, y: before.y });
    expect(stage().scrollLeft).toBe(0);
    expect(stage().scrollTop).toBe(0);
  });

  it('pans the other way for a control past the far edge, clamped to the panel', () => {
    spread(200);
    const before = offset();
    placeAt(master(), new DOMRect(390, 20, 40, 40));
    focusByKeyboard(master());
    expect(offset().x).toBe(before.x - 30);
  });

  it('does not pan for a control focused by a tap', () => {
    spread(200);
    const before = offset();
    placeAt(master(), new DOMRect(-50, 20, 40, 40));
    fireEvent.mouseDown(master());
    act(() => master().focus());
    expect(offset()).toEqual(before);
  });

  it('leaves the zoom alone for a control already in view', () => {
    spread(200);
    const before = offset();
    placeAt(master(), new DOMRect(100, 50, 40, 40));
    focusByKeyboard(master());
    expect(offset()).toEqual(before);
  });
});

describe('stale state', () => {
  it('refits the zoom to a smaller viewport on resize', () => {
    spread(200);
    expect(offset().x).toBe(-200);
    VIEWPORT = { width: 100, height: 50 };
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(offset()).toEqual({ x: -100, y: -50 });
  });

  it('forgets a finger whose element has gone, so the next one pans instead of pinching', async () => {
    down(background(), { id: 1, x: 150, y: 100 });
    await userEvent.click(screen.getByRole('tab', { name: 'Centre console' }));
    const fresh = background();
    down(fresh, { id: 2, x: 250, y: 100 });
    move(fresh, { id: 2, x: 350, y: 100 });
    expect(scale()).toBe(1);
  });
});
