import { useEffect, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import './ui.css';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea';

type ModalDialogProps = {
  role?: 'dialog' | 'alertdialog';
  className: string;
  labelledBy: string;
  describedBy?: string;
  initialFocus: RefObject<HTMLElement | null>;
  onClose(): void;
  children: ReactNode;
};

/** A native modal dialog, portalled to the body so it can sit above any screen. */
export function ModalDialog({
  role,
  className,
  labelledBy,
  describedBy,
  initialFocus,
  onClose,
  children,
}: ModalDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    if (element && !element.open) element.showModal();
    initialFocus.current?.focus();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [initialFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Escape stays inside the dialog, so a drawer underneath never sees it and closes too.
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    // Tab wraps inside the dialog instead of leaving the page for the browser's own controls.
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  // A press on the backdrop or the dialog's own padding would otherwise move focus to the body.
  const onMouseDown = (event: MouseEvent) => {
    if (event.target === event.currentTarget) event.preventDefault();
  };

  return createPortal(
    <dialog
      ref={dialog}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`modal-dialog ${className}`}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
