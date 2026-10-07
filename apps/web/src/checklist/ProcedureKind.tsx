import { useMessages } from '../i18n';
import { messages } from './messages';

export function ProcedureKind({ type }: { type: 'normal' | 'emergency' }) {
  const text = useMessages(messages);
  return type === 'emergency' ? (
    <div className="checklist-kind">
      <span className="checklist-chip">{text.abnormalProcedure}</span>
      <span className="checklist-kind-text">{text.failureInjected}</span>
    </div>
  ) : (
    <div className="checklist-eyebrow">{text.normalProcedure}</div>
  );
}
