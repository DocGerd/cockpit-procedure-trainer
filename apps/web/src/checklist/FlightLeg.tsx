import { format, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import { messages } from './messages';

/** Where the running leg sits in a full flight; nothing outside one. */
export function FlightLeg() {
  const text = useMessages(messages);
  const { flight } = useTrainer();
  if (!flight) return null;
  return (
    <div className="checklist-eyebrow checklist-flight-leg">
      {format(text.flightLeg, { n: flight.results.length + 1, total: flight.legs.length })}
    </div>
  );
}
