// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

const dialog = (onCancel: () => void, onConfirm = vi.fn()) => (
  <ConfirmDialog
    title="Title"
    body="Body"
    confirmLabel="Yes"
    cancelLabel="No"
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

describe('ConfirmDialog', () => {
  it('opens as a native modal dialog with focus on Cancel', () => {
    render(dialog(vi.fn()));
    const element = screen.getByRole('alertdialog', { name: 'Title' });
    expect(element.tagName).toBe('DIALOG');
    expect(element.hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'No' }));
  });

  it('marks the confirm action destructive and keeps Cancel neutral', () => {
    render(dialog(vi.fn()));
    expect(screen.getByRole('button', { name: 'Yes' }).className).toContain('confirm-destructive');
    expect(screen.getByRole('button', { name: 'No' }).className).toContain('confirm-cancel');
  });

  it('offers a neutral confirm when the action discards nothing', () => {
    render(
      <ConfirmDialog
        title="Title"
        body="Body"
        confirmLabel="Yes"
        cancelLabel="No"
        tone="neutral"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Yes' }).className).toBe('button-primary');
  });

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

  it('cancels once when the browser asks the dialog to close', () => {
    const onCancel = vi.fn();
    render(dialog(onCancel));
    const element = screen.getByRole('alertdialog');
    const cancel = new Event('cancel', { cancelable: true });
    element.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel on other keys', async () => {
    const onCancel = vi.fn();
    render(dialog(onCancel));
    await userEvent.keyboard('a');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps focus inside when the backdrop is pressed', () => {
    const onCancel = vi.fn();
    render(dialog(onCancel));
    const element = screen.getByRole('alertdialog');
    expect(fireEvent.mouseDown(element)).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: 'Yes' }))).toBe(true);
    fireEvent.click(element);
    expect(onCancel).not.toHaveBeenCalled();
    expect(element.hasAttribute('open')).toBe(true);
  });

  it('returns focus to the opener when it closes', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const onConfirm = vi.fn();
    const { unmount } = render(dialog(vi.fn(), onConfirm));
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
