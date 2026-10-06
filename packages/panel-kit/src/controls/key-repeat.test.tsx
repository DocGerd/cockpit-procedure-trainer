// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PushButton, RotaryKnob } from './index';
import { momentary, rotary, widgetProps } from './test-support';

afterEach(cleanup);

/** A held key as a browser delivers it: each repeat keydown is followed by a click. */
function holdEnter(element: HTMLElement, repeats: number) {
  fireEvent.keyDown(element, { key: 'Enter' });
  fireEvent.click(element, { detail: 0 });
  for (let index = 0; index < repeats; index += 1) {
    fireEvent.keyDown(element, { key: 'Enter', repeat: true });
    fireEvent.click(element, { detail: 0 });
  }
}

describe('a held key on a hold control', () => {
  it('presses a push button once and releases it only on key up', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    const button = screen.getByRole('button', { name: 'The control' });
    holdEnter(button, 3);
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).not.toHaveBeenCalled();
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('presses a spring detent once and releases it only on key up', () => {
    const props = widgetProps(rotary, { position: 'both' });
    render(<RotaryKnob {...props} />);
    const start = screen.getByRole('radio', { name: 'label start' });
    holdEnter(start, 3);
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).not.toHaveBeenCalled();
    expect(props.onSet).not.toHaveBeenCalled();
    fireEvent.keyUp(start, { key: 'Enter' });
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('holds through a real held Enter', async () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    screen.getByRole('button', { name: 'The control' }).focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter>4}');
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).not.toHaveBeenCalled();
    await user.keyboard('{/Enter}');
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });
});
