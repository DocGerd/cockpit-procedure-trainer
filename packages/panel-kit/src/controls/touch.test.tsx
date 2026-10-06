// @vitest-environment jsdom
import type { ControlDefinition } from '@cpt/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PushButton, defaultControlWidget } from './index';
import {
  breaker,
  continuousLever,
  guarded,
  momentary,
  notchedLever,
  rotary,
  toggle2,
  toggle3,
  widgetProps,
} from './test-support';

const capture = vi.fn();
const POINTER = 7;

beforeEach(() => {
  capture.mockReset();
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: capture,
  });
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture;
});

describe('press and hold', () => {
  const button = () => screen.getByRole('button', { name: 'The control' });

  it('captures the pointer so the hold survives drifting off the control', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0, pointerId: POINTER });
    expect(capture).toHaveBeenCalledWith(POINTER);

    fireEvent.pointerLeave(button());
    fireEvent.pointerMove(button(), { clientX: 400, clientY: 400, pointerId: POINTER });
    expect(props.onRelease).not.toHaveBeenCalled();

    fireEvent.pointerUp(button(), { pointerId: POINTER });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases when the pointer is cancelled while captured', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0, pointerId: POINTER });
    fireEvent.pointerCancel(button(), { pointerId: POINTER });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases when the capture is lost without a pointer up', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0, pointerId: POINTER });
    fireEvent.lostPointerCapture(button(), { pointerId: POINTER });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('does not count the capture release after a pointer up as a second activation', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0, pointerId: POINTER });
    fireEvent.pointerUp(button(), { pointerId: POINTER });
    fireEvent.lostPointerCapture(button(), { pointerId: POINTER });
    fireEvent.click(button());
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('holds a spring-back detent the same way', () => {
    const props = widgetProps(rotary);
    const Widget = defaultControlWidget('rotary');
    render(<Widget {...props} />);
    const start = within(screen.getByRole('radiogroup')).getByRole('radio', {
      name: 'label start',
    });
    fireEvent.pointerDown(start, { button: 0, pointerId: POINTER });
    expect(capture).toHaveBeenCalledWith(POINTER);
    expect(props.onPress).toHaveBeenCalledWith('start');
    fireEvent.pointerLeave(start);
    expect(props.onRelease).not.toHaveBeenCalled();
    fireEvent.pointerUp(start, { pointerId: POINTER });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('keeps releasing on leave where the pointer cannot be captured', () => {
    capture.mockImplementation(() => {
      throw new Error('no such pointer');
    });
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0, pointerId: POINTER });
    fireEvent.pointerLeave(button());
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });
});

describe('hit area', () => {
  const TARGET = 'var(--size-target)';
  const cases: readonly [string, ControlDefinition][] = [
    ['toggle', toggle2],
    ['three-position toggle', toggle3],
    ['rotary', rotary],
    ['momentary', momentary],
    ['breaker', breaker],
    ['guarded', guarded],
    ['continuous lever', continuousLever],
    ['notched lever', notchedLever],
  ];

  it.each(cases)('is at least the touch target for every part of a %s', (_, control) => {
    const Widget = defaultControlWidget(control.kind);
    const { container } = render(
      <Widget {...widgetProps(control)} guardOpen onOpenGuard={vi.fn()} />,
    );
    const root = container.querySelector<HTMLElement>('.pk-root');
    expect(root?.style.minWidth).toBe(TARGET);
    expect(root?.style.minHeight).toBe(TARGET);

    const hits = container.querySelectorAll<HTMLElement>(
      'button, [role="slider"], [role="radio"], .pk-hit',
    );
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.style.minWidth).toBe(TARGET);
      expect(hit.style.minHeight).toBe(TARGET);
    }
  });
});
