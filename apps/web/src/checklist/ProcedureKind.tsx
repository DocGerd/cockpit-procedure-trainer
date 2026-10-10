import type { ReactNode } from 'react';
import { useMessages } from '../i18n';
import { messages } from './messages';

/** The header's one kicker: the procedure's kind, then what places it, such as a flight leg. */
export function ProcedureKind({
  type,
  injected = true,
  children,
}: {
  type: 'normal' | 'emergency';
  /** False while a surprise failure is pending, so the label claims no failure. */
  injected?: boolean;
  children?: ReactNode;
}) {
  const text = useMessages(messages);
  return (
    <p className="kicker checklist-kicker">
      {type === 'emergency' ? (
        <>
          <span className="checklist-chip">{text.abnormalProcedure}</span>
          {injected && <span className="checklist-kind-text">{text.failureInjected}</span>}
        </>
      ) : (
        <span>{text.normalProcedure}</span>
      )}
      {children}
    </p>
  );
}
