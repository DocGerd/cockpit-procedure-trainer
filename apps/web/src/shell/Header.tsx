import { useState } from 'react';
import type { ReactNode } from 'react';
import { deployEnv } from '../deploy-env';
import { LanguageSwitch, useLocalize, useMessages } from '../i18n';
import { ModeControl } from '../modes/ModeControl';
import { PhaseControl } from '../outside-view/PhaseControl';
import { ThemeSwitch } from '../theme';
import { useLostProgressText, useProgressAtRisk, useTrainer } from '../trainer';
import { ConfirmDialog } from '../ui';
import { messages } from './messages';

function BrandMark() {
  return (
    <svg className="shell-brand-mark" viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 17.09 L69.87 51.5 L30.13 51.5 Z" />
      <path fill="currentColor" d="M26.96 57 L73.04 57 L88 82.91 L12 82.91 Z" />
    </svg>
  );
}

type Choice = 'aircraft' | 'procedure';

function TrainerChoices() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, backToPicker } = useTrainer();
  const risk = useProgressAtRisk();
  const lost = useLostProgressText();
  const [pending, setPending] = useState<Choice>();
  const procedure = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  const choose = (kind: Choice) => {
    if (risk === undefined) backToPicker();
    else setPending(kind);
  };
  const chips: { kind: Choice; eyebrow: string; value: string; action: string }[] = [
    {
      kind: 'aircraft',
      eyebrow: text.aircraft,
      value: localize(aircraft.name),
      action: text.changeAircraft,
    },
    ...(procedure
      ? [
          {
            kind: 'procedure' as const,
            eyebrow: text.procedure,
            value: localize(procedure.title),
            action: text.changeProcedure,
          },
        ]
      : []),
  ];
  const asking = chips.find((chip) => chip.kind === pending);
  const body = pending === 'procedure' ? text.changeProcedureBody : text.changeAircraftBody;
  return (
    <>
      {chips.map(({ kind, eyebrow, value, action }) => (
        <button
          key={kind}
          type="button"
          className="chrome-button shell-choice"
          title={`${action}: ${value}`}
          onClick={() => choose(kind)}
        >
          <span className="shell-eyebrow">{eyebrow}</span>{' '}
          <span className="shell-choice-value">{value}</span>
        </button>
      ))}
      {asking && (
        <ConfirmDialog
          title={`${asking.action}?`}
          body={`${body} ${lost}`}
          confirmLabel={asking.action}
          cancelLabel={text.cancel}
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            setPending(undefined);
            backToPicker();
          }}
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
