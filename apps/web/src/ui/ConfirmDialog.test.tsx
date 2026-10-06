// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

const dialog = (onCancel: () => void) => (
  <ConfirmDialog
    title="Title"
    body="Body"
    confirmLabel="Yes"
    cancelLabel="No"
    onConfirm={vi.fn()}
    onCancel={onCancel}
  />
);

describe('ConfirmDialog', () => {
  it('cancels on Escape without letting an outer handler see the key', async () => {
    const onCancel = vi.fn();
    const outerReact = vi.fn();
    const outerDocument = vi.fn();
    document.addEventListener('keydown', outerDocument);
    render(<div onKeyDown={outerReact}>{dialog(onCancel)}</div>);
    await userEvent.keyboard('{Escape}');
    document.removeEventListener('keydown', outerDocument);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(outerReact).not.toHaveBeenCalled();
    expect(outerDocument).not.toHaveBeenCalled();
  });

  it('does not cancel on other keys', async () => {
    const onCancel = vi.fn();
    render(dialog(onCancel));
    await userEvent.keyboard('a');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
