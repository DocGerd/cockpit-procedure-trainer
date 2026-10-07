import { ImageWithFallback } from '../errors/ImageWithFallback';
import { useLocalize } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import './outside-view.css';

export function OutsideView() {
  const localize = useLocalize();
  const { aircraft } = useTrainer();
  const phaseId = useSessionState((session) => session.phase());
  const running = useSessionState((session) => aircraft.engineRunning?.(session.state()) ?? false);
  const phase = aircraft.phases[phaseId];
  if (!phase) return null;
  const name = localize(phase.name);
  return (
    <div className="outside-view">
      <ImageWithFallback
        className="outside-view-image"
        src={(running && phase.imageRunning) || phase.image}
        label={name}
      />
      <span className="outside-view-caption" aria-hidden="true">
        {name}
      </span>
    </div>
  );
}
