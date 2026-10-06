import { isPosition } from '../contract';
import type { Aircraft, ControlDefinition, Device, Rect, Text, ViewSize } from '../contract';

export type FindingCode =
  | 'unknown-target'
  | 'unplaced-control'
  | 'unplaced-indicator'
  | 'missing-translation'
  | 'phase-without-image'
  | 'phase-without-snapshot'
  | 'undeclared-failure'
  | 'unknown-position'
  | 'inexact-lever-target'
  | 'unknown-device'
  | 'unknown-device-control'
  | 'unplaced-device'
  | 'invalid-install-id'
  | 'control-in-device-namespace'
  | 'invalid-view-size'
  | 'placement-outside-view';

export type Finding = {
  readonly aircraftId: string;
  readonly code: FindingCode;
  readonly id: string;
  readonly message: string;
};

export type ValidationContext = {
  readonly devices?: readonly Device[];
  readonly [extension: string]: unknown;
};

export function formatFinding(finding: Finding): string {
  return `${finding.aircraftId}: ${finding.code} ${finding.id}: ${finding.message}`;
}

const isMissing = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

// The context carries registries the aircraft cannot see.
export function validateAircraft(aircraft: Aircraft, context: ValidationContext = {}): Finding[] {
  const findings: Finding[] = [];
  const add = (code: FindingCode, id: string, message: string) =>
    findings.push({ aircraftId: aircraft.id, code, id, message });

  const controls = Object.entries(aircraft.controls);
  const indicators = Object.entries(aircraft.indicators);
  const views = Object.entries(aircraft.views);
  const hasControl = (id: string) => Object.hasOwn(aircraft.controls, id);
  const hasIndicator = (id: string) => Object.hasOwn(aircraft.indicators, id);
  const hasPhase = (id: string) => Object.hasOwn(aircraft.phases, id);
  const installs = Object.entries(aircraft.devices ?? {});
  const registry = context.devices ?? [];
  const deviceById = (id: string) => registry.find((candidate) => candidate.id === id);

  const checkText = (id: string, field: string, value: Text | undefined) => {
    for (const language of ['de', 'en'] as const) {
      if (isMissing(value?.[language]))
        add('missing-translation', id, `${field}: empty ${language}`);
    }
  };

  const checkPosition = (id: string, field: string, position: unknown) => {
    const control = aircraft.controls[id];
    if (control && !isPosition(control, position)) {
      add(
        'unknown-position',
        id,
        `${field}: ${JSON.stringify(position)} is not a position of ${id}`,
      );
    }
  };

  const checkActionStop = (
    id: string,
    where: string,
    control: ControlDefinition,
    position: unknown,
  ) => {
    if (
      control.positions === 'continuous' &&
      isPosition(control, position) &&
      position !== 0 &&
      position !== 1
    ) {
      add(
        'inexact-lever-target',
        id,
        `${where} targets ${String(position)} on a continuous lever; target 0 or 1, or use a check item with a condition, or give the lever named notches`,
      );
    }
  };

  const checkDeviceTarget = (id: string, where: string, position?: unknown, action = false) => {
    const install = installs.find(
      ([installId]) => !installId.includes('.') && id.startsWith(`${installId}.`),
    );
    if (!install) {
      add('unknown-device', id, `${where} targets a control of an install the aircraft lacks`);
      return;
    }
    const [installId, { device: deviceId }] = install;
    const device = deviceById(deviceId);
    if (!device) return;
    const controlId = id.slice(installId.length + 1);
    checkDeviceControl(id, device, controlId, where, position, action);
  };

  const checkDeviceControl = (
    id: string,
    device: Device,
    controlId: string,
    where: string,
    position?: unknown,
    action = false,
  ) => {
    const control = Object.hasOwn(device.controls, controlId)
      ? device.controls[controlId]
      : undefined;
    if (!control) {
      add('unknown-device-control', id, `${where} targets a control ${device.id} does not have`);
    } else if (position !== undefined && !isPosition(control, position)) {
      add(
        'unknown-position',
        id,
        `${where} position: ${JSON.stringify(position)} is not a position of ${id}`,
      );
    } else if (action) {
      checkActionStop(id, where, control, position);
    }
  };

  const checkControlTarget = (id: string, where: string, position?: unknown, action = false) => {
    if (hasControl(id)) {
      if (position !== undefined) checkPosition(id, `${where} position`, position);
      const control = aircraft.controls[id];
      if (action && control) checkActionStop(id, where, control, position);
    } else if (id.includes('.')) {
      checkDeviceTarget(id, where, position, action);
    } else {
      add('unknown-target', id, `${where} targets an unknown control`);
    }
  };

  checkText(aircraft.id, 'name', aircraft.name);

  for (const [id, control] of controls) {
    checkText(id, 'name', control.name);
    checkText(id, 'description', control.description);
    if (control.kind === 'guarded') checkText(id, 'guard name', control.guard.name);

    if (control.kind === 'breaker' && JSON.stringify(control.positions) !== '["in","pulled"]') {
      add(
        'unknown-position',
        id,
        `positions: ${JSON.stringify(control.positions)} must be exactly ["in","pulled"]`,
      );
    }

    checkPosition(id, 'initial', control.initial);

    if (control.kind === 'rotary' && control.springBack) {
      for (const [detent, rest] of Object.entries(control.springBack)) {
        checkPosition(id, 'springBack key', detent);
        checkPosition(id, 'springBack value', rest);
      }
    }

    const moving =
      control.appearance && 'artwork' in control.appearance
        ? control.appearance.artwork.moving
        : undefined;
    if (moving?.type === 'positions') {
      for (const position of Object.keys(moving.images)) {
        checkPosition(id, 'artwork image key', position);
      }
    }

    const placed = views.some(([, view]) => view.controls && Object.hasOwn(view.controls, id));
    if (!placed) add('unplaced-control', id, 'is not placed in any view');

    if (installs.some(([installId]) => id.startsWith(`${installId}.`))) {
      add('control-in-device-namespace', id, 'starts with the id of a device install');
    }
  }

  for (const [id, indicator] of indicators) {
    checkText(id, 'name', indicator.name);
    const placed = views.some(([, view]) => view.indicators && Object.hasOwn(view.indicators, id));
    if (!placed) add('unplaced-indicator', id, 'is not placed in any view');
  }

  const isLength = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
  const sizes = new Map<string, ViewSize | undefined>();
  const declaredSize = (viewId: string, size: unknown) => {
    if (size === undefined) return undefined;
    const { width, height } = (size ?? {}) as { width?: unknown; height?: unknown };
    if (isLength(width) && isLength(height)) return { width, height } as ViewSize;
    add('invalid-view-size', viewId, 'size must be a positive, finite width and height');
    return undefined;
  };
  const checkInside = (viewId: string, size: ViewSize | undefined, id: string, rect: Rect) => {
    if (
      size &&
      (rect.x < 0 || rect.y < 0 || rect.x + rect.w > size.width || rect.y + rect.h > size.height)
    ) {
      add(
        'placement-outside-view',
        id,
        `view ${viewId} places it outside its ${size.width}x${size.height} size`,
      );
    }
  };

  for (const [viewId, view] of views) {
    checkText(viewId, 'name', view.name);
    const size = declaredSize(viewId, view.size);
    sizes.set(viewId, size);
    for (const [id, placement] of Object.entries(view.controls ?? {})) {
      if (placement) checkInside(viewId, size, id, placement.rect);
    }
    for (const [id, placement] of Object.entries(view.indicators ?? {})) {
      if (placement) checkInside(viewId, size, id, placement.rect);
    }
    for (const id of Object.keys(view.controls ?? {})) {
      if (!hasControl(id)) add('unknown-target', id, `view ${viewId} places an unknown control`);
    }
    for (const id of Object.keys(view.indicators ?? {})) {
      if (!hasIndicator(id))
        add('unknown-target', id, `view ${viewId} places an unknown indicator`);
    }
  }

  const named = new Set<string>();
  for (const [installId, install] of installs) {
    if (installId.includes('.')) {
      add('invalid-install-id', installId, 'an install id must not contain a dot');
    }
    const device = deviceById(install.device);
    if (device && !named.has(device.id)) {
      named.add(device.id);
      checkText(device.id, 'manual', device.manual);
      device.notModelled.forEach((entry, index) =>
        checkText(device.id, `notModelled ${index}`, entry),
      );
      for (const [controlId, control] of Object.entries(device.controls)) {
        checkText(`${device.id}.${controlId}`, 'name', control.name);
        checkText(`${device.id}.${controlId}`, 'description', control.description);
        if (control.kind === 'guarded') {
          checkText(`${device.id}.${controlId}`, 'guard name', control.guard.name);
        }
      }
    }
    if (!device) {
      add('unknown-device', install.device, `install ${installId} names an unregistered device`);
    }
    if (!Object.hasOwn(aircraft.views, install.view)) {
      add('unplaced-device', installId, `is placed in ${install.view}, which is not a view`);
    } else {
      checkInside(install.view, sizes.get(install.view), installId, install.placement.rect);
    }
  }

  for (const [failureId, failure] of Object.entries(aircraft.failures)) {
    checkText(failureId, 'name', failure.name);
    for (const id of failure.trips ?? []) {
      if (!hasControl(id)) {
        add('unknown-target', id, `failure ${failureId} trips an unknown control`);
      } else if (aircraft.controls[id]?.kind !== 'breaker') {
        add('unknown-target', id, `failure ${failureId} trips a control that is not a breaker`);
      }
    }
  }

  for (const [phaseId, phase] of Object.entries(aircraft.phases)) {
    checkText(phaseId, 'name', phase.name);
    if (isMissing(phase.image)) add('phase-without-image', phaseId, 'declares no image');

    const entry = phase.entry as Partial<typeof phase.entry> | undefined;
    if (!entry?.controls || entry.state === undefined) {
      add('phase-without-snapshot', phaseId, 'declares no entry snapshot');
      continue;
    }
    for (const [id] of controls) {
      if (!Object.hasOwn(entry.controls, id)) {
        add('phase-without-snapshot', phaseId, `entry snapshot has no position for ${id}`);
      }
    }
    for (const [id, position] of Object.entries(entry.controls)) {
      if (!hasControl(id)) {
        add('unknown-target', id, `phase ${phaseId} entry names an unknown control`);
      } else {
        checkPosition(id, `phase ${phaseId} entry`, position);
      }
    }
    for (const [installId, positions] of Object.entries(entry.devices ?? {})) {
      const install = Object.hasOwn(aircraft.devices ?? {}, installId)
        ? aircraft.devices?.[installId]
        : undefined;
      if (!install) {
        add('unknown-device', installId, `phase ${phaseId} entry names an unknown install`);
        continue;
      }
      const device = deviceById(install.device);
      if (!device) continue;
      for (const [controlId, position] of Object.entries(positions)) {
        checkDeviceControl(
          `${installId}.${controlId}`,
          device,
          controlId,
          `phase ${phaseId} entry`,
          position,
        );
      }
    }
  }

  for (const [procedureId, procedure] of Object.entries(aircraft.procedures)) {
    checkText(procedureId, 'title', procedure.title);

    for (const [field, phase] of [
      ['startPhase', procedure.startPhase],
      ['endPhase', procedure.endPhase],
    ] as const) {
      if (phase !== undefined && !hasPhase(phase)) {
        add('unknown-target', phase, `procedure ${procedureId} ${field} is not a phase`);
      }
    }

    if (procedure.type === 'emergency' && !Object.hasOwn(aircraft.failures, procedure.failure)) {
      add(
        'undeclared-failure',
        procedure.failure,
        `procedure ${procedureId} names an undeclared failure`,
      );
    }

    procedure.items.forEach((item, index) => {
      const where = `procedure ${procedureId} item ${index}`;
      checkText(procedureId, `item ${index} text`, item.text);
      if (item.type === 'action') {
        checkControlTarget(item.control, where, item.position, true);
      } else if (item.type === 'check') {
        if ('indicator' in item.target) {
          if (!hasIndicator(item.target.indicator)) {
            add('unknown-target', item.target.indicator, `${where} checks an unknown indicator`);
          }
        } else {
          checkControlTarget(item.target.control, where);
        }
      }
    });
  }

  return findings;
}
