// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ControlDefinition } from '@cpt/core';
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ControlWidgetProps } from '../types';
import { KeySwitch, RotaryKnob, Rocker, Toggle } from './index';
import { rotary, toggle2, toggle3, widgetProps } from './test-support';

afterEach(cleanup);

const cases: [string, ComponentType<ControlWidgetProps>, ControlDefinition][] = [
  ['toggle', Toggle, toggle3],
  ['rocker', Rocker, toggle3],
  ['key switch', KeySwitch, rotary],
  ['rotary knob', RotaryKnob, rotary],
];

describe.each(cases)('%s', (_name, Widget, control) => {
  const ids = control.positions === 'continuous' ? [] : control.positions;
  const [first = '', second = '', third = ''] = ids;

  it('shows every declared position and marks the current one', () => {
    render(<Widget {...widgetProps(control, { position: second })} />);
    const group = screen.getByRole('radiogroup', { name: 'The control' });
    const radios = screen.getAllByRole('radio');
    expect(group).toBeTruthy();
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual(
      ids.map((id) => `label ${id}`),
    );
    expect(screen.getByRole('radio', { checked: true }).getAttribute('aria-label')).toBe(
      `label ${second}`,
    );
    for (const id of ids) expect(group.parentElement?.textContent).toContain(id.toUpperCase());
  });

  it('calls onSet with the position that was clicked', async () => {
    const props = widgetProps(control, { position: first });
    render(<Widget {...props} />);
    await userEvent.setup().click(screen.getByRole('radio', { name: `label ${third}` }));
    expect(props.onSet).toHaveBeenCalledWith(third);
    expect(props.onPress).not.toHaveBeenCalled();
  });

  it('is operable by touch pointer events', () => {
    const props = widgetProps(control, { position: first });
    render(<Widget {...props} />);
    const target = screen.getByRole('radio', { name: `label ${second}` });
    fireEvent.pointerDown(target, { pointerType: 'touch', button: 0 });
    fireEvent.pointerUp(target, { pointerType: 'touch', button: 0 });
    fireEvent.click(target);
    expect(props.onSet).toHaveBeenCalledWith(second);
  });

  it('keeps one tab stop on the current position and steps with the arrow keys', async () => {
    const props = widgetProps(control, { position: second });
    render(<Widget {...props} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual(
      ids.map((id) => (id === second ? 0 : -1)),
    );
    const user = userEvent.setup();
    radios[1]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(props.onSet).toHaveBeenLastCalledWith(third);
    expect(document.activeElement).toBe(radios[2]);
    await user.keyboard('{ArrowLeft}');
    expect(props.onSet).toHaveBeenLastCalledWith(first);
  });

  it('does not step past either end', async () => {
    const last = ids[ids.length - 1] ?? '';
    const props = widgetProps(control, { position: last });
    render(<Widget {...props} />);
    screen.getByRole('radio', { checked: true }).focus();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(props.onSet).not.toHaveBeenCalled();
  });
});

describe('vertical switches', () => {
  it('draw the first position at the bottom and the last at the top', () => {
    render(<Toggle {...widgetProps(toggle2)} />);
    const [off, on] = screen.getAllByRole('radio');
    expect(Number.parseFloat(on?.style.top ?? '')).toBeLessThan(
      Number.parseFloat(off?.style.top ?? ''),
    );
  });

  it('step up with ArrowUp', async () => {
    const props = widgetProps(toggle2);
    render(<Toggle {...props} />);
    screen.getByRole('radio', { checked: true }).focus();
    await userEvent.setup().keyboard('{ArrowUp}');
    expect(props.onSet).toHaveBeenCalledWith('on');
  });
});

describe.each([
  ['key switch', KeySwitch],
  ['rotary knob', RotaryKnob],
])('%s spring-back detent', (_name, Widget) => {
  const start = () => screen.getByRole('radio', { name: 'label start' });

  it('presses on pointer down and never calls onSet', () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<Widget {...props} />);
    fireEvent.pointerDown(start(), { button: 0 });
    expect(props.onPress).toHaveBeenCalledWith('start');
    fireEvent.click(start());
    expect(props.onSet).not.toHaveBeenCalled();
    expect(props.onRelease).not.toHaveBeenCalled();
  });

  it.each(['pointerUp', 'pointerCancel', 'pointerLeave'] as const)(
    'releases once on %s',
    (event) => {
      const props = widgetProps(rotary, { position: 'both' });
      render(<Widget {...props} />);
      fireEvent.pointerDown(start(), { button: 0 });
      fireEvent[event](start());
      expect(props.onRelease).toHaveBeenCalledTimes(1);
    },
  );

  it('presses then releases on a click with no pointer or key down', () => {
    const calls: string[] = [];
    const props = widgetProps(rotary, { position: 'both' });
    props.onPress.mockImplementation((position) => calls.push(`press ${String(position)}`));
    props.onRelease.mockImplementation(() => calls.push('release'));
    render(<Widget {...props} />);
    fireEvent.click(start());
    expect(calls).toEqual(['press start', 'release']);
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('presses and releases from the keyboard', async () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<Widget {...props} />);
    start().focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter>}');
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).not.toHaveBeenCalled();
    await user.keyboard('{/Enter}');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('presses when an arrow key reaches the detent and releases on key up', async () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<Widget {...props} />);
    screen.getByRole('radio', { checked: true }).focus();
    const user = userEvent.setup();
    await user.keyboard('{ArrowRight>}');
    expect(props.onPress).toHaveBeenCalledWith('start');
    await user.keyboard('{/ArrowRight}');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases when the widget unmounts while held', () => {
    const props = widgetProps(rotary, { position: 'both' });
    const { unmount } = render(<Widget {...props} />);
    fireEvent.pointerDown(start(), { button: 0 });
    unmount();
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('sets the fixed detents with onSet', async () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<Widget {...props} />);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'label left' }));
    expect(props.onSet).toHaveBeenCalledWith('left');
    expect(props.onPress).not.toHaveBeenCalled();
  });
});

describe.each([
  ['toggle', Toggle],
  ['rocker', Rocker],
])('%s given a control with a spring-back detent', (_name, Widget) => {
  it('presses and releases the detent instead of setting it', () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<Widget {...props} />);
    const start = screen.getByRole('radio', { name: 'label start' });
    fireEvent.pointerDown(start, { button: 0 });
    expect(props.onPress).toHaveBeenCalledWith('start');
    fireEvent.pointerUp(start);
    expect(props.onRelease).toHaveBeenCalledTimes(1);
    expect(props.onSet).not.toHaveBeenCalled();
  });
});
