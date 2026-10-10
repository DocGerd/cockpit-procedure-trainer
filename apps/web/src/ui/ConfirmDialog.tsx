import { useId, useRef } from 'react';
import { ModalDialog } from './ModalDialog';

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Every confirm in the app so far discards progress, so destructive is the default. */
  tone?: 'destructive' | 'neutral';
  onConfirm(): void;
  onCancel(): void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'destructive',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const cancel = useRef<HTMLButtonElement>(null);

  return (
    <ModalDialog
      role="alertdialog"
      className="confirm-dialog"
      labelledBy={titleId}
      describedBy={bodyId}
      initialFocus={cancel}
      onClose={onCancel}
    >
      <h2 id={titleId} className="confirm-title">
        {title}
      </h2>
      <p id={bodyId} className="confirm-body">
        {body}
      </p>
      <div className="confirm-actions">
        <button
          ref={cancel}
          type="button"
          className="button-secondary confirm-cancel"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={
            tone === 'destructive' ? 'button-secondary confirm-destructive' : 'button-primary'
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}
