import { format, useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import './checklist.css';
import { ItemGroup, leadingCount } from './ItemGroup';
import { messages } from './messages';
import { ProcedureKind } from './ProcedureKind';

/** A procedure's items read straight from the aircraft data, with no session behind it. */
export function ProcedureViewer() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, viewedProcedureId, viewProcedure } = useTrainer();
  const procedure =
    viewedProcedureId === undefined ? undefined : aircraft.procedures[viewedProcedureId];
  if (!procedure) return null;
  const running = procedureId === undefined ? undefined : aircraft.procedures[procedureId];
  const memoryCount = leadingCount(procedure.items, (item) => item.memory === true);
  const rows = procedure.items.map((item, index) => (
    <li key={index} className="checklist-item" data-state="reference">
      <span className="checklist-item-row">
        <span className="checklist-number">{index + 1}</span>
        <span className="checklist-item-text">{localize(item.text)}</span>
      </span>
    </li>
  ));

  return (
    <div className="checklist">
      <div className="checklist-header">
        <ProcedureKind type={procedure.type} />
        <h1 className="checklist-title">{localize(procedure.title)}</h1>
        <p className="checklist-note">{text.viewOnly}</p>
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
        {memoryCount > 0 && (
          <ItemGroup kind="memory" label={text.memoryItems}>
            {rows.slice(0, memoryCount)}
          </ItemGroup>
        )}
        {rows.slice(memoryCount)}
      </ol>
    </div>
  );
}
