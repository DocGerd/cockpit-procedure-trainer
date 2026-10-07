import { useId } from 'react';
import { useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import './checklist.css';
import { messages } from './messages';

export function ChecklistSelector() {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft, procedureId, viewedProcedureId, viewProcedure } = useTrainer();
  const selectId = useId();
  const entries = Object.entries(aircraft.procedures);
  if (viewedProcedureId === undefined) return null;

  const group = (type: 'normal' | 'emergency', label: string) => {
    const members = entries.filter(([, procedure]) => procedure.type === type);
    if (members.length === 0) return null;
    return (
      <optgroup label={label}>
        {members.map(([id, procedure]) => (
          <option key={id} value={id}>
            {localize(procedure.title)}
            {id === procedureId ? ` · ${text.runningSuffix}` : ''}
          </option>
        ))}
      </optgroup>
    );
  };

  return (
    <div className="checklist-selector">
      <label htmlFor={selectId} className="checklist-selector-label">
        {text.showChecklist}
      </label>
      <select
        id={selectId}
        className="chrome-button checklist-selector-select"
        value={viewedProcedureId}
        onChange={(event) => viewProcedure(event.target.value)}
      >
        {group('normal', text.groupNormal)}
        {group('emergency', text.groupEmergency)}
      </select>
    </div>
  );
}
