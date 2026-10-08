import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import './checklist.css';
import { messages } from './messages';
import { ProcedureKind } from './ProcedureKind';

/** A procedure's items read straight from the aircraft data, with no session behind it. */
export function ProcedureViewer() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, viewedProcedureId, viewProcedure, takeChecklist } = useTrainer();
  const awaiting = useSessionState((snapshot) => {
    const scenario = snapshot.scenario();
    return scenario !== undefined && scenario.chosen === undefined;
  });
  const procedure =
    viewedProcedureId === undefined ? undefined : aircraft.procedures[viewedProcedureId];
  if (!procedure) return null;
  const running = procedureId === undefined ? undefined : aircraft.procedures[procedureId];

  return (
    <div className="checklist">
      <div className="checklist-header">
        <ProcedureKind type={procedure.type} injected={!awaiting} />
        <h1 className="checklist-title">{localize(procedure.title)}</h1>
        {awaiting && <p className="checklist-note">{text.surpriseNote}</p>}
        <p className="checklist-note">{text.viewOnly}</p>
        {awaiting && procedure.type === 'emergency' && viewedProcedureId !== undefined && (
          <button
            type="button"
            className="button-primary checklist-back"
            onClick={() => takeChecklist(viewedProcedureId)}
          >
            {text.runChecklist}
          </button>
        )}
        {running && procedureId !== undefined && (
          <button
            type="button"
            className="button-secondary checklist-back"
            onClick={() => viewProcedure(procedureId)}
          >
            {format(text.backToRunning, { title: localize(running.title) })}
          </button>
        )}
      </div>
      <ol className="checklist-items">
        {procedure.items.map((item, index) => (
          <li key={index} className="checklist-item" data-state="reference">
            <span className="checklist-item-row">
              <span className="checklist-number">{index + 1}</span>
              <span className="checklist-item-text">{localize(item.text)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
