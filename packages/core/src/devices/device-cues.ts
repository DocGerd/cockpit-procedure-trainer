import type { Aircraft, Device, DeviceCue } from '../contract';
import type { DeviceStates } from './device-runtime';

export function deviceCues(
  aircraft: Aircraft,
  registry: readonly Device[],
  previous: DeviceStates,
  next: DeviceStates,
): readonly DeviceCue[] {
  const cues: DeviceCue[] = [];
  for (const [installId, install] of Object.entries(aircraft.devices ?? {})) {
    const device = registry.find((candidate) => candidate.id === install.device);
    if (!device) throw new Error(`Install "${installId}" names unknown device "${install.device}"`);
    const before = previous[installId];
    const after = next[installId];
    if (!device.sounds || !before || !after) continue;
    for (const cue of device.sounds.cues(before.state, after.state)) {
      cues.push({ ...cue, install: installId, device: device.id });
    }
  }
  return cues;
}
