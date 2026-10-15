import type { Aircraft, Device, DeviceCue, DeviceState } from '../contract';
import { deviceOf, installs } from './device-runtime';
import type { DeviceStates } from './device-runtime';

const own = (states: DeviceStates, installId: string): DeviceState | undefined =>
  Object.hasOwn(states, installId) ? states[installId] : undefined;

export function deviceCues(
  aircraft: Aircraft,
  registry: readonly Device[],
  previous: DeviceStates,
  next: DeviceStates,
): readonly DeviceCue[] {
  const cues: DeviceCue[] = [];
  for (const [installId, install] of installs(aircraft)) {
    const device = deviceOf(registry, installId, install.device);
    const before = own(previous, installId);
    const after = own(next, installId);
    if (!device.sounds || !before || !after) continue;
    for (const cue of device.sounds.cues(before.state, after.state)) {
      cues.push({ ...cue, install: installId, device: device.id });
    }
  }
  return cues;
}
