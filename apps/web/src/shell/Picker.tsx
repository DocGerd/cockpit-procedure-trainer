import { flightLegs, phaseName } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import { useId, useMemo, useState } from 'react';
import { aircraftRegistry } from '../aircraft-registry';
import { StartupNotice } from '../errors/StartupNotice';
import { format, useLanguage, useLocalize, useMessages } from '../i18n';
import { readHistory } from '../storage';
import { useTrainer } from '../trainer';
import {
  flightSurprisePhases,
  practiseNext,
  randomEmergency,
  surprisePhases,
} from '../trainer/scenarios';
import { AppFooter } from './AppFooter';
import { Header } from './Header';
import { useLayout } from './layout';
import { messages } from './messages';
import { pickerMessages } from './picker.messages';
import { relativeDate } from './relative-date';
import './picker.css';

type PickerMode = 'guided' | 'practice';

type ProcedureType = 'normal' | 'emergency';

const ANY_PHASE = '*';

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
      <span className="picker-card-head">
        <span className="picker-card-title">{localize(aircraft.name)}</span>{' '}
        <span className="picker-meta readout">
          {count(Object.keys(aircraft.views).length, text.viewOne, text.viewOther)} ·{' '}
          {count(Object.keys(aircraft.procedures).length, text.procedureOne, text.procedureOther)}
        </span>
      </span>{' '}
      <span className="picker-card-revision">
        {text.handbookRevision}: {localize(aircraft.handbookRevision)}
      </span>
    </button>
  );
}

