import { phaseName } from '@cpt/core';
import { ImageWithFallback } from '../errors/ImageWithFallback';
import { useLocalize } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import './outside-view.css';

export function OutsideView() {
  const localize = useLocalize();
  const { aircraft } = useTrainer();
  const phaseId = useSessionState((session) => session.phase());
  const running = useSessionState((session) => aircraft.engineRunning?.(session.state()) ?? false);
  const cues = useSessionState((session) => {
    const state = session.state();
    return Object.entries(aircraft.outsideCues ?? {}).flatMap(([id, cue]) =>
      cue.shows(state) ? [id] : [],
    );
  });
  const phase = aircraft.phases[phaseId];
  const label = phaseName(phaseId);
  if (!phase || !label) return null;
  const name = localize(label);
  return (
    <div className="outside-view">
      <ImageWithFallback
        className="outside-view-image"
        src={(running && phase.imageRunning) || phase.image}
        label={name}
      />
      {cues.map((id) => {
        const cue = aircraft.outsideCues?.[id];
        return (
          cue && (
            <img key={id} className="outside-view-cue" src={cue.image} alt={localize(cue.name)} />
          )
        );
      })}
      <span className="outside-view-caption" aria-hidden="true">
        {name}
      </span>
    </div>
  );
}
