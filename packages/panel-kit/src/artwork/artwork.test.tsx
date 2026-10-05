// @vitest-environment jsdom
import type { ControlDefinition, ControlPosition, MovingPart } from '@cpt/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ArtworkControl, ArtworkIndicator } from './index';

import type { Artwork } from './index';

const FACE = { width: 40, height: 20 };

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(FACE.width);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(FACE.height);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const artworkOf = (moving: MovingPart): Artwork => ({ face: 'face.png', moving });

const needle: MovingPart = {
  type: 'needle',
  image: 'needle.png',
  pivot: { x: 12, y: 8 },
  angleRange: { min: -90, max: 90 },
  valueRange: { min: 0, max: 100 },
};

const travel: MovingPart = {
  type: 'travel',
  image: 'knob.png',
  path: [
    { x: 4, y: 16 },
    { x: 4, y: 4 },
    { x: 24, y: 4 },
  ],
};

const fallback = <div>generic widget</div>;

function loadFace() {
  const face = document.querySelector('img');
  if (face) fireEvent.load(face);
}

const layers = () => [...document.querySelectorAll('svg image')];
const transformOf = (element: Element | undefined) => element?.getAttribute('transform') ?? '';
const numbers = (text: string) => (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

function renderIndicator(moving: MovingPart, value: number | boolean | string) {
  const view = render(
    <ArtworkIndicator
      value={value}
      label="Gauge"
      artwork={artworkOf(moving)}
      fallback={fallback}
    />,
  );
  loadFace();
  return view;
}

describe('ArtworkIndicator needle', () => {
  it('rotates about the declared pivot', () => {
    renderIndicator(needle, 50);
    const [angle, x, y] = numbers(transformOf(layers()[0]));
    expect(transformOf(layers()[0])).toMatch(/^rotate\(/);
    expect(angle).toBeCloseTo(0);
    expect([x, y]).toEqual([12, 8]);
  });

  it('maps the value range linearly onto the angle range and clamps', () => {
    const { rerender } = renderIndicator(needle, 75);
    expect(numbers(transformOf(layers()[0]))[0]).toBeCloseTo(45);
    rerender(
      <ArtworkIndicator
        value={500}
        label="Gauge"
        artwork={artworkOf(needle)}
        fallback={fallback}
      />,
    );
    expect(numbers(transformOf(layers()[0]))[0]).toBeCloseTo(90);
    rerender(
      <ArtworkIndicator value={-5} label="Gauge" artwork={artworkOf(needle)} fallback={fallback} />,
    );
    expect(numbers(transformOf(layers()[0]))[0]).toBeCloseTo(-90);
  });

  it('draws the image at 0 degrees and rotates it by the absolute angle', () => {
    renderIndicator(needle, 0);
    expect(transformOf(layers()[0])).toBe('rotate(-90 12 8)');
  });

  it('rests at the minimum angle for a range without width, whatever the value', () => {
    renderIndicator({ ...needle, valueRange: { min: 5, max: 5 } }, 9);
    expect(transformOf(layers()[0])).toBe('rotate(-90 12 8)');
  });

  it('draws the layers in the face coordinate system and names the gauge', () => {
    renderIndicator(needle, 0);
    expect(document.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 40 20');
    expect(layers()).toHaveLength(1);
    expect(layers()[0]?.getAttribute('href')).toBe('needle.png');
    expect(screen.getByRole('img', { name: 'Gauge' })).toBeTruthy();
  });

  it('draws no layer before the face has loaded', () => {
    render(
      <ArtworkIndicator value={1} label="Gauge" artwork={artworkOf(needle)} fallback={fallback} />,
    );
    expect(layers()).toHaveLength(0);
  });
});

describe('ArtworkIndicator positions', () => {
  const positions: MovingPart = {
    type: 'positions',
    images: { off: 'off.png', on: 'on.png', true: 'lit.png' },
  };

  it('shows exactly the image of the current value', () => {
    const { rerender } = renderIndicator(positions, 'on');
    expect(layers().map((layer) => layer.getAttribute('href'))).toEqual(['on.png']);
    rerender(
      <ArtworkIndicator
        value="off"
        label="Gauge"
        artwork={artworkOf(positions)}
        fallback={fallback}
      />,
    );
    expect(layers().map((layer) => layer.getAttribute('href'))).toEqual(['off.png']);
  });

  it('keys a boolean value by its text', () => {
    renderIndicator(positions, true);
    expect(layers().map((layer) => layer.getAttribute('href'))).toEqual(['lit.png']);
  });

  it('falls back when the value has no image', () => {
    renderIndicator(positions, 'missing');
    expect(screen.getByText('generic widget')).toBeTruthy();
  });
});

describe('ArtworkIndicator travel', () => {
  const offset = (value: number) => {
    const { unmount } = renderIndicator(travel, value);
    const [x, y] = numbers(transformOf(layers()[0]));
    unmount();
    return [x, y];
  };

  it('places the image at the first point for 0 and the last point for 1', () => {
    expect(offset(0)).toEqual([0, 0]);
    expect(offset(1)).toEqual([20, -12]);
  });

  it('moves linearly along the path length, not per point', () => {
    expect(offset(0.375)).toEqual([0, -12]);
    expect(offset(0.1875)).toEqual([0, -6]);
  });

  it('clamps outside 0 to 1', () => {
    expect(offset(3)).toEqual([20, -12]);
    expect(offset(-3)).toEqual([0, 0]);
  });
});

describe('image errors fall back to the generic widget', () => {
  it('on the face', () => {
    renderIndicator(needle, 10);
    fireEvent.error(document.querySelector('img') as HTMLImageElement);
    expect(screen.getByText('generic widget')).toBeTruthy();
    expect(document.querySelector('img')).toBeNull();
  });

  it('on the moving part', () => {
    renderIndicator(needle, 10);
    fireEvent.error(layers()[0] as Element);
    expect(screen.getByText('generic widget')).toBeTruthy();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('keeps the artwork when the fallback is not needed', () => {
    renderIndicator(needle, 10);
    expect(screen.queryByText('generic widget')).toBeNull();
  });
});

type Handlers = {
  onSet: Mock<(position: ControlPosition) => void>;
  onPress: Mock<(position?: ControlPosition) => void>;
  onRelease: Mock<() => void>;
  onOpenGuard: Mock<() => void>;
  onCloseGuard: Mock<() => void>;
};

function renderControl(
  control: ControlDefinition,
  moving: MovingPart,
  position: string | number,
  guardOpen = false,
) {
  const handlers: Handlers = {
    onSet: vi.fn<(position: ControlPosition) => void>(),
    onPress: vi.fn<(position?: ControlPosition) => void>(),
    onRelease: vi.fn<() => void>(),
    onOpenGuard: vi.fn<() => void>(),
    onCloseGuard: vi.fn<() => void>(),
  };
  const view = render(
    <ArtworkControl
      control={control}
      position={position}
      guardOpen={guardOpen}
      label="Control"
      positionLabels={{ a: 'Alpha', b: 'Beta' }}
      artwork={artworkOf(moving)}
      fallback={fallback}
      {...handlers}
    />,
  );
  loadFace();
  return { ...handlers, ...view };
}

const text = (de: string, en: string) => ({ de, en });
const base = { name: text('x', 'x'), description: text('x', 'x') };

const toggle: ControlDefinition = { ...base, kind: 'toggle', positions: ['a', 'b'], initial: 'a' };
const switchImages: MovingPart = { type: 'positions', images: { a: 'a.png', b: 'b.png' } };
const momentary: ControlDefinition = {
  ...base,
  kind: 'momentary',
  positions: ['a', 'b'],
  initial: 'a',
};
const lever: ControlDefinition = { ...base, kind: 'lever', positions: 'continuous', initial: 0 };

describe('ArtworkControl', () => {
  it('shows the image of the current position', () => {
    renderControl(toggle, switchImages, 'b');
    expect(layers().map((layer) => layer.getAttribute('href'))).toEqual(['b.png']);
  });

  it('names the control with its label and the resolved position', () => {
    renderControl(toggle, switchImages, 'a');
    expect(screen.getByRole('button', { name: 'Control: Alpha' })).toBeTruthy();
  });

  it('cycles to the next position on activation, wrapping around', () => {
    const first = renderControl(toggle, switchImages, 'a');
    fireEvent.click(screen.getByRole('button'));
    expect(first.onSet).toHaveBeenCalledWith('b');
    first.unmount();
    const second = renderControl(toggle, switchImages, 'b');
    fireEvent.click(screen.getByRole('button'));
    expect(second.onSet).toHaveBeenCalledWith('a');
  });

  it('opens a closed guard first, then sets, and closes the guard with Escape', () => {
    const guarded: ControlDefinition = {
      ...base,
      kind: 'guarded',
      positions: ['a', 'b'],
      initial: 'a',
      guard: { name: text('x', 'x') },
    };
    const closed = renderControl(guarded, switchImages, 'a', false);
    fireEvent.click(screen.getByRole('button'));
    expect(closed.onOpenGuard).toHaveBeenCalledTimes(1);
    expect(closed.onSet).not.toHaveBeenCalled();
    closed.unmount();

    const open = renderControl(guarded, switchImages, 'a', true);
    fireEvent.click(screen.getByRole('button'));
    expect(open.onSet).toHaveBeenCalledWith('b');
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });
    expect(open.onCloseGuard).toHaveBeenCalledTimes(1);
  });

  it('presses on pointer down and releases on pointer up for a momentary control', () => {
    const view = renderControl(momentary, switchImages, 'a');
    const button = screen.getByRole('button', { name: 'Control' });
    fireEvent.pointerDown(button);
    expect(view.onPress).toHaveBeenCalledTimes(1);
    expect(view.onRelease).not.toHaveBeenCalled();
    fireEvent.pointerUp(button);
    expect(view.onRelease).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(button);
    expect(view.onRelease).toHaveBeenCalledTimes(1);
  });

  it('presses while a key is held on a momentary control', () => {
    const view = renderControl(momentary, switchImages, 'a');
    const button = screen.getByRole('button', { name: 'Control' });
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    expect(view.onPress).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key: ' ' });
    expect(view.onRelease).toHaveBeenCalledTimes(1);
  });

  it('activates a momentary control with Enter as well as Space', () => {
    const view = renderControl(momentary, switchImages, 'a');
    const button = screen.getByRole('button', { name: 'Control' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(view.onPress).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(view.onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases a held momentary control when it loses focus', () => {
    const view = renderControl(momentary, switchImages, 'a');
    const button = screen.getByRole('button', { name: 'Control' });
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.blur(button);
    expect(view.onRelease).toHaveBeenCalledTimes(1);
  });

  it('captures the pointer while a momentary control is held', () => {
    renderControl(momentary, switchImages, 'a');
    const button = screen.getByRole('button', { name: 'Control' });
    const capture = vi.fn();
    Object.assign(button, { setPointerCapture: capture });
    fireEvent.pointerDown(button);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('falls back to the generic widget when an image fails', () => {
    renderControl(toggle, switchImages, 'a');
    fireEvent.error(layers()[0] as Element);
    expect(screen.getByText('generic widget')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ArtworkControl on a continuous lever', () => {
  it('places the knob along the path at the lever value', () => {
    renderControl(lever, travel, 0.375);
    expect(numbers(transformOf(layers()[0]))).toEqual([0, -12]);
  });

  it('exposes a slider that keys set 0, 1 and steps clamped to the travel', () => {
    const view = renderControl(lever, travel, 0.5);
    const slider = screen.getByRole('slider', { name: 'Control' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0.5');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(view.onSet).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(view.onSet).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(view.onSet).toHaveBeenLastCalledWith(0.6);
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(view.onSet).toHaveBeenLastCalledWith(0.4);
    view.unmount();

    const top = renderControl(lever, travel, 1);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' });
    expect(top.onSet).toHaveBeenLastCalledWith(1);
  });

  it('steps by tenths without accumulating floating-point error', () => {
    const view = renderControl(lever, travel, 0.2);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' });
    expect(view.onSet).toHaveBeenLastCalledWith(0.3);
  });

  it('ignores a drag while the element has no size', () => {
    const view = renderControl(lever, travel, 0);
    fireEvent.pointerDown(screen.getByRole('slider'), { clientX: 40, clientY: 40 });
    expect(view.onSet).not.toHaveBeenCalled();
  });

  it('captures the pointer for a drag and disables touch panning', () => {
    renderControl(lever, travel, 0);
    const slider = screen.getByRole('slider');
    const capture = vi.fn();
    Object.assign(slider, { setPointerCapture: capture });
    fireEvent.pointerDown(slider);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(slider.style.touchAction).toBe('none');
  });

  it('offers no drag on a lever without a travel path', () => {
    renderControl(lever, { type: 'positions', images: { '0': 'zero.png' } }, 0);
    expect(screen.getByRole('slider').style.touchAction).toBe('');
  });

  it('follows a drag by projecting the pointer onto the path', () => {
    const view = renderControl(lever, travel, 0);
    const slider = screen.getByRole('slider');
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    } as DOMRect);
    fireEvent.pointerDown(slider, { clientX: 40, clientY: 40 });
    expect(view.onSet).toHaveBeenLastCalledWith(0.375);
    fireEvent.pointerMove(slider, { clientX: 240, clientY: 40 });
    expect(view.onSet).toHaveBeenLastCalledWith(1);
    fireEvent.pointerMove(slider, { clientX: 0, clientY: 2000 });
    expect(view.onSet).toHaveBeenLastCalledWith(0);
    fireEvent.pointerUp(slider);
    view.onSet.mockClear();
    fireEvent.pointerMove(slider, { clientX: 240, clientY: 40 });
    expect(view.onSet).not.toHaveBeenCalled();
  });
});

describe('ArtworkControl on a lever with named notches', () => {
  const notched: ControlDefinition = {
    ...base,
    kind: 'lever',
    positions: ['a', 'b', 'c'],
    initial: 'a',
  };

  it('places the knob by the notch index along the path', () => {
    renderControl(notched, travel, 'b');
    expect(numbers(transformOf(layers()[0]))).toEqual([4, -12]);
  });
});

describe('ArtworkControl on a rotary with a spring-back detent', () => {
  const key: ControlDefinition = {
    ...base,
    kind: 'rotary',
    positions: ['off', 'both', 'start'],
    initial: 'off',
    springBack: { start: 'both' },
  };
  const keyImages: MovingPart = {
    type: 'positions',
    images: { off: 'off.png', both: 'both.png', start: 'start.png' },
  };

  it('sets a detent that does not spring back', () => {
    const view = renderControl(key, keyImages, 'off');
    fireEvent.pointerDown(screen.getByRole('button'));
    fireEvent.pointerUp(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(view.onSet).toHaveBeenCalledWith('both');
    expect(view.onPress).not.toHaveBeenCalled();
    expect(view.onRelease).not.toHaveBeenCalled();
  });

  it('presses the spring detent while held and releases it on let go', () => {
    const view = renderControl(key, keyImages, 'both');
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    expect(view.onPress).toHaveBeenCalledWith('start');
    expect(view.onRelease).not.toHaveBeenCalled();
    fireEvent.pointerUp(button);
    expect(view.onRelease).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    expect(view.onSet).not.toHaveBeenCalled();
  });

  it('does the same from the keyboard', () => {
    const view = renderControl(key, keyImages, 'both');
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    expect(view.onPress).toHaveBeenCalledWith('start');
    fireEvent.keyUp(button, { key: ' ' });
    fireEvent.click(button);
    expect(view.onRelease).toHaveBeenCalledTimes(1);
    expect(view.onSet).not.toHaveBeenCalled();
  });

  it('still releases when the held detent has become the current position', () => {
    const view = renderControl(key, keyImages, 'both');
    fireEvent.pointerDown(screen.getByRole('button'));
    view.rerender(
      <ArtworkControl
        control={key}
        position="start"
        guardOpen={false}
        label="Control"
        positionLabels={{}}
        artwork={artworkOf(keyImages)}
        fallback={fallback}
        {...{ onSet: view.onSet, onPress: view.onPress, onRelease: view.onRelease }}
        onOpenGuard={view.onOpenGuard}
        onCloseGuard={view.onCloseGuard}
      />,
    );
    fireEvent.pointerUp(screen.getByRole('button'));
    expect(view.onRelease).toHaveBeenCalledTimes(1);
  });
});
