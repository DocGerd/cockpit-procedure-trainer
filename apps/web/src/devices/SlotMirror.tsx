import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { useLanguage, useMessages } from '../i18n';
import { unitNames } from './messages';
import './slot-mirror.css';

export type SlotMirrorProps = {
  deviceId: string;
  entry: DeviceScreenEntry;
  on: boolean;
  state: unknown;
  onActivate(): void;
};

/** The live read-only mirror of an installed device, with one button that asks for it in the dock. */
export function SlotMirror({ deviceId, entry, on, state, onActivate }: SlotMirrorProps) {
  const { language } = useLanguage();
  const names = useMessages(unitNames);
  const unit = Object.hasOwn(names, deviceId) ? names[deviceId as keyof typeof names] : deviceId;
  const { Display } = entry;

  return (
    <div className="slot-mirror" data-slot-mirror>
      <div className="slot-mirror-display" aria-hidden="true">
        <Display on={on} state={state} />
      </div>
      <button
        type="button"
        className="slot-mirror-button"
        aria-label={`${unit}: ${entry.readout(state, language, on)}`}
        onClick={onActivate}
      />
    </div>
  );
}
