import type { Aircraft } from '@cpt/core';
import { useId, useState } from 'react';
import { aircraftRegistry } from '../aircraft-registry';
import { StartupNotice } from '../errors/StartupNotice';
import { useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import { AppFooter } from './AppFooter';
import { Header } from './Header';
import { useLayout } from './layout';
import { messages } from './messages';

type PickerMode = 'guided' | 'practice';

const count = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`;

function AircraftChoice({ aircraft, selected }: { aircraft: Aircraft; selected: boolean }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { selectAircraft } = useTrainer();
  return (
    <button
      type="button"
      className="picker-card"
      aria-pressed={selected}
      onClick={() => selectAircraft(aircraft.id)}
    >
      <span className="picker-card-title">{localize(aircraft.name)}</span>{' '}
      <span className="picker-card-text">
        {text.handbookRevision}: {localize(aircraft.handbookRevision)}
      </span>{' '}
      <span className="picker-meta">
        {count(Object.keys(aircraft.views).length, text.viewOne, text.viewOther)} ·{' '}
        {count(Object.keys(aircraft.procedures).length, text.procedureOne, text.procedureOther)}
      </span>
    </button>
  );
}

function ProcedureGroup({
  label,
  ids,
  selected,
  onSelect,
}: {
  label: string;
  ids: readonly string[];
  selected: string | undefined;
  onSelect(id: string): void;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft } = useTrainer();
  const labelId = useId();
  if (ids.length === 0) return null;
  return (
    <div role="group" aria-labelledby={labelId}>
      <div id={labelId} className="picker-group-label">
        {label}
      </div>
      {ids.map((id) => {
        const procedure = aircraft.procedures[id];
        if (!procedure) return null;
        const phase = aircraft.phases[procedure.startPhase];
        return (
          <button
            key={id}
            type="button"
            className="picker-row"
            aria-pressed={id === selected}
            onClick={() => onSelect(id)}
          >
            <span className="picker-row-title">{localize(procedure.title)}</span>{' '}
            <span className="picker-meta">
              {phase ? `${localize(phase.name)} · ` : ''}
              {count(procedure.items.length, text.itemOne, text.itemOther)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Picker() {
  const text = useMessages(messages);
  const layout = useLayout();
  const trainer = useTrainer();
  const { aircraft } = trainer;
  const ids = Object.keys(aircraft.procedures);
  const [picked, setPicked] = useState<string | undefined>();
  const selected = picked !== undefined && ids.includes(picked) ? picked : ids[0];
  const [mode, setMode] = useState<PickerMode>(trainer.mode === 'practice' ? 'practice' : 'guided');
  const aircraftHeading = useId();
  const procedureHeading = useId();
  const modeName = useId();

  const byType = (type: 'normal' | 'emergency') =>
    ids.filter((id) => aircraft.procedures[id]?.type === type);

  const start = () => {
    if (selected === undefined) return;
    trainer.setMode(mode);
    trainer.startProcedure(selected);
  };

  return (
    <div className="shell" data-layout={layout} data-screen="picker">
      <Header variant="picker" />
      <main className="picker">
        <div className="picker-intro">
          <p className="shell-eyebrow">{text.pickerEyebrow}</p>
          <h1 className="picker-title">{text.pickerTitle}</h1>
        </div>
        <div className="picker-columns">
          <section className="picker-aircraft" aria-labelledby={aircraftHeading}>
            <h2 id={aircraftHeading} className="picker-heading">
              {text.aircraft}
            </h2>
            {aircraftRegistry.map((entry) => (
              <AircraftChoice key={entry.id} aircraft={entry} selected={entry === aircraft} />
            ))}
          </section>
          <section className="picker-procedures" aria-labelledby={procedureHeading}>
            <h2 id={procedureHeading} className="picker-heading">
              {text.procedure}
            </h2>
            {ids.length === 0 ? (
              <p className="picker-card-text">{text.noProcedures}</p>
            ) : (
              <div className="picker-list">
                <ProcedureGroup
                  label={text.normalProcedures}
                  ids={byType('normal')}
                  selected={selected}
                  onSelect={setPicked}
                />
                <ProcedureGroup
                  label={text.emergencyProcedures}
                  ids={byType('emergency')}
                  selected={selected}
                  onSelect={setPicked}
                />
              </div>
            )}
            <fieldset className="picker-modes">
              <legend className="picker-heading">{text.mode}</legend>
              {(
                [
                  ['guided', text.guided, text.guidedHint],
                  ['practice', text.practice, text.practiceHint],
                ] as const
              ).map(([value, label, hint]) => (
                <label key={value} className="picker-mode">
                  <input
                    type="radio"
                    name={modeName}
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span className="picker-mode-text">
                    <span className="picker-mode-label">{label}</span>{' '}
                    <span className="picker-card-text">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="picker-actions">
              <button
                type="button"
                className="button-primary"
                disabled={selected === undefined}
                onClick={start}
              >
                {text.startProcedure}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => trainer.setMode('explore')}
              >
                {text.exploreCockpit}
              </button>
            </div>
          </section>
        </div>
        <StartupNotice />
      </main>
      <AppFooter />
    </div>
  );
}
