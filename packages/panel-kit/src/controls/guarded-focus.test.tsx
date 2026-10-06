// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuardedHandle } from './GuardedHandle';
import { guarded, widgetProps } from './test-support';

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  const props = widgetProps(guarded, {
    guardOpen: open,
    positionLabels: { stowed: 'Stowed', pulled: 'Pulled' },
  });
  return (
    <GuardedHandle
      {...props}
      onOpenGuard={() => setOpen(true)}
      onCloseGuard={() => setOpen(false)}
    />
  );
}

const guardButton = () => screen.getByRole('button', { name: 'The control' });

describe('guarded handle keyboard', () => {
  it('puts the guard before the positions in tab order', () => {
    render(<GuardedHandle {...widgetProps(guarded, { guardOpen: true })} />);
    const order = [...document.querySelectorAll('button')];
    expect(order[0]).toBe(guardButton());
    expect(order.slice(1).every((button) => button.getAttribute('role') === 'radio')).toBe(true);
  });

  it('moves focus into the current position when Enter opens the guard', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    guardButton().focus();
    await user.keyboard('{Enter}');
    const checked = screen.getByRole('radio', { checked: true });
    expect(document.activeElement).toBe(checked);
  });

  it('returns focus to the guard button on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    guardButton().focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(document.activeElement).toBe(guardButton());
  });

  it('keeps focus on the guard button when it is closed by activating it again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(guardButton());
    await user.click(guardButton());
    expect(document.activeElement).toBe(guardButton());
  });
});
