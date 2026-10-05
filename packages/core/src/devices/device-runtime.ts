import type {
  Aircraft,
  ControlRecord,
  Device,
  DeviceInstall,
  DeviceState,
  Positions,
  TrainerState,
} from '../contract';

export type DeviceStates = Readonly<Record<string, DeviceState>>;

const installs = (aircraft: Aircraft): [string, DeviceInstall<unknown>][] =>
  Object.entries(aircraft.devices ?? {});

function deviceOf(registry: readonly Device[], installId: string, id: string): Device {
  const device = registry.find((candidate) => candidate.id === id);
  if (!device) throw new Error(`Install "${installId}" names unknown device "${id}"`);
  return device;
}

export function deviceControls(aircraft: Aircraft, registry: readonly Device[]): ControlRecord {
  const controls: Record<string, ControlRecord[string]> = {};
  for (const [installId, install] of installs(aircraft)) {
    const device = deviceOf(registry, installId, install.device);
    for (const [controlId, definition] of Object.entries(device.controls)) {
      controls[`${installId}.${controlId}`] = definition;
    }
  }
  return controls;
}

export function initialDeviceStates(aircraft: Aircraft, registry: readonly Device[]): DeviceStates {
  return Object.fromEntries(
    installs(aircraft).map(([installId, install]) => [
      installId,
      { on: false, state: deviceOf(registry, installId, install.device).initial },
    ]),
  );
}

function ownControls(positions: Positions, installId: string): Positions {
  const prefix = `${installId}.`;
  return Object.fromEntries(
    Object.entries(positions)
      .filter(([id]) => id.startsWith(prefix))
      .map(([id, position]) => [id.slice(prefix.length), position]),
  );
}

export function stepDevices(
  aircraft: Aircraft,
  registry: readonly Device[],
  state: TrainerState<unknown>,
  dtMs: number,
): DeviceStates {
  return Object.fromEntries(
    installs(aircraft).map(([installId, install]) => {
      const device = deviceOf(registry, installId, install.device);
      const powered = install.powered(state);
      const inputs = Object.fromEntries(
        Object.entries(install.inputs).map(([name, read]) => [name, read(state)]),
      );
      const previous = state.devices[installId]?.state ?? device.initial;
      const next = device.step(previous, {
        controls: ownControls(state.controls, installId),
        powered,
        inputs,
        dtMs,
      });
      return [installId, { on: powered, state: next }];
    }),
  );
}
