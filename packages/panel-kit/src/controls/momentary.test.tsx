// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { CircuitBreaker, GuardedHandle, PushButton } from './index';
import { breaker, guarded, momentary, widgetProps } from './test-support';

afterEach(cleanup);

describe('push button', () => {
  const button = () => screen.getByRole('button', { name: 'The control' });

  it('shows rest and held and describes the current position', () => {
    const { rerender } = render(<PushButton {...widgetProps(momentary)} />);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().getAttribute('aria-describedby')).toBeTruthy();
    expect(document.body.textContent).toContain('label released');
    rerender(<PushButton {...widgetProps(momentary, { position: 'held' })} />);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(document.body.textContent).toContain('label held');
  });

  it('presses on pointer down without a position', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { pointerType: 'touch', button: 0 });
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onPress).toHaveBeenCalledWith();
    expect(props.onRelease).not.toHaveBeenCalled();
  });

  it.each(['pointerUp', 'pointerCancel', 'pointerLeave'] as const)(
    'releases once on %s',
    (event) => {
      const props = widgetProps(momentary);
      render(<PushButton {...props} />);
      fireEvent.pointerDown(button(), { button: 0 });
      fireEvent[event](button());
      expect(props.onRelease).toHaveBeenCalledTimes(1);
    },
  );

  it('releases only once when pointer up is followed by leave', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0 });
    fireEvent.pointerUp(button());
    fireEvent.pointerLeave(button());
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('presses then releases on a click with no pointer or key down', () => {
    const calls: string[] = [];
    const props = widgetProps(momentary);
    props.onPress.mockImplementation(() => calls.push('press'));
    props.onRelease.mockImplementation(() => calls.push('release'));
    render(<PushButton {...props} />);
    fireEvent.click(button());
    expect(calls).toEqual(['press', 'release']);
  });

  it('does not press again for the click that follows a pointer press', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0 });
    fireEvent.pointerUp(button());
    fireEvent.click(button());
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });

  it('treats a click after an abandoned press as a new activation', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 0 });
    fireEvent.pointerLeave(button());
    fireEvent.click(button());
    expect(props.onPress).toHaveBeenCalledTimes(2);
  });

  it('does not release without a press', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerLeave(button());
    fireEvent.pointerUp(button());
    expect(props.onRelease).not.toHaveBeenCalled();
  });

  it('ignores a secondary mouse button', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    fireEvent.pointerDown(button(), { button: 2 });
    expect(props.onPress).not.toHaveBeenCalled();
  });

  it('is held by Space and Enter and ignores key repeat', async () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    button().focus();
    const user = userEvent.setup();
    await user.keyboard('{ }');
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onRelease).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(button(), { key: 'Enter' });
    fireEvent.keyDown(button(), { key: 'Enter', repeat: true });
    expect(props.onPress).toHaveBeenCalledTimes(2);
    fireEvent.keyUp(button(), { key: 'Enter' });
    expect(props.onRelease).toHaveBeenCalledTimes(2);
  });

  it('releases when focus leaves while held', () => {
    const props = widgetProps(momentary);
    render(<PushButton {...props} />);
    button().focus();
    fireEvent.pointerDown(button(), { button: 0 });
    button().blur();
    expect(props.onRelease).toHaveBeenCalledTimes(1);
  });
});

describe('circuit breaker', () => {
  const toggle = () => screen.getByRole('switch', { name: 'The control' });

  it('shows in and pulled', () => {
    const { rerender } = render(<CircuitBreaker {...widgetProps(breaker)} />);
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(document.body.textContent).toContain('label in');
    rerender(<CircuitBreaker {...widgetProps(breaker, { position: 'pulled' })} />);
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(document.body.textContent).toContain('label pulled');
  });

  it('pulls an engaged breaker and resets a pulled one', async () => {
    const user = userEvent.setup();
    const engaged = widgetProps(breaker);
    const { unmount } = render(<CircuitBreaker {...engaged} />);
    await user.click(toggle());
    expect(engaged.onSet).toHaveBeenCalledWith('pulled');
    unmount();
    const pulled = widgetProps(breaker, { position: 'pulled' });
    render(<CircuitBreaker {...pulled} />);
    await user.click(toggle());
    expect(pulled.onSet).toHaveBeenCalledWith('in');
  });
});

describe('guarded handle', () => {
  it('offers only the guard while it is closed', async () => {
    const props = widgetProps(guarded);
    render(<GuardedHandle {...props} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    const guard = screen.getByRole('button', { name: 'The control' });
    expect(guard.getAttribute('aria-expanded')).toBe('false');
    await userEvent.setup().click(guard);
    expect(props.onOpenGuard).toHaveBeenCalledTimes(1);
    expect(props.onSet).not.toHaveBeenCalled();
  });

  it('offers the positions once the guard is open', async () => {
    const props = widgetProps(guarded, { guardOpen: true });
    render(<GuardedHandle {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'label pulled' }));
    expect(props.onSet).toHaveBeenCalledWith('pulled');
    expect(props.onOpenGuard).not.toHaveBeenCalled();
  });

  it('closes an open guard with Escape from the handle', () => {
    const props = widgetProps(guarded, { guardOpen: true });
    render(<GuardedHandle {...props} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'label stowed' }), { key: 'Escape' });
    expect(props.onCloseGuard).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while the guard is closed', () => {
    const props = widgetProps(guarded);
    render(<GuardedHandle {...props} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'The control' }), { key: 'Escape' });
    expect(props.onCloseGuard).not.toHaveBeenCalled();
  });

  it('points the guard button at the handle group it reveals', () => {
    render(<GuardedHandle {...widgetProps(guarded, { guardOpen: true })} />);
    const guard = screen.getByRole('button', { name: 'The control' });
    expect(guard.getAttribute('aria-controls')).toBe(
      screen.getByRole('radiogroup', { name: 'The control' }).id,
    );
  });

  it('closes the guard again', async () => {
    const props = widgetProps(guarded, { guardOpen: true });
    render(<GuardedHandle {...props} />);
    const guard = screen.getByRole('button', { name: 'The control' });
    expect(guard.getAttribute('aria-expanded')).toBe('true');
    await userEvent.setup().click(guard);
    expect(props.onCloseGuard).toHaveBeenCalledTimes(1);
  });
});
