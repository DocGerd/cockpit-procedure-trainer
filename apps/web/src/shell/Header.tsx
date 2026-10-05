import type { ReactNode } from 'react';
import { deployEnv } from '../deploy-env';
import { ModeControl } from '../modes/ModeControl';
import { PhaseControl } from '../outside-view/PhaseControl';
import { ThemeSwitch } from '../theme';
import { useTrainer } from '../trainer';
import { messages } from './messages';

const text = messages.en;

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
  onClick,
}: {
  eyebrow: string;
  value: string;
  onClick(): void;
}) {
  return (
    <button type="button" className="chrome-button shell-choice" onClick={onClick}>
      <span className="shell-eyebrow">{eyebrow}</span>{' '}
      <span className="shell-choice-value">{value}</span>
    </button>
  );
}

function TrainerChoices() {
  const { aircraft, procedureId, backToPicker } = useTrainer();
  const procedure = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  return (
    <>
      <HeaderChoice eyebrow={text.aircraft} value={aircraft.name.en} onClick={backToPicker} />
      {procedure && (
        <HeaderChoice eyebrow={text.procedure} value={procedure.title.en} onClick={backToPicker} />
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
  const isUat = deployEnv(import.meta.env.VITE_DEPLOY_ENV) === 'uat';
  return (
    <header className="shell-header">
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
