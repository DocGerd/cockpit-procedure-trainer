import { useMessages } from '../i18n';
import { messages } from './messages';

export function ProcedureKind({
  type,
  injected = true,
}: {
  type: 'normal' | 'emergency';
  /** False while a surprise failure is pending, so the label claims no failure. */
  injected?: boolean;
}) {
  const text = useMessages(messages);
  return type === 'emergency' ? (
    <div className="checklist-kind">
      <span className="checklist-chip">{text.abnormalProcedure}</span>
      {injected && <span className="checklist-kind-text">{text.failureInjected}</span>}
    </div>
  ) : (
    <div className="checklist-eyebrow">{text.normalProcedure}</div>
  );
}