function ProcedureGroup({
  id: groupId,
  type,
  label,
  ids,
  selected,
  onSelect,
}: {
  id: string;
  type: ProcedureType;
  label: string;
  ids: readonly string[];
  selected: string | undefined;
  onSelect(id: string): void;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { language } = useLanguage();
  const { aircraft } = useTrainer();
  const labelId = useId();
  const history = useMemo(() => readHistory(aircraft.id), [aircraft.id]);
  const deviationCount = (n: number) =>
    format(n === 1 ? text.toggleDeviationOne : text.toggleDeviationOther, { count: n });
  if (ids.length === 0) return null;
  return (
    <div role="group" id={groupId} aria-labelledby={labelId} data-type={type}>
      <div id={labelId} className="picker-group-label">
        {label}
      </div>
      {ids.map((id) => {
        const procedure = aircraft.procedures[id];
        if (!procedure) return null;
        const phase = phaseName(procedure.startPhase);
        const run = history[id];
        return (
          <button
            key={id}
            type="button"
            className="picker-row"
            aria-pressed={id === selected}
            onClick={() => onSelect(id)}
          >
            <span className="picker-row-title">{localize(procedure.title)}</span>{' '}
            <span className="leader" />
            <span className="picker-meta readout">
              {phase ? `${localize(phase)} · ` : ''}
              {count(procedure.items.length, text.itemOne, text.itemOther)}
            </span>
            {run && (
              <span className="picker-history readout">
                <span className="picker-meta">
                  {format(text.historyLast, {
                    result: deviationCount(run.last.deviations),
                    when: relativeDate(run.last.at, Date.now(), language),
                  })}
                </span>
                {run.best &&
                  (run.last.mode === 'guided' || run.best.deviations < run.last.deviations) && (
                    <span className="picker-meta">
                      {format(text.historyBest, { result: deviationCount(run.best.deviations) })}
                    </span>
                  )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Drills({ mode }: { mode: PickerMode }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const trainer = useTrainer();
  const { aircraft } = trainer;
  const headingId = useId();
  const nextHint = useId();
  const randomHint = useId();
  const surpriseHint = useId();
  const flightHint = useId();
  const phaseSelect = useId();
  const flightSurpriseSelect = useId();
  const suggestion = useMemo(() => practiseNext(aircraft, readHistory(aircraft.id)), [aircraft]);
  const phases = surprisePhases(aircraft);
  const [chosenPhase, setPhase] = useState<string>();
  const phase = chosenPhase !== undefined && phases.includes(chosenPhase) ? chosenPhase : phases[0];
  const flightPhases = useMemo(() => flightSurprisePhases(aircraft), [aircraft]);
  const [flightChoice, setFlightChoice] = useState('');
  const [flightRecall, setFlightRecall] = useState(trainer.recall);
  const flightSurprise =
    mode === 'practice' && (flightChoice === ANY_PHASE || flightPhases.includes(flightChoice))
      ? flightChoice
      : '';
  const suggested = suggestion && aircraft.procedures[suggestion.id];
  const flight = flightLegs(aircraft).length > 1;
  if (!suggested && phase === undefined && !flight) return null;

  const run = (id: string) => {
    trainer.setMode(mode);
    trainer.startProcedure(id);
  };
  const reasons = {
    deviations: text.practiseNextDeviations,
    new: text.practiseNextNew,
    oldest: text.practiseNextOldest,
  };

  return (
    <section className="picker-drills scroll-thin" aria-labelledby={headingId}>
      <h2 id={headingId} className="picker-heading">
        {text.drills}
      </h2>
      <div className="picker-drill-list">
        {suggestion && suggested && (
          <div className="picker-drill">
            <button
              type="button"
              className="button-secondary"
              aria-describedby={nextHint}
              onClick={() => run(suggestion.id)}
            >
              {text.practiseNext}
            </button>
            <div className="picker-drill-body">
              <p id={nextHint}>
                {format(reasons[suggestion.reason], { title: localize(suggested.title) })}
              </p>
            </div>
          </div>
        )}
        {flight && (
          <div className="picker-drill">
            <button
              type="button"
              className="button-secondary"
              aria-describedby={flightHint}
              onClick={() => {
                trainer.setMode(mode);
                trainer.startFlight({
                  recall: mode === 'practice' && flightRecall,
                  ...(flightSurprise === ''
                    ? {}
                    : { surprise: flightSurprise === ANY_PHASE ? {} : { phase: flightSurprise } }),
                });
              }}
            >
              {text.fullFlight}
            </button>
            <div className="picker-drill-body">
              <p id={flightHint}>{text.fullFlightHint}</p>
              {mode === 'practice' && (
                <>
                  {flightPhases.length > 0 && (
                    <div className="picker-surprise">
                      <label htmlFor={flightSurpriseSelect}>{text.flightSurprise}</label>
                      <select
                        id={flightSurpriseSelect}
                        className="chrome-button"
                        value={flightSurprise}
                        onChange={(event) => setFlightChoice(event.target.value)}
                      >
                        <option value="">{text.flightSurpriseNone}</option>
                        <option value={ANY_PHASE}>{text.flightSurpriseAny}</option>
                        {flightPhases.map((id) => {
                          const name = phaseName(id);
                          return (
                            <option key={id} value={id}>
                              {name ? localize(name) : id}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  <label className="picker-check">
                    <input
                      type="checkbox"
                      className="switch"
                      checked={flightRecall}
                      onChange={(event) => setFlightRecall(event.target.checked)}
                    />
                    {text.hideUpcoming}
                  </label>
                </>
              )}
            </div>
          </div>
        )}
        {phase !== undefined && (
          <>
            <div className="picker-drill">
              <button
                type="button"
                className="button-secondary"
                aria-describedby={randomHint}
                onClick={() => {
                  const id = randomEmergency(aircraft);
                  if (id !== undefined) run(id);
                }}
              >
                {text.randomEmergency}
              </button>
              <div className="picker-drill-body">
                <p id={randomHint}>{text.randomEmergencyHint}</p>
              </div>
            </div>
            <div className="picker-drill">
              <button
                type="button"
                className="button-secondary"
                aria-describedby={surpriseHint}
                onClick={() => trainer.startSurprise(phase)}
              >
                {text.surpriseFailure}
              </button>
              <div className="picker-drill-body">
                <p id={surpriseHint}>{text.surpriseHint}</p>
                <div className="picker-surprise">
                  <label htmlFor={phaseSelect}>{text.surprisePhase}</label>
                  <select
                    id={phaseSelect}
                    className="chrome-button"
                    value={phase}
                    onChange={(event) => setPhase(event.target.value)}
                  >
                    {phases.map((id) => {
                      const name = phaseName(id);
                      return (
                        <option key={id} value={id}>
                          {name ? localize(name) : id}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function Picker() {
  const text = useMessages(messages);
  const pickerText = useMessages(pickerMessages);
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
  const exploreHint = useId();
  const groupId = useId();

  const byType = (type: ProcedureType) =>
    ids.filter((id) => aircraft.procedures[id]?.type === type);
  const groups = (
    [
      ['normal', text.normalProcedures],
      ['emergency', text.emergencyProcedures],
    ] as const
  )
    .map(([type, label]) => ({ type, label, id: `${groupId}-${type}`, ids: byType(type) }))
    .filter((group) => group.ids.length > 0);

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
          <h1 className="picker-title">{text.pickerTitle}</h1>
          <StartupNotice />
        </div>
        <div className="picker-columns">
          <section className="picker-aircraft" aria-labelledby={aircraftHeading}>
            <h2 id={aircraftHeading} className="picker-heading">
              {text.aircraft}
            </h2>
            <div className="picker-cards">
              {aircraftRegistry.map((entry) => (
                <AircraftChoice key={entry.id} aircraft={entry} selected={entry === aircraft} />
              ))}
            </div>
          </section>
          <section className="picker-procedures" aria-labelledby={procedureHeading}>
            <h2 id={procedureHeading} className="picker-heading">
              {text.procedure}
            </h2>
            {ids.length === 0 ? (
              <p className="picker-empty">{text.noProcedures}</p>
            ) : (
              <div className="picker-index">
                <div className="picker-list scroll-thin">
                  {groups.map((group) => (
                    <ProcedureGroup
                      key={group.type}
                      id={group.id}
                      type={group.type}
                      label={group.label}
                      ids={group.ids}
                      selected={selected}
                      onSelect={setPicked}
                    />
                  ))}
                </div>
                <nav className="picker-tabs" aria-label={pickerText.procedureGroups}>
                  {groups.map((group) => (
                    <button
                      key={group.type}
                      type="button"
                      className="picker-tab"
                      data-type={group.type}
                      onClick={() =>
                        document.getElementById(group.id)?.scrollIntoView({ block: 'start' })
                      }
                    >
                      {group.label}{' '}
                      <span className="picker-tab-count readout">{group.ids.length}</span>
                    </button>
                  ))}
                </nav>
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
                    <span className="picker-mode-hint">{hint}</span>
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
                aria-describedby={exploreHint}
                onClick={() => trainer.setMode('explore')}
              >
                {text.exploreCockpit}
              </button>
              <p id={exploreHint}>{text.exploreHint}</p>
            </div>
          </section>
          <Drills mode={mode} />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
