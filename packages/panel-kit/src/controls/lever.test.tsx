// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Lever } from './index';
import { continuousLever, notchedLever, widgetProps } from './test-support';

afterEach(cleanup);

function lay(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 }) as DOMRect;
}

const touch = { pointerId: 1, pointerType: 'touch', button: 0, buttons: 1 };

describe('continuous lever', () => {
  const slider = () => screen.getByRole('slider', { name: 'The control' });

  it('exposes its value and range', () => {
    render(<Lever {...widgetProps(continuousLever, { position: 0.25 })} />);
    expect(slider().getAttribute('aria-valuenow')).toBe('0.25');
    expect(slider().getAttribute('aria-valuemin')).toBe('0');
    expect(slider().getAttribute('aria-valuemax')).toBe('1');
  });

  it('clamps a drag past either stop to exactly 0 or 1', () => {
    const props = widgetProps(continuousLever, { position: 0.5 });
    render(<Lever {...props} />);
    lay(slider());
    fireEvent.pointerDown(slider(), { ...touch, clientY: 50 });
    fireEvent.pointerMove(slider(), { ...touch, clientY: -400 });
    fireEvent.pointerMove(slider(), { ...touch, clientY: 900 });
    const sent = props.onSet.mock.calls.map(([value]) => value);
    expect(sent).toContain(1);
    expect(sent.at(-1)).toBe(0);
    expect(Object.is(sent.at(-1), 0)).toBe(true);
  });

  it('sends values inside [0, 1] while dragging between the stops', () => {
    const props = widgetProps(continuousLever);
    render(<Lever {...props} />);
    lay(slider());
    fireEvent.pointerDown(slider(), { ...touch, clientY: 88 });
    fireEvent.pointerMove(slider(), { ...touch, clientY: 50 });
    fireEvent.pointerMove(slider(), { ...touch, clientY: 30 });
    const sent = props.onSet.mock.calls.map(([value]) => value as number);
    expect(sent[0]).toBe(0);
    expect(sent[1]).toBeCloseTo(0.5, 5);
    expect(sent[2]).toBeCloseTo(0.763, 2);
    for (const value of sent) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('follows a mouse drag only while the button is down', () => {
    const props = widgetProps(continuousLever);
    render(<Lever {...props} />);
    lay(slider());
    fireEvent.pointerMove(slider(), { ...touch, clientY: 50 });
    expect(props.onSet).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider(), { pointerId: 1, button: 0, buttons: 1, clientY: 50 });
    fireEvent.pointerUp(slider(), { pointerId: 1, button: 0, buttons: 0, clientY: 50 });
    props.onSet.mockClear();
    fireEvent.pointerMove(slider(), { pointerId: 1, buttons: 1, clientY: 20 });
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('stops following when the button was released elsewhere', () => {
    const props = widgetProps(continuousLever);
    render(<Lever {...props} />);
    lay(slider());
    fireEvent.pointerDown(slider(), { pointerId: 1, button: 0, buttons: 1, clientY: 50 });
    props.onSet.mockClear();
    fireEvent.pointerMove(slider(), { pointerId: 1, buttons: 0, clientY: 20 });
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('stops a drag on pointer cancel', () => {
    const props = widgetProps(continuousLever);
    render(<Lever {...props} />);
    lay(slider());
    fireEvent.pointerDown(slider(), { ...touch, clientY: 50 });
    fireEvent.pointerCancel(slider(), touch);
    props.onSet.mockClear();
    fireEvent.pointerMove(slider(), { ...touch, clientY: 20 });
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('steps with the keyboard and lands exactly on the stops', async () => {
    const props = widgetProps(continuousLever, { position: 0.5 });
    render(<Lever {...props} />);
    slider().focus();
    const user = userEvent.setup();
    await user.keyboard('{ArrowUp}');
    expect(props.onSet).toHaveBeenLastCalledWith(0.55);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(props.onSet).toHaveBeenLastCalledWith(0.45);
    await user.keyboard('{End}');
    expect(props.onSet).toHaveBeenLastCalledWith(1);
    await user.keyboard('{Home}');
    expect(props.onSet).toHaveBeenLastCalledWith(0);
  });

  it('does not step past a stop', async () => {
    const props = widgetProps(continuousLever, { position: 1 });
    render(<Lever {...props} />);
    slider().focus();
    await userEvent.setup().keyboard('{ArrowUp}{PageUp}');
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('ignores a pointer with no layout', () => {
    const props = widgetProps(continuousLever);
    render(<Lever {...props} />);
    fireEvent.pointerDown(slider(), { ...touch, clientY: 50 });
    expect(props.onSet).not.toHaveBeenCalled();
  });
});

describe('notched lever', () => {
  const group = () => screen.getByRole('radiogroup', { name: 'The control' });

  it('shows every notch and marks the current one', () => {
    render(<Lever {...widgetProps(notchedLever, { position: 'ten' })} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'label up',
      'label ten',
      'label twenty',
      'label full',
    ]);
    expect(screen.getByRole('radio', { checked: true }).getAttribute('aria-label')).toBe(
      'label ten',
    );
  });

  it('snaps a drag to the nearest notch by name', () => {
    const props = widgetProps(notchedLever);
    const { rerender } = render(<Lever {...props} />);
    lay(group());
    fireEvent.pointerDown(group(), { ...touch, clientY: 88 });
    fireEvent.pointerMove(group(), { ...touch, clientY: 60 });
    fireEvent.pointerMove(group(), { ...touch, clientY: 55 });
    fireEvent.pointerMove(group(), { ...touch, clientY: 45 });
    fireEvent.pointerMove(group(), { ...touch, clientY: -100 });
    expect(props.onSet.mock.calls.map(([id]) => id)).toEqual(['ten', 'twenty', 'full']);
    rerender(
      <Lever {...widgetProps(notchedLever, { position: 'full' })} {...{ onSet: props.onSet }} />,
    );
    fireEvent.pointerMove(group(), { ...touch, clientY: 500 });
    expect(props.onSet).toHaveBeenLastCalledWith('up');
  });

  it('sets a notch once when it is clicked', async () => {
    const props = widgetProps(notchedLever);
    render(<Lever {...props} />);
    lay(group());
    await userEvent
      .setup()
      .pointer([
        { keys: '[MouseLeft]', target: screen.getByRole('radio', { name: 'label full' }) },
      ]);
    expect(props.onSet).toHaveBeenCalledTimes(1);
    expect(props.onSet).toHaveBeenCalledWith('full');
  });

  it('activates a notch from the keyboard', async () => {
    const props = widgetProps(notchedLever);
    render(<Lever {...props} />);
    screen.getByRole('radio', { checked: true }).focus();
    const user = userEvent.setup();
    await user.keyboard('{ArrowUp}');
    expect(props.onSet).toHaveBeenLastCalledWith('ten');
    await user.keyboard('{End}');
    expect(props.onSet).toHaveBeenLastCalledWith('full');
  });
});
