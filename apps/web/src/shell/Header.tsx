import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { deployEnv } from '../deploy-env';
import { LanguageSwitch, useLocalize, useMessages } from '../i18n';
import { ModeControl } from '../modes/ModeControl';
import { PhaseControl } from '../outside-view/PhaseControl';
import { ThemeSwitch } from '../theme';
import { useLeavingRisk, useTrainer } from '../trainer';
import { ConfirmDialog } from '../ui';
import { headerMessages } from './header.messages';
import { messages } from './messages';
import './header.css';

function BrandMark() {
  return (
    <svg className="shell-brand-mark" viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 17.09 L69.87 51.5 L30.13 51.5 Z" />
      <path fill="currentColor" d="M26.96 57 L73.04 57 L88 82.91 L12 82.91 Z" />
    </svg>
  );
}

type Leave = 'aircraft' | 'procedure' | 'home';

function LeaveConfirm({ kind, onDone }: { kind: Leave; onDone(): void }) {
  const text = useMessages(messages);
  const headerText = useMessages(headerMessages);
  const { backToPicker } = useTrainer();
  const { lost } = useLeavingRisk();
  const { action, body } = {
    aircraft: { action: text.changeAircraft, body: text.changeAircraftBody },
    procedure: { action: text.changeProcedure, body: text.changeProcedureBody },
    home: { action: headerText.home, body: headerText.homeBody },
  }[kind];
  return (
    <ConfirmDialog
      title={`${action}?`}
      body={`${body} ${lost}`}
      confirmLabel={action}
      cancelLabel={text.cancel}
      onCancel={onDone}
      onConfirm={() => {
        onDone();
        backToPicker();
      }}
    />
  );
}

function Breadcrumb({ onChoose }: { onChoose(kind: 'aircraft' | 'procedure'): void }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId } = useTrainer();
  const procedure = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  const crumbs = [
    { kind: 'aircraft' as const, value: localize(aircraft.name), action: text.changeAircraft },
    ...(procedure
      ? [
          {
            kind: 'procedure' as const,
            value: localize(procedure.title),
            action: text.changeProcedure,
          },
        ]
      : []),
  ];
  return (
    <div className="shell-breadcrumb">
      {crumbs.map(({ kind, value, action }, index) => (
        <Fragment key={kind}>
          {index > 0 && (
            <span className="shell-breadcrumb-separator" aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            className="shell-choice"
            title={`${action}: ${value}`}
            onClick={() => onChoose(kind)}
          >
            <span className="shell-choice-value">{value}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function useDocumentTitle(variant: 'picker' | 'trainer') {
  const headerText = useMessages(headerMessages);
  const localize = useLocalize();
  const { aircraft, procedureId } = useTrainer();
  const procedure = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  const context =
    variant === 'picker'
      ? []
      : [...(procedure ? [localize(procedure.title)] : []), localize(aircraft.name)];
  const title = [context.join(' · '), headerText.appTitle].filter(Boolean).join(' — ');
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export function Header({
  variant,
  checklistToggle,
}: {
  variant: 'picker' | 'trainer';
  checklistToggle?: ReactNode;
}) {
  const text = useMessages(messages);
  const headerText = useMessages(headerMessages);
  const isUat = deployEnv(import.meta.env.VITE_DEPLOY_ENV) === 'uat';
  const { backToPicker } = useTrainer();
  const { atRisk } = useLeavingRisk();
  const [pending, setPending] = useState<Leave>();
  const leave = (kind: Leave) => {
    if (atRisk) setPending(kind);
    else backToPicker();
  };
  useDocumentTitle(variant);
  const brand = (
    <>
      <BrandMark />
      <span className="shell-brand-name">{text.brandName}</span>
    </>
  );
  return (
    <header className="shell-header" data-variant={variant}>
      <div className="shell-brand">
        {variant === 'trainer' ? (
          <button
            type="button"
            className="shell-home"
            title={headerText.home}
            onClick={() => leave('home')}
          >
            {brand}
          </button>
        ) : (
          brand
        )}
        {isUat && <span className="uat-badge">{text.uatBadge}</span>}
      </div>
      {variant === 'trainer' && <Breadcrumb onChoose={leave} />}
      <div className="shell-controls">
        {variant === 'trainer' && (
          <>
            <PhaseControl />
            <ModeControl />
            {checklistToggle}
          </>
        )}
        <LanguageSwitch />
        <ThemeSwitch
          labels={{ switchToLight: text.switchToLight, switchToDark: text.switchToDark }}
        />
      </div>
      {pending && <LeaveConfirm kind={pending} onDone={() => setPending(undefined)} />}
    </header>
  );
}
