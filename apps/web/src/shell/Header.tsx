import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { deployEnv } from '../deploy-env';
import { LanguageSwitch, useLocalize, useMessages } from '../i18n';
import { ModeControl } from '../modes/ModeControl';
import { PhaseControl } from '../outside-view/PhaseControl';
import { ThemeSwitch } from '../theme';
import { useTrainer } from '../trainer';
import { messages } from './messages';

function BrandMark() {
  return (
    <svg className="shell-brand-mark" viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 17.09 L69.87 51.5 L30.13 51.5 Z" />
      <path fill="currentColor" d="M26.96 57 L73.04 57 L88 82.91 L12 82.91 Z" />
    </svg>
  );
}

function HeaderChoice({
  eyebrow,
  value,
  action,
  open,
  onToggle,
  onClose,
  onChange,
}: {
  eyebrow: string;
  value: string;
  action: string;
  open: boolean;
  onToggle(): void;
  onClose(): void;
  onChange(): void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const labelId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !anchor.current?.contains(event.target)) {
        close.current();
      }
    };
    // Capture phase: the dialog is the topmost layer, so Escape must not reach the checklist drawer.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (anchor.current?.contains(document.activeElement)) chip.current?.focus();
      close.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) dialog.current?.focus();
  }, [open]);

  return (
    <div
      ref={anchor}
      className="shell-choice-anchor"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !anchor.current?.contains(next)) onClose();
      }}
    >
      <button
        ref={chip}
        type="button"
        className="chrome-button shell-choice"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={onToggle}
      >
        <span className="shell-eyebrow">{eyebrow}</span>{' '}
        <span className="shell-choice-value">{value}</span>
      </button>
      {open && (
        <div
          ref={dialog}
          id={dialogId}
          role="dialog"
          aria-labelledby={labelId}
          tabIndex={-1}
          className="shell-choice-details"
        >
          <p id={labelId} className="shell-detail-label">
            {eyebrow}
          </p>
          <p className="shell-detail-value">{value}</p>
          <button type="button" className="chrome-button" onClick={onChange}>
            {action}
          </button>
        </div>
      )}
    </div>
  );
}

type Choice = 'aircraft' | 'procedure';

function TrainerChoices() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, backToPicker } = useTrainer();
  const [open, setOpen] = useState<Choice>();
  const procedure = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  const choice = (kind: Choice) => ({
    open: open === kind,
    onToggle: () => setOpen((current) => (current === kind ? undefined : kind)),
    onClose: () => setOpen(undefined),
    onChange: backToPicker,
  });
  return (
    <>
      <HeaderChoice
        eyebrow={text.aircraft}
        value={localize(aircraft.name)}
        action={text.changeAircraft}
        {...choice('aircraft')}
      />
      {procedure && (
        <HeaderChoice
          eyebrow={text.procedure}
          value={localize(procedure.title)}
          action={text.changeProcedure}
          {...choice('procedure')}
        />
      )}
    </>
  );
}

export function Header({
  variant,
  checklistToggle,
}: {
  variant: 'picker' | 'trainer';
  checklistToggle?: ReactNode;
}) {
  const text = useMessages(messages);
  const isUat = deployEnv(import.meta.env.VITE_DEPLOY_ENV) === 'uat';
  return (
    <header className="shell-header" data-variant={variant}>
      <div className="shell-brand">
        <BrandMark />
        <span className="shell-brand-name">{text.brandName}</span>
        {isUat && <span className="uat-badge">{text.uatBadge}</span>}
      </div>
      {variant === 'trainer' && <TrainerChoices />}
      <div className="shell-header-spacer" />
      {variant === 'trainer' && (
        <>
          <PhaseControl />
          <ModeControl />
          {checklistToggle}
        </>
      )}
      <LanguageSwitch />
      <ThemeSwitch
        labels={{
          light: text.themeLight,
          dark: text.themeDark,
          switchToLight: text.switchToLight,
          switchToDark: text.switchToDark,
        }}
      />
    </header>
  );
}
